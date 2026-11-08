// What the dashboard says about the AI assistant for each useAIHealth status: a short label (the
// Settings badge) and a note on what to do. Settings and every AI widget use the same words.
export const AI_STATUS = {
  checking: { label: 'Checking…', note: 'Looking for the local AI proxy.' },
  connected: { label: 'Connected', note: 'The API key stays in the AI proxy and never reaches this page.' },
  'not-configured': {
    label: 'Not connected',
    note: 'Enter your Anthropic API key in Settings, under AI assistant, or add ANTHROPIC_API_KEY to a .env file (see .env.example) and restart npm run dev.',
  },
  locked: {
    label: 'Needs a key',
    note: 'The AI runs on your own Anthropic API key, so you pay only for what you use. Enter it in Settings, under AI assistant.',
  },
  offline: {
    label: 'Proxy not running',
    note: 'The AI proxy runs with npm run dev. Start it, then check again.',
  },
};

export const describeAIStatus = (status) => AI_STATUS[status] ?? AI_STATUS['not-configured'];
