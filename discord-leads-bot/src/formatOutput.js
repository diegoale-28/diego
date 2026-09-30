import { AttachmentBuilder } from 'discord.js';

/**
 * Construye el texto de reparto: un bloque por persona con su lista de
 * números, numerados y en bloque de código para fácil copia.
 */
export function buildDistributionText(parts) {
  return parts
    .map((numbers, idx) => {
      const header = `**Persona ${idx + 1}** (${numbers.length} leads)`;
      const body = numbers.length
        ? '```\n' + numbers.join('\n') + '\n```'
        : '_(sin leads asignados)_';
      return `${header}\n${body}`;
    })
    .join('\n');
}

/**
 * Devuelve el payload listo para enviar a un canal de Discord: si el texto
 * cabe dentro del límite, se envía como uno o varios mensajes de texto;
 * si es demasiado largo, se adjunta como archivo .txt junto con un resumen.
 */
export function buildDistributionPayload(parts, maxLength) {
  const fullText = buildDistributionText(parts);

  if (fullText.length <= maxLength) {
    return { content: fullText };
  }

  const plainText = parts
    .map((numbers, idx) => `Persona ${idx + 1} (${numbers.length} leads)\n${numbers.join('\n')}`)
    .join('\n\n');

  const attachment = new AttachmentBuilder(Buffer.from(plainText, 'utf-8'), {
    name: 'reparto_leads.txt',
  });

  const total = parts.reduce((acc, p) => acc + p.length, 0);
  const summary = `Reparto de **${total}** leads entre **${parts.length}** personas ` +
    '(la lista es muy larga para un mensaje de texto, va adjunta en el archivo):';

  return { content: summary, files: [attachment] };
}

/** Divide un texto largo en fragmentos <= maxLength sin cortar líneas. */
export function chunkText(text, maxLength) {
  const lines = text.split('\n');
  const chunks = [];
  let current = '';

  for (const line of lines) {
    if ((current + '\n' + line).length > maxLength) {
      if (current) chunks.push(current);
      current = line;
    } else {
      current = current ? `${current}\n${line}` : line;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}
