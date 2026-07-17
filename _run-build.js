const { execSync } = require("child_process");
const path = require("path");
const dir = path.join("C:", "PLAYMAX", "playmax-platform-master with analytical changes", "playmax-platform");
process.chdir(dir);
const output = execSync("npm run build", { encoding: "utf-8", timeout: 180000, stdio: ["pipe", "pipe", "pipe"] });
const lines = output.split("\n");
console.log(lines.slice(-60).join("\n"));
