const { execSync } = require("child_process");
process.chdir(__dirname);
try {
  const out = execSync("npm run build", { encoding: "utf8", stdio: "pipe", timeout: 120000 });
  console.log(out);
} catch (e) {
  console.log(e.stdout || "");
  console.error(e.stderr || "");
  process.exit(e.status || 1);
}
