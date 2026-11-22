# Data Model & Schema Specification - Turkey Travel Map

## 1. Core Data Structures

All data persists locally in the browser under the `localStorage` key:
`turkey_travel_map_data_v1`

---

## 2. Visit Record (`Visit`)

Represents a single logged journey, visit, or residency for a province.

```typescript
interface Visit {
  id: string;               // Unique ID, e.g. "v_1716001234_abc8"
  plate: number;            // License plate or district index (1 through 87: 1..81 Turkey, 82..87 KKTC)
  cityName: string;         // Standard Turkish province or KKTC district name, e.g. "Antalya", "Girne"
  category: "lived" | "visited" | "work" | "passed"; // Category type
  isDated: boolean;         // true if a specific date, month, or year was chosen; false if undated
  date: string | null;      // "YYYY-MM-DD" (day), "YYYY-MM" (month), "YYYY" (year), or null (undated)
  datePrecision?: "day" | "month" | "year" | "undated"; // Date rounding precision level

  // Timeline Placement (for undated visits placed into chronological view)
  isPlacedUndated?: boolean; // true if an undated card was dragged & positioned in the timeline
  placedTimestamp?: number | null; // Interpolated chronological timestamp (epoch ms)

  // Residency Fields (Specific to category: "lived")
  livedType?: "range" | "duration" | null; // Mode used to record the residency
  startDate?: string | null;               // Date moved in (ISO "YYYY-MM-DD")
  endDate?: string | null;                 // Date moved out / left (null if still living there)
  isStillLiving?: boolean;                 // true if the user currently still lives in this city
  durationYears?: string | null;           // Text duration, e.g. "4 years", "18 months"
  
  notes: string;            // Multi-line trip notes, stories, transport route
  photo: string | null;     // Compressed Base64 JPEG data URL or null
  photoStyle?: "circle" | "polaroid" | "fill"; // Display style when photo is shown on map
  createdAt: number;        // Timestamp (milliseconds since epoch)
}
```

### Category Definitions & Precedence
When multiple records exist for a single province, map visualization follows this priority:
$$\text{lived} \succ \text{visited} \succ \text{work} \succ \text{passed}$$

- `"lived"`: Home city, university stay, or extended residency. Triggers royal purple & gold diamond mesh.
- `"visited"`: Leisure trip, holiday, or full visit. Triggers solid random vibrant coloring.
- `"work"`: Professional trip, conference, corporate meeting. Triggers striped diagonal hatching.
- `"passed"`: Transit travel (highway drive, train transit, airport connection). Triggers polka-dot pattern.

---

## 3. City Visual Settings (`CitySettings`)

Overrides and custom color choices configured for individual provinces.

```typescript
interface CitySettings {
  color?: string;           // Hex or HSL color for 'visited' status (e.g. "#10b981")
  stripeColor?: string;     // Color for work diagonal stripes (default: "#38bdf8")
  stripeBg?: string;        // Background fill for striped pattern
  dotColor?: string;        // Color for passed-through dots (default: "#10b981")
  dotBg?: string;           // Background fill for dotted pattern
  photoStyle?: "circle" | "polaroid" | "fill"; // Preferred photo display style for this province
}
```

### Photo Display Styles (`photoStyle`)
When photos are toggled ON (`showPhotos: true`), each city with photos renders in one of three styles:
1. `"circle"`: Floating circular center pin ($r=16\text{px}$) with camera badge. Earlier visits render as smaller satellite bubbles ($r=10\text{px}$) clustered around the pin.
2. `"polaroid"`: Realistic white-bordered snapshot card with bottom chin, red push pin, and drop shadow. Earlier visits render as tilted background layers ($-16^\circ, +18^\circ, -10^\circ$).
3. `"fill"`: Province boundary polygon filled with the photo via `<pattern id="pattern-photo-fill-{plate}">`. When multiple photos exist, an automated rotating roaster interval cycles photos every 3.2s with a live counter badge (`🔄 1/2`).

---

## 4. Province & District Metadata (`TurkeyProvince`)

Embedded statically in `turkey-data.js` for all 87 provinces and administrative districts (81 Turkey + 6 KKTC).

```typescript
interface TurkeyProvince {
  plate: number;            // Integer plate / ID: 1 .. 87 (1..81 Turkey, 82..87 KKTC)
  plate_str: string;        // String: "01" .. "81" or "KKTC-01" .. "KKTC-06"
  name: string;             // Name, e.g. "İstanbul", "Girne"
  region: string;           // Region: "Marmara", "Ege", "Akdeniz", "İç Anadolu", "Karadeniz", "Doğu Anadolu", "Güneydoğu Anadolu", "Kuzey Kıbrıs"
  country?: string;         // Country tag: "Türkiye" | "KKTC"
  center: [number, number]; // [Latitude, Longitude] centroid for Leaflet map & tooltips
  svgCenter: [number, number]; // [X, Y] pre-projected coordinates in 1000x500 SVG space
  svgPath: string;          // SVG <path d="..."> vector definition
}
```

---

## 5. Map Projection Configuration (`MAP_PROJECTION_CONFIG`)

Pre-configured boundary constants ensuring seamless alignment across Turkey and Northern Cyprus:

```typescript
const MAP_PROJECTION_CONFIG = {
  minLon: 25.5,
  maxLon: 44.9,
  minLat: 34.8,     // Extended south to encompass Northern Cyprus
  maxLat: 42.3,
  viewWidth: 1000,
  viewHeight: 500,
  padX: 25,
  padY: 25
};
```

---

## 6. Backup / Export Schema (`ExportPayload`)

When users click **`Backup`** (JSON export), the file generated follows Schema Version 3:

```json
{
  "version": 3,
  "exportedAt": "2026-11-21T10:00:00.000Z",
  "visits": [
    {
      "id": "v_1716001234_abc8",
      "plate": 6,
      "cityName": "Ankara",
      "category": "lived",
      "isDated": true,
      "date": "2018-09-01",
      "livedType": "range",
      "startDate": "2018-09-01",
      "endDate": "2022-06-30",
      "isStillLiving": false,
      "durationYears": "4 years",
      "notes": "Lived in Ankara for university...",
      "photo": null,
      "createdAt": 1716001234000
    }
  ],
  "citySettings": {
    "6": {
      "color": "#3b82f6"
    }
  }
}
```
