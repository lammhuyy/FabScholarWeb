# FabScholar Frontend

Web UI for [FabScholar](https://github.com/anomalyco/lit-review-machine) — a literature review extraction and management platform. Built with Vite, React 18, TypeScript, Tailwind CSS, React Router v6, and TanStack Query.

## Prerequisites

- **Node.js 18+**
- The **backend** must be running locally for `npm run generate-api` and for the dev server to function. See the [lit-review-machine](https://github.com/anomalyco/lit-review-machine) repo for setup.

## Setup

```bash
cp .env.example .env          # VITE_API_BASE_URL defaults to http://localhost:8000/api/v1
npm install
npm run generate-api           # fetches OpenAPI schema from the live backend
npm run dev                    # starts on http://localhost:5173
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build locally |
| `npm run generate-api` | Regenerate `src/api/types.gen.ts` from the backend's OpenAPI schema |

## Project Structure

```
src/
├── api/
│   ├── client.ts           # Fetch wrapper — apiGet, apiPost, apiPostMultipart, apiDelete
│   └── types.gen.ts        # Generated TypeScript types from the backend's OpenAPI schema
├── components/
│   ├── layout/
│   │   └── AppShell.tsx    # App shell — header, sidebar navigation, health indicator
│   └── ui/
│       ├── ComingSoon.tsx  # Reusable placeholder for unimplemented features
│       └── StatusBadge.tsx # Color-coded status pill (queued/running/done/failed/etc.)
├── pages/
│   ├── runs/               # RunListPage, NewRunPage, RunDetailPage
│   ├── batches/            # BatchListPage, NewBatchPage, BatchDetailPage
│   ├── templates/          # TemplatesPage (placeholder)
│   ├── settings/           # SettingsPage (placeholder)
│   └── prompts/            # PromptsPage (placeholder)
├── routes.tsx              # React Router configuration
├── App.tsx
├── main.tsx                # Entry point — QueryClientProvider, render
└── index.css               # Tailwind directives
```

## Architecture

- **Typed API client**: `src/api/types.gen.ts` is generated from the backend's OpenAPI schema via `openapi-typescript`. The fetch wrapper in `client.ts` provides typed helpers (`apiGet`, `apiPost`, `apiPostMultipart`, `apiDelete`) that automatically prefix `VITE_API_BASE_URL`, parse JSON, and throw `ApiError` with the response body on non-2xx statuses.
- **Data fetching**: TanStack Query manages all server state. Queries poll automatically while runs/batches are in progress and stop once they reach a terminal state.
- **Routing**: React Router v6 with a shared layout (`AppShell`) providing header, sidebar navigation, and a live health-indicator dot.
- **Styling**: Tailwind CSS utility classes throughout.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `http://localhost:8000/api/v1` | Base URL for all API calls |

## API Health

The header displays a green/red dot indicating whether the backend is reachable (calls `GET /api/v1/health` on mount and periodically).

## Status Badges

`StatusBadge` maps status values to colors:

| Statuses | Color |
|----------|-------|
| queued, pending | Gray |
| running, in_progress | Blue |
| done, completed | Green |
| failed | Red |
| partial | Yellow |
