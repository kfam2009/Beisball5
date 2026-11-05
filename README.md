# Panel GO Baseball5

Este repo tiene dos versiones del panel de gráficos de Baseball5:

| Carpeta | Cómo llega a vMix | Puerto |
|---|---|---|
| `/` (raíz) | Inputs **Browser** en vMix, In/Out por API de vMix | 8126 |
| [`ndi/`](ndi/) | Una fuente **NDI "B5 Scorebug"** (Electron + `grandi`), In/Out dentro del render. En vMix: input NDI `OKLA2025 (B5 Scorebug)` | 8135 |

**Versión NDI (la usada en producción):** `cd ndi && npm install`, luego `scripts\START_NDI_SCOREBUG.cmd`. Requiere NDI Runtime 6. Incluye acciones para Stream Deck en `ndi/scripts/streamdeck`.

---

# B5 Scorebug for vMix

English control panel and transparent scorebug overlay.

## Run

Requisitos: [Node.js](https://nodejs.org) (sin dependencias extra). Para importar el Excel: Python con `openpyxl`.

Doble clic en `ARRANCAR_PANEL_GO.cmd`, o:

```powershell
node server.js
```

Variables opcionales: `PORT` (default 8126), `B5_EXCEL` (ruta del Excel), `PYTHON` (ruta de python.exe).

Panel:

```text
http://localhost:8126/control.html
```

Transparent overlay:

```text
http://localhost:8126/scorebug.html
http://localhost:8126/scoreboard.html
http://localhost:8126/matchup.html
http://localhost:8126/roster.html?side=away
http://localhost:8126/roster.html?side=home
http://localhost:8126/umpires.html
http://localhost:8126/player.html
```

## vMix

Enable `Settings > Web Controller` in vMix.

The panel can send API commands to vMix at `127.0.0.1:8088`.

Use **Add Browser Input to vMix** to create the Browser input automatically. vMix may not return the new input number, so after it appears in vMix, type that number into **Scorebug input #**. Then use:

- **Refresh Input**
- **Overlay In**
- **Overlay Out**

Current vMix inputs:

- Scorebug: `8`
- Scoreboard: `9`
- Matchup: `10`
- Away Roster: `12`
- Home Roster: `11`
- Umpires: `13`
- Player: `14`

The overlay background is transparent.

## Excel Data

The control panel reads:

```text
C:\Users\claud\Videos\Baseball5\Datos.xlsx
```

Expected sheets:

- `HOME`: number, name, role
- `AWAY`: number, name, role
- `UMPIRES`: position, name, country/role

The panel syncs this file when it loads. Use **Import Excel Data** after saving changes in Excel.
