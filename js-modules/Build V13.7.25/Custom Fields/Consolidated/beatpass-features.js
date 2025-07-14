/**
 * Producer and Tags Manager - Standalone IIFE Module
 * Handles producer and tag data extraction, chip creation, and restoration
 * Zero dependencies - all utilities embedded
 */
(function() {
    'use strict';

    // Module constants
    const MODULE_NAME = 'BeatPassProducerTagsManager';
    const DEBUG = false; // Reduced logging for performance

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

    function waitForElement(selector, timeout = 10000) {
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

            function startObserving() {
                const target = document.body || document.documentElement;
                if (target) {
                    if (DEBUG) console.log('Starting MutationObserver for waitForElement');
                    observer.observe(target, {
                        childList: true,
                        subtree: true
                    });
                } else {
                    if (DEBUG) console.log('DOM not ready, retrying in 100ms');
                    setTimeout(startObserving, 100);
                }
            }

            startObserving();

            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Element ${selector} not found within ${timeout}ms`));
            }, timeout);
        });
    }

    // Page type checkers
    function isEditPage() {
        return window.location.pathname.includes('/edit');
    }

    function isUploadPage() {
        return window.location.pathname.includes('/upload');
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
        
        if (DEBUG) console.log("🎤 getProducers() found:", producers);
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
        
        if (DEBUG) console.log("🏷️ getTags() found:", tags);
        return tags.join(', ');
    }

    // ---------------------------
    // Tag Chip Creation and Management
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
            
            // Trigger update if available
            if (window.updatePendingCustomData) {
                window.updatePendingCustomData();
            }
            
            // Update dashboard if on edit page
            if (isEditPage() && window.updateDashboardContent) {
                setTimeout(() => window.updateDashboardContent(), 100);
            }
        });
        
        return chip;
    }

    // ---------------------------
    // Tags Restoration for Edit Pages
    // ---------------------------
    function restoreTagsOnEditPage(existingData) {
        if (!isEditPage() || !existingData || !existingData.tags) return;
        
        const tagsInput = document.querySelector('input[name="tags"]');
        if (!tagsInput) {
            if (DEBUG) console.log("🏷️ Tags input not found, will retry later");
            return;
        }
        
        const container = tagsInput.closest('[role="group"]');
        if (!container) {
            if (DEBUG) console.log("🏷️ Tags container not found");
            return;
        }
        
        const chipsContainer = container.querySelector('.flex.flex-wrap.items-center.gap-8');
        if (!chipsContainer) {
            if (DEBUG) console.log("🏷️ Tags chips container not found");
            return;
        }
        
        // Check if tags are already restored
        if (chipsContainer.querySelector('.bg-chip')) {
            if (DEBUG) console.log("🏷️ Tags already restored, skipping");
            return;
        }
        
        const tags = existingData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        if (tags.length === 0) return;
        
        if (DEBUG) console.log("🏷️ Restoring tags:", tags);
        
        // Create and insert tag chips
        tags.forEach(tagName => {
            const chip = createTagChip(tagName);
            chipsContainer.appendChild(chip);
        });
        
        if (DEBUG) console.log("✅ Tags restored successfully");
    }

    // ---------------------------
    // Auto-restoration with Observer
    // ---------------------------
    function setupTagsRestorationObserver(existingData) {
        if (!isEditPage() || !existingData || !existingData.tags) return;
        
        const debouncedRestore = debounce(() => {
            const tagsInput = document.querySelector('input[name="tags"]');
            if (tagsInput && !document.querySelector('input[name="tags"]').closest('[role="group"]').querySelector('.bg-chip')) {
                restoreTagsOnEditPage(existingData);
                observer.disconnect();
            }
        }, 300);
        
        const observer = new MutationObserver(debouncedRestore);
        
        function startObserving() {
            const target = document.body || document.documentElement;
            if (target) {
                if (DEBUG) console.log('Starting MutationObserver for tags restoration');
                observer.observe(target, { childList: true, subtree: true });
            } else {
                if (DEBUG) console.log('DOM not ready for tags observer, retrying in 100ms');
                setTimeout(startObserving, 100);
            }
        }
        
        startObserving();
        
        // Clean up observer after 10 seconds
        setTimeout(() => {
            observer.disconnect();
        }, 10000);
        
        return observer;
    }

    // ---------------------------
    // Public API
    // ---------------------------
    const ProducerTagsManager = {
        // Core functions
        getProducers,
        getTags,
        createTagChip,
        restoreTagsOnEditPage,
        setupTagsRestorationObserver,
        
        // Utility functions
        isEditPage,
        isUploadPage,
        
        // State
        isInitialized: () => isInitialized,
        
        // Initialization
        init() {
            if (isInitialized) {
                if (DEBUG) console.log(`${MODULE_NAME} already initialized`);
                return;
            }
            
            if (DEBUG) console.log(`🚀 Initializing ${MODULE_NAME}`);
            
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
    window[MODULE_NAME] = ProducerTagsManager;
    
    // Legacy compatibility
    window.getProducers = getProducers;
    window.getTags = getTags;
    window.createTagChip = createTagChip;
    window.restoreTagsOnEditPage = restoreTagsOnEditPage;

    // Auto-initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            ProducerTagsManager.init();
        });
    } else {
        ProducerTagsManager.init();
    }

    if (DEBUG) console.log(`📦 ${MODULE_NAME} module loaded`);

})();
// ============================================================
// BeatPass BPM Column Enhancer - Standalone IIFE Module
// Track table enhancement with BPM data display
// ============================================================
(function() {
    'use strict';
    
    // Module constants
    const DEBUG = false; // Reduced logging for performance
    
    // ---------------------------
    // Constants and Configuration
    // ---------------------------
    
    const API_URL = 'https://open.beatpass.ca/key_bpm_handler.php';
    const BATCH_SIZE = 3;
    const BATCH_DELAY = 100;
    const OBSERVER_DEBOUNCE = 500;
    const INJECTION_DEBOUNCE = 300;
    
    // ---------------------------
    // State Management
    // ---------------------------
    
    let tableObserver = null;
    let isInjecting = false;
    
    // ---------------------------
    // Embedded Utility Functions
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
    
    function waitForElement(selector, timeout = 10000, targetNode = document.body) {
        return new Promise((resolve, reject) => {
            const element = targetNode ? targetNode.querySelector(selector) : document.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }

            const startObserving = () => {
                const observeTarget = targetNode || document.body || document.documentElement;
                if (!observeTarget) {
                    if (DEBUG) console.warn('[BeatPassFeatures] DOM not ready for waitForElement observer, retrying...');
                    setTimeout(startObserving, 100);
                    return;
                }
                
                const observer = new MutationObserver((mutations, obs) => {
                    for (const mutation of mutations) {
                        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                            const element = observeTarget.querySelector(selector);
                            if (element) {
                                obs.disconnect();
                                resolve(element);
                                return;
                            }
                        }
                    }
                });

                observer.observe(observeTarget, { 
                    childList: true, 
                    subtree: true,
                    attributes: false,
                    characterData: false
                });

                setTimeout(() => {
                    observer.disconnect();
                    reject(new Error(`Element ${selector} not found within ${timeout}ms`));
                }, timeout);
            };
            
            startObserving();
        });
    }
    
    // ---------------------------
    // Track Name Extraction
    // ---------------------------
    
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
                if (DEBUG) console.log('[BPMColumnEnhancer] CSS selector error, using fallback');
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
        if (DEBUG) console.log('[BPMColumnEnhancer] Extracted track name:', trackName);
        return trackName;
    }
    
    // ---------------------------
    // API Functions
    // ---------------------------
    
    async function fetchBPMByTrackName(trackName) {
        try {
            const response = await fetch(`${API_URL}?track_name=${encodeURIComponent(trackName)}`);
            const data = await response.json();
            
            if (data.status === 'success' && data.data && data.data.bpm) {
                return data.data.bpm;
            }
            return null;
        } catch (error) {
            console.error('[BPMColumnEnhancer] Error fetching BPM for track:', trackName, error);
            return null;
        }
    }
    
    // ---------------------------
    // UI Creation Functions
    // ---------------------------
    
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
    
    // ---------------------------
    // Core Injection Functions
    // ---------------------------
    
    async function injectBPMColumn() {
        if (isInjecting) return;
        isInjecting = true;
        
        try {
            const tables = document.querySelectorAll('[role="grid"]');
            
            for (const table of tables) {
                // Skip if BPM column already exists
                if (table.querySelector('.custom-bpm-cell')) {
                    continue;
                }

                const headerRow = table.querySelector('[role="row"][aria-rowindex="1"]');
                const dataRows = table.querySelectorAll('[role="row"]:not([aria-rowindex="1"])');
                
                if (!headerRow || dataRows.length === 0) continue;

                // STEP 1: Inject UI immediately with placeholders
                injectBPMColumnUI(table, headerRow, dataRows);
                
                // STEP 2: Fetch data and update cells progressively
                await updateBPMDataProgressively(dataRows);
            }
        } catch (error) {
            console.error('[BPMColumnEnhancer] Error injecting BPM column:', error);
        } finally {
            isInjecting = false;
        }
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
            if (DEBUG) console.warn('[BPMColumnEnhancer] No data rows provided for BPM update');
            return;
        }
        
        // Convert to array if it's a NodeList
        const rowsArray = Array.isArray(dataRows) ? dataRows : Array.from(dataRows);
        
        try {
            for (let i = 0; i < rowsArray.length; i += BATCH_SIZE) {
                const batch = rowsArray.slice(i, i + BATCH_SIZE);
                
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
                        if (DEBUG) console.warn('[BPMColumnEnhancer] Error updating BPM for row:', error);
                    }
                }));
                
                // Small delay between batches to prevent overwhelming
                if (i + BATCH_SIZE < rowsArray.length) {
                    await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
                }
            }
        } catch (error) {
            console.error('[BPMColumnEnhancer] Error in BPM data progressive update:', error);
        }
    }
    
    // ---------------------------
    // Observer Management
    // ---------------------------
    
    function observeTableChanges() {
        // Clean up existing observer
        if (tableObserver) {
            tableObserver.disconnect();
        }
        
        const debouncedInjectBPMColumn = debounce(() => {
            const tables = document.querySelectorAll('[role="grid"]');
            if (tables.length > 0) {
                injectBPMColumn();
            }
        }, INJECTION_DEBOUNCE);
        
        const startObserving = () => {
            const targetNode = document.body || document.documentElement;
            if (!targetNode) {
                if (DEBUG) console.warn('[BeatPassBPMColumnEnhancer] DOM not ready for table observer, retrying...');
                setTimeout(startObserving, 100);
                return;
            }
            
            tableObserver = new MutationObserver(debounce(() => {
                const tables = document.querySelectorAll('[role="grid"]');
                if (tables.length > 0) {
                    debouncedInjectBPMColumn();
                }
            }, OBSERVER_DEBOUNCE));

            tableObserver.observe(targetNode, { 
                childList: true, 
                subtree: true,
                attributes: true,
                attributeFilter: ['aria-rowcount']
            });
        };
        
        startObserving();

        // Also check for existing tables
        setTimeout(() => {
            debouncedInjectBPMColumn();
        }, 1000);
    }
    
    function stopObserving() {
        if (tableObserver) {
            tableObserver.disconnect();
            tableObserver = null;
        }
    }
    
    // ---------------------------
    // Global API Exposure
    // ---------------------------
    
    window.BeatPassBPMColumnEnhancer = {
        // Core functions
        injectBPMColumn,
        observeTableChanges,
        stopObserving,
        
        // Utility functions
        extractTrackNameFromRow,
        fetchBPMByTrackName,
        
        // UI creation
        createBPMColumnHeader,
        createBPMCell,
        
        // Auto-initialization
        init: function() {
            if (DEBUG) console.log('[BeatPassBPMColumnEnhancer] Standalone BPM column enhancer module loaded');
            observeTableChanges();
        },
        
        // Cleanup
        cleanup: function() {
            if (DEBUG) console.log('[BeatPassBPMColumnEnhancer] Cleaning up...');
            stopObserving();
        }
    };
    
    // Backward compatibility
    window.injectBPMColumn = window.BeatPassBPMColumnEnhancer.injectBPMColumn;
    
    // ---------------------------
    // Auto-Initialization
    // ---------------------------
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', window.BeatPassBPMColumnEnhancer.init);
    } else {
        window.BeatPassBPMColumnEnhancer.init();
    }
    
})();
/**
 * Form Submission Handler - Standalone IIFE Module
 * Handles form submissions, pending data management, and confirmation processing
 * Zero dependencies - all utilities embedded
 */
(function() {
    'use strict';

    // Module constants
    const MODULE_NAME = 'BeatPassFormSubmissionHandler';
    const DEBUG = false; // Reduced logging for performance
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
            if (DEBUG) console.log("📋 Updating pending custom data:", {
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
    // Auto-Save Functionality
    // ---------------------------
    let autoSaveTimeout = null;
    
    function debouncedAutoSave() {
        if (autoSaveTimeout) {
            clearTimeout(autoSaveTimeout);
        }
        
        autoSaveTimeout = setTimeout(async () => {
            // Enhanced validation for core functions and edit page state
            const coreReady = window.getTrackId && window.getTrackName && window.isEditPage;
            const isEdit = window.isEditPage && window.isEditPage();
            
            if (!coreReady) {
                if (DEBUG) console.warn('⚠️ Auto-save skipped - core functions not ready:', {
                    getTrackId: !!window.getTrackId,
                    getTrackName: !!window.getTrackName,
                    isEditPage: !!window.isEditPage
                });
                return;
            }
            
            if (isEdit) {
                const trackId = window.getTrackId();
                if (DEBUG) console.log('🔄 Auto-save triggered - Track ID:', trackId, 'Edit page:', isEdit);
                if (DEBUG) console.log('🔍 getTrackId function available:', typeof window.getTrackId);
                if (DEBUG) console.log('🔍 Current URL:', window.location.pathname);
                
                if (trackId) {
                    if (DEBUG) console.log('💾 Starting auto-save process...');
                    
                    const key_name = document.getElementById('key_name')?.value.trim() || '';
                    const scale = document.getElementById('scale')?.value.trim() || '';
                    const bpm = document.getElementById('bpm')?.value.trim() || '';
                    const track_name = window.getTrackName ? window.getTrackName() : '';
                    const duration_ms = window.getDuration ? window.getDuration() : null;
                    const producers = window.getProducers ? window.getProducers() : '';
                    const tags = window.getTags ? window.getTags() : '';
                    
                    if (DEBUG) console.log('📊 Field values:', { key_name, scale, bpm, track_name, duration_ms, producers, tags });
                    
                    // Get exclusive licensing data
                    const licensingData = getExclusiveLicensingData();
                    
                    const autoSaveData = {
                        key_name,
                        scale,
                        bpm,
                        track_name: track_name || '',
                        track_id: trackId,
                        duration_ms,
                        producers: producers || '',
                        tags: tags || '',
                        licensing_type: licensingData.licensing_type,
                        exclusive_price: licensingData.licensing_type !== 'non_exclusive_only' ? licensingData.exclusive_price : '',
                        exclusive_currency: licensingData.exclusive_currency,
                        exclusive_status: licensingData.licensing_type === 'non_exclusive_only' ? 'not_available' : licensingData.exclusive_status,
                        exclusive_buyer_info: licensingData.exclusive_buyer_info
                    };
                    
                    if (DEBUG) console.log('📤 Auto-save data prepared:', autoSaveData);
                    
                    const success = await submitCustomData(autoSaveData);
                    if (success) {
                        if (DEBUG) console.log('✅ Auto-save completed successfully');
                    } else {
                        console.error('❌ Auto-save failed');
                    }
                } else {
                    if (DEBUG) console.warn('⚠️ Auto-save skipped - no track ID available');
                }
            } else {
                if (DEBUG) console.log('ℹ️ Auto-save skipped - not on edit page');
            }
        }, 1000); // 1 second delay
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
            track_name = window.getTrackName ? window.getTrackName() : '';
            duration_ms = window.getDuration ? window.getDuration() : null;
            producers = window.getProducers ? window.getProducers() : '';
            tags = window.getTags ? window.getTags() : '';
            
            // Get playback URL from the input field if we're on the edit page
            if (window.isEditPage && window.isEditPage()) {
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
                if (DEBUG) console.log("📋 Using form data for submission:", {
                    key_name, scale, bpm, track_name, track_id, playback_url, duration_ms, producers, tags, licensing_type, exclusive_price, exclusive_currency, exclusive_status, exclusive_buyer_info
                });
            }
        }

        // Enhanced validation with track name requirement
        if (!track_id) {
            if (DEBUG) console.warn("❌ Cannot submit custom data: missing track_id");
            return false;
        }

        if (!track_name || track_name.trim() === '') {
            if (DEBUG) console.warn("⚠️ Track name is missing - this may cause database issues");
        }
        
        // Check if we have at least some metadata to submit
        if (!key_name && !scale && !bpm && !track_name && !playback_url && !producers && !tags && licensing_type === 'non_exclusive_only') {
            if (DEBUG) console.warn("❌ No metadata to submit - all fields empty");
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
        
        if (DEBUG) console.log("📦 Final payload for submission:", payload);

        try {
            if (DEBUG) console.log('🌐 Making API request to:', API_URL);
            if (DEBUG) console.log('📦 Request payload:', payload);
            
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams(payload)
            });
            
            if (DEBUG) console.log('📡 Response status:', res.status, res.statusText);
            
            if (!res.ok) {
                console.error('❌ HTTP error:', res.status, res.statusText);
                return false;
            }
            
            const data = await res.json();
            if (DEBUG) console.log('📥 API response:', data);
            
            if (data.status === 'success') {
                localStorage.removeItem('pendingCustomData');
                if (DEBUG) console.log('✅ Data submitted successfully to database');
                return true;
            } else {
                console.error('❌ API returned error:', data.message || 'Unknown error');
                return false;
            }
        } catch (err) {
            console.error("❌ Network error submitting custom data:", err);
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
                    if (DEBUG) console.log(` Track name updated: "${previousTrackName}" → "${customData.track_name}"`);
                } else {
                    if (DEBUG) console.warn("⚠️ No track name found during confirmation, keeping original:", customData.track_name);
                }
                
                if (DEBUG) console.log("📦 Final confirmation payload:", customData);
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
                if (DEBUG) console.log("📦 Form submission - capturing data:", {
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
    window.debouncedAutoSave = debouncedAutoSave;

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
// ============================================================
// BeatPassID Fingerprinting System Module
// Extracted from custom-fields.js
// Handles audio fingerprinting, duplicate detection, and Sample-Safe™ warranty
// ============================================================
(function () {
    'use strict';
    
    const DEBUG = false;

    if (DEBUG) console.log('🔍 BeatPassID Fingerprinting System module loaded');

    // ---------------------------
    // Module Constants
    // ---------------------------
    
    const API_URL = window.API_URL || 'https://open.beatpass.ca/key_bpm_handler.php';
    const FINGERPRINT_API = 'https://open.beatpass.ca/fingerprint.php';

    // ---------------------------
    // Core Fingerprinting Functions
    // ---------------------------

    async function generateFingerprint(playbackUrl, track_id) {
        if (DEBUG) console.log(`🔍 Generating fingerprint for track ${track_id} with URL: ${playbackUrl}`);
        
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
            if (DEBUG) console.log('🔍 Fingerprint generation response:', data);
            
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
        if (DEBUG) console.log(`🔍 Submitting fingerprint for track ${track_id}`);
        
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
            if (DEBUG) console.log('🔍 Duplicate check response:', duplicateCheck);
            
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
            if (DEBUG) console.log('🔍 Fingerprint submission response:', submitResult);
            
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
        if (DEBUG) console.log(`🔍 Deleting fingerprint for track ${track_id} due to ToS violation`);
        
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
            if (DEBUG) console.log('🔍 Fingerprint deletion response:', result);
            
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
        const dashboard = document.getElementById('fingerprint-dashboard');
        if (dashboard) {
            // Smooth fade-out before removal
            dashboard.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
            dashboard.style.opacity = '0';
            dashboard.style.transform = 'translateY(-10px)';
            
            setTimeout(() => {
                if (dashboard.parentNode) {
                    dashboard.remove();
                }
            }, 300);
            if (DEBUG) console.log('🔍 Fingerprint dashboard removed');
        }
    }

    function injectFingerprintDashboard() {
        if (!window.isEditPage || !window.isEditPage()) {
            if (DEBUG) console.log('🔍 Not on edit page, skipping dashboard injection');
            return;
        }
        
        if (document.getElementById('fingerprint-dashboard')) {
            if (DEBUG) console.log('🔍 Dashboard already exists, skipping injection');
            return;
        }
        
        const form = document.querySelector('form');
        if (!form) {
            if (DEBUG) console.warn('🔍 No form found for dashboard injection');
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
        
        if (DEBUG) console.log('🔍 Fingerprint Dashboard injected successfully');
        
        // Initialize dashboard content with multiple attempts for reliability
        setTimeout(async () => {
            if (DEBUG) console.log('🔍 Initializing dashboard content...');
            await updateDashboardContent();
            observePlaybackURLChanges();
            
            // Retry dashboard update if content is empty (for reliability)
            setTimeout(async () => {
                const content = document.getElementById('dashboard-content');
                if (content && content.innerHTML.trim() === '') {
                    if (DEBUG) console.log('🔍 Dashboard content empty, retrying...');
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
            if (DEBUG) console.warn('🔍 Dashboard content element not found');
            return;
        }
        
        const track_id = window.getTrackId ? window.getTrackId() : null;
        if (!track_id) {
            if (DEBUG) console.warn('🔍 No track ID found for dashboard update');
            return;
        }
        
        if (DEBUG) console.log(`🔍 Updating dashboard content for track ID: ${track_id}`);
        
        // Get current playback URL from form
        const playbackInput = document.querySelector('input[name="src"]') || 
            document.querySelector('input[type="text"][name="src"]') ||
            document.querySelector('input[type="url"][name="src"]');
        
        const currentURL = playbackInput ? playbackInput.value.trim() : '';
        if (DEBUG) console.log(`🔍 Current playback URL: ${currentURL ? 'Present' : 'None'}`);
        
        // Get fingerprint status from database (includes existing metadata)
        if (DEBUG) console.log('🔍 Fetching fingerprint status from database...');
        const statusInfo = await checkPlaybackURLStatus(track_id);
        if (DEBUG) console.log('🔍 Fingerprint status received:', {
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
            if (DEBUG) console.log('🔍 Could not fetch existing metadata:', error);
        }
        
        // Get metadata completeness (checks both form and database)
        const metadata = getMetadataCompleteness(existingCustomData);
        
        // Check if URL has changed from what's in database
        const urlChanged = currentURL && statusInfo.playbackUrl && 
                          currentURL !== statusInfo.playbackUrl;
        
        if (DEBUG) console.log('🔍 Dashboard update:', {
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
            if (DEBUG) console.warn('🔍 Playback URL input not found for observation');
            return;
        }
        
        let lastValue = playbackInput.value;
        
        const checkForChanges = () => {
            const currentValue = playbackInput.value;
            if (currentValue !== lastValue) {
                if (DEBUG) console.log('🔍 Playback URL changed, updating dashboard');
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
        
        if (DEBUG) console.log('🔍 Playback URL change observation initialized');
    }

    // ---------------------------
    // Fingerprinting Process Management
    // ---------------------------

    async function startFingerprintingProcess(button = null, track_id = null, fromDashboard = false) {
        if (DEBUG) console.log('🔍 Starting fingerprinting process...');
        
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
            if (DEBUG) console.log('🔍 Using playback URL:', playbackUrl);
            
            // Fetch existing custom data for validation
            let existingCustomData = null;
            try {
                const response = await fetch(`${API_URL}?track_id=${track_id}`);
                const result = await response.json();
                if (result.status === 'success' && result.data) {
                    existingCustomData = result.data;
                }
            } catch (error) {
                if (DEBUG) console.log('🔍 Could not fetch existing data:', error);
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
            if (DEBUG) console.log('🔍 Saving playback URL and metadata...');
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
            if (DEBUG) console.log('🔍 Save response:', saveResult);
            
            // Generate fingerprint
            if (DEBUG) console.log('🔍 Generating fingerprint...');
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
            if (DEBUG) console.log('🔍 Submitting fingerprint to database...');
            const submitResult = await submitFingerprint(fingerprintResult, track_id);
            
            if (submitResult.isDuplicate) {
                if (DEBUG) console.log('🔍 Duplicate detected:', submitResult);
                
                if (!submitResult.isAuthentic) {
                    // ToS violation - delete any fingerprint data
                    await deleteFingerprintFromDatabase(track_id);
                    
                    if (dashboardContent) {
                        renderFingerprintFailureState(dashboardContent, submitResult);
                    }
                    
                    showNotification('Duplicate content detected - Terms of Service violation', 'error');
                } else {
                    // Authentic duplicate
                    if (DEBUG) console.log('🔍 Authentic duplicate detected');
                    if (dashboardContent) {
                        await updateDashboardContent();
                    }

                    showNotification('Authentic original detected with duplicates blocked', 'info');
                }
            } else if (submitResult.success) {
                if (DEBUG) console.log('🔍 Fingerprinting completed successfully');
                
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
        if (DEBUG) console.log('Testing fingerprint failure UI...');
        
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
        if (DEBUG) console.log('Testing fingerprint deletion...');
        
        const trackId = window.getCurrentTrackId ? window.getCurrentTrackId() : null;
        if (trackId) {
            deleteFingerprintFromDatabase(trackId)
                .then(result => {
                    if (DEBUG) console.log('Deletion test result:', result);
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
    // getCurrentTrackId function is now globally available from beatpass-core.js

    // Helper function to format price
    function formatPrice(price, currency = 'USD') {
        if (!price) return '';
        const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency + ' ';
        return `${symbol}${price}`;
    }

    // Fetch existing custom data for edit pages
    async function fetchExistingCustomData() {
        const trackId = getTrackId();
        const trackName = getTrackName();
        let params;
        if (trackId) {
            params = new URLSearchParams({ track_id: trackId });
        } else if (trackName) {
            params = new URLSearchParams({ track_name: trackName });
        } else {
            return null;
        }
        try {
            const res = await fetch(`${API_URL}?${params}`);
            const data = await res.json();
            if (data.status === 'success' && data.data) {
                return data.data;
            }
        } catch (err) {
            console.error("Error fetching custom data:", err);
        }
        return null;
    }

    // Helper function to get track name from form
    function getTrackName() {
        const nameField = document.querySelector('input[name="name"]');
        return nameField ? nameField.value.trim() : '';
    }

    // Track page metadata initialization function
    async function initTrackPage(attempt = 1, maxAttempts = 3) {
        if (!window.isTrackPage || !window.isTrackPage()) {
            if (DEBUG) console.log('🎵 Not on track page, skipping track page initialization');
            return;
        }
        
        if (DEBUG) console.log(`🎵 Initializing track page metadata display... (attempt ${attempt}/${maxAttempts})`);
        
        const trackId = window.getCurrentTrackId ? window.getCurrentTrackId() : null;
        const infoContainer = getInfoContainer();
        
        if (!trackId) {
            console.warn('🎵 No track ID found for track page initialization');
            if (attempt < maxAttempts) {
                if (DEBUG) console.log(`🎵 Retrying track page initialization in 500ms... (attempt ${attempt + 1}/${maxAttempts})`);
                setTimeout(() => initTrackPage(attempt + 1, maxAttempts), 500);
            }
            return;
        }
        
        if (!infoContainer) {
            console.warn('🎵 Track info container not found for metadata injection');
            if (attempt < maxAttempts) {
                if (DEBUG) console.log(`🎵 Retrying track page initialization in 500ms... (attempt ${attempt + 1}/${maxAttempts})`);
                setTimeout(() => initTrackPage(attempt + 1, maxAttempts), 500);
            }
            return;
        }
        
        try {
            // Fetch track metadata from database
            const response = await fetch(`${API_URL}?track_id=${trackId}`);
            const result = await response.json();
            
            if (result.status === 'success' && result.data) {
                if (DEBUG) console.log('🎵 Track metadata fetched successfully:', result.data);
                
                // Inject metadata display on track page
                injectTrackPageMetadata(result.data);
                if (DEBUG) console.log('✅ Track page metadata initialization completed successfully');
            } else {
                if (DEBUG) console.log('🎵 No metadata found for track ID:', trackId);
            }
        } catch (error) {
            console.error('🎵 Error fetching track metadata:', error);
            if (attempt < maxAttempts) {
                if (DEBUG) console.log(`🎵 Retrying track page initialization due to error in 600ms... (attempt ${attempt + 1}/${maxAttempts})`);
                setTimeout(() => initTrackPage(attempt + 1, maxAttempts), 600);
            }
        }
    }
    
    // Legacy-style helper functions for track metadata display
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

    function injectNewTrackData(data, container) {
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

    // Function to inject metadata display on track page (legacy-style)
    function injectTrackPageMetadata(metadata) {
        const container = getInfoContainer();
        if (!container) {
            console.warn('🎵 Track info container not found, cannot inject metadata');
            return;
        }
        
        // Check if data is already injected to prevent loops
        const existingCustom = container.querySelector('.custom-key, .custom-scale, .custom-bpm, .custom-exclusive');
        if (existingCustom && 
            container.querySelector('.custom-key')?.textContent === metadata.key_name &&
            container.querySelector('.custom-scale')?.textContent === metadata.scale &&
            container.querySelector('.custom-bpm')?.textContent === `${metadata.bpm} BPM`) {
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
                injectNewTrackData(metadata, container);
            }, 200);
        } else {
            injectNewTrackData(metadata, container);
        }
        
        if (DEBUG) console.log('🎵 Track metadata display injected successfully');
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
    window.initTrackPage = initTrackPage;
    window.injectTrackPageMetadata = injectTrackPageMetadata;

    if (DEBUG) console.log('Fingerprinting System module loaded successfully');

})();
