import { randomUUID } from "node:crypto";
import { getDb } from "../config/database.js";

function mapConversation(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export const ConversationModel = {
  create({ title }) {
    const id = randomUUID();
    getDb()
      .prepare("INSERT INTO conversations (id, title) VALUES (?, ?)")
      .run(id, title);

    return this.findById(id);
  },

  findAll() {
    const rows = getDb()
      .prepare(
        `SELECT c.*,
          (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) AS message_count
         FROM conversations c
         ORDER BY c.updated_at DESC`
      )
      .all();

    return rows.map((row) => ({
      ...mapConversation(row),
      messageCount: row.message_count
    }));
  },

  findById(id) {
    const row = getDb().prepare("SELECT * FROM conversations WHERE id = ?").get(id);
    return mapConversation(row);
  },

  updateTitle(id, title) {
    getDb()
      .prepare("UPDATE conversations SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(title, id);

    return this.findById(id);
  },

  touch(id) {
    getDb()
      .prepare("UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(id);

    return this.findById(id);
  },

  remove(id) {
    const result = getDb().prepare("DELETE FROM conversations WHERE id = ?").run(id);
    return result.changes > 0;
  }
};
