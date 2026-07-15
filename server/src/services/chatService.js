import { ConversationModel } from "../models/conversationModel.js";
import { MessageModel } from "../models/messageModel.js";
import { MedicalSourceModel } from "../models/medicalSourceModel.js";
import { HttpError } from "../utils/httpError.js";

const MAX_MESSAGE_LENGTH = 2000;

function createTitle(message) {
  const compact = message.replace(/\s+/g, " ").trim();
  return compact.length > 54 ? `${compact.slice(0, 54)}...` : compact || "Cuộc trò chuyện mới";
}

function createModelPendingReply() {
  return [
    "Mình đã lưu câu hỏi của bạn vào lịch sử hội thoại.",
    "Tính năng trả lời y tế thông minh sẽ được nhóm tích hợp ở giai đoạn sau, nên hiện tại hệ thống chỉ xác nhận luồng chat hoạt động.",
    "Khi hoàn thiện, phần xử lý câu hỏi sẽ trả về nội dung tư vấn dựa trên dữ liệu y tế của nhóm.",
    "Lưu ý: chatbot y tế chỉ nên cung cấp thông tin tham khảo và không thay thế chẩn đoán của bác sĩ."
  ].join("\n\n");
}

export const ChatService = {
  sendMessage({ message, conversationId }) {
    const cleanedMessage = String(message || "").trim();

    if (!cleanedMessage) {
      throw new HttpError(400, "Message is required");
    }

    if (cleanedMessage.length > MAX_MESSAGE_LENGTH) {
      throw new HttpError(400, `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer`);
    }

    let conversation = conversationId ? ConversationModel.findById(conversationId) : null;

    if (conversationId && !conversation) {
      throw new HttpError(404, "Conversation not found");
    }

    if (!conversation) {
      conversation = ConversationModel.create({ title: createTitle(cleanedMessage) });
    }

    const userMessage = MessageModel.create({
      conversationId: conversation.id,
      role: "user",
      content: cleanedMessage
    });

    const assistantMessage = MessageModel.create({
      conversationId: conversation.id,
      role: "assistant",
      content: createModelPendingReply(),
      meta: {
        mode: "model-pending",
        sources: []
      }
    });

    const updatedConversation = ConversationModel.touch(conversation.id);

    return {
      conversation: updatedConversation,
      messages: [userMessage, assistantMessage],
      assistantMessage,
      sources: MedicalSourceModel.list({ limit: 1 }),
      mode: "model-pending"
    };
  }
};
