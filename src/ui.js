import { store } from "./store.js";
import { collab } from "./collab.js";

// DOM Elements
const app = document.getElementById("app");
const postList = document.getElementById("post-list");
const categoryScroller = document.getElementById("category-scroller");
const addModal = document.getElementById("add-modal");
const addModalContent = document.getElementById("add-modal-content");
const addModalBackdrop = document.getElementById("add-modal-backdrop");
const addBtn = document.getElementById("add-btn");
const addForm = document.getElementById("add-form");
const folderSelectContainer = document.getElementById("folder-select-container");
const viewModal = document.getElementById("view-modal");
const viewFrame = document.getElementById("view-frame");
const viewModalTitle = document.getElementById("view-modal-title");
const closeViewBtn = document.getElementById("close-view-btn");
const externalLinkBtn = document.getElementById("external-link-btn");
const iframeFallback = document.getElementById("iframe-fallback");
const fallbackLink = document.getElementById("fallback-link");
const persistentExternalBtn = document.getElementById("persistent-external-btn");

// Settings Elements
const settingsModal = document.getElementById("settings-modal");
const closeSettingsBtn = document.getElementById("close-settings-btn");
const settingsFolderList = document.getElementById("settings-folder-list");
const settingsAddFolderBtn = document.getElementById("settings-add-folder-btn");

// Delete Modal Elements
const deleteModal = document.getElementById("delete-confirm-modal");
const deleteModalTitle = document.getElementById("delete-modal-title");
const deleteModalDesc = document.getElementById("delete-modal-desc");
const cancelDeleteBtn = document.getElementById("cancel-delete-btn");
const confirmDeleteBtn = document.getElementById("confirm-delete-btn");

// Helper to get embed URL
function getEmbedUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    if (u.hostname === "youtu.be") {
      const v = u.pathname.slice(1);
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    return url;
  } catch (e) {
    return url;
  }
}

// Helper to check if a URL can be embedded in an iframe without triggering X-Frame-Options / CSP errors
function canEmbedUrl(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();

    // Whitelist: Known embeddable services
    if (
      host.includes("youtube.com") ||
      host === "youtu.be" ||
      host.includes("player.vimeo.com") ||
      host.includes("open.spotify.com") ||
      host.includes("codepen.io") ||
      host.includes("figma.com") ||
      host.includes("wikipedia.org")
    ) {
      return true;
    }

    // Blacklist: Sites known to set X-Frame-Options: deny/sameorigin or CSP frame-ancestors
    const blockedDomains = [
      "instagram.com",
      "facebook.com",
      "twitter.com",
      "x.com",
      "linkedin.com",
      "tiktok.com",
      "github.com",
      "reddit.com",
      "medium.com",
      "stackoverflow.com",
      "google.com",
      "apple.com",
      "netflix.com",
      "amazon.com",
      "pinterest.com",
      "threads.net",
      "quora.com",
      "substack.com",
      "dribbble.com",
      "behance.net",
      "notion.so",
      "notion.site",
      "nytimes.com",
      "wsj.com",
      "bbc.com",
      "cnn.com",
      "discord.com",
      "slack.com",
      "twitch.tv",
    ];

    if (blockedDomains.some((domain) => host.includes(domain))) {
      return false;
    }

    return true;
  } catch (e) {
    return false;
  }
}

export const ui = {
  // State
  currentFolderId: "all",
  selectedFolderForNewPost: "uncategorized",
  editingPostId: null,
  searchQuery: "",
  filterType: "all",
  activeTag: null,
  sortBy: "newest",
  viewMode: localStorage.getItem("ideahub_view_mode") || "grid",

  init() {
    this.applyViewMode();
    this.renderCategories();
    this.renderPosts();
    this.setupEventListeners();
    this.setupSettingsListener();
    this.setupCollabListeners();

    // Re-render when store updates (from tabs, live rooms, or edits)
    store.subscribe(() => {
      this.renderCategories();
      this.renderPosts();
    });
  },

  applyViewMode(render = false) {
    const gridBtn = document.getElementById("view-grid-btn");
    const listBtn = document.getElementById("view-list-btn");
    if (this.viewMode === "list") {
      postList.classList.add("view-list");
      gridBtn?.classList.remove("bg-slate-800", "text-white", "font-semibold");
      gridBtn?.classList.add("text-slate-600", "hover:text-slate-900", "hover:bg-slate-100");
      listBtn?.classList.add("bg-slate-800", "text-white", "font-semibold");
      listBtn?.classList.remove("text-slate-600", "hover:text-slate-900", "hover:bg-slate-100");
    } else {
      postList.classList.remove("view-list");
      listBtn?.classList.remove("bg-slate-800", "text-white", "font-semibold");
      listBtn?.classList.add("text-slate-600", "hover:text-slate-900", "hover:bg-slate-100");
      gridBtn?.classList.add("bg-slate-800", "text-white", "font-semibold");
      gridBtn?.classList.remove("text-slate-600", "hover:text-slate-900", "hover:bg-slate-100");
    }
    if (render && typeof this.renderPosts === "function") {
      this.renderPosts();
    }
  },

  showToast(message, type = "default") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const el = document.createElement("div");
    el.className =
      "pointer-events-auto px-4 py-2.5 rounded-2xl shadow-xl backdrop-blur-md text-sm font-semibold flex items-center space-x-2 animate-toast " +
      (type === "error"
        ? "bg-red-500/90 text-white"
        : type === "success"
          ? "bg-emerald-500/90 text-white"
          : "bg-slate-900/90 text-white");

    el.innerHTML = `<span>${message}</span>`;
    container.appendChild(el);

    setTimeout(() => {
      el.style.transition = "all 0.3s ease-in";
      el.style.opacity = "0";
      el.style.transform = "translateY(10px)";
      setTimeout(() => el.remove(), 300);
    }, 3000);
  },

  setupEventListeners() {
    // Search input
    const searchInput = document.getElementById("search-input");
    const searchClear = document.getElementById("search-clear-btn");
    searchInput?.addEventListener("input", (e) => {
      this.searchQuery = e.target.value;
      if (this.searchQuery.trim()) {
        searchClear?.classList.remove("hidden");
      } else {
        searchClear?.classList.add("hidden");
      }
      this.renderPosts();
    });

    searchClear?.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      this.searchQuery = "";
      searchClear.classList.add("hidden");
      this.renderPosts();
    });

    // Type Filter Buttons
    document.querySelectorAll(".type-filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document
          .querySelectorAll(".type-filter-btn")
          .forEach((b) => b.classList.remove("active-type-filter"));
        btn.classList.add("active-type-filter");
        this.filterType = btn.dataset.typeFilter || "all";
        this.renderPosts();
      });
    });

    // Sort Dropdown
    document
      .getElementById("sort-select")
      ?.addEventListener("change", (e) => {
        this.sortBy = e.target.value;
        this.renderPosts();
      });

    // View Mode Switcher
    document.getElementById("view-grid-btn")?.addEventListener("click", () => {
      this.viewMode = "grid";
      localStorage.setItem("ideahub_view_mode", "grid");
      this.applyViewMode(true);
    });
    document.getElementById("view-list-btn")?.addEventListener("click", () => {
      this.viewMode = "list";
      localStorage.setItem("ideahub_view_mode", "list");
      this.applyViewMode(true);
    });

    // Tag Clear Button
    document.getElementById("clear-tag-btn")?.addEventListener("click", () => {
      this.activeTag = null;
      document.getElementById("active-tag-filter")?.classList.add("hidden");
      document.getElementById("active-tag-filter")?.classList.remove("flex");
      this.renderPosts();
    });

    // Modal Toggles
    addBtn.addEventListener("click", () => this.openAddModal());
    addModalBackdrop.addEventListener("click", () => this.closeAddModal());
    document
      .getElementById("close-add-modal-btn")
      ?.addEventListener("click", () => this.closeAddModal());

    // Idea Type Tabs in Add Modal (Link vs Note)
    const tabLinkBtn = document.getElementById("tab-link-btn");
    const tabNoteBtn = document.getElementById("tab-note-btn");
    const urlContainer = document.getElementById("url-field-container");
    const ideaTypeInput = document.getElementById("idea-type-input");

    tabLinkBtn?.addEventListener("click", () => {
      ideaTypeInput.value = "link";
      tabLinkBtn.className =
        "flex-1 py-2 rounded-lg font-medium text-sm transition-all flex items-center justify-center space-x-2 bg-white text-slate-900 shadow-sm";
      tabNoteBtn.className =
        "flex-1 py-2 rounded-lg font-medium text-sm text-slate-500 hover:text-slate-900 transition-all flex items-center justify-center space-x-2";
      urlContainer?.classList.remove("hidden");
    });

    tabNoteBtn?.addEventListener("click", () => {
      ideaTypeInput.value = "note";
      tabNoteBtn.className =
        "flex-1 py-2 rounded-lg font-medium text-sm transition-all flex items-center justify-center space-x-2 bg-white text-slate-900 shadow-sm";
      tabLinkBtn.className =
        "flex-1 py-2 rounded-lg font-medium text-sm text-slate-500 hover:text-slate-900 transition-all flex items-center justify-center space-x-2";
      urlContainer?.classList.add("hidden");
    });

    // Color Swatch Selection
    document.querySelectorAll(".color-swatch-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document
          .querySelectorAll(".color-swatch-btn")
          .forEach((b) => b.classList.remove("active-swatch"));
        btn.classList.add("active-swatch");
        document.getElementById("color-input").value =
          btn.dataset.color || "default";
      });
    });

    // Add/Edit Form Submit
    addForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const type = document.getElementById("idea-type-input").value;
      const url = document.getElementById("link-input").value;
      const title = document.getElementById("title-input").value;
      const note = document.getElementById("note-input").value;
      const tagsRaw = document.getElementById("tags-input").value;
      const color = document.getElementById("color-input").value;
      const isPinned = document.getElementById("pin-input").checked;

      const tags = tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      if (type === "link" && !url.trim() && !this.editingPostId) {
        this.showToast("Please enter a valid Link URL", "error");
        return;
      }

      if (this.editingPostId) {
        store.updatePost(this.editingPostId, {
          url,
          title,
          note,
          type,
          folderId: this.selectedFolderForNewPost,
          tags,
          color,
          isPinned,
        });
        this.showToast("Idea updated ✨");
      } else {
        store.addPost({
          url,
          title,
          note,
          type,
          folderId: this.selectedFolderForNewPost,
          tags,
          color,
          isPinned,
        });
        this.showToast("New idea saved ✨", "success");
      }

      this.closeAddModal();
      this.renderPosts();
      addForm.reset();
      this.selectedFolderForNewPost = "uncategorized";
      this.editingPostId = null;
    });

    // View Modal
    closeViewBtn.addEventListener("click", () => {
      viewModal.classList.add("hidden");
      viewFrame.src = "";
    });

    // Auto title fetching
    const linkInput = document.getElementById("link-input");
    const titleInput = document.getElementById("title-input");

    const handleUrlChange = async () => {
      const url = linkInput.value.trim();
      if (url && !titleInput.value.trim()) {
        titleInput.setAttribute("placeholder", "Fetching title...");
        const title = await this.fetchPageTitle(url);
        if (title && !titleInput.value.trim()) {
          titleInput.value = title;
        }
        titleInput.setAttribute(
          "placeholder",
          "Give it a catchy title (optional)",
        );
      }
    };
    linkInput?.addEventListener("blur", handleUrlChange);
    linkInput?.addEventListener("paste", () =>
      setTimeout(handleUrlChange, 100),
    );
  },

  setupCollabListeners() {
    const collabBtn = document.getElementById("collab-btn");
    const collabModal = document.getElementById("collab-modal");
    const collabBackdrop = document.getElementById("collab-modal-backdrop");
    const closeCollabBtn = document.getElementById("close-collab-modal-btn");

    collabBtn?.addEventListener("click", () => {
      collabModal?.classList.remove("hidden");
    });
    collabBackdrop?.addEventListener("click", () => {
      collabModal?.classList.add("hidden");
    });
    closeCollabBtn?.addEventListener("click", () => {
      collabModal?.classList.add("hidden");
    });

    // Collab Modal Tabs
    const tabRoomBtn = document.getElementById("collab-tab-room-btn");
    const tabShareBtn = document.getElementById("collab-tab-share-btn");
    const tabRoom = document.getElementById("collab-tab-room");
    const tabShare = document.getElementById("collab-tab-share");

    tabRoomBtn?.addEventListener("click", () => {
      tabRoom?.classList.remove("hidden");
      tabShare?.classList.add("hidden");
      tabRoomBtn.className =
        "flex-1 py-2 rounded-lg font-medium text-sm transition-all bg-white text-slate-900 shadow-sm";
      tabShareBtn.className =
        "flex-1 py-2 rounded-lg font-medium text-sm text-slate-500 hover:text-slate-900 transition-all";
    });

    tabShareBtn?.addEventListener("click", () => {
      tabShare?.classList.remove("hidden");
      tabRoom?.classList.add("hidden");
      tabShareBtn.className =
        "flex-1 py-2 rounded-lg font-medium text-sm transition-all bg-white text-slate-900 shadow-sm";
      tabRoomBtn.className =
        "flex-1 py-2 rounded-lg font-medium text-sm text-slate-500 hover:text-slate-900 transition-all";
    });

    // Create Room
    document
      .getElementById("create-room-btn")
      ?.addEventListener("click", async () => {
        try {
          this.showToast("Creating room...", "default");
          const code = await collab.createRoom();
          this.showToast(`Room created! Code: ${code} 🟢`, "success");
        } catch (err) {
          this.showToast(err.message || "Failed to create room.", "error");
        }
      });

    // Join Room
    document
      .getElementById("join-room-btn")
      ?.addEventListener("click", async () => {
        const input = document.getElementById("join-room-input");
        const code = input?.value?.trim();
        if (!code) {
          this.showToast("Enter a valid Room Code", "error");
          return;
        }
        try {
          this.showToast(`Connecting to ${code}...`, "default");
          await collab.joinRoom(code);
          this.showToast(`Connected to room ${code} 🟢`, "success");
          if (input) input.value = "";
        } catch (err) {
          this.showToast(err.message || "Failed to join room.", "error");
        }
      });

    // Copy Invite Link
    document
      .getElementById("copy-invite-btn")
      ?.addEventListener("click", () => {
        if (!collab.roomCode) return;
        const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${collab.roomCode}`;
        navigator.clipboard.writeText(inviteUrl);
        this.showToast("Invite link copied to clipboard! 📋", "success");
      });

    // Leave Room
    document
      .getElementById("leave-room-btn")
      ?.addEventListener("click", () => {
        collab.leaveRoom();
        this.showToast("Disconnected from room.", "default");
      });

    // Share Entire Board Link
    document
      .getElementById("share-board-link-btn")
      ?.addEventListener("click", () => {
        const url = collab.generateShareUrl(store.exportData());
        navigator.clipboard.writeText(url);
        this.showToast(
          "Shareable board link copied to clipboard! 🔗",
          "success",
        );
      });

    // Export JSON
    document
      .getElementById("export-json-btn")
      ?.addEventListener("click", () => {
        collab.exportJSONFile();
        this.showToast("Idea board exported to JSON! 📥", "success");
      });

    // Import JSON
    const importInput = document.getElementById("import-file-input");
    document
      .getElementById("import-json-btn")
      ?.addEventListener("click", () => {
        importInput?.click();
      });

    importInput?.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const count = await collab.importJSONFile(file);
        this.showToast(`Successfully imported ${count} ideas! 📤`, "success");
        this.renderCategories();
        this.renderPosts();
      } catch (err) {
        this.showToast(err.message || "Import failed", "error");
      }
      e.target.value = "";
    });

    // Listen to Collab Status Changes
    collab.onStatusChange((status) => {
      const btnLabel = document.getElementById("collab-btn-label");
      const collabBtn = document.getElementById("collab-btn");
      const pingEl = document.getElementById("collab-ping");
      const dotEl = document.getElementById("collab-dot");
      const offlineView = document.getElementById("collab-offline-view");
      const onlineView = document.getElementById("collab-online-view");
      const roomCodeEl = document.getElementById("room-code-display");
      const peerCountText = document.getElementById("peer-count-text");

      if (status.isInRoom) {
        if (btnLabel) btnLabel.textContent = `Live (${status.peerCount})`;
        collabBtn?.classList.remove("bg-white", "hover:bg-slate-100", "text-slate-700", "border-slate-200/80");
        collabBtn?.classList.add("bg-emerald-600", "hover:bg-emerald-700", "text-white", "border-emerald-600");
        pingEl?.classList.remove("opacity-0");
        dotEl?.classList.remove("bg-slate-400");
        dotEl?.classList.add("bg-emerald-300");

        offlineView?.classList.add("hidden");
        onlineView?.classList.remove("hidden");
        if (roomCodeEl) roomCodeEl.textContent = status.roomCode;
        if (peerCountText) peerCountText.textContent = status.peerCount;
      } else {
        if (btnLabel) btnLabel.textContent = "Collaborate";
        collabBtn?.classList.add("bg-white", "hover:bg-slate-100", "text-slate-700", "border-slate-200/80");
        collabBtn?.classList.remove("bg-emerald-600", "hover:bg-emerald-700", "text-white", "border-emerald-600");
        pingEl?.classList.add("opacity-0");
        dotEl?.classList.remove("bg-emerald-300");
        dotEl?.classList.add("bg-slate-400");

        offlineView?.classList.remove("hidden");
        onlineView?.classList.add("hidden");
      }
    });

    // Check URL parameters for ?room=JOIN_CODE on startup
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get("room");
    if (roomParam) {
      setTimeout(() => {
        collab.joinRoom(roomParam).then(() => {
          this.showToast(`Connected to room ${roomParam.toUpperCase()} 🟢`, "success");
          window.history.replaceState({}, document.title, window.location.pathname);
        });
      }, 500);
    }

    // Check for shared board #share=... on startup
    setTimeout(() => {
      const sharedData = collab.parseShareUrl();
      if (sharedData) {
        this.showSharePreviewModal(sharedData);
      }
    }, 400);
  },

  showSharePreviewModal(data) {
    const modal = document.getElementById("share-preview-modal");
    const backdrop = document.getElementById("share-preview-backdrop");
    const cancelBtn = document.getElementById("share-preview-cancel-btn");
    const importBtn = document.getElementById("share-preview-import-btn");
    const desc = document.getElementById("share-preview-desc");

    const postCount = Array.isArray(data.posts) ? data.posts.length : 0;
    if (desc) {
      desc.textContent = `You received a shared collection containing ${postCount} idea(s). Would you like to import them into your IdeaHub?`;
    }

    modal?.classList.remove("hidden");

    const close = () => {
      modal?.classList.add("hidden");
    };

    if (backdrop) backdrop.onclick = close;
    if (cancelBtn) cancelBtn.onclick = close;
    if (importBtn) {
      importBtn.onclick = () => {
        const count = store.importData(data, true);
        this.showToast(`Imported ${count} shared idea(s)! 📤`, "success");
        this.renderCategories();
        this.renderPosts();
        close();
      };
    }
  },

  openAddModal(postToEdit = null) {
    addModal.classList.remove("hidden");

    const tabLinkBtn = document.getElementById("tab-link-btn");
    const tabNoteBtn = document.getElementById("tab-note-btn");
    const urlContainer = document.getElementById("url-field-container");
    const ideaTypeInput = document.getElementById("idea-type-input");

    if (postToEdit) {
      this.editingPostId = postToEdit.id;
      document.getElementById("link-input").value = postToEdit.url || "";
      document.getElementById("title-input").value = postToEdit.title || "";
      document.getElementById("note-input").value = postToEdit.note || "";
      document.getElementById("tags-input").value = (
        postToEdit.tags || []
      ).join(", ");
      document.getElementById("pin-input").checked = Boolean(
        postToEdit.isPinned,
      );
      this.selectedFolderForNewPost = postToEdit.folderId || "uncategorized";

      const color = postToEdit.color || "default";
      document.getElementById("color-input").value = color;
      document.querySelectorAll(".color-swatch-btn").forEach((btn) => {
        if (btn.dataset.color === color) {
          btn.classList.add("active-swatch");
        } else {
          btn.classList.remove("active-swatch");
        }
      });

      const type = postToEdit.type || (postToEdit.url ? "link" : "note");
      ideaTypeInput.value = type;
      if (type === "note") {
        tabNoteBtn?.click();
      } else {
        tabLinkBtn?.click();
      }

      const titleEl = document.getElementById("add-modal-title");
      if (titleEl) titleEl.textContent = "Edit Idea";
      document.querySelector("#add-form button[type='submit']").textContent =
        "Update Idea";
    } else {
      this.editingPostId = null;
      addForm.reset();
      this.selectedFolderForNewPost = this.currentFolderId !== "all" ? this.currentFolderId : "uncategorized";
      ideaTypeInput.value = "link";
      tabLinkBtn?.click();

      const titleEl = document.getElementById("add-modal-title");
      if (titleEl) titleEl.textContent = "New Idea";
      document.querySelector("#add-form button[type='submit']").textContent =
        "Save Idea";
    }

    this.renderFolderSelect();
    setTimeout(() => {
      addModalContent.classList.remove("translate-y-full");
    }, 10);
  },

  closeAddModal() {
    addModalContent.classList.add("translate-y-full");
    setTimeout(() => {
      addModal.classList.add("hidden");
    }, 250);
  },

  renderCategories() {
    // Style as Folder View chips with folder icons 📁
    const chipsHtml = store.folders
      .map(
        (folder) => `
      <button 
        class="chip ${this.currentFolderId === folder.id ? "chip-active" : "chip-inactive"}"
        data-id="${folder.id}"
      >
        <span class="text-sm">📁</span>
        <span>${folder.name}</span>
      </button>
    `,
      )
      .join("");

    // Single "+ New Category" dashed button right after the folder list
    const addChipHtml = `
      <button 
        id="add-category-chip-btn"
        class="add-category-chip"
        title="Create a new folder"
      >
        <span>+ New Category</span>
      </button>
    `;

    categoryScroller.innerHTML = chipsHtml + addChipHtml;

    categoryScroller.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        this.currentFolderId = chip.dataset.id;
        this.renderCategories();
        this.renderPosts();
      });
    });

    const addChipBtn = document.getElementById("add-category-chip-btn");
    addChipBtn?.addEventListener("click", () => {
      this.openNewFolderModal();
    });
  },

  setupSettingsListener() {
    const settingsBtn = document.getElementById("settings-btn");
    settingsBtn?.addEventListener("click", () => this.openSettings());
    closeSettingsBtn?.addEventListener("click", () =>
      settingsModal.classList.add("hidden"),
    );
    settingsAddFolderBtn?.addEventListener("click", () =>
      this.openNewFolderModal(),
    );
  },

  openSettings() {
    settingsModal.classList.remove("hidden");
    this.renderSettingsFolders();
  },

  renderSettingsFolders() {
    settingsFolderList.innerHTML = store.folders
      .map((folder) => {
        const canDelete =
          folder.id !== "all" && folder.id !== "uncategorized";

        return `
            <div class="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/60">
                <div class="flex items-center space-x-3">
                    <div class="w-9 h-9 rounded-full bg-white flex items-center justify-center text-slate-500 shadow-sm">
                        <span class="text-base">📁</span>
                    </div>
                    <span class="font-medium text-slate-800">${folder.name}</span>
                </div>
                <div class="flex items-center space-x-1">
                    <button class="p-2 text-slate-400 hover:text-blue-500 hover:bg-white rounded-lg transition-colors edit-folder-btn" data-id="${folder.id}" title="Rename">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    ${
                      canDelete
                        ? `
                    <button class="p-2 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg transition-colors delete-folder-btn" data-id="${folder.id}" title="Delete">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                    `
                        : ""
                    }
                </div>
            </div>
        `;
      })
      .join("");

    settingsFolderList.querySelectorAll(".edit-folder-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const folder = store.folders.find((f) => f.id === btn.dataset.id);
        if (folder) this.openNewFolderModal(folder);
      });
    });

    settingsFolderList.querySelectorAll(".delete-folder-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const folder = store.folders.find((f) => f.id === btn.dataset.id);
        if (folder) {
          this.openDeleteModal(
            `Delete "${folder.name}"?`,
            `This will permanently delete the folder AND ALL ${store.getPostsByFolder(folder.id).length} ideas inside it.`,
            () => {
              store.deleteFolder(folder.id);
              this.renderSettingsFolders();
              this.renderCategories();
              if (this.currentFolderId === folder.id) {
                this.currentFolderId = "all";
              }
              this.renderPosts();
            },
          );
        }
      });
    });
  },

  openDeleteModal(title, description, onConfirm) {
    deleteModal.classList.remove("hidden");
    deleteModalTitle.textContent = title;
    deleteModalDesc.textContent = description;

    const backdrop = document.getElementById("delete-modal-backdrop");

    const close = () => {
      deleteModal.classList.add("hidden");
      confirmDeleteBtn.onclick = null;
      cancelDeleteBtn.onclick = null;
      if (backdrop) backdrop.onclick = null;
    };

    if (backdrop) backdrop.onclick = close;
    cancelDeleteBtn.onclick = close;
    confirmDeleteBtn.onclick = () => {
      onConfirm();
      close();
    };
  },

  renderFolderSelect() {
    folderSelectContainer.innerHTML = store.folders
      .filter((f) => f.id !== "all")
      .map(
        (folder) => `
            <button type="button" 
                class="folder-select-chip folder-chip ${this.selectedFolderForNewPost === folder.id ? "folder-chip-active" : "folder-chip-inactive"}"
                data-id="${folder.id}"
            >
                <span>📁</span>
                <span>${folder.name}</span>
            </button>
        `,
      )
      .join("");

    const addFolderBtn = document.createElement("button");
    addFolderBtn.type = "button";
    addFolderBtn.className =
      "px-3 py-1.5 rounded-lg border border-dashed border-slate-400 text-slate-500 text-xs font-medium hover:bg-white/40 flex items-center space-x-1";
    addFolderBtn.innerHTML = `<span>+ New</span>`;
    addFolderBtn.onclick = () => {
      this.openNewFolderModal();
    };
    folderSelectContainer.appendChild(addFolderBtn);

    folderSelectContainer
      .querySelectorAll(".folder-select-chip")
      .forEach((chip) => {
        chip.addEventListener("click", () => {
          this.selectedFolderForNewPost = chip.dataset.id;
          this.renderFolderSelect();
        });
      });
  },

  openNewFolderModal(editingFolder = null) {
    const modal = document.getElementById("new-folder-modal");
    const input = document.getElementById("new-folder-input");
    const cancelBtn = document.getElementById("cancel-folder-btn");
    const confirmBtn = document.getElementById("confirm-folder-btn");
    const title = modal.querySelector("h3");

    modal.classList.remove("hidden");
    input.value = editingFolder ? editingFolder.name : "";
    title.textContent = editingFolder ? "Rename Folder" : "Create Folder";
    confirmBtn.textContent = editingFolder ? "Save" : "Create";
    input.focus();

    const close = () => {
      modal.classList.add("hidden");
      cancelBtn.onclick = null;
      confirmBtn.onclick = null;
    };

    cancelBtn.onclick = close;

    confirmBtn.onclick = () => {
      const name = input.value.trim();
      if (name) {
        if (editingFolder) {
          store.updateFolder(editingFolder.id, name);
          this.renderSettingsFolders();
          this.renderCategories();
          this.renderPosts();
        } else {
          const newFolder = store.addFolder(name);
          if (newFolder) {
            this.selectedFolderForNewPost = newFolder.id;
            this.renderCategories();
            this.renderFolderSelect();
            if (!settingsModal.classList.contains("hidden")) {
              this.renderSettingsFolders();
            }
          }
        }
        close();
      }
    };
  },

  renderPosts() {
    const posts = store.searchPosts({
      query: this.searchQuery,
      folderId: this.currentFolderId,
      filterType: this.filterType,
      tag: this.activeTag,
      sortBy: this.sortBy,
    });

    postList.innerHTML = "";

    if (posts.length === 0) {
      postList.innerHTML = `
            <div class="col-span-full text-center my-16 text-slate-500 flex flex-col items-center">
                <div class="w-16 h-16 rounded-3xl bg-slate-200/60 flex items-center justify-center mb-4 text-2xl">
                    ${this.searchQuery || this.activeTag || this.filterType !== "all" ? "🔍" : "💡"}
                </div>
                <p class="font-semibold text-slate-700 text-base mb-1">
                  ${this.searchQuery || this.activeTag || this.filterType !== "all" ? "No matching ideas found" : "No ideas here yet"}
                </p>
                <p class="text-xs text-slate-400 max-w-xs">
                  ${this.searchQuery || this.activeTag || this.filterType !== "all" ? "Try clearing your filters or search terms above." : "Tap the '+ New Idea' button below to capture links, notes, or inspiration!"}
                </p>
            </div>
        `;
      return;
    }

    posts.forEach((post) => {
      const el = document.createElement("div");
      el.className = `post-item-container group animate-fade-in w-full`;

      const domain = post.url
        ? (() => {
            try {
              return new URL(post.url).hostname.replace(/^www\./, "");
            } catch (e) {
              return post.url;
            }
          })()
        : null;

      const faviconUrl = domain
        ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
        : null;

      const folderName =
        store.folders.find((f) => f.id === post.folderId)?.name ||
        "Uncategorized";

      const tagsHtml =
        post.tags && post.tags.length > 0
          ? `<div class="flex flex-wrap gap-1.5 mt-2.5">
              ${post.tags
                .map(
                  (tag) =>
                    `<button type="button" class="tag-pill-btn px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 hover:text-slate-900 text-[11px] font-medium text-slate-600 transition-colors" data-tag="${tag}">${tag}</button>`,
                )
                .join("")}
             </div>`
          : "";

      const isListView = this.viewMode === "list";

      if (isListView) {
        el.innerHTML = `
          <div class="post-delete-bg">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2v2"></path></svg>
          </div>
          <div class="post-edit-bg">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </div>
          <div class="post-content bg-white border border-slate-200/80 rounded-xl px-4 py-3 hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-between gap-3 w-full" style="transform: translateX(0px);">
            <!-- Left Info -->
            <div class="flex items-center space-x-3 min-w-0 flex-1">
              ${
                faviconUrl
                  ? `<img src="${faviconUrl}" alt="favicon" class="w-4 h-4 rounded-sm flex-shrink-0" />`
                  : `<span class="text-base flex-shrink-0">📝</span>`
              }
              <h3 class="font-bold text-slate-900 text-sm sm:text-base mr-1 flex-shrink-0 cursor-pointer post-title-trigger hover:text-primary transition-colors">
                ${post.title}
              </h3>
              <span class="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/60 flex items-center space-x-1 flex-shrink-0">
                <span>📁</span>
                <span>${folderName}</span>
              </span>
              ${
                post.note
                  ? `<span class="text-xs text-slate-500 truncate hidden md:inline min-w-0">${post.note.replace(/\r?\n/g, " ")}</span>`
                  : post.url
                    ? `<a href="${post.url}" target="_blank" rel="noopener noreferrer" class="text-xs text-slate-400 hover:text-primary truncate hidden md:inline min-w-0" onclick="event.stopPropagation()">${domain}</a>`
                    : ""
              }
              ${
                post.tags && post.tags.length > 0
                  ? `<button type="button" class="tag-pill-btn text-[10px] hidden lg:inline-flex bg-slate-100 hover:bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded font-medium transition-colors" data-tag="${post.tags[0]}">${post.tags[0]}</button>`
                  : ""
              }
            </div>

            <!-- Right Actions (ONLY Pin button to keep List View ultra-clean!) -->
            <div class="flex items-center space-x-2 flex-shrink-0">
              <span class="text-xs text-slate-400 hidden sm:inline mr-1">${new Date(post.createdAt).toLocaleDateString()}</span>
              <!-- Pin Button -->
              <button
                type="button"
                class="pin-post-btn p-1.5 rounded-lg hover:bg-slate-100 transition-colors ${post.isPinned ? "text-amber-500" : "text-slate-300 hover:text-amber-500"}"
                title="${post.isPinned ? "Unpin idea" : "Pin to top"}"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="${post.isPinned ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              </button>
            </div>
          </div>
        `;
      } else {
        el.innerHTML = `
          <div class="post-delete-bg">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2v2"></path></svg>
          </div>
          <div class="post-edit-bg">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </div>
          <div class="post-content bg-white border border-slate-200/90 rounded-2xl p-5 flex flex-col justify-between h-full hover:border-slate-300 hover:bg-slate-50/50 transition-colors" style="transform: translateX(0px);">
            <div>
              <!-- Card Header -->
              <div class="flex items-center justify-between gap-2 mb-3">
                <div class="flex items-center space-x-2 min-w-0">
                  ${
                    faviconUrl
                      ? `<img src="${faviconUrl}" alt="favicon" class="w-4 h-4 rounded-sm flex-shrink-0" />`
                      : `<span class="text-base flex-shrink-0">📝</span>`
                  }
                  <span class="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200/60 truncate flex items-center space-x-1">
                    <span>📁</span>
                    <span>${folderName}</span>
                  </span>
                </div>

                <!-- Pin Button -->
                <button
                  type="button"
                  class="pin-post-btn p-1.5 rounded-lg hover:bg-slate-100 transition-colors ${post.isPinned ? "text-amber-500" : "text-slate-300 hover:text-amber-500"}"
                  title="${post.isPinned ? "Unpin idea" : "Pin to top"}"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="${post.isPinned ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                </button>
              </div>

              <!-- Title -->
              <h3 class="font-bold text-slate-900 text-base sm:text-lg leading-snug mb-2 line-clamp-2 cursor-pointer post-title-trigger hover:text-primary transition-colors">
                ${post.title}
              </h3>

              <!-- Note content -->
              ${
                post.note
                  ? `<p class="text-xs sm:text-sm text-slate-600 leading-relaxed mb-3 line-clamp-3 whitespace-pre-line">${post.note}</p>`
                  : ""
              }

              <!-- URL domain display -->
              ${
                post.url
                  ? `<a href="${post.url}" target="_blank" rel="noopener noreferrer" class="text-xs font-medium text-slate-500 hover:text-primary flex items-center space-x-1.5 truncate mb-3 transition-colors" onclick="event.stopPropagation()">
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                      <span class="truncate">${domain}</span>
                     </a>`
                  : ""
              }

              <!-- Tag Pills -->
              ${tagsHtml}
            </div>

            <!-- Card Footer Action Bar (Clean Date only, no edit/delete buttons!) -->
            <div class="flex items-center justify-between pt-3 mt-3 text-xs text-slate-400">
              <span>${new Date(post.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        `;
      }

      // Attach Card Action Listeners
      this.setupCardActions(el, post);
      this.setupSwipeAndSelection(el, post);

      postList.appendChild(el);
    });
  },

  setupCardActions(el, post) {
    // Pin button
    el.querySelector(".pin-post-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      const newPinState = store.togglePin(post.id);
      this.showToast(
        newPinState ? "⭐ Idea pinned to top" : "Idea unpinned",
        "default",
      );
    });

    // Tag pills filtering
    el.querySelectorAll(".tag-pill-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.activeTag = btn.dataset.tag;
        const filterBar = document.getElementById("active-tag-filter");
        const badgeName = document.getElementById("active-tag-name");
        if (filterBar && badgeName) {
          filterBar.classList.remove("hidden");
          filterBar.classList.add("flex");
          badgeName.textContent = this.activeTag;
        }
        this.renderPosts();
      });
    });

    // Copy button
    el.querySelector(".copy-post-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      const contentToCopy = post.url || post.note || post.title;
      navigator.clipboard.writeText(contentToCopy);
      this.showToast(
        `Copied ${post.url ? "link" : "note"} to clipboard! 📋`,
        "success",
      );
    });

    // Share button
    el.querySelector(".share-post-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      const shareUrl = collab.generateShareUrl({
        version: "0.2.1",
        posts: [post],
        folders: [],
      });
      navigator.clipboard.writeText(shareUrl);
      this.showToast("Shareable link copied to clipboard! 🔗", "success");
    });

    // Edit button
    el.querySelector(".edit-post-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.openAddModal(post);
    });

    // Delete button
    el.querySelector(".delete-post-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.openDeleteModal(
        "Delete this idea?",
        `"${post.title}" will be permanently deleted.`,
        () => {
          store.deletePost(post.id);
          this.showToast("Idea deleted", "default");
        },
      );
    });

    // Clicking card title or card content ALWAYS opens detailed contents (never edit mode!)
    const handleClick = (e) => {
      if (el._didSwipe) return;
      this.openPost(post);
    };
    el.querySelector(".post-title-trigger")?.addEventListener("click", handleClick);
    el.querySelector(".post-content")?.addEventListener("click", (e) => {
      if (e.target.closest("button") || e.target.closest("a")) return;
      handleClick(e);
    });
  },

  setupSwipeAndSelection(el, post) {
    const content = el.querySelector(".post-content");
    let startX = 0;
    let currentX = 0;
    let isDragging = false;
    el._didSwipe = false;

    const startDrag = (x) => {
      startX = x;
      isDragging = true;
      el._didSwipe = false;
      content.style.transition = "none";
    };

    const moveDrag = (x) => {
      if (!isDragging) return;
      const diff = x - startX;
      currentX = diff;

      if (Math.abs(currentX) > 10) {
        el._didSwipe = true;
      }

      if (Math.abs(currentX) > 80) {
        const sign = Math.sign(currentX);
        const extra = Math.abs(currentX) - 80;
        currentX = (80 + extra * 0.4) * sign;
      }

      content.style.transform = `translateX(${currentX}px)`;

      if (currentX < 0) {
        el.classList.add("swiping-delete");
        el.classList.remove("swiping-edit");
      } else if (currentX > 0) {
        el.classList.add("swiping-edit");
        el.classList.remove("swiping-delete");
      }
    };

    const endDrag = () => {
      if (!isDragging) return;
      isDragging = false;
      content.style.transition =
        "transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)";

      setTimeout(() => {
        el.classList.remove("swiping-delete");
        el.classList.remove("swiping-edit");
      }, 200);

      const THRESHOLD = 60;

      if (currentX < -THRESHOLD) {
        // DELETE ACTION
        content.style.transform = `translateX(0)`;
        this.openDeleteModal(
          "Delete this idea?",
          `"${post.title}" will be deleted.`,
          () => {
            store.deletePost(post.id);
            this.showToast("Idea deleted", "default");
          },
        );
      } else if (currentX > THRESHOLD) {
        // EDIT ACTION
        content.style.transform = `translateX(0)`;
        this.openAddModal(post);
      } else {
        content.style.transform = `translateX(0)`;
      }
      currentX = 0;
    };

    // Touch events for mobile/tablet
    content.addEventListener(
      "touchstart",
      (e) => startDrag(e.touches[0].clientX),
      { passive: true },
    );

    content.addEventListener(
      "touchmove",
      (e) => moveDrag(e.touches[0].clientX),
      { passive: true },
    );

    content.addEventListener("touchend", () => endDrag());

    // Mouse events for desktop swipe testing
    content.addEventListener("mousedown", (e) => {
      if (e.target.closest("button") || e.target.closest("a")) return;
      startDrag(e.clientX);
    });

    window.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      moveDrag(e.clientX);
    });

    window.addEventListener("mouseup", () => endDrag());
  },

  openPost(post) {
    const viewModal = document.getElementById("view-modal");
    const viewModalTitle = document.getElementById("view-modal-title");
    const externalLinkBtn = document.getElementById("external-link-btn");
    const persistentExternalBtn = document.getElementById("persistent-external-btn");
    const viewFrame = document.getElementById("view-frame");
    const iframeFallback = document.getElementById("iframe-fallback");
    const noteViewContainer = document.getElementById("note-view-container");
    const noteViewMeta = document.getElementById("note-view-meta");
    const noteViewBody = document.getElementById("note-view-body");

    viewModal.classList.remove("hidden");
    viewModalTitle.textContent = post.title || "Idea Detail";

    const editBtn = document.getElementById("edit-post-btn");
    const newEditBtn = editBtn.cloneNode(true);
    editBtn.parentNode.replaceChild(newEditBtn, editBtn);

    newEditBtn.addEventListener("click", () => {
      viewModal.classList.add("hidden");
      this.openAddModal(post);
    });

    const folder = store.folders.find((f) => f.id === post.folderId) || { name: "Uncategorized" };
    const dateStr = new Date(post.createdAt).toLocaleDateString();

    if (!post.url) {
      // Note idea: Show clean detailed content view
      if (viewFrame) viewFrame.classList.add("hidden");
      if (iframeFallback) iframeFallback.classList.add("hidden");
      if (externalLinkBtn) externalLinkBtn.classList.add("hidden");
      if (persistentExternalBtn) persistentExternalBtn.classList.add("hidden");
      if (noteViewContainer) {
        noteViewContainer.classList.remove("hidden");
        if (noteViewMeta) {
          noteViewMeta.innerHTML = `
            <span class="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium">📁 ${folder.name}</span>
            <span>•</span>
            <span>Created ${dateStr}</span>
            ${
              post.tags && post.tags.length > 0
                ? `<span>•</span>` + post.tags.map((t) => `<span class="text-primary font-medium">#${t}</span>`).join(" ")
                : ""
            }
          `;
        }
        if (noteViewBody) {
          noteViewBody.textContent = post.note || "No additional notes.";
        }
      }
    } else {
      // Link idea: Check if site allows iframe embedding (prevent X-Frame-Options / CSP errors)
      if (noteViewContainer) noteViewContainer.classList.add("hidden");
      if (externalLinkBtn) {
        externalLinkBtn.classList.remove("hidden");
        externalLinkBtn.href = post.url;
      }
      if (persistentExternalBtn) {
        persistentExternalBtn.classList.remove("hidden");
        persistentExternalBtn.href = post.url;
      }

      if (!canEmbedUrl(post.url)) {
        // Site sets X-Frame-Options: deny / sameorigin (Instagram, Twitter, GitHub, etc.)
        // Display rich website preview card immediately without triggering iframe console errors!
        this.showFallback(post.url, post);
      } else {
        if (iframeFallback) iframeFallback.classList.add("hidden");
        if (viewFrame) viewFrame.classList.remove("hidden");

        try {
          const embedUrl = getEmbedUrl(post.url);
          if (viewFrame) viewFrame.src = embedUrl;
        } catch (e) {
          this.showFallback(post.url, post);
        }
      }
      const fallbackLink = document.getElementById("fallback-link");
      if (fallbackLink) fallbackLink.href = post.url;
    }
  },

  showFallback(url, post = null) {
    const viewFrame = document.getElementById("view-frame");
    const iframeFallback = document.getElementById("iframe-fallback");
    const fallbackLink = document.getElementById("fallback-link");
    const persistentExternalBtn = document.getElementById("persistent-external-btn");
    const fallbackMeta = document.getElementById("fallback-meta");
    const fallbackDomainBadge = document.getElementById("fallback-domain-badge");
    const fallbackTitle = document.getElementById("fallback-title");
    const fallbackNote = document.getElementById("fallback-note");
    const fallbackCopyBtn = document.getElementById("fallback-copy-btn");

    if (viewFrame) {
      viewFrame.src = "about:blank";
      viewFrame.classList.add("hidden");
    }
    if (persistentExternalBtn) persistentExternalBtn.classList.add("hidden");
    if (iframeFallback) iframeFallback.classList.remove("hidden");
    if (fallbackLink) fallbackLink.href = url;

    try {
      const u = new URL(url);
      if (fallbackDomainBadge) {
        fallbackDomainBadge.textContent = `🌐 ${u.hostname.replace(/^www\./, "")}`;
      }
    } catch (e) {
      if (fallbackDomainBadge) fallbackDomainBadge.textContent = "🌐 External Link";
    }

    if (post) {
      const folder = store.folders.find((f) => f.id === post.folderId) || { name: "Uncategorized" };
      const dateStr = new Date(post.createdAt).toLocaleDateString();
      if (fallbackMeta) {
        fallbackMeta.innerHTML = `
          <span class="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium">📁 ${folder.name}</span>
          <span>•</span>
          <span>Created ${dateStr}</span>
          ${
            post.tags && post.tags.length > 0
              ? `<span>•</span>` + post.tags.map((t) => `<span class="text-primary font-medium">#${t}</span>`).join(" ")
              : ""
          }
        `;
      }
      if (fallbackTitle) {
        fallbackTitle.textContent = post.title || "External Link";
      }
      if (fallbackNote) {
        fallbackNote.textContent = post.note || "No additional note written for this link.";
      }
    } else {
      if (fallbackTitle) fallbackTitle.textContent = url;
      if (fallbackNote) fallbackNote.textContent = "";
      if (fallbackMeta) fallbackMeta.innerHTML = "";
    }

    if (fallbackCopyBtn) {
      fallbackCopyBtn.onclick = () => {
        navigator.clipboard.writeText(url);
        this.showToast("URL copied to clipboard! 📋", "success");
      };
    }
  },

  async fetchPageTitle(url) {
    const fetchWithTimeout = async (resource, options = {}) => {
      const { timeout = 5000 } = options;
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      const response = await fetch(resource, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(id);
      return response;
    };

    try {
      try {
        new URL(url);
      } catch (e) {
        return null;
      }

      try {
        const noEmbedUrl = `https://noembed.com/embed?url=${encodeURIComponent(url)}`;
        const res = await fetchWithTimeout(noEmbedUrl, { timeout: 3000 });
        if (res.ok) {
          const data = await res.json();
          if (data.title) return data.title;
        }
      } catch (e) {
        // fallback
      }

      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const response = await fetchWithTimeout(proxyUrl, { timeout: 5000 });
      if (!response.ok) throw new Error("Network response was not ok");

      const data = await response.json();
      if (!data.contents) return null;

      const parser = new DOMParser();
      const doc = parser.parseFromString(data.contents, "text/html");
      return doc.title;
    } catch (error) {
      console.warn("Failed to fetch title:", error);
      return null;
    }
  },
};
