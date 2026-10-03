import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const base = process.env.GITHUB_ACTIONS === 'true' && repositoryName
  ? `/${repositoryName}/`
  : '/';

export default defineConfig({
  base,
  build: {
    rollupOptions: {
      input: {
        game: resolve(import.meta.dirname, 'index.html'),
        uiLab: resolve(import.meta.dirname, 'ui-lab.html'),
      },
    },
  },
});