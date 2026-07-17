const { spawn } = require("child_process");
const fs = require("fs");

const dir = "C:\\PLAYMAX\\playmax-platform-master with analytical changes\\playmax-platform";
process.chdir(dir);

const child = spawn("npx", ["tsc", "--noEmit"], { 
  cwd: dir,
  shell: true, 
  stdio: ["ignore", "pipe", "pipe"] 
});

let stdout = "";
let stderr = "";
child.stdout.on("data", d => stdout += d.toString());
child.stderr.on("data", d => stderr += d.toString());

child.on("close", code => {
  const combined = (stdout + "\n" + stderr).trim();
  const lines = combined.split("\n").filter(l => l.includes("error TS") || l.includes("Error") || l.includes("src/"));
  fs.writeFileSync("C:\\PLAYMAX\\_tsc-result.txt", 
    `EXIT CODE: ${code}\nERRORS: ${lines.length}\n\n` + 
    (lines.length > 0 ? lines.slice(0, 50).join("\n") : "No type errors found")
  );
});
