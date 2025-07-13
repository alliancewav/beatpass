// ============================================================
// BeatPass BPM Column Enhancer - Standalone IIFE Module
// Track table enhancement with BPM data display
// ============================================================
(function() {
    'use strict';
    
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
            const element = targetNode.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }

            const observer = new MutationObserver((mutations, obs) => {
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
                attributes: false,
                characterData: false
            });

            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Element ${selector} not found within ${timeout}ms`));
            }, timeout);
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
                console.log('[BPMColumnEnhancer] CSS selector error, using fallback');
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
        console.log('[BPMColumnEnhancer] Extracted track name:', trackName);
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
            console.warn('[BPMColumnEnhancer] No data rows provided for BPM update');
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
                        console.warn('[BPMColumnEnhancer] Error updating BPM for row:', error);
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
        
        tableObserver = new MutationObserver(debounce(() => {
            const tables = document.querySelectorAll('[role="grid"]');
            if (tables.length > 0) {
                debouncedInjectBPMColumn();
            }
        }, OBSERVER_DEBOUNCE));

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
            console.log('[BeatPassBPMColumnEnhancer] Standalone BPM column enhancer module loaded');
            observeTableChanges();
        },
        
        // Cleanup
        cleanup: function() {
            console.log('[BeatPassBPMColumnEnhancer] Cleaning up...');
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