(() => {
  if (globalThis.quietReaderOverlay) {
    return;
  }

  const HOST_ID = "quiet-reader-overlay-host";
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

  const MARKUP = `
    <div id="quietReaderFrame" class="quiet-reader-frame" data-theme="light" tabindex="-1">
      <header class="reader-toolbar" aria-label="Reader controls">
        <div class="toolbar-primary">
          <div class="reader-mark" aria-hidden="true">Aa</div>

          <label class="control control-font">
            <span>Font</span>
            <select id="fontSelect"></select>
            <input id="customFontInput" class="custom-font-input" type="text" maxlength="140" spellcheck="false" autocomplete="off" aria-label="Custom font name" title="Use exact installed family names, separated by commas if needed" placeholder="Custom font name" hidden>
          </label>

          <label class="control control-range">
            <span>Size</span>
            <input id="sizeRange" type="range" min="15" max="24" step="1">
            <input id="sizeValueInput" class="range-value" type="number" min="15" max="24" step="1" aria-label="Size value">
          </label>

          <label class="control control-range">
            <span>Spacing</span>
            <input id="lineHeightRange" type="range" min="1.35" max="2.05" step="0.05">
            <input id="lineHeightValueInput" class="range-value" type="number" min="1.35" max="2.05" step="0.05" aria-label="Spacing value">
          </label>

          <label class="control control-range">
            <span>Width</span>
            <input id="widthRange" type="range" min="560" max="940" step="20">
            <input id="widthValueInput" class="range-value" type="number" min="560" max="940" step="1" aria-label="Width value">
          </label>

          <label class="control control-theme">
            <span>Theme</span>
            <select id="themeSelect">
              <option value="white">White</option>
              <option value="light">Light</option>
              <option value="sepia">Sepia</option>
              <option value="dark">Dark</option>
              <option value="night">Night</option>
            </select>
          </label>

          <button class="reset-button" id="resetPrefsButton" type="button" hidden>Reset</button>
          <button class="close-button" id="closeOverlayButton" type="button">Close</button>
        </div>
      </header>

      <main class="page-shell">
        <article class="reader-document" id="readerDocument">
          <header class="article-header">
            <p class="article-site" id="articleSite"></p>
            <h1 id="articleTitle">Clean Reader</h1>
            <div class="article-meta" id="articleMeta"></div>
            <p class="article-excerpt" id="articleExcerpt"></p>
          </header>
          <section class="article-content" id="articleContent"></section>
        </article>
      </main>
    </div>
  `;

  globalThis.quietReaderOverlay = {
    show
  };

  async function show(payload) {
    closeExistingOverlay();

    const id = createPayloadId();
    await setPayload(id, payload || {});

    const host = document.createElement("div");
    host.id = HOST_ID;
    host.style.position = "fixed";
    host.style.inset = "0";
    host.style.zIndex = "2147483647";

    const originalOverflow = {
      html: document.documentElement.style.overflow,
      body: document.body ? document.body.style.overflow : ""
    };

    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `
      :host {
        all: initial;
        position: fixed;
        inset: 0;
        z-index: 2147483647;
      }

      iframe {
        display: block;
        width: 100vw;
        height: 100vh;
        border: 0;
        background: #f6f4ef;
      }

      @supports (height: 100dvh) {
        iframe {
          height: 100dvh;
        }
      }
    `;
    shadow.appendChild(style);

    const iframe = document.createElement("iframe");
    iframe.title = "Clean Reader";
    iframe.src = chrome.runtime.getURL(`reader.html?id=${encodeURIComponent(id)}&overlay=1`);
    shadow.appendChild(iframe);

    document.documentElement.appendChild(host);
    document.documentElement.style.overflow = "hidden";
    if (document.body) {
      document.body.style.overflow = "hidden";
    }

    const abortController = new AbortController();
    const close = () => {
      abortController.abort();
      document.documentElement.style.overflow = originalOverflow.html;
      if (document.body) {
        document.body.style.overflow = originalOverflow.body;
      }
      host.remove();
    };

    window.addEventListener(
      "message",
      (event) => {
        if (event.source === iframe.contentWindow && event.data && event.data.type === "quiet-reader:close") {
          close();
        }
      },
      { signal: abortController.signal }
    );

    host.__quietReaderClose = close;
    return { ok: true };
  }

  function createPayloadId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function setPayload(id, payload) {
    const key = PAYLOAD_PREFIX + id;

    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: payload }, () => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }
        resolve();
      });
    });
  }

  function closeExistingOverlay() {
    const existing = document.getElementById(HOST_ID);
    if (!existing) {
      return;
    }

    if (typeof existing.__quietReaderClose === "function") {
      existing.__quietReaderClose();
    } else {
      existing.remove();
    }
  }

  function createOverlayState(context) {
    const { host, shadow, root, originalOverflow } = context;
    const abortController = new AbortController();
    const elements = {
      articleContent: shadow.getElementById("articleContent"),
      articleDocument: shadow.getElementById("readerDocument"),
      articleExcerpt: shadow.getElementById("articleExcerpt"),
      articleMeta: shadow.getElementById("articleMeta"),
      articleSite: shadow.getElementById("articleSite"),
      articleTitle: shadow.getElementById("articleTitle"),
      closeOverlayButton: shadow.getElementById("closeOverlayButton"),
      customFontInput: shadow.getElementById("customFontInput"),
      fontSelect: shadow.getElementById("fontSelect"),
      lineHeightRange: shadow.getElementById("lineHeightRange"),
      lineHeightValueInput: shadow.getElementById("lineHeightValueInput"),
      resetPrefsButton: shadow.getElementById("resetPrefsButton"),
      sizeRange: shadow.getElementById("sizeRange"),
      sizeValueInput: shadow.getElementById("sizeValueInput"),
      themeSelect: shadow.getElementById("themeSelect"),
      toolbar: shadow.querySelector(".reader-toolbar"),
      widthRange: shadow.getElementById("widthRange"),
      widthValueInput: shadow.getElementById("widthValueInput")
    };

    let prefs = { ...DEFAULT_PREFS };
    let pageFont = "";

    return {
      init,
      close
    };

    async function init(payload) {
      buildFontOptions();
      prefs = { ...DEFAULT_PREFS, ...(await getStoredPrefs()) };
      pageFont = cleanFontStack(payload && payload.pageFont);
      bindControls();
      bindToolbarAutoHide();
      applyPrefs();
      renderPayload(payload);
      root.focus({ preventScroll: true });
    }

    function close() {
      abortController.abort();
      removeCustomFontFace();
      document.documentElement.style.overflow = originalOverflow.html;
      if (document.body) {
        document.body.style.overflow = originalOverflow.body;
      }
      host.remove();
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
      const signal = abortController.signal;

      elements.fontSelect.addEventListener(
        "change",
        () => {
          const selected = selectedFont();
          prefs.font = selected.value;
          prefs.fontLabel = selected.label;
          saveAndApplyPrefs();
          if (prefs.font === "custom") {
            elements.customFontInput.focus({ preventScroll: true });
          }
        },
        { signal }
      );

      elements.customFontInput.addEventListener(
        "input",
        () => {
          prefs.customFont = elements.customFontInput.value;
          if (prefs.font === "custom") {
            saveAndApplyPrefs();
          } else {
            savePrefs();
          }
        },
        { signal }
      );

      elements.sizeRange.addEventListener(
        "input",
        () => {
          prefs.size = Number(elements.sizeRange.value);
          saveAndApplyPrefs();
        },
        { signal }
      );
      bindNumberInput(elements.sizeValueInput, "size", 15, 24, 0);

      elements.lineHeightRange.addEventListener(
        "input",
        () => {
          prefs.lineHeight = Number(elements.lineHeightRange.value);
          saveAndApplyPrefs();
        },
        { signal }
      );
      bindNumberInput(elements.lineHeightValueInput, "lineHeight", 1.35, 2.05, 2);

      elements.widthRange.addEventListener(
        "input",
        () => {
          prefs.width = Number(elements.widthRange.value);
          saveAndApplyPrefs();
        },
        { signal }
      );
      bindNumberInput(elements.widthValueInput, "width", 560, 940, 0);

      elements.resetPrefsButton.addEventListener(
        "click",
        () => {
          prefs = { ...DEFAULT_PREFS };
          saveAndApplyPrefs();
        },
        { signal }
      );

      elements.closeOverlayButton.addEventListener("click", close, { signal });

      elements.themeSelect.addEventListener(
        "change",
        () => {
          prefs.theme = elements.themeSelect.value || "light";
          saveAndApplyPrefs();
        },
        { signal }
      );

      document.addEventListener(
        "keydown",
        (event) => {
          if (event.key === "Escape") {
            close();
          }
        },
        { signal }
      );
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

      input.addEventListener("change", commit, { signal: abortController.signal });
      input.addEventListener(
        "keydown",
        (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
            input.blur();
          }
        },
        { signal: abortController.signal }
      );
    }

    function bindToolbarAutoHide() {
      const toolbar = elements.toolbar;
      if (!toolbar) {
        return;
      }

      const hideAfterY = 96;
      const revealTopZone = 44;
      const minScrollDelta = 3;
      let lastScrollY = root.scrollTop;
      let ticking = false;
      let pointerInToolbar = false;
      let focusInToolbar = false;

      const showToolbar = () => {
        toolbar.classList.remove("is-hidden");
      };

      const hideToolbar = () => {
        if (root.scrollTop <= hideAfterY || pointerInToolbar || focusInToolbar) {
          showToolbar();
          return;
        }
        toolbar.classList.add("is-hidden");
      };

      root.addEventListener(
        "scroll",
        () => {
          if (ticking) {
            return;
          }

          ticking = true;
          window.requestAnimationFrame(() => {
            const currentY = root.scrollTop;
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
        { passive: true, signal: abortController.signal }
      );

      root.addEventListener(
        "mousemove",
        (event) => {
          if (event.clientY <= revealTopZone) {
            showToolbar();
          }
        },
        { passive: true, signal: abortController.signal }
      );

      toolbar.addEventListener(
        "mouseenter",
        () => {
          pointerInToolbar = true;
          showToolbar();
        },
        { signal: abortController.signal }
      );

      toolbar.addEventListener(
        "mouseleave",
        () => {
          pointerInToolbar = false;
        },
        { signal: abortController.signal }
      );

      toolbar.addEventListener(
        "focusin",
        () => {
          focusInToolbar = true;
          showToolbar();
        },
        { signal: abortController.signal }
      );

      toolbar.addEventListener(
        "focusout",
        () => {
          window.requestAnimationFrame(() => {
            focusInToolbar = toolbar.contains(shadow.activeElement);
          });
        },
        { signal: abortController.signal }
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

      root.style.setProperty("--reader-font", fontValue || DEFAULT_PREFS.font);
      root.style.setProperty("--reader-size", `${prefs.size || DEFAULT_PREFS.size}px`);
      root.style.setProperty("--reader-line", String(prefs.lineHeight || DEFAULT_PREFS.lineHeight));
      root.style.setProperty("--reader-width", `${prefs.width || DEFAULT_PREFS.width}px`);
      root.dataset.theme = prefs.theme || DEFAULT_PREFS.theme;

      elements.fontSelect.value = FONT_OPTIONS.some((font) => font.value === prefs.font) ? prefs.font : DEFAULT_PREFS.font;
      elements.customFontInput.hidden = elements.fontSelect.value !== "custom";
      if (shadow.activeElement !== elements.customFontInput) {
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
        if (style && style.dataset.owner === HOST_ID) {
          style.remove();
        }
        return;
      }

      if (!style) {
        style = document.createElement("style");
        style.id = CUSTOM_FONT_STYLE_ID;
        style.dataset.owner = HOST_ID;
        (document.head || document.documentElement).appendChild(style);
      }

      style.textContent = `@font-face { font-family: "${CUSTOM_FONT_ALIAS}"; src: ${candidates
        .map((name) => `local("${cssString(name)}")`)
        .join(", ")}; font-display: swap; }`;
    }

    function removeCustomFontFace() {
      const style = document.getElementById(CUSTOM_FONT_STYLE_ID);
      if (style && style.dataset.owner === HOST_ID) {
        style.remove();
      }
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

    function renderPayload(payload) {
      const data = payload || {};
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
  }

  function buildOverlayCss(cssText) {
    const scopedReaderCss = cssText
      .replace(/:root\s*\{/g, "#quietReaderFrame {")
      .replace(/body(\[data-theme=\"[^\"]+\"\])\s*\{/g, "#quietReaderFrame$1 {")
      .replace(/body\s*\{/g, "#quietReaderFrame {")
      .replace(/html\s*\{[^}]*\}/g, "");

    return `
      :host {
        all: initial;
        position: fixed;
        inset: 0;
        z-index: 2147483647;
      }

      #quietReaderFrame {
        width: 100vw;
        height: 100vh;
        overflow-x: hidden;
        overflow-y: auto;
        overscroll-behavior: contain;
        isolation: isolate;
      }

      @supports (height: 100dvh) {
        #quietReaderFrame {
          height: 100dvh;
        }
      }

      ${scopedReaderCss}

      #quietReaderFrame {
        min-width: 0;
      }

      .close-button {
        flex: 0 0 auto;
        width: auto;
        min-height: 32px;
        border: 1px solid var(--hairline);
        background: var(--control-bg);
        color: var(--page-text);
        padding: 0 10px;
        font: inherit;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
      }

      .close-button:hover {
        background: var(--control-hover-bg);
      }

      .close-button:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
      }

      @media (max-width: 620px) {
        .close-button {
          width: auto;
          flex-basis: auto;
          min-width: 0;
        }
      }
    `;
  }
})();
