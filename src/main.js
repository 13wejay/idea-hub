import { store } from "./store.js";
import { ui } from "./ui.js";
import { collab } from "./collab.js";

document.addEventListener("DOMContentLoaded", () => {
  store.init();
  collab.init();
  ui.init();

  // Register Service Worker
  if ("serviceWorker" in navigator && import.meta.env?.PROD) {
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

  // Check for Share Target data (PWA share from mobile OS)
  const urlParams = new URLSearchParams(window.location.search);
  const title = urlParams.get("title");
  const text = urlParams.get("text");
  const url = urlParams.get("url");

  if (title || text || url) {
    let targetUrl = url;
    let targetTitle = title;
    let targetNote = text;

    if (!targetUrl && text) {
      const urlMatch = text.match(/(https?:\/\/[^\s]+)/);
      if (urlMatch) {
        targetUrl = urlMatch[1];
        const note = text.replace(targetUrl, "").trim();
        if (!targetTitle && note) {
          targetTitle = note;
        }
      }
    }

    if (targetUrl || targetTitle || targetNote) {
      ui.openAddModal();
      const linkInput = document.getElementById("link-input");
      const titleInput = document.getElementById("title-input");
      const noteInput = document.getElementById("note-input");
      if (linkInput && targetUrl) linkInput.value = targetUrl;
      if (titleInput && targetTitle) titleInput.value = targetTitle;
      if (noteInput && targetNote && targetNote !== targetTitle) noteInput.value = targetNote;

      window.history.replaceState({}, document.title, "/");
    }
  }
});
