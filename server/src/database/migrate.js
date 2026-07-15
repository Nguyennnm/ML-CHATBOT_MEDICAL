import { getDb, closeDb } from "../config/database.js";

const db = getDb();

db.exec(`
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  meta TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
  ON messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS medical_sources (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  source_name TEXT NOT NULL DEFAULT 'medical_vietnamese_datasets',
  tags TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_medical_sources_question
  ON medical_sources(question);
`);

const row = db.prepare("SELECT COUNT(*) AS count FROM medical_sources").get();

if (row.count === 0) {
  const insert = db.prepare(`
    INSERT INTO medical_sources (id, question, answer, source_name, tags)
    VALUES (@id, @question, @answer, @sourceName, @tags)
  `);

  insert.run({
    id: "seed-source-001",
    question: "Dữ liệu y tế sẽ được dùng như thế nào?",
    answer:
      "Bảng này là nơi lưu các cặp câu hỏi - câu trả lời y tế sau tiền xử lý. Ở giai đoạn sau, backend có thể dùng bảng này để truy xuất, tạo embedding hoặc gọi model RAG.",
    sourceName: "project_seed",
    tags: JSON.stringify(["placeholder", "rag-ready"])
  });
}

console.log("Database migration completed.");
closeDb();
