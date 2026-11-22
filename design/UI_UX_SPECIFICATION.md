# UI/UX Specification - Turkey Travel Map

## 1. Visual Hierarchy & Theme System

The user interface follows a modern, card-based flat design with high contrast, crisp borders, and subtle elevation shadows.

### Theme Modes (Light & Dark)
The app features an instant Theme Switcher supporting both light and dark environments:

| Token | Light Theme | Dark Theme | Purpose |
| :--- | :--- | :--- | :--- |
| `--bg-primary` | `#f8fafc` | `#0b0f19` | Application backdrop |
| `--bg-secondary` | `#ffffff` | `#111827` | Header, sidebar, and drawer cards |
| `--bg-tertiary` | `#f1f5f9` | `#1f2937` | Input backgrounds, chips, stat boxes |
| `--border-color` | `#e2e8f0` | `#2e3a50` | Dividers and card borders |
| `--text-primary` | `#0f172a` | `#f8fafc` | Headings and primary labels |
| `--text-muted` | `#94a3b8` | `#64748b` | Subtitles, hints, and placeholders |
| `--province-empty-fill` | `#f1f5f9` | `#1a2436` | Baseline unvisited province fill |
| `--province-empty-stroke`| `#cbd5e1` | `#2e3d55` | Province boundary outline |

---

## 2. Category Color & Pattern System

The core visual language relies on distinct textures and randomized harmonious color palettes so statuses remain vibrant, distinct, and easily recognizable:

### 1. Lived in (Home / Residence / University) 🏠
- **Visual Style**: Randomized diamond crosshatch mesh.
- **Color Architecture**: Saturated jewel-tone base (`meshBg`), high-contrast luminous diamond lines (`meshColor`, e.g. gold, radiant cyan, magenta), and secondary interior diamond accents (`meshAccent`).
- **Texture Meaning**: Signifies primary residence, historical roots, and long-term stay. Takes highest precedence in map display.

### 2. Visited (Leisure / Vacation)
- **Visual Style**: Solid vibrant color.
- **Palette**: Harmonious HSL colors with high saturation ($\ge 75\%$) and balanced lightness ($50\% - 55\%$) so neighboring provinces contrast clearly.
- **Customization**: Cities retain their assigned color; users can click `🎲 Re-roll Color` or the swatch to reassign colors.

### 3. Visited for Work (Business / Conference / Meeting)
- **Visual Style**: Randomized diagonal stripes ($45^\circ$ angle).
- **Color Architecture**: Punchy vibrant stripe lines (`stripeColor`) over harmonized deep background tints (`stripeBg`).
- **Theme Adaptation**: Background adjusts contrast between Light (`30%` lightness) and Dark (`10%` lightness) modes.
- **Texture Meaning**: Striped hatching signifies professional/business purpose.

### 4. Passed Through (Transit / Highway / Train / Airport Layover)
- **Visual Style**: Randomized polka-dot matrix pattern.
- **Color Architecture**: Saturated circular dots (`dotColor`) on subtle matching pastel-tinted backgrounds (`dotBg`).
- **Texture Meaning**: Dotted texture conveys movement, routes, and transit stops.

### 5. Universal Drawer Customizer
- **Availability**: Available across all four categories (`lived`, `visited`, `work`, and `passed`).
- **Live Preview Swatch**: Renders accurate CSS gradients representing the selected category's pattern and colors.
- **Option Previews**: Drawer category selection cards dynamically showcase the active province's custom pattern colors.
- **Re-Roll Controls**: Clickable swatch and `🎲 Re-roll Color` button to generate fresh coordinated palettes.

### 6. Not Visited
- **Visual Style**: Subtle empty fill (`#f1f5f9` light / `#1a2436` dark) with a clean stroke (`#cbd5e1` light / `#2e3d55` dark).

---

## 3. Residency Timing Controls in Drawer

When the user selects **"Lived in"**, the drawer dynamically replaces the single date picker with the **Residency Timing Panel**:

1. **Switcher Buttons**:
   - `📅 Moved in & Left`: Enables exact date range logging.
   - `⏳ Lived for X Years`: Enables fast duration logging.
2. **Move-in / Move-out Inputs**:
   - `When did you move in?`: HTML5 date input.
   - `I currently still live here 🏠`: Checkbox that locks/disables move-out input.
   - `When did you leave?`: HTML5 date input (active only if not currently living there).
3. **Duration Controls**:
   - Numerical input (`min="0.1" step="0.5"`) paired with a unit selector (`Years` / `Months`).

### Date Precision & Rounding Selector (Standard Visits)
For all travel categories (Visited, Work, Passed), users can customize date precision using a 4-tier selector:
1. **📅 Exact Day (`day`)**: Full calendar date picker (`YYYY-MM-DD`).
2. **🗓️ Month & Year (`month`)**: Select month (January..December) and enter year (e.g. "July 2023"), day remains unspecified.
3. **📆 Year Only (`year`)**: Enter 4-digit year (e.g. "2021"), month and day remain unspecified, with a quick "This Year" button.
4. **❓ Undated (`undated`)**: Mark trip as completely undated with an explanatory drag-and-drop banner.

### Drag & Drop Undated Card Placement in Chronological View
- Undated cards in the bottom list feature a `⠿` drag handle.
- Dragging over timeline cards reveals glowing blue drop target lines (`.drop-target-top` / `.drop-target-bottom`).
- Dropping between two cards places the card chronologically at that exact relative position.
- Placed undated cards feature a warm amber left border (`.timeline-card-placed-undated`), an amber `📌 Undated` tag, and an `↩ Move to Undated` action button.
- Dragging a placed card back onto the `#undated-section-box` or clicking `↩` returns it to the undated list.

---

## 4. Map Photo Display Styles, Multi-Photo Clusters & Lightbox

### Photo Style Selector (In City Drawer)
When a photo is attached or uploaded, users can choose between 3 visual presentation styles:
1. **Circular Pin (`circle`)**:
   - Floating circular pin centered at the city centroid ($r = 16\text{px}$).
   - Decoupled inner/outer architecture eliminating hover position jitter.
   - 2.5px solid white border with `#2563eb` accent stroke and bottom-right camera badge.
   - **Multi-Photo Cluster**: Previous trip photos render as smaller satellite bubbles (`.map-photo-satellite`, $r=10\text{px}$) arranged around the primary pin with trip dates and click-to-lightbox actions.
2. **Polaroid Snapshot (`polaroid`)**:
   - Classic white photographic card with bottom chin, red push pin, and drop shadow.
   - **Multi-Photo Tilted Stack**: Previous trip snapshots render underneath the primary card at varied authentic tilt angles ($-16^\circ, +18^\circ, -10^\circ$) creating an evocative photo-album scrapbook scatter.
   - Includes total photo counter badge and hover micro-interaction.
3. **Fill City Boundary (`fill`)**:
   - Maps the photo directly onto the province's geographic vector polygon using an SVG `<pattern>`.
   - **Boundary Rotating Roaster**: When multiple photos exist, an automatic background roaster cycles photos every 3.2 seconds.
   - Floating roaster badge (`🔄 cur/total`) at centroid with spinning icon and click-to-lightbox action.

### Home View Reset Control
- **Top Toolbar**: `🏠 Home` button (`#home-view-btn`).
- **Floating Controls**: `🏠` button (`#zoom-home-btn`).
- **Behavior**: Smoothly animates viewing pan coordinates to the calibrated viewport home position with a 350ms ease-out transition:
  - **Full Screen (`> 1024px`)**: Exactly centered at `(x: 0, y: 0, scale: 1.0)`, delivering balanced top/bottom clearance (`~153px/152px` at 1080p).
  - **Compacted / Half Screen (`<= 1024px`)**: Lowered to `(x: 0, y: ~16–22px, scale: 1.0)`, providing comfortable breathing room from the toolbar while ensuring KKTC remains safely inside the viewport.
  - Dynamically updates upon window resize when at the default zoom scale.

### Photo Toggle Switch
- Located on the top map toolbar: `📷 Photos`
- **Active (ON)**: Photo markers and boundary fills are rendered.
- **Inactive (OFF)**: Photo markers and boundary fills are hidden, revealing the pure patterned map underneath.

### Full-Screen Lightbox Modal
- Dark blurred backdrop (`rgba(0, 0, 0, 0.85)` + `backdrop-filter: blur(8px)`).
- Enlarged image with responsive scaling (`max-height: 70vh`).
- Header showing city name and date.
- Caption showing notes and trip story.

---

## 5. Layout & Responsive Structure

```
+-------------------------------------------------------------------------+
| [🇹🇷 Turkey Travel Map]      [Demo] [Export Image] [Backup] [🌙 Dark Mode] |
+-------------------------------------------------------------------------+
| [🗺️ Atlas | 🌍 Geo] [🏷️ Labels] [📷 Photos] [📍 My Location] [🔍 Search] | (Tabs) |
|-----------------------------------------------------------------|  Log  |
|                                                                 | Stats |
|                    Interactive Map Canvas                       | Cities|
|               (Pan, Zoom, Hover Tooltips, Pins)                 |-------|
|                                                                 | Chrono|
|                                                                 |Timeline|
|                                                                 | Group |
|  [+ / - / ⟲ Zoom Bar]                                          | by    |
|  [Category Legend Box: Lived/Visit/Work/Pass]                   | Year  |
+-------------------------------------------------------------------------+
```

### Desktop Layout
- Two-column split layout (`1fr` map view, `380px` sticky right sidebar).
- Full-height view (`height: calc(100vh - 65px)`) without page scrolling.
- **Collapsible Sidebar**:
  - `❯` Minimize button pinned in sidebar tabs nav.
  - Collapses sidebar smoothly to the right, expanding map to 100% canvas width.
  - Floating `[ ◀ 🗓️ Travel Log (count) ]` tab on map canvas right edge restores sidebar.
  - Keyboard shortcuts: `Ctrl+B`, `[`, or `]` to toggle.

### Mobile / Tablet Layout
- Single-column stacked layout with smooth vertical scrolling.
- Map view adapts to full device width.
- Collapsing the sidebar hides the bottom list, dedicating 100% of the viewport to the map.
- Slide-over drawer opens from the right/bottom with mobile touch-friendly buttons.

---

## 6. Geolocation & Current Location Radar UI

- **Toolbar Button**: `📍 My Location` (`#locate-user-btn`) with tooltip feedback.
- **Radar Marker**: Concentric pulsing circles (`.user-gps-marker` + `.gps-pulse`):
  - Inner solid cobalt blue dot (`#2563eb`) with white border.
  - Outer translucent blue ring expanding from `r=6px` to `r=28px` with decaying opacity (`@keyframes gpsPulse`).
- **Interactive Feedback**:
  - Request pending: *"Detecting your location..."*
  - Success inside territory: *"📍 You are in {City}! (Lat: {lat}, Lon: {lon})"* + auto-centers view.
  - Outside territory: *"📍 Your position is outside Turkey & Northern Cyprus."*
  - Permission denied: *"Location permission denied. Please enable location permissions in browser settings."*

---

## 7. Northern Cyprus (KKTC) Geographic Display

- **Entities**: 6 administrative districts (Lefkoşa, Gazimağusa, Girne, Güzelyurt, İskele, Lefke).
- **Positioning**: Rendered directly in the Mediterranean Sea south of Mersin, maintaining accurate relative geographic scale and orientation.
- **Country Badge & Tooltips**:
  - Top header badge: `81 Provinces + 6 KKTC (87 Cities)`.
  - Hover tooltips: Distinct `• KKTC` country tag and `Kuzey Kıbrıs` regional metadata.
- **Directory & Search Integration**: Filter and jump to any KKTC district via the directory tab or search input.

---

## 8. Brand Identity & App Icon System

The application features a bespoke, multi-layered visual identity reflecting travel exploration, geographic precision, and Mediterranean heritage:

### Visual Symbolism
1. **Squircle Backdrop**: Continuous rounded rectangle (`rx=108` on 512px canvas) filled with a rich Turkish crimson-to-ruby gradient (`#f43f5e` $\to$ `#881337`), layered with top specular lighting for glass-like tactile depth.
2. **Topography & Radar Ripples**: Faint concentric rings centered at the pin anchor representing GPS radar and travel routes.
3. **Flight / Road Trajectory**: Golden curved dashed arc sweeping across the background, connecting a departure point to an arrival star.
4. **Hero Map Marker Pin**: Sculpted white location pin with a ground contact shadow and golden radar beacon ring.
5. **Inner Midnight Portal**: Deep Aegean navy circle (`#0f172a`) with subtle latitude/longitude coordinates.
6. **Ay-Yıldız & Compass Star**: Radiant golden crescent paired with an 8-point adventure compass star.
7. **Camera / Memory Badge**: Floating royal blue circular badge with camera glyph anchored at the bottom-right of the pin, celebrating photo-logging travel memories.

### Asset Matrix
| Asset | Dimensions | Format | Usage |
| :--- | :--- | :--- | :--- |
| `icon.svg` | 512 × 512 | SVG | Master vector icon & header brand logo |
| `favicon.svg` | 64 × 64 | SVG | High-contrast browser tab favicon |
| `icon-512.png` | 512 × 512 | PNG | PWA install splash & maskable app icon |
| `icon-192.png` | 192 × 192 | PNG | Android home screen icon |
| `apple-touch-icon.png` | 180 × 180 | PNG | iOS / iPadOS home screen icon |
| `favicon-32x32.png` | 32 × 32 | PNG | Desktop browser tab icon |
| `favicon-16x16.png` | 16 × 16 | PNG | Legacy browser bookmarks & address bar |
| `favicon.ico` | Multi-size | ICO | Windows desktop shortcut (16, 32, 48px) |
