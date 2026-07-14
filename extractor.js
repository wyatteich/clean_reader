(() => {
  const POSITIVE_RE = /\b(article|body|content|entry|hentry|main|page|post|story|text)\b/i;
  const NEGATIVE_RE = /\b(ad|advert|aside|banner|bio|breadcrumb|byline|caption|comment|community|cookie|footer|hidden|label|menu|meta|modal|nav|outbrain|promo|related|remark|share|sidebar|sponsor|subscribe|tag|toolbar|widget)\b/i;
  const STRIP_SELECTOR = [
    "script",
    "style",
    "noscript",
    "template",
    "iframe",
    "object",
    "embed",
    "form",
    "input",
    "button",
    "select",
    "textarea",
    "nav",
    "aside",
    "footer",
    "[role='navigation']",
    "[aria-hidden='true']",
    "[hidden]",
    ".ad",
    ".ads",
    ".advert",
    ".advertisement",
    ".newsletter",
    ".paywall",
    ".promo",
    ".related",
    ".share",
    ".social",
    ".sponsored",
    ".subscribe"
  ].join(",");

  const ALLOWED_TAGS = new Set([
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

  const REMOVED_TAGS = new Set([
    "script",
    "style",
    "noscript",
    "template",
    "iframe",
    "object",
    "embed",
    "form"
  ]);

  const candidate = findBestCandidate();
  const title = getTitle(candidate);
  const pageFont = getArticleFont(candidate);
  const clone = cleanClone(candidate, title);
  const content = sanitizeArticleHtml(clone);
  const text = textOf(clone);
  const wordCount = countWords(text);

  return {
    title,
    byline: getByline(),
    siteName: getSiteName(),
    excerpt: getExcerpt(),
    published: getPublished(candidate),
    content,
    textLength: text.length,
    wordCount,
    direction: document.dir || document.documentElement.getAttribute("dir") || "auto",
    pageFont,
    sourceUrl: location.href,
    scrollPercent: getScrollPercent()
  };

  function getScrollPercent() {
    const scrollable = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0);
    if (scrollable <= 0) {
      return 0;
    }
    return Math.min(1, Math.max(0, window.scrollY / scrollable));
  }

  function findBestCandidate() {
    const candidates = new Set();
    document.querySelectorAll("article, main, [role='main'], section, div").forEach((element) => {
      const text = textOf(element);
      if (text.length >= 250 && element.querySelector("p, li, h1, h2")) {
        candidates.add(element);
      }
    });

    if (!candidates.size) {
      return document.body;
    }

    let best = document.body;
    let bestScore = scoreElement(document.body);
    candidates.forEach((element) => {
      const score = scoreElement(element);
      if (score > bestScore) {
        best = element;
        bestScore = score;
      }
    });

    return best || document.body;
  }

  function scoreElement(element) {
    const text = textOf(element);
    if (text.length < 250) {
      return -1000;
    }

    let score = Math.min(text.length / 120, 80);
    const tag = element.tagName.toLowerCase();

    if (tag === "article") score += 45;
    if (tag === "main") score += 30;
    if (tag === "section") score += 10;

    const classAndId = `${element.className || ""} ${element.id || ""}`;
    if (POSITIVE_RE.test(classAndId)) score += 35;
    if (NEGATIVE_RE.test(classAndId)) score -= 45;

    const paragraphs = Array.from(element.querySelectorAll("p, li"));
    let paragraphScore = 0;
    paragraphs.forEach((paragraph) => {
      const paragraphText = textOf(paragraph);
      if (paragraphText.length < 35) {
        return;
      }
      paragraphScore += Math.min(Math.sqrt(paragraphText.length), 28);
      if (/[.!?]["')\]]?$/.test(paragraphText)) {
        paragraphScore += 2;
      }
    });
    score += paragraphScore;

    const linkText = Array.from(element.querySelectorAll("a"))
      .map((link) => textOf(link))
      .join(" ");
    const linkDensity = linkText.length / Math.max(text.length, 1);
    score -= linkDensity * 130;

    const controlCount = element.querySelectorAll("button, input, select, textarea, nav, aside, footer").length;
    score -= controlCount * 5;

    const headingCount = element.querySelectorAll("h1, h2, h3").length;
    if (headingCount > 0 && headingCount < 8) {
      score += 8;
    }

    return score;
  }

  function cleanClone(element, title) {
    const clone = element.cloneNode(true);
    clone.querySelectorAll(STRIP_SELECTOR).forEach((node) => node.remove());

    clone.querySelectorAll("*").forEach((node) => {
      const classAndId = `${node.className || ""} ${node.id || ""}`;
      if (NEGATIVE_RE.test(classAndId) && !POSITIVE_RE.test(classAndId) && textOf(node).length < 500) {
        node.remove();
      }
    });

    clone.querySelectorAll("img").forEach((img) => {
      const source = firstImageSource(img);
      if (!source) {
        img.remove();
        return;
      }
      img.setAttribute("src", source);
      if (!img.getAttribute("alt")) {
        img.setAttribute("alt", "");
      }
    });

    clone.querySelectorAll("p, li, blockquote, figcaption").forEach((node) => {
      if (!textOf(node) && !node.querySelector("img")) {
        node.remove();
      }
    });

    const firstHeading = clone.querySelector("h1");
    if (firstHeading && sameTitle(textOf(firstHeading), title)) {
      firstHeading.remove();
    }

    return clone;
  }

  function sanitizeArticleHtml(root) {
    Array.from(root.querySelectorAll("*")).forEach((element) => {
      const tag = element.tagName.toLowerCase();

      if (!ALLOWED_TAGS.has(tag)) {
        if (REMOVED_TAGS.has(tag)) {
          element.remove();
        } else {
          unwrap(element);
        }
        return;
      }

      sanitizeAttributes(element, tag);
    });

    return root.innerHTML.trim();
  }

  function sanitizeAttributes(element, tag) {
    const attrs = Array.from(element.attributes);
    attrs.forEach((attr) => element.removeAttribute(attr.name));

    if (tag === "a") {
      const href = absoluteUrl(attrs.find((attr) => attr.name.toLowerCase() === "href")?.value || "");
      if (href && /^(https?:|mailto:)/i.test(href)) {
        element.setAttribute("href", href);
      }
      return;
    }

    if (tag === "img") {
      const src = absoluteUrl(attrs.find((attr) => attr.name.toLowerCase() === "src")?.value || "");
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
      return;
    }

    if (tag === "td" || tag === "th") {
      const colspan = attrs.find((attr) => attr.name.toLowerCase() === "colspan")?.value || "";
      const rowspan = attrs.find((attr) => attr.name.toLowerCase() === "rowspan")?.value || "";
      if (/^\d{1,2}$/.test(colspan)) element.setAttribute("colspan", colspan);
      if (/^\d{1,2}$/.test(rowspan)) element.setAttribute("rowspan", rowspan);
    }
  }

  function unwrap(element) {
    const parent = element.parentNode;
    if (!parent) return;
    while (element.firstChild) {
      parent.insertBefore(element.firstChild, element);
    }
    parent.removeChild(element);
  }

  function getTitle(candidateElement) {
    const metaTitle = meta("property", "og:title") || meta("name", "twitter:title");
    const h1 = candidateElement && candidateElement.querySelector("h1");
    const fallback = document.title || location.hostname;
    return cleanTitle(metaTitle || (h1 && textOf(h1)) || fallback);
  }

  function getByline() {
    const value =
      meta("name", "author") ||
      meta("property", "article:author") ||
      textFrom("[rel='author']") ||
      textFrom("[class*='byline' i]") ||
      textFrom("[class*='author' i]");
    return value && value.length < 140 ? value : "";
  }

  function getSiteName() {
    return meta("property", "og:site_name") || location.hostname.replace(/^www\./i, "");
  }

  function getExcerpt() {
    return meta("name", "description") || meta("property", "og:description") || "";
  }

  function getPublished(candidateElement) {
    const metaValue =
      meta("property", "article:published_time") ||
      meta("name", "date") ||
      meta("name", "publish-date") ||
      meta("name", "publication_date") ||
      meta("property", "og:updated_time");
    if (metaValue) {
      return metaValue.trim();
    }

    const timeElement = candidateElement && candidateElement.querySelector("time[datetime]");
    return timeElement ? (timeElement.getAttribute("datetime") || "").trim() : "";
  }

  function getArticleFont(element) {
    const samples = Array.from(element.querySelectorAll("p, li, blockquote, article, main"))
      .filter((node) => textOf(node).length >= 80)
      .slice(0, 5);

    samples.push(element, document.body, document.documentElement);

    for (const sample of samples) {
      if (!sample) {
        continue;
      }

      const font = cleanFontStack(getComputedStyle(sample).fontFamily);
      if (font) {
        return font;
      }
    }

    return "";
  }

  function cleanFontStack(value) {
    return String(value || "")
      .replace(/[\r\n\t]/g, " ")
      .replace(/[;{}\\]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 220);
  }

  function meta(attribute, value) {
    const element = document.querySelector(`meta[${attribute}='${value}']`);
    return element ? (element.getAttribute("content") || "").trim() : "";
  }

  function textFrom(selector) {
    const element = document.querySelector(selector);
    return element ? textOf(element) : "";
  }

  function textOf(element) {
    return ((element && (element.innerText || element.textContent)) || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function cleanTitle(title) {
    const compact = (title || "").replace(/\s+/g, " ").trim();
    const separators = [" | ", " - ", " :: "];
    for (const separator of separators) {
      const parts = compact.split(separator).filter(Boolean);
      if (parts.length > 1) {
        return parts.sort((a, b) => b.length - a.length)[0].trim();
      }
    }
    return compact || "Untitled article";
  }

  function sameTitle(a, b) {
    return normalizeTitle(a) === normalizeTitle(b);
  }

  function normalizeTitle(value) {
    return (value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  }

  function firstImageSource(img) {
    const lazyAttrs = ["data-src", "data-original", "data-lazy-src", "data-url", "data-lazy", "data-actualsrc"];
    for (const attr of lazyAttrs) {
      const value = img.getAttribute(attr);
      if (value) {
        return absoluteUrl(value);
      }
    }

    const lazySrcset = firstFromSrcset(img.getAttribute("data-srcset"));
    if (lazySrcset) {
      return absoluteUrl(lazySrcset);
    }

    const picture = img.closest("picture");
    if (picture) {
      const source = Array.from(picture.querySelectorAll("source")).find(
        (candidate) => candidate.getAttribute("srcset") || candidate.getAttribute("data-srcset")
      );
      if (source) {
        const candidate = firstFromSrcset(source.getAttribute("srcset") || source.getAttribute("data-srcset"));
        if (candidate) {
          return absoluteUrl(candidate);
        }
      }
    }

    // A `src` present alongside lazy-load attributes above is usually a
    // placeholder (tracking pixel / blur-up), so it's only trusted once
    // real lazy sources are ruled out. A data: URI is never useful here
    // since the sanitizer only allows http(s) image sources.
    const src = img.getAttribute("src");
    if (src && !/^data:/i.test(src)) {
      return absoluteUrl(src);
    }

    const srcset = firstFromSrcset(img.getAttribute("srcset"));
    return srcset ? absoluteUrl(srcset) : "";
  }

  function firstFromSrcset(srcset) {
    return (
      (srcset || "")
        .split(",")
        .map((entry) => entry.trim().split(/\s+/)[0])
        .find(Boolean) || ""
    );
  }

  function absoluteUrl(value) {
    if (!value) return "";
    try {
      return new URL(value, location.href).href;
    } catch {
      return "";
    }
  }

  function countWords(text) {
    const matches = (text || "").match(/\b[\w'-]+\b/g);
    return matches ? matches.length : 0;
  }
})();
