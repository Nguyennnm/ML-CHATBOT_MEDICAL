import { ConversationService } from "../services/conversationService.js";

export const ConversationController = {
  index(_req, res) {
    res.json({
      conversations: ConversationService.listConversations()
    });
  },

  create(req, res) {
    const conversation = ConversationService.createConversation({
      title: req.body?.title
    });

    res.status(201).json({ conversation });
  },

  messages(req, res) {
    res.json(ConversationService.getMessages(req.params.id));
  },

  destroy(req, res) {
    res.json(ConversationService.deleteConversation(req.params.id));
  }
};
