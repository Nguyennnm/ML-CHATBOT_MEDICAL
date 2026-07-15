import { SendHorizontal } from "lucide-react";

export function Composer({ value, isSending, onChange, onSubmit }) {
  return (
    <form className="composer" onSubmit={onSubmit}>
      <div className="composer-input">
        <label htmlFor="chat-input">Câu hỏi của bạn</label>
        <textarea
          id="chat-input"
          value={value}
          rows={1}
          maxLength={2000}
          placeholder="Ví dụ: Tôi bị đau đầu và sốt thì nên làm gì?"
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
      </div>
      <div className="composer-actions">
        <p>Thông tin chỉ mang tính tham khảo.</p>
        <button className="send-button" type="submit" disabled={!value.trim() || isSending}>
          <SendHorizontal size={19} />
          <span>Gửi</span>
        </button>
      </div>
    </form>
  );
}
