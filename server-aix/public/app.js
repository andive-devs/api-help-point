const listEl = document.getElementById("snippet-list");
const formEl = document.getElementById("snippet-form");
const searchEl = document.getElementById("search");
const countEl = document.getElementById("count");
const template = document.getElementById("snippet-item-template");

const fields = {
  id: document.getElementById("snippet-id"),
  title: document.getElementById("title"),
  language: document.getElementById("language"),
  tags: document.getElementById("tags"),
  code: document.getElementById("code"),
};

const buttons = {
  new: document.getElementById("new-btn"),
  save: document.getElementById("save-btn"),
  copy: document.getElementById("copy-btn"),
  delete: document.getElementById("delete-btn"),
  clear: document.getElementById("clear-btn"),
};

let snippets = [];
let activeId = null;

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }

  return data;
}

function formatTags(tags) {
  return tags.length ? tags.join(", ") : "no tags";
}

function renderList() {
  listEl.innerHTML = "";

  if (!snippets.length) {
    listEl.innerHTML = '<div class="empty-state">No snippets yet. Create your first one.</div>';
    countEl.textContent = "0 snippets";
    return;
  }

  countEl.textContent = `${snippets.length} snippet${snippets.length === 1 ? "" : "s"}`;

  for (const snippet of snippets) {
    const node = template.content.firstElementChild.cloneNode(true);
    node.dataset.id = snippet.id;
    node.classList.toggle("active", snippet.id === activeId);
    node.querySelector(".snippet-title").textContent = snippet.title;
    node.querySelector(".snippet-meta").textContent = formatTags(snippet.tags);
    node.querySelector(".snippet-lang").textContent = snippet.language || "text";
    node.addEventListener("click", () => selectSnippet(snippet.id));
    listEl.appendChild(node);
  }
}

function fillForm(snippet) {
  fields.id.value = snippet?.id || "";
  fields.title.value = snippet?.title || "";
  fields.language.value = snippet?.language || "";
  fields.tags.value = snippet?.tags?.join(", ") || "";
  fields.code.value = snippet?.code || "";
  buttons.delete.hidden = !snippet?.id;
  buttons.save.textContent = snippet?.id ? "Update" : "Save";
}

function clearForm() {
  activeId = null;
  fillForm(null);
  renderList();
}

function selectSnippet(id) {
  const snippet = snippets.find((item) => item.id === id);
  if (!snippet) {
    return;
  }

  activeId = id;
  fillForm(snippet);
  renderList();
}

async function loadSnippets() {
  const query = searchEl.value.trim();
  const url = query ? `/api/snippets?q=${encodeURIComponent(query)}` : "/api/snippets";
  snippets = await api(url);
  renderList();
}

formEl.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    title: fields.title.value,
    language: fields.language.value,
    tags: fields.tags.value,
    code: fields.code.value,
  };

  try {
    if (fields.id.value) {
      await api(`/api/snippets/${fields.id.value}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    } else {
      const created = await api("/api/snippets", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      activeId = created.id;
    }

    await loadSnippets();
    if (activeId) {
      selectSnippet(activeId);
    }
  } catch (error) {
    alert(error.message);
  }
});

buttons.new.addEventListener("click", clearForm);
buttons.clear.addEventListener("click", clearForm);

buttons.copy.addEventListener("click", async () => {
  if (!fields.code.value.trim()) {
    return;
  }

  await navigator.clipboard.writeText(fields.code.value);
  buttons.copy.textContent = "Copied!";
  setTimeout(() => {
    buttons.copy.textContent = "Copy code";
  }, 1200);
});

buttons.delete.addEventListener("click", async () => {
  if (!fields.id.value) {
    return;
  }

  if (!confirm("Delete this snippet?")) {
    return;
  }

  try {
    await api(`/api/snippets/${fields.id.value}`, { method: "DELETE" });
    clearForm();
    await loadSnippets();
  } catch (error) {
    alert(error.message);
  }
});

searchEl.addEventListener("input", () => {
  window.clearTimeout(searchEl._timer);
  searchEl._timer = window.setTimeout(loadSnippets, 200);
});

loadSnippets().catch((error) => {
  listEl.innerHTML = `<div class="empty-state">${error.message}</div>`;
});
