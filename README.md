# Hana Studio

Visual social-media carousel creation and management platform.

Create multi-slide TikTok carousel designs (1080 × 1920 px, 9:16) with images, text, and shapes.

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL (Neon or local)
- Clerk account for authentication

### Install dependencies

```bash
npm install
```

### Configure environment

Copy the example environment file and fill in your values:

**macOS/Linux:**
```bash
cp .env.example .env
```

**Windows PowerShell:**
```powershell
Copy-Item .env.example .env
```

#### Environment Variables

Keep all secrets local. Never commit `.env` to Git.

**Required:**
- `DATABASE_URL` — PostgreSQL connection string (Prisma ORM)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk publishable API key
- `CLERK_SECRET_KEY` — Clerk secret API key
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL` — `"/sign-in"`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL` — `"/sign-up"`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` — `"/"`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` — `"/"`

**Required for Object Storage & Asset Management:**
- `S3_ENDPOINT` — Cloudflare R2 / S3 endpoint URL
- `S3_REGION` — Bucket region (e.g. `auto`)
- `S3_BUCKET` — Bucket name
- `S3_ACCESS_KEY_ID` — Storage access key ID
- `S3_SECRET_ACCESS_KEY` — Storage secret access key
- `S3_PUBLIC_URL` — Optional CDN base URL
- `S3_FORCE_PATH_STYLE` — `true` for R2 / MinIO, `false` for AWS S3

### Set up database

```bash
npx prisma generate
npx prisma migrate dev
```

### Start development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Available commands

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to database (no migration) |
| `npm run db:migrate` | Create and apply migration |
| `npm run db:seed` | Seed database with dev data |
| `npm run db:studio` | Open Prisma Studio |

## Architecture

See [docs/architecture.md](docs/architecture.md) for the full architecture overview.

### Tech stack

- **Next.js 16** — App Router, React 19, TypeScript
- **Clerk** — User authentication, session management, route protection
- **Prisma 6** — Database ORM (PostgreSQL / Neon)
- **Konva / React-Konva** — 2D interactive canvas editor
- **@napi-rs/canvas + Sharp** — High-performance server-side rendering
- **AWS SDK v3** — Cloudflare R2 object storage abstraction
- **TanStack Query** — Client-side server-state caching and mutations
