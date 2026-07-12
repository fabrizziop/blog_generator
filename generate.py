#!/usr/bin/env python3
"""Custom static blog generator.

Reads Jekyll-style markdown files (_posts, _tabs, _config.yml) and produces
a self-contained static HTML site with 3D animated background, dark/light
themes, glassmorphism, and syntax highlighting.

Usage:
    python generate.py [options]
    python generate.py --help
"""

import argparse
import os
import re
import shutil
import sys
from pathlib import Path

import yaml
import markdown
from datetime import datetime

from pygments import highlight
from pygments.lexers import get_lexer_by_name, TextLexer
from pygments.formatters import HtmlFormatter

# ─── Markdown extensions ───────────────────────────────────────────────
# fenced_code and codehilite are excluded because we pre-process code
# blocks with Pygments via preprocess_code_blocks().
MD_EXTENSIONS = [
    'extra',
    'tables',
    'md_in_html',
    'toc',
    'attr_list',
    'footnotes',
    'admonition',
]

# ─── Parse frontmatter ─────────────────────────────────────────────────
def parse_frontmatter(text):
    """Extract YAML frontmatter and body from markdown."""
    m = re.match(r'^---\s*\n(.*?)\n---\s*\n(.*)', text, re.DOTALL)
    if not m:
        return {}, text
    meta = yaml.safe_load(m.group(1)) or {}
    body = m.group(2)
    return meta, body

# ─── Syntax highlighting ───────────────────────────────────────────────
def highlight_code(code, lang=None):
    """Highlight a code block using Pygments (Monokai style)."""
    if not lang:
        lang = 'text'
    try:
        lexer = get_lexer_by_name(lang, stripall=True)
    except Exception:
        try:
            lexer = get_lexer_by_name(lang.lower(), stripall=True)
        except Exception:
            lexer = TextLexer(stripall=True)
    formatter = HtmlFormatter(style='monokai', linenos='inline',
                              cssclass='codehilite')
    return highlight(code, lexer, formatter)

# ─── Pre-process code blocks before markdown ──────────────────────────
def preprocess_code_blocks(text):
    """Replace fenced code blocks with Pygments-highlighted HTML."""
    blocks = re.split(r'(^\s*```\w*\s*$)', text, flags=re.MULTILINE)
    result = []
    i = 0
    while i < len(blocks):
        line = blocks[i].strip()
        if line.startswith('```'):
            lang = line[3:].strip() or 'text'
            code = blocks[i + 1] if i + 1 < len(blocks) else ''
            end_idx = i + 2
            if (end_idx < len(blocks)
                    and blocks[end_idx].strip().startswith('```')):
                end_idx += 1
            code = re.sub(r'\n?\s*```\s*$', '', code)
            highlighted = highlight_code(code, lang)
            result.append(
                f'\n<div class="code-block-wrapper">\n'
                f'{highlighted}\n</div>\n'
            )
            i = end_idx
        else:
            result.append(blocks[i])
            i += 1
    return '\n'.join(result)

# ─── Load config ───────────────────────────────────────────────────────
def load_config(path):
    """Load site configuration from _config.yml."""
    with open(path) as f:
        return yaml.safe_load(f)

# ─── Load posts ────────────────────────────────────────────────────────
def load_posts(posts_dir):
    """Load and parse all .md files from the posts directory."""
    posts = []
    for f in sorted(posts_dir.glob('*.md')):
        text = f.read_text()
        meta, body = parse_frontmatter(text)
        date_str = meta.get('date', f.stem)
        try:
            date = datetime.fromisoformat(date_str)
        except Exception:
            date = datetime.strptime(date_str[:10], '%Y-%m-%d')
        slug = f.stem.split('-', 3)[-1] if len(f.stem.split('-')) > 3 else f.stem
        meta['slug'] = slug
        meta['date'] = date
        meta['date_str'] = date.strftime('%Y-%m-%d')
        meta['date_display'] = date.strftime('%B %d, %Y')
        meta['body'] = body
        posts.append(meta)
    posts.sort(key=lambda p: p['date'], reverse=True)
    return posts

# ─── Load tabs ─────────────────────────────────────────────────────────
def load_tabs(tabs_dir):
    """Load and parse all .md files from the tabs directory."""
    tabs = []
    for f in sorted(tabs_dir.glob('*.md')):
        text = f.read_text()
        meta, body = parse_frontmatter(text)
        meta['slug'] = f.stem
        meta['body'] = body
        meta['order'] = meta.get('order', 99)
        tabs.append(meta)
    tabs.sort(key=lambda t: t['order'])
    return tabs

# ─── Render markdown to HTML ──────────────────────────────────────────
def render_md(text):
    """Convert markdown to HTML with Pygments code highlighting."""
    text = preprocess_code_blocks(text)
    md = markdown.Markdown(extensions=MD_EXTENSIONS)
    return md.convert(text)

# ─── Collect categories/tags ──────────────────────────────────────────
def collect_categories(posts):
    """Group posts by category."""
    cats = {}
    for p in posts:
        for c in p.get('categories', []):
            cats.setdefault(c, []).append(p)
    return cats

def collect_tags(posts):
    """Group posts by tag."""
    tags = {}
    for p in posts:
        for t in p.get('tags', []):
            tags.setdefault(t, []).append(p)
    return tags

# ─── Clean markdown for excerpts ────────────────────────
def clean_excerpt(text, max_len=200):
    """Clean raw markdown for use as a post excerpt.

    Strips headers, cleans links to show only text, removes
    code blocks, and truncates to max_len.
    """
    lines = text.split('\n')
    cleaned = []
    for line in lines:
        # Skip headers
        if re.match(r'^#+\s', line):
            continue
        # Skip horizontal rules
        if re.match(r'^---+\s*$', line):
            continue
        cleaned.append(line)

    result = ' '.join(cleaned)

    # Clean markdown links: [text](url) -> text
    result = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', result)

    # Clean inline code
    result = re.sub(r'`([^`]+)`', r'\1', result)

    # Clean bold/italic
    result = re.sub(r'\*\*([^*]+)\*\*', r'\1', result)
    result = re.sub(r'\*([^*]+)\*', r'\1', result)

    # Truncate
    if len(result) > max_len:
        result = result[:200] + '...'

    return result

# ─── HTML template helpers ────────────────────────────────────────────
def _nav_links(active_page=None):
    """Generate the shared sidebar navigation links."""
    items = [
        ('home',     '/',       'icon-home',    'Home'),
        ('archives', '/archives/', 'icon-archive', 'Archives'),
        ('categories', '/categories/', 'icon-stream', 'Categories'),
        ('tags',     '/tags/',  'icon-tags',    'Tags'),
        ('about',    '/about/', 'icon-info',    'About'),
        ('peering',  '/peering/', 'icon-link',  'Peering'),
        ('graphs',   '/graphs/', 'icon-chart',  'Graphs'),
    ]
    lines = []
    for key, href, icon, label in items:
        cls = ' class="active"' if key == active_page else ''
        lines.append(
            f'                <li{cls}><a href="{href}" data-nav="{key}">'
            f'<i class="icon {icon}"></i> {label}</a></li>'
        )
    return '\n'.join(lines)

def _sidebar(config, active_page=None):
    """Generate the shared sidebar navigation panel."""
    nav = _nav_links(active_page)
    gh = config.get('github', {}).get('username', '')
    tw = config.get('twitter', {}).get('username', '')
    avatar = config.get('avatar', '')
    logo_html = ''
    if avatar:
        logo_html = f'<img src="{avatar}" alt="{config["title"]} logo" class="nav-logo">'
    return f"""    <nav id="sidebar">
        <div class="nav-overlay" id="navOverlay"></div>
        <div class="nav-content">
            <div class="nav-header">
                {logo_html}
                <h1 class="site-title">{config['title']}</h1>
                <p class="site-tagline">{config.get('tagline', '')}</p>
            </div>
            <ul class="nav-links">
{nav}
            </ul>
            <div class="nav-footer">
                <a href="https://github.com/{gh}" target="_blank">
                    <i class="icon icon-github"></i></a>
                <a href="https://twitter.com/{tw}" target="_blank">
                    <i class="icon icon-twitter"></i></a>
            </div>
        </div>
    </nav>"""

def _shell(config, body_html, page_type='home'):
    """Wrap body content in the full HTML document shell."""
    sidebar = _sidebar(config, page_type)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{config['title']} | {config.get('tagline', '')}</title>
    <meta name="description" content="{config.get('description', config.get('tagline', ''))}">
    <link rel="stylesheet" href="/css/style.css">
    <link rel="icon" href="/assets/img/favicon.ico" type="image/x-icon">
</head>
<body data-page="{page_type}">
    <canvas id="bg-canvas"></canvas>
    <div id="particles"></div>
    <div class="progress-bar" id="progressBar"></div>
{sidebar}
    <button id="menuToggle" class="menu-toggle" aria-label="Toggle menu">
        <span></span><span></span><span></span>
    </button>
    <button id="themeToggle" class="theme-toggle" aria-label="Toggle theme">
        <span class="theme-icon">&#9728;</span>
    </button>
    <button id="backToTop" class="back-to-top" aria-label="Back to top">&#8593;</button>
{body_html}
    <footer class="site-footer">
        <p>&copy; {datetime.now().year}
            {config.get('social', {}).get('name', '')}
            | {config['title']}</p>
    </footer>
    <script src="/js/main.js"></script>
</body>
</html>"""

# ─── Generate pages ───────────────────────────────────────────────────
def generate_post_page(post, config):
    """Generate HTML for a single post."""
    html_body = render_md(post['body'])
    slug = post['slug']
    title = post.get('title', slug)
    cats = ' &middot; '.join(
        f'<a href="/categories/{re.sub(r"[^a-z0-9]+", "-", c.lower()).strip("-")}/" class="category-link">{c}</a>'
        for c in post.get('categories', [])
    )
    tags = ' '.join(
        f'<span class="tag">{t}</span>' for t in post.get('tags', [])
    )

    main = f"""    <main class="container">
        <article class="post">
            <header class="post-header">
                <div class="post-meta-top">
                    <span class="post-date">{post['date_display']}</span>
                    <span class="post-categories">{cats}</span>
                </div>
                <h1 class="post-title">{title}</h1>
            </header>
            <div class="post-content">
                {html_body}
            </div>
            <footer class="post-footer">
                <div class="post-tags">{tags}</div>
                <div class="post-nav">
                    <a href="/" class="back-link">&larr; Back to posts</a>
                </div>
            </footer>
        </article>
    </main>"""

    # Override <title> for posts
    full = _shell(config, main, 'post')
    full = full.replace(
        f"<title>{config['title']} | {config.get('tagline', '')}</title>",
        f"<title>{title} | {config['title']}</title>",
        1,
    )
    return full


def generate_index(posts, config, tabs):
    """Generate the home page with post list."""
    post_cards = ""
    for p in posts:
        excerpt = clean_excerpt(p['body'])
        cats = ' &middot; '.join(
            f'<a href="/categories/{re.sub(r"[^a-z0-9]+", "-", c.lower()).strip("-")}/" class="category-link">{c}</a>'
            for c in p.get('categories', [])
        )
        post_cards += f"""
        <article class="post-card" data-slug="{p['slug']}">
            <div class="card-glow"></div>
            <div class="card-content">
                <div class="card-meta">
                    <span class="card-date">{p['date_display']}</span>
                    <span class="card-categories">{cats}</span>
                </div>
                <h2 class="card-title">
                    <a href="/posts/{p['slug']}/">{p.get('title', p['slug'])}</a>
                </h2>
                <p class="card-excerpt">{excerpt}</p>
                <a href="/posts/{p['slug']}/" class="card-read-more">
                    Read more &rarr;</a>
            </div>
        </article>"""

    cats_count = len(collect_categories(posts))
    tags_count = len(collect_tags(posts))

    avatar = config.get('avatar', '')
    logo_html = ''
    if avatar:
        logo_html = f'<img src="{avatar}" alt="{config["title"]} logo" class="hero-logo">'

    main = f"""    <main class="container">
        <header class="hero">
            <div class="hero-content">
                {logo_html}
                <h1 class="hero-title glitch"
                    data-text="{config['title']}">{config['title']}</h1>
                <p class="hero-tagline">{config.get('tagline', '')}</p>
                <div class="hero-stats">
                    <div class="stat">
                        <a href="/archives/" class="stat-link">
                        <span class="stat-num">{len(posts)}</span>
                        <span class="stat-label">Posts</span></a></div>
                    <div class="stat">
                        <a href="/categories/" class="stat-link">
                        <span class="stat-num">{cats_count}</span>
                        <span class="stat-label">Categories</span></a></div>
                    <div class="stat">
                        <a href="/tags/" class="stat-link">
                        <span class="stat-num">{tags_count}</span>
                        <span class="stat-label">Tags</span></a></div>
                </div>
            </div>
        </header>
        <section class="posts-grid">{post_cards}
        </section>
    </main>"""

    return _shell(config, main, 'home')


def generate_tab_page(tab, posts, config):
    """Generate a static tab page (about, peering, graphs, etc.)."""
    slug = tab['slug']
    title = slug.capitalize()
    body_html = render_md(tab['body'])

    # Special handling for archives - inject post list
    if slug == 'archives':
        archive_html = '<div class="timeline">'
        current_year = None
        for p in posts:
            year = p['date'].year
            if year != current_year:
                if current_year is not None:
                    archive_html += '</ul>'
                archive_html += (
                    f'<h2 class="timeline-year">{year}</h2><ul>'
                )
                current_year = year
            archive_html += (
                f'<li class="timeline-item">'
                f'<a href="/posts/{p["slug"]}/">'
                f'<span class="timeline-date">'
                f'{p["date"].strftime("%b %d")}</span> '
                f'{p.get("title", p["slug"])}</a></li>'
            )
        archive_html += '</ul></div>'
        body_html = archive_html

    # Special handling for categories
    if slug == 'categories':
        cats = collect_categories(posts)
        cat_html = '<div class="categories-grid">'
        for cat, cat_posts in sorted(cats.items()):
            cat_slug = re.sub(r'[^a-z0-9]+', '-', cat.lower()).strip('-')
            cat_html += (
                f'<div class="category-card">'
                f'<h3><a href="/categories/{cat_slug}/">{cat}</a></h3>'
                f'<span class="cat-count">{len(cat_posts)} posts</span>'
                f'</div>'
            )
        cat_html += '</div>'
        body_html = cat_html

    # Special handling for tags
    if slug == 'tags':
        tags = collect_tags(posts)
        tag_html = '<div class="tag-cloud">'
        for tag, tag_posts in sorted(tags.items()):
            tag_slug = re.sub(r'[^a-z0-9]+', '-', tag.lower()).strip('-')
            size = min(len(tag_posts) * 0.8 + 1, 2.5)
            tag_html += (
                f'<a href="/tags/{tag_slug}/" class="tag-pill" '
                f'style="font-size:{size}rem">'
                f'{tag} <span>({len(tag_posts)})</span></a>'
            )
        tag_html += '</div>'
        body_html = tag_html

    main = f"""    <main class="container">
        <div class="page">
            <h1 class="page-title">{title}</h1>
            <div class="page-content">{body_html}
            </div>
        </div>
    </main>"""

    full = _shell(config, main, 'tab')
    full = full.replace(
        f"<title>{config['title']} | {config.get('tagline', '')}</title>",
        f"<title>{title} | {config['title']}</title>",
        1,
    )
    return full

# ─── Generate category page ─────────────────────────────
def generate_category_page(cat_name, cat_posts, config):
    """Generate a page listing posts for a specific category."""
    post_list_html = ''
    for p in cat_posts:
        post_list_html += f"""
        <div class="category-post-item">
            <span class="category-post-date">{p['date_display']}</span>
            <a href="/posts/{p['slug']}/" class="category-post-title">{p.get('title', p['slug'])}</a>
        </div>"""

    main = f"""    <main class="container">
        <div class="page">
            <h1 class="page-title">Category: {cat_name}</h1>
            <div class="page-content">
                <p class="category-intro">{len(cat_posts)} posts in this category</p>
                <div class="category-posts-list">{post_list_html}
                </div>
                <a href="/categories/" class="back-link">&larr; Back to categories</a>
            </div>
        </div>
    </main>"""

    full = _shell(config, main, 'tab')
    full = full.replace(
        f"<title>{config['title']} | {config.get('tagline', '')}</title>",
        f"<title>{cat_name} | {config['title']}</title>",
        1,
    )
    return full

# ─── Generate tag page ──────────────────────────────────
def generate_tag_page(tag_name, tag_posts, config):
    """Generate a page listing posts for a specific tag."""
    post_list_html = ''
    for p in tag_posts:
        post_list_html += f"""
        <div class="category-post-item">
            <span class="category-post-date">{p['date_display']}</span>
            <a href="/posts/{p['slug']}/" class="category-post-title">{p.get('title', p['slug'])}</a>
        </div>"""

    main = f"""    <main class="container">
        <div class="page">
            <h1 class="page-title">Tag: {tag_name}</h1>
            <div class="page-content">
                <p class="category-intro">{len(tag_posts)} posts with this tag</p>
                <div class="category-posts-list">{post_list_html}
                </div>
                <a href="/tags/" class="back-link">&larr; Back to tags</a>
            </div>
        </div>
    </main>"""

    full = _shell(config, main, 'tab')
    full = full.replace(
        f"<title>{config['title']} | {config.get('tagline', '')}</title>",
        f"<title>{tag_name} | {config['title']}</title>",
        1,
    )
    return full

# ─── CLI ───────────────────────────────────────────────────────────────
def parse_args():
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description='Generate a static blog from Jekyll-style markdown.',
    )
    parser.add_argument(
        '-s', '--source', default='.',
        help='Source directory containing _posts, _tabs, _config.yml, assets '
             '(default: current directory)',
    )
    parser.add_argument(
        '-o', '--output', default='_site',
        help='Output directory for the generated site (default: _site)',
    )
    parser.add_argument(
        '--serve', action='store_true',
        help='Start a local HTTP server after generating',
    )
    parser.add_argument(
        '--port', type=int, default=8899,
        help='Port for the local server (default: 8899)',
    )
    return parser.parse_args()


def main(args=None):
    """Entry point: parse args, load content, generate site."""
    opts = parse_args() if args is None else args
    base = Path(opts.source).resolve()
    output = Path(opts.output).resolve() if Path(opts.output).is_absolute() \
        else base / opts.output

    posts_dir = base / '_posts'
    tabs_dir = base / '_tabs'
    assets_dir = base / 'assets'
    config_file = base / '_config.yml'

    # Validate source structure
    for d, label in [(posts_dir, '_posts'), (tabs_dir, '_tabs'),
                     (config_file, '_config.yml')]:
        if not d.exists():
            print(f'Error: {label} not found at {d}', file=sys.stderr)
            sys.exit(1)
    if assets_dir.exists():
        print(f'Source: {base}')
        print(f'Output: {output}')
        print()

    # Load content
    print('Loading config...')
    config = load_config(config_file)

    print('Loading posts...')
    posts = load_posts(posts_dir)
    print(f'  Found {len(posts)} posts')

    print('Loading tabs...')
    tabs = load_tabs(tabs_dir)
    print(f'  Found {len(tabs)} tabs')

    # Clean output
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)

    # Copy assets
    if assets_dir.exists():
        print('Copying assets...')
        shutil.copytree(assets_dir, output / 'assets')

    # Copy favicon to expected location
    favicon_src = assets_dir / 'img' / 'favicons' / 'favicon.ico'
    if favicon_src.exists():
        (output / 'assets' / 'img').mkdir(parents=True, exist_ok=True)
        shutil.copy2(favicon_src, output / 'assets' / 'img' / 'favicon.ico')

    # Generate CSS/JS from template files
    print('Generating CSS...')
    css_src = Path(__file__).parent / 'style.css'
    if css_src.exists():
        (output / 'css').mkdir(parents=True, exist_ok=True)
        shutil.copy2(css_src, output / 'css' / 'style.css')
    else:
        print('  WARNING: style.css not found, skipping', file=sys.stderr)

    print('Generating JS...')
    js_src = Path(__file__).parent / 'main.js'
    if js_src.exists():
        (output / 'js').mkdir(parents=True, exist_ok=True)
        shutil.copy2(js_src, output / 'js' / 'main.js')
    else:
        print('  WARNING: main.js not found, skipping', file=sys.stderr)

    # Generate index
    print('Generating index...')
    (output / 'index.html').write_text(
        generate_index(posts, config, tabs), encoding='utf-8'
    )

    # Generate post pages
    print('Generating posts...')
    for p in posts:
        post_dir = output / 'posts' / p['slug']
        post_dir.mkdir(parents=True, exist_ok=True)
        (post_dir / 'index.html').write_text(
            generate_post_page(p, config), encoding='utf-8'
        )

    # Generate tab pages
    print('Generating tabs...')
    for t in tabs:
        tab_dir = output / t['slug']
        tab_dir.mkdir(parents=True, exist_ok=True)
        (tab_dir / 'index.html').write_text(
            generate_tab_page(t, posts, config), encoding='utf-8'
        )

    # Generate category pages
    print('Generating category pages...')
    cats = collect_categories(posts)
    for cat, cat_posts in cats.items():
        cat_slug = re.sub(r'[^a-z0-9]+', '-', cat.lower()).strip('-')
        cat_page_dir = output / 'categories' / cat_slug
        cat_page_dir.mkdir(parents=True, exist_ok=True)
        (cat_page_dir / 'index.html').write_text(
            generate_category_page(cat, cat_posts, config), encoding='utf-8'
        )

    # Generate tag pages
    print('Generating tag pages...')
    tags = collect_tags(posts)
    for tag, tag_posts in tags.items():
        tag_slug = re.sub(r'[^a-z0-9]+', '-', tag.lower()).strip('-')
        tag_page_dir = output / 'tags' / tag_slug
        tag_page_dir.mkdir(parents=True, exist_ok=True)
        (tag_page_dir / 'index.html').write_text(
            generate_tag_page(tag, tag_posts, config), encoding='utf-8'
        )

    # Generate robots.txt
    print('Generating robots.txt...')
    site_url = config.get('url', '').rstrip('/')
    (output / 'robots.txt').write_text(
        f'User-agent: *\n\n'
        f'Disallow: /norobots/\n\n'
        f'Sitemap: {site_url}/sitemap.xml\n',
        encoding='utf-8',
    )

    # Generate llms.txt
    print('Generating llms.txt...')
    site_title = config.get('title', '')
    site_tagline = config.get('tagline', '')
    llms_lines = [
        f'# {site_title}',
        f'',
        f'{site_tagline}',
        f'',
        f'{len(posts)} posts covering networking topics.',
        f'',
        f'## Navigation',
        f'',
    ]
    # List all pages with brief descriptions
    page_descriptions = [
        ('/', 'Home page with latest posts'),
        ('/archives/', 'Chronological post archive'),
        ('/categories/', 'Posts grouped by category'),
        ('/tags/', 'Posts grouped by tag'),
        ('/about/', 'About the author'),
        ('/peering/', 'Peering information'),
        ('/graphs/', 'Network graphs'),
    ]
    for path, desc in page_descriptions:
        llms_lines.append(f'- [{desc}]({site_url}{path})')
    llms_lines.append('')
    llms_lines.append('## Posts')
    llms_lines.append('')
    for p in posts:
        llms_lines.append(
            f'- [{p.get("title", p["slug"])}]({site_url}/posts/{p["slug"]}/) '
            f'({p["date_str"]})'
        )
    llms_lines.append('')
    (output / 'llms.txt').write_text(
        '\n'.join(llms_lines), encoding='utf-8',
    )

    print(f'\nDone! Site generated at: {output}')

    # Optional local server
    if getattr(opts, 'serve', False):
        port = getattr(opts, 'port', 8899)
        print(f'\nServing at http://localhost:{port} (Ctrl+C to stop)')
        import http.server
        import socketserver
        os.chdir(output)
        handler = http.server.SimpleHTTPRequestHandler
        with socketserver.TCPServer(('', port), handler) as httpd:
            httpd.serve_forever()


if __name__ == '__main__':
    main()
