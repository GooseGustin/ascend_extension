const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['src/worker/worker-debug.ts'], // change to worker.ts for production
  outfile: 'extension-chrome/background.js', // change to extension-firefox/background.js for firefox
  bundle: true,
  platform: 'browser',
  format: 'iife',
  target: 'chrome110',
  sourcemap: false,
}).catch(() => process.exit(1));
