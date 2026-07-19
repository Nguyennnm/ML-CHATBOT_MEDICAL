import ReactMarkdown from "react-markdown";
import { Bot, ExternalLink, UserRound } from "lucide-react";
import remarkGfm from "remark-gfm";

function trimText(value, maxLength = 360) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function getSourceTitle(source, index) {
  return source.title || source.question || source.url || `Nguồn ${index + 1}`;
}

function getSourceLabel(source) {
  const parts = [
    source.type === "web" ? "Web" : "CSDL nội bộ",
    source.id !== undefined ? `ID ${source.id}` : "",
    source.retrieval_source ? `truy xuất: ${source.retrieval_source}` : "",
    Number.isFinite(source.score) ? `điểm: ${source.score.toFixed(2)}` : ""
  ].filter(Boolean);

  return parts.join(" · ");
}

function SourceItem({ source, index }) {
  const quote = trimText(source.support_quote || source.evidence_chunk || source.crag_reason);
  const title = getSourceTitle(source, index);
  const label = getSourceLabel(source);
  const content = (
    <>
      <span className="source-title">{title}</span>
      {label ? <span className="source-label">{label}</span> : null}
      {quote ? <span className="source-quote">{quote}</span> : null}
    </>
  );

  if (source.url) {
    return (
      <a className="source-row" href={source.url} target="_blank" rel="noreferrer">
        <span>{index + 1}</span>
        <span>{content}</span>
        <ExternalLink size={15} />
      </a>
    );
  }

  return (
    <div className="source-row">
      <span>{index + 1}</span>
      <span>{content}</span>
    </div>
  );
}

const markdownComponents = {
  a({ children, href, ...props }) {
    return (
      <a href={href} target="_blank" rel="noreferrer" {...props}>
        {children}
      </a>
    );
  }
};

export function MessageBubble({ message }) {
  const isUser = message.role === "user";
  const sources = !isUser && Array.isArray(message.meta?.sources) ? message.meta.sources : [];
  const isStreaming = !isUser && Boolean(message.meta?.isStreaming);
  const content = String(message.content || "");
  const paragraphs = content
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return (
    <article className={isUser ? "message message--user" : "message message--assistant"}>
      <div className="message-avatar" aria-hidden="true">
        {isUser ? <UserRound size={17} /> : <Bot size={17} />}
      </div>
      <div className={isStreaming ? "message-body message-body--streaming" : "message-body"}>
        {isUser && paragraphs.length > 0 ? (
          paragraphs.map((paragraph, index) => <p key={`${message.id}-${index}`}>{paragraph}</p>)
        ) : !isUser && content.trim() ? (
          <ReactMarkdown
            className="message-markdown"
            components={markdownComponents}
            remarkPlugins={[remarkGfm]}
          >
            {content}
          </ReactMarkdown>
        ) : isStreaming ? (
          <div className="streaming-placeholder">
            <span>{message.meta?.streamStatus || "Đang trả lời"}</span>
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
        ) : null}

        {sources.length > 0 ? (
          <details className="message-sources">
            <summary>Nguồn tham khảo ({sources.length})</summary>
            <div className="source-list">
              {sources.map((source, index) => (
                <SourceItem key={`${message.id}-source-${index}`} source={source} index={index} />
              ))}
            </div>
          </details>
        ) : null}
      </div>
    </article>
  );
}
