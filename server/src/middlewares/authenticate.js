import { AuthService } from "../services/authService.js";
import { HttpError } from "../utils/httpError.js";

export function authenticate(req, _res, next) {
  try {
    const authorization = req.get("authorization") || "";
    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw new HttpError(401, "Bạn cần đăng nhập để sử dụng chatbot");
    }

    req.user = AuthService.authenticate(token);
    next();
  } catch (error) {
    next(error);
  }
}
