const nodeExternals = require('webpack-node-externals');

/**
 * Webpack config for `nest build`. The API consumes workspace TypeScript packages (@toma/shared,
 * @toma/contract) whose entry points are TS source with `.js` ESM import specifiers. Bundling
 * them (via the `allowlist`) makes the built artifact self-contained and side-steps raw-Node
 * module resolution, while ts-loader preserves the decorator metadata NestJS DI needs.
 * Third-party node_modules stay external (present in the Docker image at runtime).
 */

// Inject options into whichever ts-loader entries a webpack rule uses, whether it declares the
// loader at the top level (`rule.loader`) or inside a `use` array (`rule.use[].loader`).
function patchTsLoader(rule, extraOptions) {
  if (!rule || typeof rule !== 'object') return rule;
  const isTsLoader = (l) => typeof l === 'string' && l.includes('ts-loader');
  if (isTsLoader(rule.loader)) {
    return { ...rule, options: { ...(rule.options ?? {}), ...extraOptions } };
  }
  if (Array.isArray(rule.use)) {
    return {
      ...rule,
      use: rule.use.map((u) =>
        u && typeof u === 'object' && isTsLoader(u.loader)
          ? { ...u, options: { ...(u.options ?? {}), ...extraOptions } }
          : u,
      ),
    };
  }
  return rule;
}

module.exports = (options) => ({
  ...options,
  externals: [
    nodeExternals({
      allowlist: [/^@toma\//],
    }),
  ],
  module: {
    ...options.module,
    // `transpileOnly` (already set by nest) skips semantic checks, but ts-loader still surfaces
    // tsconfig *options* diagnostics such as TS6059. On Windows the @toma/* workspace symlinks are
    // realpath-resolved to a lowercase `c:` that differs from the canonical uppercase `C:` rootDir,
    // which fires a spurious TS6059. Ignoring just that code keeps the build working on Windows
    // without weakening real type checking (the dedicated `typecheck` script + CI gate still run).
    rules: (options.module?.rules ?? []).map((rule) =>
      patchTsLoader(rule, { transpileOnly: true, ignoreDiagnostics: [6059] }),
    ),
  },
  resolve: {
    ...options.resolve,
    extensionAlias: {
      ...(options.resolve?.extensionAlias ?? {}),
      // Resolve the `.js` specifiers used in @toma/* source to their `.ts` files.
      '.js': ['.ts', '.js'],
    },
  },
});
