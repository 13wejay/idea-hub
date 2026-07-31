const STORAGE_KEY_POSTS = "ideahub_posts";
const STORAGE_KEY_FOLDERS = "ideahub_folders";

const defaultFolders = [
  { id: "all", name: "All", icon: "layer-group" },
  { id: "uncategorized", name: "Uncategorized", icon: "box" },
  { id: "inspiration", name: "Inspiration", icon: "lightbulb" },
  { id: "read-later", name: "Read Later", icon: "book-open" },
];

export const store = {
  posts: [],
  folders: [],
  listeners: [],
  broadcastChannel: null,

  init() {
    const savedPosts = localStorage.getItem(STORAGE_KEY_POSTS);
    const savedFolders = localStorage.getItem(STORAGE_KEY_FOLDERS);

    const parsedPosts = savedPosts ? JSON.parse(savedPosts) : [];
    // Normalize posts for backward compatibility with older data
    this.posts = parsedPosts.map((p) => ({
      ...p,
      type: p.type || "link",
      note: p.note || "",
      tags: Array.isArray(p.tags) ? p.tags : [],
      isPinned: Boolean(p.isPinned),
      color: p.color || "default",
    }));

    this.folders = savedFolders
      ? JSON.parse(savedFolders)
      : [...defaultFolders];

    // Ensure default folders always exist
    if (!this.folders || this.folders.length === 0) {
      this.folders = [...defaultFolders];
      this.saveFolders(false);
    }

    // Setup cross-tab sync via BroadcastChannel
    try {
      if ("BroadcastChannel" in window) {
        this.broadcastChannel = new BroadcastChannel("ideahub_sync");
        this.broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.type === "SYNC") {
            this.reloadFromStorage(false);
          }
        };
      }
    } catch (e) {
      console.warn("BroadcastChannel not supported", e);
    }
  },

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  },

  notify(emitSync = true) {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error("Error in store subscriber:", err);
      }
    });

    // Notify collaboration module via window event
    window.dispatchEvent(
      new CustomEvent("ideahub:store-changed", {
        detail: { posts: this.posts, folders: this.folders, emitSync },
      }),
    );
  },

  reloadFromStorage(notify = true) {
    const savedPosts = localStorage.getItem(STORAGE_KEY_POSTS);
    const savedFolders = localStorage.getItem(STORAGE_KEY_FOLDERS);

    const parsedPosts = savedPosts ? JSON.parse(savedPosts) : [];
    this.posts = parsedPosts.map((p) => ({
      ...p,
      type: p.type || "link",
      note: p.note || "",
      tags: Array.isArray(p.tags) ? p.tags : [],
      isPinned: Boolean(p.isPinned),
      color: p.color || "default",
    }));

    this.folders = savedFolders
      ? JSON.parse(savedFolders)
      : [...defaultFolders];

    if (notify) this.notify(false);
  },

  savePosts(emitSync = true) {
    localStorage.setItem(STORAGE_KEY_POSTS, JSON.stringify(this.posts));
    if (emitSync && this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ type: "SYNC", time: Date.now() });
      } catch (e) {
        // Ignore broadcast errors
      }
    }
    this.notify(emitSync);
  },

  saveFolders(emitSync = true) {
    localStorage.setItem(STORAGE_KEY_FOLDERS, JSON.stringify(this.folders));
    if (emitSync && this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ type: "SYNC", time: Date.now() });
      } catch (e) {
        // Ignore broadcast errors
      }
    }
    this.notify(emitSync);
  },

  addPost({ url = "", title = "", note = "", type = "link", folderId = "uncategorized", tags = [], isPinned = false, color = "default" }) {
    let finalTitle = title.trim();
    if (!finalTitle && url) {
      try {
        finalTitle = new URL(url).hostname;
      } catch (e) {
        finalTitle = "Untitled Idea";
      }
    }
    if (!finalTitle && note) {
      finalTitle = note.slice(0, 40) + (note.length > 40 ? "..." : "");
    }
    if (!finalTitle) {
      finalTitle = "New Idea";
    }

    const newPost = {
      id: Date.now().toString() + "-" + Math.random().toString(36).slice(2, 6),
      url: url ? url.trim() : "",
      title: finalTitle,
      note: note ? note.trim() : "",
      type: type || (url ? "link" : "note"),
      folderId: folderId || "uncategorized",
      tags: Array.isArray(tags) ? tags.map((t) => (t.startsWith("#") ? t : `#${t}`)) : [],
      isPinned: Boolean(isPinned),
      color: color || "default",
      createdAt: new Date().toISOString(),
      isRead: false,
    };

    this.posts.unshift(newPost);
    this.savePosts(true);
    return newPost;
  },

  updatePost(id, updates) {
    const post = this.posts.find((p) => p.id === id);
    if (!post) return false;

    if (updates.tags && Array.isArray(updates.tags)) {
      updates.tags = updates.tags.map((t) => (t.startsWith("#") ? t : `#${t}`));
    }

    Object.assign(post, updates);
    this.savePosts(true);
    return true;
  },

  togglePin(id) {
    const post = this.posts.find((p) => p.id === id);
    if (!post) return false;
    post.isPinned = !post.isPinned;
    this.savePosts(true);
    return post.isPinned;
  },

  deletePost(id) {
    this.posts = this.posts.filter((p) => p.id !== id);
    this.savePosts(true);
  },

  addFolder(name) {
    const cleanName = name.trim();
    if (!cleanName) return null;
    const id = cleanName.toLowerCase().replace(/\s+/g, "-");
    if (this.folders.find((f) => f.id === id)) return null;

    const newFolder = { id, name: cleanName, icon: "folder" };
    this.folders.push(newFolder);
    this.saveFolders(true);
    return newFolder;
  },

  updateFolder(id, name) {
    const folder = this.folders.find((f) => f.id === id);
    if (!folder) return false;

    folder.name = name.trim();
    this.saveFolders(true);
    return true;
  },

  deleteFolder(id) {
    this.folders = this.folders.filter((f) => f.id !== id);
    this.posts = this.posts.filter((p) => p.folderId !== id);
    this.saveFolders(true);
    this.savePosts(true);
  },

  getPostsByFolder(folderId) {
    if (folderId === "all") return this.posts;
    return this.posts.filter((p) => p.folderId === folderId);
  },

  searchPosts({ query = "", folderId = "all", filterType = "all", tag = null, sortBy = "newest" } = {}) {
    let result = this.posts;

    // Filter by Folder
    if (folderId && folderId !== "all") {
      result = result.filter((p) => p.folderId === folderId);
    }

    // Filter by Type
    if (filterType === "pinned") {
      result = result.filter((p) => p.isPinned);
    } else if (filterType === "link") {
      result = result.filter((p) => p.type === "link" || (!p.type && p.url));
    } else if (filterType === "note") {
      result = result.filter((p) => p.type === "note" || (!p.url && p.note));
    }

    // Filter by Tag
    if (tag) {
      const targetTag = tag.startsWith("#") ? tag.toLowerCase() : `#${tag.toLowerCase()}`;
      result = result.filter((p) => p.tags && p.tags.some((t) => t.toLowerCase() === targetTag));
    }

    // Filter by Search Query
    if (query && query.trim() !== "") {
      const q = query.trim().toLowerCase();
      result = result.filter((p) => {
        const titleMatch = p.title && p.title.toLowerCase().includes(q);
        const urlMatch = p.url && p.url.toLowerCase().includes(q);
        const noteMatch = p.note && p.note.toLowerCase().includes(q);
        const tagMatch = p.tags && p.tags.some((t) => t.toLowerCase().includes(q));
        return titleMatch || urlMatch || noteMatch || tagMatch;
      });
    }

    // Sort: Pinned first, then by sortBy
    const sorted = [...result].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      if (sortBy === "oldest") {
        return new Date(a.createdAt) - new Date(b.createdAt);
      } else if (sortBy === "title") {
        return (a.title || "").localeCompare(b.title || "");
      } else {
        // default 'newest'
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });

    return sorted;
  },

  exportData(folderId = "all") {
    const foldersToExport =
      folderId === "all"
        ? this.folders
        : this.folders.filter((f) => f.id === "all" || f.id === folderId);
    const postsToExport =
      folderId === "all"
        ? this.posts
        : this.posts.filter((p) => p.folderId === folderId);

    return {
      version: "0.2.0",
      exportedAt: new Date().toISOString(),
      folders: foldersToExport,
      posts: postsToExport,
    };
  },

  importData(data, merge = true) {
    if (!data || !Array.isArray(data.posts)) return false;

    // Merge folders
    if (Array.isArray(data.folders)) {
      data.folders.forEach((newF) => {
        if (!this.folders.some((f) => f.id === newF.id)) {
          this.folders.push(newF);
        }
      });
    }

    if (!merge) {
      this.posts = [];
    }

    // Merge or add posts
    let addedCount = 0;
    data.posts.forEach((newP) => {
      const exists = this.posts.some((p) => p.id === newP.id);
      if (!exists) {
        this.posts.push({
          ...newP,
          type: newP.type || (newP.url ? "link" : "note"),
          note: newP.note || "",
          tags: Array.isArray(newP.tags) ? newP.tags : [],
          isPinned: Boolean(newP.isPinned),
          color: newP.color || "default",
        });
        addedCount++;
      }
    });

    // Sort by createdAt descending
    this.posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    this.saveFolders(true);
    this.savePosts(true);
    return addedCount;
  },
};
