# andive-helper

CLI helper for the [Andive](https://andive.net) Vector API. Supports all common endpoints for estimating, storing, searching, deleting, and checking storage usage.

## Requirements

- Node.js 18+
- Andive API key (`sk-live_...`)
- Endpoint slug from the Andive dashboard

## Installation

```bash
git clone https://github.com/YOUR-USER/andive-helper.git
cd andive-helper
npm install
```

## Configuration

```bash
cp .env.example .env
```

Fill in `.env`:

```env
ANDIVE_API_KEY=sk-live_YOUR_KEY
ANDIVE_ENDPOINT_SLUG=your-endpoint-slug
ANDIVE_BASE_URL=https://api.andive.net/v1/k
```

Alternatively, pass `--api-key` and `--endpoint-slug` on every command.

## Commands

| Command | Method | Endpoint | Description |
|---------|--------|----------|-------------|
| `estimate` | POST | `/vectors/estimate` | Estimate cost/size |
| `upsert` | POST | `/vectors/upsert` | Store or update a vector |
| `query` | POST | `/vectors/query` | Search for similar vectors |
| `delete` | DELETE | `/vectors/delete` | Archive vectors by `vector_id` |
| `delete-session` | DELETE | `/vectors/session` | Archive an entire session |
| `usage` | GET | `/usage` | Current storage usage |
| `call` | * | any | Generic API call |

## Examples

### Check storage usage

```bash
node src/cli.js usage
```

### Estimate a vector

```bash
node src/cli.js estimate --body examples/estimate.json
```

### Store a vector

```bash
node src/cli.js upsert --body examples/upsert.json
```

### Search vectors

```bash
node src/cli.js query --body examples/query.json
```

### Delete vectors

```bash
node src/cli.js delete --ids "550e8400-e29b-41d4-a716-446655440000,6ba7b810-9dad-11d1-80b4-00c04fd430c8"
```

### Delete a session

```bash
node src/cli.js delete-session --session chat-user-42
```

### Quick usage with flags (no JSON file)

```bash
node src/cli.js query \
  --vector "[0.11, -0.03, 0.09]" \
  --top-k 10 \
  --score-threshold 0.72 \
  --filter '{"source":"handbook.pdf"}'
```

### npm scripts

```bash
npm run usage
npm run estimate -- --body examples/estimate.json
npm run upsert -- --body examples/upsert.json
npm run query -- --body examples/query.json
npm run delete -- --body examples/delete.json
npm run delete-session -- --session chat-user-42
```

## Global options

All commands support:

```
--api-key <key>         Bearer token
--endpoint-slug <slug>  Endpoint slug
--base-url <url>        API base URL
--timeout <seconds>     Request timeout (default: 30)
```

## Example responses

**query**

```json
{
  "results": [
    {
      "vector_id": "uuid",
      "score": 0.91,
      "metadata": { "content": "..." }
    }
  ],
  "count": 1
}
```

**usage**

```json
{
  "plan_id": "pro",
  "limit_units": 100000,
  "used_units": 1234,
  "used_percent": 1.23,
  "requests_last_minute": 42
}
```

**delete**

```json
{
  "deleted": 2,
  "archived": 2,
  "freed_units": 4,
  "freed_bytes": 4096
}
```

## Programmatic usage

```js
import { AndiveClient } from "./src/client.js";

const client = new AndiveClient({
  apiKey: process.env.ANDIVE_API_KEY,
  endpointSlug: process.env.ANDIVE_ENDPOINT_SLUG,
});

const usage = await client.getUsage();
console.log(usage.body);
```

## Note on `usage`

`billing_period_start` and `billing_period_end` are display-only. Quota is based on storage capacity, not a monthly API reset.

## License

MIT
