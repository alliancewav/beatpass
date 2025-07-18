// ============================================================
// 7. CD Spin Animation for Track Images
// ============================================================
(function() {
    const BASE_SPEED_MIN = 5, BASE_SPEED_MAX = 9;
    const HOVER_FRACTION = 0.3, HOVER_SCALE = 1.03;
    const CLICK_POP_SCALE = 1.1, CLICK_POP_DURATION = 150;
    const ACCEL = 0.05, SCALE_ACCEL = 0.07, MAX_FPS = 30;
    const discs = [];
    const discMap = new WeakMap();

    function attachSpinLogic(img) {
        if (img.dataset.cdSpin === "true") return;
        img.dataset.cdSpin = "true";
        const baseSpeed = BASE_SPEED_MIN + Math.random() * (BASE_SPEED_MAX - BASE_SPEED_MIN);
        const hoverSpeed = baseSpeed * HOVER_FRACTION;
        const disc = { el: img, angle: 0, speed: 0, targetSpeed: baseSpeed, scale: 1, targetScale: 1, baseSpeed, hoverSpeed, isInView: false };
        img.style.transformOrigin = "50% 50%";
        img.addEventListener("mouseenter", () => { disc.targetSpeed = hoverSpeed; disc.targetScale = HOVER_SCALE; });
        img.addEventListener("mouseleave", () => { disc.targetSpeed = baseSpeed; disc.targetScale = 1; });
        img.addEventListener("click", () => {
            disc.targetScale = CLICK_POP_SCALE;
            setTimeout(() => {
                disc.targetScale = (disc.targetSpeed === hoverSpeed) ? HOVER_SCALE : 1;
            }, CLICK_POP_DURATION);
        });
        discs.push(disc);
        discMap.set(img, disc);
    }

    let lastUpdateTime = 0, frameInterval = 1000 / MAX_FPS;
    function animateAll(now) {
        requestAnimationFrame(animateAll);
        const dtMillis = now - lastUpdateTime;
        if (dtMillis < frameInterval) return;
        lastUpdateTime = now;
        const dt = dtMillis / 1000;
        discs.forEach(d => {
            if (!d.isInView) return;
            d.speed += (d.targetSpeed - d.speed) * ACCEL;
            d.angle = (d.angle + d.speed * dt) % 360;
            d.scale += (d.targetScale - d.scale) * SCALE_ACCEL;
            d.el.style.transform = `rotate(${d.angle}deg) scale(${d.scale})`;
        });
    }
    requestAnimationFrame(animateAll);

    const io = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            const d = discMap.get(entry.target);
            if (d) d.isInView = entry.isIntersecting;
        });
    }, { root: null, threshold: 0.01 });

    function scanForTrackImages() {
        document.querySelectorAll('img[src*="track_image"]').forEach(img => {
            attachSpinLogic(img);
            io.observe(img);
        });
    }

    const mutObserver = new MutationObserver(mutations => {
        mutations.forEach(mut => {
            mut.addedNodes.forEach(node => {
                if (node.nodeType === 1 && node.tagName === "IMG" && node.src.includes("track_image")) {
                    attachSpinLogic(node);
                    io.observe(node);
                }
            });
        });
    });

    function pruneDeadDiscs() {
        for (let i = discs.length - 1; i >= 0; i--) {
            if (!document.body.contains(discs[i].el)) {
                io.unobserve(discs[i].el);
                discs.splice(i, 1);
            }
        }
    }

    function initCDSpin() {
        scanForTrackImages();
        mutObserver.observe(document.body, { childList: true, subtree: true });
        setInterval(() => {
            scanForTrackImages();
            pruneDeadDiscs();
        }, 2000);
    }

    if (document.readyState === "interactive" || document.readyState === "complete") {
        initCDSpin();
    } else {
        document.addEventListener("DOMContentLoaded", initCDSpin);
    }
})();
