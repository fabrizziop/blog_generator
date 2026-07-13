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
            if (icon) icon.textContent = val === 'dark' ? '🌞' : '🌙';
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
        count: 120,
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
            p.style.animationDuration = (Math.random() * 20 + 8) + 's';
            p.style.animationDelay = (Math.random() * 20) + 's';
            p.style.width = p.style.height = (Math.random() * 4 + 1) + 'px';
            this.container.appendChild(p);
        }
    };

    // ─── 3D Constellation Background (Canvas, low-complexity) ──
    const Network3D = {
        canvas: null,
        ctx: null,
        nodes: [],
        edges: [],
        packets: [],
        width: 0,
        height: 0,
        mouse: { x: 0, y: 0, active: false },
        targetRotX: 0,
        targetRotY: 0,
        targetRotZ: 0,
        animId: null,
        time: 0,
        lastFrameTime: 0,
        rotationSpeed: 0.001,
        rotX: 0,
        rotY: 0,
        rotZ: 0,
        // Constellation parameters
        nodeCount: 40,
        radius: 300,
        depth: 150,
        connectionDist: 200,
        // FPS cap — 30fps is plenty for ambient background
        frameInterval: 33,

        isMobile() {
            return window.innerWidth < 768 || 'ontouchstart' in window;
        },

        init() {
            this.canvas = document.getElementById('bg-canvas');
            if (!this.canvas) return;
            this.ctx = this.canvas.getContext('2d');
            this.resize();
            this.buildConstellation();
            this.spawnPackets();
            this.bindEvents();
            this.animate();
        },

        resize() {
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.canvas.width = this.width;
            this.canvas.height = this.height;
            this.radius = Math.max(this.width, this.height) * 0.5;
            this.depth = this.radius * 0.5;
            // Mobile gets fewer nodes
            this.nodeCount = this.isMobile() ? 20 : 40;
            this.buildConstellation();
            this.spawnPackets();
        },

        buildConstellation() {
            this.nodes = [];
            this.edges = [];

            // Scatter nodes in a sphere — Fibonacci distribution for even spread
            const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle
            for (let i = 0; i < this.nodeCount; i++) {
                const y = 1 - (i / (this.nodeCount - 1)) * 2; // -1 to 1
                const radiusAtY = Math.sqrt(1 - y * y);
                const theta = phi * i;
                const x = Math.cos(theta) * radiusAtY;
                const z = Math.sin(theta) * radiusAtY;
                this.nodes.push({
                    ox: x * this.radius,
                    oy: y * this.radius * 0.5,
                    oz: z * this.depth,
                    pulse: Math.random() * Math.PI * 2,
                    pulseSpeed: 0.01 + Math.random() * 0.015,
                    radius: 1 + Math.random() * 1.5,
                });
            }

            // Connect nearby nodes — O(n²) but n is small (20-40)
            for (let i = 0; i < this.nodes.length; i++) {
                for (let j = i + 1; j < this.nodes.length; j++) {
                    const a = this.nodes[i];
                    const b = this.nodes[j];
                    const dx = a.ox - b.ox;
                    const dy = a.oy - b.oy;
                    const dz = a.oz - b.oz;
                    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                    if (dist < this.connectionDist) {
                        this.edges.push({ a: i, b: j, distNorm: dist / this.connectionDist });
                    }
                }
            }
        },

        spawnPackets() {
            this.packets = [];
            const count = this.isMobile() ? 2 : 5;
            for (let i = 0; i < count && this.edges.length; i++) {
                const edgeIdx = Math.floor(Math.random() * this.edges.length);
                this.packets.push({
                    edge: edgeIdx,
                    t: Math.random(),
                    speed: 0.003 + Math.random() * 0.004,
                    size: 2 + Math.random() * 2,
                });
            }
        },

        bindEvents() {
            window.addEventListener('resize', () => {
                this.resize();
            });
            // Skip mouse tracking on mobile
            if (!this.isMobile()) {
                window.addEventListener('mousemove', (e) => {
                    this.mouse.x = e.clientX;
                    this.mouse.y = e.clientY;
                    this.mouse.active = true;
                    const mx = (e.clientX - this.width / 2) / (this.width / 2);
                    const my = (e.clientY - this.height / 2) / (this.height / 2);
                    this.targetRotY = mx * 0.5;
                    this.targetRotX = my * 0.3;
                });
                window.addEventListener('mouseleave', () => {
                    this.mouse.active = false;
                    this.targetRotX = 0;
                    this.targetRotY = 0;
                });
            }
        },

        rotatePoint(x, y, z) {
            // Y rotation
            const cosY = Math.cos(this.rotY);
            const sinY = Math.sin(this.rotY);
            const x1 = x * cosY - z * sinY;
            const z1 = x * sinY + z * cosY;
            // X rotation
            const cosX = Math.cos(this.rotX);
            const sinX = Math.sin(this.rotX);
            const y1 = y * cosX - z1 * sinX;
            const z2 = y * sinX + z1 * cosX;
            // Z rotation
            const cosZ = Math.cos(this.rotZ);
            const sinZ = Math.sin(this.rotZ);
            const x2 = x1 * cosZ - y1 * sinZ;
            const y2 = x1 * sinZ + y1 * cosZ;
            return { x: x2, y: y2, z: z2 };
        },

        project(x, y, z) {
            const perspective = 1200;
            const zOffset = 800;
            const scale = perspective / (perspective + z + zOffset);
            return {
                x: x * scale + this.width / 2,
                y: y * scale + this.height / 2,
                scale: scale,
                z: z,
            };
        },

        getColor() {
            const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
            if (isDark) {
                return { r: 0, g: 212, b: 255 };
            }
            return { r: 0, g: 60, b: 120 };
        },

        animate(timestamp) {
            // FPS cap — skip frames we don't need
            if (timestamp - this.lastFrameTime < this.frameInterval) {
                this.animId = requestAnimationFrame((t) => this.animate(t));
                return;
            }
            this.lastFrameTime = timestamp;

            this.time += 0.016;

            // Auto-rotation
            this.rotY += this.rotationSpeed;

            // Smooth easing toward mouse targets
            const ease = 0.04;
            this.rotX += (this.targetRotX - this.rotX) * ease;
            this.rotY += (this.targetRotY - this.rotY) * ease - this.rotationSpeed;
            this.rotZ += (Math.cos(this.time * 0.2) * 0.08 - this.rotZ) * ease;

            // Ambient oscillation
            const finalRotX = this.rotX + Math.sin(this.time * 0.3) * 0.15;
            const finalRotZ = this.rotZ + Math.cos(this.time * 0.25) * 0.1;

            // Temporarily override rotation for this frame
            const savedRotX = this.rotX;
            const savedRotZ = this.rotZ;
            this.rotX = finalRotX;
            this.rotZ = finalRotZ;

            this.ctx.clearRect(0, 0, this.width, this.height);

            const color = this.getColor();
            const c = `${color.r}, ${color.g}, ${color.b}`;

            // Transform + project all nodes
            const projected = [];
            for (const node of this.nodes) {
                const rotated = this.rotatePoint(node.ox, node.oy, node.oz);
                const wave = Math.sin(this.time * 1.5 + node.ox * 0.005) * 10;
                node.x = rotated.x;
                node.y = rotated.y + wave;
                node.z = rotated.z;
                node.pulse += node.pulseSpeed;
                projected.push(this.project(node.x, node.y, node.z));
            }

            // Draw edges — flat color, no gradients
            const edgeAlpha = document.documentElement.getAttribute('data-theme') !== 'light' ? 0.12 : 0.4;
            for (const edge of this.edges) {
                const pa = projected[edge.a];
                const pb = projected[edge.b];
                const avgZ = (this.nodes[edge.a].z + this.nodes[edge.b].z) / 2;
                const depthFade = Math.max(0.05, 1 - (avgZ + this.depth) / (this.depth * 2));
                const alpha = depthFade * edgeAlpha;

                this.ctx.beginPath();
                this.ctx.moveTo(pa.x, pa.y);
                this.ctx.lineTo(pb.x, pb.y);
                this.ctx.strokeStyle = `rgba(${c}, ${alpha})`;
                this.ctx.lineWidth = Math.max(0.3, 0.8 * pa.scale);
                this.ctx.stroke();
            }

            // Draw nodes — shadowBlur for glow instead of radial gradients
            const nodeAlpha = document.documentElement.getAttribute('data-theme') !== 'light' ? 0.6 : 0.8;
            this.ctx.shadowColor = `rgba(${c}, 0.5)`;
            this.ctx.shadowBlur = 8;
            for (let i = 0; i < this.nodes.length; i++) {
                const node = this.nodes[i];
                const p = projected[i];
                const pulseFactor = Math.sin(node.pulse) * 0.3 + 0.7;
                const r = Math.max(0.5, node.radius * p.scale * pulseFactor);
                const depthFade = Math.max(0.1, 1 - (node.z + this.depth) / (this.depth * 2));
                const alpha = depthFade * nodeAlpha * pulseFactor;

                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                this.ctx.fill();
            }
            this.ctx.shadowBlur = 0;

            // Draw packets — simple dots, no gradient trails
            for (const packet of this.packets) {
                packet.t += packet.speed;
                if (packet.t > 1) {
                    packet.t = 0;
                    packet.edge = Math.floor(Math.random() * this.edges.length);
                }
                const edge = this.edges[packet.edge];
                const pa = projected[edge.a];
                const pb = projected[edge.b];
                const x = pa.x + (pb.x - pa.x) * packet.t;
                const y = pa.y + (pb.y - pa.y) * packet.t;
                const size = packet.size * ((pa.scale + pb.scale) / 2);

                this.ctx.beginPath();
                this.ctx.arc(x, y, size, 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(255, 255, 255, 0.8)`;
                this.ctx.fill();
            }

            // Restore rotation
            this.rotX = savedRotX;
            this.rotZ = savedRotZ;

            this.animId = requestAnimationFrame((t) => this.animate(t));
        },
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

        // Theme toggle button
        document.getElementById('themeToggle')?.addEventListener('click', () => Theme.toggle());

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
