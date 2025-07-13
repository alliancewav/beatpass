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