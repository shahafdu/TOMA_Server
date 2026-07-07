import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import mysql, { type Pool, type RowDataPacket } from 'mysql2/promise';
import { APP_CONFIG, type AppConfig } from '../config/config.js';

/**
 * Owns the MySQL/MariaDB connection pool. Queries are always parameterized (`?` placeholders) —
 * the legacy backend's string-interpolated SQL was injectable on nearly every route (§3.3 SB-1);
 * this layer closes that class of bug. The pool connects to `coma`; `emma.*` is reached via
 * qualified names, mirroring the legacy cross-database queries.
 */
@Injectable()
export class DbService implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    this.pool = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      connectionLimit: 10,
      // Reject multi-statement SQL — a defense-in-depth measure against injection.
      multipleStatements: false,
      // Return DATE/DATETIME as strings so date-only mapping is timezone-stable.
      dateStrings: true,
    });
  }

  async query<T extends RowDataPacket>(sql: string, params: unknown[] = []): Promise<T[]> {
    const [rows] = await this.pool.query<T[]>(sql, params);
    return rows;
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
