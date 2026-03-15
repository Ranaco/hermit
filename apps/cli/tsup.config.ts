import { defineConfig, type Options } from "tsup";

// ESM build — published to npm, used when installed via `npm i -g @hermit/cli`
const esmConfig: Options = {
  entry: ["src/index.ts", "src/lib/ui.ts"],
  clean: true,
  format: ["esm"],
  target: "node18",
  banner: {
    js: "#!/usr/bin/env node",
  },
  define: {
    __VERSION__: JSON.stringify(process.env.npm_package_version ?? "0.0.0"),
  },
};

// CJS bundle — input for @yao-pkg/pkg to produce standalone binaries
const cjsConfig: Options = {
  entry: { "index": "src/index.ts" },
  format: ["cjs"],
  target: "node18",
  outDir: "dist",
  bundle: true,
  noExternal: [/.*/],
  shims: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
  define: {
    __VERSION__: JSON.stringify(process.env.npm_package_version ?? "0.0.0"),
  },
  clean: false,
};

export default defineConfig((options: Options) =>
  options.watch ? esmConfig : [esmConfig, cjsConfig]
);
