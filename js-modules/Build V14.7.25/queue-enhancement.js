/**
 * Queue Enhancement Module
 * Adds queue title, current playing track display, and playlist context
 * Similar to Spotify's queue implementation
 */

(function() {
    'use strict';
    
    const DEBUG = false; // Disabled to reduce console noise

    // Configuration
    const CONFIG = {
        checkInterval: 1000,
        animationDuration: 300,
        colors: {
            primary: '#1db954', // You can adjust this to match your theme
            muted: 'rgba(255, 255, 255, 0.7)',
            border: 'rgba(255, 255, 255, 0.1)'
        }
    };

    // Centralized Initialization State Manager
    const InitializationManager = {
        state: {
            currentTrack: null,
            playingFrom: null,
            queueElement: null,
            isInitialized: false,
            retryCount: 0,
            retryInterval: null,
            navigationHandlers: [],
            observers: [],
            domUpdateTimeout: null,
            domObserver: null,
            trackUpdateTimeout: null
        },

        init() {
            if (this.state.isInitialized) {
                return;
            }

            try {
                this._waitForCoordinator();
            } catch (error) {
                console.error('Queue Enhancement: InitializationManager init error:', error);
                // Don't retry automatically to prevent infinite recursion
            }
        },

        _waitForCoordinator() {
            // Direct initialization without coordinator dependency
            this._performInit();
        },

        _performInit() {
            this._setupNavigationHandling();
            this._initializeQueueEnhancements();
            this._setupRetryMechanism();
            this.state.isInitialized = true;
        },

        _setupNavigationHandling() {
            // Override navigation methods
            ['pushState', 'replaceState'].forEach(method => {
                const orig = history[method];
                history[method] = (...args) => {
                    const result = orig.apply(history, args);
                    this._handleNavigation();
                    return result;
                };
            });

            window.addEventListener('popstate', () => this._handleNavigation());
            window.addEventListener('focus', () => this._handleFocus());
            
            // Watch for DOM changes that might affect the sidebar
            this._setupDOMObserver();
        },

        _setupDOMObserver() {
            // Create a mutation observer to watch for sidebar and track changes
            const observer = new MutationObserver((mutations) => {
                let shouldUpdate = false;
                let shouldUpdateTrack = false;
                
                mutations.forEach((mutation) => {
                    // Check if sidebar elements were added or removed
                    if (mutation.type === 'childList') {
                        const addedNodes = Array.from(mutation.addedNodes);
                        const removedNodes = Array.from(mutation.removedNodes);
                        
                        // Check if sidebar-related elements were affected
                        const sidebarAffected = [...addedNodes, ...removedNodes].some(node => {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                return node.classList?.contains('dashboard-grid-sidenav-right') ||
                                       node.querySelector?.('.dashboard-grid-sidenav-right') ||
                                       node.classList?.contains('fixed') ||
                                       node.querySelector?.('.fixed.bottom-0.left-0.right-0');
                            }
                            return false;
                        });
                        
                        if (sidebarAffected) {
                            shouldUpdate = true;
                        }
                    }
                    
                    // Check for class changes on track elements (highlighting changes)
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        const target = mutation.target;
                        if (target.classList?.contains('bg-primary/80') || 
                            target.classList?.contains('bg-primary\\\\80') ||
                            mutation.oldValue?.includes('bg-primary')) {
                            shouldUpdateTrack = true;
                        }
                    }
                });
                
                if (shouldUpdate) {
                    if (DEBUG) console.log('Queue Enhancement: Sidebar change detected, updating queue');
                    // Debounce the update
                    clearTimeout(this.state.domUpdateTimeout);
                    this.state.domUpdateTimeout = setTimeout(() => {
                        this._smartQueueUpdate();
                    }, 200);
                } else if (shouldUpdateTrack) {
                    if (DEBUG) console.log('Queue Enhancement: Track highlight change detected, updating track info');
                    // Debounce track updates
                    clearTimeout(this.state.trackUpdateTimeout);
                    this.state.trackUpdateTimeout = setTimeout(() => {
                        this._updateCurrentTrack();
                    }, 100);
                }
            });
            
            // Start observing
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeOldValue: true,
                attributeFilter: ['class']
            });
            
            this.state.domObserver = observer;
        },

        _handleNavigation() {
            setTimeout(() => {
                this._smartQueueUpdate();
            }, 100);
        },

        _handleFocus() {
            setTimeout(() => {
                this._smartQueueUpdate();
            }, 500);
        },

        _smartQueueUpdate() {
            const desktopQueue = document.querySelector('.dashboard-grid-sidenav-right[class*="will-change"]') ||
                               document.querySelector('.dashboard-grid-sidenav-right');
            const mobileQueue = document.querySelector('.fixed.bottom-0.left-0.right-0');
            
            // If no sidebar is present, remove any existing enhancements
            if (!desktopQueue && !mobileQueue) {
                this._removeAllEnhancements();
                this.state.isInitialized = false;
                return;
            }
            
            // Get current track first
            const currentTrack = queueEnhancement.getCurrentPlayingTrack();
            
            // Check if enhancements exist
            const desktopEnhancement = desktopQueue?.querySelector('.now-playing-section');
            const mobileEnhancement = mobileQueue?.querySelector('.now-playing-section');
            
            // If enhancements exist, check if we need to update
            if (desktopEnhancement || mobileEnhancement) {
                const lastTrackTitle = this.state.currentTrack?.title;
                const lastTrackImage = this.state.currentTrack?.image;
                const currentTrackTitle = currentTrack?.title;
                const currentTrackImage = currentTrack?.image;
                
                // Update if track title or image changed
                if (lastTrackTitle !== currentTrackTitle || lastTrackImage !== currentTrackImage) {
                    if (DEBUG) console.log('Queue Enhancement: Track changed, updating info only', {
                        from: lastTrackTitle,
                        to: currentTrackTitle
                    });
                    this._updateTrackInfo(currentTrack);
                    this.state.currentTrack = currentTrack;
                }
                
                // Always ensure enhancements are properly attached to current sidebar
                if (desktopQueue && !desktopQueue.querySelector('.now-playing-section')) {
                    if (DEBUG) console.log('Queue Enhancement: Desktop enhancement missing, re-creating');
                    queueEnhancement.enhanceDesktopQueue();
                }
                if (mobileQueue && !mobileQueue.querySelector('.now-playing-section')) {
                    if (DEBUG) console.log('Queue Enhancement: Mobile enhancement missing, re-creating');
                    queueEnhancement.enhanceMobileQueue();
                }
                return;
            }
            
            // If no enhancements exist but sidebar is present, create them
            if (desktopQueue || mobileQueue) {
                if (DEBUG) console.log('Queue Enhancement: Creating initial enhancements');
                this._initializeQueueEnhancements();
                this.state.currentTrack = currentTrack;
                this.state.isInitialized = true;
            }
        },
        
        _initializeQueueEnhancements() {
            // Call enhancement functions directly to avoid recursion
            queueEnhancement.enhanceDesktopQueue();
            queueEnhancement.enhanceMobileQueue();
        },
        
        _removeAllEnhancements() {
            // Remove desktop enhancements
            document.querySelectorAll('.dashboard-grid-sidenav-right .now-playing-section, .dashboard-grid-sidenav-right .up-next-label').forEach(el => el.remove());
            // Remove mobile enhancements
            document.querySelectorAll('.fixed.bottom-0.left-0.right-0 .now-playing-section, .fixed.bottom-0.left-0.right-0 .queue-header-mobile').forEach(el => el.remove());
            // Clear enhancement markers
            document.querySelectorAll('[data-queue-enhanced]').forEach(el => el.removeAttribute('data-queue-enhanced'));
            if (DEBUG) console.log('Queue Enhancement: All enhancements removed');
        },
        
        _updateTrackInfo(currentTrack) {
            if (!currentTrack) return;
            
            // Update desktop track info
            const desktopSection = document.querySelector('.dashboard-grid-sidenav-right .now-playing-section');
            if (desktopSection) {
                const titleEl = desktopSection.querySelector('.track-title');
                const artistEl = desktopSection.querySelector('.track-artist');
                const imageEl = desktopSection.querySelector('img');
                
                if (titleEl) titleEl.textContent = currentTrack.title;
                if (artistEl) artistEl.textContent = currentTrack.artist;
                if (imageEl && currentTrack.image) imageEl.src = currentTrack.image;
            }
            
            // Update mobile track info
            const mobileSection = document.querySelector('.fixed.bottom-0.left-0.right-0 .now-playing-section');
            if (mobileSection) {
                const titleEl = mobileSection.querySelector('.track-title');
                const artistEl = mobileSection.querySelector('.track-artist');
                const imageEl = mobileSection.querySelector('img');
                
                if (titleEl) titleEl.textContent = currentTrack.title;
                if (artistEl) artistEl.textContent = currentTrack.artist;
                if (imageEl && currentTrack.image) imageEl.src = currentTrack.image;
            }
            
            if (DEBUG) console.log('Queue Enhancement: Track info updated to:', currentTrack.title);
        },
        
        _updateCurrentTrack() {
            const currentTrack = queueEnhancement.getCurrentPlayingTrack();
            if (currentTrack) {
                // Only update if track has changed
                const lastTrackTitle = this.state.currentTrack?.title;
                const lastTrackImage = this.state.currentTrack?.image;
                
                if (currentTrack.title !== lastTrackTitle || currentTrack.image !== lastTrackImage) {
                    this.state.currentTrack = currentTrack;
                    this._updateTrackInfo(currentTrack);
                    if (DEBUG) console.log('Queue Enhancement: Track info updated to:', currentTrack.title);
                }
            }
        },

        _setupRetryMechanism() {
            this.state.retryCount = 0;
            const maxRetries = 10;
            const retryIntervalTime = 1000;
            
            this.state.retryInterval = setInterval(() => {
                const desktopQueue = document.querySelector('.dashboard-grid-sidenav-right');
                const mobileQueue = document.querySelector('.fixed.bottom-0.left-0.right-0');
                
                let hasRequiredEnhancements = true;
                
                if (desktopQueue && !desktopQueue.querySelector('.now-playing-section')) {
                    hasRequiredEnhancements = false;
                }
                
                if (mobileQueue && !mobileQueue.querySelector('.now-playing-section')) {
                    hasRequiredEnhancements = false;
                }
                
                const hasAnyQueue = desktopQueue || mobileQueue;
                const needsRetry = hasAnyQueue && !hasRequiredEnhancements && this.state.retryCount < maxRetries;
                
                if (needsRetry) {
                    this.state.retryCount++;
                    this._initializeQueueEnhancements();
                } else if (hasRequiredEnhancements || this.state.retryCount >= maxRetries || !hasAnyQueue) {
                    this._clearRetryMechanism();
                }
            }, retryIntervalTime);
            
            // Clear retry interval after timeout
            setTimeout(() => {
                this._clearRetryMechanism();
            }, 15000);
        },

        _clearRetryMechanism() {
            if (this.state.retryInterval) {
                clearInterval(this.state.retryInterval);
                this.state.retryInterval = null;
            }
        },

        cleanup() {
            this._clearRetryMechanism();
            
            // Clear DOM update timeout
            if (this.state.domUpdateTimeout) {
                clearTimeout(this.state.domUpdateTimeout);
                this.state.domUpdateTimeout = null;
            }
            
            // Clear track update timeout
            if (this.state.trackUpdateTimeout) {
                clearTimeout(this.state.trackUpdateTimeout);
                this.state.trackUpdateTimeout = null;
            }
            
            // Disconnect DOM observer
            if (this.state.domObserver) {
                this.state.domObserver.disconnect();
                this.state.domObserver = null;
            }
            
            this.state.observers.forEach(observer => observer.disconnect());
            this.state.observers = [];
            this.state.isInitialized = false;
            
            // Remove all enhancements
            this._removeAllEnhancements();
            
            if (DEBUG) console.log('Queue Enhancement: Cleanup completed');
        }
    };

    // Legacy queue state for backward compatibility
    const queueState = InitializationManager.state;

    // Utility functions
    const utils = {
        waitForElement: function(selector, callback, timeout = 10000) {
            const element = document.querySelector(selector);
            if (element) {
                callback(element);
                return;
            }
            
            let timeoutId;
            const observer = new MutationObserver((mutations, obs) => {
                const element = document.querySelector(selector);
                if (element) {
                    obs.disconnect();
                    if (timeoutId) clearTimeout(timeoutId);
                    callback(element);
                }
            });
            
            function startObserving() {
                const targetNode = document.body || document.documentElement;
                if (!targetNode) {
                    if (DEBUG) console.warn('[BeatPass] DOM not ready for queue enhancement observer, retrying...');
                    setTimeout(startObserving, 100);
                    return;
                }
                observer.observe(targetNode, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: ['class', 'data-testid']
                });
                if (DEBUG) console.log('[BeatPass] Queue enhancement observer setup complete');
            }
            startObserving();
            
            // Fallback timeout
            timeoutId = setTimeout(() => {
                observer.disconnect();
                // Try one more time before giving up
                const element = document.querySelector(selector);
                if (element) {
                    callback(element);
                }
            }, timeout);
        },

        getCurrentPlayingTrack: function() {
            // First try to get from main player area (most reliable)
            const mainPlayer = document.querySelector('.flex.items-center.gap-14');
            if (mainPlayer) {
                const imageEl = mainPlayer.querySelector('img[data-cd-spin="true"]');
                const titleEl = mainPlayer.querySelector('a.hover\\:underline.overflow-x-hidden.overflow-ellipsis.text-sm');
                const artistEl = mainPlayer.querySelector('.text-xs.text-muted a');
                
                if (imageEl && titleEl) {
                    const track = {
                        title: titleEl.textContent || 'Unknown Track',
                        artist: artistEl?.textContent || 'Unknown Artist',
                        image: imageEl.src || '',
                        element: mainPlayer
                    };
                    if (DEBUG) console.log('Queue Enhancement: Track detected from main player:', track.title);
                    return track;
                }
            }

            // Fallback: Desktop queue - Look for highlighted track with bg-primary/80
            const desktopPlaying = document.querySelector('.dashboard-grid-sidenav-right .bg-primary\\/80, .dashboard-grid-sidenav-right [class*="bg-primary"]');
            if (desktopPlaying) {
                const container = desktopPlaying.closest('.flex.items-center.gap-10') || desktopPlaying;
                if (container) {
                    const titleEl = container.querySelector('.text-sm.overflow-hidden.overflow-ellipsis, .text-sm');
                    const artistEl = container.querySelector('a.text-inherit, a.text-muted, .text-xs');
                    const imageEl = container.querySelector('img');
                    
                    const track = {
                        title: titleEl?.textContent?.trim() || 'Unknown Track',
                        artist: artistEl?.textContent?.trim() || 'Unknown Artist',
                        image: imageEl?.src || '',
                        element: container
                    };
                    if (DEBUG) console.log('Queue Enhancement: Track detected from desktop queue:', track.title);
                    return track;
                }
            }

            // Fallback: Mobile - Look for highlighted track
            const mobilePlaying = document.querySelector('[role="row"] .text-primary');
            if (mobilePlaying) {
                const row = mobilePlaying.closest('[role="row"]');
                if (row) {
                    const titleEl = row.querySelector('.max-md\\:text-\\[15px\\]');
                    const artistEl = row.querySelector('.text-xs.text-muted span');
                    const imageEl = row.querySelector('img');
                    
                    return {
                        title: titleEl?.textContent || 'Unknown Track',
                        artist: artistEl?.textContent || 'Unknown Artist',
                        image: imageEl?.src || '',
                        element: row
                    };
                }
            }

            if (DEBUG) console.log('Queue Enhancement: No track detected from any source');
            return null;
        },

        getPlayingContext: function() {
            // Try to get context from page URL or other indicators
            const pathname = window.location.pathname;
            
            if (pathname.includes('/playlist/')) {
                return 'Playlist';
            } else if (pathname.includes('/album/')) {
                return 'Album';
            } else if (pathname.includes('/artist/')) {
                return 'Artist';
            } else if (pathname.includes('/genre/')) {
                return 'Genre';
            } else if (pathname.includes('/discover') || pathname === '/') {
                return 'Discover';
            }
            
            // Default context
            return 'Your Library';
        },

        createQueueHeader: function(isMobile = false) {
            // Only create header for mobile view
            if (isMobile) {
                const header = document.createElement('div');
                header.className = 'queue-header-mobile bg-inherit border-b px-8 py-12';
                
                header.innerHTML = `
                    <div class="flex items-center justify-between">
                        <h2 class="text-base font-medium">Queue</h2>
                        <button class="queue-close-btn text-muted hover:text-white transition-colors p-2 -mr-2" aria-label="Close queue">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="queue-context text-xs text-muted mt-2">
                        Playing from: <span class="font-normal">${this.getPlayingContext()}</span>
                    </div>
                `;
                
                // Add close functionality
                const closeBtn = header.querySelector('.queue-close-btn');
                closeBtn.addEventListener('click', () => {
                    const queueContainer = document.querySelector('.fixed.bottom-0.left-0.right-0');
                    if (queueContainer) {
                        queueContainer.style.display = 'none';
                    }
                });
                
                return header;
            }
            return null;
        },

        createNowPlayingSection: function(track, isMobile = false) {
            if (!track) return null;
            
            const section = document.createElement('div');
            section.className = 'now-playing-section';
            
            if (isMobile) {
                // Mobile: Keep original design
                section.innerHTML = `
                    <div class="flex items-center gap-10 p-8 border-b now-playing-item relative">
                        <div class="absolute left-0 top-50% w-3 h-16 bg-primary rounded-r" style="top: 50%; transform: translateY(-50%);"></div>
                        <div class="relative overflow-hidden">
                            <img src="${track.image}" 
                                 alt="${track.title}" 
                                 class="w-34 h-34 flex-shrink-0 rounded object-cover bg-fg-base/4 object-cover block"
                                 draggable="false"
                                 loading="lazy">
                        </div>
                        <div class="flex-auto max-w-180 whitespace-nowrap">
                            <div class="text-sm overflow-hidden overflow-ellipsis font-medium">${track.title}</div>
                            <div class="text-xs overflow-hidden overflow-ellipsis overflow-x-hidden overflow-ellipsis">
                                <span class="text-muted">${track.artist}</span>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                // Desktop: Integrated card with pill design
                section.innerHTML = `
                    <div class="now-playing-card">
                        <div class="bp-now-playing-pill text-xs uppercase tracking-wide">Now Playing</div>
                        <div class="cd-spotlight">
                            <img src="${track.image}" 
                                 alt="${track.title}" 
                                 class="cd-cover rounded object-cover bg-fg-base/4 object-cover block"
                                 draggable="false"
                                 loading="lazy"
                                 style="transform-origin: 50% 50%; transform: rotate(0deg) scale(1);">
                        </div>
                        <div class="track-info">
                            <div class="track-title">${track.title}</div>
                            <div class="track-artist">${track.artist}</div>
                        </div>
                    </div>
                `;
            }
            
            const pill = section.querySelector('.bp-now-playing-pill');
            if (pill) {
                const startObserving = () => {
                    if (!pill || !document.body) {
                        if (DEBUG) console.warn('[QueueEnhancement] DOM not ready for pill observer, retrying...');
                        setTimeout(startObserving, 100);
                        return;
                    }
                    
                    const pillObserver = new MutationObserver(() => {
                        pill.textContent = 'Now Playing';
                    });
                    pillObserver.observe(pill, { childList: true, subtree: true, characterData: true });
                };
                
                startObserving();
            }
            
            return section;
        },

        createUpNextLabel: function(isMobile = false) {
            const label = document.createElement('div');
            label.className = 'up-next-label text-sm font-semibold px-6 py-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg mx-2 mb-3';
            label.innerHTML = `
                <div class="flex items-center gap-2">
                    <div class="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                    <span class="text-primary">Up Next</span>
                </div>
            `;
            return label;
        }
    };

    // Main enhancement functions
    const queueEnhancement = {
        enhanceDesktopQueue: function(retryCount = 0) {
            const maxRetries = 3;
            const queueContainer = document.querySelector('.dashboard-grid-sidenav-right');
            
            if (!queueContainer) {
                if (retryCount < maxRetries) {
                    setTimeout(() => this.enhanceDesktopQueue(retryCount + 1), 800);
                }
                return;
            }
            
            // Check if already has enhancement content (not just data attribute)
            const existingEnhancement = queueContainer.querySelector('.now-playing-section');
            if (existingEnhancement && queueContainer.dataset.queueEnhanced) {
                return;
            }
            
            const scrollContainer = queueContainer.querySelector('.overflow-y-auto');
            if (!scrollContainer) {
                if (retryCount < maxRetries) {
                    setTimeout(() => this.enhanceDesktopQueue(retryCount + 1), 800);
                }
                return;
            }
            
            try {
                // Clean up any existing enhancements first
                scrollContainer.querySelectorAll('.now-playing-section, .up-next-label').forEach(el => el.remove());
                
                // Get current playing track
                const currentTrack = utils.getCurrentPlayingTrack();
                
                // Create and insert now playing section if track exists
                if (currentTrack) {
                    const nowPlaying = utils.createNowPlayingSection(currentTrack, false);
                    if (nowPlaying) {
                        scrollContainer.insertBefore(nowPlaying, scrollContainer.firstChild);
                        
                        // Mark as enhanced only after successful insertion
                        queueContainer.dataset.queueEnhanced = 'true';
                        
                        // Verify enhancement was successful
                        setTimeout(() => {
                            const verifyEnhancement = queueContainer.querySelector('.now-playing-section');
                            if (!verifyEnhancement && retryCount < maxRetries) {
                                if (DEBUG) console.log('Queue Enhancement: Desktop enhancement verification failed, retrying...');
                                queueContainer.removeAttribute('data-queue-enhanced');
                                this.enhanceDesktopQueue(retryCount + 1);
                            } else if (verifyEnhancement) {
                                if (DEBUG) console.log('Queue Enhancement: Desktop queue enhanced successfully with track:', currentTrack.title);
                            }
                        }, 500);
                    }
                } else {
                    if (DEBUG) console.log('Queue Enhancement: No current track found for desktop queue');
                    // Still mark as enhanced to prevent infinite retries
                    queueContainer.dataset.queueEnhanced = 'true';
                }
                
                // Apply subtle animations
                this.applyQueueAnimations(scrollContainer);
            } catch (error) {
                console.error('Queue Enhancement: Error enhancing desktop queue:', error);
                queueContainer.removeAttribute('data-queue-enhanced');
                if (retryCount < maxRetries) {
                    setTimeout(() => this.enhanceDesktopQueue(retryCount + 1), 1000);
                }
            }
        },

        enhanceMobileQueue: function(retryCount = 0) {
            const maxRetries = 3;
            const queueContainer = document.querySelector('.fixed.bottom-0.left-0.right-0');
            
            if (!queueContainer) {
                if (retryCount < maxRetries) {
                    setTimeout(() => this.enhanceMobileQueue(retryCount + 1), 800);
                }
                return;
            }
            
            // Check if already has enhancement content (not just data attribute)
            const existingEnhancement = queueContainer.querySelector('.now-playing-section');
            if (existingEnhancement && queueContainer.dataset.queueEnhanced) {
                return;
            }
            
            const gridContainer = queueContainer.querySelector('[role="grid"]');
            if (!gridContainer) {
                if (retryCount < maxRetries) {
                    setTimeout(() => this.enhanceMobileQueue(retryCount + 1), 800);
                }
                return;
            }
            
            try {
                // Clean up any existing enhancements first
                queueContainer.querySelectorAll('.queue-header-mobile, .now-playing-section, .up-next-label').forEach(el => el.remove());
                
                // Get current playing track
                const currentTrack = utils.getCurrentPlayingTrack();
                
                // Create and insert header
                const header = utils.createQueueHeader(true);
                queueContainer.insertBefore(header, queueContainer.firstChild);
                
                // Create and insert now playing section if track exists
                if (currentTrack) {
                    // Add "Now Playing" label
                    const nowPlayingLabel = document.createElement('div');
                    nowPlayingLabel.className = 'text-xs text-muted font-medium px-8 py-6';
                    nowPlayingLabel.textContent = 'Now Playing';
                    header.after(nowPlayingLabel);
                    
                    const nowPlaying = utils.createNowPlayingSection(currentTrack, true);
                    if (nowPlaying) {
                        nowPlayingLabel.after(nowPlaying);
                        
                        // Mark as enhanced only after successful insertion
                        queueContainer.dataset.queueEnhanced = 'true';
                        
                        // Verify enhancement was successful
                        setTimeout(() => {
                            const verifyEnhancement = queueContainer.querySelector('.now-playing-section');
                            if (!verifyEnhancement && retryCount < maxRetries) {
                                if (DEBUG) console.log('Queue Enhancement: Mobile enhancement verification failed, retrying...');
                                queueContainer.removeAttribute('data-queue-enhanced');
                                this.enhanceMobileQueue(retryCount + 1);
                            } else if (verifyEnhancement) {
                                if (DEBUG) console.log('Queue Enhancement: Mobile queue enhanced successfully with track:', currentTrack.title);
                            }
                        }, 500);
                    }
                } else {
                    if (DEBUG) console.log('Queue Enhancement: No current track found for mobile queue');
                    // Still mark as enhanced to prevent infinite retries
                    queueContainer.dataset.queueEnhanced = 'true';
                }
            } catch (error) {
                console.error('Queue Enhancement: Error enhancing mobile queue:', error);
                queueContainer.removeAttribute('data-queue-enhanced');
                if (retryCount < maxRetries) {
                    setTimeout(() => this.enhanceMobileQueue(retryCount + 1), 1000);
                }
            }
        },

        applyQueueAnimations: function(container) {
            // Add CSS for animations
            const style = document.createElement('style');
            style.textContent = `
                .now-playing-card {
                    background: linear-gradient(135deg, rgb(var(--be-background-alt) / 0.95), rgb(var(--be-background-alt) / 0.85));
                    border: 1.5px solid rgba(255, 255, 255, 0.15);
                    border-radius: 1rem;
                    padding: 2rem 1.5rem;
                    margin: 4px;
                    margin-bottom: 1rem;
                    text-align: center;
                    position: relative;
                    overflow: hidden;
                    backdrop-filter: blur(20px) saturate(1.1);
                    -webkit-backdrop-filter: blur(20px) saturate(1.1);
                    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    opacity: 0;
                    transform: translateY(-12px);
                    animation: slideInSmooth 0.5s ease-out 0.1s forwards;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1);
                }
                
                .now-playing-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(135deg, rgba(255, 255, 255, 0.05), transparent 50%, rgba(255, 255, 255, 0.02));
                    border-radius: inherit;
                    pointer-events: none;
                    z-index: 1;
                }
                
                .now-playing-card > * {
                    position: relative;
                    z-index: 2;
                }
                
                .now-playing-card:hover {
                    background: linear-gradient(135deg, rgb(var(--be-background-alt) / 1), rgb(var(--be-background-alt) / 0.9));
                    border-color: rgba(255, 255, 255, 0.25);
                    transform: translateY(-4px) scale(1.01);
                    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.15);
                }
                
                .bp-now-playing-pill {
                    background: rgb(var(--be-foreground-base, 255 255 255) / 0.1);
                    color: rgb(var(--be-foreground-base, 255 255 255) / 0.9);
                    padding: 0.25rem 0.75rem;
                    border-radius: var(--be-button-radius, 0.75rem);
                    font-weight: 600;
                    margin-bottom: 1rem;
                    display: inline-block;
                    font-size: 0.625rem;
                    letter-spacing: 0.05em;
                    text-transform: uppercase;
                    transition: all 0.2s ease;
                    border: 1px solid rgb(var(--be-foreground-base, 255 255 255) / 0.2);
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                    position: relative;
                    z-index: 1;
                    backdrop-filter: blur(8px);
                }
                
                .bp-now-playing-pill::before {
                    content: 'NOW PLAYING';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 600;
                    font-size: 0.625rem;
                    letter-spacing: 0.05em;
                    color: inherit;
                    z-index: 2;
                }
                
                .cd-spotlight {
                    margin-bottom: 1.5rem;
                    position: relative;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                
                .cd-spotlight::before {
                    content: '';
                    position: absolute;
                    width: 12rem;
                    height: 12rem;
                    border-radius: 50%;
                    background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.1), transparent 70%);
                    opacity: 0;
                    transition: opacity 0.4s ease;
                    pointer-events: none;
                    z-index: 0;
                }
                
                .cd-spotlight:hover::before {
                    opacity: 1;
                }
                
                .cd-cover {
                    width: 10.625rem;
                    height: 10.625rem;
                    border-radius: 50%;
                    object-fit: cover;
                    margin: 0 auto;
                    display: block;
                    position: relative;
                    z-index: 1;
                    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 
                        0 8px 32px rgba(0, 0, 0, 0.3),
                        0 4px 16px rgba(0, 0, 0, 0.2),
                        inset 0 1px 0 rgba(255, 255, 255, 0.1),
                        0 0 0 1px rgba(255, 255, 255, 0.05);
                    border: 3px solid rgba(255, 255, 255, 0.1);
                    filter: brightness(1) saturate(1.1);
                }
                
                .cd-cover::before {
                    content: '';
                    position: absolute;
                    top: -4px;
                    left: -4px;
                    right: -4px;
                    bottom: -4px;
                    border-radius: 50%;
                    background: conic-gradient(from 0deg, transparent, rgba(255, 255, 255, 0.1), transparent, rgba(255, 255, 255, 0.05), transparent);
                    opacity: 0;
                    transition: opacity 0.4s ease;
                    pointer-events: none;
                    z-index: -1;
                }
                
                .cd-cover:hover {
                    transform: scale(1.05) rotate(3deg);
                    box-shadow: 
                        0 16px 48px rgba(0, 0, 0, 0.4),
                        0 8px 24px rgba(0, 0, 0, 0.3),
                        0 0 32px rgba(255, 255, 255, 0.1),
                        inset 0 2px 0 rgba(255, 255, 255, 0.15),
                        0 0 0 1px rgba(255, 255, 255, 0.1);
                    border-color: rgba(255, 255, 255, 0.2);
                    filter: brightness(1.1) saturate(1.2) contrast(1.05);
                }
                
                .cd-cover:hover::before {
                    opacity: 1;
                    animation: rotate 3s linear infinite;
                }
                
                @keyframes rotate {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                
                .track-info {
                    text-align: center;
                    margin-top: 1.5rem;
                    padding: 0 0.5rem;
                }
                
                .track-title {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: rgb(var(--be-foreground-base) / var(--be-text-main-opacity));
                    margin-bottom: 0.5rem;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    line-height: 1.3;
                    letter-spacing: -0.01em;
                    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
                    transition: color 0.3s ease;
                }
                
                .track-title:hover {
                    color: rgb(var(--be-foreground-base) / 1);
                }
                
                .track-artist {
                    font-size: 0.9rem;
                    font-weight: 500;
                    color: rgb(var(--be-foreground-base) / var(--be-text-muted-opacity));
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    line-height: 1.4;
                    letter-spacing: 0.01em;
                    opacity: 0.8;
                    transition: opacity 0.3s ease;
                }
                
                .track-artist:hover {
                    opacity: 1;
                }
                
                .up-next-label {
                    opacity: 0;
                    transform: translateY(4px);
                    animation: fadeInUp 0.2s ease-out 0.2s forwards;
                }
                
                @keyframes slideInSmooth {
                    0% {
                        opacity: 0;
                        transform: translateY(-20px) scale(0.95);
                        filter: blur(2px);
                    }
                    50% {
                        opacity: 0.8;
                        transform: translateY(-4px) scale(0.98);
                        filter: blur(1px);
                    }
                    100% {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                        filter: blur(0);
                    }
                }
                
                @keyframes fadeInUp {
                    0% {
                        opacity: 0;
                        transform: translateY(8px) scale(0.98);
                    }
                    100% {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
                
                /* Add subtle breathing animation to the now playing pill */
                .bp-now-playing-pill {
                    animation: breathe 3s ease-in-out infinite;
                }
                
                @keyframes breathe {
                    0%, 100% {
                        transform: scale(1);
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                    }
                    50% {
                        transform: scale(1.02);
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    }
                }
                
                /* Enhance currently playing track indicator */
                .bg-primary\\/80 {
                    position: relative;
                }
                
                .bg-primary\\/80::before {
                    content: '';
                    position: absolute;
                    left: 0;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 3px;
                    height: 16px;
                    background: #1db954;
                    border-radius: 0 2px 2px 0;
                }
                
                /* Mobile specific styles */
                @media (max-width: 768px) {
                    .text-primary {
                        font-weight: 500;
                    }
                    
                    [role="row"]:has(.text-primary) {
                        background: rgba(29, 185, 84, 0.08);
                    }
                }
                
                /* Queue close button enhancement */
                .queue-close-btn {
                    border-radius: 4px;
                    transition: all 0.15s ease;
                }
                
                .queue-close-btn:hover {
                    background: rgba(255, 255, 255, 0.08);
                }
                
                /* Ensure consistent text colors */
                .queue-header-mobile h2 {
                    color: #fff;
                }
                
                .queue-context {
                    opacity: 0.7;
                }
            `;
            
            // Only add styles once
            if (!document.querySelector('#queue-enhancement-styles')) {
                style.id = 'queue-enhancement-styles';
                document.head.appendChild(style);
            }
        },

        observeQueueChanges: function() {
            // Watch for changes in the queue
            const observer = new MutationObserver((mutations) => {
                // Re-check if queue needs enhancement
                this.enhanceDesktopQueue();
                this.enhanceMobileQueue();
                
                // Update current track if changed
                const newTrack = utils.getCurrentPlayingTrack();
                if (newTrack && newTrack.title !== InitializationManager.state.currentTrack?.title) {
                    InitializationManager.state.currentTrack = newTrack;
                    this.updateNowPlayingSection(newTrack);
                }
            });
            
            // Observe the body for queue changes
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'style']
            });
        },

        updateNowPlayingSection: function(track) {
            const sections = document.querySelectorAll('.now-playing-section');
            sections.forEach(section => {
                // Add updating class to prevent flashing
                section.classList.add('updating');
                
                // Update desktop card layout
                const cardImg = section.querySelector('.cd-cover');
                const cardTitle = section.querySelector('.track-title');
                const cardArtist = section.querySelector('.track-artist');
                
                if (cardImg) {
                    cardImg.src = track.image;
                }
                if (cardTitle) cardTitle.textContent = track.title;
                if (cardArtist) cardArtist.textContent = track.artist;
                const pill = section.querySelector('.bp-now-playing-pill');
                if (pill && !pill.dataset.lock) {
                    pill.dataset.lock = '1';
                    const ob = new MutationObserver(() => {
                        pill.textContent = 'Now Playing';
                    });
                    ob.observe(pill, { childList: true, subtree: true, characterData: true });
                }
                
                // Update mobile layout (fallback)
                const mobileImg = section.querySelector('img:not(.cd-cover)');
                const mobileTitle = section.querySelector('.font-medium');
                const mobileArtist = section.querySelector('.text-xs.text-muted');
                
                if (mobileImg) mobileImg.src = track.image;
                if (mobileTitle) mobileTitle.textContent = track.title;
                if (mobileArtist) mobileArtist.textContent = track.artist;
                
                // Remove updating class after a brief delay
                setTimeout(() => {
                    section.classList.remove('updating');
                }, 150);
            });
        },

        init: function() {
            // Delegate to InitializationManager
            InitializationManager.init();
        },
        
        cleanup: function() {
            // Delegate to InitializationManager
            InitializationManager.cleanup();
        },
        
        isInitialized: function() {
            return InitializationManager.state.isInitialized;
        }
    };

    // Enhanced initialization with better React app detection for fresh loads
    function waitForReactApp() {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 200; // 40 seconds max wait for fresh loads
            
            function checkForApp() {
                attempts++;
                
                // Check for React root indicators
                const hasReactRoot = document.querySelector('#root, [data-reactroot], .app');
                const hasPlayerElements = document.querySelector('.player-container, [data-testid="player"], .mini-player');
                const hasMainContent = document.querySelector('main, .main-content, .dashboard-grid');
                const hasQueueElements = document.querySelector('.dashboard-grid-sidenav-right, .fixed.bottom-0.left-0.right-0');
                
                // Check for actual queue content (more specific)
                const hasQueueContent = document.querySelector('.dashboard-grid-sidenav-right .overflow-y-auto, .fixed.bottom-0.left-0.right-0 [role="grid"]');
                
                // Check for React hydration indicators (important for fresh loads)
                const hasReactHydrated = document.querySelector('[data-reactroot] *') || 
                                        document.querySelector('#root > *') ||
                                        document.querySelector('.app > *');
                
                // More comprehensive check for app readiness - stricter for fresh loads
                const basicAppReady = hasReactRoot || hasPlayerElements || hasMainContent;
                const contentReady = hasQueueContent || (hasQueueElements && hasReactHydrated);
                const appReady = basicAppReady && (contentReady || attempts > 25); // More patience for fresh loads
                
                if (appReady && attempts > 12) { // Wait longer before proceeding
                    // Extended wait for fresh loads to ensure React components are fully rendered
                    const waitTime = attempts < 30 ? 2000 : 1500; // Longer wait for early attempts
                    if (DEBUG) console.log(`Queue Enhancement: React app detected after ${attempts} attempts, waiting ${waitTime}ms for stabilization`);
                    setTimeout(resolve, waitTime);
                } else if (attempts >= maxAttempts) {
                    if (DEBUG) console.log('Queue Enhancement: Timeout waiting for React app after 40s, proceeding anyway');
                    resolve(); // Fallback after timeout
                } else {
                    setTimeout(checkForApp, 200);
                }
            }
            
            checkForApp();
        });
    }

    // Wait for DOM to be stable (no mutations for a period) - enhanced for fresh loads
    function waitForDOMStability(timeout = 3000) {
        return new Promise((resolve) => {
            let stabilityTimer;
            let observer;
            let mutationCount = 0;
            
            const resetTimer = () => {
                clearTimeout(stabilityTimer);
                stabilityTimer = setTimeout(() => {
                    observer?.disconnect();
                    if (DEBUG) console.log(`Queue Enhancement: DOM stable after ${mutationCount} mutations`);
                    resolve();
                }, 500); // Wait for 500ms of no mutations (longer for fresh loads)
            };
            
            observer = new MutationObserver((mutations) => {
                // Filter out irrelevant mutations to avoid false instability
                const relevantMutations = mutations.filter(mutation => {
                    // Ignore style changes, data attributes, and script insertions
                    if (mutation.type === 'attributes') {
                        const attrName = mutation.attributeName;
                        return !['style', 'class', 'data-testid', 'aria-hidden'].includes(attrName);
                    }
                    
                    // Ignore script and style tag additions
                    if (mutation.type === 'childList') {
                        const addedNodes = Array.from(mutation.addedNodes);
                        const relevantNodes = addedNodes.filter(node => {
                            if (node.nodeType !== Node.ELEMENT_NODE) return false;
                            const tagName = node.tagName?.toLowerCase();
                            return !['script', 'style', 'link', 'meta'].includes(tagName);
                        });
                        return relevantNodes.length > 0;
                    }
                    
                    return true;
                });
                
                if (relevantMutations.length > 0) {
                    mutationCount += relevantMutations.length;
                    resetTimer();
                }
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['id', 'role', 'data-queue-enhanced'] // Only watch important attributes
            });
            
            resetTimer(); // Start the timer
            
            // Fallback timeout
            setTimeout(() => {
                observer?.disconnect();
                clearTimeout(stabilityTimer);
                if (DEBUG) console.log(`Queue Enhancement: DOM stability timeout after ${timeout}ms, proceeding anyway`);
                resolve();
            }, timeout);
        });
    }

    // Initialize with proper timing and retry logic
    async function initializeEnhancement() {
        try {
            if (DEBUG) console.log('Queue Enhancement: Starting initialization...');
            
            // Use the new InitializationManager
            InitializationManager.init();
        } catch (error) {
            console.error('Queue Enhancement: Initialization error:', error);
            // Fallback initialization
            setTimeout(() => InitializationManager.init(), 1000);
        }
    }

    // Start initialization based on document state
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeEnhancement);
    } else {
        initializeEnhancement();
    }
    
    // Additional fallback for when React app loads after window load
    window.addEventListener('load', () => {
        setTimeout(() => {
            if (!InitializationManager.state.isInitialized) {
                if (DEBUG) console.log('Queue Enhancement: Window load fallback triggered');
                InitializationManager.init();
            }
        }, 1000);
    });

    // Enhanced navigation handling with better state preservation
    function handleNavigation() {
        // Legacy function - now handled by InitializationManager
        if (DEBUG) console.log('Queue Enhancement: Navigation handling delegated to InitializationManager');
    }

    // Export for potential external use
    window.QueueEnhancement = queueEnhancement;
})();