/**
 * BeatPass SPA Router - Standalone IIFE Module
 * Handles Single Page Application routing and module re-initialization
 * Ensures all BeatPass modules work correctly during navigation
 */
(function() {
    'use strict';

    // Module constants
    const MODULE_NAME = 'BeatPassSPARouter';
    const DEBUG = false; // Disabled to reduce console noise

    // State management
    let isInitialized = false;
    let currentPath = null;
    let isProcessing = false;

    // Debounce utility
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

    // Page type detection utilities
    function getPageType() {
        const pathname = window.location.pathname;
        
        if (pathname.includes('/backstage/upload')) return 'upload';
        if (pathname.includes('/backstage/tracks/') && pathname.includes('/edit')) return 'edit';
        if (pathname.includes('/track/')) return 'track';
        if (pathname.includes('/backstage/tracks/') && pathname.includes('/confirmation')) return 'confirmation';
        if (pathname.includes('/artist/')) return 'artist';
        if (pathname.includes('/playlist/')) return 'playlist';
        if (pathname.includes('/album/')) return 'album';
        if (pathname.includes('/genre/')) return 'genre';
        if (pathname.includes('/discover') || pathname === '/') return 'discover';
        if (pathname.includes('/backstage')) return 'backstage';
        
        return 'other';
    }

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
        return window.location.pathname.includes('/backstage/tracks/') &&
               window.location.pathname.includes('/confirmation');
    }

    // Module re-initialization functions
    function reinitializeCustomFields() {
        if (DEBUG) console.log('🔄 Reinitializing custom fields...');
        
        // Enhanced check for core functions availability
        const waitForCoreFunctions = (attempt = 1, maxAttempts = 6) => {
            const coreReady = window.getTrackId && window.getTrackName && window.isEditPage;
            const trackId = window.getTrackId ? window.getTrackId() : null;
            
            if (DEBUG) {
                if (DEBUG) console.log(`Core functions check attempt ${attempt}/${maxAttempts}:`);
                if (DEBUG) console.log('  getTrackId:', !!window.getTrackId);
                if (DEBUG) console.log('  getTrackName:', !!window.getTrackName);
                if (DEBUG) console.log('  isEditPage:', !!window.isEditPage);
                if (DEBUG) console.log('  trackId available:', trackId);
                if (DEBUG) console.log('  current URL:', window.location.pathname);
            }
            
            if (coreReady && (isUploadPage() || (isEditPage() && trackId))) {
                // Core functions are ready and we have valid context, proceed with injection
                if (window.injectCustomFields) {
                    setTimeout(() => {
                        try {
                            const fieldsInjected = window.getFieldsInjected && window.getFieldsInjected();
                            if (!fieldsInjected) {
                                if (DEBUG) console.log('🚀 Injecting custom fields...');
                                window.injectCustomFields();
                                if (DEBUG) console.log('✅ Custom fields reinitialized successfully');
                            } else {
                                if (DEBUG) console.log('ℹ️ Custom fields already injected, skipping');
                            }
                        } catch (error) {
                            console.error('❌ Error reinitializing custom fields:', error);
                            // Retry on error if attempts remaining
                            if (attempt < maxAttempts) {
                                setTimeout(() => waitForCoreFunctions(attempt + 1, maxAttempts), 600);
                            }
                        }
                    }, 400);
                } else {
                    if (DEBUG) console.warn('⚠️ injectCustomFields function not available');
                }
            } else if (attempt < maxAttempts) {
                // Prerequisites not ready, retry
                const reason = !coreReady ? 'core functions not ready' : 
                              isEditPage() && !trackId ? 'track ID not available' : 
                              'page context invalid';
                if (DEBUG) console.warn(`⚠️ ${reason}, retrying in 600ms... (attempt ${attempt + 1}/${maxAttempts})`);
                setTimeout(() => waitForCoreFunctions(attempt + 1, maxAttempts), 600);
            } else {
                console.error('❌ Custom fields reinitialization failed after maximum attempts');
            }
        };
        
        // Start the core functions check
        waitForCoreFunctions();
    }

    function reinitializeBeatPassID() {
        if (DEBUG) console.log('🔄 Reinitializing BeatPass ID...');
        
        // Enhanced fingerprint dashboard injection with retry logic
        if (window.debouncedInjectFingerprintDashboard && (isUploadPage() || isEditPage())) {
            const ensureFingerprintDashboard = (attempt = 1, maxAttempts = 4) => {
                const coreReady = window.getTrackId && window.getTrackName && window.isEditPage;
                const trackId = window.getTrackId ? window.getTrackId() : null;
                const dashboardExists = document.querySelector('#fingerprint-dashboard');
                const formContainer = document.querySelector('form') || document.querySelector('.form-container');
                
                if (DEBUG) {
                    if (DEBUG) console.log(`BeatPass ID injection attempt ${attempt}/${maxAttempts}:`);
                    if (DEBUG) console.log('   Core ready:', !!coreReady);
                    if (DEBUG) console.log('   Track ID available:', trackId);
                    if (DEBUG) console.log('   Dashboard exists:', !!dashboardExists);
                    if (DEBUG) console.log('   Form container found:', !!formContainer);
                    if (DEBUG) console.log('   Current URL:', window.location.pathname);
                }
                
                if (coreReady && trackId && formContainer && !dashboardExists) {
                    try {
                        window.debouncedInjectFingerprintDashboard();
                        if (DEBUG) console.log('✅ BeatPass ID reinitialized');
                    } catch (error) {
                        console.error('❌ Error reinitializing BeatPass ID:', error);
                        if (attempt < maxAttempts) {
                            setTimeout(() => ensureFingerprintDashboard(attempt + 1, maxAttempts), 700);
                        }
                    }
                } else if (dashboardExists) {
                    if (DEBUG) console.log('ℹ️ Fingerprint dashboard already exists, refreshing status...');
                    // Force refresh the dashboard content to ensure correct status
                    if (window.updateDashboardContent) {
                        try {
                            window.updateDashboardContent();
                            if (DEBUG) console.log('✅ Dashboard status refreshed');
                        } catch (error) {
                            console.error('❌ Error refreshing dashboard status:', error);
                        }
                    }
                } else if (attempt < maxAttempts) {
                    const reason = !coreReady ? 'core functions not ready' : 
                                  !trackId ? 'track ID not available' : 
                                  !formContainer ? 'form container not found' : 'unknown';
                    if (DEBUG) console.warn(`⚠️ BeatPass ID prerequisites not ready (${reason}), retrying in 700ms... (attempt ${attempt + 1}/${maxAttempts})`);
                    setTimeout(() => ensureFingerprintDashboard(attempt + 1, maxAttempts), 700);
                } else {
                    console.error('❌ BeatPass ID injection failed after maximum attempts');
                }
            };
            
            setTimeout(() => ensureFingerprintDashboard(), 600); // Initial delay for DOM settling
        }
    }

    function reinitializeSampleSafeBanner() {
        if (DEBUG) console.log('🔄 Reinitializing Sample-Safe banner...');
        
        // Sample-Safe banner is part of custom fields injection
        // It will be reinitialized with custom fields
    }

    function reinitializeMetadataFetching() {
        if (DEBUG) console.log('🔄 Reinitializing metadata fetching...');
        
        if (isTrackPage()) {
            // Enhanced track page metadata fetching with retry logic
            if (window.initTrackPage) {
                const ensureMetadataInjection = (attempt = 1, maxAttempts = 4) => {
                    const trackPageReady = window.isTrackPage && window.isTrackPage();
                    const trackId = window.getCurrentTrackId ? window.getCurrentTrackId() : null;
                    const infoContainer = document.querySelector('.text-muted.mt-18.md\\:mt-26.text-sm.w-max.mx-auto.md\\:mx-0 .flex.items-center.gap-4.text-sm.text-muted') ||
                                         document.querySelector('.flex.items-center.gap-4.text-sm.text-muted') ||
                                         document.querySelector('.text-sm.text-muted .flex.items-center.gap-4');
                    
                    if (DEBUG) {
                        if (DEBUG) console.log(`Track metadata injection attempt ${attempt}/${maxAttempts}:`);
                        if (DEBUG) console.log('   Track page ready:', !!trackPageReady);
                        if (DEBUG) console.log('   Track ID available:', trackId);
                        if (DEBUG) console.log('   Info container found:', !!infoContainer);
                        if (DEBUG) console.log('   Current URL:', window.location.pathname);
                    }
                    
                    if (trackPageReady && trackId && infoContainer) {
                        try {
                            window.initTrackPage();
                            if (DEBUG) console.log('✅ Track page metadata fetching reinitialized');
                        } catch (error) {
                            console.error('❌ Error reinitializing track page:', error);
                            if (attempt < maxAttempts) {
                                setTimeout(() => ensureMetadataInjection(attempt + 1, maxAttempts), 600);
                            }
                        }
                    } else if (attempt < maxAttempts) {
                        if (DEBUG) console.warn(`⚠️ Track page prerequisites not ready, retrying in 600ms... (attempt ${attempt + 1}/${maxAttempts})`);
                        setTimeout(() => ensureMetadataInjection(attempt + 1, maxAttempts), 600);
                    } else {
                        console.error('❌ Track page metadata injection failed after maximum attempts');
                    }
                };
                
                setTimeout(() => ensureMetadataInjection(), 400); // Initial delay for DOM settling
            }
        }
    }

    function reinitializeOpenWidget() {
        if (DEBUG) console.log('🔄 Reinitializing OpenWidget...');
        
        // Reinitialize OpenWidget integration
        if (window.initOpenWidget) {
            setTimeout(() => {
                try {
                    window.initOpenWidget();
                    if (DEBUG) console.log('✅ OpenWidget reinitialized');
                } catch (error) {
                    console.error('❌ Error reinitializing OpenWidget:', error);
                }
            }, 100);
        } else {
            if (DEBUG) console.warn('⚠️ OpenWidget not available for re-initialization');
        }
    }

    function reinitializeQueueEnhancement() {
        if (DEBUG) console.log('🔄 Reinitializing queue enhancement...');
        
        // Reinitialize queue enhancement
        if (window.QueueEnhancement && window.QueueEnhancement.init) {
            setTimeout(() => {
                try {
                    window.QueueEnhancement.init();
                    if (DEBUG) console.log('✅ Queue enhancement reinitialized');
                } catch (error) {
                    console.error('❌ Error reinitializing queue enhancement:', error);
                }
            }, 400);
        }
    }

    function reinitializeBPNotes() {
        if (DEBUG) console.log('[SPA Router] Re-initializing BP Notes...');
        
        if (typeof window.bpInitAll === 'function') {
            try {
                window.bpInitAll();
                if (DEBUG) console.log('[SPA Router] BP Notes re-initialized successfully');
            } catch (error) {
                console.error('[SPA Router] BP Notes re-initialization failed:', error);
            }
        } else {
            if (DEBUG) console.warn('[SPA Router] BP Notes not available for re-initialization');
        }
    }

    function reinitializePricingEnhancements() {
        if (DEBUG) console.log('[SPA Router] Re-initializing Pricing Enhancements...');
        
        if (typeof window.BeatPassPricingModule !== 'undefined' && 
            typeof window.BeatPassPricingModule.initialize === 'function') {
            try {
                window.BeatPassPricingModule.initialize();
                if (DEBUG) console.log('[SPA Router] Pricing Enhancements re-initialized successfully');
            } catch (error) {
                console.error('[SPA Router] Pricing Enhancements re-initialization failed:', error);
            }
        } else {
            if (DEBUG) console.warn('[SPA Router] Pricing Enhancements not available for re-initialization');
        }
    }

    function reinitializeVerifiedProducers() {
        if (DEBUG) console.log('[SPA Router] Re-initializing Verified Producers...');
        
        if (typeof window.initVerifiedProducers === 'function') {
            try {
                window.initVerifiedProducers();
                if (DEBUG) console.log('[SPA Router] Verified Producers re-initialized successfully');
            } catch (error) {
                console.error('[SPA Router] Verified Producers re-initialization failed:', error);
            }
        } else {
            if (DEBUG) console.warn('[SPA Router] Verified Producers not available for re-initialization');
        }
    }

    function reinitializeUIHelpers() {
        if (DEBUG) console.log('[SPA Router] Re-initializing UI Helpers...');
        
        if (typeof window.initUIHelpers === 'function') {
            try {
                window.initUIHelpers();
                if (DEBUG) console.log('[SPA Router] UI Helpers re-initialized successfully');
            } catch (error) {
                console.error('[SPA Router] UI Helpers re-initialization failed:', error);
            }
        } else {
            if (DEBUG) console.warn('[SPA Router] UI Helpers not available for re-initialization');
        }
    }

    function reinitializeCoverArtUpdater() {
        if (DEBUG) console.log('🔄 Reinitializing cover art updater...');
        
        // Reinitialize cover art updater
        if (window.initCoverArtUpdater) {
            setTimeout(() => {
                try {
                    window.initCoverArtUpdater();
                    if (DEBUG) console.log('✅ Cover art updater reinitialized');
                } catch (error) {
                    console.error('❌ Error reinitializing cover art updater:', error);
                }
            }, 200);
        }
    }

    // Main navigation handler
    function handleNavigation(forceInit = false) {
        if (isProcessing && !forceInit) {
            if (DEBUG) console.log('🔄 Navigation already processing, skipping...');
            return;
        }

        const newPath = window.location.pathname;
        if (newPath === currentPath && !forceInit) {
            if (DEBUG) console.log('🔄 Same path, skipping navigation handling');
            // Even if same path, ensure custom fields are injected for edit pages
            if (isEditPage() && window.injectCustomFields) {
                const ensureSamePath = (attempt = 1, maxAttempts = 3) => {
                    const coreReady = window.getTrackId && window.getTrackName && window.isEditPage;
                    const fieldsInjected = window.getFieldsInjected && window.getFieldsInjected();
                    const trackId = window.getTrackId ? window.getTrackId() : null;
                    
                    if (DEBUG) {
                        if (DEBUG) console.log(`Same path check attempt ${attempt}/${maxAttempts}:`);
                        if (DEBUG) console.log('  Core ready:', !!coreReady);
                        if (DEBUG) console.log('   Fields injected:', !!fieldsInjected);
                        if (DEBUG) console.log('  Track ID:', trackId);
                    }
                    
                    if (!fieldsInjected && coreReady && trackId) {
                        if (DEBUG) console.log('🔧 Custom fields not injected on edit page, forcing injection...');
                        try {
                            window.injectCustomFields();
                            if (DEBUG) console.log('✅ Same-path injection completed');
                        } catch (error) {
                            console.error('❌ Same-path injection failed:', error);
                        }
                    } else if ((!coreReady || !trackId) && attempt < maxAttempts) {
                        setTimeout(() => ensureSamePath(attempt + 1, maxAttempts), 400);
                    }
                };
                
                setTimeout(() => ensureSamePath(), 300);
            }
            return;
        }

        isProcessing = true;
        const pageType = getPageType();
        
        if (DEBUG) {
            if (DEBUG) console.log(`🧭 Navigation detected:`);
            if (DEBUG) console.log(`   From: ${currentPath || 'initial'}`);
            if (DEBUG) console.log(`   To: ${newPath}`);
            if (DEBUG) console.log(`   Page type: ${pageType}`);
        }

        currentPath = newPath;

        // Wait for DOM to settle before reinitializing
        setTimeout(() => {
            try {
                // Reinitialize modules based on page type
                switch (pageType) {
                    case 'upload':
                    case 'edit':
                        // For edit/upload pages, wait longer for DOM to be ready
                        setTimeout(() => {
                            reinitializeCustomFields();
                            reinitializeBeatPassID();
                            reinitializeSampleSafeBanner();
                            reinitializeCoverArtUpdater();
                        }, 300);
                        break;
                        
                    case 'track':
                        reinitializeMetadataFetching();
                        reinitializeBPNotes();
                        break;
                        
                    case 'confirmation':
                        // Handle confirmation page specific logic
                        if (window.processPendingCustomDataOnConfirmation) {
                            window.processPendingCustomDataOnConfirmation();
                        }
                        break;
                        
                    case 'artist':
                        reinitializeBPNotes();
                        break;
                        
                    default:
                        // Reinitialize common modules for all pages
                        reinitializeOpenWidget();
                        reinitializeQueueEnhancement();
                        break;
                }

                // Always reinitialize these modules
                reinitializeOpenWidget();
                reinitializeQueueEnhancement();
                reinitializePricingEnhancements();
                reinitializeVerifiedProducers();
                reinitializeUIHelpers();
                
                if (DEBUG) console.log(`✅ Navigation handling complete for ${pageType} page`);
                
            } catch (error) {
                console.error('❌ Error during navigation handling:', error);
            } finally {
                isProcessing = false;
            }
        }, 200);
    }

    // Debounced navigation handler
    const debouncedHandleNavigation = debounce(handleNavigation, 100);

    // History API patching for SPA navigation detection
    function patchHistoryAPI() {
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        history.pushState = function(...args) {
            const result = originalPushState.apply(this, args);
            if (DEBUG) console.log('🔄 pushState detected');
            setTimeout(debouncedHandleNavigation, 0);
            return result;
        };

        history.replaceState = function(...args) {
            const result = originalReplaceState.apply(this, args);
            if (DEBUG) console.log('🔄 replaceState detected');
            setTimeout(debouncedHandleNavigation, 0);
            return result;
        };

        if (DEBUG) console.log('✅ History API patched for SPA navigation');
    }

    // Initialize SPA router
    function init() {
        if (isInitialized) {
            if (DEBUG) console.log(`${MODULE_NAME} already initialized`);
            return;
        }

        if (DEBUG) console.log(`🚀 Initializing ${MODULE_NAME}...`);

        // Set initial path
        currentPath = window.location.pathname;

        // Patch history API
        patchHistoryAPI();

        // Listen for popstate events (back/forward navigation)
        window.addEventListener('popstate', () => {
            if (DEBUG) console.log('🔄 popstate event detected');
            debouncedHandleNavigation();
        });

        // Listen for custom navigation events
        window.addEventListener('locationchange', () => {
            if (DEBUG) console.log('🔄 locationchange event detected');
            debouncedHandleNavigation();
        });

        // Listen for BeatPass system ready event
        window.addEventListener('beatpass:system-ready', () => {
            if (DEBUG) console.log('🔄 BeatPass system ready, performing initial navigation handling');
            // Force initialization for direct page loads
            const isDirectLoad = !currentPath || currentPath === window.location.pathname;
            if (isDirectLoad && (isEditPage() || isUploadPage())) {
                if (DEBUG) console.log('🚀 Direct page load detected, forcing initialization...');
                setTimeout(() => handleNavigation(true), 500);
            } else {
                setTimeout(debouncedHandleNavigation, 500);
            }
        });

        isInitialized = true;
        if (DEBUG) console.log(`✅ ${MODULE_NAME} initialized successfully`);
    }

    // Cleanup function
    function cleanup() {
        isInitialized = false;
        currentPath = null;
        isProcessing = false;
        if (DEBUG) console.log(`🧹 ${MODULE_NAME} cleaned up`);
    }

    // Public API
    const BeatPassSPARouter = {
        // Core functions
        init,
        cleanup,
        handleNavigation: debouncedHandleNavigation,
        
        // State getters
        isInitialized: () => isInitialized,
        getCurrentPath: () => currentPath,
        getPageType,
        
        // Page type checkers
        isUploadPage,
        isEditPage,
        isTrackPage,
        isConfirmationPage,
        
        // Manual reinitializers
        reinitializeCustomFields,
        reinitializeBeatPassID,
        reinitializeSampleSafeBanner,
        reinitializeMetadataFetching,
        reinitializeOpenWidget,
        reinitializeQueueEnhancement,
        reinitializeBPNotes,
        reinitializePricingEnhancements,
        reinitializeCoverArtUpdater
    };

    // Global exposure
    window.BeatPassSPARouter = BeatPassSPARouter;
    
    // Expose page type checkers globally for compatibility
    window.isUploadPage = isUploadPage;
    window.isEditPage = isEditPage;
    window.isTrackPage = isTrackPage;
    window.isConfirmationPage = isConfirmationPage;
    window.getPageType = getPageType;

    // Enhanced fallback initialization for direct page loads
    function ensureCustomFieldsOnEditPage() {
        if (isEditPage() && window.injectCustomFields) {
            const ensureInjection = (attempt = 1, maxAttempts = 6) => {
                const coreReady = window.getTrackId && window.getTrackName && window.isEditPage;
                const fieldsInjected = window.getFieldsInjected && window.getFieldsInjected();
                const trackId = window.getTrackId ? window.getTrackId() : null;
                const dashboardExists = document.querySelector('#fingerprint-dashboard');
                
                if (DEBUG) {
                    if (DEBUG) console.log(`🔧 Fallback check attempt ${attempt}/${maxAttempts}:`);
                    if (DEBUG) console.log('   Core functions ready:', !!coreReady);
                    if (DEBUG) console.log('   Fields injected:', !!fieldsInjected);
        if (DEBUG) console.log('   Track ID available:', trackId);
        if (DEBUG) console.log('   Dashboard exists:', !!dashboardExists);
        if (DEBUG) console.log('   Current URL:', window.location.pathname);
                }
                
                if (!fieldsInjected && coreReady && trackId) {
                    if (DEBUG) console.log('🔧 Fallback: Injecting custom fields on edit page...');
                    try {
                        window.injectCustomFields();
                        if (DEBUG) console.log('✅ Fallback custom fields injection completed');
                        
                        // After successful custom fields injection, ensure BeatPass ID dashboard
                        setTimeout(() => {
                            if (!document.querySelector('#fingerprint-dashboard') && window.debouncedInjectFingerprintDashboard) {
                                if (DEBUG) console.log('🔧 Fallback: Injecting BeatPass ID dashboard...');
                                try {
                                    window.debouncedInjectFingerprintDashboard();
                                    if (DEBUG) console.log('✅ Fallback dashboard injection completed');
                                } catch (error) {
                                    console.error('❌ Fallback dashboard injection failed:', error);
                                }
                            }
                        }, 500);
                        
                    } catch (error) {
                        console.error('❌ Fallback injection failed:', error);
                        if (attempt < maxAttempts) {
                            setTimeout(() => ensureInjection(attempt + 1, maxAttempts), 700);
                        }
                    }
                } else if (fieldsInjected && !dashboardExists && coreReady && trackId) {
                    // Fields are injected but dashboard is missing
                    if (DEBUG) console.log('🔧 Fallback: Custom fields exist but dashboard missing, injecting dashboard...');
                    if (window.debouncedInjectFingerprintDashboard) {
                        try {
                            window.debouncedInjectFingerprintDashboard();
                            if (DEBUG) console.log('✅ Fallback dashboard-only injection completed');
                        } catch (error) {
                            console.error('❌ Fallback dashboard-only injection failed:', error);
                        }
                    }
                } else if ((!coreReady || !trackId) && attempt < maxAttempts) {
                    if (DEBUG) console.warn(`⚠️ Prerequisites not ready, retrying in 700ms... (attempt ${attempt + 1}/${maxAttempts})`);
                    setTimeout(() => ensureInjection(attempt + 1, maxAttempts), 700);
                } else if (fieldsInjected && dashboardExists) {
                    if (DEBUG) console.log('✅ Custom fields and dashboard already injected, refreshing dashboard status...');
                    // Ensure dashboard shows correct status
                    if (window.updateDashboardContent) {
                        try {
                            window.updateDashboardContent();
                            if (DEBUG) console.log('✅ Dashboard status refreshed');
                        } catch (error) {
                            console.error('❌ Dashboard status refresh failed:', error);
                        }
                    }
                } else if (attempt >= maxAttempts) {
                    console.error('❌ Fallback injection failed after maximum attempts');
                }
            };
            
            setTimeout(() => ensureInjection(), 800); // Slightly longer delay for better reliability
        }
    }

    // Auto-initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            init();
            ensureCustomFieldsOnEditPage();
        });
    } else {
        init();
        ensureCustomFieldsOnEditPage();
    }

    if (DEBUG) console.log('🧭 BeatPass SPA Router module loaded successfully');

})();