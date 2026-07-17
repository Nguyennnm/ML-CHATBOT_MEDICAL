import dotenv from "dotenv";

dotenv.config();

function parseBoolean(value, fallback) {
  if (value === undefined) {
    return fallback;
  }

  return !["0", "false", "no"].includes(String(value).trim().toLowerCase());
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  dbPath: process.env.DB_PATH || "./data/medical_chatbot.sqlite",
  ragApiBaseUrl: process.env.RAG_API_BASE_URL || "",
  ragApiTimeoutMs: Number(process.env.RAG_API_TIMEOUT_MS || 180000),
  ragApiKey: process.env.RAG_API_KEY || "",
  ragApiKeyHeader: process.env.RAG_API_KEY_HEADER || "Authorization",
  ragApiTlsRejectUnauthorized: parseBoolean(
    process.env.RAG_API_TLS_REJECT_UNAUTHORIZED,
    process.env.NODE_ENV === "production"
  ),
  authTokenSecret:
    process.env.AUTH_TOKEN_SECRET || "medical-chatbot-local-development-secret",
  authTokenTtlSeconds: Number(process.env.AUTH_TOKEN_TTL_SECONDS || 60 * 60 * 24 * 7)
};
