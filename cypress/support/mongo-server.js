const { MongoMemoryReplSet } = require("mongodb-memory-server");
const { execSync } = require("child_process");

let replSet;

async function startMongoMemoryServer() {
  replSet = await MongoMemoryReplSet.create({
    replSet: { storageEngine: "wiredTiger" },
  });

  // Wait for it to fully initialize
  await replSet.waitUntilRunning();

  const uri = replSet.getUri("test-db"); // Must include DB name
  process.env.DATABASE_URL = uri;

  console.log("✅ Using DATABASE_URL:", uri);

  // Wait 1 second just to be safe (optional, can be tuned)
  await new Promise((r) => setTimeout(r, 1000));

  // Now Prisma should succeed
  execSync("npx prisma db push", { stdio: "inherit" });

  return uri;
}

async function stopMongoMemoryServer() {
  if (replSet) await replSet.stop();
}

module.exports = {
  startMongoMemoryServer,
  stopMongoMemoryServer,
};
