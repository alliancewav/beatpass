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
            
            if (DEBUG) console.log(`🚀 Initializing ${MODULE_NAME}`);
            
            // Setup real-time field validation
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', setupFieldValidation);
            } else {
                setupFieldValidation();
            }
            
            isInitialized = true;
            
            if (DEBUG) console.log(`✅ ${MODULE_NAME} initialized successfully`);
        },
        
        // Cleanup
        destroy() {
            isInitialized = false;
            if (DEBUG) console.log(`🧹 ${MODULE_NAME} destroyed`);
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

    if (DEBUG) console.log(`📦 ${MODULE_NAME} module loaded`);

})();