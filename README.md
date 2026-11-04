# Dashboard

## Setting up the AI assistant

The AI widgets talk to Claude through a small proxy in [server/aiHandler.js](server/aiHandler.js). It runs in Node, so your Anthropic API key stays on your computer and never reaches the browser.

1. Copy `.env.example` to `.env`, then set `ANTHROPIC_API_KEY` to a key from the [Anthropic Console](https://console.anthropic.com/settings/keys). `.env` is git-ignored.
2. Run `npm run dev`. The Vite dev server serves the proxy at `/api/ai/*`, on the same address as the page.

| Endpoint              | What it does                                                                                                           |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `GET /api/ai/health`  | `{ configured, model }`: whether a key is loaded, and which model is used                                              |
| `POST /api/ai/stream` | Takes `{ messages, system?, effort? }` and streams the reply as Server-Sent Events (`status`, `text`, `done`, `error`) |

- **Model:** Claude Opus 5.5 by default. To use another model, set `ANTHROPIC_MODEL` in `.env`. The browser can't choose the model or the token limit.
- **Refusal fallback:** if the model's safety checks wrongly decline a request, the request is re-run on Anthropic's recommended fallback model. Haiku has no fallback, so this is skipped for Haiku models.
- **Local only:** the proxy answers only requests from `localhost`. It rejects requests from other websites and anything that isn't JSON.
- **Builds:** `npm run preview` serves the proxy too. For a build served some other way, `npm run api` runs the proxy on its own at `http://127.0.0.1:8787`.

## Project Plan

**Goal:** A lightweight personal dashboard built with React and Vite. It starts with a task tracker and grows into a home for small productivity widgets.

### Phase 1: Task Tracker (current)

- [x] Project scaffold (Vite + React)
- [x] Add, list, and filter tasks
- [x] Delete tasks
- [x] Persist tasks in the browser with `useLocalStorage`
- [x] Edit tasks
- [x] Mark tasks complete, with due dates and priorities

### Phase 2: Dashboard Shell

- [x] Layout with navigation and a widget grid
- [x] Summary widget (open vs. completed tasks)
- [x] Light/dark theme

### Phase 3: Polish & Ship

- [x] Unit tests for components and hooks
- [ ] Accessibility and responsive pass
- [ ] Deploy (e.g. GitHub Pages or Netlify)

### Future Ideas

- Additional widgets (notes, calendar, weather)
- Optional sync via a backend or cloud storage
