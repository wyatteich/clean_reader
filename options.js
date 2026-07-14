const OBSIDIAN_SETTINGS_KEY = "quiet-reader:obsidian-settings";

const elements = {
  vaultInput: document.getElementById("vaultInput"),
  folderInput: document.getElementById("folderInput"),
  tagsInput: document.getElementById("tagsInput"),
  settingsStatus: document.getElementById("settingsStatus")
};

init();

async function init() {
  const settings = await getSettings();
  elements.vaultInput.value = settings.vault;
  elements.folderInput.value = settings.folder;
  elements.tagsInput.value = settings.tags;

  elements.vaultInput.addEventListener("change", save);
  elements.folderInput.addEventListener("change", save);
  elements.tagsInput.addEventListener("change", save);
}

function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(OBSIDIAN_SETTINGS_KEY, (result) => {
      const stored = (result && result[OBSIDIAN_SETTINGS_KEY]) || {};
      resolve({ vault: "", folder: "", tags: "", ...stored });
    });
  });
}

function save() {
  const settings = {
    vault: elements.vaultInput.value.trim(),
    folder: elements.folderInput.value.trim(),
    tags: elements.tagsInput.value.trim()
  };

  chrome.storage.local.set({ [OBSIDIAN_SETTINGS_KEY]: settings }, () => {
    showSaved();
  });
}

function showSaved() {
  elements.settingsStatus.textContent = "Saved";
  setTimeout(() => {
    elements.settingsStatus.textContent = "";
  }, 1600);
}
