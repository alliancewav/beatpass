// cheque-button-removal.js
// Remove 'Upload void cheque for payout' button on artist request pages

(function() {
    'use strict';

    // ============================================================
    // Configuration
    // ============================================================
    const DEBUG = false; // Reduced logging for performance
    const TARGET_PATHS = [
        '/backstage/requests/become-artist',
        '/backstage/requests/claim-artist'
    ];

    const BUTTON_SELECTORS = {
        svg: 'svg[data-testid="DocumentScannerOutlinedIcon"]',
        text: 'Upload void cheque for payout'
    };

    let observer = null;
    let removalCount = 0;

    // ============================================================
    // Core Functionality
    // ============================================================
    function isArtistRequestPage() {
        return TARGET_PATHS.some(path => window.location.pathname === path);
    }

    function findAndRemoveChequeButton() {
        if (!isArtistRequestPage()) {
            return;
        }

        // Find all buttons on the page
        const buttons = document.querySelectorAll('button');
        let removedInThisCall = 0;
        
        buttons.forEach(btn => {
            // Skip if already processed
            if (btn.dataset.beatpassProcessed) {
                return;
            }
            
            // Check for the DocumentScannerOutlinedIcon SVG and the exact text
            const svg = btn.querySelector(BUTTON_SELECTORS.svg);
            const hasTargetText = btn.textContent.includes(BUTTON_SELECTORS.text);
            
            if (svg && hasTargetText) {
                // Mark as processed before removal to avoid re-processing
                btn.dataset.beatpassProcessed = 'true';
                
                // Add fade-out animation before removal
                btn.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                btn.style.opacity = '0';
                btn.style.transform = 'scale(0.95)';
                
                // Remove after animation
                setTimeout(() => {
                    if (btn.parentNode) {
                        btn.remove();
                        removedInThisCall++;
                        removalCount++;
                        console.log('[BeatPass] Removed cheque upload button');
                    }
                }, 300);
            } else {
                // Mark as processed even if not removed to avoid re-checking
                btn.dataset.beatpassProcessed = 'true';
            }
        });

        if (removedInThisCall > 0) {
            console.log(`[BeatPass] Removed ${removedInThisCall} cheque button(s) in this call`);
        }
    }

    function findChequeButtonsAdvanced() {
        if (!isArtistRequestPage()) {
            return [];
        }

        const foundButtons = [];
        
        // More comprehensive search
        const allElements = document.querySelectorAll('*');
        
        allElements.forEach(element => {
            // Check if element contains the target text
            if (element.textContent && element.textContent.includes(BUTTON_SELECTORS.text)) {
                // Find the closest button or clickable element
                const button = element.closest('button') || 
                              element.closest('[role="button"]') ||
                              element.closest('a[href]');
                
                if (button && !button.dataset.beatpassProcessed) {
                    foundButtons.push(button);
                }
            }
        });
        
        return foundButtons;
    }

    function removeFoundButtons(buttons) {
        buttons.forEach(button => {
            button.dataset.beatpassProcessed = 'true';
            
            // Add fade-out animation
            button.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            button.style.opacity = '0';
            button.style.transform = 'scale(0.95)';
            
            setTimeout(() => {
                if (button.parentNode) {
                    button.remove();
                    removalCount++;
                    console.log('[BeatPass] Removed cheque-related element (advanced search)');
                }
            }, 300);
        });
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
        
        observer = new MutationObserver((mutations) => {
            let shouldCheck = false;
            
            // Check if any mutations might have added new buttons
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Check if the added node is a button or contains buttons
                            if (node.tagName === 'BUTTON' || 
                                (node.querySelector && node.querySelector('button'))) {
                                shouldCheck = true;
                                break;
                            }
                        }
                    }
                }
                if (shouldCheck) break;
            }
            
            if (shouldCheck) {
                // Use a small delay to allow DOM to settle
                setTimeout(() => {
                    findAndRemoveChequeButton();
                    
                    // Also try advanced search as fallback
                    const foundButtons = findChequeButtonsAdvanced();
                    if (foundButtons.length > 0) {
                        removeFoundButtons(foundButtons);
                    }
                }, 100);
            }
        });
        
        observer.observe(targetNode, { 
            childList: true, 
            subtree: true 
        });
        
        if (DEBUG) console.log('[BeatPass] Cheque button observer setup complete');
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
            setTimeout(() => {
                // Reset processed flags on navigation
                resetProcessedFlags();
                findAndRemoveChequeButton();
            }, 0);
            return result;
        };
        
        history.replaceState = function() {
            const result = originalReplaceState.apply(history, arguments);
            setTimeout(() => {
                resetProcessedFlags();
                findAndRemoveChequeButton();
            }, 0);
            return result;
        };
        
        // Handle popstate events
        window.addEventListener('popstate', () => {
            setTimeout(() => {
                resetProcessedFlags();
                findAndRemoveChequeButton();
            }, 0);
        });
    }

    function resetProcessedFlags() {
        // Remove processed flags to allow re-checking on new pages
        document.querySelectorAll('[data-beatpass-processed]').forEach(element => {
            delete element.dataset.beatpassProcessed;
        });
    }

    // ============================================================
    // Initialization
    // ============================================================
    function initializeChequeButtonRemoval() {
        // Setup DOM observer
        setupDOMObserver();
        
        // Setup navigation handling
        setupNavigationHandling();
        
        // Initial removal
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                findAndRemoveChequeButton();
                
                // Also try advanced search
                const foundButtons = findChequeButtonsAdvanced();
                if (foundButtons.length > 0) {
                    removeFoundButtons(foundButtons);
                }
            });
        } else {
            findAndRemoveChequeButton();
            
            // Also try advanced search
            const foundButtons = findChequeButtonsAdvanced();
            if (foundButtons.length > 0) {
                removeFoundButtons(foundButtons);
            }
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
        
        resetProcessedFlags();
        removalCount = 0;
    }

    // ============================================================
    // Global Exports
    // ============================================================
    window.BeatPassChequeButtonRemoval = {
        isArtistRequestPage,
        findAndRemoveChequeButton,
        findChequeButtonsAdvanced,
        removeFoundButtons,
        initializeChequeButtonRemoval,
        cleanup,
        resetProcessedFlags,
        // Status getters
        getRemovalCount: () => removalCount,
        getTargetPaths: () => [...TARGET_PATHS]
    };

    // Store the function globally for backward compatibility
    window.findAndRemoveChequeButton = findAndRemoveChequeButton;

    // Auto-initialize
    initializeChequeButtonRemoval();

    console.log('[BeatPass] Cheque button removal loaded');
})();