import { Router } from "express";
import { ChatController } from "../controllers/chatController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const chatRoutes = Router();

chatRoutes.post("/chat", asyncHandler(ChatController.create));
chatRoutes.post("/chat/stream", ChatController.stream);
