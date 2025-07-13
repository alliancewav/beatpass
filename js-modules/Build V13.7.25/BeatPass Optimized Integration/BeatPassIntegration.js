// BeatPassIntegration.js
// Main BeatPass integration file - unified solution with legacy compatibility
// Combines core functionality from multiple modules into a single optimized file
// Excludes: ad-removal.js, cheque-button-removal.js, coverart-updater.js, immersive-styling.js, openwidget-integration.js, webpushr-integration.js
// Includes full legacy compatibility and modern initialization management

(function() {
    'use strict';

    // ============================================================
    // Configuration
    // ============================================================
    const CONFIG = {
        INITIALIZATION_TIMEOUT: 15000, // 15 seconds
        FALLBACK_DELAY: 2000, // 2 seconds
        SCRIPT_LOAD_TIMEOUT: 10000,
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 1000,
        DEBOUNCE_DELAY: 300,
        OBSERVER_THROTTLE: 100,
        PERFORMANCE_BUDGET: 16 // 16ms per frame
    };

    // ============================================================
    // Context Menu Disable
    // ============================================================
    document.addEventListener('contextmenu', event => {
        event.preventDefault();
    });

    // ============================================================
    // Debug Logging
    // ============================================================
    const DEBUG = false;

    function logDebug(...args) {
        if (DEBUG) console.log('[BeatPass]', ...args);
    }

    // ============================================================
    // Utility Functions
    // ============================================================
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

    function throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    function waitForElement(selector, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }

            const observer = new MutationObserver((mutations, obs) => {
                const element = document.querySelector(selector);
                if (element) {
                    obs.disconnect();
                    resolve(element);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Element ${selector} not found within ${timeout}ms`));
            }, timeout);
        });
    }



    // ============================================================
    // Script Loading Functions (from script-loader.js)
    // ============================================================
    let loadedScripts = new Set();
    let scriptLoadPromises = new Map();

    function loadScript(src, { async = false, defer = false, cache = true } = {}) {
        // Return existing promise if script is already loading
        if (scriptLoadPromises.has(src)) {
            return scriptLoadPromises.get(src);
        }
        
        // Return resolved promise if script is already loaded
        if (cache && loadedScripts.has(src)) {
            return Promise.resolve();
        }
        
        const promise = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = src;
            if (async) s.async = true;
            if (defer) s.defer = true;
            
            s.onload = () => {
                if (cache) loadedScripts.add(src);

                scriptLoadPromises.delete(src);
                resolve();
            };
            
            s.onerror = () => {
                scriptLoadPromises.delete(src);
                reject(new Error(`Failed to load script: ${src}`));
            };
            
            // Timeout handling
            setTimeout(() => {
                if (scriptLoadPromises.has(src)) {
                    scriptLoadPromises.delete(src);
                    reject(new Error(`Script load timeout: ${src}`));
                }
            }, CONFIG.SCRIPT_LOAD_TIMEOUT);
            
            document.head.appendChild(s);
        });
        
        scriptLoadPromises.set(src, promise);
        return promise;
    }

    function loadScripts(scripts, options = {}) {
        const { parallel = true, failFast = false } = options;
        
        if (parallel) {
            const promises = scripts.map(script => {
                if (typeof script === 'string') {
                    return loadScript(script);
                } else {
                    return loadScript(script.src, script.options || {});
                }
            });
            
            return failFast ? Promise.all(promises) : Promise.allSettled(promises);
        } else {
            // Sequential loading
            return scripts.reduce((promise, script) => {
                return promise.then(() => {
                    if (typeof script === 'string') {
                        return loadScript(script);
                    } else {
                        return loadScript(script.src, script.options || {});
                    }
                });
            }, Promise.resolve());
        }
    }





    // ============================================================
    // Unified Observer System (from unified-observer.js)
    // ============================================================
    let unifiedObserver = null;
    let registeredCallbacks = new Map();
    let observerConfig = {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['src', 'class', 'style']
    };

    function registerCallback(name, callback, options = {}) {
        const callbackInfo = {
            callback,
            priority: options.priority || 'normal', // 'high', 'normal', 'low'
            debounceMs: options.debounceMs || 0,
            conditions: options.conditions || [], // Array of condition functions
            lastExecuted: 0
        };

        // Apply debouncing if specified
        if (callbackInfo.debounceMs > 0) {
            callbackInfo.debouncedCallback = debounce(callback, callbackInfo.debounceMs);
        }

        registeredCallbacks.set(name, callbackInfo);
        logDebug(`Registered observer callback: ${name}`);
    }

    function processMutations(mutations) {
        logDebug("Unified observer triggered. Processing mutations...");

        // Group callbacks by priority
        const callbacksByPriority = {
            high: [],
            normal: [],
            low: []
        };

        // Sort callbacks by priority and check conditions
        registeredCallbacks.forEach((callbackInfo, name) => {
            // Check if conditions are met
            if (callbackInfo.conditions.length > 0) {
                const conditionsMet = callbackInfo.conditions.every(condition => {
                    try {
                        return condition();
                    } catch (error) {
                        console.warn(`[BeatPass] Condition check failed for ${name}:`, error);
                        return false;
                    }
                });
                
                if (!conditionsMet) {
                    return; // Skip this callback
                }
            }

            // Check rate limiting
            const now = Date.now();
            if (callbackInfo.debounceMs > 0 && 
                now - callbackInfo.lastExecuted < callbackInfo.debounceMs) {
                return; // Skip due to rate limiting
            }

            callbacksByPriority[callbackInfo.priority].push({ name, callbackInfo });
        });

        // Execute callbacks in priority order
        ['high', 'normal', 'low'].forEach(priority => {
            callbacksByPriority[priority].forEach(({ name, callbackInfo }) => {
                try {
                    const callback = callbackInfo.debouncedCallback || callbackInfo.callback;
                    callback(mutations);
                    callbackInfo.lastExecuted = Date.now();
                } catch (error) {
                    console.error(`[BeatPass] Error in observer callback ${name}:`, error);
                }
            });
        });
    }

    function startObserver() {
        if (unifiedObserver) {
            unifiedObserver.disconnect();
        }

        unifiedObserver = new MutationObserver(processMutations);
        unifiedObserver.observe(document.body, observerConfig);
        
        logDebug('Unified observer started');
    }

    function stopObserver() {
        if (unifiedObserver) {
            unifiedObserver.disconnect();
            unifiedObserver = null;
            logDebug('Unified observer stopped');
        }
    }



    // ============================================================
    // Style Injection
    // ============================================================
    function injectConsolidatedStyles() {
        if (!document.getElementById('beatpass-consolidated-styles')) {
            const style = document.createElement('style');
            style.id = 'beatpass-consolidated-styles';
            style.textContent = `
                /* BeatPass Consolidated Integration Styles */
                
                /* BeatPassID button custom CSS */
                button.beatpass-id-button.ml-2.px-4.py-2.rounded-lg.text-sm.font-medium.flex.items-center.gap-2 {
                    height: 2.25rem;
                    margin: 0.4rem;
                }
                
                /* Banner loaded state */
                .banner-container.loaded {
                    opacity: 1;
                    transform: translateY(0);
                    transition: opacity 0.3s ease, transform 0.3s ease;
                }
                
                /* Immersive background styles */
                .has-blur-bg {
                    position: relative;
                }
                
                .has-blur-bg::before {
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
                    filter: blur(25px) brightness(0.4) saturate(1.3);
                    opacity: 0.6;
                    z-index: -2;
                    pointer-events: none;
                    transition: opacity 0.8s ease;
                }
                
                .has-blur-bg::after {
                    content: '';
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(
                        135deg,
                        rgba(0, 0, 0, 0.6) 0%,
                        rgba(0, 0, 0, 0.4) 50%,
                        rgba(0, 0, 0, 0.7) 100%
                    );
                    z-index: -1;
                    pointer-events: none;
                }
                
                /* Performance optimizations */
                .has-track-gradient,
                .has-blur-bg {
                    will-change: auto;
                    transform: translateZ(0);
                }
            `;
            document.head.appendChild(style);
        }
    }

    // ============================================================
    // Main Initialization System
    // ============================================================
    let initializationAttempted = false;
    let initializationPromise = null;

    function initializeConsolidatedObserver() {
        if (unifiedObserver) {
            unifiedObserver.disconnect();
        }

        const debouncedMutationHandler = debounce((mutations) => {
            logDebug("Observer triggered. Checking for changes...");
            
            mutations.forEach(m => {
                if (m.type === 'childList' && m.addedNodes.length > 0) {
                    // Process added nodes for any remaining functionality
                    logDebug("New nodes added to DOM");
                }
            });
        }, CONFIG.DEBOUNCE_DELAY);

        unifiedObserver = new MutationObserver(debouncedMutationHandler);
        unifiedObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['src']
        });

        logDebug('Consolidated observer initialized');
    }

    function setupNavigationHandling() {
        const originalPushState = history.pushState;
        history.pushState = function(...args) {
            const result = originalPushState.apply(this, args);
            return result;
        };
        
        logDebug('Navigation handling set up');
    }

    async function initializeConsolidated() {
        if (initializationAttempted) {
            return initializationPromise;
        }
        
        initializationAttempted = true;
        
        initializationPromise = (async () => {
            try {
                logDebug('Starting BeatPass consolidated integration initialization...');
                
                // Try to initialize with the modern module system first
                const managerSuccess = await initializeWithManager();
                
                if (!managerSuccess) {
                    // Fall back to legacy initialization after a delay
                    logDebug('Manager initialization failed, trying fallback in', CONFIG.FALLBACK_DELAY, 'ms');
                    await new Promise(resolve => setTimeout(resolve, CONFIG.FALLBACK_DELAY));
                    
                    const fallbackSuccess = initializeWithFallback();
                    
                    if (!fallbackSuccess) {
                        throw new Error('Both manager and fallback initialization failed');
                    }
                }
                
                // Always inject styles and set up core functionality
                injectConsolidatedStyles();
                initializeConsolidatedObserver();
                setupNavigationHandling();
                
                // Dispatch initialization complete event
                const event = new CustomEvent('beatpass:consolidated-initialized', {
                    detail: {
                        timestamp: Date.now(),
                        method: managerSuccess ? 'manager' : 'fallback'
                    }
                });
                document.dispatchEvent(event);
                
                logDebug('BeatPass consolidated integration fully initialized');
                
            } catch (error) {
                console.error('[BeatPass] Consolidated initialization failed:', error);
                throw error;
            }
        })();
        
        return initializationPromise;
    }

    function waitForInitManager(timeout = 5000) {
        return new Promise((resolve, reject) => {
            if (window.BeatPassIntegrationInitManager) {
                resolve(window.BeatPassIntegrationInitManager);
                return;
            }

            const startTime = Date.now();
            const checkInterval = setInterval(() => {
                if (window.BeatPassIntegrationInitManager) {
                    clearInterval(checkInterval);
                    resolve(window.BeatPassIntegrationInitManager);
                } else if (Date.now() - startTime > timeout) {
                    clearInterval(checkInterval);
                    reject(new Error('BeatPassIntegrationInitManager not available'));
                }
            }, 100);
        });
    }

    async function initializeWithManager() {
        try {
            logDebug('Waiting for BeatPassIntegrationInitManager...');
            const initManager = await waitForInitManager(CONFIG.INITIALIZATION_TIMEOUT);
            
            logDebug('BeatPassIntegrationInitManager found, starting initialization...');
            await initManager.initialize();
            
            logDebug('BeatPass integration initialized successfully via InitManager');
            return true;
            
        } catch (error) {
            console.warn('[BeatPass] Failed to initialize via InitManager:', error);
            return false;
        }
    }

    function initializeWithFallback() {
        logDebug('Using fallback initialization...');
        
        try {
            // Try to call legacy initialization functions if they exist
            const legacyFunctions = [
                'robustInitialize',
                'initTrackPage', 
                'observeTrackChanges'
            ];
            
            legacyFunctions.forEach(funcName => {
                if (typeof window[funcName] === 'function') {
                    try {
                        window[funcName]();
                        logDebug(`Called legacy function: ${funcName}`);
                    } catch (error) {
                        console.warn(`[BeatPass] Error calling ${funcName}:`, error);
                    }
                }
            });
            
            // Try to initialize individual modules if they're available
            const moduleInitializers = [
                'BeatPassUIModifications',
                'BeatPassAdRemoval', 
                'BeatPassImmersiveStyling',
                'BeatPassChequeButtonRemoval',
                'BeatPassLegacyCompatibility',
                'BeatPassRemainingFeatures'
            ];
            
            moduleInitializers.forEach(moduleName => {
                const module = window[moduleName];
                if (module && typeof module.initialize === 'function') {
                    try {
                        module.initialize();
                        logDebug(`Initialized module: ${moduleName}`);
                    } catch (error) {
                        console.warn(`[BeatPass] Error initializing ${moduleName}:`, error);
                    }
                }
            });
            
            logDebug('Fallback initialization completed');
            return true;
            
        } catch (error) {
            console.error('[BeatPass] Fallback initialization failed:', error);
            return false;
        }
    }

    // ============================================================
    // Auto-initialization
    // ============================================================
    function autoInitialize() {
        if (document.readyState !== 'loading') {
            // DOM is already ready
            setTimeout(initializeConsolidated, 100);
        } else {
            // Wait for DOM to be ready
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(initializeConsolidated, 100);
            });
        }
    }

    // ============================================================
    // Cleanup Functions
    // ============================================================
    function cleanup() {
        try {
            if (unifiedObserver) {
                unifiedObserver.disconnect();
                unifiedObserver = null;
            }
            
            // Remove injected styles
            const stylesToRemove = [
                'beatpass-consolidated-styles'
            ];
            
            stylesToRemove.forEach(styleId => {
                const style = document.getElementById(styleId);
                if (style) {
                    style.remove();
                }
            });
            
            logDebug('Consolidated cleanup completed');
            
        } catch (error) {
            console.error('[BeatPass] Cleanup failed:', error);
        }
    }

    // ============================================================
    // Global API Exports
    // ============================================================
    
    // Script Loader API
    window.BeatPassScriptLoader = {
        loadScript,
        loadScripts,
        clearScriptCache: () => {
            loadedScripts.clear();
            scriptLoadPromises.clear();
        },
        isScriptLoaded: (src) => loadedScripts.has(src),
        isScriptLoading: (src) => scriptLoadPromises.has(src),
        getLoadedScripts: () => Array.from(loadedScripts),
        getLoadingScripts: () => Array.from(scriptLoadPromises.keys())
    };

    // UI Modifications API
    window.BeatPassUIModifications = {
        injectBeatPassIdButtonStyles: () => injectConsolidatedStyles()
    };

    // Unified Observer API
    window.BeatPassUnifiedObserver = {
        registerCallback,
        unregisterCallback: (name) => {
            if (registeredCallbacks.has(name)) {
                registeredCallbacks.delete(name);
                logDebug(`Unregistered observer callback: ${name}`);
            }
        },
        startObserver,
        stopObserver,
        restartObserver: () => {
            stopObserver();
            startObserver();
        },
        isActive: () => !!unifiedObserver
    };

    // Remaining Features API
    window.BeatPassRemainingFeatures = {
        initializeUnifiedObserver: initializeConsolidatedObserver,
        setupNavigationHandling,
        cleanup,
        isObserverActive: () => !!unifiedObserver
    };

    // Legacy Compatibility API
    window.BeatPassLegacyCompatibility = {
        loadScript,
        cleanup
    };

    // Main API
    window.BeatPassMain = {
        initialize: initializeConsolidated,
        isInitialized: () => initializationAttempted,
        getInitializationPromise: () => initializationPromise,
        cleanup,
        
        // Legacy compatibility
        robustInitialize: initializeConsolidated,
        initTrackPage: initializeConsolidated,
        observeTrackChanges: initializeConsolidated
    };

    // Initialization Manager API (for compatibility)
    window.BeatPassIntegrationInitManager = {
        initialize: initializeConsolidated,
        isInitialized: () => initializationAttempted,
        getState: () => ({
            isInitialized: initializationAttempted,
            isInitializing: !!initializationPromise,
            loadedModules: new Set(['consolidated']),
            failedModules: new Set()
        })
    };



    // ============================================================
    // Error Handling
    // ============================================================
    window.addEventListener('error', (event) => {
        if (event.filename && event.filename.includes('BeatPass')) {
            console.error('[BeatPass] Runtime error:', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error
            });
        }
    });

    window.addEventListener('unhandledrejection', (event) => {
        if (event.reason && event.reason.message && event.reason.message.includes('BeatPass')) {
            console.error('[BeatPass] Unhandled promise rejection:', event.reason);
        }
    });

    // ============================================================
    // Initialize
    // ============================================================
    autoInitialize();

    console.log('[BeatPass] Consolidated integration loaded');
})();