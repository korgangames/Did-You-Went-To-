/**
 * Turkey Travel Map & Journey Log Application
 * Standalone HTML/CSS/JS with Real Map GUI, Patterned Provinces,
 * Chronological Travel Timeline, Interactive City Photos,
 * GPS Location, and Northern Cyprus (87 Cities Total).
 */

(function () {
  'use strict';

  // --- Curated Vibrant Color Palette for "Visited" provinces ---
  const VIBRANT_PALETTE = [
    '#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6',
    '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6',
    '#10b981', '#22c55e', '#84cc16', '#eab308', '#f59e0b',
    '#f97316', '#ef4444', '#fb7185', '#38bdf8', '#4ade80'
  ];

  function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function getRandomVibrantColor() {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 75%, 52%)`;
  }

  // --- CARTO Basemaps API Configuration (5M monthly requests tier) ---
  const CARTO_API_KEY = 'cb1_5dwh_1_ffb88db171cef3146ee1ae0f';

  // --- Application State ---
  const STORAGE_KEY = 'turkey_travel_map_data_v1';

  let state = {
    visits: [], // Array of visit objects: { id, plate, cityName, category, isDated, date, livedType, startDate, endDate, isStillLiving, durationYears, notes, photo, createdAt }
    citySettings: {}, // { [plate]: { color, stripeColor, dotColor } }
    activeView: 'vector', // 'vector' | 'leaflet'
    theme: 'light',
    sidebarCollapsed: false,
    selectedPlate: null,
    editingVisitId: null,
    currentPhotoData: null, // Temporary photo data URL during editing
    livedMode: 'range', // 'range' | 'duration' for 'lived' category
    logSortOrder: 'desc', // 'desc' (newest first) or 'asc'
    logFilter: 'all', // 'all' | 'lived' | 'visited' | 'work' | 'passed'
    showLabels: true,
    showPhotos: true, // Switch to show/hide photos on the map
    selectedPhotoStyle: 'circle', // 'circle' | 'polaroid' | 'fill'
    selectedDatePrecision: 'day', // 'day' | 'month' | 'year' | 'undated'
    draggedVisitId: null,
    roasterIndices: {}, // { [plate]: currentPhotoIndex }
    roasterInterval: null,
    panZoom: { x: 0, y: 0, scale: 1, isDragging: false, startX: 0, startY: 0 }
  };

  // Helper: Get active photo style for a province ('circle' | 'polaroid' | 'fill')
  function getCityPhotoStyle(plate) {
    if (state.citySettings[plate] && state.citySettings[plate].photoStyle) {
      return state.citySettings[plate].photoStyle;
    }
    const visitsWithPhoto = state.visits.filter(v => Number(v.plate) === Number(plate) && v.photo);
    if (visitsWithPhoto.length > 0) {
      const latest = visitsWithPhoto[visitsWithPhoto.length - 1];
      if (latest.photoStyle) return latest.photoStyle;
    }
    return 'circle';
  }

  // Helper: Get all photos for a province
  function getCityPhotos(plate) {
    return state.visits
      .filter(v => Number(v.plate) === Number(plate) && v.photo)
      .map(v => ({ id: v.id, photo: v.photo, date: v.date, notes: v.notes, cityName: v.cityName, photoStyle: v.photoStyle }));
  }

  // Helper: Calculate or retrieve SVG bounding box for a province
  function getCityBBox(plate) {
    const path = document.getElementById(`prov-path-${plate}`);
    if (path && typeof path.getBBox === 'function') {
      try {
        const b = path.getBBox();
        if (b && b.width > 0 && b.height > 0) {
          return [b.x, b.y, b.width, b.height];
        }
      } catch (e) {}
    }
    const prov = provinceByPlate[plate];
    if (prov && prov.svgPath) {
      const nums = prov.svgPath.match(/[-+]?\d*\.?\d+/g);
      if (nums && nums.length >= 4) {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (let i = 0; i < nums.length; i += 2) {
          const x = parseFloat(nums[i]);
          const y = parseFloat(nums[i + 1]);
          if (!isNaN(x) && !isNaN(y)) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
        return [minX, minY, Math.max(maxX - minX, 10), Math.max(maxY - minY, 10)];
      }
    }
    return [0, 0, 100, 100];
  }

  // Total count of cities/provinces (81 Turkey + 6 KKTC = 87)
  const TOTAL_CITIES = 87;

  // Province lookup table by plate number
  const provinceByPlate = {};
  if (typeof TURKEY_PROVINCES !== 'undefined') {
    TURKEY_PROVINCES.forEach(p => {
      provinceByPlate[p.plate] = p;
    });
  }

  // Load state from localStorage
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.visits) state.visits = parsed.visits;
        if (parsed.citySettings) state.citySettings = parsed.citySettings;
        if (parsed.theme) state.theme = parsed.theme;
        if (typeof parsed.showLabels === 'boolean') state.showLabels = parsed.showLabels;
        if (typeof parsed.showPhotos === 'boolean') state.showPhotos = parsed.showPhotos;
      }
      const savedCollapsed = localStorage.getItem('turkey_travel_map_sidebar_collapsed');
      if (savedCollapsed !== null) {
        state.sidebarCollapsed = JSON.parse(savedCollapsed);
      }
    } catch (e) {
      console.warn('Could not load from localStorage:', e);
    }

    // Apply saved theme
    document.documentElement.setAttribute('data-theme', state.theme);
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.innerHTML = state.theme === 'dark' ? '☀️' : '🌙';
    }

    // Apply toggle buttons state
    document.getElementById('toggle-labels-btn')?.classList.toggle('active', state.showLabels);
    document.getElementById('toggle-photos-btn')?.classList.toggle('active', state.showPhotos);
  }

  // Save state to localStorage
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        visits: state.visits,
        citySettings: state.citySettings,
        theme: state.theme,
        showLabels: state.showLabels,
        showPhotos: state.showPhotos
      }));
    } catch (e) {
      console.warn('Could not save to localStorage:', e);
    }
  }

  // Get primary category for a given city based on visits
  // Hierarchy: lived > visited > work > passed
  function getCityCategory(plate) {
    const cityVisits = state.visits.filter(v => Number(v.plate) === Number(plate));
    if (!cityVisits || cityVisits.length === 0) return null;

    if (cityVisits.some(v => v.category === 'lived')) return 'lived';
    if (cityVisits.some(v => v.category === 'visited')) return 'visited';
    if (cityVisits.some(v => v.category === 'work')) return 'work';
    if (cityVisits.some(v => v.category === 'passed')) return 'passed';

    return null;
  }

  // Generate randomized, harmonious colors for all styles of a city
  function generateCityColorSet(plate, customHue = null) {
    const hue = (customHue !== null && !isNaN(customHue)) ? Math.round(customHue) : ((Number(plate) * 37) % 360);
    const isDark = state.theme === 'dark';

    // Solid vibrant color (visited)
    const color = `hsl(${hue}, 82%, 52%)`;

    // Diamond mesh colors (lived)
    // Rich jewel-tone base, vibrant contrasting diamond grid, luminous interior diamond accent
    const meshBgLight = `hsl(${hue}, 58%, 22%)`;
    const meshBgDark = `hsl(${hue}, 55%, 15%)`;
    const meshColor = `hsl(${(hue + 45) % 360}, 95%, 62%)`;
    const meshAccent = `hsl(${(hue + 180) % 360}, 90%, 82%)`;

    // Diagonal stripes colors (work)
    // High-visibility vibrant stripe lines on a deep harmonized background
    const stripeColor = `hsl(${(hue + 20) % 360}, 92%, 58%)`;
    const stripeBgLight = `hsl(${hue}, 30%, 18%)`;
    const stripeBgDark = `hsl(${hue}, 35%, 10%)`;

    // Polka dots colors (passed)
    // Saturated circle dots on a subtle matching tinted background
    const dotColor = `hsl(${(hue + 310) % 360}, 92%, 52%)`;
    const dotBgLight = `hsl(${hue}, 50%, 95%)`;
    const dotBgDark = `hsl(${hue}, 28%, 12%)`;

    return {
      hue,
      color,
      meshBg: isDark ? meshBgDark : meshBgLight,
      meshBgLight,
      meshBgDark,
      meshColor,
      meshAccent,
      stripeColor,
      stripeBg: isDark ? stripeBgDark : stripeBgLight,
      stripeBgLight,
      stripeBgDark,
      dotColor,
      dotBg: isDark ? dotBgDark : dotBgLight,
      dotBgLight,
      dotBgDark
    };
  }

  // Get CSS background styles for live swatches and option previews
  function getCategoryCssStyle(cat, settings) {
    const isDark = state.theme === 'dark';
    const meshBg = isDark ? (settings.meshBgDark || settings.meshBg) : (settings.meshBgLight || settings.meshBg);
    const stripeBg = isDark ? (settings.stripeBgDark || settings.stripeBg) : (settings.stripeBgLight || settings.stripeBg);
    const dotBg = isDark ? (settings.dotBgDark || settings.dotBg) : (settings.dotBgLight || settings.dotBg);

    if (cat === 'lived') {
      return {
        backgroundColor: meshBg || '#3730a3',
        backgroundImage: `repeating-linear-gradient(45deg, ${settings.meshColor || '#fbbf24'} 0, ${settings.meshColor || '#fbbf24'} 1.5px, transparent 0, transparent 6px), repeating-linear-gradient(-45deg, ${settings.meshColor || '#fbbf24'} 0, ${settings.meshColor || '#fbbf24'} 1.5px, transparent 0, transparent 6px)`,
        backgroundSize: 'auto'
      };
    } else if (cat === 'work') {
      const sBg = stripeBg || (isDark ? '#0f172a' : '#1e293b');
      const sCol = settings.stripeColor || '#38bdf8';
      return {
        backgroundColor: sBg,
        backgroundImage: `repeating-linear-gradient(45deg, ${sBg}, ${sBg} 4px, ${sCol} 4px, ${sCol} 8px)`,
        backgroundSize: 'auto'
      };
    } else if (cat === 'passed') {
      const dBg = dotBg || (isDark ? '#1c1917' : '#fffbeb');
      const dCol = settings.dotColor || '#d97706';
      return {
        backgroundColor: dBg,
        backgroundImage: `radial-gradient(${dCol} 2px, transparent 2px)`,
        backgroundSize: '6px 6px'
      };
    } else {
      // visited (solid)
      return {
        backgroundColor: settings.color || '#10b981',
        backgroundImage: 'none',
        backgroundSize: 'auto'
      };
    }
  }

  // Get or initialize color settings for a city
  function getCityColor(plate) {
    if (!state.citySettings[plate]) {
      state.citySettings[plate] = generateCityColorSet(plate);
    } else {
      const s = state.citySettings[plate];
      // Backwards compatibility upgrade for legacy settings
      if (!s.meshBg || !s.meshColor || !s.stripeColor || (s.stripeColor === '#38bdf8' && !s.meshBg)) {
        const fresh = generateCityColorSet(plate, s.hue);
        state.citySettings[plate] = {
          ...fresh,
          ...s,
          meshBg: s.meshBg || fresh.meshBg,
          meshBgLight: s.meshBgLight || fresh.meshBgLight,
          meshBgDark: s.meshBgDark || fresh.meshBgDark,
          meshColor: s.meshColor || fresh.meshColor,
          meshAccent: s.meshAccent || fresh.meshAccent,
          stripeColor: (s.stripeColor && s.stripeColor !== '#38bdf8') ? s.stripeColor : fresh.stripeColor,
          stripeBg: s.stripeBg || fresh.stripeBg,
          stripeBgLight: s.stripeBgLight || fresh.stripeBgLight,
          stripeBgDark: s.stripeBgDark || fresh.stripeBgDark,
          dotColor: s.dotColor || fresh.dotColor,
          dotBg: s.dotBg || fresh.dotBg,
          dotBgLight: s.dotBgLight || fresh.dotBgLight,
          dotBgDark: s.dotBgDark || fresh.dotBgDark
        };
      }
    }
    return state.citySettings[plate];
  }

  // --- SVG Pattern Defs Generation ---
  function updateSvgPatterns() {
    const defs = document.getElementById('map-svg-defs');
    if (!defs) return;

    const isDark = state.theme === 'dark';

    let defsContent = `
      <pattern id="pattern-work-default" width="16" height="16" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
        <rect width="16" height="16" fill="${isDark ? '#0f172a' : '#1e293b'}" />
        <line x1="0" y1="0" x2="0" y2="16" stroke="#38bdf8" stroke-width="5" />
      </pattern>
      <pattern id="pattern-passed-default" width="16" height="16" patternUnits="userSpaceOnUse">
        <rect width="16" height="16" fill="${isDark ? '#1c1917' : '#fffbeb'}" />
        <circle cx="8" cy="8" r="3.2" fill="#d97706" />
      </pattern>
      <pattern id="pattern-lived-default" width="16" height="16" patternUnits="userSpaceOnUse">
        <rect width="16" height="16" fill="${isDark ? '#1e1b4b' : '#3730a3'}" />
        <path d="M 0 0 L 16 16 M 16 0 L 0 16" stroke="#fbbf24" stroke-width="2.5" />
        <path d="M 0 8 L 8 0 L 16 8 L 8 16 Z" fill="none" stroke="#e0e7ff" stroke-width="1.2" opacity="0.6" />
      </pattern>
    `;

    // Province-specific patterns (All 87 cities)
    for (let plate = 1; plate <= TOTAL_CITIES; plate++) {
      const settings = getCityColor(plate);
      const meshBg = isDark ? (settings.meshBgDark || settings.meshBg) : (settings.meshBgLight || settings.meshBg);
      const stripeBg = isDark ? (settings.stripeBgDark || settings.stripeBg) : (settings.stripeBgLight || settings.stripeBg);
      const dotBg = isDark ? (settings.dotBgDark || settings.dotBg) : (settings.dotBgLight || settings.dotBg);
      
      // Lived in pattern (randomized diamond mesh)
      defsContent += `
        <pattern id="pattern-lived-${plate}" width="16" height="16" patternUnits="userSpaceOnUse">
          <rect width="16" height="16" fill="${meshBg || '#3730a3'}" />
          <path d="M 0 0 L 16 16 M 16 0 L 0 16" stroke="${settings.meshColor || '#fbbf24'}" stroke-width="2.5" />
          <path d="M 0 8 L 8 0 L 16 8 L 8 16 Z" fill="none" stroke="${settings.meshAccent || '#e0e7ff'}" stroke-width="1.2" opacity="0.75" />
        </pattern>
      `;

      // Striped pattern: work (randomized diagonal stripes)
      defsContent += `
        <pattern id="pattern-work-${plate}" width="16" height="16" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
          <rect width="16" height="16" fill="${stripeBg || '#1e293b'}" />
          <line x1="0" y1="0" x2="0" y2="16" stroke="${settings.stripeColor || '#38bdf8'}" stroke-width="5" />
        </pattern>
      `;

      // Dotted pattern: passed through (randomized polka dots)
      defsContent += `
        <pattern id="pattern-passed-${plate}" width="16" height="16" patternUnits="userSpaceOnUse">
          <rect width="16" height="16" fill="${dotBg || '#fffbeb'}" />
          <circle cx="8" cy="8" r="3.5" fill="${settings.dotColor || '#10b981'}" />
        </pattern>
      `;

      // Clip path for city photo pin
      defsContent += `
        <clipPath id="svg-photo-clip-${plate}">
          <circle cx="0" cy="0" r="14" />
        </clipPath>
      `;

      // Satellite clip paths for multi-photo circular clusters
      for (let s = 0; s < 4; s++) {
        defsContent += `
          <clipPath id="svg-photo-clip-sat-${plate}-${s}">
            <circle cx="0" cy="0" r="8.5" />
          </clipPath>
        `;
      }

      // City boundary photo fill pattern (for 'fill' photo style)
      const photos = getCityPhotos(plate);
      if (photos.length > 0) {
        const bbox = getCityBBox(plate);
        const [bx, by, bw, bh] = bbox;
        const curIdx = state.roasterIndices[plate] || 0;
        const activeVisit = photos[curIdx % photos.length];
        const activePhoto = activeVisit.photo;

        const panX = (activeVisit.fillPanX || 0) / 100 * bw;
        const panY = (activeVisit.fillPanY || 0) / 100 * bh;
        const scale = activeVisit.fillScale !== undefined ? activeVisit.fillScale : 1.0;
        const rot = activeVisit.fillRotate || 0;
        const cx = bx + bw / 2;
        const cy = by + bh / 2;

        defsContent += `
          <pattern id="pattern-photo-fill-${plate}" patternUnits="userSpaceOnUse" x="0" y="0" width="1000" height="500">
            <g id="photo-fill-transform-${plate}" transform="translate(${cx}, ${cy}) rotate(${rot}) scale(${scale}) translate(${-cx + panX}, ${-cy + panY})">
              <image id="photo-fill-img-${plate}" href="${activePhoto}" x="${bx}" y="${by}" width="${bw}" height="${bh}" preserveAspectRatio="xMidYMid slice" />
            </g>
          </pattern>
        `;
      }
    }

    defs.innerHTML = defsContent;
  }

  // --- Render Vector SVG Map ---
  function initVectorMap() {
    const svg = document.getElementById('turkey-svg-map');
    if (!svg || typeof TURKEY_PROVINCES === 'undefined') return;

    updateSvgPatterns();

    const pathsGroup = document.getElementById('svg-provinces-group');
    const labelsGroup = document.getElementById('svg-labels-group');

    if (!pathsGroup || !labelsGroup) return;

    pathsGroup.innerHTML = '';
    labelsGroup.innerHTML = '';

    TURKEY_PROVINCES.forEach(prov => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', prov.svgPath);
      path.setAttribute('id', `prov-path-${prov.plate}`);
      path.setAttribute('class', 'province-path');
      path.setAttribute('data-plate', prov.plate);
      path.setAttribute('data-name', prov.name);

      path.addEventListener('click', () => onProvinceClick(prov.plate));
      path.addEventListener('mouseenter', (e) => onProvinceMouseEnter(e, prov));
      path.addEventListener('mousemove', (e) => onProvinceMouseMove(e));
      path.addEventListener('mouseleave', () => onProvinceMouseLeave());

      pathsGroup.appendChild(path);

      if (prov.svgCenter) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', prov.svgCenter[0]);
        text.setAttribute('y', prov.svgCenter[1]);
        text.setAttribute('id', `prov-label-${prov.plate}`);
        text.textContent = prov.plate_str;
        labelsGroup.appendChild(text);
      }
    });

    setupPanZoom();
    refreshMapFills();
  }

  // Update fills and styles for all provinces
  // FIX: Directly apply inline style.fill to override stylesheet .province-path default!
  function refreshMapFills() {
    updateSvgPatterns();

    for (let plate = 1; plate <= TOTAL_CITIES; plate++) {
      const path = document.getElementById(`prov-path-${plate}`);
      if (!path) continue;

      const category = getCityCategory(plate);
      const settings = getCityColor(plate);
      const styleChoice = getCityPhotoStyle(plate);
      const cityPhotos = getCityPhotos(plate);
      const isPhotoFill = state.showPhotos && styleChoice === 'fill' && cityPhotos.length > 0;

      if (isPhotoFill) {
        path.style.fill = `url(#pattern-photo-fill-${plate})`;
        path.setAttribute('fill', `url(#pattern-photo-fill-${plate})`);
        path.style.opacity = '1';
        path.classList.add('prov-photo-filled');
      } else {
        path.classList.remove('prov-photo-filled');
        if (category === 'lived') {
          path.style.fill = `url(#pattern-lived-${plate})`;
          path.setAttribute('fill', `url(#pattern-lived-${plate})`);
          path.style.opacity = '1';
        } else if (category === 'visited') {
          path.style.fill = settings.color;
          path.setAttribute('fill', settings.color);
          path.style.opacity = '1';
        } else if (category === 'work') {
          path.style.fill = `url(#pattern-work-${plate})`;
          path.setAttribute('fill', `url(#pattern-work-${plate})`);
          path.style.opacity = '1';
        } else if (category === 'passed') {
          path.style.fill = `url(#pattern-passed-${plate})`;
          path.setAttribute('fill', `url(#pattern-passed-${plate})`);
          path.style.opacity = '1';
        } else {
          path.style.fill = '';
          path.setAttribute('fill', 'var(--province-empty-fill)');
          path.style.opacity = '';
        }
      }

      if (state.selectedPlate === plate) {
        path.classList.add('selected');
      } else {
        path.classList.remove('selected');
      }
    }

    // Toggle labels visibility
    const labelsGroup = document.getElementById('svg-labels-group');
    if (labelsGroup) {
      labelsGroup.style.display = state.showLabels ? 'block' : 'none';
    }

    renderMapPhotos();

    if (state.activeView === 'leaflet' && window.leafletLayerGroup) {
      refreshLeafletLayers();
    }
  }

  // --- Render Photos on the Map ---
  // Supports: 'circle' (+ satellite bubbles), 'polaroid' (+ tilted photo stack), 'fill' (boundary rotating roaster)
  function renderMapPhotos() {
    const photosGroup = document.getElementById('svg-photos-group');
    if (!photosGroup) return;

    photosGroup.innerHTML = '';

    if (!state.showPhotos) {
      photosGroup.style.display = 'none';
      if (leafletPhotoLayer) leafletPhotoLayer.clearLayers();
      return;
    }

    photosGroup.style.display = 'block';

    for (let plate = 1; plate <= TOTAL_CITIES; plate++) {
      const prov = provinceByPlate[plate];
      if (!prov || !prov.svgCenter) continue;

      const cityVisitsWithPhoto = state.visits.filter(v => Number(v.plate) === Number(plate) && v.photo);
      if (cityVisitsWithPhoto.length === 0) continue;

      const styleChoice = getCityPhotoStyle(plate);
      const [cx, cy] = prov.svgCenter;
      const primaryVisit = cityVisitsWithPhoto[cityVisitsWithPhoto.length - 1];
      const prevVisits = cityVisitsWithPhoto.slice(0, -1);

      // --- Option 1: Fill City Boundaries (Rotating Roaster) ---
      if (styleChoice === 'fill') {
        const badgeG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        badgeG.setAttribute('class', 'map-photo-roaster-badge');
        badgeG.setAttribute('transform', `translate(${cx}, ${cy})`);
        badgeG.setAttribute('id', `roaster-badge-${plate}`);

        if (cityVisitsWithPhoto.length > 1) {
          const curIdx = state.roasterIndices[plate] || 0;
          badgeG.setAttribute('title', `${prov.name} Boundary Roaster (${cityVisitsWithPhoto.length} photos) - Click to view in lightbox`);
          badgeG.innerHTML = `
            <g class="map-photo-roaster-badge-inner">
              <circle cx="0" cy="0" r="14" fill="rgba(15, 23, 42, 0.9)" stroke="#ffffff" stroke-width="2" filter="drop-shadow(0 2px 5px rgba(0,0,0,0.5))" />
              <text x="0" y="3.5" font-size="9" fill="#ffffff" text-anchor="middle" font-family="sans-serif">🔄</text>
              <rect x="-14" y="14" width="28" height="12" rx="4" fill="#2563eb" stroke="#ffffff" stroke-width="1" />
              <text id="roaster-txt-${plate}" x="0" y="23" font-size="8" font-weight="bold" fill="#ffffff" text-anchor="middle" font-family="sans-serif">${curIdx + 1}/${cityVisitsWithPhoto.length}</text>
            </g>
          `;
          badgeG.addEventListener('click', (e) => {
            e.stopPropagation();
            const cur = state.roasterIndices[plate] || 0;
            const visit = cityVisitsWithPhoto[cur] || primaryVisit;
            window.openPhotoLightbox(visit.id);
          });
        } else {
          badgeG.setAttribute('title', `${prov.name} Photo (Filling City Boundaries) - Click to view in lightbox`);
          badgeG.innerHTML = `
            <g class="map-photo-roaster-badge-inner">
              <circle cx="0" cy="0" r="11" fill="rgba(15, 23, 42, 0.85)" stroke="#ffffff" stroke-width="1.8" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.4))" />
              <text x="0" y="3.5" font-size="8" fill="#ffffff" text-anchor="middle">📷</text>
            </g>
          `;
          badgeG.addEventListener('click', (e) => {
            e.stopPropagation();
            window.openPhotoLightbox(primaryVisit.id);
          });
        }

        photosGroup.appendChild(badgeG);
        continue;
      }

      // --- Option 2: Polaroid Frame (Tilted Scatter Stack with 500% Zoom & Handwritten Note) ---
      if (styleChoice === 'polaroid') {
        const pinG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        pinG.setAttribute('class', 'map-polaroid-pin');
        pinG.setAttribute('transform', `translate(${cx}, ${cy})`);
        pinG.setAttribute('data-plate', plate);

        // Bring hovered polaroid to the top of photosGroup so 500% zoom floats above everything
        pinG.addEventListener('mouseenter', () => {
          if (photosGroup.lastElementChild !== pinG) {
            photosGroup.appendChild(pinG);
          }
        });

        let subPolaroidsHtml = '';
        const offsets = [
          { dx: -15, dy: -9, rot: -16, scale: 0.78 },
          { dx: 15, dy: -7, rot: 18, scale: 0.78 },
          { dx: 11, dy: 13, rot: -10, scale: 0.74 }
        ];

        prevVisits.slice(-3).forEach((prev, i) => {
          const cfg = offsets[i % offsets.length];
          const prevNote = (prev.polaroidNote || '').trim();
          let prevNoteSize = 3.2;
          if (prevNote.length > 12) {
            prevNoteSize = Math.max(2.0, 3.2 - (prevNote.length - 12) * 0.08);
          }
          subPolaroidsHtml += `
            <g class="map-polaroid-sub" transform="translate(${cfg.dx}, ${cfg.dy}) rotate(${cfg.rot}) scale(${cfg.scale})" data-visit-id="${prev.id}" title="${prov.name} Previous Trip (${prev.date || 'Undated'})">
              <rect x="-15" y="-19" width="30" height="38" rx="2" fill="#ffffff" stroke="rgba(0,0,0,0.2)" stroke-width="0.8" filter="drop-shadow(0 2px 5px rgba(0,0,0,0.35))" />
              <image href="${prev.photo}" x="-13" y="-17" width="26" height="26" preserveAspectRatio="xMidYMid slice" />
              ${prevNote ? `
                <text x="0" y="14.5" font-size="${prevNoteSize}" font-family="'Caveat', 'Segoe Script', cursive, sans-serif" font-weight="700" fill="#334155" text-anchor="middle">${escapeHtml(prevNote)}</text>
              ` : `
                <line x1="-8" y1="13" x2="8" y2="13" stroke="#cbd5e1" stroke-width="0.8" stroke-dasharray="2 2" />
              `}
            </g>
          `;
        });

        const primaryNote = (primaryVisit.polaroidNote || '').trim();
        let primaryNoteSize = 3.6;
        if (primaryNote.length > 14) {
          primaryNoteSize = Math.max(2.1, 3.6 - (primaryNote.length - 14) * 0.08);
        }

        pinG.innerHTML = `
          ${subPolaroidsHtml}
          <g class="map-polaroid-pin-inner" transform="rotate(-2)" data-visit-id="${primaryVisit.id}" title="${prov.name} Polaroid Photo - Hover to zoom 500%, click to view">
            <rect x="-17" y="-21" width="34" height="42" rx="2" fill="#ffffff" stroke="#2563eb" stroke-width="1.2" filter="drop-shadow(0 4px 8px rgba(0,0,0,0.4))" />
            <image href="${primaryVisit.photo}" x="-14.5" y="-18.5" width="29" height="29" preserveAspectRatio="xMidYMid slice" />
            <circle cx="0" cy="-19" r="2.2" fill="#ef4444" stroke="#ffffff" stroke-width="0.8" />
            ${primaryNote ? `
              <text x="0" y="16.5" font-size="${primaryNoteSize}" font-family="'Caveat', 'Segoe Script', cursive, sans-serif" font-weight="700" fill="#1e293b" text-anchor="middle" letter-spacing="-0.1">${escapeHtml(primaryNote)}</text>
            ` : `
              <line x1="-9" y1="15" x2="9" y2="15" stroke="#94a3b8" stroke-width="1" stroke-dasharray="2 2" />
            `}
            ${prevVisits.length > 0 ? `
              <g class="polaroid-stack-count-badge">
                <rect x="7" y="11" width="13" height="10" rx="3" fill="#2563eb" stroke="#ffffff" stroke-width="0.8" />
                <text x="13.5" y="18.5" font-size="7" font-weight="bold" fill="#ffffff" text-anchor="middle" font-family="sans-serif">${cityVisitsWithPhoto.length}</text>
              </g>
            ` : ''}
          </g>
        `;

        pinG.querySelectorAll('[data-visit-id]').forEach(el => {
          el.addEventListener('click', (e) => {
            e.stopPropagation();
            window.openPhotoLightbox(el.getAttribute('data-visit-id'));
          });
        });

        photosGroup.appendChild(pinG);
        continue;
      }

      // --- Option 3: Circular Frame (Classic Pin + Satellites) ---
      const pinG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      pinG.setAttribute('class', 'map-photo-pin');
      pinG.setAttribute('transform', `translate(${cx}, ${cy})`);
      pinG.setAttribute('data-plate', plate);

      let satellitesHtml = '';
      const satOffsets = [
        { dx: 23, dy: -15 },
        { dx: -23, dy: -15 },
        { dx: -21, dy: 17 },
        { dx: 21, dy: 17 }
      ];

      prevVisits.slice(-4).forEach((prev, s) => {
        const off = satOffsets[s % satOffsets.length];
        satellitesHtml += `
          <g class="map-photo-satellite" transform="translate(${off.dx}, ${off.dy})" data-visit-id="${prev.id}" title="${prov.name} Previous Photo (${prev.date || 'Undated'})">
            <circle cx="0" cy="0" r="10" fill="#ffffff" stroke="#3b82f6" stroke-width="1.8" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.35))" />
            <image href="${prev.photo}" x="-8.5" y="-8.5" width="17" height="17" preserveAspectRatio="xMidYMid slice" clip-path="url(#svg-photo-clip-sat-${plate}-${s})" />
          </g>
        `;
      });

      pinG.innerHTML = `
        ${satellitesHtml}
        <g class="map-photo-pin-inner" data-visit-id="${primaryVisit.id}" title="${prov.name} Photo - Click to view">
          <circle cx="0" cy="0" r="16" fill="#ffffff" stroke="#2563eb" stroke-width="2.5" filter="drop-shadow(0 2px 5px rgba(0,0,0,0.4))" />
          <image href="${primaryVisit.photo}" x="-14" y="-14" width="28" height="28" preserveAspectRatio="xMidYMid slice" clip-path="url(#svg-photo-clip-${plate})" />
          <circle cx="11" cy="11" r="5.5" fill="#2563eb" stroke="#ffffff" stroke-width="1.2" />
          <text x="11" y="13" font-size="7" fill="#ffffff" text-anchor="middle" font-family="sans-serif">📷</text>
          ${prevVisits.length > 0 ? `
            <rect x="-14" y="9" width="12" height="9" rx="3" fill="#0f172a" stroke="#ffffff" stroke-width="0.8" />
            <text x="-8" y="16" font-size="6.5" font-weight="bold" fill="#ffffff" text-anchor="middle" font-family="sans-serif">${cityVisitsWithPhoto.length}</text>
          ` : ''}
        </g>
      `;

      pinG.querySelectorAll('[data-visit-id]').forEach(el => {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          window.openPhotoLightbox(el.getAttribute('data-visit-id'));
        });
      });

      photosGroup.appendChild(pinG);
    }

    if (state.activeView === 'leaflet' && leafletMap) {
      updateLeafletPhotoMarkers();
    }
  }

  // --- Rotating Roaster for Cities with 'fill' Photo Style ---
  function startPhotoRoaster() {
    if (state.roasterInterval) clearInterval(state.roasterInterval);
    state.roasterInterval = setInterval(() => {
      if (!state.showPhotos) return;
      for (let plate = 1; plate <= TOTAL_CITIES; plate++) {
        const style = getCityPhotoStyle(plate);
        if (style !== 'fill') continue;
        const photos = getCityPhotos(plate);
        if (photos.length <= 1) continue;
        state.roasterIndices[plate] = ((state.roasterIndices[plate] || 0) + 1) % photos.length;
        const curIdx = state.roasterIndices[plate];
        const activeVisit = photos[curIdx];
        const nextPhoto = activeVisit.photo;
        const img = document.getElementById(`photo-fill-img-${plate}`);
        if (img) img.setAttribute('href', nextPhoto);
        const transformG = document.getElementById(`photo-fill-transform-${plate}`);
        if (transformG) {
          const bbox = getCityBBox(plate);
          const [bx, by, bw, bh] = bbox;
          const panX = (activeVisit.fillPanX || 0) / 100 * bw;
          const panY = (activeVisit.fillPanY || 0) / 100 * bh;
          const scale = activeVisit.fillScale !== undefined ? activeVisit.fillScale : 1.0;
          const rot = activeVisit.fillRotate || 0;
          const cx = bx + bw / 2;
          const cy = by + bh / 2;
          transformG.setAttribute('transform', `translate(${cx}, ${cy}) rotate(${rot}) scale(${scale}) translate(${-cx + panX}, ${-cy + panY})`);
        }
        const txt = document.getElementById(`roaster-txt-${plate}`);
        if (txt) txt.textContent = `${curIdx + 1}/${photos.length}`;
      }
    }, 3200);
  }

  // --- Geolocation: Detect & Display Current Location ---
  let userGpsMarker = null;

  function locateUser() {
    if (!('geolocation' in navigator)) {
      showToast('Geolocation is not supported by your browser');
      return;
    }

    showToast('Detecting your location...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        // Bounding check for Turkey and Northern Cyprus
        // Latitude: 34.5 to 42.5, Longitude: 25.5 to 45.0
        const isInsideRegion = (lat >= 34.5 && lat <= 42.5 && lon >= 25.5 && lon <= 45.0);

        if (!isInsideRegion) {
          showToast(`📍 Your position (${lat.toFixed(2)}°, ${lon.toFixed(2)}°) is outside Turkey & Northern Cyprus.`);
          return;
        }

        const svgCoords = geoToSvg(lon, lat);
        if (svgCoords) {
          renderUserGpsMarker(svgCoords[0], svgCoords[1]);
          centerMapOnPoint(svgCoords[0], svgCoords[1]);
        }

        // Identify closest province/city
        let closestCity = null;
        let minDist = Infinity;
        if (typeof TURKEY_PROVINCES !== 'undefined') {
          TURKEY_PROVINCES.forEach(p => {
            if (p.center) {
              const d = Math.hypot(p.center[0] - lat, p.center[1] - lon);
              if (d < minDist) {
                minDist = d;
                closestCity = p;
              }
            }
          });
        }

        // Show on Leaflet Map as well
        if (leafletMap) {
          if (userGpsMarker) leafletMap.removeLayer(userGpsMarker);
          userGpsMarker = L.circleMarker([lat, lon], {
            radius: 9,
            fillColor: '#2563eb',
            color: '#ffffff',
            weight: 3,
            opacity: 1,
            fillOpacity: 0.95
          }).addTo(leafletMap);

          userGpsMarker.bindPopup(`📍 <strong>You are here!</strong><br>${closestCity ? closestCity.name : ''}`).openPopup();
          leafletMap.setView([lat, lon], 8);
        }

        const cityName = closestCity ? closestCity.name : 'Turkey';
        showToast(`📍 You are in ${cityName}! (Lat: ${lat.toFixed(2)}, Lon: ${lon.toFixed(2)})`);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        if (err.code === 1) {
          showToast('Location permission denied. Please enable location permissions in browser settings.');
        } else if (err.code === 2) {
          showToast('Location unavailable.');
        } else if (err.code === 3) {
          showToast('Location request timed out.');
        } else {
          showToast('Could not retrieve your location.');
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  }

  function geoToSvg(lon, lat) {
    const minLon = 25.5, maxLon = 44.9;
    const minLat = 34.8, maxLat = 42.3;
    const latToY = (l) => {
      const r = (l * Math.PI) / 180.0;
      return Math.log(Math.tan(Math.PI / 4.0 + r / 2.0));
    };
    const minY = latToY(minLat);
    const maxY = latToY(maxLat);
    const W = 1000, H = 500, padX = 25, padY = 25;
    const x = padX + ((lon - minLon) / (maxLon - minLon)) * (W - 2 * padX);
    const y = H - padY - ((latToY(lat) - minY) / (maxY - minY)) * (H - 2 * padY);
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
  }

  function renderUserGpsMarker(x, y) {
    const gpsGroup = document.getElementById('svg-gps-group');
    if (!gpsGroup) return;

    gpsGroup.innerHTML = `
      <g id="user-gps-marker" class="user-gps-marker" transform="translate(${x}, ${y})">
        <circle class="gps-pulse" cx="0" cy="0" r="16" fill="rgba(37, 99, 235, 0.3)" />
        <circle cx="0" cy="0" r="7" fill="#2563eb" stroke="#ffffff" stroke-width="2.5" />
        <circle cx="0" cy="0" r="2.5" fill="#ffffff" />
      </g>
    `;
  }

  function centerMapOnPoint(x, y) {
    const targetX = (500 - x) * state.panZoom.scale;
    const targetY = (250 - y) * state.panZoom.scale;
    state.panZoom.x = targetX;
    state.panZoom.y = targetY;
    const svg = document.getElementById('turkey-svg-map');
    if (svg) {
      svg.style.transform = `translate(${state.panZoom.x}px, ${state.panZoom.y}px) scale(${state.panZoom.scale})`;
    }
  }

  // Default Home View Pan calculation:
  // - In full-screen desktop mode (> 1024px): The map container is tall and the SVG
  //   aspect-ratio letterboxing naturally centers Turkey. Returning { x: 0, y: 0, scale: 1 }
  //   achieves exact mathematical & visual vertical and horizontal centering (within ~1.5px).
  // - In compacted / half-screen mode (<= 1024px): The 1-column layout has a tight aspect ratio,
  //   so lowering it slightly (Y ≈ 20-24px) gives comfortable clearance from the toolbar.
  function getHomePan() {
    const isCompact = window.innerWidth <= 1024;
    if (isCompact) {
      const wrapper = document.getElementById('vector-map-wrapper');
      const h = wrapper ? wrapper.clientHeight : 400;
      return { x: 0, y: Math.min(24, Math.max(8, Math.round(h * 0.045))), scale: 1 };
    }
    return { x: 0, y: 0, scale: 1 };
  }

  // --- Pan & Zoom Handling for Vector SVG Map ---
  function setupPanZoom() {
    const wrapper = document.getElementById('vector-map-wrapper');
    const svg = document.getElementById('turkey-svg-map');
    if (!wrapper || !svg) return;

    function applyTransform() {
      svg.style.transform = `translate(${state.panZoom.x}px, ${state.panZoom.y}px) scale(${state.panZoom.scale})`;
    }

    // Initialize with calibrated home position
    const home = getHomePan();
    state.panZoom.x = home.x;
    state.panZoom.y = home.y;
    state.panZoom.scale = home.scale;
    applyTransform();

    // Dynamically adapt home view on window resize if map is in default position
    window.addEventListener('resize', () => {
      if (state.panZoom.scale === 1 && state.panZoom.x === 0 && !state.panZoom.isDragging) {
        const currentHome = getHomePan();
        state.panZoom.x = currentHome.x;
        state.panZoom.y = currentHome.y;
        state.panZoom.scale = currentHome.scale;
        applyTransform();
      }
    });

    wrapper.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      state.panZoom.isDragging = true;
      state.panZoom.startX = e.clientX - state.panZoom.x;
      state.panZoom.startY = e.clientY - state.panZoom.y;
    });

    window.addEventListener('mousemove', (e) => {
      if (!state.panZoom.isDragging) return;
      state.panZoom.x = e.clientX - state.panZoom.startX;
      state.panZoom.y = e.clientY - state.panZoom.startY;
      applyTransform();
    });

    window.addEventListener('mouseup', () => {
      state.panZoom.isDragging = false;
    });

    wrapper.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        state.panZoom.isDragging = true;
        state.panZoom.startX = e.touches[0].clientX - state.panZoom.x;
        state.panZoom.startY = e.touches[0].clientY - state.panZoom.y;
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (!state.panZoom.isDragging || e.touches.length !== 1) return;
      state.panZoom.x = e.touches[0].clientX - state.panZoom.startX;
      state.panZoom.y = e.touches[0].clientY - state.panZoom.startY;
      applyTransform();
    }, { passive: true });

    window.addEventListener('touchend', () => {
      state.panZoom.isDragging = false;
    });

    wrapper.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
      zoomMap(zoomFactor);
    }, { passive: false });

    document.getElementById('zoom-in-btn')?.addEventListener('click', () => zoomMap(1.25));
    document.getElementById('zoom-out-btn')?.addEventListener('click', () => zoomMap(0.8));
    document.getElementById('zoom-home-btn')?.addEventListener('click', resetHomeView);
    document.getElementById('zoom-reset-btn')?.addEventListener('click', resetHomeView);
  }

  function zoomMap(factor) {
    const newScale = Math.min(Math.max(state.panZoom.scale * factor, 0.6), 5.0);
    state.panZoom.scale = newScale;
    const svg = document.getElementById('turkey-svg-map');
    if (svg) {
      svg.style.transform = `translate(${state.panZoom.x}px, ${state.panZoom.y}px) scale(${state.panZoom.scale})`;
    }
  }

  function resetMapZoom() {
    resetHomeView();
  }

  function resetHomeView() {
    const home = getHomePan();
    const svg = document.getElementById('turkey-svg-map');
    if (svg) {
      svg.style.transition = 'transform 0.35s cubic-bezier(0.25, 1, 0.5, 1)';
      setTimeout(() => {
        if (svg) svg.style.transition = '';
      }, 380);
    }
    state.panZoom.x = home.x;
    state.panZoom.y = home.y;
    state.panZoom.scale = home.scale;
    if (svg) {
      svg.style.transform = `translate(${state.panZoom.x}px, ${state.panZoom.y}px) scale(${state.panZoom.scale})`;
    }
    if (leafletMap) {
      leafletMap.setView([38.2, 35.2], 6);
    }
    showToast('Map view reset to Home 🏠');
  }

  // --- Hover Tooltip Handling ---
  const tooltip = document.getElementById('map-tooltip');

  function onProvinceMouseEnter(e, prov) {
    if (!tooltip) return;
    const category = getCityCategory(prov.plate);
    const visits = state.visits.filter(v => Number(v.plate) === Number(prov.plate));
    const hasPhoto = visits.some(v => v.photo);

    let catBadgeHtml = '<span class="map-tooltip-badge" style="background:#64748b;color:#fff;">Not Visited</span>';
    if (category === 'lived') {
      catBadgeHtml = '<span class="map-tooltip-badge" style="background:#4338ca;color:#fbbf24;">🏠 Lived in</span>';
    } else if (category === 'visited') {
      catBadgeHtml = '<span class="map-tooltip-badge" style="background:#10b981;color:#fff;">🎨 Visited</span>';
    } else if (category === 'work') {
      catBadgeHtml = '<span class="map-tooltip-badge" style="background:#3b82f6;color:#fff;">📐 Work</span>';
    } else if (category === 'passed') {
      catBadgeHtml = '<span class="map-tooltip-badge" style="background:#f59e0b;color:#fff;">⚬ Passed</span>';
    }

    let visitSummary = `${visits.length} record${visits.length === 1 ? '' : 's'} logged`;
    if (visits.length === 0) visitSummary = 'Click to record a visit';

    const countryTag = prov.country ? ` • ${prov.country}` : '';

    tooltip.innerHTML = `
      <div class="map-tooltip-header">
        <span>${prov.name} (${prov.plate_str})</span>
        ${catBadgeHtml}
      </div>
      <div style="font-size:0.72rem;color:#cbd5e1;margin-bottom:2px;">${prov.region} ${countryTag} ${hasPhoto ? '• 📷 Photo Attached' : ''}</div>
      <div style="font-size:0.75rem;font-weight:500;">${visitSummary}</div>
    `;

    tooltip.classList.add('active');
    positionTooltip(e);
  }

  function onProvinceMouseMove(e) {
    positionTooltip(e);
  }

  function onProvinceMouseLeave() {
    if (!tooltip) return;
    tooltip.classList.remove('active');
  }

  function positionTooltip(e) {
    if (!tooltip) return;
    const container = document.getElementById('map-stage-container');
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
  }

  // --- Province Click & Drawer Management ---
  function onProvinceClick(plate) {
    state.selectedPlate = Number(plate);
    state.editingVisitId = null;
    refreshMapFills();
    openCityDrawer(plate);
  }

  function openCityDrawer(plate) {
    const prov = provinceByPlate[plate];
    if (!prov) return;

    const drawer = document.getElementById('city-drawer-backdrop');
    if (!drawer) return;

    document.getElementById('drawer-city-name').textContent = prov.name;
    document.getElementById('drawer-plate-badge').textContent = prov.plate_str;
    document.getElementById('drawer-region-name').textContent = `${prov.region} ${prov.country ? '• ' + prov.country : ''} • Plaka ${prov.plate_str}`;

    resetDrawerForm(plate);
    renderDrawerVisits(plate);
    drawer.classList.add('active');
  }

  function closeCityDrawer() {
    const drawer = document.getElementById('city-drawer-backdrop');
    if (drawer) {
      drawer.classList.remove('active');
    }
    state.selectedPlate = null;
    state.editingVisitId = null;
    state.currentPhotoData = null;
    refreshMapFills();
  }

  function setDrawerPhotoStyle(style = 'circle') {
    state.selectedPhotoStyle = style;
    document.querySelectorAll('.photo-style-option').forEach(opt => {
      if (opt.getAttribute('data-style') === style) {
        opt.classList.add('active');
      } else {
        opt.classList.remove('active');
      }
    });

    const hintEl = document.getElementById('photo-style-hint');
    const polaroidPanel = document.getElementById('polaroid-note-panel');
    const fillPanel = document.getElementById('photo-fill-adjust-panel');

    if (style === 'polaroid') {
      if (hintEl) hintEl.textContent = 'Tilted Polaroid stack with handwritten note & 500% zoom';
      if (polaroidPanel) polaroidPanel.style.display = 'block';
      if (fillPanel) fillPanel.style.display = 'none';
    } else if (style === 'fill') {
      if (hintEl) hintEl.textContent = 'Fills city boundary with pan & rotate framing alignment';
      if (polaroidPanel) polaroidPanel.style.display = 'none';
      if (fillPanel) {
        fillPanel.style.display = 'block';
        updateFillPreview(state.selectedPlate, state.currentPhotoData);
      }
    } else {
      if (hintEl) hintEl.textContent = 'Circular center pin with satellite cluster';
      if (polaroidPanel) polaroidPanel.style.display = 'none';
      if (fillPanel) fillPanel.style.display = 'none';
    }
  }

  // --- Photo Fill Framing Alignment & Live Preview ---
  function getFillAdjustmentValues() {
    const panX = parseInt(document.getElementById('fill-pan-x')?.value || '0', 10);
    const panY = parseInt(document.getElementById('fill-pan-y')?.value || '0', 10);
    const scale = parseInt(document.getElementById('fill-scale')?.value || '100', 10) / 100;
    const rot = parseInt(document.getElementById('fill-rot')?.value || '0', 10);
    return { panX, panY, scale, rot };
  }

  function setFillAdjustmentValues(panX = 0, panY = 0, scale = 1.0, rot = 0) {
    const panXInput = document.getElementById('fill-pan-x');
    const panYInput = document.getElementById('fill-pan-y');
    const scaleInput = document.getElementById('fill-scale');
    const rotInput = document.getElementById('fill-rot');

    if (panXInput) panXInput.value = panX;
    if (panYInput) panYInput.value = panY;
    if (scaleInput) scaleInput.value = Math.round(scale * 100);
    if (rotInput) rotInput.value = rot;

    updateFillAdjustmentBadges(panX, panY, scale, rot);
  }

  function updateFillAdjustmentBadges(panX, panY, scale, rot) {
    const panXVal = document.getElementById('fill-pan-x-val');
    const panYVal = document.getElementById('fill-pan-y-val');
    const scaleVal = document.getElementById('fill-scale-val');
    const rotVal = document.getElementById('fill-rot-val');

    if (panXVal) panXVal.textContent = `${panX > 0 ? '+' : ''}${panX}%`;
    if (panYVal) panYVal.textContent = `${panY > 0 ? '+' : ''}${panY}%`;
    if (scaleVal) scaleVal.textContent = `${Math.round(scale * 100)}%`;
    if (rotVal) rotVal.textContent = `${rot}°`;
  }

  function updateFillPreview(plate, photoData) {
    const previewSvg = document.getElementById('fill-preview-svg');
    const nameEl = document.getElementById('fill-preview-city-name');
    if (!previewSvg) return;

    const p = Number(plate || state.selectedPlate);
    const prov = provinceByPlate[p];
    if (!prov) return;

    if (nameEl) nameEl.textContent = prov.name;

    const photo = photoData || state.currentPhotoData;
    if (!photo) {
      previewSvg.innerHTML = '';
      return;
    }

    const bbox = getCityBBox(p);
    const [bx, by, bw, bh] = bbox;
    const pad = Math.max(bw, bh) * 0.15;
    const vx = bx - pad;
    const vy = by - pad;
    const vw = bw + pad * 2;
    const vh = bh + pad * 2;

    previewSvg.setAttribute('viewBox', `${vx} ${vy} ${vw} ${vh}`);

    const { panX, panY, scale, rot } = getFillAdjustmentValues();
    const panXPx = (panX / 100) * bw;
    const panYPx = (panY / 100) * bh;
    const cx = bx + bw / 2;
    const cy = by + bh / 2;

    const transformStr = `translate(${cx}, ${cy}) rotate(${rot}) scale(${scale}) translate(${-cx + panXPx}, ${-cy + panYPx})`;

    previewSvg.innerHTML = `
      <defs>
        <clipPath id="fill-preview-clip-${p}">
          <path d="${prov.svgPath}" />
        </clipPath>
      </defs>
      <!-- Background dimmed context of full photo -->
      <g id="preview-photo-bg" transform="${transformStr}" opacity="0.22">
        <image href="${photo}" x="${bx}" y="${by}" width="${bw}" height="${bh}" preserveAspectRatio="xMidYMid slice" />
      </g>
      <!-- Clipped foreground full-brightness photo within city boundary -->
      <g clip-path="url(#fill-preview-clip-${p})">
        <g id="preview-photo-fg" transform="${transformStr}">
          <image href="${photo}" x="${bx}" y="${by}" width="${bw}" height="${bh}" preserveAspectRatio="xMidYMid slice" />
        </g>
      </g>
      <!-- Highlighted city boundary border -->
      <path d="${prov.svgPath}" fill="none" stroke="#3b82f6" stroke-width="2.5" vector-effect="non-scaling-stroke" />
    `;

    // Also update live SVG pattern on the main map if present
    const mapTransformG = document.getElementById(`photo-fill-transform-${p}`);
    if (mapTransformG) {
      mapTransformG.setAttribute('transform', transformStr);
    }
  }

  function applyFillAdjustmentsLive() {
    const { panX, panY, scale, rot } = getFillAdjustmentValues();
    updateFillAdjustmentBadges(panX, panY, scale, rot);

    const p = Number(state.selectedPlate);
    const prov = provinceByPlate[p];
    if (!prov) return;

    const bbox = getCityBBox(p);
    const [bx, by, bw, bh] = bbox;
    const panXPx = (panX / 100) * bw;
    const panYPx = (panY / 100) * bh;
    const cx = bx + bw / 2;
    const cy = by + bh / 2;
    const transformStr = `translate(${cx}, ${cy}) rotate(${rot}) scale(${scale}) translate(${-cx + panXPx}, ${-cy + panYPx})`;

    const bgG = document.getElementById('preview-photo-bg');
    const fgG = document.getElementById('preview-photo-fg');
    if (bgG) bgG.setAttribute('transform', transformStr);
    if (fgG) fgG.setAttribute('transform', transformStr);

    const mapTransformG = document.getElementById(`photo-fill-transform-${p}`);
    if (mapTransformG) {
      mapTransformG.setAttribute('transform', transformStr);
    }
  }

  let fillDragActive = false;
  let fillDragStartX = 0;
  let fillDragStartY = 0;
  let fillDragStartPanX = 0;
  let fillDragStartPanY = 0;

  function initFillAdjusterEvents() {
    const container = document.getElementById('fill-preview-container');
    if (container) {
      container.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        fillDragActive = true;
        fillDragStartX = e.clientX;
        fillDragStartY = e.clientY;
        const vals = getFillAdjustmentValues();
        fillDragStartPanX = vals.panX;
        fillDragStartPanY = vals.panY;
        container.setPointerCapture(e.pointerId);
      });

      container.addEventListener('pointermove', (e) => {
        if (!fillDragActive) return;
        const rect = container.getBoundingClientRect();
        const dx = e.clientX - fillDragStartX;
        const dy = e.clientY - fillDragStartY;
        const deltaXPercent = Math.round((dx / (rect.width || 200)) * 120);
        const deltaYPercent = Math.round((dy / (rect.height || 175)) * 120);

        const newPanX = Math.max(-100, Math.min(100, fillDragStartPanX + deltaXPercent));
        const newPanY = Math.max(-100, Math.min(100, fillDragStartPanY + deltaYPercent));

        const panXInput = document.getElementById('fill-pan-x');
        const panYInput = document.getElementById('fill-pan-y');
        if (panXInput) panXInput.value = newPanX;
        if (panYInput) panYInput.value = newPanY;

        applyFillAdjustmentsLive();
      });

      const stopDrag = (e) => {
        if (fillDragActive) {
          fillDragActive = false;
          try { container.releasePointerCapture(e.pointerId); } catch (_) {}
        }
      };

      container.addEventListener('pointerup', stopDrag);
      container.addEventListener('pointercancel', stopDrag);
    }

    ['fill-pan-x', 'fill-pan-y', 'fill-scale', 'fill-rot'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', applyFillAdjustmentsLive);
    });

    document.getElementById('rot-left-90-btn')?.addEventListener('click', () => {
      const rotInput = document.getElementById('fill-rot');
      if (rotInput) {
        let cur = parseInt(rotInput.value || '0', 10) - 90;
        if (cur < -180) cur += 360;
        rotInput.value = cur;
        applyFillAdjustmentsLive();
      }
    });

    document.getElementById('rot-right-90-btn')?.addEventListener('click', () => {
      const rotInput = document.getElementById('fill-rot');
      if (rotInput) {
        let cur = parseInt(rotInput.value || '0', 10) + 90;
        if (cur > 180) cur -= 360;
        rotInput.value = cur;
        applyFillAdjustmentsLive();
      }
    });

    document.getElementById('reset-fill-adjust-btn')?.addEventListener('click', () => {
      setFillAdjustmentValues(0, 0, 1.0, 0);
      applyFillAdjustmentsLive();
    });
  }

  // Helper: Switch between date precisions (Day, Month, Year, Undated)
  function selectDatePrecision(prec = 'day') {
    state.selectedDatePrecision = prec;
    document.querySelectorAll('.precision-btn').forEach(btn => {
      if (btn.getAttribute('data-precision') === prec) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const hintEl = document.getElementById('date-precision-hint');
    if (hintEl) {
      if (prec === 'month') hintEl.textContent = 'Month & Year (Day unspecified)';
      else if (prec === 'year') hintEl.textContent = 'Year Only (Month/Day unspecified)';
      else if (prec === 'undated') hintEl.textContent = 'Completely Undated';
      else hintEl.textContent = 'Exact Day';
    }

    const boxDay = document.getElementById('date-box-day');
    const boxMonth = document.getElementById('date-box-month');
    const boxYear = document.getElementById('date-box-year');
    const boxUndated = document.getElementById('date-box-undated');

    if (boxDay) boxDay.style.display = prec === 'day' ? 'flex' : 'none';
    if (boxMonth) boxMonth.style.display = prec === 'month' ? 'flex' : 'none';
    if (boxYear) boxYear.style.display = prec === 'year' ? 'flex' : 'none';
    if (boxUndated) boxUndated.style.display = prec === 'undated' ? 'block' : 'none';
  }

  function resetDrawerForm(plate) {
    state.editingVisitId = null;
    state.currentPhotoData = null;
    state.livedMode = 'range';
    const settings = getCityColor(plate);
    const existingStyle = getCityPhotoStyle(plate);
    setDrawerPhotoStyle(existingStyle);

    selectCategoryOption('visited');
    selectDatePrecision('day');

    const dateInput = document.getElementById('visit-date-input');
    const monthSelect = document.getElementById('visit-month-select');
    const monthYearInput = document.getElementById('visit-month-year-input');
    const yearOnlyInput = document.getElementById('visit-year-only-input');
    const notesInput = document.getElementById('visit-notes-input');

    const now = new Date();
    const curYear = now.getFullYear();
    const curMonthStr = String(now.getMonth() + 1).padStart(2, '0');
    const todayStr = now.toISOString().split('T')[0];

    if (dateInput) dateInput.value = todayStr;
    if (monthSelect) monthSelect.value = curMonthStr;
    if (monthYearInput) monthYearInput.value = curYear;
    if (yearOnlyInput) yearOnlyInput.value = curYear;
    if (notesInput) notesInput.value = '';

    setResidencyMode('range');
    const movedInInput = document.getElementById('lived-moved-in');
    const movedOutInput = document.getElementById('lived-moved-out');
    const stillHereCheck = document.getElementById('lived-still-here-check');
    const durationNum = document.getElementById('lived-duration-num');
    const durationUnit = document.getElementById('lived-duration-unit');

    if (movedInInput) movedInInput.value = '';
    if (movedOutInput) {
      movedOutInput.value = '';
      movedOutInput.disabled = false;
    }
    if (stillHereCheck) stillHereCheck.checked = false;
    if (durationNum) durationNum.value = '';
    if (durationUnit) durationUnit.value = 'years';

    document.getElementById('photo-upload-prompt').style.display = 'flex';
    document.getElementById('photo-preview-box').style.display = 'none';
    document.getElementById('photo-preview-img').src = '';
    const styleGroup = document.getElementById('photo-style-selector-group');
    if (styleGroup) styleGroup.style.display = 'none';
    const fileInput = document.getElementById('visit-photo-file');
    if (fileInput) fileInput.value = '';

    const noteInput = document.getElementById('visit-polaroid-note');
    if (noteInput) noteInput.value = '';

    const existingFraming = state.citySettings[plate] || {};
    setFillAdjustmentValues(
      existingFraming.fillPanX || 0,
      existingFraming.fillPanY || 0,
      existingFraming.fillScale !== undefined ? existingFraming.fillScale : 1.0,
      existingFraming.fillRotate || 0
    );

    updateDrawerColorPickers(plate, settings);

    const submitBtn = document.getElementById('save-visit-btn');
    if (submitBtn) submitBtn.textContent = 'Add Visit to Log';
  }

  function updateDrawerCategoryPreviewIcons(plate, settings) {
    ['lived', 'visited', 'work', 'passed'].forEach(cat => {
      const icon = document.getElementById(`cat-preview-icon-${cat}`);
      if (!icon) return;
      const style = getCategoryCssStyle(cat, settings);
      icon.style.backgroundColor = style.backgroundColor;
      icon.style.backgroundImage = style.backgroundImage;
      icon.style.backgroundSize = style.backgroundSize;
    });
  }

  function updateDrawerColorPickers(plate, settings, cat = null) {
    const selectedCat = cat || getSelectedCategoryFromDrawer();
    const swatch = document.getElementById('drawer-color-swatch');
    const titleEl = document.getElementById('drawer-color-title');
    const descEl = document.getElementById('drawer-color-desc');

    const cssStyle = getCategoryCssStyle(selectedCat, settings);
    if (swatch) {
      swatch.style.backgroundColor = cssStyle.backgroundColor;
      swatch.style.backgroundImage = cssStyle.backgroundImage;
      swatch.style.backgroundSize = cssStyle.backgroundSize;
    }

    if (titleEl && descEl) {
      if (selectedCat === 'lived') {
        titleEl.textContent = 'City Mesh Style';
        descEl.textContent = 'Randomized diamond mesh colors';
      } else if (selectedCat === 'work') {
        titleEl.textContent = 'City Stripe Style';
        descEl.textContent = 'Randomized vibrant diagonal stripes';
      } else if (selectedCat === 'passed') {
        titleEl.textContent = 'City Polka-Dot Style';
        descEl.textContent = 'Randomized vibrant polka-dots';
      } else {
        titleEl.textContent = 'City Map Color';
        descEl.textContent = 'Unique vibrant solid color';
      }
    }

    updateDrawerCategoryPreviewIcons(plate, settings);
  }

  function reRollCityColors(plate) {
    if (!plate) return;
    const currentHue = (state.citySettings[plate] && state.citySettings[plate].hue) || 0;
    const newHue = (currentHue + 73 + Math.floor(Math.random() * 120)) % 360;
    const newColors = generateCityColorSet(plate, newHue);
    state.citySettings[plate] = Object.assign(state.citySettings[plate] || {}, newColors);
    const settings = state.citySettings[plate];
    updateSvgPatterns();
    updateDrawerColorPickers(plate, settings);
    refreshMapFills();
    saveState();
    showToast('City pattern & colors updated! 🎲');
  }

  function setResidencyMode(mode) {
    state.livedMode = mode;
    const rangeBtn = document.getElementById('res-mode-range-btn');
    const durationBtn = document.getElementById('res-mode-duration-btn');
    const rangeBox = document.getElementById('lived-range-box');
    const durationBox = document.getElementById('lived-duration-box');

    if (mode === 'range') {
      rangeBtn?.classList.add('active');
      durationBtn?.classList.remove('active');
      if (rangeBox) rangeBox.style.display = 'flex';
      if (durationBox) durationBox.style.display = 'none';
    } else {
      rangeBtn?.classList.remove('active');
      durationBtn?.classList.add('active');
      if (rangeBox) rangeBox.style.display = 'none';
      if (durationBox) durationBox.style.display = 'flex';
    }
  }

  function selectCategoryOption(cat) {
    document.querySelectorAll('.category-option-card').forEach(card => {
      if (card.getAttribute('data-cat') === cat) {
        card.classList.add('selected');
      } else {
        card.classList.remove('selected');
      }
    });

    const livedPanel = document.getElementById('lived-timing-panel');
    const standardPanel = document.getElementById('standard-date-panel');
    const colorRow = document.getElementById('drawer-color-picker-row');

    if (cat === 'lived') {
      if (livedPanel) livedPanel.style.display = 'flex';
      if (standardPanel) standardPanel.style.display = 'none';
      if (colorRow) colorRow.style.display = 'flex';
    } else {
      if (livedPanel) livedPanel.style.display = 'none';
      if (standardPanel) standardPanel.style.display = 'block';
      if (colorRow) colorRow.style.display = 'flex';
    }

    if (state.selectedPlate) {
      const settings = getCityColor(state.selectedPlate);
      updateDrawerColorPickers(state.selectedPlate, settings, cat);
    }
  }

  function getSelectedCategoryFromDrawer() {
    const selected = document.querySelector('.category-option-card.selected');
    return selected ? selected.getAttribute('data-cat') : 'visited';
  }

  // --- Photo Upload & Compression ---
  function compressImageFile(file, maxWidth = 550, quality = 0.82) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width;
          let h = img.height;
          if (w > maxWidth || h > maxWidth) {
            if (w > h) {
              h = Math.round((h * maxWidth) / w);
              w = maxWidth;
            } else {
              w = Math.round((w * maxWidth) / h);
              h = maxWidth;
            }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Render list of visits inside drawer
  function renderDrawerVisits(plate) {
    const listEl = document.getElementById('drawer-visits-list');
    if (!listEl) return;

    const visits = state.visits.filter(v => Number(v.plate) === Number(plate));
    if (visits.length === 0) {
      listEl.innerHTML = '<div style="font-size:0.8rem;color:var(--text-muted);text-align:center;padding:1rem;">No visits recorded for this city yet. Add one above!</div>';
      return;
    }

    listEl.innerHTML = visits.map(v => {
      let catTag = '';
      let dateStr = '';

      if (v.category === 'lived') {
        catTag = '<span class="category-tag lived">🏠 Lived in</span>';
        if (v.livedType === 'duration' || v.durationYears) {
          dateStr = `Lived for ${escapeHtml(v.durationYears)}`;
        } else if (v.isStillLiving) {
          dateStr = `Moved in ${formatDate(v.startDate || v.date)} (Current Home 🏠)`;
        } else if (v.startDate && v.endDate) {
          dateStr = `${formatDate(v.startDate)} → ${formatDate(v.endDate)}`;
        } else if (v.startDate || v.date) {
          dateStr = `From ${formatDate(v.startDate || v.date)}`;
        } else {
          dateStr = '<em>Period unspecified</em>';
        }
      } else {
        if (v.category === 'visited') catTag = '<span class="category-tag visited">🎨 Visited</span>';
        else if (v.category === 'work') catTag = '<span class="category-tag work">📐 Work</span>';
        else if (v.category === 'passed') catTag = '<span class="category-tag passed">⚬ Passed Through</span>';
        dateStr = v.isDated && v.date ? formatDate(v.date) : '<em>Undated</em>';
      }

      return `
        <div class="drawer-visit-item">
          <div style="flex:1;">
            <div style="display:flex;align-items:center;gap:0.4rem;margin-bottom:0.2rem;flex-wrap:wrap;">
              ${catTag}
              <span style="font-size:0.75rem;font-weight:600;color:var(--text-secondary);">${dateStr}</span>
              ${v.photo ? '<span style="font-size:0.7rem;color:var(--accent-blue);" title="Has photo">📷 Photo</span>' : ''}
            </div>
            ${v.notes ? `<div style="font-size:0.75rem;color:var(--text-primary);margin-bottom:0.3rem;">${escapeHtml(v.notes)}</div>` : ''}
            ${v.photo ? `<img src="${v.photo}" style="width:45px;height:45px;border-radius:4px;object-fit:cover;cursor:pointer;border:1px solid var(--border-color);" onclick="window.openPhotoLightbox('${v.id}')" title="Click to view photo" />` : ''}
          </div>
          <div style="display:flex;gap:0.3rem;">
            <button class="btn btn-sm" onclick="window.editVisit('${v.id}')" title="Edit Visit">✏️</button>
            <button class="btn btn-sm" onclick="window.deleteVisit('${v.id}')" title="Delete Visit">🗑️</button>
          </div>
        </div>
      `;
    }).join('');
  }

  // --- Add / Update / Delete Visits ---
  function saveCurrentVisit() {
    if (!state.selectedPlate) return;
    const plate = Number(state.selectedPlate);
    const prov = provinceByPlate[plate];
    if (!prov) return;

    const category = getSelectedCategoryFromDrawer();
    const notesValue = document.getElementById('visit-notes-input')?.value?.trim() || '';
    const photoValue = state.currentPhotoData || null;

    let isDated = false;
    let dateValue = null;
    let livedType = null;
    let startDate = null;
    let endDate = null;
    let isStillLiving = false;
    let durationYears = null;
    let datePrecision = 'day';

    const photoStyleValue = state.selectedPhotoStyle || 'circle';
    const polaroidNoteValue = document.getElementById('visit-polaroid-note')?.value?.trim() || '';
    const { panX: fillPanX, panY: fillPanY, scale: fillScale, rot: fillRotate } = getFillAdjustmentValues();

    if (category === 'lived') {
      if (state.livedMode === 'range') {
        startDate = document.getElementById('lived-moved-in')?.value || null;
        isStillLiving = document.getElementById('lived-still-here-check')?.checked || false;
        endDate = isStillLiving ? null : (document.getElementById('lived-moved-out')?.value || null);
        livedType = 'range';
        dateValue = startDate;
        isDated = !!startDate;
      } else {
        const num = document.getElementById('lived-duration-num')?.value?.trim() || '';
        const unit = document.getElementById('lived-duration-unit')?.value || 'years';
        durationYears = num ? `${num} ${unit}` : 'A period of time';
        livedType = 'duration';
        isDated = false;
        dateValue = null;
      }
    } else {
      const prec = state.selectedDatePrecision || 'day';
      datePrecision = prec;
      if (prec === 'day') {
        dateValue = document.getElementById('visit-date-input')?.value || null;
        if (!dateValue) {
          showToast('Please select a date, or choose "Undated"');
          return;
        }
        isDated = true;
      } else if (prec === 'month') {
        const m = document.getElementById('visit-month-select')?.value || '01';
        const y = document.getElementById('visit-month-year-input')?.value?.trim();
        if (!y || isNaN(Number(y))) {
          showToast('Please enter a valid year (e.g. 2023)');
          return;
        }
        dateValue = `${y}-${m}`;
        isDated = true;
      } else if (prec === 'year') {
        const y = document.getElementById('visit-year-only-input')?.value?.trim();
        if (!y || isNaN(Number(y))) {
          showToast('Please enter a valid year (e.g. 2021)');
          return;
        }
        dateValue = `${y}`;
        isDated = true;
      } else {
        // undated
        dateValue = null;
        isDated = false;
        datePrecision = 'undated';
      }
    }

    if (photoValue) {
      if (!state.citySettings[plate]) getCityColor(plate);
      state.citySettings[plate].photoStyle = photoStyleValue;
      if (photoStyleValue === 'fill') {
        state.citySettings[plate].fillPanX = fillPanX;
        state.citySettings[plate].fillPanY = fillPanY;
        state.citySettings[plate].fillScale = fillScale;
        state.citySettings[plate].fillRotate = fillRotate;
      }
    }

    if (state.editingVisitId) {
      const idx = state.visits.findIndex(v => v.id === state.editingVisitId);
      if (idx !== -1) {
        state.visits[idx].category = category;
        state.visits[idx].isDated = isDated;
        state.visits[idx].date = dateValue;
        state.visits[idx].datePrecision = datePrecision;
        state.visits[idx].livedType = livedType;
        state.visits[idx].startDate = startDate;
        state.visits[idx].endDate = endDate;
        state.visits[idx].isStillLiving = isStillLiving;
        state.visits[idx].durationYears = durationYears;
        state.visits[idx].notes = notesValue;
        state.visits[idx].photo = photoValue;
        if (photoValue) {
          state.visits[idx].photoStyle = photoStyleValue;
          state.visits[idx].polaroidNote = polaroidNoteValue;
          state.visits[idx].fillPanX = fillPanX;
          state.visits[idx].fillPanY = fillPanY;
          state.visits[idx].fillScale = fillScale;
          state.visits[idx].fillRotate = fillRotate;
        }
      }
      showToast(`Updated record for ${prov.name}`);
    } else {
      const newVisit = {
        id: 'v_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        plate: plate,
        cityName: prov.name,
        category: category,
        isDated: isDated,
        date: dateValue,
        datePrecision: datePrecision,
        livedType: livedType,
        startDate: startDate,
        endDate: endDate,
        isStillLiving: isStillLiving,
        durationYears: durationYears,
        notes: notesValue,
        photo: photoValue,
        photoStyle: photoValue ? photoStyleValue : undefined,
        polaroidNote: photoValue ? polaroidNoteValue : undefined,
        fillPanX: photoValue ? fillPanX : undefined,
        fillPanY: photoValue ? fillPanY : undefined,
        fillScale: photoValue ? fillScale : undefined,
        fillRotate: photoValue ? fillRotate : undefined,
        createdAt: Date.now()
      };
      state.visits.push(newVisit);
      showToast(`Recorded visit to ${prov.name}! 🚀`);
    }

    saveState();
    refreshAll();
    renderDrawerVisits(plate);
    resetDrawerForm(plate);
  }

  window.editVisit = function (visitId) {
    const visit = state.visits.find(v => v.id === visitId);
    if (!visit) return;

    state.editingVisitId = visit.id;
    state.selectedPlate = Number(visit.plate);
    state.currentPhotoData = visit.photo || null;

    const prov = provinceByPlate[visit.plate];
    if (prov) {
      document.getElementById('drawer-city-name').textContent = prov.name;
      document.getElementById('drawer-plate-badge').textContent = prov.plate_str;
      document.getElementById('drawer-region-name').textContent = `${prov.region} ${prov.country ? '• ' + prov.country : ''} • Plaka ${prov.plate_str}`;
      renderDrawerVisits(visit.plate);
    }
    const drawer = document.getElementById('city-drawer-backdrop');
    if (drawer) {
      drawer.classList.add('active');
    }

    selectCategoryOption(visit.category);

    if (visit.category === 'lived') {
      if (visit.livedType === 'duration' || visit.durationYears) {
        setResidencyMode('duration');
        if (visit.durationYears) {
          const parts = visit.durationYears.split(' ');
          const numInput = document.getElementById('lived-duration-num');
          const unitSelect = document.getElementById('lived-duration-unit');
          if (numInput) numInput.value = parts[0] || '';
          if (unitSelect && parts[1]) unitSelect.value = parts[1];
        }
      } else {
        setResidencyMode('range');
        const movedInInput = document.getElementById('lived-moved-in');
        const movedOutInput = document.getElementById('lived-moved-out');
        const stillHereCheck = document.getElementById('lived-still-here-check');
        if (movedInInput) movedInInput.value = visit.startDate || visit.date || '';
        if (stillHereCheck) stillHereCheck.checked = !!visit.isStillLiving;
        if (movedOutInput) {
          movedOutInput.value = visit.endDate || '';
          movedOutInput.disabled = !!visit.isStillLiving;
        }
      }
    } else {
      let prec = visit.datePrecision;
      if (!prec) {
        if (!visit.isDated || !visit.date) prec = 'undated';
        else if (visit.date.split('-').length === 3) prec = 'day';
        else if (visit.date.split('-').length === 2) prec = 'month';
        else if (visit.date.split('-').length === 1) prec = 'year';
        else prec = 'day';
      }
      selectDatePrecision(prec);

      if (prec === 'day') {
        const dateInput = document.getElementById('visit-date-input');
        if (dateInput) dateInput.value = visit.date || '';
      } else if (prec === 'month') {
        const parts = (visit.date || '').split('-');
        const monthSelect = document.getElementById('visit-month-select');
        const monthYearInput = document.getElementById('visit-month-year-input');
        if (parts.length >= 2) {
          if (monthYearInput) monthYearInput.value = parts[0];
          if (monthSelect) monthSelect.value = parts[1];
        }
      } else if (prec === 'year') {
        const yearOnlyInput = document.getElementById('visit-year-only-input');
        if (yearOnlyInput) yearOnlyInput.value = visit.date || '';
      }
    }

    const notesInput = document.getElementById('visit-notes-input');
    if (notesInput) notesInput.value = visit.notes || '';

    // Restore polaroid note & fill framing alignment
    const noteInput = document.getElementById('visit-polaroid-note');
    if (noteInput) noteInput.value = visit.polaroidNote || '';

    setFillAdjustmentValues(
      visit.fillPanX || 0,
      visit.fillPanY || 0,
      visit.fillScale !== undefined ? visit.fillScale : 1.0,
      visit.fillRotate || 0
    );

    // Handle photo preview & style selector
    const promptEl = document.getElementById('photo-upload-prompt');
    const previewBox = document.getElementById('photo-preview-box');
    const previewImg = document.getElementById('photo-preview-img');
    const styleGroup = document.getElementById('photo-style-selector-group');

    if (visit.photo) {
      previewImg.src = visit.photo;
      previewBox.style.display = 'flex';
      promptEl.style.display = 'none';
      if (styleGroup) styleGroup.style.display = 'block';
      setDrawerPhotoStyle(visit.photoStyle || getCityPhotoStyle(visit.plate));
    } else {
      previewBox.style.display = 'none';
      promptEl.style.display = 'flex';
      previewImg.src = '';
      if (styleGroup) styleGroup.style.display = 'none';
    }

    const submitBtn = document.getElementById('save-visit-btn');
    if (submitBtn) submitBtn.textContent = 'Update Visit Entry';

    document.querySelector('.drawer-body')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  window.deleteVisit = function (visitId) {
    const visit = state.visits.find(v => v.id === visitId);
    if (!visit) return;

    if (confirm(`Remove this record for ${visit.cityName}?`)) {
      state.visits = state.visits.filter(v => v.id !== visitId);
      saveState();
      refreshAll();
      if (state.selectedPlate) {
        renderDrawerVisits(state.selectedPlate);
      }
      showToast('Record removed');
    }
  };

  function clearCityVisits(plate) {
    const prov = provinceByPlate[plate];
    if (!prov) return;

    if (confirm(`Clear all visit records for ${prov.name}?`)) {
      state.visits = state.visits.filter(v => Number(v.plate) !== Number(plate));
      saveState();
      refreshAll();
      renderDrawerVisits(plate);
      showToast(`Cleared all visits for ${prov.name}`);
    }
  }

  // --- Photo Lightbox Modal ---
  window.openPhotoLightbox = function (visitId) {
    const visit = state.visits.find(v => v.id === visitId);
    if (!visit || !visit.photo) return;

    const lightbox = document.getElementById('photo-lightbox-backdrop');
    const img = document.getElementById('lightbox-img');
    const title = document.getElementById('lightbox-title');
    const caption = document.getElementById('lightbox-caption');

    if (!lightbox || !img) return;

    img.src = visit.photo;
    title.textContent = `📍 ${visit.cityName} ${visit.isDated && visit.date ? '• ' + formatDate(visit.date) : ''}`;
    caption.textContent = visit.notes || 'No description added.';
    lightbox.classList.add('active');
  };

  function closePhotoLightbox() {
    const lightbox = document.getElementById('photo-lightbox-backdrop');
    if (lightbox) {
      lightbox.classList.remove('active');
    }
  }

  // Helper: Retrieve numeric sort timestamp for a visit
  function getVisitTimestamp(v) {
    if (v.placedTimestamp) {
      return Number(v.placedTimestamp);
    }
    const dStr = v.startDate || v.date;
    if (!dStr) return 0;
    const parts = dStr.split('-');
    if (parts.length === 3) {
      // YYYY-MM-DD
      return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0).getTime();
    } else if (parts.length === 2) {
      // YYYY-MM (Mid-month)
      return new Date(parts[0], parts[1] - 1, 15, 12, 0, 0).getTime();
    } else if (parts.length === 1 && parts[0].length === 4) {
      // YYYY (Mid-year)
      return new Date(parts[0], 6, 1, 12, 0, 0).getTime();
    }
    const parsed = Date.parse(dStr);
    return isNaN(parsed) ? 0 : parsed;
  }

  // Helper: Retrieve year group label for a visit
  function getVisitYear(v) {
    if (v.placedTimestamp) {
      return new Date(v.placedTimestamp).getFullYear().toString();
    }
    const dStr = v.startDate || v.date;
    if (dStr) {
      return dStr.split('-')[0];
    }
    return 'Undated';
  }

  // --- Chronological Log & Timeline Rendering ---
  function renderTimelineLog() {
    const timelineContainer = document.getElementById('timeline-container');
    const undatedContainer = document.getElementById('undated-visits-list');
    const undatedCountBadge = document.getElementById('undated-count-badge');
    const totalLogCount = document.getElementById('total-log-count');

    if (!timelineContainer) return;

    if (totalLogCount) totalLogCount.textContent = state.visits.length;
    const expandLogCount = document.getElementById('expand-log-count');
    if (expandLogCount) expandLogCount.textContent = state.visits.length;

    let filtered = [...state.visits];
    if (state.logFilter === 'lived') filtered = filtered.filter(v => v.category === 'lived');
    else if (state.logFilter === 'visited') filtered = filtered.filter(v => v.category === 'visited');
    else if (state.logFilter === 'work') filtered = filtered.filter(v => v.category === 'work');
    else if (state.logFilter === 'passed') filtered = filtered.filter(v => v.category === 'passed');

    // Placed timeline visits: dated visits OR undated visits placed into timeline
    const timelineVisits = filtered.filter(v => (v.isDated && (v.date || v.startDate)) || v.isPlacedUndated);
    // Unplaced undated visits:
    const unplacedUndatedVisits = filtered.filter(v => !v.isDated && !v.isPlacedUndated);

    if (undatedCountBadge) undatedCountBadge.textContent = unplacedUndatedVisits.length;

    // Chronological sorting (using getVisitTimestamp)
    timelineVisits.sort((a, b) => {
      const tA = getVisitTimestamp(a);
      const tB = getVisitTimestamp(b);
      const cmp = tA - tB;
      return state.logSortOrder === 'desc' ? -cmp : cmp;
    });

    if (timelineVisits.length === 0) {
      timelineContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🗓️</div>
          <p>No dated visits recorded yet.</p>
          <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:1rem;">
            Tip: You can drag undated visits from below directly into this timeline!
          </div>
          <button class="btn btn-primary btn-sm" onclick="document.getElementById('city-search-input').focus()">
            Select a city to log your trip
          </button>
        </div>
      `;
    } else {
      const yearGroups = {};
      timelineVisits.forEach(v => {
        const year = getVisitYear(v);
        if (!yearGroups[year]) yearGroups[year] = [];
        yearGroups[year].push(v);
      });

      const yearKeys = Object.keys(yearGroups).sort((a, b) => {
        return state.logSortOrder === 'desc' ? b.localeCompare(a) : a.localeCompare(b);
      });

      timelineContainer.innerHTML = yearKeys.map(year => {
        const items = yearGroups[year].map(v => renderTimelineCard(v, false)).join('');
        return `
          <div class="timeline-year-group" data-year="${year}">
            <div class="timeline-year-heading">${year} (${yearGroups[year].length})</div>
            <div class="timeline-items">${items}</div>
          </div>
        `;
      }).join('');
    }

    if (undatedContainer) {
      if (unplacedUndatedVisits.length === 0) {
        undatedContainer.innerHTML = `
          <div style="font-size:0.75rem;color:var(--text-muted);padding:0.6rem 0;text-align:center;">
            ${filtered.some(v => v.isPlacedUndated) ? '🎉 All undated visits placed into timeline! Drag here to un-place.' : 'No undated records.'}
          </div>
        `;
      } else {
        undatedContainer.innerHTML = unplacedUndatedVisits.map(v => renderTimelineCard(v, true)).join('');
      }
    }

    setupTimelineDragAndDrop(timelineVisits);
  }

  function renderTimelineCard(v, isUndatedList = false) {
    const prov = provinceByPlate[v.plate] || { plate_str: '??', name: v.cityName };

    let catTag = '';
    let dateLine = '';
    const isDraggable = isUndatedList || v.isPlacedUndated;

    if (v.category === 'lived') {
      catTag = '<span class="category-tag lived">🏠 Lived</span>';
      if (v.livedType === 'duration' || v.durationYears) {
        dateLine = `<span>⏳ Lived here for ${escapeHtml(v.durationYears)}</span>`;
      } else if (v.isStillLiving) {
        dateLine = `<span>📅 Moved in: ${formatDate(v.startDate || v.date)} • <em>Currently Living Here 🏠</em></span>`;
      } else if (v.startDate && v.endDate) {
        dateLine = `<span>📅 ${formatDate(v.startDate)} → ${formatDate(v.endDate)}</span>`;
      } else if (v.startDate || v.date) {
        dateLine = `<span>📅 Moved in: ${formatDate(v.startDate || v.date)}</span>`;
      } else {
        dateLine = '<span>⏳ Undated Residency</span>';
      }
    } else {
      if (v.category === 'visited') catTag = '<span class="category-tag visited">🎨 Visited</span>';
      else if (v.category === 'work') catTag = '<span class="category-tag work">📐 Work</span>';
      else if (v.category === 'passed') catTag = '<span class="category-tag passed">⚬ Passed</span>';

      if (v.isPlacedUndated) {
        dateLine = `<span class="undated-tag-pill">📌 Undated</span> <span style="font-size:0.72rem; color:var(--text-secondary);">(Placed in ~${getVisitYear(v)})</span>`;
      } else if (isUndatedList) {
        dateLine = `<span class="undated-tag-pill">📌 Undated</span> <span style="font-size:0.7rem; color:var(--text-muted);">(Drag to timeline above)</span>`;
      } else {
        const parts = (v.date || '').split('-');
        if (v.datePrecision === 'month' || parts.length === 2) {
          dateLine = `<span>🗓️ ${formatDate(v.date)} <em style="font-size:0.68rem; color:var(--text-muted);">(Month only)</em></span>`;
        } else if (v.datePrecision === 'year' || (parts.length === 1 && parts[0].length === 4)) {
          dateLine = `<span>📆 ${formatDate(v.date)} <em style="font-size:0.68rem; color:var(--text-muted);">(Year only)</em></span>`;
        } else {
          dateLine = `<span>📅 ${formatDate(v.date)}</span>`;
        }
      }
    }

    let extraClass = '';
    if (v.isPlacedUndated) extraClass += ' timeline-card-placed-undated';
    if (isUndatedList) extraClass += ' undated-card-draggable';

    return `
      <div 
        class="timeline-card${extraClass}" 
        data-visit-id="${v.id}"
        ${isDraggable ? 'draggable="true"' : ''}
        onclick="window.focusProvinceOnMap(${v.plate})"
      >
        <div class="timeline-node-dot"></div>
        <div class="timeline-card-header">
          <div class="city-title-group">
            ${isDraggable ? `<span class="drag-handle" title="Drag between timeline visits above">⠿</span>` : ''}
            <span class="plate-badge">${prov.plate_str}</span>
            <span class="city-name">${escapeHtml(prov.name)}</span>
          </div>
          ${catTag}
        </div>
        <div class="timeline-date-row">
          ${dateLine}
        </div>
        ${v.notes ? `<div class="timeline-note">${escapeHtml(v.notes)}</div>` : ''}
        ${v.photo ? `
          <img 
            src="${v.photo}" 
            class="timeline-photo-thumbnail" 
            alt="Photo for ${escapeHtml(prov.name)}" 
            title="Click to view full photo"
            onclick="event.stopPropagation(); window.openPhotoLightbox('${v.id}')"
          />
        ` : ''}
        <div class="timeline-actions" onclick="event.stopPropagation()">
          ${v.isPlacedUndated ? `<button class="btn btn-sm" onclick="event.stopPropagation(); window.unplaceUndatedVisit('${v.id}')" title="Return to Undated list">↩ Move to Undated</button>` : ''}
          ${isUndatedList ? `<button class="btn btn-sm" onclick="event.stopPropagation(); window.promptPlaceUndatedVisit('${v.id}')" title="Place into timeline by year">📌 Place</button>` : ''}
          <button class="btn btn-sm" onclick="window.editVisit('${v.id}')" title="Edit">✏️ Edit</button>
          <button class="btn btn-sm" onclick="window.deleteVisit('${v.id}')" title="Delete">🗑️</button>
        </div>
      </div>
    `;
  }

  // --- Drag & Drop Subsystem for Placing Undated Cards into Timeline ---
  function setupTimelineDragAndDrop(timelineVisits) {
    const timelineContainer = document.getElementById('timeline-container');
    const undatedBox = document.getElementById('undated-section-box');

    // 1. Draggable cards (Undated cards in bottom list + Placed undated cards in timeline)
    document.querySelectorAll('.timeline-card[draggable="true"]').forEach(card => {
      card.addEventListener('dragstart', (e) => {
        const visitId = card.getAttribute('data-visit-id');
        state.draggedVisitId = visitId;
        e.dataTransfer.setData('text/plain', visitId);
        e.dataTransfer.effectAllowed = 'move';
        card.classList.add('is-dragging');
        timelineContainer?.classList.add('timeline-drag-active');
        undatedBox?.classList.add('drop-target-active');
      });

      card.addEventListener('dragend', () => {
        state.draggedVisitId = null;
        card.classList.remove('is-dragging');
        timelineContainer?.classList.remove('timeline-drag-active');
        undatedBox?.classList.remove('drop-target-active');
        document.querySelectorAll('.drop-target-top, .drop-target-bottom').forEach(el => {
          el.classList.remove('drop-target-top', 'drop-target-bottom');
        });
      });
    });

    // 2. Drop target on all timeline cards (allowing dropping between any cards)
    document.querySelectorAll('.timeline-items .timeline-card').forEach(card => {
      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        const rect = card.getBoundingClientRect();
        const isTopHalf = e.clientY < rect.top + rect.height / 2;

        document.querySelectorAll('.drop-target-top, .drop-target-bottom').forEach(el => {
          if (el !== card) el.classList.remove('drop-target-top', 'drop-target-bottom');
        });

        if (isTopHalf) {
          card.classList.add('drop-target-top');
          card.classList.remove('drop-target-bottom');
        } else {
          card.classList.add('drop-target-bottom');
          card.classList.remove('drop-target-top');
        }
      });

      card.addEventListener('dragleave', (e) => {
        if (!card.contains(e.relatedTarget)) {
          card.classList.remove('drop-target-top', 'drop-target-bottom');
        }
      });

      card.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        card.classList.remove('drop-target-top', 'drop-target-bottom');

        const draggedId = e.dataTransfer.getData('text/plain') || state.draggedVisitId;
        const targetId = card.getAttribute('data-visit-id');
        if (!draggedId || draggedId === targetId) return;

        const draggedVisit = state.visits.find(v => v.id === draggedId);
        if (!draggedVisit) return;

        const rect = card.getBoundingClientRect();
        const isTopHalf = e.clientY < rect.top + rect.height / 2;

        handleTimelineDrop(draggedVisit, targetId, isTopHalf, timelineVisits);
      });
    });

    // 3. Drop target on empty timeline container
    if (timelineContainer) {
      timelineContainer.addEventListener('dragover', (e) => {
        if (e.target.closest('.timeline-card')) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      });

      timelineContainer.addEventListener('drop', (e) => {
        if (e.target.closest('.timeline-card')) return;
        e.preventDefault();
        const draggedId = e.dataTransfer.getData('text/plain') || state.draggedVisitId;
        if (!draggedId) return;
        const draggedVisit = state.visits.find(v => v.id === draggedId);
        if (draggedVisit) {
          draggedVisit.isPlacedUndated = true;
          draggedVisit.placedTimestamp = Date.now();
          saveState();
          refreshAll();
          showToast(`📌 Placed ${draggedVisit.cityName} into timeline!`);
        }
      });
    }

    // 4. Drop target on undated-section-box to unplace and return to undated list
    if (undatedBox) {
      undatedBox.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        undatedBox.classList.add('drop-target-hover');
      });

      undatedBox.addEventListener('dragleave', (e) => {
        if (!undatedBox.contains(e.relatedTarget)) {
          undatedBox.classList.remove('drop-target-hover');
        }
      });

      undatedBox.addEventListener('drop', (e) => {
        e.preventDefault();
        undatedBox.classList.remove('drop-target-hover');
        const draggedId = e.dataTransfer.getData('text/plain') || state.draggedVisitId;
        if (!draggedId) return;
        const draggedVisit = state.visits.find(v => v.id === draggedId);
        if (draggedVisit && draggedVisit.isPlacedUndated) {
          draggedVisit.isPlacedUndated = false;
          draggedVisit.placedTimestamp = null;
          saveState();
          refreshAll();
          showToast(`Moved ${draggedVisit.cityName} back to Undated Visits`);
        }
      });
    }
  }

  function handleTimelineDrop(draggedVisit, targetId, isTopHalf, timelineVisits) {
    const targetIdx = timelineVisits.findIndex(v => v.id === targetId);
    if (targetIdx === -1) return;

    const targetVisit = timelineVisits[targetIdx];
    const targetTime = getVisitTimestamp(targetVisit);
    let newTime;
    const isDesc = (state.logSortOrder === 'desc');

    if (isTopHalf) {
      // Dropping above targetVisit
      if (targetIdx === 0) {
        newTime = isDesc ? (targetTime + 86400000 * 30) : (targetTime - 86400000 * 30);
      } else {
        const prevVisit = timelineVisits[targetIdx - 1];
        const prevTime = getVisitTimestamp(prevVisit);
        newTime = (prevTime + targetTime) / 2;
      }
    } else {
      // Dropping below targetVisit
      if (targetIdx === timelineVisits.length - 1) {
        newTime = isDesc ? (targetTime - 86400000 * 30) : (targetTime + 86400000 * 30);
      } else {
        const nextVisit = timelineVisits[targetIdx + 1];
        const nextTime = getVisitTimestamp(nextVisit);
        newTime = (targetTime + nextTime) / 2;
      }
    }

    draggedVisit.isPlacedUndated = true;
    draggedVisit.placedTimestamp = Math.round(newTime);

    saveState();
    refreshAll();
    showToast(`📌 Placed ${draggedVisit.cityName} between timeline visits!`);
  }

  // Quick Action: Return a placed undated visit back to Undated Visits
  window.unplaceUndatedVisit = function (visitId) {
    const visit = state.visits.find(v => v.id === visitId);
    if (!visit) return;
    visit.isPlacedUndated = false;
    visit.placedTimestamp = null;
    saveState();
    refreshAll();
    showToast(`Moved ${visit.cityName} back to Undated Visits`);
  };

  // Quick Action: Place an undated visit into a specific year timeline
  window.promptPlaceUndatedVisit = function (visitId) {
    const visit = state.visits.find(v => v.id === visitId);
    if (!visit) return;
    const defYear = new Date().getFullYear();
    const yearInput = prompt(`Place "${visit.cityName}" into which year's timeline? (e.g. 2022)`, defYear);
    if (!yearInput) return;
    const yr = parseInt(yearInput.trim(), 10);
    if (isNaN(yr) || yr < 1950 || yr > 2099) {
      showToast('Please enter a valid 4-digit year');
      return;
    }
    visit.isPlacedUndated = true;
    visit.placedTimestamp = new Date(yr, 6, 1, 12, 0, 0).getTime();
    saveState();
    refreshAll();
    showToast(`📌 Placed ${visit.cityName} into year ${yr} timeline!`);
  };

  window.focusProvinceOnMap = function (plate) {
    onProvinceClick(plate);
    const prov = provinceByPlate[plate];
    if (prov && prov.svgCenter) {
      centerMapOnPoint(prov.svgCenter[0], prov.svgCenter[1]);
    }
  };

  // --- Statistics & Progress Calculation ---
  function updateStatistics() {
    let livedCount = 0;
    let visitedCount = 0;
    let workCount = 0;
    let passedCount = 0;

    for (let plate = 1; plate <= TOTAL_CITIES; plate++) {
      const cat = getCityCategory(plate);
      if (cat === 'lived') livedCount++;
      else if (cat === 'visited') visitedCount++;
      else if (cat === 'work') workCount++;
      else if (cat === 'passed') passedCount++;
    }

    const totalExplored = livedCount + visitedCount + workCount + passedCount;
    const percentage = ((totalExplored / TOTAL_CITIES) * 100).toFixed(1);

    document.getElementById('stat-total-explored').textContent = `${totalExplored} / ${TOTAL_CITIES}`;
    document.getElementById('stat-percent-explored').textContent = `${percentage}%`;

    const barLived = document.getElementById('bar-lived');
    const barVisited = document.getElementById('bar-visited');
    const barWork = document.getElementById('bar-work');
    const barPassed = document.getElementById('bar-passed');

    if (barLived) barLived.style.width = `${(livedCount / TOTAL_CITIES) * 100}%`;
    if (barVisited) barVisited.style.width = `${(visitedCount / TOTAL_CITIES) * 100}%`;
    if (barWork) barWork.style.width = `${(workCount / TOTAL_CITIES) * 100}%`;
    if (barPassed) barPassed.style.width = `${(passedCount / TOTAL_CITIES) * 100}%`;

    document.getElementById('stat-count-lived').textContent = livedCount;
    document.getElementById('stat-count-visited').textContent = visitedCount;
    document.getElementById('stat-count-work').textContent = workCount;
    document.getElementById('stat-count-passed').textContent = passedCount;

    const dirCount = document.getElementById('tab-dir-count');
    if (dirCount) dirCount.textContent = `${totalExplored}/${TOTAL_CITIES}`;
  }

  // --- All 87 Provinces & KKTC Directory List ---
  function renderProvincesDirectory(query = '') {
    const listEl = document.getElementById('provinces-directory-list');
    if (!listEl || typeof TURKEY_PROVINCES === 'undefined') return;

    const q = query.trim().toLocaleLowerCase('tr');

    const filtered = TURKEY_PROVINCES.filter(p => {
      if (!q) return true;
      return p.name.toLocaleLowerCase('tr').includes(q) ||
             p.plate_str.toLowerCase().includes(q) ||
             (p.country && p.country.toLowerCase().includes(q)) ||
             p.region.toLocaleLowerCase('tr').includes(q);
    });

    listEl.innerHTML = filtered.map(prov => {
      const cat = getCityCategory(prov.plate);
      const visits = state.visits.filter(v => Number(v.plate) === Number(prov.plate));
      const hasPhoto = visits.some(v => v.photo);

      let statusBadge = '<span style="font-size:0.7rem;color:var(--text-muted);">Not Visited</span>';
      if (cat === 'lived') statusBadge = '<span class="category-tag lived">🏠 Lived</span>';
      else if (cat === 'visited') statusBadge = '<span class="category-tag visited">🎨 Visited</span>';
      else if (cat === 'work') statusBadge = '<span class="category-tag work">📐 Work</span>';
      else if (cat === 'passed') statusBadge = '<span class="category-tag passed">⚬ Passed</span>';

      const countryLabel = prov.country ? ` • ${prov.country}` : '';

      return `
        <div class="timeline-card" onclick="window.focusProvinceOnMap(${prov.plate})" style="padding:0.6rem 0.8rem;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div style="display:flex;align-items:center;gap:0.5rem;">
              <span class="plate-badge">${prov.plate_str}</span>
              <div>
                <div style="font-size:0.85rem;font-weight:700;">${prov.name} ${hasPhoto ? '📷' : ''}</div>
                <div style="font-size:0.7rem;color:var(--text-muted);">${prov.region}${countryLabel} • ${visits.length} record(s)</div>
              </div>
            </div>
            ${statusBadge}
          </div>
        </div>
      `;
    }).join('');
  }

  // --- Leaflet Mode Integration ---
  let leafletMap = null;
  let leafletGeoJsonLayer = null;
  let leafletPhotoLayer = null;
  let leafletBaseTileLayer = null;

  function getCartoTileUrl() {
    const tileStyle = state.theme === 'dark' ? 'dark_all' : 'voyager';
    return `https://{s}.basemaps.cartocdn.com/rastertiles/${tileStyle}/{z}/{x}/{y}{r}.png?key=${CARTO_API_KEY}`;
  }

  function initLeafletMap() {
    if (leafletMap || typeof L === 'undefined') return;

    const container = document.getElementById('leaflet-map-wrapper');
    if (!container) return;

    // Centered on Turkey & Northern Cyprus
    leafletMap = L.map('leaflet-map-wrapper', {
      center: [38.2, 35.2],
      zoom: 6,
      minZoom: 5,
      maxZoom: 14
    });

    leafletBaseTileLayer = L.tileLayer(getCartoTileUrl(), {
      attribution: '&copy; <a href="https://openstreetmap.org" target="_blank" rel="noopener">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/" target="_blank" rel="noopener">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(leafletMap);

    leafletPhotoLayer = L.layerGroup().addTo(leafletMap);

    if (typeof TURKEY_GEOJSON !== 'undefined') {
      leafletGeoJsonLayer = L.geoJSON(TURKEY_GEOJSON, {
        style: getLeafletFeatureStyle,
        onEachFeature: (feature, layer) => {
          const plate = feature.properties.number || feature.properties.plate;
          layer.on('click', () => onProvinceClick(plate));
          layer.bindTooltip(`${feature.properties.name} (${feature.properties.plate_str || plate})`, {
            sticky: true,
            className: 'leaflet-custom-tooltip'
          });
        }
      }).addTo(leafletMap);
    }

    updateLeafletPhotoMarkers();
  }

  function updateLeafletPhotoMarkers() {
    if (!leafletPhotoLayer || !leafletMap) return;
    leafletPhotoLayer.clearLayers();

    if (!state.showPhotos) return;

    for (let plate = 1; plate <= TOTAL_CITIES; plate++) {
      const prov = provinceByPlate[plate];
      if (!prov || !prov.center) continue;

      const visitsWithPhoto = state.visits.filter(v => Number(v.plate) === Number(plate) && v.photo);
      if (visitsWithPhoto.length === 0) continue;

      const latestVisit = visitsWithPhoto[visitsWithPhoto.length - 1];

      const photoIcon = L.divIcon({
        className: 'leaflet-photo-marker',
        html: `<div class="leaflet-photo-pin" style="background-image:url('${latestVisit.photo}')"></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker(prov.center, { icon: photoIcon });
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        window.openPhotoLightbox(latestVisit.id);
      });
      leafletPhotoLayer.addLayer(marker);
    }
  }

  function getLeafletFeatureStyle(feature) {
    const plate = feature.properties.number || feature.properties.plate;
    const cat = getCityCategory(plate);
    const settings = getCityColor(plate);
    const isDark = state.theme === 'dark';

    const meshBg = isDark ? (settings.meshBgDark || settings.meshBg) : (settings.meshBgLight || settings.meshBg);
    const stripeBg = isDark ? (settings.stripeBgDark || settings.stripeBg) : (settings.stripeBgLight || settings.stripeBg);
    const dotBg = isDark ? (settings.dotBgDark || settings.dotBg) : (settings.dotBgLight || settings.dotBg);

    if (cat === 'lived') {
      return { fillColor: meshBg || '#4338ca', fillOpacity: 0.85, color: settings.meshColor || '#fbbf24', weight: 2.2, dashArray: '4, 4' };
    } else if (cat === 'visited') {
      return { fillColor: settings.color, fillOpacity: 0.75, color: '#334155', weight: 1.5 };
    } else if (cat === 'work') {
      return { fillColor: stripeBg || '#1e293b', fillOpacity: 0.85, color: settings.stripeColor || '#38bdf8', weight: 2.0, dashArray: '5, 5' };
    } else if (cat === 'passed') {
      return { fillColor: dotBg || '#fffbeb', fillOpacity: 0.85, color: settings.dotColor || '#d97706', weight: 2.0, dashArray: '2, 4' };
    }
    return { fillColor: '#ffffff', fillOpacity: 0.15, color: '#64748b', weight: 1 };
  }

  function refreshLeafletLayers() {
    if (leafletGeoJsonLayer) {
      leafletGeoJsonLayer.setStyle(getLeafletFeatureStyle);
    }
    updateLeafletPhotoMarkers();
  }

  function switchViewMode(mode) {
    state.activeView = mode;
    const vectorWrapper = document.getElementById('vector-map-wrapper');
    const leafletWrapper = document.getElementById('leaflet-map-wrapper');
    const btnVector = document.getElementById('view-vector-btn');
    const btnLeaflet = document.getElementById('view-leaflet-btn');

    if (mode === 'vector') {
      if (vectorWrapper) vectorWrapper.style.display = 'flex';
      if (leafletWrapper) leafletWrapper.style.display = 'none';
      btnVector?.classList.add('active');
      btnLeaflet?.classList.remove('active');
      refreshMapFills();
    } else {
      if (vectorWrapper) vectorWrapper.style.display = 'none';
      if (leafletWrapper) leafletWrapper.style.display = 'block';
      btnVector?.classList.remove('active');
      btnLeaflet?.classList.add('active');

      if (!leafletMap) {
        initLeafletMap();
      } else {
        if (leafletBaseTileLayer) {
          leafletBaseTileLayer.setUrl(getCartoTileUrl());
        }
        leafletMap.invalidateSize();
        refreshLeafletLayers();
      }
    }
  }

  // --- Export Map as High-Res Image (PNG) ---
  function exportMapAsImage() {
    showToast('Rendering high-resolution map image...');
    const svgElement = document.getElementById('turkey-svg-map');
    if (!svgElement) return;

    const clonedSvg = svgElement.cloneNode(true);
    clonedSvg.setAttribute('width', '1600');
    clonedSvg.setAttribute('height', '900');
    clonedSvg.style.transform = 'none';

    const defs = document.getElementById('map-svg-defs');
    if (defs) {
      clonedSvg.insertBefore(defs.cloneNode(true), clonedSvg.firstChild);
    }

    const titleGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    titleGroup.setAttribute('transform', 'translate(40, 50)');
    titleGroup.innerHTML = `
      <rect x="-10" y="-30" width="370" height="75" rx="10" fill="${state.theme === 'dark' ? '#0f172a' : '#ffffff'}" opacity="0.9" stroke="#cbd5e1" stroke-width="1" />
      <text x="0" y="0" font-family="-apple-system, sans-serif" font-size="20" font-weight="bold" fill="${state.theme === 'dark' ? '#f8fafc' : '#0f172a'}">🇹🇷 Turkey &amp; KKTC Travel Map</text>
      <text x="0" y="24" font-family="-apple-system, sans-serif" font-size="12" fill="#64748b">${state.visits.length} records logged • ${document.getElementById('stat-total-explored')?.textContent || ''}</text>
    `;
    clonedSvg.appendChild(titleGroup);

    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(clonedSvg);
    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const URL = window.URL || window.webkitURL || window;
    const blobURL = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = function () {
      const canvas = document.createElement('canvas');
      canvas.width = 1600;
      canvas.height = 900;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = state.theme === 'dark' ? '#0b0f19' : '#f8fafc';
      ctx.fillRect(0, 0, 1600, 900);
      ctx.drawImage(img, 0, 0, 1600, 900);

      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `turkey-travel-map-${new Date().toISOString().split('T')[0]}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(blobURL);
      showToast('Map image downloaded successfully! 📸');
    };
    img.src = blobURL;
  }

  // --- Export / Import JSON Data ---
  function exportDataAsJson() {
    const data = {
      version: 5,
      exportedAt: new Date().toISOString(),
      visits: state.visits,
      citySettings: state.citySettings
    };
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `turkey-travel-log-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Travel data exported to JSON file');
  }

  function importDataFromJson(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const parsed = JSON.parse(e.target.result);
        if (Array.isArray(parsed.visits)) {
          state.visits = parsed.visits;
          if (parsed.citySettings) state.citySettings = parsed.citySettings;
          saveState();
          refreshAll();
          showToast(`Imported ${parsed.visits.length} records successfully!`);
        } else {
          showToast('Invalid file format');
        }
      } catch (err) {
        showToast('Error parsing JSON file');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  // --- Beautiful Offline SVG Sample Photos for Demo Journey ---
  const DEMO_PHOTO_ANTALYA = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#fdba74"/></linearGradient>
        <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0284c7"/><stop offset="100%" stop-color="#0f766e"/></linearGradient>
      </defs>
      <rect width="300" height="130" fill="url(#sky)"/>
      <circle cx="230" cy="80" r="30" fill="#fef08a" opacity="0.9"/>
      <rect y="120" width="300" height="80" fill="url(#sea)"/>
      <path d="M 0 135 Q 80 120 160 135 T 300 130 L 300 200 L 0 200 Z" fill="#047857" opacity="0.3"/>
      <polygon points="0,140 40,90 90,140" fill="#64748b"/>
      <polygon points="50,140 100,75 160,140" fill="#475569"/>
      <text x="15" y="185" fill="#ffffff" font-family="sans-serif" font-size="14" font-weight="bold">Kaş, Antalya 🌊</text>
    </svg>
  `);

  const DEMO_PHOTO_ISTANBUL = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200">
      <defs>
        <linearGradient id="sunset" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f97316"/><stop offset="60%" stop-color="#a855f7"/><stop offset="100%" stop-color="#1e1b4b"/></linearGradient>
      </defs>
      <rect width="300" height="200" fill="url(#sunset)"/>
      <circle cx="150" cy="110" r="28" fill="#fef08a" opacity="0.85"/>
      <path d="M 0 160 Q 150 155 300 160 L 300 200 L 0 200 Z" fill="#0f172a"/>
      <polygon points="135,160 140,80 145,160" fill="#090d16"/>
      <polygon points="160,160 163,95 166,160" fill="#090d16"/>
      <rect x="70" y="125" width="25" height="35" rx="3" fill="#090d16"/>
      <polygon points="65,125 82,100 100,125" fill="#090d16"/>
      <text x="15" y="185" fill="#ffffff" font-family="sans-serif" font-size="14" font-weight="bold">İstanbul Boğazı 🌇</text>
    </svg>
  `);

  const DEMO_PHOTO_CAPPADOCIA = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200">
      <defs>
        <linearGradient id="cappa-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fb923c"/><stop offset="50%" stop-color="#f472b6"/><stop offset="100%" stop-color="#93c5fd"/></linearGradient>
      </defs>
      <rect width="300" height="200" fill="url(#cappa-sky)"/>
      <polygon points="20,200 50,130 80,200" fill="#78350f"/>
      <polygon points="70,200 110,110 150,200" fill="#92400e"/>
      <polygon points="140,200 175,135 210,200" fill="#78350f"/>
      <polygon points="200,200 240,120 280,200" fill="#b45309"/>
      <circle cx="85" cy="55" r="16" fill="#ef4444"/>
      <polygon points="80,68 90,68 85,74" fill="#ef4444"/>
      <circle cx="210" cy="45" r="22" fill="#8b5cf6"/>
      <polygon points="203,63 217,63 210,70" fill="#8b5cf6"/>
      <circle cx="145" cy="75" r="12" fill="#0ea5e9"/>
      <text x="15" y="185" fill="#ffffff" font-family="sans-serif" font-size="14" font-weight="bold">Kapadokya 🎈</text>
    </svg>
  `);

  const DEMO_PHOTO_MUGLA = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200">
      <defs>
        <linearGradient id="lagoon" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#67e8f9"/><stop offset="100%" stop-color="#0891b2"/></linearGradient>
      </defs>
      <rect width="300" height="120" fill="#bae6fd"/>
      <rect y="100" width="300" height="100" fill="url(#lagoon)"/>
      <path d="M 0 100 Q 120 80 180 110 T 300 95 L 300 200 L 0 200 Z" fill="#15803d" opacity="0.4"/>
      <polygon points="20,130 50,110 80,130" fill="#ffffff"/>
      <text x="15" y="185" fill="#ffffff" font-family="sans-serif" font-size="14" font-weight="bold">Ölüdeniz, Muğla ⛵</text>
    </svg>
  `);

  const DEMO_PHOTO_ANTALYA_KALEICI = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200">
      <defs>
        <linearGradient id="kaleici-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#bae6fd"/></linearGradient>
      </defs>
      <rect width="300" height="200" fill="url(#kaleici-sky)"/>
      <rect y="130" width="300" height="70" fill="#fef3c7"/>
      <rect x="30" y="70" width="70" height="90" fill="#b45309" stroke="#78350f" stroke-width="2"/>
      <polygon points="25,70 65,40 105,70" fill="#dc2626"/>
      <rect x="130" y="80" width="85" height="80" fill="#d97706" stroke="#92400e" stroke-width="2"/>
      <polygon points="125,80 172,50 220,80" fill="#991b1b"/>
      <circle cx="250" cy="50" r="22" fill="#fbbf24"/>
      <path d="M 235 150 Q 240 100 255 85 Q 270 100 275 150 Z" fill="#15803d"/>
      <text x="15" y="185" fill="#1e293b" font-family="sans-serif" font-size="14" font-weight="bold">Kaleiçi, Antalya 🏰</text>
    </svg>
  `);

  const DEMO_PHOTO_CAPPADOCIA_VALLEY = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200">
      <defs>
        <linearGradient id="valleysky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#fde68a"/></linearGradient>
      </defs>
      <rect width="300" height="200" fill="url(#valleysky)"/>
      <path d="M 0 140 Q 60 110 120 140 T 240 130 T 300 150 L 300 200 L 0 200 Z" fill="#d97706"/>
      <polygon points="40,200 65,100 90,200" fill="#92400e"/>
      <polygon points="120,200 155,80 190,200" fill="#b45309"/>
      <polygon points="210,200 240,110 270,200" fill="#78350f"/>
      <circle cx="50" cy="50" r="14" fill="#3b82f6"/>
      <circle cx="160" cy="40" r="18" fill="#10b981"/>
      <circle cx="240" cy="60" r="13" fill="#ec4899"/>
      <text x="15" y="185" fill="#ffffff" font-family="sans-serif" font-size="14" font-weight="bold">Love Valley, Göreme 🏞️</text>
    </svg>
  `);

  const DEMO_PHOTO_ISTANBUL_BOSPHORUS = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200">
      <defs>
        <linearGradient id="bosphorus-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0284c7"/><stop offset="70%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#bae6fd"/></linearGradient>
        <linearGradient id="water" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0369a1"/><stop offset="100%" stop-color="#0c4a6e"/></linearGradient>
      </defs>
      <rect width="300" height="120" fill="url(#bosphorus-sky)"/>
      <rect y="120" width="300" height="80" fill="url(#water)"/>
      <path d="M 0 115 L 300 115" stroke="#ffffff" stroke-width="3"/>
      <path d="M 50 115 L 50 65 L 250 65 L 250 115" stroke="#ef4444" stroke-width="4" fill="none"/>
      <path d="M 50 65 Q 150 110 250 65" stroke="#ef4444" stroke-width="2.5" fill="none"/>
      <polygon points="120,135 150,118 180,135" fill="#ffffff"/>
      <text x="15" y="185" fill="#ffffff" font-family="sans-serif" font-size="14" font-weight="bold">15 Temmuz Köprüsü 🌉</text>
    </svg>
  `);

  // --- Preload Sample / Demo Journey ---
  function loadSampleJourney() {
    if (state.visits.length > 0 && !confirm('Loading sample journey will replace current visits. Proceed?')) {
      return;
    }

    state.citySettings[7] = { ...getCityColor(7), photoStyle: 'polaroid' };
    state.citySettings[50] = { ...getCityColor(50), photoStyle: 'fill' };
    state.citySettings[34] = { ...getCityColor(34), photoStyle: 'circle' };

    state.visits = [
      {
        id: 'sample_lived_ankara',
        plate: 6,
        cityName: 'Ankara',
        category: 'lived',
        isDated: true,
        date: '2018-09-01',
        livedType: 'range',
        startDate: '2018-09-01',
        endDate: '2022-06-30',
        isStillLiving: false,
        durationYears: '4 years',
        notes: 'Lived in Ankara for 4 years during university studies. Rented a flat in Bahçelievler and spent evenings at Kuğulu Park.',
        photo: null,
        createdAt: Date.now() - 6000000
      },
      {
        id: 'sample_1',
        plate: 34,
        cityName: 'İstanbul',
        category: 'work',
        isDated: true,
        date: '2023-04-12',
        notes: 'Attended the Global Tech Summit in Maslak. Walked around Galata Bridge at sunset and had tea by the Bosphorus.',
        photo: DEMO_PHOTO_ISTANBUL,
        photoStyle: 'circle',
        createdAt: Date.now() - 5000000
      },
      {
        id: 'sample_1_b',
        plate: 34,
        cityName: 'İstanbul',
        category: 'visited',
        isDated: true,
        date: '2024-03-22',
        notes: 'Bosphorus ferry cruise from Eminönü to Anadolu Kavağı on a sunny spring afternoon. Beautiful view of the bridge!',
        photo: DEMO_PHOTO_ISTANBUL_BOSPHORUS,
        photoStyle: 'circle',
        createdAt: Date.now() - 4800000
      },
      {
        id: 'sample_2',
        plate: 7,
        cityName: 'Antalya',
        category: 'visited',
        isDated: true,
        date: '2023-07-20',
        notes: 'Incredible summer holiday at Kaş. Did a full-day boat tour around Kekova sunken city.',
        photo: DEMO_PHOTO_ANTALYA,
        photoStyle: 'polaroid',
        polaroidNote: 'Kaş Sunken City ☀️',
        createdAt: Date.now() - 4000000
      },
      {
        id: 'sample_2_b',
        plate: 7,
        cityName: 'Antalya',
        category: 'visited',
        isDated: true,
        date: '2024-05-18',
        notes: 'Weekend walking around Hadrian Gate, historic cobblestone streets of Kaleiçi, and the old Roman marina.',
        photo: DEMO_PHOTO_ANTALYA_KALEICI,
        photoStyle: 'polaroid',
        polaroidNote: 'Kaleiçi Old Town ⛵',
        createdAt: Date.now() - 3800000
      },
      {
        id: 'sample_kktc_girne',
        plate: 84,
        cityName: 'Girne',
        category: 'visited',
        isDated: true,
        date: '2023-10-18',
        notes: 'Fabulous trip across Northern Cyprus. Explored Girne Castle, Bellapais Abbey, and tasted authentic hellim cheese.',
        photo: null,
        createdAt: Date.now() - 3500000
      },
      {
        id: 'sample_3',
        plate: 14,
        cityName: 'Bolu',
        category: 'passed',
        isDated: true,
        date: '2023-04-14',
        notes: 'Drove through the scenic Bolu Mountain Highway on route to Ankara. Stopped briefly for highway köfte.',
        photo: null,
        createdAt: Date.now() - 3000000
      },
      {
        id: 'sample_5',
        plate: 35,
        cityName: 'İzmir',
        category: 'visited',
        isDated: true,
        date: '2022',
        datePrecision: 'year',
        notes: 'Sunset walk at Kordon Alsancak followed by delicious boyoz for breakfast. Took a weekend trip to vineyards in Urla. (Logged with Year-only precision)',
        photo: null,
        createdAt: Date.now() - 2000000
      },
      {
        id: 'sample_6',
        plate: 48,
        cityName: 'Muğla',
        category: 'visited',
        isDated: true,
        date: '2022-06',
        datePrecision: 'month',
        notes: 'Sailing along Göcek bays and relaxing at Ölüdeniz blue lagoon. The turquoise waters were unforgettable. (Logged with Month & Year precision)',
        photo: DEMO_PHOTO_MUGLA,
        createdAt: Date.now() - 1500000
      },
      {
        id: 'sample_7',
        plate: 50,
        cityName: 'Nevşehir',
        category: 'visited',
        isDated: true,
        date: '2021-10-02',
        datePrecision: 'day',
        notes: 'Sunrise hot air balloon ride soaring over the fairy chimneys of Göreme. Stayed in an authentic cave hotel.',
        photo: DEMO_PHOTO_CAPPADOCIA,
        photoStyle: 'fill',
        fillPanX: 0,
        fillPanY: -10,
        fillScale: 1.1,
        fillRotate: 0,
        createdAt: Date.now() - 1000000
      },
      {
        id: 'sample_7_b',
        plate: 50,
        cityName: 'Nevşehir',
        category: 'visited',
        isDated: true,
        date: '2023-09-14',
        datePrecision: 'day',
        notes: 'Hiking through Love Valley at twilight. The rock formations illuminated in golden hour light were spectacular.',
        photo: DEMO_PHOTO_CAPPADOCIA_VALLEY,
        photoStyle: 'fill',
        fillPanX: 5,
        fillPanY: 5,
        fillScale: 1.05,
        fillRotate: 0,
        createdAt: Date.now() - 900000
      },
      {
        id: 'sample_8',
        plate: 1,
        cityName: 'Adana',
        category: 'passed',
        isDated: true,
        date: '2021-10-06',
        datePrecision: 'day',
        notes: 'Airport transfer connection layover on flight back. Managed to grab an authentic Adana kebab near the terminal.',
        photo: null,
        createdAt: Date.now() - 800000
      },
      {
        id: 'sample_9',
        plate: 61,
        cityName: 'Trabzon',
        category: 'work',
        isDated: false,
        date: null,
        datePrecision: 'undated',
        isPlacedUndated: true,
        placedTimestamp: new Date(2021, 9, 4, 12, 0).getTime(),
        notes: 'Regional consulting engagement across the Black Sea coast. Visited Sümela Monastery. (Undated trip placed into 2021 timeline)',
        photo: null,
        createdAt: Date.now() - 600000
      },
      {
        id: 'sample_10',
        plate: 16,
        cityName: 'Bursa',
        category: 'visited',
        isDated: false,
        date: null,
        datePrecision: 'undated',
        isPlacedUndated: false,
        notes: 'Winter ski trip to Uludağ mountain with family and enjoyed authentic İskender kebab. (Undated visit: drag me into the timeline above!)',
        photo: null,
        createdAt: Date.now() - 400000
      }
    ];

    saveState();
    refreshAll();
    showToast('Loaded demo journey with Turkey & Northern Cyprus! 🇹🇷');
  }

  // --- Reset All Data ---
  function resetAllData() {
    if (confirm('Are you sure you want to reset all your visits? This cannot be undone.')) {
      state.visits = [];
      state.citySettings = {};
      state.currentPhotoData = null;
      saveState();
      refreshAll();
      showToast('All visit records reset.');
    }
  }

  // --- Utility Functions ---
  function formatDate(isoStr) {
    if (!isoStr) return 'Undated';
    const parts = isoStr.split('-');
    if (parts.length === 3) {
      // YYYY-MM-DD
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } else if (parts.length === 2) {
      // YYYY-MM (Month only)
      const d = new Date(parts[0], parts[1] - 1, 1);
      return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    } else if (parts.length === 1 && parts[0].length === 4) {
      // YYYY (Year only)
      return parts[0];
    }
    return isoStr;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function showToast(message) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.2s ease';
      setTimeout(() => toast.remove(), 200);
    }, 2800);
  }

  function refreshAll() {
    refreshMapFills();
    renderTimelineLog();
    updateStatistics();
    renderProvincesDirectory(document.getElementById('directory-search-input')?.value || '');
  }

  // --- Collapsible Sidebar Subsystem ---
  function toggleSidebar(collapsed = null) {
    const isCollapsed = collapsed !== null ? collapsed : !state.sidebarCollapsed;
    state.sidebarCollapsed = isCollapsed;

    const container = document.querySelector('.app-container');
    const expandBtn = document.getElementById('sidebar-expand-btn');

    if (isCollapsed) {
      container?.classList.add('sidebar-collapsed');
      if (expandBtn) expandBtn.style.display = 'flex';
    } else {
      container?.classList.remove('sidebar-collapsed');
      if (expandBtn) expandBtn.style.display = 'none';
    }

    const expandLogCount = document.getElementById('expand-log-count');
    if (expandLogCount) expandLogCount.textContent = state.visits.length;

    try {
      localStorage.setItem('turkey_travel_map_sidebar_collapsed', JSON.stringify(isCollapsed));
    } catch (e) {}

    // Invalidate Leaflet map size after CSS transition completes
    setTimeout(() => {
      if (state.activeView === 'leaflet' && leafletMap) {
        leafletMap.invalidateSize();
      }
    }, 320);
  }

  // --- Event Bindings & Init ---
  function setupUIEventHandlers() {
    // Sidebar collapse and expand buttons
    document.getElementById('sidebar-collapse-btn')?.addEventListener('click', () => {
      toggleSidebar(true);
      showToast('Sidebar minimized to right ⇥');
    });

    document.getElementById('sidebar-expand-btn')?.addEventListener('click', () => {
      toggleSidebar(false);
      showToast('Sidebar restored ⇤');
    });

    // Keyboard shortcut (Ctrl+B or [ or ] to toggle sidebar)
    document.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      } else if (e.key === '[' || e.key === ']') {
        toggleSidebar();
      }
    });

    // Restore saved sidebar collapsed state
    if (state.sidebarCollapsed) {
      toggleSidebar(true);
    }

    // Theme toggle
    document.getElementById('theme-toggle-btn')?.addEventListener('click', () => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', state.theme);
      document.getElementById('theme-toggle-btn').innerHTML = state.theme === 'dark' ? '☀️' : '🌙';
      saveState();
      refreshMapFills();
      if (leafletBaseTileLayer && leafletMap) {
        leafletBaseTileLayer.setUrl(getCartoTileUrl());
      }
      if (state.selectedPlate) {
        updateDrawerColorPickers(state.selectedPlate, getCityColor(state.selectedPlate));
      }
    });

    // View switcher (Vector vs Leaflet)
    document.getElementById('view-vector-btn')?.addEventListener('click', () => switchViewMode('vector'));
    document.getElementById('view-leaflet-btn')?.addEventListener('click', () => switchViewMode('leaflet'));

    // Label toggle
    document.getElementById('toggle-labels-btn')?.addEventListener('click', () => {
      state.showLabels = !state.showLabels;
      document.getElementById('toggle-labels-btn').classList.toggle('active', state.showLabels);
      saveState();
      refreshMapFills();
    });

    // Photo toggle on map
    const togglePhotosBtn = document.getElementById('toggle-photos-btn');
    togglePhotosBtn?.addEventListener('click', () => {
      state.showPhotos = !state.showPhotos;
      togglePhotosBtn.classList.toggle('active', state.showPhotos);
      saveState();
      renderMapPhotos();
      showToast(state.showPhotos ? 'City photos enabled on map 📷' : 'City photos hidden from map');
    });

    // Geolocation button
    document.getElementById('locate-user-btn')?.addEventListener('click', locateUser);

    // Home view reset buttons
    document.getElementById('home-view-btn')?.addEventListener('click', resetHomeView);

    // Quick search city input in map toolbar
    const searchInput = document.getElementById('city-search-input');
    if (searchInput) {
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const val = searchInput.value.trim().toLocaleLowerCase('tr');
          if (!val) return;
          const match = TURKEY_PROVINCES.find(p =>
            p.name.toLocaleLowerCase('tr').includes(val) ||
            p.plate_str.toLowerCase() === val ||
            p.plate.toString() === val
          );
          if (match) {
            window.focusProvinceOnMap(match.plate);
            searchInput.value = '';
          } else {
            showToast('City or province not found');
          }
        }
      });
    }

    // Sidebar tab buttons
    document.querySelectorAll('.sidebar-tabs .tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.sidebar-tabs .tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        const targetTab = btn.getAttribute('data-tab');
        document.getElementById(`tab-panel-${targetTab}`)?.classList.add('active');
      });
    });

    // Category options in drawer
    document.querySelectorAll('.category-option-card').forEach(card => {
      card.addEventListener('click', () => {
        const cat = card.getAttribute('data-cat');
        selectCategoryOption(cat);
      });
    });

    // Residency mode switcher in drawer (Moved in & Left vs Lived for X years)
    document.getElementById('res-mode-range-btn')?.addEventListener('click', () => setResidencyMode('range'));
    document.getElementById('res-mode-duration-btn')?.addEventListener('click', () => setResidencyMode('duration'));

    // "Still live here" checkbox toggle
    document.getElementById('lived-still-here-check')?.addEventListener('change', (e) => {
      const movedOutWrapper = document.getElementById('lived-moved-out-wrapper');
      const movedOutInput = document.getElementById('lived-moved-out');
      if (movedOutWrapper) {
        movedOutWrapper.style.opacity = e.target.checked ? '0.4' : '1';
        movedOutWrapper.style.pointerEvents = e.target.checked ? 'none' : 'auto';
      }
      if (movedOutInput) {
        movedOutInput.disabled = e.target.checked;
        if (e.target.checked) movedOutInput.value = '';
      }
    });

    // Date precision selector buttons in drawer
    document.querySelectorAll('.precision-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const prec = btn.getAttribute('data-precision');
        if (prec) selectDatePrecision(prec);
      });
    });

    // "This Year" button helper in year-only mode
    document.getElementById('btn-set-current-year')?.addEventListener('click', () => {
      const yearOnlyInput = document.getElementById('visit-year-only-input');
      if (yearOnlyInput) yearOnlyInput.value = new Date().getFullYear();
    });

    // Re-roll color button in drawer & swatch click
    document.getElementById('reroll-color-btn')?.addEventListener('click', () => {
      if (state.selectedPlate) reRollCityColors(state.selectedPlate);
    });
    document.getElementById('drawer-color-swatch')?.addEventListener('click', () => {
      if (state.selectedPlate) reRollCityColors(state.selectedPlate);
    });

    // Photo file input handler
    const photoFileInput = document.getElementById('visit-photo-file');
    const photoPrompt = document.getElementById('photo-upload-prompt');
    const photoPreviewBox = document.getElementById('photo-preview-box');
    const photoPreviewImg = document.getElementById('photo-preview-img');
    const photoStyleSelector = document.getElementById('photo-style-selector-group');

    photoPrompt?.addEventListener('click', () => photoFileInput?.click());
    document.getElementById('change-photo-btn')?.addEventListener('click', () => photoFileInput?.click());

    photoFileInput?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        showToast('Compressing photo...');
        const compressedBase64 = await compressImageFile(file, 550, 0.82);
        state.currentPhotoData = compressedBase64;
        photoPreviewImg.src = compressedBase64;
        photoPreviewBox.style.display = 'flex';
        photoPrompt.style.display = 'none';
        if (photoStyleSelector) photoStyleSelector.style.display = 'block';
        setDrawerPhotoStyle(state.selectedPhotoStyle || 'circle');
        showToast('Photo attached! Choose display style below');
      } catch (err) {
        console.error(err);
        showToast('Failed to process photo');
      }
    });

    // Remove photo button
    document.getElementById('remove-photo-btn')?.addEventListener('click', () => {
      state.currentPhotoData = null;
      if (photoFileInput) photoFileInput.value = '';
      photoPreviewBox.style.display = 'none';
      photoPrompt.style.display = 'flex';
      photoPreviewImg.src = '';
      if (photoStyleSelector) photoStyleSelector.style.display = 'none';
      showToast('Photo removed');
    });

    // Photo style option cards in drawer
    document.querySelectorAll('.photo-style-option').forEach(opt => {
      opt.addEventListener('click', () => {
        const style = opt.getAttribute('data-style');
        if (style) setDrawerPhotoStyle(style);
      });
    });

    // Save visit button in drawer
    document.getElementById('save-visit-btn')?.addEventListener('click', saveCurrentVisit);

    // Close drawer buttons
    document.getElementById('close-drawer-btn')?.addEventListener('click', closeCityDrawer);
    document.getElementById('city-drawer-backdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'city-drawer-backdrop') closeCityDrawer();
    });

    // Clear city visits button in drawer
    document.getElementById('clear-city-visits-btn')?.addEventListener('click', () => {
      if (state.selectedPlate) clearCityVisits(state.selectedPlate);
    });

    // Lightbox modal close
    document.getElementById('close-lightbox-btn')?.addEventListener('click', closePhotoLightbox);
    document.getElementById('photo-lightbox-backdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'photo-lightbox-backdrop') closePhotoLightbox();
    });

    // Timeline Log controls (sort & filter)
    document.getElementById('log-sort-btn')?.addEventListener('click', () => {
      state.logSortOrder = state.logSortOrder === 'desc' ? 'asc' : 'desc';
      document.getElementById('log-sort-btn').textContent = state.logSortOrder === 'desc' ? '⬇️ Newest' : '⬆️ Oldest';
      renderTimelineLog();
    });

    document.getElementById('log-filter-select')?.addEventListener('change', (e) => {
      state.logFilter = e.target.value;
      renderTimelineLog();
    });

    // Directory search input
    document.getElementById('directory-search-input')?.addEventListener('input', (e) => {
      renderProvincesDirectory(e.target.value);
    });

    // Export & Action buttons
    document.getElementById('export-image-btn')?.addEventListener('click', exportMapAsImage);
    document.getElementById('export-json-btn')?.addEventListener('click', exportDataAsJson);
    document.getElementById('import-json-btn')?.addEventListener('click', () => {
      document.getElementById('import-file-input')?.click();
    });
    document.getElementById('import-file-input')?.addEventListener('change', importDataFromJson);
    document.getElementById('load-sample-btn')?.addEventListener('click', loadSampleJourney);
    document.getElementById('reset-all-btn')?.addEventListener('click', resetAllData);

    // Collapsible map legend
    document.getElementById('legend-toggle-btn')?.addEventListener('click', () => {
      const card = document.getElementById('map-legend-card');
      const icon = document.getElementById('legend-toggle-icon');
      if (card) {
        const isCollapsed = card.classList.toggle('collapsed');
        if (icon) icon.textContent = isCollapsed ? '▸' : '▾';
      }
    });

    // Escape key closes modal & lightbox
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closePhotoLightbox();
        closeCityDrawer();
      }
    });

    // Initialize photo fill framing adjuster drag and slider events
    initFillAdjusterEvents();
  }

  // --- Initial Launch ---
  window.addEventListener('DOMContentLoaded', () => {
    loadState();
    initVectorMap();
    setupUIEventHandlers();
    startPhotoRoaster();
    refreshAll();
  });

})();
