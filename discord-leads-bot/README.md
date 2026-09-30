# Discord Leads Bot

Bot de Discord que escucha un canal específico, limpia y deduplica listas de
números de teléfono, verifica cuáles existen en WhatsApp (vía Baileys) y
reparte los leads válidos entre N personas en partes lo más iguales posible.

## Cómo funciona

1. **Pega una lista de números** en el canal configurado (cualquier formato:
   con guiones, puntos, espacios, con o sin código de país). El bot:
   - Extrae los números con regex + valida con `libphonenumber-js`.
   - Deduplica contra lo ya acumulado en ese canal.
   - Verifica en WhatsApp cuáles existen (descarta los que no).
   - Responde con un resumen y guarda los válidos en un acumulador en memoria.
2. **`!repartir <N>`** — reparte todos los leads válidos acumulados entre `N`
   personas. Si no es divisible exacto, las primeras partes reciben un lead
   extra (ej. 10 leads / 3 personas → 4, 3, 3). Envía el resultado al canal
   (como mensaje, o como archivo `.txt` si es muy largo para un mensaje).
3. **`!estado`** — muestra cuántos leads válidos hay acumulados y cuántos se
   han descartado.
4. **`!reset`** — vacía el acumulador de ese canal (empezar de cero).
5. **`!ayuda`** — muestra los comandos.

> El prefijo `!` es configurable con `COMMAND_PREFIX` en `.env`.

## Requisitos

- Node.js 20 o superior.
- Una aplicación/bot de Discord ya creado.
- Un número de WhatsApp que actuará como "verificador" (se vincula como
  dispositivo vinculado, igual que WhatsApp Web). **Recomendado: usa un
  número secundario, no tu WhatsApp principal**, por el punto de riesgo que
  se explica más abajo.

## Instalación

```bash
cd discord-leads-bot
npm install
cp .env.example .env
```

Edita `.env` con tus valores (ver sección siguiente).

## Configuración paso a paso

### 1. Crear el bot de Discord

1. Ve a https://discord.com/developers/applications → **New Application**.
2. En **Bot** → **Reset Token** → copia el token → pégalo en `.env` como
   `DISCORD_TOKEN`.
3. En **Bot**, activa el intent **MESSAGE CONTENT INTENT** (obligatorio,
   sin esto el bot no puede leer el texto de los mensajes).
4. En **OAuth2 → URL Generator**:
   - Scopes: `bot`
   - Bot Permissions: `View Channels`, `Send Messages`, `Read Message
     History`, `Attach Files`.
   - Copia la URL generada y ábrela en el navegador para invitar el bot a
     tu servidor.

### 2. Obtener el ID del canal

1. En Discord: **Ajustes de usuario → Avanzado → Modo desarrollador** (ON).
2. Click derecho sobre el canal donde se procesarán los leads → **Copiar ID
   del canal**.
3. Pégalo en `.env` como `LEADS_CHANNEL_ID`.

### 3. Vincular el número verificador de WhatsApp

La primera vez que corras el bot, se abrirá una sesión de WhatsApp Web
(vía Baileys) y necesitas vincularla:

```bash
npm start
```

Verás en la consola un **código QR**. Ábrelo con:

**WhatsApp → Ajustes → Dispositivos vinculados → Vincular un dispositivo**
y escanéalo con la cámara.

Alternativa sin cámara / en servidor headless: define en `.env`
`WA_PAIRING_PHONE_NUMBER=584141234567` (tu número, con código de país, sin
`+`) y el bot imprimirá un **código de 8 dígitos** para ingresar manualmente
en **Dispositivos vinculados → Vincular con número de teléfono**.

La sesión se guarda en la carpeta `baileys_auth/` (no se sube a git). Las
siguientes veces que inicies el bot, se reconecta solo, sin pedir QR de
nuevo — a menos que cierres la sesión desde el teléfono.

### 4. Arrancar el bot

```bash
npm start
```

Deberías ver:

```
[Discord] Conectado como TuBot#1234
[Discord] Escuchando el canal <id>
[WhatsApp] Conectado correctamente.
```

### 5. Probar el flujo

En el canal configurado:

```
0412-123-4567, 0424 111 22 33
+58 414 765 4321
```

El bot responde con el conteo de válidos/existentes en WhatsApp. Luego:

```
!repartir 3
```

Y postea el reparto.

## Corriendo el bot 24/7

Para producción, corre el proceso con un supervisor que lo reinicie si
crashea, por ejemplo con `pm2`:

```bash
npm install -g pm2
pm2 start src/index.js --name leads-bot
pm2 save
```

O con Docker/systemd si prefieres containerizar.

## Notas importantes / riesgos

- **Verificar números masivamente en WhatsApp puede activar límites de tasa
  o incluso bloquear el número verificador** si se consultan muchísimos
  números muy rápido. El bot ya divide las consultas en lotes con pausas
  (`WA_CHECK_BATCH_SIZE` / `WA_CHECK_BATCH_DELAY_MS`), pero para volúmenes
  grandes (miles de números por día) considera:
  - Usar un número dedicado solo para esto (no el tuyo personal ni el del
    negocio principal).
  - Subir los delays si empiezas a ver desconexiones frecuentes.
  - Esto usa WhatsApp Web no oficial (Baileys); no es la API oficial de
    Meta, así que existe riesgo de baneo del número si se abusa. Si el
    volumen es alto y constante, evalúa migrar a la **WhatsApp Business
    Platform (Cloud API)** oficial de Meta para el checker.
- El acumulador de leads vive **en memoria**: si reinicias el proceso antes
  de repartir, se pierde. Si necesitas persistencia, se puede cambiar
  `src/store.js` para que escriba a un archivo o base de datos sin tocar el
  resto del bot.
- El bot solo escucha el canal configurado en `LEADS_CHANNEL_ID`; mensajes en
  otros canales se ignoran.

## Estructura del proyecto

```
src/
  config.js          Carga y valida variables de entorno
  phoneUtils.js       Extracción, limpieza y validación de números
  distribute.js       Lógica de reparto equitativo
  store.js            Acumulador de leads en memoria (por canal)
  whatsappChecker.js   Conexión Baileys + verificación de existencia
  formatOutput.js     Formateo del mensaje/archivo de reparto
  index.js            Bot de Discord: comandos y orquestación
test/
  phoneUtils.test.js
  distribute.test.js
```

## Tests

```bash
npm test
```
