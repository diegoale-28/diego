import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { config } from './config.js';
import { extractPhoneNumbers } from './phoneUtils.js';
import { checkNumbersOnWhatsapp, ensureWhatsappConnection } from './whatsappChecker.js';
import { distributeLeads } from './distribute.js';
import { buildDistributionPayload } from './formatOutput.js';
import * as store from './store.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

client.once('ready', async () => {
  console.log(`[Discord] Conectado como ${client.user.tag}`);
  console.log(`[Discord] Escuchando el canal ${config.channelId}`);
  try {
    await ensureWhatsappConnection();
  } catch (err) {
    console.error('[WhatsApp] No se pudo conectar:', err.message);
  }
});

function isCommand(content, name) {
  return content.toLowerCase().startsWith(`${config.commandPrefix}${name}`);
}

async function handleLeadMessage(message) {
  const { valid, invalid } = extractPhoneNumbers(message.content, config.defaultCountry);

  if (valid.length === 0 && invalid.length === 0) {
    return; // el mensaje no contenía nada parecido a un teléfono
  }

  if (valid.length === 0) {
    await message.reply(
      `No encontré números válidos en tu mensaje (${invalid.length} fragmento(s) descartado(s) por formato).`,
    );
    return;
  }

  const statusMsg = await message.reply(
    `Extraje **${valid.length}** número(s) válido(s) (formato). Verificando en WhatsApp...`,
  );

  let checked;
  try {
    checked = await checkNumbersOnWhatsapp(valid);
  } catch (err) {
    console.error('[WhatsApp] Error verificando números:', err);
    await statusMsg.edit('❌ Ocurrió un error consultando WhatsApp. Intenta de nuevo en unos minutos.');
    return;
  }

  const addedCount = store.addValidLeads(message.channelId, checked.valid);
  const invalidTotal = invalid.length + checked.invalid.length;
  store.addInvalidCount(message.channelId, invalidTotal);

  const totalAcumulado = store.getValidLeads(message.channelId).length;

  await statusMsg.edit(
    `✅ WhatsApp: **${checked.valid.length}** existen, **${checked.invalid.length}** no existen.\n` +
    `Formato inválido: **${invalid.length}**.\n` +
    `Nuevos agregados al acumulado: **${addedCount}**.\n` +
    `Total de leads válidos acumulados en este canal: **${totalAcumulado}**.`,
  );
}

async function handleRepartir(message, args) {
  const n = Number(args[0]);
  if (!Number.isInteger(n) || n <= 0) {
    await message.reply(`Uso: \`${config.commandPrefix}repartir <numero_de_personas>\``);
    return;
  }

  const leads = store.getValidLeads(message.channelId);
  if (leads.length === 0) {
    await message.reply('No hay leads válidos acumulados todavía. Envía primero una lista de números.');
    return;
  }

  if (n > leads.length) {
    await message.reply(
      `Tienes **${leads.length}** leads pero pediste repartir entre **${n}** personas. ` +
      'Reduce el número de personas o agrega más leads.',
    );
    return;
  }

  const parts = distributeLeads(leads, n);
  const payload = buildDistributionPayload(parts, config.maxMessageLength);
  await message.channel.send(payload);
}

async function handleEstado(message) {
  const validCount = store.getValidLeads(message.channelId).length;
  const invalidCount = store.getInvalidCount(message.channelId);
  await message.reply(
    `📊 Estado actual del canal:\n` +
    `- Leads válidos acumulados: **${validCount}**\n` +
    `- Descartados (formato inválido o no existen en WhatsApp): **${invalidCount}**`,
  );
}

async function handleReset(message) {
  store.resetChannel(message.channelId);
  await message.reply('🧹 Acumulador de leads reiniciado para este canal.');
}

async function handleAyuda(message) {
  const p = config.commandPrefix;
  await message.reply(
    '**Comandos disponibles:**\n' +
    `\`${p}estado\` — muestra cuántos leads válidos hay acumulados.\n` +
    `\`${p}repartir <N>\` — reparte los leads válidos entre N personas y envía el resultado.\n` +
    `\`${p}reset\` — borra el acumulado de este canal.\n` +
    `\`${p}ayuda\` — muestra este mensaje.\n\n` +
    'Para agregar leads, simplemente pega la lista de números en este canal (cualquier formato).',
  );
}

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.channelId !== config.channelId) return;

  const content = message.content.trim();
  if (!content) return;

  try {
    if (isCommand(content, 'repartir')) {
      const args = content.split(/\s+/).slice(1);
      await handleRepartir(message, args);
      return;
    }
    if (isCommand(content, 'estado')) {
      await handleEstado(message);
      return;
    }
    if (isCommand(content, 'reset')) {
      await handleReset(message);
      return;
    }
    if (isCommand(content, 'ayuda') || isCommand(content, 'help')) {
      await handleAyuda(message);
      return;
    }
    if (content.startsWith(config.commandPrefix)) {
      return; // comando no reconocido: se ignora silenciosamente
    }

    await handleLeadMessage(message);
  } catch (err) {
    console.error('Error procesando mensaje:', err);
    await message.reply('❌ Ocurrió un error inesperado procesando tu mensaje.').catch(() => {});
  }
});

client.login(config.discordToken);
