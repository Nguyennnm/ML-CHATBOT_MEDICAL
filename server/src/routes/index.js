import { Router } from "express";
import { chatRoutes } from "./chatRoutes.js";
import { conversationRoutes } from "./conversationRoutes.js";
import { healthRoutes } from "./healthRoutes.js";

export const apiRoutes = Router();

apiRoutes.use(healthRoutes);
apiRoutes.use(conversationRoutes);
apiRoutes.use(chatRoutes);
