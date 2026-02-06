# AI Accessibility Extension

A Plasmo browser extension built to improve accessibility and reduce cognitive overload on content-heavy websites.  
Developed as part of an NTU hackathon to help users navigate websites more easily.

---

## 🚀 Overview

The extension helps users by:

- Detecting cluttered or overwhelming pages using a "clutter score"
- Highlighting important links and images for quick navigation
- Providing a popup interface for easy access to top content
- Reducing cognitive load on websites like Amazon

Built with Plasmo, React, and TypeScript/JavaScript, it is extendable with AI-based scoring and accessibility enhancements.

---

## 🧩 Features

- Automatic detection of cognitive overload
- Scoring system for links and images
- Visual highlights for top content
- Popup interface for quick navigation
- Fully extendable for AI or accessibility improvements

---

## 🛠 Getting Started

### 1. Run the Development Server

```bash
pnpm dev
# or
npm run dev

2. Load the Extension in Chrome or Edge

Open the Extensions page:

Chrome: chrome://extensions/

Edge: edge://extensions/

Enable Developer mode (toggle on the top-right)

Click Load unpacked

Select the development build folder (build/chrome-mv3-dev)

The extension will appear in the browser toolbar

3. Start Editing

Popup: Modify popup.tsx. Changes auto-update in the browser.

Options page: Add options.tsx at the project root with a default exported React component.

Content script: Add content.ts at the root to run logic on web pages, then reload the extension.

For full guidance, see the Plasmo documentation
.

🏗 Production Build
pnpm build
# or
npm run build


Create your own API key using Gemini AI Studio and test it in our .env.example file and rename the file to .env


This creates a production-ready bundle ready for submission to webstores.

📦 Submitting to Webstores

Use the built-in bpp GitHub action
 for automated submissions:

Build the extension (pnpm build or npm run build)

Upload the first version manually to the store to establish credentials

Configure the GitHub Action following setup instructions

Future submissions can then be automated directly from GitHub