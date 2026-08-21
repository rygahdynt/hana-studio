# Hana Studio — Reference Repository Migration Inventory

This document outlines the systematic inspection, classification, and migration decisions for incorporating proven implementations from the reference repository (`hana-social`) into **Hana Studio**.

Hana Studio's modular architecture, relational database model, and product requirements remain the authoritative source of truth.

---

## 1. Executive Summary & Migration Matrix

Each subsystem from the reference repository was evaluated against Hana Studio's architectural principles:
- Keep domain logic separate from UI.
- Keep editor state separate from persistence.
- Keep rendering separate from interactive editor.
- Preserve structured relational data models over monolithic JSON blobs.
- Do not import technical debt or reference-specific integrations.

### Classification Matrix

| Subsystem / Area | Reference Implementation | Classification | Decision & Rationale |
|---|---|---|---|
| **Interactive Canvas Engine** | Konva / React-Konva (`canvas-editor.tsx`, 2200+ lines) | **ADAPT / REBUILD** | **Adopt Konva / React-Konva** over Fabric.js due to seamless React 19 integration, declarative component tree, and 1:1 conceptual mapping with `@napi-rs/canvas`. **Rebuild** the monolithic 2200-line editor into modular feature components under `src/features/editor/`. |
| **Server-Side Rendering** | `@napi-rs/canvas` + `sharp` + `adm-zip` (`canvas-renderer.ts`) | **ADAPT** | Migrate high-performance Skia canvas rendering, font registration, text measurement/wrapping, and ZIP packaging. Strip reference-specific database models, random asset selection, and social posting logic. Decouple into `src/server/rendering/`. |
| **Image Processing Utilities** | `sharp` (`photo-util.ts`) | **ADAPT** | Migrate core image manipulation (resizing, format conversion, EXIF handling, thumbnail generation, dimension metadata) into `src/lib/media/`. Remove reference-specific scraping and AI generation code. |
| **Cloud Storage** | AWS SDK v3 S3 / R2 (`s3.ts`, `s3-util.ts`) | **ADAPT** | Migrate S3/Cloudflare R2 storage client with typed abstraction (`StorageService`) in `src/lib/storage/`. Ensure environment variable safety, signed URLs, and buffer streaming. |
| **Client State / Fetching** | `@tanstack/react-query` v5 | **KEEP / MIGRATE** | Adopt TanStack Query for server state management, caching, and optimistic UI updates. Provide minimal clean provider in `src/components/providers/`. |
| **Fonts & Assets** | Google/OFL TTF fonts in `public/` | **KEEP / MIGRATE** | Migrate OFL-licensed fonts (`Inter`, `Montserrat`, `Noto Color Emoji`, `Playfair Display`) to `public/fonts/` for server-side Skia rendering and canvas parity. |
| **Database Schema** | Prisma with giant `Project.data` JSON | **DO NOT MIGRATE** | Retain Hana Studio's relational schema (`User`, `Project`, `Slide`, `Element`, `Asset`, `Template`, `Render`). The canvas is an interactive view, not the canonical database schema. |
| **Authentication** | Better Auth (`auth.ts`, `auth-client.ts`, session tables) | **DO NOT MIGRATE** | Auth is a separate milestone. Excluded from this migration. |
| **External Social Gateway** | `widya-social` API client, encrypted tokens | **DO NOT MIGRATE** | Dedicated social publishing architecture will be designed in a future milestone. |
| **TikTok Scraper** | Playwright scraper, `musicaldown.com` | **DO NOT MIGRATE** | Reference-specific scraping implementation outside Hana Studio scope. |
| **MCP (Model Context Protocol)** | MCP server route & tools (`app/api/mcp`) | **DO NOT MIGRATE** | MCP capability is slated for future milestones. |
| **Cloud Tasks / Background Queues** | Google Cloud Tasks integration | **DO NOT MIGRATE** | Asynchronous job execution will be designed for Hana Studio's specific scale and infrastructure. |

---

## 2. Key Architecture Decisions

### Decision 1: Canvas Engine — Konva (Adopted) vs Fabric.js

**Evaluation:**
- **Fabric.js**: Imperative object-oriented API that binds directly to the HTML5 canvas DOM node. Maintaining state synchronization across React 19 renders requires complex lifecycle glue and can cause stale closures and redraw glitches.
- **Konva + React-Konva**: Provides a declarative React component model (`<Stage>`, `<Layer>`, `<Rect>`, `<Text>`, `<Image>`, `<Transformer>`). Fits naturally into React 19's reconciliation engine.
- **Server Rendering Parity**: `@napi-rs/canvas` on Node.js implements standard HTML5 2D Canvas context methods (`fillRect`, `fillText`, `drawImage`, `setTransform`), exactly matching Konva's internal draw pipeline.

**Decision**: Adopt **Konva / React-Konva** for the interactive canvas. Split into clean, decoupled feature components (`EditorCanvas`, `EditorToolbar`, `ElementRenderer`, `PropertiesPanel`, `SlideNavigator`, `LayerPanel`).

### Decision 2: Document Model vs Canvas Model

The database stores structured relational entities:
```
Project
  └── Slide (ordered by position)
        └── Element (relational common fields: x, y, width, height, rotation, opacity, zIndex, locked, visible; JSONB for type-specific properties)
```

The Editor converts between the relational document model and the Konva scene graph via pure serializer functions in `src/features/editor/engine/serializer.ts`.

### Decision 3: Server-Side Rendering Architecture

Rendering operates independently of any React UI or browser state:
```
Canonical Project / Slide Data
          ↓
  Server Canvas Renderer (@napi-rs/canvas)
          ↓
  Slide Buffers (PNG / JPEG / WebP via Sharp)
          ↓
  ZIP Archive (AdmZip) / Cloud Storage (S3 / R2)
          ↓
  Database Render Record
```

---

## 3. Scope of Migration in Hana Studio

### Packages to Install:
1. `@napi-rs/canvas` — High-performance Node.js canvas rendering
2. `sharp` & `@types/sharp` — High-performance image processing
3. `adm-zip` & `@types/adm-zip` — Server-side ZIP archive creation
4. `@aws-sdk/client-s3` & `@aws-sdk/s3-request-presigner` — S3 / Cloudflare R2 object storage
5. `konva` & `react-konva` & `use-image` — Interactive canvas engine
6. `@tanstack/react-query` — Client server-state management
7. `lucide-react` — Icon set for editor and navigation
8. `clsx` & `tailwind-merge` — Class name composition utilities

### Modules Created:
- `src/lib/media/` — Image manipulation, format conversion, thumbnail generation, EXIF metadata.
- `src/lib/storage/` — Storage abstraction layer (S3 / Cloudflare R2) and signed URL generators.
- `src/server/db.ts` — Prisma client singleton for Next.js.
- `src/server/rendering/` — Canvas renderer, text layout/wrapping engine, font registrar, slide exporter.
- `src/features/editor/` — Modular Konva editor:
  - `types.ts`
  - `engine/serializer.ts`
  - `engine/canvas-math.ts`
  - `components/EditorCanvas.tsx`
  - `components/ElementRenderer.tsx`
  - `components/EditorToolbar.tsx`
  - `components/PropertiesPanel.tsx`
  - `components/SlideNavigator.tsx`
  - `components/LayerPanel.tsx`
- `src/components/providers/query-provider.tsx` — TanStack Query client provider.
- `public/fonts/` — Open-source OFL TTF fonts for canvas and renderer.
