import crypto from "node:crypto";
import { env } from "../config/env.js";
import { UserModel } from "../models/userModel.js";
import { HttpError } from "../utils/httpError.js";

const PASSWORD_MIN_LENGTH = 6;
const PBKDF2_ITERATIONS = 120000;
const PBKDF2_KEY_LENGTH = 32;
const PBKDF2_DIGEST = "sha256";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeName(name, email) {
  const compactName = String(name || "").replace(/\s+/g, " ").trim();
  return compactName || email.split("@")[0] || "Người dùng";
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("base64url")) {
  const passwordHash = crypto
    .pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEY_LENGTH, PBKDF2_DIGEST)
    .toString("base64url");

  return {
    passwordHash,
    passwordSalt: salt
  };
}

function verifyPassword(password, user) {
  const candidate = hashPassword(password, user.passwordSalt).passwordHash;
  const candidateBuffer = Buffer.from(candidate);
  const storedBuffer = Buffer.from(user.passwordHash);

  if (candidateBuffer.length !== storedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(candidateBuffer, storedBuffer);
}

function sign(data) {
  return crypto
    .createHmac("sha256", env.authTokenSecret)
    .update(data)
    .digest("base64url");
}

function createToken(user) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      exp: Math.floor(Date.now() / 1000) + env.authTokenTtlSeconds
    })
  ).toString("base64url");
  const data = `${header}.${payload}`;

  return `${data}.${sign(data)}`;
}

function verifyToken(token) {
  const parts = String(token || "").split(".");

  if (parts.length !== 3) {
    throw new HttpError(401, "Invalid authentication token");
  }

  const [header, payload, signature] = parts;
  const expectedSignature = sign(`${header}.${payload}`);
  const expectedBuffer = Buffer.from(expectedSignature);
  const actualBuffer = Buffer.from(signature);

  if (
    expectedBuffer.length !== actualBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, actualBuffer)
  ) {
    throw new HttpError(401, "Invalid authentication token");
  }

  let decodedPayload;

  try {
    decodedPayload = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    throw new HttpError(401, "Invalid authentication token");
  }

  if (!decodedPayload.sub || decodedPayload.exp < Math.floor(Date.now() / 1000)) {
    throw new HttpError(401, "Authentication token expired");
  }

  return decodedPayload;
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt
  };
}

export const AuthService = {
  register({ email, name, password }) {
    const nextEmail = normalizeEmail(email);
    const nextPassword = String(password || "");

    if (!validateEmail(nextEmail)) {
      throw new HttpError(400, "Email không hợp lệ");
    }

    if (nextPassword.length < PASSWORD_MIN_LENGTH) {
      throw new HttpError(400, `Mật khẩu cần ít nhất ${PASSWORD_MIN_LENGTH} ký tự`);
    }

    if (UserModel.findByEmail(nextEmail)) {
      throw new HttpError(409, "Email này đã được đăng ký");
    }

    const passwordData = hashPassword(nextPassword);
    const user = UserModel.create({
      email: nextEmail,
      name: normalizeName(name, nextEmail),
      passwordHash: passwordData.passwordHash,
      passwordSalt: passwordData.passwordSalt
    });

    return {
      user: publicUser(user),
      token: createToken(user)
    };
  },

  login({ email, password }) {
    const nextEmail = normalizeEmail(email);
    const user = UserModel.findByEmail(nextEmail);

    if (!user || !verifyPassword(String(password || ""), user)) {
      throw new HttpError(401, "Email hoặc mật khẩu không đúng");
    }

    return {
      user: publicUser(user),
      token: createToken(user)
    };
  },

  authenticate(token) {
    const payload = verifyToken(token);
    const user = UserModel.findById(payload.sub);

    if (!user) {
      throw new HttpError(401, "Tài khoản không còn tồn tại");
    }

    return publicUser(user);
  }
};
