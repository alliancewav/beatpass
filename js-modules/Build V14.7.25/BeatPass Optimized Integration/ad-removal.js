// ad-removal.js
// Ad removal functionality for BeatPass integration

(function() {
    'use strict';

    // ============================================================
    // Configuration
    // ============================================================
    const DEBUG = false; // Reduced logging for performance
    const AD_CHECK_INTERVAL = 500; // Check for ads every 500ms
    const AD_SELECTORS = [
        'div.ad-host.general_top-host',
        '.ad-host',
        '[class*="ad-"]',
        '[id*="ad-"]'
    ];

    let observer = null;
    let intervalId = null;

    // ============================================================
    // Helper Functions
    // ============================================================
    function shouldHideAds() {
        const url = window.location.href;
        return url.includes("/artist/") || url.includes("/track/") || url.includes("/album/");
    }

    function removeAds() {
        if (!shouldHideAds()) {
            return;
        }

        let removedCount = 0;
        
        AD_SELECTORS.forEach(selector => {
            const ads = document.querySelectorAll(selector);
            ads.forEach(ad => {
                // Double-check that this is actually an ad element
                if (isAdElement(ad)) {
                    ad.remove();
                    removedCount++;
                    if (DEBUG) console.log("Removed ad element:", ad);
                }
            });
        });

        if (removedCount > 0) {
            if (DEBUG) console.log(`[BeatPass] Removed ${removedCount} ad element(s)`);
        }
    }

    function isAdElement(element) {
        // Additional validation to ensure we're removing actual ads
        const classList = element.className.toLowerCase();
        const id = element.id.toLowerCase();
        
        // Check for common ad-related class names and IDs
        const adIndicators = [
            'ad-host',
            'advertisement',
            'google-ad',
            'adsense',
            'ad-banner',
            'ad-container',
            'sponsored'
        ];
        
        return adIndicators.some(indicator => 
            classList.includes(indicator) || id.includes(indicator)
        );
    }

    // ============================================================
    // Observer Setup
    // ============================================================
    function setupDOMObserver() {
        if (observer) {
            observer.disconnect();
        }
        
        // Wait for document.body to be available
        const targetNode = document.body || document.documentElement;
        if (!targetNode) {
            if (DEBUG) console.warn('[BeatPass] DOM not ready for observer, retrying...');
            setTimeout(setupDOMObserver, 100);
            return;
        }
        
        observer = new MutationObserver(() => {
            if (shouldHideAds()) {
                removeAds();
            }
        });
        
        observer.observe(targetNode, { 
            childList: true, 
            subtree: true 
        });
        
        if (DEBUG) console.log('[BeatPass] DOM observer setup complete');
    }

    // ============================================================
    // Navigation Handling
    // ============================================================
    function setupNavigationHandling() {
        // Patch history methods
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;
        
        history.pushState = function() {
            const result = originalPushState.apply(history, arguments);
            setTimeout(removeAds, 0);
            return result;
        };
        
        history.replaceState = function() {
            const result = originalReplaceState.apply(history, arguments);
            setTimeout(removeAds, 0);
            return result;
        };
        
        // Handle popstate events
        window.addEventListener('popstate', removeAds);
    }

    // ============================================================
    // Interval-based Checking
    // ============================================================
    function startPeriodicCheck() {
        if (intervalId) {
            clearInterval(intervalId);
        }
        
        intervalId = setInterval(removeAds, AD_CHECK_INTERVAL);
    }

    function stopPeriodicCheck() {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
    }

    // ============================================================
    // Initialization
    // ============================================================
    function initializeAdRemoval() {
        // Setup DOM observer
        setupDOMObserver();
        
        // Setup navigation handling
        setupNavigationHandling();
        
        // Start periodic checking
        startPeriodicCheck();
        
        // Initial ad removal
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', removeAds);
        } else {
            removeAds();
        }
    }

    // ============================================================
    // Cleanup
    // ============================================================
    function cleanup() {
        if (observer) {
            observer.disconnect();
            observer = null;
        }
        
        stopPeriodicCheck();
    }

    // ============================================================
    // Advanced Ad Detection
    // ============================================================
    function detectDynamicAds() {
        // Look for elements that might be dynamically loaded ads
        const suspiciousElements = document.querySelectorAll('iframe, embed, object');
        
        suspiciousElements.forEach(element => {
            const src = element.src || element.data;
            if (src && isAdUrl(src)) {
                element.style.display = 'none';
                if (DEBUG) console.log('[BeatPass] Hidden suspicious ad element:', element);
            }
        });
    }

    function isAdUrl(url) {
        const adDomains = [
            'googlesyndication.com',
            'doubleclick.net',
            'googleadservices.com',
            'amazon-adsystem.com',
            'adsystem.amazon.com'
        ];
        
        return adDomains.some(domain => url.includes(domain));
    }

    // ============================================================
    // Global Exports
    // ============================================================
    window.BeatPassAdRemoval = {
        shouldHideAds,
        removeAds,
        detectDynamicAds,
        initializeAdRemoval,
        cleanup,
        startPeriodicCheck,
        stopPeriodicCheck,
        // Configuration
        setCheckInterval: (interval) => {
            stopPeriodicCheck();
            if (interval > 0) {
                intervalId = setInterval(removeAds, interval);
            }
        }
    };

    // Auto-initialize
    initializeAdRemoval();

    console.log('[BeatPass] Ad removal loaded');
})();