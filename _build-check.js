const { execSync } = require("child_process");
try {
  const output = execSync("npm run build 2>&1", { 
    cwd: __dirname,
    maxBuffer: 1024 * 1024 * 5,
    timeout: 120000
  });
  const lines = output.toString().split("\n");
  // Print last 50 lines
  console.log(lines.slice(-50).join("\n"));
} catch (e) {
  // Build failed, still print output
  const output = e.stdout ? e.stdout.toString() : "";
  const lines = output.split("\n");
  console.log(lines.slice(-60).join("\n"));
}
