import { createAiHandler, DEFAULT_MODEL } from '../../server/aiHandler.js';

// The AI proxy as a Vercel function: every /api/ai/* request on the hosted site lands here and
// goes to the same handler `npm run dev` uses. Set these in the Vercel project's Environment
// Variables (never in the code):
//   ANTHROPIC_API_KEY   optional: your key, to share with people you give AI_ACCESS_KEY to
//   AI_ACCESS_KEY       optional: what a visitor enters in Settings to use ANTHROPIC_API_KEY;
//                       without it your key is never used here
//   ANTHROPIC_MODEL     optional, the model to use
// Visitors can always use the AI with their own Anthropic key, entered in Settings; then the
// call is made with their key and billed to them.
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
