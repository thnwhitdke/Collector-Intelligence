import { spawnSync } from "node:child_process";

console.log("\n▶ Warehouse Metrics Refresh");

const result = spawnSync("npm", ["run", "warehouse:refresh-metrics"], {
  stdio: "inherit",
  shell: false,
});

if (result.status !== 0) {
  console.error("❌ Warehouse Metrics Refresh failed");
  process.exit(result.status ?? 1);
}

console.log("✅ Warehouse Metrics Refresh completed");
