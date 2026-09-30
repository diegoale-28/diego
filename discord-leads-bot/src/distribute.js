/**
 * Reparte una lista de leads en `n` partes lo más iguales posible.
 * Si la cantidad no es divisible exactamente, el residuo se distribuye
 * sumando un lead extra a las primeras partes (orden estable).
 *
 * Ej: 10 leads / 3 personas -> [4, 3, 3]
 *
 * @param {string[]} leads
 * @param {number} n Número de personas (entero positivo)
 * @returns {string[][]} arreglo de `n` arreglos con los leads de cada persona
 */
export function distributeLeads(leads, n) {
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error('El número de personas debe ser un entero mayor a 0.');
  }

  const total = leads.length;
  const base = Math.floor(total / n);
  const remainder = total % n;

  const parts = [];
  let cursor = 0;
  for (let i = 0; i < n; i += 1) {
    const size = base + (i < remainder ? 1 : 0);
    parts.push(leads.slice(cursor, cursor + size));
    cursor += size;
  }

  return parts;
}
