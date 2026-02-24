# WorkLunch

A cross-platform app (web + iOS/Android) where coworkers can swap lunches. Built with **Expo**, **React Native**, **Supabase**, and **LaunchDarkly**.

## Features

- **Communities** – Create or join lunch-swap communities with share codes
- **Lunches for Swap** – Post lunches (with photos), browse by category, filter and sort
- **Proposals & Messages** – Make offers, chat, schedule meetups, and mark trades complete
- **Trade History** – View past swaps
- **Feature flags** – LaunchDarkly for rollouts (e.g. Create Community flow, feed layout, inline form validation)
- **Session Replay** – On web, LaunchDarkly Session Replay and rage-click detection for debugging (see [docs/LAUNCHDARKLY_SETUP.md](docs/LAUNCHDARKLY_SETUP.md))

## Prerequisites

- Node.js 18+
- npm or yarn
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (optional; `npx expo` works)
- Supabase project
- LaunchDarkly project (for feature flags; optional for local dev if you rely on defaults)

## Installation

```bash
git clone <repo-url>
cd worklunch
npm install
```

## Environment variables

Create a `.env` in the project root with:

```bash
# Supabase (required)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# LaunchDarkly (optional but recommended for flags and replay)
EXPO_PUBLIC_LAUNCHDARKLY_SDK_KEY=mob-...          # Mobile key (native + web fallback)
EXPO_PUBLIC_LAUNCHDARKLY_CLIENT_SIDE_ID=...       # Client-side ID for web (needed for Session Replay)
```

- Get Supabase values from **Supabase Dashboard → Settings → API**.
- Get LaunchDarkly values from your project’s **Environments** (e.g. Dev). See [docs/LAUNCHDARKLY_SETUP.md](docs/LAUNCHDARKLY_SETUP.md) for details.

## Scripts

| Command        | Description                    |
|----------------|--------------------------------|
| `npm start`    | Start Expo dev server          |
| `npm run web`  | Run in browser (recommended for Session Replay) |
| `npm run ios`  | Run on iOS simulator           |
| `npm run android` | Run on Android emulator    |

## Project structure

- **`app/`** – Expo Router screens (auth, spaces, posts, messages, proposals, trades)
- **`src/components/`** – Shared UI (Button, Input, PostCard)
- **`src/hooks/`** – Data and auth (useSpaces, usePosts, useFeatureFlags, etc.)
- **`src/lib/`** – Supabase client, LaunchDarkly init, upload helpers
- **`src/stores/`** – Zustand (auth, current space)
- **`supabase/migrations/`** – Database schema and RLS

## Documentation

- [LaunchDarkly setup & Session Replay](docs/LAUNCHDARKLY_SETUP.md) – Client-side ID, web vs native keys, optional overrides

## License

Private.
