import { Router } from "express";
import { authenticate } from "../middlewares/authenticate.js";
import { authRoutes } from "./authRoutes.js";
import { chatRoutes } from "./chatRoutes.js";
import { conversationRoutes } from "./conversationRoutes.js";
import { healthRoutes } from "./healthRoutes.js";

export const apiRoutes = Router();

apiRoutes.use(healthRoutes);
apiRoutes.use(authRoutes);
apiRoutes.use(authenticate, conversationRoutes);
apiRoutes.use(authenticate, chatRoutes);
