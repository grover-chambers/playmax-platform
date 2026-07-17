const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const dir = path.join("C:", "PLAYMAX", "playmax-platform-master with analytical changes", "playmax-platform");
process.chdir(dir);

// Clean .next first to avoid stale cache
try { fs.rmSync(path.join(dir, ".next"), { recursive: true, force: true }); } catch {}

try {
  const output = execSync("npm run build 2>&1", { encoding: "utf-8", timeout: 180000, maxBuffer: 10 * 1024 * 1024 });
  const lines = output.split("\n");
  // Print summary
  const relevant = lines.filter(l =>
    l.includes("Failed to compile") ||
    l.includes("Compiled successfully") ||
    l.includes("Collecting page data") ||
    l.includes("Error occurred") ||
    l.includes("Build failed") ||
    l.includes("build exited") ||
    l.includes("exited with code") ||
    l.includes("Export encountered") ||
    l.includes("Linting") ||
    l.includes("Error:") ||
    l.includes("Warning:") ||
    l.includes("Route") ||
    l.includes("Static") ||
    l.includes("✓") ||
    l.includes("○") ||
    l.includes("λ") ||
    l.includes("ƒ")
  );
  console.log("=== BUILD OUTPUT (filtered) ===");
  console.log(relevant.join("\n"));
  console.log("\n=== LAST 20 LINES ===");
  console.log(lines.slice(-20).join("\n"));
} catch (e) {
  const out = e.stdout || e.stderr || e.message;
  const lines = out.split("\n");
  console.log("=== BUILD FAILED ===");
  console.log(lines.slice(-40).join("\n"));
}
