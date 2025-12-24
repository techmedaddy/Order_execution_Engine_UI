# Order Execution Engine – Frontend Dashboard

## Project Overview
A developer-facing frontend for inspecting and interacting with an Order Execution Engine backend. The dashboard is an operational surface for backend engineers, SREs, and reviewers to observe order lifecycle, queue health, and worker concurrency in real time.

Who it is for
- Backend engineers validating idempotent order handling, retries and failure modes.
- SREs monitoring queue depth, throughput, and worker availability.
- Reviewers assessing system behavior under load and during fault scenarios.

What it visualizes
- Order lifecycle transitions (QUEUED → EXECUTING → SUCCESS / FAILED).
- Queue depth and backlog.
- Active worker counts, concurrency limits, and throughput.
- Request-level idempotency keys and request visibility.
- Real-time events and metric deltas emitted by the backend.

## Features
- Create execution orders via REST command endpoint.
- Live backlog with per-order status, timestamp, and idempotency key.
- Concurrency visualization: workers active, max workers, queue depth, throughput.
- Real-time updates via WebSocket; UI reconciles authoritative server events.
- Copy-to-clipboard for order IDs and idempotency keys.
- Lightweight simulation utilities for local development and manual testing.

## Frontend Architecture
- Component-based UI
	- `Dashboard` — top-level composition and orchestration.
	- `OrderForm` — order creation surface and client-side validation.
	- `OrderList` / `OrderCard` — backlog rendering and item-level details.
	- `ConcurrencyViz` — summarized view of workers, queue and throughput.
- API layer
	- REST for commands and control operations (create order, reset state).
	- WebSocket for server-sent events (order lifecycle changes and metrics).
- State flow
	- Local React state (+ hooks/effects) manages transient UI and optimistic updates.
	- WebSocket events are treated as the authoritative source for status reconciliation.
- Separation of concerns
	- Presentation components do not contain transport logic.
	- Data-fetching and event handling are centralized in `services/` and exposed via typed hooks.

## Data Flow
- Order submission
	1. `OrderForm` validates input and issues a POST to the backend REST API.
	2. Backend responds with order metadata (id, idempotency key) or enforces idempotency semantics.
	3. The frontend may add an optimistic `QUEUED` entry; backend events confirm or correct state.
- Status updates
	1. The frontend maintains a persistent WebSocket connection to receive lifecycle and metric events.
	2. Incoming events locate the matching order in local state and update status, timestamps, and metadata.
- UI reconciliation
	- React state setters and deterministic rendering update the UI; animations are visual only and never substitute authoritative state.
	- Conflicts are resolved by treating server-sent events as the single source of truth.

## Project Structure (example)
- `src/`
	- `components/` — visual components composed into pages
		- `ui/` — design-system primitives and shared controls
		- `dashboard/` — dashboard-specific composition and page components
	- `pages/` — route-level views (if applicable)
	- `hooks/` — reusable React hooks (`useWebSocket`, `useApi`, etc.)
	- `lib/` — small utilities and formatters
	- `services/` — API clients, WebSocket adapter, transport layer
	- `types/` — TypeScript interfaces and shared types
	- `styles/` — Tailwind tokens and global styles
- `vite.config.ts` — development server and CORS configuration
- `package.json`, `tsconfig.json` — toolchain configuration

Folder responsibilities
- `components/`: UI only; accept typed props and render state.
- `hooks/` and `services/`: encapsulate side effects, network I/O, and event handling.
- `lib/` and `types/`: shared utilities and strong type contracts used across the app.

## Getting Started

Prerequisites
- Node.js (LTS recommended)
- `npm` or `yarn`
- Backend server running separately (REST + WebSocket)

Install dependencies
```bash
npm install
# or
yarn
```

Environment variables
- `VITE_API_BASE_URL` — Backend API base URL
  - **Local development**: `http://localhost:7542` (configured in `.env`)
  - **Docker environment**: `http://backend:7542` (configured in `.env.docker`)
  - This variable is **required** and the application will fail fast if not configured

### Running Locally
```bash
npm run dev
```
- Uses `.env` file automatically
- Frontend runs on `http://localhost:3234`
- Backend expected at `http://localhost:7542`

### Running with Docker
Ensure your `Dockerfile` or `docker-compose.yml` uses the `.env.docker` file:
```yaml
# docker-compose.yml example
services:
  frontend:
    build: .
    env_file:
      - .env.docker
    ports:
      - "3234:3234"
  backend:
    # ... backend service configuration
    ports:
      - "7542:7542"
```
- Frontend calls `http://backend:7542` using Docker's service name
- Backend must be named `backend` in docker-compose services

Build for production
```bash
npm run build
# or
yarn build
```

Preview production build
```bash
npm run preview
# or
yarn preview
```

Notes
- The backend enforces idempotency and authoritative state; this frontend assumes those semantics and does not implement server guarantees.
- When pointing to remote backends, ensure the backend's CORS and WebSocket origins permit the frontend.

## Design Principles
- Backend-first UX: the UI surfaces backend telemetry and behavior; it does not enforce or replace backend policies.
- Observability over aesthetics: clarity, traceability, and reproducible states take priority.
- Deterministic UI states: rendering is driven by typed state and authoritative events.
- Explicit status representation: timestamps, statuses, and idempotency keys are primary signals for diagnosis.

## Non-goals
- No authentication or access control is implemented.
- No trading or execution strategy logic is performed on the client.
- No durable client-side persistence of order state; state is in-memory and reconciled from backend events.
- Not intended as a customer-facing product; this is an operational engineering tool.

## Intended Use
- Technical evaluation and debugging of the Order Execution Engine backend.
- Demonstration of system-design properties: idempotency, queueing, and worker concurrency.
- Operational checks and ad-hoc investigations by backend and infrastructure teams.

## Contributing / Local Practices
- Keep components small and composable; favor composition over large components.
- Centralize network I/O and WebSocket handling in `services/`.
- Expose typed hooks from `hooks/` for side effects and data access.
- Use TypeScript for public component props and service responses.

## License and Attribution
- See `package.json` for declared license metadata. If not specified, consult repository maintainers for licensing.

