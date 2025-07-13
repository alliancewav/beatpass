/**
 * Queue Enhancement Module
 * Adds queue title, current playing track display, and playlist context
 * Similar to Spotify's queue implementation
 */

(function() {
    'use strict';

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

    // Queue state management
    const queueState = {
        currentTrack: null,
        playingFrom: null,
        queueElement: null,
        isInitialized: false
    };

    // Utility functions
    const utils = {
        waitForElement: function(selector, callback) {
            const element = document.querySelector(selector);
            if (element) {
                callback(element);
                return;
            }
            
            const observer = new MutationObserver((mutations, obs) => {
                const element = document.querySelector(selector);
                if (element) {
                    obs.disconnect();
                    callback(element);
                }
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        },

        getCurrentPlayingTrack: function() {
            // First try to get from main player area (most reliable)
            const mainPlayer = document.querySelector('.flex.items-center.gap-14');
            if (mainPlayer) {
                const imageEl = mainPlayer.querySelector('img[data-cd-spin="true"]');
                const titleEl = mainPlayer.querySelector('a.hover\\:underline.overflow-x-hidden.overflow-ellipsis.text-sm');
                const artistEl = mainPlayer.querySelector('.text-xs.text-muted a');
                
                if (imageEl && titleEl) {
                    return {
                        title: titleEl.textContent || 'Unknown Track',
                        artist: artistEl?.textContent || 'Unknown Artist',
                        image: imageEl.src || '',
                        element: mainPlayer
                    };
                }
            }

            // Fallback: Desktop queue - Look for highlighted track
            const desktopPlaying = document.querySelector('.dashboard-grid-sidenav-right .bg-primary\\/80');
            if (desktopPlaying) {
                const container = desktopPlaying.closest('.flex.items-center.gap-10');
                if (container) {
                    const titleEl = container.querySelector('.text-sm.overflow-hidden.overflow-ellipsis');
                    const artistEl = container.querySelector('a.text-inherit, a.text-muted');
                    const imageEl = container.querySelector('img');
                    
                    return {
                        title: titleEl?.textContent || 'Unknown Track',
                        artist: artistEl?.textContent || 'Unknown Artist',
                        image: imageEl?.src || '',
                        element: container
                    };
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
                const pillObserver = new MutationObserver(() => {
                    pill.textContent = 'Now Playing';
                });
                pillObserver.observe(pill, { childList: true, subtree: true, characterData: true });
            }
            
            return section;
        },

        createUpNextLabel: function(isMobile = false) {
            const label = document.createElement('div');
            label.className = 'up-next-label text-xs text-muted font-medium px-8 py-6';
            label.textContent = 'Up Next';
            return label;
        }
    };

    // Main enhancement functions
    const queueEnhancement = {
        enhanceDesktopQueue: function() {
            const queueContainer = document.querySelector('.dashboard-grid-sidenav-right');
            if (!queueContainer || queueContainer.dataset.queueEnhanced) return;
            
            const scrollContainer = queueContainer.querySelector('.overflow-y-auto');
            if (!scrollContainer) return;
            
            // Mark as enhanced
            queueContainer.dataset.queueEnhanced = 'true';
            
            // Get current playing track
            const currentTrack = utils.getCurrentPlayingTrack();
            
            // Create and insert now playing section if track exists
            if (currentTrack) {
                const nowPlaying = utils.createNowPlayingSection(currentTrack, false);
                if (nowPlaying) {
                    scrollContainer.insertBefore(nowPlaying, scrollContainer.firstChild);
                }
            }
            
            // Add "Up Next" label before the queue items
            const firstQueueItem = scrollContainer.querySelector('.flex.items-center.gap-10:not(.now-playing-item)');
            if (firstQueueItem) {
                const upNextLabel = utils.createUpNextLabel(false);
                firstQueueItem.before(upNextLabel);
            }
            
            // Apply subtle animations
            this.applyQueueAnimations(scrollContainer);
        },

        enhanceMobileQueue: function() {
            const queueContainer = document.querySelector('.fixed.bottom-0.left-0.right-0');
            if (!queueContainer || queueContainer.dataset.queueEnhanced) return;
            
            const gridContainer = queueContainer.querySelector('[role="grid"]');
            if (!gridContainer) return;
            
            // Mark as enhanced
            queueContainer.dataset.queueEnhanced = 'true';
            
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
                }
            }
            
            // Add "Up Next" label before the first non-playing item
            const firstRow = gridContainer.querySelector('[role="row"]:not(:has(.text-primary))');
            if (firstRow) {
                const upNextLabel = utils.createUpNextLabel(true);
                firstRow.before(upNextLabel);
            }
            
            // Apply subtle animations
            this.applyQueueAnimations(queueContainer);
        },

        applyQueueAnimations: function(container) {
            // Add smooth transitions for queue items
            const style = document.createElement('style');
            style.textContent = `
                .queue-header-mobile {
                    background-color: rgba(18, 18, 18, 0.95);
                    animation: slideDown 0.2s ease-out;
                    position: relative;
                }
                
                .now-playing-section {
                    animation: fadeIn 0.3s ease-out;
                }
                
                .now-playing-item {
                    background-color: rgba(255, 255, 255, 0.02);
                }
                
                .now-playing-item .text-sm {
                    color: #fff;
                }
                
                .now-playing-item .bg-primary {
                    background-color: #1db954;
                }
                
                /* Desktop Now Playing Card */
                .now-playing-card {
                    background: rgb(10 10 10 / 80%);
                    backdrop-filter: blur(4px);
                    border: 1px solid rgba(255,255,255,0.06);
                    border-radius: 8px;
                    padding: 24px;
                    position: relative;
                    overflow: hidden;
                    text-align: center;
                    margin: 8px;
                    box-shadow: 0 6px 12px rgba(0,0,0,0.25);
                }
                
                .bp-now-playing-pill {
                    background: rgba(0, 0, 0, 0.35);
                    display: inline-block;
                    padding: 6px 14px;
                    border-radius: 14px;
                    margin-bottom: 20px;
                    color: rgba(255, 255, 255, 0.8);
                    letter-spacing: 0.2px;
                    text-transform: uppercase;
                }
                
                .cd-spotlight {
                    position: relative;
                    display: flex;
                    justify-content: center;
                    margin-bottom: 16px;
                }
                
                .cd-cover {
                    width: 170px;
                    height: 170px;
                    border-radius: 50%;
                    object-fit: cover;
                    margin: 0 auto 24px;
                    display: block;
                    transition: transform 0.4s ease;
                }
                .cd-cover:hover { transform: scale(1.04); }
                
                .track-info {
                    text-align: center;
                }
                
                .track-title {
                    font-size: 18px;
                    font-weight: 600;
                    color: #fff;
                    margin-bottom: 6px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                
                .track-artist {
                    font-size: 14px;
                    color: rgba(255, 255, 255, 0.7);
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                
                .up-next-label {
                    animation: fadeIn 0.2s ease-out 0.1s both;
                    background-color: rgba(0, 0, 0, 0.2);
                }
                
                @keyframes slideDown {
                    from {
                        transform: translateY(-10px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
                
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(5px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
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
                if (newTrack && newTrack.title !== queueState.currentTrack?.title) {
                    queueState.currentTrack = newTrack;
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
            });
        },

        init: function() {
            if (queueState.isInitialized) return;
            queueState.isInitialized = true;
            
            // Initial enhancement
            this.enhanceDesktopQueue();
            this.enhanceMobileQueue();
            
            // Set up observer for dynamic changes
            this.observeQueueChanges();
            
            // Also check periodically for new queue elements
            setInterval(() => {
                this.enhanceDesktopQueue();
                this.enhanceMobileQueue();
            }, CONFIG.checkInterval);
        }
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => queueEnhancement.init());
    } else {
        queueEnhancement.init();
    }

    // Export for potential external use
    window.QueueEnhancement = queueEnhancement;
})(); 