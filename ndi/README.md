# Baseball5 NDI

MVP independiente para graficos HTML de Baseball5 como fuentes NDI en Windows. Este proyecto no usa vMix ni OBS para renderizar, y no modifica `b5-scorebug-vmix`.

## Estado del MVP

- Fuente inicial: `B5 Scorebug`.
- Render HTML/CSS/JS en canvas visual de `1920x1080`, con fondo transparente.
- Panel web local para editar equipos, score, set, entrada, bases, outs y estado.
- Servidor local con Server-Sent Events para actualizar render y panel.
- Proceso Electron offscreen para capturar frames del HTML. En modo preview no publica NDI; sirve para validar render y timing.
- Adaptador NDI aislado en `src/ndi/ndi-sender.js`.

## Camino tecnico NDI en Windows

La ruta recomendada es:

1. Renderizar cada grafica en una ventana Electron/Chromium offscreen a `1920x1080`.
2. Capturar frames BGRA desde Chromium.
3. Publicar esos frames como fuente NDI usando NDI SDK 6 en Windows.
4. Mantener el panel web y el render desacoplados por HTTP/SSE.

Dependencias externas a validar en la maquina de operacion:

- NDI Runtime o NDI SDK 6 instalado.
- Un binding nativo Node compatible con NDI 6. Candidatos: `grandi` o `@stagetimerio/grandiose`.
- NDI Studio Monitor para verificar la fuente publicada.

Notas de investigacion:

- NDI SDK 6 documenta soporte moderno de precision y alpha channel.
- Los formatos NDI historicos incluyen BGRA/UYVA/PA16; BGRA es el objetivo natural para graficas HTML con transparencia.
- `grandiose` y `grandi` son bindings Node para enviar/recibir NDI, pero conviene hacer una prueba corta de compatibilidad con la version exacta de Node/Electron antes de fijar uno.

## Arranque

Instalar:

```powershell
npm install
```

Panel y render web:

```powershell
npm start
```

Abrir:

- Panel: http://localhost:8135/control.html
- Scorebug: http://localhost:8135/scorebug.html

Preview offscreen Electron:

```powershell
npm run ndi:preview
```

Modo NDI real, cuando el adaptador nativo este conectado:

```powershell
npm run ndi
```

Arranque directo en esta maquina:

```powershell
scripts\START_NDI_SCOREBUG.cmd
```

Si vMix muestra una imagen rayada, repetida o diagonal, cerrar la fuente y reiniciar limpio:

```powershell
scripts\STOP_NDI_SCOREBUG.cmd
scripts\START_NDI_SCOREBUG.cmd
```

Luego quitar y volver a agregar la fuente NDI en vMix.

## Estructura

- `public/scorebug.html`: render transparente 1920x1080.
- `public/control.html`: panel local.
- `public/assets/scorebug.css`: estilos compartidos.
- `public/assets/scorebug.js`: render cliente del scorebug.
- `public/assets/control.js`: logica del panel.
- `src/server.js`: servidor local y API de estado.
- `src/electron-main.js`: captura offscreen de Chromium.
- `src/ndi/ndi-sender.js`: frontera del puente NDI.
- `data/state.json`: estado editable del partido.

## Stream Deck

Paquete listo:

```text
outputs\Baseball5-NDI-StreamDeck.zip
```

Carpeta de trabajo:

```text
scripts\streamdeck
```

Usar `Sistema > Abrir` en Stream Deck y seleccionar una accion `.vbs`. Asignar el icono PNG equivalente desde `scripts\streamdeck\icons`.

Acciones iniciales:

- `AWAY_PLUS.vbs`
- `AWAY_MINUS.vbs`
- `HOME_PLUS.vbs`
- `HOME_MINUS.vbs`
- `BASE_1.vbs`
- `BASE_2.vbs`
- `BASE_3.vbs`
- `BASES_CLEAR.vbs`

Los cambios hechos desde Stream Deck se sincronizan con el panel abierto.

## Panel Replay

El panel de replay en `C:\Users\claud\Videos\Panel Replay` tiene un boton `Baseball5 NDI` en la barra superior.

Ese boton llama a:

```text
POST /baseball5-ndi/open
```

Si Baseball5 NDI ya esta corriendo en `8135`, abre solo el panel kiosk. Si no esta corriendo, lanza `scripts\START_NDI_SCOREBUG.cmd`.

El panel Baseball5 NDI tambien tiene un boton `Replay` en la barra superior. En modo kiosk usa Electron para abrir `http://localhost:3001/`; si Replay no esta corriendo, lanza:

```text
C:\Users\claud\Videos\Panel Replay\Abrir Panel Replay.bat
```

## Proximo paso recomendado

Hacer una prueba tecnica de 1 dia con NDI Runtime/SDK 6 instalado:

1. Probar `grandi` en Node puro enviando un frame BGRA solido con alpha.
2. Probar el mismo paquete dentro de Electron o separar el emisor en un proceso Node externo.
3. Conectar `nativeImage.toBitmap()` al sender NDI.
4. Verificar alpha en NDI Studio Monitor o en un switcher que acepte NDI con alpha.
