# IdeaHub — Clean & Collaborative Idea Manager

IdeaHub is a modern, collaborative knowledge management web application designed to help you capture, organize, search, and collaborate on your ideas, notes, and links in real-time. Built with a clean aesthetic, responsive layouts, and zero-server peer-to-peer collaboration, IdeaHub makes it effortless to work alone or together with teammates.

## ✨ What's New in Collab Edition

- **👥 Real-Time Collaboration Rooms (Zero-Server)**: Create a live room with a 4-character code (e.g., `HUB-8392`). Teammates can connect instantly via PeerJS/WebRTC to sync ideas, pins, and notes in real-time without needing a centralized backend.
- **🔗 Shareable Board Links (`#share=...`)**: Pack an entire collection of ideas into a portable URL link that anyone can open to preview and import into their IdeaHub.
- **🎨 Clean Typography & Styling**: Featuring the contemporary Alan Sans typeface, sleek light-mode design, color accents for cards, and smooth micro-animations.
- **📂 Intuitive Category Management**: Create and manage categories directly from the categories bar using the inline `+ New Category` button.
- **🔍 Instant Search & Multi-Criteria Filtering**: Filter ideas by type (All, ⭐ Pinned, 🔗 Links, 📝 Notes), filter by `#tags`, or search across titles, URLs, and notes.
- **📱 Responsive Layout & View Switcher**: Switch effortlessly between a multi-column **Grid View** and a compact **List View**.
- **📦 Board JSON Export & Import**: Download your entire board as a backup file (`ideahub-backup.json`) or import JSON files to restore or merge ideas.
- **👉 Touch Swipe Gestures**: Swipe left on any card to delete, swipe right to edit on touchscreen devices.

## 🚀 Features at a Glance

1. **Rich Idea Schema**: Save both Link ideas and text Notes with custom `#tags`, folder categorization, color swatches, and top-pinning.
2. **Auto-Title Fetching**: Automatically fetches webpage titles when you paste a link URL.
3. **Cross-Tab Sync**: Uses `BroadcastChannel` so multiple IdeaHub tabs stay instantly synchronized on your device.
4. **Local-First & Offline Ready**: Works offline with local-first storage and instant search.

## 🛠️ Technologies Used

- **Vite**: Ultra-fast frontend development and building.
- **Vanilla JavaScript**: High-performance reactive state management (`store.js`), DOM rendering (`ui.js`), and peer-to-peer sync (`collab.js`).
- **PeerJS**: WebRTC wrapper for zero-server real-time data channels.
- **Tailwind CSS**: Modern design system and styling.

## 🏁 Getting Started

### Prerequisites

- Node.js (v18+ recommended) installed on your machine.

### Installation & Development

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/idea-hub.git
   cd idea-hub
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open your browser at `http://localhost:5173`.

## 🤝 How to Collaborate in Real-Time

1. Click the **Collaborate** button in the top-right header.
2. In the **Live Room** tab, click **✨ Create New Room**.
3. You will receive a room code (e.g., `HUB-4289`).
4. Share the code or copy the direct invite link and send it to your teammate!
5. When your teammate enters the code and clicks **Join Room**, any changes made by either person are broadcasted in real-time.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
