import { getDb } from "../config/database.js";

function mapSource(row) {
  return {
    id: row.id,
    question: row.question,
    answer: row.answer,
    sourceName: row.source_name,
    tags: JSON.parse(row.tags || "[]"),
    createdAt: row.created_at
  };
}

export const MedicalSourceModel = {
  list({ limit = 5 } = {}) {
    const rows = getDb()
      .prepare(
        `SELECT *
         FROM medical_sources
         ORDER BY created_at DESC
         LIMIT ?`
      )
      .all(limit);

    return rows.map(mapSource);
  }
};
