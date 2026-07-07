const nodeExternals = require('webpack-node-externals');

/**
 * Webpack config for `nest build`. The API consumes workspace TypeScript packages (@toma/shared,
 * @toma/contract) whose entry points are TS source with `.js` ESM import specifiers. Bundling
 * them (via the `allowlist`) makes the built artifact self-contained and side-steps raw-Node
 * module resolution, while ts-loader preserves the decorator metadata NestJS DI needs.
 * Third-party node_modules stay external (present in the Docker image at runtime).
 */
module.exports = (options) => ({
  ...options,
  externals: [
    nodeExternals({
      allowlist: [/^@toma\//],
    }),
  ],
  resolve: {
    ...options.resolve,
    extensionAlias: {
      ...(options.resolve?.extensionAlias ?? {}),
      // Resolve the `.js` specifiers used in @toma/* source to their `.ts` files.
      '.js': ['.ts', '.js'],
    },
  },
});
