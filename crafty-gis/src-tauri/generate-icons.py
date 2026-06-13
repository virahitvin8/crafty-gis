"""Generate Tauri app icons from the logo SVG.

Usage:
    python generate-icons.py

Requires: cairosvg (pip install cairosvg) or Pillow
If neither is available, generates simple placeholder icons.
"""
import subprocess
import sys
from pathlib import Path

ICONS_DIR = Path(__file__).parent / "icons"
SVG_PATH = ICONS_DIR / "logo.svg"

# Tauri expects these icon files
ICON_SIZES = {
    "32x32.png": 32,
    "128x128.png": 128,
    "128x128@2x.png": 256,
}


def _generate_icns(icons_dir: Path) -> None:
    """Generate .icns file on macOS using iconutil, or create a placeholder."""
    icns_path = icons_dir / "icon.icns"
    if icns_path.exists():
        return

    import platform

    iconset_dir = icons_dir / "icon.iconset"
    icon_1024 = icons_dir / "icon-1024.png"

    # If we don't have a source PNG yet, create one
    if not icon_1024.exists():
        try:
            from PIL import Image, ImageDraw
            img = Image.new("RGBA", (1024, 1024), (34, 197, 94, 255))
            draw = ImageDraw.Draw(img)
            draw.ellipse([128, 128, 896, 896], fill=(20, 160, 70, 255))
            img.save(str(icon_1024))
        except ImportError:
            print("  ⚠️  Cannot generate .icns without source PNG")
            return

    if platform.system() == "Darwin":
        # Use macOS iconutil to create .icns
        try:
            iconset_dir.mkdir(exist_ok=True)
            sizes = {
                "icon_16x16.png": 16, "icon_16x16@2x.png": 32,
                "icon_32x32.png": 32, "icon_32x32@2x.png": 64,
                "icon_128x128.png": 128, "icon_128x128@2x.png": 256,
                "icon_256x256.png": 256, "icon_256x256@2x.png": 512,
                "icon_512x512.png": 512, "icon_512x512@2x.png": 1024,
            }
            from PIL import Image
            src = Image.open(str(icon_1024))
            for name, sz in sizes.items():
                resized = src.resize((sz, sz), Image.LANCZOS)
                resized.save(str(iconset_dir / name))
            subprocess.run(
                ["iconutil", "-c", "icns", str(iconset_dir), "-o", str(icns_path)],
                check=True, capture_output=True,
            )
            print("  ✅ Created icon.icns")
        except Exception as e:
            print(f"  ⚠️  iconutil failed: {e}")
        finally:
            import shutil
            if iconset_dir.exists():
                shutil.rmtree(iconset_dir, ignore_errors=True)
    else:
        # Non-macOS: Tauri only needs .icns when building for macOS,
        # so we skip it on other platforms.
        print("  ℹ️  Skipping .icns generation (not on macOS)")


def generate_with_cairosvg():
    """Generate icons using cairosvg."""
    try:
        import cairosvg
    except ImportError:
        return False

    for name, size in ICON_SIZES.items():
        out = ICONS_DIR / name
        cairosvg.svg2png(
            url=str(SVG_PATH),
            write_to=str(out),
            output_width=size,
            output_height=size,
        )
        print(f"  ✅ Created {name} ({size}x{size})")

    # For .ico, generate 256x256 then convert
    from PIL import Image
    import io

    png_data = cairosvg.svg2png(url=str(SVG_PATH), output_width=256, output_height=256)
    img = Image.open(io.BytesIO(png_data))
    img.save(str(ICONS_DIR / "icon.ico"), format="ICO", sizes=[(32, 32), (128, 128), (256, 256)])
    print("  ✅ Created icon.ico")

    # For .icns, generate high-res PNG and convert on macOS
    png_data = cairosvg.svg2png(url=str(SVG_PATH), output_width=1024, output_height=1024)
    icon_png = ICONS_DIR / "icon-1024.png"
    icon_png.write_bytes(png_data)
    print("  ✅ Created icon-1024.png")

    _generate_icns(ICONS_DIR)
    return True


def generate_with_pillow():
    """Generate simple placeholder icons using Pillow."""
    from PIL import Image, ImageDraw, ImageFont

    try:
        import cairosvg
        return generate_with_cairosvg()
    except ImportError:
        pass

    # Fallback: create colored square icons with text
    for name, size in ICON_SIZES.items():
        img = Image.new("RGBA", (size, size), (34, 197, 94, 255))  # Green
        draw = ImageDraw.Draw(img)
        draw.ellipse([size // 8, size // 8, size * 7 // 8, size * 7 // 8], fill=(20, 160, 70, 255))
        try:
            font = ImageFont.truetype("arial.ttf", size // 4)
        except OSError:
            font = ImageFont.load_default()
        text = "CG"
        bbox = draw.textbbox((0, 0), text, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        draw.text(((size - tw) / 2, (size - th) / 2 - size // 10), text, fill="white", font=font)
        img.save(str(ICONS_DIR / name))
        print(f"  ✅ Created {name} ({size}x{size})")

    # .ico
    img_256 = Image.new("RGBA", (256, 256), (34, 197, 94, 255))
    draw = ImageDraw.Draw(img_256)
    draw.ellipse([32, 32, 224, 224], fill=(20, 160, 70, 255))
    img_256.save(str(ICONS_DIR / "icon.ico"), format="ICO", sizes=[(32, 32), (128, 128), (256, 256)])
    print("  ✅ Created icon.ico")

    # Also generate .icns for macOS
    _generate_icns(ICONS_DIR)

    return True


def main():
    print("🎨 Generating CRAFTY GIS app icons...")
    ICONS_DIR.mkdir(parents=True, exist_ok=True)

    # Try cairosvg first (best quality)
    if generate_with_cairosvg():
        print("✨ Icons generated using cairosvg (SVG rendering)")
        return

    # Try Pillow fallback
    if generate_with_pillow():
        print("✨ Icons generated using Pillow (placeholder)")
        return

    # Generate .icns as last resort using a plain PNG
    _generate_icns(ICONS_DIR)

    print("⚠️  Could not generate high-quality icons.")
    print("   Install dependencies: pip install cairosvg Pillow")


if __name__ == "__main__":
    main()
