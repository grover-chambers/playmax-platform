const { spawn } = require("child_process");
const fs = require("fs");
process.chdir("C:\\PM");
const child = spawn("npm", ["run", "build"], { stdio: ["ignore", "pipe", "pipe"], shell: true });
let out = "";
child.stdout.on("data", d => out += d);
child.stderr.on("data", d => out += d);
child.on("close", code => {
  const last = out.split("\n").filter(l => l.trim()).slice(-30).join("\n");
  fs.writeFileSync("_result.txt", code === 0 ? "BUILD_OK\n" + last : "BUILD_FAILED (exit " + code + ")\n" + last);
});
