# Medical QA Chatbot

Full-stack scaffold for the final project in "Nhập môn học máy".

- Frontend: React + Vite
- Backend: Node.js + Express, organized by MVC
- Database: SQLite local file
- Model integration: intentionally left as a service stub for the next phase

## Run

```bash
npm install
npm run db:migrate
npm run dev
```

Frontend runs at `http://localhost:5173`.
Backend runs at `http://localhost:4000`.

## Medical RAG API

The backend calls the team's Medical RAG API from `server/src/services/ragApiService.js`.
Create `server/.env` from `server/.env.example` and update the ngrok URL whenever Colab creates a new tunnel:

```bash
RAG_API_BASE_URL=https://steadier-swerve-handoff.ngrok-free.dev
RAG_API_TIMEOUT_MS=180000
```

The website keeps using the local backend endpoint `POST /api/chat`. The backend sends this payload to the RAG API:

```json
{
  "query": "Hiện tượng ngủ mở mắt là gì?",
  "session_id": "conversation-id-from-sqlite"
}
```

`answer`, `sources`, and `success` from the RAG response are saved into chat history. Sources are shown under each assistant answer.

## API

- `GET /api/health`
- `GET /api/conversations`
- `POST /api/conversations`
- `GET /api/conversations/:id/messages`
- `DELETE /api/conversations/:id`
- `POST /api/chat`

## MVC Layout

```text
server/src/controllers  HTTP request/response handling
server/src/services     business logic and future model inference boundary
server/src/models       database access
server/src/routes       REST route registration
server/src/database     SQLite schema migration
```
