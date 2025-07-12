// ============================================================
// 9. Custom Fields, Form Handlers, Track Data Injection & SPA Routing
// (extracted from BeatpassOptimizedIntegration.js)
// OPTIMIZED VERSION: Uses app foundation for better performance
// ============================================================
(function () {
    'use strict';
    
    // ---------------------------
    // Centralized Initialization State Manager
    // ---------------------------
    const InitializationManager = {
        isInitialized: false,
        isInitializing: false,
        initPromise: null,
        observers: new Map(),
        eventListeners: new Map(),
        
        async init() {
            if (this.isInitialized || this.isInitializing) {
                return this.initPromise;
            }
            
            this.isInitializing = true;
            this.initPromise = this._performInit();
            
            try {
                await this.initPromise;
                this.isInitialized = true;
            } catch (error) {
                console.error('[CustomFields] Initialization failed:', error);
            } finally {
                this.isInitializing = false;
            }
            
            return this.initPromise;
        },
        
        async _performInit() {
            console.log('[CustomFields] Starting initialization...');
            
            // Wait for coordinator if available
            if (typeof waitForCoordinator === 'function') {
                try {
                    await waitForCoordinator();
                } catch (error) {
                    console.warn('[CustomFields] Coordinator not available, proceeding without it');
                }
            }
            
            // Initialize components
            await this._initializeComponents();
            
            console.log('[CustomFields] Initialization complete');
        },
        
        async _initializeComponents() {
            // Initialize cache
            initializeCache();
            
            // Setup page-specific functionality
            if (isUploadPage() || isEditPage()) {
                await safeInject(injectCustomFields);
            }
            
            if (isTrackPage()) {
                await safeInject(injectTrackData);
            }
            
            // Setup observers and event listeners
            this._setupObservers();
            this._setupEventListeners();
        },
        
        _setupObservers() {
            // Clear existing observers
            this.observers.forEach(observer => observer.disconnect());
            this.observers.clear();
            
            // Setup form observer
            const formObserver = new MutationObserver(debounce((mutations) => {
                let shouldReinject = false;
                
                for (const mutation of mutations) {
                    if (mutation.type === 'childList') {
                        const addedNodes = Array.from(mutation.addedNodes);
                        const hasFormChanges = addedNodes.some(node =>
                            node.nodeType === Node.ELEMENT_NODE &&
                            (node.matches?.('form, .form-container, [data-form]') ||
                             node.querySelector?.('form, .form-container, [data-form]'))
                        );
                        
                        if (hasFormChanges) {
                            shouldReinject = true;
                            break;
                        }
                    }
                }
                
                if (shouldReinject) {
                    console.log('[CustomFields] Form changes detected, re-injecting...');
                    this._reinjectFields();
                }
            }, 300));
            
            formObserver.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: false,
                characterData: false
            });
            
            this.observers.set('form', formObserver);
        },
        
        _setupEventListeners() {
            // Clear existing listeners
            this.eventListeners.forEach(({ element, event, handler }) => {
                element.removeEventListener(event, handler);
            });
            this.eventListeners.clear();
            
            // Setup navigation listeners
            const navigationHandler = debounce(() => {
                console.log('[CustomFields] Navigation detected, re-initializing...');
                this._handleNavigation();
            }, 100);
            
            window.addEventListener('popstate', navigationHandler);
            this.eventListeners.set('popstate', { element: window, event: 'popstate', handler: navigationHandler });
            
            // Listen for custom navigation events
            const customNavHandler = debounce(() => {
                this._handleNavigation();
            }, 100);
            
            ['routechange', 'navigationend', 'spa-route-change'].forEach(eventName => {
                window.addEventListener(eventName, customNavHandler);
                this.eventListeners.set(eventName, { element: window, event: eventName, handler: customNavHandler });
            });
        },
        
        async _handleNavigation() {
            // Reset state for new page
            isFieldsInjected = false;
            fieldsReady = false;
            
            // Re-initialize for new page
            await this._initializeComponents();
        },
        
        async _reinjectFields() {
            if (isUploadPage() || isEditPage()) {
                isFieldsInjected = false;
                await safeInject(injectCustomFields);
            }
        },
        
        cleanup() {
            console.log('[CustomFields] Cleaning up...');
            
            // Disconnect observers
            this.observers.forEach(observer => observer.disconnect());
            this.observers.clear();
            
            // Remove event listeners
            this.eventListeners.forEach(({ element, event, handler }) => {
                element.removeEventListener(event, handler);
            });
            this.eventListeners.clear();
            
            // Clear cache
            apiCache.clear();
            pendingRequests.clear();
            
            // Reset state
            this.isInitialized = false;
            this.isInitializing = false;
            this.initPromise = null;
        }
    };
    
    // ---------------------------
    // Enhanced API and Global Constants
    // ---------------------------
    const API_URL = 'https://open.beatpass.ca/key_bpm_handler.php';
    const MAX_RETRIES_UPLOAD = 10, RETRY_DELAY = 300;
    const MAX_RETRIES_TRACK = 15, RETRY_DELAY_TRACK = 200;
    const API_TIMEOUT = 10000; // 10 seconds
    const CACHE_DURATION = 300000; // 5 minutes
    
    let isFieldsInjected = false, fieldsReady = false, retryAttempts = 0;
    let lastTrackPath = '', trackObserver = null;
    let fieldsObserver = null;
    
    // Enhanced caching system
    const apiCache = new Map();
    const pendingRequests = new Map();
    let cachedBootstrapData = null;
    let cachedApiHeaders = null;
    
    // Performance monitoring
    const performanceMetrics = {
        apiCalls: 0,
        cacheHits: 0,
        domOperations: 0,
        errors: 0
    };
    
    // Enhanced API function with caching and timeout
    async function makeApiRequest(url, options = {}) {
        const cacheKey = `${url}_${JSON.stringify(options)}`;
        
        // Check cache first
        const cached = apiCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            performanceMetrics.cacheHits++;
            return cached.data;
        }
        
        // Check if request is already pending
        if (pendingRequests.has(cacheKey)) {
            return pendingRequests.get(cacheKey);
        }
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
        
        const requestPromise = fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                ...options.headers
            }
        }).then(async response => {
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Cache successful responses
            apiCache.set(cacheKey, {
                data,
                timestamp: Date.now()
            });
            
            performanceMetrics.apiCalls++;
            return data;
        }).catch(error => {
            clearTimeout(timeoutId);
            performanceMetrics.errors++;
            throw error;
        }).finally(() => {
            pendingRequests.delete(cacheKey);
        });
        
        pendingRequests.set(cacheKey, requestPromise);
        return requestPromise;
    }
    
    // Initialize cached data
    function initializeCache() {
        try {
            // Access bootstrap data if available
            if (window.bootstrapData) {
                cachedBootstrapData = typeof window.bootstrapData === 'string' 
                    ? JSON.parse(window.bootstrapData) 
                    : window.bootstrapData;
                    
                // Extract API headers from bootstrap data
                if (cachedBootstrapData?.settings?.base_url) {
                    cachedApiHeaders = {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                    };
                }
            }
        } catch (error) {
            console.warn('Could not cache bootstrap data:', error);
        }
    }
    
    // Initialize cache on load
    initializeCache();

    // ---------------------------
    // Utility Functions (Optimized)
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
    // Enhanced Injection System with Promise-based Queue
    // ---------------------------
    const InjectionManager = {
        isInjecting: false,
        injectionQueue: [],
        
        async safeInject(injectionFunction, ...args) {
            return new Promise((resolve, reject) => {
                const injectionTask = {
                    function: injectionFunction,
                    args,
                    resolve,
                    reject
                };
                
                this.injectionQueue.push(injectionTask);
                this._processQueue();
            });
        },
        
        async _processQueue() {
            if (this.isInjecting || this.injectionQueue.length === 0) {
                return;
            }
            
            this.isInjecting = true;
            
            while (this.injectionQueue.length > 0) {
                const task = this.injectionQueue.shift();
                
                try {
                    // Use requestAnimationFrame for smooth DOM updates
                    await new Promise(resolve => {
                        requestAnimationFrame(async () => {
                            try {
                                const result = await task.function(...task.args);
                                task.resolve(result);
                            } catch (error) {
                                console.error('[CustomFields] Injection failed:', error);
                                task.reject(error);
                            }
                            resolve();
                        });
                    });
                    
                    // Small delay between injections to prevent overwhelming the DOM
                    await new Promise(resolve => setTimeout(resolve, 10));
                    
                } catch (error) {
                    console.error('[CustomFields] Injection task failed:', error);
                    task.reject(error);
                }
            }
            
            this.isInjecting = false;
        },
        
        clearQueue() {
            this.injectionQueue.forEach(task => {
                task.reject(new Error('Injection queue cleared'));
            });
            this.injectionQueue = [];
            this.isInjecting = false;
        }
    };
    
    // Wrapper function for backward compatibility
    async function safeInject(injectionFunction, ...args) {
        return InjectionManager.safeInject(injectionFunction, ...args);
    }
    
    // Debounced injection functions
    const debouncedInjectCustomFields = debounce(() => safeInject(injectCustomFields), 200);
    const debouncedInjectFingerprintDashboard = debounce(() => safeInject(injectFingerprintDashboard), 200);
    const debouncedUpdateDashboardContent = debounce(() => safeInject(updateDashboardContent), 150);
    const debouncedInjectBPMColumn = debounce(() => safeInject(injectBPMColumn), 300);
    const debouncedInjectTrackData = debounce((data) => safeInject(injectTrackData, data), 100);
    
    // ---------------------------
    // Custom Field Creation with Native UI
    // ---------------------------
    function createDropdownField(labelText, id, placeholder, options, defaultValue = '', valueMap = {}) {
        const wrapper = document.createElement('div');
        wrapper.className = 'mb-24 text-sm';
        const label = document.createElement('label');
        label.className = 'block first-letter:capitalize text-left whitespace-nowrap text-sm mb-4';
        label.textContent = labelText;
        label.setAttribute('for', id);
        wrapper.appendChild(label);

        const isolateContainer = document.createElement('div');
        isolateContainer.className = 'isolate relative';

        const input = document.createElement('input');
        input.id = id;
        input.placeholder = placeholder;
        input.className = 'block text-left relative w-full appearance-none transition-shadow text bg-transparent rounded-input border-divider border focus:ring focus:ring-primary/focus focus:border-primary/60 focus:outline-none shadow-sm text-sm h-42 pl-12 pr-12';
        input.autocomplete = 'off';
        input.value = defaultValue;
        input.dataset.valueMap = JSON.stringify(valueMap);

        // Dropdown rendered in body to avoid clipping
        const dropdown = document.createElement('div');
        dropdown.className = 'hidden absolute border shadow-xl rounded-panel max-h-48 overflow-y-auto dropdown-panel';
        dropdown.style.cssText = 'background: rgba(25,25,25,.95);backdrop-filter:blur(90px) contrast(.9);border-color:rgba(255,255,255,.15);z-index:10000;';

        function populate(list) {
            dropdown.innerHTML = '';
            const listbox = document.createElement('div');
            listbox.setAttribute('role','listbox');
            list.forEach(opt=>{
                const item=document.createElement('div');
                item.setAttribute('role','option');
                item.className='w-full select-none cursor-pointer py-8 text-sm truncate px-20 hover:bg-hover rounded-md text-white';
                item.textContent=opt;
                item.addEventListener('click',()=>{
                    input.value=opt;
                    dropdown.classList.add('hidden');
                    input.dispatchEvent(new Event('change',{bubbles:true}));
                    enableSubmitButton();
                    updatePendingCustomData();
                    if(isEditPage()) setTimeout(()=>debouncedUpdateDashboardContent(),100);
                });
                listbox.appendChild(item);
            });
            dropdown.appendChild(listbox);
        }
        populate(options);

        document.body.appendChild(dropdown); // portal

        function positionDropdown() {
            const rect=input.getBoundingClientRect();
            dropdown.style.top=rect.bottom+window.scrollY+'px';
            dropdown.style.left=rect.left+window.scrollX+'px';
            dropdown.style.right='auto';
            dropdown.style.width=rect.width+'px';
        }

        input.addEventListener('focus',()=>{
            positionDropdown();
            dropdown.classList.remove('hidden');
        });
        input.addEventListener('input',()=>{
            const term=input.value.toLowerCase();
            const filtered=options.filter(o=>o.toLowerCase().includes(term));
            populate(filtered);
        });
        window.addEventListener('resize',()=>{if(!dropdown.classList.contains('hidden')) positionDropdown();});
        document.addEventListener('click',e=>{
            if(!wrapper.contains(e.target) && !dropdown.contains(e.target)) dropdown.classList.add('hidden');
        });

        isolateContainer.appendChild(input);
        wrapper.appendChild(isolateContainer);
        return wrapper;
    }

    function createBPMField(defaultValue = '') {
        // Use native form field structure
        const wrapper = document.createElement('div');
        wrapper.className = 'mb-24 text-sm';
        
        // Native label structure
        const label = document.createElement('label');
        label.className = 'block first-letter:capitalize text-left whitespace-nowrap text-sm mb-4';
        label.textContent = 'BPM';
        label.setAttribute('for', 'bpm');
        wrapper.appendChild(label);

        // Native isolate container
        const isolateContainer = document.createElement('div');
        isolateContainer.className = 'isolate relative';

        // Native input structure
        const input = document.createElement('input');
        input.id = 'bpm';
        input.type = 'number';
        input.placeholder = 'Enter BPM';
        input.min = 40;
        input.max = 300;
        input.className = 'block text-left relative w-full appearance-none transition-shadow text bg-transparent rounded-input border-divider border focus:ring focus:ring-primary/focus focus:border-primary/60 focus:outline-none shadow-sm text-sm h-42 pl-12 pr-12';
        input.value = defaultValue;
        input.setAttribute('aria-labelledby', label.id || '');
        
        input.addEventListener('input', e => {
            const bpm = parseInt(e.target.value, 10);
            if (isNaN(bpm) || bpm < 40 || bpm > 300) {
                // Use native error styling
                e.target.style.borderColor = 'rgb(239, 68, 68)';
                e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.05)';
            } else {
                // Reset to native styling
                e.target.style.borderColor = '';
                e.target.style.backgroundColor = '';
            }
            e.target.dispatchEvent(new Event('change', { bubbles: true }));
            enableSubmitButton();
            updatePendingCustomData();
            if (isEditPage()) {
                setTimeout(() => debouncedUpdateDashboardContent(), 100);
            }
        });
        
        isolateContainer.appendChild(input);
        wrapper.appendChild(isolateContainer);
        
        return wrapper;
    }
    
    // NEW: Create price input field for exclusive licensing
    function createPriceField(labelText, id, placeholder, defaultValue = '') {
        const wrapper = document.createElement('div');
        wrapper.className = 'mb-24 text-sm';
        
        const label = document.createElement('label');
        label.className = 'block first-letter:capitalize text-left whitespace-nowrap text-sm mb-4';
        label.textContent = labelText;
        label.setAttribute('for', id);
        wrapper.appendChild(label);

        const isolateContainer = document.createElement('div');
        isolateContainer.className = 'isolate relative';
        
        const input = document.createElement('input');
        input.id = id;
        input.type = 'number';
        input.min = '0';
        input.step = '0.01';
        input.placeholder = placeholder;
        input.className = 'block text-left relative w-full appearance-none transition-shadow text bg-transparent rounded-input border-divider border focus:ring focus:ring-primary/focus focus:border-primary/60 focus:outline-none shadow-sm text-sm h-42 pl-12 pr-12';
        input.value = defaultValue;
        
        input.addEventListener('input', () => {
            input.dispatchEvent(new Event('change', { bubbles: true }));
            enableSubmitButton();
            updatePendingCustomData();
            if (isEditPage()) {
                setTimeout(() => debouncedUpdateDashboardContent(), 100);
            }
        });

        isolateContainer.appendChild(input);
        wrapper.appendChild(isolateContainer);
        
        return wrapper;
    }
    
    // Helper to map label ↔ value
    function mapLabelToValue(inputEl){
        const map=inputEl?.dataset.valueMap?JSON.parse(inputEl.dataset.valueMap):null;
        if(!map) return inputEl?.value||'';
        const key=Object.keys(map).find(k=>map[k]===inputEl.value);
        return key||inputEl.value;
    }

    function getExclusiveLicensingData(){
        const licensingInput=document.querySelector('#licensing_type');
        const statusInput=document.querySelector('#exclusive_status');
        const currencyInput=document.querySelector('#exclusive_currency');
        const price=document.querySelector('#exclusive_price')?.value||'';
        const buyerInfo = document.querySelector('#exclusive_buyer_info')?.value || '';
        
        // For button-based UI, the value is directly in the hidden input
        const licensing_type=licensingInput?.value||'non_exclusive_only';
        const exclusive_status=licensing_type==='non_exclusive_only'?'not_available':(statusInput?.value||'not_available');
        const exclusive_currency=currencyInput?.value||'USD';
        
        return {
            licensing_type,
            exclusive_price: licensing_type!=='non_exclusive_only' && price?parseFloat(price):'',
            exclusive_currency,
            exclusive_status,
            exclusive_buyer_info: buyerInfo
        };
    }
    
    // NEW: Create exclusive licensing section with all fields
    function createTextField(labelText, id, placeholder, defaultValue = '') {
        const wrapper = document.createElement('div');
        wrapper.className = 'text-sm';

        const label = document.createElement('label');
        label.className = 'block first-letter:capitalize text-left whitespace-nowrap text-sm mb-4';
        label.textContent = labelText;
        label.setAttribute('for', id);
        wrapper.appendChild(label);

        const isolateContainer = document.createElement('div');
        isolateContainer.className = 'isolate relative';

        const input = document.createElement('input');
        input.id = id;
        input.type = 'text';
        input.placeholder = placeholder;
        input.className = 'block text-left relative w-full appearance-none transition-shadow text bg-transparent rounded-input border-divider border focus:ring focus:ring-primary/focus focus:border-primary/60 focus:outline-none shadow-sm text-sm h-42 pl-12 pr-12';
        input.value = defaultValue;

        input.addEventListener('input', () => {
            input.dispatchEvent(new Event('change', { bubbles: true }));
            enableSubmitButton();
            updatePendingCustomData();
            if (isEditPage()) {
                setTimeout(() => debouncedUpdateDashboardContent(), 100);
            }
        });

        isolateContainer.appendChild(input);
        wrapper.appendChild(isolateContainer);

        return wrapper;
    }

    function createExclusiveLicensingSection(existingData = {}) {
        const section = document.createElement('div');
        section.className = 'exclusive-licensing-section mt-20 sm:mt-32 mb-20 sm:mb-32';
        section.style.cssText = `
            background: linear-gradient(135deg, rgba(147, 51, 234, 0.05) 0%, rgba(139, 92, 246, 0.03) 100%);
            border: 1px solid rgba(147, 51, 234, 0.15);
            border-radius: 12px;
            padding: 24px;
            position: relative;
            overflow: visible;
        `;
        
        // Decorative background element
        const bgDecor = document.createElement('div');
        bgDecor.style.cssText = `
            position: absolute;
            top: -20px;
            right: -20px;
            width: 120px;
            height: 120px;
            background: radial-gradient(circle, rgba(147, 51, 234, 0.1) 0%, transparent 70%);
            pointer-events: none;
            opacity: 0.5;
        `;
        section.appendChild(bgDecor);
        
                // Section header with enhanced styling
        const sectionHeader = document.createElement('div');
        sectionHeader.className = 'mb-20 relative z-10';
        
        const headerContainer = document.createElement('div');
        headerContainer.className = 'mb-8';
        
        const headerTitle = document.createElement('h4');
        headerTitle.className = 'text-base font-bold text-white mb-4 flex items-center gap-10';
        headerTitle.innerHTML = `
            <div style="
                width: 32px;
                height: 32px;
                background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%);
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 12px rgba(147, 51, 234, 0.3);
            ">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1M12 7C13.66 7 15 8.34 15 10V11C16.1 11 17 11.9 17 13V17C17 18.1 16.1 19 15 19H9C7.9 19 7 18.1 7 17V13C7 11.9 7.9 11 9 11V10C9 8.34 10.34 7 12 7M12 9C11.45 9 11 9.45 11 10V11H13V10C13 9.45 12.55 9 12 9Z"></path>
            </svg>
            </div>
            Exclusive Licensing Options
        `;
        
        const headerDesc = document.createElement('p');
        headerDesc.className = 'text-sm text-white/80 leading-relaxed';
        headerDesc.textContent = 'Set pricing and availability for exclusive rights to this beat';
        
        headerContainer.appendChild(headerTitle);
        headerContainer.appendChild(headerDesc);
        sectionHeader.appendChild(headerContainer);
        
        section.appendChild(sectionHeader);
        
        // Licensing Type Button Selector
        const licensingTypeContainer = document.createElement('div');
        licensingTypeContainer.className = 'mb-20';
        
        const licensingTypeLabel = document.createElement('label');
        licensingTypeLabel.className = 'block text-sm font-semibold text-white mb-10';
        licensingTypeLabel.textContent = 'Licensing Type';
        
        const licensingTypeButtons = document.createElement('div');
        licensingTypeButtons.className = 'grid grid-cols-1 sm:grid-cols-3 gap-8 p-4 rounded-lg bg-black/20';
        licensingTypeButtons.setAttribute('role', 'radiogroup');
        
        const licensingOptions = [
            { value: 'non_exclusive_only', label: 'Non-Exclusive Only', desc: 'BeatPass licensing' },
            { value: 'both', label: 'Both Options', desc: 'Maximum flexibility' },
            { value: 'exclusive_only', label: 'Exclusive Only', desc: 'Single buyer' }
        ];
        
        licensingOptions.forEach(option => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'licensing-type-button relative p-12 rounded-lg border transition-all duration-200';
            button.setAttribute('data-value', option.value);
            button.setAttribute('role', 'radio');
            button.setAttribute('aria-checked', (existingData.licensing_type || 'non_exclusive_only') === option.value ? 'true' : 'false');
            
            const isSelected = (existingData.licensing_type || 'non_exclusive_only') === option.value;
            
            button.style.cssText = isSelected ? `
                background: linear-gradient(135deg, rgba(147, 51, 234, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%);
                border-color: #9333ea;
                transform: scale(1.02);
            ` : `
                background: rgba(255, 255, 255, 0.02);
                border-color: rgba(255, 255, 255, 0.1);
            `;
            
            button.innerHTML = `
                <div class="text-center">
                    <div class="font-semibold text-sm ${isSelected ? 'text-purple-300' : 'text-white'} mb-2">${option.label}</div>
                    <div class="text-xs ${isSelected ? 'text-purple-300/80' : 'text-white/60'}">${option.desc}</div>
                </div>
                ${isSelected ? `
                    <div class="absolute top-8 right-8 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                    </div>
                ` : ''}
            `;
            
            button.addEventListener('click', () => {
                // Update all buttons
                licensingTypeButtons.querySelectorAll('.licensing-type-button').forEach(btn => {
                    const value = btn.getAttribute('data-value');
                    const isNowSelected = value === option.value;
                    btn.setAttribute('aria-checked', isNowSelected ? 'true' : 'false');
                    
                    btn.style.cssText = isNowSelected ? `
                        background: linear-gradient(135deg, rgba(147, 51, 234, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%);
                        border-color: #9333ea;
                        transform: scale(1.02);
                    ` : `
                        background: rgba(255, 255, 255, 0.02);
                        border-color: rgba(255, 255, 255, 0.1);
                    `;
                    
                    // Update button content
                    const opt = licensingOptions.find(o => o.value === value);
                    btn.innerHTML = `
                        <div class="text-center">
                            <div class="font-semibold text-sm ${isNowSelected ? 'text-purple-300' : 'text-white'} mb-2">${opt.label}</div>
                            <div class="text-xs ${isNowSelected ? 'text-purple-300/80' : 'text-white/60'}">${opt.desc}</div>
                        </div>
                        ${isNowSelected ? `
                            <div class="absolute top-8 right-8 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                                </svg>
                            </div>
                        ` : ''}
                    `;
                });
                
                // Update hidden input
                let hiddenInput = section.querySelector('#licensing_type');
                if (!hiddenInput) {
                    hiddenInput = document.createElement('input');
                    hiddenInput.type = 'hidden';
                    hiddenInput.id = 'licensing_type';
                    section.appendChild(hiddenInput);
                }
                hiddenInput.value = option.value;
                
                // Show/hide exclusive fields
                const showExclusiveFields = option.value !== 'non_exclusive_only';
                const exclusiveFieldsContainer = section.querySelector('.exclusive-fields-container');
                if (exclusiveFieldsContainer) {
                    exclusiveFieldsContainer.style.display = showExclusiveFields ? 'block' : 'none';
                }
                
                // Update status if needed
                if (option.value === 'non_exclusive_only') {
            const statusInput = section.querySelector('#exclusive_status');
            if (statusInput) {
                        statusInput.value = 'not_available';
                }
            }
            
            updatePendingCustomData();
                if (isEditPage()) {
                    setTimeout(() => updateDashboardContent(), 100);
                }
            });
            
            licensingTypeButtons.appendChild(button);
        });
        
        // Create hidden input for form submission
        const licensingTypeInput = document.createElement('input');
        licensingTypeInput.type = 'hidden';
        licensingTypeInput.id = 'licensing_type';
        licensingTypeInput.value = existingData.licensing_type || 'non_exclusive_only';
        section.appendChild(licensingTypeInput);
        
        licensingTypeContainer.appendChild(licensingTypeLabel);
        licensingTypeContainer.appendChild(licensingTypeButtons);
        section.appendChild(licensingTypeContainer);
        
        // Exclusive Fields Container (shown/hidden based on licensing type)
        const exclusiveFieldsContainer = document.createElement('div');
        exclusiveFieldsContainer.className = 'exclusive-fields-container';
        exclusiveFieldsContainer.style.display = (existingData.licensing_type === 'non_exclusive_only') ? 'none' : 'block';
        
        // Status Button Selector
        const statusContainer = document.createElement('div');
        statusContainer.className = 'mb-20';
        
        const statusLabel = document.createElement('label');
        statusLabel.className = 'block text-sm font-semibold text-white mb-10';
        statusLabel.textContent = 'Availability Status';
        
        const statusButtons = document.createElement('div');
        statusButtons.className = 'flex flex-col sm:flex-row gap-8';
        statusButtons.setAttribute('role', 'radiogroup');
        
        const statusOptions = [
            { value: 'available', label: 'Available', icon: '✓', color: 'green' },
            { value: 'sold', label: 'Sold', icon: '●', color: 'red' },
            { value: 'not_available', label: 'Not Listed', icon: '○', color: 'gray' }
        ];
        
        statusOptions.forEach(option => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'status-button flex-1 p-12 rounded-lg border transition-all duration-200';
            button.setAttribute('data-value', option.value);
            button.setAttribute('role', 'radio');
            
            const isSelected = (existingData.exclusive_status || 'not_available') === option.value;
            button.setAttribute('aria-checked', isSelected ? 'true' : 'false');
            
            const colors = {
                green: { border: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981' },
                red: { border: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444' },
                gray: { border: 'rgba(255, 255, 255, 0.2)', bg: 'rgba(255, 255, 255, 0.05)', text: 'rgba(255, 255, 255, 0.7)' }
            };
            
            const color = colors[option.color];
            
            button.style.cssText = isSelected ? `
                background: ${color.bg};
                border-color: ${color.border};
                transform: scale(1.02);
            ` : `
                background: rgba(255, 255, 255, 0.02);
                border-color: rgba(255, 255, 255, 0.1);
            `;
            
            button.innerHTML = `
                <div class="text-center">
                    <div class="text-2xl mb-2">${option.icon}</div>
                    <div class="font-medium text-sm ${isSelected ? 'text-white' : 'text-white/80'}">${option.label}</div>
                </div>
            `;
            
            button.addEventListener('click', () => {
                // Update all status buttons
                statusButtons.querySelectorAll('.status-button').forEach(btn => {
                    const value = btn.getAttribute('data-value');
                    const isNowSelected = value === option.value;
                    btn.setAttribute('aria-checked', isNowSelected ? 'true' : 'false');
                    
                    const opt = statusOptions.find(o => o.value === value);
                    const optColor = colors[opt.color];
                    
                    btn.style.cssText = isNowSelected ? `
                        background: ${optColor.bg};
                        border-color: ${optColor.border};
                        transform: scale(1.02);
                    ` : `
                        background: rgba(255, 255, 255, 0.02);
                        border-color: rgba(255, 255, 255, 0.1);
                    `;
                });
                
                // Update hidden input
                let statusInput = section.querySelector('#exclusive_status');
                if (!statusInput) {
                    statusInput = document.createElement('input');
                    statusInput.type = 'hidden';
                    statusInput.id = 'exclusive_status';
                    section.appendChild(statusInput);
                }
                statusInput.value = option.value;
                
                // Show/hide sold info
                const soldInfoContainer = section.querySelector('.sold-info-container');
                if (soldInfoContainer) {
                    soldInfoContainer.style.display = option.value === 'sold' ? 'block' : 'none';
                }
                
                updatePendingCustomData();
                if (isEditPage()) {
                    setTimeout(() => updateDashboardContent(), 100);
                }
            });
            
            statusButtons.appendChild(button);
        });
        
        // Create hidden input for status
        const statusInput = document.createElement('input');
        statusInput.type = 'hidden';
        statusInput.id = 'exclusive_status';
        statusInput.value = existingData.exclusive_status || 'not_available';
        section.appendChild(statusInput);
        
        statusContainer.appendChild(statusLabel);
        statusContainer.appendChild(statusButtons);
        exclusiveFieldsContainer.appendChild(statusContainer);
        
        // Price and Currency Section
        const priceSection = document.createElement('div');
        priceSection.className = 'exclusive-price-container grid grid-cols-1 sm:grid-cols-2 gap-16 mb-20';
        
        // Price Field
        const priceField = createPriceField(
            'Exclusive Price',
            'exclusive_price',
            'Enter price...',
            existingData.exclusive_price || ''
        );
        priceField.classList.remove('mb-24');
        priceSection.appendChild(priceField);
        
        // Currency Selector
        const currencyContainer = document.createElement('div');
        currencyContainer.className = 'text-sm';
        
        const currencyLabel = document.createElement('label');
        currencyLabel.className = 'block first-letter:capitalize text-left whitespace-nowrap text-sm mb-4';
        currencyLabel.textContent = 'Currency';
        currencyLabel.setAttribute('for', 'exclusive_currency');
        
        const currencyButtonGroup = document.createElement('div');
        currencyButtonGroup.className = 'flex flex-wrap gap-6';
        
        const currencies = [
            { value: 'USD', symbol: '$', label: 'USD' },
            { value: 'EUR', symbol: '€', label: 'EUR' },
            { value: 'GBP', symbol: '£', label: 'GBP' },
            { value: 'CAD', symbol: 'C$', label: 'CAD' }
        ];
        
        currencies.forEach(curr => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'currency-button px-12 py-8 rounded-lg border text-sm font-medium transition-all duration-200';
            button.setAttribute('data-value', curr.value);
            
            const isSelected = (existingData.exclusive_currency || 'USD') === curr.value;
            
            button.style.cssText = isSelected ? `
                background: linear-gradient(135deg, rgba(147, 51, 234, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%);
                border-color: #9333ea;
                color: #a78bfa;
            ` : `
                background: rgba(255, 255, 255, 0.02);
                border-color: rgba(255, 255, 255, 0.1);
                color: rgba(255, 255, 255, 0.7);
            `;
            
            button.innerHTML = `<span style="margin-right: 4px;">${curr.symbol}</span>${curr.label}`;
            
            button.addEventListener('click', () => {
                // Update all currency buttons
                currencyButtonGroup.querySelectorAll('.currency-button').forEach(btn => {
                    const value = btn.getAttribute('data-value');
                    const isNowSelected = value === curr.value;
                    
                    btn.style.cssText = isNowSelected ? `
                        background: linear-gradient(135deg, rgba(147, 51, 234, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%);
                        border-color: #9333ea;
                        color: #a78bfa;
                    ` : `
                        background: rgba(255, 255, 255, 0.02);
                        border-color: rgba(255, 255, 255, 0.1);
                        color: rgba(255, 255, 255, 0.7);
                    `;
                });
                
                // Update hidden input
                let currencyInput = section.querySelector('#exclusive_currency');
                if (!currencyInput) {
                    currencyInput = document.createElement('input');
                    currencyInput.type = 'hidden';
                    currencyInput.id = 'exclusive_currency';
                    section.appendChild(currencyInput);
                }
                currencyInput.value = curr.value;
                
                updatePendingCustomData();
                if (isEditPage()) {
                    setTimeout(() => updateDashboardContent(), 100);
                }
            });
            
            currencyButtonGroup.appendChild(button);
        });
        
        // Create hidden input for currency
        const currencyInput = document.createElement('input');
        currencyInput.type = 'hidden';
        currencyInput.id = 'exclusive_currency';
        currencyInput.value = existingData.exclusive_currency || 'USD';
        section.appendChild(currencyInput);
        
        currencyContainer.appendChild(currencyLabel);
        currencyContainer.appendChild(currencyButtonGroup);
        priceSection.appendChild(currencyContainer);
        
        exclusiveFieldsContainer.appendChild(priceSection);
        
        // Sold Info Container (visibility toggled)
        const soldInfoContainer = document.createElement('div');
        soldInfoContainer.className = 'sold-info-container';
        soldInfoContainer.style.cssText = `
            display: ${existingData.exclusive_status === 'sold' ? 'block' : 'none'};
            background: rgba(239, 68, 68, 0.05);
            border: 1px solid rgba(239, 68, 68, 0.2);
            border-radius: 8px;
            padding: 16px;
            margin-top: 20px;
        `;
        
        const soldHeader = document.createElement('div');
        soldHeader.className = 'flex items-center gap-8 mb-12';
        soldHeader.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#ef4444">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <span class="text-sm font-semibold text-red-400">Sold Information</span>
        `;
        soldInfoContainer.appendChild(soldHeader);

        const buyerInfoField = createTextField(
            'Buyer Details',
            'exclusive_buyer_info',
            'Enter buyer name, ID, or contact info...',
            existingData.exclusive_buyer_info || ''
        );
        soldInfoContainer.appendChild(buyerInfoField);

        if (existingData.exclusive_sold_date) {
            const soldDateContainer = document.createElement('div');
            soldDateContainer.className = 'mt-12 p-12 rounded-lg bg-black/20';
            soldDateContainer.innerHTML = `
                <label class="block text-xs text-white/60 mb-4">Date of Sale</label>
                <p class="text-sm font-medium text-white/90">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" class="inline mr-6 text-white/60">
                        <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                    </svg>
                    ${new Date(existingData.exclusive_sold_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
            `;
            soldInfoContainer.appendChild(soldDateContainer);
        }
        
        exclusiveFieldsContainer.appendChild(soldInfoContainer);
        
        // Add exclusive fields container to section
        section.appendChild(exclusiveFieldsContainer);

        return section;
    }

    function createSampleSafeBanner() {
        // Create banner container using native form styling
        const banner = document.createElement('div');
        banner.className = 'mt-24 mb-8';
        
        // Start invisible for smooth animation
        banner.style.cssText = `
            opacity: 0;
            transform: translateY(15px);
            transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        `;
        
        // Main banner container with enhanced styling
        const bannerCard = document.createElement('div');
        bannerCard.className = 'isolate relative';
        bannerCard.style.cssText = `
            border-radius: 16px;
            box-shadow: 
                0 10px 32px rgba(0, 0, 0, 0.15),
                0 4px 16px rgba(0, 0, 0, 0.1),
                inset 0 1px 0 rgba(255, 255, 255, 0.1);
        `;
        
        const innerCard = document.createElement('div');
        innerCard.className = 'block relative w-full overflow-hidden';
        innerCard.style.cssText = `
            background: linear-gradient(135deg, 
                rgba(6, 17, 14, 0.95) 0%, 
                rgba(20, 33, 28, 0.92) 35%,
                rgba(16, 28, 24, 0.95) 100%);
            backdrop-filter: blur(20px) saturate(180%);
            border: 1px solid rgba(16, 185, 129, 0.25);
            border-radius: 16px;
            padding: 0;
        `;
        
        // Enhanced background pattern with subtle animation
        const bgPattern = document.createElement('div');
        bgPattern.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            opacity: 0.06;
            background: 
                radial-gradient(circle at 20% 30%, #10b981 0%, transparent 40%),
                radial-gradient(circle at 80% 70%, #059669 0%, transparent 40%),
                radial-gradient(circle at 60% 20%, #047857 0%, transparent 30%);
            animation: bgFloat 8s ease-in-out infinite;
            pointer-events: none;
        `;
        innerCard.appendChild(bgPattern);
        
        // Header section with improved styling
        const header = document.createElement('div');
        header.className = 'relative z-10';
        header.style.cssText = `
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.08) 100%);
            border-bottom: 1px solid rgba(16, 185, 129, 0.2);
            padding: 20px 24px;
        `;
        
        const headerContent = document.createElement('div');
        headerContent.className = 'flex items-center justify-between';
        
        // Enhanced Sample-Safe™ branding
        const brandingContainer = document.createElement('div');
        brandingContainer.className = 'flex items-center gap-16';
        
        const shieldContainer = document.createElement('div');
        shieldContainer.className = 'relative';
        
        const shieldIcon = document.createElement('div');
        shieldIcon.className = 'flex items-center justify-center w-12 h-12 rounded-xl';
        shieldIcon.style.cssText = `
            background: linear-gradient(135deg, #10b981 0%, #047857 100%);
            box-shadow: 
                0 8px 24px rgba(16, 185, 129, 0.4),
                inset 0 1px 0 rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(16, 185, 129, 0.3);
        `;
        shieldIcon.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1M10 17L6 13L7.41 11.59L10 14.17L16.59 7.58L18 9L10 17Z"/>
            </svg>
        `;
        
        // Pulse ring animation with proper class
        const pulseRing = document.createElement('div');
        pulseRing.className = 'pulse-ring';
        shieldContainer.appendChild(pulseRing);
        shieldContainer.appendChild(shieldIcon);
        
        const titleContainer = document.createElement('div');
        
        const sampleSafeBadge = document.createElement('div');
        sampleSafeBadge.className = 'mb-6';
        sampleSafeBadge.style.cssText = `
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 6px 12px;
            border-radius: 20px;
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(5, 150, 105, 0.15) 100%);
            border: 1px solid rgba(16, 185, 129, 0.4);
            font-size: 12px;
            font-weight: 600;
            color: #34d399;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        `;
        sampleSafeBadge.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            Sample-Safe™ Guarantee
        `;
        
        const headerTitle = document.createElement('h3');
        headerTitle.style.cssText = `
            font-size: 20px;
            font-weight: 700;
            color: white;
            margin: 0;
            letter-spacing: -0.02em;
        `;
        headerTitle.textContent = 'Producer Responsibility & Sample Clearance';
        
        titleContainer.appendChild(sampleSafeBadge);
        titleContainer.appendChild(headerTitle);
        
        brandingContainer.appendChild(shieldContainer);
        brandingContainer.appendChild(titleContainer);
        headerContent.appendChild(brandingContainer);
        header.appendChild(headerContent);
        
        // Main content sections with improved spacing
        const contentContainer = document.createElement('div');
        contentContainer.className = 'relative z-10';
        contentContainer.style.padding = '20px';
        
        // Create sections with professional styling
        const sections = [
            {
                id: 'warning',
                title: 'Terms of Service - Prohibited Content',
                icon: `<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>`,
                color: '#f59e0b',
                bgColor: 'rgba(245, 158, 11, 0.08)',
                borderColor: 'rgba(245, 158, 11, 0.25)',
                                 items: [
                     {
                         icon: `<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>`,
                         text: '<strong>STRICTLY PROHIBITED:</strong> Uploading beats containing <strong>uncleared samples</strong> or <strong>duplicate content</strong>'
                     },
                     {
                         icon: `<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>`,
                         text: '<strong>VIOLATIONS INCLUDE:</strong> Copyrighted material, unauthorized samples, previously uploaded beats, or content you do not own 100%'
                     }
                 ]
            },
            {
                id: 'responsibility',
                title: 'Producer Legal Warranty & Responsibility',
                icon: `<path d="M9 16.17l-4.17-4.17-1.42 1.41L9 19 21 7l-1.41-1.41z"/>`,
                color: '#10b981',
                bgColor: 'rgba(16, 185, 129, 0.06)',
                borderColor: 'rgba(16, 185, 129, 0.2)',
                items: [
                    {
                        icon: `<path d="M9 16.17l-4.17-4.17-1.42 1.41L9 19 21 7l-1.41-1.41z"/>`,
                        text: '<strong>YOU WARRANT:</strong> All samples are properly cleared and licensed for commercial use'
                    },
                    {
                        icon: `<path d="M9 16.17l-4.17-4.17-1.42 1.41L9 19 21 7l-1.41-1.41z"/>`,
                        text: '<strong>YOU GUARANTEE:</strong> This work is 100% yours and safe to license commercially without copyright risk'
                    },
                    {
                        icon: `<path d="M9 16.17l-4.17-4.17-1.42 1.41L9 19 21 7l-1.41-1.41z"/>`,
                        text: '<strong>YOU INDEMNIFY:</strong> Buyers against any legal claims related to uncleared samples or copyright infringement'
                    }
                ]
            },
            {
                id: 'enforcement',
                title: 'Platform Enforcement & Community Safety',
                icon: `<path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1M11 7H13V9H11V7M11 11H13V17H11V11Z"/>`,
                color: '#ef4444',
                bgColor: 'rgba(239, 68, 68, 0.06)',
                borderColor: 'rgba(239, 68, 68, 0.2)',
                                 items: [
                     {
                         icon: `<path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1M10 17L6 13L7.41 11.59L10 14.17L16.59 7.58L18 9L10 17Z"/>`,
                         text: '<strong>OUR COMMITMENT:</strong> Maintaining a safe, trustworthy community for all producers and buyers'
                     },
                     {
                         icon: `<path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>`,
                         text: '<strong>ENFORCEMENT:</strong> We can terminate producer accounts if tracks are reported to contain uncleared samples after licensing'
                     },
                     {
                         icon: `<path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>`,
                         text: '<strong>DETECTION:</strong> Our BeatPassID system actively scans for duplicate content and copyright violations'
                     }
                 ]
            }
        ];
        
                 sections.forEach((section, index) => {
             const sectionElement = document.createElement('div');
             sectionElement.className = 'section-spacing';
             sectionElement.style.cssText = `
                 background: linear-gradient(135deg, ${section.bgColor} 0%, rgba(0, 0, 0, 0.02) 100%);
                 border: 1px solid ${section.borderColor};
                 border-radius: 12px;
                 padding: 16px;
                 animation: slideInUp 0.6s ease-out ${(index + 1) * 0.1}s both;
             `;
            
                         const sectionHeader = document.createElement('div');
             sectionHeader.className = 'flex items-center gap-10 mb-12';
            
            const iconContainer = document.createElement('div');
            iconContainer.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: center;
                width: 32px;
                height: 32px;
                border-radius: 8px;
                background: linear-gradient(135deg, ${section.color}20 0%, ${section.color}10 100%);
                border: 1px solid ${section.color}30;
            `;
            iconContainer.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="${section.color}">
                    ${section.icon}
                </svg>
            `;
            
            const sectionTitle = document.createElement('h4');
            sectionTitle.style.cssText = `
                font-size: 14px;
                font-weight: 700;
                color: ${section.color};
                margin: 0;
                letter-spacing: -0.01em;
            `;
            sectionTitle.textContent = section.title;
            
            sectionHeader.appendChild(iconContainer);
            sectionHeader.appendChild(sectionTitle);
            
                         const itemsList = document.createElement('div');
             itemsList.style.cssText = 'display: flex; flex-direction: column;';
             
             section.items.forEach((item, itemIndex) => {
                 const itemElement = document.createElement('div');
                 itemElement.className = 'flex items-start gap-10 item-spacing';
                
                const itemIcon = document.createElement('div');
                itemIcon.style.cssText = `
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 20px;
                    height: 20px;
                    margin-top: 1px;
                    flex-shrink: 0;
                `;
                itemIcon.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="${section.color}">
                        ${item.icon}
                    </svg>
                `;
                
                const itemText = document.createElement('div');
                itemText.style.cssText = `
                    font-size: 13px;
                    line-height: 1.6;
                    color: rgba(255, 255, 255, 0.9);
                `;
                itemText.innerHTML = item.text;
                
                itemElement.appendChild(itemIcon);
                itemElement.appendChild(itemText);
                itemsList.appendChild(itemElement);
            });
            
            sectionElement.appendChild(sectionHeader);
            sectionElement.appendChild(itemsList);
            contentContainer.appendChild(sectionElement);
        });
        
        // Contact section with improved design
        const contactSection = document.createElement('div');
        contactSection.className = 'section-spacing';
        contactSection.style.cssText = `
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(29, 78, 216, 0.04) 100%);
            border: 1px solid rgba(59, 130, 246, 0.2);
            border-radius: 12px;
            padding: 16px;
        `;
        
        const contactHeader = document.createElement('div');
        contactHeader.className = 'flex items-center gap-10 mb-10';
        
        const contactIcon = document.createElement('div');
        contactIcon.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            border-radius: 6px;
            background: rgba(59, 130, 246, 0.15);
            border: 1px solid rgba(59, 130, 246, 0.3);
        `;
        contactIcon.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#3b82f6">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
            </svg>
        `;
        
        const contactTitle = document.createElement('h5');
        contactTitle.style.cssText = `
            font-size: 13px;
            font-weight: 600;
            color: #60a5fa;
            margin: 0;
        `;
        contactTitle.textContent = 'Questions or Issues?';
        
        contactHeader.appendChild(contactIcon);
        contactHeader.appendChild(contactTitle);
        
        const contactText = document.createElement('div');
        contactText.style.cssText = `
            font-size: 12px;
            line-height: 1.6;
            color: rgba(255, 255, 255, 0.8);
        `;
        contactText.innerHTML = `
            Contact BeatPass administrators at <a href="mailto:support@beatpass.ca" class="text-blue-400 hover:text-blue-300 underline font-medium transition-colors">support@beatpass.ca</a> 
            or through our <a href="https://open.beatpass.ca/support" target="_blank" class="text-blue-400 hover:text-blue-300 underline font-medium transition-colors">support portal</a> 
            for any questions about sample clearance, licensing, or platform policies.
        `;
        
        contactSection.appendChild(contactHeader);
        contactSection.appendChild(contactText);
        contentContainer.appendChild(contactSection);
        
        // Enhanced agreement checkbox section
        const agreementSection = document.createElement('div');
        agreementSection.style.cssText = `
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.06) 100%);
            border: 2px solid rgba(16, 185, 129, 0.3);
            border-radius: 12px;
            padding: 16px;
            position: relative;
            overflow: hidden;
            margin-top: 4px;
        `;
        
        // Agreement section background accent
        const agreementBg = document.createElement('div');
        agreementBg.style.cssText = `
            position: absolute;
            top: 0;
            right: 0;
            width: 80px;
            height: 80px;
            background: radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%);
            pointer-events: none;
        `;
        agreementSection.appendChild(agreementBg);
        
        const agreementContent = document.createElement('div');
        agreementContent.className = 'flex items-start gap-12 relative z-10';
        
        const checkboxContainer = document.createElement('div');
        checkboxContainer.className = 'relative flex-shrink-0 mt-2';
        
        const agreementCheckbox = document.createElement('input');
        agreementCheckbox.type = 'checkbox';
        agreementCheckbox.id = 'sample-safe-agreement';
        agreementCheckbox.style.cssText = `
            width: 20px;
            height: 20px;
            border-radius: 4px;
            border: 2px solid #10b981;
            background: transparent;
            accent-color: #10b981;
            cursor: pointer;
            transition: all 0.2s ease;
        `;
        
        const agreementLabel = document.createElement('label');
        agreementLabel.htmlFor = 'sample-safe-agreement';
        agreementLabel.style.cssText = `
            font-size: 14px;
            font-weight: 500;
            line-height: 1.6;
            color: white;
            cursor: pointer;
        `;
        agreementLabel.innerHTML = `
            <strong>I understand and agree:</strong> I warrant that this beat contains only cleared samples (or is 100% original), 
            does not violate any copyrights, is not a duplicate, and is safe for commercial licensing under the Sample-Safe™ guarantee. 
            I accept full legal responsibility for any sample clearance issues.
        `;
        
        checkboxContainer.appendChild(agreementCheckbox);
        agreementContent.appendChild(checkboxContainer);
        agreementContent.appendChild(agreementLabel);
        agreementSection.appendChild(agreementContent);
        contentContainer.appendChild(agreementSection);
        
        // Assemble components
        innerCard.appendChild(header);
        innerCard.appendChild(contentContainer);
        bannerCard.appendChild(innerCard);
        banner.appendChild(bannerCard);
        
        // Enhanced animations with proper CSS
        const style = document.createElement('style');
        style.textContent = `
            @keyframes bgFloat {
                0%, 100% { transform: translate(0, 0) scale(1); }
                33% { transform: translate(-10px, -10px) scale(1.05); }
                66% { transform: translate(10px, -5px) scale(0.95); }
            }
            
            @keyframes pulse {
                0%, 100% { 
                    opacity: 0.3; 
                    transform: scale(1); 
                }
                50% { 
                    opacity: 0.6; 
                    transform: scale(1.08); 
                }
            }
            
            @keyframes slideInUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            /* Ensure proper rendering of Sample-Safe banner elements */
            #sample-safe-banner .pulse-ring {
                animation: pulse 2.5s ease-in-out infinite !important;
                border: 2px solid rgba(16, 185, 129, 0.4) !important;
                border-radius: 16px !important;
                position: absolute !important;
                inset: -4px !important;
                pointer-events: none !important;
            }
            
            #sample-safe-banner svg {
                display: block !important;
                flex-shrink: 0 !important;
            }
            
            #sample-safe-banner .section-spacing {
                margin-bottom: 16px !important;
            }
            
            #sample-safe-banner .item-spacing {
                margin-bottom: 8px !important;
            }
        `;
        if (!document.getElementById('sample-safe-animations')) {
            style.id = 'sample-safe-animations';
            document.head.appendChild(style);
        }
        
        // Smooth entrance animation
        requestAnimationFrame(() => {
            setTimeout(() => {
                banner.style.opacity = '1';
                banner.style.transform = 'translateY(0)';
            }, 150);
        });
        
        // Enhanced checkbox validation with visual feedback
        agreementCheckbox.addEventListener('change', () => {
            const submitButton = document.querySelector('form button[type="submit"]');
            if (submitButton) {
                if (agreementCheckbox.checked) {
                    submitButton.disabled = false;
                    submitButton.style.opacity = '1';
                    agreementSection.style.borderColor = 'rgba(16, 185, 129, 0.5)';
                    agreementSection.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.08) 100%)';
                } else {
                    submitButton.disabled = true;
                    submitButton.style.opacity = '0.5';
                    agreementSection.style.borderColor = 'rgba(16, 185, 129, 0.3)';
                    agreementSection.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.06) 100%)';
                }
            }
        });
        
        // Initially disable submit button until agreement is checked
        setTimeout(() => {
            const submitButton = document.querySelector('form button[type="submit"]');
            if (submitButton && !agreementCheckbox.checked) {
                submitButton.disabled = true;
                submitButton.style.opacity = '0.5';
            }
        }, 500);
        
        return banner;
    }

    // ---------------------------
    // Data Management for Upload/Edit Pages
    // ---------------------------
    function updatePendingCustomData() {
        if (!isUploadPage()) return;
        const keyName = document.getElementById('key_name')?.value.trim() || '';
        const scale = document.getElementById('scale')?.value.trim() || '';
        const bpm = document.getElementById('bpm')?.value.trim() || '';
        const trackName = getTrackName();
        const duration = getDuration();
        const producers = getProducers();
        const tags = getTags();
        
        // NEW: Get exclusive licensing data
        const { licensing_type, exclusive_price, exclusive_currency, exclusive_status, exclusive_buyer_info } = getExclusiveLicensingData();
        
        console.log("📋 Updating pending custom data:", {
            keyName,
            scale,
            bpm,
            trackName,
            duration,
            producers,
            tags,
            licensing_type,
            exclusive_price,
            exclusive_currency,
            exclusive_status,
            exclusive_buyer_info
        });
        
        // Store data even if not all fields are complete (track name is essential)
        if (keyName || scale || bpm || trackName || producers || tags || licensing_type !== 'non_exclusive_only') {
            const pending = { 
                key_name: keyName, 
                scale, 
                bpm, 
                track_name: trackName || '', 
                duration_ms: duration,
                producers,
                tags,
                licensing_type,
                exclusive_price: licensing_type !== 'non_exclusive_only' ? exclusive_price : '',
                exclusive_currency,
                exclusive_status: licensing_type === 'non_exclusive_only' ? 'not_available' : exclusive_status,
                exclusive_buyer_info
            };
            localStorage.setItem('pendingCustomData', JSON.stringify(pending));
            console.log("💾 Saved pending custom data to localStorage");
        } else {
            console.warn("⚠️ No data to save - all fields empty");
        }
    }

    function clearCustomFields() {
        const existing = document.getElementById('custom-fields-container');
        if (existing) existing.remove();
        
        // Also remove Sample-Safe™ banner if it exists
        const banner = document.getElementById('sample-safe-banner');
        if (banner) banner.remove();
        
        // Clean up any orphaned dropdown panels
        document.querySelectorAll('.dropdown-panel').forEach(dropdown => {
            if (dropdown.parentNode) dropdown.parentNode.removeChild(dropdown);
        });
        
        isFieldsInjected = false;
        fieldsReady = false;
    }

    async function fetchExistingCustomData() {
        clearCustomFields();
        const trackId = getTrackId();
        const trackName = getTrackName();
        let params;
        if (trackId) {
            params = new URLSearchParams({ track_id: trackId });
        } else if (trackName) {
            params = new URLSearchParams({ track_name: trackName });
        } else {
            injectCustomFields();
            return;
        }
        try {
            const res = await fetch(`${API_URL}?${params}`);
            const data = await res.json();
            if (data.status === 'success' && data.data) {
                window.customRecord = data.data;
                injectCustomFields(data.data);
            } else {
                window.customRecord = null;
                debouncedInjectCustomFields();
            }
        } catch (err) {
            console.error("Error fetching custom data:", err);
            window.customRecord = null;
            debouncedInjectCustomFields();
        }
    }

    function injectCustomFields(existingData = { 
        key_name: '', 
        scale: '', 
        bpm: '', 
        producers: '', 
        tags: '',
        licensing_type: 'non_exclusive_only',
        exclusive_price: '',
        exclusive_currency: 'USD',
        exclusive_status: 'not_available',
        exclusive_buyer_info: ''
    }) {
        console.log("🎯 Starting custom fields injection...");
        
        if (isFieldsInjected || document.getElementById('custom-fields-container')) {
            console.log('⚠️ Custom fields already injected, skipping');
            return;
        }

        const nameField = document.querySelector('input[name="name"]');
        if (!nameField) {
            console.log("⏳ Name field not found yet, setting up observer...");
            
            // Use a MutationObserver to wait for the name field to appear
            if (!window.customFieldsNameObserver) {
                let observerAttempts = 0;
                const maxObserverAttempts = 20; // 10 seconds max wait
                
                window.customFieldsNameObserver = new MutationObserver(() => {
                    observerAttempts++;
                    const nameFieldNow = document.querySelector('input[name="name"]');
                    if (nameFieldNow) {
                        console.log("✅ Name field appeared! Proceeding with injection...");
                        window.customFieldsNameObserver.disconnect();
                        window.customFieldsNameObserver = null;
                        
                        // Small delay to ensure form is fully ready
                        setTimeout(() => {
                        debouncedInjectCustomFields(existingData);
                        }, 100);
                    } else if (observerAttempts >= maxObserverAttempts) {
                        console.warn("⚠️ Name field did not appear after maximum attempts, stopping observer");
                        window.customFieldsNameObserver.disconnect();
                        window.customFieldsNameObserver = null;
                    }
                });
                
                window.customFieldsNameObserver.observe(document.body, { 
                    childList: true, 
                    subtree: true,
                    attributes: true,
                    attributeFilter: ['name']
                });
                
                console.log("📡 Name field observer active");
            }
            return;
        }

        console.log("🧹 Clearing any existing custom fields...");
        clearCustomFields();
        
        console.log("🏗️ Creating custom fields container...");
        // Create native container using native form field spacing
        const container = document.createElement('div');
        container.id = 'custom-fields-container';
        container.className = 'mt-24'; // Use native margin top spacing
        
        // Start invisible to prevent flash
        container.style.cssText = `
            opacity: 0;
            transform: translateY(10px);
            transition: opacity 0.4s ease-out, transform 0.4s ease-out;
        `;
        
        // Create a single row container for Key, Scale, and BPM
        const metadataRow = document.createElement('div');
        metadataRow.className = 'grid grid-cols-3 gap-12 mb-24'; // Use native grid layout with gaps
        
        console.log("🎹 Creating individual field components...");
        // Create fields using native UI patterns - modified for inline layout
        const keyField = createDropdownField(
            'Key', 'key_name', 'Select Key',
            ['C', 'C# / D♭', 'D', 'D# / E♭', 'E', 'F', 'F# / G♭', 'G', 'G# / A♭', 'A', 'A# / B♭', 'B'],
            existingData.key_name
        );
        const scaleField = createDropdownField(
            'Scale', 'scale', 'Select Scale',
            ['Major', 'Minor'],
            existingData.scale
        );
        const bpmField = createBPMField(existingData.bpm);
        
        // Remove the bottom margin from individual fields since they're in a row
        keyField.classList.remove('mb-24');
        scaleField.classList.remove('mb-24');
        bpmField.classList.remove('mb-24');
        
        console.log("📦 Assembling field layout...");
        metadataRow.appendChild(keyField);
        metadataRow.appendChild(scaleField);
        metadataRow.appendChild(bpmField);
        
        container.appendChild(metadataRow);
        
        // NEW: Add Exclusive Licensing Section for both upload and edit pages
        const exclusiveLicensingSection = createExclusiveLicensingSection(existingData);
        container.appendChild(exclusiveLicensingSection);
        
        // Add Sample-Safe™ banner for upload pages
        if (isUploadPage()) {
            const sampleSafeBanner = createSampleSafeBanner();
            container.appendChild(sampleSafeBanner);
        }
        
        console.log("📍 Inserting container into DOM...");
        // Insert after the name field, respecting native form layout
        try {
            nameField.parentNode.insertBefore(container, nameField.nextSibling);
            console.log("✅ Custom fields container successfully inserted into DOM");
            
            // Smooth fade-in animation
            requestAnimationFrame(() => {
                setTimeout(() => {
                    container.style.opacity = '1';
                    container.style.transform = 'translateY(0)';
                }, 50); // Small delay to ensure DOM is ready
            });
        } catch (error) {
            console.error("❌ Error inserting custom fields container:", error);
            throw error;
        }
        
        console.log("🚀 Finalizing injection...");
        isFieldsInjected = true;
        fieldsReady = true;
        enableSubmitButton();

        // Style the save button using native patterns
        const saveButton = document.querySelector('button[type="submit"]');
        if (saveButton) {
            styleSaveButton(saveButton);
        }

        if (isUploadPage()) observeConfirmationPage();
        
        // Ensure smooth animation styles are loaded
        ensureAnimationStyles();
        
        // Add exclusive licensing button styles
        ensureExclusiveLicensingStyles();
    }
    
    // Ensure consistent animation styles are loaded
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
    
    // Ensure exclusive licensing button styles are loaded
    function ensureExclusiveLicensingStyles() {
        if (document.getElementById('exclusive-licensing-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'exclusive-licensing-styles';
        style.textContent = `
            /* Exclusive Licensing Button Styles */
            .exclusive-licensing-section {
                animation: beatpass-fadeIn 0.5s ease-out;
            }
            
            .licensing-type-button:hover:not([aria-checked="true"]) {
                background: rgba(147, 51, 234, 0.08) !important;
                border-color: rgba(147, 51, 234, 0.3) !important;
                transform: scale(1.01);
            }
            
            .status-button:hover:not([aria-checked="true"]) {
                transform: scale(1.01);
                filter: brightness(1.1);
            }
            
            .currency-button:hover:not([style*="9333ea"]) {
                background: rgba(147, 51, 234, 0.08) !important;
                border-color: rgba(147, 51, 234, 0.3) !important;
                color: rgba(255, 255, 255, 0.9) !important;
            }
            
            /* Smooth transitions for exclusive fields visibility */
            .exclusive-fields-container {
                animation: beatpass-fadeIn 0.3s ease-out;
            }
            
            .sold-info-container {
                animation: beatpass-slideIn 0.3s ease-out;
            }
            
            /* Button press effect */
            .licensing-type-button:active,
            .status-button:active,
            .currency-button:active {
                transform: scale(0.98) !important;
            }
            
            /* Focus styles for accessibility */
            .licensing-type-button:focus-visible,
            .status-button:focus-visible,
            .currency-button:focus-visible {
                outline: 2px solid #9333ea;
                outline-offset: 2px;
            }
            
            /* Enhance the section appearance */
            .exclusive-licensing-section::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 1px;
                background: linear-gradient(90deg, transparent, rgba(147, 51, 234, 0.3), transparent);
                opacity: 0.5;
            }
            
            /* Mobile-specific styles */
            @media (max-width: 640px) {
                .exclusive-licensing-section {
                    margin-left: -8px;
                    margin-right: -8px;
                    padding: 16px;
                }
                
                .licensing-type-button {
                    padding: 16px 12px;
                    text-align: center;
                }
                
                .status-button {
                    padding: 16px 12px;
                    min-height: 80px;
                }
                
                .currency-button {
                    min-width: 80px;
                    flex: 1;
                    justify-content: center;
                }
                
                /* Reduce icon size in header on mobile */
                .exclusive-licensing-section h4 > div {
                    width: 28px !important;
                    height: 28px !important;
                }
                
                .exclusive-licensing-section h4 > div svg {
                    width: 16px !important;
                    height: 16px !important;
                }
            }
            
            /* Tablet-specific adjustments */
            @media (min-width: 641px) and (max-width: 1024px) {
                .currency-button {
                    flex: 1;
                    justify-content: center;
                }
            }
            
            /* BeatPassID Dashboard Mobile Styles */
            @media (max-width: 640px) {
                .beatpass-id-mobile-responsive {
                    margin-left: -8px;
                    margin-right: -8px;
                }
                
                .beatpass-id-mobile-responsive .p-18 {
                    padding: 12px !important;
                }
                
                .beatpass-id-mobile-responsive .p-16 {
                    padding: 12px !important;
                }
                
                .beatpass-id-mobile-responsive .gap-12 {
                    gap: 8px !important;
                }
                
                .beatpass-id-mobile-responsive .mb-12 {
                    margin-bottom: 8px !important;
                }
                
                .beatpass-id-mobile-responsive .mb-16 {
                    margin-bottom: 12px !important;
                }
                
                /* Reduce icon size in BeatPassID header on mobile */
                .beatpass-id-mobile-responsive h3 + div {
                    width: 36px !important;
                    height: 36px !important;
                }
                
                /* Make buttons more touch-friendly */
                .beatpass-id-mobile-responsive button {
                    min-height: 44px;
                    padding: 12px 16px;
                }
                
                /* Adjust text sizes for mobile */
                .beatpass-id-mobile-responsive .text-base {
                    font-size: 14px !important;
                }
                
                .beatpass-id-mobile-responsive .text-sm {
                    font-size: 12px !important;
                }
                
                .beatpass-id-mobile-responsive .text-xs {
                    font-size: 11px !important;
                }
                
                /* Better spacing for mobile content */
                .beatpass-id-mobile-responsive .leading-relaxed {
                    line-height: 1.4 !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    async function submitCustomData(pendingData) {
        let key_name, scale, bpm, track_name, track_id, playback_url, duration_ms;
        if (pendingData) {
            ({ key_name, scale, bpm, track_name, track_id, playback_url, duration_ms } = pendingData);
            console.log("📋 Using pending data for submission:", pendingData);
        } else {
            key_name = document.getElementById('key_name')?.value.trim() || '';
            scale = document.getElementById('scale')?.value.trim() || '';
            bpm = document.getElementById('bpm')?.value.trim() || '';
            track_name = getTrackName();
            duration_ms = getDuration();
            // Get playback URL from the input field if we're on the edit page
            if (isEditPage()) {
                const playbackInput = document.querySelector('input[name="src"]');
                if (playbackInput) {
                    playback_url = playbackInput.value.trim();
                    console.log("Found playback URL input field");
                } else {
                    console.log("Playback URL input not found");
                }
            }
            console.log("📋 Using form data for submission:", {
                key_name, scale, bpm, track_name, track_id, playback_url, duration_ms
            });
        }

        // Enhanced validation with track name requirement
        if (!track_id) {
            console.warn("❌ Cannot submit custom data: missing track_id");
            return false;
        }

        if (!track_name || track_name.trim() === '') {
            console.warn("⚠️ Track name is missing - this may cause database issues");
        }
        
        // Check if we have at least some metadata to submit
        if (!key_name && !scale && !bpm && !track_name && !playback_url) {
            console.warn("❌ No metadata to submit - all fields empty");
            return false;
        }

        // Ensure track_name is included in payload (required for database consistency)
        const payload = { 
            key_name: key_name || '', 
            scale: scale || '', 
            bpm: bpm || '', 
            track_name: track_name || '', 
            track_id 
        };
        
        if (playback_url) {
            payload.playback_url = playback_url;
            console.log("Adding playback URL to payload");
        }
        if (duration_ms !== null && duration_ms !== undefined) {
            payload.duration_ms = duration_ms;
            console.log("Adding duration to payload:", duration_ms);
        }
        
        console.log("📤 Final payload for submission:", payload);

        try {
            const res = await fetch('key_bpm_handler.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams(payload)
            });
            const text = await res.text();
            JSON.parse(text); // validate JSON
            localStorage.removeItem('pendingCustomData');
        } catch (err) {
            console.error("Error submitting custom data:", err);
        }
    }

    async function processPendingCustomDataOnConfirmation() {
        // Only run if pending data exists
        const pending = localStorage.getItem('pendingCustomData');
        if (!pending) return;

        let retries = 0;
        const maxRetries = 10;
        const retryDelay = 1000;

        while (retries < maxRetries) {
            // Use a robust selector for the confirmation element
            // Try to find the confirmation link
            const confirmationContainer = document.querySelector('.flex.items-center.gap-28.border.rounded.bg-paper');
            let trackId = null;
            let trackName = null;

                    if (confirmationContainer) {
            // Try to extract track ID from the link
            const link = confirmationContainer.querySelector('a[href^="/track/"]');
            if (link) {
                const m = link.getAttribute('href').match(/\/track\/(\d+)\//);
                if (m) trackId = parseInt(m[1], 10);
            }
            
            // Fallback: try the readonly input for track ID
            if (!trackId) {
                const input = confirmationContainer.querySelector('input[readonly][value*="/track/"]');
                if (input) {
                    const m = input.value.match(/\/track\/(\d+)\//);
                    if (m) trackId = parseInt(m[1], 10);
                }
            }
            
            // Extract track name from the correct element (div with class "text-base font-bold")
            const trackNameElement = confirmationContainer.querySelector('.text-base.font-bold');
            if (trackNameElement) {
                trackName = trackNameElement.textContent.trim();
                console.log("✅ Found track name from title element:", trackName);
            }
            
            // Fallback: extract track name from URL if title element not found
            if (!trackName && link) {
                const href = link.getAttribute('href');
                const urlParts = href.split('/');
                const urlTrackName = urlParts[urlParts.length - 1] || '';
                if (urlTrackName) {
                    // Decode URL-encoded track name and convert dashes to spaces
                    trackName = decodeURIComponent(urlTrackName.replace(/-/g, ' '));
                    console.log("🔄 Extracted track name from URL:", trackName);
                }
            }
            
            // Final fallback: get track name from pending data
            if (!trackName) {
                const customData = JSON.parse(pending);
                trackName = customData.track_name || '';
                console.log("⚠️ Using track name from pending data:", trackName);
            }
            }

                    if (trackId) {
            console.log("✅ Found track ID for confirmation:", trackId, "with name:", trackName);
            
            // Submit the metadata with confirmed track name
            const customData = JSON.parse(pending);
            customData.track_id = trackId;
            
            // Ensure track name is included and log the source
            if (trackName && trackName.trim()) {
                const previousTrackName = customData.track_name || 'none';
                customData.track_name = trackName.trim();
                console.log(`📝 Track name updated: "${previousTrackName}" → "${customData.track_name}"`);
            } else {
                console.warn("⚠️ No track name found during confirmation, keeping original:", customData.track_name);
            }
            
            console.log("📤 Final confirmation payload:", customData);
            await submitCustomData(customData);
            localStorage.removeItem('pendingCustomData');
            return;
        }

            // Wait and retry
            retries++;
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }

        console.error("Failed to submit custom data after maximum retries");
    }

    function pollForConfirmation() {
        let attempts = 0;
        const iv = setInterval(() => {
            const anchor = document.querySelector('a[href*="/track/"]');
            if (anchor) {
                const m = anchor.getAttribute('href').match(/\/track\/(\d+)\//);
                if (m) {
                    const trackId = parseInt(m[1], 10);
                    const pending = localStorage.getItem('pendingCustomData');
                    if (pending) {
                        const data = JSON.parse(pending);
                        data.track_id = trackId;
                        
                        // Try to get the actual track name from the page
                        const trackNameElement = document.querySelector('.text-base.font-bold');
                        if (trackNameElement) {
                            data.track_name = trackNameElement.textContent.trim();
                            console.log("✅ Poll: Updated track name from title element:", data.track_name);
                        } else {
                            console.log("⚠️ Poll: Using existing track name from pending data:", data.track_name);
                        }
                        
                        submitCustomData(data);
                    }
                    clearInterval(iv);
                }
            }
            if (++attempts >= 30) clearInterval(iv);
        }, 250);
    }

    function observeConfirmationPage() {
        // Observe for the confirmation container to appear
        const obs = new MutationObserver(debounce(() => {
            const confirmationContainer = document.querySelector('.flex.items-center.gap-28.border.rounded.bg-paper');
            if (confirmationContainer) {
                processPendingCustomDataOnConfirmation();
                obs.disconnect();
            }
        }, 150));
        obs.observe(document.body, { childList: true, subtree: true });
    }

    function attachUploadListeners() {
        if (!isUploadPage()) return;
        const form = document.querySelector('form');
        if (!form) return;
        
        // Enhanced form submission handling
        form.addEventListener('submit', () => {
            const key = document.getElementById('key_name')?.value.trim() || '';
            const scale = document.getElementById('scale')?.value.trim() || '';
            const bpm = document.getElementById('bpm')?.value.trim() || '';
            const tn = getTrackName();
            const duration = getDuration();
            
            console.log("📤 Form submission - capturing data:", {
                key, scale, bpm, trackName: tn, duration
            });
            
            // Always save track name even if other fields are incomplete
            const pendingData = {
                key_name: key, 
                scale, 
                bpm, 
                track_name: tn || '', 
                duration_ms: duration
            };
            
            localStorage.setItem('pendingCustomData', JSON.stringify(pendingData));
            console.log("💾 Saved upload data to localStorage:", pendingData);
        });
        
        const btn = form.querySelector('button[type="submit"]');
        if (btn) {
            btn.addEventListener('click', () => {
                // Capture data immediately on button click (backup)
                const tn = getTrackName();
                console.log("🔄 Button click - track name capture:", tn);
                
                setTimeout(() => processPendingCustomDataOnConfirmation(), 500);
                setTimeout(pollForConfirmation, 1000);
            });
        }
    }

    async function handleFormSubmission(e) {
        console.log("Form submission handler called");
        
        if (isUploadPage()) {
            console.log("On upload page, skipping custom submission");
            return;
        }
        
        // Check if this is a fingerprinting operation - completely block form submission
        const isDashboardFingerprintingActive = document.querySelector('#dashboard-content .fingerprint-processing') || 
                                              document.querySelector('#dashboard-content .text-purple-400') ||
                                              document.querySelector('.fingerprint-processing');
        
        // Also check if user just clicked a fingerprint button
        const fingerprintButtonClicked = window.fingerprintOperationInProgress || false;
        
        if (isDashboardFingerprintingActive || fingerprintButtonClicked) {
            console.log("Fingerprinting in progress, completely blocking form submission");
            e.preventDefault();
            e.stopPropagation();
            return false; // Completely block form submission during fingerprinting
        }
        
        e.preventDefault();
        console.log("Prevented default form submission");
        
        if (!fieldsReady) {
            console.log("Fields not ready, skipping submission");
            return;
        }
        
        if (isEditPage()) {
            console.log("On edit page, submitting custom data");
            
            // Get all form data
            const key_name = document.getElementById('key_name')?.value.trim() || '';
            const scale = document.getElementById('scale')?.value.trim() || '';
            const bpm = document.getElementById('bpm')?.value.trim() || '';
            const track_name = getTrackName();
            const track_id = getTrackId();
            const duration_ms = getDuration();
            
            // Get playback URL - try multiple selectors
            const playbackInput = document.querySelector('input[name="src"]') || 
                                document.querySelector('input[type="text"][name="src"]') ||
                                document.querySelector('input[type="url"][name="src"]');
            const playback_url = playbackInput?.value.trim() || '';
            
            console.log("Form data collected, submitting...");
            
            // Submit the data
            const success = await submitCustomData({
                key_name,
                scale,
                bpm,
                track_name,
                track_id,
                playback_url,
                duration_ms
            });
            
            console.log("Custom data submission result:", success);
            
            // Only redirect if user explicitly saved without fingerprinting
            const saveButton = document.querySelector('button[type="submit"]');
            if (saveButton && saveButton.textContent.toLowerCase().includes('save')) {
            if (track_id) {
                console.log("Redirecting to track page:", track_id);
                window.location.href = `/track/${track_id}/${track_name.replace(/\s+/g, '-').toLowerCase()}`;
                }
            } else {
                console.log("Not redirecting - staying on edit page");
            }
        }
    }

    async function submitPlaybackURL() {
        if (!isEditPage()) return;
        
        console.log("Checking for playback URL to submit immediately");
        const track_id = getTrackId();
        if (!track_id) {
            console.log("No track ID found, skipping playback URL submission");
            return;
        }

        // Try multiple selectors for the playback URL input
        const playbackInput = document.querySelector('input[name="src"]') || 
                            document.querySelector('input[type="text"][name="src"]') ||
                            document.querySelector('input[type="url"][name="src"]');
        
        if (!playbackInput) {
            console.log("No playback URL input found");
            return;
        }

        const playback_url = playbackInput.value.trim();
        if (!playback_url) {
            console.log("Playback URL is empty");
            return;
        }

        console.log("Submitting playback URL immediately");
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    track_id,
                    playback_url
                })
            });
            const result = await response.text();
            console.log("Playback URL submission completed, status:", response.status);
            
            // Update button state after playback URL is saved
            const button = document.querySelector('.beatpass-id-button');
            if (button) {
                updateBeatPassIDButtonOnLoad();
            }
        } catch (error) {
            console.error("Error submitting playback URL:", error);
        }
    }

    // Function to monitor playback URL changes and update dashboard
    function observePlaybackURLChanges() {
        if (!isEditPage()) return;
        
        const playbackInput = document.querySelector('input[name="src"]') || 
                            document.querySelector('input[type="text"][name="src"]') ||
                            document.querySelector('input[type="url"][name="src"]');
        
        if (playbackInput && !playbackInput.hasAttribute('data-fingerprint-observed')) {
            playbackInput.setAttribute('data-fingerprint-observed', 'true');
            
            // Store the initial URL value to detect actual changes
            let lastKnownURL = playbackInput.value.trim();
            
            // Monitor changes to playback URL (only trigger on actual URL changes)
            playbackInput.addEventListener('change', debounce(async () => {
                const currentURL = playbackInput.value.trim();
                if (currentURL !== lastKnownURL) {
                    console.log("Playback URL actually changed:", { from: lastKnownURL, to: currentURL });
                    lastKnownURL = currentURL;
                    
                // First submit the URL, then update dashboard
                await submitPlaybackURL();
                // Update dashboard content based on new URL
                await updateDashboardContent();
                } else {
                    console.log("Playback URL change event fired but URL didn't actually change");
                }
            }, 500));
            
            // Also monitor input events for immediate feedback (but only visual updates)
            playbackInput.addEventListener('input', debounce(() => {
                const currentURL = playbackInput.value.trim();
                if (currentURL !== lastKnownURL) {
                    console.log("Playback URL input changed, updating dashboard UI");
                    // Update dashboard immediately when URL changes (visual only)
                updateDashboardContent();
                }
            }, 200));
            
            console.log("Added playback URL change observer");
        }
    }

    // New function to submit duration when it changes
    async function submitDuration() {
        if (!isEditPage() && !isUploadPage()) return;
        
        const track_id = getTrackId();
        const duration_ms = getDuration();
        
        if (!track_id || !duration_ms) {
            return;
        }

        console.log("Submitting duration:", duration_ms);
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    track_id,
                    duration_ms
                })
            });
            const result = await response.text();
            console.log("Duration submission completed, status:", response.status);
        } catch (error) {
            console.error("Error submitting duration:", error);
        }
    }

    async function checkPlaybackURLStatus(track_id) {
        console.log(`Checking playback URL status for track ${track_id}`);
        try {
            const res = await fetch(`key_bpm_handler.php?track_id=${track_id}`);
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            
            const data = await res.json();
            console.log("Raw API response:", data);
            
            if (data.status === 'success' && data.data) {
                // Check if we have fingerprint data (even without playback URL)
                const hasFingerprint = !!(data.data.fingerprint && data.data.fingerprint.trim());
                const hasPlayback = !!(data.data.Playback && data.data.Playback.trim());
                
                console.log("Data analysis:", {
                    hasFingerprint,
                    hasPlayback,
                    fingerprintLength: data.data.fingerprint ? data.data.fingerprint.length : 0
                });
                
                if (hasFingerprint || hasPlayback) {
                // Check if this is a duplicate (if we have fingerprint)
                let isDuplicate = false;
                let isAuthentic = false;
                let duplicateInfo = null;
                let duplicateCount = 0;
                
                if (data.data.fingerprint && data.data.fingerprint.trim()) {
                    try {
                        // Check fingerprint for duplicates
                        const duplicateCheck = await fetch(`key_bpm_handler.php?check_fingerprint=${encodeURIComponent(data.data.fingerprint)}&track_id=${track_id}`);
                        const duplicateData = await duplicateCheck.json();
                        
                        if (duplicateData.is_duplicate) {
                            isDuplicate = true;
                            isAuthentic = duplicateData.is_authentic || false;
                            duplicateInfo = duplicateData.duplicate_info;
                            
                            // Count duplicates
                            if (duplicateInfo) {
                                duplicateCount = (duplicateInfo.exact_matches?.length || 0) + 
                                               (duplicateInfo.similar_matches?.length || 0);
                            }
                        }
                    } catch (error) {
                        console.error('Error checking for duplicate fingerprints:', error);
                    }
                }
                
                return {
                    status: 'protected',
                        hasFingerprint: hasFingerprint,
                        playbackUrl: data.data.Playback || '',
                        fingerprint: data.data.fingerprint || '',
                        fingerprint_hash: data.data.fingerprint_hash || '',
                    isDuplicate,
                    isAuthentic,
                        duplicateInfo: duplicateInfo || {}, // Ensure object structure
                    duplicateCount
                };
            } else {
                    console.log("No fingerprint or playback data found");
                    return {
                        status: 'unprotected',
                        hasFingerprint: false,
                        playbackUrl: '',
                        fingerprint: '',
                        fingerprint_hash: '',
                        isDuplicate: false,
                        isAuthentic: false,
                        duplicateCount: 0
                    };
                }
            } else {
                console.log("API returned no success status or no data");
                return {
                    status: 'unprotected',
                    hasFingerprint: false,
                    playbackUrl: '',
                    fingerprint: '',
                    fingerprint_hash: '',
                    isDuplicate: false,
                    isAuthentic: false,
                    duplicateCount: 0
                };
            }
        } catch (error) {
            console.error('Error checking playback URL status:', error);
            return {
                status: 'unprotected',
                hasFingerprint: false,
                playbackUrl: '',
                fingerprint: '',
                fingerprint_hash: '',
                isDuplicate: false,
                isAuthentic: false,
                duplicateCount: 0
            };
        }
    }
    
    // Display fingerprint information in the UI
    function injectFingerprintInfo(statusInfo) {
        // Remove any existing info
        removeFingerprintInfo();
        
        // Only show for tracks that have fingerprints or duplicates
        if (!statusInfo.hasFingerprint && !statusInfo.isDuplicate) return;
        
        const form = document.querySelector('form');
        if (!form) return;
        
        // Create the fingerprint container
        const infoContainer = document.createElement('div');
        infoContainer.id = 'fingerprint-info-container';
        infoContainer.className = 'mb-24 text-sm';
        
        // Create main container using native form styling
        const mainCard = document.createElement('div');
        mainCard.className = 'isolate relative';
        
        const innerCard = document.createElement('div');
        innerCard.className = 'block relative w-full bg-transparent rounded-input border-divider border shadow-sm p-12';
        innerCard.style.background = 'rgba(37, 37, 37, 0.6)';
        innerCard.style.backdropFilter = 'blur(15px)';
        innerCard.style.borderColor = 'rgba(255, 255, 255, 0.15)';
        
        // Header section
        const header = document.createElement('div');
        header.className = 'flex items-center justify-between mb-12';
        
        const headerLeft = document.createElement('div');
        headerLeft.className = 'flex items-center gap-8';
        
        // Fingerprint icon using SVG like other form elements
        const iconSvg = document.createElement('svg');
        iconSvg.setAttribute('aria-hidden', 'true');
        iconSvg.setAttribute('focusable', 'false');
        iconSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        iconSvg.setAttribute('viewBox', '0 0 24 24');
        iconSvg.className = 'svg-icon icon-sm text-primary';
        iconSvg.style.width = '1.2em';
        iconSvg.style.height = '1.2em';
        iconSvg.innerHTML = '<path d="M17.81 4.47c-.08 0-.16-.02-.23-.06C15.66 3.42 14 3 12.01 3c-1.98 0-3.86.47-5.57 1.41-.24.13-.54.04-.68-.2-.13-.24-.04-.55.2-.68C7.82 2.52 9.86 2 12.01 2c2.13 0 3.99.47 6.03 1.52.25.13.34.43.21.67-.09.18-.26.28-.44.28zM3.5 9.72c-.1 0-.2-.03-.29-.09-.23-.16-.28-.47-.12-.7.99-1.4 2.25-2.5 3.75-3.27C9.98 4.04 14 4.03 17.15 5.65c1.5.77 2.76 1.86 3.75 3.25.16.22.11.54-.12.7-.23.16-.54.11-.7-.12-.9-1.26-2.04-2.25-3.39-2.94-2.87-1.47-6.54-1.47-9.4.01-1.36.7-2.5 1.7-3.4 2.96-.08.14-.23.21-.39.21zm6.25 12.07c-.13 0-.26-.05-.35-.15-.87-.87-1.34-1.43-2.01-2.64-.69-1.23-1.05-2.73-1.05-4.34 0-2.97 2.54-5.39 5.66-5.39s5.66 2.42 5.66 5.39c0 .28-.22.5-.5.5s-.5-.22-.5-.5c0-2.42-2.09-4.39-4.66-4.39s-4.66 1.97-4.66 4.39c0 1.44.32 2.77.93 3.85.64 1.15 1.08 1.64 1.85 2.42.19.2.19.51 0 .71-.11.1-.24.15-.37.15z"/>';
        
        const title = document.createElement('h3');
        title.className = 'font-semibold text-sm text-main';
        title.textContent = 'BeatPassID Protection';
        
        headerLeft.appendChild(iconSvg);
        headerLeft.appendChild(title);
        
        // Status button using native chip styling
        const statusBadge = document.createElement('button');
        statusBadge.type = 'button';
        statusBadge.className = 'beatpass-id-button ml-2 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2';
        statusBadge.style.backgroundColor = 'rgb(34, 197, 94)';
        statusBadge.style.color = 'rgb(255, 255, 255)';
        statusBadge.style.height = '2.25rem';
        statusBadge.style.margin = '0.4rem';
        
        // Add check icon
        const checkIcon = document.createElement('svg');
        checkIcon.setAttribute('aria-hidden', 'true');
        checkIcon.setAttribute('focusable', 'false');
        checkIcon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        checkIcon.setAttribute('viewBox', '0 0 24 24');
        checkIcon.className = 'svg-icon';
        checkIcon.style.width = '1em';
        checkIcon.style.height = '1em';
        checkIcon.innerHTML = '<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>';
        
        statusBadge.appendChild(checkIcon);
        statusBadge.appendChild(document.createTextNode('Scanned'));
        
        header.appendChild(headerLeft);
        header.appendChild(statusBadge);
        
        // Success message using native styling patterns
        const successMessage = document.createElement('div');
        successMessage.className = 'flex items-center gap-8 p-12 rounded-input mb-12 text-sm';
        successMessage.style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
        successMessage.style.color = 'rgb(34, 197, 94)';
        successMessage.style.border = '1px solid rgba(34, 197, 94, 0.2)';
        
        const successIcon = document.createElement('svg');
        successIcon.setAttribute('aria-hidden', 'true');
        successIcon.setAttribute('focusable', 'false');
        successIcon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        successIcon.setAttribute('viewBox', '0 0 24 24');
        successIcon.className = 'svg-icon icon-sm';
        successIcon.style.width = '1em';
        successIcon.style.height = '1em';
        successIcon.innerHTML = '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>';
        
        const successText = document.createElement('span');
        successText.textContent = 'Track fingerprinted successfully! Protected against unauthorized copies.';
        
        successMessage.appendChild(successIcon);
        successMessage.appendChild(successText);
        
        // Tab navigation using native styling
        const tabContainer = document.createElement('div');
        tabContainer.className = 'border-b border-divider mb-12';
        
        const tabNav = document.createElement('div');
        tabNav.className = 'flex gap-24';
        
        // Hash tab
        const hashTab = document.createElement('button');
        hashTab.type = 'button';
        hashTab.className = 'py-8 px-4 border-b-2 border-primary text-primary font-medium text-sm';
        hashTab.textContent = 'Hash';
        hashTab.setAttribute('data-tab', 'hash');
        
        // Fingerprint tab
        const fingerprintTab = document.createElement('button');
        fingerprintTab.type = 'button';
        fingerprintTab.className = 'py-8 px-4 border-b-2 border-transparent text-muted font-medium text-sm hover:text-main transition-colors';
        fingerprintTab.textContent = 'Full Fingerprint';
        fingerprintTab.setAttribute('data-tab', 'fingerprint');
        
        tabNav.appendChild(hashTab);
        tabNav.appendChild(fingerprintTab);
        tabContainer.appendChild(tabNav);
        
        // Content panels
        const contentContainer = document.createElement('div');
        contentContainer.className = 'mt-12';
        
        // Hash panel
        const hashPanel = document.createElement('div');
        hashPanel.className = 'fingerprint-panel';
        hashPanel.setAttribute('data-panel', 'hash');
        
        const hashValue = document.createElement('div');
        hashValue.className = 'p-12 rounded-input font-mono text-sm overflow-hidden';
        hashValue.style.cssText = `
            background-color: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.1);
            word-break: break-all;
            white-space: pre-wrap;
            overflow-wrap: break-word;
        `;
        hashValue.textContent = statusInfo.fingerprint_hash || 'No hash available';
        
        const hashDescription = document.createElement('div');
        hashDescription.className = 'mt-8 text-xs text-muted flex items-center gap-6';
        
        const hashInfoIcon = document.createElement('svg');
        hashInfoIcon.setAttribute('aria-hidden', 'true');
        hashInfoIcon.setAttribute('focusable', 'false');
        hashInfoIcon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        hashInfoIcon.setAttribute('viewBox', '0 0 24 24');
        hashInfoIcon.className = 'svg-icon';
        hashInfoIcon.style.width = '12px';
        hashInfoIcon.style.height = '12px';
        hashInfoIcon.innerHTML = '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>';
        
        const hashDescText = document.createElement('span');
        hashDescText.textContent = 'Cryptographic hash used for quick duplicate detection';
        
        hashDescription.appendChild(hashInfoIcon);
        hashDescription.appendChild(hashDescText);
        
        hashPanel.appendChild(hashValue);
        hashPanel.appendChild(hashDescription);
        
        // Fingerprint panel
        const fingerprintPanel = document.createElement('div');
        fingerprintPanel.className = 'fingerprint-panel hidden';
        fingerprintPanel.setAttribute('data-panel', 'fingerprint');
        
        const fingerprintValue = document.createElement('div');
        fingerprintValue.className = 'p-12 rounded-input font-mono text-sm overflow-hidden';
        fingerprintValue.style.cssText = `
            background-color: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.1);
            max-height: 120px;
            overflow-y: auto;
            word-break: break-all;
            white-space: pre-wrap;
            overflow-wrap: break-word;
            line-height: 1.4;
        `;
        fingerprintValue.textContent = statusInfo.fingerprint || 'No fingerprint available';
        
        const fingerprintDescription = document.createElement('div');
        fingerprintDescription.className = 'mt-8 text-xs text-muted flex items-center gap-6';
        
        const fingerprintInfoIcon = hashInfoIcon.cloneNode(true);
        
        const fingerprintDescText = document.createElement('span');
        fingerprintDescText.textContent = 'Full acoustic fingerprint data for audio verification';
        
        fingerprintDescription.appendChild(fingerprintInfoIcon);
        fingerprintDescription.appendChild(fingerprintDescText);
        
        fingerprintPanel.appendChild(fingerprintValue);
        fingerprintPanel.appendChild(fingerprintDescription);
        
        contentContainer.appendChild(hashPanel);
        contentContainer.appendChild(fingerprintPanel);
        
        // Assemble the container
        innerCard.appendChild(header);
        innerCard.appendChild(successMessage);
        innerCard.appendChild(tabContainer);
        innerCard.appendChild(contentContainer);
        
        mainCard.appendChild(innerCard);
        infoContainer.appendChild(mainCard);
        
        // Add tab switching functionality with smooth transitions
        function switchTab(targetTab) {
            // Update tab buttons
            const tabs = infoContainer.querySelectorAll('[data-tab]');
            const panels = infoContainer.querySelectorAll('[data-panel]');
            
            tabs.forEach(tab => {
                if (tab.getAttribute('data-tab') === targetTab) {
                    tab.className = 'py-8 px-4 border-b-2 border-primary text-primary font-medium text-sm transition-colors';
                } else {
                    tab.className = 'py-8 px-4 border-b-2 border-transparent text-muted font-medium text-sm hover:text-main transition-colors';
                }
            });
            
            // Update panels with fade transition
            panels.forEach(panel => {
                if (panel.getAttribute('data-panel') === targetTab) {
                    panel.style.opacity = '0';
                    panel.classList.remove('hidden');
                    setTimeout(() => {
                        panel.style.transition = 'opacity 0.2s ease-in-out';
                        panel.style.opacity = '1';
                    }, 10);
                } else {
                    panel.style.transition = 'opacity 0.2s ease-in-out';
                    panel.style.opacity = '0';
                    setTimeout(() => {
                        panel.classList.add('hidden');
                    }, 200);
                }
            });
        }
        
        // Bind tab events
        hashTab.addEventListener('click', () => switchTab('hash'));
        fingerprintTab.addEventListener('click', () => switchTab('fingerprint'));
        
        // Add entrance animation
        infoContainer.style.opacity = '0';
        infoContainer.style.transform = 'translateY(10px)';
        infoContainer.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
        
        // Insert the container into the form after the custom fields
        const customFieldsContainer = document.getElementById('custom-fields-container');
        if (customFieldsContainer) {
            // Insert after custom fields
            customFieldsContainer.parentNode.insertBefore(infoContainer, customFieldsContainer.nextSibling);
        } else {
            // Fallback: insert after the first input field in the form
            const firstInput = form.querySelector('input[name="name"]');
            if (firstInput) {
                firstInput.parentNode.insertBefore(infoContainer, firstInput.nextSibling);
            }
        }
        
        setTimeout(() => {
            infoContainer.style.opacity = '1';
            infoContainer.style.transform = 'translateY(0)';
        }, 100);
        
        return infoContainer;
    }
    
    // Remove any existing fingerprint info
    function removeFingerprintInfo() {
        const existing = document.getElementById('fingerprint-info-container');
        if (existing) existing.remove();
    }
    
    // Fingerprinting functionality
    async function generateFingerprint(playbackUrl) {
        const fingerprintUrl = `https://open.beatpass.ca/fingerprint.php?url=${encodeURIComponent(playbackUrl)}`;
        
        try {
            const response = await fetch(fingerprintUrl);
            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
                const result = data.results[0];
                return {
                    success: true,
                    fingerprint: result.fingerprint,
                    duration: result.duration,
                    url: result.url
                };
            } else {
                return {
                    success: false,
                    error: 'No fingerprint results received'
                };
            }
        } catch (error) {
            console.error('Fingerprinting error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async function submitFingerprint(track_id, fingerprint) {
        if (!track_id || !fingerprint) {
            console.warn("Missing track_id or fingerprint data");
            return { success: false, error: "Missing track_id or fingerprint data" };
        }

        console.log("Submitting fingerprint for track:", track_id);
        // First, attempt duplicate pre-check
        try {
            // FIRST: Check for duplicates WITHOUT storing the fingerprint
            console.log("🔍 Pre-checking for duplicates before storage...");
            const duplicateCheckResponse = await fetch(`key_bpm_handler.php?check_fingerprint=${encodeURIComponent(fingerprint)}&track_id=${track_id}`);
            
            if (!duplicateCheckResponse.ok) {
                console.error("❌ Duplicate check request failed:", duplicateCheckResponse.status, duplicateCheckResponse.statusText);
                console.log("⚠️ Continuing with storage due to pre-check failure");
            } else {
                const duplicateCheckData = await duplicateCheckResponse.json();
                
                console.log("📊 Pre-check duplicate analysis:", {
                    is_duplicate: duplicateCheckData.is_duplicate,
                    is_authentic: duplicateCheckData.is_authentic,
                    duplicate_info: duplicateCheckData.duplicate_info,
                    duplicate_count: duplicateCheckData.duplicate_count,
                    fullResponse: duplicateCheckData
                });
                
                // If it's a duplicate and not authentic, don't store the fingerprint at all
                if (duplicateCheckData.is_duplicate && !duplicateCheckData.is_authentic) {
                    console.log("🚨 DUPLICATE DETECTED: Preventing fingerprint storage due to ToS violation");
                    console.log("⚠️ ToS VIOLATION: This upload violates Sample-Safe™ platform guarantee");
                    console.log("🛑 FINGERPRINT NOT STORED - Operation stopped to maintain platform integrity");
                    
                    return {
                        success: false, // Mark as failed due to ToS violation
                        isDuplicate: true,
                        isAuthentic: false,
                        duplicateInfo: duplicateCheckData.duplicate_info || {},
                        duplicateCount: duplicateCheckData.duplicate_count || 0,
                        message: "Fingerprinting failed - Terms of Service violation (duplicate content)",
                        tosViolation: true
                    };
                }
                
                console.log("✅ No duplicate violation detected, proceeding with fingerprint storage...");
            }
        } catch (duplicateCheckError) {
            console.error("❌ Error during duplicate pre-check:", duplicateCheckError);
            console.log("⚠️ Continuing with storage due to pre-check error");
        }
        
        // Proceed with fingerprint storage
        try {
            
            // THEN: If not a duplicate or is authentic, proceed with storage
            const response = await fetch('key_bpm_handler.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    track_id,
                    fingerprint
                })
            });
            
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }
            
            const responseData = await response.json();
            console.log("Fingerprint submission completed:", responseData);
            console.log("📊 Final duplicate analysis:", {
                isDuplicate: responseData.is_duplicate,
                isAuthentic: responseData.is_authentic,
                duplicateInfo: responseData.duplicate_info
            });
            
            return {
                success: responseData.status === 'success',
                isDuplicate: responseData.is_duplicate || false,
                isAuthentic: responseData.is_authentic || false,
                duplicateInfo: responseData.duplicate_info || {},
                duplicateCount: responseData.duplicate_count || 0,
                message: responseData.message
            };
        } catch (error) {
            console.error("Error submitting fingerprint:", error);
            return { 
                success: false, 
                error: error.message 
            };
        }
    }

    // Function to delete fingerprint from database for ToS violations
    async function deleteFingerprintFromDatabase(track_id) {
        console.log("🗑️ Deleting fingerprint for track:", track_id);
        try {
            const response = await fetch('key_bpm_handler.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    track_id,
                    delete_fingerprint: 'true',
                    reason: 'ToS_violation_duplicate_content'
                })
            });
            
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log("Fingerprint deletion result:", result);
            return result;
        } catch (error) {
            console.error("Error deleting fingerprint:", error);
            throw error;
        }
    }

    // --- Fingerprint Guidance Modal ---
    function showFingerprintGuidance(button, track_id) {
        // Remove any existing guidance modal
        removeFingerprintGuidance();
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'fingerprint-guidance-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(8px);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        // Create modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: #1f1f1f;
            border-radius: 16px;
            padding: 32px;
            max-width: 520px;
            margin: 20px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            border: 1px solid rgba(255, 255, 255, 0.1);
            transform: scale(0.9) translateY(20px);
            transition: transform 0.3s ease, opacity 0.3s ease;
            position: relative;
        `;
        
        // Header with icon
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 24px;
        `;
        
        const icon = document.createElement('div');
        icon.style.cssText = `
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        `;
        icon.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,7C13.4,7 14.8,8.6 14.8,10V11H15.5V16H8.5V11H9.2V10C9.2,8.6 10.6,7 12,7M12,8.2C11.2,8.2 10.5,8.7 10.5,10V11H13.5V10C13.5,8.7 12.8,8.2 12,8.2Z"/></svg>';
        
        const headerText = document.createElement('div');
        headerText.innerHTML = '<h2 style="color: white; font-size: 24px; font-weight: 600; margin: 0;">Add BeatPassID Protection</h2><p style="color: #a1a1aa; font-size: 14px; margin: 4px 0 0 0;">Protect your track with audio fingerprinting</p>';
        
        header.appendChild(icon);
        header.appendChild(headerText);
        
        // Close button
        const closeButton = document.createElement('button');
        closeButton.style.cssText = `
            position: absolute;
            top: 16px;
            right: 16px;
            background: none;
            border: none;
            color: #a1a1aa;
            cursor: pointer;
            padding: 8px;
            border-radius: 8px;
            transition: background-color 0.2s ease;
        `;
        closeButton.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
        closeButton.onmouseover = () => closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        closeButton.onmouseout = () => closeButton.style.backgroundColor = 'transparent';
        closeButton.onclick = () => removeFingerprintGuidance();
        
        // Step content
        const stepContent = document.createElement('div');
        stepContent.id = 'step-content';
        
        // Step 1: Add playback URL
        const step1 = document.createElement('div');
        step1.innerHTML = `
            <div style="color: white; margin-bottom: 24px;">
                <h3 style="font-size: 18px; font-weight: 600; margin: 0 0 12px 0; color: white;">Step 1: Add Audio URL</h3>
                <p style="color: #a1a1aa; margin: 0 0 16px 0; line-height: 1.5;">
                    To protect your track, we need a playback URL for the audio file. This allows us to generate a unique fingerprint for copyright protection.
                </p>
                <div style="background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="#6366f1"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                        <span style="color: #6366f1; font-weight: 600; font-size: 14px;">Supported URLs</span>
                    </div>
                    <ul style="color: #a1a1aa; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.6;">
                        <li>Direct audio file links (.mp3, .wav, .m4a)</li>
                        <li>Cloud storage links (Google Drive, Dropbox, etc.)</li>
                        <li>Streaming platform URLs</li>
                    </ul>
                </div>
            </div>
        `;
        
        // Action buttons
        const actions = document.createElement('div');
        actions.style.cssText = `
            display: flex;
            gap: 12px;
            justify-content: flex-end;
            margin-top: 24px;
        `;
        
        const cancelButton = document.createElement('button');
        cancelButton.style.cssText = `
            padding: 12px 24px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            background: transparent;
            color: #a1a1aa;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s ease;
        `;
        cancelButton.textContent = 'Cancel';
        cancelButton.onmouseover = () => {
            cancelButton.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            cancelButton.style.color = 'white';
        };
        cancelButton.onmouseout = () => {
            cancelButton.style.backgroundColor = 'transparent';
            cancelButton.style.color = '#a1a1aa';
        };
        cancelButton.onclick = () => removeFingerprintGuidance();
        
        const nextButton = document.createElement('button');
        nextButton.style.cssText = `
            padding: 12px 24px;
            background: #6366f1;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        nextButton.innerHTML = 'Continue <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>';
        nextButton.onmouseover = () => nextButton.style.backgroundColor = '#5855eb';
        nextButton.onmouseout = () => nextButton.style.backgroundColor = '#6366f1';
        nextButton.onclick = async () => {
            // Check if playback URL has been added
            const playbackInput = document.querySelector('input[name="src"]') || 
                document.querySelector('input[type="text"][name="src"]') ||
                document.querySelector('input[type="url"][name="src"]');
            
            if (!playbackInput || !playbackInput.value.trim()) {
                // Highlight the playback URL field
                highlightPlaybackURLField();
                showNotification('Please add a playback URL first', 'error');
                return;
            }
            
            // Close guidance and start fingerprinting
            removeFingerprintGuidance();
            
            // Trigger fingerprinting process
            await startFingerprintingProcess(button, track_id);
        };
        
        actions.appendChild(cancelButton);
        actions.appendChild(nextButton);
        
        stepContent.appendChild(step1);
        modal.appendChild(header);
        modal.appendChild(closeButton);
        modal.appendChild(stepContent);
        modal.appendChild(actions);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // Animate in
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            modal.style.transform = 'scale(1) translateY(0)';
        });
        
                 // Highlight playback URL field after a short delay
         setTimeout(() => {
             highlightPlaybackURLField();
         }, 500);
         
         // Monitor playback URL field for changes
         const playbackInput = document.querySelector('input[name="src"]') || 
             document.querySelector('input[type="text"][name="src"]') ||
             document.querySelector('input[type="url"][name="src"]');
         
         if (playbackInput) {
             const urlChangeHandler = () => {
                 const hasUrl = playbackInput.value.trim().length > 0;
                 
                 // Update next button state
                 if (hasUrl) {
                     nextButton.style.background = '#22c55e';
                     nextButton.innerHTML = 'Generate Fingerprint <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
                     nextButton.onmouseover = () => nextButton.style.backgroundColor = '#16a34a';
                     nextButton.onmouseout = () => nextButton.style.backgroundColor = '#22c55e';
                     
                     // Remove highlight
                     removePlaybackURLHighlight();
                     
                     // Show success feedback
                     showNotification('Audio URL added! Ready to generate fingerprint.', 'success');
                 } else {
                     nextButton.style.background = '#6366f1';
                     nextButton.innerHTML = 'Continue <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>';
                     nextButton.onmouseover = () => nextButton.style.backgroundColor = '#5855eb';
                     nextButton.onmouseout = () => nextButton.style.backgroundColor = '#6366f1';
                 }
             };
             
             // Add event listeners
             playbackInput.addEventListener('input', urlChangeHandler);
             playbackInput.addEventListener('change', urlChangeHandler);
             playbackInput.addEventListener('paste', () => {
                 setTimeout(urlChangeHandler, 100); // Delay to allow paste to complete
             });
             
                           // Store reference for cleanup
              overlay.playbackInputHandler = urlChangeHandler;
              overlay.playbackInput = playbackInput;
              
              // Check initial state
              urlChangeHandler();
          }
         
         // Add escape key listener
         const escapeHandler = (e) => {
             if (e.key === 'Escape') {
                 removeFingerprintGuidance();
                 document.removeEventListener('keydown', escapeHandler);
             }
         };
         document.addEventListener('keydown', escapeHandler);
    }
    
         function removeFingerprintGuidance() {
         const overlay = document.getElementById('fingerprint-guidance-overlay');
         if (overlay) {
             // Clean up event listeners
             if (overlay.playbackInput && overlay.playbackInputHandler) {
                 overlay.playbackInput.removeEventListener('input', overlay.playbackInputHandler);
                 overlay.playbackInput.removeEventListener('change', overlay.playbackInputHandler);
             }
             
             overlay.style.opacity = '0';
             setTimeout(() => {
                 if (overlay.parentNode) {
                     overlay.parentNode.removeChild(overlay);
                 }
             }, 300);
         }
         
         // Remove playback URL field highlight
         removePlaybackURLHighlight();
     }
    
    function highlightPlaybackURLField() {
        // Remove any existing highlights
        removePlaybackURLHighlight();
        
        const playbackInput = document.querySelector('input[name="src"]') || 
            document.querySelector('input[type="text"][name="src"]') ||
            document.querySelector('input[type="url"][name="src"]');
        
        if (!playbackInput) return;
        
        // Create highlight overlay
        const highlight = document.createElement('div');
        highlight.id = 'playback-url-highlight';
        highlight.style.cssText = `
            position: absolute;
            pointer-events: none;
            border: 3px solid #6366f1;
            border-radius: 8px;
            background: rgba(99, 102, 241, 0.1);
            z-index: 9999;
            transition: all 0.3s ease;
            box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.2);
        `;
        
        // Position the highlight
        const rect = playbackInput.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        
        highlight.style.top = (rect.top + scrollTop - 4) + 'px';
        highlight.style.left = (rect.left + scrollLeft - 4) + 'px';
        highlight.style.width = (rect.width + 8) + 'px';
        highlight.style.height = (rect.height + 8) + 'px';
        
        document.body.appendChild(highlight);
        
        // Focus the input
        playbackInput.focus();
        
        // Scroll into view if needed
        playbackInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Add a label if the field is empty
        if (!playbackInput.value.trim() && !playbackInput.placeholder) {
            playbackInput.placeholder = 'Enter audio URL here...';
        }
    }
    
    function removePlaybackURLHighlight() {
        const highlight = document.getElementById('playback-url-highlight');
        if (highlight) {
            highlight.style.opacity = '0';
            setTimeout(() => {
                if (highlight.parentNode) {
                    highlight.parentNode.removeChild(highlight);
                }
            }, 300);
        }
    }
    
    async function startFingerprintingProcess(button, track_id, isDashboardMode = false) {
        // Set flag to prevent redirects during fingerprinting
        window.fingerprintOperationInProgress = true;
        
        const playbackInput = document.querySelector('input[name="src"]') || 
            document.querySelector('input[type="text"][name="src"]') ||
            document.querySelector('input[type="url"][name="src"]');
        
        if (!playbackInput || !playbackInput.value.trim()) {
            showNotification('No playback URL found', 'error');
            window.fingerprintOperationInProgress = false;
            return;
        }
        
        // Get existing custom data for validation
        let existingCustomData = null;
        try {
            const metadataResponse = await fetch(`${API_URL}?track_id=${track_id}`);
            const metadataResult = await metadataResponse.json();
            if (metadataResult.status === 'success' && metadataResult.data) {
                existingCustomData = metadataResult.data;
            }
        } catch (error) {
            console.log('Could not fetch existing metadata for validation:', error);
        }
        
        // Validate metadata completeness (checks both form and database)
        const metadata = getMetadataCompleteness(existingCustomData);
        if (!metadata.isComplete) {
            showNotification(`Complete metadata required: Missing ${metadata.missing.join(', ')}`, 'error');
            // Update dashboard to show incomplete state
            if (isDashboardMode) {
                updateDashboardContent();
            }
            return;
        }
        
        const playbackUrl = playbackInput.value.trim();
        
        try {
            // Show processing state in dashboard if in dashboard mode
            if (isDashboardMode) {
                const content = document.getElementById('dashboard-content');
                if (content) {
                    renderProcessingState(content, 'Analyzing audio and generating fingerprint...');
                }
            } else if (button) {
                // Legacy button mode
                updateBeatPassIDButtonState(button, 'fingerprinting');
            }
            
            // Step 1: Save the playback URL and metadata first
            const payload = {
                track_id,
                playback_url: playbackUrl,
                key_name: metadata.key,
                scale: metadata.scale,
                bpm: metadata.bpm
            };
            
            const saveResponse = await fetch('key_bpm_handler.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams(payload)
            });
            
            if (!saveResponse.ok) {
                throw new Error('Failed to save playback URL');
            }
            
            // Step 2: Generate fingerprint
            showNotification('Analyzing audio and generating fingerprint...', 'info');
            const fingerprintResult = await generateFingerprint(playbackUrl);
            
            if (fingerprintResult.success) {
                // Update processing message
                if (isDashboardMode) {
                    const content = document.getElementById('dashboard-content');
                    if (content) {
                        renderProcessingState(content, 'Saving fingerprint to database...');
                    }
                }
                
                // Step 3: Check for duplicates and save fingerprint to database  
                showNotification('Checking for duplicates and saving fingerprint...', 'info');
                
                const submitData = await submitFingerprint(track_id, fingerprintResult.fingerprint);
                
                // Handle results with enhanced duplicate detection feedback
                if (submitData.tosViolation) {
                    // ToS violation due to duplicate content
                    showNotification('FINGERPRINTING FAILED! Terms of Service violation - duplicate content detected. Fingerprint removed from database.', 'warning');
                    console.log("🚨 FINGERPRINTING FAILED: ToS violation", {
                        duplicateInfo: submitData.duplicate_info,
                        reason: submitData.message,
                        tosViolation: true
                    });
                } else if (submitData.is_duplicate) {
                    if (submitData.is_authentic) {
                        const duplicateCount = submitData.duplicate_count || 0;
                        if (duplicateCount > 0) {
                            showNotification(`Protection added! This is the authentic version. ${duplicateCount} duplicate ${duplicateCount === 1 ? 'track was' : 'tracks were'} found and blocked.`, 'success');
                            console.log("🎯 DUPLICATE DETECTION: Authentic track with duplicates found", {
                                duplicateCount,
                                duplicateInfo: submitData.duplicate_info
                            });
                        } else {
                            showNotification('Protection added! This is the authentic version of this track.', 'success');
                        }
                    } else {
                        showNotification('FINGERPRINTING FAILED! Duplicate content violates Terms of Service. Fingerprint removed.', 'warning');
                        console.log("🚨 DUPLICATE DETECTION: Non-authentic duplicate found", {
                            duplicateInfo: submitData.duplicate_info,
                            matchDetails: submitData.duplicate_info,
                            tosViolation: true
                        });
                    }
                } else {
                    showNotification('Track protected successfully! No duplicates found.', 'success');
                    console.log("✅ DUPLICATE DETECTION: Unique track fingerprinted successfully");
                }
                
                        // Update dashboard content with new fingerprint info - NO REDIRECTS
                if (isDashboardMode) {
            if (submitData.tosViolation) {
                console.log("⚠️ ToS violation detected, updating dashboard to show failure");
                // Force update dashboard to show the ToS violation immediately
                const content = document.getElementById('dashboard-content');
                if (content) {
                    renderFingerprintFailureState(content, submitData);
                }
            } else {
                console.log("✅ Fingerprinting completed successfully, updating dashboard UI");
                setTimeout(async () => {
                    await updateDashboardContent();
                    console.log("📊 Dashboard updated with fingerprint status");
                    }, 500);
            }
                } else if (button) {
                    // Legacy button mode
                    const statusInfo = await checkPlaybackURLStatus(track_id);
                    updateBeatPassIDButtonState(button, statusInfo.status, statusInfo.hasFingerprint, statusInfo.isDuplicate);
                    injectFingerprintInfo(statusInfo);
                }
                
                // Ensure we stay on edit page - no redirects after fingerprinting
                return;
            } else {
                throw new Error(fingerprintResult.error || 'Failed to generate fingerprint');
            }
            
        } catch (error) {
            console.error('Fingerprinting process failed:', error);
            
            // Update dashboard or button with error state - NO REDIRECTS
            if (isDashboardMode) {
                console.log("❌ Fingerprinting failed, updating dashboard UI with error state");
                setTimeout(async () => {
                    await updateDashboardContent();
                }, 500);
            } else if (button) {
                const statusInfo = await checkPlaybackURLStatus(track_id);
                updateBeatPassIDButtonState(button, statusInfo.status, statusInfo.hasFingerprint, statusInfo.isDuplicate);
                injectFingerprintInfo(statusInfo);
            }
            
            showNotification(`Protection failed: ${error.message}`, 'error');
        } finally {
            // Clear fingerprinting flag
            window.fingerprintOperationInProgress = false;
        }
    }

    // --- Mini Fingerprint Dashboard ---
    function createFingerprintDashboard() {
        // Remove any existing dashboard
        removeFingerprintDashboard();
        
        const dashboard = document.createElement('div');
        dashboard.id = 'fingerprint-dashboard';
        dashboard.className = 'mb-24 text-sm'; // Use native form field spacing
        
        // Start invisible to prevent flash
        dashboard.style.cssText = `
            opacity: 0;
            transform: translateY(10px);
            transition: opacity 0.4s ease-out, transform 0.4s ease-out;
        `;
        
        // Create main container using native form styling patterns
        const mainCard = document.createElement('div');
        mainCard.className = 'isolate relative'; // Native isolate pattern
        
        const innerCard = document.createElement('div');
        innerCard.className = 'block relative w-full bg-transparent rounded-input border-divider border shadow-sm p-16';
        innerCard.style.cssText = `
            background: rgba(37, 37, 37, 0.6);
            backdrop-filter: blur(15px);
            border-color: rgba(255, 255, 255, 0.15);
        `;
        
        // Add mobile-responsive class
        innerCard.classList.add('beatpass-id-mobile-responsive');
        
        // Header section using native typography
        const header = document.createElement('div');
        header.className = 'flex items-center justify-between mb-12';
        
        const headerLeft = document.createElement('div');
        headerLeft.className = 'flex items-center gap-8';
        
        // Fingerprint icon using native icon styling
        const iconSvg = document.createElement('svg');
        iconSvg.setAttribute('aria-hidden', 'true');
        iconSvg.setAttribute('focusable', 'false');
        iconSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        iconSvg.setAttribute('viewBox', '0 0 24 24');
        iconSvg.className = 'svg-icon icon-sm text-primary'; // Native icon classes
        iconSvg.style.width = '1.2em';
        iconSvg.style.height = '1.2em';
        iconSvg.innerHTML = '<path d="M17.81 4.47c-.08 0-.16-.02-.23-.06C15.66 3.42 14 3 12.01 3c-1.98 0-3.86.47-5.57 1.41-.24.13-.54.04-.68-.2-.13-.24-.04-.55.2-.68C7.82 2.52 9.86 2 12.01 2c2.13 0 3.99.47 6.03 1.52.25.13.34.43.21.67-.09.18-.26.28-.44.28zM3.5 9.72c-.1 0-.2-.03-.29-.09-.23-.16-.28-.47-.12-.7.99-1.4 2.25-2.5 3.75-3.27C9.98 4.04 14 4.03 17.15 5.65c1.5.77 2.76 1.86 3.75 3.25.16.22.11.54-.12.7-.23.16-.54.11-.7-.12-.9-1.26-2.04-2.25-3.39-2.94-2.87-1.47-6.54-1.47-9.4.01-1.36.7-2.5 1.7-3.4 2.96-.08.14-.23.21-.39.21zm6.25 12.07c-.13 0-.26-.05-.35-.15-.87-.87-1.34-1.43-2.01-2.64-.69-1.23-1.05-2.73-1.05-4.34 0-2.97 2.54-5.39 5.66-5.39s5.66 2.42 5.66 5.39c0 .28-.22.5-.5.5s-.5-.22-.5-.5c0-2.42-2.09-4.39-4.66-4.39s-4.66 1.97-4.66 4.39c0 1.44.32 2.77.93 3.85.64 1.15 1.08 1.64 1.85 2.42.19.2.19.51 0 .71-.11.1-.24.15-.37.15z"/>';
        
        const title = document.createElement('h3');
        title.className = 'font-semibold text-sm text-main'; // Native heading classes
        title.textContent = 'BeatPassID Protection';
        
        headerLeft.appendChild(iconSvg);
        headerLeft.appendChild(title);
        header.appendChild(headerLeft);
        
        // Content area - will be populated based on status
        const content = document.createElement('div');
        content.id = 'dashboard-content';
        content.className = 'mt-12';
        
        innerCard.appendChild(header);
        innerCard.appendChild(content);
        mainCard.appendChild(innerCard);
        dashboard.appendChild(mainCard);
        
        // Trigger fade-in after creation
        setTimeout(() => {
            requestAnimationFrame(() => {
                dashboard.style.opacity = '1';
                dashboard.style.transform = 'translateY(0)';
            });
        }, 50);
        
        return dashboard;
    }

    function removeFingerprintDashboard() {
        const existing = document.getElementById('fingerprint-dashboard');
        if (existing) {
            // Smooth fade-out before removal
            existing.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
            existing.style.opacity = '0';
            existing.style.transform = 'translateY(-10px)';
            
            setTimeout(() => {
                if (existing.parentNode) {
                    existing.remove();
                }
            }, 300);
        }
    }

    function injectFingerprintDashboard() {
        if (!isEditPage()) return;
        console.log("Injecting Fingerprint Dashboard on edit page");
        
        const form = document.querySelector('form');
        if (!form) {
            console.log("No form found for Fingerprint Dashboard");
            return;
        }
        
        // Check if dashboard already exists
        if (document.getElementById('fingerprint-dashboard')) {
            console.log("Fingerprint Dashboard already exists");
            return;
        }
        
        const dashboard = createFingerprintDashboard();
        
        // Insert the dashboard after the custom fields, respecting native form layout
        const customFieldsContainer = document.getElementById('custom-fields-container');
        if (customFieldsContainer) {
            customFieldsContainer.parentNode.insertBefore(dashboard, customFieldsContainer.nextSibling);
        } else {
            // Fallback: insert after the first input field in the form
            const firstInput = form.querySelector('input[name="name"]');
            if (firstInput) {
                firstInput.parentNode.insertBefore(dashboard, firstInput.nextSibling);
            }
        }
        
        console.log("Fingerprint Dashboard injected successfully");
        
        // Initialize dashboard content with multiple attempts for reliability
        setTimeout(async () => {
            console.log("Initializing dashboard content...");
            await updateDashboardContent();
            observePlaybackURLChanges();
            
            // Retry dashboard update if content is empty (for reliability)
            setTimeout(async () => {
                const content = document.getElementById('dashboard-content');
                if (content && content.innerHTML.trim() === '') {
                    console.log("Dashboard content empty, retrying...");
                    await updateDashboardContent();
                }
            }, 1000);
        }, 200);
    }

    function getMetadataCompleteness(databaseData = null) {
        // Get form field values
        const keyField = document.getElementById('key_name');
        const scaleField = document.getElementById('scale');
        const bpmField = document.getElementById('bpm');
        
        const formKey = keyField ? keyField.value.trim() : '';
        const formScale = scaleField ? scaleField.value.trim() : '';
        const formBpm = bpmField ? bpmField.value.trim() : '';
        
        // Use form values if available, otherwise fall back to database values
        const key = formKey || (databaseData?.key_name || '');
        const scale = formScale || (databaseData?.scale || '');
        const bpm = formBpm || (databaseData?.bpm || '');
        
        const hasKey = key.length > 0;
        const hasScale = scale.length > 0;
        const hasBPM = bpm.length > 0 && !isNaN(parseInt(bpm)) && parseInt(bpm) >= 40 && parseInt(bpm) <= 300;
        
        // Determine the source of each field for display purposes
        const keySource = formKey ? 'form' : (databaseData?.key_name ? 'database' : 'missing');
        const scaleSource = formScale ? 'form' : (databaseData?.scale ? 'database' : 'missing');
        const bpmSource = formBpm ? 'form' : (databaseData?.bpm ? 'database' : 'missing');
        
        // NEW: Get exclusive licensing data
        const { licensing_type, exclusive_price, exclusive_currency, exclusive_status, exclusive_buyer_info } = getExclusiveLicensingData();
        
        return {
            key,
            scale,
            bpm,
            hasKey,
            hasScale,
            hasBPM,
            isComplete: hasKey && hasScale && hasBPM,
            missing: [
                !hasKey ? 'Key' : null,
                !hasScale ? 'Scale' : null,
                !hasBPM ? 'BPM' : null
            ].filter(Boolean),
            sources: {
                key: keySource,
                scale: scaleSource,
                bpm: bpmSource
            },
            licensing_type,
            exclusive_price,
            exclusive_currency,
            exclusive_status,
            exclusive_buyer_info
        };
    }

    async function updateDashboardContent() {
        const content = document.getElementById('dashboard-content');
        if (!content) {
            console.warn("Dashboard content element not found");
            return;
        }
        
        const track_id = getTrackId();
        if (!track_id) {
            console.warn("No track ID found for dashboard update");
            return;
        }
        
        console.log(`Updating dashboard content for track ID: ${track_id}`);
        
        // Get current playback URL from form
        const playbackInput = document.querySelector('input[name="src"]') || 
            document.querySelector('input[type="text"][name="src"]') ||
            document.querySelector('input[type="url"][name="src"]');
        
        const currentURL = playbackInput ? playbackInput.value.trim() : '';
        console.log(`Current playback URL: ${currentURL ? 'Present' : 'None'}`);
        
        // Get fingerprint status from database (includes existing metadata)
        console.log("Fetching fingerprint status from database...");
        const statusInfo = await checkPlaybackURLStatus(track_id);
        console.log("Fingerprint status received:", {
            hasFingerprint: statusInfo.hasFingerprint,
            isDuplicate: statusInfo.isDuplicate,
            playbackUrl: statusInfo.playbackUrl ? 'Present' : 'None'
        });
        
        // Also fetch existing custom data for metadata validation
        let existingCustomData = null;
        try {
            const metadataResponse = await fetch(`${API_URL}?track_id=${track_id}`);
            const metadataResult = await metadataResponse.json();
            if (metadataResult.status === 'success' && metadataResult.data) {
                existingCustomData = metadataResult.data;
            }
        } catch (error) {
            console.log('Could not fetch existing metadata:', error);
        }
        
        // Get metadata completeness (checks both form and database)
        const metadata = getMetadataCompleteness(existingCustomData);
        
        // Check if URL has changed from what's in database
        const urlChanged = currentURL && statusInfo.playbackUrl && 
                          currentURL !== statusInfo.playbackUrl;
        
        console.log('Dashboard update:', {
            currentURL: currentURL ? 'Present' : 'None',
            hasFingerprint: statusInfo.hasFingerprint,
            urlChanged,
            isDuplicate: statusInfo.isDuplicate,
            metadataComplete: metadata.isComplete,
            missingMetadata: metadata.missing,
            metadataSources: metadata.sources,
            databaseMetadata: existingCustomData ? {
                key: existingCustomData.key_name,
                scale: existingCustomData.scale,
                bpm: existingCustomData.bpm
            } : 'None'
        });
        
        // Smooth content transition
        content.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
        content.style.opacity = '0';
        content.style.transform = 'translateY(5px)';
        
        setTimeout(() => {
            // Clear existing content
            content.innerHTML = '';
            
            if (!currentURL) {
                // State 1: No playback URL
                renderNoURLState(content);
            } else if (!metadata.isComplete) {
                // State 2: URL exists but metadata incomplete
                renderIncompleteMetadataState(content, metadata);
            } else if (!statusInfo.hasFingerprint || urlChanged) {
                // State 3: URL exists, metadata complete, but no fingerprint OR URL changed
                renderScanState(content, urlChanged);
            } else {
                // State 4: Fingerprinted
                renderFingerprintedState(content, statusInfo, currentURL);
            }
            
            // Smooth fade-in for new content
            requestAnimationFrame(() => {
                setTimeout(() => {
                    content.style.opacity = '1';
                    content.style.transform = 'translateY(0)';
                }, 20); // Small delay to ensure content is rendered
            });
        }, 150); // Slightly longer delay for smoother transition
    }

    function renderNoURLState(content) {
        content.innerHTML = '';
        
        // Enhanced infographic layout with educational content
        const container = document.createElement('div');
        container.className = 'p-16 space-y-20';
        
        // Hero explanation section
        const heroSection = document.createElement('div');
        heroSection.className = 'text-center mb-24';
        
        // What is BeatPassID section
        const beatPassIDExplainer = document.createElement('div');
        beatPassIDExplainer.className = 'mb-20 p-16 rounded-lg';
        beatPassIDExplainer.style.cssText = `
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%);
            border: 1px solid rgba(59, 130, 246, 0.2);
        `;
        
        const beatPassIDTitle = document.createElement('h4');
        beatPassIDTitle.className = 'font-bold text-white mb-12 flex items-center justify-center gap-8';
        beatPassIDTitle.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#3b82f6">
                <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1M10 17L6 13L7.41 11.59L10 14.17L16.59 7.58L18 9L10 17Z"/>
            </svg>
            What is BeatPassID?
        `;
        
        const beatPassIDDesc = document.createElement('p');
        beatPassIDDesc.className = 'text-sm text-white/80 leading-relaxed mb-16';
        beatPassIDDesc.textContent = 'BeatPassID is our military-grade acoustic fingerprinting system that creates an unchangeable digital DNA for your track. Combined with our Sample-Safe™ guarantee, it ensures producers warrant to buyers that all samples are cleared and tracks are safe for commercial use.';
        
        // Benefits grid
        const benefitsGrid = document.createElement('div');
        benefitsGrid.className = 'grid grid-cols-1 md:grid-cols-2 gap-12 mt-16';
        
        const benefits = [
            {
                icon: 'fingerprint',
                title: 'Unique Audio DNA',
                description: 'Every track gets a cryptographic fingerprint',
                color: '#3b82f6'
            },
            {
                icon: 'block',
                title: 'Duplicate Detection',
                description: 'Automatically blocks unauthorized copies',
                color: '#ef4444'
            },
            {
                icon: 'verified_user',
                title: 'Sample-Safe™ Guarantee',
                description: 'Producer warranty: All samples cleared, safe for commercial use',
                color: '#10b981'
            },
            {
                icon: 'schedule',
                title: 'Immutable Timestamp',
                description: 'Blockchain-level proof of creation time',
                color: '#8b5cf6'
            }
        ];
        
        benefits.forEach(benefit => {
            const benefitCard = document.createElement('div');
            benefitCard.className = 'flex items-start gap-12 p-12 rounded-lg bg-white/5 border border-white/10';
            
            const benefitIcon = document.createElement('div');
            benefitIcon.className = 'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center';
            benefitIcon.style.cssText = `background: ${benefit.color}20; border: 1px solid ${benefit.color}30;`;
            benefitIcon.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="${benefit.color}">
                    <circle cx="12" cy="12" r="10"/>
                </svg>
            `;
            
            const benefitText = document.createElement('div');
            benefitText.innerHTML = `
                <div class="font-semibold text-white text-sm mb-1">${benefit.title}</div>
                <div class="text-xs text-white/70">${benefit.description}</div>
            `;
            
            benefitCard.appendChild(benefitIcon);
            benefitCard.appendChild(benefitText);
            benefitsGrid.appendChild(benefitCard);
        });
        
        beatPassIDExplainer.appendChild(beatPassIDTitle);
        beatPassIDExplainer.appendChild(beatPassIDDesc);
        beatPassIDExplainer.appendChild(benefitsGrid);
        
        // Sample-Safe™ detailed explanation
        const sampleSafeExplainer = document.createElement('div');
        sampleSafeExplainer.className = 'mt-16 p-12 rounded-lg';
        sampleSafeExplainer.style.cssText = `
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%);
            border: 1px solid rgba(16, 185, 129, 0.3);
        `;
        
        const sampleSafeTitle = document.createElement('h6');
        sampleSafeTitle.className = 'font-bold text-white mb-8 flex items-center gap-8 text-sm';
        sampleSafeTitle.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#10b981">
                <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1M10 17L6 13L7.41 11.59L10 14.17L16.59 7.58L18 9L10 17Z"/>
            </svg>
            Sample-Safe™ Producer Warranty
        `;
        
        const sampleSafeDesc = document.createElement('p');
        sampleSafeDesc.className = 'text-xs text-white/80 leading-relaxed';
        sampleSafeDesc.textContent = 'By activating BeatPassID, you as the producer provide a legal warranty to buyers that: (1) All samples used in this track are properly cleared and licensed, (2) The track is safe for commercial use without copyright infringement risk, and (3) You indemnify buyers against any sample-related legal claims.';
        
        sampleSafeExplainer.appendChild(sampleSafeTitle);
        sampleSafeExplainer.appendChild(sampleSafeDesc);
        beatPassIDExplainer.appendChild(sampleSafeExplainer);
        
        // Process title
        const processTitle = document.createElement('h4');
        processTitle.className = 'font-bold text-white mb-8 text-center';
        processTitle.textContent = 'How to Activate BeatPassID Protection';
        
        const processSubtitle = document.createElement('p');
        processSubtitle.className = 'text-sm text-white/70 text-center mb-20';
        processSubtitle.textContent = 'Follow these 4 simple steps to create an unbreakable digital shield for your track';
        
        heroSection.appendChild(beatPassIDExplainer);
        heroSection.appendChild(processTitle);
        heroSection.appendChild(processSubtitle);
        
        // Enhanced step-by-step process with visual connections
        const stepsContainer = document.createElement('div');
        stepsContainer.className = 'relative space-y-12';
        
        // Add connecting lines between steps
        const connectionLine = document.createElement('div');
        connectionLine.className = 'absolute left-24 top-24 bottom-24 w-1 bg-gradient-to-b from-blue-500/30 via-green-500/30 to-purple-500/30 rounded-full';
        connectionLine.style.zIndex = '0';
        stepsContainer.appendChild(connectionLine);
        
        const steps = [
            {
                number: 1,
                title: 'Add Audio URL',
                description: 'Provide a streaming URL for your track',
                icon: 'link',
                status: 'pending',
                action: 'Upload to SoundCloud, YouTube, or any streaming platform first',
                color: '#3b82f6',
                techDetail: 'We need to analyze the actual audio file for fingerprinting'
            },
            {
                number: 2,
                title: 'Complete Metadata',
                description: 'Fill in Key, Scale, and BPM information',
                icon: 'tune',
                status: 'disabled',
                action: 'Essential data for accurate fingerprint generation',
                color: '#10b981',
                techDetail: 'Metadata helps create more precise acoustic analysis'
            },
            {
                number: 3,
                title: 'Generate Fingerprint',
                description: 'Create unique acoustic DNA signature',
                icon: 'fingerprint',
                status: 'disabled',
                action: 'AI processes your track\'s unique sound patterns',
                color: '#8b5cf6',
                techDetail: 'Cryptographic hash generated from audio spectral data'
            },
            {
                number: 4,
                title: 'Protection Active',
                description: 'Track protected with producer warranty',
                icon: 'shield',
                status: 'disabled',
                action: 'Sample-Safe™ warranty: All samples cleared for commercial use',
                color: '#10b981',
                techDetail: 'Producer warrants samples are cleared; immutable proof of ownership'
            }
        ];
        
        steps.forEach((step, index) => {
            const stepElement = createEnhancedProcessStep(step, index === 0);
            stepsContainer.appendChild(stepElement);
        });
        
        // Educational call to action with Sample-Safe™ emphasis
        const ctaContainer = document.createElement('div');
        ctaContainer.className = 'mt-16 p-16 rounded-lg';
        ctaContainer.style.cssText = `
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%);
            border: 1px solid rgba(16, 185, 129, 0.3);
        `;
        
        const ctaHeader = document.createElement('div');
        ctaHeader.className = 'text-center mb-16';
        
        const ctaIcon = document.createElement('div');
        ctaIcon.className = 'inline-flex items-center justify-center w-16 h-16 rounded-full mb-12';
        ctaIcon.style.cssText = `
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
        `;
        ctaIcon.innerHTML = `
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
        `;
        
        const ctaTitle = document.createElement('h5');
        ctaTitle.className = 'font-bold text-white text-center mb-8 text-lg';
        ctaTitle.textContent = 'Ready to Activate Sample-Safe™ Protection?';
        
        const ctaText = document.createElement('p');
        ctaText.className = 'text-sm text-white/80 text-center leading-relaxed';
        ctaText.textContent = 'Add your track\'s playback URL to the "Source file URL" field above to begin creating its unbreakable digital DNA. This activates our Sample-Safe™ guarantee where you warrant to buyers that all samples are cleared and the track is safe for commercial use.';
        
        ctaHeader.appendChild(ctaIcon);
        ctaHeader.appendChild(ctaTitle);
        ctaHeader.appendChild(ctaText);
        
        // Additional trust indicators
        const trustIndicators = document.createElement('div');
        trustIndicators.className = 'flex items-center justify-center gap-16 mt-16 pt-16 border-t border-white/10';
        
        const indicators = [
            { icon: 'security', text: 'Military-Grade Security' },
            { icon: 'verified_user', text: 'Producer Warranty: Sample-Safe™' },
            { icon: 'schedule', text: 'Immutable Timestamp' }
        ];
        
        indicators.forEach(indicator => {
            const indicatorElement = document.createElement('div');
            indicatorElement.className = 'flex items-center gap-6 text-xs text-white/70';
            indicatorElement.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#10b981">
                    <circle cx="12" cy="12" r="10"/>
                </svg>
                <span>${indicator.text}</span>
            `;
            trustIndicators.appendChild(indicatorElement);
        });
        
        ctaContainer.appendChild(ctaHeader);
        ctaContainer.appendChild(trustIndicators);
        
        container.appendChild(heroSection);
        container.appendChild(stepsContainer);
        container.appendChild(ctaContainer);
        content.appendChild(container);
    }

    function renderIncompleteMetadataState(content, metadata) {
        content.innerHTML = '';
        
        const container = document.createElement('div');
        container.className = 'p-16 space-y-16';
        
        // Enhanced progress indicator with step visualization
        const progressHeader = document.createElement('div');
        progressHeader.className = 'text-center mb-24';
        
        const progressTitle = document.createElement('h4');
        progressTitle.className = 'font-bold text-white mb-12 text-lg';
        progressTitle.textContent = 'Step 2: Complete Track Metadata';
        
        // Enhanced progress bar with step indicators
        const progressWrapper = document.createElement('div');
        progressWrapper.className = 'relative mb-16';
        
        const progressTrack = document.createElement('div');
        progressTrack.className = 'w-full bg-white/10 rounded-full h-4 relative overflow-hidden';
        
        const progressFill = document.createElement('div');
        progressFill.className = 'bg-gradient-to-r from-blue-500 to-green-500 h-4 rounded-full transition-all duration-500 relative';
        progressFill.style.width = '50%'; // Step 2 of 4
        progressFill.style.cssText += `
            background: linear-gradient(90deg, #3b82f6 0%, #10b981 100%);
            box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
        `;
        
        // Add animated progress shine
        const progressShine = document.createElement('div');
        progressShine.style.cssText = `
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
            animation: progressShine 2s ease-in-out infinite;
        `;
        progressFill.appendChild(progressShine);
        
        progressTrack.appendChild(progressFill);
        
        // Step dots on progress bar
        const stepDots = document.createElement('div');
        stepDots.className = 'absolute top-1/2 transform -translate-y-1/2 w-full flex justify-between px-2';
        
        for (let i = 1; i <= 4; i++) {
            const dot = document.createElement('div');
            dot.className = `w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                i <= 2 ? 'bg-white border-white text-black' : 'bg-white/20 border-white/30 text-white/60'
            }`;
            dot.textContent = i;
            stepDots.appendChild(dot);
        }
        
        progressWrapper.appendChild(progressTrack);
        progressWrapper.appendChild(stepDots);
        
        const progressText = document.createElement('p');
        progressText.className = 'text-sm text-white/80 flex items-center justify-center gap-8';
        progressText.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#10b981">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            <span>Audio URL verified</span>
            <svg width="6" height="6" viewBox="0 0 24 24" fill="currentColor" class="text-white/50 flex-shrink-0">
                <circle cx="12" cy="12" r="8"/>
            </svg>
            <span>Metadata required for fingerprint generation</span>
        `;
        
        progressHeader.appendChild(progressTitle);
        progressHeader.appendChild(progressWrapper);
        progressHeader.appendChild(progressText);
        
        // Enhanced metadata requirements with visual feedback
        const requirementsSection = document.createElement('div');
        requirementsSection.className = 'space-y-16';
        
        const requirementsHeader = document.createElement('div');
        requirementsHeader.className = 'text-center mb-20';
        
        const requirementsTitle = document.createElement('h5');
        requirementsTitle.className = 'font-bold text-white mb-8 text-lg';
        requirementsTitle.textContent = 'Complete These Required Fields';
        
        const requirementsSubtitle = document.createElement('p');
        requirementsSubtitle.className = 'text-sm text-white/70 max-w-lg mx-auto leading-relaxed';
        requirementsSubtitle.textContent = 'These fields help BeatPassID create a more accurate acoustic fingerprint for your track, ensuring better duplicate detection and authenticity verification.';
        
        requirementsHeader.appendChild(requirementsTitle);
        requirementsHeader.appendChild(requirementsSubtitle);
        
        // Enhanced metadata checklist with completion percentage
        const metadataContainer = document.createElement('div');
        metadataContainer.className = 'space-y-12';
        
        const completedCount = [metadata.hasKey, metadata.hasScale, metadata.hasBPM].filter(Boolean).length;
        const completionPercentage = Math.round((completedCount / 3) * 100);
        
        // Completion status bar
        const completionStatus = document.createElement('div');
        completionStatus.className = 'p-16 rounded-lg mb-16';
        completionStatus.style.cssText = `
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%);
            border: 1px solid rgba(16, 185, 129, 0.2);
        `;
        
        const statusHeader = document.createElement('div');
        statusHeader.className = 'flex items-center justify-between mb-8';
        
        const statusTitle = document.createElement('span');
        statusTitle.className = 'font-semibold text-white text-sm';
        statusTitle.textContent = 'Metadata Completion';
        
        const statusPercentage = document.createElement('span');
        statusPercentage.className = 'text-xs font-bold px-8 py-4 rounded-full';
        statusPercentage.style.cssText = `
            background: ${completionPercentage === 100 ? '#10b981' : '#3b82f6'}20;
            color: ${completionPercentage === 100 ? '#10b981' : '#3b82f6'};
            border: 1px solid ${completionPercentage === 100 ? '#10b981' : '#3b82f6'}30;
        `;
        statusPercentage.textContent = `${completionPercentage}% Complete`;
        
        statusHeader.appendChild(statusTitle);
        statusHeader.appendChild(statusPercentage);
        
        const statusBar = document.createElement('div');
        statusBar.className = 'w-full bg-white/10 rounded-full h-2';
        
        const statusFill = document.createElement('div');
        statusFill.className = 'h-2 rounded-full transition-all duration-500';
        statusFill.style.cssText = `
            width: ${completionPercentage}%;
            background: ${completionPercentage === 100 ? '#10b981' : '#3b82f6'};
        `;
        
        statusBar.appendChild(statusFill);
        completionStatus.appendChild(statusHeader);
        completionStatus.appendChild(statusBar);
        
        // Enhanced metadata fields
        const metadataFields = [
            {
                field: 'Key',
                value: metadata.key,
                complete: metadata.hasKey,
                icon: 'music_note',
                description: 'Musical key of your track (e.g., C, Am, F#)',
                color: '#3b82f6',
                importance: 'Critical for harmonic analysis'
            },
            {
                field: 'Scale',
                value: metadata.scale,
                complete: metadata.hasScale,
                icon: 'tune',
                description: 'Major or minor scale type',
                color: '#10b981',
                importance: 'Enhances tonal fingerprinting'
            },
            {
                field: 'BPM',
                value: metadata.bpm,
                complete: metadata.hasBPM,
                icon: 'speed',
                description: 'Beats per minute (40-300 range)',
                color: '#8b5cf6',
                importance: 'Essential for rhythm analysis'
            }
        ];
        
        metadataFields.forEach((field, index) => {
            const fieldElement = createEnhancedMetadataField(field, index);
            metadataContainer.appendChild(fieldElement);
        });
        
        // Enhanced explanation section
        const explanationContainer = document.createElement('div');
        explanationContainer.className = 'mt-24 p-20 rounded-lg';
        explanationContainer.style.cssText = `
            background: linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%);
            border: 1px solid rgba(139, 92, 246, 0.2);
        `;
        
        const explanationTitle = document.createElement('h6');
        explanationTitle.className = 'font-bold text-white mb-12 flex items-center gap-10';
        explanationTitle.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#8b5cf6">
                <path d="M12 2L13.09 8.26L22 9L16 14.74L17.18 23L12 19.77L6.82 23L8 14.74L2 9L10.91 8.26L12 2Z"/>
            </svg>
            Why Metadata Powers BeatPassID
        `;
        
        const explanationGrid = document.createElement('div');
        explanationGrid.className = 'grid grid-cols-1 md:grid-cols-2 gap-16';
        
        const explanationPoints = [
            {
                title: 'Acoustic Precision',
                description: 'Metadata helps our AI analyze specific musical elements more accurately',
                icon: 'precision_manufacturing'
            },
            {
                title: 'Duplicate Prevention',
                description: 'Enhanced fingerprints block even sophisticated attempts at copying',
                icon: 'block'
            },
            {
                title: 'Sample-Safe™ Compliance',
                description: 'Metadata required for producer warranty that all samples are cleared',
                icon: 'verified_user'
            },
            {
                title: 'Discovery Enhancement',
                description: 'Well-tagged tracks are easier for other artists to find and license',
                icon: 'search'
            }
        ];
        
        explanationPoints.forEach(point => {
            const pointElement = document.createElement('div');
            pointElement.className = 'flex items-start gap-12';
            
            const pointIcon = document.createElement('div');
            pointIcon.className = 'flex-shrink-0 w-10 h-10 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center';
            pointIcon.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#8b5cf6">
                    <circle cx="12" cy="12" r="10"/>
                </svg>
            `;
            
            const pointText = document.createElement('div');
            pointText.innerHTML = `
                <div class="font-semibold text-white text-sm mb-2">${point.title}</div>
                <div class="text-xs text-white/70 leading-relaxed">${point.description}</div>
            `;
            
            pointElement.appendChild(pointIcon);
            pointElement.appendChild(pointText);
            explanationGrid.appendChild(pointElement);
        });
        
        explanationContainer.appendChild(explanationTitle);
        explanationContainer.appendChild(explanationGrid);
        
        requirementsSection.appendChild(requirementsHeader);
        requirementsSection.appendChild(completionStatus);
        requirementsSection.appendChild(metadataContainer);
        
        container.appendChild(progressHeader);
        container.appendChild(requirementsSection);
        container.appendChild(explanationContainer);
        content.appendChild(container);
        
        // Add progressive shine animation
        if (!document.getElementById('metadata-animations')) {
            const style = document.createElement('style');
            style.id = 'metadata-animations';
            style.textContent = `
                @keyframes progressShine {
                    0% { left: -100%; }
                    100% { left: 100%; }
                }
                
                @keyframes fieldPulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.02); }
                }
            `;
            document.head.appendChild(style);
        }
    }

    function renderScanState(content, urlChanged = false) {
        content.innerHTML = '';
        
        // Enhanced status message
        const statusMessage = document.createElement('div');
        statusMessage.className = 'flex items-center gap-10 p-14 rounded-lg mb-16 text-sm font-medium bg-blue-500/10 border-blue-500/25 text-blue-400 border';
        
        const statusIcon = urlChanged ? 
            '<path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>' :
            '<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>';
        
        const statusText = urlChanged ? 
            'Audio URL updated - fingerprint regeneration required' : 
            'Requirements met - ready to generate fingerprint';
            
        statusMessage.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                ${statusIcon}
            </svg>
            <span>${statusText}</span>
        `;
        
        // Enhanced action button
        const ctaButton = document.createElement('button');
        ctaButton.className = 'w-full flex items-center justify-center gap-10 px-18 py-14 rounded-lg font-semibold text-white text-sm transition-all duration-300 hover:scale-102';
        ctaButton.style.cssText = `
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
        `;
        
        const buttonText = urlChanged ? 'Regenerate Fingerprint' : 'Generate Fingerprint';
        
        ctaButton.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1M12 7C13.4 7 14.8 8.6 14.8 10V11H15.5V16H8.5V11H9.2V10C9.2 8.6 10.6 7 12 7M12 8.2C11.2 8.2 10.5 8.7 10.5 10V11H13.5V10C13.5 8.7 12.8 8.2 12 8.2Z"/>
            </svg>
            <span>${buttonText}</span>
        `;
        
        ctaButton.onclick = async () => {
            const track_id = getTrackId();
            if (track_id) {
                await startFingerprintingProcess(null, track_id, true);
            }
        };
        
        // Process explanation with benefits
        const processInfo = document.createElement('div');
        processInfo.className = 'mt-16 p-12 rounded-lg bg-blue-500/5 border border-blue-500/20';
        processInfo.innerHTML = `
            <div class="flex items-center gap-8 text-sm text-blue-400 font-medium mb-8">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                </svg>
                <span>What This Does</span>
            </div>
            <div class="text-xs text-white/70 leading-relaxed space-y-2">
                <div class="flex items-center gap-6">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" class="text-blue-400 flex-shrink-0">
                        <circle cx="12" cy="12" r="8"/>
                    </svg>
                    <span>Creates unique acoustic DNA from your track's audio patterns</span>
                </div>
                <div class="flex items-center gap-6">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" class="text-blue-400 flex-shrink-0">
                        <circle cx="12" cy="12" r="8"/>
                    </svg>
                    <span>Enables automatic detection of unauthorized copies</span>
                </div>
                <div class="flex items-center gap-6">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" class="text-blue-400 flex-shrink-0">
                        <circle cx="12" cy="12" r="8"/>
                    </svg>
                    <span>Activates Sample-Safe™ warranty for cleared sample guarantee</span>
                </div>
                <div class="flex items-center gap-6">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" class="text-blue-400 flex-shrink-0">
                        <circle cx="12" cy="12" r="8"/>
                    </svg>
                    <span>Provides immutable proof of creation timestamp</span>
                </div>
            </div>
        `;
        
        content.appendChild(statusMessage);
        content.appendChild(ctaButton);
        content.appendChild(processInfo);
    }

    // Helper function to create process steps
    function createProcessStep(step, isActive = false) {
        const stepElement = document.createElement('div');
        stepElement.className = `flex items-center gap-16 p-12 rounded-lg border transition-all duration-300 ${
            isActive ? 'bg-blue-500/10 border-blue-500/30' : 'bg-white/5 border-white/10'
        }`;
        
        if (isActive) {
            stepElement.style.animation = 'stepGlow 2s ease-in-out infinite';
        }
        
        // Step number circle
        const stepNumber = document.createElement('div');
        stepNumber.className = `flex items-center justify-center w-12 h-12 rounded-full font-bold text-sm ${
            isActive ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/60'
        }`;
        stepNumber.textContent = step.number;
        
        // Step content
        const stepContent = document.createElement('div');
        stepContent.className = 'flex-1';
        
        const stepTitle = document.createElement('div');
        stepTitle.className = `font-bold text-sm mb-2 ${isActive ? 'text-white' : 'text-white/70'}`;
        stepTitle.textContent = step.title;
        
        const stepDescription = document.createElement('div');
        stepDescription.className = 'text-xs text-white/60';
        stepDescription.textContent = step.description;
        
        const stepAction = document.createElement('div');
        stepAction.className = `text-xs mt-4 ${isActive ? 'text-blue-300' : 'text-white/40'}`;
        stepAction.textContent = step.action;
        
        stepContent.appendChild(stepTitle);
        stepContent.appendChild(stepDescription);
        stepContent.appendChild(stepAction);
        
        // Step icon
        const stepIcon = document.createElement('div');
        stepIcon.className = `flex items-center justify-center w-10 h-10 rounded-full ${
            isActive ? 'bg-blue-500/20' : 'bg-white/5'
        }`;
        stepIcon.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="${isActive ? '#3b82f6' : '#ffffff40'}" 
                 style="transition: all 0.3s ease; ${isActive ? 'filter: drop-shadow(0 0 6px ' + (step.color || '#3b82f6') + '60);' : ''}">
                <circle cx="12" cy="12" r="10"/>
            </svg>
        `;
        
        stepElement.appendChild(stepNumber);
        stepElement.appendChild(stepContent);
        stepElement.appendChild(stepIcon);
        
        return stepElement;
    }

    // Enhanced helper function for infographic process steps
    function createEnhancedProcessStep(step, isActive = false) {
        const stepElement = document.createElement('div');
        stepElement.className = `relative flex items-start gap-20 p-16 rounded-lg border transition-all duration-500 ${
            isActive ? 'bg-gradient-to-r from-blue-500/10 to-blue-500/5 border-blue-500/40 shadow-lg' : 'bg-white/3 border-white/10'
        }`;
        stepElement.style.cssText = `
            position: relative;
            z-index: 1;
            animation: ${isActive ? 'slideInUp 0.6s ease-out' : 'none'};
        `;
        
        if (isActive) {
            stepElement.style.boxShadow = `0 0 30px ${step.color || '#3b82f6'}40`;
        }
        
        // Enhanced step number with progress indicator
        const stepNumberContainer = document.createElement('div');
        stepNumberContainer.className = 'relative flex-shrink-0';
        
        const stepNumber = document.createElement('div');
        stepNumber.className = `flex items-center justify-center w-14 h-14 rounded-full font-bold text-sm transition-all duration-300 ${
            isActive 
                ? 'text-white shadow-lg transform scale-110' 
                : 'bg-white/10 text-white/60'
        }`;
        
        if (isActive) {
            stepNumber.style.cssText = `
                background: linear-gradient(135deg, ${step.color || '#3b82f6'} 0%, ${step.color || '#3b82f6'}80 100%);
                box-shadow: 0 6px 20px ${step.color || '#3b82f6'}40;
            `;
        }
        
        stepNumber.textContent = step.number;
        
        // Progress ring for active step
        if (isActive) {
            const progressRing = document.createElement('div');
            progressRing.className = 'absolute inset-0 rounded-full';
            progressRing.style.cssText = `
                border: 2px solid ${step.color || '#3b82f6'}30;
                animation: pulse-ring 2s ease-out infinite;
            `;
            stepNumberContainer.appendChild(progressRing);
        }
        
        stepNumberContainer.appendChild(stepNumber);
        
        // Enhanced step content with tech details
        const stepContent = document.createElement('div');
        stepContent.className = 'flex-1 min-w-0';
        
        const stepHeader = document.createElement('div');
        stepHeader.className = 'flex items-start justify-between mb-8';
        
        const stepTitleContainer = document.createElement('div');
        stepTitleContainer.className = 'flex-1';
        
        const stepTitle = document.createElement('div');
        stepTitle.className = `font-bold text-base mb-3 transition-colors duration-300 ${
            isActive ? 'text-white' : 'text-white/70'
        }`;
        stepTitle.textContent = step.title;
        
        const stepDescription = document.createElement('div');
        stepDescription.className = 'text-sm text-white/70 mb-3';
        stepDescription.textContent = step.description;
        
        stepTitleContainer.appendChild(stepTitle);
        stepTitleContainer.appendChild(stepDescription);
        
        // Status indicator
        const statusIndicator = document.createElement('div');
        statusIndicator.className = `px-8 py-4 rounded-full text-xs font-medium ${
            isActive 
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                : 'bg-white/5 text-white/50 border border-white/10'
        }`;
        statusIndicator.textContent = isActive ? 'READY' : 'WAITING';
        
        stepHeader.appendChild(stepTitleContainer);
        stepHeader.appendChild(statusIndicator);
        
        // Action description
        const stepAction = document.createElement('div');
        stepAction.className = `text-sm mb-12 transition-colors duration-300 ${
            isActive ? 'text-blue-200' : 'text-white/50'
        }`;
        stepAction.textContent = step.action;
        
        // Technical detail (collapsible)
        if (step.techDetail) {
            const techDetailContainer = document.createElement('div');
            techDetailContainer.className = 'mt-8 p-12 rounded-lg bg-white/5 border border-white/10';
            
            const techDetailHeader = document.createElement('div');
            techDetailHeader.className = 'flex items-center gap-8 mb-6 text-xs font-medium text-white/60';
            techDetailHeader.innerHTML = `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                </svg>
                Technical Detail
            `;
            
            const techDetailText = document.createElement('div');
            techDetailText.className = 'text-xs text-white/60 leading-relaxed';
            techDetailText.textContent = step.techDetail;
            
            techDetailContainer.appendChild(techDetailHeader);
            techDetailContainer.appendChild(techDetailText);
            stepContent.appendChild(techDetailContainer);
        }
        
        stepContent.appendChild(stepHeader);
        stepContent.appendChild(stepAction);
        
        // Enhanced step icon with animation
        const stepIcon = document.createElement('div');
        stepIcon.className = `flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ${
            isActive ? 'shadow-lg transform scale-110' : 'bg-white/5'
        }`;
        
        if (isActive) {
            stepIcon.style.cssText = `
                background: linear-gradient(135deg, ${step.color || '#3b82f6'}20 0%, ${step.color || '#3b82f6'}10 100%);
                border: 2px solid ${step.color || '#3b82f6'}30;
            `;
        }
        
        stepIcon.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="${isActive ? step.color || '#3b82f6' : '#ffffff40'}" 
                 style="transition: all 0.3s ease; ${isActive ? 'filter: drop-shadow(0 0 6px ' + (step.color || '#3b82f6') + '60);' : ''}">
                <circle cx="12" cy="12" r="10"/>
            </svg>
        `;
        
        stepElement.appendChild(stepNumberContainer);
        stepElement.appendChild(stepContent);
        stepElement.appendChild(stepIcon);
        
        return stepElement;
    }

    // Helper function to create metadata field display
    function createMetadataField(field) {
        const fieldElement = document.createElement('div');
        fieldElement.className = `flex items-center gap-12 p-12 rounded-lg border ${
            field.complete ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'
        }`;
        
        // Status icon
        const statusIcon = document.createElement('div');
        statusIcon.className = `flex items-center justify-center w-10 h-10 rounded-full ${
            field.complete ? 'bg-green-500' : 'bg-red-500/80'
        }`;
        
        if (field.complete) {
            statusIcon.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white" style="animation: checkmark 0.5s ease-out;">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
            `;
        } else {
            statusIcon.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
                </svg>
            `;
        }
        
        // Field content
        const fieldContent = document.createElement('div');
        fieldContent.className = 'flex-1';
        
        const fieldTitle = document.createElement('div');
        fieldTitle.className = 'font-bold text-white text-sm mb-1';
        fieldTitle.textContent = field.field;
        
        const fieldDescription = document.createElement('div');
        fieldDescription.className = 'text-xs text-white/70';
        fieldDescription.textContent = field.description;
        
        fieldContent.appendChild(fieldTitle);
        fieldContent.appendChild(fieldDescription);
        
        // Field value/status
        const fieldStatus = document.createElement('div');
        fieldStatus.className = `text-sm font-medium ${
            field.complete ? 'text-green-400' : 'text-red-400'
        }`;
        fieldStatus.textContent = field.complete ? field.value : 'Required';
        
        fieldElement.appendChild(statusIcon);
        fieldElement.appendChild(fieldContent);
        fieldElement.appendChild(fieldStatus);
        
        return fieldElement;
    }

    // Enhanced helper function for metadata field display with soft styling
    function createEnhancedMetadataField(field, index) {
        const fieldElement = document.createElement('div');
        fieldElement.className = `relative overflow-hidden rounded-lg border transition-all duration-500 ${
            field.complete 
                ? 'bg-gradient-to-r from-green-500/8 to-green-500/4 border-green-500/30 shadow-md' 
                : 'bg-gradient-to-r from-orange-500/6 to-amber-500/4 border-orange-500/25'
        }`;
        fieldElement.style.cssText = `
            animation: slideInUp 0.6s ease-out ${index * 0.1}s both;
        `;
        
        if (!field.complete) {
            fieldElement.style.animation += ', gentlePulse 3s ease-in-out infinite';
        }
        
        const fieldContent = document.createElement('div');
        fieldContent.className = 'relative z-10 flex items-center gap-16 p-16';
        
        // Enhanced status icon with progress ring
        const statusIconContainer = document.createElement('div');
        statusIconContainer.className = 'relative flex-shrink-0';
        
        const statusIcon = document.createElement('div');
        statusIcon.className = `flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ${
            field.complete ? 'bg-green-500 shadow-lg' : 'bg-orange-400/70'
        }`;
        
        if (field.complete) {
            statusIcon.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white" style="animation: checkmark 0.8s ease-out;">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
            `;
            
            // Add success ring animation
            const successRing = document.createElement('div');
            successRing.className = 'absolute inset-0 rounded-full';
            successRing.style.cssText = `
                border: 2px solid #10b98130;
                animation: pulse-ring 1.5s ease-out infinite;
            `;
            statusIconContainer.appendChild(successRing);
        } else {
            statusIcon.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
            `;
        }
        
        statusIconContainer.appendChild(statusIcon);
        
        // Enhanced field information
        const fieldInfo = document.createElement('div');
        fieldInfo.className = 'flex-1 min-w-0';
        
        const fieldHeader = document.createElement('div');
        fieldHeader.className = 'flex items-center justify-between mb-6';
        
        const fieldTitleContainer = document.createElement('div');
        fieldTitleContainer.className = 'flex items-center gap-8';
        
        const fieldTitle = document.createElement('div');
        fieldTitle.className = 'font-bold text-white text-sm';
        fieldTitle.textContent = field.field;
        
        // Add colored indicator dot
        const colorDot = document.createElement('div');
        colorDot.className = 'w-2 h-2 rounded-full';
        colorDot.style.cssText = `
            background: ${field.color || '#3b82f6'};
            box-shadow: 0 0 6px ${field.color || '#3b82f6'}80;
        `;
        
        fieldTitleContainer.appendChild(fieldTitle);
        fieldTitleContainer.appendChild(colorDot);
        
        // Priority badge
        const priorityBadge = document.createElement('div');
        priorityBadge.className = 'px-6 py-2 rounded-full text-xs font-medium';
        if (field.complete) {
            priorityBadge.style.cssText = `
                background: #10b98115;
                color: #10b981;
                border: 1px solid #10b98125;
            `;
            priorityBadge.textContent = 'COMPLETE';
        } else {
            priorityBadge.style.cssText = `
                background: #f59e0b15;
                color: #f59e0b;
                border: 1px solid #f59e0b25;
            `;
            priorityBadge.textContent = 'NEEDED';
        }
        
        fieldHeader.appendChild(fieldTitleContainer);
        fieldHeader.appendChild(priorityBadge);
        
        const fieldDescription = document.createElement('div');
        fieldDescription.className = 'text-sm text-white/70 mb-3';
        fieldDescription.textContent = field.description;
        
        // Technical importance note
        const fieldImportance = document.createElement('div');
        fieldImportance.className = 'text-xs text-white/60 italic';
        fieldImportance.textContent = field.importance;
        
        fieldInfo.appendChild(fieldHeader);
        fieldInfo.appendChild(fieldDescription);
        fieldInfo.appendChild(fieldImportance);
        
        // Field value display with enhanced styling
        const fieldValueContainer = document.createElement('div');
        fieldValueContainer.className = 'flex-shrink-0 text-right';
        
        const fieldValue = document.createElement('div');
        fieldValue.className = `font-bold text-sm mb-2 ${
            field.complete ? 'text-green-400' : 'text-orange-400'
        }`;
        fieldValue.textContent = field.complete ? field.value : 'Missing';
        
        const fieldStatus = document.createElement('div');
        fieldStatus.className = `text-xs ${
            field.complete ? 'text-green-400/70' : 'text-orange-400/70'
        }`;
        fieldStatus.textContent = field.complete ? 'Verified' : 'Please add';
        
        fieldValueContainer.appendChild(fieldValue);
        fieldValueContainer.appendChild(fieldStatus);
        
        // Subtle background pattern for incomplete fields
        if (!field.complete) {
            const backgroundPattern = document.createElement('div');
            backgroundPattern.className = 'absolute inset-0 opacity-10';
            backgroundPattern.style.cssText = `
                background-image: repeating-linear-gradient(
                    45deg,
                    transparent,
                    transparent 15px,
                    rgba(245, 158, 11, 0.1) 15px,
                    rgba(245, 158, 11, 0.1) 30px
                );
                animation: gentleFloat 8s ease-in-out infinite;
            `;
            fieldElement.appendChild(backgroundPattern);
        }
        
        fieldContent.appendChild(statusIconContainer);
        fieldContent.appendChild(fieldInfo);
        fieldContent.appendChild(fieldValueContainer);
        fieldElement.appendChild(fieldContent);
        
        return fieldElement;
    }

    function renderFingerprintedState(content, statusInfo, currentURL) {
        content.innerHTML = '';
        
        // Success message with enhanced styling
        const successMessage = document.createElement('div');
        successMessage.className = 'flex items-center gap-10 p-14 rounded-lg mb-16 text-sm font-medium';
        
        let messageText, iconSvg, bgClass;
        if (statusInfo.isDuplicate) {
            if (statusInfo.isAuthentic) {
                const dupCount = statusInfo.duplicateCount || 0;
                messageText = dupCount > 0 
                    ? `🎯 Authentic Original - ${dupCount} duplicate${dupCount === 1 ? '' : 's'} blocked`
                    : 'Protected (Authentic Version)';
                iconSvg = '<path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1M10 17L6 13L7.41 11.59L10 14.17L16.59 7.58L18 9L10 17Z"/>';
                bgClass = 'bg-blue-500/10 border-blue-500/25 text-blue-400';
            } else {
                messageText = 'Duplicate Content - ToS Violation (Fingerprinting Failed)';
                iconSvg = '<path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>';
                bgClass = 'bg-orange-500/10 border-orange-500/25 text-orange-400';
            }
        } else {
            messageText = '✅ Unique Track - Successfully fingerprinted and protected';
            iconSvg = '<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>';
            bgClass = 'bg-green-500/10 border-green-500/25 text-green-400';
        }
        
        successMessage.className += ` ${bgClass} border`;
        successMessage.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                ${iconSvg}
            </svg>
            <span>${messageText}</span>
        `;
        
        // Tab navigation for fingerprint data
        const tabContainer = document.createElement('div');
        tabContainer.className = 'border-b border-white/10 mb-16';
        
        const tabNav = document.createElement('div');
        tabNav.className = 'flex gap-20';
        
        // Hash tab
        const hashTab = document.createElement('button');
        hashTab.type = 'button';
        hashTab.className = 'py-8 px-4 border-b-2 border-green-500 text-green-400 font-medium text-sm';
        hashTab.textContent = 'Hash';
        hashTab.setAttribute('data-tab', 'hash');
        
        // Fingerprint tab
        const fingerprintTab = document.createElement('button');
        fingerprintTab.type = 'button';
        fingerprintTab.className = 'py-8 px-4 border-b-2 border-transparent text-white/60 font-medium text-sm hover:text-white/80 transition-colors';
        fingerprintTab.textContent = 'Full Fingerprint';
        fingerprintTab.setAttribute('data-tab', 'fingerprint');
        
        tabNav.appendChild(hashTab);
        tabNav.appendChild(fingerprintTab);
        tabContainer.appendChild(tabNav);
        
        // Content panels
        const contentContainer = document.createElement('div');
        contentContainer.className = 'mt-12';
        
        // Hash panel (default visible)
        const hashPanel = document.createElement('div');
        hashPanel.className = 'fingerprint-panel';
        hashPanel.setAttribute('data-panel', 'hash');
        
        const hashValue = document.createElement('div');
        hashValue.className = 'p-12 rounded-lg font-mono text-sm bg-black/20 border border-white/10';
        hashValue.style.cssText = `
            word-break: break-all;
            white-space: pre-wrap;
            overflow-wrap: break-word;
        `;
        hashValue.textContent = statusInfo.fingerprint_hash || 'No hash available';
        
        const hashDescription = document.createElement('div');
        hashDescription.className = 'mt-8 text-xs text-white/60 flex items-center gap-6';
        hashDescription.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
            </svg>
            <span>Cryptographic hash used for quick duplicate detection</span>
        `;
        
        hashPanel.appendChild(hashValue);
        hashPanel.appendChild(hashDescription);
        
        // Fingerprint panel (hidden by default)
        const fingerprintPanel = document.createElement('div');
        fingerprintPanel.className = 'fingerprint-panel hidden';
        fingerprintPanel.setAttribute('data-panel', 'fingerprint');
        
        const fingerprintValue = document.createElement('div');
        fingerprintValue.className = 'p-12 rounded-lg font-mono text-xs bg-black/20 border border-white/10';
        fingerprintValue.style.cssText = `
            max-height: 150px;
            overflow-y: auto;
            word-break: break-all;
            white-space: pre-wrap;
            overflow-wrap: break-word;
            line-height: 1.5;
            scrollbar-width: thin;
            scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
        `;
        fingerprintValue.textContent = statusInfo.fingerprint || 'No fingerprint available';
        
        // Add custom scrollbar styling
        const scrollbarStyle = document.createElement('style');
        scrollbarStyle.textContent = `
            .fingerprint-panel div::-webkit-scrollbar {
                width: 6px;
            }
            .fingerprint-panel div::-webkit-scrollbar-track {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 3px;
            }
            .fingerprint-panel div::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.3);
                border-radius: 3px;
            }
            .fingerprint-panel div::-webkit-scrollbar-thumb:hover {
                background: rgba(255, 255, 255, 0.5);
            }
        `;
        if (!document.getElementById('fingerprint-scrollbar-style')) {
            scrollbarStyle.id = 'fingerprint-scrollbar-style';
            document.head.appendChild(scrollbarStyle);
        }
        
        const fingerprintDescription = document.createElement('div');
        fingerprintDescription.className = 'mt-8 text-xs text-white/60 flex items-center gap-6';
        fingerprintDescription.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
            </svg>
            <span>Full acoustic fingerprint data for comprehensive audio verification</span>
        `;
        
        fingerprintPanel.appendChild(fingerprintValue);
        fingerprintPanel.appendChild(fingerprintDescription);
        
        contentContainer.appendChild(hashPanel);
        contentContainer.appendChild(fingerprintPanel);
        
        // Tab switching functionality with smooth transitions
        function switchTab(targetTab) {
            const tabs = tabContainer.querySelectorAll('[data-tab]');
            const panels = contentContainer.querySelectorAll('[data-panel]');
            
            tabs.forEach(tab => {
                if (tab.getAttribute('data-tab') === targetTab) {
                    tab.className = 'py-8 px-4 border-b-2 border-green-500 text-green-400 font-medium text-sm transition-colors';
                } else {
                    tab.className = 'py-8 px-4 border-b-2 border-transparent text-white/60 font-medium text-sm hover:text-white/80 transition-colors';
                }
            });
            
            panels.forEach(panel => {
                if (panel.getAttribute('data-panel') === targetTab) {
                    panel.style.opacity = '0';
                    panel.classList.remove('hidden');
                    setTimeout(() => {
                        panel.style.transition = 'opacity 0.2s ease-in-out';
                        panel.style.opacity = '1';
                    }, 10);
                } else {
                    panel.style.transition = 'opacity 0.2s ease-in-out';
                    panel.style.opacity = '0';
                    setTimeout(() => {
                    panel.classList.add('hidden');
                    }, 200);
                }
            });
        }
        
        // Bind tab events
        hashTab.addEventListener('click', () => switchTab('hash'));
        fingerprintTab.addEventListener('click', () => switchTab('fingerprint'));
        
        // Enhanced protection status with detailed duplicate detection info
        const protectionStatus = document.createElement('div');
        
        if (statusInfo.isDuplicate) {
            if (statusInfo.isAuthentic) {
                // Authentic original with duplicates found
                const dupCount = statusInfo.duplicateCount || 0;
                protectionStatus.className = 'mt-16 space-y-12';
                protectionStatus.innerHTML = `
                    <div class="p-12 rounded-lg bg-blue-500/5 border border-blue-500/20">
                        <div class="flex items-center gap-8 text-sm text-blue-400 font-medium mb-6">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1M10 17L6 13L7.41 11.59L10 14.17L16.59 7.58L18 9L10 17Z"/>
                            </svg>
                            <span>Authentic Original Protected</span>
                        </div>
                        <div class="text-xs text-white/60 leading-relaxed space-y-1">
                            <div class="flex items-center gap-6">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" class="text-green-400 flex-shrink-0">
                                    <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1M10 17L6 13L7.41 11.59L10 14.17L16.59 7.58L18 9L10 17Z"/>
                                </svg>
                                <span>This is the verified authentic version</span>
                            </div>
                            <div class="flex items-center gap-6">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" class="text-green-400 flex-shrink-0">
                                    <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1Z"/>
                                </svg>
                                <span>${dupCount > 0 ? `${dupCount} duplicate${dupCount === 1 ? '' : 's'} detected and blocked` : 'No duplicates detected'}</span>
                            </div>
                            <div class="flex items-center gap-6">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" class="text-green-400 flex-shrink-0">
                                    <path d="M9 12L11 14L15 10L22 17L20 19L15 14L13 16L11 14L9 12Z"/>
                                </svg>
                                <span>Sample-Safe™ warranty: Producer guarantees all samples are cleared</span>
                            </div>
                            <div class="flex items-center gap-6">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" class="text-green-400 flex-shrink-0">
                                    <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1Z"/>
                                </svg>
                                <span>Full copyright protection active</span>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                // Duplicate content detected
                protectionStatus.className = 'mt-16 space-y-12';
                
                                 // Get duplicate info if available  
                 const duplicateInfo = statusInfo.duplicateInfo || {};
                 console.log("🔍 Raw duplicateInfo structure:", duplicateInfo);
                 
                 // Try multiple possible data structures
                 let originalTrack = {};
                 if (duplicateInfo.original_track) {
                     originalTrack = duplicateInfo.original_track;
                 } else if (duplicateInfo.exact_matches && duplicateInfo.exact_matches.length > 0) {
                     originalTrack = duplicateInfo.exact_matches[0];
                 } else if (duplicateInfo.similar_matches && duplicateInfo.similar_matches.length > 0) {
                     originalTrack = duplicateInfo.similar_matches[0];
                 } else if (duplicateInfo.track_name) {
                     // Data might be directly in duplicateInfo
                     originalTrack = duplicateInfo;
                 }
                 
                 console.log("🔍 Duplicate info for UI display:", {
                     duplicateInfo,
                     originalTrack,
                     hasTrackName: !!originalTrack.track_name,
                     hasCreatedAt: !!originalTrack.created_at,
                     hasProducer: !!originalTrack.producer,
                     originalTrackKeys: Object.keys(originalTrack)
                 });
                
                                 protectionStatus.innerHTML = `
                     <div class="p-12 rounded-lg bg-orange-500/10 border border-orange-500/25">
                         <div class="flex items-center gap-8 text-sm text-orange-400 font-medium mb-8">
                             <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                 <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                             </svg>
                             <span>Duplicate Content Detected</span>
                         </div>
                        
                                                 <div class="mb-12 p-10 rounded-lg bg-orange-500/5 border border-orange-500/15">
                             <div class="text-xs font-medium text-orange-300 mb-6">Audio Analysis Results:</div>
                             <div class="grid grid-cols-2 gap-12 text-xs">
                                 <div>
                                     <div class="flex items-center gap-6 text-white/80 font-medium mb-2">
                                         <svg width="12" height="12" viewBox="0 0 24 24" fill="#10b981">
                                             <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                                         </svg>
                                         Original Audio:
                                     </div>
                                     <div class="text-white/60">
                                         ${originalTrack.track_name ? `Track: "${originalTrack.track_name}"<br/>` : 'Track: [Data not available]<br/>'}
                                         ${originalTrack.created_at ? `Uploaded: ${new Date(originalTrack.created_at).toLocaleDateString()}<br/>` : 'Uploaded: [Date unknown]<br/>'}
                                         ${originalTrack.producer ? `Producer: ${originalTrack.producer}<br/>` : 'Producer: [Unknown]<br/>'}
                                         Status: <span class="text-green-400">First upload (authentic)</span>
                                     </div>
                                 </div>
                                 <div>
                                     <div class="flex items-center gap-6 text-white/80 font-medium mb-2">
                                         <svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b">
                                             <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                                         </svg>
                                         Current Upload:
                                     </div>
                                     <div class="text-white/60">
                                         Track: "${getTrackName() || 'Current track'}"<br/>
                                         Upload Date: ${new Date().toLocaleDateString()}<br/>
                                         Status: <span class="text-orange-400 font-medium">Duplicate detected</span>
                                     </div>
                                 </div>
                             </div>
                         </div>
                        
                                                 <div class="p-10 rounded-lg bg-orange-500/5 border border-orange-500/15 mb-12">
                             <div class="flex items-start gap-8 mb-6">
                                 <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" class="mt-1 flex-shrink-0">
                                     <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                                 </svg>
                                 <div>
                                     <div class="text-xs font-medium text-orange-400 mb-2">Terms of Service Violation</div>
                                     <div class="text-xs text-white/70 leading-relaxed">
                                         Uploading duplicate tracks violates BeatPass <a href="https://open.beatpass.ca/pages/terms-of-service" target="_blank" class="text-orange-400 underline hover:text-orange-300">Terms of Service</a>. 
                                         BeatPass does not allow listing the same beat twice as it conflicts with our Sample-Safe™ platform guarantee and can cause:
                                     </div>
                                 </div>
                             </div>
                             <div class="text-xs text-white/60 leading-relaxed ml-22 space-y-2">
                                 <div class="flex items-start gap-6">
                                     <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" class="text-orange-400 flex-shrink-0 mt-0.5">
                                         <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                                     </svg>
                                     <span><strong>Duplicate exclusive licensing issues</strong> - Multiple buyers receiving "exclusive" rights to the same beat</span>
                                 </div>
                                 <div class="flex items-start gap-6">
                                     <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" class="text-orange-400 flex-shrink-0 mt-0.5">
                                         <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                                     </svg>
                                     <span><strong>Customer confusion</strong> - Buyers unsure which version to purchase</span>
                                 </div>
                                 <div class="flex items-start gap-6">
                                     <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" class="text-orange-400 flex-shrink-0 mt-0.5">
                                         <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                                     </svg>
                                     <span><strong>Copyright complications</strong> - Conflicting ownership claims</span>
                                 </div>
                                 <div class="flex items-start gap-6">
                                     <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" class="text-orange-400 flex-shrink-0 mt-0.5">
                                         <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                                     </svg>
                                     <span><strong>Platform integrity issues</strong> - Reduced trust in exclusive licensing</span>
                                 </div>
                                 <div class="flex items-start gap-6">
                                     <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" class="text-orange-400 flex-shrink-0 mt-0.5">
                                         <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                                     </svg>
                                     <span><strong>Sample-Safe™ guarantee violation</strong> - Compromises producer warranty system</span>
                                 </div>
                             </div>
                         </div>
                         
                         <div class="p-10 rounded-lg bg-red-500/5 border border-red-500/15">
                             <div class="flex items-center gap-6 text-xs font-medium text-red-300 mb-6">
                                 <svg width="12" height="12" viewBox="0 0 24 24" fill="#fca5a5">
                                     <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                 </svg>
                                 BeatPassID Protection Status:
                             </div>
                             <div class="text-xs text-white/60 leading-relaxed">
                                 <strong>Fingerprinting Failed</strong> - BeatPassID protection could not be activated due to Terms of Service violation. 
                                 This upload does not align with our Sample-Safe™ platform guarantee which requires original, non-duplicate content. 
                                 Any fingerprint data has been removed from our database to maintain platform integrity.
                             </div>
                         </div>
                    </div>
                `;
            }
        } else {
            // Unique content
            protectionStatus.className = 'mt-16 p-12 rounded-lg bg-green-500/5 border border-green-500/20';
            protectionStatus.innerHTML = `
                <div class="flex items-center gap-8 text-sm text-green-400 font-medium mb-6">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1M10 17L6 13L7.41 11.59L10 14.17L16.59 7.58L18 9L10 17Z"/>
                    </svg>
                    <span>Unique Content Protected</span>
                </div>
                <div class="text-xs text-white/60 leading-relaxed space-y-1">
                    <div class="flex items-center gap-6">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" class="text-green-400 flex-shrink-0">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                        <span>No duplicates found - this is original audio</span>
                </div>
                    <div class="flex items-center gap-6">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" class="text-green-400 flex-shrink-0">
                            <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1Z"/>
                        </svg>
                        <span>Full copyright protection active</span>
                    </div>
                    <div class="flex items-center gap-6">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" class="text-green-400 flex-shrink-0">
                            <path d="M9 12L11 14L15 10L22 17L20 19L15 14L13 16L11 14L9 12Z"/>
                        </svg>
                        <span>Sample-Safe™ warranty: Producer guarantees all samples are cleared</span>
                    </div>
                    <div class="flex items-center gap-6">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" class="text-green-400 flex-shrink-0">
                            <path d="M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22 22 17.52 22 12 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z"/>
                        </svg>
                        <span>Immutable timestamp proves ownership and creation date</span>
                    </div>
                    <div class="flex items-center gap-6">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" class="text-green-400 flex-shrink-0">
                            <path d="M18 8H17V6C17 3.24 14.76 1 12 1S7 3.24 7 6V8H6C4.9 8 4 8.9 4 10V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V10C20 8.9 19.1 8 18 8ZM12 17C10.9 17 10 16.1 10 15S10.9 13 12 13 14 13.9 14 15 13.1 17 12 17ZM15.1 8H8.9V6C8.9 4.29 10.29 2.9 12 2.9S15.1 4.29 15.1 6V8Z"/>
                        </svg>
                        <span>Safe for exclusive licensing without duplication concerns</span>
                    </div>
                </div>
            `;
        }
        
        // Assemble the content
        content.appendChild(successMessage);
        content.appendChild(tabContainer);
        content.appendChild(contentContainer);
        content.appendChild(protectionStatus);
    }

    function renderProcessingState(content, message = 'Processing...') {
        content.innerHTML = '';
        
        const processingMessage = document.createElement('div');
        processingMessage.className = 'fingerprint-processing flex items-center gap-8 p-12 rounded-lg text-sm';
        processingMessage.style.cssText = `
            background: rgba(147, 51, 234, 0.1);
            color: #a855f7;
            border: 1px solid rgba(147, 51, 234, 0.2);
        `;
        
        const spinner = document.createElement('div');
        spinner.className = 'w-4 h-4 border-2 border-purple-300 border-t-purple-600 rounded-full';
        spinner.style.animation = 'bp-spin 1s linear infinite';
        
        const text = document.createElement('span');
        text.className = 'font-medium';
        text.textContent = message;
        
        processingMessage.appendChild(spinner);
        processingMessage.appendChild(text);
        content.appendChild(processingMessage);
    }

    function renderFingerprintFailureState(content, submitData) {
        content.innerHTML = '';
        
        // Get duplicate info if available  
        const duplicateInfo = submitData.duplicateInfo || {};
        console.log("🔍 Raw duplicateInfo for failure state:", duplicateInfo);
        
        // Try multiple possible data structures
        let originalTrack = {};
        if (duplicateInfo.original_track) {
            originalTrack = duplicateInfo.original_track;
        } else if (duplicateInfo.exact_matches && duplicateInfo.exact_matches.length > 0) {
            originalTrack = duplicateInfo.exact_matches[0];
        } else if (duplicateInfo.similar_matches && duplicateInfo.similar_matches.length > 0) {
            originalTrack = duplicateInfo.similar_matches[0];
        } else if (duplicateInfo.track_name) {
            // Data might be directly in duplicateInfo
            originalTrack = duplicateInfo;
        }
        
        console.log("🎯 Original track for failure display:", originalTrack);
        
        // Main failure banner
        const failureBanner = document.createElement('div');
        failureBanner.className = 'p-16 rounded-lg bg-orange-500/10 border border-orange-500/25 mb-16';
        
        const bannerHeader = document.createElement('div');
        bannerHeader.className = 'flex items-center gap-8 text-orange-400 font-medium mb-12';
        bannerHeader.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
            </svg>
            <span>BeatPassID Protection Failed</span>
        `;
        
        const bannerMessage = document.createElement('div');
        bannerMessage.className = 'text-sm text-white/80 mb-12';
        bannerMessage.textContent = 'Cannot activate protection - another track with identical audio is already protected on BeatPass.';
        
        failureBanner.appendChild(bannerHeader);
        failureBanner.appendChild(bannerMessage);
        
        // Original track info with link
        if (originalTrack.track_name || originalTrack.track_id) {
            const originalTrackSection = document.createElement('div');
            originalTrackSection.className = 'p-12 rounded-lg bg-orange-500/5 border border-orange-500/15 mb-12';
            
            const originalTrackHeader = document.createElement('div');
            originalTrackHeader.className = 'flex items-center gap-8 text-orange-300 font-medium mb-8 text-sm';
            originalTrackHeader.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1M10 17L6 13L7.41 11.59L10 14.17L16.59 7.58L18 9L10 17Z"/>
                </svg>
                <span>Protected Original Track</span>
            `;
            
            const originalTrackInfo = document.createElement('div');
            originalTrackInfo.className = 'text-xs text-white/70 space-y-2';
            
            let trackInfoHTML = `
                <div><strong>Track:</strong> ${originalTrack.track_name || 'Name not available'}</div>
                <div><strong>Upload Date:</strong> ${originalTrack.created_at ? new Date(originalTrack.created_at).toLocaleDateString() : 'Date unknown'}</div>
                <div><strong>Producer:</strong> ${originalTrack.producer || 'Unknown'}</div>
                <div><strong>Status:</strong> <span class="text-green-400">Under Active Protection</span></div>
            `;
            
            // Add view link if track_id is available
            if (originalTrack.track_id) {
                trackInfoHTML += `
                    <div class="mt-8 pt-8 border-t border-orange-500/20">
                        <a href="https://open.beatpass.ca/track/${originalTrack.track_id}/preview" 
                           target="_blank" 
                           class="inline-flex items-center gap-6 text-orange-400 hover:text-orange-300 text-sm font-medium transition-colors">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
                            </svg>
                            View Original Track
                        </a>
                    </div>
                `;
            }
            
            originalTrackInfo.innerHTML = trackInfoHTML;
            
            originalTrackSection.appendChild(originalTrackHeader);
            originalTrackSection.appendChild(originalTrackInfo);
            
            failureBanner.appendChild(originalTrackSection);
        }
        
        // Explanation section
        const explanationSection = document.createElement('div');
        explanationSection.className = 'p-12 rounded-lg bg-red-500/5 border border-red-500/15';
        
        const explanationHeader = document.createElement('div');
        explanationHeader.className = 'flex items-center gap-8 text-red-300 font-medium mb-8 text-sm';
        explanationHeader.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
            </svg>
            <span>Why This Happened</span>
        `;
        
        const explanationText = document.createElement('div');
        explanationText.className = 'text-xs text-white/70 leading-relaxed space-y-3';
        explanationText.innerHTML = `
            <div class="flex items-start gap-6">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" class="text-red-400 flex-shrink-0 mt-0.5">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                </svg>
                <span><strong>Duplicate Content Detected:</strong> Our acoustic fingerprinting system identified this audio as identical to a track already protected on BeatPass.</span>
            </div>
            <div class="flex items-start gap-6">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" class="text-red-400 flex-shrink-0 mt-0.5">
                    <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1Z"/>
                </svg>
                <span><strong>Platform Integrity:</strong> BeatPass prevents duplicate listings to maintain trust in our exclusive licensing system.</span>
            </div>
            <div class="flex items-start gap-6">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" class="text-red-400 flex-shrink-0 mt-0.5">
                    <path d="M9 12L11 14L15 10L22 17L20 19L15 14L13 16L11 14L9 12Z"/>
                </svg>
                <span><strong>Sample-Safe™ Compliance:</strong> Duplicate uploads violate our Sample-Safe™ guarantee which requires original, non-duplicate content.</span>
            </div>
        `;
        
        explanationSection.appendChild(explanationHeader);
        explanationSection.appendChild(explanationText);
        
        // Next steps section
        const nextStepsSection = document.createElement('div');
        nextStepsSection.className = 'mt-16 p-12 rounded-lg bg-gray-500/5 border border-gray-500/15';
        
        const nextStepsHeader = document.createElement('div');
        nextStepsHeader.className = 'flex items-center gap-8 text-gray-300 font-medium mb-8 text-sm';
        nextStepsHeader.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            <span>What You Can Do</span>
        `;
        
        const nextStepsText = document.createElement('div');
        nextStepsText.className = 'text-xs text-white/70 leading-relaxed space-y-2';
        nextStepsText.innerHTML = `
            <div class="flex items-start gap-6">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" class="text-gray-400 flex-shrink-0 mt-0.5">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
                <span><strong>If you own the original:</strong> Contact support with proof of ownership to resolve this issue</span>
            </div>
            <div class="flex items-start gap-6">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" class="text-gray-400 flex-shrink-0 mt-0.5">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
                <span><strong>If this is a remix:</strong> Ensure proper licensing and clearly label your version as a remix</span>
            </div>
            <div class="flex items-start gap-6">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" class="text-gray-400 flex-shrink-0 mt-0.5">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
                <span><strong>Create original content:</strong> Upload unique beats to avoid duplication issues</span>
            </div>
            <div class="flex items-start gap-6">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" class="text-gray-400 flex-shrink-0 mt-0.5">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
                <span><strong>Remove this upload:</strong> Consider deleting this upload to comply with platform policies</span>
            </div>
        `;
        
        nextStepsSection.appendChild(nextStepsHeader);
        nextStepsSection.appendChild(nextStepsText);
        
        // Assemble the failure state
        content.appendChild(failureBanner);
        content.appendChild(explanationSection);
        content.appendChild(nextStepsSection);
        
        // Add fade-in animation
        content.style.opacity = '0';
        content.style.transform = 'translateY(10px)';
        content.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
        
        setTimeout(() => {
            content.style.opacity = '1';
            content.style.transform = 'translateY(0)';
        }, 100);
    }

    // Enhanced notification system using native toast styling
    function showNotification(message, type = 'info') {
        // Create notification container if it doesn't exist
        let container = document.getElementById('beatpass-notifications');
        if (!container) {
            container = document.createElement('div');
            container.id = 'beatpass-notifications';
            container.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 10000;
                display: flex;
                flex-direction: column-reverse;
                gap: 10px;
                max-width: 500px;
                width: max-content;
            `;
            document.body.appendChild(container);
        }

        // Get icon and color based on type
        const getTypeConfig = (type) => {
            switch (type) {
                case 'success':
                    return {
                        icon: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm4.59-12.42L10 14.17l-2.59-2.58L6 13l4 4 8-8z"></path>',
                        colorClass: 'text-positive'
                    };
                case 'error':
                    return {
                        icon: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"></path>',
                        colorClass: 'text-danger'
                    };
                case 'warning':
                    return {
                        icon: '<path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"></path>',
                        colorClass: 'text-warning'
                    };
                case 'info':
                default:
                    return {
                        icon: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"></path>',
                        colorClass: 'text-primary'
                    };
            }
        };

        const config = getTypeConfig(type);

        // Create notification element using native toast structure
        const notification = document.createElement('div');
        notification.className = 'flex items-center gap-10 min-w-288 max-w-500 shadow-lg w-min rounded-lg pl-16 pr-6 py-6 text-sm pointer-events-auto max-h-100 bg-paper text-main border mx-auto min-h-50';
        notification.setAttribute('role', 'alert');
        notification.setAttribute('aria-live', 'polite');
        notification.style.cssText = `
            opacity: 0;
            transform: translateY(-20px) scale(0.9) translateZ(0px);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        `;

        notification.innerHTML = `
            <svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="svg-icon ${config.colorClass} flex-shrink-0 icon-md" height="1em" width="1em">
                ${config.icon}
            </svg>
            <div class="overflow-hidden overflow-ellipsis w-max mr-auto" data-testid="toast-message">${message}</div>
            <button type="button" class="focus-visible:ring bg-transparent border-transparent hover:bg-hover disabled:text-disabled disabled:bg-transparent whitespace-nowrap inline-flex align-middle flex-shrink-0 items-center transition-button duration-200 select-none appearance-none no-underline outline-none disabled:pointer-events-none disabled:cursor-default rounded-button justify-center text-sm h-36 w-36 flex-shrink-0">
                <svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="svg-icon icon-sm" height="1em" width="1em">
                    <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"></path>
                </svg>
            </button>
        `;

        // Add close functionality
        const closeButton = notification.querySelector('button');
        closeButton.addEventListener('click', () => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-20px) scale(0.9) translateZ(0px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        });

        container.appendChild(notification);

        // Animate in
        requestAnimationFrame(() => {
            setTimeout(() => {
                notification.style.opacity = '1';
                notification.style.transform = 'translateY(0px) scale(1) translateZ(0px)';
            }, 10);
        });

        // Auto remove after appropriate time based on type
        const removeDelay = type === 'warning' ? 8000 : (type === 'error' ? 6000 : 4000);
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.opacity = '0';
                notification.style.transform = 'translateY(-20px) scale(0.9) translateZ(0px)';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, removeDelay);
    }

    // Expose notification function globally
    window.showNotification = showNotification;

    // Add duration field observer
    function observeDurationField() {
        const durationInput = document.querySelector('input[name="duration"]');
        if (durationInput && !durationInput.hasAttribute('data-duration-observed')) {
            durationInput.setAttribute('data-duration-observed', 'true');
            durationInput.addEventListener('change', debounce(() => {
                console.log("Duration field changed, submitting...");
                submitDuration();
            }, 500));
            console.log("Added duration field observer");
        }
    }

    // --- Custom Fields Fix ---
    // Only clear and re-inject if the container is truly missing
    function robustInitialize() {
        console.log("Starting robust initialization");
        
        // Initialize table observation on all pages
        observeTableChanges();
        
        if (isEditPage()) {
            console.log("Detected edit page");
            waitForElement('form').then(form => {
                if (!document.getElementById('custom-fields-container')) {
                    console.log("Injecting custom fields");
                    fetchExistingCustomData();
                } else {
                    // If fields exist, ensure they're properly marked as ready
                    isFieldsInjected = true;
                    fieldsReady = true;
                }
                // Attach form submission handler
                form.removeEventListener('submit', handleFormSubmission);
                form.addEventListener('submit', handleFormSubmission);
                // Inject Fingerprint Dashboard
                debouncedInjectFingerprintDashboard();
                // Observe duration field
                observeDurationField();
                // Set up observer only to re-inject if container is truly missing
                if (window.robustCustomFieldsObserver) window.robustCustomFieldsObserver.disconnect();
                window.robustCustomFieldsObserver = new MutationObserver(() => {
                    if (!document.getElementById('custom-fields-container')) {
                        console.log("Custom fields missing, reinjecting");
                        fetchExistingCustomData();
                    }
                    if (!document.getElementById('fingerprint-dashboard')) {
                        debouncedInjectFingerprintDashboard();
                    }
                    observeDurationField();
                });
                window.robustCustomFieldsObserver.observe(form, { childList: true, subtree: true });
            });
        } else if (isUploadPage()) {
            console.log("Detected upload page - setting up enhanced form observation");
            initializeUploadPage();
        } else if (isTrackPage()) {
            initTrackPage();
        }
    }

    function initCustomFields() {
        console.log("Initializing custom fields...");
        if (!isUploadPage() && !isEditPage()) return;
        
        // Clear any existing observer
        if (fieldsObserver) {
            fieldsObserver.disconnect();
            fieldsObserver = null;
        }
        
        // Wait for form to be available
        waitForElement('form').then(() => {
            console.log("Form found, fetching existing data");
            fetchExistingCustomData();
            
            const form = document.querySelector('form');
            if (form && isEditPage()) {
                console.log("On edit page, attaching form submission handler");
                form.removeEventListener('submit', handleFormSubmission);
                form.addEventListener('submit', handleFormSubmission);
                
                // Also attach to the submit button directly
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.addEventListener('click', (e) => {
                        console.log("Submit button clicked");
                        handleFormSubmission(e);
                    });
                                    // Style the save button using native patterns
                styleSaveButton(submitBtn);
                }

                // Inject Fingerprint Dashboard
                debouncedInjectFingerprintDashboard();
                // Observe duration field
                observeDurationField();
            }
            
            if (isUploadPage()) {
                console.log("Setting up confirmation page observer");
                observeConfirmationPage();
                observeDurationField();
            }
        }).catch(err => {
            console.error("Error initializing custom fields:", err);
        });
    }

    // Specialized initialization for upload page workflow
    function initializeUploadPage() {
        console.log("🔄 Initializing upload page with enhanced form detection");
        
        // Reset injection flags for upload page
        isFieldsInjected = false;
        fieldsReady = false;
        
        // Check if form already exists (edge case)
        const existingForm = document.querySelector('form');
        if (existingForm) {
            console.log("✅ Form already exists on upload page");
            handleUploadFormReady(existingForm);
        } else {
            console.log("⏳ No form yet - waiting for file upload to create form");
        }
        
        // Set up aggressive form observation for upload page
        if (window.uploadPageObserver) {
            window.uploadPageObserver.disconnect();
        }
        
        window.uploadPageObserver = new MutationObserver((mutations) => {
            // Look for form creation in any mutation
            for (let mutation of mutations) {
                for (let addedNode of mutation.addedNodes) {
                    if (addedNode.nodeType === Node.ELEMENT_NODE) {
                        // Check if the added node is a form or contains a form
                        let form = null;
                        if (addedNode.tagName === 'FORM') {
                            form = addedNode;
                        } else if (addedNode.querySelector) {
                            form = addedNode.querySelector('form');
                        }
                        
                        if (form && !document.getElementById('custom-fields-container')) {
                            console.log("🎯 FORM DETECTED! Injecting custom fields immediately");
                            handleUploadFormReady(form);
                            return; // Exit early once we find and handle the form
                        }
                    }
                }
            }
            
            // Fallback: check if form exists and fields are missing
            const currentForm = document.querySelector('form');
            if (currentForm && !document.getElementById('custom-fields-container') && !isFieldsInjected) {
                console.log("🔄 Form found via fallback check - injecting fields");
                handleUploadFormReady(currentForm);
            }
        });
        
        // Observe the entire document body with comprehensive settings
        window.uploadPageObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: false,
            attributeOldValue: false,
            characterData: false,
            characterDataOldValue: false
        });
        
        console.log("📡 Upload page observer active - watching for form creation");
        
        // Also set up periodic checks as ultimate fallback
        let uploadCheckInterval = setInterval(() => {
            const form = document.querySelector('form');
            if (form && !document.getElementById('custom-fields-container') && !isFieldsInjected) {
                console.log("⚡ Periodic check: Form found but fields missing - injecting now");
                handleUploadFormReady(form);
                clearInterval(uploadCheckInterval);
            }
            
            // Stop checking after 30 seconds to avoid infinite loops
            setTimeout(() => {
                clearInterval(uploadCheckInterval);
            }, 30000);
        }, 500); // Check every 500ms
    }
    
    // Handle form ready on upload page
    function handleUploadFormReady(form) {
        console.log("📋 Processing upload form for custom fields injection");
        
        // Ensure we don't double-inject
        if (isFieldsInjected || document.getElementById('custom-fields-container')) {
            console.log("⚠️ Fields already injected, skipping");
            return;
        }
        
        // Mark as injecting to prevent race conditions
        isFieldsInjected = true;
        
        try {
            // Inject custom fields immediately
            injectCustomFields();
            
            // Set up upload-specific listeners
            attachUploadListeners();
            observeConfirmationPage();
            observeDurationField();
            
            console.log("✅ Upload page custom fields injection completed successfully");
            
            // Set up specific observer for this form to handle any dynamic changes
            if (window.uploadFormObserver) {
                window.uploadFormObserver.disconnect();
            }
            
            window.uploadFormObserver = new MutationObserver(debounce(() => {
                // Re-inject if fields container gets removed
                if (!document.getElementById('custom-fields-container')) {
                    console.log("🔄 Custom fields container removed, re-injecting");
                    isFieldsInjected = false;
                    injectCustomFields();
                }
                observeDurationField();
            }, 300));
            
            window.uploadFormObserver.observe(form, {
                childList: true,
                subtree: true
            });
            
        } catch (error) {
            console.error("❌ Error during upload form processing:", error);
            // Reset flag so we can try again
            isFieldsInjected = false;
        }
    }

    // Modify observeFormChanges to be less aggressive and use native patterns
    function observeFormChanges() {
        if (fieldsObserver) {
            fieldsObserver.disconnect();
        }

        fieldsObserver = new MutationObserver(debounce(() => {
            const form = document.querySelector('form');
            if (form && !document.getElementById('custom-fields-container') && !isFieldsInjected) {
                initCustomFields();
            }
            // Also check for Fingerprint Dashboard
            if (isEditPage()) {
                if (!document.getElementById('fingerprint-dashboard')) {
                    debouncedInjectFingerprintDashboard();
                }
                observeDurationField();
            }
            if (isUploadPage()) {
                observeDurationField();
            }
        }, 300));

        fieldsObserver.observe(document.body, { childList: true, subtree: true });
    }

    function getInfoContainer() {
        // Try the specific selector first, then fall back to more generic ones
        return document.querySelector('.text-muted.mt-18.md\\:mt-26.text-sm.w-max.mx-auto.md\\:mx-0 .flex.items-center.gap-4.text-sm.text-muted') ||
               document.querySelector('.flex.items-center.gap-4.text-sm.text-muted') ||
               document.querySelector('.text-sm.text-muted .flex.items-center.gap-4');
    }

    function clearInjectedTrackData() {
        document.querySelectorAll('.custom-key, .custom-scale, .custom-bpm, .custom-exclusive, .custom-separator')
            .forEach(el => el.remove());
    }

    function createSeparator() {
        const sep = document.createElement('div');
        sep.className = 'custom-separator flex items-center';
        sep.style.cssText = `
            opacity: 0;
            transform: scale(0.8);
            transition: opacity 0.3s ease-out, transform 0.3s ease-out;
        `;
        sep.innerHTML = `
            <svg width="6" height="6" viewBox="0 0 24 24" fill="currentColor" class="text-gray-500">
                <circle cx="12" cy="12" r="8"/>
            </svg>
        `;
        
        // Trigger fade-in animation
        setTimeout(() => {
            requestAnimationFrame(() => {
                sep.style.opacity = '1';
                sep.style.transform = 'scale(1)';
            });
        }, 75); // Slightly delayed to appear after data elements
        
        return sep;
    }

    function createDataElement(cls, content) {
        const d = document.createElement('div');
        d.className = cls;
        d.style.cssText = `
            opacity: 0;
            transform: translateX(-5px);
            transition: opacity 0.3s ease-out, transform 0.3s ease-out;
        `;
        d.textContent = content;
        
        // Trigger fade-in animation
        setTimeout(() => {
            requestAnimationFrame(() => {
                d.style.opacity = '1';
                d.style.transform = 'translateX(0)';
            });
        }, 50);
        
        return d;
    }

    function injectTrackData(data) {
        // Add safety check for data parameter
        if (!data || typeof data !== 'object') {
            console.warn('[CustomFields] injectTrackData: Invalid data parameter', data);
            return;
        }
        
        const container = getInfoContainer();
        if (!container) return;
        
        // Check if data is already injected to prevent loops
        const existingCustom = container.querySelector('.custom-key, .custom-scale, .custom-bpm, .custom-exclusive');
        if (existingCustom && 
            container.querySelector('.custom-key')?.textContent === data.key_name &&
            container.querySelector('.custom-scale')?.textContent === data.scale &&
            container.querySelector('.custom-bpm')?.textContent === `${data.bpm} BPM`) {
            return; // Data already matches, don't re-inject
        }
        
        // Smooth fade-out existing data
        const existingElements = container.querySelectorAll('.custom-key, .custom-scale, .custom-bpm, .custom-exclusive, .custom-separator');
        if (existingElements.length > 0) {
            existingElements.forEach(el => {
                el.style.transition = 'opacity 0.2s ease-out, transform 0.2s ease-out';
                el.style.opacity = '0';
                el.style.transform = 'translateX(-5px)';
            });
            
            // Remove elements after fade-out
            setTimeout(() => {
                clearInjectedTrackData();
                injectNewTrackData(data, container);
            }, 200);
        } else {
            injectNewTrackData(data, container);
        }
    }
    
    function injectNewTrackData(data, container) {
        // Add safety check for data parameter
        if (!data || typeof data !== 'object') {
            console.warn('[CustomFields] injectNewTrackData: Invalid data parameter', data);
            return;
        }
        
        const elements = [];
        if (data.key_name) elements.push(createDataElement('custom-key', data.key_name));
        if (data.scale) elements.push(createDataElement('custom-scale', data.scale));
        if (data.bpm) elements.push(createDataElement('custom-bpm', `${data.bpm} BPM`));
        
        // Add exclusive licensing info if available
        if (data.licensing_type && data.licensing_type !== 'non_exclusive_only') {
            if (data.exclusive_price && data.exclusive_price > 0) {
                const priceText = `Exclusive: ${formatPrice(data.exclusive_price, data.exclusive_currency)}`;
                elements.push(createDataElement('custom-exclusive', priceText));
            } else if (data.exclusive_status === 'sold') {
                elements.push(createDataElement('custom-exclusive', 'Exclusively Sold'));
            }
        }
        
        if (elements.length === 0) return;
        
        const durationEl = Array.from(container.children).find(c => c.textContent.match(/\d+min/));
        const insertBefore = durationEl || container.lastChild;
        
        elements.forEach((el, i) => {
            if (i > 0) {
                const sep = createSeparator();
                container.insertBefore(sep, insertBefore);
            }
            container.insertBefore(el, insertBefore);
        });
        if (elements.length && durationEl && durationEl.previousElementSibling?.className !== 'custom-separator') {
            const sep = createSeparator();
            container.insertBefore(sep, durationEl);
        }
    }

    function fetchTrackData(trackId, attempt = 0) {
        const container = getInfoContainer();
        if (!container) {
            if (attempt < MAX_RETRIES_TRACK) {
                setTimeout(() => fetchTrackData(trackId, attempt + 1), RETRY_DELAY_TRACK);
            } else {
                console.error("Failed to locate track container after multiple attempts.");
            }
            return;
        }
        fetch(`${API_URL}?track_id=${trackId}`)
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success' && data.data && (data.data.key_name || data.data.scale || data.data.bpm)) {
                    debouncedInjectTrackData(data.data);
                } else {
                    clearInjectedTrackData();
                }
            })
            .catch(err => console.error("Error fetching track data:", err));
    }

    function handleTrackURLChange() {
        const path = window.location.pathname;
        if (path !== lastTrackPath) {
            if (isTrackPage()) {
                const m = path.match(/\/track\/(\d+)\//);
                if (m) {
                    fetchTrackData(m[1]);
                }
            } else {
                clearInjectedTrackData();
            }
        }
        lastTrackPath = path;
    }

    function initTrackPage() {
        if (isTrackPage()) {
            const m = window.location.pathname.match(/\/track\/(\d+)\//);
            if (m) {
                const trackId = m[1];
                fetchTrackData(trackId);
            }
        }
    }

    function observeTrackChanges() {
        if (trackObserver) trackObserver.disconnect();
        trackObserver = new MutationObserver(debounce(handleTrackURLChange, 300));
        trackObserver.observe(document.body, { childList: true, subtree: true });
        window.addEventListener("popstate", handleTrackURLChange);
        window.addEventListener("pushState", handleTrackURLChange);
    }

    // Legacy DOMContentLoaded handler - replaced by InitializationManager
    // Keeping for backward compatibility but delegating to new system
    document.addEventListener("DOMContentLoaded", () => {
        InitializationManager.init();
        window.processPendingCustomDataOnConfirmation = processPendingCustomDataOnConfirmation;
    });

    // Enhanced initialization - now handled by InitializationManager
    // Fallback initialization for immediate execution if DOM is already ready
    if (document.readyState !== 'loading') {
        InitializationManager.init();
    }
    
    // SPA Navigation handling - delegate to InitializationManager
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
        originalPushState.apply(history, args);
        InitializationManager._handleNavigation();
    };
    
    history.replaceState = function(...args) {
        originalReplaceState.apply(history, args);
        InitializationManager._handleNavigation();
    };
    
    window.addEventListener('popstate', () => InitializationManager._handleNavigation());
    window.addEventListener('pageshow', () => {
        if (isConfirmationPage()) processPendingCustomDataOnConfirmation();
    });

    // Expose main inits to global scope for late-injected script support
    window.robustInitialize = robustInitialize;
    window.initTrackPage = initTrackPage;
    window.observeTrackChanges = observeTrackChanges;
    // Fix: Only assign getArtistId if it is defined in this scope
    window.getArtistId = typeof getArtistId === 'function' ? getArtistId : undefined;
    // window.api = api; // REMOVE this line, already set after api definition
    
    // Expose upload page functions for debugging
    window.initializeUploadPage = initializeUploadPage;
    window.handleUploadFormReady = handleUploadFormReady;
    window.injectCustomFields = injectCustomFields;
    
    // Debug functions for upload page testing
    window.testUploadPageInjection = function() {
        console.log("🧪 TESTING UPLOAD PAGE INJECTION...");
        
        const form = document.querySelector('form');
        if (!form) {
            console.log("❌ No form found - cannot test injection");
            return false;
        }
        
        const nameField = document.querySelector('input[name="name"]');
        if (!nameField) {
            console.log("❌ No name field found - form may not be ready");
            return false;
        }
        
        const existingContainer = document.getElementById('custom-fields-container');
        if (existingContainer) {
            console.log("⚠️ Custom fields already exist - removing for fresh test");
            existingContainer.remove();
            isFieldsInjected = false;
            fieldsReady = false;
        }
        
        console.log("🚀 Starting fresh injection test...");
        try {
            injectCustomFields();
            console.log("✅ Test injection completed successfully");
            return true;
        } catch (error) {
            console.error("❌ Test injection failed:", error);
            return false;
        }
    };
    
    window.debugUploadPageState = function() {
        console.log("🔍 UPLOAD PAGE DEBUG STATE:");
        console.log("   - isUploadPage():", isUploadPage());
        console.log("   - isFieldsInjected:", isFieldsInjected);
        console.log("   - fieldsReady:", fieldsReady);
        console.log("   - Form exists:", !!document.querySelector('form'));
        console.log("   - Name field exists:", !!document.querySelector('input[name="name"]'));
        console.log("   - Custom container exists:", !!document.getElementById('custom-fields-container'));
        console.log("   - Upload observer active:", !!window.uploadPageObserver);
        console.log("   - Upload form observer active:", !!window.uploadFormObserver);
        console.log("   - Name field observer active:", !!window.customFieldsNameObserver);
        
        const form = document.querySelector('form');
        if (form) {
            console.log("   - Form element:", form);
            console.log("   - Form inputs:", form.querySelectorAll('input').length);
        }
        
        return {
            isUploadPage: isUploadPage(),
            isFieldsInjected,
            fieldsReady,
            hasForm: !!document.querySelector('form'),
            hasNameField: !!document.querySelector('input[name="name"]'),
            hasCustomContainer: !!document.getElementById('custom-fields-container'),
            uploadObserver: !!window.uploadPageObserver,
            uploadFormObserver: !!window.uploadFormObserver,
            nameFieldObserver: !!window.customFieldsNameObserver
        };
    };
    
    window.forceUploadPageReinit = function() {
        console.log("🔄 FORCING UPLOAD PAGE REINITIALIZATION...");
        
        // Clean up all observers
        if (window.uploadPageObserver) {
            window.uploadPageObserver.disconnect();
            window.uploadPageObserver = null;
        }
        if (window.uploadFormObserver) {
            window.uploadFormObserver.disconnect();
            window.uploadFormObserver = null;
        }
        if (window.customFieldsNameObserver) {
            window.customFieldsNameObserver.disconnect();
            window.customFieldsNameObserver = null;
        }
        
        // Reset state
        isFieldsInjected = false;
        fieldsReady = false;
        
        // Remove existing container if present
        const existingContainer = document.getElementById('custom-fields-container');
        if (existingContainer) {
            existingContainer.remove();
        }
        
        // Reinitialize
        if (isUploadPage()) {
            initializeUploadPage();
            console.log("✅ Upload page reinitialization completed");
        } else {
            console.log("⚠️ Not on upload page - cannot reinitialize upload functionality");
        }
    };

    // --- Table BPM Column Enhancement ---
    function extractTrackNameFromRow(row) {
        // Try multiple selectors to find track name
        // Desktop uses aria-colindex="2", mobile uses aria-colindex="1"
        const titleCell = row.querySelector('[aria-colindex="2"]') || row.querySelector('[aria-colindex="1"]');
        if (!titleCell) return null;
        
        // Look for track name in the title column - handle both desktop and mobile layouts
        let trackNameElement = null;
        
        // Desktop-specific selectors (aria-colindex="2")
        if (row.querySelector('[aria-colindex="2"]')) {
            trackNameElement = titleCell.querySelector('div.overflow-hidden.overflow-ellipsis:not(.text-xs):not(.text-muted)') ||
                              titleCell.querySelector('.max-md\\:text-\\[15px\\].max-md\\:leading-6.overflow-hidden.overflow-ellipsis');
        }
        
        // Mobile-specific selectors (aria-colindex="1") or fallback
        if (!trackNameElement) {
            try {
                trackNameElement = titleCell.querySelector('.max-md\\:text-\\[15px\\].max-md\\:leading-6.overflow-hidden.overflow-ellipsis') ||
                                  titleCell.querySelector('[class*="max-md:text-[15px]"][class*="overflow-hidden"][class*="overflow-ellipsis"]');
            } catch (e) {
                // Fallback if CSS selector has issues
                console.log("CSS selector error, using fallback");
            }
        }
        
        // Try more generic selectors
        if (!trackNameElement) {
            trackNameElement = titleCell.querySelector('.overflow-hidden.overflow-ellipsis:not(.text-xs)') ||
                              titleCell.querySelector('div.overflow-hidden.overflow-ellipsis:not([class*="text-xs"])') ||
                              titleCell.querySelector('div:not(.text-xs):not([class*="text-xs"])');
        }
        
        // Last resort: find the largest text element that's not subtitle/metadata
        if (!trackNameElement) {
            const allDivs = Array.from(titleCell.querySelectorAll('div'));
            trackNameElement = allDivs.find(div => {
                const text = div.textContent.trim();
                const hasSubtitleClass = div.classList.contains('text-xs') || div.className.includes('text-xs');
                return text.length > 0 && !hasSubtitleClass && text.length > 2;
            });
        }
        
        const trackName = trackNameElement ? trackNameElement.textContent.trim() : null;
        console.log("🎵 Extracted track name:", trackName, "from row:", row);
        return trackName;
    }

    async function fetchBPMByTrackName(trackName) {
        try {
            const response = await fetch(`${API_URL}?track_name=${encodeURIComponent(trackName)}`);
            const data = await response.json();
            
            if (data.status === 'success' && data.data && data.data.bpm) {
                return data.data.bpm;
            }
            return null;
        } catch (error) {
            console.error('Error fetching BPM for track:', trackName, error);
            return null;
        }
    }

    function createBPMColumnHeader() {
        const headerCell = document.createElement('div');
        headerCell.setAttribute('role', 'columnheader');
        headerCell.setAttribute('tabindex', '-1');
        headerCell.setAttribute('aria-colindex', '5');
        headerCell.className = 'flex items-center overflow-hidden whitespace-nowrap outline-none focus-visible:outline focus-visible:outline-offset-2 h-46 w-24 md:w-28 flex-shrink-0 justify-center text-muted font-medium text-xs';
        headerCell.innerHTML = '<span>BPM</span>';
        return headerCell;
    }

    function createBPMCell(bpm) {
        const cell = document.createElement('div');
        cell.setAttribute('tabindex', '-1');
        cell.setAttribute('role', 'gridcell');
        cell.setAttribute('aria-colindex', '5');
        cell.className = 'flex items-center overflow-hidden whitespace-nowrap outline-none focus-visible:outline focus-visible:outline-offset-2 h-46 w-24 md:w-28 flex-shrink-0 justify-center text-muted custom-bpm-cell';
        
        const wrapper = document.createElement('div');
        wrapper.className = 'w-full text-center font-medium';
        wrapper.style.cssText = `
            opacity: 0;
            transform: translateY(3px);
            transition: opacity 0.4s ease-out, transform 0.4s ease-out;
        `;
        wrapper.textContent = bpm || '-';
        
        cell.appendChild(wrapper);
        
        // Smooth fade-in animation
        requestAnimationFrame(() => {
            setTimeout(() => {
                wrapper.style.opacity = '1';
                wrapper.style.transform = 'translateY(0)';
            }, Math.random() * 200 + 50); // Staggered animation for multiple cells
        });
        
        return cell;
    }

    async function injectBPMColumn() {
        const tables = document.querySelectorAll('[role="grid"]');
        
        tables.forEach(async (table) => {
            // Skip if BPM column already exists
            if (table.querySelector('.custom-bpm-cell')) {
                return;
            }

            const headerRow = table.querySelector('[role="row"][aria-rowindex="1"]');
            const dataRows = table.querySelectorAll('[role="row"]:not([aria-rowindex="1"])');
            
            if (!headerRow || dataRows.length === 0) return;

            // STEP 1: Inject UI immediately with placeholders
            injectBPMColumnUI(table, headerRow, dataRows);
            
            // STEP 2: Fetch data and update cells progressively
            await updateBPMDataProgressively(dataRows);
        });
    }

    function injectBPMColumnUI(table, headerRow, dataRows) {
        // Add BPM header - insert before the options column (like button)
        // Look for the options column - it should have the three dots menu button (horizontal or vertical)
        const optionsHeader = headerRow.querySelector('[role="gridcell"] button svg[data-testid="MoreVertOutlinedIcon"]')?.closest('[role="gridcell"]') ||
                             headerRow.querySelector('[role="gridcell"] button svg[data-testid="MoreHorizOutlinedIcon"]')?.closest('[role="gridcell"]') ||
                             headerRow.querySelector('.w-36.md\\:w-84') ||
                             headerRow.querySelector('[aria-colindex="7"]') ||
                             headerRow.children[headerRow.children.length - 2]; // Second to last column (before duration)
        if (optionsHeader) {
            const bpmHeader = createBPMColumnHeader();
            headerRow.insertBefore(bpmHeader, optionsHeader);
            
            // Update column indices for subsequent columns
            const originalColIndex = optionsHeader.getAttribute('aria-colindex');
            if (originalColIndex) {
                optionsHeader.setAttribute('aria-colindex', parseInt(originalColIndex) + 1);
            }
            
            // Update table aria-colcount
            const currentColCount = parseInt(table.getAttribute('aria-colcount')) || 6;
            table.setAttribute('aria-colcount', currentColCount + 1);
        }

        // Add placeholder BPM cells to all rows instantly
        dataRows.forEach(row => {
            // Insert BPM cell before options cell (like button)
            // Look for the options cell with the three dots menu button (horizontal or vertical)
            const optionsCell = row.querySelector('[role="gridcell"] button svg[data-testid="MoreVertOutlinedIcon"]')?.closest('[role="gridcell"]') ||
                               row.querySelector('[role="gridcell"] button svg[data-testid="MoreHorizOutlinedIcon"]')?.closest('[role="gridcell"]') ||
                               row.querySelector('.w-36.md\\:w-84') ||
                               row.querySelector('[aria-colindex="7"]') ||
                               row.children[row.children.length - 2]; // Second to last column (before duration)
            if (optionsCell) {
                const bpmCell = createBPMCell('⋯'); // Loading placeholder
                row.insertBefore(bpmCell, optionsCell);
                
                // Update column indices for subsequent columns
                const originalColIndex = optionsCell.getAttribute('aria-colindex');
                if (originalColIndex) {
                    optionsCell.setAttribute('aria-colindex', parseInt(originalColIndex) + 1);
                }
            }
        });
    }

    async function updateBPMDataProgressively(dataRows) {
        // Validate input
        if (!dataRows || !dataRows.length) {
            console.warn('No data rows provided for BPM update');
            return;
        }
        
        // Convert to array if it's a NodeList
        const rowsArray = Array.isArray(dataRows) ? dataRows : Array.from(dataRows);
        
        // Process rows in batches to avoid overwhelming the server
        const batchSize = 3;
        
        try {
            for (let i = 0; i < rowsArray.length; i += batchSize) {
                const batch = rowsArray.slice(i, i + batchSize);
                
                // Process batch concurrently with error handling
                await Promise.allSettled(batch.map(async (row) => {
                    try {
                        const trackName = extractTrackNameFromRow(row);
                        let bpm = null;
                        
                        if (trackName) {
                            bpm = await fetchBPMByTrackName(trackName);
                        }
                        
                        // Update the BPM cell
                        const bpmCell = row.querySelector('.custom-bpm-cell');
                        if (bpmCell) {
                            const wrapper = bpmCell.querySelector('div');
                            if (wrapper) {
                                // Smooth fade out current content
                                wrapper.style.transition = 'opacity 0.2s ease-out, transform 0.2s ease-out';
                                wrapper.style.opacity = '0';
                                wrapper.style.transform = 'translateY(-2px)';
                                
                                // Update content after fade out
                                setTimeout(() => {
                                    wrapper.textContent = bpm || '-';
                                    // Smooth fade in new content
                                    wrapper.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
                                    wrapper.style.opacity = '1';
                                    wrapper.style.transform = 'translateY(0)';
                                }, 200);
                            }
                        }
                    } catch (error) {
                        console.warn('Error updating BPM for row:', error);
                    }
                }));
                
                // Small delay between batches to prevent overwhelming
                if (i + batchSize < rowsArray.length) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
        } catch (error) {
            console.error('Error in BPM data progressive update:', error);
        }
    }

    function observeTableChanges() {
        const tableObserver = new MutationObserver(debounce(() => {
            const tables = document.querySelectorAll('[role="grid"]');
            if (tables.length > 0) {
                debouncedInjectBPMColumn();
            }
        }, 500));

        tableObserver.observe(document.body, { 
            childList: true, 
            subtree: true,
            attributes: true,
            attributeFilter: ['aria-rowcount']
        });

        // Also check for existing tables
        setTimeout(() => {
            debouncedInjectBPMColumn();
        }, 1000);
    }

    // --- End Table BPM Column Enhancement ---

    // Expose table functions globally for debugging
    window.injectBPMColumn = injectBPMColumn;
    window.fetchBPMByTrackName = fetchBPMByTrackName;
    
    // Expose fingerprinting functions globally
    window.generateFingerprint = generateFingerprint;
    window.submitFingerprint = submitFingerprint;
    window.observePlaybackURLChanges = observePlaybackURLChanges;
    window.showFingerprintGuidance = showFingerprintGuidance;
    window.removeFingerprintGuidance = removeFingerprintGuidance;
    window.renderFingerprintFailureState = renderFingerprintFailureState;
    
    // Expose fingerprint deletion function for testing
    window.deleteFingerprintFromDatabase = deleteFingerprintFromDatabase;
    
    // Quick access to testing functions
    window.quickTestDuplicate = () => simulateDuplicateDetection(true, false);  // Show duplicate violation
    window.quickTestAuthentic = () => simulateDuplicateDetection(true, true);   // Show authentic with duplicates
    window.quickTestUnique = () => simulateDuplicateDetection(false, false);    // Show unique track
    window.quickTestFailure = () => testFingerprintFailureUI();                 // Show fingerprint failure state
    
    // Test fingerprint failure UI
    window.testFingerprintFailureUI = function() {
        console.log("🧪 TESTING FINGERPRINT FAILURE UI...");
        
        const mockSubmitData = {
            tosViolation: true,
            isDuplicate: true,
            isAuthentic: false,
            duplicateCount: 0,
            duplicateInfo: {
                original_track: {
                    track_name: "Fire Beat - Hard Trap Type Beat 2024",
                    created_at: "2024-01-15T10:30:00Z",
                    producer: "BeatMaker_Pro",
                    track_id: "98765"
                }
            },
            message: "Fingerprinting failed - Terms of Service violation (duplicate content)"
        };
        
        const content = document.getElementById('dashboard-content');
        if (content) {
            renderFingerprintFailureState(content, mockSubmitData);
            console.log("✅ Failure state UI rendered with mock data");
            console.log("🔗 Test link should point to: https://open.beatpass.ca/track/98765/preview");
        } else {
            console.log("❌ Dashboard content not found");
        }
        
        return mockSubmitData;
    };

    // Test fingerprint deletion
    window.testFingerprintDeletion = async function(track_id) {
        if (!track_id) {
            track_id = getTrackId();
            if (!track_id) {
                console.log("❌ No track ID provided or found");
                return;
            }
        }
        
        console.log("🧪 TESTING FINGERPRINT DELETION for track:", track_id);
        try {
            const result = await deleteFingerprintFromDatabase(track_id);
            console.log("✅ Deletion test completed:", result);
            return result;
        } catch (error) {
            console.error("❌ Deletion test failed:", error);
            return null;
        }
    };
    
    // Expose dashboard functions globally for debugging
    window.injectFingerprintDashboard = injectFingerprintDashboard;
    window.updateDashboardContent = updateDashboardContent;
    window.removeFingerprintDashboard = removeFingerprintDashboard;
    window.getMetadataCompleteness = getMetadataCompleteness;
    
    // ==============================================
    // DUPLICATE DETECTION TESTING FUNCTIONS
    // ==============================================
    // ✅ IMPROVEMENTS MADE:
    // • Orange color scheme for duplicate warnings (not harsh red)
    // • SVG icons replace emojis with proper alignment
    // • Original track details display correctly
    // • Fingerprint deletion for ToS violations
    // • Clear Sample-Safe™ platform guarantee messaging
    // • Comprehensive ToS violation explanations
    // ==============================================
    // Usage Examples:
    // 1. Test current track: testCurrentTrack()
    // 2. Test specific track: testDuplicateDetection(track_id)
    // 3. Quick simulate ToS violation: quickTestDuplicate()
    // 4. Quick simulate authentic with duplicates: quickTestAuthentic()
    // 5. Quick simulate unique track: quickTestUnique()
    // 6. Test fingerprint deletion: testFingerprintDeletion(track_id)
    // 7. Manual simulate: simulateDuplicateDetection(isDuplicate, isAuthentic)
    // ==============================================
    
    window.testDuplicateDetection = async function(track_id) {
        console.log("🧪 TESTING DUPLICATE DETECTION for track:", track_id);
        const statusInfo = await checkPlaybackURLStatus(track_id);
        console.log("📊 Status Info:", statusInfo);
        
        if (statusInfo.hasFingerprint && statusInfo.fingerprint) {
            console.log("🔍 Testing fingerprint duplicate check...");
            try {
                const duplicateCheck = await fetch(`key_bpm_handler.php?check_fingerprint=${encodeURIComponent(statusInfo.fingerprint)}&track_id=${track_id}`);
                const duplicateData = await duplicateCheck.json();
                console.log("📋 Duplicate Check Results:", duplicateData);
                
                if (duplicateData.is_duplicate) {
                    console.log("🎯 DUPLICATE DETECTED!");
                    console.log("   - Is Authentic:", duplicateData.is_authentic);
                    console.log("   - Duplicate Info:", duplicateData.duplicate_info);
                } else {
                    console.log("✅ NO DUPLICATES FOUND - Track is unique");
                }
                
                return duplicateData;
            } catch (error) {
                console.error("❌ Error testing duplicate detection:", error);
                return null;
            }
        } else {
            console.log("⚠️ No fingerprint available for testing");
            return null;
        }
    };
    
    // Quick test current track
    window.testCurrentTrack = function() {
        const track_id = getTrackId();
        if (track_id) {
            return window.testDuplicateDetection(track_id);
        } else {
            console.log("❌ No track ID found");
            return null;
        }
    };
    
    // Simulate duplicate detection for UI testing
    window.simulateDuplicateDetection = function(isDuplicate = true, isAuthentic = false) {
        console.log("🧪 SIMULATING DUPLICATE DETECTION UI...");
        
        // Create realistic duplicate info structure with multiple possible formats
        let duplicateInfo = null;
        if (isDuplicate && !isAuthentic) {
            duplicateInfo = {
                // Try format 1: original_track structure
                original_track: {
                    track_name: "Original Fire Trap Beat 2024",
                    created_at: "2024-01-15T10:30:00Z", 
                    producer: "BeatMaker_Pro",
                    track_id: "12345"
                },
                // Also include possible alternative structures
                exact_matches: [{
                    track_name: "Original Fire Trap Beat 2024",
                    created_at: "2024-01-15T10:30:00Z",
                    producer: "BeatMaker_Pro", 
                    track_id: "12345"
                }],
                match_percentage: 98.5,
                match_type: "exact"
            };
        }
        
        const mockStatusInfo = {
            status: isDuplicate && !isAuthentic ? 'violation' : 'protected',
            hasFingerprint: !isDuplicate || isAuthentic, // No fingerprint stored for duplicates
            playbackUrl: 'https://example.com/test.mp3',
            fingerprint: (!isDuplicate || isAuthentic) ? 'mock_fingerprint_data_for_testing_this_is_a_very_long_fingerprint_string_that_represents_the_audio_signature_data_generated_by_the_acoustic_analysis_algorithm' : '',
            fingerprint_hash: (!isDuplicate || isAuthentic) ? 'fd45fb808756605eccb80fa98453b4cf' : '',
            isDuplicate: isDuplicate,
            isAuthentic: isAuthentic,
            duplicateCount: isDuplicate ? (isAuthentic ? 2 : 0) : 0,
            duplicateInfo: duplicateInfo
        };
        
        const content = document.getElementById('dashboard-content');
        if (content) {
            renderFingerprintedState(content, mockStatusInfo, 'https://example.com/test.mp3');
            console.log("✅ UI updated with simulated duplicate detection");
            console.log("📊 Mock data used:", mockStatusInfo);
            console.log("🔍 Duplicate info structure:", duplicateInfo);
        } else {
            console.log("❌ Dashboard content not found");
        }
        
        return mockStatusInfo;
    };

    // --- Enhanced BeatPassID Dashboard ---
    function createFingerprintDashboard() {
        // Remove any existing dashboard
        removeFingerprintDashboard();
        
        const dashboard = document.createElement('div');
        dashboard.id = 'fingerprint-dashboard';
        dashboard.className = 'mb-24 text-sm';
        
        // Create main container with enhanced styling
        const mainCard = document.createElement('div');
        mainCard.className = 'isolate relative';
        
        const innerCard = document.createElement('div');
        innerCard.className = 'block relative w-full bg-transparent rounded-input border-divider border shadow-sm overflow-hidden';
        innerCard.style.cssText = `
            background: linear-gradient(135deg, rgba(37, 37, 37, 0.8) 0%, rgba(25, 25, 25, 0.9) 100%);
            backdrop-filter: blur(15px);
            border-color: rgba(255, 255, 255, 0.15);
            position: relative;
        `;
        
        // Add mobile-responsive class
        innerCard.classList.add('beatpass-id-mobile-responsive');
        
        // Subtle background pattern
        const bgPattern = document.createElement('div');
        bgPattern.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            opacity: 0.02;
            background-image: radial-gradient(circle at 25% 25%, #10b981 0%, transparent 50%),
                              radial-gradient(circle at 75% 75%, #3b82f6 0%, transparent 50%);
            pointer-events: none;
        `;
        innerCard.appendChild(bgPattern);
        
        // Enhanced header
        const header = document.createElement('div');
        header.className = 'relative z-10 p-18 border-b border-white/10';
        
        const headerTop = document.createElement('div');
        headerTop.className = 'flex items-center justify-between mb-12';
        
        const headerLeft = document.createElement('div');
        headerLeft.className = 'flex items-center gap-12';
        
        // Enhanced icon with subtle animation
        const iconContainer = document.createElement('div');
        iconContainer.className = 'relative flex items-center justify-center';
        iconContainer.style.cssText = `
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            border-radius: 10px;
            box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);
            border: 1px solid rgba(16, 185, 129, 0.4);
        `;
        
        iconContainer.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1M10 17L6 13L7.41 11.59L10 14.17L16.59 7.58L18 9L10 17Z"/>
            </svg>
        `;
        
        const titleContainer = document.createElement('div');
        
        const title = document.createElement('h3');
        title.className = 'font-bold text-base text-white mb-1';
        title.textContent = 'BeatPassID Protection';
        
        const subtitle = document.createElement('p');
        subtitle.className = 'text-sm text-white/80';
        subtitle.textContent = 'Acoustic fingerprinting & Sample-Safe™ warranty';
        
        titleContainer.appendChild(title);
        titleContainer.appendChild(subtitle);
        
        headerLeft.appendChild(iconContainer);
        headerLeft.appendChild(titleContainer);
        
        // Enhanced Sample-Safe™ seal
        const sampleSafeSeal = document.createElement('div');
        sampleSafeSeal.className = 'flex items-center gap-8 px-10 py-6 rounded-full';
        sampleSafeSeal.style.cssText = `
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.08) 100%);
            border: 1px solid rgba(16, 185, 129, 0.3);
        `;
        
        sampleSafeSeal.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#10b981">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <span class="text-xs font-medium text-green-400">Sample-Safe™</span>
        `;
        
        headerTop.appendChild(headerLeft);
        headerTop.appendChild(sampleSafeSeal);
        
        // Educational tagline
        const tagline = document.createElement('p');
        tagline.className = 'text-xs text-white/70 leading-relaxed';
        tagline.textContent = 'Creates unchangeable digital DNA for your track. Producers warrant all samples are cleared for commercial use.';
        
        header.appendChild(headerTop);
        header.appendChild(tagline);
        
        // Content area - will be populated based on status
        const content = document.createElement('div');
        content.id = 'dashboard-content';
        content.className = 'relative z-10 p-16';
        
        innerCard.appendChild(header);
        innerCard.appendChild(content);
        mainCard.appendChild(innerCard);
        dashboard.appendChild(mainCard);
        
        // Add enhanced animations
        if (!document.getElementById('fingerprint-animations')) {
            const style = document.createElement('style');
            style.id = 'fingerprint-animations';
            style.textContent = `
                @keyframes pulse-ring {
                    0% { transform: scale(1); opacity: 1; }
                    100% { transform: scale(1.3); opacity: 0; }
                }
                
                @keyframes slideInUp {
                    from { opacity: 0; transform: translateY(15px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                @keyframes bp-spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes stepGlow {
                    0%, 100% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.3); }
                    50% { box-shadow: 0 0 15px rgba(59, 130, 246, 0.5); }
                }
                
                @keyframes gentlePulse {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.01); opacity: 0.95; }
                }
                
                @keyframes gentleFloat {
                    0%, 100% { transform: translateX(-2px); }
                    50% { transform: translateX(2px); }
                }
                
                .fingerprint-processing {
                    animation: fadeIn 0.3s ease-out;
                }
            `;
            document.head.appendChild(style);
        }
        
        return dashboard;
    }

    // ---------------------------
    // Producer and Tags Data Extraction
    // ---------------------------
    function getProducers() {
        const artistsInput = document.querySelector('input[name="artists"]');
        if (!artistsInput) return '';
        
        const container = artistsInput.closest('[role="group"]');
        if (!container) return '';
        
        // Find all producer chips
        const producerChips = container.querySelectorAll('.bg-chip');
        const producers = Array.from(producerChips).map(chip => {
            // Get the text content, excluding the button
            const button = chip.querySelector('button');
            let text = chip.textContent || chip.innerText || '';
            
            if (button) {
                const buttonText = button.textContent || button.innerText || '';
                text = text.replace(buttonText, '').trim();
            }
            
            return text.trim();
        }).filter(name => name.length > 0);
        
        console.log("🎤 getProducers() found:", producers);
        return producers.join(', ');
    }

    function getTags() {
        const tagsInput = document.querySelector('input[name="tags"]');
        if (!tagsInput) return '';
        
        const container = tagsInput.closest('[role="group"]');
        if (!container) return '';
        
        // Find all tag chips
        const tagChips = container.querySelectorAll('.bg-chip');
        const tags = Array.from(tagChips).map(chip => {
            // Get the text content, excluding the button
            const button = chip.querySelector('button');
            let text = chip.textContent || chip.innerText || '';
            
            if (button) {
                const buttonText = button.textContent || button.innerText || '';
                text = text.replace(buttonText, '').trim();
            }
            
            return text.trim();
        }).filter(tag => tag.length > 0);
        
        console.log("🏷️ getTags() found:", tags);
        return tags.join(', ');
    }

    // ---------------------------
    // Tags Restoration for Edit Pages
    // ---------------------------
    function createTagChip(tagName) {
        const chip = document.createElement('div');
        chip.tabIndex = 0;
        chip.className = 'relative flex flex-shrink-0 items-center justify-center gap-10 overflow-hidden whitespace-nowrap outline-none after:pointer-events-none after:absolute after:inset-0 cursor-pointer rounded-full bg-chip text-main pl-12 h-32 text-sm hover:after:bg-black/5 focus:after:bg-black/10';
        
        chip.innerHTML = `
            ${tagName}
            <button type="button" class="focus-visible:ring whitespace-nowrap inline-flex select-none appearance-none no-underline outline-none disabled:pointer-events-none disabled:cursor-default justify-center text-black/30 dark:text-white/50 mr-6 w-22 h-22" tabindex="-1">
                <svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" data-testid="Icon" class="svg-icon block icon-md" height="100%" width="100%">
                    <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"></path>
                </svg>
            </button>
        `;
        
        // Add remove functionality
        const removeButton = chip.querySelector('button');
        removeButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            chip.remove();
            updatePendingCustomData();
            if (isEditPage()) {
                setTimeout(() => updateDashboardContent(), 100);
            }
        });
        
        return chip;
    }

    function restoreTagsOnEditPage(existingData) {
        if (!isEditPage() || !existingData || !existingData.tags) return;
        
        const tagsInput = document.querySelector('input[name="tags"]');
        if (!tagsInput) {
            console.log("🏷️ Tags input not found, will retry later");
            return;
        }
        
        const container = tagsInput.closest('[role="group"]');
        if (!container) {
            console.log("🏷️ Tags container not found");
            return;
        }
        
        const chipsContainer = container.querySelector('.flex.flex-wrap.items-center.gap-8');
        if (!chipsContainer) {
            console.log("🏷️ Tags chips container not found");
            return;
        }
        
        // Check if tags are already restored
        if (chipsContainer.querySelector('.bg-chip')) {
            console.log("🏷️ Tags already restored, skipping");
            return;
        }
        
        const tags = existingData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        if (tags.length === 0) return;
        
        console.log("🏷️ Restoring tags:", tags);
        
        // Create and insert tag chips
        tags.forEach(tagName => {
            const chip = createTagChip(tagName);
            chipsContainer.appendChild(chip);
        });
        
        console.log("✅ Tags restored successfully");
    }

    // ---------------------------
    // Updated Data Management Functions
    // ---------------------------
    function updatePendingCustomData() {
        if (!isUploadPage()) return;
        
        const keyName = document.getElementById('key_name')?.value.trim() || '';
        const scale = document.getElementById('scale')?.value.trim() || '';
        const bpm = document.getElementById('bpm')?.value.trim() || '';
        const trackName = getTrackName();
        const duration = getDuration();
        const producers = getProducers();
        const tags = getTags();
        
        // NEW: Get exclusive licensing data
        const { licensing_type, exclusive_price, exclusive_currency, exclusive_status, exclusive_buyer_info } = getExclusiveLicensingData();
        
        console.log("📋 Updating pending custom data:", {
            keyName,
            scale,
            bpm,
            trackName,
            duration,
            producers,
            tags,
            licensing_type,
            exclusive_price,
            exclusive_currency,
            exclusive_status,
            exclusive_buyer_info
        });
        
        // Store data even if not all fields are complete (track name is essential)
        if (keyName || scale || bpm || trackName || producers || tags || licensing_type !== 'non_exclusive_only') {
            const pending = { 
                key_name: keyName, 
                scale, 
                bpm, 
                track_name: trackName || '', 
                duration_ms: duration,
                producers,
                tags,
                licensing_type,
                exclusive_price: licensing_type !== 'non_exclusive_only' ? exclusive_price : '',
                exclusive_currency,
                exclusive_status: licensing_type === 'non_exclusive_only' ? 'not_available' : exclusive_status,
                exclusive_buyer_info
            };
            localStorage.setItem('pendingCustomData', JSON.stringify(pending));
            console.log("💾 Saved pending custom data to localStorage");
        } else {
            console.warn("⚠️ No data to save - all fields empty");
        }
    }

    async function fetchExistingCustomData() {
        clearCustomFields();
        const trackId = getTrackId();
        const trackName = getTrackName();
        let params;
        if (trackId) {
            params = new URLSearchParams({ track_id: trackId });
        } else if (trackName) {
            params = new URLSearchParams({ track_name: trackName });
        } else {
            injectCustomFields();
            return;
        }
        try {
            const res = await fetch(`${API_URL}?${params}`);
            const data = await res.json();
            if (data.status === 'success' && data.data) {
                window.customRecord = data.data;
                // Pass the complete data including exclusive licensing fields
                injectCustomFields({
                    ...data.data,
                    licensing_type: data.data.licensing_type || 'non_exclusive_only',
                    exclusive_price: data.data.exclusive_price || '',
                    exclusive_currency: data.data.exclusive_currency || 'USD',
                    exclusive_status: data.data.exclusive_status || 'not_available',
                    exclusive_buyer_info: data.data.exclusive_buyer_info || ''
                });
                
                // Restore tags on edit page (but not producers as per user request)
                if (isEditPage()) {
                    // Wait a bit for the form to be fully rendered
                    setTimeout(() => {
                        restoreTagsOnEditPage(data.data);
                    }, 500);
                    
                    // Also set up an observer in case the form loads later
                    const tagsObserver = new MutationObserver(debounce(() => {
                        const tagsInput = document.querySelector('input[name="tags"]');
                        if (tagsInput && !document.querySelector('input[name="tags"]').closest('[role="group"]').querySelector('.bg-chip')) {
                            restoreTagsOnEditPage(data.data);
                            tagsObserver.disconnect();
                        }
                    }, 300));
                    
                    tagsObserver.observe(document.body, { childList: true, subtree: true });
                    
                    // Clean up observer after 10 seconds
                    setTimeout(() => {
                        tagsObserver.disconnect();
                    }, 10000);
                }
            } else {
                window.customRecord = null;
                injectCustomFields();
            }
        } catch (err) {
            console.error("Error fetching custom data:", err);
            window.customRecord = null;
            injectCustomFields();
        }
    }

    async function submitCustomData(pendingData) {
        let key_name, scale, bpm, track_name, track_id, playback_url, duration_ms, producers, tags, licensing_type, exclusive_price, exclusive_currency, exclusive_status, exclusive_buyer_info;
        if (pendingData) {
            ({ key_name, scale, bpm, track_name, track_id, playback_url, duration_ms, producers, tags, licensing_type, exclusive_price, exclusive_currency, exclusive_status, exclusive_buyer_info } = pendingData);
            console.log("📋 Using pending data for submission:", pendingData);
        } else {
            key_name = document.getElementById('key_name')?.value.trim() || '';
            scale = document.getElementById('scale')?.value.trim() || '';
            bpm = document.getElementById('bpm')?.value.trim() || '';
            track_name = getTrackName();
            duration_ms = getDuration();
            producers = getProducers();
            tags = getTags();
            
            // Get playback URL from the input field if we're on the edit page
            if (isEditPage()) {
                const playbackInput = document.querySelector('input[name="src"]');
                if (playbackInput) {
                    playback_url = playbackInput.value.trim();
                    console.log("Found playback URL input field");
                } else {
                    console.log("Playback URL input not found");
                }
            }
            
            // NEW: Get exclusive licensing data
            const { licensing_type: licensing_type_input, exclusive_price: exclusive_price_input, exclusive_currency: exclusive_currency_input, exclusive_status: exclusive_status_input, exclusive_buyer_info: exclusive_buyer_info_input } = getExclusiveLicensingData();
            licensing_type = licensing_type_input;
            exclusive_price = exclusive_price_input;
            exclusive_currency = exclusive_currency_input;
            exclusive_status = exclusive_status_input;
            exclusive_buyer_info = exclusive_buyer_info_input;
            
            console.log("📋 Using form data for submission:", {
                key_name, scale, bpm, track_name, track_id, playback_url, duration_ms, producers, tags, licensing_type, exclusive_price, exclusive_currency, exclusive_status, exclusive_buyer_info
            });
        }

        // Enhanced validation with track name requirement
        if (!track_id) {
            console.warn("❌ Cannot submit custom data: missing track_id");
            return false;
        }

        if (!track_name || track_name.trim() === '') {
            console.warn("⚠️ Track name is missing - this may cause database issues");
        }
        
        // Check if we have at least some metadata to submit
        if (!key_name && !scale && !bpm && !track_name && !playback_url && !producers && !tags && licensing_type === 'non_exclusive_only') {
            console.warn("❌ No metadata to submit - all fields empty");
            return false;
        }

        // Ensure track_name is included in payload (required for database consistency)
        const payload = { 
            key_name: key_name || '', 
            scale: scale || '', 
            bpm: bpm || '', 
            track_name: track_name || '', 
            track_id,
            producers: producers || '',
            tags: tags || '',
            licensing_type,
            exclusive_price: licensing_type !== 'non_exclusive_only' ? exclusive_price : '',
            exclusive_currency,
            exclusive_status: licensing_type === 'non_exclusive_only' ? 'not_available' : exclusive_status,
            exclusive_buyer_info
        };
        
        if (playback_url) {
            payload.playback_url = playback_url;
            console.log("Adding playback URL to payload");
        }
        if (duration_ms !== null && duration_ms !== undefined) {
            payload.duration_ms = duration_ms;
            console.log("Adding duration to payload:", duration_ms);
        }
        
        console.log("📤 Final payload for submission:", payload);

        try {
            const res = await fetch('key_bpm_handler.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams(payload)
            });
            const data = await res.json();
            localStorage.removeItem('pendingCustomData');
        } catch (err) {
            console.error("Error submitting custom data:", err);
        }
    }

    async function processPendingCustomDataOnConfirmation() {
        // Only run if pending data exists
        const pending = localStorage.getItem('pendingCustomData');
        if (!pending) return;

        let retries = 0;
        const maxRetries = 10;
        const retryDelay = 1000;

        while (retries < maxRetries) {
            // Use a robust selector for the confirmation element
            // Try to find the confirmation link
            const confirmationContainer = document.querySelector('.flex.items-center.gap-28.border.rounded.bg-paper');
            let trackId = null;
            let trackName = null;

            if (confirmationContainer) {
                // Try to extract track ID from the link
                const link = confirmationContainer.querySelector('a[href^="/track/"]');
                if (link) {
                    const m = link.getAttribute('href').match(/\/track\/(\d+)\//);
                    if (m) trackId = parseInt(m[1], 10);
                }
                
                // Fallback: try the readonly input for track ID
                if (!trackId) {
                    const input = confirmationContainer.querySelector('input[readonly][value*="/track/"]');
                    if (input) {
                        const m = input.value.match(/\/track\/(\d+)\//);
                        if (m) trackId = parseInt(m[1], 10);
                    }
                }
                
                // Extract track name from the correct element (div with class "text-base font-bold")
                const trackNameElement = confirmationContainer.querySelector('.text-base.font-bold');
                if (trackNameElement) {
                    trackName = trackNameElement.textContent.trim();
                    console.log("✅ Found track name from title element:", trackName);
                }
                
                // Fallback: extract track name from URL if title element not found
                if (!trackName && link) {
                    const href = link.getAttribute('href');
                    const urlParts = href.split('/');
                    const urlTrackName = urlParts[urlParts.length - 1] || '';
                    if (urlTrackName) {
                        // Decode URL-encoded track name and convert dashes to spaces
                        trackName = decodeURIComponent(urlTrackName.replace(/-/g, ' '));
                        console.log("🔄 Extracted track name from URL:", trackName);
                    }
                }
                
                // Final fallback: get track name from pending data
                if (!trackName) {
                    const customData = JSON.parse(pending);
                    trackName = customData.track_name || '';
                    console.log("⚠️ Using track name from pending data:", trackName);
                }
            }

            if (trackId) {
                console.log("✅ Found track ID for confirmation:", trackId, "with name:", trackName);
                
                // Submit the metadata with confirmed track name
                const customData = JSON.parse(pending);
                customData.track_id = trackId;
                
                // Ensure track name is included and log the source
                if (trackName && trackName.trim()) {
                    const previousTrackName = customData.track_name || 'none';
                    customData.track_name = trackName.trim();
                    console.log(`📝 Track name updated: "${previousTrackName}" → "${customData.track_name}"`);
                } else {
                    console.warn("⚠️ No track name found during confirmation, keeping original:", customData.track_name);
                }
                
                console.log("📤 Final confirmation payload:", customData);
                await submitCustomData(customData);
                localStorage.removeItem('pendingCustomData');
                return;
            }

            // Wait and retry
            retries++;
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }

        console.error("Failed to submit custom data after maximum retries");
    }

    async function handleFormSubmission(e) {
        console.log("Form submission handler called");
        
        if (isUploadPage()) {
            console.log("On upload page, skipping custom submission");
            return;
        }
        
        // Check if this is a fingerprinting operation - completely block form submission
        const isDashboardFingerprintingActive = document.querySelector('#dashboard-content .fingerprint-processing') || 
                                              document.querySelector('#dashboard-content .text-purple-400') ||
                                              document.querySelector('.fingerprint-processing');
        
        // Also check if user just clicked a fingerprint button
        const fingerprintButtonClicked = window.fingerprintOperationInProgress || false;
        
        if (isDashboardFingerprintingActive || fingerprintButtonClicked) {
            console.log("Fingerprinting in progress, completely blocking form submission");
            e.preventDefault();
            e.stopPropagation();
            return false; // Completely block form submission during fingerprinting
        }
        
        e.preventDefault();
        console.log("Prevented default form submission");
        
        if (!fieldsReady) {
            console.log("Fields not ready, skipping submission");
            return;
        }
        
        if (isEditPage()) {
            console.log("On edit page, submitting custom data");
            
            // Get all form data including new fields
            const key_name = document.getElementById('key_name')?.value.trim() || '';
            const scale = document.getElementById('scale')?.value.trim() || '';
            const bpm = document.getElementById('bpm')?.value.trim() || '';
            const track_name = getTrackName();
            const track_id = getTrackId();
            const duration_ms = getDuration();
            const producers = getProducers();
            const tags = getTags();
            
            // Get playback URL - try multiple selectors
            const playbackInput = document.querySelector('input[name="src"]') || 
                                document.querySelector('input[type="text"][name="src"]') ||
                                document.querySelector('input[type="url"][name="src"]');
            const playback_url = playbackInput?.value.trim() || '';
            
            // NEW: Get exclusive licensing data
            const { licensing_type, exclusive_price, exclusive_currency, exclusive_status, exclusive_buyer_info } = getExclusiveLicensingData();
            
            console.log("Form data collected, submitting...");
            
            // Submit the data with new fields
            const success = await submitCustomData({
                key_name,
                scale,
                bpm,
                track_name,
                track_id,
                playback_url,
                duration_ms,
                producers,
                tags,
                licensing_type,
                exclusive_price,
                exclusive_currency,
                exclusive_status,
                exclusive_buyer_info
            });
            
            console.log("Custom data submission result:", success);
            
            // Only redirect if user explicitly saved without fingerprinting
            const saveButton = document.querySelector('button[type="submit"]');
            if (saveButton && saveButton.textContent.toLowerCase().includes('save')) {
                if (track_id) {
                    console.log("Redirecting to track page:", track_id);
                    window.location.href = `/track/${track_id}/${track_name.replace(/\s+/g, '-').toLowerCase()}`;
                }
            } else {
                console.log("Not redirecting - staying on edit page");
            }
        }
    }

    function attachUploadListeners() {
        if (!isUploadPage()) return;
        const form = document.querySelector('form');
        if (!form) return;
        
        // Enhanced form submission handling
        form.addEventListener('submit', () => {
            const key = document.getElementById('key_name')?.value.trim() || '';
            const scale = document.getElementById('scale')?.value.trim() || '';
            const bpm = document.getElementById('bpm')?.value.trim() || '';
            const tn = getTrackName();
            const duration = getDuration();
            const producers = getProducers();
            const tags = getTags();
            
            // Get exclusive licensing data
            const { licensing_type, exclusive_price, exclusive_currency, exclusive_status, exclusive_buyer_info } = getExclusiveLicensingData();
            
            console.log("📤 Form submission - capturing data:", {
                key, scale, bpm, trackName: tn, duration, producers, tags,
                licensing_type, exclusive_price, exclusive_currency, exclusive_status, exclusive_buyer_info
            });
            
            // Always save track name even if other fields are incomplete
            const pendingData = {
                key_name: key, 
                scale, 
                bpm, 
                track_name: tn || '', 
                duration_ms: duration,
                producers,
                tags,
                licensing_type,
                exclusive_price: licensing_type !== 'non_exclusive_only' ? exclusive_price : '',
                exclusive_currency,
                exclusive_status: licensing_type === 'non_exclusive_only' ? 'not_available' : exclusive_status,
                exclusive_buyer_info
            };
            
            localStorage.setItem('pendingCustomData', JSON.stringify(pendingData));
            console.log("💾 Saved upload data to localStorage:", pendingData);
        });
        
        const btn = form.querySelector('button[type="submit"]');
        if (btn) {
            btn.addEventListener('click', () => {
                // Capture data immediately on button click (backup)
                const tn = getTrackName();
                console.log("🔄 Button click - track name capture:", tn);
                
                setTimeout(() => processPendingCustomDataOnConfirmation(), 500);
                setTimeout(pollForConfirmation, 1000);
            });
        }
    }

    // ---------------------------
    // Enhanced Metadata Completeness Check
    // ---------------------------
    function getMetadataCompleteness(databaseData = null) {
        // Get form field values
        const keyField = document.getElementById('key_name');
        const scaleField = document.getElementById('scale');
        const bpmField = document.getElementById('bpm');
        
        const formKey = keyField ? keyField.value.trim() : '';
        const formScale = scaleField ? scaleField.value.trim() : '';
        const formBpm = bpmField ? bpmField.value.trim() : '';
        
        // Get producers and tags from form (these are not required for completeness)
        const formProducers = getProducers();
        const formTags = getTags();
        
        // Get exclusive licensing data
        const { licensing_type, exclusive_price, exclusive_currency, exclusive_status, exclusive_buyer_info } = getExclusiveLicensingData();
        
        // Use form values if available, otherwise fall back to database values
        const key = formKey || (databaseData?.key_name || '');
        const scale = formScale || (databaseData?.scale || '');
        const bpm = formBpm || (databaseData?.bpm || '');
        const producers = formProducers || (databaseData?.producers || '');
        const tags = formTags || (databaseData?.tags || '');
        
        const hasKey = key.length > 0;
        const hasScale = scale.length > 0;
        const hasBPM = bpm.length > 0 && !isNaN(parseInt(bpm)) && parseInt(bpm) >= 40 && parseInt(bpm) <= 300;
        const hasExclusivePricing = licensing_type !== 'non_exclusive_only' && exclusive_price > 0;
        
        // Determine the source of each field for display purposes
        const keySource = formKey ? 'form' : (databaseData?.key_name ? 'database' : 'missing');
        const scaleSource = formScale ? 'form' : (databaseData?.scale ? 'database' : 'missing');
        const bpmSource = formBpm ? 'form' : (databaseData?.bpm ? 'database' : 'missing');
        
        return {
            key,
            scale,
            bpm,
            producers,
            tags,
            licensing_type,
            exclusive_price,
            exclusive_currency,
            exclusive_status,
            exclusive_buyer_info,
            hasKey,
            hasScale,
            hasBPM,
            hasExclusivePricing,
            isComplete: hasKey && hasScale && hasBPM, // Producers, tags, and exclusive licensing are not required for completeness
            missing: [
                !hasKey ? 'Key' : null,
                !hasScale ? 'Scale' : null,
                !hasBPM ? 'BPM' : null
            ].filter(Boolean),
            sources: {
                key: keySource,
                scale: scaleSource,
                bpm: bpmSource
            }
        };
    }

    // ... rest of existing code ...

    // NEW: Helper function to format price with currency
    function formatPrice(price, currency) {
        const symbols = {
            'USD': '$',
            'EUR': '€',
            'GBP': '£',
            'CAD': 'C$',
            'AUD': 'A$',
            'JPY': '¥'
        };
        const symbol = symbols[currency] || currency;
        const formattedPrice = parseFloat(price).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        return `${symbol}${formattedPrice}`;
    }
    
    // NEW: Helper function to create exclusive licensing display
    function createExclusiveLicensingDisplay(data) {
        if (!data || data.licensing_type === 'non_exclusive_only') {
            return null;
        }
        
        const container = document.createElement('div');
        container.className = 'exclusive-licensing-display mt-8 p-8 rounded-lg bg-white/5 border border-white/10';
        
        const statusColors = {
            'available': 'text-green-400',
            'sold': 'text-red-400',
            'not_available': 'text-gray-400'
        };
        
        const statusLabels = {
            'available': 'Available',
            'sold': 'Sold',
            'not_available': 'Not Available'
        };
        
        if (data.exclusive_price && data.exclusive_price > 0) {
            const priceRow = document.createElement('div');
            priceRow.className = 'flex items-center justify-between mb-4';
            priceRow.innerHTML = `
                <span class="text-xs text-white/60">Exclusive Price:</span>
                <span class="text-sm font-semibold text-white">${formatPrice(data.exclusive_price, data.exclusive_currency)}</span>
            `;
            container.appendChild(priceRow);
        }
        
        const statusRow = document.createElement('div');
        statusRow.className = 'flex items-center justify-between';
        statusRow.innerHTML = `
            <span class="text-xs text-white/60">Status:</span>
            <span class="text-xs font-medium ${statusColors[data.exclusive_status]}">${statusLabels[data.exclusive_status]}</span>
        `;
        container.appendChild(statusRow);
        
        if (data.exclusive_status === 'sold' && data.exclusive_sold_date) {
            const soldDate = new Date(data.exclusive_sold_date);
            const dateRow = document.createElement('div');
            dateRow.className = 'flex items-center justify-between mt-2';
            dateRow.innerHTML = `
                <span class="text-xs text-white/60">Sold Date:</span>
                <span class="text-xs text-white/80">${soldDate.toLocaleDateString()}</span>
            `;
            container.appendChild(dateRow);
        }
        
        if (data.exclusive_buyer_info) {
            const buyerInfoRow = document.createElement('div');
            buyerInfoRow.className = 'flex items-center justify-between mt-2';
            buyerInfoRow.innerHTML = `
                <span class="text-xs text-white/60">Buyer Info:</span>
                <span class="text-xs text-white/80">${data.exclusive_buyer_info}</span>
            `;
            container.appendChild(buyerInfoRow);
        }
        
        return container;
    }

    // Expose new functions globally for debugging
    window.getProducers = getProducers;
    window.getTags = getTags;
    window.restoreTagsOnEditPage = restoreTagsOnEditPage;
    window.createTagChip = createTagChip;
    window.createSampleSafeBanner = createSampleSafeBanner;
    window.createExclusiveLicensingSection = createExclusiveLicensingSection;
    window.formatPrice = formatPrice;
    window.createExclusiveLicensingDisplay = createExclusiveLicensingDisplay;

    // ... existing code continues ...
})();