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
        console.log("ðŸ·ï¸ getTrackName() found:", trackName);
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
// ============================================================
// BeatPass Data Manager - Standalone IIFE Module
// API requests, caching, and data management
// ============================================================
(function() {
    'use strict';
    
    // ---------------------------
    // Constants and Configuration
    // ---------------------------
    
    const API_URL = 'https://open.beatpass.ca/key_bpm_handler.php';
    const MAX_RETRIES_UPLOAD = 10;
    const RETRY_DELAY = 300;
    const MAX_RETRIES_TRACK = 15;
    const RETRY_DELAY_TRACK = 200;
    const API_TIMEOUT = 10000; // 10 seconds
    const CACHE_DURATION = 300000; // 5 minutes
    
    // ---------------------------
    // State Management
    // ---------------------------
    
    let retryAttempts = 0;
    let cachedBootstrapData = null;
    let cachedApiHeaders = null;
    
    // Enhanced caching system
    const apiCache = new Map();
    const pendingRequests = new Map();
    
    // Performance monitoring
    const performanceMetrics = {
        apiCalls: 0,
        cacheHits: 0,
        domOperations: 0,
        errors: 0
    };
    
    // ---------------------------
    // Core API Functions
    // ---------------------------
    
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
            console.warn('[DataManager] Could not cache bootstrap data:', error);
        }
    }
    
    // ---------------------------
    // Data Submission Functions
    // ---------------------------
    
    async function submitCustomData(data, isUpload = false) {
        const maxRetries = isUpload ? MAX_RETRIES_UPLOAD : MAX_RETRIES_TRACK;
        const retryDelay = isUpload ? RETRY_DELAY : RETRY_DELAY_TRACK;
        
        console.log(`[DataManager] Submitting ${isUpload ? 'upload' : 'track'} data:`, data);
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await makeApiRequest(API_URL, {
                    method: 'POST',
                    body: JSON.stringify(data),
                    headers: cachedApiHeaders || {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });
                
                console.log(`[DataManager] Data submitted successfully on attempt ${attempt}:`, response);
                return response;
                
            } catch (error) {
                console.warn(`[DataManager] Attempt ${attempt}/${maxRetries} failed:`, error.message);
                
                if (attempt === maxRetries) {
                    console.error(`[DataManager] All ${maxRetries} attempts failed. Final error:`, error);
                    throw error;
                }
                
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
            }
        }
    }
    
    async function submitDuration(trackId, duration) {
        if (!trackId || !duration) {
            console.warn('[DataManager] Missing trackId or duration for submission');
            return;
        }
        
        const data = {
            action: 'submit_duration',
            track_id: trackId,
            duration: duration
        };
        
        try {
            const response = await submitCustomData(data, false);
            console.log('[DataManager] Duration submitted successfully:', response);
            return response;
        } catch (error) {
            console.error('[DataManager] Failed to submit duration:', error);
            throw error;
        }
    }
    
    // ---------------------------
    // Local Storage Management
    // ---------------------------
    
    function saveToLocalStorage(key, data) {
        try {
            const serializedData = JSON.stringify({
                data,
                timestamp: Date.now()
            });
            localStorage.setItem(key, serializedData);
            console.log(`[DataManager] Saved to localStorage:`, key, data);
        } catch (error) {
            console.error('[DataManager] Failed to save to localStorage:', error);
        }
    }
    
    function getFromLocalStorage(key, maxAge = CACHE_DURATION) {
        try {
            const item = localStorage.getItem(key);
            if (!item) return null;
            
            const parsed = JSON.parse(item);
            const age = Date.now() - parsed.timestamp;
            
            if (age > maxAge) {
                localStorage.removeItem(key);
                return null;
            }
            
            return parsed.data;
        } catch (error) {
            console.error('[DataManager] Failed to get from localStorage:', error);
            return null;
        }
    }
    
    function clearLocalStorageData(pattern) {
        try {
            const keys = Object.keys(localStorage);
            const keysToRemove = pattern 
                ? keys.filter(key => key.includes(pattern))
                : keys.filter(key => key.startsWith('beatpass_'));
            
            keysToRemove.forEach(key => localStorage.removeItem(key));
            console.log(`[DataManager] Cleared localStorage keys:`, keysToRemove);
        } catch (error) {
            console.error('[DataManager] Failed to clear localStorage:', error);
        }
    }
    
    // ---------------------------
    // Data Validation Functions
    // ---------------------------
    
    function validateTrackData(data) {
        const required = ['track_name'];
        const missing = required.filter(field => !data[field]);
        
        if (missing.length > 0) {
            console.warn('[DataManager] Missing required fields:', missing);
            return false;
        }
        
        return true;
    }
    
    function sanitizeData(data) {
        const sanitized = {};
        
        for (const [key, value] of Object.entries(data)) {
            if (value !== null && value !== undefined && value !== '') {
                // Basic sanitization
                if (typeof value === 'string') {
                    sanitized[key] = value.trim();
                } else {
                    sanitized[key] = value;
                }
            }
        }
        
        return sanitized;
    }
    
    // ---------------------------
    // Cache Management
    // ---------------------------
    
    function clearCache() {
        apiCache.clear();
        pendingRequests.clear();
        console.log('[DataManager] Cache cleared');
    }
    
    function getCacheStats() {
        return {
            ...performanceMetrics,
            cacheSize: apiCache.size,
            pendingRequests: pendingRequests.size
        };
    }
    
    // ---------------------------
    // Global API Exposure
    // ---------------------------
    
    window.BeatPassDataManager = {
        // Core API functions
        makeApiRequest,
        submitCustomData,
        submitDuration,
        
        // Cache management
        initializeCache,
        clearCache,
        getCacheStats,
        
        // Local storage
        saveToLocalStorage,
        getFromLocalStorage,
        clearLocalStorageData,
        
        // Data validation
        validateTrackData,
        sanitizeData,
        
        // Constants
        API_URL,
        CACHE_DURATION,
        
        // Auto-initialization
        init: function() {
            console.log('[BeatPassDataManager] Standalone data manager module loaded');
            initializeCache();
        }
    };
    
    // ---------------------------
    // Auto-Initialization
    // ---------------------------
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', window.BeatPassDataManager.init);
    } else {
        window.BeatPassDataManager.init();
    }
    
})();
/**
 * Metadata Validator - Standalone IIFE Module
 * Handles metadata validation, completeness checking, and field validation
 * Zero dependencies - all utilities embedded
 */
(function() {
    'use strict';

    // Module constants
    const MODULE_NAME = 'BeatPassMetadataValidator';
    const DEBUG = true;

    // Validation constants
    const BPM_MIN = 40;
    const BPM_MAX = 300;
    const REQUIRED_FIELDS = ['key', 'scale', 'bpm'];

    // State management
    let isInitialized = false;

    // Embedded utility functions
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

    // Data collection helpers
    function getProducers() {
        if (window.BeatPassProducerTagsManager && window.BeatPassProducerTagsManager.getProducers) {
            return window.BeatPassProducerTagsManager.getProducers();
        }
        if (window.getProducers) {
            return window.getProducers();
        }
        return '';
    }

    function getTags() {
        if (window.BeatPassProducerTagsManager && window.BeatPassProducerTagsManager.getTags) {
            return window.BeatPassProducerTagsManager.getTags();
        }
        if (window.getTags) {
            return window.getTags();
        }
        return '';
    }

    function getExclusiveLicensingData() {
        if (window.getExclusiveLicensingData) {
            return window.getExclusiveLicensingData();
        }
        return {
            licensing_type: 'non_exclusive_only',
            exclusive_price: '',
            exclusive_currency: 'USD',
            exclusive_status: 'not_available',
            exclusive_buyer_info: ''
        };
    }

    // ---------------------------
    // Field Validation Functions
    // ---------------------------
    function validateKey(key) {
        if (!key || typeof key !== 'string') {
            return { isValid: false, error: 'Key is required' };
        }
        
        const trimmedKey = key.trim();
        if (trimmedKey.length === 0) {
            return { isValid: false, error: 'Key cannot be empty' };
        }
        
        // Basic key format validation (allow common key formats)
        const keyPattern = /^[A-G][#b]?\s*(maj|major|min|minor|m)?$/i;
        if (!keyPattern.test(trimmedKey)) {
            return { isValid: false, error: 'Invalid key format (e.g., C, Am, F#, Bb major)' };
        }
        
        return { isValid: true, value: trimmedKey };
    }

    function validateScale(scale) {
        if (!scale || typeof scale !== 'string') {
            return { isValid: false, error: 'Scale is required' };
        }
        
        const trimmedScale = scale.trim();
        if (trimmedScale.length === 0) {
            return { isValid: false, error: 'Scale cannot be empty' };
        }
        
        // Basic scale validation (allow common scale types)
        const validScales = [
            'major', 'minor', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian',
            'pentatonic', 'blues', 'chromatic', 'harmonic minor', 'melodic minor'
        ];
        
        const isValidScale = validScales.some(validScale => 
            trimmedScale.toLowerCase().includes(validScale.toLowerCase())
        );
        
        if (!isValidScale) {
            return { isValid: false, error: 'Invalid scale type' };
        }
        
        return { isValid: true, value: trimmedScale };
    }

    function validateBPM(bpm) {
        if (!bpm) {
            return { isValid: false, error: 'BPM is required' };
        }
        
        const numericBPM = typeof bpm === 'string' ? parseInt(bpm.trim(), 10) : bpm;
        
        if (isNaN(numericBPM)) {
            return { isValid: false, error: 'BPM must be a number' };
        }
        
        if (numericBPM < BPM_MIN || numericBPM > BPM_MAX) {
            return { isValid: false, error: `BPM must be between ${BPM_MIN} and ${BPM_MAX}` };
        }
        
        return { isValid: true, value: numericBPM };
    }

    function validateProducers(producers) {
        // Producers are optional, so empty is valid
        if (!producers || typeof producers !== 'string') {
            return { isValid: true, value: '' };
        }
        
        const trimmedProducers = producers.trim();
        return { isValid: true, value: trimmedProducers };
    }

    function validateTags(tags) {
        // Tags are optional, so empty is valid
        if (!tags || typeof tags !== 'string') {
            return { isValid: true, value: '' };
        }
        
        const trimmedTags = tags.trim();
        return { isValid: true, value: trimmedTags };
    }

    function validateExclusivePrice(price, licensingType) {
        if (licensingType === 'non_exclusive_only') {
            return { isValid: true, value: '' };
        }
        
        if (!price) {
            return { isValid: false, error: 'Exclusive price is required for exclusive licensing' };
        }
        
        const numericPrice = typeof price === 'string' ? parseFloat(price.trim()) : price;
        
        if (isNaN(numericPrice) || numericPrice <= 0) {
            return { isValid: false, error: 'Exclusive price must be a positive number' };
        }
        
        return { isValid: true, value: numericPrice };
    }

    // ---------------------------
    // Data Sanitization Functions
    // ---------------------------
    function sanitizeString(value) {
        if (!value || typeof value !== 'string') {
            return '';
        }
        return value.trim().replace(/[<>"'&]/g, '');
    }

    function sanitizeNumber(value, min = null, max = null) {
        const num = typeof value === 'string' ? parseFloat(value.trim()) : value;
        if (isNaN(num)) return null;
        
        if (min !== null && num < min) return min;
        if (max !== null && num > max) return max;
        
        return num;
    }

    function sanitizeMetadata(data) {
        const sanitized = {};
        
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'string') {
                sanitized[key] = sanitizeString(value);
            } else if (typeof value === 'number') {
                sanitized[key] = value;
            } else {
                sanitized[key] = value;
            }
        }
        
        return sanitized;
    }

    // ---------------------------
    // Metadata Completeness Check
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
        
        // Validate each field
        const keyValidation = validateKey(key);
        const scaleValidation = validateScale(scale);
        const bpmValidation = validateBPM(bpm);
        const priceValidation = validateExclusivePrice(exclusive_price, licensing_type);
        
        const hasKey = keyValidation.isValid;
        const hasScale = scaleValidation.isValid;
        const hasBPM = bpmValidation.isValid;
        const hasValidExclusivePricing = priceValidation.isValid;
        
        // Determine the source of each field for display purposes
        const keySource = formKey ? 'form' : (databaseData?.key_name ? 'database' : 'missing');
        const scaleSource = formScale ? 'form' : (databaseData?.scale ? 'database' : 'missing');
        const bpmSource = formBpm ? 'form' : (databaseData?.bpm ? 'database' : 'missing');
        
        // Collect validation errors
        const validationErrors = [];
        if (!keyValidation.isValid) validationErrors.push(`Key: ${keyValidation.error}`);
        if (!scaleValidation.isValid) validationErrors.push(`Scale: ${scaleValidation.error}`);
        if (!bpmValidation.isValid) validationErrors.push(`BPM: ${bpmValidation.error}`);
        if (!priceValidation.isValid) validationErrors.push(`Price: ${priceValidation.error}`);
        
        return {
            // Raw values
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
            
            // Validation results
            hasKey,
            hasScale,
            hasBPM,
            hasValidExclusivePricing,
            
            // Overall completeness (core fields only)
            isComplete: hasKey && hasScale && hasBPM,
            
            // Missing fields (core fields only)
            missing: [
                !hasKey ? 'Key' : null,
                !hasScale ? 'Scale' : null,
                !hasBPM ? 'BPM' : null
            ].filter(Boolean),
            
            // Validation errors
            validationErrors,
            hasValidationErrors: validationErrors.length > 0,
            
            // Field sources
            sources: {
                key: keySource,
                scale: scaleSource,
                bpm: bpmSource
            },
            
            // Individual validation objects
            validations: {
                key: keyValidation,
                scale: scaleValidation,
                bpm: bpmValidation,
                exclusivePrice: priceValidation
            }
        };
    }

    // ---------------------------
    // Comprehensive Validation
    // ---------------------------
    function validateAllMetadata(data = null) {
        const metadata = getMetadataCompleteness(data);
        
        // Additional business logic validation
        const warnings = [];
        
        // Check for common issues
        if (metadata.key && metadata.scale) {
            const keyLower = metadata.key.toLowerCase();
            const scaleLower = metadata.scale.toLowerCase();
            
            // Warn about potential key/scale mismatches
            if (keyLower.includes('minor') && scaleLower.includes('major')) {
                warnings.push('Key indicates minor but scale indicates major - please verify');
            }
            if (keyLower.includes('major') && scaleLower.includes('minor')) {
                warnings.push('Key indicates major but scale indicates minor - please verify');
            }
        }
        
        // Check BPM reasonableness for different genres
        if (metadata.bpm) {
            const bpmNum = parseInt(metadata.bpm, 10);
            if (bpmNum < 60) {
                warnings.push('Very slow BPM - consider if this is correct for your track');
            } else if (bpmNum > 200) {
                warnings.push('Very fast BPM - consider if this is correct for your track');
            }
        }
        
        return {
            ...metadata,
            warnings,
            hasWarnings: warnings.length > 0
        };
    }

    // ---------------------------
    // Real-time Validation
    // ---------------------------
    function setupFieldValidation() {
        const keyField = document.getElementById('key_name');
        const scaleField = document.getElementById('scale');
        const bpmField = document.getElementById('bpm');
        
        if (keyField) {
            keyField.addEventListener('blur', debounce(() => {
                const validation = validateKey(keyField.value);
                updateFieldValidationUI(keyField, validation);
            }, 300));
        }
        
        if (scaleField) {
            scaleField.addEventListener('blur', debounce(() => {
                const validation = validateScale(scaleField.value);
                updateFieldValidationUI(scaleField, validation);
            }, 300));
        }
        
        if (bpmField) {
            bpmField.addEventListener('blur', debounce(() => {
                const validation = validateBPM(bpmField.value);
                updateFieldValidationUI(bpmField, validation);
            }, 300));
        }
    }

    function updateFieldValidationUI(field, validation) {
        // Remove existing validation classes
        field.classList.remove('validation-error', 'validation-success');
        
        // Remove existing validation message
        const existingMessage = field.parentNode.querySelector('.validation-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        if (!validation.isValid) {
            field.classList.add('validation-error');
            
            // Add error message
            const errorMessage = document.createElement('div');
            errorMessage.className = 'validation-message text-red-500 text-xs mt-1';
            errorMessage.textContent = validation.error;
            field.parentNode.appendChild(errorMessage);
        } else {
            field.classList.add('validation-success');
        }
    }

    // ---------------------------
    // Public API
    // ---------------------------
    const MetadataValidator = {
        // Field validation
        validateKey,
        validateScale,
        validateBPM,
        validateProducers,
        validateTags,
        validateExclusivePrice,
        
        // Data sanitization
        sanitizeString,
        sanitizeNumber,
        sanitizeMetadata,
        
        // Completeness checking
        getMetadataCompleteness,
        validateAllMetadata,
        
        // UI validation
        setupFieldValidation,
        updateFieldValidationUI,
        
        // Constants
        BPM_MIN,
        BPM_MAX,
        REQUIRED_FIELDS,
        
        // State
        isInitialized: () => isInitialized,
        
        // Initialization
        init() {
            if (isInitialized) {
                if (DEBUG) console.log(`${MODULE_NAME} already initialized`);
                return;
            }
            
            if (DEBUG) console.log(`ðŸš€ Initializing ${MODULE_NAME}`);
            
            // Setup real-time field validation
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', setupFieldValidation);
            } else {
                setupFieldValidation();
            }
            
            isInitialized = true;
            
            if (DEBUG) console.log(`âœ… ${MODULE_NAME} initialized successfully`);
        },
        
        // Cleanup
        destroy() {
            isInitialized = false;
            if (DEBUG) console.log(`ðŸ§¹ ${MODULE_NAME} destroyed`);
        }
    };

    // Global exposure
    window[MODULE_NAME] = MetadataValidator;
    
    // Legacy compatibility
    window.getMetadataCompleteness = getMetadataCompleteness;
    window.validateKey = validateKey;
    window.validateScale = validateScale;
    window.validateBPM = validateBPM;
    window.sanitizeMetadata = sanitizeMetadata;

    // Auto-initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            MetadataValidator.init();
        });
    } else {
        MetadataValidator.init();
    }

    if (DEBUG) console.log(`ðŸ“¦ ${MODULE_NAME} module loaded`);

})();
