import { AuthService } from "../services/authService.js";

export const AuthController = {
  register(req, res) {
    const result = AuthService.register({
      email: req.body?.email,
      name: req.body?.name,
      password: req.body?.password
    });

    res.status(201).json(result);
  },

  login(req, res) {
    res.json(
      AuthService.login({
        email: req.body?.email,
        password: req.body?.password
      })
    );
  },

  me(req, res) {
    res.json({ user: req.user });
  }
};
