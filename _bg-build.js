const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const dir = path.join("C:", "PLAYMAX", "playmax-platform-master with analytical changes", "playmax-platform");
process.chdir(dir);

const child = spawn("npx", ["next", "build"], { 
  cwd: dir,
  shell: true, 
  stdio: ["ignore", "pipe", "pipe"] 
});

let stdout = "";
let stderr = "";
child.stdout.on("data", d => stdout += d.toString());
child.stderr.on("data", d => stderr += d.toString());

child.on("close", code => {
  const combined = stdout + "\n" + stderr;
  const lines = combined.split("\n");
  const filtered = lines.filter(l => 
    l.includes("Failed") || l.includes("Compiled") || l.includes("Error:") ||
    l.includes("Warning:") || l.includes("build exited") || l.includes("✓") ||
    l.includes("○") || l.includes("λ") || l.includes("Linting") ||
    l.includes("prerender") || l.includes("Export") || l.includes("Type error") ||
    l.includes("EXIT") || l.includes("collecting") || l.includes("Static") ||
    l.includes("info") || l.includes("error") || l.includes("warn")
  );
  const result = `EXIT CODE: ${code}\n\n` + 
    (filtered.length > 0 ? filtered.join("\n") : lines.slice(-30).join("\n"));
  fs.writeFileSync("C:\\PLAYMAX\\_build-result.txt", result);
});
