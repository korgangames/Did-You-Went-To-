# 🇹🇷 Turkey Travel Map & Journey Log

An interactive, responsive web application to track, visualize, and timeline your journeys and residencies across Turkey's 81 provinces and Northern Cyprus (87 total cities & districts) on a real geographic GUI.

Built entirely with **vanilla HTML5, CSS3, and JavaScript** — zero build tools, zero dependencies, zero CORS restrictions. Runs natively offline on desktop, tablet, and mobile.

---

## ✨ Key Features

- **🗺️ Real Geographic Map GUI**:
  - **Atlas Mode**: High-performance SVG vector map of Turkey's 81 provinces and Northern Cyprus (KKTC) 6 administrative districts pre-projected from official WGS84 GeoJSON data. Features smooth click-and-drag panning, mouse wheel zoom, and reset controls.
  - **Geographic Mode**: Toggleable Leaflet basemap layer with CartoDB/OpenStreetMap satellite and road tiles.
  - **Label Toggles**: Switch province license plate numbers (01–81) and KKTC district codes (KKTC-01–06) on or off.

- **📍 User Geolocation & Radar Tracking**:
  - Click the **`📍 My Location`** toolbar button to request browser location permissions and detect your position in Turkey or Northern Cyprus.
  - Real-time animated concentric radar pulse marker (`.user-gps-marker` + `.gps-pulse`) indicates your exact position.
  - Automatically identifies your current city/district and smooth-centers the map view.

- **📱 Brand App Icon & PWA Ready**:
  - Custom brand app icon featuring an iconic crimson-to-ruby squircle, sculpted map marker pin, midnight portal, golden Turkish Crescent & 8-point compass star, and travel photo lens badge.
  - Native scalable vector icons (`icon.svg`, `favicon.svg`) and high-resolution raster suite (`icon-512.png`, `icon-192.png`, `apple-touch-icon.png`, `favicon-32x32.png`, `favicon.ico`).
  - Web App Manifest (`manifest.json`) supporting standalone PWA installation on desktop (Chrome, Edge) and mobile (iOS, Android).

- **🎨 Texture & Pattern Categorization**:
  - **🏠 Lived in**: Rendered in a distinguished **royal indigo & golden diamond crosshatch mesh** pattern. Takes top priority in map display.
  - **🎨 Visited (Leisure / Vacation)**: Painted in distinct, vibrant random colors. Includes a `🎲 Re-roll Color` customizer.
  - **📐 Visited for Work**: Rendered in a crisp $45^\circ$ diagonal striped hatch pattern.
  - **⚬ Passed Through (Transit / Road Trip / Airport)**: Rendered in a clean polka-dot matrix pattern.
  - **⬜ Not Visited**: Clean neutral outline.

- **🏠 Comprehensive Residency Tracking ("Lived in")**:
  - Record the cities you have lived in, studied at, or called home.
  - **Date Range Mode**: Choose when you moved in and when you left.
  - **"I currently still live here" Toggle**: Mark a city as your ongoing current residence.
  - **Duration Mode**: Or simply record `"I lived there for X years"` without needing exact dates.

- **📷 City Photos, Display Styles & Boundary Roaster**:
  - Attach trip photos when recording visits with in-browser HTML5 Canvas compression (max 550px, ~35KB).
  - **3 Selectable Photo Display Styles**:
    - **⚪ Circular Pin (`circle`)**: Floating circular frame at city centroid with camera badge. Multi-photo cities show earlier trips as smaller satellite bubbles (`$r=10\text{px}$`) clustered around the pin.
    - **📸 Polaroid (`polaroid`)**: Realistic white-bordered snapshot frame with red pin and bottom chin. Multi-photo cities display previous photos scattered at tilted angles ($-16^\circ, +18^\circ, -10^\circ$) like an authentic travel scrapbook.
    - **🗺️ Fill City (`fill`)**: Maps the photo directly across the entire province boundary polygon. For cities with multiple photos, an automatic **Rotating Roaster** cycles photos every 3.2s with a live badge (`🔄 1/2`).
  - **🏠 Home Button**: Instantly and smoothly reset the map's pan and zoom angle with 350ms easing.
  - **Photo Switch (`📷 Photos`)**: Toggle photos ON or OFF to switch between photo memories and clean map patterns.
  - **Full-Screen Photo Lightbox**: Click any pin, satellite, polaroid, or roaster badge to view the photo with date and story caption.

- **🗓️ Chronological Timeline & Drag-and-Drop Placement**:
  - Record multiple visits to the same city across different years.
  - **Date Precision & Rounding**: Log visits with **Exact Day** (`YYYY-MM-DD`), **Month & Year** (`YYYY-MM`), **Year Only** (`YYYY`), or **Undated**.
  - **Drag & Drop Undated Cards**: Drag undated trip cards directly into the chronological timeline between other cards! Uses an interpolated timestamp algorithm so the card stays in its exact relative place across reloads and sort order flips.
  - **Drop Zones & Quick Actions**: Glowing drop indicator lines, drag handles (`⠿`), and an `↩ Move to Undated` button to revert.
  - **Dated Visits & Moves**: Automatically sorted chronologically, grouped by calendar year, with **⬇️ Newest First** / **⬆️ Oldest First** sorting.
  - **Residency Badges**: Displays moved-in and moved-out periods, duration tags, or *"Currently Living Here 🏠"*.
  - Multi-line notes field for capturing detailed memories, road routes, and stories.
  - Filter timeline entries by category (*All*, *Lived in*, *Visited*, *Work*, *Passed*).

- **📊 Exploration Statistics & Search**:
  - Real-time exploration progress (`X / 87` cities and districts, percentage badge, and stacked 4-color category progress bar).
  - Quick search bar on the toolbar to jump directly to any province or KKTC district by name or plate/code.
  - Full 87-entity directory with status tags.

- **📸 Export & Backup**:
  - **Export Image (PNG)**: One-click high-resolution PNG download (`1600 × 900`) with title, statistics, and legend.
  - **Backup & Restore (JSON)**: Complete data import/export (Schema v5) for cross-device transfer and safekeeping.
  - **Demo Journey**: Pre-loads a 10-city sample journey showcasing exact dates, month/year dates, year-only dates, and placed undated visits.
  - **Theme Switcher**: Instant Dark Mode (🌙) and Light Mode (☀️) toggle.

---

## 🚀 Getting Started

No installation or node setup required!

### Option 1: Direct File (Offline)
Simply open `index.html` in any modern web browser (Google Chrome, Microsoft Edge, Mozilla Firefox, Safari):
```
file:///path/to/index.html
```

### Option 2: Local HTTP Server
If you prefer running a local server:
```bash
# Python
python -m http.server 8080

# Or with Node npx
npx serve .
```
Then navigate to: `http://localhost:8080/index.html`

---

## 📁 Repository Structure

```
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
├── turkey-data.js          # Pre-projected SVG geometry, centroids, and GeoJSON for 87 cities & districts (81 Turkey + 6 KKTC)
├── turkey-provinces.json   # Raw WGS84 GeoJSON source for Turkey's 81 provinces
├── kktc_districts_raw.json # Raw WGS84 GeoJSON source for Northern Cyprus (KKTC) 6 districts
├── build_full_map_data.py  # Map projection & compilation script generating turkey-data.js
├── RELEASE_NOTES.md        # Comprehensive changelog tracking additions and removals
├── README.md               # Project documentation & user guide
├── .gitignore              # Standard gitignore
└── design/                 # Complete App Design documentation
    ├── ARCHITECTURE.md     # System architecture, projection math, rendering pipeline
    ├── UI_UX_SPECIFICATION.md # Visual design, color palette, SVG pattern specs, layouts
    ├── DATA_MODEL.md       # JSON schemas for visits, settings, and exports
    └── ROADMAP.md          # Future milestones, planned features, and backlog
```

---

## 📖 App Design Documentation

Detailed architectural and design specifications are maintained in the [`/design`](./design/) folder:
- [Architecture & Data Flow](./design/ARCHITECTURE.md)
- [UI/UX & Pattern Specification](./design/UI_UX_SPECIFICATION.md)
- [Data Model & Schemas](./design/DATA_MODEL.md)
- [Roadmap & Planned Features](./design/ROADMAP.md)

Release history and version tracking are maintained in [RELEASE_NOTES.md](./RELEASE_NOTES.md).

---

## 🛠️ Git Instructions

When you are ready to push this project to GitHub or any Git remote:

```bash
# 1. Initialize git repository
git init

# 2. Stage all project files
git add .

# 3. Create initial commit
git commit -m "feat: release v1.2.0 with lived-in residency tracking"

# 4. Link to remote repository and push
git remote add origin <YOUR_GITHUB_REPO_URL>
git branch -M main
git push -u origin main
```

---

## 📄 License
MIT License. Free to use, adapt, and share.
