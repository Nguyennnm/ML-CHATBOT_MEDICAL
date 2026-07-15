import { ConversationModel } from "../models/conversationModel.js";
import { MessageModel } from "../models/messageModel.js";
import { HttpError } from "../utils/httpError.js";

export const ConversationService = {
  listConversations() {
    return ConversationModel.findAll();
  },

  createConversation({ title = "Cuộc trò chuyện mới" } = {}) {
    return ConversationModel.create({ title });
  },

  getMessages(conversationId) {
    const conversation = ConversationModel.findById(conversationId);

    if (!conversation) {
      throw new HttpError(404, "Conversation not found");
    }

    return {
      conversation,
      messages: MessageModel.findByConversationId(conversationId)
    };
  },

  deleteConversation(conversationId) {
    const deleted = ConversationModel.remove(conversationId);

    if (!deleted) {
      throw new HttpError(404, "Conversation not found");
    }

    return { deleted: true };
  }
};
