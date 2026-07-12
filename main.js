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

    // ─── 3D Rotating Mesh Background (Canvas) ────────────
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
        rotationSpeed: 0.001,
        rotX: 0,
        rotY: 0,
        rotZ: 0,
        // Mesh parameters
        rings: 12,
        segments: 20,
        radius: 250,
        depth: 120,
        // Visual parameters
        connectionDist: 300,
        glowIntensity: 0.6,

        init() {
            this.canvas = document.getElementById('bg-canvas');
            if (!this.canvas) return;
            this.ctx = this.canvas.getContext('2d');
            this.resize();
            this.buildMesh();
            this.spawnPackets();
            this.bindEvents();
            this.animate();
        },

        resize() {
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.canvas.width = this.width;
            this.canvas.height = this.height;
            this.radius = Math.max(this.width, this.height) * 0.6;
            this.depth = this.radius * 0.4;
            this.buildMesh();
        },

        buildMesh() {
            this.nodes = [];
            this.edges = [];

            // Create a toroidal mesh — nodes arranged in rings
            for (let r = 0; r < this.rings; r++) {
                const ringAngle = (r / this.rings) * Math.PI * 2;
                const ringRadius = this.radius * (0.6 + 0.4 * Math.sin(ringAngle * 0.5));
                for (let s = 0; s < this.segments; s++) {
                    const segAngle = (s / this.segments) * Math.PI * 2;
                    const x = Math.cos(segAngle) * ringRadius;
                    const y = Math.sin(segAngle) * ringRadius * 0.6; // Flatten vertically
                    const z = Math.sin(ringAngle) * this.depth;
                    this.nodes.push({
                        ox: x, oy: y, oz: z, // Original positions
                        x: 0, y: 0, z: 0,     // Transformed positions
                        ring: r,
                        seg: s,
                        pulse: Math.random() * Math.PI * 2,
                        pulseSpeed: 0.015 + Math.random() * 0.02,
                        radius: 1 + Math.random() * 1.5,
                    });
                }
            }

            // Create edges between nearby nodes
            for (let i = 0; i < this.nodes.length; i++) {
                for (let j = i + 1; j < this.nodes.length; j++) {
                    const a = this.nodes[i];
                    const b = this.nodes[j];
                    const dx = a.ox - b.ox;
                    const dy = a.oy - b.oy;
                    const dz = a.oz - b.oz;
                    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                    if (dist < this.connectionDist) {
                        this.edges.push({ a: i, b: j, dist, distNorm: dist / this.connectionDist });
                    }
                }
            }
        },

        spawnPackets() {
            this.packets = [];
            for (let i = 0; i < 15; i++) {
                const edgeIdx = Math.floor(Math.random() * this.edges.length);
                this.packets.push({
                    edge: edgeIdx,
                    t: Math.random(),
                    speed: 0.003 + Math.random() * 0.005,
                    size: 2 + Math.random() * 3,
                });
            }
        },

        bindEvents() {
            window.addEventListener('resize', () => {
                this.resize();
                this.spawnPackets();
            });
            window.addEventListener('mousemove', (e) => {
                this.mouse.x = e.clientX;
                this.mouse.y = e.clientY;
                this.mouse.active = true;
                // Strong mouse influence — mesh tilts toward cursor
                const mx = (e.clientX - this.width / 2) / (this.width / 2);
                const my = (e.clientY - this.height / 2) / (this.height / 2);
                this.targetRotY = mx * 0.8;
                this.targetRotX = my * 0.5;
                this.targetRotZ = mx * 0.2;
            });
            window.addEventListener('mouseleave', () => {
                this.mouse.active = false;
                this.targetRotX = 0;
                this.targetRotY = 0;
                this.targetRotZ = 0;
            });
        },

        rotatePoint(x, y, z) {
            // Rotate around Y axis
            let cosY = Math.cos(this.rotY);
            let sinY = Math.sin(this.rotY);
            let x1 = x * cosY - z * sinY;
            let z1 = x * sinY + z * cosY;

            // Rotate around X axis
            let cosX = Math.cos(this.rotX);
            let sinX = Math.sin(this.rotX);
            let y1 = y * cosX - z1 * sinX;
            let z2 = y * sinX + z1 * cosX;

            // Rotate around Z axis
            let cosZ = Math.cos(this.rotZ);
            let sinZ = Math.sin(this.rotZ);
            let x2 = x1 * cosZ - y1 * sinZ;
            let y2 = x1 * sinZ + y1 * cosZ;

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
                return { r: 0, g: 212, b: 255, alt: { r: 123, g: 47, b: 247 } };
            }
            return { r: 0, g: 100, b: 180, alt: { r: 80, g: 20, b: 160 } };
        },

        animate() {
            this.time += 0.016;

            // Auto-rotation (slow, ambient)
            this.rotY += this.rotationSpeed;

            // Smooth easing toward mouse-driven targets
            const ease = 0.04;
            this.rotX += (this.targetRotX - this.rotX) * ease;
            this.rotY += (this.targetRotY - this.rotY) * ease - this.rotationSpeed;
            this.rotZ += (this.targetRotZ - this.rotZ) * ease;

            // Add gentle ambient oscillation on top
            const ambientX = Math.sin(this.time * 0.3) * 0.15;
            const ambientZ = Math.cos(this.time * 0.2) * 0.08;
            const finalRotX = this.rotX + ambientX;
            const finalRotZ = this.rotZ + ambientZ;

            // Temporarily swap rotation values for transform
            const savedRotX = this.rotX;
            const savedRotZ = this.rotZ;
            this.rotX = finalRotX;
            this.rotZ = finalRotZ;

            this.ctx.clearRect(0, 0, this.width, this.height);

            const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
            const color = this.getColor();
            const baseColor = `${color.r}, ${color.g}, ${color.b}`;
            const altColor = `${color.alt.r}, ${color.alt.g}, ${color.alt.b}`;

            // Mouse normalized position for node displacement
            const mouseNX = this.mouse.x / this.width;
            const mouseNY = this.mouse.y / this.height;

            // Transform all nodes
            for (const node of this.nodes) {
                const rotated = this.rotatePoint(node.ox, node.oy, node.oz);
                // Add wave distortion
                const wave = Math.sin(this.time * 2 + node.ring * 0.5) * 15;
                node.x = rotated.x;
                node.y = rotated.y + wave;
                node.z = rotated.z;
                node.pulse += node.pulseSpeed;
            }

            // Project all nodes
            const projected = this.nodes.map(n => this.project(n.x, n.y, n.z));

            // Mouse-reactive node displacement
            if (this.mouse.active) {
                for (let i = 0; i < projected.length; i++) {
                    const p = projected[i];
                    const dx = p.x - this.mouse.x;
                    const dy = p.y - this.mouse.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const influenceRadius = 200;
                    if (dist < influenceRadius) {
                        const force = (1 - dist / influenceRadius) * 30;
                        const angle = Math.atan2(dy, dx);
                        p.x += Math.cos(angle) * force;
                        p.y += Math.sin(angle) * force;
                        // Boost pulse near mouse
                        this.nodes[i].pulse += 0.1;
                    }
                }
            }

            // Draw edges with depth-based opacity
            for (const edge of this.edges) {
                const pa = projected[edge.a];
                const pb = projected[edge.b];
                const avgZ = (this.nodes[edge.a].z + this.nodes[edge.b].z) / 2;
                const depthFade = Math.max(0.05, 1 - (avgZ + this.depth) / (this.depth * 2));

                // Gradient along edge
                const gradient = this.ctx.createLinearGradient(pa.x, pa.y, pb.x, pb.y);
                const nodeA = this.nodes[edge.a];
                const nodeB = this.nodes[edge.b];
                const pulseA = Math.sin(nodeA.pulse) * 0.3 + 0.7;
                const pulseB = Math.sin(nodeB.pulse) * 0.3 + 0.7;

                // Boost opacity in light theme
                const edgeMult = isDark ? 0.15 : 0.3;
                const midMult = isDark ? 0.1 : 0.2;

                gradient.addColorStop(0, `rgba(${baseColor}, ${depthFade * edgeMult * pulseA})`);
                gradient.addColorStop(0.5, `rgba(${altColor}, ${depthFade * midMult * (pulseA + pulseB) / 2})`);
                gradient.addColorStop(1, `rgba(${baseColor}, ${depthFade * edgeMult * pulseB})`);

                this.ctx.beginPath();
                this.ctx.moveTo(pa.x, pa.y);
                this.ctx.lineTo(pb.x, pb.y);
                this.ctx.strokeStyle = gradient;
                this.ctx.lineWidth = Math.max(0.3, 1 * pa.scale * (1 - edge.distNorm * 0.5));
                this.ctx.stroke();
            }

            // Draw nodes sorted by depth (back to front)
            const sortedIndices = this.nodes
                .map((n, i) => ({ i, z: n.z }))
                .sort((a, b) => b.z - a.z);

            for (const { i } of sortedIndices) {
                const node = this.nodes[i];
                const p = projected[i];
                const pulseFactor = Math.sin(node.pulse) * 0.4 + 0.6;
                const radius = node.radius * p.scale * pulseFactor;
                const depthFade = Math.max(0.1, 1 - (node.z + this.depth) / (this.depth * 2));

                // Outer glow
                const glowRadius = radius * 6;
                const glow = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowRadius);
                glow.addColorStop(0, `rgba(${baseColor}, ${0.3 * depthFade * pulseFactor})`);
                glow.addColorStop(0.5, `rgba(${altColor}, ${0.1 * depthFade * pulseFactor})`);
                glow.addColorStop(1, `rgba(${baseColor}, 0)`);
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2);
                this.ctx.fillStyle = glow;
                this.ctx.fill();

                // Core dot
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, Math.max(0.5, radius), 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * depthFade * pulseFactor})`;
                this.ctx.fill();
            }

            // Draw animated data packets
            this.drawPackets(projected, color);

            // Restore rotation values
            this.rotX = savedRotX;
            this.rotZ = savedRotZ;

            this.animId = requestAnimationFrame(() => this.animate());
        },

        drawPackets(projected, color) {
            for (const packet of this.packets) {
                packet.t += packet.speed;
                if (packet.t > 1) {
                    packet.t = 0;
                    packet.edge = Math.floor(Math.random() * this.edges.length);
                }

                const edge = this.edges[packet.edge];
                const pa = projected[edge.a];
                const pb = projected[edge.b];

                // Interpolate position
                const x = pa.x + (pb.x - pa.x) * packet.t;
                const y = pa.y + (pb.y - pa.y) * packet.t;
                const avgScale = (pa.scale + pb.scale) / 2;
                const size = packet.size * avgScale;

                // Trail effect
                const trailLen = 0.08;
                const tx = pa.x + (pb.x - pa.x) * Math.max(0, packet.t - trailLen);
                const ty = pa.y + (pb.y - pa.y) * Math.max(0, packet.t - trailLen);

                const trail = this.ctx.createLinearGradient(tx, ty, x, y);
                trail.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
                trail.addColorStop(1, `rgba(255, 255, 255, 0.8)`);

                this.ctx.beginPath();
                this.ctx.moveTo(tx, ty);
                this.ctx.lineTo(x, y);
                this.ctx.strokeStyle = trail;
                this.ctx.lineWidth = size * 0.5;
                this.ctx.stroke();

                // Bright head
                const headGlow = this.ctx.createRadialGradient(x, y, 0, x, y, size * 3);
                headGlow.addColorStop(0, `rgba(255, 255, 255, 0.9)`);
                headGlow.addColorStop(0.3, `rgba(${color.r}, ${color.g}, ${color.b}, 0.5)`);
                headGlow.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
                this.ctx.beginPath();
                this.ctx.arc(x, y, size * 3, 0, Math.PI * 2);
                this.ctx.fillStyle = headGlow;
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
