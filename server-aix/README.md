# Snippet Vault

A local web app to save, search, edit and copy code snippets. Runs entirely on your machine — no cloud, no accounts.

## Features

- Create, update and delete snippets
- Search by title, tags, language or code
- Copy snippet code with one click
- Data stored locally in `data/snippets.json`

## Requirements

- Node.js 18+

## Quick start

```bash
npm install
npm start
```

Open [http://localhost:3847](http://localhost:3847)

## Development

```bash
npm run dev
```

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/snippets?q=` | List or search snippets |
| POST | `/api/snippets` | Create snippet |
| PUT | `/api/snippets/:id` | Update snippet |
| DELETE | `/api/snippets/:id` | Delete snippet |

## License

MIT
