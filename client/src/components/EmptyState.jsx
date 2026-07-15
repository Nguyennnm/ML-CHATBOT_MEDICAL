import { FileText, MapPin, MessageCircleQuestion, ShieldCheck } from "lucide-react";

export function EmptyState() {
  return (
    <section className="empty-state" aria-label="Trạng thái ban đầu">
      <div className="empty-copy">
        <p className="eyebrow">Pipeline sẵn sàng</p>
        <h3>Đặt một câu hỏi y tế. Hệ thống sẽ lưu hội thoại và hỗ trợ bước tiếp theo.</h3>
        <p>
          Giao diện chat đã sẵn sàng cho demo. Giai đoạn sau có thể thay phản hồi mẫu bằng phần
          trả lời thông minh của nhóm.
        </p>
      </div>

      <div className="empty-panel">
        <div>
          <MessageCircleQuestion size={18} />
          <span>Nhận câu hỏi</span>
        </div>
        <div>
          <FileText size={18} />
          <span>Lưu hội thoại</span>
        </div>
        <div>
          <MapPin size={18} />
          <span>Gợi ý nơi khám</span>
        </div>
        <div>
          <ShieldCheck size={18} />
          <span>Cảnh báo tham khảo</span>
        </div>
      </div>
    </section>
  );
}
