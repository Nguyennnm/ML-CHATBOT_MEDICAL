# ML-CHATBOT_MEDICAL

Medical QA chatbot for the final project of "Nhap mon hoc may".

The repository contains the complete web demo and the team's model work:

- React + Vite frontend for the chatbot UI.
- Node.js + Express backend organized with MVC.
- SQLite database for users, conversations, messages, and sources.
- Auth flow with login/register and per-user chat history.
- SSE streaming endpoint for realtime assistant responses.
- RAG integration boundary for the medical QA model.
- Model notebooks and scripts for BM25, RAG, and Qwen2 fine-tuning.
- Report material and UI screenshots.

## Project Tree

```text
ML-CHATBOT_MEDICAL/
|-- client/                         # React + Vite frontend
|   |-- index.html
|   |-- package.json
|   |-- vite.config.js
|   `-- src/
|       |-- App.jsx                 # Main React app state and layout
|       |-- main.jsx                # React entry point
|       |-- styles.css              # Global UI styling
|       |-- lib/
|       |   `-- api.js              # Frontend API client
|       `-- components/
|           |-- AuthPanel.jsx       # Login/register screen
|           |-- Sidebar.jsx         # User card, maps links, chat history
|           |-- ChatWindow.jsx      # Main chat surface
|           |-- MessageBubble.jsx   # Message rendering and sources
|           |-- Composer.jsx        # Question input
|           |-- EmptyState.jsx
|           |-- ChatHeader.jsx
|           `-- TypingIndicator.jsx
|
|-- server/                         # Express MVC backend
|   |-- package.json
|   |-- .env.example                # Example backend environment variables
|   `-- src/
|       |-- server.js               # Starts HTTP server
|       |-- app.js                  # Express app config and middleware
|       |-- config/
|       |   |-- env.js              # Environment config
|       |   `-- database.js         # SQLite connection
|       |-- database/
|       |   `-- migrate.js          # SQLite schema migration
|       |-- routes/                 # REST and SSE route definitions
|       |-- controllers/            # Request/response handling
|       |-- services/               # Business logic and RAG API calls
|       |-- models/                 # SQLite data access layer
|       |-- middlewares/            # Auth and error middleware
|       `-- utils/
|
|-- Model/                          # ML notebooks and model work
|   |-- BM25/
|   |-- Rag/
|   `-- Qwen2_fine_tuned/
|
|-- docs/                           # Report and architecture documents
|   |-- architecture/
|   |-- figures/                    # Report screenshots
|   |-- report-chapter5.tex
|   |-- report-chapter6.tex
|   `-- report-shortened.tex
|
|-- EDA.ipynb
|-- package.json                    # Root workspace scripts
|-- package-lock.json
|-- .gitignore
`-- README.md
```

## Important Files

| Path | Purpose |
| --- | --- |
| `package.json` | Root npm workspace and command scripts. |
| `client/src/App.jsx` | Main frontend state: auth, conversations, messages, streaming. |
| `client/src/lib/api.js` | Wrapper for backend API calls and SSE stream handling. |
| `client/src/components/AuthPanel.jsx` | Login/register UI. |
| `client/src/components/Sidebar.jsx` | Conversation list, rename/delete actions, nearby maps links. |
| `server/src/app.js` | Express setup, CORS, JSON middleware, routes, error handling. |
| `server/src/config/env.js` | Reads runtime config from environment variables. |
| `server/src/database/migrate.js` | Creates/updates SQLite tables. |
| `server/src/services/authService.js` | Password hashing, login/register, token creation. |
| `server/src/services/chatService.js` | User turn creation, RAG response handling, fallback reply. |
| `server/src/services/ragApiService.js` | HTTP client for the external Medical RAG API. |
| `server/src/middlewares/authenticate.js` | Protects user-specific endpoints. |
| `server/.env.example` | Template for local backend configuration. |
| `Model/Rag/README.md` | Notes for the RAG model pipeline. |
| `docs/report-shortened.tex` | Shortened report with updated chapter 5 and chapter 6. |

## Requirements

- Node.js 20+ recommended.
- npm 10+ recommended.
- A running Medical RAG API is optional for UI/backend testing. If it is not configured, the backend returns a friendly fallback message.

## Quick Start

Clone the repository:

```bash
git clone https://github.com/Nguyennnm/ML-CHATBOT_MEDICAL.git
cd ML-CHATBOT_MEDICAL
```

Install all workspace dependencies:

```bash
npm install
```

Create backend environment file:

```bash
# Windows PowerShell
Copy-Item server/.env.example server/.env

# macOS/Linux/Git Bash
cp server/.env.example server/.env
```

Edit `server/.env`:

```bash
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
DB_PATH=./data/medical_chatbot.sqlite
RAG_API_BASE_URL=https://your-rag-api.example.com
RAG_API_TIMEOUT_MS=180000
RAG_API_TLS_REJECT_UNAUTHORIZED=false
AUTH_TOKEN_SECRET=change-this-to-a-long-random-string
AUTH_TOKEN_TTL_SECONDS=604800
```

Run database migration:

```bash
npm run db:migrate
```

Start frontend and backend together:

```bash
npm run dev
```

Default local URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`
- Health check: `http://localhost:4000/api/health`

## Command Line Reference

```bash
# Install dependencies for root, client, and server workspaces
npm install

# Run SQLite migration
npm run db:migrate

# Start frontend and backend concurrently
npm run dev

# Start frontend only
npm run client:dev

# Start backend only
npm run server:dev

# Build frontend production assets
npm run build

# Start backend in production mode
npm run start
```

Useful checks:

```bash
# Check backend health
curl http://localhost:4000/api/health

# Inspect git status
git status --short --branch
```

## API Overview

Public:

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`

Authenticated:

- `GET /api/auth/me`
- `GET /api/conversations`
- `POST /api/conversations`
- `PATCH /api/conversations/:id`
- `DELETE /api/conversations/:id`
- `GET /api/conversations/:id/messages`
- `POST /api/chat`
- `POST /api/chat/stream`

The frontend sends the auth token with:

```text
Authorization: Bearer <token>
```

## Database

SQLite is used for the demo. The migration creates these main tables:

- `users`
- `conversations`
- `messages`
- `medical_sources`

Local database files are ignored by Git:

```text
server/data/*.sqlite
server/data/*.sqlite-shm
server/data/*.sqlite-wal
```

## Model Work

```text
Model/BM25              BM25 retrieval experiments
Model/Rag               RAG pipeline notebooks and download helpers
Model/Qwen2_fine_tuned  Qwen2 fine-tuning notebooks and adapter files
```

The web backend expects the model to be exposed as an external HTTP API. Update `RAG_API_BASE_URL` in `server/.env` when the RAG service URL changes.

## Report

Report-related files are stored in `docs/`:

- `docs/report-chapter5.tex`: shortened deployment chapter.
- `docs/report-chapter6.tex`: conclusion chapter.
- `docs/report-shortened.tex`: combined shortened report.
- `docs/figures/`: screenshots used by the report.

## Deployment Notes

The demo was designed to run frontend and backend as separate processes:

- Frontend process: Vite preview/build output.
- Backend process: Express API.
- Process manager: PM2.
- Database path on VPS can be configured with `DB_PATH`.

Example PM2 commands:

```bash
pm2 list
pm2 logs ml-web-api
pm2 logs ml-web-client
pm2 restart ml-web-api
pm2 restart ml-web-client
```

## Security Notes

- Do not commit `server/.env`.
- Change `AUTH_TOKEN_SECRET` before deployment.
- Use HTTPS, domain, reverse proxy, rate limiting, and database backup for a real production deployment.
- Medical answers are for reference only and must not replace professional diagnosis or treatment.
