import { Router } from "express";
import { ConversationController } from "../controllers/conversationController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const conversationRoutes = Router();

conversationRoutes.get("/conversations", asyncHandler(ConversationController.index));
conversationRoutes.post("/conversations", asyncHandler(ConversationController.create));
conversationRoutes.get("/conversations/:id/messages", asyncHandler(ConversationController.messages));
conversationRoutes.patch("/conversations/:id", asyncHandler(ConversationController.update));
conversationRoutes.delete("/conversations/:id", asyncHandler(ConversationController.destroy));
