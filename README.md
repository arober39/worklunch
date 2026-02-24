# WorkLunch

A cross-platform app (web + iOS/Android) where coworkers can swap lunches. Built with **Expo**, **React Native**, **Supabase**, and **LaunchDarkly**, with **AI-powered lunch matching** instrumented via **OpenTelemetry** and **Langfuse**.

## Features

- **Communities** – Create or join lunch-swap communities with share codes
- **Lunches for Swap** – Post lunches (with photos), browse by category, filter and sort
- **Proposals & Messages** – Make offers, chat, schedule meetups, and mark trades complete
- **Trade History** – View past swaps
- **AI Lunch Suggestions** – Multi-agent orchestration (Anthropic Claude) generates descriptions and finds matching lunches
- **Feature Flags** – LaunchDarkly for rollouts, AI model variant selection, and guarded rollouts
- **Session Replay** – LaunchDarkly Session Replay and rage-click detection on web
- **Observability** – OpenTelemetry traces with dual export to Langfuse (LLM analytics) and LaunchDarkly (flag-correlated metrics)

## Architecture

```
Frontend (Expo / React Native)
    ↓  POST /api/v1/suggest
Python FastAPI Backend
    ├── Evaluate feature flags (LaunchDarkly server SDK)
    ├── Emit feature_flag span events
    ├── Orchestrator agent
    │   ├── Description Agent  (Claude LLM call)
    │   └── Match Agent        (Claude LLM call)
    ↓  OTLP gRPC :4317
OTel Collector
    ├── Pipeline 1 → Langfuse   (full LLM traces + token usage)
    ├── Pipeline 2 → LaunchDarkly (flag-correlated events)
    └── Pipeline 3 → Debug       (console output)
```

## Prerequisites

- Node.js 18+
- npm or yarn
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (optional; `npx expo` works)
- Docker & Docker Compose (for the backend + OTel Collector)
- Supabase project
- LaunchDarkly project
- Anthropic API key (for AI suggestions)
- Langfuse account (for LLM observability)

## Installation

```bash
git clone <repo-url>
cd worklunch
npm install
```

## Environment Variables

Create a `.env` in the project root:

```bash
# Supabase (required)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# LaunchDarkly – client-side
EXPO_PUBLIC_LAUNCHDARKLY_SDK_KEY=mob-...          # Mobile key (native + web fallback)
EXPO_PUBLIC_LAUNCHDARKLY_CLIENT_SIDE_ID=...       # Client-side ID for web (Session Replay)

# AI Backend URL (points to the Docker Compose service)
EXPO_PUBLIC_AI_BACKEND_URL=http://localhost:8000

# Backend / Docker Compose
ANTHROPIC_API_KEY=sk-ant-...                      # Anthropic Claude API key
LD_SDK_KEY=sdk-...                                # LaunchDarkly server-side SDK key
LANGFUSE_AUTH_HEADER=<base64-encoded-public:secret>  # Langfuse Basic auth header
```

- **Supabase** – Dashboard → Settings → API
- **LaunchDarkly** – Project → Environments (see [docs/LAUNCHDARKLY_SETUP.md](docs/LAUNCHDARKLY_SETUP.md))
- **Langfuse** – Base64-encode `public-key:secret-key` for the auth header

## Running the App

### Frontend

| Command            | Description                                         |
|--------------------|-----------------------------------------------------|
| `npm start`        | Start Expo dev server                               |
| `npm run web`      | Run in browser (recommended for Session Replay)     |
| `npm run ios`      | Run on iOS simulator                                |
| `npm run android`  | Run on Android emulator                             |

### Backend + OTel Collector

```bash
docker compose up --build
```

This starts two services:

| Service          | Port  | Description                              |
|------------------|-------|------------------------------------------|
| `otel-collector` | 4317  | OTLP gRPC receiver                       |
|                  | 4318  | OTLP HTTP receiver                       |
| `backend`        | 8000  | FastAPI server (AI suggest endpoint)      |

## Project Structure

```
worklunch/
├── app/                          # Expo Router screens
│   ├── (auth)/                   #   Auth (login, register)
│   ├── spaces/                   #   Community management
│   ├── posts/                    #   Lunch feed & creation
│   ├── proposals/                #   Trade proposals
│   ├── messages/                 #   Chat
│   └── trades/                   #   Trade history
├── src/
│   ├── components/               # Shared UI (Button, Input, PostCard)
│   ├── hooks/                    # Data & auth hooks
│   ├── lib/                      # Supabase, LaunchDarkly, upload helpers
│   └── stores/                   # Zustand (auth, current space)
├── backend/
│   ├── app/
│   │   ├── main.py               # FastAPI app, OTel + LD initialization
│   │   ├── config.py             # Pydantic settings (env vars)
│   │   ├── models.py             # Request/response schemas
│   │   ├── routers/
│   │   │   └── suggest.py        # POST /api/v1/suggest endpoint
│   │   └── agents/
│   │       ├── orchestrator.py   # Parent span, agent chain
│   │       ├── description_agent.py  # LLM call: generate description
│   │       └── match_agent.py    # LLM call: find matching lunches
│   ├── requirements.txt
│   └── Dockerfile
├── otel-collector-config.yaml    # OTel Collector pipelines
├── docker-compose.yml            # Backend + Collector services
└── supabase/migrations/          # Database schema & RLS
```

## OpenTelemetry Instrumentation

The backend uses OpenTelemetry with **GenAI Semantic Conventions** for full LLM observability.

### Trace Structure

```
POST /api/v1/suggest                     (FastAPI auto-instrumented)
  └── suggest.endpoint
      ├── Events: feature_flag (key, provider, variant)
      └── orchestrator.run
          ├── description_agent.generate   (gen_ai.* attributes)
          │   └── Events: prompt, completion
          └── match_agent.find             (gen_ai.* attributes)
              └── Events: prompt, completion
```

### Span Attributes

- `gen_ai.system` – Provider (e.g. `anthropic`)
- `gen_ai.request.model` – Model used (controlled by LaunchDarkly flag)
- `gen_ai.usage.input_tokens` / `gen_ai.usage.output_tokens` – Token counts
- `feature_flag.key`, `feature_flag.provider.name`, `feature_flag.variant` – Flag evaluations

### Export Pipelines

| Pipeline      | Destination   | Purpose                                        |
|---------------|---------------|------------------------------------------------|
| Langfuse      | Langfuse Cloud | LLM trace analytics, prompt/completion content, token costs |
| LaunchDarkly  | LD Telemetry   | Correlate flag variants with AI performance metrics |
| Debug         | Console        | Local development verification                  |

## LaunchDarkly Integration

### Client-Side (Frontend)

- **Web**: Browser SDK with Session Replay + Observability plugin
- **Native**: React Native SDK with Observability plugin (error/log tracking)
- Feature flags gate AI suggestions and control UI rollouts

### Server-Side (Backend)

- **Model variant selection**: The `llm-model-variant` flag controls which Claude model is used
- **AI feature gate**: The `ai-suggest-enabled` flag enables/disables the suggest endpoint
- Flag evaluations are emitted as OpenTelemetry span events, enabling **Guarded Rollouts** — correlating flag changes with LLM performance metrics in LaunchDarkly

## Documentation

- [LaunchDarkly Setup & Session Replay](docs/LAUNCHDARKLY_SETUP.md)
- [OTel + LLM + LaunchDarkly Integration Guide](otel_llm_launchdarkly.md)

## License

Private.
