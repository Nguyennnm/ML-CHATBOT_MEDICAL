export function TypingIndicator() {
  return (
    <div className="message message--assistant">
      <div className="message-avatar" aria-hidden="true">
        <span className="typing-dot" />
      </div>
      <div className="message-body typing-body" aria-label="Đang xử lý">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
