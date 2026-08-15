# NetFix — Network Troubleshooter

An interactive network-troubleshooting simulator built for an IT / Computer Technology portfolio. Play as an on-call technician: read the symptoms, inspect an interactive topology, run simulated `ipconfig` / `ping` / `tracert` commands, and apply the correct fix before the next ticket lands.

**100% front-end.** No backend, no real network calls — everything is simulated client-side and state lives only in the browser tab.

## Features

- Interactive SVG network diagram (Internet → Router → Switch → PCs/Server) with live link-state and animated traffic
- Click any device to open its inspector and edit real settings: IP, subnet mask, gateway, DNS, DHCP, switch ports, VLANs, trunk config
- A simulated terminal that runs `ipconfig`, `ping`, and `tracert` against the current network state and returns realistic output
- 9 randomized scenario templates across Easy / Medium / Hard covering subnetting, gateways, switch ports, duplicate IPs, DNS, DHCP, VLANs, trunking, and routing
- Score, accuracy, streak, hint penalties, and a per-shift timer
- End-of-shift performance rating: Beginner / Intermediate / Network Technician
- Dark and light themes, fully responsive down to mobile

## Tech stack

React 19 + Vite, plain CSS (custom properties, no framework), no external state or UI libraries.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Deploy to Vercel

This is a static Vite build — Vercel auto-detects it.

```bash
npm i -g vercel
vercel
```

Or connect the repo in the Vercel dashboard and accept the defaults (`vercel.json` already pins the framework, build command, and output directory).

## Project structure

```
src/
  engine/        Pure game logic: IP math, network state, command simulation, scenario templates
  hooks/         useGameState — the single source of truth for score/round/session state
  components/    Presentational React components (diagram, terminal, inspector, HUD, screens)
  styles/        app.css — layout and component styling
```
