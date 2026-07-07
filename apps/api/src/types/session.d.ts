import 'express-session';
import type { Role } from '@toma/shared';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    role?: Role;
  }
}
