// Script to dump key files for reading
const fs = require("fs");
const path = require("path");
const dir = path.join("C:", "PLAYMAX", "playmax-platform-master with analytical changes", "playmax-platform");

const files = [
  "src/app/app/analytics/upload/page.tsx",
  "src/app/api/analytics/uploads/route.ts",
];

for (const f of files) {
  const full = path.join(dir, f);
  if (fs.existsSync(full)) {
    console.log("===== " + f + " =====");
    console.log(fs.readFileSync(full, "utf-8"));
    console.log("\n\n");
  } else {
    console.log("MISSING: " + f);
  }
}
