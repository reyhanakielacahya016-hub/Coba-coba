// Plugin Vite kecil untuk PWA Saku:
// - membuat manifest.webmanifest dengan start_url/scope sesuai `base` (mis. /Coba-coba/)
// - membuat sw.js berisi daftar file hasil build untuk dipakai offline
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const APP = {
  name: 'Saku · Uang Bulananmu',
  short_name: 'Saku',
  description: 'Catat uang bulanan anak kos dengan cepat dan tenang. Data tersimpan di perangkatmu.',
  lang: 'id',
  theme_color: '#F7F3EC',
  background_color: '#F7F3EC',
};

export function buildManifest(base) {
  return {
    id: base,
    name: APP.name,
    short_name: APP.short_name,
    description: APP.description,
    lang: APP.lang,
    dir: 'ltr',
    start_url: base,
    scope: base,
    display: 'standalone',
    orientation: 'portrait',
    theme_color: APP.theme_color,
    background_color: APP.background_color,
    categories: ['finance', 'productivity'],
    icons: [
      { src: `${base}icons/icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `${base}icons/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: `${base}icons/icon-maskable-192.png`, sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: `${base}icons/icon-maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      {
        name: 'Catat transaksi',
        short_name: 'Catat',
        url: `${base}#/catat`,
        icons: [{ src: `${base}icons/icon-192.png`, sizes: '192x192', type: 'image/png' }],
      },
    ],
  };
}

function listFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...listFiles(p));
    else out.push(p);
  }
  return out;
}

export function sakuPwa() {
  let config;
  return {
    name: 'saku-pwa',
    configResolved(c) {
      config = c;
    },
    // saat `npm run dev`, layani manifest supaya tag <link> tidak 404
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === `${config.base}manifest.webmanifest`) {
          res.setHeader('Content-Type', 'application/manifest+json');
          res.end(JSON.stringify(buildManifest(config.base), null, 2));
          return;
        }
        next();
      });
    },
    generateBundle(_, bundle) {
      const base = config.base;
      this.emitFile({
        type: 'asset',
        fileName: 'manifest.webmanifest',
        source: JSON.stringify(buildManifest(base), null, 2),
      });

      // file hasil build (js/css/font) + file dari folder public/
      const built = Object.keys(bundle).filter((f) => !/\.(woff)$/.test(f) && !f.endsWith('.map'));
      const publicDir = config.publicDir;
      const pub = listFiles(publicDir).map((f) => relative(publicDir, f).split('\\').join('/'));
      const precache = ['./', 'index.html', 'manifest.webmanifest', ...pub, ...built.filter((f) => f !== 'index.html')];
      const unique = [...new Set(precache)].sort();
      const version = createHash('sha1').update(unique.join('|')).update(String(Date.now())).digest('hex').slice(0, 10);

      const template = readFileSync(new URL('./sw.js', import.meta.url), 'utf8');
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: template.replace("'__SAKU_VERSION__'", JSON.stringify(version)).replace('__SAKU_PRECACHE__', JSON.stringify(unique, null, 2)),
      });
    },
  };
}
