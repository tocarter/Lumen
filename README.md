# Lumen

An app that can connect school platforms to your workspace, and help plan things out.

A dark assignment board for Schoology and Canvas. Recolored Slates chrome, Lumen name, no tutor.

- **Web** (`web/`): Next.js board, calendar, Settings, Focus popout. This is what Vercel hosts.
- **Native** (`native/`): Expo / React Native app with the same board look. Open it in Expo Go or in the browser for feedback.
- **Desktop** (`desktop/`): Electron shell, including an always-on-top Focus mini timer.

## Run the web app

```bash
cd web
cp .env.example .env.local
npm install
npx next dev -p 3000 -H 127.0.0.1
```

Open http://127.0.0.1:3000 — Continue without Google works until OAuth is set.

## Run the native app

```bash
cd native
npm install
npx expo start --web
```

Phone: install Expo Go and scan the QR code from `npx expo start`.

## What still needs setup

1. Google Sign-In (optional but needed for accounts + Google Calendar write)
2. Schoology key/secret and/or Canvas URL + token in Settings
3. Vercel env vars after deploy (`AUTH_SECRET`, Google keys, production `AUTH_URL`)
4. App Store / Play Store builds later (`npx expo prebuild` or EAS)

See `web/.env.example`.
