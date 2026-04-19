import { readFileSync } from "node:fs";
import { vitePlugin as remix } from "@remix-run/dev";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

function loadDevVars(): Record<string, string> {
  try {
    return Object.fromEntries(
      readFileSync(".dev.vars", "utf-8")
        .split("\n")
        .filter((l) => l.trim() && !l.startsWith("#"))
        .map((l) => {
          const eq = l.indexOf("=");
          return eq === -1 ? null : [l.slice(0, eq).trim(), l.slice(eq + 1).trim()];
        })
        .filter(Boolean) as [string, string][]
    );
  } catch {
    return {};
  }
}

const devVars = loadDevVars();

export default defineConfig({
  plugins: [
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_singleFetch: true,
        v3_lazyRouteDiscovery: true,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getLoadContext: () => ({ cloudflare: { env: devVars } }) as any,
    }),
    tailwindcss(),
    tsconfigPaths(),
  ],
});
