import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

// Helper to write a vite config for a single entry
function writeViteConfig(entry, outDir) {
  const config = `import { defineConfig } from 'vite';\nimport { viteSingleFile } from 'vite-plugin-singlefile';\n\nexport default defineConfig({\n  root: 'src',\n  build: {\n    outDir: '${outDir}',\n    emptyOutDir: false,\n    rollupOptions: {\n      input: '${entry}'\n    }\n  },\n  plugins: [viteSingleFile()]\n});\n`;
  writeFileSync('vite.singlefile.config.js', config);
}

// Build index.html
writeViteConfig('src/index.html', '../web');
execSync('vite build --config vite.singlefile.config.js', { stdio: 'inherit' });

// Build send/index.html
writeViteConfig('src/send/index.html', '../web/send');
execSync('vite build --config vite.singlefile.config.js', { stdio: 'inherit' });

// Clean up temp config
import { unlinkSync } from 'fs';
unlinkSync('vite.singlefile.config.js');
