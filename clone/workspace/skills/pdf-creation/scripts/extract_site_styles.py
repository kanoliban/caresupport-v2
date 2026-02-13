"""
Extract key styles, colors, and fonts from a website for PDF design inspiration.
Outputs a reference_style.md file with design tokens.

Run with:
    uv run python skills/pdf-creation/scripts/extract_site_styles.py https://example.com/

Output will be written to: /work/reference_style.md
"""

import re
import sys
from collections import Counter
from pathlib import Path
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup


def fetch_page(url: str) -> tuple[str, str]:
    headers = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}
    response = httpx.get(url, headers=headers, follow_redirects=True, timeout=15)
    response.raise_for_status()
    return response.text, str(response.url)


def fetch_css(url: str, base_url: str) -> str:
    try:
        full_url = urljoin(base_url, url)
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        }
        response = httpx.get(full_url, headers=headers, timeout=10)
        return response.text
    except Exception:
        return ""


def is_noise_color(hex_val: str) -> bool:
    noise = {"#000", "#0000", "#00000000", "#fff", "#ffff", "#ffffffff", "#ffffff", "#000000"}
    return hex_val.lower() in noise


def is_noise_css_var(var_name: str, var_value: str) -> bool:
    noise_prefixes = ("tw-", "webkit", "moz-", "ms-")
    noise_values = ("initial", "inherit", "unset", "none", "0 0 #0000", "#0000", "transparent")
    noise_names = ("shadow", "ring", "inset", "offset", "drop-shadow")

    if var_name.startswith(noise_prefixes):
        return True
    if var_value.lower().strip() in noise_values:
        return True
    if any(n in var_name.lower() for n in noise_names) and "color" not in var_name.lower():
        return True
    if var_value.startswith("var("):
        return True
    return False


def extract_colors(css_text: str, html_text: str) -> dict[str, list[str]]:
    colors: dict[str, list[str]] = {
        "hex": [],
        "rgb": [],
        "hsl": [],
        "css_vars": [],
    }

    hex_pattern = r"#([0-9a-fA-F]{3,8})\b"
    for match in re.finditer(hex_pattern, css_text + html_text):
        hex_val = f"#{match.group(1).lower()}"
        if len(hex_val) in [4, 7, 9] and not is_noise_color(hex_val):
            colors["hex"].append(hex_val)

    rgb_pattern = r"rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d.]+)?\s*\)"
    for match in re.finditer(rgb_pattern, css_text + html_text):
        r, g, b = int(match.group(1)), int(match.group(2)), int(match.group(3))
        if not (r == g == b == 0) and not (r == g == b == 255):
            colors["rgb"].append(f"rgb({r}, {g}, {b})")

    hsl_pattern = r"hsla?\s*\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%"
    for match in re.finditer(hsl_pattern, css_text + html_text):
        h, s, lightness = match.group(1), match.group(2), match.group(3)
        colors["hsl"].append(f"hsl({h}, {s}%, {lightness}%)")

    var_pattern = r"--([a-zA-Z0-9_-]+)\s*:\s*([^;}\n]+)"
    for match in re.finditer(var_pattern, css_text + html_text):
        var_name = match.group(1)
        var_value = match.group(2).strip()
        if is_noise_css_var(var_name, var_value):
            continue
        if any(c in var_value.lower() for c in ["#", "rgb", "hsl"]) or "color" in var_name.lower():
            colors["css_vars"].append(f"--{var_name}: {var_value}")

    return colors


def extract_fonts(css_text: str, html_text: str) -> list[str]:
    fonts = []
    noise_fonts = {
        "inherit",
        "initial",
        "unset",
        "monospace",
        "sans-serif",
        "serif",
        "cursive",
        "fantasy",
    }

    font_family_pattern = r"font-family\s*:\s*([^;}\n]+)"
    for match in re.finditer(font_family_pattern, css_text + html_text, re.IGNORECASE):
        font_value = match.group(1).strip().strip("\"'")
        if font_value.startswith("var("):
            continue
        first_font = font_value.split(",")[0].strip().strip("'\"")
        if first_font.lower() in noise_fonts:
            continue
        fonts.append(first_font)

    google_fonts_pattern = r"fonts\.googleapis\.com/css2?\?family=([^\"'\s&]+)"
    for match in re.finditer(google_fonts_pattern, html_text):
        font_name = match.group(1).replace("+", " ").split(":")[0]
        fonts.append(f"Google: {font_name}")

    return fonts


def extract_gradients(css_text: str) -> list[str]:
    gradients = []
    gradient_pattern = r"(linear-gradient|radial-gradient)\s*\([^)]+\)"
    for match in re.finditer(gradient_pattern, css_text, re.IGNORECASE):
        grad = match.group(0)
        if "#" in grad or "rgb" in grad.lower():
            gradients.append(grad)
    return gradients


def hex_to_rgb(hex_color: str) -> tuple[int, int, int] | None:
    hex_color = hex_color.lstrip("#")
    if len(hex_color) == 3:
        hex_color = "".join(c * 2 for c in hex_color)
    if len(hex_color) == 6:
        return int(hex_color[0:2], 16), int(hex_color[2:4], 16), int(hex_color[4:6], 16)
    return None


def categorize_color(hex_color: str) -> str:
    rgb = hex_to_rgb(hex_color)
    if not rgb:
        return "unknown"
    r, g, b = rgb
    brightness = (r * 299 + g * 587 + b * 114) / 1000
    if brightness > 240:
        return "white/near-white"
    elif brightness < 15:
        return "black/near-black"
    elif brightness > 200:
        return "light"
    elif brightness < 50:
        return "dark"
    else:
        return "mid-tone"


def get_top_items(items: list[str], n: int = 10) -> list[tuple[str, int]]:
    return Counter(items).most_common(n)


def analyze_site(url: str) -> str | None:
    try:
        html_text, final_url = fetch_page(url)
    except Exception as e:
        print(f"❌ Failed to fetch {url}: {e}")
        return None

    soup = BeautifulSoup(html_text, "html.parser")

    all_css = ""
    for style_tag in soup.find_all("style"):
        if style_tag.string:
            all_css += style_tag.string + "\n"

    for link_tag in soup.find_all("link", rel="stylesheet"):
        href = link_tag.get("href")
        if href:
            css_content = fetch_css(href, final_url)
            all_css += css_content + "\n"

    inline_styles = ""
    for elem in soup.find_all(style=True):
        inline_styles += elem.get("style", "") + ";"

    combined_css = all_css + inline_styles

    colors = extract_colors(combined_css, html_text)
    fonts = extract_fonts(combined_css, html_text)
    gradients = extract_gradients(combined_css)

    lines: list[str] = []
    lines.append("# Reference Style Guide")
    lines.append("")
    lines.append(f"**Auto-extracted from:** {url}")
    lines.append("")
    lines.append(
        "> ⚠️ **Note:** These values were automatically extracted by analyzing the website's CSS."
    )
    lines.append(
        "> The color categorization and variable mapping may not be perfect. Use your judgment"
    )
    lines.append("> when applying these tokens — adjust colors, swap accent/primary roles, or pick")
    lines.append(
        "> different values from the palette if they better suit the design context. You can edit this file if you relaize issues with fontsn or colors and have better experiences. or if the user request a different style."
    )
    lines.append("")

    all_hex = get_top_items(colors["hex"], 30)
    dark_colors = [c for c, _ in all_hex if categorize_color(c) == "dark"][:2]
    mid_colors = [c for c, _ in all_hex if categorize_color(c) == "mid-tone"][:3]
    light_colors = [c for c, _ in all_hex if categorize_color(c) == "light"][:2]
    bg_colors = [c for c, _ in all_hex if categorize_color(c) == "white/near-white"][:2]

    lines.append("## CSS Variables")
    lines.append("")
    lines.append("```css")
    lines.append(":root {")
    if dark_colors:
        lines.append(f"    --text-primary: {dark_colors[0]};")
        if len(dark_colors) > 1:
            lines.append(f"    --text-secondary: {dark_colors[1]};")
    if mid_colors:
        lines.append(f"    --accent: {mid_colors[0]};")
        if len(mid_colors) > 1:
            lines.append(f"    --accent-secondary: {mid_colors[1]};")
        if len(mid_colors) > 2:
            lines.append(f"    --accent-tertiary: {mid_colors[2]};")
    if light_colors:
        lines.append(f"    --bg-secondary: {light_colors[0]};")
        if len(light_colors) > 1:
            lines.append(f"    --bg-tertiary: {light_colors[1]};")
    if bg_colors:
        lines.append(f"    --bg-primary: {bg_colors[0]};")

    top_fonts = get_top_items(fonts, 3) if fonts else []
    if top_fonts:
        font_names = ["--font-display", "--font-body", "--font-mono"]
        for i, (font, _) in enumerate(top_fonts[:3]):
            clean_font = font.replace("Google: ", "")
            lines.append(f"    {font_names[i]}: '{clean_font}';")
    lines.append("}")
    lines.append("```")
    lines.append("")

    lines.append("## Color Palette")
    lines.append("")
    if dark_colors:
        lines.append(f"**Dark/Text**: {', '.join(dark_colors)}")
    if mid_colors:
        lines.append(f"**Accent/Brand**: {', '.join(mid_colors)}")
    if light_colors:
        lines.append(f"**Light/Muted**: {', '.join(light_colors)}")
    if bg_colors:
        lines.append(f"**Background**: {', '.join(bg_colors)}")
    lines.append("")

    if colors["css_vars"]:
        interesting_vars = [
            v
            for v in colors["css_vars"]
            if any(
                k in v.lower()
                for k in [
                    "primary",
                    "accent",
                    "brand",
                    "swatch",
                    "text-color",
                    "background-color",
                    "bg-color",
                    "foreground",
                ]
            )
            and "Google" not in v
            and "hover" not in v
            and "active" not in v
        ]
        if interesting_vars:
            lines.append("### Design Tokens from Source")
            lines.append("")
            lines.append("```css")
            seen = set()
            for var in interesting_vars[:8]:
                if var not in seen:
                    lines.append(f"{var};")
                    seen.add(var)
            lines.append("```")
            lines.append("")

    lines.append("## Typography")
    lines.append("")
    if top_fonts:
        for font, count in top_fonts:
            if "Google:" in font:
                lines.append(f"- **{font}** (can use @import or system alternative)")
            else:
                lines.append(f"- {font}")
    else:
        lines.append(
            "No specific fonts detected. Use system fonts or choose appropriate alternatives."
        )
    lines.append("")

    if gradients:
        lines.append("## Gradients")
        lines.append("")
        lines.append("```css")
        seen = set()
        for grad in gradients[:3]:
            if grad not in seen:
                lines.append(grad)
                seen.add(grad)
        lines.append("```")
        lines.append("")

    lines.append("## Usage Notes")
    lines.append("")
    lines.append("These are suggestions based on color brightness analysis:")
    lines.append("")
    lines.append(
        "- `--accent` / `--accent-secondary`: Mid-tone colors, likely brand colors — use for buttons, links, highlights"
    )
    lines.append("- `--text-primary`: Darkest colors found — use for headings and body text")
    lines.append(
        "- `--bg-primary` / `--bg-secondary`: Light colors — use for backgrounds and cards"
    )
    lines.append("")
    lines.append("**Feel free to:**")
    lines.append(
        "- Swap roles if a color works better elsewhere (e.g., use accent-secondary as primary)"
    )
    lines.append("- Pick different colors from the palette sections above")
    lines.append("- Adjust opacity or create variants as needed")
    lines.append("")

    return "\n".join(lines)


def main():
    if len(sys.argv) < 2:
        print("Usage: uv run python skills/pdf-creation/scripts/extract_site_styles.py <url>")
        print(
            "Example: uv run python skills/pdf-creation/scripts/extract_site_styles.py https://example.com/"
        )
        sys.exit(1)

    url = sys.argv[1]
    if not url.startswith("http"):
        url = "https://" + url

    print(f"🔍 Analyzing: {url}")

    content = analyze_site(url)
    if content:
        output_path = Path("/work/reference_style.md")
        output_path.write_text(content)
        print(f"✅ Written to: {output_path}")


if __name__ == "__main__":
    main()
