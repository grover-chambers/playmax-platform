const { execSync } = require("child_process");
try {
  const out = execSync("npm run build", { cwd: ".", encoding: "utf8", timeout: 180000 });
  console.log(out);
} catch (e) {
  if (e.stdout) console.log(e.stdout);
  if (e.stderr) console.log(e.stderr);
  process.exit(e.status || 1);
}
