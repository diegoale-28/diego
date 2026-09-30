# Contexto de traspaso (sesión anterior)

## Objetivo del usuario
Bot de Discord que escucha un canal específico y procesa listas de leads:
1. Extraer, limpiar y agrupar números de teléfono.
2. Verificarlos en WhatsApp y descartar los inexistentes.
3. Comando con el número de personas: repartir los leads válidos en partes
   iguales; si sobra residuo, sumar uno extra a las primeras partes.
4. Enviar al canal la lista final dividida por persona.
5. Ayudar al usuario con los pasos de configuración.

## Estado: implementado y probado solo con tests unitarios
- Código en `discord-leads-bot/` (Node 20+, ESM). Rama `claude/hola-24r3ac`,
  PR en borrador: https://github.com/diegoale-28/diego/pull/1
- `npm test`: 6 tests pasan (extracción de números y reparto).
- **No probado contra Discord ni WhatsApp reales** (falta token del bot y
  vincular un número de WhatsApp).

## Decisiones de diseño
- Extracción: regex de secuencias candidatas + validación con
  `libphonenumber-js/max`; país por defecto con `DEFAULT_COUNTRY` (VE).
- Checker de WhatsApp: Baileys (`baileys@7.0.0-rc14`, no oficial),
  `sock.onWhatsApp(...digitos)` en lotes de 20 con pausa de 1.5 s. Vinculación
  por QR en consola o pairing code (`WA_PAIRING_PHONE_NUMBER`).
- Flujo: cualquier mensaje sin prefijo en el canal configurado se trata como
  lista de leads y se acumula en memoria (`src/store.js`).
- Comandos: `!repartir <N>`, `!estado`, `!reset`, `!ayuda` (prefijo
  configurable). Si el reparto no cabe en un mensaje de Discord, se adjunta
  como `.txt`.
- Reparto: `base = floor(total/n)`, las primeras `total % n` partes llevan +1.

## Riesgos y pendientes conocidos
- Baileys es WhatsApp Web no oficial: riesgo de bloqueo del número
  verificador con volúmenes altos. Recomendado número secundario; a gran
  escala, migrar a la Cloud API oficial de Meta.
- El acumulador está en memoria y se pierde al reiniciar. Posible mejora:
  persistirlo en archivo o base de datos detrás de la misma interfaz de
  `store.js`.
- No hay CI configurado en el repo.
- Al recibir una lista, el bot verifica en WhatsApp de inmediato; si el
  usuario prefiere verificar solo al repartir, habría que cambiar el flujo.

## Preferencias del usuario
Respuestas directas y críticas, en español, orientadas a resultados. Que no le
den la razón por defecto y que se recomiende una opción clara en lugar de
listas de alternativas. Avanzar por fases, una cosa a la vez. El usuario
trabaja en su PC local (Windows, según el README del repo SiGA) y prefiere
evitar gasto innecesario de sesiones en la nube.

## Contexto del repo
`diegoale-28/diego` contiene además SiGA (sistema en C + HTML) que no tiene
relación con el bot. Todo el trabajo del bot vive en `discord-leads-bot/`.
