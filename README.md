# CMHMR Blog Generator

Custom static site generator that reads Jekyll-style markdown and produces a
self-contained HTML site with a 3D animated network background, dark/light
themes, glassmorphism, and syntax highlighting.

## Features

- **Zero build tools** — pure Python, no Node.js, no npm, no bundlers
- **3D animated background** — interactive network topology rendered on canvas
- **Dark/light themes** — toggle with `T` key or the button in the corner
- **Glassmorphism UI** — frosted-glass cards with glow effects
- **Syntax highlighting** — Pygments with Monokai theme and terminal-style windows
- **Responsive** — works on desktop, tablet, and mobile
- **Keyboard shortcuts** — `Ctrl+K` (menu), `T` (theme), `Esc` (close menu)
- **Reading progress bar** — shows scroll position at the top of the page
- **Scroll animations** — cards fade in as you scroll
- **Floating particles** — subtle ambient animation in the background
- **Glitch text effect** — chromatic aberration on the hero title
- **Print-friendly** — clean output when printing to PDF

## Requirements

- Python 3.10+
- Dependencies: `markdown`, `pygments`, `pyyaml`

## Quick start

```bash
# Clone and set up
cd blog_generator
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Generate the site
python generate.py --source /path/to/your/blog --output /path/to/output

# Generate and serve locally
python generate.py --source /path/to/your/blog --output /path/to/output --serve
```

## Directory structure

Your blog source directory should look like this:

```
your-blog/
├── _config.yml          # Site configuration (title, tagline, etc.)
├── _posts/              # Blog posts (YYYY-MM-DD-slug.md)
│   ├── 2023-01-23-the_beginning.md
│   └── ...
├── _tabs/               # Static pages (about, peering, graphs, etc.)
│   ├── about.md
│   ├── peering.md
│   └── ...
└── assets/              # Images, CSS libs, etc.
    └── img/
```

### Post format

Standard Jekyll-style markdown with YAML frontmatter:

```markdown
---
title: My Post Title
date: 2025-01-15 10:00:00 +0100
categories: [Category1, Category2]
tags: [tag1, tag2]
---

Post content here...

```bash
# Code blocks are automatically syntax highlighted
echo "hello world"
```
```

### Tab format

Static pages with optional ordering:

```markdown
---
icon: fas fa-info-circle
order: 1
---

Page content here...
```

Special tab slugs get auto-generated content:
- `archives.md` — chronological timeline of all posts
- `categories.md` — grid of categories with post counts
- `tags.md` — tag cloud with weighted sizes

### Configuration

`_config.yml` supports these fields:

```yaml
title: My Blog              # Site title (required)
tagline: A short tagline    # Subtitle shown below the title
description: SEO description # Used in meta tags
url: https://example.com    # Base URL for the site
github:
  username: yourname        # GitHub link in the sidebar
twitter:
  username: yourname        # Twitter link in the sidebar
social:
  name: Your Name           # Copyright line in the footer
  email: you@example.com    # Contact email
```

## CLI options

```
usage: generate.py [-h] [-s SOURCE] [-o OUTPUT] [--serve] [--port PORT]

options:
  -h, --help           Show this help message
  -s, --source         Source directory (default: current directory)
  -o, --output         Output directory (default: _site)
  --serve              Start a local HTTP server after generating
  --port PORT          Port for the local server (default: 8899)
```

## Output

The generator produces a fully static site in the output directory:

```
_site/
├── index.html           # Home page with post list
├── posts/               # Individual post pages
│   └── slug/
│       └── index.html
├── about/               # Tab pages
│   └── index.html
├── css/
│   └── style.css        # All styles (dark + light themes)
├── js/
│   └── main.js          # All JavaScript (3D bg, interactions, etc.)
└── assets/              # Copied from source
```

The output is ready to serve with any static file server (Caddy, nginx,
Python's `http.server`, etc.).

## Customization

### Changing colors

Edit `style.css` and modify the CSS custom properties in `:root`:

```css
:root {
    --accent: #00d4ff;        /* Primary accent color */
    --accent-alt: #7b2ff7;    /* Secondary accent color */
    --bg-primary: #0a0a0f;    /* Background color */
    /* ... */
}
```

### Adding navigation items

Edit the `_nav_links()` function in `generate.py` to add new sidebar links.

### Changing the 3D background

Edit `main.js` — the `Network3D` object controls the animated network
topology. Adjust `nodeCount`, `connectionDist`, and colors.

## License

MIT — see [LICENSE](LICENSE) for details.
