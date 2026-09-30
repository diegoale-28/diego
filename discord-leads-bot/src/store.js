/**
 * Estado en memoria del acumulador de leads por canal.
 * Se pierde si el proceso se reinicia (por diseño: es un buffer de trabajo,
 * no una base de datos). Si necesitas persistencia entre reinicios, agrega
 * un adaptador (archivo JSON, SQLite, etc.) detrás de esta misma interfaz.
 */
const channels = new Map();

function getOrCreate(channelId) {
  if (!channels.has(channelId)) {
    channels.set(channelId, {
      valid: new Set(), // números E.164 confirmados en WhatsApp
      invalidCount: 0, // contador de descartes (no válidos / no existen)
    });
  }
  return channels.get(channelId);
}

export function addValidLeads(channelId, numbers) {
  const state = getOrCreate(channelId);
  let added = 0;
  for (const n of numbers) {
    if (!state.valid.has(n)) {
      state.valid.add(n);
      added += 1;
    }
  }
  return added;
}

export function addInvalidCount(channelId, count) {
  const state = getOrCreate(channelId);
  state.invalidCount += count;
}

export function getValidLeads(channelId) {
  return Array.from(getOrCreate(channelId).valid);
}

export function getInvalidCount(channelId) {
  return getOrCreate(channelId).invalidCount;
}

export function resetChannel(channelId) {
  channels.delete(channelId);
}
