import 'dotenv/config';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}. Revisa tu archivo .env`);
  }
  return value;
}

export const config = {
  discordToken: requireEnv('DISCORD_TOKEN'),
  channelId: requireEnv('LEADS_CHANNEL_ID'),
  commandPrefix: process.env.COMMAND_PREFIX || '!',
  defaultCountry: process.env.DEFAULT_COUNTRY || 'VE',
  authDir: process.env.WA_AUTH_DIR || 'baileys_auth',
  waPairingPhoneNumber: process.env.WA_PAIRING_PHONE_NUMBER || null,
  checkBatchSize: Number(process.env.WA_CHECK_BATCH_SIZE || 20),
  checkBatchDelayMs: Number(process.env.WA_CHECK_BATCH_DELAY_MS || 1500),
  maxMessageLength: Number(process.env.DISCORD_MAX_MESSAGE_LENGTH || 1900),
};
