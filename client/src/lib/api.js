const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Accept: "application/json",
      ...options.headers
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error?.message || "Request failed");
  }

  return data;
}

export const api = {
  health() {
    return request("/health");
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
  }
};
