# Roadmap & Future Enhancements - Turkey Travel Map

## 1. Completed Milestones

- [x] **v1.0.0**: Core Map & Logging
  - Real geographic GeoJSON representation of Turkey's 81 provinces.
  - Interactive SVG Vector Atlas with smooth pan, zoom, and reset controls.
  - Category-based visual representation:
    - *Visited*: Random vibrant colors per province.
    - *Visited for Work*: Diagonal striped hatching pattern.
    - *Passed Through*: Polka-dot transit pattern.
  - Chronological travel log grouping dated visits by year.
  - Dedicated section for undated visits.
  - Search by city name and plate number (01–81).
  - Progress counters & multi-colored exploration statistics.
  - High-resolution PNG image export with custom title and legend.
  - JSON backup and restore.
  - Light and Dark mode theming.
  - Optional Leaflet real satellite/street map mode.

- [x] **v1.1.0**: Visual Memories & Multi-line Notes
  - Multi-line textarea for capturing detailed stories and memories.
  - Client-side image upload with automatic in-browser Canvas compression.
  - Interactive circular photo pins positioned on city map centroids.
  - UI switch on the toolbar to turn photos ON and OFF.
  - Full-screen Photo Lightbox modal.
  - Photo thumbnails embedded directly inside the chronological timeline cards.
  - Self-contained offline demo journey with scenic vector photos.
  - Official `/design` documentation folder and `RELEASE_NOTES.md`.

- [x] **v1.2.0**: Residency Tracking ("Lived in")
  - Added new primary travel category: `🏠 Lived in`.
  - Date Range residency logging: moved-in date (`startDate`) to moved-out date (`endDate`).
  - "I currently still live here 🏠" toggle flag.
  - Duration-only logging mode ("Lived for X years / months").
  - Golden diamond crosshatch mesh SVG pattern for lived-in cities.
  - Category priority hierarchy (`lived` > `visited` > `work` > `passed`).
  - 4-way progress bar and dedicated residency counters in analytics.
  - Timeline cards updated to display residency durations and move dates.

- [x] **v1.3.0**: Northern Cyprus (KKTC), Geolocation & Map Stability
  - Integrated Northern Cyprus Turkish Republic (KKTC) with all 6 administrative districts (87 total cities & districts).
  - Geolocation integration: "📍 My Location" toolbar button with live radar pulse animation and Turkey/KKTC bounds checking.
  - Fixed map physical fill bug: applied inline `path.style.fill` to override stylesheet class specificity.
  - Fixed photo pin jitter bug: isolated CSS hover zoom to `.map-photo-pin-inner`, preserving fixed centroid translation.
  - Updated Demo Journey with an authentic trip to Girne (KKTC).

- [x] **v1.4.0**: Brand App Icon Suite & PWA Support
  - Designed master vector app icon (`icon.svg`, 512×512) and high-contrast browser tab favicon (`favicon.svg`).
  - Automated generation pipeline (`generate_icons.py`) producing high-definition raster icons (`icon-512.png`, `icon-192.png`, `apple-touch-icon.png`, `favicon-32x32.png`, `favicon-16x16.png`, and `favicon.ico`).
  - Added Progressive Web App manifest (`manifest.json`) supporting standalone installation on desktop and mobile.
  - Integrated custom app logo into the top navigation header.

- [x] **v1.5.0**: Home Reset, Multi-Style Photos & Boundary Roaster
  - **Home Reset Button**: Added toolbar and floating controls to instantly and smoothly reset viewing angle, pan coordinates, and zoom scale (`scale: 1`).
  - **Photo Style Options**: 3 display modes selectable in drawer (`circle`, `polaroid`, and `fill`).
  - **Multi-Photo Satellite Bubbles**: Shows earlier visits as surrounding satellite bubbles in circular pin mode.
  - **Tilted Polaroid Scrapbook Stack**: Stacks earlier photos behind the primary snapshot at varying tilt angles ($-16^\circ, +18^\circ, -10^\circ$).
  - **Boundary Rotating Roaster**: For filled cities with multiple photos, cycles photos automatically every 3.2 seconds inside the province borders with interactive live badge.
  - **Enriched Demo Journey**: Multi-photo entries for Antalya (Polaroid), Nevşehir (Roaster), and Istanbul (Circle).

- [x] **v1.6.0**: Drag-and-Drop Undated Cards & Date Precision Rounding
  - **Interactive Drag-and-Drop Timeline**: Drag undated cards from the bottom list and insert them between cards in the chronological timeline.
  - **Timestamp Interpolation Engine**: Automatically calculates and stores `placedTimestamp = (prevTime + nextTime) / 2` to preserve placement across page reloads and sorting flips.
  - **Drop Targets & Visual Feedback**: Glowing blue drop indicator lines (`.drop-target-top`, `.drop-target-bottom`), drag handles (`⠿`), and amber placed memory badges (`.timeline-card-placed-undated`).
  - **Un-place & Return Drop Zone**: Drop zone on the undated section and `↩ Move to Undated` action button to revert undated placement.
  - **4-Tier Date Precision Selector**: Options to log visits with `Exact Day` (`YYYY-MM-DD`), `Month & Year` (`YYYY-MM`), `Year Only` (`YYYY`), or `Undated`.
  - **Multi-Format Date Engine**: Dynamic `formatDate()` and timeline grouping supporting days, months, and standalone years.

---

## 2. Planned Features & Backlog

### Phase 2: Route & Transit Visualization
- [ ] **Connecting Route Lines**: Option to draw connected curved travel paths (e.g. Istanbul $\to$ Bolu $\to$ Ankara road trip).
- [ ] **Transport Mode Icons**: Small transport badges on visits (✈️ Airplane, 🚗 Car, 🚆 Train, 🚌 Bus, ⛵ Ferry).

### Phase 3: Enhanced Analytics & Badges
- [ ] **Region Badges**: Unlockable achievements (e.g., *"Ege Explorer: 100% of Aegean region visited"*).
- [ ] **Yearly Heatmap**: Graph showing travel frequency and months most traveled.
- [ ] **Multi-photo Gallery**: Support for attaching up to 3–5 photos per visit with thumbnail carousel.

### Phase 4: Sharing & Printing
- [ ] **Poster Print Layout (PDF)**: High-resolution vector PDF export sized for A3/A4 poster printing.
- [ ] **Social Media Story Cards**: 9:16 aspect ratio export formatted for Instagram/WhatsApp stories.
