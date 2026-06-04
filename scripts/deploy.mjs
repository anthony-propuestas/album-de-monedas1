import { renameSync, existsSync } from "fs";
import { execSync } from "child_process";

const src = "functions";
const tmp = "functions.dev.bak";

if (existsSync(src)) renameSync(src, tmp);
try {
  execSync("wrangler pages deploy ./build/client", { stdio: "inherit" });
} finally {
  if (existsSync(tmp)) renameSync(tmp, src);
}
