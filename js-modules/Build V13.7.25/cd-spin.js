// ============================================================
// 7. CD Spin Animation for Track Images
// ============================================================
(function() {
    const DEBUG = false;
    const BASE_SPEED_MIN = 5, BASE_SPEED_MAX = 9;
    const HOVER_FRACTION = 0.3, HOVER_SCALE = 1.03;
    const CLICK_POP_SCALE = 1.1, CLICK_POP_DURATION = 150;
    const ACCEL = 0.05, SCALE_ACCEL = 0.07, MAX_FPS = 30;
    const discs = [];
    const discMap = new WeakMap();

    function attachSpinLogic(img) {
        // Use CDSpinInitManager attachment if available
        if (window.CDSpinInitManager && window.CDSpinInitManager.attachSpinLogic) {
            return window.CDSpinInitManager.attachSpinLogic(img);
        }
        
        // Fallback to original attachment logic
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
        // Use CDSpinInitManager animation if available
        if (window.CDSpinInitManager && window.CDSpinInitManager.isInitialized()) {
            return; // Manager handles animation
        }
        
        // Fallback to original animation
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
    
    // Only start animation if manager is not available
    if (!window.CDSpinInitManager) {
        requestAnimationFrame(animateAll);
    }

    // Create intersection observer only if manager is not available
    let io;
    if (!window.CDSpinInitManager) {
        io = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                const d = discMap.get(entry.target);
                if (d) d.isInView = entry.isIntersecting;
            });
        }, { root: null, threshold: 0.01 });
    }

    function scanForTrackImages() {
        // Use CDSpinInitManager scanner if available
        if (window.CDSpinInitManager && window.CDSpinInitManager.scanManager) {
            return window.CDSpinInitManager.scanManager.scanForTrackImages();
        }
        
        // Fallback to original scanning
        document.querySelectorAll('img[src*="track_image"]').forEach(img => {
            attachSpinLogic(img);
            if (io) io.observe(img);
        });
    }

    // Create mutation observer only if manager is not available
    let mutObserver;
    if (!window.CDSpinInitManager) {
        const startObserving = () => {
            const targetNode = document.body || document.documentElement;
            if (!targetNode) {
                if (DEBUG) console.log('[CDSpin] DOM not ready, retrying in 100ms...');
                setTimeout(startObserving, 100);
                return;
            }

            mutObserver = new MutationObserver(mutations => {
                mutations.forEach(mut => {
                    mut.addedNodes.forEach(node => {
                        if (node.nodeType === 1 && node.tagName === "IMG" && node.src.includes("track_image")) {
                            attachSpinLogic(node);
                            if (io) io.observe(node);
                        }
                    });
                });
            });

            mutObserver.observe(targetNode, { childList: true, subtree: true });
        };
        startObserving();
    }

    function pruneDeadDiscs() {
        // Use CDSpinInitManager cleanup if available
        if (window.CDSpinInitManager && window.CDSpinInitManager.scanManager) {
            return window.CDSpinInitManager.scanManager.pruneDeadDiscs();
        }
        
        // Fallback to original cleanup
        for (let i = discs.length - 1; i >= 0; i--) {
            if (!document.body.contains(discs[i].el)) {
                if (io) io.unobserve(discs[i].el);
                discs.splice(i, 1);
            }
        }
    }

    function initCDSpin() {
        // Use CDSpinInitManager if available
        if (window.CDSpinInitManager) {
            console.log('[CDSpin] Using CDSpinInitManager for initialization');
            return window.CDSpinInitManager.init();
        }
        
        // Fallback to original initialization
        if (DEBUG) console.log('[CDSpin] Using fallback initialization');
        scanForTrackImages();
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
