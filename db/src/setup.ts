import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

/**
 * Applies the ordered SQL files in ../sql to (re)create the mockup DB: the two legacy schemas
 * (`coma`, `emma`), the app user, and synthetic seed data. Idempotent — it drops and recreates.
 *
 * Connects as an admin user, via a unix socket (local dev: `MOCKDB_SOCKET`) or TCP (CI service:
 * `MOCKDB_HOST`/`MOCKDB_ROOT_PASSWORD`).
 */
const sqlDir = fileURLToPath(new URL('../sql', import.meta.url));
const files = readdirSync(sqlDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

const socket = process.env.MOCKDB_SOCKET;
const connection = await mysql.createConnection(
  socket
    ? {
        socketPath: socket,
        user: process.env.MOCKDB_ROOT_USER ?? 'root',
        password: process.env.MOCKDB_ROOT_PASSWORD ?? '',
        multipleStatements: true,
      }
    : {
        host: process.env.MOCKDB_HOST ?? '127.0.0.1',
        port: Number(process.env.MOCKDB_PORT ?? 3306),
        user: process.env.MOCKDB_ROOT_USER ?? 'root',
        password: process.env.MOCKDB_ROOT_PASSWORD ?? '',
        multipleStatements: true,
      },
);

for (const file of files) {
  const sql = readFileSync(join(sqlDir, file), 'utf8');
  await connection.query(sql);
  console.log(`applied ${file}`);
}

await connection.end();
console.log('Mockup DB ready (schemas coma + emma, user toma).');
