# WebCraft

English documentation for the project.

An experimental open-source project that recreates the Minecraft experience in the browser using front-end web technologies.

> ⚠️ **Early Testing Stage**
> The project is currently in its early development phase. Features are being iterated quickly, and the save format and APIs may change at any time.

## 🎯 Project Goals

In the pre-stage, the project aims to recreate the core experience of Minecraft in the browser using pure front-end technologies (HTML + JavaScript + WebGL):
block worlds, first-person exploration, mining and building, day/night cycles, weather, lighting, and biome systems.

## 🛠️ Tech Stack

- **Three.js** — 3D rendering
- **Native JavaScript** — game logic
- **WebGL** — GPU acceleration
- **localStorage** — local save data
- **Pure front-end** — no backend required; can run on static hosting

## ✨ Features Currently Implemented

### World
- Infinite world generation with chunk-based loading and unloading
- Procedural terrain generation driven by noise
- Biomes: forest / plains / desert
- Cave system (3D noise)
- Tree generation (logs + leaves)
- Day/night cycle (40 minutes per full day)
- Weather system: clear / rain / snow / sandstorm

### Gameplay
- First-person view + touch joystick
- Mining / placing blocks
- Inventory system + hotbar
- Crafting system (currently only basic recipes)
- Block drops + auto-pickup
- Sand gravity simulation
- Flight mode
- Spectator mode (X-ray style)

### Lighting（have serious bugs,we are fixing now.)
- Minecraft-style voxel lighting system
- Vertical sky light propagation + horizontal diffusion
- Torch point light sources
- Occlusion-based brightness grading

### Saves
- Automatic saving to browser `localStorage`
- Export / import `.json` save files

## 🚧 In Development / Planned

- [ ] More block types
- [ ] More complete crafting system
- [ ] Mobs / monsters
- [ ] More realistic MC-style lighting propagation
- [ ] Performance optimization (chunk mesh merging)
- [ ] Multiplayer

## 📱 How to Run

### Play Online
Visit the GitHub Pages site:
https://da8m0n-vye11in.github.io

### Run Locally
After cloning the repository, serve the root directory with any HTTP server (do not open it directly using `file://`):

```bash
python3 -m http.server 8000
# Then visit http://localhost:8000
```

```text
.
├── index.html      # Main page + game logic
├── lighting.js     # Voxel lighting engine
├── README.md       # Chinese project documentation
└── README_EN.md    # English project documentation
```

## 🎮 Controls

- Move: virtual joystick in the lower-left corner
- Look around: drag on empty screen area
- Place block: tap the screen
- Break block: hold the screen for 0.45 seconds
- Jump: green button in the lower-right corner
- Switch block: hotbar at the bottom
- Inventory / crafting: `⋯` button on the left side of the item bar
- Settings: top-right ⚙️
- Save / load: top-right 💾 / 📂

## ⚠️ Disclaimer

- This project is not officially affiliated with Mojang / Microsoft.
- All code is for learning and research purposes.
- The textures are procedurally generated pixel noise and do not include any official assets.

## 📌 Notes

This project is still under active development and is primarily a personal experimentation project for recreating Minecraft mechanics in the browser.
