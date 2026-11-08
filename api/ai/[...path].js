import { createAiHandler, DEFAULT_MODEL } from '../../server/aiHandler.js';

// The AI proxy as a Vercel function: every /api/ai/* request on the hosted site lands here and
// goes to the same handler `npm run dev` uses. Set these in the Vercel project's Environment
// Variables (never in the code):
//   ANTHROPIC_API_KEY   the key the proxy calls Claude with
//   AI_ACCESS_KEY       what the dashboard must send to use it (entered once in Settings);
//                       without it the hosted AI stays shut, so nobody else spends your credit
//   ANTHROPIC_MODEL     optional, the model to use
const handler = createAiHandler({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
  accessKey: process.env.AI_ACCESS_KEY,
});

export default function aiProxy(req, res) {
  // The handler routes on the path; should the platform hand over only the catch-all part,
  // put the full path back together from it.
  const path = (req.url ?? '').split('?')[0];
  if (!path.startsWith('/api/ai/') && req.query?.path) {
    req.url = `/api/ai/${[].concat(req.query.path).join('/')}`;
  }
  return handler(req, res);
}
