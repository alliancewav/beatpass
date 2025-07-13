// Form Injection Module - IIFE
// Handles form field injection, data management, and form lifecycle

(function() {
    'use strict';
    
    console.log('📋 Form Injection module loaded');
    
    // ---------------------------
    // Module State
    // ---------------------------
    
    let isFieldsInjected = false;
    let fieldsReady = false;
    
    // ---------------------------
    // Data Management for Upload/Edit Pages
    // ---------------------------
    
    function updatePendingCustomData() {
        if (!window.isUploadPage || !window.isUploadPage()) return;
        const keyName = document.getElementById('key_name')?.value.trim() || '';
        const scale = document.getElementById('scale')?.value.trim() || '';
        const bpm = document.getElementById('bpm')?.value.trim() || '';
        const trackName = window.getTrackName ? window.getTrackName() : '';
        const duration = window.getDuration ? window.getDuration() : null;
        const producers = window.getProducers ? window.getProducers() : '';
        const tags = window.getTags ? window.getTags() : '';
        
        // Get exclusive licensing data
        const { licensing_type, exclusive_price, exclusive_currency, exclusive_status, exclusive_buyer_info } = 
            window.getExclusiveLicensingData ? window.getExclusiveLicensingData() : {
                licensing_type: 'non_exclusive_only',
                exclusive_price: '',
                exclusive_currency: 'USD',
                exclusive_status: 'not_available',
                exclusive_buyer_info: ''
            };
        
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
        const trackId = window.getTrackId ? window.getTrackId() : null;
        const trackName = window.getTrackName ? window.getTrackName() : null;
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
            const API_URL = window.API_URL || 'https://open.beatpass.ca/key_bpm_handler.php';
            const res = await fetch(`${API_URL}?${params}`);
            const data = await res.json();
            if (data.status === 'success' && data.data) {
                window.customRecord = data.data;
                injectCustomFields(data.data);
            } else {
                window.customRecord = null;
                if (window.debouncedInjectCustomFields) {
                    window.debouncedInjectCustomFields();
                } else {
                    injectCustomFields();
                }
            }
        } catch (err) {
            console.error("Error fetching custom data:", err);
            window.customRecord = null;
            if (window.debouncedInjectCustomFields) {
                window.debouncedInjectCustomFields();
            } else {
                injectCustomFields();
            }
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
                            if (window.debouncedInjectCustomFields) {
                                window.debouncedInjectCustomFields(existingData);
                            } else {
                                injectCustomFields(existingData);
                            }
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
        const keyField = window.createDropdownField ? window.createDropdownField(
            'Key', 'key_name', 'Select Key',
            ['C', 'C# / D♭', 'D', 'D# / E♭', 'E', 'F', 'F# / G♭', 'G', 'G# / A♭', 'A', 'A# / B♭', 'B'],
            existingData.key_name
        ) : document.createElement('div');
        
        const scaleField = window.createDropdownField ? window.createDropdownField(
            'Scale', 'scale', 'Select Scale',
            ['Major', 'Minor'],
            existingData.scale
        ) : document.createElement('div');
        
        const bpmField = window.createBPMField ? window.createBPMField(existingData.bpm) : document.createElement('div');
        
        // Remove the bottom margin from individual fields since they're in a row
        keyField.classList.remove('mb-24');
        scaleField.classList.remove('mb-24');
        bpmField.classList.remove('mb-24');
        
        console.log("📦 Assembling field layout...");
        metadataRow.appendChild(keyField);
        metadataRow.appendChild(scaleField);
        metadataRow.appendChild(bpmField);
        
        container.appendChild(metadataRow);
        
        // Add Exclusive Licensing Section for both upload and edit pages
        if (window.createExclusiveLicensingSection) {
            const exclusiveLicensingSection = window.createExclusiveLicensingSection(existingData);
            container.appendChild(exclusiveLicensingSection);
        }
        
        // Add Sample-Safe™ banner for upload pages
        if (window.isUploadPage && window.isUploadPage() && window.createSampleSafeBanner) {
            const sampleSafeBanner = window.createSampleSafeBanner();
            container.appendChild(sampleSafeBanner);
        }
        
        console.log("📍 Inserting container into DOM...");
        // Insert after the name field, respecting native form layout
        try {
            nameField.parentNode.insertBefore(container, nameField.nextSibling);
            console.log("✅ Custom fields container successfully inserted into DOM");
            
            // Animate in after a brief delay
            setTimeout(() => {
                container.style.opacity = '1';
                container.style.transform = 'translateY(0)';
                fieldsReady = true;
                isFieldsInjected = true;
                console.log("🎉 Custom fields animation complete - fields ready!");
            }, 50);
            
        } catch (error) {
            console.error("❌ Failed to insert custom fields container:", error);
        }
    }
    
    // ---------------------------
    // Global Exposure
    // ---------------------------
    
    // Expose functions to window object for cross-module access
    window.updatePendingCustomData = updatePendingCustomData;
    window.clearCustomFields = clearCustomFields;
    window.fetchExistingCustomData = fetchExistingCustomData;
    window.injectCustomFields = injectCustomFields;
    
    // Expose state getters
    window.getFieldsInjected = () => isFieldsInjected;
    window.getFieldsReady = () => fieldsReady;
    
    console.log('✅ Form Injection functions exposed to window object');
    
})();