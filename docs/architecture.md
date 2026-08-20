# Hana Studio Architecture

## Overview

Hana Studio is a visual social-media carousel creation and management platform. It allows users to create multi-slide carousel designs with images, text, and shapes, and export them as PNG images or ZIP archives.

## Technology Stack

| Concern | Technology |
|---|---|
| Framework | Next.js (App Router, latest stable) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL |
| ORM | Prisma |
| Canvas | Fabric.js (to be evaluated at canvas milestone) |
| State (client) | Zustand (to be added) |
| Validation | Zod (to be added) |
| Auth | Auth.js (to be added) |

## Directory Structure

```
src/
├── app/              # Next.js App Router pages and layouts
├── components/       # Shared UI components
├── features/         # Domain-specific modules (projects, editor, assets, etc.)
├── lib/              # Utility functions and helpers
├── server/           # Server-side logic and database access
├── stores/           # Client-side state management
└── types/            # Shared TypeScript type definitions

prisma/               # Database schema and migrations
docs/                 # Architecture documentation
public/               # Static assets
```

## Domain Boundaries

Each feature module under `src/features/` should encapsulate:

- Its own components
- Feature-specific hooks
- Domain logic and utilities
- Types specific to that domain

Features should communicate through well-defined interfaces. Direct imports across feature boundaries should be avoided in favor of shared types and events.

## Key Architectural Decisions

1. **Single Next.js application** — No monorepo until a technical need justifies extraction.
2. **Fabric.js for canvas** — To be evaluated and implemented at the canvas milestone. The canvas layer must remain isolated behind a Hana Studio abstraction.
3. **Server Actions and Route Handlers** — Used for API endpoints. tRPC may be introduced later if the API surface becomes complex.
4. **Prisma for database** — Schema defined in `prisma/schema.prisma`. Full schema implementation deferred to the database milestone.
5. **Zustand for editor state** — Client-side state separate from server-persisted data.
6. **Zod for validation** — Used for form inputs and API request validation.

## Milestones

This project follows an incremental milestone-based approach. Each milestone adds a focused set of features:

1. Foundation (current)
2. Database schema
3. Authentication
4. Dashboard and project management
5. Canvas editor
6. Assets and upload
7. Multi-slide support
8. Rendering and export
9. Templates
10. AI integration

## Status

**Current milestone:** Foundation — project setup, directory structure, configuration, documentation.

No application features have been implemented yet.
