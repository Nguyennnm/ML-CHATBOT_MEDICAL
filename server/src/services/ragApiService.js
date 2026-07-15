import http from "node:http";
import https from "node:https";
import { env } from "../config/env.js";
import { HttpError } from "../utils/httpError.js";

function buildUrl(pathname) {
  return new URL(pathname, env.ragApiBaseUrl);
}

function buildHeaders(body) {
  const headers = {
    Accept: "application/json",
    "ngrok-skip-browser-warning": "true"
  };

  if (body) {
    headers["Content-Type"] = "application/json";
    headers["Content-Length"] = Buffer.byteLength(body);
  }

  if (!env.ragApiKey) {
    return headers;
  }

  if (env.ragApiKeyHeader.toLowerCase() === "authorization") {
    headers.Authorization = env.ragApiKey.startsWith("Bearer ")
      ? env.ragApiKey
      : `Bearer ${env.ragApiKey}`;
    return headers;
  }

  headers[env.ragApiKeyHeader] = env.ragApiKey;
  return headers;
}

function parseJson(text) {
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function requestJson(pathname, options = {}) {
  const url = buildUrl(pathname);
  const body = options.body || "";
  const transport = url.protocol === "http:" ? http : https;

  return new Promise((resolve, reject) => {
    const request = transport.request(
      {
        method: options.method || "GET",
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port,
        path: `${url.pathname}${url.search}`,
        headers: {
          ...buildHeaders(body),
          ...options.headers
        },
        timeout: env.ragApiTimeoutMs,
        rejectUnauthorized: env.ragApiTlsRejectUnauthorized
      },
      (response) => {
        let raw = "";

        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          raw += chunk;
        });
        response.on("end", () => {
          const data = parseJson(raw);

          if (response.statusCode < 200 || response.statusCode >= 300) {
            const message =
              data.detail || data?.error?.message || data.raw || "RAG API request failed";
            reject(
              new HttpError(502, message, {
                upstreamStatus: response.statusCode,
                upstreamResponse: data
              })
            );
            return;
          }

          resolve(data);
        });
      }
    );

    request.on("timeout", () => {
      request.destroy(new HttpError(504, "RAG API request timed out"));
    });

    request.on("error", (error) => {
      if (error instanceof HttpError) {
        reject(error);
        return;
      }

      reject(
        new HttpError(502, error.message || "Unable to connect to RAG API", {
          code: error.code
        })
      );
    });

    if (body) {
      request.write(body);
    }

    request.end();
  });
}

export const RagApiService = {
  health() {
    return requestJson("/health");
  },

  chat({ query, sessionId }) {
    return requestJson("/api/chat", {
      method: "POST",
      body: JSON.stringify({
        query,
        session_id: sessionId
      })
    });
  }
};
