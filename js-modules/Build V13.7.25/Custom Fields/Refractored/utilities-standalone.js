// ============================================================
// BeatPass Utilities - Standalone IIFE Module
// Zero dependencies, self-contained utility functions
// ============================================================
(function() {
    'use strict';
    
    // ---------------------------
    // Core Utility Functions
    // ---------------------------
    
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Optimized element waiting using MutationObserver with specific target
    function waitForElement(selector, timeout = 10000, targetNode = document.body) {
        return new Promise((resolve, reject) => {
            const element = targetNode.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }

            const observer = new MutationObserver((mutations, obs) => {
                // Only check mutations that actually added nodes
                for (const mutation of mutations) {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        const element = targetNode.querySelector(selector);
                        if (element) {
                            obs.disconnect();
                            resolve(element);
                            return;
                        }
                    }
                }
            });

            observer.observe(targetNode, { 
                childList: true, 
                subtree: true,
                // Optimize by not observing attributes
                attributes: false,
                characterData: false
            });

            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Element ${selector} not found within ${timeout}ms`));
            }, timeout);
        });
    }

    function styleSaveButton(button) {
        if (!button) return;
        // Add any custom styling for the save button if needed
        button.style.transition = 'all 0.3s ease';
    }

    // ---------------------------
    // Page Type Checkers
    // ---------------------------
    
    function isUploadPage() {
        return window.location.pathname.includes('/backstage/upload');
    }
    
    function isEditPage() {
        return window.location.pathname.includes('/backstage/tracks/') &&
               window.location.pathname.includes('/edit');
    }
    
    function isTrackPage() {
        return window.location.pathname.includes('/track/');
    }
    
    function isConfirmationPage() {
        if (isUploadPage()) {
            const formPresent = document.querySelector('form');
            const anchor = document.querySelector('a[href*="/track/"]');
            const readonly = document.querySelector('input[readonly][value*="/track/"]');
            if (!formPresent && (anchor || readonly)) return true;
            if (document.body.innerText.includes("Upload complete.")) return true;
            return false;
        }
        return isTrackPage();
    }

    // ---------------------------
    // Track Data Extractors
    // ---------------------------
    
    function getTrackId() {
        const m = window.location.pathname.match(/\/backstage\/tracks\/(\d+)\/edit/);
        return m ? m[1] : null;
    }
    
    function getTrackName() {
        // Try multiple selectors to find track name input
        const inp = document.querySelector('input[name="name"]') || 
                   document.querySelector('input[type="text"][name="name"]') ||
                   document.querySelector('input[placeholder*="track"]') ||
                   document.querySelector('input[placeholder*="Track"]') ||
                   document.querySelector('input[placeholder*="name"]') ||
                   document.querySelector('input[placeholder*="Name"]');
        
        const trackName = inp ? inp.value.trim() : '';
        console.log("🏷️ getTrackName() found:", trackName);
        return trackName;
    }
    
    function getDuration() {
        const inp = document.querySelector('input[name="duration"]');
        return inp ? parseInt(inp.value.trim(), 10) || null : null;
    }

    // ---------------------------
    // Form Button Controllers
    // ---------------------------
    
    function disableSubmitButton() {
        const form = document.querySelector('form');
        if (!form) return;
        const btn = form.querySelector('button[type="submit"]');
        if (btn) btn.disabled = true;
    }
    
    function enableSubmitButton() {
        const form = document.querySelector('form');
        if (!form) return;
        const btn = form.querySelector('button[type="submit"]');
        if (btn) btn.disabled = false;
    }

    // ---------------------------
    // Animation Styles Injector
    // ---------------------------
    
    function ensureAnimationStyles() {
        if (document.getElementById('beatpass-smooth-animations')) return;
        
        const style = document.createElement('style');
        style.id = 'beatpass-smooth-animations';
        style.textContent = `
            /* BeatPass Smooth Injection Animations */
            .beatpass-fade-in {
                animation: beatpass-fadeIn 0.4s ease-out;
            }
            
            .beatpass-slide-in {
                animation: beatpass-slideIn 0.4s ease-out;
            }
            
            .beatpass-scale-in {
                animation: beatpass-scaleIn 0.3s ease-out;
            }
            
            @keyframes beatpass-fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            @keyframes beatpass-slideIn {
                from { opacity: 0; transform: translateX(-10px); }
                to { opacity: 1; transform: translateX(0); }
            }
            
            @keyframes beatpass-scaleIn {
                from { opacity: 0; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1); }
            }
            
            /* Smooth transitions for all injected elements */
            #custom-fields-container,
            #fingerprint-dashboard,
            .custom-bpm-cell,
            .custom-key, .custom-scale, .custom-bpm, .custom-separator {
                transition: opacity 0.3s ease-out, transform 0.3s ease-out !important;
            }
            
            /* Prevent layout shifts during injection */
            .beatpass-injecting {
                min-height: 1px;
                visibility: hidden;
            }
            
            .beatpass-injecting.ready {
                visibility: visible;
            }
        `;
        document.head.appendChild(style);
    }

    // ---------------------------
    // Global API Exposure
    // ---------------------------
    
    window.BeatPassUtilities = {
        // Core utilities
        debounce,
        waitForElement,
        styleSaveButton,
        
        // Page detection
        isUploadPage,
        isEditPage,
        isTrackPage,
        isConfirmationPage,
        
        // Track data extraction
        getTrackId,
        getTrackName,
        getDuration,
        
        // Form controls
        disableSubmitButton,
        enableSubmitButton,
        
        // Styling
        ensureAnimationStyles,
        
        // Auto-initialization
        init: function() {
            console.log('[BeatPassUtilities] Standalone utilities module loaded');
            ensureAnimationStyles();
        }
    };

    // ---------------------------
    // Auto-Initialization
    // ---------------------------
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', window.BeatPassUtilities.init);
    } else {
        window.BeatPassUtilities.init();
    }
    
})();