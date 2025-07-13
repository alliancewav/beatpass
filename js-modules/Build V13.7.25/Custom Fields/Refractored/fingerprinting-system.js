// ============================================================
// BeatPassID Fingerprinting System Module
// Extracted from custom-fields.js
// Handles audio fingerprinting, duplicate detection, and Sample-Safe™ warranty
// ============================================================
(function () {
    'use strict';

    console.log('🔍 BeatPassID Fingerprinting System module loaded');

    // ---------------------------
    // Module Constants
    // ---------------------------
    
    const API_URL = window.API_URL || 'https://open.beatpass.ca/key_bpm_handler.php';
    const FINGERPRINT_API = 'https://open.beatpass.ca/fingerprint.php';

    // ---------------------------
    // Core Fingerprinting Functions
    // ---------------------------

    async function generateFingerprint(playbackUrl, track_id) {
        console.log(`🔍 Generating fingerprint for track ${track_id} with URL: ${playbackUrl}`);
        
        try {
            const response = await fetch(FINGERPRINT_API, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: playbackUrl,
                    track_id: track_id
                })
            });
            
            const data = await response.json();
            console.log('🔍 Fingerprint generation response:', data);
            
            if (data.success) {
                return {
                    success: true,
                    fingerprint: data.fingerprint,
                    fingerprint_hash: data.fingerprint_hash
                };
            } else {
                return {
                    success: false,
                    error: data.error || 'Failed to generate fingerprint'
                };
            }
        } catch (error) {
            console.error('🔍 Error generating fingerprint:', error);
            return {
                success: false,
                error: 'Network error during fingerprint generation'
            };
        }
    }

    async function submitFingerprint(fingerprintData, track_id) {
        console.log(`🔍 Submitting fingerprint for track ${track_id}`);
        
        try {
            // First, check for duplicates
            const duplicateCheckResponse = await fetch(`${API_URL}?check_fingerprint=1`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fingerprint_hash: fingerprintData.fingerprint_hash,
                    track_id: track_id
                })
            });
            
            const duplicateCheck = await duplicateCheckResponse.json();
            console.log('🔍 Duplicate check response:', duplicateCheck);
            
            if (duplicateCheck.isDuplicate) {
                return {
                    success: false,
                    isDuplicate: true,
                    isAuthentic: duplicateCheck.isAuthentic || false,
                    duplicateInfo: duplicateCheck.duplicateInfo || {},
                    message: duplicateCheck.message || 'Duplicate content detected'
                };
            }
            
            // If no duplicates, proceed with submission
            const submitResponse = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'save_fingerprint',
                    track_id: track_id,
                    fingerprint: fingerprintData.fingerprint,
                    fingerprint_hash: fingerprintData.fingerprint_hash
                })
            });
            
            const submitResult = await submitResponse.json();
            console.log('🔍 Fingerprint submission response:', submitResult);
            
            return {
                success: submitResult.success || false,
                message: submitResult.message || 'Fingerprint saved successfully'
            };
            
        } catch (error) {
            console.error('🔍 Error submitting fingerprint:', error);
            return {
                success: false,
                error: 'Network error during fingerprint submission'
            };
        }
    }

    async function deleteFingerprintFromDatabase(track_id) {
        console.log(`🔍 Deleting fingerprint for track ${track_id} due to ToS violation`);
        
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'delete_fingerprint',
                    track_id: track_id,
                    reason: 'tos_violation_duplicate_content'
                })
            });
            
            const result = await response.json();
            console.log('🔍 Fingerprint deletion response:', result);
            
            return result;
        } catch (error) {
            console.error('🔍 Error deleting fingerprint:', error);
            return {
                success: false,
                error: 'Network error during fingerprint deletion'
            };
        }
    }

    async function checkPlaybackURLStatus(track_id) {
        try {
            const response = await fetch(`${API_URL}?track_id=${track_id}&check_fingerprint_status=1`);
            const data = await response.json();
            
            return {
                hasFingerprint: data.hasFingerprint || false,
                isDuplicate: data.isDuplicate || false,
                isAuthentic: data.isAuthentic || false,
                duplicateCount: data.duplicateCount || 0,
                playbackUrl: data.playbackUrl || '',
                fingerprint: data.fingerprint || '',
                fingerprint_hash: data.fingerprint_hash || '',
                duplicateInfo: data.duplicateInfo || {}
            };
        } catch (error) {
            console.error('🔍 Error checking playback URL status:', error);
            return {
                hasFingerprint: false,
                isDuplicate: false,
                isAuthentic: false,
                duplicateCount: 0,
                playbackUrl: '',
                fingerprint: '',
                fingerprint_hash: '',
                duplicateInfo: {}
            };
        }
    }

    // ---------------------------
    // Dashboard Management Functions
    // ---------------------------

    function createFingerprintDashboard() {
        const dashboard = document.createElement('div');
        dashboard.id = 'fingerprint-dashboard';
        dashboard.className = 'fingerprint-dashboard mt-16 mb-16';
        dashboard.style.cssText = `
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%);
            border: 1px solid rgba(59, 130, 246, 0.15);
            border-radius: 12px;
            padding: 20px;
            position: relative;
            overflow: hidden;
        `;
        
        // Header
        const header = document.createElement('div');
        header.className = 'flex items-center gap-12 mb-16';
        
        const icon = document.createElement('div');
        icon.className = 'flex items-center justify-center w-10 h-10 rounded-full';
        icon.style.cssText = `
            background: linear-gradient(135deg, #3b82f6 0%, #10b981 100%);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        `;
        icon.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1M12 7C13.4 7 14.8 8.6 14.8 10V11H15.5V16H8.5V11H9.2V10C9.2 8.6 10.6 7 12 7M12 8.2C11.2 8.2 10.5 8.7 10.5 10V11H13.5V10C13.5 8.7 12.8 8.2 12 8.2Z"/>
            </svg>
        `;
        
        const title = document.createElement('h4');
        title.className = 'font-bold text-white text-lg';
        title.textContent = 'BeatPassID Protection';
        
        const badge = document.createElement('div');
        badge.className = 'px-8 py-4 rounded-full text-xs font-medium';
        badge.style.cssText = `
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
        `;
        badge.textContent = 'Sample-Safe™';
        
        header.appendChild(icon);
        header.appendChild(title);
        header.appendChild(badge);
        
        // Content area
        const content = document.createElement('div');
        content.id = 'dashboard-content';
        content.className = 'dashboard-content';
        
        dashboard.appendChild(header);
        dashboard.appendChild(content);
        
        return dashboard;
    }

    function removeFingerprintDashboard() {
        const dashboard = document.getElementById('fingerprint-dashboard');
        if (dashboard) {
            dashboard.remove();
            console.log('🔍 Fingerprint dashboard removed');
        }
    }

    function injectFingerprintDashboard() {
        if (!window.isEditPage || !window.isEditPage()) {
            console.log('🔍 Not on edit page, skipping dashboard injection');
            return;
        }
        
        if (document.getElementById('fingerprint-dashboard')) {
            console.log('🔍 Dashboard already exists, skipping injection');
            return;
        }
        
        const form = document.querySelector('form');
        if (!form) {
            console.warn('🔍 No form found for dashboard injection');
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
        
        console.log('🔍 Fingerprint Dashboard injected successfully');
        
        // Initialize dashboard content with multiple attempts for reliability
        setTimeout(async () => {
            console.log('🔍 Initializing dashboard content...');
            await updateDashboardContent();
            observePlaybackURLChanges();
            
            // Retry dashboard update if content is empty (for reliability)
            setTimeout(async () => {
                const content = document.getElementById('dashboard-content');
                if (content && content.innerHTML.trim() === '') {
                    console.log('🔍 Dashboard content empty, retrying...');
                    await updateDashboardContent();
                }
            }, 1000);
        }, 200);
    }

    // Debounced version for performance
    let updateDashboardTimeout;
    function debouncedInjectFingerprintDashboard() {
        clearTimeout(updateDashboardTimeout);
        updateDashboardTimeout = setTimeout(() => {
            injectFingerprintDashboard();
        }, 300);
    }

    // ---------------------------
    // Dashboard Content Management
    // ---------------------------

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
        
        // Get exclusive licensing data
        const { licensing_type, exclusive_price, exclusive_currency, exclusive_status, exclusive_buyer_info } = 
            window.getExclusiveLicensingData ? window.getExclusiveLicensingData() : {
                licensing_type: 'non_exclusive_only',
                exclusive_price: '',
                exclusive_currency: 'USD',
                exclusive_status: 'not_available',
                exclusive_buyer_info: ''
            };
        
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
            console.warn('🔍 Dashboard content element not found');
            return;
        }
        
        const track_id = window.getTrackId ? window.getTrackId() : null;
        if (!track_id) {
            console.warn('🔍 No track ID found for dashboard update');
            return;
        }
        
        console.log(`🔍 Updating dashboard content for track ID: ${track_id}`);
        
        // Get current playback URL from form
        const playbackInput = document.querySelector('input[name="src"]') || 
            document.querySelector('input[type="text"][name="src"]') ||
            document.querySelector('input[type="url"][name="src"]');
        
        const currentURL = playbackInput ? playbackInput.value.trim() : '';
        console.log(`🔍 Current playback URL: ${currentURL ? 'Present' : 'None'}`);
        
        // Get fingerprint status from database (includes existing metadata)
        console.log('🔍 Fetching fingerprint status from database...');
        const statusInfo = await checkPlaybackURLStatus(track_id);
        console.log('🔍 Fingerprint status received:', {
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
            console.log('🔍 Could not fetch existing metadata:', error);
        }
        
        // Get metadata completeness (checks both form and database)
        const metadata = getMetadataCompleteness(existingCustomData);
        
        // Check if URL has changed from what's in database
        const urlChanged = currentURL && statusInfo.playbackUrl && 
                          currentURL !== statusInfo.playbackUrl;
        
        console.log('🔍 Dashboard update:', {
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

    function observePlaybackURLChanges() {
        const playbackInput = document.querySelector('input[name="src"]') || 
            document.querySelector('input[type="text"][name="src"]') ||
            document.querySelector('input[type="url"][name="src"]');
        
        if (!playbackInput) {
            console.warn('🔍 Playback URL input not found for observation');
            return;
        }
        
        let lastValue = playbackInput.value;
        
        const checkForChanges = () => {
            const currentValue = playbackInput.value;
            if (currentValue !== lastValue) {
                console.log('🔍 Playback URL changed, updating dashboard');
                lastValue = currentValue;
                setTimeout(updateDashboardContent, 500); // Debounce updates
            }
        };
        
        // Multiple event listeners for comprehensive change detection
        playbackInput.addEventListener('input', checkForChanges);
        playbackInput.addEventListener('change', checkForChanges);
        playbackInput.addEventListener('paste', () => setTimeout(checkForChanges, 100));
        
        // Periodic check as fallback
        setInterval(checkForChanges, 2000);
        
        console.log('🔍 Playback URL change observation initialized');
    }

    // ---------------------------
    // Fingerprinting Process Management
    // ---------------------------

    async function startFingerprintingProcess(button = null, track_id = null, fromDashboard = false) {
        console.log('🔍 Starting fingerprinting process...');
        
        // Set flag to prevent redirects during fingerprinting
        window.fingerprintOperationInProgress = true;
        
        try {
            // Get track ID
            if (!track_id) {
                track_id = window.getTrackId ? window.getTrackId() : null;
            }
            
            if (!track_id) {
                console.error('🔍 No track ID available for fingerprinting');
                return;
            }
            
            // Get playback URL
            const playbackInput = document.querySelector('input[name="src"]') || 
                document.querySelector('input[type="text"][name="src"]') ||
                document.querySelector('input[type="url"][name="src"]');
            
            if (!playbackInput || !playbackInput.value.trim()) {
                console.error('🔍 No playback URL found');
                showNotification('Please add a playback URL first', 'error');
                return;
            }
            
            const playbackUrl = playbackInput.value.trim();
            console.log('🔍 Using playback URL:', playbackUrl);
            
            // Fetch existing custom data for validation
            let existingCustomData = null;
            try {
                const response = await fetch(`${API_URL}?track_id=${track_id}`);
                const result = await response.json();
                if (result.status === 'success' && result.data) {
                    existingCustomData = result.data;
                }
            } catch (error) {
                console.log('🔍 Could not fetch existing data:', error);
            }
            
            // Check metadata completeness
            const metadata = getMetadataCompleteness(existingCustomData);
            if (!metadata.isComplete) {
                console.error('🔍 Metadata incomplete:', metadata.missing);
                showNotification(`Please complete: ${metadata.missing.join(', ')}`, 'warning');
                return;
            }
            
            // Update UI to show processing state
            const dashboardContent = document.getElementById('dashboard-content');
            if (dashboardContent) {
                renderProcessingState(dashboardContent, 'Analyzing audio and generating fingerprint...');
            } else if (button) {
                button.disabled = true;
                button.innerHTML = `
                    <div class="flex items-center gap-8">
                        <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Generating...</span>
                    </div>
                `;
            }
            
            // Save playback URL and metadata to database first
            console.log('🔍 Saving playback URL and metadata...');
            const saveResponse = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'save_playback_url',
                    track_id: track_id,
                    playback_url: playbackUrl,
                    key_name: metadata.key,
                    scale: metadata.scale,
                    bpm: metadata.bpm,
                    licensing_type: metadata.licensing_type,
                    exclusive_price: metadata.exclusive_price,
                    exclusive_currency: metadata.exclusive_currency,
                    exclusive_status: metadata.exclusive_status,
                    exclusive_buyer_info: metadata.exclusive_buyer_info
                })
            });
            
            const saveResult = await saveResponse.json();
            console.log('🔍 Save response:', saveResult);
            
            // Generate fingerprint
            console.log('🔍 Generating fingerprint...');
            const fingerprintResult = await generateFingerprint(playbackUrl, track_id);
            
            if (!fingerprintResult.success) {
                console.error('🔍 Fingerprint generation failed:', fingerprintResult.error);
                showNotification('Failed to generate fingerprint: ' + fingerprintResult.error, 'error');
                
                // Reset UI
                if (dashboardContent) {
                    await updateDashboardContent();
                } else if (button) {
                    button.disabled = false;
                    button.innerHTML = 'Generate Fingerprint';
                }
                return;
            }
            
            // Update UI for submission phase
            if (dashboardContent) {
                renderProcessingState(dashboardContent, 'Saving fingerprint to database...');
            }
            
            // Submit fingerprint to database
            console.log('🔍 Submitting fingerprint to database...');
            const submitResult = await submitFingerprint(fingerprintResult, track_id);
            
            if (submitResult.isDuplicate) {
                console.log('🔍 Duplicate detected:', submitResult);
                
                if (!submitResult.isAuthentic) {
                    // ToS violation - delete any fingerprint data
                    await deleteFingerprintFromDatabase(track_id);
                    
                    if (dashboardContent) {
                        renderFingerprintFailureState(dashboardContent, submitResult);
                    }
                    
                    showNotification('Duplicate content detected - Terms of Service violation', 'error');
                } else {
                    // Authentic duplicate
                    console.log('🔍 Authentic duplicate detected');
                    if (dashboardContent) {
                        await updateDashboardContent();
                    }
                    showNotification('Authentic original detected with duplicates blocked', 'info');
                }
            } else if (submitResult.success) {
                console.log('🔍 Fingerprinting completed successfully');
                
                if (dashboardContent) {
                    await updateDashboardContent();
                }
                
                showNotification('BeatPassID protection activated successfully!', 'success');
            } else {
                console.error('🔍 Fingerprint submission failed:', submitResult.error);
                showNotification('Failed to save fingerprint: ' + (submitResult.error || 'Unknown error'), 'error');
                
                if (dashboardContent) {
                    await updateDashboardContent();
                }
            }
            
            // Reset button if used
            if (button && !dashboardContent) {
                button.disabled = false;
                button.innerHTML = 'Generate Fingerprint';
            }
            
        } catch (error) {
            console.error('🔍 Error in fingerprinting process:', error);
            showNotification('Fingerprinting process failed: ' + error.message, 'error');
            
            // Reset UI
            const dashboardContent = document.getElementById('dashboard-content');
            if (dashboardContent) {
                await updateDashboardContent();
            } else if (button) {
                button.disabled = false;
                button.innerHTML = 'Generate Fingerprint';
            }
        } finally {
            // Clear the flag
            window.fingerprintOperationInProgress = false;
        }
    }

    // ---------------------------
    // User Guidance Functions
    // ---------------------------

    function showFingerprintGuidance() {
        // Remove any existing guidance
        removeFingerprintGuidance();
        
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.id = 'fingerprint-guidance-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(4px);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.3s ease-out;
        `;
        
        // Create modal content
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
            border: 1px solid rgba(59, 130, 246, 0.2);
            border-radius: 16px;
            padding: 32px;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            transform: translateY(20px);
            transition: transform 0.3s ease-out;
        `;
        
        modal.innerHTML = `
            <div class="text-center mb-24">
                <div class="inline-flex items-center justify-center w-16 h-16 rounded-full mb-16" style="background: linear-gradient(135deg, #3b82f6 0%, #10b981 100%); box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4);">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                        <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1M12 7C13.4 7 14.8 8.6 14.8 10V11H15.5V16H8.5V11H9.2V10C9.2 8.6 10.6 7 12 7M12 8.2C11.2 8.2 10.5 8.7 10.5 10V11H13.5V10C13.5 8.7 12.8 8.2 12 8.2Z"/>
                    </svg>
                </div>
                <h2 class="text-2xl font-bold text-white mb-8">Activate BeatPassID Protection</h2>
                <p class="text-white/70 text-sm leading-relaxed">Create an unbreakable digital DNA for your track with our Sample-Safe™ guarantee</p>
            </div>
            
            <div class="space-y-16 mb-24">
                <div class="p-16 rounded-lg" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%); border: 1px solid rgba(16, 185, 129, 0.2);">
                    <h3 class="font-bold text-white mb-8 flex items-center gap-8">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="#10b981">
                            <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1M10 17L6 13L7.41 11.59L10 14.17L16.59 7.58L18 9L10 17Z"/>
                        </svg>
                        Sample-Safe™ Producer Warranty
                    </h3>
                    <p class="text-xs text-white/80 leading-relaxed">By activating BeatPassID, you warrant to buyers that all samples in this track are properly cleared and licensed, making it safe for commercial use without copyright infringement risk.</p>
                </div>
                
                <div class="grid grid-cols-2 gap-12">
                    <div class="text-center p-12 rounded-lg bg-white/5 border border-white/10">
                        <div class="w-8 h-8 mx-auto mb-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="#3b82f6">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm4.59-12.42L10 14.17l-2.59-2.58L6 13l4 4 8-8z"/>
                            </svg>
                        </div>
                        <h4 class="font-semibold text-white text-sm mb-4">Duplicate Detection</h4>
                        <p class="text-xs text-white/60">Blocks unauthorized copies automatically</p>
                    </div>
                    
                    <div class="text-center p-12 rounded-lg bg-white/5 border border-white/10">
                        <div class="w-8 h-8 mx-auto mb-8 rounded-full bg-green-500/20 flex items-center justify-center">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="#10b981">
                                <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1Z"/>
                            </svg>
                        </div>
                        <h4 class="font-semibold text-white text-sm mb-4">Immutable Proof</h4>
                        <p class="text-xs text-white/60">Blockchain-level ownership timestamp</p>
                    </div>
                </div>
            </div>
            
            <div class="mb-20">
                <label class="block text-sm font-medium text-white mb-8">Playback URL (Required)</label>
                <input type="url" id="guidance-playback-url" placeholder="https://soundcloud.com/your-track" class="w-full px-12 py-10 rounded-lg text-sm" style="background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); color: white;" />
                <p class="text-xs text-white/60 mt-6">Provide a streaming URL (SoundCloud, YouTube, etc.) for audio analysis</p>
            </div>
            
            <div class="flex gap-12">
                <button type="button" id="guidance-cancel" class="flex-1 px-16 py-10 rounded-lg font-medium text-sm transition-colors" style="background: rgba(255, 255, 255, 0.1); color: white; border: 1px solid rgba(255, 255, 255, 0.2);">
                    Cancel
                </button>
                <button type="button" id="guidance-continue" class="flex-1 px-16 py-10 rounded-lg font-medium text-sm text-white transition-all" style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);">
                    Continue
                </button>
            </div>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // Animate in
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            modal.style.transform = 'translateY(0)';
        });
        
        // Event listeners
        const cancelBtn = modal.querySelector('#guidance-cancel');
        const continueBtn = modal.querySelector('#guidance-continue');
        const urlInput = modal.querySelector('#guidance-playback-url');
        
        // Pre-fill URL if available
        const existingUrlInput = document.querySelector('input[name="src"]');
        if (existingUrlInput && existingUrlInput.value) {
            urlInput.value = existingUrlInput.value;
        }
        
        cancelBtn.addEventListener('click', removeFingerprintGuidance);
        
        continueBtn.addEventListener('click', () => {
            const url = urlInput.value.trim();
            if (!url) {
                urlInput.style.borderColor = '#ef4444';
                urlInput.focus();
                return;
            }
            
            // Update the main form's URL field
            if (existingUrlInput) {
                existingUrlInput.value = url;
                existingUrlInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
            
            removeFingerprintGuidance();
            
            // Highlight the playback URL field briefly
            highlightPlaybackURLField();
            
            // Start fingerprinting process
            const track_id = window.getTrackId ? window.getTrackId() : null;
            if (track_id) {
                setTimeout(() => {
                    startFingerprintingProcess(null, track_id, true);
                }, 500);
            }
        });
        
        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                removeFingerprintGuidance();
            }
        });
        
        // Close on Escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                removeFingerprintGuidance();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
        
        // Focus the URL input
        setTimeout(() => urlInput.focus(), 300);
    }

    function removeFingerprintGuidance() {
        const overlay = document.getElementById('fingerprint-guidance-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            }, 300);
        }
    }

    function highlightPlaybackURLField() {
        const playbackInput = document.querySelector('input[name="src"]');
        if (playbackInput) {
            const originalStyle = playbackInput.style.cssText;
            playbackInput.style.cssText += `
                border: 2px solid #3b82f6 !important;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2) !important;
                transition: all 0.3s ease !important;
            `;
            
            setTimeout(() => {
                playbackInput.style.cssText = originalStyle;
            }, 2000);
        }
    }

    function removePlaybackURLHighlight() {
        const playbackInput = document.querySelector('input[name="src"]');
        if (playbackInput) {
            playbackInput.style.border = '';
            playbackInput.style.boxShadow = '';
        }
    }

    // ---------------------------
    // Dashboard Rendering Functions
    // ---------------------------

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
        requirementsSubtitle.textContent = 'These fields help BeatPassID create a more accurate acoustic fingerprint for your track';
        
        requirementsHeader.appendChild(requirementsTitle);
        requirementsHeader.appendChild(requirementsSubtitle);
        
        // Metadata completion status bar
        const completionBar = document.createElement('div');
        completionBar.className = 'mb-20';
        
        const completionLabel = document.createElement('div');
        completionLabel.className = 'flex items-center justify-between mb-8';
        
        const completionText = document.createElement('span');
        completionText.className = 'text-sm font-medium text-white';
        completionText.textContent = 'Metadata Completion';
        
        const completionPercentage = document.createElement('span');
        completionPercentage.className = 'text-sm font-bold text-white';
        const completedFields = [metadata.hasKey, metadata.hasScale, metadata.hasBPM].filter(Boolean).length;
        const completionPercent = Math.round((completedFields / 3) * 100);
        completionPercentage.textContent = `${completionPercent}%`;
        
        completionLabel.appendChild(completionText);
        completionLabel.appendChild(completionPercentage);
        
        const completionTrack = document.createElement('div');
        completionTrack.className = 'w-full bg-white/10 rounded-full h-3 overflow-hidden';
        
        const completionFill = document.createElement('div');
        completionFill.className = 'h-3 rounded-full transition-all duration-500';
        completionFill.style.cssText = `
            width: ${completionPercent}%;
            background: linear-gradient(90deg, #ef4444 0%, #f59e0b 50%, #10b981 100%);
            box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
        `;
        
        completionTrack.appendChild(completionFill);
        completionBar.appendChild(completionLabel);
        completionBar.appendChild(completionTrack);
        
        // Enhanced metadata fields with status indicators
        const metadataGrid = document.createElement('div');
        metadataGrid.className = 'grid grid-cols-1 md:grid-cols-3 gap-12 mb-20';
        
        const fields = [
            {
                name: 'Key',
                value: metadata.key,
                hasValue: metadata.hasKey,
                source: metadata.sources.key,
                description: 'Musical key (e.g., C, G#, Bb)',
                icon: 'music_note'
            },
            {
                name: 'Scale',
                value: metadata.scale,
                hasValue: metadata.hasScale,
                source: metadata.sources.scale,
                description: 'Major or Minor scale',
                icon: 'tune'
            },
            {
                name: 'BPM',
                value: metadata.bpm,
                hasValue: metadata.hasBPM,
                source: metadata.sources.bpm,
                description: 'Beats per minute (40-300)',
                icon: 'speed'
            }
        ];
        
        fields.forEach(field => {
            const fieldElement = createEnhancedMetadataField(field);
            metadataGrid.appendChild(fieldElement);
        });
        
        requirementsSection.appendChild(requirementsHeader);
        requirementsSection.appendChild(completionBar);
        requirementsSection.appendChild(metadataGrid);
        
        // Enhanced explanation section
        const explanationSection = document.createElement('div');
        explanationSection.className = 'mt-20 p-16 rounded-lg';
        explanationSection.style.cssText = `
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%);
            border: 1px solid rgba(59, 130, 246, 0.2);
        `;
        
        const explanationTitle = document.createElement('h6');
        explanationTitle.className = 'font-bold text-white mb-12 flex items-center gap-8';
        explanationTitle.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#3b82f6">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
            </svg>
            Why Metadata Powers BeatPassID
        `;
        
        const explanationGrid = document.createElement('div');
        explanationGrid.className = 'grid grid-cols-1 md:grid-cols-2 gap-12';
        
        const explanationPoints = [
            {
                title: 'Acoustic Precision',
                description: 'Key and scale data helps our AI understand your track\'s harmonic structure for more accurate fingerprinting',
                icon: 'precision_manufacturing',
                color: '#3b82f6'
            },
            {
                title: 'Duplicate Prevention',
                description: 'BPM information enables detection of tempo-shifted copies and unauthorized remixes',
                icon: 'block',
                color: '#ef4444'
            },
            {
                title: 'Sample-Safe™ Compliance',
                description: 'Complete metadata ensures your producer warranty covers all aspects of the track',
                icon: 'verified_user',
                color: '#10b981'
            },
            {
                title: 'Discovery Enhancement',
                description: 'Rich metadata improves track discoverability and helps buyers find exactly what they need',
                icon: 'search',
                color: '#8b5cf6'
            }
        ];
        
        explanationPoints.forEach(point => {
            const pointElement = document.createElement('div');
            pointElement.className = 'flex items-start gap-12';
            
            const pointIcon = document.createElement('div');
            pointIcon.className = 'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center';
            pointIcon.style.cssText = `background: ${point.color}20; border: 1px solid ${point.color}30;`;
            pointIcon.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="${point.color}">
                    <circle cx="12" cy="12" r="8"/>
                </svg>
            `;
            
            const pointText = document.createElement('div');
            pointText.innerHTML = `
                <div class="font-semibold text-white text-sm mb-1">${point.title}</div>
                <div class="text-xs text-white/70 leading-relaxed">${point.description}</div>
            `;
            
            pointElement.appendChild(pointIcon);
            pointElement.appendChild(pointText);
            explanationGrid.appendChild(pointElement);
        });
        
        explanationSection.appendChild(explanationTitle);
        explanationSection.appendChild(explanationGrid);
        
        container.appendChild(progressHeader);
        container.appendChild(requirementsSection);
        container.appendChild(explanationSection);
        content.appendChild(container);
    }

    function renderScanState(content, urlChanged = false) {
        content.innerHTML = '';
        
        const container = document.createElement('div');
        container.className = 'p-16 space-y-16';
        
        // Progress header
        const progressHeader = document.createElement('div');
        progressHeader.className = 'text-center mb-20';
        
        const progressTitle = document.createElement('h4');
        progressTitle.className = 'font-bold text-white mb-8 text-lg';
        progressTitle.textContent = urlChanged ? 'Step 3: Audio URL Updated' : 'Step 3: Ready to Generate Fingerprint';
        
        const progressSubtitle = document.createElement('p');
        progressSubtitle.className = 'text-sm text-white/80 mb-16';
        progressSubtitle.textContent = urlChanged ? 
            'Your audio URL has changed. Generate a new fingerprint to maintain protection.' :
            'All requirements met! Generate your track\'s unique acoustic DNA.';
        
        // Enhanced progress bar
        const progressWrapper = document.createElement('div');
        progressWrapper.className = 'relative mb-16';
        
        const progressTrack = document.createElement('div');
        progressTrack.className = 'w-full bg-white/10 rounded-full h-4 relative overflow-hidden';
        
        const progressFill = document.createElement('div');
        progressFill.className = 'h-4 rounded-full transition-all duration-500';
        progressFill.style.cssText = `
            width: 75%;
            background: linear-gradient(90deg, #3b82f6 0%, #10b981 50%, #8b5cf6 100%);
            box-shadow: 0 0 12px rgba(139, 92, 246, 0.5);
        `;
        
        progressTrack.appendChild(progressFill);
        progressWrapper.appendChild(progressTrack);
        
        progressHeader.appendChild(progressTitle);
        progressHeader.appendChild(progressSubtitle);
        progressHeader.appendChild(progressWrapper);
        
        // Generate button with enhanced styling
        const generateSection = document.createElement('div');
        generateSection.className = 'text-center mb-20';
        
        const generateButton = document.createElement('button');
        generateButton.type = 'button';
        generateButton.className = 'inline-flex items-center gap-12 px-24 py-12 rounded-lg font-semibold text-white transition-all duration-300 hover:scale-105 active:scale-95';
        generateButton.style.cssText = `
            background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%);
            box-shadow: 0 8px 24px rgba(139, 92, 246, 0.4);
            border: none;
        `;
        
        generateButton.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1M10 17L6 13L7.41 11.59L10 14.17L16.59 7.58L18 9L10 17Z"/>
            </svg>
            <span>${urlChanged ? 'Regenerate Fingerprint' : 'Generate Fingerprint'}</span>
        `;
        
        generateButton.addEventListener('click', () => {
            const track_id = window.getTrackId ? window.getTrackId() : null;
            if (track_id) {
                startFingerprintingProcess(generateButton, track_id, true);
            }
        });
        
        generateSection.appendChild(generateButton);
        
        // Enhanced explanation of what fingerprinting does
        const explanationSection = document.createElement('div');
        explanationSection.className = 'p-16 rounded-lg';
        explanationSection.style.cssText = `
            background: linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%);
            border: 1px solid rgba(139, 92, 246, 0.2);
        `;
        
        const explanationTitle = document.createElement('h6');
        explanationTitle.className = 'font-bold text-white mb-16 text-center';
        explanationTitle.textContent = 'What Happens During Fingerprinting?';
        
        const explanationGrid = document.createElement('div');
        explanationGrid.className = 'grid grid-cols-1 md:grid-cols-2 gap-16';
        
        const processes = [
            {
                title: 'Creates Acoustic DNA',
                description: 'AI analyzes your track\'s unique sound patterns and creates an unbreakable cryptographic fingerprint',
                icon: 'fingerprint',
                color: '#8b5cf6'
            },
            {
                title: 'Enables Duplicate Detection',
                description: 'Automatically blocks unauthorized copies, remixes, and tempo-shifted versions across the platform',
                icon: 'block',
                color: '#ef4444'
            },
            {
                title: 'Activates Sample-Safe™ Warranty',
                description: 'You warrant to buyers that all samples are cleared and the track is safe for commercial use',
                icon: 'verified_user',
                color: '#10b981'
            },
            {
                title: 'Provides Timestamp Proof',
                description: 'Creates immutable blockchain-level proof of when your track was first uploaded and protected',
                icon: 'schedule',
                color: '#3b82f6'
            }
        ];
        
        processes.forEach(process => {
            const processElement = document.createElement('div');
            processElement.className = 'flex items-start gap-12 p-12 rounded-lg bg-white/5 border border-white/10';
            
            const processIcon = document.createElement('div');
            processIcon.className = 'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center';
            processIcon.style.cssText = `background: ${process.color}20; border: 1px solid ${process.color}30;`;
            processIcon.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="${process.color}">
                    <circle cx="12" cy="12" r="10"/>
                </svg>
            `;
            
            const processText = document.createElement('div');
            processText.innerHTML = `
                <div class="font-semibold text-white text-sm mb-2">${process.title}</div>
                <div class="text-xs text-white/70 leading-relaxed">${process.description}</div>
            `;
            
            processElement.appendChild(processIcon);
            processElement.appendChild(processText);
            explanationGrid.appendChild(processElement);
        });
        
        explanationSection.appendChild(explanationTitle);
        explanationSection.appendChild(explanationGrid);
        
        container.appendChild(progressHeader);
        container.appendChild(generateSection);
        container.appendChild(explanationSection);
        content.appendChild(container);
    }

    function renderProcessingState(content, message = 'Processing...') {
        content.innerHTML = '';
        
        const container = document.createElement('div');
        container.className = 'p-20 text-center space-y-16';
        
        // Animated processing indicator
        const processingIndicator = document.createElement('div');
        processingIndicator.className = 'flex items-center justify-center mb-16';
        
        const spinner = document.createElement('div');
        spinner.className = 'w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin';
        
        processingIndicator.appendChild(spinner);
        
        const processingTitle = document.createElement('h4');
        processingTitle.className = 'font-bold text-white text-lg mb-8';
        processingTitle.textContent = 'Generating BeatPassID...';
        
        const processingMessage = document.createElement('p');
        processingMessage.className = 'text-sm text-white/80';
        processingMessage.textContent = message;
        
        container.appendChild(processingIndicator);
        container.appendChild(processingTitle);
        container.appendChild(processingMessage);
        content.appendChild(container);
    }

    function renderFingerprintedState(content, statusInfo, currentURL) {
        content.innerHTML = '';
        
        const container = document.createElement('div');
        container.className = 'p-16 space-y-16';
        
        // Determine status and styling
        let statusType, statusMessage, statusColor, statusIcon;
        
        if (statusInfo.isDuplicate && statusInfo.isAuthentic) {
            statusType = 'authentic';
            statusMessage = 'Authentic Original - Duplicates Blocked';
            statusColor = '#10b981';
            statusIcon = 'verified_user';
        } else if (statusInfo.isDuplicate && !statusInfo.isAuthentic) {
            statusType = 'violation';
            statusMessage = 'Terms of Service Violation';
            statusColor = '#ef4444';
            statusIcon = 'block';
        } else {
            statusType = 'unique';
            statusMessage = 'Unique Track - Protection Active';
            statusColor = '#10b981';
            statusIcon = 'shield';
        }
        
        // Success header with dynamic styling
        const successHeader = document.createElement('div');
        successHeader.className = 'text-center mb-20';
        
        const successIcon = document.createElement('div');
        successIcon.className = 'inline-flex items-center justify-center w-16 h-16 rounded-full mb-12';
        successIcon.style.cssText = `
            background: linear-gradient(135deg, ${statusColor} 0%, ${statusColor}CC 100%);
            box-shadow: 0 8px 24px ${statusColor}40;
        `;
        successIcon.innerHTML = `
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1M10 17L6 13L7.41 11.59L10 14.17L16.59 7.58L18 9L10 17Z"/>
            </svg>
        `;
        
        const successTitle = document.createElement('h4');
        successTitle.className = 'font-bold text-white text-lg mb-8';
        successTitle.textContent = statusMessage;
        
        const successSubtitle = document.createElement('p');
        successSubtitle.className = 'text-sm text-white/80';
        successSubtitle.textContent = statusType === 'unique' ? 
            'Your track now has unbreakable digital DNA protection' :
            statusType === 'authentic' ?
            'Original track detected with duplicate protection enabled' :
            'Duplicate content violates platform terms of service';
        
        successHeader.appendChild(successIcon);
        successHeader.appendChild(successTitle);
        successHeader.appendChild(successSubtitle);
        
        // Tab navigation for fingerprint data
        const tabContainer = document.createElement('div');
        tabContainer.className = 'mb-20';
        
        const tabNav = document.createElement('div');
        tabNav.className = 'flex border-b border-white/20 mb-16';
        
        const hashTab = document.createElement('button');
        hashTab.type = 'button';
        hashTab.className = 'px-16 py-8 text-sm font-medium text-white border-b-2 border-blue-500 bg-blue-500/10';
        hashTab.textContent = 'Cryptographic Hash';
        
        const fullTab = document.createElement('button');
        fullTab.type = 'button';
        fullTab.className = 'px-16 py-8 text-sm font-medium text-white/60 border-b-2 border-transparent hover:text-white hover:border-white/20';
        fullTab.textContent = 'Full Fingerprint';
        
        tabNav.appendChild(hashTab);
        tabNav.appendChild(fullTab);
        
        const tabContent = document.createElement('div');
        tabContent.className = 'p-12 rounded-lg bg-white/5 border border-white/10';
        
        // Hash content (default)
        const hashContent = document.createElement('div');
        hashContent.id = 'hash-content';
        hashContent.innerHTML = `
            <div class="font-mono text-xs text-white/90 break-all leading-relaxed">
                ${statusInfo.fingerprint_hash || 'Hash not available'}
            </div>
            <div class="text-xs text-white/60 mt-8">
                SHA-256 cryptographic hash of acoustic fingerprint
            </div>
        `;
        
        // Full fingerprint content (hidden by default)
        const fullContent = document.createElement('div');
        fullContent.id = 'full-content';
        fullContent.style.display = 'none';
        fullContent.innerHTML = `
            <div class="font-mono text-xs text-white/90 break-all leading-relaxed max-h-32 overflow-y-auto">
                ${statusInfo.fingerprint || 'Fingerprint not available'}
            </div>
            <div class="text-xs text-white/60 mt-8">
                Complete acoustic fingerprint data (spectral analysis)
            </div>
        `;
        
        tabContent.appendChild(hashContent);
        tabContent.appendChild(fullContent);
        
        // Tab switching functionality
        hashTab.addEventListener('click', () => {
            hashTab.className = 'px-16 py-8 text-sm font-medium text-white border-b-2 border-blue-500 bg-blue-500/10';
            fullTab.className = 'px-16 py-8 text-sm font-medium text-white/60 border-b-2 border-transparent hover:text-white hover:border-white/20';
            hashContent.style.display = 'block';
            fullContent.style.display = 'none';
        });
        
        fullTab.addEventListener('click', () => {
            fullTab.className = 'px-16 py-8 text-sm font-medium text-white border-b-2 border-blue-500 bg-blue-500/10';
            hashTab.className = 'px-16 py-8 text-sm font-medium text-white/60 border-b-2 border-transparent hover:text-white hover:border-white/20';
            fullContent.style.display = 'block';
            hashContent.style.display = 'none';
        });
        
        tabContainer.appendChild(tabNav);
        tabContainer.appendChild(tabContent);
        
        // Protection status details
        const protectionSection = document.createElement('div');
        protectionSection.className = 'p-16 rounded-lg';
        protectionSection.style.cssText = `
            background: linear-gradient(135deg, ${statusColor}15 0%, ${statusColor}08 100%);
            border: 1px solid ${statusColor}30;
        `;
        
        if (statusType === 'authentic' && statusInfo.duplicateCount > 0) {
            // Show information about detected duplicates
            protectionSection.innerHTML = `
                <h6 class="font-bold text-white mb-12 flex items-center gap-8">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="${statusColor}">
                        <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1M10 17L6 13L7.41 11.59L10 14.17L16.59 7.58L18 9L10 17Z"/>
                    </svg>
                    Authentic Original Detected
                </h6>
                <div class="text-sm text-white/80 leading-relaxed mb-12">
                    Your track has been verified as the authentic original. We've detected and blocked <strong>${statusInfo.duplicateCount}</strong> unauthorized ${statusInfo.duplicateCount === 1 ? 'copy' : 'copies'} from being uploaded to the platform.
                </div>
                <div class="text-xs text-white/70 leading-relaxed">
                    <strong>Sample-Safe™ Warranty Active:</strong> You warrant to buyers that all samples in this track are properly cleared and licensed, making it safe for commercial use without copyright infringement risk.
                </div>
            `;
        } else if (statusType === 'violation') {
            // Show ToS violation information
            protectionSection.innerHTML = `
                <h6 class="font-bold text-white mb-12 flex items-center gap-8">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="${statusColor}">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.58L19 8l-9 9z"/>
                    </svg>
                    Terms of Service Violation
                </h6>
                <div class="text-sm text-white/80 leading-relaxed mb-12">
                    This track contains duplicate content that violates our platform's Terms of Service. Duplicate uploads are not permitted for the following reasons:
                </div>
                <div class="space-y-8 text-xs text-white/70 leading-relaxed">
                    <div class="flex items-start gap-8">
                        <div class="w-4 h-4 rounded-full bg-red-500/30 border border-red-500/50 flex-shrink-0 mt-1"></div>
                        <div><strong>Exclusive Licensing Conflicts:</strong> Multiple identical tracks can create legal complications for exclusive licensing agreements</div>
                    </div>
                    <div class="flex items-start gap-8">
                        <div class="w-4 h-4 rounded-full bg-red-500/30 border border-red-500/50 flex-shrink-0 mt-1"></div>
                        <div><strong>Customer Confusion:</strong> Duplicate listings confuse buyers and dilute the value of original content</div>
                    </div>
                    <div class="flex items-start gap-8">
                        <div class="w-4 h-4 rounded-full bg-red-500/30 border border-red-500/50 flex-shrink-0 mt-1"></div>
                        <div><strong>Platform Integrity:</strong> Our Sample-Safe™ guarantee requires unique, original content to maintain trust</div>
                    </div>
                </div>
            `;
            
            // Show original track information if available
            if (statusInfo.duplicateInfo && Object.keys(statusInfo.duplicateInfo).length > 0) {
                const originalInfo = statusInfo.duplicateInfo;
                let trackName = 'Unknown Track';
                let uploadDate = 'Unknown Date';
                let producer = 'Unknown Producer';
                
                // Try to extract track information from various possible data structures
                if (originalInfo.track_name) {
                    trackName = originalInfo.track_name;
                } else if (originalInfo.name) {
                    trackName = originalInfo.name;
                } else if (originalInfo.title) {
                    trackName = originalInfo.title;
                }
                
                if (originalInfo.upload_date) {
                    uploadDate = new Date(originalInfo.upload_date).toLocaleDateString();
                } else if (originalInfo.created_at) {
                    uploadDate = new Date(originalInfo.created_at).toLocaleDateString();
                } else if (originalInfo.date) {
                    uploadDate = new Date(originalInfo.date).toLocaleDateString();
                }
                
                if (originalInfo.producer_name) {
                    producer = originalInfo.producer_name;
                } else if (originalInfo.producer) {
                    producer = originalInfo.producer;
                } else if (originalInfo.artist) {
                    producer = originalInfo.artist;
                } else if (originalInfo.user_name) {
                    producer = originalInfo.user_name;
                }
                
                const originalTrackInfo = document.createElement('div');
                originalTrackInfo.className = 'mt-16 p-12 rounded-lg bg-white/5 border border-white/10';
                originalTrackInfo.innerHTML = `
                    <div class="text-xs font-medium text-white/90 mb-8">Original Track Information:</div>
                    <div class="space-y-4 text-xs text-white/70">
                        <div><strong>Track:</strong> ${trackName}</div>
                        <div><strong>Upload Date:</strong> ${uploadDate}</div>
                        <div><strong>Producer:</strong> ${producer}</div>
                        ${originalInfo.track_id ? `<div><strong>Track ID:</strong> ${originalInfo.track_id}</div>` : ''}
                    </div>
                `;
                
                protectionSection.appendChild(originalTrackInfo);
            }
        } else {
            // Show unique track protection information
            protectionSection.innerHTML = `
                <h6 class="font-bold text-white mb-12 flex items-center gap-8">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="${statusColor}">
                        <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1M10 17L6 13L7.41 11.59L10 14.17L16.59 7.58L18 9L10 17Z"/>
                    </svg>
                    BeatPassID Protection Active
                </h6>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-12 text-sm">
                    <div class="space-y-8">
                        <div class="flex items-center gap-8 text-white/80">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="#10b981">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                            </svg>
                            <span>Unique acoustic DNA created</span>
                        </div>
                        <div class="flex items-center gap-8 text-white/80">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="#10b981">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                            </svg>
                            <span>Duplicate detection enabled</span>
                        </div>
                    </div>
                    <div class="space-y-8">
                        <div class="flex items-center gap-8 text-white/80">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="#10b981">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                            </svg>
                            <span>Sample-Safe™ warranty active</span>
                        </div>
                        <div class="flex items-center gap-8 text-white/80">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="#10b981">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                            </svg>
                            <span>Immutable timestamp proof</span>
                        </div>
                    </div>
                </div>
                <div class="text-xs text-white/70 leading-relaxed mt-12 pt-12 border-t border-white/10">
                    <strong>Sample-Safe™ Producer Warranty:</strong> By activating BeatPassID, you warrant to buyers that all samples in this track are properly cleared and licensed, making it safe for commercial use without copyright infringement risk.
                </div>
            `;
        }
        
        container.appendChild(successHeader);
        container.appendChild(tabContainer);
        container.appendChild(protectionSection);
        content.appendChild(container);
    }

    function renderFingerprintFailureState(content, submitResult) {
        content.innerHTML = '';
        
        const container = document.createElement('div');
        container.className = 'p-16 space-y-16';
        
        // Failure header
        const failureHeader = document.createElement('div');
        failureHeader.className = 'text-center mb-20';
        
        const failureIcon = document.createElement('div');
        failureIcon.className = 'inline-flex items-center justify-center w-16 h-16 rounded-full mb-12';
        failureIcon.style.cssText = `
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            box-shadow: 0 8px 24px rgba(239, 68, 68, 0.4);
        `;
        failureIcon.innerHTML = `
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.58L19 8l-9 9z"/>
            </svg>
        `;
        
        const failureTitle = document.createElement('h4');
        failureTitle.className = 'font-bold text-white text-lg mb-8';
        failureTitle.textContent = 'Duplicate Track Detected';
        
        const failureSubtitle = document.createElement('p');
        failureSubtitle.className = 'text-sm text-white/80';
        failureSubtitle.textContent = 'This track already exists on our platform';
        
        failureHeader.appendChild(failureIcon);
        failureHeader.appendChild(failureTitle);
        failureHeader.appendChild(failureSubtitle);
        
        // Original track information
        if (submitResult.duplicateInfo && Object.keys(submitResult.duplicateInfo).length > 0) {
            const originalInfo = submitResult.duplicateInfo;
            let trackName = 'Unknown Track';
            let uploadDate = 'Unknown Date';
            let producer = 'Unknown Producer';
            let trackLink = null;
            
            // Extract information from duplicate info
            if (originalInfo.track_name) trackName = originalInfo.track_name;
            else if (originalInfo.name) trackName = originalInfo.name;
            else if (originalInfo.title) trackName = originalInfo.title;
            
            if (originalInfo.upload_date) uploadDate = new Date(originalInfo.upload_date).toLocaleDateString();
            else if (originalInfo.created_at) uploadDate = new Date(originalInfo.created_at).toLocaleDateString();
            
            if (originalInfo.producer_name) producer = originalInfo.producer_name;
            else if (originalInfo.producer) producer = originalInfo.producer;
            else if (originalInfo.artist) producer = originalInfo.artist;
            
            if (originalInfo.track_id) {
                trackLink = `/track/${originalInfo.track_id}`;
            }
            
            const originalTrackSection = document.createElement('div');
            originalTrackSection.className = 'p-16 rounded-lg';
            originalTrackSection.style.cssText = `
                background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%);
                border: 1px solid rgba(239, 68, 68, 0.3);
            `;
            
            originalTrackSection.innerHTML = `
                <h6 class="font-bold text-white mb-12 flex items-center gap-8">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#ef4444">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                    </svg>
                    Original Track Information
                </h6>
                <div class="space-y-8 text-sm text-white/80 mb-16">
                    <div><strong>Track Name:</strong> ${trackName}</div>
                    <div><strong>Upload Date:</strong> ${uploadDate}</div>
                    <div><strong>Producer:</strong> ${producer}</div>
                    ${trackLink ? `<div><a href="${trackLink}" class="text-blue-400 hover:text-blue-300 underline" target="_blank">View Original Track</a></div>` : ''}
                </div>
                <div class="text-xs text-white/70 leading-relaxed">
                    <strong>Why This Failed:</strong> Our platform maintains strict duplicate content policies to ensure:
                    <ul class="list-disc list-inside mt-4 space-y-2 ml-4">
                        <li>Platform integrity and trust</li>
                        <li>Sample-Safe™ compliance</li>
                        <li>Clear exclusive licensing rights</li>
                        <li>Protection of original creators</li>
                    </ul>
                </div>
            `;
            
            container.appendChild(originalTrackSection);
        }
        
        container.insertBefore(failureHeader, container.firstChild);
        content.appendChild(container);
    }

    // Helper functions for creating UI elements
    function createProcessStep(number, title, description, isActive = false) {
        const step = document.createElement('div');
        step.className = `flex items-start gap-12 ${isActive ? 'opacity-100' : 'opacity-60'}`;
        
        const stepNumber = document.createElement('div');
        stepNumber.className = `w-24 h-24 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isActive ? 'bg-blue-500 text-white' : 'bg-white/20 text-white/60'}`;
        stepNumber.textContent = number;
        
        const stepContent = document.createElement('div');
        stepContent.className = 'flex-1';
        
        const stepTitle = document.createElement('div');
        stepTitle.className = `font-medium text-sm ${isActive ? 'text-white' : 'text-white/70'} mb-4`;
        stepTitle.textContent = title;
        
        const stepDescription = document.createElement('div');
        stepDescription.className = `text-xs ${isActive ? 'text-white/80' : 'text-white/50'} leading-relaxed`;
        stepDescription.textContent = description;
        
        stepContent.appendChild(stepTitle);
        stepContent.appendChild(stepDescription);
        step.appendChild(stepNumber);
        step.appendChild(stepContent);
        
        return step;
    }

    function createEnhancedProcessStep(number, title, description, technicalDetails, isActive = false, isCompleted = false) {
        const step = document.createElement('div');
        step.className = `relative p-16 rounded-lg border transition-all duration-300 ${
            isActive ? 'border-blue-500/50 bg-blue-500/10' : 
            isCompleted ? 'border-green-500/50 bg-green-500/10' : 
            'border-white/20 bg-white/5'
        }`;
        
        const stepHeader = document.createElement('div');
        stepHeader.className = 'flex items-center gap-12 mb-12';
        
        const stepNumber = document.createElement('div');
        stepNumber.className = `w-32 h-32 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
            isActive ? 'bg-blue-500 text-white' : 
            isCompleted ? 'bg-green-500 text-white' : 
            'bg-white/20 text-white/60'
        }`;
        
        if (isCompleted) {
            stepNumber.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
            `;
        } else {
            stepNumber.textContent = number;
        }
        
        const stepTitle = document.createElement('h6');
        stepTitle.className = `font-bold text-sm ${
            isActive ? 'text-white' : 
            isCompleted ? 'text-green-400' : 
            'text-white/70'
        }`;
        stepTitle.textContent = title;
        
        stepHeader.appendChild(stepNumber);
        stepHeader.appendChild(stepTitle);
        
        const stepDescription = document.createElement('p');
        stepDescription.className = `text-xs leading-relaxed mb-8 ${
            isActive ? 'text-white/80' : 
            isCompleted ? 'text-green-300/80' : 
            'text-white/50'
        }`;
        stepDescription.textContent = description;
        
        const stepTechnical = document.createElement('div');
        stepTechnical.className = `text-xs font-mono leading-relaxed ${
            isActive ? 'text-blue-300/70' : 
            isCompleted ? 'text-green-300/70' : 
            'text-white/40'
        }`;
        stepTechnical.textContent = technicalDetails;
        
        step.appendChild(stepHeader);
        step.appendChild(stepDescription);
        step.appendChild(stepTechnical);
        
        return step;
    }

    function createMetadataField(label, value, isComplete = false) {
        const field = document.createElement('div');
        field.className = 'flex items-center justify-between py-8 px-12 rounded-lg bg-white/5 border border-white/10';
        
        const fieldLabel = document.createElement('span');
        fieldLabel.className = 'text-sm text-white/80';
        fieldLabel.textContent = label;
        
        const fieldValue = document.createElement('div');
        fieldValue.className = 'flex items-center gap-8';
        
        const valueText = document.createElement('span');
        valueText.className = `text-sm font-medium ${
            isComplete ? 'text-green-400' : 'text-white/60'
        }`;
        valueText.textContent = value || 'Not set';
        
        const statusIcon = document.createElement('div');
        statusIcon.className = `w-16 h-16 rounded-full flex items-center justify-center ${
            isComplete ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/40'
        }`;
        statusIcon.innerHTML = isComplete ? 
            '<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>' :
            '<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>';
        
        fieldValue.appendChild(valueText);
        fieldValue.appendChild(statusIcon);
        field.appendChild(fieldLabel);
        field.appendChild(fieldValue);
        
        return field;
    }

    function createEnhancedMetadataField(label, value, isComplete = false, description = '') {
        const field = document.createElement('div');
        field.className = `p-12 rounded-lg border transition-all duration-300 ${
            isComplete ? 'border-green-500/30 bg-green-500/10' : 'border-white/20 bg-white/5'
        }`;
        
        const fieldHeader = document.createElement('div');
        fieldHeader.className = 'flex items-center justify-between mb-8';
        
        const fieldLabel = document.createElement('span');
        fieldLabel.className = `text-sm font-medium ${
            isComplete ? 'text-green-400' : 'text-white/80'
        }`;
        fieldLabel.textContent = label;
        
        const fieldStatus = document.createElement('div');
        fieldStatus.className = 'flex items-center gap-8';
        
        const progressRing = document.createElement('div');
        progressRing.className = `w-20 h-20 rounded-full flex items-center justify-center ${
            isComplete ? 'bg-green-500/20' : 'bg-white/10'
        }`;
        progressRing.innerHTML = isComplete ? 
            '<svg width="12" height="12" viewBox="0 0 24 24" fill="#10b981"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>' :
            '<svg width="12" height="12" viewBox="0 0 24 24" fill="#ffffff40"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>';
        
        fieldStatus.appendChild(progressRing);
        fieldHeader.appendChild(fieldLabel);
        fieldHeader.appendChild(fieldStatus);
        
        const fieldValue = document.createElement('div');
        fieldValue.className = `text-sm font-medium mb-4 ${
            isComplete ? 'text-white' : 'text-white/60'
        }`;
        fieldValue.textContent = value || 'Not set';
        
        const fieldDescription = document.createElement('div');
        fieldDescription.className = `text-xs leading-relaxed ${
            isComplete ? 'text-green-300/70' : 'text-white/50'
        }`;
        fieldDescription.textContent = description;
        
        field.appendChild(fieldHeader);
        field.appendChild(fieldValue);
        field.appendChild(fieldDescription);
        
        return field;
    }

    // Notification system
    function showNotification(message, type = 'info', duration = 5000) {
        // Remove any existing notifications
        const existingNotifications = document.querySelectorAll('.fingerprint-notification');
        existingNotifications.forEach(notification => notification.remove());
        
        const notification = document.createElement('div');
        notification.className = 'fingerprint-notification fixed top-20 right-20 z-50 max-w-sm p-16 rounded-lg shadow-lg border backdrop-blur-sm transition-all duration-300 transform translate-x-full';
        
        // Style based on type
        let bgColor, borderColor, textColor, icon;
        switch (type) {
            case 'success':
                bgColor = 'bg-green-900/90';
                borderColor = 'border-green-500/50';
                textColor = 'text-green-100';
                icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="#10b981"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
                break;
            case 'error':
                bgColor = 'bg-red-900/90';
                borderColor = 'border-red-500/50';
                textColor = 'text-red-100';
                icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="#ef4444"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
                break;
            case 'warning':
                bgColor = 'bg-yellow-900/90';
                borderColor = 'border-yellow-500/50';
                textColor = 'text-yellow-100';
                icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="#f59e0b"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>';
                break;
            default:
                bgColor = 'bg-blue-900/90';
                borderColor = 'border-blue-500/50';
                textColor = 'text-blue-100';
                icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="#3b82f6"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>';
        }
        
        notification.className += ` ${bgColor} ${borderColor} ${textColor}`;
        
        notification.innerHTML = `
            <div class="flex items-start gap-12">
                <div class="flex-shrink-0 mt-2">
                    ${icon}
                </div>
                <div class="flex-1">
                    <div class="text-sm font-medium leading-relaxed">
                        ${message}
                    </div>
                </div>
                <button type="button" class="flex-shrink-0 ml-8 p-4 rounded-full hover:bg-white/10 transition-colors" onclick="this.parentElement.parentElement.remove()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Auto remove after duration
        if (duration > 0) {
            setTimeout(() => {
                notification.style.transform = 'translateX(full)';
                setTimeout(() => {
                    if (notification.parentElement) {
                        notification.remove();
                    }
                }, 300);
            }, duration);
        }
    }

    // Test functions for debugging
    function testFingerprintFailureUI() {
        console.log('Testing fingerprint failure UI...');
        
        const mockSubmitResult = {
            success: false,
            isDuplicate: true,
            duplicateInfo: {
                track_name: 'Test Beat - Dark Trap',
                upload_date: '2024-01-15',
                producer_name: 'TestProducer',
                track_id: '12345'
            }
        };
        
        const dashboard = document.querySelector('.fingerprint-dashboard');
        if (dashboard) {
            const content = dashboard.querySelector('.dashboard-content');
            if (content) {
                renderFingerprintFailureState(content, mockSubmitResult);
                showNotification('Test failure UI rendered', 'info');
            }
        } else {
            showNotification('No fingerprint dashboard found', 'error');
        }
    }

    function testFingerprintDeletion() {
        console.log('Testing fingerprint deletion...');
        
        const trackId = getCurrentTrackId();
        if (trackId) {
            deleteFingerprintFromDatabase(trackId)
                .then(result => {
                    console.log('Deletion test result:', result);
                    showNotification('Fingerprint deletion test completed', 'success');
                })
                .catch(error => {
                    console.error('Deletion test error:', error);
                    showNotification('Fingerprint deletion test failed', 'error');
                });
        } else {
            showNotification('No track ID found for deletion test', 'warning');
        }
    }

    // Utility function to get current track ID
    function getCurrentTrackId() {
        // Try multiple methods to get track ID
        const urlParams = new URLSearchParams(window.location.search);
        const trackId = urlParams.get('track_id') || urlParams.get('id');
        
        if (trackId) return trackId;
        
        // Try to extract from URL path
        const pathMatch = window.location.pathname.match(/\/track\/(\d+)/);
        if (pathMatch) return pathMatch[1];
        
        // Try to find in form data
        const trackIdInput = document.querySelector('input[name="track_id"]');
        if (trackIdInput && trackIdInput.value) return trackIdInput.value;
        
        return null;
    }

    // Global exposure for external access
    window.FingerprintingSystem = {
        // Core fingerprinting functions
        generateFingerprint,
        submitFingerprint,
        deleteFingerprintFromDatabase,
        checkPlaybackURLStatus,
        
        // Dashboard management
        createFingerprintDashboard,
        removeFingerprintDashboard,
        injectFingerprintDashboard,
        debouncedInjectFingerprintDashboard,
        
        // Dashboard content management
        getMetadataCompleteness,
        updateDashboardContent,
        observePlaybackURLChanges,
        
        // Fingerprinting process
        startFingerprintingProcess,
        
        // User guidance
        showFingerprintGuidance,
        removeFingerprintGuidance,
        highlightPlaybackURLField,
        removePlaybackURLHighlight,
        
        // Dashboard rendering states
        renderNoURLState,
        renderIncompleteMetadataState,
        renderScanState,
        renderProcessingState,
        renderFingerprintedState,
        renderFingerprintFailureState,
        
        // Helper functions
        createProcessStep,
        createEnhancedProcessStep,
        createMetadataField,
        createEnhancedMetadataField,
        
        // Utilities
        showNotification,
        getCurrentTrackId,
        
        // Test functions
        testFingerprintFailureUI,
        testFingerprintDeletion
    };

    // Legacy global exposure for backward compatibility
    window.generateFingerprint = generateFingerprint;
    window.submitFingerprint = submitFingerprint;
    window.deleteFingerprintFromDatabase = deleteFingerprintFromDatabase;
    window.showFingerprintGuidance = showFingerprintGuidance;
    window.removeFingerprintGuidance = removeFingerprintGuidance;
    window.highlightPlaybackURLField = highlightPlaybackURLField;
    window.removePlaybackURLHighlight = removePlaybackURLHighlight;
    window.startFingerprintingProcess = startFingerprintingProcess;
    window.createFingerprintDashboard = createFingerprintDashboard;
    window.removeFingerprintDashboard = removeFingerprintDashboard;
    window.injectFingerprintDashboard = injectFingerprintDashboard;
    window.debouncedInjectFingerprintDashboard = debouncedInjectFingerprintDashboard;
    window.getMetadataCompleteness = getMetadataCompleteness;
    window.updateDashboardContent = updateDashboardContent;
    window.observePlaybackURLChanges = observePlaybackURLChanges;
    window.checkPlaybackURLStatus = checkPlaybackURLStatus;
    window.renderNoURLState = renderNoURLState;
    window.renderIncompleteMetadataState = renderIncompleteMetadataState;
    window.renderScanState = renderScanState;
    window.renderProcessingState = renderProcessingState;
    window.renderFingerprintedState = renderFingerprintedState;
    window.renderFingerprintFailureState = renderFingerprintFailureState;
    window.createProcessStep = createProcessStep;
    window.createEnhancedProcessStep = createEnhancedProcessStep;
    window.createMetadataField = createMetadataField;
    window.createEnhancedMetadataField = createEnhancedMetadataField;
    window.showNotification = showNotification;
    window.testFingerprintFailureUI = testFingerprintFailureUI;
    window.testFingerprintDeletion = testFingerprintDeletion;

    console.log('Fingerprinting System module loaded successfully');

})();