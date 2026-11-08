// What the dashboard says about the AI assistant for each useAIHealth status: a short label (the
// Settings badge) and a note on what to do. Settings and every AI widget use the same words.
export const AI_STATUS = {
  checking: { label: 'Checking…', note: 'Looking for the local AI proxy.' },
  connected: { label: 'Connected', note: 'Your API key stays in the local proxy and never reaches this page.' },
  'not-configured': {
    label: 'Not connected',
    note: 'Add ANTHROPIC_API_KEY to a .env file (see .env.example), then restart npm run dev.',
  },
  offline: {
    label: 'Proxy not running',
    note: 'The AI proxy runs with npm run dev. Start it, then check again.',
  },
};

export const describeAIStatus = (status) => AI_STATUS[status] ?? AI_STATUS['not-configured'];
