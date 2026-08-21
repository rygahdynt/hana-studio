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
| Canvas Editor | Konva / React-Konva |
| Server Rendering | @napi-rs/canvas + Sharp + AdmZip |
| Storage | S3 / Cloudflare R2 Abstraction (@aws-sdk/client-s3) |
| State (server) | TanStack Query v5 |
| State (client) | Zustand / React State |
| Validation | Zod |
| Auth | Clerk (@clerk/nextjs) |

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
2. **Konva & React-Konva for canvas** — Declarative React 19 component tree with clean feature modularity under `src/features/editor/`.
3. **Server-side Rendering with `@napi-rs/canvas` & Sharp** — Direct high-performance Skia canvas rendering independent of browser UI.
4. **Storage Abstraction for S3 & Cloudflare R2** — Environment-driven, vendor-agnostic object storage under `src/lib/storage/`.
5. **Server Actions and Route Handlers** — Used for API endpoints with Zod validation.
6. **Prisma for database** — Authoritative relational schema defined in `prisma/schema.prisma` with typed entities (`Project`, `Slide`, `Element`, `Asset`, `Template`, `Render`).
7. **TanStack Query for server state** — Client-side query caching, mutations, and optimistic updates.

## Database

Schema defined in `prisma/schema.prisma`. Migration SQL in `prisma/migrations/`.

### Entities

| Entity | Purpose |
|---|---|
| **User** | Application user mapped to Clerk session via stable `clerkId`. Authoritative identity for project/asset ownership and future Hana Pulse credit balance. |
| **Project** | A carousel design. Owns slides, linked to optional template. |
| **Slide** | A single page in a carousel. Ordered by position within a project. |
| **Element** | An object/layer on a slide (image, text, shape). Common properties relational; type-specific properties in JSONB. |
| **Asset** | An uploaded media file. User-owned, reusable across projects. |
| **Template** | A predefined carousel structure. System-owned for MVP. |
| **Render** | An export/render request with output tracking. |

### Enums

- **ProjectStatus** — `DRAFT`, `PUBLISHED`, `ARCHIVED`
- **ElementType** — `IMAGE`, `TEXT`, `SHAPE`
- **AssetStatus** — `PROCESSING`, `READY`, `FAILED`
- **RenderStatus** — `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`

### Relationships

```
User ──< Project ──< Slide ──< Element
  │         │                    │
  │         │                    └──> Asset (optional)
  │         ├──> Template (optional)
  │         └──< Render
  ├──< Asset
  └──< Render
```

### Cascade Behavior

- **User deleted** → Projects, Assets, Renders cascade deleted
- **Project deleted** → Slides, Elements (via Slides), Renders cascade deleted
- **Asset deleted** → Element.assetId set to null (elements remain)
- **Template deleted** → Project.templateId set to null (projects remain)

### JSONB Usage

Only two fields use JSONB:

- **Element.properties** — Type-specific data (image src, text content, shape fill). Common properties (position, size, rotation) are relational columns.
- **Template.definition** — Versioned carousel structure for templates.
- **Render.outputUrls** — Array of rendered image URLs.

### Key Indexes

- Users: unique email
- Projects: userId, userId+status
- Slides: projectId, projectId+position (unique)
- Elements: slideId, assetId
- Assets: userId, userId+category
- Templates: category, isActive
- Renders: userId, projectId

## External AI & MCP Architecture (Claude Integration)

```
                    CLAUDE (External Reasoning Layer)
                                  ↓
                        Remote MCP Connector
                                  ↓
                     POST/GET /api/mcp (HTTP Transport)
                                  ↓
                       resolveMcpUser(request)
               (Clerk Session / Bearer Authorization)
                                  ↓
                       createHanaStudioMcpServer(user)
                                  ↓
        ┌─────────────────────────┼─────────────────────────┐
        ↓                         ↓                         ↓
  Content Tools             Project Tools             Asset Tools
(generate_carousel_content, (list, get, create,     (list_assets,
create_project_from_content) update_project)       insert_asset)
        ↓                         ↓                         ↓
  Template Tools             Slide Tools              Element Tools
 (list_templates)         (add, duplicate, delete,   (add_text, add_shape,
                           reorder_slide)            delete_element)
        ↓                         ↓                         ↓
  Layout Resolver         editor-operations.ts        Cloudflare R2
        └─────────────────────────┬─────────────────────────┘
                                  ▼
                          Neon PostgreSQL
```

### Core Design Principles
1. **Claude is the AI Reasoning Layer**: Claude writes natural-language copy and structured `ContentPlan` JSON. Hana Studio does NOT invoke secondary LLMs during Claude tool executions.
2. **MCP is a Thin Tool Adapter**: MCP tools contain zero duplicated business logic and delegate directly to existing domain services (`src/server/projects.ts`, `src/server/assets.ts`, `src/features/editor/engine/editor-operations.ts`).
3. **Layout Resolver Handles Visuals**: `resolveSlideElements()` calculates exact 1080 × 1920 (9:16) coordinates, typography scales, card containers, and CTA pills from design system tokens.
4. **Strict Multi-Tenant Authorization**: All tool calls resolve to the authenticated internal `User.id` and enforce database ownership boundaries.

## Status

**Current Milestone:** Phase 10 — Claude MCP Connection & Real End-to-End Verification Complete.
