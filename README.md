# Hana Studio

Visual social-media carousel creation and management platform.

Create multi-slide carousel designs with images, text, and shapes. Export as PNG or ZIP.

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL

### Install dependencies

```bash
npm install
```

### Configure environment

Copy the example environment file and fill in your values:

```bash
cp .env.example .env.local
```

Required variables:

- `DATABASE_URL` — PostgreSQL connection string

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
| `npx prisma generate` | Generate Prisma client |
| `npx prisma db push` | Push schema to database |

## Architecture

See [docs/architecture.md](docs/architecture.md) for the full architecture overview.

### Project structure

```
src/
├── app/              # Pages and layouts (App Router)
├── components/       # Shared UI components
├── features/         # Domain modules (projects, editor, assets)
├── lib/              # Utilities and helpers
├── server/           # Server-side logic
├── stores/           # Client-side state management
└── types/            # Shared type definitions

prisma/               # Database schema and migrations
docs/                 # Architecture documentation
```

### Tech stack

- **Next.js** — App Router, React 19, TypeScript
- **Tailwind CSS** — Utility-first styling
- **Prisma** — Database ORM (PostgreSQL)
- **Fabric.js** — Canvas editor (planned)

## Implementation status

**Phase: Foundation** — Project setup, directory structure, configuration, documentation.

No application features have been implemented yet. See the roadmap in `docs/architecture.md` for planned milestones.
