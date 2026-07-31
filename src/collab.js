import { store } from "./store.js";

export const collab = {
  peer: null,
  connections: [],
  isInRoom: false,
  roomCode: "",
  isHost: false,
  userName: "Peer",
  statusCallbacks: [],

  init() {
    // Listen for store changes to broadcast to room peers
    window.addEventListener("ideahub:store-changed", (event) => {
      const { posts, folders, emitSync } = event.detail;
      if (this.isInRoom && emitSync && this.connections.length > 0) {
        this.broadcastState({ posts, folders });
      }
    });

    // Handle window unload to close clean
    window.addEventListener("beforeunload", () => {
      this.leaveRoom();
    });
  },

  onStatusChange(fn) {
    this.statusCallbacks.push(fn);
    return () => {
      this.statusCallbacks = this.statusCallbacks.filter((c) => c !== fn);
    };
  },

  notifyStatus() {
    const status = {
      isInRoom: this.isInRoom,
      roomCode: this.roomCode,
      isHost: this.isHost,
      peerCount: this.connections.length + (this.isInRoom ? 1 : 0),
      connections: this.connections.map((c) => c.peer || "Anonymous"),
    };
    this.statusCallbacks.forEach((fn) => {
      try {
        fn(status);
      } catch (e) {
        console.error("Error in status callback:", e);
      }
    });
  },

  generateRoomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "HUB-";
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  },

  async createRoom(customCode = null) {
    if (!window.Peer) {
      throw new Error("PeerJS library is not loaded.");
    }
    this.leaveRoom();

    const code = customCode ? customCode.trim().toUpperCase() : this.generateRoomCode();
    const peerId = "ideahub-room-" + code.toLowerCase();

    return new Promise((resolve, reject) => {
      try {
        this.peer = new window.Peer(peerId, {
          debug: 1,
        });

        const timeout = setTimeout(() => {
          if (!this.isInRoom) {
            reject(new Error("Room creation timed out. Please try again."));
          }
        }, 8000);

        this.peer.on("open", (id) => {
          clearTimeout(timeout);
          this.isInRoom = true;
          this.isHost = true;
          this.roomCode = code;
          this.connections = [];
          this.notifyStatus();

          this.setupHostListeners();
          resolve(code);
        });

        this.peer.on("error", (err) => {
          clearTimeout(timeout);
          console.error("PeerJS error:", err);
          if (err.type === "unavailable-id") {
            reject(new Error(`Room code "${code}" is already taken or active.`));
          } else {
            reject(err);
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  },

  setupHostListeners() {
    if (!this.peer) return;

    this.peer.on("connection", (conn) => {
      this.connections.push(conn);
      this.notifyStatus();

      conn.on("open", () => {
        // Send initial full state to newly connected peer
        conn.send({
          type: "INIT_STATE",
          posts: store.posts,
          folders: store.folders,
          roomCode: this.roomCode,
        });
      });

      conn.on("data", (data) => {
        if (data && data.type === "SYNC_STATE") {
          // Merge external state into local store without re-emitting broadcast
          store.importData({ posts: data.posts, folders: data.folders }, true);
          store.notify(false); // Update UI
          // Broadcast to any other connected peers
          this.broadcastState({ posts: store.posts, folders: store.folders }, conn);
        }
      });

      conn.on("close", () => {
        this.connections = this.connections.filter((c) => c !== conn);
        this.notifyStatus();
      });

      conn.on("error", () => {
        this.connections = this.connections.filter((c) => c !== conn);
        this.notifyStatus();
      });
    });
  },

  async joinRoom(roomCode) {
    if (!window.Peer) {
      throw new Error("PeerJS library is not loaded.");
    }
    this.leaveRoom();

    const cleanCode = roomCode.trim().toUpperCase();
    const targetPeerId = "ideahub-room-" + cleanCode.toLowerCase();

    return new Promise((resolve, reject) => {
      try {
        this.peer = new window.Peer({
          debug: 1,
        });

        const timeout = setTimeout(() => {
          if (!this.isInRoom) {
            reject(new Error(`Could not connect to room "${cleanCode}". Verify the room code.`));
          }
        }, 8000);

        this.peer.on("open", () => {
          const conn = this.peer.connect(targetPeerId, {
            reliable: true,
          });

          conn.on("open", () => {
            clearTimeout(timeout);
            this.isInRoom = true;
            this.isHost = false;
            this.roomCode = cleanCode;
            this.connections = [conn];
            this.notifyStatus();
            resolve(cleanCode);
          });

          conn.on("data", (data) => {
            if (data && (data.type === "INIT_STATE" || data.type === "SYNC_STATE")) {
              store.importData({ posts: data.posts, folders: data.folders }, true);
              store.notify(false); // Update UI
            }
          });

          conn.on("close", () => {
            this.leaveRoom();
          });

          conn.on("error", (err) => {
            console.error("Connection error:", err);
            this.leaveRoom();
          });
        });

        this.peer.on("error", (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    });
  },

  broadcastState({ posts, folders }, excludeConn = null) {
    const payload = {
      type: "SYNC_STATE",
      posts,
      folders,
      time: Date.now(),
    };

    this.connections.forEach((conn) => {
      if (conn !== excludeConn && conn.open) {
        try {
          conn.send(payload);
        } catch (err) {
          console.warn("Failed to broadcast to peer:", err);
        }
      }
    });
  },

  leaveRoom() {
    this.connections.forEach((conn) => {
      try {
        conn.close();
      } catch (e) {
        // ignore
      }
    });
    this.connections = [];

    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (e) {
        // ignore
      }
      this.peer = null;
    }

    const wasInRoom = this.isInRoom;
    this.isInRoom = false;
    this.roomCode = "";
    this.isHost = false;

    if (wasInRoom) {
      this.notifyStatus();
    }
  },

  // Share URL Generator (#share=...)
  generateShareUrl(data) {
    const jsonStr = JSON.stringify(data);
    // Base64 encode UTF-8
    const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}#share=${base64}`;
  },

  // Parse #share= from URL hash
  parseShareUrl() {
    try {
      const hash = window.location.hash;
      if (hash && hash.startsWith("#share=")) {
        const base64 = hash.replace("#share=", "");
        const jsonStr = decodeURIComponent(escape(atob(base64)));
        const data = JSON.parse(jsonStr);
        // Clear hash from address bar without reloading
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        return data;
      }
    } catch (e) {
      console.warn("Failed to parse share URL:", e);
    }
    return null;
  },

  // Export board as JSON file download
  exportJSONFile(filename = "ideahub-backup.json") {
    const data = store.exportData();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // Import JSON file
  async importJSONFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          const count = store.importData(data, true);
          resolve(count);
        } catch (e) {
          reject(new Error("Invalid JSON file format."));
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file."));
      reader.readAsText(file);
    });
  },
};
