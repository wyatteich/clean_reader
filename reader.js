const PAYLOAD_PREFIX = "quiet-reader:";
const PREFS_KEY = "quiet-reader:prefs";
const SCROLL_KEY_PREFIX = "quiet-reader:scroll:";
const OBSIDIAN_SETTINGS_KEY = "quiet-reader:obsidian-settings";
const CUSTOM_FONT_ALIAS = "Clean Reader Custom Local";
const EXTENSION_STYLE_SUFFIX =
  globalThis.chrome && chrome.runtime && chrome.runtime.id ? chrome.runtime.id : "local";
const CUSTOM_FONT_STYLE_ID = `quiet-reader-custom-font-face-${EXTENSION_STYLE_SUFFIX}`;
const PAGE_FONT_VALUE = "page-default";

const FONT_OPTIONS = [
  {
    label: "Georgia",
    value: 'Georgia, "Times New Roman", serif'
  },
  {
    label: "Cambria",
    value: 'Cambria, Georgia, "Times New Roman", serif'
  },
  {
    label: "Constantia",
    value: 'Constantia, Georgia, "Times New Roman", serif'
  },
  {
    label: "Palatino",
    value: '"Palatino Linotype", Palatino, "Book Antiqua", serif'
  },
  {
    label: "Garamond",
    value: 'Garamond, Georgia, "Times New Roman", serif'
  },
  {
    label: "Atkinson Hyperlegible",
    value: '"Atkinson Hyperlegible", "Segoe UI", system-ui, sans-serif'
  },
  {
    label: "Literata",
    value: 'Literata, "Literata TT Text", Georgia, "Times New Roman", serif'
  },
  {
    label: "Charter",
    value: 'Charter, "Bitstream Charter", Georgia, serif'
  },
  {
    label: "Source Serif",
    value: '"Source Serif Pro", "Source Serif 4", Georgia, serif'
  },
  {
    label: "Noto Serif",
    value: '"Noto Serif", Georgia, serif'
  },
  {
    label: "System Sans",
    value: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  },
  {
    label: "Verdana",
    value: 'Verdana, Geneva, sans-serif'
  },
  {
    label: "Trebuchet",
    value: '"Trebuchet MS", "Segoe UI", sans-serif'
  },
  {
    label: "OpenDyslexic",
    value: 'OpenDyslexic, "Atkinson Hyperlegible", Verdana, sans-serif'
  },
  {
    label: "Page default",
    value: PAGE_FONT_VALUE
  },
  {
    label: "Custom local font",
    value: "custom"
  }
];

const DEFAULT_PREFS = {
  font: 'Georgia, "Times New Roman", serif',
  fontLabel: "Georgia",
  customFont: "",
  size: 18,
  lineHeight: 1.7,
  width: 720,
  theme: "light"
};

const elements = {
  articleContent: document.getElementById("articleContent"),
  articleDocument: document.getElementById("readerDocument"),
  articleExcerpt: document.getElementById("articleExcerpt"),
  articleMeta: document.getElementById("articleMeta"),
  articleSite: document.getElementById("articleSite"),
  articleTitle: document.getElementById("articleTitle"),
  closeOverlayButton: document.getElementById("closeOverlayButton"),
  customFontInput: document.getElementById("customFontInput"),
  fontSelect: document.getElementById("fontSelect"),
  lineHeightDecButton: document.getElementById("lineHeightDecButton"),
  lineHeightIncButton: document.getElementById("lineHeightIncButton"),
  lineHeightValueInput: document.getElementById("lineHeightValueInput"),
  obsidianCommentButton: document.getElementById("obsidianCommentButton"),
  obsidianCommentCancelButton: document.getElementById("obsidianCommentCancelButton"),
  obsidianCommentInput: document.getElementById("obsidianCommentInput"),
  obsidianCommentSaveButton: document.getElementById("obsidianCommentSaveButton"),
  obsidianPopup: document.getElementById("obsidianPopup"),
  obsidianPopupComment: document.getElementById("obsidianPopupComment"),
  obsidianPopupDefault: document.getElementById("obsidianPopupDefault"),
  obsidianSaveButton: document.getElementById("obsidianSaveButton"),
  openSettingsButton: document.getElementById("openSettingsButton"),
  resetPrefsButton: document.getElementById("resetPrefsButton"),
  sizeDecButton: document.getElementById("sizeDecButton"),
  sizeIncButton: document.getElementById("sizeIncButton"),
  sizeValueInput: document.getElementById("sizeValueInput"),
  themeSelect: document.getElementById("themeSelect"),
  toolbar: document.querySelector(".reader-toolbar"),
  widthDecButton: document.getElementById("widthDecButton"),
  widthIncButton: document.getElementById("widthIncButton"),
  widthValueInput: document.getElementById("widthValueInput")
};

let prefs = { ...DEFAULT_PREFS };
let pageFont = "";
let scrollKey = "";
let articlePayload = null;
let obsidianSession = { saved: false, filePath: "" };
let pendingSelectionText = "";
let commentModeActive = false;
let selectionFrame = null;

init();

async function init() {
  buildFontOptions();
  prefs = { ...DEFAULT_PREFS, ...(await getStoredPrefs()) };
  bindControls();
  bindToolbarAutoHide();

  const payload = await getPayload();
  pageFont = cleanFontStack(payload && payload.pageFont);
  applyPrefs();
  renderPayload(payload);

  if (payload && !payload.error) {
    scrollKey = articleScrollKey(payload.sourceUrl);
    await restoreScrollPosition(payload.scrollPercent);
    bindScrollTracking();
    bindHighlightSaveUI();
  }
}

function buildFontOptions() {
  const fragment = document.createDocumentFragment();
  FONT_OPTIONS.forEach((font) => {
    const option = document.createElement("option");
    option.value = font.value;
    option.textContent = font.label;
    fragment.appendChild(option);
  });
  elements.fontSelect.appendChild(fragment);
}

function bindControls() {
  elements.fontSelect.addEventListener("change", () => {
    const selected = selectedFont();
    prefs.font = selected.value;
    prefs.fontLabel = selected.label;
    saveAndApplyPrefs();
    if (prefs.font === "custom") {
      elements.customFontInput.focus();
    }
  });

  elements.customFontInput.addEventListener("input", () => {
    prefs.customFont = elements.customFontInput.value;
    if (prefs.font === "custom") {
      saveAndApplyPrefs();
    } else {
      savePrefs();
    }
  });

  bindStepper(elements.sizeDecButton, elements.sizeIncButton, "size", 15, 24, 1, 0);
  bindNumberInput(elements.sizeValueInput, "size", 15, 24, 0);

  bindStepper(elements.lineHeightDecButton, elements.lineHeightIncButton, "lineHeight", 1.35, 2.05, 0.05, 2);
  bindNumberInput(elements.lineHeightValueInput, "lineHeight", 1.35, 2.05, 2);

  bindStepper(elements.widthDecButton, elements.widthIncButton, "width", 560, 940, 10, 0);
  bindNumberInput(elements.widthValueInput, "width", 560, 940, 0);

  elements.resetPrefsButton.addEventListener("click", () => {
    prefs = { ...DEFAULT_PREFS };
    saveAndApplyPrefs();
  });

  elements.closeOverlayButton.addEventListener("click", closeReader);

  elements.openSettingsButton.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });

  elements.themeSelect.addEventListener("change", () => {
    prefs.theme = elements.themeSelect.value || "light";
    saveAndApplyPrefs();
  });
}

function closeReader() {
  const percent = currentScrollPercent();
  saveScrollPercent(percent);

  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: "quiet-reader:close", scrollPercent: percent }, "*");
    return;
  }

  window.close();
}

function bindNumberInput(input, key, min, max, decimals) {
  const commit = () => {
    if (input.value.trim() === "") {
      applyPrefs();
      return;
    }

    const parsed = Number(input.value);
    if (!Number.isFinite(parsed)) {
      applyPrefs();
      return;
    }

    const factor = 10 ** decimals;
    prefs[key] = Math.round(Math.min(max, Math.max(min, parsed)) * factor) / factor;
    saveAndApplyPrefs();
  };

  input.addEventListener("change", commit);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
      input.blur();
    }
  });
}

function bindStepper(decButton, incButton, key, min, max, step, decimals) {
  const factor = 10 ** decimals;
  const adjust = (delta) => {
    const current = Number(prefs[key]);
    const base = Number.isFinite(current) ? current : min;
    prefs[key] = Math.round(Math.min(max, Math.max(min, base + delta)) * factor) / factor;
    saveAndApplyPrefs();
  };

  decButton.addEventListener("click", () => adjust(-step));
  incButton.addEventListener("click", () => adjust(step));
}

function bindToolbarAutoHide() {
  const toolbar = elements.toolbar;
  if (!toolbar) {
    return;
  }

  const hideAfterY = 96;
  const revealTopZone = 44;
  const minScrollDelta = 3;
  let lastScrollY = window.scrollY;
  let ticking = false;
  let pointerInToolbar = false;
  let focusInToolbar = false;

  const showToolbar = () => {
    toolbar.classList.remove("is-hidden");
  };

  const hideToolbar = () => {
    if (window.scrollY <= hideAfterY || pointerInToolbar || focusInToolbar) {
      showToolbar();
      return;
    }
    toolbar.classList.add("is-hidden");
  };

  window.addEventListener(
    "scroll",
    () => {
      if (ticking) {
        return;
      }

      ticking = true;
      window.requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const delta = currentY - lastScrollY;

        if (Math.abs(delta) >= minScrollDelta) {
          if (currentY <= hideAfterY || delta < 0) {
            showToolbar();
          } else {
            hideToolbar();
          }
          lastScrollY = currentY;
        }

        ticking = false;
      });
    },
    { passive: true }
  );

  document.addEventListener(
    "mousemove",
    (event) => {
      if (event.clientY <= revealTopZone) {
        showToolbar();
      }
    },
    { passive: true }
  );

  toolbar.addEventListener("mouseenter", () => {
    pointerInToolbar = true;
    showToolbar();
  });

  toolbar.addEventListener("mouseleave", () => {
    pointerInToolbar = false;
  });

  toolbar.addEventListener("focusin", () => {
    focusInToolbar = true;
    showToolbar();
  });

  toolbar.addEventListener("focusout", () => {
    window.requestAnimationFrame(() => {
      focusInToolbar = toolbar.contains(document.activeElement);
    });
  });
}

function articleScrollKey(url) {
  if (!url) {
    return "";
  }
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    return SCROLL_KEY_PREFIX + parsed.toString();
  } catch {
    return SCROLL_KEY_PREFIX + url;
  }
}

function currentScrollPercent() {
  const scrollable = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0);
  if (scrollable <= 0) {
    return 0;
  }
  return Math.min(1, Math.max(0, window.scrollY / scrollable));
}

function scrollToPercent(percent) {
  const scrollable = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0);
  window.scrollTo(0, scrollable * percent);
}

function saveScrollPercent(percent) {
  if (!scrollKey) {
    return;
  }
  chrome.storage.local.set({ [scrollKey]: { percent, updatedAt: Date.now() } });
}

async function restoreScrollPosition(livePercent) {
  const stored = await getStoredScrollPercent();
  const percent = stored !== null ? stored : livePercent;
  if (!Number.isFinite(percent)) {
    return;
  }

  // Defer a tick so the just-rendered content can settle its layout before
  // scrollHeight is measured. A timeout (rather than requestAnimationFrame)
  // is used since it isn't gated on the document actually painting.
  setTimeout(() => scrollToPercent(percent), 50);
}

function getStoredScrollPercent() {
  if (!scrollKey) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    chrome.storage.local.get(scrollKey, (result) => {
      const record = result && result[scrollKey];
      resolve(record && Number.isFinite(record.percent) ? record.percent : null);
    });
  });
}

function bindScrollTracking() {
  if (!scrollKey) {
    return;
  }

  let saveTimer = null;
  window.addEventListener(
    "scroll",
    () => {
      if (saveTimer) {
        clearTimeout(saveTimer);
      }
      saveTimer = setTimeout(() => saveScrollPercent(currentScrollPercent()), 400);
    },
    { passive: true }
  );
}

function selectedFont() {
  const option = FONT_OPTIONS.find((font) => font.value === elements.fontSelect.value);
  return option || FONT_OPTIONS[0];
}

function applyPrefs() {
  let fontValue = prefs.font;
  if (prefs.font === "custom") {
    fontValue = customFontStack(prefs.customFont);
  } else if (prefs.font === PAGE_FONT_VALUE) {
    applyCustomFontFace([]);
    fontValue = pageFontStack(pageFont);
  } else {
    applyCustomFontFace([]);
  }

  document.documentElement.style.setProperty("--reader-font", fontValue || DEFAULT_PREFS.font);
  document.documentElement.style.setProperty("--reader-size", `${prefs.size || DEFAULT_PREFS.size}px`);
  document.documentElement.style.setProperty("--reader-line", String(prefs.lineHeight || DEFAULT_PREFS.lineHeight));
  document.documentElement.style.setProperty("--reader-width", `${prefs.width || DEFAULT_PREFS.width}px`);
  document.body.dataset.theme = prefs.theme || DEFAULT_PREFS.theme;

  elements.fontSelect.value = FONT_OPTIONS.some((font) => font.value === prefs.font) ? prefs.font : DEFAULT_PREFS.font;
  elements.customFontInput.hidden = elements.fontSelect.value !== "custom";
  if (document.activeElement !== elements.customFontInput) {
    elements.customFontInput.value = prefs.customFont || "";
  }
  const size = prefs.size || DEFAULT_PREFS.size;
  const lineHeight = prefs.lineHeight || DEFAULT_PREFS.lineHeight;
  const width = prefs.width || DEFAULT_PREFS.width;

  elements.sizeValueInput.value = formatNumber(size, 0);
  elements.sizeDecButton.disabled = size <= 15;
  elements.sizeIncButton.disabled = size >= 24;

  elements.lineHeightValueInput.value = formatNumber(lineHeight, 2);
  elements.lineHeightDecButton.disabled = lineHeight <= 1.35;
  elements.lineHeightIncButton.disabled = lineHeight >= 2.05;

  elements.widthValueInput.value = formatNumber(width, 0);
  elements.widthDecButton.disabled = width <= 560;
  elements.widthIncButton.disabled = width >= 940;

  elements.themeSelect.value = prefs.theme || DEFAULT_PREFS.theme;
  elements.resetPrefsButton.hidden = !hasCustomPrefs();
}

function formatNumber(value, decimals) {
  return decimals > 0 ? Number(value).toFixed(decimals) : String(Math.round(Number(value)));
}

function hasCustomPrefs() {
  return (
    prefs.font !== DEFAULT_PREFS.font ||
    prefs.customFont !== DEFAULT_PREFS.customFont ||
    Number(prefs.size) !== DEFAULT_PREFS.size ||
    Number(prefs.lineHeight) !== DEFAULT_PREFS.lineHeight ||
    Number(prefs.width) !== DEFAULT_PREFS.width ||
    prefs.theme !== DEFAULT_PREFS.theme
  );
}

function customFontStack(value) {
  const candidates = customFontCandidates(value);
  const localCandidates = localFontCandidates(candidates);
  applyCustomFontFace(localCandidates);

  if (!candidates.length) {
    return DEFAULT_PREFS.font;
  }

  const directStack = candidates.map(quoteFontFamily).join(", ");
  return `${directStack}, "${CUSTOM_FONT_ALIAS}", Georgia, "Times New Roman", serif`;
}

function localFontCandidates(candidates) {
  const expanded = [];
  candidates.forEach((candidate) => {
    expanded.push(candidate);

    if (!/\b(regular|italic|bold|medium|light|semibold|extrabold|black)\b/i.test(candidate)) {
      expanded.push(`${candidate} Regular`);
      expanded.push(`${candidate.replace(/\s+/g, "")}-Regular`);
    }
  });

  return [...new Set(expanded)].slice(0, 15);
}

function pageFontStack(value) {
  const cleaned = cleanFontStack(value);
  return cleaned ? `${cleaned}, Georgia, "Times New Roman", serif` : DEFAULT_PREFS.font;
}

function cleanFontStack(value) {
  return String(value || "")
    .replace(/[\r\n\t]/g, " ")
    .replace(/[;{}\\]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}

function customFontCandidates(value) {
  return String(value || "")
    .slice(0, 140)
    .split(",")
    .map((part) =>
      part
        .replace(/[;"{}\\]/g, "")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean)
    .slice(0, 5);
}

function quoteFontFamily(value) {
  return `"${value.replace(/"/g, "")}"`;
}

function cssString(value) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function applyCustomFontFace(candidates) {
  let style = document.getElementById(CUSTOM_FONT_STYLE_ID);
  if (!candidates.length) {
    if (style) {
      style.textContent = "";
    }
    return;
  }

  if (!style) {
    style = document.createElement("style");
    style.id = CUSTOM_FONT_STYLE_ID;
    document.head.appendChild(style);
  }

  style.textContent = `@font-face { font-family: "${CUSTOM_FONT_ALIAS}"; src: ${candidates
    .map((name) => `local("${cssString(name)}")`)
    .join(", ")}; font-display: swap; }`;
}

function saveAndApplyPrefs() {
  applyPrefs();
  savePrefs();
}

function savePrefs() {
  chrome.storage.local.set({ [PREFS_KEY]: prefs });
}

function getStoredPrefs() {
  return new Promise((resolve) => {
    chrome.storage.local.get(PREFS_KEY, (result) => {
      resolve(result && result[PREFS_KEY] ? result[PREFS_KEY] : {});
    });
  });
}

async function getPayload() {
  const id = new URLSearchParams(location.search).get("id");
  if (!id) {
    return {
      error: true,
      title: "No article was loaded.",
      message: "Clean Reader did not receive an article payload."
    };
  }

  const key = PAYLOAD_PREFIX + id;
  const fromSession = await getFromArea(chrome.storage.session, key);
  if (fromSession) {
    removeFromArea(chrome.storage.session, key);
    return fromSession;
  }

  const fromLocal = await getFromArea(chrome.storage.local, key);
  if (fromLocal) {
    removeFromArea(chrome.storage.local, key);
  }

  return (
    fromLocal || {
      error: true,
      title: "The article expired.",
      message: "Open the original page and click Clean Reader again."
    }
  );
}

function getFromArea(area, key) {
  if (!area) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    area.get(key, (result) => {
      resolve(result && result[key] ? result[key] : null);
    });
  });
}

function removeFromArea(area, key) {
  if (area) {
    area.remove(key);
  }
}

function renderPayload(payload) {
  const data = payload || {};
  articlePayload = data;
  document.title = data.title ? `${data.title} - Clean Reader` : "Clean Reader";
  elements.articleTitle.textContent = data.title || "Clean Reader";
  elements.articleSite.textContent = data.siteName || "";
  elements.articleDocument.dir = data.direction || "auto";

  if (data.error) {
    elements.articleExcerpt.textContent = data.message || "";
    elements.articleMeta.textContent = data.details || "";
    elements.articleContent.innerHTML = "";
    return;
  }

  elements.articleExcerpt.textContent = data.excerpt || "";
  elements.articleMeta.replaceChildren(...metaNodes(data));

  const sanitized = sanitizeHtml(data.content || "", data.sourceUrl || location.href);
  if (sanitized) {
    elements.articleContent.innerHTML = sanitized;
    upgradeArticleLinks();
  } else {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Clean Reader could not render this article.";
    elements.articleContent.replaceChildren(empty);
  }
}

function metaNodes(data) {
  const nodes = [];
  const byline = compact(data.byline || "");
  const readMinutes = Math.max(1, Math.round((data.wordCount || 0) / 225));

  if (byline) {
    nodes.push(textNode(byline));
  }

  if (data.wordCount) {
    nodes.push(textNode(`${readMinutes} min read`));
  }

  if (data.sourceUrl) {
    const link = document.createElement("a");
    link.href = data.sourceUrl;
    link.target = "_blank";
    link.rel = "noreferrer noopener";
    link.textContent = "Original";
    nodes.push(link);
  }

  return nodes;
}

function textNode(text) {
  const span = document.createElement("span");
  span.textContent = text;
  return span;
}

function compact(value) {
  return value.replace(/\s+/g, " ").trim();
}

function sanitizeHtml(html, baseUrl) {
  const template = document.createElement("template");
  template.innerHTML = html;

  const allowedTags = new Set([
    "a",
    "b",
    "blockquote",
    "br",
    "code",
    "div",
    "em",
    "figcaption",
    "figure",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "i",
    "img",
    "li",
    "mark",
    "ol",
    "p",
    "pre",
    "section",
    "small",
    "strong",
    "sub",
    "sup",
    "table",
    "tbody",
    "td",
    "th",
    "thead",
    "tr",
    "ul"
  ]);

  Array.from(template.content.querySelectorAll("*")).forEach((element) => {
    const tag = element.tagName.toLowerCase();
    if (!allowedTags.has(tag)) {
      unwrap(element);
      return;
    }

    const attrs = Array.from(element.attributes);
    attrs.forEach((attr) => element.removeAttribute(attr.name));

    if (tag === "a") {
      const href = absoluteUrl(attrs.find((attr) => attr.name.toLowerCase() === "href")?.value || "", baseUrl);
      if (href && /^(https?:|mailto:)/i.test(href)) {
        element.setAttribute("href", href);
      }
      return;
    }

    if (tag === "img") {
      const src = absoluteUrl(attrs.find((attr) => attr.name.toLowerCase() === "src")?.value || "", baseUrl);
      if (src && /^https?:/i.test(src)) {
        element.setAttribute("src", src);
        element.setAttribute("loading", "lazy");
      } else {
        element.remove();
        return;
      }

      const alt = attrs.find((attr) => attr.name.toLowerCase() === "alt")?.value || "";
      const title = attrs.find((attr) => attr.name.toLowerCase() === "title")?.value || "";
      element.setAttribute("alt", alt.slice(0, 240));
      if (title) {
        element.setAttribute("title", title.slice(0, 240));
      }
    }
  });

  return template.innerHTML.trim();
}

function unwrap(element) {
  const parent = element.parentNode;
  if (!parent) return;
  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }
  parent.removeChild(element);
}

function absoluteUrl(value, baseUrl) {
  if (!value) return "";
  try {
    return new URL(value, baseUrl).href;
  } catch {
    return "";
  }
}

function upgradeArticleLinks() {
  elements.articleContent.querySelectorAll("a[href]").forEach((link) => {
    link.target = "_blank";
    link.rel = "noreferrer noopener";
  });
}

function bindHighlightSaveUI() {
  if (!elements.obsidianPopup) {
    return;
  }

  document.addEventListener("selectionchange", onSelectionChange, { passive: true });

  elements.obsidianSaveButton.addEventListener("mousedown", (event) => event.preventDefault());
  elements.obsidianCommentButton.addEventListener("mousedown", (event) => event.preventDefault());

  elements.obsidianSaveButton.addEventListener("click", () => {
    if (!pendingSelectionText) {
      return;
    }
    saveClippingToObsidian(pendingSelectionText, "");
  });

  elements.obsidianCommentButton.addEventListener("click", () => {
    if (!pendingSelectionText) {
      return;
    }
    enterCommentMode();
  });

  elements.obsidianCommentCancelButton.addEventListener("click", () => {
    exitCommentMode();
  });

  elements.obsidianCommentSaveButton.addEventListener("click", () => {
    if (!pendingSelectionText) {
      return;
    }
    saveClippingToObsidian(pendingSelectionText, elements.obsidianCommentInput.value.trim());
  });
}

function onSelectionChange() {
  if (selectionFrame) {
    return;
  }
  selectionFrame = window.requestAnimationFrame(() => {
    selectionFrame = null;
    handleSelectionChange();
  });
}

function handleSelectionChange() {
  if (commentModeActive) {
    return;
  }

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    hideObsidianPopup();
    return;
  }

  const range = selection.getRangeAt(0);
  if (!elements.articleContent.contains(range.commonAncestorContainer)) {
    hideObsidianPopup();
    return;
  }

  const text = selection.toString().trim();
  if (!text) {
    hideObsidianPopup();
    return;
  }

  pendingSelectionText = text;
  positionObsidianPopup(range.getBoundingClientRect());
}

function positionObsidianPopup(rect) {
  const popup = elements.obsidianPopup;
  popup.hidden = false;
  popup.classList.remove("is-error", "is-saved");
  resetObsidianPopupToDefault();

  const margin = 8;
  const popupRect = popup.getBoundingClientRect();

  let top = rect.top - popupRect.height - margin;
  if (top < margin) {
    top = rect.bottom + margin;
  }
  top = Math.max(margin, Math.min(top, window.innerHeight - popupRect.height - margin));

  let left = rect.left + rect.width / 2 - popupRect.width / 2;
  left = Math.max(margin, Math.min(left, window.innerWidth - popupRect.width - margin));

  popup.style.top = `${top}px`;
  popup.style.left = `${left}px`;
  popup.classList.add("is-visible");
}

function hideObsidianPopup() {
  if (!elements.obsidianPopup) {
    return;
  }
  elements.obsidianPopup.classList.remove("is-visible", "is-saved", "is-error");
  pendingSelectionText = "";
  if (commentModeActive) {
    exitCommentMode();
  }
}

function resetObsidianPopupToDefault() {
  commentModeActive = false;
  elements.obsidianPopupComment.hidden = true;
  elements.obsidianPopupDefault.hidden = false;
  elements.obsidianCommentInput.value = "";
}

function enterCommentMode() {
  commentModeActive = true;
  elements.obsidianPopupDefault.hidden = true;
  elements.obsidianPopupComment.hidden = false;
  elements.obsidianCommentInput.value = "";
  elements.obsidianCommentInput.focus();
}

function exitCommentMode() {
  commentModeActive = false;
  elements.obsidianPopupComment.hidden = true;
  elements.obsidianPopupDefault.hidden = false;
}

async function saveClippingToObsidian(excerptText, comment) {
  const settings = await getObsidianSettings();
  if (!settings.vault) {
    showObsidianPopupError();
    return;
  }

  if (!obsidianSession.filePath) {
    obsidianSession.filePath = buildFilePath(articlePayload, settings);
  }

  const content = buildClippingMarkdown({
    isFirstSave: !obsidianSession.saved,
    excerptText,
    comment,
    payload: articlePayload || {},
    settings
  });

  const uri = buildObsidianUri({
    vault: settings.vault,
    file: obsidianSession.filePath,
    content,
    append: obsidianSession.saved
  });

  window.location.href = uri;
  obsidianSession.saved = true;
  flashObsidianSaved();
}

function showObsidianPopupError() {
  const popup = elements.obsidianPopup;
  popup.classList.add("is-error");
  const original = elements.obsidianSaveButton.textContent;
  elements.obsidianSaveButton.textContent = "Set vault in Settings";
  setTimeout(() => {
    elements.obsidianSaveButton.textContent = original;
    popup.classList.remove("is-error");
  }, 2200);
}

function flashObsidianSaved() {
  elements.obsidianPopup.classList.add("is-saved");
  setTimeout(() => {
    hideObsidianPopup();
  }, 900);
}

function getObsidianSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(OBSIDIAN_SETTINGS_KEY, (result) => {
      const stored = (result && result[OBSIDIAN_SETTINGS_KEY]) || {};
      resolve({ vault: "", folder: "", tags: "", ...stored });
    });
  });
}

function slugifyTitle(title) {
  const cleaned = String(title || "")
    .replace(/[\\/:*?"<>|#]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return cleaned || "Untitled Clipping";
}

function normalizeFolder(folder) {
  const trimmed = String(folder || "")
    .trim()
    .replace(/^\/+/, "")
    .replace(/\/+/g, "/");
  if (!trimmed) {
    return "";
  }
  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}

function buildFilePath(payload, settings) {
  const folder = normalizeFolder(settings.folder);
  const name = slugifyTitle(payload && payload.title);
  return `${folder}${name}`;
}

function buildClippingMarkdown({ isFirstSave, excerptText, comment, payload, settings }) {
  const body = buildExcerptBlock(excerptText, comment);
  if (!isFirstSave) {
    return `\n\n${body}`;
  }
  return `${buildFrontmatter(payload, settings)}\n\n${body}`;
}

function buildExcerptBlock(excerptText, comment) {
  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const lines = [`> [!quote] Highlighted ${time}`, quoteLines(excerptText)];
  if (comment) {
    lines.push(">");
    lines.push(quoteLines(`**Note:** ${comment}`));
  }
  return lines.join("\n");
}

function quoteLines(text) {
  return String(text)
    .split(/\r?\n/)
    .map((line) => `> ${line}`)
    .join("\n");
}

function buildFrontmatter(payload, settings) {
  const lines = ["---"];
  lines.push(`title: ${formatYamlString(payload.title || "Untitled article")}`);
  if (payload.sourceUrl) {
    lines.push(`source: ${formatYamlString(payload.sourceUrl)}`);
  }
  if (payload.byline) {
    lines.push(`author: ${formatYamlString(payload.byline)}`);
  }
  if (payload.published) {
    lines.push(`published: ${formatYamlString(payload.published)}`);
  }
  lines.push(`created: ${formatYamlString(todayDateString())}`);
  if (payload.excerpt) {
    lines.push(`description: ${formatYamlString(payload.excerpt)}`);
  }

  lines.push("tags:");
  buildTagList(settings.tags).forEach((tag) => lines.push(`  - ${tag}`));

  lines.push("---");
  return lines.join("\n");
}

function buildTagList(rawTags) {
  const extra = String(rawTags || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  return [...new Set(["clippings", ...extra])];
}

function formatYamlString(value) {
  const escaped = String(value || "")
    .replace(/\r?\n/g, " ")
    .replace(/"/g, '\\"');
  return `"${escaped}"`;
}

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function buildObsidianUri({ vault, file, content, append }) {
  let uri = `obsidian://new?vault=${encodeURIComponent(vault)}&file=${encodeURIComponent(file)}&content=${encodeURIComponent(content)}`;
  if (append) {
    uri += "&append=true";
  }
  return uri;
}
