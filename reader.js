const PAYLOAD_PREFIX = "quiet-reader:";
const PREFS_KEY = "quiet-reader:prefs";
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
  lineHeightRange: document.getElementById("lineHeightRange"),
  lineHeightValueInput: document.getElementById("lineHeightValueInput"),
  resetPrefsButton: document.getElementById("resetPrefsButton"),
  sizeRange: document.getElementById("sizeRange"),
  sizeValueInput: document.getElementById("sizeValueInput"),
  themeSelect: document.getElementById("themeSelect"),
  toolbar: document.querySelector(".reader-toolbar"),
  widthRange: document.getElementById("widthRange"),
  widthValueInput: document.getElementById("widthValueInput")
};

let prefs = { ...DEFAULT_PREFS };
let pageFont = "";

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

  elements.sizeRange.addEventListener("input", () => {
    prefs.size = Number(elements.sizeRange.value);
    saveAndApplyPrefs();
  });
  bindNumberInput(elements.sizeValueInput, "size", 15, 24, 0);

  elements.lineHeightRange.addEventListener("input", () => {
    prefs.lineHeight = Number(elements.lineHeightRange.value);
    saveAndApplyPrefs();
  });
  bindNumberInput(elements.lineHeightValueInput, "lineHeight", 1.35, 2.05, 2);

  elements.widthRange.addEventListener("input", () => {
    prefs.width = Number(elements.widthRange.value);
    saveAndApplyPrefs();
  });
  bindNumberInput(elements.widthValueInput, "width", 560, 940, 0);

  elements.resetPrefsButton.addEventListener("click", () => {
    prefs = { ...DEFAULT_PREFS };
    saveAndApplyPrefs();
  });

  elements.closeOverlayButton.addEventListener("click", closeReader);

  elements.themeSelect.addEventListener("change", () => {
    prefs.theme = elements.themeSelect.value || "light";
    saveAndApplyPrefs();
  });
}

function closeReader() {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: "quiet-reader:close" }, "*");
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
  elements.sizeRange.value = prefs.size || DEFAULT_PREFS.size;
  elements.lineHeightRange.value = prefs.lineHeight || DEFAULT_PREFS.lineHeight;
  elements.widthRange.value = prefs.width || DEFAULT_PREFS.width;
  elements.sizeValueInput.value = formatNumber(prefs.size || DEFAULT_PREFS.size, 0);
  elements.lineHeightValueInput.value = formatNumber(prefs.lineHeight || DEFAULT_PREFS.lineHeight, 2);
  elements.widthValueInput.value = formatNumber(prefs.width || DEFAULT_PREFS.width, 0);
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
