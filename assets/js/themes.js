const state = {
  typeFilter: "all",
  colorFilter: "all",
  themes: [],
};

async function loadThemes() {
  try {
    const response = await fetch("../themes.json");
    const themes = await response.json();
    state.themes = themes;
    renderThemes();
  } catch (error) {
    console.error("Error loading themes:", error);
    document.getElementById("noResults").style.display = "block";
    document.getElementById("noResults").querySelector("p").textContent =
      "Error loading themes.";
  }
}

function renderThemes() {
  const grid = document.getElementById("themesGrid");
  grid.innerHTML = "";

  const filteredThemes = filterThemes();

  if (filteredThemes.length === 0) {
    document.getElementById("noResults").style.display = "block";
    return;
  }

  document.getElementById("noResults").style.display = "none";

  filteredThemes.forEach((theme) => {
    const card = createThemeCard(theme);
    grid.appendChild(card);
  });
}

function filterThemes() {
  return state.themes.filter((theme) => {
    const typeMatch =
      state.typeFilter === "all" || theme.type === state.typeFilter;
    const colorMatch =
      state.colorFilter === "all" ||
      theme.primary_colors.includes(state.colorFilter);
    return typeMatch && colorMatch;
  });
}

function createThemeCard(theme) {
  const card = document.createElement("div");
  card.className = "theme-card";

  const previewLink = document.createElement("a");
  previewLink.href = theme.repo_url;
  previewLink.target = "_blank";
  previewLink.rel = "noopener noreferrer";
  previewLink.className = "theme-preview-link";

  const preview = document.createElement("div");
  preview.className = "theme-preview";

  const img = document.createElement("img");
  img.src = theme.preview_url;
  img.alt = `${theme.name} theme preview`;
  img.loading = "lazy";

  img.onerror = function () {
    this.style.display = "none";
    const placeholder = document.createElement("div");
    placeholder.className = "theme-preview-placeholder";
    placeholder.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" x2="22" y1="2" y2="22"/><path d="M10.41 10.41a2 2 0 1 1-2.83-2.83"/><line x1="13.5" x2="6" y1="13.5" y2="21"/><line x1="18" x2="21" y1="12" y2="15"/><path d="M3.59 3.59A1.99 1.99 0 0 0 3 5v14a2 2 0 0 0 2 2h14c.55 0 1.052-.22 1.41-.59"/><path d="M21 15V5a2 2 0 0 0-2-2H9"/></svg>`;
    preview.appendChild(placeholder);
  };

  preview.appendChild(img);
  previewLink.appendChild(preview);

  const info = document.createElement("div");
  info.className = "theme-info";

  const nameContainer = document.createElement("h2");
  nameContainer.className = "theme-name";

  const nameLink = document.createElement("a");
  nameLink.href = theme.repo_url;
  nameLink.target = "_blank";
  nameLink.rel = "noopener noreferrer";
  nameLink.textContent = theme.name;

  const authorSpan = document.createElement("span");
  authorSpan.className = "theme-author-inline";
  authorSpan.textContent = ` by ${theme.author}`;

  nameContainer.appendChild(nameLink);
  nameContainer.appendChild(authorSpan);

  const meta = document.createElement("div");
  meta.className = "theme-meta";

  const type = document.createElement("span");
  type.className = `theme-type ${theme.type}`;
  type.textContent = theme.type;
  meta.appendChild(type);

  info.appendChild(nameContainer);
  info.appendChild(meta);

  card.appendChild(previewLink);
  card.appendChild(info);

  return card;
}

function setupFilters() {
  const filterButtons = document.querySelectorAll(".filter-button");

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const filterType = button.dataset.filterType;
      const filterValue = button.dataset.filterValue;

      const group = button.closest(".filter-group");
      group.querySelectorAll(".filter-button").forEach((btn) => {
        btn.classList.remove("active");
      });
      button.classList.add("active");

      if (filterType === "type") {
        state.typeFilter = filterValue;
      } else if (filterType === "color") {
        state.colorFilter = filterValue;
      }

      renderThemes();
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupFilters();
  loadThemes();
});
