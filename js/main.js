// ── Modal a11y helper: focus trap, scroll lock, focus restore ────
function attachModalA11y(overlay) {
    const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    let lastFocused = null;

    function focusables() {
        return Array.from(overlay.querySelectorAll(FOCUSABLE)).filter(el => el.offsetParent !== null);
    }

    function onKeydown(e) {
        if (e.key !== 'Tab') return;
        const items = focusables();
        if (!items.length) return;
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault(); first.focus();
        }
    }

    return {
        onOpen() {
            lastFocused = document.activeElement;
            overlay.inert = false;
            document.body.style.overflow = 'hidden';
            overlay.addEventListener('keydown', onKeydown);
            const first = focusables()[0];
            first && first.focus();
        },
        onClose() {
            overlay.inert = true;
            document.body.style.overflow = '';
            overlay.removeEventListener('keydown', onKeydown);
            lastFocused && lastFocused.focus();
        }
    };
}

// ── Light / Dark mode toggle ─────────────────────────────────────
(function () {
    const btn  = document.getElementById('theme-toggle');
    const html = document.documentElement;
    if (!btn) return;

    function apply(theme) {
        if (theme === 'light') html.dataset.theme = 'light';
        else delete html.dataset.theme;
        localStorage.setItem('tg_theme', theme);
    }

    // Restore saved preference
    apply(localStorage.getItem('tg_theme') || 'dark');

    btn.addEventListener('click', () => {
        apply(html.dataset.theme === 'light' ? 'dark' : 'light');
    });
})();

// ── Hamburger / mobile nav toggle ────────────────────────────────
(function () {
    const btn    = document.getElementById('hamburger-btn');
    const header = document.querySelector('.site-header');
    if (!btn || !header) return;

    function close() {
        header.classList.remove('nav-open');
        btn.setAttribute('aria-expanded', 'false');
    }

    btn.addEventListener('click', e => {
        e.stopPropagation();
        const isOpen = header.classList.toggle('nav-open');
        btn.setAttribute('aria-expanded', String(isOpen));
    });

    // Close on nav link click
    document.querySelectorAll('.nav-main .nav-link').forEach(link => {
        link.addEventListener('click', close);
    });

    // Close on outside click
    document.addEventListener('click', e => {
        if (!header.contains(e.target)) close();
    });
})();

// ── Active nav link on scroll (scrollspy) ────────────────────────
(function () {
    const sections = document.querySelectorAll('main > section[id]');
    const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
    if (!sections.length || !navLinks.length) return;

    function setActive(id) {
        navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === '#' + id);
        });
    }

    // Band around ~40% from top of viewport — section crossing it is "active"
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) setActive(entry.target.id);
        });
    }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });

    sections.forEach(s => observer.observe(s));
})();

// ── WhatsApp floating button — visible from the first section onward ──
(function () {
    const btn  = document.querySelector('.whatsapp-float');
    const hero = document.getElementById('hero');
    if (!btn || !hero) return;

    const observer = new IntersectionObserver(entries => {
        btn.classList.toggle('visible', !entries[0].isIntersecting);
    }, { threshold: 0 });

    observer.observe(hero);
})();

// ── Marquee — responsive, no-crash on resize ─────────────────────
(function () {
    const tracks = document.querySelectorAll('.marquee-track');
    // Store originals once
    tracks.forEach(track => {
        track.dataset.origHtml = track.innerHTML;
        track.dataset.origDur  = track.style.animationDuration;
    });

    function buildMarquee() {
        tracks.forEach(track => {
            const original = track.dataset.origHtml;
            const origDur  = parseFloat(track.dataset.origDur) || 80;

            // Temporarily set single copy to measure its natural width
            track.innerHTML = original;
            track.style.animationDuration = '';
            const singleW = track.scrollWidth || 600;
            const needed  = Math.max(window.innerWidth * 3, 3600); // fill 3× viewport
            const copies  = Math.max(4, Math.ceil(needed / singleW));

            track.innerHTML = original.repeat(copies * 2); // ×2 for -50% loop
            track.style.animationDuration = (origDur * copies) + 's';
        });
    }

    buildMarquee();

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(buildMarquee, 250); // debounce
    }, { passive: true });
})();

// ── Contact modal ────────────────────────────────────────────────
(function () {
    const overlay  = document.getElementById('contact-modal');
    const closeBtn = document.getElementById('contact-modal-close');
    const copyBtn  = document.getElementById('copy-email-btn');
    const copyLbl  = document.getElementById('copy-label');
    if (!overlay) return;
    const a11y = attachModalA11y(overlay);

    function open()  { overlay.classList.add('open');    overlay.setAttribute('aria-hidden', 'false'); a11y.onOpen(); }
    function close() { overlay.classList.remove('open'); overlay.setAttribute('aria-hidden', 'true');  a11y.onClose(); }

    // All buttons that open the modal
    document.querySelectorAll('#open-contact-modal, #open-contact-modal-hero, #open-contact-modal-about, .nav-cta-btn, #footer-mail').forEach(btn => {
        btn && btn.addEventListener('click', e => { e.preventDefault(); open(); });
    });

    closeBtn && closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

    copyBtn && copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText('info@tangram.space').then(() => {
            copyLbl.textContent = 'Copied!';
            setTimeout(() => { copyLbl.textContent = 'Copy address'; }, 2000);
        });
    });
})();

// ── Accordion Gallery ────────────────────────────────────────────
(function () {
    document.querySelectorAll('.ag-gallery').forEach(function (gallery) {
        var panels = Array.from(gallery.querySelectorAll('.ag-panel'));
        if (!panels.length) return;

        var active = Math.floor(panels.length / 2);
        var expandGrow = panels.length > 1 ? (0.52 * (panels.length - 1)) / (1 - 0.52) : 1;
        var lastTouch = false;

        gallery.addEventListener('touchstart', function () { lastTouch = true; }, { passive: true });
        gallery.addEventListener('mousemove',  function () { lastTouch = false; });

        function activate(i) {
            var vert = window.innerWidth <= 520;
            panels.forEach(function (p, j) {
                var isActive = j === i;
                p.style.flexGrow = isActive ? expandGrow : 1;
                p.classList.toggle('ag-panel--active', isActive);
                if (j !== i) {
                    p.style.transform = vert
                        ? 'rotateX(' + (j < i ? -6 : 6) + 'deg)'
                        : 'rotateY(' + (j < i ? 7 : -7) + 'deg)';
                } else {
                    p.style.transform = '';
                }
            });
        }

        activate(active);

        // ── Auto-rotation: 4s cadence, 10s hold after a manual pick ──
        var autoTimer = null, holdTimer = null, inView = true;

        function startAuto() {
            clearInterval(autoTimer);
            autoTimer = setInterval(function () {
                if (!inView) return;
                active = (active + 1) % panels.length;
                activate(active);
            }, 2500);
        }
        function hold(ms) {
            clearInterval(autoTimer);
            clearTimeout(holdTimer);
            holdTimer = setTimeout(startAuto, ms);
        }
        function pick(i, holdMs) { active = i; activate(i); hold(holdMs); }

        startAuto();

        // Pause while off-screen so it doesn't spin unseen
        if ('IntersectionObserver' in window) {
            new IntersectionObserver(function (e) { inView = e[0].isIntersecting; },
                { threshold: 0.15 }).observe(gallery);
        }

        panels.forEach(function (panel, i) {
            panel.addEventListener('mouseenter', function () {
                if (!lastTouch) pick(i, 10000);
            });
            function activateOrFollow(e) {
                if (!panel.classList.contains('ag-panel--active')) {
                    e.preventDefault();
                    pick(i, 10000);
                }
                // if already active and panel is a link, let default navigate
            }
            panel.addEventListener('click', activateOrFollow);
            panel.addEventListener('keydown', function (e) {
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); pick((i + 1) % panels.length, 10000); }
                if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   { e.preventDefault(); pick((i - 1 + panels.length) % panels.length, 10000); }
                if (e.key === ' ') { e.preventDefault(); activateOrFollow(e); }
                else if (e.key === 'Enter') { activateOrFollow(e); }
            });
        });

        // Leaving the gallery entirely resumes sooner
        gallery.addEventListener('mouseleave', function () { if (!lastTouch) hold(2000); });
    });
})();

// ── Services dot grid — canvas: #about's permanent background ────
// This is #about's own background now (About + Services merged into
// one section): visible from the top of the section — kicker, title,
// lead, body — behind the cards and behind the director credit, not
// just behind the services grid. It drifts on scroll (own transform,
// content is untouched) — overscan taller than the section itself so
// the drift never uncovers an empty edge.
(function () {
    var section = document.querySelector('#about');
    if (!section) return;

    var cv = document.createElement('canvas');
    cv.setAttribute('aria-hidden', 'true');
    cv.style.cssText = 'position:absolute;left:0;width:100%;pointer-events:none;z-index:0;';
    section.insertBefore(cv, section.firstChild);
    var ctx = cv.getContext('2d');

    var SPACING = 26;
    var T_IN    = 2000; // ms to fully collapse (slow travel)
    var T_OUT   =  600; // ms to return
    var AMPLITUDE_VH = 8; // parallax drift range, each direction

    var dots = [], progress = 0, dir = 0, lastTs = null, rafId = null;
    var tx = 0, ty = 0, maxDist = 1;
    var overscanPx = 0;

    // Canvas is taller than #about by 2×overscan (half above, half
    // below) so a ±overscan translateY never exposes a blank edge.
    // Dot coordinates below are in this taller canvas's own space, so
    // hover math offsets by overscanPx to line up with the section.
    function resize() {
        var r = section.getBoundingClientRect();
        overscanPx = window.innerHeight * (AMPLITUDE_VH / 100);
        var w = Math.round(r.width);
        var h = Math.round(r.height + overscanPx * 2);
        cv.style.top = -overscanPx + 'px';
        cv.style.height = h + 'px';
        cv.width  = w;
        cv.height = h;
        maxDist = Math.sqrt(w * w + h * h);
        dots = [];
        for (var row = 0; row * SPACING <= h; row++)
            for (var col = 0; col * SPACING <= w; col++)
                dots.push({ ox: col * SPACING, oy: row * SPACING });
        drawFrame(progress);
    }

    function updateParallax() {
        var top = section.getBoundingClientRect().top;
        // Slow, subtle drift tied to scroll position (not time) —
        // clamped to the same ±overscanPx the canvas is oversized by.
        var raw = -top * 0.08;
        var clamped = Math.max(-overscanPx, Math.min(overscanPx, raw));
        cv.style.transform = 'translateY(' + clamped + 'px)';
    }

    function drawFrame(p) {
        ctx.clearRect(0, 0, cv.width, cv.height);
        var isDark = document.documentElement.dataset.theme !== 'light';
        ctx.fillStyle = isDark ? '#ffffff' : '#000000';
        var base = isDark ? 0.13 : 0.10;
        dots.forEach(function (d) {
            var dx = d.ox - tx, dy = d.oy - ty;
            var dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
            // local progress: closer dots reach 1 faster → disappear first
            var lp = Math.min(p * maxDist / dist, 1);
            var a  = (1 - lp) * base;
            if (a < 0.004) return;
            ctx.globalAlpha = a;
            ctx.beginPath();
            ctx.arc(d.ox + (tx - d.ox) * lp, d.oy + (ty - d.oy) * lp, 1, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
    }

    function tick(ts) {
        if (!lastTs) lastTs = ts;
        var dt = ts - lastTs; lastTs = ts;
        var duration = dir > 0 ? T_IN : T_OUT;
        progress = Math.max(0, Math.min(1, progress + dir * dt / duration));
        drawFrame(progress);
        if ((dir > 0 && progress < 1) || (dir < 0 && progress > 0)) {
            rafId = requestAnimationFrame(tick);
        } else { dir = 0; rafId = null; lastTs = null; }
    }

    function go(d) { dir = d; lastTs = null; if (!rafId) rafId = requestAnimationFrame(tick); }

    section.querySelectorAll('.service-card').forEach(function (card) {
        card.addEventListener('mouseenter', function () {
            var sr = section.getBoundingClientRect();
            var cr = card.getBoundingClientRect();
            tx = cr.left + cr.width  / 2 - sr.left;
            ty = cr.top  + cr.height / 2 - sr.top + overscanPx;
            go(1);
        });
        card.addEventListener('mouseleave', function () { go(-1); });
    });

    var parallaxTicking = false;
    window.addEventListener('scroll', function () {
        if (parallaxTicking) return;
        parallaxTicking = true;
        requestAnimationFrame(function () { updateParallax(); parallaxTicking = false; });
    }, { passive: true });

    if (window.ResizeObserver) {
        new ResizeObserver(function () { resize(); updateParallax(); }).observe(section);
    } else {
        window.addEventListener('resize', function () { resize(); updateParallax(); });
    }
    resize();
    updateParallax();
})();

// ── Method background — cursor-reactive grid (vanilla port of CursorGrid) ──
(function () {
    var host = document.querySelector('.methodology');
    if (!host) return;

    var canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;';
    host.insertBefore(canvas, host.firstChild);
    var ctx = canvas.getContext('2d');
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var cfg = {
        cellSize: 64,
        color: '#EE6D3E',
        radius: 150,
        holdTime: 400,
        fadeDuration: 800,
        lineWidth: 1.2,
        maxOpacity: 0.55,
        fillOpacity: 0,
        gridOpacity: 0.045,
        cellRadius: 0,
        clickPulse: true,
        pulseSpeed: 600
    };
    function falloff(t) { return t * t * (3 - 2 * t); } // smooth

    function hexToRgb(hex) {
        var num = parseInt(hex.replace('#', '').slice(0, 6), 16);
        return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
    }
    var rgb = hexToRgb(cfg.color), CR = rgb[0], CG = rgb[1], CB = rgb[2];

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var cols = 0, rows = 0, offX = 0, offY = 0;
    var alphas = new Float32Array(0), touched = new Float64Array(0);
    var w = 0, h = 0, pulses = [], raf = 0, running = false, lastFrame = 0;

    function rebuild() {
        w = host.offsetWidth; h = host.offsetHeight;
        canvas.width = Math.max(1, Math.round(w * dpr));
        canvas.height = Math.max(1, Math.round(h * dpr));
        canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        cols = Math.ceil(w / cfg.cellSize) + 1;
        rows = Math.ceil(h / cfg.cellSize) + 1;
        offX = (w - cols * cfg.cellSize) / 2;
        offY = (h - rows * cfg.cellSize) / 2;
        alphas = new Float32Array(cols * rows);
        touched = new Float64Array(cols * rows);
    }

    function cellCenter(i) {
        return [
            offX + (i % cols) * cfg.cellSize + cfg.cellSize / 2,
            offY + Math.floor(i / cols) * cfg.cellSize + cfg.cellSize / 2
        ];
    }

    function energize(x, y, boost) {
        var r = Math.max(cfg.radius, 1);
        var now = performance.now();
        var minCol = Math.max(0, Math.floor((x - r - offX) / cfg.cellSize));
        var maxCol = Math.min(cols - 1, Math.floor((x + r - offX) / cfg.cellSize));
        var minRow = Math.max(0, Math.floor((y - r - offY) / cfg.cellSize));
        var maxRow = Math.min(rows - 1, Math.floor((y + r - offY) / cfg.cellSize));
        for (var cRow = minRow; cRow <= maxRow; cRow++) {
            for (var cCol = minCol; cCol <= maxCol; cCol++) {
                var i = cRow * cols + cCol;
                var c = cellCenter(i);
                var dist = Math.hypot(c[0] - x, c[1] - y);
                if (dist > r) continue;
                var level = falloff(1 - dist / r) * cfg.maxOpacity * (boost || 1);
                if (level > alphas[i]) { alphas[i] = level; touched[i] = now; }
                else if (level > 0) { touched[i] = now; }
            }
        }
    }

    function draw(now) {
        var dt = Math.min(now - lastFrame, 50);
        lastFrame = now;
        ctx.clearRect(0, 0, w, h);

        if (cfg.gridOpacity > 0) {
            ctx.strokeStyle = 'rgba(' + CR + ',' + CG + ',' + CB + ',' + cfg.gridOpacity + ')';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (var c1 = 0; c1 <= cols; c1++) {
                var x = Math.round(offX + c1 * cfg.cellSize) + 0.5;
                ctx.moveTo(x, 0); ctx.lineTo(x, h);
            }
            for (var r1 = 0; r1 <= rows; r1++) {
                var y = Math.round(offY + r1 * cfg.cellSize) + 0.5;
                ctx.moveTo(0, y); ctx.lineTo(w, y);
            }
            ctx.stroke();
        }

        for (var pi = pulses.length - 1; pi >= 0; pi--) {
            var pulse = pulses[pi];
            var age = (now - pulse.t0) / 1000;
            var ringR = age * cfg.pulseSpeed;
            if (ringR > Math.hypot(w, h)) { pulses.splice(pi, 1); continue; }
            var band = cfg.cellSize;
            var minCol = Math.max(0, Math.floor((pulse.x - ringR - band - offX) / cfg.cellSize));
            var maxCol = Math.min(cols - 1, Math.floor((pulse.x + ringR + band - offX) / cfg.cellSize));
            var minRow = Math.max(0, Math.floor((pulse.y - ringR - band - offY) / cfg.cellSize));
            var maxRow = Math.min(rows - 1, Math.floor((pulse.y + ringR + band - offY) / cfg.cellSize));
            for (var cRow2 = minRow; cRow2 <= maxRow; cRow2++) {
                for (var cCol2 = minCol; cCol2 <= maxCol; cCol2++) {
                    var i2 = cRow2 * cols + cCol2;
                    var c2 = cellCenter(i2);
                    var dist2 = Math.hypot(c2[0] - pulse.x, c2[1] - pulse.y);
                    if (Math.abs(dist2 - ringR) < band / 2 && cfg.maxOpacity > alphas[i2]) {
                        alphas[i2] = cfg.maxOpacity; touched[i2] = now;
                    }
                }
            }
        }

        var anyVisible = pulses.length > 0;
        var fadeStep = dt / Math.max(cfg.fadeDuration, 16);
        var half = cfg.cellSize / 2;

        for (var i = 0; i < alphas.length; i++) {
            var a = alphas[i];
            if (a <= 0) continue;
            if (now - touched[i] > cfg.holdTime) {
                a = Math.max(0, a - fadeStep);
                alphas[i] = a;
                if (a <= 0) continue;
            }
            anyVisible = true;

            var c3 = cellCenter(i), cx = c3[0], cy = c3[1];
            var gradient = ctx.createRadialGradient(cx, cy, half * 0.1, cx, cy, cfg.cellSize);
            gradient.addColorStop(0, 'rgba(' + CR + ',' + CG + ',' + CB + ',' + a + ')');
            gradient.addColorStop(1, 'rgba(' + CR + ',' + CG + ',' + CB + ',0)');

            var x2 = cx - half + 0.5, y2 = cy - half + 0.5, s = cfg.cellSize - 1;
            ctx.beginPath();
            if (cfg.cellRadius > 0) ctx.roundRect(x2, y2, s, s, cfg.cellRadius);
            else ctx.rect(x2, y2, s, s);
            if (cfg.fillOpacity > 0) {
                ctx.fillStyle = 'rgba(' + CR + ',' + CG + ',' + CB + ',' + (a * cfg.fillOpacity) + ')';
                ctx.fill();
            }
            ctx.strokeStyle = gradient;
            ctx.lineWidth = cfg.lineWidth;
            ctx.stroke();
        }

        if (anyVisible) { raf = requestAnimationFrame(draw); }
        else { running = false; if (cfg.gridOpacity <= 0) ctx.clearRect(0, 0, w, h); }
    }

    function wake() {
        if (running) return;
        running = true;
        lastFrame = performance.now();
        raf = requestAnimationFrame(draw);
    }

    function toLocal(e) {
        var rect = canvas.getBoundingClientRect();
        return [e.clientX - rect.left, e.clientY - rect.top];
    }

    if (!reduceMotion) {
        host.addEventListener('pointermove', function (e) {
            var p = toLocal(e);
            energize(p[0], p[1]);
            wake();
        });
        host.addEventListener('pointerdown', function (e) {
            if (!cfg.clickPulse) return;
            var p = toLocal(e);
            pulses.push({ x: p[0], y: p[1], t0: performance.now() });
            wake();
        });
    }

    if (window.ResizeObserver) new ResizeObserver(function () { rebuild(); wake(); }).observe(host);
    else window.addEventListener('resize', function () { rebuild(); wake(); });
    rebuild();
    if (cfg.gridOpacity > 0) wake(); // paint the static lattice once, before any interaction

    // ── text reveal — the stage rail lights up in sequence, then the rest
    // follows. Replays every time the section is scrolled back into view.
    var content = host.querySelector('.method-content');
    var stageEls = Array.prototype.slice.call(host.querySelectorAll('.m-stage'));
    var sepEls = Array.prototype.slice.call(host.querySelectorAll('.m-stage-sep'));
    var revealEls = Array.prototype.slice.call(host.querySelectorAll('.method-reveal'));
    var revealTimers = [];
    function clearRevealTimers() { revealTimers.forEach(clearTimeout); revealTimers = []; }

    // ── method-values — typed out like the map's terminal readout, but
    // auto-played (no click needed) and repeated every so often while
    // the section stays in view. ────────────────────────────────────
    var mvItems = Array.prototype.slice.call(host.querySelectorAll('.method-values li'));
    var mvSpans = mvItems.map(function (li) { return li.querySelector('.mv-text'); });
    var mvCharTimer = null, mvLineTimer = null, mvRepeatTimer = null;

    function clearMvTimers() {
        clearInterval(mvCharTimer); clearTimeout(mvLineTimer); clearTimeout(mvRepeatTimer);
        mvCharTimer = mvLineTimer = mvRepeatTimer = null;
    }
    function typeMvLine(idx) {
        if (idx >= mvItems.length) { mvRepeatTimer = setTimeout(playMv, 9000); return; }
        var li = mvItems[idx], span = mvSpans[idx], str = (span && span.dataset.text) || '';
        var i = 0;
        li.classList.add('mv-typing');
        mvCharTimer = setInterval(function () {
            i++;
            span.textContent = str.slice(0, i);
            if (i >= str.length) {
                clearInterval(mvCharTimer);
                li.classList.remove('mv-typing');
                mvLineTimer = setTimeout(function () { typeMvLine(idx + 1); }, 250);
            }
        }, 18);
    }
    function playMv() {
        clearMvTimers();
        if (!mvItems.length) return;
        mvItems.forEach(function (li, i) { if (mvSpans[i]) mvSpans[i].textContent = ''; li.classList.remove('mv-typing'); });
        if (reduceMotion) {
            mvItems.forEach(function (li, i) { if (mvSpans[i]) mvSpans[i].textContent = mvSpans[i].dataset.text || ''; });
            return;
        }
        typeMvLine(0);
    }
    function resetMv() {
        clearMvTimers();
        mvItems.forEach(function (li, i) { if (mvSpans[i]) mvSpans[i].textContent = ''; li.classList.remove('mv-typing'); });
    }

    function playReveal() {
        clearRevealTimers();
        if (reduceMotion) {
            revealEls.forEach(function (el) { el.classList.add('in'); });
            stageEls.forEach(function (el) { el.classList.add('lit'); });
            sepEls.forEach(function (el) { el.classList.add('lit'); });
            content.classList.add('assembled');
            playMv();
            return;
        }
        revealEls.forEach(function (el, i) {
            revealTimers.push(setTimeout(function () { el.classList.add('in'); }, i * 160));
        });
        stageEls.forEach(function (el, i) {
            revealTimers.push(setTimeout(function () { el.classList.add('lit'); }, 260 + i * 180));
        });
        sepEls.forEach(function (el, i) {
            revealTimers.push(setTimeout(function () { el.classList.add('lit'); }, 260 + i * 180 + 90));
        });
        revealTimers.push(setTimeout(function () { content.classList.add('assembled'); }, 260 + stageEls.length * 180 + 300));
        revealTimers.push(setTimeout(playMv, 260 + stageEls.length * 180 + 500));
    }
    function resetReveal() {
        clearRevealTimers();
        resetMv();
        revealEls.forEach(function (el) { el.classList.remove('in'); });
        stageEls.forEach(function (el) { el.classList.remove('lit'); });
        sepEls.forEach(function (el) { el.classList.remove('lit'); });
        content.classList.remove('assembled');
    }

    new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) playReveal();
        else resetReveal();
    }, { threshold: 0.15 }).observe(host);
})();

// ── Hero entrance + scroll fade-up ──────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Deliberate entrance — ~3.5x the original pace
    [...document.querySelectorAll('.hero-reveal')]
        .forEach((el, i) => setTimeout(() => el.classList.add('in'), 300 + i * 480));
    setTimeout(() => { var btn = document.querySelector('.hero-scroll-hint'); if (btn) btn.classList.add('visible'); }, 4200);

    const fadeObs = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) { entry.target.classList.add('visible'); obs.unobserve(entry.target); }
        });
    }, { threshold: 0.2 });
    document.querySelectorAll('.fade-up').forEach(el => fadeObs.observe(el));
});

// ── Hero title fit ─────────────────────────────────────────────────
// Above MOBILE_BREAKPOINT: title stays 2 lines. A vw-based clamp alone
// isn't enough — .container caps at 1280px, but font-size keeps
// scaling with the raw viewport past that point, so at widths like
// 1440px the first line can outgrow its box and wrap to a 3rd line.
// Measuring the real text width and shrinking to fit is the only way
// that holds at every width, not just one.
//
// At or below MOBILE_BREAKPOINT: the opposite composition — line 1 is
// deliberately allowed (and sized up) to break into 2 lines, so the
// title reads as 3 lines total with real hierarchy over the lead,
// instead of being shrunk to protect a single line that no longer
// needs protecting once the layout is this narrow.
(function () {
    const heroTitle = document.querySelector('.hero-title');
    const line1 = document.querySelector('.hero-title-line1');
    if (!heroTitle || !line1) return;

    const MOBILE_BREAKPOINT = 600;

    const measureCanvas = document.createElement('canvas');
    const measureCtx = measureCanvas.getContext('2d');

    function fitHeroTitleDesktop() {
        heroTitle.style.fontSize = ''; // back to the CSS clamp value first
        const available = heroTitle.getBoundingClientRect().width;
        if (!available) return;
        const cs = getComputedStyle(heroTitle);
        const naturalSize = parseFloat(cs.fontSize);
        measureCtx.font = cs.fontWeight + ' ' + naturalSize + 'px ' + cs.fontFamily;
        const textWidth = measureCtx.measureText(line1.textContent).width;
        if (textWidth > available) {
            const scaled = Math.floor(naturalSize * (available / textWidth) * 0.985);
            heroTitle.style.fontSize = scaled + 'px';
        }
    }

    // Grows the title up from the desktop floor until line 1 wraps to
    // (at most) 2 lines while the text after the <br> still holds to
    // 1 — real DOM measurement, language-agnostic (no hardcoded size
    // works for both EN and ES: measured live, ES's "Para marcas / que
    // necesitan" split only happens at 45px while EN's "For brands /
    // that need" needs 50-58px). Line count is each range's rendered
    // height divided by its line-height, not Range.getClientRects()
    // .length — the text after <br> mixes a bare text node with a
    // nested <span>, and getClientRects() gives one rect per fragment
    // even when they all sit on the same visual line.
    function fitHeroTitleMobile() {
        const br = heroTitle.querySelector('br');
        if (!br) { fitHeroTitleDesktop(); return; }
        heroTitle.style.fontSize = '';
        if (!heroTitle.getBoundingClientRect().width) return;

        function lineCounts(sz) {
            heroTitle.style.fontSize = sz + 'px';
            const lineHeight = parseFloat(getComputedStyle(heroTitle).lineHeight);
            const r1 = document.createRange();
            r1.selectNodeContents(line1);
            const r2 = document.createRange();
            r2.setStartAfter(br);
            r2.setEnd(heroTitle, heroTitle.childNodes.length);
            const l1 = Math.round(r1.getBoundingClientRect().height / lineHeight);
            const l2 = Math.round(r2.getBoundingClientRect().height / lineHeight);
            return { l1, l2 };
        }

        // Whichever side wraps (line 1 into 2, or line 2 into 2) — 3
        // lines total reads bigger than protecting a single line ever
        // could, so it's the preferred outcome, not just an allowed
        // one. The old l1<=2 && l2<=1 rule is kept as a fallback only:
        // for EN at this box width the two sides' wrap thresholds
        // don't overlap (line 1 already fits on 1 line at every size
        // where line 2 still needs 2), so that rule alone never found
        // a 3-line size and always fell through to the smallest,
        // safest 2-line fit.
        const CEIL = 84, FLOOR = 34;
        let chosen = null, fallback = null;
        for (let sz = CEIL; sz >= FLOOR; sz--) {
            const { l1, l2 } = lineCounts(sz);
            if (l1 <= 2 && l2 <= 2 && l1 + l2 === 3) { chosen = sz; break; }
            if (!fallback && l1 <= 2 && l2 <= 1) fallback = sz;
        }
        if (chosen) { heroTitle.style.fontSize = chosen + 'px'; }
        else if (fallback) { heroTitle.style.fontSize = fallback + 'px'; }
        else { fitHeroTitleDesktop(); } // nothing in range works — fall back rather than show broken wraps
    }

    function fitHeroTitle() {
        if (window.innerWidth <= MOBILE_BREAKPOINT) fitHeroTitleMobile();
        else fitHeroTitleDesktop();
    }

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(fitHeroTitle, 150);
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitHeroTitle);
    fitHeroTitle();
    // Layout may not be settled at the exact moment this script runs
    // (e.g. right after a viewport change) — a rAF retry costs nothing
    // and guards against measuring a width of 0.
    requestAnimationFrame(fitHeroTitle);
})();


// ── Hero node network (spec-accurate) ────────────────────────────
(function () {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas) return;
    const ctx    = canvas.getContext('2d');
    const hero   = canvas.parentElement;  // mouse listeners on parent

    // ── Tunable params ──
    const MAXD        = 145;    // max connection distance px
    const SPEED       = 0.14;   // max velocity per axis (±)
    const DENSITY     = 9500;   // px² per node — denser network
    const MAX_NODES   = 110;
    const MIN_NODES   = 40;
    const ATTRACT_R   = 170;    // mouse attraction radius
    const ATTRACT_F   = 0.4;    // attraction force px/frame
    const LINE_ALPHA  = 0.24;

    // ── Colors (read live from CSS vars) ──
    function cssColor(v) {
        const s = getComputedStyle(document.documentElement).getPropertyValue(v).trim();
        // parse hex #RRGGBB
        const m = s.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
        return m ? { r: parseInt(m[1],16), g: parseInt(m[2],16), b: parseInt(m[3],16) } : null;
    }

    let ORANGE, TEAL, BASE;

    function loadColors() {
        ORANGE = cssColor('--accent')  || { r:236, g:106, b:60  };
        TEAL   = cssColor('--accent2') || { r:78,  g:205, b:196 };
        BASE   = { r:245, g:240, b:232 };  // off-white for dark bg
    }

    // ── State ──
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    let W, H, nodes = [], animId = null;
    let mouseX = -9999, mouseY = -9999;
    const motionOff = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ── Setup ──
    function resize() {
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width  = W * DPR;
        canvas.height = H * DPR;
        canvas.style.width  = W + 'px';
        canvas.style.height = H + 'px';
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        genNodes();
    }

    function genNodes() {
        const count = Math.max(MIN_NODES, Math.min(MAX_NODES, Math.round(W * H / DENSITY)));
        nodes = Array.from({ length: count }, (_, i) => {
            const rnd = Math.random();
            const type = rnd < 0.12 ? 'orange' : rnd < 0.38 ? 'teal' : 'base';
            return {
                x:  Math.random() * W,
                y:  Math.random() * H,
                vx: (Math.random() - 0.5) * SPEED * 2,
                vy: (Math.random() - 0.5) * SPEED * 2,
                r:  1.8 + Math.random() * 2.2,
                type
            };
        });
    }

    function col(type) {
        return type === 'orange' ? ORANGE : type === 'teal' ? TEAL : BASE;
    }

    function nodeAlpha(type, distToMouse) {
        const base = type === 'orange' ? 0.75 : type === 'teal' ? 0.72 : 0.48;
        if (distToMouse !== undefined && distToMouse < ATTRACT_R) {
            const t = 1 - distToMouse / ATTRACT_R;
            return Math.min(1, base + t * (1 - base));  // full ramp to 1.0
        }
        return base;
    }

    // ── Frame ──
    function frame() {
        ctx.clearRect(0, 0, W, H);
        const _theme = document.documentElement.dataset.theme;
        if (_theme !== _lastTheme) { _lastTheme = _theme; loadColors(); }
        ctx.fillStyle = _theme === 'light' ? '#EAE7E1' : '#1c1c1c';
        ctx.fillRect(0, 0, W, H);

        // update positions
        for (const n of nodes) {
            // bounce edges
            if (n.x < 0 || n.x > W) n.vx *= -1;
            if (n.y < 0 || n.y > H) n.vy *= -1;

            // mouse attraction
            const dx = mouseX - n.x, dy = mouseY - n.y;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < ATTRACT_R && d > 0) {
                const force = ATTRACT_F / d;   // normalized
                n.x += dx * force;
                n.y += dy * force;
            }

            n.x += n.vx;
            n.y += n.vy;
        }

        // draw edges
        for (let i = 0; i < nodes.length; i++) {
            const a = nodes[i];
            for (let j = i + 1; j < nodes.length; j++) {
                const b = nodes[j];
                const dx = b.x - a.x, dy = b.y - a.y;
                const d  = Math.sqrt(dx * dx + dy * dy);
                if (d >= MAXD) continue;
                const alpha = (1 - d / MAXD) * LINE_ALPHA;
                const c = col(a.type !== 'base' ? a.type : b.type);
                ctx.beginPath();
                ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
                ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${alpha})`;
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }

        // draw dots
        for (const n of nodes) {
            const c = col(n.type);
            const dx = mouseX - n.x, dy = mouseY - n.y;
            const distM = Math.sqrt(dx * dx + dy * dy);
            const alpha = nodeAlpha(n.type, distM);
            const t = distM < ATTRACT_R ? 1 - distM / ATTRACT_R : 0;
            const boost = t * 4;  // radius grows up to +4px on hover

            // Glow for brand-color nodes near cursor
            if (t > 0 && n.type !== 'base') {
                ctx.shadowColor = `rgba(${c.r},${c.g},${c.b},${t * 0.9})`;
                ctx.shadowBlur  = 18 * t;
            }

            ctx.beginPath();
            ctx.arc(n.x, n.y, n.r + boost, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${alpha})`;
            ctx.fill();

            if (t > 0 && n.type !== 'base') {
                ctx.shadowBlur  = 0;
                ctx.shadowColor = 'transparent';
            }
        }

        animId = requestAnimationFrame(frame);
    }

    // ── Mouse (listen on hero parent, not canvas) ──
    let _heroRect = canvas.getBoundingClientRect();
    hero.addEventListener('mousemove', e => {
        mouseX = e.clientX - _heroRect.left;
        mouseY = e.clientY - _heroRect.top;
    });
    hero.addEventListener('mouseleave', () => { mouseX = -9999; mouseY = -9999; });

    // ── IntersectionObserver — pause animation + fade canvas when hero leaves ──
    // Canvas is position:fixed so it always stays in viewport — we observe the
    // hero section (DOM element) instead, which correctly enters/exits as user scrolls.
    const heroObs = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
            canvas.style.opacity = '1';
            if (!animId && !motionOff) animId = requestAnimationFrame(frame);
        } else {
            canvas.style.opacity = '0';
            cancelAnimationFrame(animId); animId = null;
        }
    }, { threshold: 0 });
    heroObs.observe(hero);

    // ── Init ──
    let _lastTheme = document.documentElement.dataset.theme;
    loadColors();
    resize();

    if (motionOff) {
        frame();   // single static frame
        cancelAnimationFrame(animId); animId = null;
    }

    window.addEventListener('resize', () => {
        cancelAnimationFrame(animId); animId = null;
        resize();
        _heroRect = canvas.getBoundingClientRect();
        if (!motionOff) animId = requestAnimationFrame(frame);
    });
})();



// ── ASCII Globe ────────────────────────────────────────────────────
(function () {
    var host = document.querySelector('.globe-ascii');
    if (!host) return;

    var cfg = {
        targetFps: 22,
        rows: 36,
        rowsMobile: 22,
        zoom: 1.05,
        rotationSpeed: 0.018,
        fontAspect: 0.6,
        lineHeight: 9,
        continentIntensity: 1,
        oceanIntensity: 0.08,
        continentColor: '#F4F1EC',
        oceanColor: '#484848',
        border: '2px solid rgba(236,106,60,0.28)',
        textureUrl: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg'
    };

    // +180° offset to match texture convention (u=0 = 180°W not 0°E)
    // label/role below are an English fallback only — this file is shared
    // across en/es/zh, so the tooltip actually reads its text from each
    // page's own .city-card (data-role + .city-card-name), which is
    // already localized correctly. See the lookup right after this array.
    var CITIES = [
        { id:'baires',   lat: -34.6, lng: -58.4, type: 'hq',      label: 'Argentina',   role: 'Headquarters'   },
        { id:'dubai',    lat:  25.2, lng:  55.3, type: 'hq',      label: 'UAE · Dubai', role: 'Headquarters'   },
        { id:'mexico',   lat:  19.4, lng: -99.1, type: 'partner', label: 'Mexico',       role: 'Partner'        },
        { id:'iberia',   lat:  40.4, lng:  -3.7, type: 'partner', label: 'Spain',        role: 'Partner'        },
        { id:'brasil',   lat: -23.5, lng: -46.6, type: 'local',   label: 'Brazil',       role: 'Local Producer' },
        { id:'colombia', lat:   4.7, lng: -74.1, type: 'local',   label: 'Colombia',     role: 'Local Producer' },
    ];
    CITIES.forEach(function (c) {
        var card = document.querySelector('.city-card[data-city="' + c.id + '"]');
        if (!card) return;
        var nameEl = card.querySelector('.city-card-name');
        if (nameEl) c.label = nameEl.textContent;
        var role = card.getAttribute('data-role');
        if (role) c.role = role;
    });

    var COLORS = {
        hq:      { fill: '#EC6A3C', glow: 'rgba(236,106,60,0.35)'  },
        partner: { fill: '#4ECDC4', glow: 'rgba(78,205,196,0.35)'  },
        local:   { fill: '#b0b0b0', glow: 'rgba(176,176,176,0.25)' },
    };

    // Auto-rotation bounces between our westmost (Mexico) and eastmost (Dubai)
    // location instead of doing a full 360° — keeps the empty Pacific/Asia off screen.
    function cityFacingRot(id) {
        var c = CITIES.filter(function (x) { return x.id === id; })[0];
        return (c.lng + 180) * Math.PI / 180;
    }
    var ROT_MIN = cityFacingRot('mexico');
    var ROT_MAX = cityFacingRot('dubai');
    var rotDir  = 1;

    var isMobile = window.matchMedia('(max-width:768px)').matches;
    var rows = isMobile ? cfg.rowsMobile : cfg.rows;
    var cols = Math.round(rows / cfg.fontAspect);
    var W    = cols * 2;
    var H    = rows * 4;
    var frameDelay = 1000 / cfg.targetFps;
    var bayer   = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
    var dotBits = [1,8,2,16,4,32,64,128];
    function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

    var out = document.createElement('canvas');
    out.className = 'globe-canvas';
    host.appendChild(out);
    var outCtx = out.getContext('2d');

    // Render at the size the canvas is actually displayed at, so the braille
    // chars stay crisp instead of being upscaled by CSS.
    var shownPx   = Math.round(out.getBoundingClientRect().width) || 460;
    var lineHeight = Math.max(cfg.lineHeight, Math.round(shownPx / rows));
    var charWidth = (rows * lineHeight) / cols;
    var dotScale  = lineHeight / cfg.lineHeight;   // city markers were tuned at lineHeight 9
    out.width  = Math.round(cols * charWidth);
    out.height = rows * lineHeight;
    out.style.cssText = 'display:block;border-radius:50%;border:' + cfg.border + ';background:transparent;cursor:grab;';

    outCtx.font = Math.round(lineHeight * 1.15) + 'px monospace';
    outCtx.textAlign    = 'center';
    outCtx.textBaseline = 'middle';

    var rot          = (ROT_MIN + ROT_MAX) / 2;   // start centered in the bounce range — no initial sideways jump
    var last         = 0;
    var paused       = false;
    var isDragging   = false;
    var dragX        = 0, dragStartX = 0;
    var dragVel      = 0;   // inertia velocity (rot units / frame)
    var targetRot    = null;
    var focusedCity  = null;
    var pinned       = false;   // set by a click on a dot; survives hover-out
    var cityScreenPos = [];
    var tipTimeout   = null;

    host.addEventListener('mouseenter', function(){ paused = true;  });
    host.addEventListener('mouseleave', function(){ paused = false; });

    // ── tooltip ──
    var tip = document.createElement('div');
    tip.style.cssText = 'position:fixed;background:rgba(12,12,12,0.92);border:1px solid rgba(236,106,60,0.45);border-radius:4px;padding:0.6rem 0.9rem;pointer-events:none;opacity:0;transition:opacity 0.18s;z-index:200;min-width:160px;font-family:inherit;';
    document.body.appendChild(tip);

    function showTooltipAt(i) {
        var pos = cityScreenPos[i];
        if (!pos || !pos.visible) { tip.style.opacity = '0'; return; }
        var city = CITIES[i];
        var rect = out.getBoundingClientRect();
        tip.innerHTML = '<div class="team-location-label map-tooltip-name">' + city.label + '</div><div class="map-tooltip-role">' + city.role + '</div>';
        var sx = rect.left + pos.cx * (rect.width  / out.width);
        var sy = rect.top  + pos.cy * (rect.height / out.height);
        tip.style.left    = Math.min(sx + 14, window.innerWidth - 170) + 'px';
        tip.style.top     = Math.max(sy - 60, 8) + 'px';
        tip.style.opacity = '1';
    }
    function hideTooltip() { tip.style.opacity = '0'; }

    function scheduleTipHide(ms) {
        clearTimeout(tipTimeout);
        tipTimeout = setTimeout(function() { focusedCity = null; hideTooltip(); }, ms);
    }

    // ── drag-to-rotate ──
    out.addEventListener('mousedown', function(e) {
        isDragging = true; dragX = dragStartX = e.clientX; dragVel = 0;
        out.style.cursor = 'grabbing'; e.preventDefault();
    });
    window.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        var dx = e.clientX - dragX;
        rot -= dx * 0.006; dragVel = -dx * 0.006; dragX = e.clientX; targetRot = null;
    });
    window.addEventListener('mouseup', function() {
        if (!isDragging) return;
        isDragging = false; out.style.cursor = 'grab';
        // dragVel persists → inertia kicks in
    });
    out.addEventListener('touchstart', function(e) {
        isDragging = true; dragX = dragStartX = e.touches[0].clientX; dragVel = 0; targetRot = null;
    }, { passive: true });
    out.addEventListener('touchmove', function(e) {
        if (!isDragging) return;
        var dx = e.touches[0].clientX - dragX;
        rot -= dx * 0.006; dragVel = -dx * 0.006; dragX = e.touches[0].clientX;
    }, { passive: true });
    out.addEventListener('touchend', function() { isDragging = false; });

    // ── click city on globe ──
    out.addEventListener('click', function(e) {
        if (Math.abs(e.clientX - dragStartX) > 5) return;
        var rect = out.getBoundingClientRect();
        var mx = (e.clientX - rect.left) * (out.width  / rect.width);
        var my = (e.clientY - rect.top)  * (out.height / rect.height);
        var hit = null, best = Infinity;
        cityScreenPos.forEach(function(pos, i) {
            if (!pos.visible) return;
            var d = Math.hypot(mx - pos.cx, my - pos.cy);
            var r = (CITIES[i].type === 'hq' ? 14 : 11) * dotScale;
            if (d < r && d < best) { best = d; hit = i; }
        });
        // Clicking the focused city again releases it and the globe spins on
        if (hit !== null && hit === focusedCity) hit = null;

        focusedCity = hit;
        pinned      = hit !== null;
        if (hit === null) {
            hideTooltip();
            targetRot = null;
            clearTimeout(tipTimeout);
        } else if (isMobile) {
            scheduleTipHide(3000);
        }
        document.dispatchEvent(new CustomEvent('tg:city', {
            detail: hit === null ? null : CITIES[hit].id
        }));
    });

    // ── city-card hover + touch ──
    document.querySelectorAll('.city-card').forEach(function(card) {
        var id = card.dataset.city, ci = -1;
        CITIES.forEach(function(c, idx) { if (c.id === id) ci = idx; });
        if (ci < 0) return;
        function activateCard() {
            focusedCity = ci; dragVel = 0; pinned = false;
            targetRot = (CITIES[ci].lng + 180) * Math.PI / 180;
            clearTimeout(tipTimeout);
        }
        card.addEventListener('mouseenter', activateCard);
        card.addEventListener('mouseleave', function() {
            if (pinned) return;
            focusedCity = null; targetRot = null; hideTooltip();
        });
        card.addEventListener('touchstart', function() {
            activateCard();
            scheduleTipHide(3500);
        }, { passive: true });
    });

    // A pinned tooltip must not follow the reader out of the section
    var teamSection = document.getElementById('team');
    if (teamSection && 'IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
            if (entries[0].isIntersecting) return;
            focusedCity = null; targetRot = null; pinned = false;
            clearTimeout(tipTimeout);
            hideTooltip();
            document.dispatchEvent(new CustomEvent('tg:city', { detail: null }));
        }, { threshold: 0 }).observe(teamSection);
    }

    var img = new Image();
    img.crossOrigin = '';
    img.src = cfg.textureUrl;
    img.onload = function () {
        var src  = document.createElement('canvas');
        var sctx = src.getContext('2d', { willReadFrequently: true });
        src.width  = img.width;
        src.height = img.height;
        sctx.drawImage(img, 0, 0);
        var pd = sctx.getImageData(0, 0, src.width, src.height).data;

        function sample(u, v) {
            var x = clamp(Math.floor(u * src.width),  0, src.width  - 1);
            var y = clamp(Math.floor(v * src.height), 0, src.height - 1);
            return pd[(y * src.width + x) * 4] / 255;
        }

        function drawCities() {
            cityScreenPos = [];
            CITIES.forEach(function(city, i) {
                var phi = city.lat * Math.PI / 180;
                // +PI offset: texture has u=0 at 180°W, not 0° (Greenwich)
                var lam = city.lng * Math.PI / 180 + Math.PI;
                var nx  = Math.sin(lam - rot) * Math.cos(phi);
                var ny  = Math.sin(phi);
                var nz  = Math.cos(lam - rot) * Math.cos(phi);
                var vis = nz > 0.12;
                cityScreenPos.push({
                    visible: vis,
                    cx: vis ? ((nx / cfg.zoom + 1) / 2) * (W - 1) * (out.width  / W) : -1,
                    cy: vis ? ((1 - ny / cfg.zoom) / 2) * (H - 1) * (out.height / H) : -1,
                });
                if (!vis) return;
                var pos = cityScreenPos[i];
                var col = COLORS[city.type];
                var r   = (city.type === 'hq' ? 4.5 : 3) * dotScale;
                var hi  = focusedCity === i;
                outCtx.beginPath();
                outCtx.arc(pos.cx, pos.cy, r + (hi ? 7 : 3.5) * dotScale, 0, Math.PI * 2);
                outCtx.fillStyle = col.glow; outCtx.fill();
                outCtx.beginPath();
                outCtx.arc(pos.cx, pos.cy, hi ? r * 1.7 : r, 0, Math.PI * 2);
                outCtx.fillStyle = col.fill; outCtx.fill();
                if (hi) {
                    outCtx.beginPath();
                    outCtx.arc(pos.cx, pos.cy, r * 2.8, 0, Math.PI * 2);
                    outCtx.strokeStyle = col.fill; outCtx.lineWidth = 1.2 * dotScale;
                    outCtx.globalAlpha = 0.4; outCtx.stroke(); outCtx.globalAlpha = 1;
                }
            });
        }

        function render() {
            if (targetRot !== null) {
                var diff = targetRot - rot;
                while (diff >  Math.PI) diff -= 2 * Math.PI;
                while (diff < -Math.PI) diff += 2 * Math.PI;
                if (Math.abs(diff) < 0.01) { rot = targetRot; targetRot = null; }
                else rot += diff * 0.042;
            }
            outCtx.clearRect(0, 0, out.width, out.height);
            for (var r = 0; r < rows; r++) {
                var rowChars     = new Array(cols).fill('⠀');
                var rowLand      = new Array(cols).fill(false);
                var rowHasSphere = new Array(cols).fill(false);
                for (var c = 0; c < cols; c++) {
                    var code = 10240, landScore = 0, touchesSphere = false;
                    for (var dy = 0; dy < 4; dy++) {
                        for (var dx = 0; dx < 2; dx++) {
                            var x  = c * 2 + dx;
                            var y  = r * 4 + dy;
                            var nx = (x / (W - 1) * 2 - 1) * cfg.zoom;
                            var ny = -((y / (H - 1) * 2 - 1) * cfg.zoom);
                            var d2 = nx * nx + ny * ny;
                            if (d2 > 1) continue;
                            touchesSphere = true;
                            var nz = Math.sqrt(1 - d2);
                            var u  = (Math.atan2(nx, nz) + rot) / (Math.PI * 2);
                            u -= Math.floor(u);
                            var v      = 0.5 - Math.asin(ny) / Math.PI;
                            var bright = sample(u, v);
                            var land   = Math.max(0, Math.min(1, 2.5 - bright * 5)) * cfg.continentIntensity;
                            var thr    = bayer[(y % 4) * 4 + (x % 4)] / 16;
                            if (land + bright * cfg.oceanIntensity > thr) { code |= dotBits[dy * 2 + dx]; }
                            landScore += land;
                        }
                    }
                    rowChars[c]     = String.fromCharCode(code);
                    rowLand[c]      = landScore > 0;
                    rowHasSphere[c] = touchesSphere;
                }
                for (var c = 1; c < cols - 1; c++) {
                    if (!rowLand[c] &&  rowLand[c-1] && rowLand[c+1]) rowLand[c] = true;
                    if ( rowLand[c] && !rowLand[c-1] && !rowLand[c+1]) rowLand[c] = false;
                }
                for (var c = 0; c < cols; c++) {
                    if (!rowHasSphere[c]) continue;
                    outCtx.fillStyle = rowLand[c] ? cfg.continentColor : cfg.oceanColor;
                    outCtx.fillText(rowChars[c], c * charWidth + charWidth / 2, r * lineHeight + lineHeight / 2);
                }
            }
            drawCities();
            if (focusedCity !== null) showTooltipAt(focusedCity);
            // inertia, then bounce auto-rotation between Mexico and Dubai
            if (!isDragging && targetRot === null) {
                if (Math.abs(dragVel) > 0.0005) {
                    rot += dragVel; dragVel *= 0.92;
                } else {
                    dragVel = 0;
                    // A manual drag may have pushed rot past a bound — snap back in before resuming
                    if (rot > ROT_MAX) { rot = ROT_MAX; rotDir = -1; }
                    else if (rot < ROT_MIN) { rot = ROT_MIN; rotDir = 1; }
                    if (!paused && focusedCity === null) {
                        rot += cfg.rotationSpeed * rotDir;
                        if (rot >= ROT_MAX) { rot = ROT_MAX; rotDir = -1; }
                        else if (rot <= ROT_MIN) { rot = ROT_MIN; rotDir = 1; }
                    }
                }
            }
        }

        function loop(t) {
            requestAnimationFrame(loop);
            if (t - last >= frameDelay) { last = t; render(); }
        }
        requestAnimationFrame(loop);
    };
})();

// ── Floating theme toggle — hide once the hero is scrolled past ────
(function () {
    var btn = document.querySelector('.theme-toggle--float');
    if (!btn) return;
    var hero = document.getElementById('hero');
    var ticking = false;

    function update() {
        ticking = false;
        var limit = hero ? hero.offsetHeight * 0.72 : 420;
        btn.classList.toggle('hidden', window.scrollY > limit);
    }
    window.addEventListener('scroll', function () {
        if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
})();

// ── Director modal ────────────────────────────────────────────────
(function () {
    var overlay = document.getElementById('dir-modal');
    var opener  = document.getElementById('open-dir-modal');
    var closeBt = document.getElementById('dir-modal-close');
    if (!overlay || !opener) return;
    var a11y = attachModalA11y(overlay);

    function open()  { overlay.classList.add('open');    overlay.setAttribute('aria-hidden', 'false'); a11y.onOpen(); }
    function close() { overlay.classList.remove('open'); overlay.setAttribute('aria-hidden', 'true');  a11y.onClose(); }

    opener.addEventListener('click', function (e) { e.preventDefault(); open(); });
    closeBt && closeBt.addEventListener('click', close);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
})();

// ── Team map terminal readout — types out the selected location ────
(function () {
    var readout = document.getElementById('map-readout');
    var cards   = document.querySelectorAll('.city-card');
    if (!readout || !cards.length) return;

    var headEl = readout.querySelector('.readout-head');
    var textEl = readout.querySelector('.readout-text');
    var idle   = readout.dataset.idle || 'Select a location';
    var timer  = null;
    var shown  = null;

    // Only the description types out — name and role appear at once.
    // A city can mark one word (data-link-word) to render as a real <a>
    // (e.g. Dubai's "Cocolife") instead of plain text. Built as separate
    // text-node / <a> segments and typed into via textContent per segment
    // — never innerHTML — so the link is a real, clickable DOM node while
    // the character-by-character effect still runs across it seamlessly.
    function textSegments(str, linkWord, href) {
        var idx = linkWord ? str.indexOf(linkWord) : -1;
        if (idx === -1) return [{ text: str, href: null }];
        return [
            { text: str.slice(0, idx), href: null },
            { text: str.slice(idx, idx + linkWord.length), href: href },
            { text: str.slice(idx + linkWord.length), href: null }
        ].filter(function (seg) { return seg.text.length > 0; });
    }

    function type(str, linkWord, href, speed) {
        clearInterval(timer);
        textEl.textContent = '';
        var segments = textSegments(str, linkWord, href);
        var segIdx = 0, charIdx = 0, node = null;

        function nextSegment() {
            var seg = segments[segIdx];
            if (seg.href) {
                node = document.createElement('a');
                node.href = seg.href;
                node.target = '_blank';
                node.rel = 'noopener noreferrer';
            } else {
                node = document.createTextNode('');
            }
            textEl.appendChild(node);
            charIdx = 0;
        }

        nextSegment();
        timer = setInterval(function () {
            var seg = segments[segIdx];
            charIdx++;
            node.textContent = seg.text.slice(0, charIdx);
            if (charIdx >= seg.text.length) {
                segIdx++;
                if (segIdx >= segments.length) { clearInterval(timer); return; }
                nextSegment();
            }
        }, speed || 14);
    }

    function show(card) {
        var id = card.dataset.city;
        if (shown === id) return;
        shown = id;
        readout.dataset.type = card.dataset.type;
        headEl.textContent = card.querySelector('.city-card-name').textContent.trim() + ' · ' + card.dataset.role;
        type(card.dataset.text, card.dataset.linkWord, card.dataset.linkHref);
        cards.forEach(function (c) { c.classList.toggle('active', c === card); });
    }

    function reset() {
        shown = null;
        clearInterval(timer);
        delete readout.dataset.type;
        headEl.textContent = '';
        textEl.textContent = idle;
        cards.forEach(function (c) { c.classList.remove('active'); });
    }

    cards.forEach(function (card) {
        card.addEventListener('mouseenter', function () { show(card); });
        card.addEventListener('click',      function () { show(card); });
        card.addEventListener('focus',      function () { show(card); });
    });

    // Clicking a dot on the globe drives the readout too (null = cleared)
    var pinnedId = null;
    document.addEventListener('tg:city', function (e) {
        pinnedId = e.detail || null;
        if (!pinnedId) { reset(); return; }
        cards.forEach(function (c) { if (c.dataset.city === pinnedId) show(c); });
    });

    var host = document.querySelector('.team-split');
    host && host.addEventListener('mouseleave', function () { if (!pinnedId) reset(); });

    reset();
})();

// ── Chevy return state: remember pathname/language before leaving ──
(function () {
    var links = document.querySelectorAll('a[href$="chevy.html"]');
    if (!links.length) return;
    var lang = document.documentElement.lang || 'en';

    function saveReturnState() {
        try {
            sessionStorage.setItem('tg_chevy_return', JSON.stringify({
                pathname: window.location.pathname,
                search:   window.location.search,
                language: lang
            }));
        } catch (e) {}
    }

    links.forEach(function (link) {
        link.addEventListener('click', saveReturnState);
    });
})();

// ── Chevy return state: land on About after coming back ──
// chevy.html's "back to site" always targets pathname + "#about", so
// this only needs to jump there — no scrollY to restore anymore.
(function () {
    if (window.location.hash !== '#about') return;

    var raw;
    try { raw = sessionStorage.getItem('tg_chevy_return'); } catch (e) { raw = null; }
    if (!raw) return;

    var state;
    try { state = JSON.parse(raw); } catch (e) { return; }
    if (!state || state.pathname !== window.location.pathname) return;

    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

    function jumpToAbout() {
        var about = document.getElementById('about');
        if (!about) return;
        // Force an instant jump: some engines let CSS scroll-behavior:smooth
        // override an explicit behavior:'instant' scrollTo, causing an
        // animated (and interruptible) scroll instead of landing exactly
        // on section start.
        var html = document.documentElement, body = document.body;
        var prevHtmlBehavior = html.style.scrollBehavior;
        var prevBodyBehavior = body.style.scrollBehavior;
        html.style.scrollBehavior = 'auto';
        body.style.scrollBehavior = 'auto';
        window.scrollTo(0, about.getBoundingClientRect().top + window.scrollY);
        html.style.scrollBehavior = prevHtmlBehavior;
        body.style.scrollBehavior = prevBodyBehavior;
    }

    function restore() {
        jumpToAbout();
        // Late layout shift can move #about after this first jump —
        // most reliably from the custom @font-face's swap (font-display:
        // swap first paints a fallback font, then the real one lands and
        // reflows every heading's line count/height). document.fonts.ready
        // targets that directly; the timeouts are a blunt fallback for
        // anything else (canvas sizing, etc.) on engines without the
        // Font Loading API.
        [120, 400, 900].forEach(function (ms) { setTimeout(jumpToAbout, ms); });
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(jumpToAbout);
        }

        try { sessionStorage.removeItem('tg_chevy_return'); } catch (e) {}
        if ('scrollRestoration' in history) history.scrollRestoration = 'auto';
    }

    if (document.readyState === 'complete') restore();
    else window.addEventListener('load', restore);
})();
