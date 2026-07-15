import { randomUUID } from "node:crypto";
import { getDb } from "../config/database.js";

function mapMessage(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    meta: JSON.parse(row.meta || "{}"),
    createdAt: row.created_at
  };
}

export const MessageModel = {
  create({ conversationId, role, content, meta = {} }) {
    const id = randomUUID();
    getDb()
      .prepare(
        `INSERT INTO messages (id, conversation_id, role, content, meta)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(id, conversationId, role, content, JSON.stringify(meta));

    return this.findById(id);
  },

  findById(id) {
    const row = getDb().prepare("SELECT * FROM messages WHERE id = ?").get(id);
    return mapMessage(row);
  },

  findByConversationId(conversationId) {
    const rows = getDb()
      .prepare(
        `SELECT *
         FROM messages
         WHERE conversation_id = ?
         ORDER BY created_at ASC, rowid ASC`
      )
      .all(conversationId);

    return rows.map(mapMessage);
  }
};
