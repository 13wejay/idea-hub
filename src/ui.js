import { store } from "./store.js";

// DOM Elements
const app = document.getElementById("app");
const postList = document.getElementById("post-list");
const categoryScroller = document.getElementById("category-scroller");
const addModal = document.getElementById("add-modal");
const addModalContent = document.getElementById("add-modal-content");
const addModalBackdrop = document.getElementById("add-modal-backdrop");
const addBtn = document.getElementById("add-btn");
const addForm = document.getElementById("add-form");
const folderSelectContainer = document.getElementById(
  "folder-select-container",
);
const viewModal = document.getElementById("view-modal");
const viewFrame = document.getElementById("view-frame");
const viewModalTitle = document.getElementById("view-modal-title");
const closeViewBtn = document.getElementById("close-view-btn");
const externalLinkBtn = document.getElementById("external-link-btn");
const iframeFallback = document.getElementById("iframe-fallback");
const fallbackLink = document.getElementById("fallback-link");

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

let currentFolderId = "all";
let selectedFolderForNewPost = "uncategorized";

export const ui = {
  // State
  isSelectionMode: false,
  selectedPostIds: new Set(),
  editingPostId: null,

  init() {
    this.renderCategories();
    this.renderPosts();
    this.setupEventListeners();
    this.setupSettingsListener();
  },

  setupEventListeners() {
    // Modal Toggles
    addBtn.addEventListener("click", () => this.openAddModal());
    addModalBackdrop.addEventListener("click", () => this.closeAddModal());

    // Add/Edit Post Form
    addForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const url = document.getElementById("link-input").value;
      const title = document.getElementById("title-input").value;

      if (this.editingPostId) {
        store.updatePost(this.editingPostId, {
          url,
          title,
          folderId: selectedFolderForNewPost,
        });
      } else {
        store.addPost(url, title, selectedFolderForNewPost);
      }

      this.closeAddModal();
      this.renderPosts();
      addForm.reset();
      selectedFolderForNewPost = "uncategorized"; // Reset selection
      this.editingPostId = null; // Reset edit mode
      document.querySelector("#add-modal h2").textContent = "New Idea"; // Reset title
      document.querySelector("#add-form button[type='submit']").textContent =
        "Save Idea";
      this.renderFolderSelect(); // Re-render to show reset
    });

    // View Modal
    closeViewBtn.addEventListener("click", () => {
      viewModal.classList.add("hidden");
      viewFrame.src = ""; // Stop loading
    });

    // Automatic Title Fetching
    const linkInput = document.getElementById("link-input");
    const titleInput = document.getElementById("title-input");

    const handleUrlChange = async () => {
      const url = linkInput.value.trim();
      // Only fetch if we have a URL and title is empty or unmodified (we can't easily track unmodified without state, so just empty checks for now are safe)
      if (url && !titleInput.value.trim()) {
        titleInput.setAttribute("placeholder", "Fetching title...");
        const title = await this.fetchPageTitle(url);
        if (title) {
          // Check again if user hasn't typed something while we were fetching
          if (!titleInput.value.trim()) {
            titleInput.value = title;
          }
        }
        titleInput.setAttribute("placeholder", "Title (optional)");
      }
    };

    linkInput.addEventListener("blur", handleUrlChange);

    // For paste, we want a slight delay or just let blur handle it?
    // Usually users paste and then move to next field, so blur is good.
    // But instant feedback is nice.
    linkInput.addEventListener("paste", () => {
      // Wait for value to update
      setTimeout(handleUrlChange, 100);
    });
  },

  toggleSelectionMode(initialPostId = null) {
    this.isSelectionMode = !this.isSelectionMode;
    this.selectedPostIds.clear();

    if (this.isSelectionMode && initialPostId) {
      this.selectedPostIds.add(initialPostId);
    }

    this.renderPosts();
    this.renderBulkActionUI();
  },

  togglePostSelection(postId) {
    if (this.selectedPostIds.has(postId)) {
      this.selectedPostIds.delete(postId);
    } else {
      this.selectedPostIds.add(postId);
    }

    if (this.selectedPostIds.size === 0 && this.isSelectionMode) {
      // Optional: Exit selection mode if nothing selected?
      // let's keep it active until user cancels
    }

    this.renderPosts(); // Re-render to update checkboxes
    this.renderBulkActionUI();
  },

  renderBulkActionUI() {
    // We will inject or toggle a Bulk Action Bar
    let bar = document.getElementById("bulk-action-bar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "bulk-action-bar";
      bar.className =
        "fixed bottom-6 left-6 right-6 bg-slate-800/90 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl flex justify-between items-center z-40 transform transition-transform duration-300 translate-y-[200%]";
      bar.innerHTML = `
            <span id="selection-count" class="font-medium">0 selected</span>
            <div class="flex space-x-3">
                <button id="bulk-cancel-btn" class="px-4 py-2 text-slate-300 hover:text-white transition-colors">Cancel</button>
                <button id="bulk-delete-btn" class="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg font-medium shadow-lg transition-colors">Delete</button>
            </div>
          `;
      app.appendChild(bar);

      document.getElementById("bulk-cancel-btn").onclick = () => {
        this.isSelectionMode = false;
        this.selectedPostIds.clear();
        this.renderPosts();
        this.renderBulkActionUI();
      };

      document.getElementById("bulk-delete-btn").onclick = () => {
        const count = this.selectedPostIds.size;
        if (count === 0) return;

        this.openDeleteModal(
          `Delete ${count} items?`,
          `These ${count} ideas will be permanently deleted.`,
          () => {
            this.selectedPostIds.forEach((id) => store.deletePost(id));
            this.isSelectionMode = false;
            this.selectedPostIds.clear();
            this.renderPosts();
            this.renderBulkActionUI();
          },
        );
      };
    }

    const countEl = document.getElementById("selection-count");

    if (this.isSelectionMode) {
      bar.classList.remove("translate-y-[200%]");
      addBtn.classList.add("translate-y-[200%]"); // Hide FAB
      countEl.textContent = `${this.selectedPostIds.size} selected`;
    } else {
      bar.classList.add("translate-y-[200%]");
      addBtn.classList.remove("translate-y-[200%]"); // Show FAB
    }
  },

  openAddModal(postToEdit = null) {
    addModal.classList.remove("hidden");

    if (postToEdit) {
      this.editingPostId = postToEdit.id;
      document.getElementById("link-input").value = postToEdit.url;
      document.getElementById("title-input").value = postToEdit.title;
      selectedFolderForNewPost = postToEdit.folderId;

      document.querySelector("#add-modal h2").textContent = "Edit Idea";
      document.querySelector("#add-form button[type='submit']").textContent =
        "Update Idea";
    } else {
      this.editingPostId = null;
      addForm.reset();
      selectedFolderForNewPost = "uncategorized";
      document.querySelector("#add-modal h2").textContent = "New Idea";
      document.querySelector("#add-form button[type='submit']").textContent =
        "Save Idea";
    }

    this.renderFolderSelect();
    // Small timeout to allow display:block to apply before transform
    setTimeout(() => {
      addModalContent.classList.remove("translate-y-full");
    }, 10);
  },

  closeAddModal() {
    addModalContent.classList.add("translate-y-full");
    setTimeout(() => {
      addModal.classList.add("hidden");
    }, 300);
  },

  renderCategories() {
    categoryScroller.innerHTML = store.folders
      .map(
        (folder) => `
      <button 
        class="chip ${currentFolderId === folder.id ? "chip-active" : "chip-inactive"}"
        data-id="${folder.id}"
      >
        ${folder.name}
      </button>
    `,
      )
      .join("");

    // Add event listeners to new chips
    categoryScroller.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        currentFolderId = chip.dataset.id;
        this.renderCategories(); // Re-render for active state
        this.renderPosts();
      });
    });
  },

  setupSettingsListener() {
    const settingsBtn = document.getElementById("settings-btn");

    settingsBtn.addEventListener("click", () => this.openSettings());
    closeSettingsBtn.addEventListener("click", () =>
      settingsModal.classList.add("hidden"),
    );
    settingsAddFolderBtn.addEventListener("click", () =>
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
        const isSystem = [
          "all",
          "uncategorized",
          "inspiration",
          "read-later",
        ].includes(folder.id);
        const canDelete = folder.id !== "all" && folder.id !== "uncategorized";

        return `
            <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-500 shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                    </div>
                    <span class="font-medium text-slate-700">${folder.name}</span>
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

    // Edit Listeners
    settingsFolderList.querySelectorAll(".edit-folder-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const folder = store.folders.find((f) => f.id === btn.dataset.id);
        if (folder) this.openNewFolderModal(folder); // Reuse modal for editing
      });
    });

    // Delete Listeners
    settingsFolderList.querySelectorAll(".delete-folder-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const folder = store.folders.find((f) => f.id === btn.dataset.id);
        if (folder) {
          this.openDeleteModal(
            `Delete "${folder.name}"?`,
            `This will permanently delete the folder AND ALL ${store.getPostsByFolder(folder.id).length} links inside it.`,
            () => {
              store.deleteFolder(folder.id);
              this.renderSettingsFolders(); // Refresh settings list
              this.renderCategories(); // Refresh main tabs
              if (currentFolderId === folder.id) {
                currentFolderId = "all"; // Reset view if we deleted current folder
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

    // Backdrop
    const backdrop = document.getElementById("delete-modal-backdrop");

    const close = () => {
      deleteModal.classList.add("hidden");
      confirmDeleteBtn.onclick = null;
      cancelDeleteBtn.onclick = null;
      if (backdrop) backdrop.onclick = null;
    };

    if (backdrop) {
      backdrop.onclick = close;
    }

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
                class="folder-select-chip folder-chip ${selectedFolderForNewPost === folder.id ? "folder-chip-active" : "folder-chip-inactive"}"
                data-id="${folder.id}"
            >
                ${folder.name}
            </button>
        `,
      )
      .join("");

    // Add "+ New" button
    const addFolderBtn = document.createElement("button");
    addFolderBtn.type = "button";
    addFolderBtn.className =
      "px-3 py-1.5 rounded-lg border border-dashed border-slate-400 text-slate-500 text-xs font-medium hover:bg-white/40";
    addFolderBtn.textContent = "+ New";
    addFolderBtn.onclick = () => {
      this.openNewFolderModal();
    };
    folderSelectContainer.appendChild(addFolderBtn);

    folderSelectContainer
      .querySelectorAll(".folder-select-chip")
      .forEach((chip) => {
        chip.addEventListener("click", () => {
          selectedFolderForNewPost = chip.dataset.id;
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
          // Edit Mode
          store.updateFolder(editingFolder.id, name);
          this.renderSettingsFolders();
          this.renderCategories();
          this.renderPosts(); // Headers might need update
        } else {
          // Create Mode
          const newFolder = store.addFolder(name);
          if (newFolder) {
            selectedFolderForNewPost = newFolder.id;
            this.renderCategories();
            this.renderFolderSelect();
            // If we are in settings, refresh that list too
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
    const posts = store.getPostsByFolder(currentFolderId);
    postList.innerHTML = "";

    if (posts.length === 0) {
      postList.innerHTML = `
            <div class="text-center mt-20 text-slate-600/70 flex flex-col items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="mb-4 opacity-50"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                <p>No links here yet.</p>
            </div>
        `;
      return;
    }

    posts.forEach((post) => {
      const isSelected = this.selectedPostIds.has(post.id);
      const el = document.createElement("div");
      el.className = `post-item-container mb-3 group ${isSelected ? "selected" : ""}`;

      // Checkbox is hidden unless in selection mode (handled by JS logic or generic CSS if we added it, but let's do inline logic for simplicity of "Selection Mode" visual)
      const checkboxHtml = this.isSelectionMode
        ? `
        <div class="selection-checkbox">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
      `
        : "";

      el.innerHTML = `
        <div class="post-delete-bg">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </div>
        <div class="post-edit-bg">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
        </div>
        <div class="post-content bg-white/60 backdrop-blur-sm p-4 rounded-xl shadow-sm border border-white/50 flex items-start" style="transform: translateX(0px);">
            ${checkboxHtml}
            <div class="flex-1 min-w-0">
                <div class="flex justify-between items-start">
                    <h3 class="font-semibold text-slate-800 line-clamp-2 leading-tight">${post.title}</h3>
                </div>
                <p class="text-xs text-slate-500 mt-1 truncate">${post.url}</p>
                <div class="flex items-center mt-3 text-xs text-slate-400">
                    <span class="bg-primary/20 text-primary px-2 py-0.5 rounded-md font-medium">
                        ${store.folders.find((f) => f.id === post.folderId)?.name || "Uncategorized"}
                    </span>
                    <span class="ml-auto">${new Date(post.createdAt).toLocaleDateString()}</span>
                </div>
            </div>
        </div>
      `;

      this.setupSwipeAndSelection(el, post);
      postList.appendChild(el);
    });
  },

  setupSwipeAndSelection(el, post) {
    const content = el.querySelector(".post-content");
    let startX = 0;
    let currentX = 0;
    let isDragging = false;
    let longPressTimer;

    // Mouse/Link Click Logic
    content.addEventListener("click", (e) => {
      if (Math.abs(currentX) > 10) return; // Ignore if it was a swipe

      if (this.isSelectionMode) {
        e.preventDefault();
        this.togglePostSelection(post.id);
      } else {
        this.openPost(post);
      }
    });

    // Long Press for Selection
    content.addEventListener(
      "touchstart",
      (e) => {
        if (this.isSelectionMode) return;
        isDragging = false;
        longPressTimer = setTimeout(() => {
          this.toggleSelectionMode(post.id);
        }, 600);
      },
      { passive: true },
    );

    content.addEventListener("touchend", () => {
      clearTimeout(longPressTimer);
    });

    content.addEventListener(
      "touchmove",
      () => {
        clearTimeout(longPressTimer);
      },
      { passive: true },
    );

    // Swipe Logic (Only if not selecting)
    if (this.isSelectionMode) return;

    content.addEventListener(
      "touchstart",
      (e) => {
        startX = e.touches[0].clientX;
        isDragging = true;
        content.style.transition = "none";
        el.classList.add("swiping"); // Show red background
      },
      { passive: true },
    );

    content.addEventListener(
      "touchmove",
      (e) => {
        if (!isDragging) return;
        const x = e.touches[0].clientX;
        const diff = x - startX;

        currentX = diff;

        // Resistance
        if (Math.abs(currentX) > 80) {
          const sign = Math.sign(currentX);
          const extra = Math.abs(currentX) - 80;
          currentX = (80 + extra * 0.4) * sign;
        }

        content.style.transform = `translateX(${currentX}px)`;

        // Visual cues
        if (currentX < 0) {
          el.classList.add("swiping-delete");
          el.classList.remove("swiping-edit");
        } else if (currentX > 0) {
          el.classList.add("swiping-edit");
          el.classList.remove("swiping-delete");
        }
      },
      { passive: true },
    );

    content.addEventListener("touchend", (e) => {
      if (!isDragging) return;
      isDragging = false;
      content.style.transition =
        "transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)";

      // Remove classes
      setTimeout(() => {
        el.classList.remove("swiping-delete");
        el.classList.remove("swiping-edit");
      }, 200);

      const THRESHOLD = 60; // Activation threshold

      if (currentX < -THRESHOLD) {
        // DELETE ACTION (Left Swipe)
        content.style.transform = `translateX(0)`;
        this.openDeleteModal(
          "Delete this idea?",
          "It will be gone forever.",
          () => {
            store.deletePost(post.id);
            this.renderPosts();
          },
        );
      } else if (currentX > THRESHOLD) {
        // EDIT ACTION (Right Swipe)
        content.style.transform = `translateX(0)`;
        this.openAddModal(post);
      } else {
        content.style.transform = `translateX(0)`;
      }
      currentX = 0;
    });

    // Also handle "Clicking" the red background if we did the "reveal" style
    // Currently using "Spring back" style which triggers action.
  },

  openPost(post) {
    viewModal.classList.remove("hidden");
    viewModalTitle.textContent = post.title;
    externalLinkBtn.href = post.url;

    // Edit Button Logic
    const editBtn = document.getElementById("edit-post-btn");
    // Clone and replace to remove old listeners (simple way) or just use one-time listener logic
    const newEditBtn = editBtn.cloneNode(true);
    editBtn.parentNode.replaceChild(newEditBtn, editBtn);

    newEditBtn.addEventListener("click", () => {
      viewModal.classList.add("hidden"); // Close view
      this.openAddModal(post); // Open edit
    });

    // Reset state
    iframeFallback.classList.add("hidden");
    viewFrame.classList.remove("hidden");

    try {
      viewFrame.src = post.url;

      // Simple fallback check (onload doesn't reliable detect X-Frame-Options blocking, but can detect connection errors sometimes)
      // For accurate X-Frame-Options detection we'd need a server proxy or just accept standard behavior.
      // We will show fallback if it hasn't loaded (user visual verification) or we actally assume many sites block it.
      // A better UX might be to just always offer the "Open External" if it looks blank.
    } catch (e) {
      this.showFallback(post.url);
    }

    fallbackLink.href = post.url;
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
      // Basic URL validation
      try {
        new URL(url);
      } catch (e) {
        return null;
      }

      // Strategy 1: NoEmbed (Fast, works great for YouTube, Vimeo, Twitter, etc.)
      try {
        const noEmbedUrl = `https://noembed.com/embed?url=${encodeURIComponent(url)}`;
        const res = await fetchWithTimeout(noEmbedUrl, { timeout: 3000 });
        if (res.ok) {
          const data = await res.json();
          if (data.title) return data.title;
        }
      } catch (e) {
        // Ignore NoEmbed failure and continue to fallback
      }

      // Strategy 2: AllOrigins (Generic HTML scraper for blogs, news, etc.)
      // Note: YouTube often blocks this one or returns consent pages, so NoEmbed is crucial above.
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const response = await fetchWithTimeout(proxyUrl, { timeout: 5000 });
      if (!response.ok) throw new Error("Network response was not ok");

      const data = await response.json();
      if (!data.contents) return null;

      // Parse HTML to extract <title>
      const parser = new DOMParser();
      const doc = parser.parseFromString(data.contents, "text/html");
      return doc.title;
    } catch (error) {
      console.warn("Failed to fetch title:", error);
      return null;
    }
  },

  showFallback(url) {
    viewFrame.classList.add("hidden");
    iframeFallback.classList.remove("hidden");
    fallbackLink.href = url;
  },
};
