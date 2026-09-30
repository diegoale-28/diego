import { pino } from 'pino';
import qrcodeTerminal from 'qrcode-terminal';
import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
} from 'baileys';
import { config } from './config.js';
import { toWhatsappDigits } from './phoneUtils.js';

const logger = pino({ level: process.env.WA_LOG_LEVEL || 'silent' });

let sock = null;
let readyPromise = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connect() {
  const { state, saveCreds } = await useMultiFileAuthState(config.authDir);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    logger,
    browser: ['Leads Bot', 'Chrome', '1.0.0'],
  });

  sock.ev.on('creds.update', saveCreds);

  // Pairing code: útil en servidores sin pantalla para escanear el QR.
  if (config.waPairingPhoneNumber && !sock.authState.creds.registered) {
    await sleep(1500); // dar tiempo a que el socket abra la conexión
    const code = await sock.requestPairingCode(config.waPairingPhoneNumber);
    console.log(`\n[WhatsApp] Código de emparejamiento: ${code}\n` +
      'Ingresa este código en WhatsApp > Dispositivos vinculados > Vincular con número.');
  }

  return new Promise((resolve, reject) => {
    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr && !config.waPairingPhoneNumber) {
        console.log('\n[WhatsApp] Escanea este código QR con tu WhatsApp (Dispositivos vinculados):\n');
        qrcodeTerminal.generate(qr, { small: true });
      }

      if (connection === 'open') {
        console.log('[WhatsApp] Conectado correctamente.');
        resolve(sock);
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const loggedOut = statusCode === DisconnectReason.loggedOut;
        console.warn(`[WhatsApp] Conexión cerrada (código ${statusCode}). ` +
          (loggedOut ? 'Sesión cerrada, borra la carpeta de credenciales y vuelve a vincular.' : 'Reintentando...'));

        if (loggedOut) {
          reject(new Error('Sesión de WhatsApp cerrada (logged out).'));
        } else {
          readyPromise = connect().catch((err) => console.error('[WhatsApp] Error al reconectar:', err));
        }
      }
    });
  });
}

/**
 * Garantiza que exista una conexión activa a WhatsApp y la retorna.
 * Idempotente: llamadas concurrentes comparten la misma promesa de conexión.
 */
export function ensureWhatsappConnection() {
  if (!readyPromise) {
    readyPromise = connect();
  }
  return readyPromise;
}

/**
 * Verifica qué números (formato E.164, con "+") tienen WhatsApp activo.
 * Consulta en lotes pequeños con pausa entre cada uno para reducir el
 * riesgo de rate-limit / bloqueo de la cuenta verificadora.
 *
 * @param {string[]} e164Numbers
 * @returns {Promise<{ valid: string[], invalid: string[] }>}
 */
export async function checkNumbersOnWhatsapp(e164Numbers) {
  const socket = await ensureWhatsappConnection();

  const valid = [];
  const invalid = [];
  const batchSize = Math.max(1, config.checkBatchSize);

  for (let i = 0; i < e164Numbers.length; i += batchSize) {
    const batch = e164Numbers.slice(i, i + batchSize);
    const digitsBatch = batch.map(toWhatsappDigits);

    // eslint-disable-next-line no-await-in-loop
    const results = await socket.onWhatsApp(...digitsBatch);
    const existsByDigits = new Map(
      (results || []).map((r) => [r.jid.split('@')[0], r.exists]),
    );

    for (let j = 0; j < batch.length; j += 1) {
      const exists = existsByDigits.get(digitsBatch[j]);
      if (exists) {
        valid.push(batch[j]);
      } else {
        invalid.push(batch[j]);
      }
    }

    const isLastBatch = i + batchSize >= e164Numbers.length;
    if (!isLastBatch) {
      // eslint-disable-next-line no-await-in-loop
      await sleep(config.checkBatchDelayMs);
    }
  }

  return { valid, invalid };
}
