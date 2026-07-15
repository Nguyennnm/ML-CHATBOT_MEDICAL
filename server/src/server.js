import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { closeDb } from "./config/database.js";

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`Medical chatbot API listening on http://localhost:${env.port}`);
});

function shutdown() {
  server.close(() => {
    closeDb();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
