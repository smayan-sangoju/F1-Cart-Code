# F1 Cart Controller

A browser-based web app for controlling an Arduino-powered F1 mini physics cart over USB serial. Built for the UVA ENGR 1020 project — a constant-velocity cart for Charlottesville High School physics classrooms.

## Features

- **Connect** to any Arduino via the Web Serial API (no drivers, no extensions)
- **Instant motion controls** — Forward / Reverse at three speed levels, Emergency Stop
- **Sequence builder** — program multi-step motion sequences (forward, reverse, pauses) and run them with one click
- **Live serial log** — colour-coded real-time view of every command sent and response received
- Dark, high-contrast UI designed for Chromebooks and classroom use

## Browser Requirements

> **Web Serial requires Chrome or Edge (desktop or Chromebook).** It does **not** work in Firefox or Safari.
>
> The app must be served over **HTTPS** or **localhost** for the Web Serial API to be available. Running `npm run dev` on localhost works fine.

## Arduino Serial Protocol

The firmware should listen at **9600 baud** and respond to newline-terminated commands:

| Command | Action |
|---|---|
| `FWD 1` / `FWD 2` / `FWD 3` | Forward at slow / medium / fast |
| `REV 1` / `REV 2` / `REV 3` | Reverse at slow / medium / fast |
| `STOP` | Immediate stop |
| `LOAD F,1,3000\|S,1000\|R,2,2000` | Load a sequence (steps separated by `\|`) |
| `SEQ` | Run the loaded sequence |
| `STOP_SEQ` | Abort a running sequence |

Expected Arduino responses: `READY`, `OK_STOP`, `OK_FWD1`…`OK_REV3`, `OK_LOAD <n>`, `OK_SEQ`, `SEQ_STEP <n>`, `SEQ_DONE`, `ERR_EMPTY`, `ERR_UNKNOWN: <cmd>`

## Install

```bash
# From the project root (where package.json lives)
npm install
```

## Run (development)

```bash
npm run dev
```

Open the URL shown in your terminal (usually `http://localhost:5173`) in Chrome or Edge.

## Connect to Arduino

1. Plug the Arduino into a USB port.
2. Click **Connect** in the top bar.
3. A browser dialog will appear listing available serial ports — select your Arduino.
4. The status dot turns green and the controls become active.

## Build for production

```bash
npm run build
```

This outputs a static site to the `dist/` folder. Serve it with any HTTPS-capable static host (Netlify, GitHub Pages, etc.) or a local server:

```bash
npm run preview   # preview the build locally
```

> Opening `dist/index.html` directly as a `file://` URL will **not** work because Web Serial requires a secure context (HTTPS or localhost).

## Project Structure

```
├── index.html
├── package.json
├── vite.config.js
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css
    ├── components/
    │   ├── ConnectionBar.jsx   — top bar: connect/disconnect, status
    │   ├── MotionControls.jsx  — emergency stop + speed buttons
    │   ├── SequenceBuilder.jsx — drag-and-drop sequence programming
    │   └── SerialLog.jsx       — live terminal-style log
    └── hooks/
        └── useSerial.js        — Web Serial API abstraction
```

## Team

Smayan Sangoju, Lucas Swartz, Stefan Knopik, Sanjay Saravanan, Prince Boateng  
UVA School of Engineering and Applied Sciences · ENGR 1020
