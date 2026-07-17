const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

let authToken = "";

export function setAuthToken(token) {
  authToken = token || "";
}

function authHeaders() {
  return authToken ? { Authorization: `Bearer ${authToken}` } : {};
}

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Accept: "application/json",
      ...authHeaders(),
      ...options.headers
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data?.error?.message || "Request failed");
    error.statusCode = response.status;
    throw error;
  }

  return data;
}

function parseSseBlock(block) {
  const lines = block.split(/\r?\n/);
  let event = "message";
  const dataLines = [];

  for (const line of lines) {
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
    }

    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  const rawData = dataLines.join("\n");

  return {
    event,
    data: rawData ? JSON.parse(rawData) : {}
  };
}

async function requestStream(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Accept: "text/event-stream",
      ...authHeaders(),
      ...options.headers
    },
    body: options.body,
    signal: options.signal
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const error = new Error(data?.error?.message || "Request failed");
    error.statusCode = response.status;
    throw error;
  }

  if (!response.body) {
    throw new Error("Streaming is not supported by this browser");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let donePayload = null;

  while (true) {
    const { value, done } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() || "";

    for (const block of blocks) {
      if (!block.trim()) {
        continue;
      }

      const payload = parseSseBlock(block);
      options.onEvent?.(payload);

      if (payload.event === "done") {
        donePayload = payload.data;
      }

      if (payload.event === "error") {
        throw new Error(payload.data?.message || "Streaming request failed");
      }
    }
  }

  if (buffer.trim()) {
    const payload = parseSseBlock(buffer);
    options.onEvent?.(payload);

    if (payload.event === "done") {
      donePayload = payload.data;
    }
  }

  return donePayload;
}

export const api = {
  health() {
    return request("/health");
  },

  register({ name, email, password }) {
    return request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password })
    });
  },

  login({ email, password }) {
    return request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
  },

  me() {
    return request("/auth/me");
  },

  listConversations() {
    return request("/conversations");
  },

  createConversation(title) {
    return request("/conversations", {
      method: "POST",
      body: JSON.stringify({ title })
    });
  },

  renameConversation(conversationId, title) {
    return request(`/conversations/${conversationId}`, {
      method: "PATCH",
      body: JSON.stringify({ title })
    });
  },

  getMessages(conversationId) {
    return request(`/conversations/${conversationId}/messages`);
  },

  deleteConversation(conversationId) {
    return request(`/conversations/${conversationId}`, {
      method: "DELETE"
    });
  },

  sendMessage({ message, conversationId }) {
    return request("/chat", {
      method: "POST",
      body: JSON.stringify({ message, conversationId })
    });
  },

  streamMessage({ message, conversationId, onEvent, signal }) {
    return requestStream("/chat/stream", {
      body: JSON.stringify({ message, conversationId }),
      onEvent,
      signal
    });
  }
};
