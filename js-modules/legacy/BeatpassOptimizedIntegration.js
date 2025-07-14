// BeatpassOptimizedIntegration.js

// ============================================================
// Style Injection: Hide the exclusive license popup button
// ============================================================
const licenseStyle = document.createElement('style');
licenseStyle.textContent = `
/* Hide the exclusive license popup button container completely so it never flashes */
.FloatingButton__FloatingButtonContainer-sc-q5md4t-0.gQsXAb {
    display: none !important;
}
`;
document.head.appendChild(licenseStyle);

// ============================================================
// Helper: Load external scripts dynamically
// ============================================================
function loadScript(src, { async = false, defer = false } = {}) {
    const s = document.createElement('script');
    s.src = src;
    if (async) s.async = true;
    if (defer) s.defer = true;
    document.head.appendChild(s);
}

// ============================================================
// 1. Webpushr & External Widget Integrations
// ============================================================

// Webpushr for push notifications
loadScript('https://cdn.webpushr.com/sw-server.min.js', { async: true });
(function(w, d, s, id) {
    if (typeof(w.webpushr) !== 'undefined') return;
    w.webpushr = w.webpushr || function() {
        (w.webpushr.q = w.webpushr.q || []).push(arguments);
    };
    var js,
        fjs = d.getElementsByTagName(s)[0];
    js = d.createElement(s);
    js.id = id;
    js.async = 1;
    js.src = "https://cdn.webpushr.com/app.min.js";
    fjs.parentNode.appendChild(js);
}(window, document, 'script', 'webpushr-jssdk'));

webpushr('setup', {
    'key': 'BD9-HZVHJNOvIguBIG12bVGG7HBER_j11kXu84ymCs9CUXla9KdJxXLOzq_c2uv9YfqYdE6NP9_-GWxQ_U8qFY4'
});

// Studio booking and license widgets (Elfsight)
loadScript('https://static.elfsight.com/platform/platform.js', { async: true });
// Note: Ensure the following DIVs exist in your HTML:
// <div class="elfsight-app-ab4dcb23-6b3c-470b-a8d2-4b613fd231e1" data-elfsight-app-lazy></div>
// <div class="elfsight-app-291ac0e2-5475-4e52-9672-73ff73c21b78" data-elfsight-app-lazy></div>

// OpenWidget: communication tool
window.__ow = window.__ow || {};
window.__ow.organizationId = "b3302ecd-2723-4154-95ee-1468ed9f1e4a";
window.__ow.integration_name = "manual_settings";
window.__ow.product_name = "openwidget";
(function(n, t, c) {
    function i(n) {
        return e._h ? e._h.apply(null, n) : e._q.push(n);
    }
    var e = {
        _q: [],
        _h: null,
        _v: "2.0",
        on: function() { i(["on", c.call(arguments)]); },
        once: function() { i(["once", c.call(arguments)]); },
        off: function() { i(["off", c.call(arguments)]); },
        get: function() {
            if (!e._h) throw new Error("[OpenWidget] You can't use getters before load.");
            return i(["get", c.call(arguments)]);
        },
        call: function() { i(["call", c.call(arguments)]); },
        init: function() {
            var script = t.createElement("script");
            script.async = true;
            script.type = "text/javascript";
            script.src = "https://cdn.openwidget.com/openwidget.js";
            t.head.appendChild(script);
        }
    };
    !n.__ow.asyncInit && e.init();
    n.OpenWidget = n.OpenWidget || e;
}(window, document, [].slice));

// ============================================================
// 2. App Configuration & Context Menu Disable
// ============================================================
document.addEventListener('contextmenu', event => {
    event.preventDefault();
});

// ============================================================
// 3. Common Utility & Helper Functions
// ============================================================
const DEBUG = false; // Disabled to reduce console noise

function logDebug(...args) {
    if (DEBUG) console.log(...args);
}

function isDesktop() {
    return window.matchMedia("(min-width: 1024px)").matches;
}

function waitForElement(selector) {
    return new Promise(resolve => {
        const existing = document.querySelector(selector);
        if (existing) return resolve(existing);
        const observer = new MutationObserver(() => {
            const found = document.querySelector(selector);
            if (found) {
                observer.disconnect();
                resolve(found);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    });
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}


// ============================================================
// 5. Unified Body-Level Observer (Dynamic UI Updates)
// ============================================================
document.addEventListener("DOMContentLoaded", function() {
    const trackPagePattern = /^https:\/\/open\.beatpass\.ca\/track\//;

    function replaceMicrophoneIcons() {
        const micButton = document.querySelector('button[aria-label="Lyrics"]');
        const secondIcon = document.querySelector('div.h-auto.mb-24 svg[data-testid="MediaMicrophoneIcon"]');
        const visible = el => el && el.offsetParent !== null;
        if (micButton && visible(micButton)) {
            const svg = micButton.querySelector('svg');
            if (svg) {
                svg.remove();
                micButton.innerHTML = '<i class="fa fa-copyright"></i>';
            }
        }
        if (secondIcon && visible(secondIcon)) {
            const parent = secondIcon.parentElement;
            if (parent) {
                secondIcon.remove();
                const rep = document.createElement('i');
                rep.classList.add('fa', 'fa-copyright');
                parent.appendChild(rep);
            }
        }
    }

    function addBuyButton() {
        if (!trackPagePattern.test(window.location.href)) return;
        const more = document.querySelector('button svg[data-testid="MoreHorizOutlinedIcon"]');
        if (more && !document.querySelector('#buy-exclusively-btn')) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.id = "buy-exclusively-btn";
            btn.className = more.closest('button').className + " buy-exclusively-btn";
            btn.innerHTML = `
<svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg"
viewBox="0 0 24 24" width="24" height="24">
<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H8v-2h4v2zm4-4H8v-2h8v2zm0-4H8V7h8v2z"/>
</svg>
Request License
`;
            btn.addEventListener("click", triggerLicensePurchaseForm);
            more.closest('button').parentNode.insertBefore(btn, more.closest('button').nextSibling);
        }
    }

    function triggerLicensePurchaseForm() {
        const licenseBtn = document.querySelector('.FloatingButton__FloatingButtonContainer-sc-q5md4t-0.gQsXAb .es-forms-floating-button');
        if (licenseBtn) {
            licenseBtn.click();
        } else {
            let retries = 0, max = 20;
            const iv = setInterval(() => {
                const retryBtn = document.querySelector('.FloatingButton__FloatingButtonContainer-sc-q5md4t-0.gQsXAb .es-forms-floating-button');
                if (retryBtn) {
                    retryBtn.click();
                    clearInterval(iv);
                } else if (retries++ >= max) {
                    clearInterval(iv);
                }
            }, 500);
        }
    }

    function removeLicenseFloatingButton() {
        const fb = document.querySelector('.FloatingButton__FloatingButtonContainer-sc-q5md4t-0.gQsXAb .es-forms-floating-button');
        if (fb) fb.style.display = "none";
    }

    function removeShareButton() {
        const shareIcon = document.querySelector('svg[data-testid="ShareOutlinedIcon"]');
        if (shareIcon) {
            const btn = shareIcon.closest('button');
            if (btn) btn.remove();
        }
    }

    function applyBannerLoad() {
        document.querySelectorAll('.banner-container').forEach(b => b.classList.add('loaded'));
    }

    function checkNewNode(node) {
        if (node.nodeType !== 1) return;
        if (node.matches?.('.max-h-full.w-full.flex-shrink-0.object-cover, .bg-chip img')) {
            logDebug("A new track image node was added - reinit color extraction");
            changeBackgroundGradient();
        }
        node.querySelectorAll?.('img').forEach(img => {
            if (img.matches('.max-h-full.w-full.flex-shrink-0.object-cover, .bg-chip img')) {
                logDebug("A new <img> matching track image selectors was added");
                changeBackgroundGradient();
            }
        });
    }

    const unifiedObserver = new MutationObserver(debounce((mutations) => {
        logDebug("Observer triggered. Checking for changes...");
        let trackSrcChanged = false;
        replaceMicrophoneIcons();
        removeShareButton();
        applyBannerLoad();
        addBuyButton();
        removeLicenseFloatingButton();
        mutations.forEach(m => {
            if (m.type === 'attributes' && m.attributeName === 'src' &&
               (m.target.matches('.max-h-full.w-full.flex-shrink-0.object-cover') ||
                m.target.matches('.bg-chip img'))) {
                trackSrcChanged = true;
                logDebug("Observer: track image <img> src changed");
            }
            if (m.type === 'childList' && m.addedNodes.length > 0) {
                m.addedNodes.forEach(node => checkNewNode(node));
            }
        });
        if (trackSrcChanged) changeBackgroundGradient();
    }, 300));

    unifiedObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['src']
    });

    replaceMicrophoneIcons();
    removeShareButton();
    applyBannerLoad();
    addBuyButton();
    removeLicenseFloatingButton();

    const originalPushState = history.pushState;
    history.pushState = function(...args) {
        originalPushState.apply(this, args);
        addBuyButton();
        removeLicenseFloatingButton();
    };
    window.addEventListener('popstate', addBuyButton);
    window.addEventListener('resize', replaceMicrophoneIcons);
});

// ============================================================
// 6. LocalStorage Cache & Verified Producers Badge Handling
// ============================================================
// (Moved to verified-producers.js)
// ... existing code ...

// ============================================================
// 9. Custom Fields, Form Handlers, Track Data Injection & SPA Routing
// ============================================================
// (Moved to custom-fields.js)
// ... existing code ...

// ============================================================
// Immersive Page Styling
// ============================================================
(function() {
    const observer = new MutationObserver(onDomChange);
    observer.observe(document.documentElement, { childList: true, subtree: true });

    let lastImgSrc = null, container = null;

    function isImmersivePage() {
        const url = window.location.href;
        return url.includes('/artist/') || url.includes('/album/');
    }

    function onDomChange() {
        if (!isImmersivePage()) {
            removeBlur();
            return;
        }
        container = document.querySelector('.web-player-container');
        if (!container) return;
        const img = container.querySelector('img[alt^="Image for"]');
        if (!img || !img.src) return;
        if (img.src === lastImgSrc) return;
        lastImgSrc = img.src;
        container.style.setProperty('--producer-bg-image', `url("${img.src}")`);
        container.classList.add('has-blur-bg');
        console.log("Immersive background applied using image:", img.src);
    }

    function removeBlur() {
        container = document.querySelector('.web-player-container');
        if (container) {
            container.classList.remove('has-blur-bg');
            container.style.removeProperty('--producer-bg-image');
        }
        lastImgSrc = null;
        console.log("Immersive background removed");
    }

    (function(history) {
        const pushState = history.pushState;
        history.pushState = function() {
            const result = pushState.apply(history, arguments);
            setTimeout(onDomChange, 0);
            return result;
        };
        const replaceState = history.replaceState;
        history.replaceState = function() {
            const result = replaceState.apply(history, arguments);
            setTimeout(onDomChange, 0);
            return result;
        };
    })(window.history);

    window.addEventListener("popstate", onDomChange);

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", onDomChange);
    } else {
        onDomChange();
    }
})();

// ============================================================
// Remove Top Section Ad from Producer Pages
// ============================================================
(function() {
    function shouldHideAds() {
        const url = window.location.href;
        return url.includes("/artist/") || url.includes("/track/") || url.includes("/album/");
    }
    function removeAds() {
        if (shouldHideAds()) {
            document.querySelectorAll("div.ad-host.general_top-host").forEach(ad => {
                ad.remove();
                console.log("Removed ad element:", ad);
            });
        }
    }
    const observer = new MutationObserver(() => {
        if (shouldHideAds()) removeAds();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setInterval(removeAds, 500);
    (function(history) {
        const pushState = history.pushState;
        history.pushState = function() {
            const res = pushState.apply(history, arguments);
            setTimeout(removeAds, 0);
            return res;
        };
        const replaceState = history.replaceState;
        history.replaceState = function() {
            const res = replaceState.apply(history, arguments);
            setTimeout(removeAds, 0);
            return res;
        };
    })(window.history);
    window.addEventListener("popstate", removeAds);
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", removeAds);
    } else {
        removeAds();
    }
})();

// ============================================================
// Native Booking Button Override
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
    const nativeButton = document.querySelector('a[data-menu-item-id="NsU_Z1"]');
    if (nativeButton) {
        nativeButton.removeAttribute("href");
        nativeButton.addEventListener("click", e => {
            e.preventDefault();
            if (typeof window.openBookingForm === "function") {
                window.openBookingForm();
            } else {
                console.error("openBookingForm function is not available.");
            }
        });
    } else {
        console.error("Native booking button not found.");
    }
});

// ============================================================
// 10. CoverArtUpdater: Dynamic Cover Art Based on Genre
// ============================================================
(function() {
    console.log("[CoverArtUpdater] Script executing.");

    function isBackstagePage() {
        return window.location.href.match(/\/backstage\/(upload|tracks\/\d+\/edit)/);
    }

    let lastURL = window.location.href;
    setInterval(() => {
        if (window.location.href !== lastURL) {
            lastURL = window.location.href;
            console.log("[CoverArtUpdater] URL changed to:", lastURL);
            if (isBackstagePage()) {
                console.log("[CoverArtUpdater] Backstage page detected via URL polling. Reinitializing updater.");
                initCoverArtUpdater();
            }
        }
    }, 500);

    (function(history) {
        const pushState = history.pushState;
        history.pushState = function() {
            pushState.apply(history, arguments);
            window.dispatchEvent(new Event('locationchange'));
        };
        const replaceState = history.replaceState;
        history.replaceState = function() {
            replaceState.apply(history, arguments);
            window.dispatchEvent(new Event('locationchange'));
        };
    })(window.history);

    window.addEventListener('popstate', () => {
        console.log("[CoverArtUpdater] popstate detected.");
        setTimeout(initCoverArtUpdater, 100);
    });
    window.addEventListener('locationchange', () => {
        console.log("[CoverArtUpdater] locationchange detected.");
        setTimeout(initCoverArtUpdater, 100);
    });

    function waitForElementIndefinitely(selector) {
        return new Promise(resolve => {
            let el = document.querySelector(selector);
            if (el) {
                console.log("[CoverArtUpdater] Found element for selector:", selector);
                return resolve(el);
            }
            console.log("[CoverArtUpdater] Persistently waiting for element with selector:", selector);
            const obs = new MutationObserver(() => {
                el = document.querySelector(selector);
                if (el) {
                    console.log("[CoverArtUpdater] Found element after waiting for selector:", selector);
                    obs.disconnect();
                    resolve(el);
                }
            });
            obs.observe(document.body, { childList: true, subtree: true });
        });
    }

    const genreBaseMap = {
        "DNB / 2-Step": "DNB",
        "Exclusive": "Exclusive",
        "Drill / Grime": "DRILL",
        "Hip-Hop / Rap": "TRAP",
        "R&B / Soul": "RNB",
        "Pop / Hip-Hop": "POP HIPHOP",
        "New Jazz / Trap": "NEWJAZZ",
        "LO-FI / Ambient": "LOFI",
        "New Gen / Hyper": "HYPER",
        "Electronic & House": "HOUSE",
        "Afro / Dancehall": "AFRO",
        "Old School / Boom Bap": "OLD SCHOOL"
    };

    const baseOrder = ["AFRO", "DNB", "DRILL", "Exclusive", "HOUSE", "HYPER", "LOFI", "NEWJAZZ", "POP HIPHOP", "TRAP", "RNB", "OLD SCHOOL"];

    const coverArtLinks = {
        "DNB": ["DNB 1.webp", "DNB 2.webp"],
        "Exclusive": ["Exclusive 1.webp", "Exclusive 2.webp"],
        "DRILL": ["DRILL 1.webp", "DRILL 2.webp"],
        "TRAP": ["TRAP 1.webp", "TRAP 2.webp"],
        "RNB": ["RNB 1.webp", "RNB 2.webp"],
        "POP HIPHOP": ["POP HIPHOP 1.webp", "POP HIPHOP 2.webp"],
        "NEWJAZZ": ["NEWJAZZ 1.webp", "NEWJAZZ 2.webp"],
        "LOFI": ["LOFI 1.webp", "LOFI 2.webp"],
        "HYPER": ["HYPER 1.webp", "HYPER 2.webp"],
        "HOUSE": ["HOUSE 1.webp", "HOUSE 2.webp"],
        "AFRO": ["AFRO 1.webp", "AFRO 2.webp"],
        "OLD SCHOOL": ["OLD SCHOOL 1.webp", "OLD SCHOOL 2.webp"],

        "AFRO DRILL": ["AFRO DRILL 1.webp", "AFRO DRILL 2.webp"],
        "AFRO HOUSE": ["AFRO HOUSE 1.webp", "AFRO HOUSE 2.webp"],
        "AFRO HYPER": ["AFRO HYPER 1.webp", "AFRO HYPER 2.webp"],
        "AFRO LOFI": ["AFRO LOFI 1.webp", "AFRO LOFI 2.webp"],
        "AFRO OLDSCHOOL": ["AFRO OLDSCHOOL 1.webp", "AFRO OLDSCHOOL 2.webp"],
        "AFRO RNB": ["AFRO RNB 1.webp", "AFRO RNB 2.webp"],
        "AFRO TRAP": ["AFRO TRAP 1.webp", "AFRO TRAP 2.webp"],
        "DRILL HOUSE": ["DRILL HOUSE 1.webp", "DRILL HOUSE 2.webp"],
        "DRILL HYPER": ["DRILL HYPER 1.webp", "DRILL HYPER 2.webp"],
        "DRILL LOFI": ["DRILL LOFI 1.webp", "DRILL LOFI 2.webp"],
        "DRILL OLDSCHOOL": ["DRILL OLDSCHOOL 1.webp", "DRILL OLDSCHOOL 2.webp"],
        "DRILL RNB": ["DRILL RNB 1.webp", "DRILL RNB 2.webp"],
        "DRILL TRAP": ["DRILL TRAP 1.webp", "DRILL TRAP 2.webp"],
        "HOUSE TRAP": ["HOUSE TRAP 1.webp", "HOUSE TRAP 2.webp"],
        "POP HOUSE": ["POP HOUSE 1.webp", "POP HOUSE 2.webp"],
        "POP RNB": ["POP RNB 1.webp", "POP RNB 2.webp"],
        "HYPER LOFI": ["HYPER LOFI 1.webp", "HYPER LOFI 2.webp"],
        "HYPER OLDSCHOOL": ["HYPER OLDSCHOOL 1.webp", "HYPER OLDSCHOOL 2.webp"],
        "HYPER RNB": ["HYPER RNB 1.webp", "HYPER RNB 2.webp"],
        "HYPER TRAP": ["HYPER TRAP 1.webp", "HYPER TRAP 2.webp"],
        "LOFI OLDSCHOOL": ["LOFI OLDSCHOOL 1.webp", "LOFI OLDSCHOOL 2.webp"],
        "LOFI RNB": ["LOFI RNB 1.webp", "LOFI RNB 2.webp"],
        "LOFI TRAP": ["LOFI TRAP 1.webp", "LOFI TRAP 2.webp"],

        "TRAP OLDSCHOOL": ["TRAP OLDSCHOOL 1.webp", "TRAP OLDSCHOOL 2.webp"],
        "TRAP RNB": ["TRAP RNB 1.webp", "TRAP RNB 2.webp"],
        "RNB OLDSCHOOL": ["RNB OLDSCHOOL 1.webp", "RNB OLDSCHOOL 2.webp"]
    };

    function sortBaseNames(bases) {
        return bases.slice().sort((a, b) => {
            let ia = baseOrder.indexOf(a), ib = baseOrder.indexOf(b);
            if (ia === -1) ia = Number.MAX_SAFE_INTEGER;
            if (ib === -1) ib = Number.MAX_SAFE_INTEGER;
            return ia - ib;
        });
    }
    function combineName(name) {
        return name === "OLD SCHOOL" ? "OLDSCHOOL" : name;
    }
    function debounceFunc(func, delay) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }

    async function waitForElement(selector) {
        return new Promise(resolve => {
            let el = document.querySelector(selector);
            if (el) return resolve(el);
            const obs = new MutationObserver(() => {
                el = document.querySelector(selector);
                if (el) {
                    obs.disconnect();
                    resolve(el);
                }
            });
            obs.observe(document.body, { childList: true, subtree: true });
        });
    }

    async function getGenreItemsContainer() {
        const input = document.querySelector('input[name="genres"]');
        if (!input) {
            console.warn("[CoverArtUpdater] Genre input field not found.");
            return null;
        }
        const group = input.closest('div[role="group"]');
        if (!group) {
            console.warn("[CoverArtUpdater] Genre group container not found.");
            return null;
        }
        const container = group.querySelector('div.flex.flex-wrap.items-center.gap-8');
        if (!container) console.warn("[CoverArtUpdater] Genre items container not found within group.");
        return container;
    }

    function updateCoverArtField(url) {
        let coverInput = document.querySelector('input[name="cover_art_url"]');
        if (!coverInput) {
            const genreInput = document.querySelector('input[name="genres"]');
            if (genreInput) {
                const form = genreInput.closest("form");
                if (form) {
                    coverInput = document.createElement("input");
                    coverInput.type = "hidden";
                    coverInput.name = "cover_art_url";
                    form.appendChild(coverInput);
                    console.log("[CoverArtUpdater] Created hidden cover_art_url field.");
                } else {
                    console.warn("[CoverArtUpdater] Form not found for cover_art_url field.");
                    return;
                }
            } else {
                console.warn("[CoverArtUpdater] Genre input not found; cannot update cover_art_url.");
                return;
            }
        }
        coverInput.value = url;
        console.log("[CoverArtUpdater] Updated cover_art_url field with URL:", url);
    }

    async function simulateFileUpload(url) {
        try {
            console.log("[CoverArtUpdater] Simulating file upload for URL:", url);
            const res = await fetch(url);
            const blob = await res.blob();
            const filename = url.split("/").pop();
            const file = new File([blob], filename, { type: blob.type });
            const dt = new DataTransfer();
            dt.items.add(file);
            const fileInput = document.querySelector('input[type="file"]');
            if (fileInput) {
                fileInput.files = dt.files;
                fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                console.log("[CoverArtUpdater] Simulated file upload with file:", file);
            } else {
                console.warn("[CoverArtUpdater] File input element not found.");
            }
        } catch (err) {
            console.error("[CoverArtUpdater] Error simulating file upload:", err);
        }
    }

    let lastCoverUrl = "";
    const updateArtworkPreviewDebounced = debounceFunc(async function() {
        console.log("[CoverArtUpdater] updateArtworkPreview called.");
        const artworkContainer = await waitForElement('.w-full.md\\:w-224.aspect-square.rounded.group');
        if (!artworkContainer) {
            console.warn("[CoverArtUpdater] Artwork container not found.");
            return;
        }

        const container = await getGenreItemsContainer();
        if (!container) {
            console.warn("[CoverArtUpdater] Genre items container not found.");
            return;
        }

        const items = Array.from(container.children);
        console.log("[CoverArtUpdater] Genre items:", items.map(i => i.textContent.trim()));

        if (items.length === 0) {
            const blank = "https://open.beatpass.ca/ediscs/Blank.webp";
            artworkContainer.style.backgroundImage = `url("${blank}")`;
            updateCoverArtField(blank);
            lastCoverUrl = blank;
            return;
        }

        let selected = items.slice(0, 2).map(i => i.textContent.trim());
        console.log("[CoverArtUpdater] Selected genres:", selected);

        let baseNames = selected.map(g => genreBaseMap[g] || g);
        console.log("[CoverArtUpdater] Base names:", baseNames);

        let newUrl = "";
        if (baseNames.length >= 2) {
            const sorted = sortBaseNames(baseNames);
            console.log("[CoverArtUpdater] Sorted base names:", sorted);
            const comboKey = sorted.map(n => combineName(n)).join(" ");
            console.log("[CoverArtUpdater] Combination key:", comboKey);
            if (coverArtLinks[comboKey]) {
                const picks = coverArtLinks[comboKey];
                newUrl = `https://open.beatpass.ca/ediscs/${encodeURIComponent(picks[Math.floor(Math.random()*picks.length)])}`;
                console.log("[CoverArtUpdater] Combination key found:", comboKey);
            } else {
                console.log("[CoverArtUpdater] No valid combination key found. Falling back to single genre.");
            }
        }
        if (!newUrl) {
            const fallback = baseNames[Math.floor(Math.random() * baseNames.length)];
            console.log("[CoverArtUpdater] Fallback key:", fallback);
            if (!coverArtLinks[fallback]) {
                console.warn("[CoverArtUpdater] No cover art mapping found for fallback key:", fallback);
                return;
            }
            const picks = coverArtLinks[fallback];
            newUrl = `https://open.beatpass.ca/ediscs/${encodeURIComponent(picks[Math.floor(Math.random()*picks.length)])}`;
        }

        console.log("[CoverArtUpdater] Final URL:", newUrl);
        if (newUrl === lastCoverUrl) {
            console.log("[CoverArtUpdater] URL unchanged. No update needed.");
            return;
        }
        lastCoverUrl = newUrl;
        artworkContainer.style.backgroundImage = `url("${newUrl}")`;
        updateCoverArtField(newUrl);
        simulateFileUpload(newUrl);
    }, 300);

    async function attachGenreListeners() {
        const container = await getGenreItemsContainer();
        if (!container) {
            console.warn("[CoverArtUpdater] Genre container not found.");
            return;
        }
        console.log("[CoverArtUpdater] Attaching listeners on container.");

        container.addEventListener('click', e => {
            let target = e.target;
            while (target && target !== container && !target.classList.contains('cursor-pointer')) {
                target = target.parentElement;
            }
            if (target && target !== container) {
                console.log("[CoverArtUpdater] Genre item clicked:", target.textContent.trim());
                target.classList.toggle('selected');
                updateArtworkPreviewDebounced();
            }
        });

        const obs = new MutationObserver(muts => {
            if (muts.length > 0) {
                console.log("[CoverArtUpdater] Mutation batch in genre container detected.");
                updateArtworkPreviewDebounced();
            }
        });
        obs.observe(container, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    }

    async function observeGenreField() {
        const input = document.querySelector('input[name="genres"]');
        if (!input) {
            console.warn("[CoverArtUpdater] Genre input field not found for observation.");
            return;
        }
        const group = input.closest('div[role="group"]');
        if (!group) {
            console.warn("[CoverArtUpdater] Genre group container not found.");
            return;
        }
        console.log("[CoverArtUpdater] Observing genre group for re-rendering.");
        const obs = new MutationObserver(muts => {
            if (muts.length > 0) {
                console.log("[CoverArtUpdater] Mutation batch in genre group detected.");
                attachGenreListeners();
                updateArtworkPreviewDebounced();
            }
        });
        obs.observe(group, { childList: true, subtree: true });
    }

    async function waitForGenreInputIndefinitely() {
        return new Promise(resolve => {
            let el = document.querySelector('input[name="genres"]');
            if (el) return resolve(el);
            const obs = new MutationObserver(() => {
                el = document.querySelector('input[name="genres"]');
                if (el) {
                    obs.disconnect();
                    resolve(el);
                }
            });
            obs.observe(document.body, { childList: true, subtree: true });
        });
    }

    async function initUploadPage() {
        console.log("[CoverArtUpdater] Upload page detected; waiting for genre input...");
        await waitForGenreInputIndefinitely();
        console.log("[CoverArtUpdater] Genre input detected on upload page. Initializing updater.");
        initCoverArtUpdater();
    }

    async function initCoverArtUpdater() {
        console.log("[CoverArtUpdater] initCoverArtUpdater invoked.");
        if (window.location.href.match(/\/backstage\/upload/) && !document.querySelector('input[name="genres"]')) {
            console.log("[CoverArtUpdater] Genre input not present on upload page. Initiating persistent wait.");
            initUploadPage();
            return;
        }
        try {
            await waitForElement('input[name="genres"]');
        } catch (err) {
            console.warn("[CoverArtUpdater] " + err.message);
            return;
        }
        attachGenreListeners();
        observeGenreField();
        updateArtworkPreviewDebounced();
    }

    window.addEventListener("load", () => {
        console.log("[CoverArtUpdater] Window load event. Initializing updater.");
        initCoverArtUpdater();
    });
    document.addEventListener("DOMContentLoaded", () => {
        console.log("[CoverArtUpdater] DOMContentLoaded event. Initializing updater.");
        initCoverArtUpdater();
    });
    window.addEventListener('popstate', () => {
        console.log("[CoverArtUpdater] popstate detected.");
        setTimeout(initCoverArtUpdater, 100);
    });
    window.addEventListener('locationchange', () => {
        console.log("[CoverArtUpdater] locationchange detected.");
        setTimeout(initCoverArtUpdater, 100);
    });
})();

// Add save button styling function
function styleSaveButton(button) {
    if (!button) return;
    
    // Add base classes
    button.classList.add(
        'focus-visible:ring',
        'text-on-primary',
        'bg-primary',
        'border',
        'border-primary',
        'hover:bg-primary-dark',
        'hover:border-primary-dark',
        'disabled:text-disabled',
        'disabled:bg-disabled',
        'disabled:border-transparent',
        'disabled:shadow-none',
        'whitespace-nowrap',
        'inline-flex',
        'align-middle',
        'flex-shrink-0',
        'items-center',
        'transition-button',
        'duration-200',
        'select-none',
        'appearance-none',
        'no-underline',
        'outline-none',
        'disabled:pointer-events-none',
        'disabled:cursor-default',
        'rounded-button',
        'justify-center',
        'font-semibold',
        'text-sm',
        'h-36',
        'px-18'
    );

    // Add CSS variables if not already present
    if (!document.getElementById('save-button-styles')) {
        const style = document.createElement('style');
        style.id = 'save-button-styles';
        style.textContent = `
            :root {
                --primary: #1a1a1a;
                --primary-dark: #2a2a2a;
                --on-primary: #ffffff;
                --disabled: #666666;
            }
        `;
        document.head.appendChild(style);
    }
}

// Add BeatPassID button custom CSS if not already present
if (!document.getElementById('beatpass-id-button-style')) {
    const style = document.createElement('style');
    style.id = 'beatpass-id-button-style';
    style.textContent = `
        button.beatpass-id-button.ml-2.px-4.py-2.rounded-lg.text-sm.font-medium.flex.items-center.gap-2 {
            height: 2.25rem;
            margin: 0.4rem;
        }
    `;
    document.head.appendChild(style);
}

// Ensure initialization if loaded after DOMContentLoaded
if (document.readyState !== 'loading') {
    try {
        if (typeof robustInitialize === 'function') robustInitialize();
        if (typeof initTrackPage === 'function') initTrackPage();
        if (typeof observeTrackChanges === 'function') observeTrackChanges();
    } catch (e) {
        // Ignore errors if functions are not defined
    }
}

// ============================================================
// Remove 'Upload void cheque for payout' Button on Artist Request Pages
// ============================================================
(function() {
    // The two target URLs
    const targetPaths = [
        '/backstage/requests/become-artist',
        '/backstage/requests/claim-artist'
    ];
    // Helper to check if current path matches
    function isArtistRequestPage() {
        return targetPaths.some(path => window.location.pathname === path);
    }
    // Helper to match the button by its SVG icon and text
    function findAndRemoveChequeButton() {
        if (!isArtistRequestPage()) return;
        // Find all buttons on the page
        const buttons = document.querySelectorAll('button');
        buttons.forEach(btn => {
            // Check for the DocumentScannerOutlinedIcon SVG and the exact text
            const svg = btn.querySelector('svg[data-testid="DocumentScannerOutlinedIcon"]');
            if (svg && btn.textContent.includes('Upload void cheque for payout')) {
                btn.remove();
            }
        });
    }
    // Observe DOM changes for dynamic navigation
    const observer = new MutationObserver(() => {
        findAndRemoveChequeButton();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    // Also run on initial load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', findAndRemoveChequeButton);
    } else {
        findAndRemoveChequeButton();
    }
    // Patch history for SPA navigation
    (function(history) {
        const pushState = history.pushState;
        history.pushState = function() {
            const res = pushState.apply(history, arguments);
            setTimeout(findAndRemoveChequeButton, 0);
            return res;
        };
        const replaceState = history.replaceState;
        history.replaceState = function() {
            const res = replaceState.apply(history, arguments);
            setTimeout(findAndRemoveChequeButton, 0);
            return res;
        };
    })(window.history);
    window.addEventListener('popstate', findAndRemoveChequeButton);
})();