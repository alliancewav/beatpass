/**
 * Form Submission Handler - Standalone IIFE Module
 * Handles form submissions, pending data management, and confirmation processing
 * Zero dependencies - all utilities embedded
 */
(function() {
    'use strict';

    // Module constants
    const MODULE_NAME = 'BeatPassFormSubmissionHandler';
    const DEBUG = true;
    const API_URL = 'key_bpm_handler.php';

    // State management
    let isInitialized = false;
    let fieldsReady = false;

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

    // Page type checkers
    function isUploadPage() {
        return window.location.pathname.includes('/upload');
    }

    function isEditPage() {
        return window.location.pathname.includes('/edit');
    }

    function isConfirmationPage() {
        return window.location.pathname.includes('/confirmation') || 
               document.querySelector('.flex.items-center.gap-28.border.rounded.bg-paper');
    }

    // Track data extraction helpers
    function getTrackId() {
        const match = window.location.pathname.match(/\/track\/(\d+)/);
        return match ? parseInt(match[1], 10) : null;
    }

    function getTrackName() {
        const titleElement = document.querySelector('h1');
        if (titleElement) {
            return titleElement.textContent.trim();
        }
        
        const inputElement = document.querySelector('input[name="name"]');
        if (inputElement) {
            return inputElement.value.trim();
        }
        
        return '';
    }

    function getDuration() {
        const durationElement = document.querySelector('[data-testid="duration"]');
        if (durationElement) {
            const text = durationElement.textContent.trim();
            const match = text.match(/(\d+):(\d+)/);
            if (match) {
                const minutes = parseInt(match[1], 10);
                const seconds = parseInt(match[2], 10);
                return (minutes * 60 + seconds) * 1000;
            }
        }
        return null;
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
    // Pending Data Management
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
        
        // Get exclusive licensing data
        const { licensing_type, exclusive_price, exclusive_currency, exclusive_status, exclusive_buyer_info } = getExclusiveLicensingData();
        
        if (DEBUG) {
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
        }
        
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
            if (DEBUG) console.log("💾 Saved pending custom data to localStorage");
        } else {
            if (DEBUG) console.warn("⚠️ No data to save - all fields empty");
        }
    }

    // ---------------------------
    // Data Submission
    // ---------------------------
    async function submitCustomData(pendingData) {
        let key_name, scale, bpm, track_name, track_id, playback_url, duration_ms, producers, tags, licensing_type, exclusive_price, exclusive_currency, exclusive_status, exclusive_buyer_info;
        
        if (pendingData) {
            ({ key_name, scale, bpm, track_name, track_id, playback_url, duration_ms, producers, tags, licensing_type, exclusive_price, exclusive_currency, exclusive_status, exclusive_buyer_info } = pendingData);
            if (DEBUG) console.log("📋 Using pending data for submission:", pendingData);
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
                    if (DEBUG) console.log("Found playback URL input field");
                } else {
                    if (DEBUG) console.log("Playback URL input not found");
                }
            }
            
            // Get exclusive licensing data
            const licensingData = getExclusiveLicensingData();
            licensing_type = licensingData.licensing_type;
            exclusive_price = licensingData.exclusive_price;
            exclusive_currency = licensingData.exclusive_currency;
            exclusive_status = licensingData.exclusive_status;
            exclusive_buyer_info = licensingData.exclusive_buyer_info;
            
            if (DEBUG) {
                console.log("📋 Using form data for submission:", {
                    key_name, scale, bpm, track_name, track_id, playback_url, duration_ms, producers, tags, licensing_type, exclusive_price, exclusive_currency, exclusive_status, exclusive_buyer_info
                });
            }
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
            if (DEBUG) console.log("Adding playback URL to payload");
        }
        if (duration_ms !== null && duration_ms !== undefined) {
            payload.duration_ms = duration_ms;
            if (DEBUG) console.log("Adding duration to payload:", duration_ms);
        }
        
        if (DEBUG) console.log("📤 Final payload for submission:", payload);

        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams(payload)
            });
            const data = await res.json();
            localStorage.removeItem('pendingCustomData');
            return true;
        } catch (err) {
            console.error("Error submitting custom data:", err);
            return false;
        }
    }

    // ---------------------------
    // Confirmation Page Processing
    // ---------------------------
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
                    if (DEBUG) console.log("✅ Found track name from title element:", trackName);
                }
                
                // Fallback: extract track name from URL if title element not found
                if (!trackName && link) {
                    const href = link.getAttribute('href');
                    const urlParts = href.split('/');
                    const urlTrackName = urlParts[urlParts.length - 1] || '';
                    if (urlTrackName) {
                        // Decode URL-encoded track name and convert dashes to spaces
                        trackName = decodeURIComponent(urlTrackName.replace(/-/g, ' '));
                        if (DEBUG) console.log("🔄 Extracted track name from URL:", trackName);
                    }
                }
                
                // Final fallback: get track name from pending data
                if (!trackName) {
                    const customData = JSON.parse(pending);
                    trackName = customData.track_name || '';
                    if (DEBUG) console.log("⚠️ Using track name from pending data:", trackName);
                }
            }

            if (trackId) {
                if (DEBUG) console.log("✅ Found track ID for confirmation:", trackId, "with name:", trackName);
                
                // Submit the metadata with confirmed track name
                const customData = JSON.parse(pending);
                customData.track_id = trackId;
                
                // Ensure track name is included and log the source
                if (trackName && trackName.trim()) {
                    const previousTrackName = customData.track_name || 'none';
                    customData.track_name = trackName.trim();
                    if (DEBUG) console.log(`📝 Track name updated: "${previousTrackName}" → "${customData.track_name}"`);
                } else {
                    if (DEBUG) console.warn("⚠️ No track name found during confirmation, keeping original:", customData.track_name);
                }
                
                if (DEBUG) console.log("📤 Final confirmation payload:", customData);
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

    // ---------------------------
    // Form Submission Handlers
    // ---------------------------
    async function handleFormSubmission(e) {
        if (DEBUG) console.log("Form submission handler called");
        
        if (isUploadPage()) {
            if (DEBUG) console.log("On upload page, skipping custom submission");
            return;
        }
        
        // Check if this is a fingerprinting operation - completely block form submission
        const isDashboardFingerprintingActive = document.querySelector('#dashboard-content .fingerprint-processing') || 
                                              document.querySelector('#dashboard-content .text-purple-400') ||
                                              document.querySelector('.fingerprint-processing');
        
        // Also check if user just clicked a fingerprint button
        const fingerprintButtonClicked = window.fingerprintOperationInProgress || false;
        
        if (isDashboardFingerprintingActive || fingerprintButtonClicked) {
            if (DEBUG) console.log("Fingerprinting in progress, completely blocking form submission");
            e.preventDefault();
            e.stopPropagation();
            return false; // Completely block form submission during fingerprinting
        }
        
        e.preventDefault();
        if (DEBUG) console.log("Prevented default form submission");
        
        if (!fieldsReady) {
            if (DEBUG) console.log("Fields not ready, skipping submission");
            return;
        }
        
        if (isEditPage()) {
            if (DEBUG) console.log("On edit page, submitting custom data");
            
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
            
            // Get exclusive licensing data
            const { licensing_type, exclusive_price, exclusive_currency, exclusive_status, exclusive_buyer_info } = getExclusiveLicensingData();
            
            if (DEBUG) console.log("Form data collected, submitting...");
            
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
            
            if (DEBUG) console.log("Custom data submission result:", success);
            
            // Only redirect if user explicitly saved without fingerprinting
            const saveButton = document.querySelector('button[type="submit"]');
            if (saveButton && saveButton.textContent.toLowerCase().includes('save')) {
                if (track_id) {
                    if (DEBUG) console.log("Redirecting to track page:", track_id);
                    window.location.href = `/track/${track_id}/${track_name.replace(/\s+/g, '-').toLowerCase()}`;
                }
            } else {
                if (DEBUG) console.log("Not redirecting - staying on edit page");
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
            
            if (DEBUG) {
                console.log("📤 Form submission - capturing data:", {
                    key, scale, bpm, trackName: tn, duration, producers, tags,
                    licensing_type, exclusive_price, exclusive_currency, exclusive_status, exclusive_buyer_info
                });
            }
            
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
            if (DEBUG) console.log("💾 Saved upload data to localStorage:", pendingData);
        });
        
        const btn = form.querySelector('button[type="submit"]');
        if (btn) {
            btn.addEventListener('click', () => {
                // Capture data immediately on button click (backup)
                const tn = getTrackName();
                if (DEBUG) console.log("🔄 Button click - track name capture:", tn);
                
                setTimeout(() => processPendingCustomDataOnConfirmation(), 500);
            });
        }
    }

    function attachEditListeners() {
        if (!isEditPage()) return;
        const form = document.querySelector('form');
        if (!form) return;
        
        // Remove existing listeners to prevent duplicates
        form.removeEventListener('submit', handleFormSubmission);
        form.addEventListener('submit', handleFormSubmission);
        
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            fieldsReady = true;
        }
    }

    // ---------------------------
    // Public API
    // ---------------------------
    const FormSubmissionHandler = {
        // Core functions
        updatePendingCustomData,
        submitCustomData,
        processPendingCustomDataOnConfirmation,
        handleFormSubmission,
        attachUploadListeners,
        attachEditListeners,
        
        // Utility functions
        isUploadPage,
        isEditPage,
        isConfirmationPage,
        getTrackId,
        getTrackName,
        getDuration,
        
        // State management
        setFieldsReady: (ready) => { fieldsReady = ready; },
        isFieldsReady: () => fieldsReady,
        isInitialized: () => isInitialized,
        
        // Initialization
        init() {
            if (isInitialized) {
                if (DEBUG) console.log(`${MODULE_NAME} already initialized`);
                return;
            }
            
            if (DEBUG) console.log(`🚀 Initializing ${MODULE_NAME}`);
            
            // Attach appropriate listeners based on page type
            if (isUploadPage()) {
                attachUploadListeners();
            } else if (isEditPage()) {
                attachEditListeners();
            } else if (isConfirmationPage()) {
                processPendingCustomDataOnConfirmation();
            }
            
            isInitialized = true;
            
            if (DEBUG) console.log(`✅ ${MODULE_NAME} initialized successfully`);
        },
        
        // Cleanup
        destroy() {
            isInitialized = false;
            fieldsReady = false;
            if (DEBUG) console.log(`🧹 ${MODULE_NAME} destroyed`);
        }
    };

    // Global exposure
    window[MODULE_NAME] = FormSubmissionHandler;
    
    // Legacy compatibility
    window.updatePendingCustomData = updatePendingCustomData;
    window.submitCustomData = submitCustomData;
    window.processPendingCustomDataOnConfirmation = processPendingCustomDataOnConfirmation;
    window.handleFormSubmission = handleFormSubmission;

    // Auto-initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            FormSubmissionHandler.init();
        });
    } else {
        FormSubmissionHandler.init();
    }

    if (DEBUG) console.log(`📦 ${MODULE_NAME} module loaded`);

})();