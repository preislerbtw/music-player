# Music Player

<p align="center">
  <br />
  A desktop music player built with React, TypeScript, Tailwind CSS, Vite, Electron, and Python.
  <br /><br />
  <img src="./project3.png" alt="Music Player Preview" width="100%" />
</p>

---

## About the Project

**Music Player** is a desktop application designed to play and organize music stored locally on your computer.

The application features a user interface built with React and TypeScript, using Electron to run as a desktop application. Its goal is to provide a simple experience for importing music folders, organizing a personal music library, and controlling playback in one place.

The project also explores the integration of web technologies with native system resources, as well as the use of auxiliary tools for music library management.

## Project Status

**In development — experimental project.**

The project is undergoing improvements to its code organization, user interface, and component integration.

The original proposal also considered integrations with external music services such as Spotify and YouTube. These integrations involve their own challenges, including APIs, authentication, feature availability, and access restrictions.

The application's primary focus is playing and organizing local audio files. Available features may change as development progresses.

## Features

- Import music folders.
- Organize a local music library.
- Display imported tracks.
- Play audio files.
- Playback controls.
- Navigate between tracks.
- Volume control.
- Track progress bar and duration.
- Display track information.
- Read audio file metadata.
- Display album artwork when available.
- Desktop interface powered by Electron.

> The availability of each feature depends on its implementation in the current version of the project.

## Supported Audio Formats

The project is intended to work with the following formats:

| Format | Extension |
|---|---|
| MPEG Audio Layer III | `.mp3` |
| Free Lossless Audio Codec | `.flac` |
| Waveform Audio File Format | `.wav` |
| MPEG-4 Audio | `.m4a` |
| Ogg Vorbis | `.ogg` |

Actual playback depends on Chromium/Electron audio support and the implementation used by the application.

## Project Structure

The project separates visual components, React hooks, utilities, and Electron-specific resources.

```text
music-player/
├── electron/
│   ├── dist/
│   ├── main.cts
│   └── preload.cts
├── src/
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── IconButton.tsx
│   │   ├── PlayerBar.tsx
│   │   ├── Sidebar.tsx
│   │   └── TrackList.tsx
│   ├── downloads/
│   │   └── downloader.py
│   ├── hooks/
│   │   └── usePlayer.ts
│   ├── styles/
│   │   └── App.css
│   ├── utils/
│   │   ├── formatTime.ts
│   │   └── useLibrary.ts
│   ├── App.tsx
│   ├── electron.d.ts
│   ├── index.css
│   ├── main.tsx
│   ├── types.ts
│   └── vite-env.d.ts
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── tsconfig.electron.json
├── vite.config.ts
├── project3.png
└── README.md
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/)
- npm, included with Node.js
- Python, if you use the corresponding auxiliary scripts

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/preislerbtw/music-player.git
   ```

2. Navigate to the project directory:

   ```bash
   cd music-player
   ```

3. Install the dependencies:

   ```bash
   npm install
   ```

4. Start the development environment:

   ```bash
   npm run dev
   ```

The development command should launch the interface and desktop application according to the project's Vite and Electron configuration.

## Author

**Jorge Preisler**

Developed as a learning and portfolio project, focusing on frontend development, TypeScript, and desktop applications with Electron.

---