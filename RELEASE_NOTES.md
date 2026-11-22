# Release Notes & Changelog

All notable changes to the **Turkey Travel Map & Journey Log** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]
### Planned
- Connecting route lines between transit cities.
- Transport mode icons (✈️, 🚗, 🚆, 🚌, ⛵).
- Regional achievement badges.
- A3/A4 printable poster PDF exporter.

---

## [v1.8.0] - 2026-11-22

### Added
- **Collapsible & Minimizable Right Sidebar (Travel Log, Progress & Cities)**:
  - Users can now collapse/minimize the entire right-hand sidebar panel (holding the Travel Log, Category filters, Sort controls, Progress stats, and Cities directory) to the right side of the screen.
  - **Full-Width Immersive Map**: When collapsed, the map automatically expands from `1044px` to the full viewport width (`1424px+`), providing an unobstructed full-canvas map experience.
  - **Dedicated Minimize Button (`#sidebar-collapse-btn`)**: Pinned inside the sidebar tabs navigation row with an animated `❯` icon and hover tooltip (`"Minimize sidebar to right [Ctrl+B]"`).
  - **Floating Expand Handle (`#sidebar-expand-btn`)**:
    - When the sidebar is minimized, a floating tab smoothly slides onto the upper-right edge of the map canvas.
    - Displays `◀ 🗓️ Travel Log` along with a live visit count badge (e.g. `14`), keeping travel progress visible even while minimized.
    - One click restores the sidebar with an easing animation (`cubic-bezier(0.2, 0.8, 0.2, 1)`).
  - **Keyboard Shortcuts**: Pressing `[` or `]` or `Ctrl+B` (`Cmd+B`) toggles the sidebar open or closed from anywhere on the page without requiring mouse navigation.
  - **State Persistence**: The collapsed preference is automatically remembered across page reloads via `localStorage` (`turkey_travel_map_sidebar_collapsed`).
  - **Dynamic Map Invalidation**: Automatically notifies Leaflet (`leafletMap.invalidateSize()`) upon collapse/expand so tile rendering seamlessly covers the widened container with zero graphical artifacts.

---

## [v1.7.0] - 2026-11-22

### Added
- **CARTO Basemaps API Key Integration for Geographic Map**:
  - Integrated the official CARTO Basemaps API key (`cb1_5dwh_1_ffb88db171cef3146ee1ae0f`) with a 5,000,000 monthly request quota for high-reliability tile loading.
  - Configured dynamic theme-aware tile endpoints:
    - **Light Mode**: CARTO `voyager` raster tiles (`https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=...`).
    - **Dark Mode**: CARTO `dark_all` raster tiles (`https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png?key=...`).
  - Seamlessly updates tile URLs in real time when toggling between Light and Dark themes.
- **Harmonious Randomized Colors for All Pattern Categories**:
  - Upgraded **Diamond Mesh (`lived`)**, **Diagonal Stripes (`work`)**, and **Polka-Dots (`passed`)** styles to feature unique, randomized, harmonized colors for all 87 provinces (81 Turkey provinces + 6 Northern Cyprus districts):
    - **Diamond Mesh (`lived`)**: Saturated rich jewel-tone base (`meshBg`), high-contrast radiant diamond grid lines (`meshColor`), and luminous secondary diamond accents (`meshAccent`).
    - **Diagonal Stripes (`work`)**: Vibrant diagonal stripe lines (`stripeColor`) set against harmonized deep background tints (`stripeBg`).
    - **Polka-Dots (`passed`)**: Punchy circular dots (`dotColor`) on subtle matching pastel-tinted backgrounds (`dotBg`).
    - **Solid (`visited`)**: Retains unique vibrant solid fills (`color`).
  - **Deterministic Seed Generation**: City plate numbers seed unique hues (`(plate * 37) % 360`) ensuring no adjacent provinces share matching shades out of the box.
  - **Light/Dark Theme Adaptation**: Stored light/dark theme variants (`meshBgLight`/`meshBgDark`, `stripeBgLight`/`stripeBgDark`, `dotBgLight`/`dotBgDark`) dynamically adjust background contrast when switching themes while preserving vibrant foreground hues.
- **Universal City Drawer Pattern & Color Customizer**:
  - The color row (`#drawer-color-picker-row`) is now available across **all four categories** (`lived`, `visited`, `work`, and `passed`) rather than being restricted to `visited`.
  - **Context-Aware Dynamic Titles & Swatches**:
    - `lived`: *"City Mesh Style"* — renders a CSS criss-cross diamond mesh swatch.
    - `visited`: *"City Map Color"* — renders a solid vibrant swatch.
    - `work`: *"City Stripe Style"* — renders a CSS repeating diagonal stripe swatch.
    - `passed`: *"City Polka-Dot Style"* — renders a CSS radial-gradient polka-dot swatch.
  - **Dynamic Drawer Category Previews**:
    - The preview icons in the drawer's category picker cards (`#cat-preview-icon-*`) dynamically reflect the active province's custom randomized pattern colors.
  - **Interactive Re-Roll Button (`#reroll-color-btn`) & Clickable Swatch**:
    - Clicking `🎲 Re-roll Color` or clicking the swatch itself generates a fresh randomized hue palette for the active city, updates the SVG pattern defs (`updateSvgPatterns()`), updates the map fills in real time (`refreshMapFills()`), updates the drawer preview, saves to `localStorage`, and displays a toast notification (`"City pattern & colors updated! 🎲"`).
- **Leaflet GIS Mode Style Synchronization**:
  - Updated `getLeafletFeatureStyle()` to synchronize with the province's custom `meshBg`/`meshColor`, `stripeBg`/`stripeColor`, `dotBg`/`dotColor`, and `color`, ensuring complete visual parity between Vector SVG and Geographic Leaflet views.
- **Backward Compatibility Migration**:
  - Auto-upgrades existing `state.citySettings` in `getCityColor(plate)` so previously saved trips immediately gain randomized mesh, stripe, and dot colors without overwriting user photos or custom solid colors.

---

## [v1.6.1] - 2026-11-22

### Fixed
- **Adaptive Responsive Home View Centering (Full Screen vs Compacted Screen)**:
  - Resolved the bug where the Home position was not centered in full screen after applying a static Y-offset.
  - Implemented `getHomePan()` with responsive viewport intelligence:
    - **Full-Screen Desktop Mode (`> 1024px`)**: The map container is tall and SVG aspect-ratio letterboxing naturally centers Turkey; returns `translate(0px, 0px) scale(1)`, placing Turkey at the exact mathematical and visual center with balanced vertical clearance (`153.7px` top vs `151.9px` bottom at 1080p, `165.6px` vs `164.3px` at 900p) and generous breathing room above the Category Legend.
    - **Compacted / Half-Screen Mode (`<= 1024px`)**: The stacked 1-column layout has a tight aspect ratio; returns a dynamically calibrated vertical offset (`~16–21px`), lowering Turkey away from the multi-row toolbar while preserving full clearance for Northern Cyprus (KKTC) above the bottom edge.
  - Added an active window `resize` handler that automatically updates the home position if the map is at default view and not actively dragged, so snapping between half-screen and full-screen immediately updates the view.
  - Unified all Home reset buttons (`#home-view-btn`, `#zoom-home-btn`, `#zoom-reset-btn`) to use `getHomePan()`.
- **CSS Grid Container Height Constraint**:
  - Added `grid-template-rows: 100%`, `max-height: calc(100vh - 65px)`, and `min-height: 0` to `.app-container`, `.map-section`, `.sidebar-section`, and `.tab-panels`.
  - Fixes layout stretching when the Travel Log contains numerous visit cards, ensuring the sidebar scrolls cleanly within its container and the map never gets pushed below the viewport fold.

---

## [v1.6.0] - 2026-11-22

### Added
- **Interactive Drag & Drop for Undated Timeline Cards**:
  - Users can now drag undated trip cards from the bottom "📌 Undated Visits" section directly into the chronological timeline above and position them between other visits.
  - Dynamic blue drop target indicator lines (`.drop-target-top` & `.drop-target-bottom`) highlight insertion boundaries between cards during dragover.
  - Timestamp interpolation algorithm calculates an exact relative timestamp (`placedTimestamp = (prevTime + nextTime) / 2`), ensuring the undated card maintains its exact relative chronological placement across page reloads and when toggling between `⬇️ Newest` and `⬆️ Oldest` sort orders.
  - Placed undated cards feature a distinctive amber border (`.timeline-card-placed-undated`), an amber `📌 Undated` badge, a drag handle (`⠿`) for re-dragging, and a `↩ Move to Undated` button.
  - The "📌 Undated Visits" section at the bottom acts as a drop zone: dragging a placed card back onto it unplaces it.
  - Added a `📌 Place` quick-action button on undated cards allowing users to place visits into a specific year timeline via a dialog without mouse drag.
- **Date Precision Selector & Rounding Options**:
  - Replaced the single date picker with a modern 4-tier Date Precision Selector in the city drawer:
    1. **Exact Day (`day`)**: Standard calendar date input (`YYYY-MM-DD`).
    2. **Month & Year (`month`)**: Allows users to log visits rounded to a specific month and year without specifying the day (`YYYY-MM`, e.g. "July 2023").
    3. **Year Only (`year`)**: Allows users to log visits rounded to a specific year without specifying month or day (`YYYY`, e.g. "2021"), including a quick `This Year` shortcut button.
    4. **Undated (`undated`)**: Logs the visit as an undated trip with a banner reminder that it can be positioned into the timeline later.
  - Upgraded `formatDate()` to automatically parse and render full dates (`20 Jul 2023`), month/year strings (`July 2023`), and single years (`2021`).
  - Upgraded JSON export schema to version 5 (`version: 5`) with preservation of `datePrecision`, `isPlacedUndated`, and `placedTimestamp`.
- **Enriched Demo Journey**:
  - Pre-loads sample trips highlighting each precision level:
    - Muğla: Month & Year precision ("June 2022").
    - İzmir: Year Only precision ("2022").
    - Trabzon: Undated visit pre-placed into the 2021 timeline between Nevşehir and Adana.
    - Bursa: Undated visit in the bottom list ready to be dragged into the timeline.

---

## [v1.5.0] - 2026-11-22

### Added
- **"Home" Reset View & Zoom**:
  - Added dedicated **`🏠 Home`** button in the top map toolbar (`#home-view-btn`) and in the floating on-map zoom controls (`#zoom-home-btn`).
  - Smoothly resets the map viewing angle, pan translation (`x: 0, y: 0`), and zoom scale (`scale: 1`) using a 350ms easing transition (`cubic-bezier(0.25, 1, 0.5, 1)`).
  - Also recenters the secondary Leaflet GIS view to the default center (`[38.2, 35.2], zoom 6`).
- **Photo Display Style Options in Drawer**:
  - Introduced a 3-way display style selector (`#photo-style-selector-group`) inside the city visit drawer:
    1. **Circular Pin (`circle`)**: Floating circular frame at the city centroid with camera badge and satellite bubbles.
    2. **Polaroid Snapshot (`polaroid`)**: Classic Polaroid photographic card with white border frame, bottom chin, red push pin, and drop shadows.
    3. **Fill City (`fill`)**: Maps the photo directly into the province's geographic vector boundary via dynamic SVG `<pattern>` fills.
- **Multi-Photo Clusters & Boundary Roaster**:
  - Enhanced multi-photo visualization when several trips with photos are logged for the same city:
    - **Circular Pin**: Arranges previous trip photos as smaller satellite bubbles around the center pin, showing trip dates and click-to-lightbox actions.
    - **Polaroid Stack**: Displays previous trip snapshots scattered behind the main photo at varied tilted angles ($-16^\circ, +18^\circ, -10^\circ$) like a travel scrapbook stack with a photo count badge.
    - **Fill City Rotating Roaster**: Implemented an automated background slideshow interval cycling photos every 3.2 seconds directly inside the province borders, equipped with an interactive rotating badge (`🔄 1/2`) that updates slide indices in real time.
- **Enriched Demo Journey**:
  - Added multi-photo showcase trips demonstrating all 3 styles out of the box:
    - **Antalya** (Plate 07): Polaroid tilted scatter stack featuring Kaş and Kaleiçi.
    - **Nevşehir / Cappadocia** (Plate 50): Fill City boundary rotating roaster featuring Göreme hot air balloons and Love Valley.
    - **İstanbul** (Plate 34): Circular pin with satellite cluster featuring Maslak Tech Summit and Bosphorus Bridge.

---

## [v1.4.0] - 2026-11-22

### Added
- **Custom Brand App Icon Suite**:
  - Designed and created master scalable SVG app icon (`icon.svg`, 512×512) featuring:
    - Continuous squircle badge with deep Turkish crimson-to-ruby gradient (`#f43f5e` to `#881337`) and 3D specular glass lighting.
    - Topography radar ripple contours and golden curved journey flight path.
    - Sculpted hero map marker pin with ground ripple beacon.
    - Midnight navy portal showcasing the golden Turkish Crescent and radiant 8-point compass star emblem.
    - Floating blue camera lens badge reflecting photo-logging travel memories.
  - Designed high-contrast tab favicon (`favicon.svg`, 64×64) tailored for 16px/32px browser tabs and bookmarks.
  - Implemented automated Python generator script (`generate_icons.py`) with 4x supersampling and Lanczos resampling to produce high-definition raster assets:
    - `icon-512.png` (512×512 high-res PWA icon)
    - `icon-192.png` (192×192 Android / mobile icon)
    - `apple-touch-icon.png` (180×180 iOS home screen icon)
    - `favicon-32x32.png` & `favicon-16x16.png` (desktop browser icons)
    - `favicon.ico` (multi-resolution Windows ICO containing 16x16, 32x32, and 48x48)
- **Progressive Web App (PWA) Manifest (`manifest.json`)**:
  - Added full web app manifest enabling installability on Chrome, Edge, Android, and iOS as a standalone desktop/mobile app.
  - Configured display modes, theme colors (`#dc2626`), and maskable icon variants.
- **Header Brand Integration**:
  - Replaced the generic flag emoji with the new custom brand logo directly inside the application header navigation bar.

---

## [v1.3.0] - 2026-11-21

### Added
- **Northern Cyprus Turkish Republic (KKTC / TRNC) Integration**:
  - Full geographic boundary vector support for all 6 administrative districts of Northern Cyprus:
    - **Lefkoşa** (Plate `KKTC-01` / ID 82)
    - **Gazimağusa** (Plate `KKTC-02` / ID 83)
    - **Girne** (Plate `KKTC-03` / ID 84)
    - **Güzelyurt** (Plate `KKTC-04` / ID 85)
    - **İskele** (Plate `KKTC-05` / ID 86)
    - **Lefke** (Plate `KKTC-06` / ID 87)
  - Seamlessly positioned in the Mediterranean Sea south of Mersin and Antalya using an expanded Mercator projection space (`minLat: 34.8°N`, `viewBox="0 0 1000 500"`).
  - Scaled entire application statistics, analytics progress bars, and directory listings from 81 to **87 total cities and districts**.
  - Added Northern Cyprus to the Demo Journey featuring an authentic Mediterranean holiday to Girne Castle and Bellapais Abbey.
- **User Geolocation & "📍 My Location" Radar**:
  - Added **`📍 My Location`** toolbar button (`#locate-user-btn`) with browser permission prompts via the HTML5 Geolocation API (`navigator.geolocation`).
  - Implemented boundary validation checking if coordinates fall within Turkey or Northern Cyprus (`lat 34.5°–42.5°N`, `lon 25.5°–45.0°E`).
  - Added pulsing radar GPS marker (`.user-gps-marker` & `.gps-pulse`) animated with concentric wave rings.
  - Automatically identifies the closest city/province and centers the map view smoothly with informative toast feedback.
  - Synchronized location pin with the secondary Leaflet GIS basemap mode.
- **Collapsible Map Legend Card**:
  - Added click-to-collapse functionality on the category legend card with backdrop blur and smooth height transitions, preventing overlay obstruction on mobile or narrow viewport sizes.

### Fixed
- **Photo Pin Hover Jitter Bug**:
  - Resolved severe flickering where hovering over an on-map photo pin caused the frame and photo to jitter wildly between Istanbul (coordinate origin `0, 0`) and the target city.
  - Root Cause: Applying CSS `transform: scale(...)` on `.map-photo-pin:hover` wiped out the element's inline SVG `transform="translate(cx, cy)"`, instantly collapsing the position to `(0, 0)`.
  - Fix: Decoupled translation and scaling by nesting an inner wrapper `<g class="map-photo-pin-inner">`. The parent `<g>` holds fixed centroid translation `translate(cx, cy)` while the child handles isolated center-scaled zoom `scale(1.35)`.
- **Physical Map Color Fill Rendering Bug**:
  - Resolved an issue where logged visits appeared properly styled on sidebar cards, timeline entries, and stat boxes, but provinces on the actual SVG map remained unfilled / empty.
  - Root Cause: The CSS rule `.province-path { fill: var(--province-empty-fill); }` in `style.css` has higher cascading specificity than the SVG presentation attribute `fill="..."`.
  - Fix: Updated `refreshMapFills()` to apply inline CSS `path.style.fill` directly with priority `(1, 0, 0, 0)`, ensuring solid colors, striped hatches, polka dots, and diamond mesh patterns render reliably across all browsers.
  - Standardized plate comparisons to numeric coercion `Number(v.plate) === Number(plate)`.

---

## [v1.2.0] - 2026-11-21

### Added
- **"Lived in" Category (`🏠 Lived in`)**: Introduced a dedicated residency category for tracking cities where the user has lived, studied, or resided for an extended period.
- **Residency Timing Subsystem**:
  - **Date Range Mode**: Allows users to specify when they moved into the city (`startDate` / `lived-moved-in`) and when they left (`endDate` / `lived-moved-out`).
  - **"I currently still live here" Toggle**: Checkbox that sets ongoing residency status and disables/hides the move-out date.
  - **Duration Mode**: Allows users to simply log residency duration (e.g., "4 years", "18 months", "10 years") without needing exact calendar dates.
- **Golden Diamond Mesh SVG Pattern (`pattern-lived-{plate}`)**: Custom SVG pattern featuring royal purple / deep indigo background with an intricate golden diamond crosshatch mesh, giving lived-in cities an unmistakable, distinguished appearance on the map.
- **Priority Hierarchy Engine**: Established category precedence (`lived` > `visited` > `work` > `passed`), ensuring that if a city has multiple visits including a residency, its primary display on the map appropriately reflects "Lived in".
- **4-Way Stats Progress Bar & Counters**: Added dedicated "Lived in" count box and progress segment (`#bar-lived`) in the analytics dashboard.
- **Timeline Residency Cards**: Chronological timeline cards now display moved-in and moved-out periods, duration badges, or "Currently Living Here 🏠" indicators.
- **Demo Journey Residency Sample**: Added an authentic 4-year university residency in Ankara to the default demo journey.

### Changed
- Category filter in the Travel Log now includes `🏠 Lived in Only`.
- City visit drawer dynamically toggles between the Residency Timing panel and the standard single visit date picker depending on whether "Lived in" or a travel category is selected.
- Upgraded JSON export schema to version 3 (`version: 3`) to preserve residency parameters (`livedType`, `startDate`, `endDate`, `isStillLiving`, `durationYears`).
- Map legend updated to show the "Lived in" diamond mesh swatch.

---

## [v1.1.0] - 2026-11-21

### Added
- **Multi-line Notes Textarea**: Expanded the visit notes field into a comfortable multi-line textarea for recording detailed trip memories, favorite restaurants, road routes, and stories.
- **Trip Photo Upload with In-Browser Compression**: Added image file upload capability (`<input type="file" accept="image/*">`) in the city visit drawer. Includes an offscreen HTML5 Canvas compression pipeline that scales photos down to max 550px at 82% JPEG quality, preventing `localStorage` exhaustion.
- **City Photo Pins on Map**: Visited cities with attached photos now display interactive circular photo markers on their map centroids. Hovering smooth-zooms the pin; clicking opens the full-screen photo lightbox.
- **Photos UI Switch (`📷 Photos`)**: Added a dedicated toggle switch button on the top map toolbar to turn map photos ON or OFF with a single click, allowing users to alternate between photo memories and clean pattern views.
- **Full-Screen Photo Lightbox Modal**: Created a responsive lightbox viewer (`#photo-lightbox-backdrop`) with dark blurred background, displaying the enlarged photo, city name, date, and caption notes.
- **Timeline Photo Thumbnails**: Chronological timeline cards in the right sidebar now feature photo thumbnails that can be clicked to open the lightbox.
- **Offline Scenic Demo Photos**: Enriched the Demo Journey with vector-rendered SVG data URI photos for Istanbul, Antalya, Cappadocia (Nevşehir), and Muğla, functioning 100% offline.
- **App Design Documentation**: Created the dedicated `/design` folder with `ARCHITECTURE.md`, `UI_UX_SPECIFICATION.md`, `DATA_MODEL.md`, and `ROADMAP.md`.

### Changed
- Converted single-line text input for visit notes into an expandable textarea.
- Upgraded JSON export schema to version 2 (`version: 2`) with photo data preservation.
- Enhanced map tooltip to indicate whether a province has attached photos.

### Removed
- Removed rigid single-line restriction on trip notes.

---

## [v1.0.0] - 2026-11-20

### Added
- **Real Geographic Map GUI**:
  - Embedded GeoJSON boundary vectors for all 81 provinces of Turkey with license plates 01 to 81.
  - Interactive SVG Vector Atlas Map with GPU-accelerated mouse/touch drag panning, wheel zooming, and view reset controls.
  - Secondary Geographic Map Mode using Leaflet.js with CartoDB/OpenStreetMap basemap tiles.
- **Category-Based Visual Representation**:
  - *Visited*: Solid vibrant random color assigned uniquely to each province, with `🎲 Re-roll Color` customizer.
  - *Visited for Work*: $45^\circ$ diagonal striped hatch pattern.
  - *Passed Through*: Polka-dot matrix pattern representing transit, airport layovers, and highway drives.
  - *Not Visited*: Subtle empty fill and clean borders.
- **Visit Logging & Multi-Trip Support**:
  - Support for multiple visits to the same city across different years.
  - Option to record **Dated visits** via HTML5 date picker or check **Undated visit** for historical/childhood trips.
- **Chronological Travel Log**:
  - Grouped by calendar year and sorted chronologically with **⬇️ Newest First** / **⬆️ Oldest First** toggle.
  - Dedicated expandable section for undated visits.
  - Quick filter by visit category (*All*, *Visited*, *Work*, *Passed*).
- **Exploration Statistics**:
  - Total provinces explored counter (`X / 81`) and exploration percentage badge.
  - Multi-segment color progress bar showing category breakdown.
- **Search & Directory**:
  - Quick search bar on map toolbar to jump directly to any city by name or plate number.
  - Full A–Z directory listing all 81 provinces with current statuses and visit counts.
- **Sharing & Persistence**:
  - Export live map as a high-resolution PNG image (`1600 × 900`) with watermark, statistics, and legend.
  - Complete JSON backup and restore mechanism.
  - Automatic `localStorage` synchronization.
  - Pre-loaded 10-city sample journey via **`✨ Demo Journey`** button.
  - Dark and Light theme switcher.
