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
