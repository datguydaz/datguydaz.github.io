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

function render(data) {
  document.getElementById("project-name").textContent = data.project || "Stillwater";
  document.getElementById("tagline").textContent = data.tagline || "";
  document.getElementById("updated").textContent = data.updated || "—";
  const entries = Array.isArray(data.entries) ? [...data.entries] : [];
  entries.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  document.getElementById("entry-count").textContent = String(entries.length);

  const list = document.getElementById("timeline");
  list.innerHTML = "";

  for (const entry of entries) {
    const item = el("li", "entry");
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
        img.src = src.startsWith("http") || src.startsWith("./") || src.startsWith("../")
          ? src
          : `./screenshots/${src}`;
        img.alt = entry.title || "Stillwater screenshot";
        img.loading = "lazy";
        shots.appendChild(img);
      }
      item.appendChild(shots);
    }

    list.appendChild(item);
  }
}

loadProgress()
  .then(render)
  .catch((err) => {
    document.getElementById("tagline").textContent = "Progress data missing or failed to load.";
    console.error(err);
  });
