import { randomUUID } from "node:crypto";
import { getDb } from "../config/database.js";

function mapUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    passwordHash: row.password_hash,
    passwordSalt: row.password_salt,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export const UserModel = {
  create({ email, name, passwordHash, passwordSalt }) {
    const id = randomUUID();

    getDb()
      .prepare(
        `INSERT INTO users (id, email, name, password_hash, password_salt)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(id, email, name, passwordHash, passwordSalt);

    return this.findById(id);
  },

  findByEmail(email) {
    const row = getDb()
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(email);

    return mapUser(row);
  },

  findById(id) {
    const row = getDb().prepare("SELECT * FROM users WHERE id = ?").get(id);
    return mapUser(row);
  }
};
