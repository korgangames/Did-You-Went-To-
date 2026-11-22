import math
from PIL import Image, ImageDraw, ImageFilter

def create_app_icon():
    # 4x supersampling for ultra-crisp edges
    SCALE = 4
    SIZE = 512 * SCALE  # 2048 x 2048 canvas
    
    # 1. Base Image
    canvas = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    
    # 2. Drop shadow under squircle
    shadow_pad = 20 * SCALE
    shadow_rad = 108 * SCALE
    shadow_img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow_img)
    shadow_offset = 12 * SCALE
    shadow_draw.rounded_rectangle(
        [shadow_pad, shadow_pad + shadow_offset, SIZE - shadow_pad, SIZE - shadow_pad + shadow_offset],
        radius=shadow_rad,
        fill=(50, 5, 20, 110)
    )
    shadow_img = shadow_img.filter(ImageFilter.GaussianBlur(16 * SCALE))
    canvas.alpha_composite(shadow_img)

    # 3. Squircle Mask
    mask = Image.new('L', (SIZE, SIZE), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle(
        [shadow_pad, shadow_pad, SIZE - shadow_pad, SIZE - shadow_pad],
        radius=shadow_rad,
        fill=255
    )

    # 4. Squircle Gradient Fill (Diagonal: Rose -> Crimson -> Ruby -> Deep Wine)
    squircle_content = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    sq_draw = ImageDraw.Draw(squircle_content)
    
    # Render diagonal gradient
    stops = [
        (0.00, (244, 63, 94)),   # #f43f5e
        (0.35, (225, 29, 72)),   # #e11d48
        (0.70, (190, 18, 60)),   # #be123c
        (1.00, (114, 15, 46))    # #720f2e
    ]
    
    def get_color(t):
        for i in range(len(stops) - 1):
            t0, c0 = stops[i]
            t1, c1 = stops[i+1]
            if t0 <= t <= t1:
                f = (t - t0) / (t1 - t0)
                r = int(c0[0] * (1 - f) + c1[0] * f)
                g = int(c0[1] * (1 - f) + c1[1] * f)
                b = int(c0[2] * (1 - f) + c1[2] * f)
                return (r, g, b, 255)
        return (*stops[-1][1], 255)

    diag_len = SIZE * 1.414
    for y in range(SIZE):
        for x in range(0, SIZE, 4):  # step by 4 for speed then fill
            proj = (x + y) / (2.0 * SIZE)
            col = get_color(proj)
            sq_draw.rectangle([x, y, x + 3, y], fill=col)

    # 5. Top Specular Gloss
    gloss_img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    gloss_draw = ImageDraw.Draw(gloss_img)
    gloss_pts = [
        (shadow_pad, 130 * SCALE),
        (shadow_pad, shadow_pad),
        (SIZE - shadow_pad, shadow_pad),
        (SIZE - shadow_pad, 130 * SCALE)
    ]
    # Arc curve across bottom of gloss
    arc_pts = []
    for step in range(60):
        t = step / 59.0
        gx = (SIZE - shadow_pad) * (1 - t) + shadow_pad * t
        gy = (130 * SCALE) + math.sin(t * math.pi) * (40 * SCALE)
        arc_pts.append((gx, gy))
    
    gloss_poly = gloss_pts[:3] + arc_pts
    gloss_draw.polygon(gloss_poly, fill=(255, 255, 255, 45))
    gloss_img = gloss_img.filter(ImageFilter.GaussianBlur(6 * SCALE))
    squircle_content.alpha_composite(gloss_img)

    # 6. Topography / Radar circles centered at (256, 396)
    radar_center = (256 * SCALE, 396 * SCALE)
    for r_unit, alpha in [(65, 30), (125, 20), (185, 14), (245, 10)]:
        r = r_unit * SCALE
        sq_draw.ellipse(
            [radar_center[0] - r, radar_center[1] - r, radar_center[0] + r, radar_center[1] + r],
            outline=(255, 255, 255, alpha),
            width=2 * SCALE
        )

    # 7. Travel Flight Arc
    arc_points = []
    for step in range(100):
        t = step / 99.0
        # Quadratic bezier from (40, 370) through (160, 160) to (380, 85)
        p0 = (40 * SCALE, 370 * SCALE)
        p1 = (160 * SCALE, 160 * SCALE)
        p2 = (380 * SCALE, 85 * SCALE)
        bx = (1 - t)**2 * p0[0] + 2 * (1 - t) * t * p1[0] + t**2 * p2[0]
        by = (1 - t)**2 * p0[1] + 2 * (1 - t) * t * p1[1] + t**2 * p2[1]
        arc_points.append((bx, by))

    for i in range(len(arc_points) - 1):
        if (i // 3) % 2 == 0:  # dashed effect
            sq_draw.line([arc_points[i], arc_points[i+1]], fill=(254, 240, 138, 120), width=int(3.5 * SCALE))

    # Departure & Destination dots
    sq_draw.ellipse(
        [36 * SCALE, 366 * SCALE, 44 * SCALE, 374 * SCALE],
        fill=(254, 240, 138, 200)
    )
    # Small destination star
    star_x, star_y = 380 * SCALE, 85 * SCALE
    sq_draw.ellipse(
        [star_x - 6 * SCALE, star_y - 6 * SCALE, star_x + 6 * SCALE, star_y + 6 * SCALE],
        fill=(255, 255, 255, 240)
    )

    # Ground Beacon Rings
    ground_center = (256 * SCALE, 406 * SCALE)
    sq_draw.ellipse(
        [ground_center[0] - 58 * SCALE, ground_center[1] - 16 * SCALE,
         ground_center[0] + 58 * SCALE, ground_center[1] + 16 * SCALE],
        outline=(251, 191, 36, 130),
        width=int(2.5 * SCALE)
    )
    sq_draw.ellipse(
        [ground_center[0] - 92 * SCALE, ground_center[1] - 24 * SCALE,
         ground_center[0] + 92 * SCALE, ground_center[1] + 24 * SCALE],
        outline=(251, 191, 36, 60),
        width=int(2 * SCALE)
    )

    # Composite squircle content through the mask
    canvas.paste(squircle_content, (0, 0), mask)

    # 8. Main Hero Pin
    pin_layer = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    pin_draw = ImageDraw.Draw(pin_layer)

    # Pin Shadow
    pin_shadow = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    ps_draw = ImageDraw.Draw(pin_shadow)
    ps_draw.ellipse(
        [256 * SCALE - 55 * SCALE, 404 * SCALE - 15 * SCALE,
         256 * SCALE + 55 * SCALE, 404 * SCALE + 15 * SCALE],
        fill=(0, 0, 0, 110)
    )
    pin_shadow = pin_shadow.filter(ImageFilter.GaussianBlur(10 * SCALE))
    canvas.alpha_composite(pin_shadow)

    # Generate Pin Outer Shape Path
    # Center of pin head: (256, 212), radius = 112
    # Tip: (256, 396)
    pin_pts = []
    # Arc from angle 150 deg to 390 deg (top circle)
    head_cx = 256 * SCALE
    head_cy = 212 * SCALE
    head_r = 112 * SCALE

    # From tip (256, 396) curving up to left tangent (~144, 212)
    # Cubic bezier: P0=(256, 396), P1=(240, 354), P2=(144, 276), P3=(144, 212)
    steps = 40
    for s in range(steps):
        t = s / float(steps)
        # Bezier from tip to left side
        bx = (1-t)**3 * (256 * SCALE) + 3*(1-t)**2*t*(240 * SCALE) + 3*(1-t)*t**2*(144 * SCALE) + t**3*(144 * SCALE)
        by = (1-t)**3 * (396 * SCALE) + 3*(1-t)**2*t*(354 * SCALE) + 3*(1-t)*t**2*(276 * SCALE) + t**3*(212 * SCALE)
        pin_pts.append((bx, by))

    # Arc around top from angle 180 deg to 0 deg
    arc_steps = 60
    for s in range(arc_steps + 1):
        angle = math.pi - (s / float(arc_steps)) * math.pi
        ax = head_cx + math.cos(angle) * head_r
        ay = head_cy - math.sin(angle) * head_r
        pin_pts.append((ax, ay))

    # Right curve down from (368, 212) to tip (256, 396)
    for s in range(steps + 1):
        t = s / float(steps)
        bx = (1-t)**3 * (368 * SCALE) + 3*(1-t)**2*t*(368 * SCALE) + 3*(1-t)*t**2*(272 * SCALE) + t**3*(256 * SCALE)
        by = (1-t)**3 * (212 * SCALE) + 3*(1-t)**2*t*(276 * SCALE) + 3*(1-t)*t**2*(354 * SCALE) + t**3*(396 * SCALE)
        pin_pts.append((bx, by))

    # Draw pin body with clean white/off-white gradient
    pin_mask = Image.new('L', (SIZE, SIZE), 0)
    pm_draw = ImageDraw.Draw(pin_mask)
    pm_draw.polygon(pin_pts, fill=255)

    pin_fill = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    pf_draw = ImageDraw.Draw(pin_fill)
    for y in range(int(100 * SCALE), int(400 * SCALE)):
        t = (y - 100 * SCALE) / (300.0 * SCALE)
        # Gradient: #ffffff to #f1f5f9
        v = int(255 * (1 - t * 0.12))
        pf_draw.line([(0, y), (SIZE, y)], fill=(v, v, v, 255))

    # Outer border on pin
    pm_draw.polygon(pin_pts, outline=255, width=int(2 * SCALE))
    canvas.paste(pin_fill, (0, 0), pin_mask)

    # 9. Inner Portal (Deep Midnight Navy Circle)
    portal_r = 76 * SCALE
    portal_img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    pt_draw = ImageDraw.Draw(portal_img)
    pt_draw.ellipse(
        [head_cx - portal_r, head_cy - portal_r, head_cx + portal_r, head_cy + portal_r],
        fill=(15, 23, 42, 255),  # #0f172a
        outline=(226, 232, 240, 255),
        width=int(2.5 * SCALE)
    )

    # Subtle longitude & latitude lines inside portal
    pt_draw.ellipse(
        [head_cx - portal_r + 2 * SCALE, head_cy - 32 * SCALE,
         head_cx + portal_r - 2 * SCALE, head_cy + 32 * SCALE],
        outline=(56, 189, 248, 55),
        width=int(1.2 * SCALE)
    )
    pt_draw.line(
        [(head_cx, head_cy - portal_r + 2 * SCALE), (head_cx, head_cy + portal_r - 2 * SCALE)],
        fill=(56, 189, 248, 55),
        width=int(1.2 * SCALE)
    )
    canvas.alpha_composite(portal_img)

    # 10. Turkish Crescent (Ay) in Gold
    cres_layer = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    cres_draw = ImageDraw.Draw(cres_layer)
    
    # Outer circle centered at (248, 212), radius = 44
    cres_cx = 248 * SCALE
    cres_cy = 212 * SCALE
    cres_r = 44 * SCALE
    
    cres_mask = Image.new('L', (SIZE, SIZE), 0)
    cm_draw = ImageDraw.Draw(cres_mask)
    cm_draw.ellipse(
        [cres_cx - cres_r, cres_cy - cres_r, cres_cx + cres_r, cres_cy + cres_r],
        fill=255
    )
    
    # Inner cut circle shifted right: cx = 258, radius = 35
    cut_cx = 258 * SCALE
    cut_cy = 212 * SCALE
    cut_r = 35 * SCALE
    cm_draw.ellipse(
        [cut_cx - cut_r, cut_cy - cut_r, cut_cx + cut_r, cut_cy + cut_r],
        fill=0
    )

    # Fill crescent with gold gradient
    cres_fill = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    cf_draw = ImageDraw.Draw(cres_fill)
    for y in range(int(cres_cy - cres_r), int(cres_cy + cres_r)):
        t = (y - (cres_cy - cres_r)) / (2.0 * cres_r)
        # Gold gradient: #fef08a to #f59e0b
        r = int(254 * (1 - t) + 245 * t)
        g = int(240 * (1 - t) + 158 * t)
        b = int(138 * (1 - t) + 11 * t)
        cf_draw.line([(0, y), (SIZE, y)], fill=(r, g, b, 255))

    canvas.paste(cres_fill, (0, 0), cres_mask)

    # 11. Radiant 8-Point Compass Star
    star_layer = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    st_draw = ImageDraw.Draw(star_layer)
    st_cx = 272 * SCALE
    st_cy = 212 * SCALE
    
    # 4 major points (radius 22) + 4 minor diagonal points (radius 14) + inner valleys (radius 4)
    star_pts = []
    for i in range(16):
        ang = -math.pi / 2.0 + (i / 16.0) * 2 * math.pi
        if i % 4 == 0:
            rad = 22 * SCALE      # Main N, E, S, W
        elif i % 2 == 0:
            rad = 14 * SCALE      # Diagonals NE, SE, SW, NW
        else:
            rad = 5 * SCALE       # Inner corners
        star_pts.append((st_cx + math.cos(ang) * rad, st_cy + math.sin(ang) * rad))

    st_draw.polygon(star_pts, fill=(254, 240, 138, 255))
    st_draw.ellipse(
        [st_cx - 3 * SCALE, st_cy - 3 * SCALE, st_cx + 3 * SCALE, st_cy + 3 * SCALE],
        fill=(255, 255, 255, 255)
    )
    canvas.alpha_composite(star_layer)

    # 12. Floating Blue Camera / Memory Badge at (338, 306)
    badge_layer = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    bd_draw = ImageDraw.Draw(badge_layer)
    bd_cx = 338 * SCALE
    bd_cy = 306 * SCALE
    bd_r = 30 * SCALE

    # Badge Shadow
    b_shadow = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    bs_draw = ImageDraw.Draw(b_shadow)
    bs_draw.ellipse(
        [bd_cx - bd_r - 2 * SCALE, bd_cy - bd_r + 4 * SCALE,
         bd_cx + bd_r + 2 * SCALE, bd_cy + bd_r + 8 * SCALE],
        fill=(0, 0, 0, 100)
    )
    b_shadow = b_shadow.filter(ImageFilter.GaussianBlur(6 * SCALE))
    canvas.alpha_composite(b_shadow)

    # Outer blue circle with white border
    bd_draw.ellipse(
        [bd_cx - bd_r, bd_cy - bd_r, bd_cx + bd_r, bd_cy + bd_r],
        fill=(37, 99, 235, 255),
        outline=(255, 255, 255, 255),
        width=int(3.5 * SCALE)
    )

    # Inner camera glyph
    cam_w = 30 * SCALE
    cam_h = 20 * SCALE
    cam_x = bd_cx - cam_w // 2
    cam_y = bd_cy - cam_h // 2 + 2 * SCALE

    # Camera body
    bd_draw.rounded_rectangle(
        [cam_x, cam_y, cam_x + cam_w, cam_y + cam_h],
        radius=4 * SCALE,
        fill=(255, 255, 255, 255)
    )
    # Camera top hump
    bd_draw.rounded_rectangle(
        [bd_cx - 5 * SCALE, cam_y - 4 * SCALE, bd_cx + 5 * SCALE, cam_y],
        radius=int(1.5 * SCALE),
        fill=(255, 255, 255, 255)
    )
    # Camera lens ring
    lens_r = int(6.5 * SCALE)
    bd_draw.ellipse(
        [bd_cx - lens_r, bd_cy + 2 * SCALE - lens_r,
         bd_cx + lens_r, bd_cy + 2 * SCALE + lens_r],
        fill=(37, 99, 235, 255),
        outline=(255, 255, 255, 255),
        width=int(1.8 * SCALE)
    )
    # Lens highlight
    bd_draw.ellipse(
        [bd_cx + 2 * SCALE - 2 * SCALE, bd_cy - 1 * SCALE - 2 * SCALE,
         bd_cx + 2 * SCALE + 2 * SCALE, bd_cy - 1 * SCALE + 2 * SCALE],
        fill=(147, 197, 253, 255)
    )
    # Flash dot
    bd_draw.ellipse(
        [cam_x + cam_w - 6 * SCALE, cam_y + 2 * SCALE,
         cam_x + cam_w - 3 * SCALE, cam_y + 5 * SCALE],
        fill=(250, 204, 21, 255)
    )

    canvas.alpha_composite(badge_layer)

    return canvas

def main():
    print("Generating Master App Icon (4x supersampling)...")
    master = create_app_icon()
    
    targets = [
        ("icon-512.png", 512),
        ("icon-192.png", 192),
        ("apple-touch-icon.png", 180),
        ("favicon-32x32.png", 32),
        ("favicon-16x16.png", 16)
    ]
    
    for filename, size in targets:
        resized = master.resize((size, size), Image.Resampling.LANCZOS)
        resized.save(filename, "PNG", optimize=True)
        print(f"Saved {filename} ({size}x{size})")

    # Generate multi-size favicon.ico (16, 32, 48)
    ico_sizes = [(16, 16), (32, 32), (48, 48)]
    ico_imgs = [master.resize(s, Image.Resampling.LANCZOS) for s in ico_sizes]
    ico_imgs[1].save("favicon.ico", format="ICO", sizes=ico_sizes)
    print("Saved favicon.ico (16x16, 32x32, 48x48)")

if __name__ == "__main__":
    main()
