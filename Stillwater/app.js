async function loadProgress() {
  const res = await fetch("./data/progress.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load progress.json");
  return res.json();
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function shotUrl(src) {
  if (src.startsWith("http") || src.startsWith("./") || src.startsWith("../")) return src;
  return `./screenshots/${src}`;
}

function uniqueTags(entries) {
  const set = new Set();
  for (const e of entries) for (const t of e.tags || []) set.add(t);
  return [...set].sort((a, b) => a.localeCompare(b));
}

function renderFilters(entries) {
  const host = document.getElementById("filters");
  const tags = uniqueTags(entries);
  if (!tags.length) {
    host.hidden = true;
    return;
  }
  host.hidden = false;
  host.innerHTML = "";
  let active = "all";

  const apply = () => {
    for (const node of document.querySelectorAll(".entry")) {
      const raw = node.getAttribute("data-tags") || "";
      const match = active === "all" || raw.split(",").includes(active);
      node.classList.toggle("is-hidden", !match);
    }
    for (const btn of host.querySelectorAll(".filter-btn")) {
      btn.classList.toggle("is-active", btn.dataset.tag === active);
    }
  };

  const allBtn = el("button", "filter-btn is-active", "All");
  allBtn.type = "button";
  allBtn.dataset.tag = "all";
  allBtn.addEventListener("click", () => {
    active = "all";
    apply();
  });
  host.appendChild(allBtn);

  for (const tag of tags) {
    const btn = el("button", "filter-btn", tag);
    btn.type = "button";
    btn.dataset.tag = tag;
    btn.addEventListener("click", () => {
      active = tag;
      apply();
    });
    host.appendChild(btn);
  }
}

function renderTimeline(entries) {
  const list = document.getElementById("timeline");
  list.innerHTML = "";
  const sorted = [...entries].sort((a, b) => String(b.date).localeCompare(String(a.date)));

  for (const entry of sorted) {
    const item = el("li", "entry");
    item.dataset.tags = (entry.tags || []).join(",");
    item.appendChild(el("div", "entry-date", entry.date || ""));
    item.appendChild(el("h3", null, entry.title || "Untitled"));
    item.appendChild(el("p", null, entry.summary || ""));

    if (entry.tags?.length) {
      const tags = el("div", "tags");
      for (const t of entry.tags) tags.appendChild(el("span", "tag", t));
      item.appendChild(tags);
    }

    if (entry.screenshots?.length) {
      const shots = el("div", "shots");
      for (const src of entry.screenshots) {
        const img = document.createElement("img");
        img.src = shotUrl(src);
        img.alt = entry.title || "Stillwater screenshot";
        img.loading = "lazy";
        shots.appendChild(img);
      }
      item.appendChild(shots);
    }

    list.appendChild(item);
  }

  renderFilters(sorted);
}

function renderVersions(versions, fallbackBuild) {
  const list = document.getElementById("version-list");
  list.innerHTML = "";
  const items = Array.isArray(versions) ? [...versions] : [];
  items.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

  if (!items.length) {
    const empty = el("li", "version");
    empty.appendChild(el("div", "version-id", fallbackBuild || "—"));
    const body = document.createElement("div");
    body.appendChild(el("h3", null, "No milestones recorded yet"));
    body.appendChild(el("p", null, "Version notes will appear here as builds land."));
    empty.appendChild(body);
    list.appendChild(empty);
    return;
  }

  for (const v of items) {
    const row = el("li", "version");
    row.appendChild(el("div", "version-id", v.id || "—"));
    const body = document.createElement("div");
    body.appendChild(el("h3", null, v.title || "Untitled"));
    body.appendChild(el("p", null, v.summary || ""));
    if (v.date) body.appendChild(el("span", "version-date", v.date));
    row.appendChild(body);
    list.appendChild(row);
  }
}

function render(data) {
  document.getElementById("project-name").textContent = data.project || "Stillwater";
  document.getElementById("tagline").textContent = data.tagline || "";
  document.getElementById("updated").textContent = data.updated || "—";
  const entries = Array.isArray(data.entries) ? data.entries : [];
  document.getElementById("entry-count").textContent = String(entries.length);

  const build = data.build || data.versions?.[0]?.id || "0.1";
  document.getElementById("build-version").textContent = build;
  document.title = `${data.project || "Stillwater"} — Development Journal`;

  renderTimeline(entries);
  renderVersions(data.versions || [], build);
}

loadProgress()
  .then(render)
  .catch((err) => {
    document.getElementById("tagline").textContent = "Progress data missing or failed to load.";
    console.error(err);
  });
