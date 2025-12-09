const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['src/worker/worker-debug.ts'],
  outfile: 'extension-chrome/background.js',
  bundle: true,
  platform: 'browser',
  format: 'iife',
  target: 'chrome110',
  sourcemap: false,
}).catch(() => process.exit(1));
