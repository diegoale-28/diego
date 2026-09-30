import { parsePhoneNumberFromString } from 'libphonenumber-js/max';

// Secuencias candidatas: dígitos con separadores comunes (espacios, puntos,
// guiones, paréntesis) y un "+" opcional al inicio. Exige al menos 7 dígitos
// para evitar capturar cosas como fechas o códigos cortos.
const CANDIDATE_RE = /\+?\(?\d[\d\s().-]{5,}\d/g;

function stripSeparators(raw) {
  return raw.replace(/[()\s.-]/g, '');
}

/**
 * Extrae, limpia, valida y deduplica números de teléfono de un texto libre.
 *
 * @param {string} text Texto crudo (puede traer varias líneas, comas, etc.)
 * @param {string} defaultCountry Código de país ISO (ej. "VE") usado cuando
 *   el número no trae código de país explícito.
 * @returns {{ valid: string[], invalid: string[] }} `valid` son números en
 *   formato E.164 deduplicados y en orden de aparición; `invalid` son los
 *   fragmentos que no pudieron parsearse como número válido.
 */
export function extractPhoneNumbers(text, defaultCountry) {
  const candidates = text.match(CANDIDATE_RE) || [];

  const seen = new Set();
  const valid = [];
  const invalid = [];

  for (const candidate of candidates) {
    const cleaned = stripSeparators(candidate);
    if (cleaned.replace('+', '').length < 7) {
      invalid.push(candidate.trim());
      continue;
    }

    const parsed = parsePhoneNumberFromString(cleaned, defaultCountry);
    if (!parsed || !parsed.isValid()) {
      invalid.push(candidate.trim());
      continue;
    }

    const e164 = parsed.number; // formato +<code><subscriber>
    if (!seen.has(e164)) {
      seen.add(e164);
      valid.push(e164);
    }
  }

  return { valid, invalid };
}

/**
 * Convierte un número E.164 ("+584141234567") al formato de dígitos sin "+"
 * que espera el checker de WhatsApp.
 */
export function toWhatsappDigits(e164) {
  return e164.replace('+', '');
}
