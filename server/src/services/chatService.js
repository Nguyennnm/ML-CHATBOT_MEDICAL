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

function validateMessage(message) {
  const cleanedMessage = String(message || "").trim();

  if (!cleanedMessage) {
    throw new HttpError(400, "Message is required");
  }

  if (cleanedMessage.length > MAX_MESSAGE_LENGTH) {
    throw new HttpError(400, `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer`);
  }

  return cleanedMessage;
}

function createUserTurn({ message, conversationId, userId }) {
  const cleanedMessage = validateMessage(message);
  let conversation = conversationId ? ConversationModel.findById(conversationId, userId) : null;

  if (conversationId && !conversation) {
    throw new HttpError(404, "Conversation not found");
  }

  if (!conversation) {
    conversation = ConversationModel.create({ title: createTitle(cleanedMessage), userId });
  }

  const userMessage = MessageModel.create({
    conversationId: conversation.id,
    role: "user",
    content: cleanedMessage
  });

  return {
    conversation,
    userMessage,
    cleanedMessage
  };
}

async function resolveAssistant({ cleanedMessage, conversationId }) {
  let mode = "rag-live";
  let ragResult;

  try {
    ragResult = await RagApiService.chat({
      query: cleanedMessage,
      sessionId: conversationId
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
  return {
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
    },
    sources,
    success: Boolean(ragResult.success),
    mode
  };
}

function saveAssistantMessage({ conversationId, userId, content, meta }) {
  const assistantMessage = MessageModel.create({
    conversationId,
    role: "assistant",
    content,
    meta
  });

  const updatedConversation = ConversationModel.touch(conversationId, userId);

  return {
    conversation: updatedConversation,
    assistantMessage
  };
}

export const ChatService = {
  createUserTurn,

  resolveAssistant,

  saveAssistantMessage,

  async sendMessage({ message, conversationId, userId }) {
    const turn = createUserTurn({ message, conversationId, userId });
    const assistant = await resolveAssistant({
      cleanedMessage: turn.cleanedMessage,
      conversationId: turn.conversation.id
    });
    const saved = saveAssistantMessage({
      conversationId: turn.conversation.id,
      userId,
      content: assistant.content,
      meta: assistant.meta
    });

    return {
      conversation: saved.conversation,
      messages: [turn.userMessage, saved.assistantMessage],
      assistantMessage: saved.assistantMessage,
      sources: assistant.sources,
      success: assistant.success,
      mode: assistant.mode
    };
  }
};
