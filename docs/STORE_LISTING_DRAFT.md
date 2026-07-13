# Chrome Web Store Listing Draft

## Name

Clean Reader

## Short Description

Show articles in a clean reader overlay with typography controls.

## Detailed Description

Clean Reader turns article pages into a calm, same-tab reader overlay with better typography controls.

Choose a font, enter a custom local font name, adjust text size, line spacing, and column width, and switch between white, light, sepia, dark, and night themes. Preferences are saved locally in your browser.

Clean Reader runs only when you click the extension button. It does not use analytics, tracking, ads, remote code, accounts, or a server.

## Single Purpose

Clean Reader provides a same-tab reader overlay for article pages with local typography and theme controls.

## Permission Justifications

### activeTab

Used to read the current page only after the user clicks the extension button.

### scripting

Used to inject the article extractor and reader overlay into the active tab.

### storage

Used to save local typography and theme preferences.

## User Data Disclosure

Clean Reader does not collect or transmit user data. Reader preferences are stored locally with `chrome.storage.local`.

## Test Instructions

1. Install the extension.
2. Open a normal article page.
3. Click the Clean Reader toolbar button.
4. Confirm that the same-tab reader overlay appears.
5. Adjust font, size, spacing, width, and theme.
6. Close the overlay and reopen it to confirm preferences persist.
