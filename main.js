// ═══════════════════════════════════════════════════════════
// CMHMR Blog - Interactive JavaScript
// 3D network background, particles, animations, UX
// ═══════════════════════════════════════════════════════════

(function() {
    'use strict';

    // ─── Theme Management ────────────────────────────────
    const Theme = {
        get() {
            return localStorage.getItem('theme') || 'dark';
        },
        set(val) {
            localStorage.setItem('theme', val);
            document.documentElement.setAttribute('data-theme', val);
            const icon = document.querySelector('.theme-icon');
            if (icon) icon.textContent = val === 'dark' ? '☀' : '🌙';
        },
        toggle() {
            this.set(this.get() === 'dark' ? 'light' : 'dark');
        }
    };

    // ─── Sidebar ─────────────────────────────────────────
    const Sidebar = {
        el: null,
        toggle: null,
        open() {
            this.el.classList.add('open');
            this.toggle.classList.add('active');
        },
        close() {
            this.el.classList.remove('open');
            this.toggle.classList.remove('active');
        },
        toggleFn() {
            this.el.classList.contains('open') ? this.close() : this.open();
        },
        init() {
            this.el = document.getElementById('sidebar');
            this.toggle = document.getElementById('menuToggle');
            if (!this.el || !this.toggle) return;
            this.toggle.addEventListener('click', () => this.toggleFn());
            document.getElementById('navOverlay')?.addEventListener('click', () => this.close());
            // Close on nav link click
            this.el.querySelectorAll('[data-nav]').forEach(link => {
                link.addEventListener('click', () => this.close());
            });
            // Close on Escape
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') this.close();
            });
        }
    };

    // ─── Reading Progress Bar ────────────────────────────
    const Progress = {
        el: null,
        init() {
            this.el = document.getElementById('progressBar');
            if (!this.el) return;
            window.addEventListener('scroll', () => this.update(), { passive: true });
            this.update();
        },
        update() {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
            this.el.style.width = progress + '%';
        }
    };

    // ─── Back to Top ─────────────────────────────────────
    const BackToTop = {
        el: null,
        init() {
            this.el = document.getElementById('backToTop');
            if (!this.el) return;
            window.addEventListener('scroll', () => {
                this.el.classList.toggle('visible', window.scrollY > 400);
            }, { passive: true });
            this.el.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }
    };

    // ─── Scroll Animations (Intersection Observer) ──────
    const ScrollAnimations = {
        init() {
            const cards = document.querySelectorAll('.post-card');
            if (!cards.length) return;
            const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry, i) => {
                    if (entry.isIntersecting) {
                        setTimeout(() => {
                            entry.target.classList.add('visible');
                        }, i * 80);
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.1 });
            cards.forEach(card => observer.observe(card));
        }
    };

    // ─── Floating Particles ──────────────────────────────
    const Particles = {
        container: null,
        count: 30,
        init() {
            this.container = document.getElementById('particles');
            if (!this.container) return;
            for (let i = 0; i < this.count; i++) {
                this.create();
            }
        },
        create() {
            const p = document.createElement('div');
            p.className = 'particle';
            p.style.left = Math.random() * 100 + '%';
            p.style.animationDuration = (Math.random() * 15 + 10) + 's';
            p.style.animationDelay = (Math.random() * 10) + 's';
            p.style.width = p.style.height = (Math.random() * 3 + 1) + 'px';
            this.container.appendChild(p);
        }
    };

    // ─── 3D Network Background (Canvas) ──────────────────
    const Network3D = {
        canvas: null,
        ctx: null,
        nodes: [],
        edges: [],
        width: 0,
        height: 0,
        mouse: { x: 0, y: 0 },
        nodeCount: 80,
        connectionDist: 150,
        animId: null,
        time: 0,

        init() {
            this.canvas = document.getElementById('bg-canvas');
            if (!this.canvas) return;
            this.ctx = this.canvas.getContext('2d');
            this.resize();
            this.createNodes();
            this.createEdges();
            this.bindEvents();
            this.animate();
        },

        resize() {
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.canvas.width = this.width;
            this.canvas.height = this.height;
        },

        createNodes() {
            this.nodes = [];
            for (let i = 0; i < this.nodeCount; i++) {
                this.nodes.push({
                    x: Math.random() * this.width,
                    y: Math.random() * this.height,
                    z: Math.random() * 300,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: (Math.random() - 0.5) * 0.5,
                    vz: (Math.random() - 0.5) * 0.3,
                    radius: Math.random() * 2 + 1,
                    pulse: Math.random() * Math.PI * 2,
                    pulseSpeed: Math.random() * 0.02 + 0.01,
                });
            }
        },

        createEdges() {
            this.edges = [];
            for (let i = 0; i < this.nodes.length; i++) {
                for (let j = i + 1; j < this.nodes.length; j++) {
                    const dx = this.nodes[i].x - this.nodes[j].x;
                    const dy = this.nodes[i].y - this.nodes[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < this.connectionDist) {
                        this.edges.push({ a: i, b: j, dist });
                    }
                }
            }
        },

        bindEvents() {
            window.addEventListener('resize', () => {
                this.resize();
                this.createNodes();
                this.createEdges();
            });
            window.addEventListener('mousemove', (e) => {
                this.mouse.x = e.clientX;
                this.mouse.y = e.clientY;
            });
        },

        project(x, y, z) {
            const perspective = 800;
            const scale = perspective / (perspective + z);
            return {
                x: (x - this.width / 2) * scale + this.width / 2,
                y: (y - this.height / 2) * scale + this.height / 2,
                scale
            };
        },

        animate() {
            this.time += 0.016;
            this.ctx.clearRect(0, 0, this.width, this.height);

            // Update nodes
            for (const node of this.nodes) {
                node.x += node.vx;
                node.y += node.vy;
                node.z += node.vz;
                node.pulse += node.pulseSpeed;

                // Bounce off edges
                if (node.x < 0 || node.x > this.width) node.vx *= -1;
                if (node.y < 0 || node.y > this.height) node.vy *= -1;
                if (node.z < 0 || node.z > 300) node.vz *= -1;

                // Mouse interaction
                const dx = this.mouse.x - node.x;
                const dy = this.mouse.y - node.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 200) {
                    const force = (200 - dist) / 200 * 0.02;
                    node.vx -= dx * force * 0.01;
                    node.vy -= dy * force * 0.01;
                }

                // Damping
                node.vx *= 0.999;
                node.vy *= 0.999;
            }

            // Draw edges
            const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
            const baseColor = isDark ? '0, 212, 255' : '0, 136, 204';

            for (const edge of this.edges) {
                const a = this.nodes[edge.a];
                const b = this.nodes[edge.b];
                const pa = this.project(a.x, a.y, a.z);
                const pb = this.project(b.x, b.y, b.z);

                const dx = pa.x - pb.x;
                const dy = pa.y - pb.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const opacity = Math.max(0, 1 - dist / this.connectionDist) * 0.3;

                this.ctx.beginPath();
                this.ctx.moveTo(pa.x, pa.y);
                this.ctx.lineTo(pb.x, pb.y);
                this.ctx.strokeStyle = `rgba(${baseColor}, ${opacity})`;
                this.ctx.lineWidth = 0.5 * pa.scale;
                this.ctx.stroke();
            }

            // Draw nodes
            for (const node of this.nodes) {
                const p = this.project(node.x, node.y, node.z);
                const pulseFactor = Math.sin(node.pulse) * 0.3 + 0.7;
                const radius = node.radius * p.scale * pulseFactor;

                // Glow
                const gradient = this.ctx.createRadialGradient(
                    p.x, p.y, 0,
                    p.x, p.y, radius * 4
                );
                gradient.addColorStop(0, `rgba(${baseColor}, ${0.4 * p.scale})`);
                gradient.addColorStop(1, `rgba(${baseColor}, 0)`);
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, radius * 4, 0, Math.PI * 2);
                this.ctx.fillStyle = gradient;
                this.ctx.fill();

                // Core
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(${baseColor}, ${0.8 * p.scale})`;
                this.ctx.fill();
            }

            // Draw data streams (animated lines)
            this.drawDataStreams();

            this.animId = requestAnimationFrame(() => this.animate());
        },

        drawDataStreams() {
            const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
            const baseColor = isDark ? '0, 212, 255' : '0, 136, 204';

            // Animate a few "data packets" along edges
            for (let i = 0; i < 5; i++) {
                const edgeIdx = Math.floor((this.time * 10 + i * 37) % this.edges.length);
                const edge = this.edges[edgeIdx];
                if (!edge) continue;

                const a = this.nodes[edge.a];
                const b = this.nodes[edge.b];
                const pa = this.project(a.x, a.y, a.z);
                const pb = this.project(b.x, b.y, b.z);

                const t = ((this.time * 2 + i * 0.2) % 1);
                const x = pa.x + (pb.x - pa.x) * t;
                const y = pa.y + (pb.y - pa.y) * t;

                const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, 8);
                gradient.addColorStop(0, `rgba(${baseColor}, 0.8)`);
                gradient.addColorStop(1, `rgba(${baseColor}, 0)`);
                this.ctx.beginPath();
                this.ctx.arc(x, y, 8, 0, Math.PI * 2);
                this.ctx.fillStyle = gradient;
                this.ctx.fill();
            }
        }
    };

    // ─── Typing Effect for Hero ──────────────────────────
    const TypingEffect = {
        el: null,
        text: '',
        speed: 50,
        init() {
            this.el = document.querySelector('.hero-tagline');
            if (!this.el) return;
            this.text = this.el.textContent;
            this.el.textContent = '';
            this.el.style.borderRight = '2px solid var(--accent)';
            this.type(0);
        },
        type(i) {
            if (i < this.text.length) {
                this.el.textContent = this.text.substring(0, i + 1);
                setTimeout(() => this.type(i + 1), this.speed);
            } else {
                // Remove cursor after typing
                setTimeout(() => {
                    this.el.style.borderRight = 'none';
                }, 1000);
            }
        }
    };

    // ─── Smooth number counting for stats ────────────────
    const Counter = {
        init() {
            const nums = document.querySelectorAll('.stat-num');
            nums.forEach(el => {
                const target = parseInt(el.textContent);
                if (isNaN(target)) return;
                el.textContent = '0';
                const observer = new IntersectionObserver((entries) => {
                    if (entries[0].isIntersecting) {
                        this.animate(el, target);
                        observer.unobserve(el);
                    }
                }, { threshold: 0.5 });
                observer.observe(el);
            });
        },
        animate(el, target) {
            let current = 0;
            const step = Math.max(1, Math.floor(target / 30));
            const interval = setInterval(() => {
                current += step;
                if (current >= target) {
                    current = target;
                    clearInterval(interval);
                }
                el.textContent = current;
            }, 30);
        }
    };

    // ─── Keyboard Shortcuts ──────────────────────────────
    const Shortcuts = {
        init() {
            document.addEventListener('keydown', (e) => {
                // Ctrl+K or Cmd+K to toggle sidebar
                if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                    e.preventDefault();
                    Sidebar.toggleFn();
                }
                // T to toggle theme
                if (e.key === 't' && !e.ctrlKey && !e.metaKey &&
                    !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
                    Theme.toggle();
                }
            });
        }
    };

    // ─── Image Lazy Loading with fade-in ─────────────────
    const ImageLoader = {
        init() {
            const images = document.querySelectorAll('.post-content img, .page-content img');
            images.forEach(img => {
                img.style.opacity = '0';
                img.style.transition = 'opacity 0.5s ease';
                if (img.complete) {
                    img.style.opacity = '1';
                } else {
                    img.addEventListener('load', () => {
                        img.style.opacity = '1';
                    });
                    img.addEventListener('error', () => {
                        img.style.opacity = '1';
                    });
                }
            });
        }
    };

    // ─── Console Easter Egg ──────────────────────────────
    const EasterEgg = {
        init() {
            const styles = 'font-size: 16px; font-weight: bold; color: #00d4ff;';
            console.log(
                '%c Welcome to the network! ',
                styles
            );
            console.log(
                '%c Shortcuts: Ctrl+K (menu) | T (theme) | Esc (close menu) ',
                'color: #8888a0;'
            );
        }
    };

    // ─── Initialize Everything ───────────────────────────
    function init() {
        // Apply saved theme
        Theme.set(Theme.get());

        // Initialize components
        Sidebar.init();
        Progress.init();
        BackToTop.init();
        Particles.init();
        Network3D.init();
        ScrollAnimations.init();
        TypingEffect.init();
        Counter.init();
        Shortcuts.init();
        ImageLoader.init();
        EasterEgg.init();
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
