# 🇹🇷 Turkey Travel Map & Journey Log

<p align="center">
  <img src="icon.svg" width="108" height="108" alt="Turkey Travel Map Logo" />
</p>

<p align="center">
  <strong>An interactive desktop &amp; web application to track, visualize, and timeline your journeys, vacations, work trips, and residencies across Turkey's 81 provinces and Northern Cyprus (87 total cities &amp; districts).</strong>
</p>

<p align="center">
  <a href="https://github.com/korgangames/Did-You-Went-To-/raw/main/TurkeyTravelMap.exe">
    <img src="https://img.shields.io/badge/Download%20for%20Windows-TurkeyTravelMap.exe_(v1.9.1)-2563eb?style=for-the-badge&logo=windows&logoColor=white" alt="Download Windows Executable" />
  </a>
  <a href="https://github.com/korgangames/Did-You-Went-To-/releases/latest">
    <img src="https://img.shields.io/badge/GitHub-Releases-10b981?style=for-the-badge&logo=github&logoColor=white" alt="GitHub Releases" />
  </a>
  <img src="https://img.shields.io/badge/Version-v1.9.1-f59e0b?style=for-the-badge" alt="Version 1.9.1" />
  <img src="https://img.shields.io/badge/License-MIT-64748b?style=for-the-badge" alt="MIT License" />
</p>

---

## 📥 Quick Download & Installation

Turkey Travel Map is designed to be **completely accessible, private, and effortless to run**. Choose the method that fits your operating system:

| Platform / Method | Download / Command | Size & Details |
| :--- | :--- | :--- |
| **🪟 Windows (Recommended)** | [**⬇️ Download TurkeyTravelMap.exe**](https://github.com/korgangames/Did-You-Went-To-/raw/main/TurkeyTravelMap.exe) | **1.85 MB** · Single-file standalone executable · Zero installation required |
| **🌐 Web Browser (Any OS)** | Clone / Download repo & double-click [`index.html`](./index.html) | Runs **100% offline** in Chrome, Edge, Firefox, Safari (macOS / Linux / Windows) |
| **📱 Mobile / PWA** | Open in mobile browser & tap **"Add to Home Screen"** | Full standalone Progressive Web App with offline caching & touch gestures |
| **💻 Local Server (Dev)** | `python -m http.server 8080` or `npx serve .` | Navigate to `http://localhost:8080/index.html` |

### 🚀 Running the Windows Executable (`TurkeyTravelMap.exe`):
1. **Download** [`TurkeyTravelMap.exe`](https://github.com/korgangames/Did-You-Went-To-/raw/main/TurkeyTravelMap.exe) from the link above or from the [Latest Release](https://github.com/korgangames/Did-You-Went-To-/releases).
2. **Double-click** the downloaded file.
3. **Enjoy!**
   - **Zero dependencies**: No Python, no Node.js, and no installer setup wizard needed.
   - **Dedicated Window**: Launches in an app window powered by Microsoft Edge App mode with a custom taskbar icon.
   - **100% Offline & Private**: All vector maps, city boundaries, font glyphs, and photo compression engines run in-memory on your machine. Your travel data never leaves your computer.

---

## 🎉 What's New in v1.9.1 (Latest Release)

### 🗺️ 1. Multi-Method Photo Coexistence per City & Clean Fill In
- **Clean Province Boundary Fill**: Removed the redundant empty circular frame / badge from the "Fill In" option. When a photo is set to fill the city, the province boundary itself cleanly textures the entire polygon with zero obstructive circular badges floating in the center.
- **Coexisting Photo Styles**: Styles are now selected **per visit** (`photoStyle: 'fill' | 'polaroid' | 'circle'`). A single city can now have a clean boundary fill photo **AND** Polaroid pins (with handwritten captions and 500% hover zoom) and/or Circular pins floating on top!
- **Single-Fill Constraint**: Enforces that at most 1 photo per city can be the active boundary fill at a time. Assigning "Fill City" to a visit automatically transitions any prior fill photo in that city to a Polaroid pin.
- **City Drawer Presentation Badges**: The City Drawer now displays clear presentation badges (`🗺️ Boundary Fill`, `📸 Polaroid`, `⚪ Circular`) on each visit entry.

---

## 🎉 What's New in v1.9.0

### 📸 1. Polaroid Custom Handwritten Notes & Captions
- When choosing the **Polaroid** photo style, you can now write a personalized handwritten caption (e.g. `"Kaleiçi Old Town ⛵"`, `"Cappadocia Sunset 🎈 2024"`) in the City Drawer (`#visit-polaroid-note`).
- Rendered across the bottom white chin of the Polaroid snapshot on the map in authentic cursive handwriting (`Caveat`, `Segoe Script`, cursive fallback).
- Auto-balances font size dynamically based on caption length so your memories fit legibly.

### 🔍 2. 500% Polaroid Hover Magnification (5x Zoom)
- Hovering over any Polaroid snapshot on the map smoothly magnifies it by **500%** (expanding from ~`40px` to ~`193px` width) with deep photographic drop shadows.
- Automatically brings the hovered card to the top of the map layer on `mouseenter` so it floats above neighboring cities without clipping.
- Stack count badge smoothly fades out during hover to present a clean, unblemished photograph.
- Optimized SVG layer order ensures province labels always sit cleanly underneath the magnified photo card.

### 🎯 3. Interactive Photo Fill Framing & Alignment (Pan & Rotate)
- When using the **Fill City** photo style, you can now customize which part of the photo is visible inside the irregular shape of any province!
- **Live Silhouette Mask Preview (`#fill-preview-svg`)**: An interactive preview box in the drawer shows the province's exact boundary outline with high-contrast interior and dimmed context surround.
- **Direct Drag-to-Pan**: Click/touch and drag directly on the preview box to position the photo.
- **Fine-Tuning Controls**:
  - `↔ Pan X`: `-100%` to `+100%` horizontal offset
  - `↕ Pan Y`: `-100%` to `+100%` vertical offset
  - `🔍 Zoom`: `50%` to `300%` scale
  - `🔄 Rotate`: `-180°` to `+180°` rotation slider with quick `↺ -90°`, `↻ +90°`, and `Reset` buttons.
- Full-canvas SVG pattern mapping (`1000 × 500`) eliminates pattern tiling or edge wrap-around artifacts.
- Custom framing persists per visit and synchronizes seamlessly with the multi-photo rotating roaster.

### 🔄 4. Zero-Jitter Roaster Centroid Badges (Bug Fix)
- Decoupled CSS hover scaling from SVG centroid translation using an inner group (`.map-photo-roaster-badge-inner`).
- Completely resolves the 60 fps rapid vibration/flickering bug when hovering over rotating roaster badges on cities with boundary photo fills.

### 🗓️ 5. Direct Edit Navigation from Travel Log
- Clicking `✏️ Edit` on any timeline card in the right sidebar now opens the City Drawer immediately in edit mode with all dates, notes, and photos populated.

---

## ✨ Full Feature Overview

### 🗺️ Dual Map Engine (Offline Vector Atlas & Geographic Satellite)
- **High-Performance SVG Vector Map**: Pre-projected from official GeoJSON boundaries covering Turkey's 81 provinces and Northern Cyprus (KKTC) 6 administrative districts (87 total entities).
- **Satellite & Street Mode**: Toggleable Leaflet basemap layer with official **CARTO Basemaps** integration (`voyager` in Light mode, `dark_all` in Dark mode).
- **Labels Toggle**: Show or hide province license plate numbers (01–81) and KKTC district codes.

### 🎨 Distinct Pattern & Harmonized Color Categories
- **🏠 Lived in**: High-priority **royal indigo & golden diamond crosshatch mesh** pattern.
- **🎨 Visited (Leisure / Vacation)**: Unique, vibrant solid colors with a `🎲 Re-roll Color` customizer.
- **📐 Visited for Work**: Crisp $45^\circ$ diagonal striped hatch pattern with harmonized background tints.
- **⚬ Passed Through (Transit / Road Trip / Airport)**: Clean polka-dot matrix pattern.
- **Deterministic Seeded Randomization**: Province plate numbers seed distinct hues (`(plate * 37) % 360`) ensuring neighboring provinces never clash.

### 🏠 Comprehensive Residency Tracking ("Lived in")
- **Date Range Mode**: Specify exact moved-in and moved-out dates.
- **"I currently still live here" Toggle**: Mark a city as your ongoing current home.
- **Duration Mode**: Or record `"I lived there for 4 years"` / `"18 months"` without needing exact calendar dates.

### 📷 City Photos & 3 Selectable Display Styles
- In-browser HTML5 Canvas image compression (max 550px, ~35KB) embedded into local state.
- **⚪ Circular Pin (`circle`)**: Centroid circular bubble with camera badge and satellite bubbles for earlier trips.
- **📸 Polaroid (`polaroid`)**: Tilted snapshot stack with handwritten note chin and 500% hover zoom.
- **🗺️ Fill City (`fill`)**: Photo textures the entire province boundary polygon with custom pan/rotate framing and an automatic rotating roaster (cycles every 3.2s).
- **Full-Screen Lightbox**: Click any photo pin or badge to view high-resolution photos with dates and stories.

### 🗓️ Chronological Timeline & Drag-and-Drop Placement
- Record multiple visits to the same city across different years.
- **Precision Rounding**: Supports **Exact Day** (`YYYY-MM-DD`), **Month & Year** (`YYYY-MM`), **Year Only** (`YYYY`), or **Undated**.
- **Drag & Drop Undated Cards**: Drag undated visits directly between dated visits in the timeline. Uses an interpolated timestamp algorithm so placement persists across reloads and sort order flips.

### 📊 Exploration Statistics & Search
- Real-time exploration progress (`X / 87` cities and districts, percentage badge, and stacked 4-color category progress bar).
- Quick search bar on the toolbar to jump directly to any province or KKTC district by name or plate/code.
- Full 87-entity directory with status tags.

### ◀️ Collapsible Right Sidebar
- Collapse/minimize the entire sidebar to the right edge with `#sidebar-collapse-btn` (`❯`) or keyboard shortcuts (`[` / `]` / `Ctrl+B`).
- Provides a full-width, immersive map canvas.
- Floating expand tab (`◀ 🗓️ Travel Log (14)`) keeps visit counts visible while collapsed.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `[` or `]` or `Ctrl+B` | **Toggle Right Sidebar** (Collapse / Expand) |
| `Escape` | **Close Drawer / Lightbox** |
| `+` / `-` | **Zoom In / Zoom Out** on Map |
| `0` | **Home Position** (Reset Map Pan & Zoom) |

---

## 📁 Repository Structure

```
├── TurkeyTravelMap.exe      # Standalone single-file Windows executable (1.85MB, zero install)
├── build_exe.py            # Automated Windows native compiler script (uses csc.exe)
├── index.html              # Main HTML markup, modals, drawer, and layout
├── style.css               # Complete styling, CSS variables, dark/light themes, animations
├── app.js                  # Application logic, state store, canvas compression, map engine
├── icon.svg                # Master scalable vector app icon (512x512)
├── favicon.svg             # High-contrast browser tab SVG favicon
├── manifest.json           # Progressive Web App (PWA) manifest
├── generate_icons.py       # Automated 4x supersampled icon generator for PNG/ICO assets
├── icon-512.png            # High-resolution 512x512 app icon
├── icon-192.png            # Standard 192x192 mobile app icon
├── apple-touch-icon.png    # 180x180 iOS home screen icon
├── favicon-32x32.png       # 32x32 browser tab icon
├── favicon.ico             # Windows multi-size desktop icon (16, 32, 48px)
├── turkey-data.js          # Pre-projected SVG geometry, centroids, and GeoJSON for 87 cities & districts
├── turkey-provinces.json   # Raw WGS84 GeoJSON source for Turkey's 81 provinces
├── kktc_districts_raw.json # Raw WGS84 GeoJSON source for Northern Cyprus (KKTC) 6 districts
├── build_full_map_data.py  # Map projection & compilation script generating turkey-data.js
├── RELEASE_NOTES.md        # Comprehensive changelog tracking all versions
├── README.md               # Project documentation & user guide
├── .gitignore              # Standard gitignore
├── .github/                # GitHub CI/CD workflows
│   └── workflows/
│       └── build-release.yml # Automated single-executable release builder
└── design/                 # Complete App Design documentation
    ├── ARCHITECTURE.md     # System architecture, projection math, rendering pipeline
    ├── UI_UX_SPECIFICATION.md # Visual design, color palette, SVG pattern specs, layouts
    ├── DATA_MODEL.md       # JSON schemas for visits, settings, and exports
    └── ROADMAP.md          # Future milestones, planned features, and backlog
```

---

## 🛠️ Building the Executable from Source

To compile `TurkeyTravelMap.exe` yourself on Windows:
```bash
python build_exe.py
```
This uses Windows native Microsoft .NET C# compiler (`csc.exe`) included with Windows and embeds all 13 application assets into the standalone `.exe` in ~1 second.

---

## 📄 License
MIT License. Free to use, adapt, and share. Developed for travelers exploring Turkey and Northern Cyprus.
