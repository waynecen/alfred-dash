import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { createAiHandler, DEFAULT_MODEL } from './server/aiHandler.js';

// Mounts the AI proxy (server/aiHandler.js) inside Vite's own server, so `npm run dev` and
// `npm run preview` serve /api/ai/* from the same address as the page. The key is read here, in
// Node, without the VITE_ prefix, so Vite never puts it into the browser bundle.
function aiProxy(env) {
  const handler = createAiHandler({
    apiKey: env.ANTHROPIC_API_KEY,
    model: env.ANTHROPIC_MODEL || DEFAULT_MODEL,
  });
  return {
    name: 'ai-proxy',
    configureServer: (server) => void server.middlewares.use(handler),
    configurePreviewServer: (server) => void server.middlewares.use(handler),
  };
}

export default defineConfig(({ mode }) => {
  // '' loads every variable from .env, not just VITE_ ones; they stay in this Node process.
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), aiProxy(env)],
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.js',
      globals: true, // lets Testing Library clean up after each test automatically
    },
  };
});
