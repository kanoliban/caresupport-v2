---
name: pdf-creation
description: Create PDF documents from HTML/CSS. Use when creating PDFs, reports, or formatted documents.
---

For PDF creation from scratch, always use the weasyprint python package and create the pdf from html/css. do not use reportlab.

Include thoughtful design elements, visual hierarchy.

## Fonts

### Option 1: Pre-installed System Fonts

These fonts are pre-installe:

**Sans Serif:** `Roboto`, `Open Sans`, `Lato`, `Noto Sans`, `Liberation Sans`, `DejaVu Sans`, `Carlito` (Calibri replacement)

**Serif:** `EB Garamond`, `Caladea` (Cambria replacement), `FreeSerif` (Times replacement)

**Monospace:** `Fira Code`, `Noto Mono`, `Inconsolata`, `DejaVu Sans Mono`

**Icons:** `Font Awesome`, `Material Design Icons`

### Option 2: Google Fonts via @import

Google Fonts @import works.

```css
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&display=swap');
body { font-family: 'Poppins', sans-serif; }
```

If a Google Font fails to load, WeasyPrint falls back to system fonts silently.

## Brand Style Reference for reports

If you're creating a PDF report or audit report, we want to use the companies style:

1. Check if `reference_style.md` exists. If so, read it and use the design tokens as a starting point.

2. If it doesn't exist, run:
```bash
uv run python skills/pdf-creation/scripts/extract_site_styles.py https://company-website.com/
```

Note: The style extractor may suggest Google Fonts. Map them to available system fonts above.

## Page Breaks

Prevent elements from being cut in half:

```css
h1, h2, h3, h4 { break-after: avoid; }
.card, figure, table, tr { break-inside: avoid; }
p { orphans: 3; widows: 3; }
```

Note: `break-inside: avoid` only works if the element fits on a single page.

## Flexbox Layout

Prevent text overflow in flex rows:

```css
.flex-item {
    flex: 1;
    min-width: 0;      /* Allows shrinking below content size */
    overflow: hidden;
}
```

Design guidelines:
- **Limit horizontal density**: Max 3-4 cards per row. If content is text-heavy, use fewer columns or stack vertically.
- **Consider content width**: Ensure text has enough room. Wide content (names, descriptions) needs more space than metrics.
- **Always add `min-width: 0`** to flex children — the default `auto` prevents shrinking and causes overflow.

<frontend_aesthetics>
You tend to converge toward generic, "on distribution" outputs. In frontend design, this creates what users call the "AI slop" aesthetic. Avoid this: make creative, distinctive frontends that surprise and delight.

Focus on:
- Typography: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the frontend's aesthetics.
- Color & Theme: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes. Draw from IDE themes and cultural aesthetics for inspiration.
- Layout: Use deliberate whitespace and visual hierarchy. Design for standard paper sizes (A4/Letter). Think about how content flows across pages.
- Backgrounds: Create atmosphere and depth rather than defaulting to solid colors. Layer CSS gradients, use geometric patterns, or add contextual effects that match the overall aesthetic.

Avoid generic AI-generated aesthetics:
- Overused font families (Inter, Roboto, Arial, system fonts)
- Clichéd color schemes (particularly purple gradients on white backgrounds)
- Predictable layouts and component patterns
- Cookie-cutter design that lacks context-specific character

Interpret creatively and make unexpected choices that feel genuinely designed for the context. Vary between light and dark themes, different fonts, different aesthetics. You still tend to converge on common choices (Space Grotesk, for example) across generations. Avoid this: it is critical that you think outside the box!
</frontend_aesthetics>
<!-- ══════════════════════════════════════════════════════════════════════════
