import { store } from "./store.js";
import { ui } from "./ui.js";

document.addEventListener("DOMContentLoaded", () => {
  store.init();
  ui.init();

  // Register Service Worker
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log(
            "ServiceWorker registration successful with scope: ",
            registration.scope,
          );
        })
        .catch((err) => {
          console.log("ServiceWorker registration failed: ", err);
        });
    });
  }

  // Check for Share Target data
  const urlParams = new URLSearchParams(window.location.search);
  const title = urlParams.get("title");
  const text = urlParams.get("text");
  const url = urlParams.get("url");

  if (title || text || url) {
    // Simple heuristic to find the URL in the text if 'url' param is empty (common in Android shares)
    let targetUrl = url;
    let targetTitle = title;

    if (!targetUrl && text) {
      const urlMatch = text.match(/(https?:\/\/[^\s]+)/);
      if (urlMatch) {
        targetUrl = urlMatch[1];
        // Remove URL from text to get title/note
        const note = text.replace(targetUrl, "").trim();
        // If title is empty, use the note
        if (!targetTitle && note) {
          targetTitle = note;
        }
      }
    }

    if (targetUrl) {
      ui.openAddModal();
      // Pre-fill
      const linkInput = document.getElementById("link-input");
      const titleInput = document.getElementById("title-input");
      if (linkInput) linkInput.value = targetUrl;
      if (titleInput && targetTitle) titleInput.value = targetTitle;

      // Clean URL
      window.history.replaceState({}, document.title, "/");
    }
  }
});
