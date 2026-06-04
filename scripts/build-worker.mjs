import * as esbuild from "esbuild";
import { fileURLToPath } from "url";
import path from "path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

await esbuild.build({
  entryPoints: [path.join(root, "worker.ts")],
  bundle: true,
  format: "esm",
  outfile: path.join(root, "build/client/_worker.js"),
  external: [
    "@base-org/account",
    "@coinbase/wallet-sdk",
    "@metamask/connect-evm",
    "porto",
    "@safe-global/safe-apps-sdk",
    "@safe-global/safe-apps-provider",
    "@walletconnect/ethereum-provider",
  ],
  conditions: ["workerd", "worker", "browser"],
  platform: "browser",
  target: "es2022",
  logLevel: "info",
});
