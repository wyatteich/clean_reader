const PAYLOAD_PREFIX = "quiet-reader:";

chrome.runtime.onMessage.addListener((message, sender) => {
  if (
    message &&
    message.type === "quiet-reader:open-obsidian" &&
    typeof message.uri === "string" &&
    sender.tab &&
    typeof sender.tab.id === "number"
  ) {
    chrome.tabs.update(sender.tab.id, { url: message.uri });
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab || typeof tab.id !== "number") {
    await openReaderError(
      "Clean Reader can only open regular web pages.",
      "Try it from an article page that starts with http:// or https://.",
      tab
    );
    return;
  }

  if (tab.url && !isWebPage(tab.url)) {
    await openReaderError(
      "Clean Reader can only open regular web pages.",
      "Try it from an article page that starts with http:// or https://.",
      tab
    );
    return;
  }

  try {
    const [injection] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["extractor.js"]
    });

    const article = injection && injection.result;
    if (!article || !article.content || article.textLength < 250) {
      await showReaderOverlay(tab.id, {
        error: true,
        title: "Clean Reader could not find enough article text on this page.",
        message: "Some pages hide their content from extensions or do not expose a clear article body.",
        sourceUrl: tab.url || "",
        siteName: "Clean Reader",
        capturedAt: new Date().toISOString()
      });
      return;
    }

    await showReaderOverlay(tab.id, {
      ...article,
      sourceUrl: tab.url || article.sourceUrl || "",
      capturedAt: new Date().toISOString()
    });
  } catch (error) {
    await openReaderError(
      "Brave blocked Clean Reader from reading this page.",
      "Internal browser pages, the Chrome Web Store, PDFs, and some protected pages cannot be opened by extensions.",
      tab,
      error
    );
  }
});

function isWebPage(url) {
  return /^https?:\/\//i.test(url || "");
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function readerUrl(id) {
  return chrome.runtime.getURL(`reader.html?id=${encodeURIComponent(id)}`);
}

async function showReaderOverlay(tabId, payload) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["overlay.js"]
  });

  await chrome.scripting.executeScript({
    target: { tabId },
    func: (article) => {
      if (!globalThis.quietReaderOverlay || typeof globalThis.quietReaderOverlay.show !== "function") {
        throw new Error("Clean Reader overlay renderer was not available.");
      }
      return globalThis.quietReaderOverlay.show(article);
    },
    args: [payload]
  });
}

async function openReaderError(title, message, tab, error) {
  const id = createId();
  await setPayload(id, {
    error: true,
    title,
    message,
    details: error && error.message ? error.message : "",
    sourceUrl: tab && tab.url ? tab.url : "",
    siteName: "Clean Reader",
    capturedAt: new Date().toISOString()
  });
  await chrome.tabs.create({ url: readerUrl(id) });
}

function setPayload(id, payload) {
  const key = PAYLOAD_PREFIX + id;
  const area = chrome.storage.session || chrome.storage.local;

  return new Promise((resolve, reject) => {
    area.set({ [key]: payload }, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve();
    });
  });
}
