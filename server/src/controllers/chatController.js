import { ChatService } from "../services/chatService.js";

export const ChatController = {
  create(req, res) {
    const result = ChatService.sendMessage({
      message: req.body?.message,
      conversationId: req.body?.conversationId
    });

    res.status(201).json(result);
  }
};
