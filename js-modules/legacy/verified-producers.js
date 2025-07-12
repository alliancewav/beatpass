// ============================================================
// Verified Producers Badge Module (extracted from BeatpassOptimizedIntegration.js)
// ============================================================
(function() {
    // Utility: Save to cache
    function saveToCache(key, data, ttl) {
        // Use VerifiedProducersInitManager cache if available
        if (window.VerifiedProducersInitManager && window.VerifiedProducersInitManager.cacheManager) {
            return window.VerifiedProducersInitManager.cacheManager.saveToCache(key, data, ttl);
        }
        
        // Fallback to original cache implementation
        const payload = { value: data, expiry: Date.now() + ttl };
        localStorage.setItem(key, JSON.stringify(payload));
    }
    
    // Utility: Get from cache
    function getFromCache(key) {
        // Use VerifiedProducersInitManager cache if available
        if (window.VerifiedProducersInitManager && window.VerifiedProducersInitManager.cacheManager) {
            return window.VerifiedProducersInitManager.cacheManager.getFromCache(key);
        }
        
        // Fallback to original cache implementation
        const item = JSON.parse(localStorage.getItem(key) || 'null');
        if (!item) return null;
        if (Date.now() > item.expiry) {
            localStorage.removeItem(key);
            return null;
        }
        return item.value;
    }

    // Fetch the central JSON of verified producers, with caching
    async function fetchCentralJSON(forceRefresh = false) {
        // Use VerifiedProducersInitManager API if available
        if (window.VerifiedProducersInitManager && window.VerifiedProducersInitManager.apiManager) {
            return await window.VerifiedProducersInitManager.apiManager.fetchVerifiedProducers(forceRefresh);
        }
        
        // Fallback to original API implementation
        const cacheKey = "verifiedProducers", ttl = 10 * 60 * 1000;
        if (!forceRefresh) {
            const cached = getFromCache(cacheKey);
            if (cached) return cached;
        }
        try {
            const res = await fetch("https://open.beatpass.ca/verifiedProducers.json");
            if (res.ok) {
                const data = await res.json();
                saveToCache(cacheKey, data, ttl);
                return data;
            }
        } catch {}
        return {};
    }

    // Send update to backend if verification status changes
    async function sendProducerVerificationUpdate(producerName, isVerified) {
        // Use VerifiedProducersInitManager API if available
        if (window.VerifiedProducersInitManager && window.VerifiedProducersInitManager.apiManager) {
            return await window.VerifiedProducersInitManager.apiManager.updateProducerVerification(producerName, isVerified);
        }
        
        // Fallback to original API implementation
        const url = `https://open.beatpass.ca/updateVerifiedProducers.php?producerName=${encodeURIComponent(producerName)}&verifiedStatus=${isVerified}`;
        try {
            const res = await fetch(url, { method: "GET" });
            return res.ok;
        } catch { return false; }
    }

    // Insert the verified badge SVG into the given container
    function insertVerifiedBadge(container, context = "") {
        // Use VerifiedProducersInitManager badge manager if available
        if (window.VerifiedProducersInitManager && window.VerifiedProducersInitManager.badgeManager) {
            return window.VerifiedProducersInitManager.badgeManager.insertBadge(container, context);
        }
        
        // Fallback to original badge insertion
        if (container.querySelector(".verified-badge")) return;
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("xmlns", svgNS);
        svg.setAttribute("viewBox", "0 0 64 64");
        svg.setAttribute("fill", "currentColor");
        svg.classList.add("verified-badge");
        if (context === "small-container") {
            svg.style.width = "14px"; svg.style.height = "14px"; svg.style.marginLeft = "6px";
        } else {
            svg.style.width = "20px"; svg.style.height = "20px"; svg.style.marginLeft = "8px";
        }
        svg.style.display = "inline-block";
        svg.style.verticalAlign = "middle";
        const path = document.createElementNS(svgNS, "path");
        path.setAttribute("fill-rule", "evenodd");
        path.setAttribute("d", "M32,6C17.641,6,6,17.641,6,32c0,14.359,11.641,26,26,26s26-11.641,26-26C58,17.641,46.359,6,32,6z M45.121,28.121l-13,13 C31.535,41.707,30.768,42,30,42s-1.535-0.293-2.121-0.879l-8-8c-1.172-1.171-1.172-3.071,0-4.242c1.172-1.172,3.07-1.172,4.242,0 L30,34.758l10.879-10.879c1.172-1.172,3.07-1.172,4.242,0C46.293,25.05,46.293,26.95,45.121,28.121z");
        svg.appendChild(path);
        container.appendChild(svg);
    }

    // Render badges from the cached verified producers list
    async function renderBadgesFromCache(verifiedProducers) {
        // Use VerifiedProducersInitManager badge manager if available
        if (window.VerifiedProducersInitManager && window.VerifiedProducersInitManager.badgeManager) {
            return await window.VerifiedProducersInitManager.badgeManager.renderBadges();
        }
        
        // Fallback to original badge rendering
        document.querySelectorAll('h1.text-2xl.md\\:text-4xl.font-semibold.mb-14.text-center.md\\:text-start')
            .forEach(titleEl => {
                const name = titleEl.textContent.trim();
                if (verifiedProducers[name]) insertVerifiedBadge(titleEl);
            });
        document.querySelectorAll('div.flex.items-center.gap-6.text-sm.text-muted > div.overflow-x-hidden.overflow-ellipsis > a[href^="/artist/"]')
            .forEach(linkEl => {
                const name = linkEl.textContent.trim();
                if (verifiedProducers[name]) insertVerifiedBadge(linkEl, "small-container");
            });
    }

    // Check and update producer verification status
    async function checkProducerVerification() {
        // Use VerifiedProducersInitManager badge manager if available
        if (window.VerifiedProducersInitManager && window.VerifiedProducersInitManager.badgeManager) {
            return await window.VerifiedProducersInitManager.badgeManager.checkProducerVerification();
        }
        
        // Fallback to original verification checking
        if (!window.location.href.includes("/artist/")) return;
        const nameEl = document.querySelector('h1.text-2xl.md\\:text-4xl.font-semibold.mb-14.text-center.md\\:text-start');
        if (!nameEl) return;
        const name = nameEl.textContent.trim();
        const verifiedElement = document.querySelector('div.absolute.bottom-24.left-0.right-0.mx-auto.flex.w-max.max-w-full.items-center.gap-6.rounded-full.bg-black\\/60.px-8.py-4.text-sm.text-white');
        const cached = await fetchCentralJSON(false);
        const isVerified = Boolean(verifiedElement);
        if (cached[name] !== isVerified) {
            if (await sendProducerVerificationUpdate(name, isVerified)) {
                cached[name] = isVerified;
                saveToCache("verifiedProducers", cached, 10 * 60 * 1000);
                renderBadgesFromCache(cached);
            }
        }
    }

    // Apply badges to the page
    async function applyVerifiedBadges() {
        const cached = await fetchCentralJSON(false);
        renderBadgesFromCache(cached);
        await checkProducerVerification();
    }

    // Set up a MutationObserver to re-apply badges on DOM changes
    function setupVerifiedBadgeObserver() {
        // Use VerifiedProducersInitManager if available for centralized observer management
        if (window.VerifiedProducersInitManager && window.VerifiedProducersInitManager.isInitialized()) {
            console.log('[VerifiedProducers] MutationObserver managed by VerifiedProducersInitManager');
            return; // Manager handles the observer
        }
        
        // Fallback to original observer setup
        const observer = new MutationObserver(() => applyVerifiedBadges());
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // Initialize the badge logic on DOMContentLoaded
    document.addEventListener('DOMContentLoaded', async function() {
        try {
            // Use VerifiedProducersInitManager if available
            if (window.VerifiedProducersInitManager) {
                console.log('[VerifiedProducers] Using VerifiedProducersInitManager for initialization');
                await window.VerifiedProducersInitManager.init();
            } else {
                // Fallback to original initialization
                console.log('[VerifiedProducers] Using fallback initialization');
                await fetchCentralJSON();
                await applyVerifiedBadges();
                setupVerifiedBadgeObserver();
            }
        } catch (error) {
            console.error('Error initializing verified producers:', error);
        }
    });
})();