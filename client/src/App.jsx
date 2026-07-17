import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { api, setAuthToken } from "./lib/api.js";
import { AuthPanel } from "./components/AuthPanel.jsx";
import { ChatHeader } from "./components/ChatHeader.jsx";
import { ChatWindow } from "./components/ChatWindow.jsx";
import { Composer } from "./components/Composer.jsx";
import { Sidebar } from "./components/Sidebar.jsx";

const AUTH_STORAGE_KEY = "medqa-session";

function upsertConversation(conversations, conversation) {
  if (!conversation) {
    return conversations;
  }

  const existing = conversations.find((item) => item.id === conversation.id);
  const nextConversation = {
    ...existing,
    ...conversation,
    messageCount: conversation.messageCount ?? existing?.messageCount ?? 1
  };

  return [
    nextConversation,
    ...conversations.filter((item) => item.id !== conversation.id)
  ];
}

function readStoredSession() {
  try {
    const rawSession = localStorage.getItem(AUTH_STORAGE_KEY);
    return rawSession ? JSON.parse(rawSession) : null;
  } catch {
    return null;
  }
}

function writeStoredSession(session) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

function clearStoredSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export default function App() {
  const [apiStatus, setApiStatus] = useState("checking");
  const [session, setSession] = useState(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState("");
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");

  const activeConversationId = activeConversation?.id;

  async function loadInitialConversations(cancelledRef = { current: false }) {
    const data = await api.listConversations();

    if (cancelledRef.current) {
      return;
    }

    setConversations(data.conversations);

    if (data.conversations.length > 0) {
      const first = data.conversations[0];
      setActiveConversation(first);
      const messageData = await api.getMessages(first.id);
      if (!cancelledRef.current) {
        setMessages(messageData.messages);
      }
    } else {
      setActiveConversation(null);
      setMessages([]);
    }
  }

  async function refreshConversations(preferredId = activeConversationId) {
    const data = await api.listConversations();
    setConversations(data.conversations);

    if (preferredId) {
      const nextActive = data.conversations.find((item) => item.id === preferredId);
      if (nextActive) {
        setActiveConversation(nextActive);
      }
    }
  }

  async function loadConversation(conversation) {
    setError("");
    setActiveConversation(conversation);
    const data = await api.getMessages(conversation.id);
    setMessages(data.messages);
  }

  useEffect(() => {
    const cancelledRef = { current: false };

    async function boot() {
      try {
        await api.health();
        if (!cancelledRef.current) {
          setApiStatus("online");
        }

        const storedSession = readStoredSession();

        if (!storedSession?.token) {
          return;
        }

        setAuthToken(storedSession.token);
        const profile = await api.me();

        if (cancelledRef.current) {
          return;
        }

        const nextSession = {
          token: storedSession.token,
          user: profile.user
        };
        setSession(nextSession);
        writeStoredSession(nextSession);
        await loadInitialConversations(cancelledRef);
      } catch (bootError) {
        if (!cancelledRef.current) {
          if (bootError.statusCode === 401) {
            setAuthToken("");
            clearStoredSession();
            setSession(null);
          } else {
            setApiStatus("offline");
            setError(bootError.message);
            setAuthError(bootError.message);
          }
        }
      }
    }

    boot();

    return () => {
      cancelledRef.current = true;
    };
  }, []);

  async function completeAuth(authPromise) {
    setIsAuthenticating(true);
    setAuthError("");
    setError("");

    try {
      const result = await authPromise;
      const nextSession = {
        token: result.token,
        user: result.user
      };

      setAuthToken(result.token);
      setSession(nextSession);
      writeStoredSession(nextSession);
      setConversations([]);
      setActiveConversation(null);
      setMessages([]);
      await loadInitialConversations();
    } catch (authFailure) {
      setAuthError(authFailure.message);
    } finally {
      setIsAuthenticating(false);
    }
  }

  function handleLogin(credentials) {
    completeAuth(api.login(credentials));
  }

  function handleRegister(payload) {
    completeAuth(api.register(payload));
  }

  function handleLogout() {
    setAuthToken("");
    clearStoredSession();
    setSession(null);
    setConversations([]);
    setActiveConversation(null);
    setMessages([]);
    setInput("");
    setError("");
    setAuthError("");
  }

  async function handleSend(event) {
    event.preventDefault();

    const draft = input.trim();
    if (!draft || isSending) {
      return;
    }

    const messageSeed = Date.now();
    const tempMessage = {
      id: `temp-${messageSeed}`,
      role: "user",
      content: draft,
      createdAt: new Date().toISOString()
    };
    const assistantMessageId = `stream-${messageSeed}`;
    const assistantMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      meta: {
        isStreaming: true,
        streamStatus: "Đang kết nối với mô hình y tế",
        sources: []
      },
      createdAt: new Date().toISOString()
    };
    let persistedUserMessage = false;
    let streamedContent = "";

    setInput("");
    setError("");
    setIsSending(true);
    setMessages((current) => [...current, tempMessage, assistantMessage]);

    try {
      const result = await api.streamMessage({
        message: draft,
        conversationId: activeConversationId,
        onEvent: ({ event, data }) => {
          if (event === "conversation") {
            persistedUserMessage = true;
            setActiveConversation(data.conversation);
            setConversations((current) => upsertConversation(current, data.conversation));
            setMessages((current) =>
              current.map((message) =>
                message.id === tempMessage.id ? data.userMessage : message
              )
            );
          }

          if (event === "status") {
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantMessageId
                  ? {
                      ...message,
                      meta: {
                        ...message.meta,
                        streamStatus: data.message
                      }
                    }
                  : message
              )
            );
          }

          if (event === "token") {
            streamedContent += data.token || "";
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantMessageId
                  ? {
                      ...message,
                      content: streamedContent,
                      meta: {
                        ...message.meta,
                        isStreaming: true
                      }
                    }
                  : message
              )
            );
          }
        }
      });

      if (!result?.assistantMessage || !result?.conversation) {
        throw new Error("Không nhận được kết quả stream từ backend");
      }

      setMessages((current) =>
        current.map((message) =>
          message.id === assistantMessageId ? result.assistantMessage : message
        )
      );
      setActiveConversation(result.conversation);
      await refreshConversations(result.conversation.id);
    } catch (sendError) {
      setError(sendError.message);
      setMessages((current) =>
        current.filter(
          (message) =>
            message.id !== assistantMessageId &&
            (persistedUserMessage || message.id !== tempMessage.id)
        )
      );
      setInput(draft);
    } finally {
      setIsSending(false);
    }
  }

  function handleNewChat() {
    setActiveConversation(null);
    setMessages([]);
    setError("");
    setInput("");
  }

  async function handleDeleteConversation(conversationId) {
    setError("");
    try {
      await api.deleteConversation(conversationId);
      const data = await api.listConversations();
      setConversations(data.conversations);

      if (conversationId === activeConversationId) {
        const next = data.conversations[0] || null;
        setActiveConversation(next);
        if (next) {
          const messageData = await api.getMessages(next.id);
          setMessages(messageData.messages);
        } else {
          setMessages([]);
        }
      }
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  async function handleRenameConversation(conversationId, title) {
    setError("");
    try {
      const data = await api.renameConversation(conversationId, title);
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                ...data.conversation,
                messageCount: conversation.messageCount
              }
            : conversation
        )
      );

      if (conversationId === activeConversationId) {
        setActiveConversation(data.conversation);
      }
    } catch (renameError) {
      setError(renameError.message);
      throw renameError;
    }
  }

  const appClassName = useMemo(
    () => (apiStatus === "offline" ? "app-shell app-shell--offline" : "app-shell"),
    [apiStatus]
  );

  if (!session) {
    return (
      <AuthPanel
        apiStatus={apiStatus}
        error={authError}
        isSubmitting={isAuthenticating}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />
    );
  }

  return (
    <div className={appClassName}>
      <section className="chat-surface">
        <ChatHeader activeConversation={activeConversation} />

        {error ? (
          <div className="error-banner" role="alert">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        ) : null}

        <ChatWindow messages={messages} isSending={isSending} />
        <Composer value={input} isSending={isSending} onChange={setInput} onSubmit={handleSend} />
      </section>

      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        currentUser={session.user}
        onNewChat={handleNewChat}
        onSelectConversation={loadConversation}
        onRenameConversation={handleRenameConversation}
        onDeleteConversation={handleDeleteConversation}
        onLogout={handleLogout}
      />
    </div>
  );
}
