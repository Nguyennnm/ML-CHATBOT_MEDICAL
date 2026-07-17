# ML-CHATBOT_MEDICAL

Medical QA chatbot project for the final assignment in "Nhap mon hoc may".

This repository now contains two main parts:

- `client/`: React + Vite chatbot interface.
- `server/`: Node.js + Express backend organized with MVC and SQLite.
- `Model/`: team model experiments and artifacts for BM25, RAG, and Qwen2 fine-tuning.
- `docs/`: report material and screenshots.

## Web App Features

- Login/register with conversation history scoped by user account.
- Sidebar conversation management with create, rename, and delete actions.
- Medical chat UI with Server-Sent Events streaming support.
- SQLite database for users, conversations, messages, and medical sources.
- Google Maps shortcut for nearby hospitals, clinics, and pharmacies.
- RAG API integration boundary prepared in the backend.

## Run Locally

Install dependencies from the repository root:

```bash
npm install
```

Create `server/.env` from `server/.env.example`, then update values for your machine:

```bash
RAG_API_BASE_URL=https://your-rag-api.example.com
RAG_API_TIMEOUT_MS=180000
AUTH_TOKEN_SECRET=change-this-to-a-long-random-string
AUTH_TOKEN_TTL_SECONDS=604800
```

Run database migration:

```bash
npm run db:migrate
```

Start the frontend and backend:

```bash
npm run dev
```

Frontend runs at `http://localhost:5173`.
Backend runs at `http://localhost:4000`.

## API Overview

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/conversations`
- `POST /api/conversations`
- `PATCH /api/conversations/:id`
- `DELETE /api/conversations/:id`
- `GET /api/conversations/:id/messages`
- `POST /api/chat`
- `POST /api/chat/stream`

## MVC Layout

```text
server/src/controllers  HTTP request and response handling
server/src/services     business logic and model/RAG integration boundary
server/src/models       SQLite database access
server/src/routes       REST route registration
server/src/database     schema migration
```

## Model Folder

```text
Model/BM25              BM25 retrieval experiments
Model/Rag               RAG pipeline notebooks and download helpers
Model/Qwen2_fine_tuned  Qwen2 fine-tuning notebooks and notes
```
