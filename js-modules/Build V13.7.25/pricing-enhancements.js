/**
 * BeatPass Pricing Table Native Carousel Enhancement
 * Transforms the pricing table into a native carousel with infinite scrolling
 * optimized for 4 plans: ALL 4 visible on desktop, 1 on mobile.
 * 
 * OPTIMIZED VERSION: Uses app foundation for better performance
 */

(function() {
    'use strict';

    // Configuration
    const TARGET_URL = 'https://open.beatpass.ca/pricing';
    const DEBUG_MODE = false; // Reduced logging for performance
    
    // Use window directly for better performance
    const globalObj = window;

    // Centralized Initialization State Manager
    const InitializationManager = {
        state: {
            isInitialized: false,
            currentUrl: window.location.href,
            pricingCarouselInstance: null,
            injectedStyles: null,
            initializationTimeout: null,
            observers: new Map(),
            originalPushState: null,
            originalReplaceState: null
        },
        
        async init() {
            if (this.state.isInitialized) {
                log('Already initialized, skipping...');
                return;
            }
            
            try {
                log('Initializing pricing enhancements...');
                
                // Wait for coordinator if available
                await this._waitForCoordinator();
                
                // Setup navigation handling
                this._setupNavigationHandling();
                
                // Initialize based on current page
                if (isOnPricingPage()) {
                    await this._initializePricingPage();
                }
                
                this.state.isInitialized = true;
                log('Pricing enhancements initialized successfully');
                
            } catch (error) {
                console.error('Failed to initialize pricing enhancements:', error);
                // Retry after delay
                setTimeout(() => this.init(), 1000);
            }
        },
        
        async _waitForCoordinator(timeout = 5000) {
            if (typeof window.waitForCoordinator === 'function') {
                try {
                    await window.waitForCoordinator(timeout);
                } catch (error) {
                    log('Coordinator wait failed, proceeding without coordination:', error);
                }
            }
        },
        
        _setupNavigationHandling() {
            // Store original methods
            this.state.originalPushState = window.history.pushState;
            this.state.originalReplaceState = window.history.replaceState;
            
            // Override navigation methods
            window.history.pushState = (...args) => {
                this.state.originalPushState.apply(window.history, args);
                this._handleNavigation();
            };
            
            window.history.replaceState = (...args) => {
                this.state.originalReplaceState.apply(window.history, args);
                this._handleNavigation();
            };
            
            // Listen for popstate
            window.addEventListener('popstate', () => this._handleNavigation());
            window.addEventListener('beforeunload', () => this.cleanup());
        },
        
        _handleNavigation() {
            const newUrl = window.location.href;
            
            if (newUrl !== this.state.currentUrl) {
                log(`URL changed from ${this.state.currentUrl} to ${newUrl}`);
                this.state.currentUrl = newUrl;
                
                // Clear element cache on navigation
                elementCache.clear();
                
                if (isOnPricingPage()) {
                    this._initializePricingPage();
                } else {
                    this._cleanupPricingPage();
                }
            }
        },
        
        async _initializePricingPage() {
            try {
                // Clean up any existing instance
                this._cleanupPricingPage();
                
                // Use requestIdleCallback for non-critical initialization
                const initializeCarousel = () => {
                    injectPricingStyles();
                    this.state.pricingCarouselInstance = new PricingCarousel();
                    window.BeatPassPricingCarousel = this.state.pricingCarouselInstance;
                    log('Pricing carousel initialized successfully');
                };
                
                if ('requestIdleCallback' in window) {
                    requestIdleCallback(initializeCarousel, { timeout: 500 });
                } else {
                    this.state.initializationTimeout = setTimeout(() => {
                        requestAnimationFrame(initializeCarousel);
                    }, 100);
                }
                
            } catch (error) {
                console.error('Failed to initialize pricing page:', error);
            }
        },
        
        _cleanupPricingPage() {
            // Clear any pending initialization
            if (this.state.initializationTimeout) {
                clearTimeout(this.state.initializationTimeout);
                this.state.initializationTimeout = null;
            }
            
            // Remove pricing carousel instance
            if (this.state.pricingCarouselInstance) {
                this.state.pricingCarouselInstance.destroy();
                this.state.pricingCarouselInstance = null;
            }
            
            // Remove injected styles
            if (this.state.injectedStyles) {
                this.state.injectedStyles.remove();
                this.state.injectedStyles = null;
            }
            
            // Clean up DOM elements
            cleanupPricingEnhancements();
        },
        
        cleanup() {
            try {
                log('Cleaning up pricing enhancements...');
                
                this._cleanupPricingPage();
                
                // Restore navigation methods
                if (this.state.originalPushState) {
                    window.history.pushState = this.state.originalPushState;
                }
                if (this.state.originalReplaceState) {
                    window.history.replaceState = this.state.originalReplaceState;
                }
                
                // Clear observers
                this.state.observers.forEach(observer => observer.disconnect());
                this.state.observers.clear();
                
                // Clear global references
                if (window.BeatPassPricingCarousel) {
                    delete window.BeatPassPricingCarousel;
                }
                
                this.state.isInitialized = false;
                log('Cleanup completed');
                
            } catch (error) {
                console.error('Error during cleanup:', error);
            }
        }
    };
    
    // Cache frequently used elements
    const elementCache = new Map();
    
    // Utility functions (optimized)
    function log(...args) {
        if (DEBUG_MODE) {
            console.log('[BeatPass Pricing]', ...args);
        }
    }

    function isOnPricingPage() {
        return window.location.href === TARGET_URL;
    }
    
    // Cache DOM queries
    function getCachedElement(selector) {
        if (!elementCache.has(selector)) {
            elementCache.set(selector, document.querySelector(selector));
        }
        return elementCache.get(selector);
        }
    
    function clearElementCache() {
        elementCache.clear();
    }

    function cleanupPricingEnhancements() {
            log('Cleaning up pricing enhancements...');
        
        // Clear any pending initialization
        if (InitializationManager.state.initializationTimeout) {
            clearTimeout(InitializationManager.state.initializationTimeout);
            InitializationManager.state.initializationTimeout = null;
        }
            
            // Remove pricing carousel instance
            if (InitializationManager.state.pricingCarouselInstance) {
                    InitializationManager.state.pricingCarouselInstance.destroy();
                InitializationManager.state.pricingCarouselInstance = null;
            }
        
            // Remove injected styles
                if (InitializationManager.state.injectedStyles) {
                    InitializationManager.state.injectedStyles.remove();
                    InitializationManager.state.injectedStyles = null;
                }
        
        // Batch remove all pricing-related elements
        const selectorsToRemove = [
            '.pricing-carousel-container',
            '[data-carousel-subtitle]',
            '[data-hero-section]',
            '[data-calculator-trigger]',
            '[data-calculator-modal-overlay]',
            '[data-features-grid]',
            '[data-faq-section]',
            '[data-tab-nav]',
            '[data-license-clarity]',
            '[data-stripe-trust-seal]'
        ];
        
        // Single query for all elements
        const elementsToRemove = document.querySelectorAll(selectorsToRemove.join(', '));
        
        // Use requestAnimationFrame for smooth removal
        if (elementsToRemove.length > 0) {
            requestAnimationFrame(() => {
                elementsToRemove.forEach(el => {
                    // Special handling for carousel containers
                    if (el.classList.contains('pricing-carousel-container')) {
                        const wrapper = el.closest('.mb-50');
                        if (wrapper) {
                            wrapper.remove();
                        } else {
                            el.remove();
                        }
                    } else if (el.hasAttribute('data-features-grid')) {
                        const section = el.closest('div');
                        if (section) {
                            section.remove();
                        } else {
                            el.remove();
                    }
                    } else {
                        el.remove();
                    }
                });
            });
            }
            
        // Restore body scroll
        document.body.style.overflow = '';
        
        // Clear caches
        clearElementCache();
        
            // Clear global references
        if (window.BeatPassPricingCarousel) {
            delete window.BeatPassPricingCarousel;
            }
            
            log('Cleanup completed');
    }

    function injectPricingStyles() {
        if (InitializationManager.state.injectedStyles) return; // Already injected
        
        InitializationManager.state.injectedStyles = document.createElement('style');
        InitializationManager.state.injectedStyles.setAttribute('data-beatpass-pricing', 'true');
        InitializationManager.state.injectedStyles.textContent = `
            /* Material Icons Font Import */
            @import url('https://fonts.googleapis.com/icon?family=Material+Icons');
            
            /* Container padding override */
            .container.mx-auto.px-24 {
                padding-top: 2rem;
            }
            
            /* Pricing Carousel Override - Fix Card Clipping */
            .pricing-carousel-container {
                margin: 0 auto;
                overflow-y: visible !important;
                min-height: fit-content;
                height: auto;
                --nVisibleItems: 2;
                grid-auto-columns: calc((100% - (var(--nVisibleItems) - 1) * 24px) / var(--nVisibleItems));
            }
            
            /* Mobile: Show 1 plan - FIXED */
            @media (max-width: 767px) {
                .pricing-carousel-container {
                    grid-auto-columns: 100% !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    -webkit-mask-image: none !important;
                    mask-image: none !important;
                    overflow-x: auto !important;
                    overflow-y: visible !important;
                    width: 100% !important;
                    max-width: 100% !important;
                }
            }
            
            /* Tablet: Show 2 plans with better spacing */
            @media (min-width: 768px) and (max-width: 1145px) {
                .pricing-carousel-container {
                    --nVisibleItems: 2;
                    grid-auto-columns: calc((100% - (var(--nVisibleItems) - 1) * 24px) / var(--nVisibleItems)) !important;
                    padding: 0 20px;
                    gap: 24px;
                    justify-content: center;
                }
            }
            
            /* Medium screens: Improve spacing */
            @media (min-width: 1024px) and (max-width: 1145px) {
                .pricing-carousel-container {
                    --nVisibleItems: 2;
                    grid-auto-columns: calc((100% - (var(--nVisibleItems) - 1) * 32px) / var(--nVisibleItems)) !important;
                    padding: 0 32px;
                    gap: 32px;
                    max-width: 1000px;
                    margin: 0 auto;
                }
            }
            
            /* Large Desktop: Show 3 plans above 1146px */
            @media (min-width: 1146px) {
                .pricing-carousel-container {
                    --nVisibleItems: 3;
                    grid-auto-columns: calc((100% - (var(--nVisibleItems) - 1) * 24px) / var(--nVisibleItems)) !important;
                    padding: 0 24px;
                    max-width: 1200px;
                    margin: 0 auto;
                }
            }
            
            /* Snap container fixes */
            .pricing-carousel-container > .snap-start {
                flex-shrink: 0;
                width: 100%;
                display: flex;
                align-items: stretch;
                box-sizing: border-box;
                overflow: visible !important;
                min-width: 0;
                position: relative;
            }
            
            /* Mobile snap container fixes */
            @media (max-width: 767px) {
                .pricing-carousel-container > .snap-start {
                    width: 100% !important;
                    min-width: 100% !important;
                    max-width: 100% !important;
                    flex-shrink: 0;
                    flex-grow: 0;
                    margin: 0 !important;
                    padding: 0 !important;
                    position: relative !important;
                }
            }
            
            /* Tablet snap container fixes */
            @media (min-width: 768px) and (max-width: 1145px) {
                .pricing-carousel-container > .snap-start {
                    width: 100% !important;
                    min-width: 0 !important;
                    max-width: 100% !important;
                    flex-shrink: 0;
                    flex-grow: 0;
                    display: flex;
                    align-items: stretch;
                    box-sizing: border-box;
                }
            }
            
            /* Pricing card wrapper */
            .pricing-carousel-container .pricing-carousel-card {
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                height: auto;
                min-height: 600px;
                display: flex;
                flex-direction: column;
                flex-shrink: 0;
                box-sizing: border-box;
                opacity: 1 !important;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                overflow: visible !important;
                margin-left: 0 !important;
                margin-right: 0 !important;
                position: relative;
                backdrop-filter: blur(8px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px !important;
            }
            
            /* Ensure pricing card buttons are consistent */
            .pricing-carousel-card a[type="button"],
            .pricing-carousel-card button {
                border-radius: 12px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                gap: 8px !important;
                line-height: 1 !important;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
            }
            
            .pricing-carousel-container .pricing-carousel-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, transparent 100%);
                border-radius: inherit;
                transition: opacity 0.3s ease;
                opacity: 0;
                pointer-events: none;
            }
            
            /* Hover effects */
            .pricing-carousel-container .pricing-carousel-card:hover {
                transform: translateY(-4px) scale(1.02);
                box-shadow: 
                    0 12px 40px rgba(0, 0, 0, 0.2),
                    0 0 0 1px rgba(255, 255, 255, 0.15),
                    inset 0 1px 0 rgba(255, 255, 255, 0.1);
                border-color: rgba(255, 255, 255, 0.2);
            }
            
            .pricing-carousel-container .pricing-carousel-card:hover::before {
                opacity: 1;
            }
            
            /* Enhanced button styling */
            .pricing-carousel-container .pricing-carousel-card a[type="button"] {
                transition: all 0.2s ease;
            }
            
            .pricing-carousel-container .pricing-carousel-card a[type="button"]:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(255, 255, 255, 0.1);
            }
            
            /* Card content fills height */
            .pricing-carousel-container .pricing-carousel-card > * {
                flex: 1;
                display: flex;
                flex-direction: column;
            }
            
            /* Remove conflicting classes */
            .pricing-carousel-container .pricing-carousel-card.w-full,
            .pricing-carousel-container .pricing-carousel-card.md\\:w-auto,
            .pricing-carousel-container .pricing-carousel-card.max-w-sm,
            .pricing-carousel-container .pricing-carousel-card.ml-auto,
            .pricing-carousel-container .pricing-carousel-card.mr-auto {
                width: 100% !important;
                max-width: 100% !important;
                min-width: 0 !important;
                margin-left: 0 !important;
                margin-right: 0 !important;
            }
            
            /* Override width constraints */
            .pricing-carousel-container .pricing-carousel-card.md\\:min-w-240,
            .pricing-carousel-container .pricing-carousel-card.md\\:max-w-350 {
                min-width: 0 !important;
                max-width: 100% !important;
            }
            
            /* Navigation button styling */
            .mb-50 .flex.items-center.justify-between.gap-24.mb-14 button {
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                backdrop-filter: blur(8px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
                position: relative;
                overflow: hidden;
                border-radius: 10px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                width: 42px !important;
                height: 42px !important;
                cursor: pointer;
            }
            
            .mb-50 .flex.items-center.justify-between.gap-24.mb-14 button svg {
                width: 20px !important;
                height: 20px !important;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .mb-50 .flex.items-center.justify-between.gap-24.mb-14 button::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, transparent 100%);
                opacity: 0;
                transition: opacity 0.3s ease;
                border-radius: inherit;
            }
            
            .mb-50 .flex.items-center.justify-between.gap-24.mb-14 button:hover {
                transform: scale(1.05) translateY(-1px);
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
                border-color: rgba(255, 255, 255, 0.2);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }
            
            .mb-50 .flex.items-center.justify-between.gap-24.mb-14 button:hover::before {
                opacity: 1;
            }
            
            .mb-50 .flex.items-center.justify-between.gap-24.mb-14 button:disabled {
                opacity: 0.4;
                transform: none;
                cursor: not-allowed;
            }
            
            .mb-50 .flex.items-center.justify-between.gap-24.mb-14 button:disabled:hover {
                transform: none;
                background: transparent;
                border-color: rgba(255, 255, 255, 0.1);
                box-shadow: none;
            }
            
            /* Hide scrollbar */
            .hidden-scrollbar {
                scrollbar-width: none;
                -ms-overflow-style: none;
            }
            .hidden-scrollbar::-webkit-scrollbar {
                display: none;
            }
            
            /* Smooth scrolling */
            .pricing-carousel-container {
                scroll-behavior: smooth;
            }
            
            /* Snap behavior */
            .pricing-carousel-container > .snap-start {
                scroll-snap-align: start;
                scroll-snap-stop: always;
            }
            
            /* Ensure content stays within bounds */
            .pricing-carousel-card * {
                max-width: 100%;
                box-sizing: border-box;
            }
            
            /* Fix wrapper containers */
            .mb-50 {
                overflow: visible !important;
            }
            
            .mb-50 > div {
                overflow: visible !important;
            }
            
            /* Mobile specific fixes */
            @media (max-width: 767px) {
                .pricing-carousel-container,
                .pricing-carousel-container > *,
                .mb-50,
                .mb-50 > div {
                    overflow-x: auto !important;
                    overflow-y: visible !important;
                    height: auto !important;
                    min-height: fit-content !important;
                    max-height: none !important;
                }
                
                body, html {
                    overflow-x: auto !important;
                }
                
                .mb-50 {
                    margin: 0 !important;
                    overflow-x: auto !important;
                    overflow-y: visible !important;
                }
                
                .mb-50 > div {
                    padding: 0 !important;
                    margin: 0 !important;
                    overflow-x: auto !important;
                    overflow-y: visible !important;
                }
                
                .mb-50 .flex.items-center.justify-between.gap-24.mb-14 {
                    padding: 0 !important;
                    margin-bottom: 14px !important;
                    box-sizing: border-box !important;
                }
                
                .pricing-carousel-container .pricing-carousel-card {
                    min-height: 550px;
                    width: 100% !important;
                    max-width: 100% !important;
                    min-width: 100% !important;
                    padding-left: 20px !important;
                    padding-right: 20px !important;
                    margin: 0 !important;
                    box-sizing: border-box !important;
                    overflow: hidden !important;
                }
            }
            
            /* Tablet card heights */
            @media (min-width: 768px) and (max-width: 1145px) {
                .pricing-carousel-container .pricing-carousel-card {
                    min-height: 580px;
                    width: 100% !important;
                    max-width: 100% !important;
                    min-width: 0 !important;
                    display: flex;
                    flex-direction: column;
                    box-sizing: border-box;
                }
                
                .pricing-carousel-container .pricing-carousel-card > * {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }
            }
            
            /* Desktop card heights */
            @media (min-width: 1146px) {
                .pricing-carousel-container .pricing-carousel-card {
                    min-height: 600px;
                    width: 100% !important;
                    max-width: 100% !important;
                    min-width: 0 !important;
                }
            }
            
            /* Accessibility */
            .pricing-carousel-container .pricing-carousel-card:focus-within {
                outline: 2px solid rgba(255, 255, 255, 0.3);
                outline-offset: 2px;
            }
            
            /* Scroll-triggered animations */
            @keyframes slideInUp {
                from {
                    opacity: 0;
                    transform: translateY(30px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            @keyframes fadeInScale {
                from {
                    opacity: 0;
                    transform: scale(0.9);
                }
                to {
                    opacity: 1;
                    transform: scale(1);
                }
            }
            
            /* Apply animations to sections */
            .trust-indicators-section,
            .security-section,
            .final-cta-section {
                animation: slideInUp 0.6s ease-out;
            }
            
            .pricing-carousel-container {
                animation: fadeInScale 0.8s ease-out;
            }
            
            /* Staggered animations for cards */
            .feature-card {
                animation: slideInUp 0.6s ease-out;
                animation-fill-mode: both;
            }
            
            .feature-card:nth-child(1) { animation-delay: 0.1s; }
            .feature-card:nth-child(2) { animation-delay: 0.2s; }
            .feature-card:nth-child(3) { animation-delay: 0.3s; }
            .feature-card:nth-child(4) { animation-delay: 0.4s; }
            .feature-card:nth-child(5) { animation-delay: 0.5s; }
            .feature-card:nth-child(6) { animation-delay: 0.6s; }
            
            /* Shimmer effect for exclusive card */
            @keyframes shimmer {
                0% { transform: translateX(-100%); }
                50% { transform: translateX(100%); }
                100% { transform: translateX(100%); }
            }
            
            /* Global border-radius hierarchy */
            button:not([class*="rounded"]) {
                border-radius: 12px !important;
            }
            
            .pill,
            .badge,
            [class*="pill"],
            [class*="badge"] {
                border-radius: 999px !important;
            }
            
            .card:not([class*="rounded"]) {
                border-radius: 12px !important;
            }
            
            .container:not([class*="rounded"]) {
                border-radius: 16px !important;
            }
            
            /* Ensure all icon containers are circular */
            [class*="w-"][class*="h-"]:has(.material-icons),
            .icon-container {
                border-radius: 50% !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
            }
            
            /* Loading animation */
            .pricing-carousel-container.initializing {
                opacity: 0;
                transform: translateY(10px);
                transition: opacity 0.3s ease, transform 0.3s ease;
            }
            
            .pricing-carousel-container.loaded {
                opacity: 1;
                transform: translateY(0);
            }
            
            /* Feature Explanation Section - Tab Design */
            [data-tab-nav] {
                scrollbar-width: none;
                -ms-overflow-style: none;
                overflow-x: auto;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            [data-tab-nav]::-webkit-scrollbar {
                display: none;
            }
            
            .plan-tab {
                flex-shrink: 0;
                transition: all 0.2s ease;
                position: relative;
            }
            
            .plan-tab:hover {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px 8px 0 0;
            }
            
            .plan-tab.active {
                color: var(--primary, #007bff);
                border-bottom-color: var(--primary, #007bff);
            }
            
            .plan-content {
                transition: opacity 0.3s ease, transform 0.3s ease;
            }
            
            .plan-content.hidden {
                opacity: 0;
                transform: translateY(10px);
                pointer-events: none;
                position: absolute;
                left: -9999px;
            }
            
            .plan-content.active {
                opacity: 1;
                transform: translateY(0);
                position: relative;
                left: auto;
            }
            
            .feature-card {
                border: 1px solid rgba(255, 255, 255, 0.1);
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%);
                backdrop-filter: blur(8px);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
                overflow: hidden;
                border-radius: 12px !important;
            }
            
            .feature-card .w-40,
            .feature-card .w-48 {
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                border-radius: 50% !important;
                flex-shrink: 0;
            }
            
            .feature-card .material-icons {
                line-height: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
            }
            
            .feature-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 2px;
                background: linear-gradient(90deg, transparent 0%, rgba(0, 123, 255, 0.6) 50%, transparent 100%);
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            
            .feature-card:hover {
                border-color: rgba(255, 255, 255, 0.25);
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.03) 100%);
                transform: translateY(-4px);
                box-shadow: 
                    0 12px 40px rgba(0, 0, 0, 0.2),
                    0 0 0 1px rgba(255, 255, 255, 0.1),
                    inset 0 1px 0 rgba(255, 255, 255, 0.1);
            }
            
            .feature-card:hover::before {
                opacity: 1;
            }
            
            .feature-card:hover .material-icons {
                transform: scale(1.1);
                filter: brightness(1.2);
            }
            
            .feature-card .material-icons {
                font-family: 'Material Icons', 'Material Icons Outlined', 'Material Icons Two Tone', 'Material Icons Round', 'Material Icons Sharp', Arial, sans-serif;
                font-weight: normal;
                font-style: normal;
                font-size: 18px;
                line-height: 1;
                letter-spacing: normal;
                text-transform: none;
                display: inline-block;
                white-space: nowrap;
                word-wrap: normal;
                direction: ltr;
                -webkit-font-feature-settings: 'liga';
                -webkit-font-smoothing: antialiased;
            }
            
            /* Mobile optimizations */
            @media (max-width: 767px) {
                [data-tab-nav] {
                    gap: 4px;
                    padding: 0 16px;
                    margin: 0 -16px 32px -16px;
                }
                
                .plan-tab {
                    padding: 8px 12px;
                    font-size: 0.875rem;
                }
                
                .plan-tab span:first-child {
                    font-size: 0.875rem;
                }
                
                .plan-tab span:last-child {
                    font-size: 0.75rem;
                }
                
                .feature-card {
                    padding: 16px;
                    border-radius: 8px;
                }
                
                .feature-card .ml-52 {
                    margin-left: 0;
                    margin-top: 8px;
                }
                
                .feature-card h3 {
                    font-size: 0.9rem;
                }
                
                .feature-card p {
                    font-size: 0.8rem;
                    line-height: 1.4;
                }
                
                [data-features-grid] .grid {
                    grid-template-columns: 1fr;
                    gap: 12px;
                }
            }
            
            /* Tablet and desktop styling */
            @media (min-width: 768px) {
                .plan-tab {
                    padding: 12px 16px;
                }
                
                .feature-card {
                    border-radius: 12px;
                }
                
                [data-features-grid] .grid.md\\:grid-cols-2 {
                    grid-template-columns: repeat(2, 1fr);
                }
            }
            
            /* Material Icons universal styling */
            .material-icons {
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                text-align: center !important;
                line-height: 1 !important;
                vertical-align: middle !important;
                font-style: normal !important;
                font-weight: normal !important;
                text-transform: none !important;
                letter-spacing: normal !important;
                word-wrap: normal !important;
                white-space: nowrap !important;
                direction: ltr !important;
                -webkit-font-smoothing: antialiased !important;
                text-rendering: optimizeLegibility !important;
                -moz-osx-font-smoothing: grayscale !important;
                font-feature-settings: 'liga' !important;
            }
            
            /* Icon-specific fallbacks using Unicode */
            .material-icons:empty:before {
                content: "●";
                color: var(--primary, #007bff);
            }
            
            /* Focus states for accessibility */
            .plan-tab:focus-visible {
                outline: 2px solid rgba(255, 255, 255, 0.5);
                outline-offset: 2px;
            }
            
            .feature-card:focus-within {
                outline: 2px solid rgba(255, 255, 255, 0.3);
                outline-offset: 2px;
            }
            
            /* Loading states */
            .plan-content-container {
                min-height: 400px;
                position: relative;
            }
            
            /* Trust Indicators Section */
            .trust-indicators-section {
                position: relative;
                z-index: 1;
                background: linear-gradient(135deg, rgba(0, 123, 255, 0.03) 0%, rgba(16, 185, 129, 0.03) 100%);
                border-radius: 12px;
                padding: 24px 20px;
                border: 1px solid rgba(255, 255, 255, 0.05);
            }
            
            .trust-indicators-section .flex {
                transition: all 0.3s ease;
            }
            
            .trust-indicators-section:hover .flex {
                opacity: 1 !important;
            }
            
            .trust-indicators-section .w-40 {
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
                overflow: hidden;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                border-radius: 50% !important;
            }
            
            .trust-indicators-section .material-icons {
                display: flex;
                align-items: center;
                justify-content: center;
                line-height: 1;
            }
            
            .trust-indicators-section .w-40::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.1) 50%, transparent 70%);
                transform: translateX(-100%);
                transition: transform 0.6s ease;
                border-radius: inherit;
            }
            
            .trust-indicators-section:hover .w-40::before {
                transform: translateX(100%);
            }
            
            .trust-indicators-section .w-40:hover {
                transform: scale(1.05);
                box-shadow: 0 4px 16px rgba(0, 123, 255, 0.2);
            }
            
            /* Hero Section Styling */
            .pricing-hero-section {
                text-align: center;
                padding: 80px 20px 60px 20px;
                margin-bottom: 50px;
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.01) 100%);
                border-radius: 16px;
                border: 1px solid rgba(255, 255, 255, 0.08);
                backdrop-filter: blur(8px);
                position: relative;
                overflow: hidden;
            }
            
            .pricing-hero-section::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: radial-gradient(ellipse at center, rgba(0, 123, 255, 0.08) 0%, rgba(16, 185, 129, 0.03) 50%, transparent 70%);
                pointer-events: none;
                animation: heroGlow 4s ease-in-out infinite alternate;
            }
            
            @keyframes heroGlow {
                0% { opacity: 0.7; }
                100% { opacity: 1; }
            }
            
            @keyframes ctaGlow {
                0% { 
                    opacity: 0.3;
                    transform: scale(1);
                }
                100% { 
                    opacity: 0.6;
                    transform: scale(1.05);
                }
            }
            
            .pricing-hero-section .hero-headline {
                font-size: clamp(2rem, 5vw, 3.5rem);
                font-weight: 700;
                line-height: 1.2;
                margin-bottom: 24px;
                background: linear-gradient(135deg, #fff 0%, rgba(255, 255, 255, 0.9) 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                position: relative;
                z-index: 1;
            }
            
            .pricing-hero-section .hero-price-highlight {
                color: #007bff;
                font-weight: 800;
                text-shadow: 0 0 20px rgba(0, 123, 255, 0.3);
            }
            
            .pricing-hero-section .hero-revenue-highlight {
                color: #28a745;
                font-weight: 800;
                text-shadow: 0 0 20px rgba(40, 167, 69, 0.3);
            }
            
            .pricing-hero-section .hero-subheadline {
                font-size: clamp(1.1rem, 2.5vw, 1.3rem);
                color: rgba(255, 255, 255, 0.8);
                font-weight: 500;
                margin-bottom: 32px;
                max-width: 650px;
                margin-left: auto;
                margin-right: auto;
                line-height: 1.5;
                position: relative;
                z-index: 1;
            }
            
            /* Hero Value Props */
            .hero-value-props {
                position: relative;
                z-index: 1;
            }
            
            .hero-prop {
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 999px;
                padding: 10px 18px;
                transition: all 0.2s ease;
                backdrop-filter: blur(4px);
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }
            
            .hero-prop .material-icons {
                line-height: 1;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .hero-prop:hover {
                background: rgba(255, 255, 255, 0.08);
                border-color: rgba(255, 255, 255, 0.2);
                transform: translateY(-1px);
            }
            
            .hero-secondary-text {
                position: relative;
                z-index: 1;
                font-weight: 500;
                opacity: 0.8;
            }
            
            /* Hero CTA Container */
            .hero-cta-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 16px;
                position: relative;
                z-index: 1;
            }
            
            /* Primary CTA Button */
            .hero-primary-cta {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
                background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
                color: white;
                padding: 16px 32px;
                border-radius: 12px;
                font-size: 1.1rem;
                font-weight: 600;
                text-decoration: none;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 
                    0 4px 16px rgba(0, 123, 255, 0.3),
                    0 0 0 1px rgba(255, 255, 255, 0.1),
                    inset 0 1px 0 rgba(255, 255, 255, 0.2);
                position: relative;
                overflow: hidden;
                min-width: 220px;
                border: none;
                cursor: pointer;
                line-height: 1;
            }
            
            .hero-primary-cta .material-icons {
                line-height: 1;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .hero-primary-cta::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, transparent 50%);
                opacity: 0;
                transition: all 0.3s ease;
                border-radius: inherit;
            }
            
            .hero-primary-cta::after {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
                transition: left 0.6s ease;
            }
            
            .hero-primary-cta:hover {
                transform: translateY(-3px);
                box-shadow: 
                    0 8px 32px rgba(0, 123, 255, 0.4),
                    0 0 0 2px rgba(255, 255, 255, 0.2),
                    inset 0 1px 0 rgba(255, 255, 255, 0.3);
                background: linear-gradient(135deg, #0056b3 0%, #003d82 100%);
            }
            
            .hero-primary-cta:hover::before {
                opacity: 1;
            }
            
            .hero-primary-cta:hover::after {
                left: 100%;
            }
            
            .hero-primary-cta:active {
                transform: translateY(-1px);
                transition: transform 0.1s ease;
            }
            
            .hero-primary-cta .material-icons {
                font-size: 20px;
                transition: all 0.3s ease;
            }
            
            .hero-primary-cta:hover .material-icons:last-child {
                transform: translateX(4px);
            }
            
            .hero-primary-cta:hover .material-icons:first-child {
                transform: scale(1.1);
            }
            
            /* Secondary CTA */
            .hero-secondary-cta {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                text-decoration: none;
                color: rgba(255, 255, 255, 0.85);
                font-size: 0.95rem;
                font-weight: 500;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                padding: 14px 24px;
                border-radius: 12px;
                border: 1px solid rgba(255, 255, 255, 0.15);
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.02) 100%);
                backdrop-filter: blur(8px);
                position: relative;
                overflow: hidden;
                min-width: 200px;
                cursor: pointer;
                line-height: 1;
            }
            
            .hero-secondary-cta .material-icons {
                line-height: 1;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .hero-secondary-cta::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, transparent 100%);
                opacity: 0;
                transition: opacity 0.3s ease;
                border-radius: inherit;
            }
            
            .hero-secondary-cta:hover {
                color: rgba(255, 255, 255, 1);
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%);
                border-color: rgba(255, 255, 255, 0.25);
                transform: translateY(-2px);
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
            }
            
            .hero-secondary-cta:hover::before {
                opacity: 1;
            }
            
            .secondary-cta-content {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .secondary-cta-content .material-icons:first-child {
                font-size: 18px;
                color: #5865f2; /* Discord brand color */
            }
            
            .secondary-cta-content .material-icons:last-child {
                font-size: 16px;
                opacity: 0.7;
                transition: opacity 0.2s ease;
            }
            
            .hero-secondary-cta:hover .secondary-cta-content .material-icons:last-child {
                opacity: 1;
            }
            
            /* Mobile optimizations for hero */
            @media (max-width: 767px) {
                .trust-indicators-section {
                    margin-bottom: 24px;
                    padding: 16px;
                    margin-left: -16px;
                    margin-right: -16px;
                    border-radius: 0;
                    border-left: none;
                    border-right: none;
                }
                
                .trust-indicators-section .flex {
                    gap: 12px;
                    opacity: 1 !important;
                    flex-wrap: wrap;
                    justify-content: center;
                }
                
                .trust-indicators-section .flex > div {
                    flex-direction: column;
                    text-align: center;
                    gap: 6px;
                }
                
                .trust-indicators-section .w-40 {
                    width: 32px !important;
                    height: 32px !important;
                }
                
                .trust-indicators-section .hidden.md\\:block {
                    display: block !important;
                }
                
                .trust-indicators-section .font-semibold {
                    font-size: 0.75rem;
                }
                
                .trust-indicators-section .text-xs {
                    font-size: 0.65rem;
                }
                
                .pricing-hero-section {
                    padding: 40px 16px 40px 16px;
                    margin-bottom: 30px;
                    margin-left: -16px;
                    margin-right: -16px;
                    border-radius: 0;
                    border-left: none;
                    border-right: none;
                }
                
                .hero-value-props {
                    gap: 12px;
                    margin-bottom: 24px;
                }
                
                .hero-prop {
                    padding: 8px 14px;
                    font-size: 0.8rem;
                }
                
                .hero-prop span.text-sm {
                    font-size: 0.8rem;
                }
                
                .hero-secondary-text {
                    font-size: 0.8rem;
                    margin-top: 12px;
                }
                
                .pricing-hero-section .hero-headline {
                    font-size: 2rem;
                    margin-bottom: 18px;
                }
                
                .pricing-hero-section .hero-subheadline {
                    font-size: 1.1rem;
                    margin-bottom: 28px;
                    max-width: 100%;
                }
                
                .hero-cta-container {
                    gap: 12px;
                }
                
                .hero-primary-cta {
                    padding: 14px 28px;
                    font-size: 1rem;
                    width: 100%;
                    max-width: 300px;
                    justify-content: center;
                    border-radius: 12px;
                    min-width: auto;
                }
                
                .hero-secondary-cta {
                    font-size: 0.9rem;
                    padding: 12px 20px;
                    width: 100%;
                    max-width: 300px;
                    justify-content: center;
                    border-radius: 12px;
                    min-width: auto;
                }
                
                .secondary-cta-content {
                    gap: 6px;
                }
                
                .secondary-cta-content .material-icons:first-child {
                    font-size: 16px;
                }
                
                .secondary-cta-content .material-icons:last-child {
                    font-size: 14px;
                }
            }
            
            /* Tablet styling for hero */
            @media (min-width: 768px) and (max-width: 1145px) {
                .pricing-hero-section {
                    padding: 50px 24px 45px 24px;
                    margin-bottom: 35px;
                }
                
                .pricing-hero-section .hero-headline {
                    font-size: 2.5rem;
                    margin-bottom: 20px;
                }
                
                .pricing-hero-section .hero-subheadline {
                    font-size: 1.2rem;
                    margin-bottom: 32px;
                }
                
                .hero-cta-container {
                    gap: 14px;
                }
                
                .hero-primary-cta {
                    padding: 15px 30px;
                    font-size: 1.05rem;
                }
                
                .hero-secondary-cta {
                    font-size: 0.925rem;
                    padding: 9px 15px;
                }
            }
            
            /* Modal Overlay */
            .calculator-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.75);
                backdrop-filter: blur(8px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                padding: 20px;
                box-sizing: border-box;
            }
            
            .calculator-modal-overlay.active {
                opacity: 1;
                visibility: visible;
            }
            
            .calculator-modal-overlay.active .calculator-modal {
                transform: translateY(0) scale(1);
                opacity: 1;
                border-radius: 1rem;
            }
            
            /* Modal Container */
            .calculator-modal {
                background: var(--bg-paper, #1a1a1a);
                border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
                border-radius: 16px;
                max-width: 920px;
                width: 100%;
                max-height: 92vh;
                overflow-y: auto;
                box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
                transform: translateY(20px) scale(0.96);
                opacity: 0;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
            }
            
            /* Modal Header */
            .calculator-modal-header {
                background: var(--bg-paper, #1a1a1a);
                padding: 32px 36px;
                border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.1));
                display: flex;
                align-items: center;
                justify-content: space-between;
                position: relative;
                border-radius: 16px 16px 0 0;
            }
            
            .modal-title-section {
                display: flex;
                align-items: center;
                gap: 16px;
                position: relative;
                z-index: 1;
            }
            
            .modal-title-icon {
                width: 48px;
                height: 48px;
                background: var(--bg-primary, #007bff);
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 12px rgba(0, 123, 255, 0.2);
            }
            
            .modal-title-icon .material-icons {
                font-size: 24px;
                color: var(--text-on-primary, white);
            }
            
            .modal-title-text h2 {
                font-size: 1.75rem;
                font-weight: 700;
                margin: 0 0 4px 0;
                color: var(--text-main, white);
            }
            
            .modal-title-text p {
                font-size: 0.95rem;
                color: var(--text-muted, rgba(255, 255, 255, 0.7));
                margin: 0;
                line-height: 1.4;
            }
            
            .modal-close-button {
                width: 40px;
                height: 40px;
                background: var(--bg-paper, #1a1a1a);
                border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s ease;
                position: relative;
                z-index: 1;
            }
            
            .modal-close-button:hover {
                background: var(--bg-hover, rgba(255, 255, 255, 0.1));
                border-color: var(--border, rgba(255, 255, 255, 0.2));
                transform: scale(1.05);
            }
            
            .modal-close-button .material-icons {
                font-size: 20px;
                color: var(--text-muted, rgba(255, 255, 255, 0.8));
            }
            
            /* Modal Body */
            .calculator-modal-body {
                padding: 44px 36px 48px 36px;
            }
            
            /* Calculator Trigger Button */
            .calculator-trigger-button {
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%);
                border: 1px solid rgba(255, 255, 255, 0.15);
                border-radius: 18px;
                padding: 24px 28px;
                margin: 40px 0;
                cursor: pointer;
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                text-align: center;
                position: relative;
                overflow: hidden;
                backdrop-filter: blur(8px);
                box-shadow: 0 3px 12px rgba(0, 0, 0, 0.3);
            }
            
            .calculator-trigger-button::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: radial-gradient(ellipse at center, rgba(255, 255, 255, 0.08) 0%, transparent 70%);
                opacity: 0;
                transition: all 0.4s ease;
                transform: scale(0.8);
            }
            
            .calculator-trigger-button:hover {
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.08) 100%);
                border-color: rgba(255, 255, 255, 0.25);
                transform: translateY(-3px);
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
            }
            
            .calculator-trigger-button:hover::before {
                opacity: 1;
                transform: scale(1);
            }
            
            .calculator-trigger-button:active {
                transform: translateY(-1px);
                transition: all 0.1s ease;
            }
            
            .trigger-button-content {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 16px;
                position: relative;
                z-index: 1;
            }
            
            .trigger-button-icon {
                width: 44px;
                height: 44px;
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.1) 100%);
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 3px 8px rgba(0, 0, 0, 0.3);
                flex-shrink: 0;
            }
            
            .trigger-button-icon .material-icons {
                font-size: 22px;
                color: white;
                animation: subtle-pulse 2s ease-in-out infinite;
            }
            
            .trigger-button-text {
                text-align: left;
            }
            
            .trigger-button-text h3 {
                font-size: 1.3rem;
                font-weight: 700;
                margin: 0 0 6px 0;
                color: rgba(255, 255, 255, 0.95);
                background: linear-gradient(135deg, #fff 0%, rgba(255, 255, 255, 0.9) 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            
            .trigger-button-text p {
                font-size: 0.95rem;
                color: rgba(255, 255, 255, 0.75);
                margin: 0;
                line-height: 1.4;
                font-weight: 400;
            }
            
            /* VST Plugin Card Layout */
            .calculator-main {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            
            .calculator-controls {
                display: grid;
                grid-template-columns: 1fr;
                gap: 20px;
            }
            
            .control-card {
                background: linear-gradient(145deg, rgba(25, 25, 25, 0.95) 0%, rgba(20, 20, 20, 0.98) 100%);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 10px;
                padding: 24px;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 
                    0 4px 12px rgba(0, 0, 0, 0.3),
                    inset 0 1px 0 rgba(255, 255, 255, 0.05);
                position: relative;
                overflow: hidden;
            }
            
            .control-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 1px;
                background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%);
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            
            .control-card:hover {
                border-color: rgba(255, 255, 255, 0.2);
                transform: translateY(-2px);
                box-shadow: 
                    0 6px 20px rgba(0, 0, 0, 0.5),
                    inset 0 1px 0 rgba(255, 255, 255, 0.1),
                    0 0 0 1px rgba(255, 255, 255, 0.1);
                background: linear-gradient(145deg, rgba(30, 30, 30, 0.98) 0%, rgba(25, 25, 25, 1) 100%);
            }
            
            .control-card:hover::before {
                opacity: 1;
            }
            
            .control-label {
                font-weight: 600;
                font-size: 0.95rem;
                color: var(--text-main, white);
                margin-bottom: 16px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .control-label .material-icons {
                font-size: 18px;
                color: rgba(255, 255, 255, 0.8);
            }
            
            /* VST Plugin Plan Selection */
            .plan-selector {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 16px;
                padding: 8px;
                background: linear-gradient(145deg, rgba(15, 15, 15, 0.9) 0%, rgba(25, 25, 25, 0.8) 100%);
                border-radius: 12px;
                border: 1px solid rgba(255, 255, 255, 0.05);
                box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
            }
            
            .plan-card {
                background: linear-gradient(145deg, rgba(40, 40, 40, 0.8) 0%, rgba(30, 30, 30, 0.9) 100%);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 10px;
                padding: 20px 16px;
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                text-align: center;
                position: relative;
                min-height: 80px;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05);
                overflow: hidden;
            }
            
            .plan-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, transparent 50%);
                opacity: 0;
                transition: opacity 0.3s ease;
                border-radius: 10px;
            }
            
            .plan-card.active {
                background: linear-gradient(145deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.08) 100%);
                border-color: rgba(255, 255, 255, 0.4);
                transform: scale(1.05);
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2);
                z-index: 2;
            }
            
            .plan-card.active::before {
                opacity: 1;
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, transparent 50%);
            }
            
            .plan-card.active .plan-name {
                color: white;
                font-weight: 700;
            }
            
            .plan-card.active .plan-price {
                color: rgba(255, 255, 255, 0.95);
            }
            
            .plan-card:hover:not(.active) {
                background: linear-gradient(145deg, rgba(50, 50, 50, 0.9) 0%, rgba(35, 35, 35, 1) 100%);
                border-color: rgba(255, 255, 255, 0.3);
                transform: translateY(-2px) scale(1.02);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1);
            }
            
            .plan-card:hover:not(.active)::before {
                opacity: 1;
            }
            
            .plan-card:active {
                transform: scale(0.98);
                transition: transform 0.1s ease;
            }
            
            .plan-name {
                font-weight: 700;
                font-size: 0.95rem;
                margin-bottom: 4px;
                position: relative;
                z-index: 1;
                color: var(--text-main, white);
                line-height: 1.2;
                letter-spacing: 0.3px;
                text-transform: uppercase;
            }
            
            .plan-price {
                font-size: 0.8rem;
                color: var(--text-muted, rgba(255, 255, 255, 0.8));
                position: relative;
                z-index: 1;
                font-weight: 600;
                line-height: 1.1;
                letter-spacing: 0.2px;
            }
            
            /* Modern Slider Redesign */
            .slider-control {
                position: relative;
                margin: 20px 0;
                padding: 0 20px;
            }
            
            .slider-value-display {
                background: linear-gradient(145deg, rgba(15, 15, 15, 0.95) 0%, rgba(25, 25, 25, 0.9) 100%);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 8px;
                padding: 16px 20px;
                text-align: center;
                font-weight: 700;
                font-size: 1.1rem;
                color: rgba(255, 255, 255, 0.9);
                margin-bottom: 24px;
                box-shadow: 
                    0 2px 8px rgba(0, 0, 0, 0.3),
                    inset 0 1px 0 rgba(255, 255, 255, 0.1),
                    inset 0 -1px 0 rgba(0, 0, 0, 0.2);
                backdrop-filter: blur(12px);
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
                font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                letter-spacing: 0.3px;
            }
            
            .slider-value-display::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 1px;
                background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%);
            }
            
            .slider-value-display:hover {
                border-color: rgba(255, 255, 255, 0.3);
                box-shadow: 
                    0 4px 16px rgba(0, 0, 0, 0.4),
                    inset 0 1px 0 rgba(255, 255, 255, 0.15),
                    inset 0 -1px 0 rgba(0, 0, 0, 0.3);
                color: rgba(255, 255, 255, 1);
                transform: translateY(-1px);
            }
            
            .slider-track {
                position: relative;
                height: 6px;
                background: linear-gradient(90deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%);
                border-radius: 3px;
                margin: 24px 0;
                overflow: visible;
                box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
                border: 1px solid rgba(255, 255, 255, 0.05);
            }
            
            .slider-track::before {
                content: '';
                position: absolute;
                top: -1px;
                left: -1px;
                height: 6px;
                background: linear-gradient(90deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.6) 50%, rgba(255, 255, 255, 0.8) 100%);
                border-radius: 3px;
                transition: width 0.3s ease;
                width: var(--progress, 0%);
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
                border: 1px solid rgba(255, 255, 255, 0.3);
            }
            
            .slider-input {
                width: 100%;
                height: 6px;
                background: transparent;
                border-radius: 3px;
                appearance: none;
                outline: none;
                position: absolute;
                top: -1px;
                left: 0;
                cursor: pointer;
                z-index: 3;
                margin: 0;
            }
            
            .slider-input::-webkit-slider-thumb {
                appearance: none;
                width: 24px;
                height: 24px;
                background: linear-gradient(145deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 50%, rgba(255, 255, 255, 0.8) 100%);
                border-radius: 50%;
                cursor: pointer;
                box-shadow: 
                    0 2px 8px rgba(0, 0, 0, 0.4),
                    0 0 0 2px rgba(255, 255, 255, 0.1),
                    inset 0 1px 0 rgba(255, 255, 255, 0.3),
                    inset 0 -1px 0 rgba(0, 0, 0, 0.2);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                border: 2px solid rgba(255, 255, 255, 0.8);
                position: relative;
                z-index: 4;
                margin-top: -9px;
            }
            
            .slider-input::-webkit-slider-thumb:hover {
                transform: scale(1.1);
                box-shadow: 
                    0 3px 12px rgba(0, 0, 0, 0.5),
                    0 0 0 3px rgba(255, 255, 255, 0.2),
                    inset 0 1px 0 rgba(255, 255, 255, 0.4),
                    inset 0 -1px 0 rgba(0, 0, 0, 0.3);
                background: linear-gradient(145deg, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.8) 50%, rgba(255, 255, 255, 0.9) 100%);
            }
            
            .slider-input::-webkit-slider-thumb:active {
                transform: scale(1.05);
                box-shadow: 
                    0 2px 8px rgba(0, 0, 0, 0.6),
                    0 0 0 4px rgba(255, 255, 255, 0.3),
                    inset 0 1px 0 rgba(255, 255, 255, 0.2),
                    inset 0 -1px 0 rgba(0, 0, 0, 0.4);
                background: linear-gradient(145deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.6) 50%, rgba(255, 255, 255, 0.7) 100%);
            }
            
            .slider-input::-moz-range-thumb {
                width: 24px;
                height: 24px;
                background: linear-gradient(145deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 50%, rgba(255, 255, 255, 0.8) 100%);
                border-radius: 50%;
                cursor: pointer;
                border: 2px solid rgba(255, 255, 255, 0.8);
                box-shadow: 
                    0 2px 8px rgba(0, 0, 0, 0.4),
                    inset 0 1px 0 rgba(255, 255, 255, 0.3);
                transition: all 0.3s ease;
            }
            
            .slider-input::-moz-range-thumb:hover {
                transform: scale(1.1);
                box-shadow: 
                    0 3px 12px rgba(0, 0, 0, 0.5),
                    inset 0 1px 0 rgba(255, 255, 255, 0.4);
                background: linear-gradient(145deg, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.8) 50%, rgba(255, 255, 255, 0.9) 100%);
            }
            
            .slider-labels {
                display: flex;
                justify-content: space-between;
                font-size: 0.85rem;
                color: rgba(255, 255, 255, 0.7);
                margin-top: 12px;
                font-weight: 500;
            }
            
            .slider-labels span {
                background: rgba(255, 255, 255, 0.05);
                padding: 4px 8px;
                border-radius: 6px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            /* Input Fields */
            .input-field {
                background: var(--bg-paper, #1a1a1a);
                border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
                border-radius: 8px;
                padding: 16px;
                color: var(--text-main, white);
                font-size: 1rem;
                font-weight: 500;
                transition: all 0.2s ease;
                width: 100%;
                box-sizing: border-box;
            }
            
            .input-field:focus {
                outline: none;
                border-color: var(--primary, #007bff);
                box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
            }
            
            .input-hint {
                font-size: 0.8rem;
                color: rgba(255, 255, 255, 0.6);
                margin-top: 8px;
                line-height: 1.4;
            }
            
            /* Results Section */
            .calculator-results {
                background: var(--bg-paper, #1a1a1a);
                border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
                border-radius: 12px;
                padding: 28px;
                margin-bottom: 32px;
                position: sticky;
                top: 20px;
                z-index: 10;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
                transition: all 0.3s ease;
            }
            
            /* Compact sticky state - VST Plugin Inspired */
            .calculator-results.sticky-active {
                padding: 16px 20px;
                margin-bottom: 20px;
                border-radius: 6px;
                box-shadow: 0 3px 16px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(16px);
                background: linear-gradient(145deg, rgba(20, 20, 20, 0.98) 0%, rgba(26, 26, 26, 0.95) 100%);
                border: 1px solid rgba(255, 255, 255, 0.2);
                position: relative;
            }
            
            .calculator-results.sticky-active::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 2px;
                background: linear-gradient(90deg, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.8) 50%, rgba(255, 255, 255, 0.6) 100%);
                border-radius: 6px 6px 0 0;
            }
            
            .calculator-results.sticky-active .results-header {
                margin-bottom: 12px;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            
            .calculator-results.sticky-active .results-header h4 {
                font-size: 1rem;
                font-weight: 600;
                margin: 0;
            }
            
            .calculator-results.sticky-active .results-header .material-icons {
                font-size: 16px;
                opacity: 0.8;
            }
            
            .calculator-results.sticky-active .breakeven-message {
                font-size: 0.85rem;
                margin-bottom: 8px;
                opacity: 0.9;
                line-height: 1.3;
            }
            
            .calculator-results.sticky-active .savings-display {
                margin-bottom: 8px;
                align-items: center;
            }
            
            .calculator-results.sticky-active .savings-amount {
                font-size: 1.75rem;
                font-weight: 800;
                line-height: 1;
            }
            
            .calculator-results.sticky-active .savings-label {
                font-size: 0.8rem;
                margin-left: 6px;
            }
            
            .calculator-results.sticky-active .savings-details {
                font-size: 0.8rem;
                line-height: 1.3;
            }
            
            .calculator-results.sticky-active .comparison-line {
                margin: 4px 0;
                padding: 4px 0;
            }
            
            /* Subscription CTA Button */
            .subscription-cta {
                margin-top: 24px;
                padding-top: 20px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .subscribe-button {
                width: 100%;
                background: linear-gradient(145deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%);
                border: 1px solid rgba(255, 255, 255, 0.15);
                border-radius: 10px;
                padding: 18px 24px;
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                display: flex;
                align-items: center;
                gap: 16px;
                box-shadow: 
                    0 4px 12px rgba(0, 0, 0, 0.3),
                    inset 0 1px 0 rgba(255, 255, 255, 0.1);
                position: relative;
                overflow: hidden;
            }
            
            .subscribe-button::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 1px;
                background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%);
            }
            
            .subscribe-button:hover {
                background: linear-gradient(145deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.08) 100%);
                border-color: rgba(255, 255, 255, 0.25);
                transform: translateY(-2px);
                box-shadow: 
                    0 8px 24px rgba(0, 0, 0, 0.4),
                    inset 0 1px 0 rgba(255, 255, 255, 0.15);
            }
            
            .subscribe-button:active {
                transform: translateY(-1px);
                transition: transform 0.1s ease;
            }
            
            .subscribe-button .material-icons {
                font-size: 24px;
                color: rgba(255, 255, 255, 0.9);
                flex-shrink: 0;
            }
            
            .subscribe-text {
                text-align: left;
                flex: 1;
            }
            
            .subscribe-title {
                font-size: 1.1rem;
                font-weight: 700;
                color: rgba(255, 255, 255, 0.95);
                margin-bottom: 4px;
                line-height: 1.2;
            }
            
            .subscribe-subtitle {
                font-size: 0.9rem;
                color: rgba(255, 255, 255, 0.7);
                font-weight: 500;
            }
            
            /* Mobile subscription button */
            @media (max-width: 767px) {
                .subscription-cta {
                    margin-top: 20px;
                    padding-top: 16px;
                }
                
                .subscribe-button {
                    padding: 16px 20px;
                    gap: 12px;
                }
                
                .subscribe-button .material-icons {
                    font-size: 20px;
                }
                
                .subscribe-title {
                    font-size: 1rem;
                }
                
                .subscribe-subtitle {
                    font-size: 0.85rem;
                }
                
                .calculator-results.sticky-active .subscription-cta {
                    margin-top: 12px;
                    padding-top: 12px;
                }
                
                .calculator-results.sticky-active .subscribe-button {
                    padding: 12px 16px;
                    gap: 10px;
                }
                
                .calculator-results.sticky-active .subscribe-title {
                    font-size: 0.9rem;
                    margin-bottom: 2px;
                }
                
                .calculator-results.sticky-active .subscribe-subtitle {
                    font-size: 0.75rem;
                }
            }
            
            .results-header {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 20px;
                position: relative;
                z-index: 1;
            }
            
            .results-header h4 {
                font-size: 1.2rem;
                font-weight: 600;
                margin: 0;
                color: #28a745;
            }
            
            .results-header .material-icons {
                font-size: 20px;
                color: #28a745;
            }
            
            .breakeven-message {
                font-size: 1.1rem;
                font-weight: 600;
                color: rgba(255, 255, 255, 0.95);
                margin-bottom: 16px;
                line-height: 1.4;
                position: relative;
                z-index: 1;
            }
            
            .savings-display {
                display: flex;
                align-items: baseline;
                gap: 8px;
                margin-bottom: 12px;
                position: relative;
                z-index: 1;
            }
            
            .savings-amount {
                font-size: 2.5rem;
                font-weight: 800;
                color: #28a745;
                text-shadow: 0 0 20px rgba(40, 167, 69, 0.3);
                line-height: 1;
            }
            
            .savings-label {
                font-size: 1rem;
                color: rgba(255, 255, 255, 0.7);
                font-weight: 500;
            }
            
            .savings-details {
                font-size: 0.9rem;
                color: rgba(255, 255, 255, 0.7);
                line-height: 1.5;
                position: relative;
                z-index: 1;
            }
            
            .comparison-line {
                margin: 8px 0;
                padding: 8px 0;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .exclusive-bonus {
                color: #28a745;
                font-weight: 500;
            }
            
            /* Mobile Modal Optimizations */
            @media (max-width: 767px) {
                .calculator-results {
                    top: 12px;
                }
                
                .calculator-modal-overlay {
                    padding: 12px;
                    align-items: flex-end;
                }
                
                .calculator-modal {
                    max-height: 96vh;
                    border-radius: 1rem 1rem 0 0;
                    margin-bottom: 0;
                    border-bottom: none;
                }
                
                .calculator-modal-header {
                    padding: 28px 24px;
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 20px;
                    border-radius: 1rem;
                }
                
                .modal-title-section {
                    gap: 12px;
                }
                
                .modal-title-icon {
                    width: 40px;
                    height: 40px;
                }
                
                .modal-title-icon .material-icons {
                    font-size: 20px;
                }
                
                .modal-title-text h2 {
                    font-size: 1.4rem;
                }
                
                .modal-title-text p {
                    font-size: 0.9rem;
                }
                
                .modal-close-button {
                    position: absolute;
                    top: 20px;
                    right: 20px;
                    width: 36px;
                    height: 36px;
                }
                
                .calculator-modal-body {
                    padding: 28px 24px 32px 24px;
                }
                
                .calculator-controls {
                    grid-template-columns: 1fr;
                    gap: 24px;
                }
                
                .control-card {
                    padding: 20px;
                }
                
                .plan-selector {
                    grid-template-columns: repeat(3, 1fr);
                    gap: 6px;
                    padding: 6px;
                }
                
                .plan-card {
                    padding: 14px 10px;
                    min-height: 65px;
                    font-size: 0.8rem;
                }
                
                .plan-card.active {
                    transform: scale(1.02);
                }
                
                .plan-card:hover:not(.active) {
                    transform: translateY(-1px) scale(1.01);
                }
                
                .plan-name {
                    font-size: 0.8rem;
                    margin-bottom: 2px;
                    letter-spacing: 0.2px;
                }
                
                .plan-price {
                    font-size: 0.7rem;
                    letter-spacing: 0.1px;
                }
                
                .plan-name {
                    font-size: 0.8rem;
                    margin-bottom: 1px;
                }
                
                .plan-price {
                    font-size: 0.7rem;
                }
                
                .slider-control {
                    padding: 0 16px;
                }
                
                .slider-value-display {
                    padding: 14px 16px;
                    font-size: 1rem;
                    margin-bottom: 20px;
                }
                
                .slider-track {
                    height: 6px;
                    margin: 16px -16px;
                    padding: 0 16px;
                }
                
                .slider-input {
                    height: 6px;
                }
                
                .slider-input::-webkit-slider-thumb {
                    width: 24px;
                    height: 24px;
                    border: 2px solid rgba(255, 255, 255, 0.9);
                }
                
                .slider-labels {
                    font-size: 0.8rem;
                    margin-top: 10px;
                    margin-left: -16px;
                    margin-right: -16px;
                    padding: 0 16px;
                }
                
                .slider-labels span {
                    padding: 3px 6px;
                    font-size: 0.75rem;
                }
                
                .calculator-results.sticky-active {
                    padding: 12px 16px;
                    margin-bottom: 16px;
                    border-radius: 4px;
                }
                
                .calculator-results.sticky-active .results-header {
                    margin-bottom: 8px;
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 4px;
                }
                
                .calculator-results.sticky-active .results-header h4 {
                    font-size: 0.9rem;
                    line-height: 1.2;
                }
                
                .calculator-results.sticky-active .results-header .material-icons {
                    display: none;
                }
                
                .calculator-results.sticky-active .breakeven-message {
                    font-size: 0.8rem;
                    margin-bottom: 6px;
                    line-height: 1.2;
                }
                
                .calculator-results.sticky-active .savings-display {
                    margin-bottom: 6px;
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 2px;
                }
                
                .calculator-results.sticky-active .savings-amount {
                    font-size: 1.6rem;
                    line-height: 1;
                }
                
                .calculator-results.sticky-active .savings-label {
                    font-size: 0.75rem;
                    margin-left: 0;
                    opacity: 0.8;
                }
                
                .calculator-results.sticky-active .savings-details {
                    font-size: 0.75rem;
                    line-height: 1.2;
                }
                
                .calculator-results.sticky-active .comparison-line {
                    margin: 2px 0;
                    padding: 2px 0;
                }
                
                .input-field {
                    padding: 14px;
                    font-size: 0.95rem;
                }
                
                .savings-amount {
                    font-size: 2rem;
                }
                
                .calculator-results {
                    padding: 20px;
                    margin-bottom: 24px;
                }
                
                .results-header h4 {
                    font-size: 1.1rem;
                }
                
                .breakeven-message {
                    font-size: 1rem;
                }
                
                .calculator-trigger-button {
                    margin: 32px 20px;
                    border-radius: 16px;
                    padding: 20px 24px;
                }
                
                .trigger-button-content {
                    flex-direction: column;
                    gap: 12px;
                }
                
                .trigger-button-icon {
                    width: 40px;
                    height: 40px;
                }
                
                .trigger-button-icon .material-icons {
                    font-size: 20px;
                }
                
                .trigger-button-text {
                    text-align: center;
                }
                
                .trigger-button-text h3 {
                    font-size: 1.2rem;
                }
                
                .trigger-button-text p {
                    font-size: 0.9rem;
                }
            }
            
            /* Tablet Modal Styling */
            @media (min-width: 768px) and (max-width: 1145px) {
                .calculator-modal {
                    max-width: 700px;
                }
                
                .calculator-modal-body {
                    padding: 36px 28px;
                }
                
                .calculator-controls {
                    grid-template-columns: repeat(2, 1fr);
                    gap: 24px;
                }
                
                .plan-selector {
                    grid-template-columns: repeat(3, 1fr);
                    gap: 12px;
                }
                
                .plan-card {
                    padding: 16px 14px;
                    min-height: 64px;
                }
            }
            
            /* Desktop Modal Enhancements */
            @media (min-width: 1146px) {
                .calculator-modal {
                    max-width: 900px;
                }
                
                .calculator-controls {
                    grid-template-columns: repeat(2, 1fr);
                    gap: 32px;
                }
                
                .plan-selector {
                    grid-template-columns: repeat(3, 1fr);
                }
                
                .calculator-main {
                    max-width: none;
                }
            }
            
            /* Modal Animation Keyframes */
            @keyframes modalSlideIn {
                from {
                    transform: translateY(100%);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
            
            @keyframes modalFadeIn {
                from {
                    opacity: 0;
                    transform: translateY(20px) scale(0.95);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }
            
            @keyframes subtle-pulse {
                0%, 100% {
                    transform: scale(1);
                    opacity: 1;
                }
                50% {
                    transform: scale(1.1);
                    opacity: 0.9;
                }
            }
            
            /* Modal Focus Trap */
            .calculator-modal:focus {
                outline: none;
            }
            
            /* Scrollbar Styling for Modal */
            .calculator-modal::-webkit-scrollbar {
                width: 6px;
            }
            
            .calculator-modal::-webkit-scrollbar-track {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 3px;
            }
            
            .calculator-modal::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.2);
                border-radius: 3px;
            }
            
            .calculator-modal::-webkit-scrollbar-thumb:hover {
                background: rgba(255, 255, 255, 0.3);
            }
            
            /* FAQ Section Styling */
            [data-faq-section] {
                position: relative;
                z-index: 1;
            }
            
            .faq-item {
                background: linear-gradient(145deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%);
                backdrop-filter: blur(8px);
                position: relative;
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 10px;
                overflow: hidden;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .faq-question .material-icons {
                line-height: 1;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .faq-item::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 2px;
                background: linear-gradient(90deg, transparent 0%, rgba(16, 185, 129, 0.6) 50%, transparent 100%);
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            
            .faq-item:hover {
                background: linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
                transform: translateY(-3px);
                box-shadow: 
                    0 8px 32px rgba(0, 0, 0, 0.2),
                    0 0 0 1px rgba(255, 255, 255, 0.1),
                    inset 0 1px 0 rgba(255, 255, 255, 0.08);
                border-color: rgba(255, 255, 255, 0.2);
            }
            
            .faq-item:hover::before {
                opacity: 1;
            }
            
            .faq-item-open {
                border-color: var(--primary, #007bff) !important;
                background: linear-gradient(145deg, rgba(0, 123, 255, 0.08) 0%, rgba(0, 123, 255, 0.03) 100%);
                box-shadow: 0 8px 30px rgba(0, 123, 255, 0.15);
                transform: translateY(-1px);
            }
            
            .faq-item-hidden {
                display: none;
            }
            
            .faq-question {
                width: 100%;
                text-align: left;
                background: transparent;
                border: none;
                padding: 24px;
                transition: all 0.2s ease;
                cursor: pointer;
                position: relative;
            }
            
            .faq-question:hover {
                background: rgba(255, 255, 255, 0.03);
            }
            
            .faq-question:focus {
                outline: none;
                background: rgba(255, 255, 255, 0.05);
            }
            
            .faq-question:focus-visible {
                outline: 2px solid var(--primary, #007bff);
                outline-offset: -2px;
            }
            
            .faq-question:active {
                background: rgba(255, 255, 255, 0.08);
                transform: scale(0.998);
            }
            
            .faq-question h3 {
                color: rgba(255, 255, 255, 0.95);
                font-size: 1rem;
                font-weight: 600;
                line-height: 1.5;
                margin: 0;
                transition: color 0.2s ease;
            }
            
            .faq-item-open .faq-question h3 {
                color: rgba(255, 255, 255, 1);
            }
            
            .faq-question .material-icons {
                color: rgba(255, 255, 255, 0.6);
                font-size: 20px;
                transition: all 0.2s ease;
            }
            
            .faq-item-open .faq-question .material-icons {
                color: var(--primary, #007bff);
            }
            
            .faq-answer {
                background: rgba(0, 0, 0, 0.1);
                border-top: 1px solid rgba(255, 255, 255, 0.06);
                overflow: hidden;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .faq-answer > div {
                padding: 0 24px 24px 24px;
            }
            
            .faq-answer p {
                color: rgba(255, 255, 255, 0.8);
                font-size: 0.9rem;
                line-height: 1.6;
                margin: 0;
                font-weight: 400;
            }
            
            /* Show more button styling */
            [data-show-more-btn] {
                position: relative;
                overflow: hidden;
                background: linear-gradient(145deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.02) 100%);
                border: 1px solid rgba(255, 255, 255, 0.12);
                border-radius: 12px;
                padding: 14px 24px;
                font-size: 0.9rem;
                font-weight: 500;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                backdrop-filter: blur(8px);
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                cursor: pointer;
                line-height: 1;
            }
            
            [data-show-more-btn] .material-icons {
                line-height: 1;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            [data-show-more-btn]::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.05) 50%, transparent 100%);
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            
            [data-show-more-btn]:hover {
                background: linear-gradient(145deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%);
                border-color: rgba(255, 255, 255, 0.2);
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
            }
            
            [data-show-more-btn]:hover::before {
                opacity: 1;
            }
            
            [data-show-more-btn]:active {
                transform: translateY(-1px);
                transition: transform 0.1s ease;
            }
            
            [data-show-more-btn]:focus-visible {
                outline: 2px solid var(--primary, #007bff);
                outline-offset: 2px;
            }
            
            [data-show-more-btn] .material-icons {
                color: rgba(255, 255, 255, 0.7);
                transition: all 0.2s ease;
            }
            
            [data-show-more-btn]:hover .material-icons {
                color: rgba(255, 255, 255, 0.9);
            }
            
            /* Mobile FAQ optimizations */
            @media (max-width: 767px) {
                [data-faq-section] {
                    margin-top: 60px;
                    margin-bottom: 40px;
                    padding: 0 16px;
                    margin-left: -16px;
                    margin-right: -16px;
                }
                
                [data-faq-container] {
                    max-width: none;
                    margin: 0;
                    padding: 0 16px;
                }
                
                .faq-item {
                    margin-bottom: 12px;
                    border-radius: 10px;
                    margin-left: 0;
                    margin-right: 0;
                }
                
                .faq-question {
                    padding: 18px 20px;
                }
                
                .faq-question h3 {
                    font-size: 0.9rem;
                    line-height: 1.4;
                    font-weight: 600;
                    color: rgba(255, 255, 255, 0.95);
                }
                
                .faq-question .material-icons {
                    font-size: 18px;
                    margin-top: 1px;
                }
                
                .faq-answer > div {
                    padding: 0 20px 20px 20px;
                }
                
                .faq-answer p {
                    font-size: 0.85rem;
                    line-height: 1.5;
                    color: rgba(255, 255, 255, 0.75);
                }
                
                [data-show-more-container] {
                    margin-top: 24px;
                    padding: 0 16px;
                }
                
                [data-show-more-btn] {
                    font-size: 0.85rem;
                    padding: 12px 18px;
                    gap: 8px;
                    border-radius: 8px;
                }
                
                [data-faq-section] h2 {
                    font-size: 1.6rem;
                    margin-bottom: 10px;
                    font-weight: 700;
                }
                
                [data-faq-section] .text-center.mb-48 {
                    margin-bottom: 32px;
                    padding: 0 8px;
                }
                
                [data-faq-section] .text-center.mb-48 p {
                    font-size: 0.9rem;
                    line-height: 1.5;
                    color: rgba(255, 255, 255, 0.7);
                }
            }
            
            /* Tablet FAQ styling */
            @media (min-width: 768px) and (max-width: 1145px) {
                [data-faq-section] {
                    margin-top: 70px;
                    margin-bottom: 50px;
                }
                
                .faq-question {
                    padding: 22px;
                }
                
                .faq-question h3 {
                    font-size: 0.95rem;
                    line-height: 1.5;
                }
                
                .faq-answer > div {
                    padding: 0 22px 22px 22px;
                }
                
                .faq-answer p {
                    font-size: 0.9rem;
                    line-height: 1.6;
                }
                
                .faq-item {
                    margin-bottom: 14px;
                }
            }
            
            /* Desktop FAQ styling */
            @media (min-width: 1146px) {
                [data-faq-section] {
                    margin-top: 80px;
                    margin-bottom: 60px;
                }
                
                .faq-item {
                    border-radius: 12px;
                    margin-bottom: 16px;
                }
                
                .faq-question {
                    padding: 26px;
                }
                
                .faq-question h3 {
                    font-size: 1rem;
                    line-height: 1.5;
                }
                
                .faq-answer > div {
                    padding: 0 26px 26px 26px;
                }
                
                .faq-answer p {
                    font-size: 0.9rem;
                    line-height: 1.6;
                }
            }
            
            /* Smooth animations for progressive disclosure */
            .faq-item-hidden {
                transition: opacity 0.3s ease, transform 0.3s ease;
            }
            
            /* Accessibility improvements */
            .faq-question:focus-visible {
                outline: 2px solid var(--primary, #007bff);
                outline-offset: 2px;
                border-radius: 8px;
            }
            
            [data-show-more-btn]:focus-visible {
                outline: 2px solid var(--primary, #007bff);
                outline-offset: 2px;
            }
            
            /* Prevent FOUC (Flash of Unstyled Content) */
            [data-faq-section] {
                opacity: 0;
                animation: fadeInUp 0.6s ease forwards;
                animation-delay: 0.3s;
            }
            
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            /* FAQ item staggered animation */
            .faq-item {
                animation: slideInFromLeft 0.4s ease forwards;
            }
            
            .faq-item:nth-child(1) { animation-delay: 0.1s; opacity: 0; }
            .faq-item:nth-child(2) { animation-delay: 0.2s; opacity: 0; }
            .faq-item:nth-child(3) { animation-delay: 0.3s; opacity: 0; }
            .faq-item:nth-child(4) { animation-delay: 0.4s; opacity: 0; }
            .faq-item:nth-child(5) { animation-delay: 0.5s; opacity: 0; }
            .faq-item:nth-child(6) { animation-delay: 0.6s; opacity: 0; }
            
            @keyframes slideInFromLeft {
                from {
                    opacity: 0;
                    transform: translateX(-30px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            
            /* Reduced motion for accessibility */
            @media (prefers-reduced-motion: reduce) {
                .faq-item,
                [data-faq-section],
                .faq-item-hidden {
                    animation: none !important;
                    transition: none !important;
                }
                
                .faq-item {
                    opacity: 1 !important;
                    transform: none !important;
                }
                
                [data-faq-section] {
                    opacity: 1 !important;
                    transform: none !important;
                }
            }
            
            /* Compact License Clarity Section */
            .license-clarity-section {
                margin: 32px 0;
                padding: 0;
                opacity: 0;
                animation: fadeInUp 0.6s ease forwards;
                animation-delay: 0.2s;
            }
            
            .license-clarity-container {
                background: linear-gradient(145deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 16px;
                padding: 24px 20px;
                backdrop-filter: blur(8px);
                position: relative;
                overflow: hidden;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
            }
            
            .license-clarity-container::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: radial-gradient(ellipse at top center, rgba(0, 123, 255, 0.04) 0%, transparent 70%);
                pointer-events: none;
            }
            
            /* Compact Header */
            .license-clarity-header {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
                margin-bottom: 24px;
                position: relative;
                z-index: 1;
                text-align: center;
            }
            
            .license-clarity-header-icon {
                width: 36px;
                height: 36px;
                background: linear-gradient(135deg, rgba(0, 123, 255, 0.15) 0%, rgba(0, 123, 255, 0.08) 100%);
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                box-shadow: 0 2px 8px rgba(0, 123, 255, 0.15);
            }
            
            .license-clarity-header-icon .material-icons {
                font-size: 18px;
                color: rgba(255, 255, 255, 0.9);
            }
            
            .license-clarity-header-content {
                text-align: left;
            }
            
            .license-clarity-title {
                font-size: 1.5rem;
                font-weight: 600;
                margin: 0 0 4px 0;
                color: rgba(255, 255, 255, 0.95);
                line-height: 1.2;
            }
            
            .license-clarity-subtitle {
                font-size: 0.9rem;
                color: rgba(255, 255, 255, 0.7);
                margin: 0;
                font-weight: 400;
                line-height: 1.3;
            }
            
            /* Mobile-First Tabbed Layout */
            .license-clarity-tabs {
                display: none; /* Hidden on desktop */
                margin-bottom: 20px;
            }
            
            .license-tab-nav {
                display: flex;
                background: rgba(255, 255, 255, 0.06);
                border-radius: 8px;
                padding: 4px;
                gap: 2px;
                overflow-x: auto;
                scrollbar-width: none;
                -ms-overflow-style: none;
            }
            
            .license-tab-nav::-webkit-scrollbar {
                display: none;
            }
            
            .license-tab-button {
                flex: 1;
                padding: 8px 12px;
                background: transparent;
                border: none;
                border-radius: 6px;
                color: rgba(255, 255, 255, 0.7);
                font-size: 0.8rem;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                white-space: nowrap;
                min-width: fit-content;
            }
            
            .license-tab-button.active {
                background: rgba(255, 255, 255, 0.1);
                color: rgba(255, 255, 255, 0.95);
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
            }
            
            .license-tab-content {
                display: none;
                opacity: 0;
                transform: translateY(10px);
                transition: opacity 0.2s ease, transform 0.2s ease;
            }
            
            .license-tab-content.active {
                display: block;
                opacity: 1;
                transform: translateY(0);
                animation: fadeInUp 0.3s ease;
            }
            
            .license-tab-content.hidden {
                opacity: 0;
                transform: translateY(-5px);
            }
            
            /* Desktop Content Layout */
            .license-clarity-content {
                display: block; /* Shown on desktop */
                position: relative;
                z-index: 1;
            }
            
            /* Compact License Pills */
            .license-covers-subsection {
                margin-bottom: 20px;
            }
            
            .license-subsection-title {
                font-size: 1.1rem;
                font-weight: 600;
                margin-bottom: 16px;
                color: rgba(255, 255, 255, 0.95);
                text-align: center;
                display: none; /* Hidden on mobile in tabs */
            }
            
            .license-pills-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
                position: relative;
                z-index: 1;
            }
            
            .license-pill {
                background: linear-gradient(145deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.03) 100%);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 10px;
                padding: 14px 12px;
                text-align: center;
                transition: all 0.2s ease;
                backdrop-filter: blur(4px);
                position: relative;
                overflow: hidden;
            }
            
            .license-pill::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 2px;
                background: linear-gradient(90deg, transparent 0%, rgba(0, 123, 255, 0.6) 50%, transparent 100%);
                opacity: 0;
                transition: opacity 0.2s ease;
                border-radius: 10px 10px 0 0;
            }
            
            .license-pill:hover {
                background: linear-gradient(145deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%);
                border-color: rgba(255, 255, 255, 0.15);
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }
            
            .license-pill:hover::before {
                opacity: 1;
            }
            
            .license-pill-icon {
                width: 28px;
                height: 28px;
                background: linear-gradient(135deg, rgba(0, 123, 255, 0.15) 0%, rgba(0, 123, 255, 0.08) 100%);
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 8px auto;
                position: relative;
                z-index: 1;
            }
            
            .license-pill-icon .material-icons {
                font-size: 14px;
                color: rgba(255, 255, 255, 0.9);
            }
            
            .license-pill-title {
                font-size: 0.8rem;
                font-weight: 600;
                color: rgba(255, 255, 255, 0.95);
                margin-bottom: 4px;
                line-height: 1.2;
                position: relative;
                z-index: 1;
            }
            
            .license-pill-desc {
                font-size: 0.7rem;
                color: rgba(255, 255, 255, 0.7);
                line-height: 1.3;
                position: relative;
                z-index: 1;
            }
            
            /* Compact Cards Layout */
            .license-safety-usage-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
                margin-bottom: 16px;
            }
            
            /* Compact License Cards */
            .license-card-subsection {
                background: linear-gradient(145deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.02) 100%);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 10px;
                padding: 16px 14px;
                backdrop-filter: blur(4px);
                transition: all 0.2s ease;
                position: relative;
                overflow: hidden;
            }
            
            .license-card-subsection::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 2px;
                opacity: 0;
                transition: opacity 0.2s ease;
                border-radius: 10px 10px 0 0;
            }
            
            .license-card-subsection:hover {
                background: linear-gradient(145deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.03) 100%);
                border-color: rgba(255, 255, 255, 0.12);
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }
            
            .license-card-subsection:hover::before {
                opacity: 1;
            }
            
            /* Sample Safe Card */
            .sample-safe-card::before {
                background: linear-gradient(90deg, #10b981 0%, #059669 100%);
            }
            
            /* Usage Caps Card */
            .usage-caps-card::before {
                background: linear-gradient(90deg, #28a745 0%, #ffc107 100%);
            }
            
            .license-card-header {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 10px;
            }
            
            .license-card-icon {
                width: 24px;
                height: 24px;
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
            }
            
            .license-card-icon.safety-icon {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            }
            
            .license-card-icon.usage-icon {
                background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            }
            
            .license-card-icon .material-icons {
                font-size: 12px;
                color: white;
            }
            
            .license-card-title {
                font-size: 0.85rem;
                font-weight: 600;
                color: rgba(255, 255, 255, 0.95);
                margin: 0;
                line-height: 1.2;
            }
            
            .license-card-content {
                position: relative;
                z-index: 1;
            }
            
            .license-card-text {
                font-size: 0.75rem;
                color: rgba(255, 255, 255, 0.8);
                line-height: 1.4;
                margin-bottom: 8px;
            }
            
            .license-card-link {
                font-size: 0.7rem;
                color: rgba(255, 255, 255, 0.7);
                text-decoration: none;
                font-weight: 500;
                transition: color 0.2s ease;
                cursor: pointer;
            }
            
            .license-card-link:hover {
                color: rgba(255, 255, 255, 0.9);
                text-decoration: underline;
            }
            
            .license-card-subcaption {
                font-size: 0.65rem;
                color: rgba(255, 255, 255, 0.6);
                margin-top: 8px;
                line-height: 1.3;
                font-style: italic;
            }
            
            /* Compact Usage Meter */
            .usage-meter-track-compact {
                position: relative;
                height: 6px;
                background: linear-gradient(90deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%);
                border-radius: 3px;
                margin: 16px 0 12px 0;
                overflow: visible;
                border: 1px solid rgba(255, 255, 255, 0.05);
            }
            
            .usage-meter-progress-compact {
                position: absolute;
                top: -1px;
                left: -1px;
                height: 6px;
                background: linear-gradient(90deg, #28a745 0%, #20c997 50%, #ffc107 100%);
                border-radius: 3px;
                width: 100%;
                border: 1px solid rgba(255, 255, 255, 0.15);
                box-shadow: 0 1px 4px rgba(40, 167, 69, 0.3);
            }
            
            .usage-ticks-compact {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
                justify-content: flex-start;
            }
            
            .usage-tick-compact {
                display: flex;
                align-items: center;
                gap: 6px;
                flex: 1;
                min-width: fit-content;
            }
            
            .usage-tick-dot-compact {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                border: 1px solid rgba(255, 255, 255, 0.6);
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
                flex-shrink: 0;
            }
            
            .usage-tick-label-compact {
                font-size: 0.75rem;
                font-weight: 500;
                color: rgba(255, 255, 255, 0.8);
                line-height: 1.2;
                white-space: nowrap;
            }
            
            /* Compact Comparison Widget */
            .license-comparison-subsection {
                text-align: center;
            }
            
            .license-toggle-container {
                display: flex;
                justify-content: center;
                margin-bottom: 16px;
            }
            
            .license-toggle {
                background: rgba(255, 255, 255, 0.06);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                padding: 3px;
                display: flex;
                align-items: center;
                gap: 2px;
                position: relative;
                backdrop-filter: blur(4px);
            }
            
            .license-toggle-option {
                padding: 8px 16px;
                border-radius: 6px;
                font-size: 0.8rem;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                position: relative;
                z-index: 2;
                color: rgba(255, 255, 255, 0.7);
                white-space: nowrap;
            }
            
            .license-toggle-option.active {
                background: rgba(255, 255, 255, 0.12);
                color: rgba(255, 255, 255, 0.95);
                box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
            }
            
            .license-comparison-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
            }
            
            .license-comparison-column {
                background: linear-gradient(145deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%);
                border: 1px solid rgba(255, 255, 255, 0.06);
                border-radius: 8px;
                padding: 14px 12px;
                transition: all 0.2s ease;
            }
            
            .license-comparison-column.highlight {
                border-color: rgba(0, 123, 255, 0.2);
                background: linear-gradient(145deg, rgba(0, 123, 255, 0.06) 0%, rgba(0, 123, 255, 0.02) 100%);
                box-shadow: 0 2px 8px rgba(0, 123, 255, 0.1);
            }
            
            .license-comparison-item {
                display: flex;
                align-items: flex-start;
                gap: 8px;
                margin-bottom: 10px;
                padding: 6px;
                border-radius: 6px;
                transition: all 0.2s ease;
            }
            
            .license-comparison-item:hover {
                background: rgba(255, 255, 255, 0.02);
            }
            
            .license-comparison-item:last-child {
                margin-bottom: 0;
            }
            
            .license-comparison-icon {
                width: 16px;
                height: 16px;
                border-radius: 3px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                margin-top: 1px;
            }
            
            .license-comparison-icon.success {
                background: rgba(40, 167, 69, 0.15);
            }
            
            .license-comparison-icon.warning {
                background: rgba(255, 193, 7, 0.15);
            }
            
            .license-comparison-icon.info {
                background: rgba(0, 123, 255, 0.15);
            }
            
            .license-comparison-icon .material-icons {
                font-size: 10px;
                color: rgba(255, 255, 255, 0.8);
            }
            
            .license-comparison-text {
                flex: 1;
                min-width: 0;
            }
            
            .license-comparison-label {
                font-size: 0.75rem;
                font-weight: 600;
                color: rgba(255, 255, 255, 0.9);
                margin-bottom: 2px;
                line-height: 1.2;
            }
            
            .license-comparison-value {
                font-size: 0.7rem;
                color: rgba(255, 255, 255, 0.7);
                line-height: 1.2;
            }
            
            /* Mobile-First: Tabbed Interface */
            @media (max-width: 767px) {
                .license-clarity-section {
                    margin: 20px -16px;
                }
            
                .license-clarity-container {
                    border-radius: 0;
                    border-left: none;
                    border-right: none;
                    padding: 20px 16px;
                }
            
                .license-clarity-header {
                    gap: 8px;
                    margin-bottom: 16px;
                }
            
                .license-clarity-header-icon {
                    width: 28px;
                    height: 28px;
                }
            
                .license-clarity-header-icon .material-icons {
                    font-size: 14px;
                }
            
                .license-clarity-title {
                    font-size: 1.2rem;
                    margin-bottom: 2px;
                }
            
                .license-clarity-subtitle {
                    font-size: 0.8rem;
                    line-height: 1.3;
                }
            
                /* Enable Tabbed Layout on Mobile */
                .license-clarity-tabs {
                    display: block !important;
                }
            
                .license-clarity-content {
                    display: none !important;
                }
            
                .license-tab-nav {
                    padding: 3px;
                    gap: 1px;
                }
            
                .license-tab-button {
                    padding: 6px 10px;
                    font-size: 0.7rem;
                    font-weight: 500;
                }
            
                /* Tab Content Styles */
                .license-tab-content {
                    min-height: 200px;
                }
            
                .license-pills-grid {
                    gap: 8px;
                    margin-bottom: 0;
                }
            
                .license-pill {
                    padding: 12px 10px;
                }
            
                .license-pill-icon {
                    width: 24px;
                    height: 24px;
                    margin-bottom: 6px;
                }
            
                .license-pill-icon .material-icons {
                    font-size: 12px;
                }
            
                .license-pill-title {
                    font-size: 0.75rem;
                    margin-bottom: 3px;
                }
            
                .license-pill-desc {
                    font-size: 0.65rem;
                    line-height: 1.2;
                }
            
                .license-safety-usage-grid {
                    grid-template-columns: 1fr;
                    gap: 10px;
                    margin-bottom: 0;
                }
            
                .license-card-subsection {
                    padding: 12px;
                }
            
                .license-card-header {
                    gap: 6px;
                    margin-bottom: 8px;
                }
            
                .license-card-icon {
                    width: 20px;
                    height: 20px;
                }
            
                .license-card-icon .material-icons {
                    font-size: 10px;
                }
            
                .license-card-title {
                    font-size: 0.8rem;
                }
            
                .license-card-text {
                    font-size: 0.7rem;
                    margin-bottom: 6px;
                    line-height: 1.3;
                }
            
                .license-card-link {
                    font-size: 0.65rem;
                }
            
                .license-card-subcaption {
                    font-size: 0.6rem;
                    margin-top: 6px;
                }
            
                .usage-ticks-compact {
                    gap: 4px;
                    justify-content: space-between;
                }
            
                .usage-tick-compact {
                    gap: 4px;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    min-width: 0;
                }
            
                .usage-tick-dot-compact {
                    width: 6px;
                    height: 6px;
                }
            
                .usage-tick-label-compact {
                    font-size: 0.6rem;
                    line-height: 1.1;
                }
            
                .license-comparison-grid {
                    grid-template-columns: 1fr;
                    gap: 8px;
                }
            
                .license-toggle-container {
                    margin-bottom: 12px;
                }
            
                .license-toggle {
                    padding: 2px;
                }
            
                .license-toggle-option {
                    padding: 6px 12px;
                    font-size: 0.7rem;
                }
            
                .license-comparison-column {
                    padding: 10px;
                }
            
                .license-comparison-item {
                    margin-bottom: 8px;
                    padding: 4px;
                    gap: 6px;
                }
            
                .license-comparison-icon {
                    width: 14px;
                    height: 14px;
                }
            
                .license-comparison-icon .material-icons {
                    font-size: 8px;
                }
            
                .license-comparison-label {
                    font-size: 0.7rem;
                }
            
                .license-comparison-value {
                    font-size: 0.65rem;
                }
            }
            
            /* Large Mobile / Small Tablet */
            @media (min-width: 480px) and (max-width: 767px) {
                .license-clarity-section {
                    margin: 24px -16px;
                }
            
                .license-clarity-container {
                    padding: 20px 18px;
                    border-radius: 0;
                    border-left: none;
                    border-right: none;
                }
            
                .license-clarity-header {
                    gap: 10px;
                    margin-bottom: 18px;
                }
            
                .license-clarity-title {
                    font-size: 1.3rem;
                }
            
                .license-clarity-subtitle {
                    font-size: 0.85rem;
                }
            
                .license-clarity-tabs {
                    display: block !important;
                }
            
                .license-clarity-content {
                    display: none !important;
                }
            
                .license-tab-button {
                    padding: 8px 14px;
                    font-size: 0.75rem;
                }
            
                .license-tab-content {
                    min-height: 220px;
                }
            
                .license-pills-grid {
                    gap: 10px;
                }
            
                .license-pill {
                    padding: 14px 12px;
                }
            
                .license-pill-icon {
                    width: 26px;
                    height: 26px;
                    margin-bottom: 8px;
                }
            
                .license-pill-icon .material-icons {
                    font-size: 13px;
                }
            
                .license-pill-title {
                    font-size: 0.8rem;
                    margin-bottom: 4px;
                }
            
                .license-pill-desc {
                    font-size: 0.7rem;
                    line-height: 1.25;
                }
            
                .license-safety-usage-grid {
                    gap: 12px;
                }
            
                .license-card-subsection {
                    padding: 14px;
                }
            
                .license-card-title {
                    font-size: 0.85rem;
                }
            
                .license-card-text {
                    font-size: 0.75rem;
                    line-height: 1.35;
                }
            
                .license-comparison-toggle {
                    margin-bottom: 14px;
                }
            
                .license-toggle-option {
                    padding: 8px 14px;
                    font-size: 0.75rem;
                }
            
                .license-comparison-grid {
                    gap: 10px;
                }
            
                .license-comparison-column {
                    padding: 12px;
                }
            
                .license-comparison-label {
                    font-size: 0.75rem;
                }
            
                .license-comparison-value {
                    font-size: 0.7rem;
                }
            }
            
            /* Tablet optimizations */
            @media (min-width: 768px) and (max-width: 1145px) {
                .license-clarity-section {
                    margin: 28px 0;
                }
            
                .license-clarity-container {
                    padding: 28px 24px;
                    border-radius: 14px;
                }
            
                .license-clarity-header {
                    margin-bottom: 20px;
                }
            
                .license-clarity-title {
                    font-size: 1.3rem;
                }
            
                .license-clarity-subtitle {
                    font-size: 0.85rem;
                }
            
                .license-clarity-tabs {
                    display: none;
                }
            
                .license-clarity-content {
                    display: block;
                    gap: 20px;
                }
            
                .license-covers-subsection {
                    margin-bottom: 18px;
                }
            
                .license-pills-grid {
                    grid-template-columns: repeat(4, 1fr);
                    gap: 10px;
                }
            
                .license-pill {
                    padding: 12px 10px;
                }
            
                .license-pill-icon {
                    width: 26px;
                    height: 26px;
                    margin-bottom: 6px;
                }
            
                .license-pill-icon .material-icons {
                    font-size: 13px;
                }
            
                .license-pill-title {
                    font-size: 0.75rem;
                }
            
                .license-pill-desc {
                    font-size: 0.65rem;
                }
            
                .license-safety-usage-grid {
                    gap: 14px;
                    margin-bottom: 18px;
                }
            
                .license-card-subsection {
                    padding: 14px;
                }
            
                .license-card-title {
                    font-size: 0.8rem;
                }
            
                .license-card-text {
                    font-size: 0.7rem;
                }
            
                .license-comparison-grid {
                    gap: 14px;
                }
            
                .license-comparison-column {
                    padding: 12px;
                }
            
                .license-comparison-label {
                    font-size: 0.7rem;
                }
            
                .license-comparison-value {
                    font-size: 0.65rem;
                }
            }
            
            /* Desktop enhancements */
            @media (min-width: 1146px) {
                .license-clarity-section {
                    margin: 40px 0;
                }
            
                .license-clarity-container {
                    padding: 32px 28px;
                    max-width: 1100px;
                    margin: 0 auto;
                    border-radius: 18px;
                }
            
                .license-clarity-header {
                    margin-bottom: 28px;
                }
            
                .license-clarity-header-icon {
                    width: 40px;
                    height: 40px;
                }
            
                .license-clarity-header-icon .material-icons {
                    font-size: 20px;
                }
            
                .license-clarity-title {
                    font-size: 1.6rem;
                }
            
                .license-clarity-subtitle {
                    font-size: 0.95rem;
                }
            
                .license-clarity-tabs {
                    display: none;
                }
            
                .license-clarity-content {
                    display: block;
                    gap: 24px;
                }
            
                .license-covers-subsection {
                    margin-bottom: 22px;
                }
            
                .license-pills-grid {
                    grid-template-columns: repeat(4, 1fr);
                    gap: 14px;
                    max-width: 900px;
                    margin: 0 auto;
                }
            
                .license-safety-usage-grid {
                    gap: 18px;
                    max-width: 800px;
                    margin: 0 auto 22px auto;
                }
            
                .license-comparison-subsection {
                    max-width: 700px;
                    margin: 0 auto;
                }
            
                .license-comparison-grid {
                    gap: 16px;
                }
            }
            
            /* Premium License Clarity Section - Mobile-First Redesign */
            .compact-license-widget {
                margin: 32px 0;
                position: relative;
                z-index: 1;
                opacity: 0;
                animation: fadeInUp 0.6s ease forwards;
                animation-delay: 0.2s;
            }
            
            .license-clarity-container {
                background: linear-gradient(145deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.02) 100%);
                border: 1px solid rgba(255, 255, 255, 0.12);
                border-radius: 20px;
                padding: 28px 24px;
                backdrop-filter: blur(16px);
                position: relative;
                overflow: hidden;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
            }
            
            .license-clarity-container::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: radial-gradient(ellipse at top center, rgba(0, 123, 255, 0.06) 0%, transparent 70%);
                pointer-events: none;
            }
            
            /* Enhanced Header with Premium Feel */
            .license-clarity-header {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 16px;
                margin-bottom: 32px;
                position: relative;
                z-index: 1;
            }
            
            .license-clarity-header-icon {
                width: 48px;
                height: 48px;
                background: linear-gradient(135deg, rgba(0, 123, 255, 0.2) 0%, rgba(0, 123, 255, 0.12) 100%);
                border-radius: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                box-shadow: 0 6px 20px rgba(0, 123, 255, 0.25);
                border: 1px solid rgba(0, 123, 255, 0.3);
            }
            
            .license-clarity-header-icon .material-icons {
                font-size: 22px;
                color: rgba(255, 255, 255, 0.98);
                font-weight: 500;
            }
            
            .license-clarity-header-content {
                text-align: left;
                flex: 1;
            }
            
            .license-clarity-title {
                font-size: 1.75rem;
                font-weight: 800;
                margin: 0 0 8px 0;
                color: rgba(255, 255, 255, 1);
                line-height: 1.2;
                letter-spacing: -0.02em;
                background: linear-gradient(135deg, #fff 0%, rgba(255, 255, 255, 0.9) 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            
            .license-clarity-subtitle {
                font-size: 1rem;
                color: rgba(255, 255, 255, 0.8);
                margin: 0;
                font-weight: 600;
                line-height: 1.4;
            }
            
            /* Mobile-First Tabbed Interface */
            .license-clarity-tabs {
                display: block;
                margin-bottom: 28px;
                position: relative;
                z-index: 1;
            }
            
            .license-tab-nav {
                display: flex;
                background: linear-gradient(145deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.06) 100%);
                border-radius: 16px;
                padding: 8px;
                gap: 6px;
                overflow-x: auto;
                scrollbar-width: none;
                -ms-overflow-style: none;
                border: 1px solid rgba(255, 255, 255, 0.15);
                box-shadow: 
                    inset 0 1px 0 rgba(255, 255, 255, 0.15),
                    0 2px 8px rgba(0, 0, 0, 0.1);
            }
            
            .license-tab-nav::-webkit-scrollbar {
                display: none;
            }
            
            .license-tab-button {
                flex: 1;
                padding: 16px 20px;
                background: transparent;
                border: none;
                border-radius: 12px;
                color: rgba(255, 255, 255, 0.75);
                font-size: 0.9rem;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                white-space: nowrap;
                min-width: fit-content;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
                position: relative;
                overflow: hidden;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .license-tab-button::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, transparent 100%);
                opacity: 0;
                transition: opacity 0.3s ease;
                border-radius: 12px;
            }
            
            .license-tab-button:hover::before {
                opacity: 1;
            }
            
            .license-tab-button:hover {
                color: rgba(255, 255, 255, 0.9);
                transform: translateY(-1px);
            }
            
            .license-tab-button.active {
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.15) 100%);
                color: rgba(255, 255, 255, 1);
                box-shadow: 
                    0 4px 16px rgba(0, 0, 0, 0.3),
                    inset 0 1px 0 rgba(255, 255, 255, 0.3),
                    0 0 0 1px rgba(255, 255, 255, 0.2);
                border: 1px solid rgba(255, 255, 255, 0.3);
                transform: translateY(-2px);
            }
            
            .license-tab-button:active {
                transform: scale(0.98) translateY(-1px);
                transition: transform 0.1s ease;
            }
            
            /* Tab Content with Smooth Transitions */
            .license-tab-content-container {
                position: relative;
                min-height: 360px;
            }
            
            .license-tab-content {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                opacity: 0;
                transform: translateY(15px);
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                pointer-events: none;
            }
            
            .license-tab-content.active {
                position: relative;
                opacity: 1;
                transform: translateY(0);
                pointer-events: auto;
            }
            
            .license-tab-content.hidden {
                opacity: 0;
                transform: translateY(-10px);
                pointer-events: none;
            }
            
            /* Modern License Cards - Mobile */
            .license-modern-card {
                background: linear-gradient(145deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%);
                border: 1px solid rgba(255, 255, 255, 0.15);
                border-radius: 20px;
                padding: 28px;
                backdrop-filter: blur(12px);
                position: relative;
                overflow: hidden;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
            }
            
            .license-modern-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: linear-gradient(90deg, transparent 0%, currentColor 50%, transparent 100%);
                opacity: 0.8;
                border-radius: 20px 20px 0 0;
            }
            
            .license-modern-card::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: radial-gradient(ellipse at center, rgba(255, 255, 255, 0.05) 0%, transparent 70%);
                opacity: 0;
                transition: opacity 0.3s ease;
                border-radius: 20px;
                pointer-events: none;
            }
            
            .license-modern-card:hover {
                transform: translateY(-6px);
                box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
                border-color: rgba(255, 255, 255, 0.25);
            }
            
            .license-modern-card:hover::after {
                opacity: 1;
            }
            
            /* Card Header - Modern Design */
            .license-card-header-modern {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                margin-bottom: 24px;
                gap: 20px;
            }
            
            .license-header-left {
                display: flex;
                align-items: center;
                gap: 16px;
                flex: 1;
            }
            
            .license-icon-modern {
                width: 56px;
                height: 56px;
                border-radius: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
                border: 1px solid rgba(255, 255, 255, 0.15);
                position: relative;
                overflow: hidden;
            }
            
            .license-icon-modern::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, transparent 100%);
                border-radius: 16px;
            }
            
            .license-icon-modern .material-icons {
                font-size: 26px;
                font-weight: 600;
                position: relative;
                z-index: 1;
            }
            
            .license-title-container {
                flex: 1;
                min-width: 0;
            }
            
            .license-type-title {
                font-size: 1.4rem;
                font-weight: 800;
                margin: 0 0 6px 0;
                color: rgba(255, 255, 255, 1);
                line-height: 1.2;
                letter-spacing: -0.02em;
            }
            
            .license-price-info {
                font-size: 0.9rem;
                color: rgba(255, 255, 255, 0.75);
                font-weight: 700;
                margin: 0;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .license-premium-badge {
                padding: 8px 16px;
                border-radius: 999px;
                font-size: 0.7rem;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 1px;
                border: 2px solid currentColor;
                opacity: 0.95;
                flex-shrink: 0;
                box-shadow: 0 3px 8px rgba(0, 0, 0, 0.2);
                position: relative;
                overflow: hidden;
            }
            
            .license-premium-badge::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
                transition: left 0.6s ease;
            }
            
            .license-modern-card:hover .license-premium-badge::before {
                left: 100%;
            }
            
            /* License Description */
            .license-description {
                font-size: 1.05rem;
                color: rgba(255, 255, 255, 0.85);
                line-height: 1.6;
                margin: 0 0 28px 0;
                font-weight: 600;
                text-align: center;
                font-style: italic;
            }
            
            /* Key Points Grid - Mobile Optimized */
            .license-key-points-grid {
                display: grid;
                grid-template-columns: 1fr;
                gap: 16px;
            }
            
            .license-key-point {
                display: flex;
                align-items: flex-start;
                gap: 14px;
                padding: 16px;
                background: linear-gradient(145deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.02) 100%);
                border-radius: 14px;
                border: 1px solid rgba(255, 255, 255, 0.08);
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
            }
            
            .license-key-point::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 2px;
                background: linear-gradient(90deg, transparent 0%, currentColor 50%, transparent 100%);
                opacity: 0;
                transition: opacity 0.3s ease;
                border-radius: 14px 14px 0 0;
            }
            
            .license-key-point:hover {
                background: linear-gradient(145deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%);
                border-color: rgba(255, 255, 255, 0.15);
                transform: translateY(-2px);
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
            }
            
            .license-key-point:hover::before {
                opacity: 0.6;
            }
            
            .license-point-icon {
                width: 40px;
                height: 40px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                border: 1px solid rgba(255, 255, 255, 0.15);
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            }
            
            .license-point-icon .material-icons {
                font-size: 18px;
                font-weight: 600;
            }
            
            .license-point-content {
                flex: 1;
                min-width: 0;
            }
            
            .license-point-title {
                font-size: 1rem;
                font-weight: 800;
                color: rgba(255, 255, 255, 0.98);
                margin: 0 0 4px 0;
                line-height: 1.3;
                letter-spacing: -0.01em;
            }
            
            .license-point-desc {
                font-size: 0.85rem;
                color: rgba(255, 255, 255, 0.75);
                line-height: 1.5;
                margin: 0;
                font-weight: 600;
            }
            
            /* Desktop Comparison Layout - Hidden by default */
            .license-desktop-comparison {
                display: none !important;
                position: relative;
                z-index: 1;
            }
            
            .license-comparison-desktop-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 28px;
            }
            
            .license-desktop-card {
                background: linear-gradient(145deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.03) 100%);
                border: 1px solid rgba(255, 255, 255, 0.12);
                border-radius: 20px;
                padding: 32px;
                backdrop-filter: blur(16px);
                position: relative;
                overflow: hidden;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
            }
            
            .license-desktop-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: linear-gradient(90deg, transparent 0%, currentColor 50%, transparent 100%);
                opacity: 0.8;
                border-radius: 20px 20px 0 0;
            }
            
            .license-desktop-card:hover {
                transform: translateY(-6px);
                box-shadow: 0 16px 48px rgba(0, 0, 0, 0.18);
                border-color: rgba(255, 255, 255, 0.25);
            }
            
            .license-desktop-header {
                margin-bottom: 28px;
            }
            
            .license-desktop-icon {
                width: 60px;
                height: 60px;
                border-radius: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 20px;
                box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
                border: 1px solid rgba(255, 255, 255, 0.15);
                position: relative;
                overflow: hidden;
            }
            
            .license-desktop-icon::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, transparent 100%);
                border-radius: 16px;
            }
            
            .license-desktop-icon .material-icons {
                font-size: 28px;
                font-weight: 600;
                position: relative;
                z-index: 1;
            }
            
            .license-desktop-title-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 12px;
                gap: 16px;
            }
            
            .license-desktop-title {
                font-size: 1.6rem;
                font-weight: 800;
                color: rgba(255, 255, 255, 1);
                margin: 0;
                line-height: 1.2;
                letter-spacing: -0.02em;
            }
            
            .license-desktop-badge {
                padding: 8px 16px;
                border-radius: 999px;
                font-size: 0.7rem;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 1px;
                border: 2px solid currentColor;
                opacity: 0.95;
                flex-shrink: 0;
                box-shadow: 0 3px 8px rgba(0, 0, 0, 0.2);
            }
            
            .license-desktop-price {
                font-size: 1rem;
                color: rgba(255, 255, 255, 0.75);
                font-weight: 700;
                margin-bottom: 16px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .license-desktop-description {
                font-size: 1.1rem;
                color: rgba(255, 255, 255, 0.85);
                line-height: 1.6;
                margin: 0;
                font-weight: 600;
                font-style: italic;
            }
            
            .license-desktop-features {
                display: grid;
                gap: 18px;
            }
            
            .license-desktop-feature {
                display: flex;
                align-items: flex-start;
                gap: 14px;
                padding: 18px;
                background: linear-gradient(145deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.02) 100%);
                border-radius: 14px;
                border: 1px solid rgba(255, 255, 255, 0.08);
                transition: all 0.3s ease;
            }
            
            .license-desktop-feature:hover {
                background: linear-gradient(145deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%);
                border-color: rgba(255, 255, 255, 0.15);
                transform: translateY(-1px);
            }
            
            .license-desktop-feature-icon {
                font-size: 20px !important;
                margin-top: 2px;
                flex-shrink: 0;
                font-weight: 600 !important;
            }
            
            .license-desktop-feature-content {
                flex: 1;
                min-width: 0;
            }
            
            .license-desktop-feature-title {
                font-size: 1.05rem;
                font-weight: 800;
                color: rgba(255, 255, 255, 0.98);
                margin: 0 0 6px 0;
                line-height: 1.3;
                letter-spacing: -0.01em;
            }
            
            .license-desktop-feature-desc {
                font-size: 0.9rem;
                color: rgba(255, 255, 255, 0.75);
                line-height: 1.5;
                margin: 0;
                font-weight: 600;
            }
            
                         /* Responsive Breakpoints */
             @media (max-width: 767px) {
                 .compact-license-widget {
                     margin: 24px -16px;
                 }
                 
                 .license-clarity-container {
                     border-radius: 0;
                     border-left: none;
                     border-right: none;
                     padding: 24px 20px;
                 }
                 
                 /* Ensure desktop comparison is hidden on mobile */
                 .license-desktop-comparison {
                     display: none !important;
                 }
                 
                 /* Ensure tabbed interface is shown on mobile */
                 .license-clarity-tabs {
                     display: block !important;
                 }
                 
                 .license-tab-content-container {
                     display: block !important;
                 }
                
                .license-clarity-header {
                    gap: 12px;
                    margin-bottom: 24px;
                    flex-direction: column;
                    text-align: center;
                }
                
                .license-clarity-header-icon {
                    width: 44px;
                    height: 44px;
                    border-radius: 12px;
                }
                
                .license-clarity-header-icon .material-icons {
                    font-size: 20px;
                }
                
                .license-clarity-header-content {
                    text-align: center;
                }
                
                .license-clarity-title {
                    font-size: 1.5rem;
                    margin-bottom: 6px;
                }
                
                .license-clarity-subtitle {
                    font-size: 0.9rem;
                }
                
                .license-tab-nav {
                    padding: 6px;
                    gap: 4px;
                    border-radius: 12px;
                }
                
                .license-tab-button {
                    padding: 12px 16px;
                    font-size: 0.8rem;
                    font-weight: 700;
                    border-radius: 8px;
                }
                
                .license-tab-content-container {
                    min-height: 320px;
                }
                
                .license-modern-card {
                    padding: 24px 20px;
                    border-radius: 16px;
                }
                
                .license-card-header-modern {
                    margin-bottom: 20px;
                    gap: 16px;
                }
                
                .license-icon-modern {
                    width: 48px;
                    height: 48px;
                    border-radius: 12px;
                }
                
                .license-icon-modern .material-icons {
                    font-size: 22px;
                }
                
                .license-type-title {
                    font-size: 1.2rem;
                    margin-bottom: 4px;
                }
                
                .license-price-info {
                    font-size: 0.8rem;
                }
                
                .license-premium-badge {
                    padding: 6px 12px;
                    font-size: 0.65rem;
                }
                
                .license-description {
                    font-size: 0.95rem;
                    margin-bottom: 24px;
                }
                
                .license-key-points-grid {
                    gap: 14px;
                }
                
                .license-key-point {
                    padding: 14px;
                    border-radius: 12px;
                }
                
                .license-point-icon {
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                }
                
                .license-point-icon .material-icons {
                    font-size: 16px;
                }
                
                .license-point-title {
                    font-size: 0.9rem;
                }
                
                .license-point-desc {
                    font-size: 0.8rem;
                }
            }
            
                         @media (min-width: 768px) and (max-width: 1145px) {
                 .license-clarity-tabs {
                     display: none !important;
                 }
                 
                 .license-tab-content-container {
                     display: none !important;
                 }
                 
                 .license-desktop-comparison {
                     display: block !important;
                 }
                
                .license-comparison-desktop-grid {
                    gap: 24px;
                }
                
                .license-desktop-card {
                    padding: 28px;
                }
                
                .license-desktop-icon {
                    width: 56px;
                    height: 56px;
                    margin-bottom: 18px;
                }
                
                .license-desktop-icon .material-icons {
                    font-size: 26px;
                }
                
                .license-desktop-title {
                    font-size: 1.5rem;
                }
                
                .license-desktop-description {
                    font-size: 1.05rem;
                }
                
                .license-desktop-feature {
                    padding: 16px;
                }
            }
            
                         @media (min-width: 1146px) {
                 .license-clarity-tabs {
                     display: none !important;
                 }
                 
                 .license-tab-content-container {
                     display: none !important;
                 }
                 
                 .license-desktop-comparison {
                     display: block !important;
                 }
                
                .license-clarity-container {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 36px 32px;
                }
                
                .license-clarity-header {
                    margin-bottom: 36px;
                }
                
                .license-clarity-header-icon {
                    width: 52px;
                    height: 52px;
                }
                
                .license-clarity-header-icon .material-icons {
                    font-size: 24px;
                }
                
                .license-clarity-title {
                    font-size: 1.9rem;
                }
                
                .license-clarity-subtitle {
                    font-size: 1.1rem;
                }
                
                .license-comparison-desktop-grid {
                    max-width: 1000px;
                    margin: 0 auto;
                    gap: 32px;
                }
            }

            
            /* Labels FAQ Section Styling */
            .labels-faq-section {
                border-top: 1px solid rgba(255, 255, 255, 0.1);
                padding-top: 32px;
            }
            
            .labels-icon-container {
                width: fit-content;
            }
            
            .labels-icon {
                width: 48px;
                height: 48px;
                background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.08) 100%);
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 16px rgba(59, 130, 246, 0.2);
            }
            
            .labels-icon .material-icons {
                font-size: 24px;
                color: rgba(59, 130, 246, 1);
            }
            
            .labels-faq-item {
                background: linear-gradient(145deg, rgba(59, 130, 246, 0.02) 0%, rgba(59, 130, 246, 0.01) 100%);
                border-color: rgba(59, 130, 246, 0.1);
            }
            
            .labels-faq-item:hover {
                background: linear-gradient(145deg, rgba(59, 130, 246, 0.05) 0%, rgba(59, 130, 246, 0.02) 100%);
                border-color: rgba(59, 130, 246, 0.2);
            }
            
            .labels-faq-item.faq-item-open {
                border-color: rgba(59, 130, 246, 0.3);
                background: linear-gradient(145deg, rgba(59, 130, 246, 0.08) 0%, rgba(59, 130, 246, 0.03) 100%);
                box-shadow: 0 8px 30px rgba(59, 130, 246, 0.15);
            }
            
            /* Fingerprint Guarantee in Modal */
            .fingerprint-guarantee {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 12px;
                margin: 12px 0 8px 0;
                background: rgba(16, 185, 129, 0.08);
                border: 1px solid rgba(16, 185, 129, 0.2);
                border-radius: 6px;
                font-size: 0.8rem;
                color: rgba(255, 255, 255, 0.9);
                line-height: 1.3;
            }
            
            .fingerprint-guarantee .material-icons {
                font-size: 14px;
                color: rgba(16, 185, 129, 1);
                flex-shrink: 0;
            }
            
            /* Enhanced CTA with Lock Icon */
            .hero-primary-cta .cta-lock {
                font-size: 18px;
                animation: lockPulse 2s ease-in-out infinite;
            }
            
            @keyframes lockPulse {
                0%, 100% {
                    transform: scale(1);
                    opacity: 1;
                }
                50% {
                    transform: scale(1.1);
                    opacity: 0.8;
                }
            }
            
            .hero-primary-cta:hover .cta-lock {
                animation-play-state: paused;
                transform: scale(1.1);
            }
            
            /* Mobile adjustments for guarantee */
            @media (max-width: 767px) {
                .fingerprint-guarantee {
                    font-size: 0.75rem;
                    padding: 6px 10px;
                    gap: 6px;
                }
                
                .fingerprint-guarantee .material-icons {
                    font-size: 12px;
                }
                
                .labels-icon {
                    width: 40px;
                    height: 40px;
                }
                
                .labels-icon .material-icons {
                    font-size: 20px;
                }
            }

            /* Security Features Mobile Carousel */
            .security-features-wrapper {
                position: relative;
            }
            
            .security-features-container {
                position: relative;
            }
            
            .security-features-track {
                scroll-snap-type: x mandatory;
                scrollbar-width: none;
                -ms-overflow-style: none;
            }
            
            .security-features-track::-webkit-scrollbar {
                display: none;
            }
            
            .security-feature-card {
                scroll-snap-align: start;
                scroll-snap-stop: always;
                border: 1px solid rgba(255, 255, 255, 0.1);
                background: linear-gradient(145deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%);
                backdrop-filter: blur(8px);
                position: relative;
                overflow: hidden;
            }
            
            .security-feature-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 2px;
                background: linear-gradient(90deg, transparent 0%, rgba(0, 123, 255, 0.6) 50%, transparent 100%);
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            
            .security-feature-card:hover::before {
                opacity: 1;
            }
            
            .security-feature-card:hover {
                transform: translateY(-2px);
                box-shadow: 
                    0 8px 32px rgba(0, 0, 0, 0.2),
                    0 0 0 1px rgba(255, 255, 255, 0.1),
                    inset 0 1px 0 rgba(255, 255, 255, 0.08);
                border-color: rgba(255, 255, 255, 0.2);
            }
            
            /* Mobile-specific carousel styles */
            @media (max-width: 767px) {
                .security-features-wrapper {
                    margin: 0;
                    padding: 0;
                }
                
                .security-features-container {
                    overflow: hidden;
                    width: 100%;
                    position: relative;
                    padding: 0 16px;
                }
                
                .security-features-track {
                    display: flex !important;
                    flex-wrap: nowrap !important;
                    width: auto !important;
                    transition: transform 0.3s ease-out !important;
                    gap: 8px !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    grid-template-columns: none !important;
                    align-items: stretch;
                }
                
                .security-feature-card {
                    width: calc(50% - 4px) !important;
                    max-width: none !important;
                    min-width: calc(50% - 4px) !important;
                    flex-shrink: 0 !important;
                    flex-grow: 0 !important;
                    padding: 14px !important;
                    margin: 0 !important;
                    border-radius: 8px !important;
                    box-sizing: border-box !important;
                }
                
                .security-feature-card h4 {
                    font-size: 0.9rem;
                    line-height: 1.2;
                }
                
                .security-feature-card .text-sm.text-primary {
                    font-size: 0.8rem;
                }
                
                .security-feature-card p {
                    font-size: 0.8rem;
                    line-height: 1.4;
                }
                
                .security-feature-card .w-40.h-40 {
                    width: 32px !important;
                    height: 32px !important;
                }
                
                .security-feature-card .text-20 {
                    font-size: 16px !important;
                }
            }
            
            /* Tablet adjustments */
            @media (min-width: 768px) and (max-width: 1145px) {
                .security-features-track {
                    display: grid !important;
                    grid-template-columns: repeat(2, 1fr) !important;
                    gap: 20px !important;
                }
                
                .security-feature-card {
                    width: auto !important;
                    max-width: none !important;
                }
            }
            
            /* Desktop layout */
            @media (min-width: 1146px) {
                .security-features-track {
                    display: grid !important;
                    grid-template-columns: repeat(3, 1fr) !important;
                    gap: 24px !important;
                }
                
                .security-feature-card {
                    width: auto !important;
                    max-width: none !important;
                }
            }
            
            /* Navigation buttons */
            .security-nav-btn {
                transition: all 0.2s ease;
                cursor: pointer;
            }
            
            .security-nav-btn:hover:not(:disabled) {
                transform: scale(1.1);
                background: rgba(0, 123, 255, 0.2) !important;
                box-shadow: 0 2px 8px rgba(0, 123, 255, 0.2);
            }
            
            .security-nav-btn:disabled {
                opacity: 0.3 !important;
                cursor: not-allowed;
            }
            
            /* Dots indicator */
            [data-security-dots] button {
                cursor: pointer;
                transition: all 0.2s ease;
                border: none;
                padding: 0;
            }
            
            [data-security-dots] button:hover {
                transform: scale(1.2);
            }
            
            /* Compact License Widget */
            .compact-license-widget {
                position: relative;
                overflow: hidden;
                margin-top: 32px;
            }
            
            .compact-license-widget::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: radial-gradient(ellipse at center, rgba(0, 123, 255, 0.03) 0%, transparent 70%);
                pointer-events: none;
            }
            
            .license-compact-card {
                position: relative;
                z-index: 1;
                border: 1px solid rgba(255, 255, 255, 0.08);
            }
            
            .license-compact-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
                border-color: rgba(0, 123, 255, 0.2);
            }
            
            /* Mobile optimizations for license widget */
            @media (max-width: 767px) {
                .compact-license-widget {
                    padding: 20px 16px;
                    margin-top: 24px;
                    margin-left: -16px;
                    margin-right: -16px;
                    border-radius: 0;
                    border-left: none;
                    border-right: none;
                }
                
                .license-compact-card {
                    padding: 16px;
                    margin-bottom: 12px;
                }
                
                .license-compact-card:last-child {
                    margin-bottom: 0;
                }
                
                .license-compact-card h4 {
                    font-size: 0.85rem;
                }
                
                .license-compact-card .text-xs {
                    font-size: 0.75rem;
                }
                
                .license-compact-card .w-32.h-32 {
                    width: 28px !important;
                    height: 28px !important;
                }
                
                .license-compact-card .text-16 {
                    font-size: 14px !important;
                }
                
                .license-compact-card .space-y-8 > * + * {
                    margin-top: 6px;
                }
                
                .license-compact-card .text-14 {
                    font-size: 12px !important;
                }
            }
            
            /* Animation improvements */
            .security-feature-card {
                animation: slideInUp 0.6s ease-out;
                animation-fill-mode: both;
            }
            
            .security-feature-card:nth-child(1) { animation-delay: 0.1s; }
            .security-feature-card:nth-child(2) { animation-delay: 0.2s; }
            .security-feature-card:nth-child(3) { animation-delay: 0.3s; }
            .security-feature-card:nth-child(4) { animation-delay: 0.4s; }
            .security-feature-card:nth-child(5) { animation-delay: 0.5s; }
            .security-feature-card:nth-child(6) { animation-delay: 0.6s; }
            
            @media (prefers-reduced-motion: reduce) {
                .security-feature-card {
                    animation: none !important;
                }
                
                .security-features-track {
                    scroll-behavior: auto;
                }
            }

            /* Stripe Trust Seal Styling - Subtle & Integrated */
            .stripe-trust-seal {
                display: flex;
                flex-direction: row;
                align-items: center;
                justify-content: center;
                gap: 10px;
                padding: 8px 16px;
                margin: 16px auto 16px auto;
                max-width: 280px;
                width: fit-content;
                background: rgba(255, 255, 255, 0.02);
                border: 1px solid rgba(255, 255, 255, 0.06);
                border-radius: 6px;
                backdrop-filter: blur(4px);
                position: relative;
                overflow: hidden;
                transition: all 0.2s ease;
                opacity: 0.8;
            }
            
            .stripe-trust-seal:hover {
                background: rgba(255, 255, 255, 0.04);
                border-color: rgba(96, 165, 250, 0.15);
                opacity: 1;
                transform: translateY(-1px);
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }
            
            .stripe-trust-seal .trust-seal-header {
                display: flex;
                align-items: center;
                gap: 6px;
                margin: 0;
            }
            
            .stripe-trust-seal .stripe-logo {
                width: 14px;
                height: 14px;
                opacity: 0.8;
                transition: opacity 0.2s ease;
                flex-shrink: 0;
            }
            
            .stripe-trust-seal:hover .stripe-logo {
                opacity: 1;
            }
            
            .stripe-trust-seal .powered-by-text {
                font-size: 0.7rem;
                color: rgba(255, 255, 255, 0.5);
                font-weight: 500;
                letter-spacing: 0.1px;
                white-space: nowrap;
            }
            
            .stripe-trust-seal .security-text {
                font-size: 0.7rem;
                color: rgba(255, 255, 255, 0.7);
                font-weight: 500;
                text-align: center;
                line-height: 1.2;
                white-space: nowrap;
            }
            
            .stripe-trust-seal .security-features {
                display: flex;
                align-items: center;
                gap: 4px;
                font-size: 0.65rem;
                color: rgba(255, 255, 255, 0.4);
                font-weight: 400;
                letter-spacing: 0.05px;
                white-space: nowrap;
            }
            
            .stripe-trust-seal .security-features .material-icons {
                font-size: 10px;
                color: #10b981;
                opacity: 0.8;
            }
            
            /* Mobile trust seal adjustments */
            @media (max-width: 767px) {
                .stripe-trust-seal {
                    padding: 6px 12px;
                    margin: 12px auto 12px auto;
                    max-width: 240px;
                    width: fit-content;
                    gap: 8px;
                    flex-direction: column;
                    text-align: center;
                    justify-content: center;
                    align-items: center;
                }
                
                .stripe-trust-seal .trust-seal-header {
                    gap: 4px;
                    justify-content: center;
                    align-items: center;
                }
                
                .stripe-trust-seal .stripe-logo {
                    width: 12px;
                    height: 12px;
                }
                
                .stripe-trust-seal .powered-by-text {
                    font-size: 0.65rem;
                }
                
                .stripe-trust-seal .security-text {
                    font-size: 0.65rem;
                }
                
                .stripe-trust-seal .security-features {
                    font-size: 0.6rem;
                    gap: 3px;
                }
                
                .stripe-trust-seal .security-features .material-icons {
                    font-size: 8px;
                }
            }
            
            /* Tablet trust seal styling */
            @media (min-width: 768px) and (max-width: 1145px) {
                .stripe-trust-seal {
                    margin: 14px auto 14px auto;
                    padding: 7px 14px;
                    max-width: 260px;
                    width: fit-content;
                    justify-content: center;
                }
            }
            
            /* Trust seal in modal - even more compact */
            .calculator-modal .stripe-trust-seal {
                margin: 8px auto 4px auto;
                padding: 4px 10px;
                max-width: 200px;
                gap: 6px;
                opacity: 0.7;
                font-size: 0.9em;
            }
            
            .calculator-modal .stripe-trust-seal .stripe-logo {
                width: 12px;
                height: 12px;
            }
            
            .calculator-modal .stripe-trust-seal .powered-by-text {
                font-size: 0.6rem;
            }
            
            .calculator-modal .stripe-trust-seal .security-text {
                font-size: 0.6rem;
            }
            
            .calculator-modal .stripe-trust-seal .security-features {
                font-size: 0.55rem;
            }
            
            .calculator-modal .stripe-trust-seal .security-features .material-icons {
                font-size: 8px;
            }
        `;
        
        document.head.appendChild(InitializationManager.state.injectedStyles);
        log('Pricing styles injected');
    }

    class PricingCarousel {
        constructor() {
            this.isInitialized = false;
            this.carouselContainer = null;
            this.scrollContainer = null;
            this.originalCards = [];
            this.allCards = [];
            this.prevButton = null;
            this.nextButton = null;
            this.currentIndex = 0;
            this.totalOriginalCards = 0;
            this.cardWidth = 0;
            try {
                this.isMobile = globalObj.innerWidth < 768;
            } catch (error) {
                console.warn('Could not detect mobile layout, defaulting to desktop:', error);
                this.isMobile = false;
            }
            this.observer = null;
            this.resizeTimeout = null;
            this.calculatorModal = null;
            this.previousFocus = null;
            
            log('PricingCarousel constructor called');
            this.init();
        }

        init() {
            log('Initializing pricing carousel...');
            this.trySetupCarousel();
        }

        trySetupCarousel() {
            const { container, cards } = this.findPricingElements();
            
            if (container && cards.length > 0) {
                log(`Found pricing container with ${cards.length} cards`);
                this.setupCarousel(container, cards);
            } else {
                log('Pricing elements not found, setting up observer...');
                this.setupMutationObserver();
            }
        }

        findPricingElements() {
            const containerSelectors = [
                '.flex.flex-col.items-center.gap-24.overflow-x-auto.overflow-y-visible.pb-20.md\\:flex-row.md\\:justify-center',
                '[class*="flex"][class*="flex-col"][class*="items-center"][class*="gap-24"]',
                '.flex.flex-col.items-center',
                '.grid[class*="gap"]'
            ];

            let pricingContainer = null;
            let pricingCards = [];

            for (const selector of containerSelectors) {
                try {
                    const containers = document.querySelectorAll(selector);
                    for (const container of containers) {
                        const cards = this.findCardsInContainer(container);
                        if (cards.length > 0) {
                            pricingContainer = container;
                            pricingCards = cards;
                            log(`Found pricing container using selector: ${selector}`);
                            break;
                        }
                    }
                    if (pricingContainer) break;
                } catch (error) {
                    log(`Selector "${selector}" failed:`, error.message);
                    continue;
                }
            }

            return { container: pricingContainer, cards: pricingCards };
        }

        findCardsInContainer(container) {
            const cardSelectors = [
                '.w-full.rounded-lg.border',
                '[class*="rounded"][class*="border"]',
                '.border[class*="rounded"]',
                '.bg-paper'
            ];

            for (const selector of cardSelectors) {
                try {
                    const cards = Array.from(container.querySelectorAll(selector));
                    const pricingCards = cards.filter(card => this.isPricingCard(card));
                    if (pricingCards.length > 0) {
                        log(`Found ${pricingCards.length} pricing cards using selector: ${selector}`);
                        return pricingCards;
                    }
                } catch (error) {
                    log(`Card selector "${selector}" failed:`, error.message);
                    continue;
                }
            }

            const children = Array.from(container.children);
            const pricingCards = children.filter(child => this.isPricingCard(child));
            if (pricingCards.length > 0) {
                log(`Found ${pricingCards.length} pricing cards from direct children`);
                return pricingCards;
            }

            return [];
        }

        isPricingCard(element) {
            const text = element.textContent?.toLowerCase() || '';
            const classes = element.className?.toLowerCase() || '';
            const hasPrice = /\$\d+|\d+\s*(\/|per)/.test(text);
            const hasPricingKeywords = /(plan|subscription|pricing|upgrade|free|pro|premium|basic|standard|enterprise)/i.test(text);
            const hasCardClasses = /(border|rounded|card|shadow|bg-)/i.test(classes);
            const hasButtons = element.querySelector('button, a[href*="upgrade"], a[href*="subscribe"], a[type="button"]');
            const hasMinHeight = element.offsetHeight > 200;

            const criteria = [hasPrice, hasPricingKeywords, hasCardClasses, hasButtons, hasMinHeight];
            const metCriteria = criteria.filter(Boolean).length;

            return metCriteria >= 2;
        }

        setupMutationObserver() {
            if (this.observer) {
                this.observer.disconnect();
            }

            const startObserving = () => {
                const targetNode = document.body || document.documentElement;
                if (!targetNode) {
                    if (DEBUG_MODE) console.log('[BeatPass Pricing] DOM not ready, retrying in 100ms...');
                    setTimeout(startObserving, 100);
                    return;
                }

                this.observer = new MutationObserver((mutations) => {
                    for (const mutation of mutations) {
                        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                            for (const node of mutation.addedNodes) {
                                if (node.nodeType === Node.ELEMENT_NODE) {
                                    const nodeText = node.textContent?.toLowerCase() || '';
                                    if (nodeText.includes('plan') || nodeText.includes('pricing') || nodeText.includes('$')) {
                                        log('Observer detected potential pricing content');
                                        setTimeout(() => {
                                            const { container, cards } = this.findPricingElements();
                                            if (container && cards.length > 0 && !this.isInitialized) {
                                                log('Observer found pricing elements');
                                                this.observer.disconnect();
                                                this.setupCarousel(container, cards);
                                            }
                                        }, 200);
                                        return;
                                    }
                                }
                            }
                        }
                    }
                });

                this.observer.observe(targetNode, {
                    childList: true,
                    subtree: true
                });

                setTimeout(() => {
                    if (this.observer && !this.isInitialized) {
                        log('Observer timeout reached');
                        this.observer.disconnect();
                        this.observer = null;
                    }
                }, 30000);
            };

            startObserving();
        }

        setupCarousel(pricingContainer, pricingCards) {
            if (this.isInitialized) {
                log('Carousel already initialized');
                return;
            }

            log(`Setting up carousel with ${pricingCards.length} cards`);

            this.originalCards = pricingCards;
            this.totalOriginalCards = this.originalCards.length;
            
            const popularCardIndex = this.originalCards.findIndex(card => 
                card.querySelector('.bg-chip:not(.invisible)') || 
                card.textContent.toLowerCase().includes('popular')
            );
            if (popularCardIndex !== -1) {
                this.currentIndex = popularCardIndex;
            }

            try {
                this.transformToNativeCarousel(pricingContainer);
                this.bindEvents();
                this.updateNavigation();
                
                this.isInitialized = true;
                log('Carousel initialized successfully');
                
                if (this.observer) {
                    this.observer.disconnect();
                    this.observer = null;
                }
            } catch (error) {
                console.error('Error during carousel setup:', error);
            }
        }

        createHeroSection() {
            const heroSection = document.createElement('div');
            heroSection.className = 'pricing-hero-section';
            heroSection.setAttribute('data-hero-section', 'true');
            
            const headline = document.createElement('h1');
            headline.className = 'hero-headline';
            headline.innerHTML = `Stop buying beats one-by-one. <span class="hero-price-highlight">Start downloading everything.</span>`;
            
            const subheadline = document.createElement('p');
            subheadline.className = 'hero-subheadline';
            subheadline.innerHTML = `Access thousands of studio-ready beats with clear licenses and <span class="hero-revenue-highlight">zero per-download fees</span>. One simple subscription unlocks unlimited creativity.`;
            
            // Value props
            const valueProps = document.createElement('div');
            valueProps.className = 'hero-value-props flex flex-wrap justify-center gap-24 mb-32';
            
            const props = [
                { icon: 'download', text: 'Unlimited Downloads' },
                { icon: 'verified_user', text: 'Licensed & Protected' },
                { icon: 'close', text: 'No Per-Beat Fees' }
            ];
            
            props.forEach(prop => {
                const propElement = document.createElement('div');
                propElement.className = 'hero-prop flex items-center gap-8';
                propElement.innerHTML = `
                    <span class="material-icons text-primary text-16">${prop.icon}</span>
                    <span class="text-sm font-medium">${prop.text}</span>
                `;
                valueProps.appendChild(propElement);
            });
            
            // CTA Container
            const ctaContainer = document.createElement('div');
            ctaContainer.className = 'hero-cta-container';
            
            // Primary CTA
            const primaryCTA = document.createElement('a');
            primaryCTA.className = 'hero-primary-cta';
            primaryCTA.href = '#pricing-plans';
            primaryCTA.innerHTML = `
                <span class="material-icons">play_arrow</span>
                <span class="cta-text">See Plans & Pricing</span>
                <span class="material-icons">arrow_forward</span>
            `;
            
            // Add smooth scroll to pricing plans
            primaryCTA.addEventListener('click', (e) => {
                e.preventDefault();
                const pricingSection = document.querySelector('.pricing-carousel-container');
                if (pricingSection) {
                    pricingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
            
            // Secondary text
            const secondaryText = document.createElement('p');
            secondaryText.className = 'hero-secondary-text text-sm text-muted mt-16';
            secondaryText.textContent = 'Start with Explorer (free) • Upgrade anytime • Cancel anytime';
            
            ctaContainer.appendChild(primaryCTA);
            ctaContainer.appendChild(secondaryText);
            
            heroSection.appendChild(headline);
            heroSection.appendChild(subheadline);
            heroSection.appendChild(valueProps);
            heroSection.appendChild(ctaContainer);
            
            return heroSection;
        }

        createCalculatorTriggerButton() {
            const triggerButton = document.createElement('div');
            triggerButton.className = 'calculator-trigger-button';
            triggerButton.setAttribute('data-calculator-trigger', 'true');
            
            triggerButton.innerHTML = `
                <div class="trigger-button-content">
                    <div class="trigger-button-icon">
                        <span class="material-icons">touch_app</span>
                    </div>
                    <div class="trigger-button-text">
                        <h3>Click to Calculate Your Savings</h3>
                        <p>Interactive calculator • See your personalized ROI instantly</p>
                    </div>
                </div>
            `;
            
            triggerButton.addEventListener('click', () => {
                this.openCalculatorModal();
            });
            
            return triggerButton;
        }

        createStripeTrustSeal() {
            const trustSeal = document.createElement('div');
            trustSeal.className = 'stripe-trust-seal';
            trustSeal.setAttribute('data-stripe-trust-seal', 'true');
            
            trustSeal.innerHTML = `
                <div class="trust-seal-header">
                    <img src="https://cdn.brandfolder.io/KGT2DTA4/at/p9cqxp8pq54f2j2v7tsbmb3j/Stripe_icon_-_circle.svg" 
                         alt="Stripe" 
                         class="stripe-logo"
                         loading="lazy">
                    <span class="powered-by-text">Stripe</span>
                </div>
                <div class="security-text">AES-256 Encrypted</div>
                <div class="security-features">
                    <span class="material-icons">verified_user</span>
                    <span>Secure</span>
                </div>
            `;
            
            return trustSeal;
        }

        createCalculatorModal() {
            // Create modal overlay
            const modalOverlay = document.createElement('div');
            modalOverlay.className = 'calculator-modal-overlay';
            modalOverlay.setAttribute('data-calculator-modal-overlay', 'true');
            
            // Create modal container
            const modal = document.createElement('div');
            modal.className = 'calculator-modal';
            modal.setAttribute('tabindex', '-1');
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-labelledby', 'calculator-modal-title');
            modal.setAttribute('aria-modal', 'true');
            
            // Modal Header
            const header = document.createElement('div');
            header.className = 'calculator-modal-header';
            header.innerHTML = `
                <div class="modal-title-section">
                    <div class="modal-title-icon">
                        <span class="material-icons">calculate</span>
                    </div>
                    <div class="modal-title-text">
                        <h2 id="calculator-modal-title">Savings & ROI Calculator</h2>
                        <p>Discover how much you'll save with a BeatPass subscription</p>
                    </div>
                </div>
                <button class="modal-close-button" type="button" aria-label="Close calculator">
                    <span class="material-icons">close</span>
                </button>
            `;
            
            // Modal Body
            const body = document.createElement('div');
            body.className = 'calculator-modal-body';
            
            const main = document.createElement('div');
            main.className = 'calculator-main';
            
            // Controls Section
            const controlsSection = document.createElement('div');
            controlsSection.className = 'calculator-controls';
            
            // Plan Selection Card
            const planCard = document.createElement('div');
            planCard.className = 'control-card';
            planCard.innerHTML = `
                <div class="control-label">
                    <span class="material-icons">category</span>
                    Choose Plan to Compare
                </div>
                <div class="plan-selector" data-plan-selector>
                    <div class="plan-card active" data-plan="classic" data-price="29">
                        <div class="plan-name">Classic</div>
                        <div class="plan-price">$29/mo</div>
                    </div>
                    <div class="plan-card" data-plan="plus" data-price="45">
                        <div class="plan-name">Plus</div>
                        <div class="plan-price">$45/mo</div>
                    </div>
                    <div class="plan-card" data-plan="pro" data-price="59">
                        <div class="plan-name">Pro</div>
                        <div class="plan-price">$59/mo</div>
                    </div>
                </div>
            `;
            
            // Beats Slider Card
            const beatsCard = document.createElement('div');
            beatsCard.className = 'control-card';
            beatsCard.innerHTML = `
                <div class="control-label">
                    <span class="material-icons">music_note</span>
                    Monthly Beat Licenses
                </div>
                <div class="slider-control">
                    <div class="slider-value-display" id="modal-beats-value-display">5 beats per month</div>
                    <div class="slider-track">
                        <input type="range" id="modal-beats-slider" class="slider-input" min="1" max="25" value="5" step="1">
                    </div>
                    <div class="slider-labels">
                        <span>1 beat</span>
                        <span>25+ beats</span>
                    </div>
                </div>
            `;
            
            // Beat Price Card
            const priceCard = document.createElement('div');
            priceCard.className = 'control-card';
            priceCard.innerHTML = `
                <div class="control-label">
                    <span class="material-icons">attach_money</span>
                    Typical Beat Price
                </div>
                <div class="slider-control">
                    <div class="slider-value-display" id="modal-price-value-display">$30 CAD per beat</div>
                    <div class="slider-track">
                        <input type="range" id="modal-beat-price" class="slider-input" min="10" max="100" value="30" step="5">
                    </div>
                    <div class="slider-labels">
                        <span>$10</span>
                        <span>$100+</span>
                    </div>
                </div>
                <div class="input-hint">Average non-exclusive beat price you pay</div>
            `;
            
            // Exclusive Purchases Card
            const exclusiveCard = document.createElement('div');
            exclusiveCard.className = 'control-card';
            exclusiveCard.innerHTML = `
                <div class="control-label">
                    <span class="material-icons">star</span>
                    Exclusive Beats per Year
                </div>
                <div class="slider-control">
                    <div class="slider-value-display" id="modal-exclusive-value-display">0 exclusive beats</div>
                    <div class="slider-track">
                        <input type="range" id="modal-exclusive-beats" class="slider-input" min="0" max="12" value="0" step="1">
                    </div>
                    <div class="slider-labels">
                        <span>None</span>
                        <span>12+ per year</span>
                    </div>
                </div>
                <div class="input-hint">
                    Get automatic discounts: <strong>Classic $30</strong>, <strong>Plus/Pro $60</strong> off each exclusive
                </div>
            `;
            
            controlsSection.appendChild(planCard);
            controlsSection.appendChild(beatsCard);
            controlsSection.appendChild(priceCard);
            controlsSection.appendChild(exclusiveCard);
            
            // Results Section
            const resultsSection = document.createElement('div');
            resultsSection.className = 'calculator-results';
            resultsSection.innerHTML = `
                <div class="results-header">
                    <span class="material-icons">trending_up</span>
                    <h4>Your Personalized Savings</h4>
                </div>
                <div class="breakeven-message" id="modal-breakeven-message">
                    Break-even at just 1 beat per month
                </div>
                <div class="savings-display">
                    <div class="savings-amount" id="modal-savings-amount">$0</div>
                    <div class="savings-label">saved annually</div>
                </div>
                <div class="savings-details">
                    <div id="modal-monthly-comparison" class="comparison-line"></div>
                    <div id="modal-exclusive-savings" class="exclusive-bonus"></div>
                </div>
                <div class="subscription-cta">
                    <button class="subscribe-button" id="modal-subscribe-button">
                        <span class="material-icons">rocket_launch</span>
                        <div class="subscribe-text">
                            <div class="subscribe-title">Start Saving with <span id="selected-plan-name">Classic</span></div>
                            <div class="subscribe-subtitle">Begin your subscription today</div>
                        </div>
                    </button>
                    <div class="fingerprint-guarantee">
                        <span class="material-icons">fingerprint</span>
                        <span>Every purchase is backed by BeatPassID fingerprint verification—zero risk of unknowingly licensing a duplicate.</span>
                    </div>
                    <div class="stripe-trust-seal">
                        <div class="trust-seal-header">
                            <img src="https://cdn.brandfolder.io/KGT2DTA4/at/p9cqxp8pq54f2j2v7tsbmb3j/Stripe_icon_-_circle.svg" 
                                 alt="Stripe" 
                                 class="stripe-logo"
                                 loading="lazy">
                            <span class="powered-by-text">Stripe</span>
                        </div>
                        <div class="security-text">AES-256 Encrypted</div>
                        <div class="security-features">
                            <span class="material-icons">verified_user</span>
                            <span>Secure</span>
                        </div>
                    </div>
                </div>
            `;
            
            main.appendChild(resultsSection);
            main.appendChild(controlsSection);
            body.appendChild(main);
            
            modal.appendChild(header);
            modal.appendChild(body);
            modalOverlay.appendChild(modal);
            
            // Bind modal events
            this.bindModalEvents(modalOverlay, modal);
            
            // Setup sticky observer for results card
            this.setupStickyObserver(modal);
            
            return modalOverlay;
        }

        createSavingsCalculator() {
            // Return just the trigger button instead of the full widget
            return this.createCalculatorTriggerButton();
        }

        bindModalEvents(modalOverlay, modal) {
            // Close button
            const closeButton = modal.querySelector('.modal-close-button');
            closeButton.addEventListener('click', () => {
                this.closeCalculatorModal();
            });
            
            // Click outside to close
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) {
                    this.closeCalculatorModal();
                }
            });
            
            // Keyboard navigation
            modal.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.closeCalculatorModal();
                }
                
                // Focus management for accessibility
                if (e.key === 'Tab') {
                    this.handleModalTabNavigation(e, modal);
                }
            });
            
            // Plan selection
            const planCards = modal.querySelectorAll('.plan-card[data-plan]');
            planCards.forEach(card => {
                card.addEventListener('click', () => {
                    planCards.forEach(p => p.classList.remove('active'));
                    card.classList.add('active');
                    this.updateSelectedPlanDisplay(modal);
                    this.updateModalCalculation(modal);
                });
            });
            
            // Subscription button
            const subscribeButton = modal.querySelector('#modal-subscribe-button');
            subscribeButton.addEventListener('click', () => {
                const selectedPlan = modal.querySelector('.plan-card.active[data-plan]');
                const planName = selectedPlan.getAttribute('data-plan');
                this.handleSubscription(planName);
            });
            
            // Beats slider
            const beatsSlider = modal.querySelector('#modal-beats-slider');
            const beatsValueDisplay = modal.querySelector('#modal-beats-value-display');
            beatsSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                const displayText = value === 25 ? '25+ beats per month' : `${value} beat${value > 1 ? 's' : ''} per month`;
                beatsValueDisplay.textContent = displayText;
                this.updateSliderProgress(e.target);
                this.updateModalCalculation(modal);
            });
            
            // Beat price slider
            const beatPriceSlider = modal.querySelector('#modal-beat-price');
            const priceValueDisplay = modal.querySelector('#modal-price-value-display');
            beatPriceSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                const displayText = value === 100 ? '$100+ CAD per beat' : `$${value} CAD per beat`;
                priceValueDisplay.textContent = displayText;
                this.updateSliderProgress(e.target);
                this.updateModalCalculation(modal);
            });
            
            // Exclusive beats slider
            const exclusiveSlider = modal.querySelector('#modal-exclusive-beats');
            const exclusiveValueDisplay = modal.querySelector('#modal-exclusive-value-display');
            exclusiveSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                const displayText = value === 0 ? 'None' : value === 12 ? '12+ exclusive beats' : `${value} exclusive beat${value > 1 ? 's' : ''}`;
                exclusiveValueDisplay.textContent = displayText;
                this.updateSliderProgress(e.target);
                this.updateModalCalculation(modal);
            });
            
            // Initialize slider progress for all sliders
            [beatsSlider, beatPriceSlider, exclusiveSlider].forEach(slider => {
                this.updateSliderProgress(slider);
            });
            
            // Initialize selected plan display
            this.updateSelectedPlanDisplay(modal);
            
            // Initial calculation
            this.updateModalCalculation(modal);
        }

        openCalculatorModal() {
            // Create modal if it doesn't exist
            if (!this.calculatorModal) {
                this.calculatorModal = this.createCalculatorModal();
                document.body.appendChild(this.calculatorModal);
            }
            
            // Store current focus for restoration
            this.previousFocus = document.activeElement;
            
            // Show modal
            this.calculatorModal.classList.add('active');
            
            // Focus the modal for accessibility
            const modal = this.calculatorModal.querySelector('.calculator-modal');
            modal.focus();
            
            // Prevent body scroll
            document.body.style.overflow = 'hidden';
            
            log('Calculator modal opened');
        }

        closeCalculatorModal() {
            if (this.calculatorModal) {
                this.calculatorModal.classList.remove('active');
                
                // Cleanup sticky observer
                if (this.stickyObserver) {
                    this.stickyObserver.disconnect();
                    this.stickyObserver = null;
                }
                
                // Remove sticky sentinel
                if (this.stickySentinel && this.stickySentinel.parentNode) {
                    this.stickySentinel.parentNode.removeChild(this.stickySentinel);
                    this.stickySentinel = null;
                }
                
                // Restore body scroll
                document.body.style.overflow = '';
                
                // Restore focus
                if (this.previousFocus) {
                    this.previousFocus.focus();
                    this.previousFocus = null;
                }
                
                // Remove modal after animation
                setTimeout(() => {
                    if (this.calculatorModal && this.calculatorModal.parentNode) {
                        this.calculatorModal.parentNode.removeChild(this.calculatorModal);
                        this.calculatorModal = null;
                    }
                }, 300);
                
                log('Calculator modal closed');
            }
        }

        handleModalTabNavigation(e, modal) {
            const focusableElements = modal.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    lastElement.focus();
                    e.preventDefault();
                }
            } else {
                if (document.activeElement === lastElement) {
                    firstElement.focus();
                    e.preventDefault();
                }
            }
        }

        setupStickyObserver(modal) {
            const resultsCard = modal.querySelector('.calculator-results');
            if (!resultsCard) return;
            
            // Create a sentinel element to track when sticky activates
            const sentinel = document.createElement('div');
            sentinel.style.height = '1px';
            sentinel.style.position = 'absolute';
            sentinel.style.top = '0';
            sentinel.style.left = '0';
            sentinel.style.width = '100%';
            sentinel.style.pointerEvents = 'none';
            
            // Insert sentinel before results card
            resultsCard.parentNode.insertBefore(sentinel, resultsCard);
            
            // Setup intersection observer
            const observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            // Sentinel is visible, sticky is not active
                            resultsCard.classList.remove('sticky-active');
                        } else {
                            // Sentinel is not visible, sticky is active
                            resultsCard.classList.add('sticky-active');
                        }
                    });
                },
                {
                    rootMargin: '-20px 0px 0px 0px' // Offset by the sticky top value
                }
            );
            
            observer.observe(sentinel);
            
            // Store observer for cleanup
            this.stickyObserver = observer;
            this.stickySentinel = sentinel;
        }

        updateSliderProgress(slider) {
            const min = parseFloat(slider.min) || 0;
            const max = parseFloat(slider.max) || 100;
            const value = parseFloat(slider.value) || 0;
            const percentage = ((value - min) / (max - min)) * 100;
            
            // Find the track and set CSS custom property for ::before pseudo-element
            const track = slider.parentNode.querySelector('.slider-track');
            if (track) {
                track.style.setProperty('--progress', `${percentage}%`);
            }
        }

        updateSelectedPlanDisplay(modal) {
            const selectedPlan = modal.querySelector('.plan-card.active[data-plan]');
            const planName = selectedPlan.getAttribute('data-plan');
            const planDisplayName = planName.charAt(0).toUpperCase() + planName.slice(1);
            
            const selectedPlanNameElement = modal.querySelector('#selected-plan-name');
            if (selectedPlanNameElement) {
                selectedPlanNameElement.textContent = planDisplayName;
            }
        }

        handleSubscription(planName) {
            // Close the modal first
            this.closeCalculatorModal();
            
            // Scroll to pricing section and highlight selected plan
            const pricingSection = document.querySelector('.pricing-carousel-container');
            if (pricingSection) {
                pricingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                
                // Highlight the corresponding plan in the main carousel
                setTimeout(() => {
                    const mainPlanCards = document.querySelectorAll('.pricing-carousel-card');
                    mainPlanCards.forEach((card, index) => {
                        const cardText = card.textContent.toLowerCase();
                        if (cardText.includes(planName.toLowerCase())) {
                            // Add a highlight effect
                            card.style.transform = 'translateY(-4px)';
                            card.style.boxShadow = '0 8px 32px rgba(255, 255, 255, 0.15)';
                            card.style.border = '2px solid rgba(255, 255, 255, 0.3)';
                            
                            // Scroll to this card in the carousel
                            if (this.carouselContainer) {
                                this.scrollToCard(index, true);
                            }
                            
                            // Remove highlight after a few seconds
                            setTimeout(() => {
                                card.style.transform = '';
                                card.style.boxShadow = '';
                                card.style.border = '';
                            }, 3000);
                            
                            // Find and trigger click on upgrade/subscribe button
                            const upgradeButton = card.querySelector('a[href*="upgrade"], a[type="button"], button');
                            if (upgradeButton) {
                                setTimeout(() => {
                                    upgradeButton.click();
                                }, 1000);
                            }
                        }
                    });
                }, 500);
            }
            
            log(`Subscription initiated for plan: ${planName}`);
        }

        updateModalCalculation(modal) {
            const selectedPlan = modal.querySelector('.plan-card.active[data-plan]');
            const planPrice = parseInt(selectedPlan.getAttribute('data-price'));
            const planName = selectedPlan.getAttribute('data-plan');
            
            const beatsPerMonth = parseInt(modal.querySelector('#modal-beats-slider').value);
            const beatPrice = parseInt(modal.querySelector('#modal-beat-price').value) || 30;
            const exclusiveBeats = parseInt(modal.querySelector('#modal-exclusive-beats').value) || 0;
            
            // Calculate monthly costs
            const subscriptionCostMonthly = planPrice;
            const alacarteCostMonthly = beatsPerMonth * beatPrice;
            
            // Calculate break-even point
            const breakEvenBeats = Math.ceil(subscriptionCostMonthly / beatPrice);
            
            // Calculate annual savings from regular beats (ensure positive)
            const regularSavingsAnnual = Math.max(0, (alacarteCostMonthly - subscriptionCostMonthly) * 12);
            
            // Calculate exclusive savings
            let exclusiveSavings = 0;
            if (exclusiveBeats > 0) {
                const discount = planName === 'classic' ? 30 : 60; // Classic $30, Plus/Pro $60
                exclusiveSavings = exclusiveBeats * discount;
            }
            
            // Add bonus value for unlimited access (when user gets more than break-even)
            let bonusValue = 0;
            if (beatsPerMonth >= breakEvenBeats) {
                // Add value for unlimited access beyond break-even point
                const extraBeats = beatsPerMonth - breakEvenBeats;
                bonusValue = extraBeats * beatPrice * 12;
            }
            
            const totalSavingsAnnual = regularSavingsAnnual + exclusiveSavings + bonusValue;
            
            // Update UI
            const breakevenMsg = modal.querySelector('#modal-breakeven-message');
            const savingsAmount = modal.querySelector('#modal-savings-amount');
            const monthlyComparison = modal.querySelector('#modal-monthly-comparison');
            const exclusiveSavingsDiv = modal.querySelector('#modal-exclusive-savings');
            
            // Smart break-even messaging
            if (beatsPerMonth < breakEvenBeats) {
                breakevenMsg.textContent = `💡 You'll break even at ${breakEvenBeats} beat${breakEvenBeats > 1 ? 's' : ''} per month`;
            } else {
                const extraValue = (beatsPerMonth - breakEvenBeats) * beatPrice;
                breakevenMsg.textContent = `🎉 You're getting $${extraValue} extra value monthly beyond break-even!`;
            }
            
            // Always show positive savings or minimum value
            const displaySavings = Math.max(totalSavingsAnnual, exclusiveSavings);
            savingsAmount.textContent = `$${displaySavings.toLocaleString()}`;
            savingsAmount.style.color = '#28a745';
            
            // Smart comparison messaging
            if (beatsPerMonth < breakEvenBeats) {
                monthlyComparison.textContent = `📊 At ${beatsPerMonth} beat${beatsPerMonth > 1 ? 's' : ''}/month: $${subscriptionCostMonthly} subscription vs $${alacarteCostMonthly} individual purchases`;
            } else {
                monthlyComparison.textContent = `🎯 Perfect! $${subscriptionCostMonthly}/mo for unlimited beats vs $${alacarteCostMonthly}/mo buying individually`;
            }
            
            if (exclusiveBeats > 0) {
                const discount = planName === 'classic' ? 30 : 60;
                exclusiveSavingsDiv.textContent = `⭐ Bonus: $${exclusiveSavings} saved annually on ${exclusiveBeats} exclusive beat${exclusiveBeats > 1 ? 's' : ''} ($${discount} discount each)`;
            } else {
                exclusiveSavingsDiv.textContent = '';
            }
        }

        transformToNativeCarousel(originalContainer) {
            // Find and remove existing title to prevent duplicates
            const existingTitle = document.querySelector('h1[class*="text-center"][class*="text-3xl"]');
            if (existingTitle && existingTitle.textContent.toLowerCase().includes('choose the right plan')) {
                existingTitle.remove();
                log('Removed existing duplicate title');
            }
            
            const wrapperDiv = document.createElement('div');
            wrapperDiv.className = 'mb-50';
            
            const innerDiv = document.createElement('div');
            
            // 1. Hero Section - Clear value proposition
            const heroSection = this.createHeroSection();
            innerDiv.appendChild(heroSection);
            
            // 2. Trust Indicators - Brief social proof
            const trustIndicators = this.createTrustIndicatorsSection();
            innerDiv.appendChild(trustIndicators);
            
            // 3. Pricing Plans - The main conversion point
            const pricingHeader = this.createPricingHeader();
            innerDiv.appendChild(pricingHeader);
            
            this.scrollContainer = document.createElement('div');
            this.scrollContainer.className = 'content-carousel content-grid relative w-full grid grid-flow-col grid-rows-[auto] overflow-x-auto overflow-y-hidden gap-24 snap-always snap-x snap-mandatory hidden-scrollbar pricing-carousel-container';
            
            this.allCards = this.originalCards;
            
            this.allCards.forEach((card, index) => {
                const snapContainer = document.createElement('div');
                snapContainer.className = 'snap-start snap-normal';
                
                const cardClone = card.cloneNode(true);
                
                cardClone.classList.remove('w-full', 'md:w-auto', 'max-w-sm', 'ml-auto', 'mr-auto');
                cardClone.classList.add('pricing-carousel-card');
                
                if (!cardClone.classList.contains('rounded-lg')) cardClone.classList.add('rounded-lg');
                if (!cardClone.classList.contains('border')) cardClone.classList.add('border');
                if (!cardClone.classList.contains('bg-paper')) cardClone.classList.add('bg-paper');
                if (!cardClone.classList.contains('shadow-lg')) cardClone.classList.add('shadow-lg');
                
                cardClone.classList.add('px-28', 'md:min-w-240', 'md:max-w-350');
                cardClone.style.opacity = '1';
                
                snapContainer.appendChild(cardClone);
                this.scrollContainer.appendChild(snapContainer);
            });
            
            this.scrollContainer.classList.add('initializing');
            innerDiv.appendChild(this.scrollContainer);
            
            // 4. Feature Comparison - Why each plan matters
            const featureSection = this.createFeatureExplanationSection();
            innerDiv.appendChild(featureSection);
            
            // 5. ROI Calculator - Personalized value demonstration
            const calculatorWidget = this.createSavingsCalculator();
            innerDiv.appendChild(calculatorWidget);
            
            // 6. Security & Licensing - Trust and legal clarity
            const securitySection = this.createSecuritySection();
            innerDiv.appendChild(securitySection);
            
            // 7. FAQ - Objection handling
            const faqSection = this.createFAQSection();
            innerDiv.appendChild(faqSection);
            
            // 8. Final CTA Section
            const finalCTASection = this.createFinalCTASection();
            innerDiv.appendChild(finalCTASection);
            
            wrapperDiv.appendChild(innerDiv);
            
            originalContainer.parentNode.replaceChild(wrapperDiv, originalContainer);
            
            this.carouselContainer = wrapperDiv;
            
            setTimeout(() => {
                this.calculateCardWidth();
                this.currentIndex = 0;
                
                this.scrollContainer.classList.remove('initializing');
                this.scrollContainer.classList.add('loaded');
                
                this.updateNavigation();
            }, 100);
        }

        createTrustIndicatorsSection() {
            const section = document.createElement('div');
            section.className = 'trust-indicators-section mb-40';
            
            const container = document.createElement('div');
            container.className = 'max-w-5xl mx-auto';
            
            const indicators = document.createElement('div');
            indicators.className = 'flex flex-wrap items-center justify-center gap-32 md:gap-40 opacity-70';
            
            const trustItems = [
                {
                    icon: 'verified_user',
                    text: 'BeatPassID Verified',
                    subtext: 'Fingerprint Protection'
                },
                {
                    icon: 'gavel',
                    text: 'Sample-Safe™',
                    subtext: 'Legal Guarantee'
                },
                {
                    icon: 'security',
                    text: 'Stripe Secured',
                    subtext: 'Bank-Grade Encryption'
                },
                {
                    icon: 'trending_up',
                    text: '85¢ per $1',
                    subtext: 'To Producers'
                }
            ];
            
            trustItems.forEach(item => {
                const trustItem = document.createElement('div');
                trustItem.className = 'flex items-center gap-12 text-center md:text-left';
                
                const iconContainer = document.createElement('div');
                iconContainer.className = 'w-40 h-40 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0';
                
                const icon = document.createElement('span');
                icon.className = 'material-icons text-primary text-18';
                icon.textContent = item.icon;
                
                const textContainer = document.createElement('div');
                textContainer.className = 'hidden md:block';
                
                const mainText = document.createElement('div');
                mainText.className = 'font-semibold text-sm text-main';
                mainText.textContent = item.text;
                
                const subText = document.createElement('div');
                subText.className = 'text-xs text-muted';
                subText.textContent = item.subtext;
                
                iconContainer.appendChild(icon);
                textContainer.appendChild(mainText);
                textContainer.appendChild(subText);
                trustItem.appendChild(iconContainer);
                trustItem.appendChild(textContainer);
                indicators.appendChild(trustItem);
            });
            
            container.appendChild(indicators);
            section.appendChild(container);
            
            return section;
        }

        createPricingHeader() {
            const headerDiv = document.createElement('div');
            headerDiv.className = 'flex items-center justify-between gap-24 mb-14';
            
            const titleSection = document.createElement('div');
            titleSection.className = 'flex flex-col gap-2 text-center mx-auto md:text-left md:mx-0';
            
            const titleElement = document.createElement('h2');
            titleElement.className = 'text-3xl font-semibold';
            titleElement.textContent = 'Choose Your Plan';
            
            const subtitleElement = document.createElement('h3');
            subtitleElement.className = 'text-base text-muted';
            subtitleElement.setAttribute('data-carousel-subtitle', 'true');
            subtitleElement.textContent = 'Start free, scale as you grow. Cancel anytime.';
            
            titleSection.appendChild(titleElement);
            titleSection.appendChild(subtitleElement);
            
            const navSection = document.createElement('div');
            navSection.className = 'hidden md:flex gap-8';
            
            this.prevButton = document.createElement('button');
            this.prevButton.type = 'button';
            this.prevButton.className = 'focus-visible:ring bg-transparent border-transparent hover:bg-hover disabled:text-disabled disabled:bg-transparent whitespace-nowrap inline-flex align-middle flex-shrink-0 items-center transition-button duration-200 select-none appearance-none no-underline outline-none disabled:pointer-events-none disabled:cursor-default rounded-button justify-center text-base h-42 w-42';
            this.prevButton.innerHTML = `
                <svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" data-testid="KeyboardArrowLeftOutlinedIcon" class="svg-icon icon-md" height="1em" width="1em">
                    <path d="M15.41 16.59 10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"></path>
                </svg>
            `;
            
            this.nextButton = document.createElement('button');
            this.nextButton.type = 'button';
            this.nextButton.className = 'focus-visible:ring bg-transparent border-transparent hover:bg-hover disabled:text-disabled disabled:bg-transparent whitespace-nowrap inline-flex align-middle flex-shrink-0 items-center transition-button duration-200 select-none appearance-none no-underline outline-none disabled:pointer-events-none disabled:cursor-default rounded-button justify-center text-base h-42 w-42';
            this.nextButton.innerHTML = `
                <svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" data-testid="KeyboardArrowRightOutlinedIcon" class="svg-icon icon-md" height="1em" width="1em">
                    <path d="M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"></path>
                </svg>
            `;
            
            navSection.appendChild(this.prevButton);
            navSection.appendChild(this.nextButton);
            
            headerDiv.appendChild(titleSection);
            headerDiv.appendChild(navSection);
            
            return headerDiv;
        }

        createSecuritySection() {
            const section = document.createElement('div');
            section.className = 'security-section mt-80 mb-60';
            
            const container = document.createElement('div');
            container.className = 'max-w-6xl mx-auto';
            
            // Section header
            const header = document.createElement('div');
            header.className = 'text-center mb-32';
            
            const title = document.createElement('h2');
            title.className = 'text-2xl font-semibold mb-12';
            title.textContent = 'Your Music. Protected.';
            
            const subtitle = document.createElement('p');
            subtitle.className = 'text-muted text-base max-w-2xl mx-auto';
            subtitle.textContent = 'Crystal-clear licensing with military-grade security. Own your master, protect your investment.';
            
            header.appendChild(title);
            header.appendChild(subtitle);
            
            // Create responsive security features container
            const securityContainer = this.createSecurityFeaturesContainer();
            
            // Compact license clarity section
            const licenseClaritySection = this.createCompactLicenseWidget();
            
            container.appendChild(header);
            container.appendChild(securityContainer);
            container.appendChild(licenseClaritySection);
            section.appendChild(container);
            
            return section;
        }

        createSecurityFeaturesContainer() {
            const wrapper = document.createElement('div');
            wrapper.className = 'security-features-wrapper mb-40';
            
            // Create navigation for mobile carousel
            const mobileNav = document.createElement('div');
            mobileNav.className = 'flex items-center justify-between mb-20 md:hidden';
            
            const navTitle = document.createElement('h3');
            navTitle.className = 'font-semibold text-base text-main';
            navTitle.textContent = 'Security Features';
            
            const navButtons = document.createElement('div');
            navButtons.className = 'flex gap-8';
            
            const prevBtn = document.createElement('button');
            prevBtn.className = 'security-nav-btn w-32 h-32 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center transition-all duration-200 hover:bg-primary/20';
            prevBtn.innerHTML = '<span class="material-icons text-primary text-16">chevron_left</span>';
            prevBtn.setAttribute('data-security-prev', 'true');
            
            const nextBtn = document.createElement('button');
            nextBtn.className = 'security-nav-btn w-32 h-32 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center transition-all duration-200 hover:bg-primary/20';
            nextBtn.innerHTML = '<span class="material-icons text-primary text-16">chevron_right</span>';
            nextBtn.setAttribute('data-security-next', 'true');
            
            navButtons.appendChild(prevBtn);
            navButtons.appendChild(nextBtn);
            mobileNav.appendChild(navTitle);
            mobileNav.appendChild(navButtons);
            
            // Features container that adapts to screen size
            const featuresContainer = document.createElement('div');
            featuresContainer.className = 'security-features-container overflow-hidden';
            featuresContainer.setAttribute('data-security-container', 'true');
            
            const featuresTrack = document.createElement('div');
            featuresTrack.className = 'security-features-track transition-transform duration-300 ease-out gap-16 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-24';
            featuresTrack.setAttribute('data-security-track', 'true');
            
            const securityFeatures = [
                {
                    icon: 'fingerprint',
                    title: 'BeatPassID',
                    subtitle: 'Fingerprinting',
                    description: 'Cryptographic fingerprints block duplicates automatically.',
                    color: '#10b981',
                    priority: 'high'
                },
                {
                    icon: 'verified_user',
                    title: 'Sample-Safe™',
                    subtitle: 'Guarantee',
                    description: 'Producers warrant all samples are cleared.',
                    color: '#3b82f6',
                    priority: 'high'
                },
                {
                    icon: 'security',
                    title: 'Bank-Grade',
                    subtitle: 'Security',
                    description: 'AES-256 encryption protects your data.',
                    color: '#8b5cf6',
                    priority: 'high'
                },
                {
                    icon: 'gavel',
                    title: 'Clear Legal',
                    subtitle: 'Rights',
                    description: 'You own your master. No hidden clauses.',
                    color: '#f59e0b',
                    priority: 'medium'
                },
                {
                    icon: 'trending_up',
                    title: 'Fair Revenue',
                    subtitle: 'Split',
                    description: '85¢ goes to creators, 15¢ to platform.',
                    color: '#ef4444',
                    priority: 'medium'
                },
                {
                    icon: 'upgrade',
                    title: 'Instant',
                    subtitle: 'Upgrades',
                    description: 'Turn non-exclusive to exclusive anytime.',
                    color: '#06b6d4',
                    priority: 'medium'
                }
            ];
            
            securityFeatures.forEach((feature, index) => {
                const featureCard = document.createElement('div');
                featureCard.className = 'security-feature-card flex-shrink-0 p-20 rounded-lg border bg-paper transition-all duration-200 hover:border-primary/50 hover:shadow-lg md:flex-shrink';
                // Width will be handled by CSS media queries
                featureCard.setAttribute('data-priority', feature.priority);
                
                // Compact card header with icon and title
                const cardHeader = document.createElement('div');
                cardHeader.className = 'flex items-start gap-12 mb-12';
                
                const iconContainer = document.createElement('div');
                iconContainer.className = 'w-40 h-40 rounded-lg flex items-center justify-center flex-shrink-0';
                iconContainer.style.backgroundColor = `${feature.color}15`;
                iconContainer.style.border = `1px solid ${feature.color}30`;
                
                const icon = document.createElement('span');
                icon.className = 'material-icons text-20';
                icon.style.color = feature.color;
                icon.textContent = feature.icon;
                
                const titleContainer = document.createElement('div');
                titleContainer.className = 'flex-1 min-w-0';
                
                const titleElement = document.createElement('h4');
                titleElement.className = 'font-semibold text-base leading-tight mb-2';
                titleElement.textContent = feature.title;
                
                const subtitleElement = document.createElement('div');
                subtitleElement.className = 'text-sm text-primary font-medium';
                subtitleElement.textContent = feature.subtitle;
                
                iconContainer.appendChild(icon);
                titleContainer.appendChild(titleElement);
                titleContainer.appendChild(subtitleElement);
                cardHeader.appendChild(iconContainer);
                cardHeader.appendChild(titleContainer);
                
                const description = document.createElement('p');
                description.className = 'text-sm text-muted leading-relaxed';
                description.textContent = feature.description;
                
                featureCard.appendChild(cardHeader);
                featureCard.appendChild(description);
                featuresTrack.appendChild(featureCard);
            });
            
            featuresContainer.appendChild(featuresTrack);
            
            // Mobile dots indicator
            const dotsContainer = document.createElement('div');
            dotsContainer.className = 'flex justify-center gap-8 mt-20 md:hidden';
            dotsContainer.setAttribute('data-security-dots', 'true');
            
            // Create dots (showing 2 sets on mobile)
            for (let i = 0; i < Math.ceil(securityFeatures.length / 2); i++) {
                const dot = document.createElement('button');
                dot.className = `w-8 h-8 rounded-full transition-all duration-200 ${i === 0 ? 'bg-primary' : 'bg-primary/20'}`;
                dot.setAttribute('data-dot', i.toString());
                dotsContainer.appendChild(dot);
            }
            
            wrapper.appendChild(mobileNav);
            wrapper.appendChild(featuresContainer);
            wrapper.appendChild(dotsContainer);
            
            // Initialize carousel functionality
            this.initializeSecurityCarousel(wrapper);
            
            return wrapper;
        }

        createCompactLicenseWidget() {
            const widget = document.createElement('div');
            widget.className = 'compact-license-widget';
            widget.setAttribute('data-license-clarity', 'true');
            
            // Container with premium styling
            const container = document.createElement('div');
            container.className = 'license-clarity-container';
            
            // Smart Header with better hierarchy
            const header = document.createElement('div');
            header.className = 'license-clarity-header';
            
            const headerIcon = document.createElement('div');
            headerIcon.className = 'license-clarity-header-icon';
            headerIcon.innerHTML = '<span class="material-icons">gavel</span>';
            
            const headerContent = document.createElement('div');
            headerContent.className = 'license-clarity-header-content';
            
            const title = document.createElement('h3');
            title.className = 'license-clarity-title';
            title.textContent = 'License Types at a Glance';
            
            const subtitle = document.createElement('p');
            subtitle.className = 'license-clarity-subtitle';
            subtitle.textContent = 'Smart licensing that scales with your success';
            
            headerContent.appendChild(title);
            headerContent.appendChild(subtitle);
            header.appendChild(headerIcon);
            header.appendChild(headerContent);
            
            // Mobile-First Tabbed Interface
            const tabsContainer = document.createElement('div');
            tabsContainer.className = 'license-clarity-tabs';
            
            const tabNav = document.createElement('div');
            tabNav.className = 'license-tab-nav';
            
            const licenses = [
                {
                    id: 'non-exclusive',
                    type: 'Non-Exclusive',
                    price: 'Included',
                    badge: 'Most Popular',
                    badgeColor: '#10b981',
                    description: 'Perfect for independent artists and streaming',
                    keyPoints: [
                        { icon: 'music_note', title: 'Streaming Ready', desc: 'Spotify, Apple Music, YouTube' },
                        { icon: 'people', title: 'Live Shows', desc: 'Up to 50 tickets' },
                        { icon: 'share', title: 'Shared Beat', desc: 'Others can license too' },
                        { icon: 'account_balance', title: '50-50 Split', desc: 'Fair revenue sharing' }
                    ],
                    color: '#10b981',
                    gradient: 'from-emerald-500/10 to-green-500/5'
                },
                {
                    id: 'exclusive',
                    type: 'Exclusive',
                    price: 'Additional Cost',
                    badge: 'Full Rights',
                    badgeColor: '#f59e0b',
                    description: 'Maximum control and commercial freedom',
                    keyPoints: [
                        { icon: 'workspace_premium', title: 'Everything Above +', desc: 'All non-exclusive rights' },
                        { icon: 'movie', title: 'Sync Rights', desc: 'Films, commercials, TV' },
                        { icon: 'lock', title: 'Beat Removed', desc: 'Exclusively yours' },
                        { icon: 'trending_up', title: '70-30 Split', desc: 'Your favor on revenue' }
                    ],
                    color: '#f59e0b',
                    gradient: 'from-amber-500/10 to-orange-500/5'
                }
            ];
            
            // Create tab buttons
            licenses.forEach((license, index) => {
                const tabButton = document.createElement('button');
                tabButton.className = `license-tab-button ${index === 0 ? 'active' : ''}`;
                tabButton.setAttribute('data-license-tab', license.id);
                tabButton.innerHTML = `
                    <span class="font-medium">${license.type}</span>
                    <span class="text-xs opacity-75">${license.price}</span>
                `;
                
                tabButton.addEventListener('click', () => {
                    this.switchLicenseTab(license.id, widget);
                });
                
                tabNav.appendChild(tabButton);
            });
            
            tabsContainer.appendChild(tabNav);
            
            // Tab Content Container
            const tabContentContainer = document.createElement('div');
            tabContentContainer.className = 'license-tab-content-container';
            
            // Create tab content for each license
            licenses.forEach((license, index) => {
                const tabContent = document.createElement('div');
                tabContent.className = `license-tab-content ${index === 0 ? 'active' : 'hidden'}`;
                tabContent.setAttribute('data-license-content', license.id);
                
                // Modern Card Design
                const licenseCard = document.createElement('div');
                licenseCard.className = 'license-modern-card';
                licenseCard.style.background = `linear-gradient(135deg, ${license.color}08 0%, ${license.color}02 100%)`;
                licenseCard.style.borderColor = `${license.color}20`;
                
                // Card Header with Premium Badge
                const cardHeader = document.createElement('div');
                cardHeader.className = 'license-card-header-modern';
                
                const headerLeft = document.createElement('div');
                headerLeft.className = 'license-header-left';
                
                const iconContainer = document.createElement('div');
                iconContainer.className = 'license-icon-modern';
                iconContainer.style.background = `linear-gradient(135deg, ${license.color}15 0%, ${license.color}08 100%)`;
                iconContainer.innerHTML = `<span class="material-icons" style="color: ${license.color}">${license.id === 'non-exclusive' ? 'groups' : 'star'}</span>`;
                
                const titleContainer = document.createElement('div');
                titleContainer.className = 'license-title-container';
                
                const typeTitle = document.createElement('h4');
                typeTitle.className = 'license-type-title';
                typeTitle.textContent = license.type;
                
                const priceInfo = document.createElement('div');
                priceInfo.className = 'license-price-info';
                priceInfo.textContent = license.price;
                
                titleContainer.appendChild(typeTitle);
                titleContainer.appendChild(priceInfo);
                headerLeft.appendChild(iconContainer);
                headerLeft.appendChild(titleContainer);
                
                const badge = document.createElement('div');
                badge.className = 'license-premium-badge';
                badge.style.background = `${license.badgeColor}15`;
                badge.style.color = license.badgeColor;
                badge.textContent = license.badge;
                
                cardHeader.appendChild(headerLeft);
                cardHeader.appendChild(badge);
                
                // Description
                const description = document.createElement('p');
                description.className = 'license-description';
                description.textContent = license.description;
                
                // Key Points Grid - Optimized for Mobile
                const keyPointsGrid = document.createElement('div');
                keyPointsGrid.className = 'license-key-points-grid';
                
                license.keyPoints.forEach(point => {
                    const pointItem = document.createElement('div');
                    pointItem.className = 'license-key-point';
                    
                    const pointIcon = document.createElement('div');
                    pointIcon.className = 'license-point-icon';
                    pointIcon.style.background = `${license.color}10`;
                    pointIcon.innerHTML = `<span class="material-icons" style="color: ${license.color}">${point.icon}</span>`;
                    
                    const pointContent = document.createElement('div');
                    pointContent.className = 'license-point-content';
                    
                    const pointTitle = document.createElement('div');
                    pointTitle.className = 'license-point-title';
                    pointTitle.textContent = point.title;
                    
                    const pointDesc = document.createElement('div');
                    pointDesc.className = 'license-point-desc';
                    pointDesc.textContent = point.desc;
                    
                    pointContent.appendChild(pointTitle);
                    pointContent.appendChild(pointDesc);
                    pointItem.appendChild(pointIcon);
                    pointItem.appendChild(pointContent);
                    keyPointsGrid.appendChild(pointItem);
                });
                
                licenseCard.appendChild(cardHeader);
                licenseCard.appendChild(description);
                licenseCard.appendChild(keyPointsGrid);
                tabContent.appendChild(licenseCard);
                tabContentContainer.appendChild(tabContent);
            });
            
            // Desktop Comparison Layout
            const desktopComparison = document.createElement('div');
            desktopComparison.className = 'license-clarity-content license-desktop-comparison';
            
            const comparisonGrid = document.createElement('div');
            comparisonGrid.className = 'license-comparison-desktop-grid';
            
            licenses.forEach(license => {
                const desktopCard = this.createDesktopLicenseCard(license);
                comparisonGrid.appendChild(desktopCard);
            });
            
            desktopComparison.appendChild(comparisonGrid);
            
            // Assemble widget
            container.appendChild(header);
            container.appendChild(tabsContainer);
            container.appendChild(tabContentContainer);
            container.appendChild(desktopComparison);
            widget.appendChild(container);
            
            return widget;
        }

        createDesktopLicenseCard(license) {
            const card = document.createElement('div');
            card.className = 'license-desktop-card';
            card.style.background = `linear-gradient(135deg, ${license.color}06 0%, ${license.color}02 100%)`;
            card.style.borderColor = `${license.color}15`;
            
            // Enhanced header with better visual hierarchy
            const header = document.createElement('div');
            header.className = 'license-desktop-header';
            
            const iconBadge = document.createElement('div');
            iconBadge.className = 'license-desktop-icon';
            iconBadge.style.background = `linear-gradient(135deg, ${license.color}20 0%, ${license.color}10 100%)`;
            iconBadge.innerHTML = `<span class="material-icons" style="color: ${license.color}">${license.id === 'non-exclusive' ? 'groups' : 'star'}</span>`;
            
            const headerContent = document.createElement('div');
            headerContent.className = 'license-desktop-header-content';
            
            const titleRow = document.createElement('div');
            titleRow.className = 'license-desktop-title-row';
            
            const title = document.createElement('h4');
            title.className = 'license-desktop-title';
            title.textContent = license.type;
            
            const badge = document.createElement('span');
            badge.className = 'license-desktop-badge';
            badge.style.background = `${license.badgeColor}15`;
            badge.style.color = license.badgeColor;
            badge.textContent = license.badge;
            
            titleRow.appendChild(title);
            titleRow.appendChild(badge);
            
            const priceRow = document.createElement('div');
            priceRow.className = 'license-desktop-price';
            priceRow.textContent = license.price;
            
            const descRow = document.createElement('p');
            descRow.className = 'license-desktop-description';
            descRow.textContent = license.description;
            
            headerContent.appendChild(titleRow);
            headerContent.appendChild(priceRow);
            headerContent.appendChild(descRow);
            header.appendChild(iconBadge);
            header.appendChild(headerContent);
            
            // Feature grid optimized for desktop
            const featuresGrid = document.createElement('div');
            featuresGrid.className = 'license-desktop-features';
            
            license.keyPoints.forEach(point => {
                const feature = document.createElement('div');
                feature.className = 'license-desktop-feature';
                
                const featureIcon = document.createElement('span');
                featureIcon.className = 'material-icons license-desktop-feature-icon';
                featureIcon.style.color = license.color;
                featureIcon.textContent = point.icon;
                
                const featureContent = document.createElement('div');
                featureContent.className = 'license-desktop-feature-content';
                
                const featureTitle = document.createElement('div');
                featureTitle.className = 'license-desktop-feature-title';
                featureTitle.textContent = point.title;
                
                const featureDesc = document.createElement('div');
                featureDesc.className = 'license-desktop-feature-desc';
                featureDesc.textContent = point.desc;
                
                featureContent.appendChild(featureTitle);
                featureContent.appendChild(featureDesc);
                feature.appendChild(featureIcon);
                feature.appendChild(featureContent);
                featuresGrid.appendChild(feature);
            });
            
            card.appendChild(header);
            card.appendChild(featuresGrid);
            
            return card;
        }

        switchLicenseTab(licenseId, widget) {
            // Update tab buttons
            const tabButtons = widget.querySelectorAll('.license-tab-button');
            tabButtons.forEach(button => {
                if (button.getAttribute('data-license-tab') === licenseId) {
                    button.classList.add('active');
                } else {
                    button.classList.remove('active');
                }
            });
            
            // Update content with smooth transitions
            const contentPanels = widget.querySelectorAll('.license-tab-content');
            contentPanels.forEach(panel => {
                if (panel.getAttribute('data-license-content') === licenseId) {
                    panel.classList.remove('hidden');
                    panel.classList.add('active');
                } else {
                    panel.classList.add('hidden');
                    panel.classList.remove('active');
                }
            });
        }

        initializeSecurityCarousel(wrapper) {
            const track = wrapper.querySelector('[data-security-track]');
            const prevBtn = wrapper.querySelector('[data-security-prev]');
            const nextBtn = wrapper.querySelector('[data-security-next]');
            const dots = wrapper.querySelectorAll('[data-dot]');
            const cards = track.querySelectorAll('.security-feature-card');
            
            let currentIndex = 0;
            const cardsPerView = 2; // Show 2 cards at a time on mobile
            const maxIndex = Math.max(0, Math.ceil(cards.length / cardsPerView) - 1);
            
            function updateCarousel() {
                // Only apply transform on mobile
                if (window.innerWidth < 768) {
                    // Calculate transform based on container width and card dimensions
                    // Each card is 50% - 4px, gap is 8px
                    // Move by 2 cards + 1 gap for each position
                    const container = track.parentElement;
                    const containerWidth = container.offsetWidth;
                    const cardWidth = (containerWidth / 2) - 4; // 50% - 4px
                    const gap = 8;
                    const moveDistance = (cardWidth * 2) + gap; // 2 cards + 1 gap
                    const translateX = currentIndex * -moveDistance;
                    
                    track.style.transform = `translateX(${translateX}px)`;
                    
                    // Update dots
                    dots.forEach((dot, index) => {
                        dot.className = `w-8 h-8 rounded-full transition-all duration-200 ${
                            index === currentIndex ? 'bg-primary' : 'bg-primary/20'
                        }`;
                    });
                    
                    // Update navigation buttons
                    prevBtn.disabled = currentIndex === 0;
                    nextBtn.disabled = currentIndex === maxIndex;
                    
                    prevBtn.style.opacity = currentIndex === 0 ? '0.5' : '1';
                    nextBtn.style.opacity = currentIndex === maxIndex ? '0.5' : '1';
                } else {
                    // Reset transform on larger screens
                    track.style.transform = '';
                }
            }
            
            // Navigation event listeners
            prevBtn.addEventListener('click', () => {
                if (currentIndex > 0) {
                    currentIndex--;
                    updateCarousel();
                }
            });
            
            nextBtn.addEventListener('click', () => {
                if (currentIndex < maxIndex) {
                    currentIndex++;
                    updateCarousel();
                }
            });
            
            // Dot navigation
            dots.forEach((dot, index) => {
                dot.addEventListener('click', () => {
                    currentIndex = index;
                    updateCarousel();
                });
            });
            
            // Touch/swipe support
            let startX = 0;
            let isDragging = false;
            
            track.addEventListener('touchstart', (e) => {
                if (window.innerWidth >= 768) return;
                startX = e.touches[0].clientX;
                isDragging = true;
            });
            
            track.addEventListener('touchmove', (e) => {
                if (!isDragging || window.innerWidth >= 768) return;
                e.preventDefault();
            });
            
            track.addEventListener('touchend', (e) => {
                if (!isDragging || window.innerWidth >= 768) return;
                
                const endX = e.changedTouches[0].clientX;
                const diffX = startX - endX;
                
                if (Math.abs(diffX) > 50) { // Minimum swipe distance
                    if (diffX > 0 && currentIndex < maxIndex) {
                        currentIndex++;
                    } else if (diffX < 0 && currentIndex > 0) {
                        currentIndex--;
                    }
                    updateCarousel();
                }
                
                isDragging = false;
            });
            
            // Handle resize
            window.addEventListener('resize', () => {
                updateCarousel();
            });
            
                        // Initial setup
            updateCarousel();
        }

        createLicenseComparisonWidget() {
            const widget = document.createElement('div');
            widget.className = 'license-comparison-widget bg-paper/50 backdrop-blur-sm border border-border p-32 max-w-4xl mx-auto';
            widget.style.borderRadius = '16px';
            widget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)';
            widget.style.backdropFilter = 'blur(12px)';
            widget.style.border = '1px solid rgba(255, 255, 255, 0.1)';
            
            const header = document.createElement('div');
            header.className = 'text-center mb-32';
            
            const title = document.createElement('h3');
            title.className = 'text-xl font-semibold mb-8';
            title.textContent = 'License Types Explained';
            
            const subtitle = document.createElement('p');
            subtitle.className = 'text-muted text-sm';
            subtitle.textContent = 'Understand the difference between non-exclusive and exclusive licensing';
            
            header.appendChild(title);
            header.appendChild(subtitle);
            
            const comparisonGrid = document.createElement('div');
            comparisonGrid.className = 'grid gap-20 md:grid-cols-2';
            
            const nonExclusiveCard = document.createElement('div');
            nonExclusiveCard.className = 'license-type-card p-24 border bg-paper';
            nonExclusiveCard.style.borderRadius = '12px';
            nonExclusiveCard.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)';
            nonExclusiveCard.style.border = '1px solid rgba(255, 255, 255, 0.1)';
            
            const exclusiveCard = document.createElement('div');
            exclusiveCard.className = 'license-type-card p-24 border bg-paper relative overflow-hidden';
            exclusiveCard.style.borderRadius = '12px';
            exclusiveCard.style.borderColor = 'rgba(0, 123, 255, 0.3)';
            exclusiveCard.style.background = 'linear-gradient(135deg, rgba(0, 123, 255, 0.05) 0%, rgba(0, 123, 255, 0.02) 100%)';
            
            // Add shine effect to exclusive card
            const shineOverlay = document.createElement('div');
            shineOverlay.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 2px;
                background: linear-gradient(90deg, transparent 0%, rgba(0, 123, 255, 0.8) 50%, transparent 100%);
                animation: shimmer 2s ease-in-out infinite;
                border-radius: 12px 12px 0 0;
            `;
            exclusiveCard.appendChild(shineOverlay);
            
            nonExclusiveCard.innerHTML = `
                <div class="flex items-center gap-12 mb-16">
                    <div class="w-40 h-40 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <span class="material-icons text-blue-500 text-18">groups</span>
                    </div>
                    <h4 class="font-semibold text-base">Non-Exclusive</h4>
                </div>
                <div class="space-y-12 mb-20">
                    <div class="flex items-start gap-8">
                        <span class="material-icons text-green-500 text-16 mt-2">check_circle</span>
                        <div>
                            <div class="font-medium text-sm">Streaming & Distribution</div>
                            <div class="text-xs text-muted">Spotify, Apple Music, etc.</div>
                        </div>
                    </div>
                    <div class="flex items-start gap-8">
                        <span class="material-icons text-green-500 text-16 mt-2">check_circle</span>
                        <div>
                            <div class="font-medium text-sm">Live Shows ≤ 50 tickets</div>
                            <div class="text-xs text-muted">Perfect for starting artists</div>
                        </div>
                    </div>
                    <div class="flex items-start gap-8">
                        <span class="material-icons text-yellow-500 text-16 mt-2">info</span>
                        <div>
                            <div class="font-medium text-sm">Shared Beat</div>
                            <div class="text-xs text-muted">Others can license too</div>
                        </div>
                    </div>
                </div>
                <div class="text-center">
                    <div class="text-primary font-semibold">Included in Plans</div>
                </div>
            `;
            
            exclusiveCard.innerHTML = `
                <div class="flex items-center gap-12 mb-16">
                    <div class="w-40 h-40 rounded-full bg-primary/10 flex items-center justify-center">
                        <span class="material-icons text-primary text-18">star</span>
                    </div>
                    <h4 class="font-semibold text-base">Exclusive</h4>
                    <div class="ml-auto">
                        <span class="text-xs bg-primary/10 text-primary px-8 py-4 rounded">Recommended</span>
                    </div>
                </div>
                <div class="space-y-12 mb-20">
                    <div class="flex items-start gap-8">
                        <span class="material-icons text-green-500 text-16 mt-2">check_circle</span>
                        <div>
                            <div class="font-medium text-sm">Everything Non-Exclusive</div>
                            <div class="text-xs text-muted">Plus unlimited usage rights</div>
                        </div>
                    </div>
                    <div class="flex items-start gap-8">
                        <span class="material-icons text-green-500 text-16 mt-2">check_circle</span>
                        <div>
                            <div class="font-medium text-sm">Sync/Film Licensing</div>
                            <div class="text-xs text-muted">Movies, commercials, TV</div>
                        </div>
                    </div>
                    <div class="flex items-start gap-8">
                        <span class="material-icons text-green-500 text-16 mt-2">check_circle</span>
                        <div>
                            <div class="font-medium text-sm">Beat Removed from Catalog</div>
                            <div class="text-xs text-muted">You own it exclusively</div>
                        </div>
                    </div>
                </div>
                <div class="text-center">
                    <div class="text-primary font-semibold">Additional Purchase</div>
                    <div class="text-xs text-muted">Members get discounts</div>
                </div>
            `;
            
            comparisonGrid.appendChild(nonExclusiveCard);
            comparisonGrid.appendChild(exclusiveCard);
            
            widget.appendChild(header);
            widget.appendChild(comparisonGrid);
            
            return widget;
        }

        createFinalCTASection() {
            const section = document.createElement('div');
            section.className = 'final-cta-section mt-60 mb-80';
            
            const container = document.createElement('div');
            container.className = 'max-w-4xl mx-auto text-center';
            
            const ctaCard = document.createElement('div');
            ctaCard.className = 'final-cta-card p-40 md:p-48 relative overflow-hidden';
            ctaCard.style.borderRadius = '20px';
            ctaCard.style.background = 'linear-gradient(135deg, rgba(0, 123, 255, 0.08) 0%, rgba(16, 185, 129, 0.06) 50%, rgba(139, 92, 246, 0.08) 100%)';
            ctaCard.style.border = '1px solid rgba(255, 255, 255, 0.1)';
            ctaCard.style.backdropFilter = 'blur(12px)';
            
            // Add animated background
            const bgOverlay = document.createElement('div');
            bgOverlay.className = 'absolute inset-0 opacity-50';
            bgOverlay.style.background = 'radial-gradient(ellipse at center, rgba(0, 123, 255, 0.1) 0%, transparent 70%)';
            bgOverlay.style.animation = 'ctaGlow 6s ease-in-out infinite alternate';
            ctaCard.appendChild(bgOverlay);
            
            const title = document.createElement('h2');
            title.className = 'text-3xl font-bold mb-16 relative z-10';
            title.textContent = 'Ready to Start Creating?';
            
            const subtitle = document.createElement('p');
            subtitle.className = 'text-lg text-muted mb-32 max-w-2xl mx-auto relative z-10';
            subtitle.textContent = 'Join thousands of artists who trust BeatPass for their music production needs. Start with our free Explorer plan or unlock unlimited beats today.';
            
            const ctaButtons = document.createElement('div');
            ctaButtons.className = 'flex flex-col md:flex-row gap-16 justify-center items-center relative z-10';
            
            const primaryCTA = document.createElement('a');
            primaryCTA.className = 'hero-primary-cta';
            primaryCTA.href = '#pricing-plans';
            primaryCTA.innerHTML = `
                <span class="material-icons">rocket_launch</span>
                <span>Start Your Journey</span>
                <span class="material-icons">arrow_forward</span>
            `;
            
            const secondaryCTA = document.createElement('a');
            secondaryCTA.className = 'hero-secondary-cta';
            secondaryCTA.href = 'https://discord.com/invite/N257QBkSeg';
            secondaryCTA.target = '_blank';
            secondaryCTA.rel = 'noopener noreferrer';
            secondaryCTA.innerHTML = `
                <div class="secondary-cta-content">
                    <span class="material-icons">groups</span>
                    <span>Join the Community</span>
                    <span class="material-icons">open_in_new</span>
                </div>
            `;
            
            // Add smooth scroll to pricing plans
            primaryCTA.addEventListener('click', (e) => {
                e.preventDefault();
                const pricingSection = document.querySelector('.pricing-carousel-container');
                if (pricingSection) {
                    pricingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
            
            ctaButtons.appendChild(primaryCTA);
            ctaButtons.appendChild(secondaryCTA);
            
            // Trust seal
            const trustSeal = this.createStripeTrustSeal();
            trustSeal.style.marginTop = '24px';
            
            ctaCard.appendChild(title);
            ctaCard.appendChild(subtitle);
            ctaCard.appendChild(ctaButtons);
            ctaCard.appendChild(trustSeal);
            
            container.appendChild(ctaCard);
            section.appendChild(container);
            
            return section;
        }

        createFeatureExplanationSection() {
            const sectionContainer = document.createElement('div');
            sectionContainer.className = 'mt-60 mb-40';
            
            const sectionTitle = document.createElement('h2');
            sectionTitle.className = 'text-2xl font-semibold text-center mb-40';
            sectionTitle.textContent = 'Everything you need to create, collaborate, and grow';
            
            // Create tab navigation
            const tabNav = document.createElement('div');
            tabNav.className = 'flex flex-wrap justify-center gap-8 mb-32 border-b border-border';
            tabNav.setAttribute('data-tab-nav', 'true');
            
            const plans = [
                { id: 'explorer', name: 'Explorer', subtitle: 'Free', color: 'text-muted' },
                { id: 'classic', name: 'Classic', subtitle: '$29/mo', color: 'text-primary' },
                { id: 'plus', name: 'Plus', subtitle: '$45/mo', color: 'text-blue-400' },
                { id: 'pro', name: 'Pro', subtitle: '$59/mo', color: 'text-purple-400' }
            ];
            
            plans.forEach((plan, index) => {
                const tabButton = document.createElement('button');
                tabButton.className = `plan-tab px-16 py-12 text-sm font-medium border-b-2 transition-all duration-200 ${index === 0 ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-main hover:border-border'}`;
                tabButton.setAttribute('data-plan-tab', plan.id);
                tabButton.innerHTML = `
                    <div class="flex flex-col items-center gap-4">
                        <span class="font-semibold">${plan.name}</span>
                        <span class="text-xs ${plan.color}">${plan.subtitle}</span>
                    </div>
                `;
                
                tabButton.addEventListener('click', () => {
                    this.switchPlanTab(plan.id);
                });
                
                tabNav.appendChild(tabButton);
            });
            
            // Create tab content container
            const tabContent = document.createElement('div');
            tabContent.className = 'plan-content-container';
            tabContent.setAttribute('data-features-grid', 'true');
            
            // Define plan features with proper icons
            const planFeatures = {
                explorer: {
                    title: 'Perfect for music discovery and community connection',
                    features: [
                        {
                            title: 'Lossless Streaming & Playlist Tools',
                            description: 'Experience studio-quality audio with our lossless streaming technology. Create, organize, and manage custom playlists.',
                            icon: 'music_note'
                        },
                        {
                            title: 'Like, Comment & Save Unlimited Beats',
                            description: 'Engage with the community and build your personal collection by saving unlimited beats to revisit later.',
                            icon: 'favorite'
                        },
                        {
                            title: 'Connect and Follow Producers & Engineers',
                            description: 'Build your network by connecting with talented producers and engineers. Stay updated with their latest releases.',
                            icon: 'people'
                        },
                        {
                            title: 'Real-Time Notifications',
                            description: 'Never miss out on new releases, comments, or messages. Get instant notifications for all activities.',
                            icon: 'notifications'
                        }
                    ]
                },
                classic: {
                    title: 'Everything in Explorer, plus unlimited downloads for independent artists',
                    features: [
                        {
                            title: 'All Explorer Features',
                            description: 'Includes lossless streaming, community features, networking tools, and real-time notifications.',
                            icon: 'check_circle'
                        },
                        {
                            title: 'Unlimited Non-Exclusive Downloads',
                            description: 'Download as many non-exclusive beats as you want. Perfect for creating demos and building your catalog.',
                            icon: 'download'
                        },
                        {
                            title: 'Download Exclusive Beats Demos',
                            description: 'Access exclusive beat demos for non-commercial use. Preview premium content and get inspired.',
                            icon: 'star'
                        },
                        {
                            title: 'Exclusive Licensing Discounts',
                            description: 'Save money on beat licenses with exclusive member discounts. Get better deals on commercial rights.',
                            icon: 'local_offer'
                        }
                    ]
                },
                plus: {
                    title: 'Everything in Classic, plus custom requests and deeper discounts',
                    features: [
                        {
                            title: 'All Classic Features',
                            description: 'Includes unlimited downloads, exclusive demos, licensing discounts, and all Explorer features.',
                            icon: 'check_circle'
                        },
                        {
                            title: 'Monthly Free Custom Requests (1 per month)',
                            description: 'Get custom beats made just for you. Work directly with producers to bring your vision to life.',
                            icon: 'palette'
                        },
                        {
                            title: 'Enhanced Mixing & Mastering Discounts',
                            description: 'Professional mixing and mastering at discounted rates. Polish your tracks with industry-standard services.',
                            icon: 'tune'
                        },
                        {
                            title: 'Priority Support',
                            description: 'Get faster response times and dedicated support to help you make the most of your subscription.',
                            icon: 'support_agent'
                        }
                    ]
                },
                pro: {
                    title: 'Everything in Plus, plus maximum flexibility and premium perks',
                    features: [
                        {
                            title: 'All Plus Features',
                            description: 'Includes custom requests, enhanced discounts, priority support, and all lower-tier features.',
                            icon: 'check_circle'
                        },
                        {
                            title: 'Monthly Free Custom Requests (5 per month)',
                            description: 'Five custom beats per month. Perfect for serious artists who need regular custom content.',
                            icon: 'auto_awesome'
                        },
                        {
                            title: 'Studio Recording Discounts',
                            description: 'Access to discounted studio time at our partner studios. Record in professional environments.',
                            icon: 'mic'
                        },
                        {
                            title: 'VIP Community Access',
                            description: 'Join exclusive producer meetups, early access to new features, and direct feedback opportunities.',
                            icon: 'workspace_premium'
                        }
                    ]
                }
            };
            
            // Create content for each plan
            Object.keys(planFeatures).forEach((planId, index) => {
                const planData = planFeatures[planId];
                const planContentDiv = document.createElement('div');
                planContentDiv.className = `plan-content ${index === 0 ? 'active' : 'hidden'}`;
                planContentDiv.setAttribute('data-plan-content', planId);
                
                const planTitle = document.createElement('p');
                planTitle.className = 'text-center text-muted mb-32 max-w-2xl mx-auto';
                planTitle.textContent = planData.title;
                
                const featuresGrid = document.createElement('div');
                featuresGrid.className = 'grid gap-16 md:gap-20 md:grid-cols-2';
                
                planData.features.forEach(feature => {
                    const featureCard = document.createElement('div');
                    featureCard.className = 'feature-card p-20 md:p-24 rounded-lg border bg-paper hover:shadow-lg transition-all duration-200 hover:border-primary';
                    
                    const cardHeader = document.createElement('div');
                    cardHeader.className = 'flex items-start gap-12 mb-12';
                    
                    const iconContainer = document.createElement('div');
                    iconContainer.className = 'flex-shrink-0 w-40 h-40 rounded-full bg-primary/10 flex items-center justify-center';
                    
                    const icon = document.createElement('span');
                    icon.className = 'material-icons text-primary text-18';
                    icon.textContent = feature.icon;
                    
                    const titleSpan = document.createElement('h3');
                    titleSpan.className = 'font-semibold text-base leading-tight';
                    titleSpan.textContent = feature.title;
                    
                    iconContainer.appendChild(icon);
                    cardHeader.appendChild(iconContainer);
                    cardHeader.appendChild(titleSpan);
                    
                    const description = document.createElement('p');
                    description.className = 'text-sm text-muted leading-relaxed ml-52';
                    description.textContent = feature.description;
                    
                    featureCard.appendChild(cardHeader);
                    featureCard.appendChild(description);
                    featuresGrid.appendChild(featureCard);
                });
                
                planContentDiv.appendChild(planTitle);
                planContentDiv.appendChild(featuresGrid);
                tabContent.appendChild(planContentDiv);
            });
            
            sectionContainer.appendChild(sectionTitle);
            sectionContainer.appendChild(tabNav);
            sectionContainer.appendChild(tabContent);
            
            return sectionContainer;
        }

        switchPlanTab(planId) {
            // Update tab buttons
            const tabButtons = document.querySelectorAll('[data-plan-tab]');
            tabButtons.forEach(button => {
                if (button.getAttribute('data-plan-tab') === planId) {
                    button.className = button.className.replace('border-transparent text-muted', 'border-primary text-primary');
                } else {
                    button.className = button.className.replace('border-primary text-primary', 'border-transparent text-muted');
                }
            });
            
            // Update content
            const contentPanels = document.querySelectorAll('[data-plan-content]');
            contentPanels.forEach(panel => {
                if (panel.getAttribute('data-plan-content') === planId) {
                    panel.classList.remove('hidden');
                    panel.classList.add('active');
                } else {
                    panel.classList.add('hidden');
                    panel.classList.remove('active');
                }
            });
        }



        createLicenseItem(item, isOpen = false) {
            const itemDiv = document.createElement('div');
            itemDiv.className = `license-item border border-border rounded-lg mb-12 overflow-hidden transition-all duration-200 hover:border-primary/50 ${isOpen ? 'license-item-open' : ''}`;
            itemDiv.setAttribute('data-license-item', item.id);
            
            // Question button (like FAQ)
            const questionButton = document.createElement('button');
            questionButton.className = 'license-question w-full text-left p-20 md:p-24 bg-transparent hover:bg-primary/5 transition-colors duration-200 focus:outline-none focus:bg-primary/5';
            questionButton.setAttribute('data-license-toggle', item.id);
            
            const questionContent = document.createElement('div');
            questionContent.className = 'flex items-center justify-between gap-20';
            
            const questionText = document.createElement('h3');
            questionText.className = 'font-semibold text-base leading-snug flex-1 pr-4';
            questionText.textContent = item.title;
            
            const chevronIcon = document.createElement('span');
            chevronIcon.className = 'material-icons text-18 text-muted transition-transform duration-200 flex-shrink-0';
            chevronIcon.textContent = isOpen ? 'expand_less' : 'expand_more';
            chevronIcon.setAttribute('data-license-chevron', item.id);
            
            questionContent.appendChild(questionText);
            questionContent.appendChild(chevronIcon);
            questionButton.appendChild(questionContent);
            
            // Answer container
            const answerContainer = document.createElement('div');
            answerContainer.className = 'license-answer overflow-hidden transition-all duration-300 ease-in-out';
            answerContainer.setAttribute('data-license-answer', item.id);
            answerContainer.style.maxHeight = isOpen ? 'none' : '0';
            
            const answerContent = document.createElement('div');
            answerContent.className = 'p-20 md:p-24 pt-0';
            answerContent.appendChild(item.content);
            
            answerContainer.appendChild(answerContent);
            
            itemDiv.appendChild(questionButton);
            itemDiv.appendChild(answerContainer);
            
            return itemDiv;
        }

        createLicenseRights() {
            const container = document.createElement('div');
            container.className = 'grid gap-16 md:gap-20 md:grid-cols-2';
            
            const rights = [
                {
                    icon: 'public',
                    title: 'Release Everywhere',
                    desc: 'Spotify, Apple Music, Bandcamp and more, day-one.'
                },
                {
                    icon: 'theater_comedy',
                    title: 'Live Shows ≤ 50 tickets',
                    desc: 'No extra fees for your first gigs.'
                },
                {
                    icon: 'my_library_music',
                    title: 'Keep Your Master',
                    desc: 'You own the finished song; we only license the beat.'
                },
                {
                    icon: 'upgrade',
                    title: 'Upgrade Anytime',
                    desc: 'Flip to Exclusive in two clicks if it hasn\'t sold yet.'
                }
            ];
            
            rights.forEach(right => {
                const rightCard = document.createElement('div');
                rightCard.className = 'feature-card p-20 md:p-24 rounded-lg border bg-paper hover:shadow-lg transition-all duration-200 hover:border-primary';
                
                const cardHeader = document.createElement('div');
                cardHeader.className = 'flex items-start gap-12 mb-12';
                
                const iconContainer = document.createElement('div');
                iconContainer.className = 'flex-shrink-0 w-40 h-40 rounded-full bg-primary/10 flex items-center justify-center';
                
                const icon = document.createElement('span');
                icon.className = 'material-icons text-primary text-18';
                icon.textContent = right.icon;
                
                const titleSpan = document.createElement('h4');
                titleSpan.className = 'font-semibold text-base leading-tight';
                titleSpan.textContent = right.title;
                
                iconContainer.appendChild(icon);
                cardHeader.appendChild(iconContainer);
                cardHeader.appendChild(titleSpan);
                
                const description = document.createElement('p');
                description.className = 'text-sm text-muted leading-relaxed ml-52';
                description.textContent = right.desc;
                
                rightCard.appendChild(cardHeader);
                rightCard.appendChild(description);
                container.appendChild(rightCard);
            });
            
            return container;
        }

        createSampleSafety() {
            const container = document.createElement('div');
            container.className = 'feature-card p-20 md:p-24 rounded-lg border bg-paper';
            
            const header = document.createElement('div');
            header.className = 'flex items-start gap-12 mb-16';
            
            const iconContainer = document.createElement('div');
            iconContainer.className = 'flex-shrink-0 w-40 h-40 rounded-full bg-green-500/10 flex items-center justify-center';
            
            const icon = document.createElement('span');
            icon.className = 'material-icons text-green-500 text-18';
            icon.textContent = 'verified_user';
            
            const headerText = document.createElement('div');
            headerText.className = 'flex-1';
            
            const title = document.createElement('h4');
            title.className = 'font-semibold text-base leading-tight mb-4';
            title.textContent = 'Sample-Safe™ Producer Pledge';
            
            const subtitle = document.createElement('p');
            subtitle.className = 'text-sm text-muted leading-relaxed';
            subtitle.textContent = 'Every producer warrants all samples are cleared and indemnifies you & BeatPass against claims.';
            
            iconContainer.appendChild(icon);
            headerText.appendChild(title);
            headerText.appendChild(subtitle);
            header.appendChild(iconContainer);
            header.appendChild(headerText);
            
            const legalLink = document.createElement('a');
            legalLink.className = 'text-sm text-primary hover:underline transition-colors duration-200 ml-52';
            legalLink.textContent = 'Read Clause 11 & 12 →';
            legalLink.href = '#';
            legalLink.addEventListener('click', (e) => {
                e.preventDefault();
                log('Legal terms link clicked');
            });
            
            container.appendChild(header);
            container.appendChild(legalLink);
            
            return container;
        }

        createUsageLimits() {
            const container = document.createElement('div');
            container.className = 'feature-card p-20 md:p-24 rounded-lg border bg-paper';
            
            const header = document.createElement('div');
            header.className = 'flex items-start gap-12 mb-16';
            
            const iconContainer = document.createElement('div');
            iconContainer.className = 'flex-shrink-0 w-40 h-40 rounded-full bg-primary/10 flex items-center justify-center';
            
            const icon = document.createElement('span');
            icon.className = 'material-icons text-primary text-18';
            icon.textContent = 'trending_up';
            
            const title = document.createElement('h4');
            title.className = 'font-semibold text-base leading-tight';
            title.textContent = 'Usage Caps at a Glance';
            
            iconContainer.appendChild(icon);
            header.appendChild(iconContainer);
            header.appendChild(title);
            
            const limitsGrid = document.createElement('div');
            limitsGrid.className = 'ml-52 space-y-8';
            
            const limits = [
                { label: '50-ticket live shows', status: 'included', color: 'green' },
                { label: '10k streams', status: 'included', color: 'green' },
                { label: 'Sync/Film licensing', status: 'exclusive', color: 'yellow' }
            ];
            
            limits.forEach(limit => {
                const limitItem = document.createElement('div');
                limitItem.className = 'flex items-center gap-8';
                
                const dot = document.createElement('div');
                dot.className = `w-8 h-8 rounded-full ${limit.color === 'green' ? 'bg-green-500' : 'bg-yellow-500'}`;
                
                const text = document.createElement('span');
                text.className = 'text-sm text-muted';
                text.textContent = limit.label;
                
                const badge = document.createElement('span');
                badge.className = `text-xs px-8 py-2 rounded ${limit.status === 'included' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`;
                badge.textContent = limit.status === 'included' ? 'Included' : 'Needs exclusive';
                
                limitItem.appendChild(dot);
                limitItem.appendChild(text);
                limitItem.appendChild(badge);
                limitsGrid.appendChild(limitItem);
            });
            
            const subcaption = document.createElement('p');
            subcaption.className = 'text-xs text-muted italic ml-52 mt-12';
            subcaption.textContent = 'Hit a wall? Upgrade to Exclusive in two clicks.';
            
            container.appendChild(header);
            container.appendChild(limitsGrid);
            container.appendChild(subcaption);
            
            return container;
        }

        createLicenseComparison() {
            const container = document.createElement('div');
            
            const comparisonGrid = document.createElement('div');
            comparisonGrid.className = 'grid gap-16 md:grid-cols-2';
            
            const nonExclusive = {
                title: 'Non-Exclusive',
                items: [
                    { label: 'Revenue Split', value: '50-50 with producer', icon: 'groups' },
                    { label: 'Beat Availability', value: 'Shared catalog, others can license', icon: 'visibility' },
                    { label: 'Video/Radio Rights', value: 'Limited commercial use', icon: 'videocam_off' },
                    { label: 'Cost', value: 'Included in subscription', icon: 'attach_money' }
                ]
            };
            
            const exclusive = {
                title: 'Exclusive',
                items: [
                    { label: 'Revenue Split', value: '70-30 in your favor', icon: 'trending_up' },
                    { label: 'Beat Availability', value: 'Removed from catalog', icon: 'visibility_off' },
                    { label: 'Video/Radio Rights', value: 'Full commercial rights', icon: 'videocam' },
                    { label: 'Cost', value: 'Additional purchase required', icon: 'paid' }
                ]
            };
            
            [nonExclusive, exclusive].forEach(type => {
                const typeCard = document.createElement('div');
                typeCard.className = 'feature-card p-20 md:p-24 rounded-lg border bg-paper';
                
                const typeTitle = document.createElement('h4');
                typeTitle.className = 'font-semibold text-base leading-tight mb-16 text-center';
                typeTitle.textContent = type.title;
                
                const itemsList = document.createElement('div');
                itemsList.className = 'space-y-12';
                
                type.items.forEach(item => {
                    const itemDiv = document.createElement('div');
                    itemDiv.className = 'flex items-start gap-8';
                    
                    const iconDiv = document.createElement('div');
                    iconDiv.className = 'flex-shrink-0 w-20 h-20 rounded bg-primary/10 flex items-center justify-center';
                    
                    const icon = document.createElement('span');
                    icon.className = 'material-icons text-primary text-12';
                    icon.textContent = item.icon;
                    
                    const textDiv = document.createElement('div');
                    textDiv.className = 'flex-1';
                    
                    const label = document.createElement('div');
                    label.className = 'font-medium text-sm mb-2';
                    label.textContent = item.label;
                    
                    const value = document.createElement('div');
                    value.className = 'text-xs text-muted';
                    value.textContent = item.value;
                    
                    iconDiv.appendChild(icon);
                    textDiv.appendChild(label);
                    textDiv.appendChild(value);
                    itemDiv.appendChild(iconDiv);
                    itemDiv.appendChild(textDiv);
                    itemsList.appendChild(itemDiv);
                });
                
                typeCard.appendChild(typeTitle);
                typeCard.appendChild(itemsList);
                comparisonGrid.appendChild(typeCard);
            });
            
            container.appendChild(comparisonGrid);
            return container;
        }

        bindLicenseAccordion(section) {
            const toggleButtons = section.querySelectorAll('[data-license-toggle]');
            
            toggleButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const itemId = button.getAttribute('data-license-toggle');
                    const item = section.querySelector(`[data-license-item="${itemId}"]`);
                    const answer = section.querySelector(`[data-license-answer="${itemId}"]`);
                    const chevron = section.querySelector(`[data-license-chevron="${itemId}"]`);
                    
                    const isOpen = item.classList.contains('license-item-open');
                    
                    if (isOpen) {
                        // Close
                        answer.style.maxHeight = '0';
                        chevron.textContent = 'expand_more';
                        item.classList.remove('license-item-open');
                    } else {
                        // Close all others first
                        toggleButtons.forEach(otherButton => {
                            if (otherButton !== button) {
                                const otherId = otherButton.getAttribute('data-license-toggle');
                                const otherItem = section.querySelector(`[data-license-item="${otherId}"]`);
                                const otherAnswer = section.querySelector(`[data-license-answer="${otherId}"]`);
                                const otherChevron = section.querySelector(`[data-license-chevron="${otherId}"]`);
                                
                                otherAnswer.style.maxHeight = '0';
                                otherChevron.textContent = 'expand_more';
                                otherItem.classList.remove('license-item-open');
                            }
                        });
                        
                        // Open this one
                        answer.style.maxHeight = answer.scrollHeight + 'px';
                        chevron.textContent = 'expand_less';
                        item.classList.add('license-item-open');
                    }
                });
            });
        }

        bindLicenseComparisonEvents(widget) {
            const toggleOptions = widget.querySelectorAll('.license-toggle-option');
            
            toggleOptions.forEach(option => {
                option.addEventListener('click', () => {
                    const licenseType = option.getAttribute('data-license-type');
                    
                    // Update active state
                    toggleOptions.forEach(opt => opt.classList.remove('active'));
                    option.classList.add('active');
                    
                    // Update columns
                    this.updateLicenseComparison(widget, licenseType);
                });
            });
        }

        updateLicenseComparison(widget, licenseType) {
            const nonExclusiveColumn = widget.querySelector('[data-license-column="non-exclusive"]');
            const exclusiveColumn = widget.querySelector('[data-license-column="exclusive"]');
            
            // Update highlight state
            if (licenseType === 'non-exclusive') {
                nonExclusiveColumn.classList.add('highlight');
                exclusiveColumn.classList.remove('highlight');
            } else {
                exclusiveColumn.classList.add('highlight');
                nonExclusiveColumn.classList.remove('highlight');
            }
            
            // Update content based on selection
            const comparisonData = {
                'non-exclusive': {
                    nonExclusive: [
                        { 
                            icon: 'groups', 
                            iconType: 'info',
                            label: 'Revenue Split', 
                            value: '50-50 with producer' 
                        },
                        { 
                            icon: 'visibility', 
                            iconType: 'info',
                            label: 'Beat Availability', 
                            value: 'Shared catalog, others can license' 
                        },
                        { 
                            icon: 'videocam_off', 
                            iconType: 'warning',
                            label: 'Video/Radio Rights', 
                            value: 'Limited commercial use' 
                        },
                        { 
                            icon: 'attach_money', 
                            iconType: 'success',
                            label: 'Cost', 
                            value: 'Included in subscription' 
                        }
                    ],
                    exclusive: [
                        { 
                            icon: 'trending_up', 
                            iconType: 'success',
                            label: 'Revenue Split', 
                            value: '70-30 in your favor' 
                        },
                        { 
                            icon: 'visibility_off', 
                            iconType: 'success',
                            label: 'Beat Availability', 
                            value: 'Removed from catalog' 
                        },
                        { 
                            icon: 'videocam', 
                            iconType: 'success',
                            label: 'Video/Radio Rights', 
                            value: 'Full commercial rights' 
                        },
                        { 
                            icon: 'paid', 
                            iconType: 'warning',
                            label: 'Cost', 
                            value: 'Additional purchase required' 
                        }
                    ]
                },
                'exclusive': {
                    nonExclusive: [
                        { 
                            icon: 'groups', 
                            iconType: 'warning',
                            label: 'Revenue Split', 
                            value: '50-50 with producer' 
                        },
                        { 
                            icon: 'visibility', 
                            iconType: 'warning',
                            label: 'Beat Availability', 
                            value: 'Shared catalog, others can license' 
                        },
                        { 
                            icon: 'videocam_off', 
                            iconType: 'warning',
                            label: 'Video/Radio Rights', 
                            value: 'Limited commercial use' 
                        },
                        { 
                            icon: 'attach_money', 
                            iconType: 'info',
                            label: 'Cost', 
                            value: 'Included in subscription' 
                        }
                    ],
                    exclusive: [
                        { 
                            icon: 'trending_up', 
                            iconType: 'success',
                            label: 'Revenue Split', 
                            value: '70-30 in your favor' 
                        },
                        { 
                            icon: 'visibility_off', 
                            iconType: 'success',
                            label: 'Beat Availability', 
                            value: 'Removed from catalog' 
                        },
                        { 
                            icon: 'videocam', 
                            iconType: 'success',
                            label: 'Video/Radio Rights', 
                            value: 'Full commercial rights' 
                        },
                        { 
                            icon: 'paid', 
                            iconType: 'success',
                            label: 'Cost', 
                            value: 'Additional purchase required' 
                        }
                    ]
                }
            };
            
            this.populateComparisonColumn(nonExclusiveColumn, 'Non-Exclusive', comparisonData[licenseType].nonExclusive);
            this.populateComparisonColumn(exclusiveColumn, 'Exclusive', comparisonData[licenseType].exclusive);
        }

        populateComparisonColumn(column, title, items) {
            column.innerHTML = `
                <h4 style="font-size: 1rem; font-weight: 600; margin-bottom: 16px; color: rgba(255, 255, 255, 0.95); text-align: center;">${title}</h4>
            `;
            
            items.forEach(item => {
                const itemElement = document.createElement('div');
                itemElement.className = 'license-comparison-item';
                
                itemElement.innerHTML = `
                    <div class="license-comparison-icon ${item.iconType}">
                        <span class="material-icons">${item.icon}</span>
                    </div>
                    <div class="license-comparison-text">
                        <div class="license-comparison-label">${item.label}</div>
                        <div class="license-comparison-value">${item.value}</div>
                    </div>
                `;
                
                column.appendChild(itemElement);
            });
        }

        createFAQSection() {
            const faqSection = document.createElement('div');
            faqSection.className = 'mt-80 mb-60';
            faqSection.setAttribute('data-faq-section', 'true');
            
            // Section header
            const headerContainer = document.createElement('div');
            headerContainer.className = 'text-center mb-48';
            
            const title = document.createElement('h2');
            title.className = 'text-2xl font-semibold mb-12';
            title.textContent = 'Frequently Asked Questions';
            
            const subtitle = document.createElement('p');
            subtitle.className = 'text-muted text-base max-w-2xl mx-auto';
            subtitle.textContent = 'Get answers to common questions about licensing, exclusivity, and how BeatPass works for serious artists.';
            
            headerContainer.appendChild(title);
            headerContainer.appendChild(subtitle);
            
            // FAQ items container
            const faqContainer = document.createElement('div');
            faqContainer.className = 'max-w-4xl mx-auto';
            faqContainer.setAttribute('data-faq-container', 'true');
            
            // FAQ data
            const faqData = [
                {
                    question: "If I cancel my BeatPass plan later, can I still release the songs I made with the beats I downloaded?",
                    answer: "Yes. A non-exclusive license you grabbed while your subscription was active remains valid for that one project even after you leave. You keep ownership of the song and may continue to sell or stream it as usual.",
                    priority: 1
                },
                {
                    question: "What exactly can I do with a non-exclusive BeatPass beat that I can't do with a typical $30 YouTube lease?",
                    answer: "Your non-exclusive license already covers commercial distribution everywhere plus live shows of up to 50 tickets, and you can upgrade to exclusive later if it is still available.",
                    priority: 1
                },
                {
                    question: "Could another BeatPass subscriber drop the same beat on Spotify the day I do?",
                    answer: "Yes. Non-exclusive means more than one artist can license the same instrumental. If you want to lock the beat so nobody else can use it, purchase the exclusive license and it will be removed from the catalogue.",
                    priority: 1
                },
                {
                    question: "How do I turn my non-exclusive into an exclusive and what happens to tracks that are already out?",
                    answer: "Ask the producer for an upgrade. If the exclusive has not been sold yet, you pay the exclusive fee (Classic saves 30 CAD, Pro saves 60 CAD), and the beat is taken down for everyone else. Releases made under earlier non-exclusive licenses stay lawful.",
                    priority: 2
                },
                {
                    question: "Do I keep one hundred percent of streaming royalties on an exclusive BeatPass beat?",
                    answer: "Almost. Exclusive licenses tilt the revenue split in your favour: you keep seventy percent of streaming income and the producer gets thirty.",
                    priority: 1
                },
                {
                    question: "I need custom beats every month. How does BeatPass handle that compared with BeatStars commissions?",
                    answer: "On the Pro plan you get five non-exclusive custom requests at no extra cost each month. Additional customs are producer-priced plus 25 CAD an hour, with optional revisions at 5 CAD each.",
                    priority: 2
                },
                {
                    question: "Will I get the stems, and do I have to be on Pro?",
                    answer: "Stems are included when you buy the beat exclusively (any plan can do that). For non-exclusive downloads stems are not automatic, but you can request them from the producer.",
                    priority: 2
                },
                {
                    question: "What if a producer used an uncleared sample—am I on the hook?",
                    answer: "The composer guarantees the work is original or cleared and must indemnify BeatPass (and by extension you) against infringement claims.",
                    priority: 2
                },
                {
                    question: "How often are producers paid and why should I care?",
                    answer: "Producer payouts run twice a year, every June and December, based on a transparent real-time formula. That schedule makes it straightforward for labels or distributors to clear the beat because the writer's share ledger updates only twice a year.",
                    priority: 3
                },
                {
                    question: "Does BeatPass take any hidden fees beyond my subscription?",
                    answer: "No platform fees are added to what you pay each month. BeatPass keeps fifteen percent of overall subscription revenue to run the service; the rest goes to producers.",
                    priority: 1
                }
            ];

            // Labels-specific FAQ data (BeatPassID focused)
            const labelsFaqData = [
                {
                    question: "Will my exclusive be unique forever?",
                    answer: "Yes. BeatPassID fingerprints every beat on upload, creating an unchangeable record. Once you purchase the exclusive, the beat is removed from the catalog and can never be licensed again.",
                    category: "labels"
                },
                {
                    question: "What if someone tries to impersonate me?",
                    answer: "BeatPassID automatically blocks duplicate uploads. Our system maintains a cryptographic fingerprint record that proves your licensing timestamp, making it impossible for copycats to claim they licensed first.",
                    category: "labels"
                },
                {
                    question: "Do I need extra clearance?",
                    answer: "No additional clearance needed. Every beat comes with BeatPassID verification, creating a legal trail that satisfies label requirements and distribution platforms.",
                    category: "labels"
                },
                {
                    question: "Where can I download the proof file?",
                    answer: "Your BeatPassID proof file is automatically generated with every license. Access it from your account dashboard or request it from our support team at any time.",
                    category: "labels"
                }
            ];
            
            // Create main FAQ items
            faqData.forEach((faq, index) => {
                const faqItem = this.createFAQItem(faq, index);
                faqContainer.appendChild(faqItem);
            });

            // Add "Why Labels Love It" section
            const labelsSection = this.createLabelsSection(labelsFaqData);
            faqContainer.appendChild(labelsSection);

            // Create labels FAQ items
            labelsFaqData.forEach((faq, index) => {
                const faqItem = this.createFAQItem(faq, index + faqData.length, 'labels');
                faqContainer.appendChild(faqItem);
            });
            
            // Show more button container
            const showMoreContainer = document.createElement('div');
            showMoreContainer.className = 'text-center mt-32';
            showMoreContainer.setAttribute('data-show-more-container', 'true');
            
            const showMoreButton = document.createElement('button');
            showMoreButton.className = 'inline-flex items-center gap-10';
            showMoreButton.setAttribute('data-show-more-btn', 'true');
            showMoreButton.innerHTML = `
                <span class="show-more-text">Show More Questions</span>
                <span class="material-icons transition-transform duration-200" data-chevron>expand_more</span>
            `;
            
            showMoreContainer.appendChild(showMoreButton);
            
            faqSection.appendChild(headerContainer);
            faqSection.appendChild(faqContainer);
            faqSection.appendChild(showMoreContainer);
            
            // Initialize FAQ functionality
            this.initializeFAQ(faqSection);
            
            return faqSection;
        }

        createLabelsSection(labelsFaqData) {
            const labelsSection = document.createElement('div');
            labelsSection.className = 'labels-faq-section mt-32 mb-20';
            
            const labelsHeader = document.createElement('div');
            labelsHeader.className = 'labels-header text-center mb-24';
            
            const labelsIcon = document.createElement('div');
            labelsIcon.className = 'labels-icon-container mx-auto mb-12';
            labelsIcon.innerHTML = `
                <div class="labels-icon">
                    <span class="material-icons">business</span>
                </div>
            `;
            
            const labelsTitle = document.createElement('h3');
            labelsTitle.className = 'text-xl font-semibold mb-8';
            labelsTitle.textContent = 'Why Labels Love It';
            
            const labelsSubtitle = document.createElement('p');
            labelsSubtitle.className = 'text-muted text-sm max-w-xl mx-auto';
            labelsSubtitle.textContent = 'Address high-stakes buyer worries with BeatPassID fingerprint verification';
            
            labelsHeader.appendChild(labelsIcon);
            labelsHeader.appendChild(labelsTitle);
            labelsHeader.appendChild(labelsSubtitle);
            labelsSection.appendChild(labelsHeader);
            
            return labelsSection;
        }

        createFAQItem(faq, index, category = 'general') {
            const isLabelsItem = category === 'labels';
            const faqItem = document.createElement('div');
            faqItem.className = `faq-item border border-border rounded-lg mb-12 overflow-hidden transition-all duration-200 hover:border-primary/50 ${faq.priority > 1 && !isLabelsItem ? 'faq-item-hidden' : ''} ${isLabelsItem ? 'labels-faq-item' : ''}`;
            faqItem.setAttribute('data-faq-item', index);
            faqItem.setAttribute('data-priority', faq.priority || 1);
            if (isLabelsItem) {
                faqItem.setAttribute('data-category', 'labels');
            }
            
            // Question button
            const questionButton = document.createElement('button');
            questionButton.className = 'faq-question w-full text-left p-20 md:p-24 bg-transparent hover:bg-primary/5 transition-colors duration-200 focus:outline-none focus:bg-primary/5';
            questionButton.setAttribute('data-faq-toggle', index);
            
            const questionContent = document.createElement('div');
            questionContent.className = 'flex items-start justify-between gap-20';
            
            const questionText = document.createElement('h3');
            questionText.className = 'font-semibold text-base leading-snug flex-1 pr-4';
            questionText.textContent = faq.question;
            
            const chevronIcon = document.createElement('span');
            chevronIcon.className = 'material-icons text-18 text-muted transition-transform duration-200 flex-shrink-0 mt-1';
            chevronIcon.textContent = 'expand_more';
            chevronIcon.setAttribute('data-faq-chevron', index);
            
            questionContent.appendChild(questionText);
            questionContent.appendChild(chevronIcon);
            questionButton.appendChild(questionContent);
            
            // Answer container
            const answerContainer = document.createElement('div');
            answerContainer.className = 'faq-answer overflow-hidden transition-all duration-300 ease-in-out';
            answerContainer.setAttribute('data-faq-answer', index);
            answerContainer.style.maxHeight = '0';
            
            const answerContent = document.createElement('div');
            
            const answerText = document.createElement('p');
            answerText.textContent = faq.answer;
            
            answerContent.appendChild(answerText);
            answerContainer.appendChild(answerContent);
            
            faqItem.appendChild(questionButton);
            faqItem.appendChild(answerContainer);
            
            return faqItem;
        }

        initializeFAQ(faqSection) {
            const showMoreBtn = faqSection.querySelector('[data-show-more-btn]');
            const showMoreText = showMoreBtn.querySelector('.show-more-text');
            const chevron = showMoreBtn.querySelector('[data-chevron]');
            const hiddenItems = faqSection.querySelectorAll('.faq-item-hidden');
            
            let isExpanded = false;
            
            // Show more/less functionality
            showMoreBtn.addEventListener('click', () => {
                if (!isExpanded) {
                    // Show hidden items
                    hiddenItems.forEach((item, index) => {
                        setTimeout(() => {
                            item.classList.remove('faq-item-hidden');
                            item.style.opacity = '0';
                            item.style.transform = 'translateY(10px)';
                            item.style.display = 'block';
                            
                            setTimeout(() => {
                                item.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                                item.style.opacity = '1';
                                item.style.transform = 'translateY(0)';
                            }, 50);
                        }, index * 100);
                    });
                    
                    showMoreText.textContent = 'Show Fewer Questions';
                    chevron.style.transform = 'rotate(180deg)';
                    isExpanded = true;
                } else {
                    // Hide items
                    hiddenItems.forEach((item, index) => {
                        setTimeout(() => {
                            item.style.opacity = '0';
                            item.style.transform = 'translateY(-10px)';
                            
                            setTimeout(() => {
                                item.classList.add('faq-item-hidden');
                                item.style.display = 'none';
                                item.style.transform = '';
                                item.style.transition = '';
                            }, 300);
                        }, index * 50);
                    });
                    
                    showMoreText.textContent = 'Show More Questions';
                    chevron.style.transform = 'rotate(0deg)';
                    isExpanded = false;
                }
            });
            
            // FAQ item toggle functionality
            const faqToggles = faqSection.querySelectorAll('[data-faq-toggle]');
            faqToggles.forEach(toggle => {
                toggle.addEventListener('click', () => {
                    const index = toggle.getAttribute('data-faq-toggle');
                    const answer = faqSection.querySelector(`[data-faq-answer="${index}"]`);
                    const chevron = faqSection.querySelector(`[data-faq-chevron="${index}"]`);
                    const faqItem = faqSection.querySelector(`[data-faq-item="${index}"]`);
                    
                    const isOpen = answer.style.maxHeight && answer.style.maxHeight !== '0px';
                    
                    if (isOpen) {
                        // Close
                        answer.style.maxHeight = '0';
                        chevron.style.transform = 'rotate(0deg)';
                        faqItem.classList.remove('faq-item-open');
                    } else {
                        // Close all other open items first
                        faqToggles.forEach(otherToggle => {
                            if (otherToggle !== toggle) {
                                const otherIndex = otherToggle.getAttribute('data-faq-toggle');
                                const otherAnswer = faqSection.querySelector(`[data-faq-answer="${otherIndex}"]`);
                                const otherChevron = faqSection.querySelector(`[data-faq-chevron="${otherIndex}"]`);
                                const otherItem = faqSection.querySelector(`[data-faq-item="${otherIndex}"]`);
                                
                                otherAnswer.style.maxHeight = '0';
                                otherChevron.style.transform = 'rotate(0deg)';
                                otherItem.classList.remove('faq-item-open');
                            }
                        });
                        
                        // Open this one
                        answer.style.maxHeight = answer.scrollHeight + 'px';
                        chevron.style.transform = 'rotate(180deg)';
                        faqItem.classList.add('faq-item-open');
                    }
                });
            });
        }

        calculateCardWidth() {
            if (this.allCards.length > 0) {
                const firstCardWrapper = this.scrollContainer.querySelector('.snap-start');
                if (firstCardWrapper) {
                    const rect = firstCardWrapper.getBoundingClientRect();
                    this.cardWidth = rect.width + 24;
                    
                    try {
                        if (globalObj.innerWidth < 768) {
                            const container = this.scrollContainer.closest('.container');
                            if (container) {
                                this.cardWidth = container.getBoundingClientRect().width;
                            } else {
                                this.cardWidth = this.scrollContainer.getBoundingClientRect().width;
                            }
                        }
                    } catch (error) {
                        console.warn('Error checking mobile layout in calculateCardWidth:', error);
                    }
                }
            }
        }

        bindEvents() {
            if (this.prevButton && this.nextButton) {
                this.prevButton.addEventListener('click', () => {
                    this.previousCard();
                });
                this.nextButton.addEventListener('click', () => {
                    this.nextCard();
                });
            }
            
            this.scrollContainer.addEventListener('scroll', () => {
                this.updateNavigation();
            });
            
            // Touch scrolling is handled natively by the browser
            // No custom touch event handlers needed for native scroll containers
            

            
            document.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowLeft') {
                    this.previousCard();
                } else if (e.key === 'ArrowRight') {
                    this.nextCard();
                }
            });
            
            globalObj.addEventListener('resize', () => {
                clearTimeout(this.resizeTimeout);
                this.resizeTimeout = setTimeout(() => {
                    try {
                        this.isMobile = globalObj.innerWidth < 768;
                    } catch (error) {
                        console.warn('Error detecting mobile layout on resize:', error);
                        this.isMobile = false;
                    }
                    this.calculateCardWidth();
                    this.updateNavigation();
                }, 150);
            });
        }

        previousCard() {
            if (this.currentIndex > 0) {
                this.currentIndex--;
                this.scrollToCard(this.currentIndex);
            }
        }

        nextCard() {
            if (this.currentIndex < this.totalOriginalCards - 1) {
                this.currentIndex++;
                this.scrollToCard(this.currentIndex);
            }
        }

        scrollToCard(index, smooth = true) {
            if (this.cardWidth === 0) this.calculateCardWidth();
            
            const scrollLeft = index * this.cardWidth;
            
            this.scrollContainer.scrollTo({
                left: scrollLeft,
                behavior: smooth ? 'smooth' : 'auto'
            });
            
            this.currentIndex = index;
            this.updateNavigation();
        }

        updateNavigation() {
            if (this.prevButton && this.nextButton) {
                const scrollLeft = this.scrollContainer.scrollLeft;
                const maxScroll = this.scrollContainer.scrollWidth - this.scrollContainer.clientWidth;
                
                if (scrollLeft <= 0) {
                    this.prevButton.setAttribute('disabled', '');
                } else {
                    this.prevButton.removeAttribute('disabled');
                }
                
                if (scrollLeft >= maxScroll) {
                    this.nextButton.setAttribute('disabled', '');
                } else {
                    this.nextButton.removeAttribute('disabled');
                }
            }
        }



        destroy() {
            log('Destroying pricing carousel...');
            
            if (this.observer) {
                this.observer.disconnect();
                this.observer = null;
            }
            
            if (this.resizeTimeout) {
                clearTimeout(this.resizeTimeout);
            }
            
            // Close modal if open
            if (this.calculatorModal) {
                this.closeCalculatorModal();
            }
            
            // Remove event listeners would be ideal, but for simplicity during cleanup
            // we'll rely on element removal to handle this
            
            this.isInitialized = false;
        }
    }

    function initializePricingCarousel() {
        // Legacy function - now delegates to InitializationManager
        if (!isOnPricingPage()) {
            log('Not on pricing page, skipping initialization');
            return;
        }
        
        InitializationManager._initializePricingPage();
    }

    function handleUrlChange() {
        // Legacy function - now delegates to InitializationManager
        InitializationManager._handleNavigation();
    }

    function setupNavigationDetection() {
        // Legacy function - now handled by InitializationManager
        log('Navigation detection setup delegated to InitializationManager');
    }

    function restoreNavigationMethods() {
        // Legacy function - now handled by InitializationManager
        log('Navigation restoration delegated to InitializationManager');
    }

    // Initialize the system
    function initialize() {
        try {
            log('BeatPass Pricing Enhancement initializing...');
            
            // Use the new InitializationManager
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    InitializationManager.init();
                });
            } else {
                InitializationManager.init();
            }
            
            log('Initialization delegated to InitializationManager');
        } catch (error) {
            console.error('Error in BeatPass Pricing Enhancement initialization:', error);
        }
    }

    // Cleanup function for page unload
    function cleanup() {
        try {
            log('Cleaning up BeatPass Pricing Enhancement...');
            InitializationManager.cleanup();
        } catch (error) {
            console.error('Error in BeatPass Pricing Enhancement cleanup:', error);
        }
    }

    // Handle page unload
    try {
        globalObj.addEventListener('beforeunload', cleanup);
    } catch (error) {
        console.warn('Could not add beforeunload listener:', error);
    }

    // Expose manual initialization for debugging
    try {
        globalObj.BeatPassPricingCarouselManualInit = initializePricingCarousel;
        globalObj.BeatPassPricingCarouselCleanup = cleanupPricingEnhancements;
        
        // Create a module-like object for external calling
        const BeatPassPricingModule = {
            initialize: initialize,
            cleanup: cleanup,
            initCarousel: initializePricingCarousel,
            cleanupEnhancements: cleanupPricingEnhancements,
            isInitialized: () => InitializationManager.state.isInitialized,
            manager: InitializationManager // Expose manager for debugging
        };
        
        // Expose the module globally
        globalObj.BeatPassPricingModule = BeatPassPricingModule;
    } catch (error) {
        console.warn('Could not expose global functions:', error);
    }

    // Start the system safely
    try {
        initialize();
    } catch (error) {
        console.error('Failed to initialize BeatPass Pricing Enhancement:', error);
    }
    
    // Performance optimization summary:
    // 1. Element caching to reduce DOM queries
    // 2. RequestIdleCallback for non-critical initialization
    // 3. Batch DOM operations with requestAnimationFrame
    // 4. Reduced logging in production (DEBUG_MODE = false)
    // 5. Efficient cleanup with single DOM query
    // 6. Debounced resize handlers
    // 7. Optimized navigation detection
    // 8. Direct window object usage instead of defensive binding

})();