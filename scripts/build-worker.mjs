import * as esbuild from "esbuild";
import { fileURLToPath } from "url";
import path from "path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const browserOnlyStubs = [
  "@base-org/account",
  "@coinbase/wallet-sdk",
  "@metamask/connect-evm",
  "porto",
  "porto/internal",
  "@safe-global/safe-apps-sdk",
  "@safe-global/safe-apps-provider",
  "@walletconnect/ethereum-provider",
];

const stubPlugin = {
  name: "browser-only-stubs",
  setup(build) {
    build.onResolve({ filter: /.*/ }, (args) => {
      if (browserOnlyStubs.some(pkg => args.path === pkg || args.path.startsWith(pkg + "/"))) {
        return { path: args.path, namespace: "browser-stub" };
      }
    });
    build.onLoad({ filter: /.*/, namespace: "browser-stub" }, () => ({
      contents: "export default {}",
      loader: "js",
    }));
  },
};

await esbuild.build({
  entryPoints: [path.join(root, "worker.ts")],
  bundle: true,
  format: "esm",
  outfile: path.join(root, "build/client/_worker.js"),
  plugins: [stubPlugin],
  conditions: ["workerd", "worker", "browser"],
  platform: "browser",
  target: "es2022",
  logLevel: "info",
});
