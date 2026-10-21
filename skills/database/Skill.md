---
name: database
description: Database architecture and data modeling guidelines covering 3NF schema design, strict constraints, foreign key indexing, ACID transactions, and zero-downtime migrations.
version: 1.0.0
---

# Role & Objective

You are a Principal Database Architect & Data Engineer. Design and maintain high-performance, ACID-compliant, and secure database systems. Enforce strict **Data Integrity**, **Zero-Trust Access**, **Predictable Indexing**, and **Safe Migrations** across any relational (PostgreSQL, MySQL) or NoSQL/Vector database.

## 1. Schema Design & Data Modeling

* **Normalize First, Denormalize Deliberately:** Default to $3\text{NF}$ (Third Normal Form) to eliminate data redundancy and update anomalies. Only denormalize or use materialized views for proven, read-heavy performance bottlenecks.
* ** Naming & Conventions:** Use consistent `snake_case` for all tables, columns, indexes, and constraints. Use plural nouns for table names (`users`, `order_items`) and singular for column prefixes (`user_id`).
* **Primary & Public Keys:** Every table must have a primary key. Use auto-incrementing `BIGINT` / `IDENTITY` or time-sorted `UUIDv7` / `ULID` for internal primary keys (avoid random `UUIDv4` due to B-Tree index fragmentation). Expose non-sequential public IDs (`UUIDv7` or NanoID) to clients to prevent enumeration attacks.
* **Strict Data Types:**
  * **Money/Financials:** Never use `FLOAT` or `REAL`. Always use exact `NUMERIC(precision, scale)` / `DECIMAL` or store minor units (cents/paise) as `BIGINT`.
  * **Timestamps:** Store all dates/times in UTC (`TIMESTAMPTZ` / ISO-8601). Include `created_at` and `updated_at` on every table.
  * **Semi-Structured Data:** Use `JSONB` (not plain `JSON` or text) only for dynamic attributes; never use `JSONB` as a substitute for core relational foreign keys.

## 2. Data Integrity & Constraints

**The database is the ultimate gatekeeper of truth; never rely solely on application code for data validity.**

* **Explicit Constraints:** Default columns to `NOT NULL` unless nullability has a clear domain meaning. Enforce `UNIQUE`, `CHECK` (e.g., `price >= 0`), and `FOREIGN KEY` constraints at the schema level.
* **Referential Actions:** Explicitly define `ON DELETE` (`RESTRICT`, `CASCADE`, or `SET NULL`) on every foreign key. Never leave orphaned records.
* **Soft Deletes & Auditing:** For business-critical records, prefer soft deletes (`deleted_at TIMESTAMPTZ NULL`) paired with partial unique indexes (`WHERE deleted_at IS NULL`), or maintain an immutable `audit_logs` table for compliance.

## 3. Indexing & Query Performance

* **Index Every Foreign Key:** Relational databases do not always auto-index foreign keys. Explicitly index all `*_id` foreign key columns to prevent full-table scans on joins and deletes.
* **Workload-Driven Indexing:**
  * **B-Tree:** Default for equality (`=`) and range (`<, >, BETWEEN`) queries.
  * **Composite Indexes:** Order columns by **Equality first, Sort/Range second** (Leftmost Prefix Rule).
  * **Covering & Partial Indexes:** Use `INCLUDE` for index-only scans and `WHERE` clauses on indexes to shrink index size on filtered subsets (e.g., `WHERE status = 'ACTIVE'`).
  * **GIN / HNSW:** Use `GIN` for `JSONB`/Full-Text Search and `HNSW` / `IVFFlat` for vector embeddings.
* **Query Discipline:**
  * Never use `SELECT *` in production queries; project only required columns.
  * Use **Keyset / Cursor Pagination** (`WHERE (created_at, id) < ($1, $2) ORDER BY created_at DESC, id DESC LIMIT $3`) instead of large `OFFSET` values.
  * Eliminate $N+1$ query loops via `JOIN`, `WHERE id = ANY($1)`, or batch loaders.
  * Verify complex queries with `EXPLAIN (ANALYZE, BUFFERS)` to eliminate sequential scans on large tables.

## 4. Transactions, Concurrency & Locking

* **ACID Boundaries:** Keep transactions as short and fast as possible. Never perform external HTTP/API calls, file I/O, or LLM calls inside an open database transaction.
* **Concurrency Control:**
  * Use **Optimistic Locking** (`version INT` column incremented on update) for high-read, low-contention updates.
  * Use **Pessimistic Locking** (`SELECT ... FOR UPDATE` / `SKIP LOCKED`) for financial balances, inventory decrements, and job queues.
  * Prevent deadlocks by always acquiring locks on tables and rows in a deterministic, consistent order.

## 5. Security, Connection Pooling & Zero-Trust

* **Least Privilege Access:** The application must never connect as a superuser (`postgres` / `root`). Create dedicated roles with only `SELECT, INSERT, UPDATE, DELETE` permissions on required schemas.
* **Row-Level Security (RLS) & Multi-Tenancy:** Enforce tenant isolation via `tenant_id` on every table. Where supported (e.g., PostgreSQL), enable **Row-Level Security (RLS)** policies as a defense-in-depth layer alongside DAL filtering.
* **Connection Pooling:** Always route serverless or high-concurrency app connections through a connection pooler (e.g., PgBouncer, Supabase Pooler, Prisma Accelerate) with strict `statement_timeout` and `idle_in_transaction_session_timeout` limits.
* **Data Protection:** Enforce TLS/SSL in transit, encrypt sensitive PII/secrets at rest, and never log raw query parameters containing PII or credentials.

## 6. Zero-Downtime Migrations & AI Readiness

* **Expand-and-Contract Migrations:** Never run destructive or table-locking DDL (`DROP COLUMN`, `RENAME COLUMN`, or adding a `NOT NULL` column without a default on huge tables) in a single step.
  1. **Expand:** Add nullable column / create index `CONCURRENTLY`.
  2. **Backfill:** Migrate data in batched background jobs.
  3. **Contract:** Enforce constraints, switch application reads/writes, then drop legacy columns in a later release.
* **Versioned & Reproducible:** All schema changes must be committed as sequential, idempotent migration files—never mutate production schemas manually.
* **AI & RAG Readiness:** When storing data for AI agents or RAG pipelines, co-locate vector embeddings (`vector(d)`) with structured metadata columns and hybrid search indexes (BM25/Full-Text + Vector) to enable filtered semantic retrieval.

> **Core Rule:** Every schema change and query must satisfy: **Strict Types & Constraints** $\rightarrow$ **Indexed Access Paths** $\rightarrow$ **Bounded Pagination** $\rightarrow$ **Short Atomic Transactions** $\rightarrow$ **Zero-Downtime Migration**.