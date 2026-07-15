import { ConversationModel } from "../models/conversationModel.js";
import { MessageModel } from "../models/messageModel.js";
import { HttpError } from "../utils/httpError.js";
import { RagApiService } from "./ragApiService.js";

const MAX_MESSAGE_LENGTH = 2000;

function createTitle(message) {
  const compact = message.replace(/\s+/g, " ").trim();
  return compact.length > 54 ? `${compact.slice(0, 54)}...` : compact || "Cuộc trò chuyện mới";
}

function normalizeSources(sources) {
  return Array.isArray(sources) ? sources : [];
}

function createRagUnavailableReply(error) {
  return [
    "Mình đã lưu câu hỏi của bạn, nhưng hiện chưa kết nối được với mô hình Medical RAG.",
    "Bạn hãy kiểm tra runtime Colab/ngrok rồi gửi lại câu hỏi. Nếu tunnel đã đổi URL, cập nhật RAG_API_BASE_URL trong file .env của backend.",
    `Chi tiết kỹ thuật: ${error.message}`
  ].join("\n\n");
}

export const ChatService = {
  async sendMessage({ message, conversationId }) {
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

    let mode = "rag-live";
    let ragResult;

    try {
      ragResult = await RagApiService.chat({
        query: cleanedMessage,
        sessionId: conversation.id
      });
    } catch (error) {
      mode = "rag-unavailable";
      ragResult = {
        original_query: cleanedMessage,
        rewritten_query: cleanedMessage,
        fixed_query: cleanedMessage,
        answer: createRagUnavailableReply(error),
        sources: [],
        cache_hit: false,
        success: false,
        error: {
          message: error.message,
          statusCode: error.statusCode,
          details: error.details
        }
      };
    }

    const sources = normalizeSources(ragResult.sources);
    const assistantMessage = MessageModel.create({
      conversationId: conversation.id,
      role: "assistant",
      content: ragResult.answer || "Mô hình chưa trả về nội dung trả lời.",
      meta: {
        mode,
        sources,
        success: Boolean(ragResult.success),
        cacheHit: Boolean(ragResult.cache_hit),
        originalQuery: ragResult.original_query,
        rewrittenQuery: ragResult.rewritten_query,
        fixedQuery: ragResult.fixed_query,
        error: ragResult.error
      }
    });

    const updatedConversation = ConversationModel.touch(conversation.id);

    return {
      conversation: updatedConversation,
      messages: [userMessage, assistantMessage],
      assistantMessage,
      sources,
      success: Boolean(ragResult.success),
      mode
    };
  }
};
