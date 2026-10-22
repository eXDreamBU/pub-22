import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// Relative base so the build works under the GitHub Pages sub-path (/pub-22/).
export default defineConfig({
  base: './',
  plugins: [svelte()],
});
