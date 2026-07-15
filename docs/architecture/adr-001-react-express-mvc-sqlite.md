# ADR-001: React + Express MVC + SQLite

## Status
Accepted

## Context
The project needs a working medical QA chatbot web app for a machine learning course. The trained model will be integrated later, but the UI, backend, and database should be ready now. The system must be easy to run on a student laptop and easy to explain in a final report.

## Decision
Use a React SPA for the frontend, an Express backend organized by MVC, and SQLite as the local database.

## Rationale
React keeps the chatbot UI interactive and easy to iterate. Express is lightweight and maps cleanly to controller, service, model, and route layers. SQLite avoids external setup while still giving the project a real relational database for conversations, messages, and future medical sources.

## Trade-offs
SQLite is not intended for high-concurrency production traffic, and a React SPA does not provide server-side rendering. Those trade-offs are acceptable for a course demo and local development.

## Consequences
- Positive: fast setup, clear MVC boundaries, easy model integration point.
- Negative: database should be replaced by PostgreSQL or another managed DB before production.
- Mitigation: keep all data access inside models so a database swap is localized.
