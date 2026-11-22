import json, math

# Load Turkey GeoJSON
with open('turkey-provinces.json', 'r', encoding='utf-8') as f:
    turkey_geo = json.load(f)

# Load KKTC GeoJSON
with open('kktc_districts_raw.json', 'r', encoding='utf-8') as f:
    kktc_raw = json.load(f)

OFFICIAL_TURKEY_NAMES = {
    1: 'Adana', 2: 'Adıyaman', 3: 'Afyonkarahisar', 4: 'Ağrı', 5: 'Amasya',
    6: 'Ankara', 7: 'Antalya', 8: 'Artvin', 9: 'Aydın', 10: 'Balıkesir',
    11: 'Bilecik', 12: 'Bingöl', 13: 'Bitlis', 14: 'Bolu', 15: 'Burdur',
    16: 'Bursa', 17: 'Çanakkale', 18: 'Çankırı', 19: 'Çorum', 20: 'Denizli',
    21: 'Diyarbakır', 22: 'Edirne', 23: 'Elazığ', 24: 'Erzincan', 25: 'Erzurum',
    26: 'Eskişehir', 27: 'Gaziantep', 28: 'Giresun', 29: 'Gümüşhane', 30: 'Hakkâri',
    31: 'Hatay', 32: 'Isparta', 33: 'Mersin', 34: 'İstanbul', 35: 'İzmir',
    36: 'Kars', 37: 'Kastamonu', 38: 'Kayseri', 39: 'Kırklareli', 40: 'Kırşehir',
    41: 'Kocaeli', 42: 'Konya', 43: 'Kütahya', 44: 'Malatya', 45: 'Manisa',
    46: 'Kahramanmaraş', 47: 'Mardin', 48: 'Muğla', 49: 'Muş', 50: 'Nevşehir',
    51: 'Niğde', 52: 'Ordu', 53: 'Rize', 54: 'Sakarya', 55: 'Samsun',
    56: 'Siirt', 57: 'Sinop', 58: 'Sivas', 59: 'Tekirdağ', 60: 'Tokat',
    61: 'Trabzon', 62: 'Tunceli', 63: 'Şanlıurfa', 64: 'Uşak', 65: 'Van',
    66: 'Yozgat', 67: 'Zonguldak', 68: 'Aksaray', 69: 'Bayburt', 70: 'Karaman',
    71: 'Kırıkkale', 72: 'Batman', 73: 'Şırnak', 74: 'Bartın', 75: 'Ardahan',
    76: 'Iğdır', 77: 'Yalova', 78: 'Karabük', 79: 'Kilis', 80: 'Osmaniye',
    81: 'Düzce'
}

REGIONS = {
    'Marmara': [10, 11, 16, 17, 22, 34, 39, 41, 54, 59, 77],
    'Ege': [3, 9, 20, 35, 43, 45, 48, 64],
    'Akdeniz': [1, 7, 15, 31, 32, 33, 80],
    'İç Anadolu': [6, 18, 26, 38, 40, 42, 50, 51, 58, 66, 68, 70, 71],
    'Karadeniz': [5, 8, 14, 19, 28, 29, 37, 52, 53, 55, 57, 60, 61, 67, 69, 74, 78, 81],
    'Doğu Anadolu': [4, 12, 13, 23, 24, 25, 30, 36, 44, 49, 62, 65, 75, 76],
    'Güneydoğu Anadolu': [2, 21, 27, 46, 47, 56, 63, 72, 73, 79]
}

plate_to_region = {}
for reg, plate_list in REGIONS.items():
    for p in plate_list:
        plate_to_region[p] = reg

KKTC_DISTRICTS = [
    (82, 'KKTC-01', 'Lefkoşa'),
    (83, 'KKTC-02', 'Gazimağusa'),
    (84, 'KKTC-03', 'Girne'),
    (85, 'KKTC-04', 'Güzelyurt'),
    (86, 'KKTC-05', 'İskele'),
    (87, 'KKTC-06', 'Lefke')
]

# Projection Bounds: encompassing Turkey and Northern Cyprus
# Turkey: lon 25.66 to 44.83, lat 35.81 to 42.11
# Cyprus: lon 32.25 to 34.60, lat 35.05 to 35.70
min_lon, max_lon = 25.5, 44.9
min_lat, max_lat = 34.8, 42.3

def lat_to_y(lat):
    r = lat * math.pi / 180.0
    return math.log(math.tan(math.pi / 4.0 + r / 2.0))

min_y = lat_to_y(min_lat)
max_y = lat_to_y(max_lat)

W = 1000
H = 500
PAD_X = 25
PAD_Y = 25

def project_pt(pt):
    lon, lat = pt[0], pt[1]
    x = PAD_X + ((lon - min_lon) / (max_lon - min_lon)) * (W - 2 * PAD_X)
    y = H - PAD_Y - ((lat_to_y(lat) - min_y) / (max_y - min_y)) * (H - 2 * PAD_Y)
    return round(x, 1), round(y, 1)

def ring_to_path(ring):
    pts = [project_pt(p) for p in ring]
    return 'M' + 'L'.join(f'{x},{y}' for x, y in pts) + 'Z'

def extract_coords(c, out):
    if isinstance(c[0], (int, float)):
        out.append(c)
    else:
        for sub in c:
            extract_coords(sub, out)

processed_features = []
province_dict = {}

# Process Turkey 81 provinces
for f in turkey_geo['features']:
    plate = f['properties']['number']
    official_name = OFFICIAL_TURKEY_NAMES.get(plate, f['properties']['name'])
    f['properties']['name'] = official_name
    f['properties']['plate'] = plate
    f['properties']['plate_str'] = f'{plate:02d}'
    f['properties']['region'] = plate_to_region.get(plate, 'Diğer')
    f['properties']['country'] = 'Türkiye'
    
    pts = []
    extract_coords(f['geometry']['coordinates'], pts)
    if pts:
        avg_lon = sum(p[0] for p in pts) / len(pts)
        avg_lat = sum(p[1] for p in pts) / len(pts)
        f['properties']['center'] = [round(avg_lat, 4), round(avg_lon, 4)]
        sx, sy = project_pt([avg_lon, avg_lat])
        f['properties']['svgCenter'] = [sx, sy]
    
    geom = f['geometry']
    d_parts = []
    if geom['type'] == 'Polygon':
        for ring in geom['coordinates']:
            d_parts.append(ring_to_path(ring))
    elif geom['type'] == 'MultiPolygon':
        for poly in geom['coordinates']:
            for ring in poly:
                d_parts.append(ring_to_path(ring))
    
    f['properties']['svgPath'] = ' '.join(d_parts)
    processed_features.append(f)
    province_dict[plate] = {
        'plate': plate,
        'plate_str': f['properties']['plate_str'],
        'name': official_name,
        'region': f['properties']['region'],
        'country': 'Türkiye',
        'center': f['properties']['center'],
        'svgCenter': f['properties']['svgCenter'],
        'svgPath': f['properties']['svgPath']
    }

# Process KKTC 6 districts
for plate, plate_str, name in KKTC_DISTRICTS:
    raw_feature = kktc_raw.get(name)
    if not raw_feature:
        print(f"Warning: missing raw feature for {name}")
        continue
    
    geom = raw_feature['geometry']
    pts = []
    extract_coords(geom['coordinates'], pts)
    center = [35.2, 33.3]
    svg_center = [500, 440]
    if pts:
        avg_lon = sum(p[0] for p in pts) / len(pts)
        avg_lat = sum(p[1] for p in pts) / len(pts)
        center = [round(avg_lat, 4), round(avg_lon, 4)]
        sx, sy = project_pt([avg_lon, avg_lat])
        svg_center = [sx, sy]
    
    d_parts = []
    if geom['type'] == 'Polygon':
        for ring in geom['coordinates']:
            d_parts.append(ring_to_path(ring))
    elif geom['type'] == 'MultiPolygon':
        for poly in geom['coordinates']:
            for ring in poly:
                d_parts.append(ring_to_path(ring))
    
    svg_path = ' '.join(d_parts)
    
    feature_obj = {
        'type': 'Feature',
        'properties': {
            'number': plate,
            'plate': plate,
            'plate_str': plate_str,
            'name': name,
            'region': 'Kuzey Kıbrıs',
            'country': 'KKTC',
            'center': center,
            'svgCenter': svg_center,
            'svgPath': svg_path
        },
        'geometry': geom
    }
    processed_features.append(feature_obj)
    province_dict[plate] = {
        'plate': plate,
        'plate_str': plate_str,
        'name': name,
        'region': 'Kuzey Kıbrıs',
        'country': 'KKTC',
        'center': center,
        'svgCenter': svg_center,
        'svgPath': svg_path
    }

full_geojson = {
    'type': 'FeatureCollection',
    'features': sorted(processed_features, key=lambda x: x['properties']['plate'])
}

provinces_list = [province_dict[k] for k in sorted(province_dict.keys())]

js_content = f"""// Turkey & Northern Cyprus GeoJSON & Preprojected SVG Metadata (87 Provinces / Districts)
const TURKEY_GEOJSON = {json.dumps(full_geojson, ensure_ascii=False)};
const TURKEY_PROVINCES = {json.dumps(provinces_list, ensure_ascii=False)};
const MAP_PROJECTION_CONFIG = {{
  minLon: {min_lon},
  maxLon: {max_lon},
  minLat: {min_lat},
  maxLat: {max_lat},
  viewWidth: {W},
  viewHeight: {H},
  padX: {PAD_X},
  padY: {PAD_Y}
}};
"""

with open('turkey-data.js', 'w', encoding='utf-8') as f:
    f.write(js_content)

print(f"Generated turkey-data.js with {len(provinces_list)} entities (81 Turkey + 6 KKTC).")
