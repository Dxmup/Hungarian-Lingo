/* Zero-dependency static server for local development.
 *
 * Production hosting (Vercel, GitHub Pages, any static host) serves
 * public/ directly — this exists so `npm start` works without a toolchain.
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, 'public');
const PORT = process.env.PORT || 3000;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const rel = url === '/' ? 'index.html' : url.slice(1);
  const file = path.join(ROOT, rel);

  // Never serve outside public/, however creative the path is.
  if (!file.startsWith(ROOT)) { res.writeHead(403).end('Forbidden'); return; }

  fs.readFile(file, (err, body) => {
    if (err) { res.writeHead(404).end('Not found'); return; }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
      // The service worker must never be served stale, or updates never land.
      'Cache-Control': rel === 'sw.js' ? 'no-cache' : 'no-store',
    });
    res.end(body);
  });
}).listen(PORT, () => console.log(`Hungarian Lingo → http://localhost:${PORT}`));
