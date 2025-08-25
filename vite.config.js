import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: 'src',
  build: {
    outDir: '../web',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html'),
        send: resolve(__dirname, 'src/send/index.html')
      }
    }
  },
  optimizeDeps: {
    include: [
      // List dependencies you want to pre-bundle here. Example:
      // 'pusher',
    ]
  },
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'github-mark.svg',
          dest: '.'
        },
        {
          src: 'github-mark-white.svg',
          dest: '.'
        }
      ]
    })
  ]
});
