import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

function redirectPianoEntry(server) {
  server.middlewares.use((request, response, next) => {
    const url = request.url || '';
    if (url === '/piano' || url.startsWith('/piano?')) {
      response.writeHead(308, { Location: `/piano/${url.slice('/piano'.length)}` });
      response.end();
      return;
    }
    next();
  });
}

export default defineConfig({
  plugins: [vue(), {
    name: 'piano-entry-redirect',
    configureServer: redirectPianoEntry,
    configurePreviewServer: redirectPianoEntry,
  }],
  base: process.env.VITE_BASE_PATH || '/piano/',
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
});
