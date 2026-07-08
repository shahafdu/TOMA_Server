/**
 * @toma/shared — the domain model shared by the TOMA API and web client.
 *
 * These zod schemas are the contract source of truth: the API validates with them and the
 * client infers its types from them, so the two can never drift (plan §2.10). The OpenAPI
 * contract (plan T0.6) is generated from these definitions.
 */
export * from './ids.js';
export * from './common.js';
export * from './enums.js';
export * from './roles.js';
export * from './employee.js';
export * from './lecturer.js';
export * from './course.js';
export * from './registration.js';
export * from './attendance.js';
export * from './notification.js';
export * from './reports.js';
