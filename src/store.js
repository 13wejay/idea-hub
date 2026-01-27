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

  init() {
    const savedPosts = localStorage.getItem(STORAGE_KEY_POSTS);
    const savedFolders = localStorage.getItem(STORAGE_KEY_FOLDERS);

    this.posts = savedPosts ? JSON.parse(savedPosts) : [];
    this.folders = savedFolders
      ? JSON.parse(savedFolders)
      : [...defaultFolders];

    // Ensure default folders always exist in some form if array is corrupted or empty
    if (this.folders.length === 0) {
      this.folders = [...defaultFolders];
      this.saveFolders();
    }
  },

  savePosts() {
    localStorage.setItem(STORAGE_KEY_POSTS, JSON.stringify(this.posts));
  },

  saveFolders() {
    localStorage.setItem(STORAGE_KEY_FOLDERS, JSON.stringify(this.folders));
  },

  addPost(url, title, folderId = "uncategorized") {
    const newPost = {
      id: Date.now().toString(),
      url,
      title: title || new URL(url).hostname,
      folderId,
      createdAt: new Date().toISOString(),
      isRead: false,
    };
    this.posts.unshift(newPost);
    this.savePosts();
    return newPost;
  },

  deletePost(id) {
    this.posts = this.posts.filter((p) => p.id !== id);
    this.savePosts();
  },

  updatePost(id, updates) {
    const post = this.posts.find((p) => p.id === id);
    if (!post) return false;

    Object.assign(post, updates);
    this.savePosts();
    return true;
  },

  addFolder(name) {
    const id = name.toLowerCase().replace(/\s+/g, "-");
    if (this.folders.find((f) => f.id === id)) return null; // Duplicate check

    const newFolder = { id, name, icon: "folder" };
    this.folders.push(newFolder);
    this.saveFolders();
    return newFolder;
  },

  updateFolder(id, name) {
    const folder = this.folders.find((f) => f.id === id);
    if (!folder) return false;

    folder.name = name;
    this.saveFolders();
    return true;
  },

  deleteFolder(id) {
    // 1. Remove the folder
    this.folders = this.folders.filter((f) => f.id !== id);

    // 2. Delete posts in that folder (Destructive)
    this.posts = this.posts.filter((p) => p.folderId !== id);

    this.saveFolders();
    this.savePosts();
  },

  getPostsByFolder(folderId) {
    if (folderId === "all") return this.posts;
    return this.posts.filter((p) => p.folderId === folderId);
  },
};
