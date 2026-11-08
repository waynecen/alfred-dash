# Dashboard

A personal dashboard built with React and Vite: tasks, a calendar, habits, goals, a focus timer, notes, weather, and an AI assistant that proposes changes for you to apply. It is set in one strict visual style (ink on bone, hairline rules, no colour; see [DESIGN.md](DESIGN.md)) and keeps your data in your browser.

## What's in it

- **Boards.** Several pages of widgets you can drag, resize and rearrange on a 12-column grid. Each board has its own layout; the data is shared.
- **Tasks.** Quick-add that reads what you type ("Pay rent fri !high #home every month"), due dates, tags, steps under a task, repeating tasks, filters, bulk actions, and drag a task onto the Calendar to schedule it.
- **Planning.** Today (one column of everything due today), Calendar (month and week), Focus (a session timer), Clock (with world clocks), and reminders for events and tasks due.
- **Growth.** Habits with streaks and a 12-week heatmap, Goals counted by hand or from tagged tasks, and a weekly review.
- **AI.** An Assistant you can chat with about your day: it proposes changes as cards, nothing changes until you press Apply, and every Apply can be undone. Also a Daily Brief and a Task Assistant. Type a question in the command palette (Ctrl+K) to ask Claude from anywhere.
- **The rest.** Notes, Weather, a Summary, light and dark themes, a command palette, keyboard shortcuts throughout, and Undo for anything destructive.

## Run it on your computer

You need Node.js 20 or later.

```bash
npm install
npm run dev
```

Then open the address it prints. Everything works without an API key except the AI widgets.

## Set up the AI

The AI widgets talk to Claude through a small proxy ([server/aiHandler.js](server/aiHandler.js)) that runs in Node, so your Anthropic API key never reaches the browser.

1. Copy `.env.example` to `.env` and set `ANTHROPIC_API_KEY` to a key from the [Anthropic Console](https://console.anthropic.com/settings/keys). `.env` is git-ignored.
2. Run `npm run dev`. The dev server serves the proxy at `/api/ai/*`, on the same address as the page.

- **Model.** Claude Opus 5.5 by default; set `ANTHROPIC_MODEL` to use another. The browser can't choose the model, the token limit or the tools.
- **What Claude can change.** A fixed set of actions defined on the server ([server/assistantTools.js](server/assistantTools.js)): add tasks, change or complete a task, add an event, tick off a habit, start a focus session, add to notes. Each proposal is checked before it reaches the page, and only your Apply carries it out.
- **Refusal fallback.** If the model's safety checks wrongly decline a request, it is re-run on Anthropic's recommended fallback model (not for Haiku, which has none).
- **Who can use it.** On your computer, only pages served from your computer. Hosted, only the site's own pages, and only with its access key (see below).

## Deploy to Vercel

The app deploys as a static site, with the AI proxy as one Vercel function ([api/ai/[...path].js](api/ai/[...path].js)). [vercel.json](vercel.json) already holds the settings.

1. Push the repository to GitHub, then in Vercel choose **Add New → Project** and import it. Vercel reads the build settings from `vercel.json`.
2. To use the AI, add these under **Settings → Environment Variables**, then redeploy:
   - `ANTHROPIC_API_KEY`: your Anthropic key.
   - `AI_ACCESS_KEY`: a long random password of your own. The hosted proxy refuses everyone without it, so nobody else can spend your API credit. Without it set, the hosted AI simply stays off.
   - `ANTHROPIC_MODEL` (optional).
3. Open the site, go to **Settings → AI assistant**, and enter the access key. It is kept in that browser only.

Without the API key the hosted dashboard still works; only the AI widgets say they aren't connected.

## Your data

Everything you add is saved in your browser (localStorage), so it stays private and works offline, but it doesn't follow you to another browser or device on its own. To move it, or keep a copy, use **Settings → Data**:

- **Export backup** downloads a JSON file: `{ app: 'dashboard', version, exportedAt, data: { tasks, events, habits, … } }`.
- **Import backup** replaces what is in this browser with a backup, after asking.
- **Clear all data** empties this browser, with Undo.

The AI access key is not part of a backup.

## Keyboard shortcuts

| Keys           | What they do                                                  |
| -------------- | ------------------------------------------------------------- |
| Ctrl+K or /    | Command palette: run commands, add a task, or ask Claude      |
| N              | Add a task                                                    |
| T              | Go to the Today widget                                        |
| F              | Start, pause or carry on the focus timer                      |
| 1 to 9, [ , ]  | Switch boards                                                 |
| ?              | Show every shortcut, including the ones on a focused item     |

## Development

| Command           | What it does                                                         |
| ----------------- | -------------------------------------------------------------------- |
| `npm run dev`     | Dev server with the AI proxy                                         |
| `npm run build`   | Production build into `dist/`                                        |
| `npm run preview` | Serves the build, with the AI proxy                                  |
| `npm run api`     | The AI proxy on its own, at `http://127.0.0.1:8787`                  |
| `npm test`        | The test suite (Vitest and Testing Library)                          |

Widgets are registered in [src/widgets/registry.jsx](src/widgets/registry.jsx); each one's data lives in a hook (`useTasks`, `useEvents`, `useHabits`, …) and its storage key in [src/data/schema.js](src/data/schema.js), so backups cover it automatically. Saved data carries a version, and [src/data/migrate.js](src/data/migrate.js) upgrades older shapes on start-up.

## Roadmap

- [x] **Foundations.** Versioned storage with migrations, synced storage across tabs, export and import.
- [x] **Boards and quick-add.** Multiple boards, natural-language quick-add, keyboard shortcuts, accessibility and phone layout.
- [x] **Richer tasks.** Due dates, filters, steps, repeating tasks, bulk actions, a weekly chart.
- [x] **Time and planning.** Calendar, Focus timer, Clock, Today, reminders.
- [x] **Habits and goals.** Habits with streaks, Goals, the weekly review.
- [x] **An AI that acts.** The Assistant with proposals to apply and undo, Ask Claude from the palette, a fuller Daily Brief.
- [x] **Ship it.** Hosted on Vercel with a locked AI proxy, widgets loaded on demand, faster first paint.
- [ ] **Sync across devices.** An optional backend, so data follows you between browsers.
