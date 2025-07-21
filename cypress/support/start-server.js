const { startMongoMemoryServer } = require("./mongo-server");
const { spawn } = require("child_process");

(async () => {
  const uri = await startMongoMemoryServer();

  console.log("✅ Starting Next.js dev server...");

  const nextDev = spawn("yarn", ["dev"], {
    env: {
      ...process.env,
      DATABASE_URL: uri,
      NODE_ENV: "test",
    },
    stdio: "inherit",
    shell: true,
  });

  // Forward termination signals to clean up
  process.on("SIGINT", () => nextDev.kill("SIGINT"));
  process.on("SIGTERM", () => nextDev.kill("SIGTERM"));

  // Keep the script alive while Next.js runs
  nextDev.on("close", (code) => {
    console.log(`Next.js dev server exited with code ${code}`);
    process.exit(code);
  });
})();
