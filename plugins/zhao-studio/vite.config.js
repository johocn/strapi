import { defineConfig } from 'vite';

// bullmq v5 ships ESM + CJS dual entry.
// vite's server bundle picks ESM ("module" field) which breaks Node.js CJS runtime.
// Force external so Node loads the correct CJS entry at runtime.
export default defineConfig({
  server: {
    external: ['bullmq'],
  },
});
