import { randomUUID } from "node:crypto";
import { getDb } from "../config/database.js";

function mapConversation(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export const ConversationModel = {
  create({ title, userId }) {
    const id = randomUUID();
    getDb()
      .prepare("INSERT INTO conversations (id, user_id, title) VALUES (?, ?, ?)")
      .run(id, userId, title);

    return this.findById(id, userId);
  },

  findAll(userId) {
    const rows = getDb()
      .prepare(
        `SELECT c.*,
          (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) AS message_count
         FROM conversations c
         WHERE c.user_id = ?
         ORDER BY c.updated_at DESC`
      )
      .all(userId);

    return rows.map((row) => ({
      ...mapConversation(row),
      messageCount: row.message_count
    }));
  },

  findById(id, userId) {
    const row = getDb()
      .prepare("SELECT * FROM conversations WHERE id = ? AND user_id = ?")
      .get(id, userId);

    return mapConversation(row);
  },

  updateTitle(id, userId, title) {
    getDb()
      .prepare(
        `UPDATE conversations
         SET title = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND user_id = ?`
      )
      .run(title, id, userId);

    return this.findById(id, userId);
  },

  touch(id, userId) {
    getDb()
      .prepare(
        `UPDATE conversations
         SET updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND user_id = ?`
      )
      .run(id, userId);

    return this.findById(id, userId);
  },

  remove(id, userId) {
    const result = getDb()
      .prepare("DELETE FROM conversations WHERE id = ? AND user_id = ?")
      .run(id, userId);

    return result.changes > 0;
  }
};
