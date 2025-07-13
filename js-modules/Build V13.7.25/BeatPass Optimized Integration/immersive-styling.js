// immersive-styling.js
// Immersive page styling for artist and album pages in BeatPass integration

(function() {
    'use strict';

    // ============================================================
    // State Management
    // ============================================================
    let lastImgSrc = null;
    let container = null;
    let observer = null;

    // ============================================================
    // Helper Functions
    // ============================================================
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

    // ============================================================
    // Navigation Handling
    // ============================================================
    function setupNavigationHandling() {
        // Patch history methods
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;
        
        history.pushState = function() {
            const result = originalPushState.apply(history, arguments);
            setTimeout(onDomChange, 0);
            return result;
        };
        
        history.replaceState = function() {
            const result = originalReplaceState.apply(history, arguments);
            setTimeout(onDomChange, 0);
            return result;
        };
        
        // Handle popstate events
        window.addEventListener("popstate", onDomChange);
    }

    // ============================================================
    // Observer Setup
    // ============================================================
    function setupDOMObserver() {
        if (observer) {
            observer.disconnect();
        }
        
        observer = new MutationObserver(onDomChange);
        observer.observe(document.documentElement, { 
            childList: true, 
            subtree: true 
        });
    }

    // ============================================================
    // CSS Injection
    // ============================================================
    function injectImmersiveStyles() {
        if (document.getElementById('immersive-styling-css')) {
            return; // Already injected
        }
        
        const style = document.createElement('style');
        style.id = 'immersive-styling-css';
        style.textContent = `
            .web-player-container.has-blur-bg {
                position: relative;
            }
            
            .web-player-container.has-blur-bg::before {
                content: '';
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-image: var(--producer-bg-image);
                background-size: cover;
                background-position: center;
                background-repeat: no-repeat;
                filter: blur(20px) brightness(0.3);
                z-index: -1;
                opacity: 0.8;
                transition: opacity 0.3s ease;
            }
            
            .web-player-container.has-blur-bg {
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
            }
        `;
        
        document.head.appendChild(style);
    }

    // ============================================================
    // Initialization
    // ============================================================
    function initializeImmersiveStyling() {
        // Inject required CSS
        injectImmersiveStyles();
        
        // Setup DOM observer
        setupDOMObserver();
        
        // Setup navigation handling
        setupNavigationHandling();
        
        // Initial check
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", onDomChange);
        } else {
            onDomChange();
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
        removeBlur();
        
        // Remove injected styles
        const styleElement = document.getElementById('immersive-styling-css');
        if (styleElement) {
            styleElement.remove();
        }
    }

    // ============================================================
    // Global Exports
    // ============================================================
    window.BeatPassImmersiveStyling = {
        isImmersivePage,
        onDomChange,
        removeBlur,
        initializeImmersiveStyling,
        cleanup,
        // State getters
        getLastImgSrc: () => lastImgSrc,
        getContainer: () => container
    };

    // Auto-initialize
    initializeImmersiveStyling();

    console.log('[BeatPass] Immersive styling loaded');
})();