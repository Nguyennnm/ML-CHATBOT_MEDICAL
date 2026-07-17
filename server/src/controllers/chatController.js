import { ChatService } from "../services/chatService.js";

const STREAM_CHUNK_SIZE = 36;
const STREAM_DELAY_MS = 18;

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function splitAnswer(answer) {
  const text = String(answer || "");
  const chunks = [];

  for (let index = 0; index < text.length; index += STREAM_CHUNK_SIZE) {
    chunks.push(text.slice(index, index + STREAM_CHUNK_SIZE));
  }

  return chunks.length > 0 ? chunks : [""];
}

function writeSseEvent(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function prepareSseResponse(res) {
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();
}

export const ChatController = {
  async create(req, res) {
    const result = await ChatService.sendMessage({
      message: req.body?.message,
      conversationId: req.body?.conversationId,
      userId: req.user.id
    });

    res.status(201).json(result);
  },

  async stream(req, res, next) {
    let isClosed = false;

    res.on("close", () => {
      isClosed = true;
    });

    try {
      const turn = ChatService.createUserTurn({
        message: req.body?.message,
        conversationId: req.body?.conversationId,
        userId: req.user.id
      });

      prepareSseResponse(res);
      writeSseEvent(res, "conversation", {
        conversation: turn.conversation,
        userMessage: turn.userMessage
      });
      writeSseEvent(res, "status", {
        label: "retrieving",
        message: "Đang truy xuất dữ liệu y tế"
      });

      const assistant = await ChatService.resolveAssistant({
        cleanedMessage: turn.cleanedMessage,
        conversationId: turn.conversation.id
      });

      writeSseEvent(res, "status", {
        label: "answering",
        message: "Đang tạo câu trả lời"
      });

      const saved = ChatService.saveAssistantMessage({
        conversationId: turn.conversation.id,
        userId: req.user.id,
        content: assistant.content,
        meta: assistant.meta
      });

      for (const token of splitAnswer(assistant.content)) {
        if (isClosed) {
          return;
        }

        writeSseEvent(res, "token", { token });
        await wait(STREAM_DELAY_MS);
      }

      if (isClosed) {
        return;
      }

      writeSseEvent(res, "done", {
        conversation: saved.conversation,
        assistantMessage: saved.assistantMessage,
        sources: assistant.sources,
        success: assistant.success,
        mode: assistant.mode
      });
      res.end();
    } catch (error) {
      if (!res.headersSent) {
        next(error);
        return;
      }

      writeSseEvent(res, "error", {
        message: error.message || "Không thể stream câu trả lời"
      });
      res.end();
    }
  }
};
