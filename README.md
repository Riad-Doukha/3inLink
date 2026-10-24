# 3inLink

**Connecting patients through their eyes.** 3inLink is a low-cost wearable that reads eye movements and blinks with electrooculography (EOG). It turns them into requests that reach the nursing team, for patients who cannot speak or move. Research prototype, Thirduni Project, October 2026. Not a certified medical device.

## What is in this repository

```
apps/web/                 Web app (React + Vite), one static site with three screens
  src/home/               Landing page                          #/
  src/demo/               Live demo: real classifier output drives the patient screen, alerts reach the nurse phone   #/demo
  src/patient/            Patient screen (HCI), 3×3 gaze grid   #/patient
  src/nurse/              Nurse app and phone showcase          #/nurse
  src/lib/                Supabase client, alert store, demo switcher
packages/core/            Shared logic: 8 commands, EN/AR/FR text, gaze navigation, double-blink state machine (+ tests)
packages/design-tokens/   Colors (day/night), type, spacing, icons from the design system
eog/                      Python EOG pipeline: preprocessing, features, LDA classifier, real-time replay (see eog/README.md)
supabase/                 Database schema, access rules and demo seed for realtime alerts
docs/                     Design system (design-system.html) and technical notes
```

## How it works

1. **Sense:** electrodes around the eyes. An AD620 amplifier and a 0.1–35 Hz filter condition the signal, and an ESP32 digitizes it at 250 Hz and sends it over Bluetooth.
2. **Recognize:** the Python pipeline (`eog/`) classifies each 3-second window as up, down, straight or double blink with an LDA model.
3. **Select:** on the patient screen, up and down move around the eight messages. A double blink sends the selected one. Looking only previews it and reads it aloud.
4. **Alert:** the message reaches the nurse app in real time through Supabase, with the patient ID and room.

## Run the web app

Requires Node 20+ and pnpm.

```
pnpm install
pnpm dev          # http://localhost:5173
pnpm test         # unit tests (navigation, double blink)
pnpm typecheck
pnpm build
```

Patient screen keys stand in for the EOG classifier: ↑ ↓ to move (Phase 2 also uses ← →), Space twice within 1 s to send, Esc to look away.

## Realtime alerts (Supabase)

1. Create a Supabase project. In **SQL Editor**, run [`supabase/migrations/001_alerts.sql`](supabase/migrations/001_alerts.sql), then [`supabase/seed.sql`](supabase/seed.sql).
2. Copy [`apps/web/.env.example`](apps/web/.env.example) to `apps/web/.env` and fill in the project URL and the **publishable (anon) key**. Never use the secret/service_role key here.
3. On Vercel, set the same two variables under Project Settings → Environment Variables.

Without these variables, the app still runs. Alerts are then shared only between tabs of the same browser.

Prototype limitation: there is no staff login yet. Database rules (RLS) let the public key only read alerts, create new ones and mark them handled.

## Run the EOG pipeline

See [`eog/README.md`](eog/README.md).

## Team

- **Dr. Ahlem Benazzouz:** EOG hardware, signal acquisition, processing and classification (`eog/`).
- **Eng. Mohamed Riad Doukha:** design system, patient screen, nurse app, web platform.

Icons: command symbols drawn for 3inLink. The settings gear is adapted from [Lucide](https://lucide.dev) (ISC licence).
