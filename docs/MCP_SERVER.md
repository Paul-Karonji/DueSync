# DueSync MCP Server

DueSync now includes three MCP delivery paths:

- `Vercel route` for your existing hosted Next.js deployment
- `Streamable HTTP` for remote or production use
- `stdio` for local process-spawned use

For your current setup, the Vercel route is the best production path.

## Vercel Deployment Mode

The app now includes a native Next route at:

```text
/mcp
```

on your normal DueSync deployment.

That means if DueSync is already deployed on Vercel, you do not need a separate MCP host just to expose planning and task-management tools.

### Authentication

The Vercel route uses bearer tokens stored in the DueSync database. Each token belongs to one DueSync user, so requests are resolved per-user.

Create a token locally:

```bash
npm run mcp:token:create -- --email karonjipaul.w@gmail.com --name "My Agent"
```

Then call:

```text
https://duesync.wiktechnologies.com/mcp
```

with:

```text
Authorization: Bearer <token>
```

### Vercel Environment Variables

No new required Vercel environment variables were added for the Vercel route.

It uses the same app environment you already have, especially:

- `DATABASE_URL`
- `DIRECT_URL`

Optional only:

```env
MCP_ALLOWED_ORIGINS=""
```

If unset, the route still works.

## Production Mode

Start the remote server:

```bash
npm run mcp
```

It serves a stateless MCP endpoint at:

```text
/mcp
```

and a health endpoint at:

```text
/health
```

### Authentication

The HTTP server uses bearer tokens stored in the DueSync database. Each token belongs to one DueSync user, so requests are resolved per-user instead of through one global email env var.

Create a token:

```bash
npm run mcp:token:create -- --email you@example.com --name "My Agent"
```

Optional expiry:

```bash
npm run mcp:token:create -- --email you@example.com --name "My Agent" --expires-in-days 30
```

The command prints a bearer token once. Store it securely.

### Environment Variables

Your existing DueSync app variables stay the same. The MCP HTTP server only adds optional runtime settings:

```env
MCP_PORT="8787"
MCP_HOST="0.0.0.0"
MCP_ALLOWED_ORIGINS=""
```

Notes:

- `DATABASE_URL` and `DIRECT_URL` are still required because the MCP server reads the same database.
- `MCP_ALLOWED_ORIGINS` is optional. Leave it empty unless your client sends an `Origin` header and you want to restrict it.
- No `MCP_DUESYNC_USER_EMAIL` env var is needed for the HTTP server.

### Example Client Setup

Your MCP client needs:

- server URL: `https://your-domain.com/mcp`
- header: `Authorization: Bearer <your token>`

The exact config format depends on your MCP client, but those are the important pieces.

### Deployment Notes

This standalone HTTP server is useful if you ever want a dedicated MCP service outside Vercel. For your current setup, prefer the built-in Vercel route above.

## Local Stdio Mode

If you want the old local flow where the client spawns the MCP process on the same machine:

```bash
npm run mcp:stdio
```

For that mode only, set one of:

```env
MCP_DUESYNC_USER_EMAIL="you@example.com"
```

or

```env
MCP_DUESYNC_USER_ID="your-cuid"
```

## Tools

Both modes expose the same tools:

- `get_user_context`
- `list_tasks`
- `get_task`
- `get_today_tasks`
- `list_categories`
- `list_tags`
- `plan_day`
- `create_task`
- `update_task`
- `complete_task`
- `archive_task`
- `delete_task`

`plan_day` does not modify tasks. It scores pending work by urgency, priority, due date, and estimated time, then fits the best candidates into an available focus window.

## Example Agent Prompts

- "List my overdue tasks."
- "Show me what is due today."
- "Build me a 3-hour plan for today starting at 09:00."
- "Plan tomorrow with 180 minutes and include backlog."

## Current Limits

- Tokens are managed by CLI today, not through the DueSync UI yet.
- Categories and tags are still read-only through MCP today.
