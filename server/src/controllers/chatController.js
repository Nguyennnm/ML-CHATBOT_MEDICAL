import { ChatService } from "../services/chatService.js";

export const ChatController = {
  async create(req, res) {
    const result = await ChatService.sendMessage({
      message: req.body?.message,
      conversationId: req.body?.conversationId
    });

    res.status(201).json(result);
  }
};
