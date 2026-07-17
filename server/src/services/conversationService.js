import { ConversationModel } from "../models/conversationModel.js";
import { MessageModel } from "../models/messageModel.js";
import { HttpError } from "../utils/httpError.js";

export const ConversationService = {
  listConversations(userId) {
    return ConversationModel.findAll(userId);
  },

  createConversation({ title = "Cuộc trò chuyện mới", userId } = {}) {
    return ConversationModel.create({ title, userId });
  },

  getMessages(conversationId, userId) {
    const conversation = ConversationModel.findById(conversationId, userId);

    if (!conversation) {
      throw new HttpError(404, "Conversation not found");
    }

    return {
      conversation,
      messages: MessageModel.findByConversationId(conversationId)
    };
  },

  renameConversation(conversationId, userId, title) {
    const nextTitle = String(title || "").replace(/\s+/g, " ").trim();

    if (!nextTitle) {
      throw new HttpError(400, "Conversation title is required");
    }

    if (nextTitle.length > 80) {
      throw new HttpError(400, "Conversation title must be 80 characters or fewer");
    }

    const conversation = ConversationModel.findById(conversationId, userId);

    if (!conversation) {
      throw new HttpError(404, "Conversation not found");
    }

    return ConversationModel.updateTitle(conversationId, userId, nextTitle);
  },

  deleteConversation(conversationId, userId) {
    const deleted = ConversationModel.remove(conversationId, userId);

    if (!deleted) {
      throw new HttpError(404, "Conversation not found");
    }

    return { deleted: true };
  }
};
