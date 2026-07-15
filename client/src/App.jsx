import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { api } from "./lib/api.js";
import { ChatHeader } from "./components/ChatHeader.jsx";
import { ChatWindow } from "./components/ChatWindow.jsx";
import { Composer } from "./components/Composer.jsx";
import { Sidebar } from "./components/Sidebar.jsx";

export default function App() {
  const [apiStatus, setApiStatus] = useState("checking");
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");

  const activeConversationId = activeConversation?.id;

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
    let cancelled = false;

    async function boot() {
      try {
        await api.health();
        if (!cancelled) {
          setApiStatus("online");
        }

        const data = await api.listConversations();
        if (cancelled) {
          return;
        }

        setConversations(data.conversations);

        if (data.conversations.length > 0) {
          const first = data.conversations[0];
          setActiveConversation(first);
          const messageData = await api.getMessages(first.id);
          if (!cancelled) {
            setMessages(messageData.messages);
          }
        }
      } catch (bootError) {
        if (!cancelled) {
          setApiStatus("offline");
          setError(bootError.message);
        }
      }
    }

    boot();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSend(event) {
    event.preventDefault();

    const draft = input.trim();
    if (!draft || isSending) {
      return;
    }

    const tempMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: draft,
      createdAt: new Date().toISOString()
    };

    setInput("");
    setError("");
    setIsSending(true);
    setMessages((current) => [...current, tempMessage]);

    try {
      const result = await api.sendMessage({
        message: draft,
        conversationId: activeConversationId
      });

      setMessages((current) => [
        ...current.filter((message) => message.id !== tempMessage.id),
        ...result.messages
      ]);
      setActiveConversation(result.conversation);
      await refreshConversations(result.conversation.id);
    } catch (sendError) {
      setError(sendError.message);
      setMessages((current) => current.filter((message) => message.id !== tempMessage.id));
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

  const appClassName = useMemo(
    () => (apiStatus === "offline" ? "app-shell app-shell--offline" : "app-shell"),
    [apiStatus]
  );

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
        onNewChat={handleNewChat}
        onSelectConversation={loadConversation}
        onDeleteConversation={handleDeleteConversation}
      />
    </div>
  );
}
