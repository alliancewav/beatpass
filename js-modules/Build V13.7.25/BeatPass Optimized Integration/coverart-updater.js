// CoverArtUpdater Module
// Dynamic Cover Art Based on Genre - IIFE Module

(function() {
    'use strict';
    
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
            const startObserving = () => {
                const targetNode = document.body || document.documentElement;
                if (!targetNode) {
                    console.warn('[CoverArtUpdater] DOM not ready for observer, retrying...');
                    setTimeout(startObserving, 100);
                    return;
                }
                
                const obs = new MutationObserver(() => {
                    el = document.querySelector(selector);
                    if (el) {
                        console.log("[CoverArtUpdater] Found element after waiting for selector:", selector);
                        obs.disconnect();
                        resolve(el);
                    }
                });
                obs.observe(targetNode, { childList: true, subtree: true });
            };
            startObserving();
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
            const startObserving = () => {
                const targetNode = document.body || document.documentElement;
                if (!targetNode) {
                    console.warn('[CoverArtUpdater] DOM not ready for waitForElement observer, retrying...');
                    setTimeout(startObserving, 100);
                    return;
                }
                
                const obs = new MutationObserver(() => {
                    el = document.querySelector(selector);
                    if (el) {
                        obs.disconnect();
                        resolve(el);
                    }
                });
                obs.observe(targetNode, { childList: true, subtree: true });
            };
            startObserving();
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

        const startObserving = () => {
            const targetNode = document.body || document.documentElement;
            if (!targetNode) {
                console.warn('[CoverArtUpdater] DOM not ready for genre container observer, retrying...');
                setTimeout(startObserving, 100);
                return;
            }
            
            const obs = new MutationObserver(muts => {
                if (muts.length > 0) {
                    console.log("[CoverArtUpdater] Mutation batch in genre container detected.");
                    updateArtworkPreviewDebounced();
                }
            });
            obs.observe(container, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
        };
        startObserving();
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
        const startObserving = () => {
            const targetNode = document.body || document.documentElement;
            if (!targetNode) {
                console.warn('[CoverArtUpdater] DOM not ready for genre group observer, retrying...');
                setTimeout(startObserving, 100);
                return;
            }
            
            const obs = new MutationObserver(muts => {
                if (muts.length > 0) {
                    console.log("[CoverArtUpdater] Mutation batch in genre group detected.");
                    attachGenreListeners();
                    updateArtworkPreviewDebounced();
                }
            });
            obs.observe(group, { childList: true, subtree: true });
        };
        startObserving();
    }

    async function waitForGenreInputIndefinitely() {
        return new Promise(resolve => {
            let el = document.querySelector('input[name="genres"]');
            if (el) return resolve(el);
            const startObserving = () => {
                const targetNode = document.body || document.documentElement;
                if (!targetNode) {
                    console.warn('[CoverArtUpdater] DOM not ready for genre input observer, retrying...');
                    setTimeout(startObserving, 100);
                    return;
                }
                
                const obs = new MutationObserver(() => {
                    el = document.querySelector('input[name="genres"]');
                    if (el) {
                        obs.disconnect();
                        resolve(el);
                    }
                });
                obs.observe(targetNode, { childList: true, subtree: true });
            };
            startObserving();
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

    // Use BeatPassIntegrationInitManager if available for event handling
    if (window.BeatPassIntegrationInitManager) {
        // The manager will handle initialization and navigation events
        console.log("[CoverArtUpdater] Using BeatPassIntegrationInitManager for event handling.");
    } else {
        // Fallback to direct event listeners for backward compatibility
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
    }
    
    // Expose initialization function globally for SPA routing
    window.initCoverArtUpdater = initCoverArtUpdater;
    
    console.log('[CoverArtUpdater] Integration module loaded successfully');
})();