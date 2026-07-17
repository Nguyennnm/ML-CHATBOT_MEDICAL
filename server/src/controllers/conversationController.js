import { ConversationService } from "../services/conversationService.js";

export const ConversationController = {
  index(req, res) {
    res.json({
      conversations: ConversationService.listConversations(req.user.id)
    });
  },

  create(req, res) {
    const conversation = ConversationService.createConversation({
      title: req.body?.title,
      userId: req.user.id
    });

    res.status(201).json({ conversation });
  },

  messages(req, res) {
    res.json(ConversationService.getMessages(req.params.id, req.user.id));
  },

  update(req, res) {
    const conversation = ConversationService.renameConversation(
      req.params.id,
      req.user.id,
      req.body?.title
    );

    res.json({ conversation });
  },

  destroy(req, res) {
    res.json(ConversationService.deleteConversation(req.params.id, req.user.id));
  }
};
