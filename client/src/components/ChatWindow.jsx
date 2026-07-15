import { useEffect, useRef } from "react";
import { EmptyState } from "./EmptyState.jsx";
import { MessageBubble } from "./MessageBubble.jsx";
import { TypingIndicator } from "./TypingIndicator.jsx";

export function ChatWindow({ messages, isSending }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isSending]);

  return (
    <main className="chat-window" aria-live="polite">
      {messages.length === 0 ? (
        <EmptyState />
      ) : (
        messages.map((message) => <MessageBubble key={message.id} message={message} />)
      )}
      {isSending ? <TypingIndicator /> : null}
      <div ref={bottomRef} />
    </main>
  );
}
