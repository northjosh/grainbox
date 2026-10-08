# Grainbox

small proof of concept sanbox platform built on top of [microsanbox](https://github.com/superradcompany/microsandbox) with react, xterm, and hono.

## Structure

- **`client/`** - Frontend React app
  - Xterm.js for browser terminal
  - TanStack Router for routing
  - Tailwind CSS for styling
  - Base UI components
  - Zustand for state management

- **`srv/`** - Backend API server
  - Hono and Websockets
  - SQLite database with Drizzle ORM
  - Authentication & session management
  - MicroVM sandbox runner API

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- microsanbox

microsandbox sdk can check and install microsanbox for you on startup with 
```
await ensureRuntime();

```
in `srv/src/index.ts`

you can also install it yourself by following the instructions [here](https://github.com/superradcompany/microsandbox#getting-started)


### Install dependencies

```bash
pnpm install
```

### Development

Start both client and server in development mode:

```bash
pnpm dev
```

- Client: [http://localhost:3000](http://localhost:3000)
- Server: [http://localhost:3001](http://localhost:3001)

### Building

```bash
pnpm build
```

### Type checking

```bash
# Client
cd client && npx tsc --noEmit

# Server
cd srv && npx tsc --noEmit
```

## API

The client proxies API requests to `/api/*` through Vite to the server on port 3001.

## Features
- Session-based authentication
- Ephemeral microVM sandbox execution
- Run history persisted locally
- Real-time server health monitoring
- Keyboard shortcuts (⌘/Ctrl+Enter to run, Esc to cancel)

## License

MIT
