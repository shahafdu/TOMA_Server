import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildOpenApiDocument } from './document.js';

/** Fail CI if the committed openapi.json is out of date with the schemas. */
const outPath = fileURLToPath(new URL('../openapi.json', import.meta.url));
const expected = JSON.stringify(buildOpenApiDocument(), null, 2) + '\n';

let actual = '';
try {
  actual = readFileSync(outPath, 'utf8');
} catch {
  console.error('openapi.json is missing — run `npm run contract:gen`.');
  process.exit(1);
}

if (actual !== expected) {
  console.error('openapi.json is out of date — run `npm run contract:gen` and commit the result.');
  process.exit(1);
}
console.log('openapi.json is up to date.');
