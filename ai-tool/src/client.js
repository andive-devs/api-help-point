export class AndiveClient {
  constructor({ apiKey, endpointSlug, baseUrl = "https://api.andive.net/v1/k", timeout = 30_000 }) {
    this.apiKey = apiKey;
    this.endpointSlug = endpointSlug;
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.timeout = timeout;
  }

  get endpointBase() {
    return `${this.baseUrl}/${this.endpointSlug}`;
  }

  headers(includeContentType = true) {
    const headers = {
      Authorization: `Bearer ${this.apiKey}`,
    };

    if (includeContentType) {
      headers["Content-Type"] = "application/json";
    }

    return headers;
  }

  async request(method, path, payload) {
    const url = `${this.endpointBase}/${path.replace(/^\//, "")}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);
    const hasBody = payload !== undefined;

    try {
      const response = await fetch(url, {
        method,
        headers: this.headers(hasBody),
        body: hasBody ? JSON.stringify(payload) : undefined,
        signal: controller.signal,
      });

      const text = await response.text();
      let body;

      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = text;
      }

      return { ok: response.ok, status: response.status, body };
    } finally {
      clearTimeout(timer);
    }
  }

  post(path, payload) {
    return this.request("POST", path, payload);
  }

  get(path) {
    return this.request("GET", path);
  }

  delete(path, payload) {
    return this.request("DELETE", path, payload);
  }

  estimateVectors(payload) {
    return this.post("vectors/estimate", payload);
  }

  upsertVector(payload) {
    return this.post("vectors/upsert", payload);
  }

  queryVectors(payload) {
    return this.post("vectors/query", payload);
  }

  deleteVectors(payload) {
    return this.delete("vectors/delete", payload);
  }

  deleteSession(payload) {
    return this.delete("vectors/session", payload);
  }

  getUsage() {
    return this.get("usage");
  }
}

export function formatResponse({ status, body }) {
  if (typeof body === "string") {
    return body || "(empty)";
  }

  return JSON.stringify(body, null, 2);
}
