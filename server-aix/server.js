import express from "express";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "snippets.json");
const PORT = process.env.PORT || 3847;

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

async function ensureStore() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }

  if (!existsSync(DATA_FILE)) {
    await writeFile(DATA_FILE, "[]", "utf8");
  }
}

async function readSnippets() {
  await ensureStore();
  const raw = await readFile(DATA_FILE, "utf8");
  return JSON.parse(raw);
}

async function writeSnippets(snippets) {
  await writeFile(DATA_FILE, JSON.stringify(snippets, null, 2), "utf8");
}

app.get("/api/snippets", async (req, res) => {
  try {
    const snippets = await readSnippets();
    const q = (req.query.q || "").toLowerCase().trim();

    if (!q) {
      return res.json(snippets);
    }

    const filtered = snippets.filter((snippet) => {
      const haystack = [
        snippet.title,
        snippet.language,
        snippet.tags.join(" "),
        snippet.code,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });

    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/snippets", async (req, res) => {
  try {
    const { title, language, tags, code } = req.body;

    if (!title?.trim() || !code?.trim()) {
      return res.status(400).json({ error: "Title and code are required." });
    }

    const snippets = await readSnippets();
    const snippet = {
      id: randomUUID(),
      title: title.trim(),
      language: (language || "text").trim(),
      tags: Array.isArray(tags)
        ? tags.map((tag) => String(tag).trim()).filter(Boolean)
        : String(tags || "")
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
      code,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    snippets.unshift(snippet);
    await writeSnippets(snippets);
    res.status(201).json(snippet);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/snippets/:id", async (req, res) => {
  try {
    const { title, language, tags, code } = req.body;
    const snippets = await readSnippets();
    const index = snippets.findIndex((snippet) => snippet.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: "Snippet not found." });
    }

    snippets[index] = {
      ...snippets[index],
      title: title?.trim() || snippets[index].title,
      language: language?.trim() || snippets[index].language,
      tags: Array.isArray(tags)
        ? tags.map((tag) => String(tag).trim()).filter(Boolean)
        : String(tags || "")
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
      code: code ?? snippets[index].code,
      updatedAt: new Date().toISOString(),
    };

    await writeSnippets(snippets);
    res.json(snippets[index]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/snippets/:id", async (req, res) => {
  try {
    const snippets = await readSnippets();
    const next = snippets.filter((snippet) => snippet.id !== req.params.id);

    if (next.length === snippets.length) {
      return res.status(404).json({ error: "Snippet not found." });
    }

    await writeSnippets(next);
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Snippet Vault running at http://localhost:${PORT}`);
});
