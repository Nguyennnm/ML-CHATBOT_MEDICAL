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
