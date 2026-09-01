import * as logo from './modules/logo.js';

const WORKSPACES = Object.freeze({
  '1': { name: 'Welcome', slug: 'welcome' },
  '2': { name: 'Watch', slug: 'watch' },
  '3': { name: 'Explore', slug: 'explore' }
});

const HASH_TO_WORKSPACE = new Map([
  ['workspace-1', '1'],
  ['workspace-2', '2'],
  ['workspace-3', '3'],
  ['welcome', '1'],
  ['watch', '2'],
  ['explore', '3']
]);

const THEMES = Object.freeze({
  omarchy: 'Omarchy',
  'tokyo-night': 'Tokyo Night',
  catppuccin: 'Catppuccin',
  gruvbox: 'Gruvbox',
  nord: 'Nord'
});

// Symbol ids from the inline Lucide sprite in index.html.
const WORKSPACE_ICONS = Object.freeze({
  '1': 'lc-house',
  '2': 'lc-monitor-play',
  '3': 'lc-layout-grid'
});

function createLucideIcon(symbolId) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'glyph-icon');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `#${symbolId}`);
  svg.append(use);
  return svg;
}

function isTypingTarget(target) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

function workspaceFromHash(hash) {
  const value = hash.replace(/^#/, '').toLowerCase();
  return HASH_TO_WORKSPACE.get(value) || '1';
}

function initClock() {
  const clock = document.querySelector('[data-clock]');
  if (!clock) return;

  const tick = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    clock.textContent = `${hours}:${minutes}`;
    clock.dateTime = now.toISOString();
  };

  tick();
  window.setInterval(tick, 10000);
}

function initVideoFacades() {
  document.querySelectorAll('.video-facade[data-video]').forEach((facade) => {
    facade.addEventListener('click', () => {
      const videoId = facade.dataset.video;
      if (!videoId || !facade.isConnected) return;

      const iframe = document.createElement('iframe');
      iframe.className = 'video-frame';
      iframe.title = facade.dataset.title || 'Omarchy video';
      iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`;
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      iframe.allowFullscreen = true;
      facade.replaceWith(iframe);
    });
  });
}

function initHomepage() {
  const body = document.body;
  if (!body || body.dataset.quattroInitialized === 'true') return;
  body.dataset.quattroInitialized = 'true';
  body.classList.add('js-ready');

  initClock();
  initVideoFacades();

  const workspaceButtons = Array.from(document.querySelectorAll('[data-workspace-target].workspace-button'));
  const workspacePanels = Array.from(document.querySelectorAll('[data-workspace-panel]'));
  const announcer = document.querySelector('[data-workspace-announcer]');
  const launcher = document.querySelector('#command-launcher');
  const help = document.querySelector('#keyboard-help');
  const themePicker = document.querySelector('#theme-picker');
  const themeOptions = Array.from(document.querySelectorAll('[data-theme-value]'));
  const themeLabel = document.querySelector('[data-theme-label]');
  const launcherInput = document.querySelector('#launcher-search');
  const launcherResults = document.querySelector('#launcher-results');
  const launcherEmpty = document.querySelector('[data-launcher-empty]');

  const state = {
    currentWorkspace: '1',
    restoreFocus: null,
    visibleLauncherItems: [],
    selectedLauncherIndex: 0
  };

  const getOpenDialog = () => [launcher, themePicker, help].find((dialog) => dialog && dialog.open) || null;

  const applyTheme = (requestedTheme, { persist = true, announce = true } = {}) => {
    const theme = THEMES[requestedTheme] ? requestedTheme : 'omarchy';
    body.dataset.theme = theme;
    themeOptions.forEach((option) => {
      const active = option.dataset.themeValue === theme;
      option.classList.toggle('is-active', active);
      option.setAttribute('aria-pressed', String(active));
    });
    if (themeLabel) themeLabel.textContent = THEMES[theme];
    if (announce && announcer) announcer.textContent = `${THEMES[theme]} theme applied`;
    if (persist) {
      try {
        window.localStorage.setItem('omarchy-homepage-theme-v2', theme);
      } catch {
        // Storage can be unavailable in private or hardened browser contexts.
      }
    }
  };

  let initialTheme = 'omarchy';
  try {
    initialTheme = window.localStorage.getItem('omarchy-homepage-theme-v2') || initialTheme;
  } catch {
    // Keep the default when storage is unavailable.
  }
  applyTheme(initialTheme, { persist: false, announce: false });

  const focusRestoredElement = () => {
    const element = state.restoreFocus;
    state.restoreFocus = null;
    if (!element || !element.isConnected || typeof element.focus !== 'function') return;
    try {
      element.focus({ preventScroll: true });
    } catch {
      element.focus();
    }
  };

  const closeOverlays = ({ restoreFocus = true } = {}) => {
    const openDialog = getOpenDialog();
    if (openDialog) {
      if (typeof openDialog.close === 'function') openDialog.close();
      else openDialog.removeAttribute('open');
    }
    if (launcherInput) {
      launcherInput.value = '';
      launcherInput.removeAttribute('aria-activedescendant');
      launcherInput.setAttribute('aria-expanded', 'false');
    }
    state.visibleLauncherItems = [];
    state.selectedLauncherIndex = 0;
    if (restoreFocus) focusRestoredElement();
    else state.restoreFocus = null;
  };

  const updateHash = (id, mode) => {
    const nextHash = `#workspace-${id}`;
    if (window.location.hash === nextHash || mode === 'none') return;
    const nextState = { workspace: id };
    if (mode === 'push') window.history.pushState(nextState, '', nextHash);
    if (mode === 'replace') window.history.replaceState(nextState, '', nextHash);
  };

  const activateWorkspace = (requestedId, { historyMode = 'none', announce = true } = {}) => {
    const id = WORKSPACES[requestedId] ? requestedId : '1';
    const workspace = WORKSPACES[id];
    state.currentWorkspace = id;

    workspaceButtons.forEach((button) => {
      const active = button.dataset.workspaceTarget === id;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-current', String(active));
    });

    workspacePanels.forEach((panel) => {
      const active = panel.dataset.workspacePanel === id;
      panel.classList.toggle('is-active', active);
      panel.hidden = !active;
      panel.setAttribute('aria-hidden', String(!active));
    });

    if (announce && announcer) {
      announcer.textContent = `Workspace ${id}: ${workspace.name}`;
    }
    updateHash(id, historyMode);
  };

  const launcherItems = () => {
    const workspaces = workspaceButtons.map((button) => ({
      type: 'workspace',
      id: button.dataset.workspaceTarget,
      label: WORKSPACES[button.dataset.workspaceTarget]?.name || `Workspace ${button.dataset.workspaceTarget}`,
      description: `Switch to the ${WORKSPACES[button.dataset.workspaceTarget]?.name || 'workspace'} workspace`,
      icon: WORKSPACE_ICONS[button.dataset.workspaceTarget] || button.dataset.workspaceTarget,
      target: ''
    }));

    const destinations = Array.from(document.querySelectorAll('.destination[data-launcher-label]')).map((destination) => ({
      type: 'destination',
      label: destination.dataset.launcherLabel,
      description: destination.dataset.launcherDescription || 'Open Omarchy destination',
      href: destination.getAttribute('href') || '#',
      icon: destination.dataset.lucide || (destination.dataset.launcherLabel || '?').slice(0, 2).toUpperCase(),
      target: destination.getAttribute('target') || '',
      rel: destination.getAttribute('rel') || ''
    }));

    return [...workspaces, ...destinations];
  };

  const setLauncherSelection = (requestedIndex, shouldScroll = true) => {
    const count = state.visibleLauncherItems.length;
    if (!count) {
      state.selectedLauncherIndex = 0;
      if (launcherInput) launcherInput.removeAttribute('aria-activedescendant');
      return;
    }

    state.selectedLauncherIndex = (requestedIndex + count) % count;
    const results = Array.from(launcherResults?.querySelectorAll('.launcher-result') || []);
    results.forEach((result, index) => {
      const selected = index === state.selectedLauncherIndex;
      result.setAttribute('aria-selected', String(selected));
      if (selected && shouldScroll) {
        result.scrollIntoView({
          block: 'nearest',
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
        });
      }
    });

    const selectedResult = results[state.selectedLauncherIndex];
    if (launcherInput && selectedResult) {
      launcherInput.setAttribute('aria-activedescendant', selectedResult.id);
    }
  };

  const renderLauncher = (query = '') => {
    if (!launcherResults) return;
    const normalizedQuery = query.trim().toLowerCase();
    const matchingItems = launcherItems().filter((item) => {
      const searchable = `${item.label} ${item.description}`.toLowerCase();
      return !normalizedQuery || searchable.includes(normalizedQuery);
    });
    // Keep the initial command palette scannable. Searching still exposes
    // every destination as soon as the visitor starts typing.
    const items = normalizedQuery ? matchingItems : matchingItems.slice(0, 6);

    state.visibleLauncherItems = items;
    state.selectedLauncherIndex = 0;
    launcherResults.replaceChildren();

    items.forEach((item, index) => {
      const result = item.type === 'workspace'
        ? document.createElement('button')
        : document.createElement('a');
      result.className = 'launcher-result';
      result.id = `launcher-result-${index}`;
      result.dataset.resultIndex = String(index);
      result.setAttribute('role', 'option');
      result.setAttribute('aria-selected', String(index === 0));

      if (item.type === 'workspace') {
        result.type = 'button';
        result.addEventListener('click', () => {
          activateWorkspace(item.id, { historyMode: 'push' });
          closeOverlays({ restoreFocus: false });
        });
      } else {
        result.href = item.href;
        if (item.target) result.target = item.target;
        if (item.rel) result.rel = item.rel;
        result.addEventListener('click', () => closeOverlays({ restoreFocus: false }));
      }

      const icon = document.createElement('span');
      icon.className = 'launcher-result__icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.append(typeof item.icon === 'string' && item.icon.startsWith('lc-')
        ? createLucideIcon(item.icon)
        : document.createTextNode(item.icon));

      const copy = document.createElement('span');
      copy.className = 'launcher-result__copy';
      const label = document.createElement('span');
      label.className = 'launcher-result__label';
      label.textContent = item.label;
      const description = document.createElement('span');
      description.className = 'launcher-result__description';
      description.textContent = item.description;
      copy.append(label, description);

      const arrow = document.createElement('span');
      arrow.className = 'launcher-result__arrow';
      arrow.setAttribute('aria-hidden', 'true');
      arrow.append(createLucideIcon(item.type === 'workspace' ? 'lc-arrow-right' : 'lc-arrow-up-right'));
      result.append(icon, copy, arrow);
      result.addEventListener('mouseenter', () => setLauncherSelection(index, false));
      launcherResults.append(result);
    });

    if (launcherEmpty) launcherEmpty.hidden = items.length > 0;
    setLauncherSelection(0, false);
  };

  const activateSelectedLauncherResult = () => {
    const result = launcherResults?.querySelector(`[data-result-index="${state.selectedLauncherIndex}"]`);
    if (result) result.click();
  };

  const openDialog = (dialog) => {
    if (!dialog) return;
    const alreadyOpen = getOpenDialog();
    if (!alreadyOpen) {
      const activeElement = document.activeElement;
      state.restoreFocus = activeElement instanceof HTMLElement ? activeElement : null;
    } else if (alreadyOpen !== dialog) {
      if (typeof alreadyOpen.close === 'function') alreadyOpen.close();
      else alreadyOpen.removeAttribute('open');
    }

    if (!dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }

    if (dialog === launcher) {
      if (launcherInput) {
        launcherInput.setAttribute('aria-expanded', 'true');
        renderLauncher('');
        window.setTimeout(() => launcherInput.focus(), 0);
      }
    } else if (dialog === themePicker) {
      const selectedTheme = dialog.querySelector('[data-theme-value][aria-pressed="true"]');
      window.setTimeout(() => selectedTheme?.focus(), 0);
    } else {
      const closeButton = dialog.querySelector('.dialog-close');
      window.setTimeout(() => closeButton?.focus(), 0);
    }
  };

  const handleAction = (action) => {
    switch (action.dataset.action) {
      case 'open-launcher':
        openDialog(launcher);
        break;
      case 'open-help':
        openDialog(help);
        break;
      case 'open-themes':
        openDialog(themePicker);
        break;
      case 'close-overlays':
        closeOverlays();
        break;
      case 'switch-workspace':
        if (WORKSPACES[action.dataset.workspaceTarget]) {
          activateWorkspace(action.dataset.workspaceTarget, { historyMode: 'push' });
          if (getOpenDialog()) closeOverlays({ restoreFocus: false });
        }
        break;
      default:
        break;
    }
  };

  workspaceButtons.forEach((button) => {
    button.addEventListener('click', () => {
      activateWorkspace(button.dataset.workspaceTarget, { historyMode: 'push' });
    });
  });

  themeOptions.forEach((option) => {
    option.addEventListener('click', () => applyTheme(option.dataset.themeValue));
  });

  document.addEventListener('click', (event) => {
    const action = event.target instanceof Element ? event.target.closest('[data-action]') : null;
    if (action) handleAction(action);
  });

  [launcher, themePicker, help].forEach((dialog) => {
    if (!dialog) return;
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      closeOverlays();
    });
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) closeOverlays();
    });
  });

  launcherInput?.addEventListener('input', () => renderLauncher(launcherInput.value));

  window.addEventListener('popstate', () => activateWorkspace(workspaceFromHash(window.location.hash)));
  window.addEventListener('hashchange', () => activateWorkspace(workspaceFromHash(window.location.hash)));

  document.addEventListener('keydown', (event) => {
    if (event.isComposing) return;

    const hasOnlyLauncherModifier = (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey;
    if (hasOnlyLauncherModifier && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      openDialog(launcher);
      return;
    }

    const openDialogNow = getOpenDialog();
    if (event.key === 'Escape' && openDialogNow) {
      event.preventDefault();
      closeOverlays();
      return;
    }

    if (openDialogNow === launcher && launcherResults) {
      if (event.key === 'ArrowDown' && document.activeElement === launcherInput) {
        event.preventDefault();
        setLauncherSelection(state.selectedLauncherIndex + 1);
        return;
      }
      if (event.key === 'ArrowUp' && document.activeElement === launcherInput) {
        event.preventDefault();
        setLauncherSelection(state.selectedLauncherIndex - 1);
        return;
      }
      if (event.key === 'Home' && document.activeElement === launcherInput) {
        event.preventDefault();
        setLauncherSelection(0);
        return;
      }
      if (event.key === 'End' && document.activeElement === launcherInput) {
        event.preventDefault();
        setLauncherSelection(state.visibleLauncherItems.length - 1);
        return;
      }
      if (event.key === 'Enter' && document.activeElement === launcherInput) {
        event.preventDefault();
        activateSelectedLauncherResult();
        return;
      }
    }

    if (isTypingTarget(event.target)) return;

    if (event.key === '?' && !openDialogNow && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      openDialog(help);
      return;
    }

    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;

    if (WORKSPACES[event.key] && !openDialogNow) {
      event.preventDefault();
      activateWorkspace(event.key, { historyMode: 'push' });
    }
  });

  activateWorkspace(workspaceFromHash(window.location.hash), { announce: false });
  logo.ready();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHomepage, { once: true });
} else {
  initHomepage();
}
