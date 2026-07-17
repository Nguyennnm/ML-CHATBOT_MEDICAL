import { Router } from "express";
import { AuthController } from "../controllers/authController.js";
import { authenticate } from "../middlewares/authenticate.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const authRoutes = Router();

authRoutes.post("/auth/register", asyncHandler(AuthController.register));
authRoutes.post("/auth/login", asyncHandler(AuthController.login));
authRoutes.get("/auth/me", authenticate, asyncHandler(AuthController.me));
