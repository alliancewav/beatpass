/**
 * Producer and Tags Manager - Standalone IIFE Module
 * Handles producer and tag data extraction, chip creation, and restoration
 * Zero dependencies - all utilities embedded
 */
(function() {
    'use strict';

    // Module constants
    const MODULE_NAME = 'BeatPassProducerTagsManager';
    const DEBUG = true;

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

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

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
        observer.observe(document.body, { childList: true, subtree: true });
        
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