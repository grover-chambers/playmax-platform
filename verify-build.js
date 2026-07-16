const { execSync } = require("child_process");
const fs = require("fs");
try {
  execSync("npx next build 2>&1", { encoding: "utf-8", maxBuffer: 10*1024*1024, timeout: 240000 });
  fs.writeFileSync("build-result.txt", "BUILD_OK");
} catch (e) {
  const out = (e.stdout || "") + (e.stderr || "");
  fs.writeFileSync("build-result.txt", "FAILED\n" + out.slice(-2000));
}
