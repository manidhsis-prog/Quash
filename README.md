# Quash

Quash is a daily updates platform for news, trends, fashion, communities, groups, and creator posts.

## Production Architecture (Implemented)

- `spring-backend/`: Java Spring Boot backend (OOP service layer)
- PostgreSQL for persistent data
- Flyway SQL migrations (`V1`, `V2`) for audited schema changes
- HttpOnly session cookies for auth (no bearer token in browser storage)
- CSRF protection using Spring Security + `XSRF-TOKEN` cookie
- TLS reverse proxy with Nginx
- Centralized logs with Loki + Promtail
- Monitoring and alerting with Prometheus + Alertmanager + Grafana
- Automated PostgreSQL backups

## Run Production Stack

1. Configure environment variables:

```powershell
Copy-Item infra\.env.example infra\.env
```

2. Add TLS certs in `infra/certs/`:

```text
fullchain.pem
privkey.pem
```

3. Start:

```powershell
.\start-quash-production.ps1
```

4. Open:

```text
https://localhost
```

## Backend API

Main routes:

- `POST /api/register` (sets HttpOnly session cookie)
- `POST /api/login` (sets HttpOnly session cookie)
- `GET /api/me`
- `POST /api/logout` (clears session cookie)
- `GET /api/posts`
- `POST /api/posts`
- `POST /api/posts/:id/like`
- `POST /api/posts/:id/comments`
- `POST /api/posts/:id/share`
- `POST /api/users/:id/follow`
- `GET /api/notifications`
- `POST /api/notifications/read`
- `GET /api/search?q=term`
- `GET /api/topics/:topic`
- `POST /api/topics/:topic/follow`
- `GET /api/my-activity`

## Security Controls

- Password hashing: `PBKDF2-HMAC-SHA256` with configurable iterations
- Session token stored server-side + HttpOnly secure cookie
- CSRF protection enabled for state-changing endpoints
- Rate limiting for registration, login, and writes
- Input validation for usernames, emails, topics, and content lengths
- Security headers at reverse proxy and backend
- CORS restricted to configured frontend origins

## Migrations and Audit Trail

- `V1__init_schema.sql`: base schema
- `V2__performance_and_audit.sql`: index and schema audit metadata table
- Flyway tracks execution history and migration ordering

## Legacy Prototype

The previous C++ prototype backend remains in `cpp_backend/` for reference, but production path is now `spring-backend/` + `infra/`.

## Quick Free Feedback Deploy

This repo also includes a root `Dockerfile` and `render.yaml` for a quick Render web-service deploy of the current working Quash prototype.

- Free hosting target: Render web service on a public `*.onrender.com` subdomain.
- Important limit: free Render Postgres databases expire after 30 days, and free services are for testing/feedback, not production.
- Account creation still has to be confirmed by the owner of the Gmail account in the Render signup page.
