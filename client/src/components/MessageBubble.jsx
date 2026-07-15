import { Bot, UserRound } from "lucide-react";

export function MessageBubble({ message }) {
  const isUser = message.role === "user";
  const paragraphs = String(message.content || "")
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return (
    <article className={isUser ? "message message--user" : "message message--assistant"}>
      <div className="message-avatar" aria-hidden="true">
        {isUser ? <UserRound size={17} /> : <Bot size={17} />}
      </div>
      <div className="message-body">
        {paragraphs.map((paragraph, index) => (
          <p key={`${message.id}-${index}`}>{paragraph}</p>
        ))}
      </div>
    </article>
  );
}
