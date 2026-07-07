import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildOpenApiDocument } from './document.js';

const outPath = fileURLToPath(new URL('../openapi.json', import.meta.url));
const json = JSON.stringify(buildOpenApiDocument(), null, 2) + '\n';
writeFileSync(outPath, json);
console.log(`Wrote ${outPath}`);
