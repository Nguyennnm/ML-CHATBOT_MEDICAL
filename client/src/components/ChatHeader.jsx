export function ChatHeader({ activeConversation }) {
  return (
    <header className="chat-header">
      <div>
        <p className="eyebrow">Y tế tiếng Việt</p>
        <h2>{activeConversation?.title || "Hỏi đáp sức khỏe"}</h2>
      </div>
    </header>
  );
}
