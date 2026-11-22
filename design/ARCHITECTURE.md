# Application Architecture - Turkey Travel Map

## 1. System Overview

The **Turkey Travel Map & Journey Log** is an agentic, zero-dependency, client-side web application engineered to operate 100% offline and cross-platform. It provides an interactive geographic GUI to record, categorize, visualize, and timeline travel and residency experiences across all 87 cities and administrative districts (81 provinces of Turkey + 6 districts of Northern Cyprus / KKTC).

```
+-------------------------------------------------------------------------+
|                               Browser UI                                |
|  +--------------------+  +--------------------+  +--------------------+ |
|  |  Top Navigation    |  |  Interactive Map   |  |  Sidebar Panel     | |
|  |  (Themes, Export,  |  |  (SVG Vector Map / |  |  (Timeline Log,   | |
|  |  Demo, Backup)     |  |  Leaflet Basemap)  |  |  Stats, Directory) | |
|  +--------------------+  +--------------------+  +--------------------+ |
|                            ^            ^                               |
|                            |            |                               |
|                  +--------------------------------+                     |
|                  |     City Visit Drawer Form     |                     |
|                  |  - Category: Lived/Visit/Work  |                     |
|                  |  - Residency / Date Picker     |                     |
|                  |  - Photos & Multi-line Notes   |                     |
|                  +--------------------------------+                     |
+-------------------------------------------------------------------------+
                                   |
                                   v
+-------------------------------------------------------------------------+
|                        Application State & Logic                        |
|   - State Store (Visits, Preferences, View Mode, Photo Toggle)          |
|   - Category Precedence Engine (Lived > Visited > Work > Passed)        |
|   - Residency Timing Subsystem (Date Range vs Duration)                 |
|   - HTML5 Canvas Image Resizer / Compressor (max 550px, WebP/JPEG)      |
|   - Chronological Sorter & Year Grouper                                 |
|   - SVG Mercator Math & Dynamic Pattern Generator                       |
+-------------------------------------------------------------------------+
        |                                                 |
        v                                                 v
+-----------------------+                         +-----------------------+
|  Local Storage Sync   |                         |   Embedded Data Store |
|  (Persistence engine) |                         |   (turkey-data.js)    |
+-----------------------+                         +-----------------------+
```

---

## 2. Technical Stack

- **Markup**: Semantic HTML5 with accessible dialog drawers, SVG overlays, and responsive structure.
- **Styling**: Native CSS3 with CSS Custom Properties (CSS variables) for seamless Light/Dark mode theming, SVG pattern styling, and responsive CSS Grid/Flexbox layouts.
- **Client Logic**: Vanilla JavaScript (ES6+), modularized inside an IIFE closure to eliminate global namespace pollution.
- **Geographic Data**: WGS84 GeoJSON data for Turkey's 81 provinces and Northern Cyprus (KKTC) 6 districts pre-projected into SVG coordinates (`turkey-data.js`) for instant zero-lag rendering.
- **Optional GIS Layer**: Leaflet.js (via CDN with graceful offline fallback to pure SVG Atlas mode).

---

## 3. Projection & Vector Map Engine

The default **Atlas Map** bypasses tile loading overhead and CORS restrictions by projecting GeoJSON coordinates directly into an SVG coordinate space (`1000 x 500` viewBox).

### Mercator Coordinate Transformation
The mapped territory spans longitudes `25.5°E` to `44.9°E` and latitudes `34.8°N` to `42.3°N` (extended south from `35.7°N` to seamlessly encompass Northern Cyprus directly south of Mersin/Antalya).
Mercator $Y$ projection is calculated using:
$$y_{\text{rad}} = \ln\left(\tan\left(\frac{\pi}{4} + \frac{\text{lat} \cdot \pi}{360}\right)\right)$$

The aspect ratio ($2:1$) reflects true geographic dimensions.

### Pan & Zoom Subsystem
- **Mouse**: Click-and-drag panning, mouse wheel zooming centered on the map.
- **Touch**: Single-touch drag panning on mobile devices.
- **Controls**: On-screen `+`, `−`, and `⟲` (Reset View) buttons.
- State is managed via `panZoom = { x, y, scale }` and rendered via CSS transforms for 60fps GPU acceleration.

---

## 4. Pattern & Styling Engine

Provinces are rendered with dynamic SVG fills based on a priority hierarchy:
$$\text{Lived in} \succ \text{Visited} \succ \text{Visited for Work} \succ \text{Passed Through}$$

Every province has an individually initialized and persistent color settings profile generated via `generateCityColorSet(plate, hue)`:

1. **Lived in (Home / Residence)**:
   - Highest tier visual representation.
   - Filled with a dynamic, harmonious diamond crosshatch mesh using province-specific jewel-tone backgrounds (`meshBg`), vibrant grid lines (`meshColor`), and luminous diamond accents (`meshAccent`):
     ```xml
     <pattern id="pattern-lived-{plate}" width="16" height="16" patternUnits="userSpaceOnUse">
       <rect width="16" height="16" fill="{meshBg}" />
       <path d="M 0 0 L 16 16 M 16 0 L 0 16" stroke="{meshColor}" stroke-width="2.5" />
       <path d="M 0 8 L 8 0 L 16 8 L 8 16 Z" fill="none" stroke="{meshAccent}" stroke-width="1.2" opacity="0.75" />
     </pattern>
     ```

2. **Visited (Leisure / Vacation)**:
   - Filled with a distinct, persistent vibrant hex/HSL color assigned per city (`color`).
   - Re-rollable via `🎲 Re-roll Color` or by clicking the live preview swatch.

3. **Visited for Work**:
   - Filled with a $45^\circ$ diagonal striped hatch pattern using province-specific vibrant stripe lines (`stripeColor`) and deep harmonized backgrounds (`stripeBg`):
     ```xml
     <pattern id="pattern-work-{plate}" width="16" height="16" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
       <rect width="16" height="16" fill="{stripeBg}" />
       <line x1="0" y1="0" x2="0" y2="16" stroke="{stripeColor}" stroke-width="5" />
     </pattern>
     ```

4. **Passed Through (Transit / Highway / Airport)**:
   - Filled with a polka-dot grid pattern using province-specific vibrant dots (`dotColor`) and subtle matching background tints (`dotBg`):
     ```xml
     <pattern id="pattern-passed-{plate}" width="16" height="16" patternUnits="userSpaceOnUse">
       <rect width="16" height="16" fill="{dotBg}" />
       <circle cx="8" cy="8" r="3.5" fill="{dotColor}" />
     </pattern>
     ```

5. **Universal City Drawer Customizer & Dynamic Previews**:
   - The color row (`#drawer-color-picker-row`) is active for all four categories, rendering real-time CSS gradients (`getCategoryCssStyle(cat, settings)`):
     - `lived`: criss-cross repeating linear gradients.
     - `visited`: solid vibrant color.
     - `work`: repeating diagonal stripes.
     - `passed`: radial-gradient polka dots.
   - Re-rolling via `reRollCityColors(plate)` dynamically regenerates the city's coordinated color set and immediately updates SVG patterns, map paths, and drawer previews.

6. **Physical Map Color Specificity & Inline Fills**:
   - In SVG/CSS cascading rules, a stylesheet rule like `.province-path { fill: var(--province-empty-fill); }` carries specificity `(0, 0, 1, 0)`, which takes precedence over an SVG presentation attribute `fill="..."`.
   - `refreshMapFills()` directly sets inline style `path.style.fill` with specificity `(1, 0, 0, 0)`, ensuring solid hex colors and `url(#pattern-*)` fill definitions render with 100% reliability across all browsers.

6. **Interactive Photo Pins, Multi-Style Clusters & Jitter Elimination**:
   - For provinces with an attached photo, the map renders visual memories in one of three selectable styles:
     - **Circular Pin (`circle`)**: An SVG `<g class="map-photo-pin">` at the city centroid. Multi-photo cities show previous trip photos as smaller satellite bubbles (`.map-photo-satellite`, $r=10\text{px}$) arranged around the center pin.
     - **Polaroid Snapshot (`polaroid`)**: An SVG `<g class="map-polaroid-pin">` featuring a classic white photographic border, drop shadow, red push pin, and bottom chin. Multi-photo cities show previous photos fanned out behind the main snapshot at varied tilt angles ($-16^\circ, +18^\circ, -10^\circ$).
     - **Fill City Boundary (`fill`)**: Maps the photo directly across the entire province boundary polygon using an SVG `<pattern id="pattern-photo-fill-{plate}">`.
   - To eliminate hover jitter caused by CSS `transform: scale()` colliding with outer translation, all pins use a decoupled architecture:
     ```xml
     <g class="map-photo-pin" transform="translate(cx, cy)">
       <g class="map-photo-pin-inner">
         <!-- circular frame, clipped photo image, and camera badge -->
       </g>
     </g>
     ```
   - Hover scaling (`scale(1.35)`) is scoped strictly to the inner element, preserving the parent position translate and ensuring silky smooth zoom animations.
   - Visibility is controlled by the `showPhotos` toolbar toggle.

---

## 5. Residency & Timing Subsystem

When "Lived in" is selected, the form switches dynamically to the residency timing engine:
- **Date Range Mode**: Captures `startDate` (moved in) and `endDate` (moved out).
- **"Still living here" Flag**: When checked, designates the city as current residence and hides the move-out date.
- **Duration Mode**: Captures simple duration metrics (`durationYears`, e.g. "4 years", "18 months") for users without exact calendar dates.

---

## 6. Client-Side Image Compression Pipeline

To prevent exceeding the 5MB browser `localStorage` quota when users upload high-resolution smartphone photos (typically 4MB–12MB):
1. User selects an image file via `<input type="file" accept="image/*">`.
2. Image is loaded into an offscreen HTML5 `<canvas>`.
3. Resized proportionally to a maximum bounding box of `550px × 550px`.
4. Exported to Base64 JPEG (`quality: 0.82`), reducing file size from ~5MB to ~35KB–50KB (a ~99% reduction).
5. Enables storing dozens of city photos directly in `localStorage` without external servers.

---

## 7. Chronological Log & Timeline Engine

Visits and residencies are stored as discrete records allowing multiple entries per city.
- **Dated Visits & Moves**: Formatted as ISO `YYYY-MM-DD`, sorted chronologically, grouped by calendar year.
- **Residency Badges**: Displays move-in/out ranges, duration tags, or "Currently Living Here 🏠" indicators.
- **Undated Visits**: Stored with `isDated: false`, grouped in an expandable accordion drawer.
- **Card Actions**: Click-to-focus on map, full photo lightbox trigger, editing, and deletion.

---

## 8. Export & Backup Pipeline

- **PNG Image Export**: Clones the live SVG DOM, serializes to XML, draws onto an HTML5 canvas (`1600 × 900`), and triggers a high-resolution PNG download with custom travel watermark, stats, and legend.
- **JSON Backup / Restore (Schema v3)**: Clean export/import of state objects, including residency and duration data.

---

## 9. Geolocation & Current Location Radar Subsystem

Users can locate themselves on the interactive map via the **`📍 My Location`** toolbar button.
1. **Permission Request**: Invokes `navigator.geolocation.getCurrentPosition()`.
2. **Geographic Bounds Validation**: Checks whether the coordinates fall inside Turkey or Northern Cyprus:
   $$\text{lat} \in [34.5^\circ, 42.5^\circ]\quad \land \quad \text{lon} \in [25.5^\circ, 45.0^\circ]$$
3. **SVG Coordinate Mapping**: Converts WGS84 `(lon, lat)` to SVG `(x, y)`:
   $$x = \text{padX} + \frac{\text{lon} - \text{minLon}}{\text{maxLon} - \text{minLon}} \cdot (W - 2\cdot\text{padX})$$
   $$y = H - \text{padY} - \frac{y_{\text{rad}}(\text{lat}) - y_{\text{rad}}(\text{minLat})}{y_{\text{rad}}(\text{maxLat}) - y_{\text{rad}}(\text{minLat})} \cdot (H - 2\cdot\text{padY})$$
4. **Radar Pulse Marker**: Injects `<g id="user-gps-marker">` with an animated concentric radar wave (`.gps-pulse`) and smooth-centers the map view on the user's location.
5. **Nearest City Detection**: Computes Euclidean distance across all 87 city centroids to identify and highlight the user's current city or district.
6. **Dual Mode Sync**: Automatically adds a synchronized pulsing circle marker on the Leaflet GIS map when active.

---

## 10. App Icon & Progressive Web App (PWA) Architecture

The application provides a comprehensive cross-platform icon ecosystem supporting desktop browsers, mobile operating systems (iOS and Android), and Progressive Web App installation:

```
icon.svg (512x512 Master Vector)
  ├── favicon.svg (High-contrast 64x64 browser tab vector)
  └── generate_icons.py (PIL / Lanczos 4x Supersampling Pipeline)
        ├── icon-512.png (512x512 Master & PWA Maskable)
        ├── icon-192.png (192x192 Android Standard)
        ├── apple-touch-icon.png (180x180 iOS Home Screen)
        ├── favicon-32x32.png (Desktop Browser Tab)
        ├── favicon-16x16.png (Legacy Bookmark Bar)
        └── favicon.ico (Multi-size Windows Icon: 16x16, 32x32, 48x48)
```

- **Vector Scalability**: Native SVG icons (`icon.svg`, `favicon.svg`) scale infinitely without pixelation or compression artifacts.
- **PWA Manifest (`manifest.json`)**: Configures standalone app launch mode, theme color (`#dc2626`), background color (`#0b0f19`), and responsive icon mapping.
- **Header Integration**: Renders `icon.svg` as the primary brand logo in the top app navigation bar.

---

## 11. Boundary Photo Fill & Rotating Roaster Subsystem

When a city has photos and its display style is set to `fill`:
1. **Dynamic SVG Pattern Definition**:
   - Computes or retrieves the SVG bounding box `[minX, minY, width, height]` for the province path.
   - Generates a custom pattern:
     ```xml
     <pattern id="pattern-photo-fill-{plate}" patternUnits="userSpaceOnUse" x="{minX}" y="{minY}" width="{width}" height="{height}">
       <image id="photo-fill-img-{plate}" href="{activePhoto}" x="0" y="0" width="{width}" height="{height}" preserveAspectRatio="xMidYMid slice" />
     </pattern>
     ```
   - Applies `path.style.fill = url(#pattern-photo-fill-{plate})` on the geographic boundary.
2. **Automated Roaster Interval (`startPhotoRoaster`)**:
   - Runs a lightweight background interval every 3200ms.
   - For any province with `photoStyle === 'fill'` and $>1$ photo, advances `roasterIndices[plate]`.
   - Directly updates the `<image href="...">` inside the pattern def and updates the counter text (`#roaster-txt-{plate}`) in the on-map badge without DOM re-renders.
3. **Interactive Roaster Badge (`.map-photo-roaster-badge`)**:
   - Floats at the city centroid with an animated rotating icon and `curIdx/totalPhotos` pill.
   - Clicking opens the full-screen photo lightbox for the currently visible slide.

---

## 12. Home View Reset Subsystem

The **`🏠 Home`** controls (`#home-view-btn` on the top toolbar and `#zoom-home-btn` on the floating zoom bar) provide an instant, reliable way to restore default viewport orientation:
1. **Adaptive Responsive Centering (`getHomePan()`)**:
   - **Full-Screen Desktop Mode (`> 1024px`)**: The map container is tall and the SVG letterboxing naturally centers Turkey (`viewBox="0 0 1000 500"`, `preserveAspectRatio="xMidYMid meet"`). Returns `x = 0, y = 0, scale = 1`, achieving exact mathematical & visual vertical and horizontal centering (within `1.5px`) with balanced `~153px` top/bottom clearance.
   - **Compacted / Half-Screen Mode (`<= 1024px`)**: The 1-column layout has a tight container height, so lowering it slightly (`y ≈ 16–22px`) provides comfortable breathing room away from the multi-row toolbar while preserving full clearance for Northern Cyprus (KKTC) above the bottom edge.
2. **Window Resize Synchronization**: A passive `resize` event listener automatically updates the home transform when switching between full-screen and half-screen modes (if the map is at default zoom scale and not actively dragged).
3. **Smooth Transition Injection**: Temporarily applies `svg.style.transition = 'transform 0.35s cubic-bezier(0.25, 1, 0.5, 1)'`.
4. **Transition Cleanup**: Removes the CSS transition after 380ms so subsequent drag and pan operations remain zero-latency and jitter-free.
5. **GIS Mode Synchronization**: Calls `leafletMap.setView([38.2, 35.2], 6)` when the Leaflet basemap mode is active.

---

## 13. Drag & Drop Chronological Placement & Date Precision Subsystem

### Date Precision & Rounding Engine
Users can log trips across 4 precision levels:
1. **Day (`day`)**: Exact date (`YYYY-MM-DD`). Sorted by exact day timestamp.
2. **Month (`month`)**: Rounded to month and year (`YYYY-MM`). Evaluated as mid-month (15th) for sorting.
3. **Year (`year`)**: Rounded to year only (`YYYY`). Evaluated as mid-year (July 1st) for sorting.
4. **Undated (`undated`)**: Completely undated, positioned initially in the Undated Visits accordion.

### Drag & Drop Timestamp Interpolation
When an undated card is dragged from "📌 Undated Visits" and dropped between Card $A$ (timestamp $T_A$) and Card $B$ (timestamp $T_B$) in the timeline:
$$T_{\text{placed}} = \frac{T_A + T_B}{2}$$
- **Persistence**: Stored on `visit.placedTimestamp` and saved to `localStorage`.
- **Order Preservation**: Because IEEE 754 floats provide 53 bits of precision, the card stays precisely between Card $A$ and Card $B$ across page reloads and when toggling between `⬇️ Newest First` and `⬆️ Oldest First`.
- **Un-placing**: Dragging the card onto `#undated-section-box` or clicking `↩ Move to Undated` clears `placedTimestamp` and returns it to the undated list.

---

## 14. Geographic Map (Leaflet & CARTO Basemaps API)

For real-world geographic context, the app includes an interactive Leaflet basemap layer powered by CARTO:
1. **Authenticated High-Capacity Endpoint**:
   - Uses the official CARTO Basemaps API key (`cb1_5dwh_1_ffb88db171cef3146ee1ae0f`) with a 5,000,000 monthly request quota.
   - High-DPI (`@2x`) retina support and parallel tile subdomains (`{s}` $\in \{a, b, c, d\}$).
2. **Theme-Aware Dynamic Tile Switching**:
   - **Light Theme**: CARTO `voyager` raster tiles:
     `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key={CARTO_API_KEY}`
   - **Dark Theme**: CARTO `dark_all` raster tiles:
     `https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png?key={CARTO_API_KEY}`
   - Tile URLs update smoothly via `leafletBaseTileLayer.setUrl(getCartoTileUrl())` when toggling between Light and Dark themes.
3. **GeoJSON & Pattern Overlay**:
   - Overlays the 87 Turkey & KKTC province boundary polygons on top of the geographic basemap via `L.geoJSON`.
   - Synchronizes with custom province color styles (`meshBg`/`meshColor`, `stripeBg`/`stripeColor`, `dotBg`/`dotColor`, and solid `color`) via `getLeafletFeatureStyle(feature)`.

---

## 15. Collapsible Sidebar & Full-Width Map Subsystem

To provide an immersive, full-screen map experience, the right sidebar panel (housing Travel Log, Progress stats, and Cities directory) is collapsable to the right:
1. **Grid Transition Mechanics**:
   - Normal layout: `.app-container { grid-template-columns: 1fr 380px; }`.
   - Collapsed state: `.app-container.sidebar-collapsed { grid-template-columns: 1fr 0px; }`.
   - `.sidebar-section` uses hardware-accelerated transforms: `transform: translateX(100%); opacity: 0; pointer-events: none; visibility: hidden;` with `transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)`.
   - The map container expands seamlessly to take up the full available viewport width.
2. **Dedicated Controls**:
   - **Collapse Trigger (`#sidebar-collapse-btn`)**: Pinned inside the sidebar tabs header with `❯`.
   - **Floating Expand Handle (`#sidebar-expand-btn`)**: Pinned to the upper-right edge of the map canvas displaying `◀ 🗓️ Travel Log` and live visit count badge (`#expand-log-count`).
   - **Keyboard Shortcuts**: Global listener for `[` or `]` or `Ctrl+B` (`Cmd+B`) toggles the sidebar state.
3. **State Persistence & Map Adaptation**:
   - Automatically saves state in `localStorage` (`turkey_travel_map_sidebar_collapsed`).
   - Fires `leafletMap.invalidateSize()` after CSS animation completion (`320ms`) to adapt GIS tile coverage.

---

## 16. Standalone Single-File Windows Executable Subsystem

To eliminate end-user friction and remove any requirement for Node.js, Python, or terminal commands, the application compiles into a portable single executable (`TurkeyTravelMap.exe`):
1. **Zero-Dependency Architecture**:
   - Compiled using the native Windows C# compiler (`C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe`), standard on all Windows 10/11 machines.
   - All 13 web assets (HTML, CSS, JS, SVG vector database, PNG/ICO icons) are directly embedded as binary assembly resources via `/resource:<file>,<name>`.
   - Resulting executable is only **1.83 MB** with instantaneous startup.
2. **In-Process Loopback HTTP Server**:
   - Spins up a background `HttpListener` bound to `http://127.0.0.1:<port>/` on a dynamically assigned free TCP port.
   - Streams requested files directly from assembly memory (`Assembly.GetExecutingAssembly().GetManifestResourceStream()`) with proper MIME types, CORS headers, and zero-cache directives.
3. **App-Mode Desktop Window**:
   - Detects Microsoft Edge and launches with `--app="http://127.0.0.1:<port>/" --window-size=1400,880`, creating a frameless, native application experience without browser chrome or URL address bars.
   - Sets up a system tray icon (`NotifyIcon`) with a context menu to open the map or cleanly exit.
   - Listens to browser process termination to automatically stop the server when the user closes the window.
