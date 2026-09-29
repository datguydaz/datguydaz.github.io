async function loadJson(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Could not load ${path}`);
  return res.json();
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function shotUrl(src) {
  if (!src) return "";
  if (src.startsWith("http") || src.startsWith("./") || src.startsWith("../") || src.startsWith("screenshots/")) {
    return src.startsWith("screenshots/") ? `./${src}` : src;
  }
  return `./screenshots/${src}`;
}

function formatWhen(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/* —— Lightbox —— */
const lightbox = {
  items: [],
  index: 0,
  root: null,
  img: null,
  cap: null,
  open(items, index) {
    this.items = items;
    this.index = index;
    this.root = document.getElementById("lightbox");
    this.img = document.getElementById("lb-img");
    this.cap = document.getElementById("lb-cap");
    this.root.hidden = false;
    document.body.style.overflow = "hidden";
    this.render();
  },
  close() {
    if (!this.root) return;
    this.root.hidden = true;
    document.body.style.overflow = "";
  },
  step(delta) {
    if (!this.items.length) return;
    this.index = (this.index + delta + this.items.length) % this.items.length;
    this.render();
  },
  render() {
    const item = this.items[this.index];
    if (!item) return;
    this.img.src = item.src;
    this.img.alt = item.caption || "Stillwater capture";
    this.cap.textContent = item.caption || "";
  },
};

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

  const makeBtn = (label, tag) => {
    const btn = el("button", "filter-btn", label);
    btn.type = "button";
    btn.dataset.tag = tag;
    if (tag === "all") btn.classList.add("is-active");
    btn.addEventListener("click", () => {
      active = tag;
      apply();
    });
    host.appendChild(btn);
  };

  makeBtn("All", "all");
  for (const tag of tags) makeBtn(tag, tag);
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

    if (entry.pillars?.length) {
      const pillars = el("div", "tags pillar-tags");
      for (const p of entry.pillars) {
        pillars.appendChild(el("span", "tag pillar-tag", p));
      }
      item.appendChild(pillars);
    }

    if (entry.screenshots?.length) {
      const shots = el("div", "shots");
      const lbItems = entry.screenshots.map((src) => ({
        src: shotUrl(src),
        caption: `${entry.date || ""} · ${entry.title || ""}`.trim(),
      }));
      entry.screenshots.forEach((src, i) => {
        const img = document.createElement("img");
        img.src = shotUrl(src);
        img.alt = entry.title || "Stillwater screenshot";
        img.loading = "lazy";
        img.tabIndex = 0;
        img.style.cursor = "zoom-in";
        const open = () => lightbox.open(lbItems, i);
        img.addEventListener("click", open);
        img.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            open();
          }
        });
        shots.appendChild(img);
      });
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

function renderNow(progress, gallery) {
  const now = progress.now || {};
  document.getElementById("now-focus").textContent = now.focus || "Exploring the town";
  document.getElementById("now-map").textContent = now.map || "Stillwater";
  document.getElementById("now-next").textContent = now.next || "Keep shaping atmosphere and encounters";

  const shots = Array.isArray(gallery?.shots) ? gallery.shots : [];
  const latest = shots[0];
  const wrap = document.getElementById("now-latest-shot");
  const plate = document.getElementById("hero-plate");

  if (latest) {
    const src = shotUrl(latest.file);
    wrap.hidden = false;
    const thumb = document.getElementById("now-thumb");
    thumb.src = src;
    thumb.alt = latest.note || latest.map || "Latest Stillwater capture";
    document.getElementById("now-caption").textContent =
      [latest.map, formatWhen(latest.capturedAt) || latest.date].filter(Boolean).join(" · ");

    document.getElementById("now-thumb-btn").onclick = () => {
      const items = shots.map((s) => ({
        src: shotUrl(s.file),
        caption: [s.note || s.map, formatWhen(s.capturedAt) || s.date].filter(Boolean).join(" · "),
      }));
      lightbox.open(items, 0);
    };

    plate.style.backgroundImage = `url("${src}")`;
    plate.classList.add("is-on");
  } else {
    wrap.hidden = true;
    plate.classList.remove("is-on");
  }
}

function renderGallery(gallery) {
  const grid = document.getElementById("gallery-grid");
  const empty = document.getElementById("gallery-empty");
  const meta = document.getElementById("gallery-meta");
  grid.innerHTML = "";

  const shots = Array.isArray(gallery?.shots) ? [...gallery.shots] : [];
  shots.sort((a, b) => String(b.capturedAt || b.date || "").localeCompare(String(a.capturedAt || a.date || "")));

  document.getElementById("shot-count").textContent = String(shots.length);
  meta.textContent = shots.length
    ? `${shots.length} capture${shots.length === 1 ? "" : "s"} · newest first`
    : "Waiting for first editor capture";

  if (!shots.length) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  const lbItems = shots.map((s) => ({
    src: shotUrl(s.file),
    caption: [s.note || "Editor capture", s.map, formatWhen(s.capturedAt) || s.date]
      .filter(Boolean)
      .join(" · "),
  }));

  shots.forEach((shot, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "gallery-item";
    btn.style.animationDelay = `${Math.min(index, 8) * 60}ms`;

    const img = document.createElement("img");
    img.src = shotUrl(shot.file);
    img.alt = shot.note || "Stillwater editor capture";
    img.loading = "lazy";

    const cap = document.createElement("figcaption");
    cap.textContent = [shot.map || "viewport", formatWhen(shot.capturedAt) || shot.date || ""]
      .filter(Boolean)
      .join(" · ");

    btn.appendChild(img);
    btn.appendChild(cap);
    btn.addEventListener("click", () => lightbox.open(lbItems, index));
    grid.appendChild(btn);
  });
}

function wireLightbox() {
  document.getElementById("lb-close").addEventListener("click", () => lightbox.close());
  document.getElementById("lb-prev").addEventListener("click", () => lightbox.step(-1));
  document.getElementById("lb-next").addEventListener("click", () => lightbox.step(1));
  document.getElementById("lightbox").addEventListener("click", (e) => {
    if (e.target.id === "lightbox") lightbox.close();
  });
  window.addEventListener("keydown", (e) => {
    const open = !document.getElementById("lightbox").hidden;
    if (!open) return;
    if (e.key === "Escape") lightbox.close();
    if (e.key === "ArrowLeft") lightbox.step(-1);
    if (e.key === "ArrowRight") lightbox.step(1);
  });
}

function renderBible(bible, entries) {
  if (!bible) return;

  const epigraph = document.getElementById("epigraph");
  if (epigraph) epigraph.textContent = bible.epigraph || "";

  const logline = document.getElementById("lore-logline");
  if (logline) logline.textContent = bible.logline || "";

  const inspiration = document.getElementById("lore-inspiration");
  if (inspiration) inspiration.textContent = bible.inspiration || "";

  const chaptersHost = document.getElementById("lore-chapters");
  if (chaptersHost) {
    chaptersHost.innerHTML = "";
    (bible.chapters || []).forEach((chapter, index) => {
      const details = document.createElement("details");
      details.className = "lore-fold";
      if (index === 0) details.open = true;

      const summary = document.createElement("summary");
      summary.textContent = chapter.title || "Chapter";
      details.appendChild(summary);

      const body = el("div", "lore-fold-body");
      if (chapter.lede) body.appendChild(el("p", "lore-lede", chapter.lede));
      if (chapter.quote) body.appendChild(el("blockquote", "lore-quote", chapter.quote));
      if (chapter.points?.length) {
        const ul = el("ul", "lore-list");
        for (const item of chapter.points) ul.appendChild(el("li", null, item));
        body.appendChild(ul);
      }
      details.appendChild(body);
      chaptersHost.appendChild(details);
    });
  }

  const rules = bible.narrativeRules || {};
  const rulesTitle = document.getElementById("rules-title");
  const rulesLede = document.getElementById("rules-lede");
  const rulesList = document.getElementById("rules-list");
  if (rulesTitle && rules.title) rulesTitle.textContent = rules.title;
  if (rulesLede) rulesLede.textContent = rules.lede || "";
  if (rulesList) {
    rulesList.innerHTML = "";
    for (const item of rules.points || []) rulesList.appendChild(el("li", null, item));
  }

  const touched = new Map();
  for (const entry of entries || []) {
    for (const id of entry.pillars || []) {
      touched.set(id, (touched.get(id) || 0) + 1);
    }
  }

  const ladder = document.getElementById("priority-ladder");
  if (!ladder) return;
  ladder.innerHTML = "";
  const steps = Array.isArray(bible.priority) ? bible.priority : [];
  steps.forEach((step, index) => {
    const li = el("li", "priority-step");
    const count = touched.get(step.id) || 0;
    if (count > 0) li.classList.add("is-lit");

    const rank = el("div", "priority-rank", String(index + 1).padStart(2, "0"));
    const body = document.createElement("div");
    body.appendChild(el("h3", null, step.label || step.id));
    body.appendChild(el("p", null, step.note || ""));
    const meta = el(
      "p",
      "priority-meta mono",
      count ? `${count} journal touch${count === 1 ? "" : "es"}` : "Awaiting work"
    );
    body.appendChild(meta);

    li.appendChild(rank);
    li.appendChild(body);
    ladder.appendChild(li);
  });
}

function splitTitle(node) {
  if (!node || node.dataset.split === "1") return;
  const text = node.textContent || "";
  node.textContent = "";
  [...text].forEach((ch, i) => {
    const span = document.createElement("span");
    span.className = "char";
    span.style.setProperty("--i", String(i));
    span.textContent = ch === " " ? "\u00a0" : ch;
    node.appendChild(span);
  });
  node.dataset.split = "1";
}

function render(progress, gallery) {
  const name = progress.project || "Stillwater";
  const title = document.getElementById("project-name");
  title.textContent = name;
  splitTitle(title);
  const ghost = document.querySelector(".title-ghost");
  if (ghost) ghost.textContent = name;

  document.getElementById("tagline").textContent = progress.tagline || "";
  document.getElementById("updated").textContent = progress.updated || "—";
  const entries = Array.isArray(progress.entries) ? progress.entries : [];
  document.getElementById("entry-count").textContent = String(entries.length);

  const build = progress.build || progress.versions?.[0]?.id || "0.1";
  document.getElementById("build-version").textContent = build;
  document.title = `${name} — Development Journal`;

  renderBible(progress.bible || null, entries);
  renderNow(progress, gallery);
  renderGallery(gallery || { shots: [] });
  renderTimeline(entries);
  renderVersions(progress.versions || [], build);
}

function spawnTownLights() {
  const host = document.getElementById("town-lights");
  if (!host || host.dataset.ready === "1") return;
  const count = 64;
  for (let i = 0; i < count; i++) {
    const light = document.createElement("span");
    const far = Math.random() > 0.55;
    light.className = "town-light" + (Math.random() > 0.55 ? " is-warm" : "") + (far ? " is-far" : "");
    const band = Math.random();
    const bottom = band < 0.7
      ? 8 + Math.random() * 22
      : 28 + Math.random() * 20;
    light.style.left = `${2 + Math.random() * 96}%`;
    light.style.bottom = `${bottom}%`;
    light.style.setProperty("--s", `${far ? 1 + Math.random() * 1.6 : 1.6 + Math.random() * 3.2}px`);
    light.style.setProperty("--d", `${0.9 + Math.random() * 3.8}s`);
    light.style.setProperty("--o", `${far ? 0.2 + Math.random() * 0.35 : 0.4 + Math.random() * 0.55}`);
    light.style.animationDelay = `${-Math.random() * 4}s`;
    host.appendChild(light);
  }
  host.dataset.ready = "1";
}

function spawnBirds() {
  const host = document.getElementById("birds");
  if (!host || host.dataset.ready === "1") return;
  const flockCount = 5;
  for (let f = 0; f < flockCount; f++) {
    const flock = document.createElement("div");
    flock.className = "bird-flock";
    flock.style.setProperty("--top", `${8 + Math.random() * 38}%`);
    flock.style.setProperty("--dur", `${18 + Math.random() * 22}s`);
    flock.style.setProperty("--delay", `${-Math.random() * 20}s`);
    flock.style.setProperty("--scale", `${0.55 + Math.random() * 0.7}`);
    const birdsInFlock = 2 + Math.floor(Math.random() * 4);
    for (let b = 0; b < birdsInFlock; b++) {
      const bird = document.createElement("span");
      bird.className = "bird";
      bird.style.setProperty("--ox", `${b * (14 + Math.random() * 10)}px`);
      bird.style.setProperty("--oy", `${(Math.random() - 0.5) * 18}px`);
      bird.style.setProperty("--flap", `${0.28 + Math.random() * 0.22}s`);
      bird.style.setProperty("--flap-delay", `${-Math.random() * 0.4}s`);
      bird.innerHTML = `<svg viewBox="0 0 24 10" aria-hidden="true"><path d="M2 6 Q8 2 12 6 Q16 2 22 6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`;
      flock.appendChild(bird);
    }
    host.appendChild(flock);
  }
  host.dataset.ready = "1";
}

function initCursor() {
  const ring = document.getElementById("cursor-ring");
  const core = document.getElementById("cursor-core");
  if (!ring || !core) return;
  if (window.matchMedia("(pointer: coarse)").matches) return;

  document.documentElement.classList.add("has-custom-cursor");
  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  let rx = x;
  let ry = y;

  window.addEventListener("mousemove", (e) => {
    x = e.clientX;
    y = e.clientY;
    core.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
  }, { passive: true });

  const tick = () => {
    rx += (x - rx) * 0.18;
    ry += (y - ry) * 0.18;
    ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
    requestAnimationFrame(tick);
  };
  tick();

  const hoverables = "a, button, summary, .gallery-item, .now-thumb-btn, .filter-btn, .lb-close, .lb-nav";
  document.addEventListener("mouseover", (e) => {
    if (e.target.closest(hoverables)) document.documentElement.classList.add("cursor-hot");
  });
  document.addEventListener("mouseout", (e) => {
    if (e.target.closest(hoverables)) document.documentElement.classList.remove("cursor-hot");
  });
}

wireLightbox();
spawnTownLights();
spawnBirds();
initCursor();

Promise.all([
  loadJson("./data/progress.json"),
  loadJson("./data/gallery.json").catch(() => ({ shots: [] })),
])
  .then(([progress, gallery]) => render(progress, gallery))
  .catch((err) => {
    document.getElementById("tagline").textContent = "Progress data missing or failed to load.";
    console.error(err);
  });
