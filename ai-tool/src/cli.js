#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { Command } from "commander";
import { AndiveClient, formatResponse } from "./client.js";

loadEnv();

function parseJson(value, label) {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`Invalid ${label} JSON: ${value}`);
  }
}

async function readJsonFile(filePath) {
  const content = await readFile(resolve(filePath), "utf8");
  return JSON.parse(content);
}

function createClient(options) {
  const apiKey = options.apiKey || process.env.ANDIVE_API_KEY;
  const endpointSlug = options.endpointSlug || process.env.ANDIVE_ENDPOINT_SLUG;
  const baseUrl = options.baseUrl || process.env.ANDIVE_BASE_URL || "https://api.andive.net/v1/k";

  if (!apiKey) {
    throw new Error("Missing API key. Set ANDIVE_API_KEY or pass --api-key.");
  }

  if (!endpointSlug) {
    throw new Error("Missing endpoint slug. Set ANDIVE_ENDPOINT_SLUG or pass --endpoint-slug.");
  }

  return new AndiveClient({
    apiKey,
    endpointSlug,
    baseUrl,
    timeout: Number(options.timeout) * 1000,
  });
}

function parseVector(value) {
  const values = parseJson(value, "vector");
  if (!Array.isArray(values) || !values.every((v) => typeof v === "number")) {
    throw new Error("Vector must be a JSON array of numbers.");
  }
  return values;
}

function parseObject(value, label) {
  if (!value) {
    return undefined;
  }

  const object = parseJson(value, label);
  if (typeof object !== "object" || object === null || Array.isArray(object)) {
    throw new Error(`${label} must be a JSON object.`);
  }
  return object;
}

async function buildEstimatePayload({ session, body, vector, metadata }) {
  if (body) {
    return readJsonFile(body);
  }

  if (!vector) {
    throw new Error("Provide either --body or --vector.");
  }

  return {
    session: { name: session },
    vectors: [{ vector: parseVector(vector), metadata: parseObject(metadata, "Metadata") ?? {} }],
  };
}

async function buildUpsertPayload({ session, body, vector, metadata }) {
  if (body) {
    return readJsonFile(body);
  }

  if (!vector) {
    throw new Error("Provide either --body or --vector.");
  }

  return {
    vector: parseVector(vector),
    metadata: parseObject(metadata, "Metadata") ?? {},
    session: { name: session },
  };
}

async function buildQueryPayload({ session, body, vector, topK, scoreThreshold, filter }) {
  if (body) {
    return readJsonFile(body);
  }

  if (!vector) {
    throw new Error("Provide either --body or --vector.");
  }

  const payload = {
    vector: parseVector(vector),
    top_k: Number(topK),
    session: { name: session },
  };

  if (scoreThreshold !== undefined) {
    payload.score_threshold = Number(scoreThreshold);
  }

  const parsedFilter = parseObject(filter, "Filter");
  if (parsedFilter) {
    payload.filter = parsedFilter;
  }

  return payload;
}

function parseVectorIds(value) {
  const ids = value
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (ids.length === 0) {
    throw new Error("Provide at least one vector_id.");
  }

  return ids;
}

async function buildDeletePayload({ body, ids }) {
  if (body) {
    return readJsonFile(body);
  }

  if (!ids) {
    throw new Error("Provide either --body or --ids.");
  }

  return { vector_ids: parseVectorIds(ids) };
}

async function buildDeleteSessionPayload({ body, session }) {
  if (body) {
    return readJsonFile(body);
  }

  if (!session) {
    throw new Error("Provide either --body or --session.");
  }

  return { session: { name: session } };
}

function printResponse(response) {
  console.log(`Status: ${response.status}`);
  console.log(formatResponse(response));
  return response.ok ? 0 : 1;
}

function addGlobalOptions(command) {
  return command
    .option("--api-key <key>", "Bearer token (fallback: ANDIVE_API_KEY)")
    .option("--endpoint-slug <slug>", "Endpoint slug (fallback: ANDIVE_ENDPOINT_SLUG)")
    .option("--base-url <url>", "API base URL (fallback: ANDIVE_BASE_URL)")
    .option("--timeout <seconds>", "Request timeout in seconds", "30");
}

const program = new Command();

program
  .name("andive")
  .description("CLI helper for the Andive Vector API");

addGlobalOptions(
  program
    .command("estimate")
    .description("POST /vectors/estimate – estimate cost/size")
    .option("--session <name>", "Session name", "handbook-rag")
    .option("--body <file>", "JSON file with full request body")
    .option("--vector <json>", 'Single vector, e.g. "[0.12, -0.04, 0.08]"')
    .option("--metadata <json>", 'Metadata, e.g. \'{"source":"handbook.pdf","page":1}\'')
    .action(async (options) => {
      try {
        const payload = await buildEstimatePayload(options);
        const client = createClient(options);
        const response = await client.estimateVectors(payload);
        process.exit(printResponse(response));
      } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(2);
      }
    }),
);

addGlobalOptions(
  program
    .command("upsert")
    .description("POST /vectors/upsert – store or update a vector")
    .option("--session <name>", "Session name", "support-bot-v1")
    .option("--body <file>", "JSON file with full request body")
    .option("--vector <json>", 'Vector, e.g. "[0.12, -0.04, 0.08]"')
    .option("--metadata <json>", 'Metadata, e.g. \'{"content":"Return policy","source":"faq.md"}\'')
    .action(async (options) => {
      try {
        const payload = await buildUpsertPayload(options);
        const client = createClient(options);
        const response = await client.upsertVector(payload);
        process.exit(printResponse(response));
      } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(2);
      }
    }),
);

addGlobalOptions(
  program
    .command("query")
    .description("POST /vectors/query – search for similar vectors")
    .option("--session <name>", "Session name", "chat-user-42")
    .option("--body <file>", "JSON file with full request body")
    .option("--vector <json>", 'Search vector, e.g. "[0.11, -0.03, 0.09]"')
    .option("--top-k <number>", "Maximum number of results", "10")
    .option("--score-threshold <number>", "Minimum score (0–1)")
    .option("--filter <json>", 'Metadata filter, e.g. \'{"source":"handbook.pdf"}\'')
    .action(async (options) => {
      try {
        const payload = await buildQueryPayload({
          session: options.session,
          body: options.body,
          vector: options.vector,
          topK: options.topK,
          scoreThreshold: options.scoreThreshold,
          filter: options.filter,
        });
        const client = createClient(options);
        const response = await client.queryVectors(payload);
        process.exit(printResponse(response));
      } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(2);
      }
    }),
);

addGlobalOptions(
  program
    .command("delete")
    .description("DELETE /vectors/delete – archive vectors by vector_id")
    .option("--body <file>", "JSON file with full request body")
    .option("--ids <uuids>", 'Comma-separated vector_ids, e.g. "uuid1,uuid2"')
    .action(async (options) => {
      try {
        const payload = await buildDeletePayload(options);
        const client = createClient(options);
        const response = await client.deleteVectors(payload);
        process.exit(printResponse(response));
      } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(2);
      }
    }),
);

addGlobalOptions(
  program
    .command("delete-session")
    .description("DELETE /vectors/session – archive an entire session")
    .option("--body <file>", "JSON file with full request body")
    .option("--session <name>", 'Session name, e.g. "chat-user-42"')
    .action(async (options) => {
      try {
        const payload = await buildDeleteSessionPayload(options);
        const client = createClient(options);
        const response = await client.deleteSession(payload);
        process.exit(printResponse(response));
      } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(2);
      }
    }),
);

addGlobalOptions(
  program
    .command("usage")
    .description("GET /usage – fetch current storage usage")
    .action(async (options) => {
      try {
        const client = createClient(options);
        const response = await client.getUsage();
        process.exit(printResponse(response));
      } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(2);
      }
    }),
);

addGlobalOptions(
  program
    .command("call <path>")
    .description("Call any API path")
    .option("--method <method>", "HTTP method", "POST")
    .option("--body <file>", "JSON file with request body")
    .action(async (path, options) => {
      try {
        const method = options.method.toUpperCase();
        const payload = options.body ? await readJsonFile(options.body) : undefined;

        if (["POST", "DELETE"].includes(method) && payload === undefined) {
          throw new Error(`--body is required for ${method} requests.`);
        }

        const client = createClient(options);
        const response = await client.request(method, path, payload);
        process.exit(printResponse(response));
      } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(2);
      }
    }),
);

program.parseAsync(process.argv);
