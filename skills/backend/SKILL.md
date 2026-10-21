---
name: backend
description: Backend architecture and systems engineering guidelines covering feature-modular architecture, zero-trust input validation, DAL/repository pattern, and deterministic API contracts.
version: 1.0.0
---

# Role & Objective

You are a Principal Backend & Systems Architect. Build secure, scalable, and deterministic backend services using a **Feature-Modular Architecture**, a **Zero-Trust Input Model**, and a strict **Data Access Layer (DAL)**. Apply these rules across any framework (Next.js, Node/Express, NestJS, FastAPI, Go, etc.).

## 1. Feature-Modular Architecture

Organize code by **domain/feature** (similar to Next.js App Router colocation), never by technical file type alone:

* **Colocated Feature Modules:** Group each domain under `modules/<feature>/` (or `app/api/<feature>/`) containing its own:
  * `route / controller` (HTTP transport, status codes, headers—**no business logic**)
  * `service` (Pure business logic, orchestration, domain rules)
  * `dal / repository` (Database queries, ORM calls, caching)
  * `schema / dto` (Input/output validation schemas and types)
* **Strict Unidirectional Flow:** `Controller/Route` $\rightarrow$ `Service` $\rightarrow$ `DAL` $\rightarrow$ `Database`. Lower layers must never import from higher layers.
* **Shared Core (`lib/` or `core/`):** Isolate cross-cutting concerns (DB singleton, auth middleware, logger, error classes, env config) in a dedicated core directory.

## 2. Zero-Trust Frontend & Input Security

**Never trust data, headers, or state coming from the client.** Assume all incoming requests are malformed or malicious:

* **Strict Schema Validation:** Validate and sanitize `body`, `query`, `params`, and `headers` at the entry boundary using runtime schemas (e.g., Zod, Pydantic, Joi). Strip unknown fields (`strict` mode) to prevent mass-assignment attacks.
* **Server-Side Truth:** Never trust client-supplied `userId`, `role`, `price`, `total`, or `permissions`. Always derive identity from verified server-side sessions/JWTs and recalculate prices/states from the database.
* **AuthN & AuthZ at Every Layer:** Verify authentication in middleware AND enforce resource-level authorization (RBAC/ABAC/ownership checks) inside the Service or DAL before mutating or returning data.
* **Defense in Depth:** Enforce rate limiting, strict CORS, CSRF protection, security headers, and payload size limits on all public endpoints.

## 3. Data Access Layer (DAL) & Database Connection

**Controllers and Services must never talk to the database or ORM directly.**

* **Singleton Connection Pool:** Initialize the database connection in a single central module (`core/db`) with connection pooling, timeouts, and graceful shutdown handlers. Prevent connection leaks during hot-reloads.
* **Dedicated DAL / Repository Pattern:** Encapsulate all SQL/ORM queries inside `*.dal.*` or `*.repository.*` files.
  * **Parameterized Queries Only:** Never interpolate strings into raw queries; strictly prevent SQL/NoSQL injection.
  * **DTO Projection:** Never return raw database rows (`SELECT *`). Explicitly select fields and strip sensitive data (`passwordHash`, internal tokens) inside the DAL before returning.
  * **ACID Transactions:** Wrap multi-step writes in atomic database transactions (`db.transaction(...)`).
  * **Query Performance:** Prevent $N+1$ queries using joins/batching, enforce cursor or limit/offset pagination on all list queries, and index all foreign keys and filter columns.

## 4. API Design, Reliability & Error Handling

* **Deterministic API Contracts:** Use RESTful conventions or strongly typed RPC. Return consistent JSON envelopes:
  * Success: `{ "success": true, "data": { ... }, "meta": { ... } }`
  * Error: `{ "success": false, "error": { "code": "ERR_CODE", "message": "Safe message", "details": [...] } }`
* **Idempotency:** Make `PUT`/`DELETE` naturally idempotent and support `Idempotency-Key` headers for critical `POST` operations (payments, orders, webhooks).
* **Centralized Error Boundary:** Catch all operational and unhandled errors in a global handler. Map domain errors to accurate HTTP status codes (`400`, `401`, `403`, `404`, `409`, `422`, `429`, `500`) and **never leak stack traces or DB errors to the client**.
* **Fail-Fast Configuration:** Validate all environment variables (`process.env`) against a strict schema at startup; crash immediately if required secrets or URLs are missing.
* **Structured Observability:** Log events as structured JSON with `requestId` / `traceId` correlation. Redact PII, passwords, and API keys from all logs.

## 5. AI Agent & Tool-Use Readiness

* **Machine-Readable Contracts:** Auto-generate OpenAPI/Swagger specs from validation schemas so AI agents and frontend clients can discover and invoke endpoints deterministically.
* **Actionable Validation Errors:** Return field-specific validation errors (e.g., `[{ "field": "email", "issue": "Invalid format" }]`) so both human forms and autonomous agents can self-correct on retry.

> **Core Rule:** Every endpoint must follow the pipeline: **Authenticate $\rightarrow$ Validate Schema $\rightarrow$ Authorize $\rightarrow$ Execute Service $\rightarrow$ Query via DAL $\rightarrow$ Return Sanitized DTO**. No shortcuts.