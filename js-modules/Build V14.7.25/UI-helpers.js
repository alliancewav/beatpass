// ============================================================
// 8. Subtitle Injection for Various Pages
// ============================================================
(function() {
    const DEBUG = false; // Re-enable debug logging to troubleshoot persistent issue
    // Simplified subtitle manager
    let currentPath = null;
    let subtitleTimeout = null;
    
    // Add CSS animations for smooth transitions
    function addSubtitleAnimationStyles() {
        if (document.getElementById('subtitle-animation-styles')) return;
        
        // Use UIHelpersInitManager for CSS injection if available, otherwise fallback
        if (window.UIHelpersInitManager && window.UIHelpersInitManager.styleManager) {
            window.UIHelpersInitManager.styleManager.injectSubtitleAnimationStyles();
        } else {
            const style = document.createElement('style');
            style.id = 'subtitle-animation-styles';
            style.textContent = `
                .subtitle-fade-in {
                    opacity: 0;
                    transform: translateY(-10px);
                    animation: subtitleFadeIn 0.4s ease-out forwards;
                }
                
                .subtitle-fade-out {
                    opacity: 1;
                    transform: translateY(0);
                    animation: subtitleFadeOut 0.15s ease-in forwards;
                }
                
                @keyframes subtitleFadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(-8px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                @keyframes subtitleFadeOut {
                    from {
                        opacity: 1;
                        transform: translateY(0);
                    }
                    to {
                        opacity: 0;
                        transform: translateY(-3px);
                    }
                }
                
                .subtitle-element {
                    transition: opacity 0.3s ease, transform 0.3s ease;
                }
            `;
            document.head.appendChild(style);
        }
    }
    function normalizePath(path) {
        return path.replace(/\/$/, "");
    }

    // Centralized subtitle manager with enhanced SPA support and debouncing
    // Simplified subtitle management with retry capability
    function manageSubtitlesWithRetry(forceUpdate = false) {
        const path = normalizePath(window.location.pathname);
        
        // Check if page is ready for subtitle injection
        const h1 = document.querySelector('h1');
        const main = document.querySelector('main');
        
        if (!h1 || !main) {
            if (DEBUG) console.log('Page not ready for subtitles - missing elements:', { h1: !!h1, main: !!main });
            return false;
        }
        
        manageSubtitles(forceUpdate);
        return true;
    }
    
    function manageSubtitles(forceUpdate = false) {
        const path = normalizePath(window.location.pathname);
        
        if (DEBUG) console.log('manageSubtitles called:', { path, forceUpdate, currentPath });
        
        // Skip if already processed for this path (unless forced)
        if (!forceUpdate && currentPath === path) {
            const existingSubtitles = document.querySelectorAll(
                "h2[data-latestfeed-subtitle='true'], " +
                "h2[data-beatpacks-subtitle='true'], " +
                "h2[data-producers-subtitle='true'], " +
                "h2[data-trending-subtitle='true'], " +
                "h2[data-genre-channel-subtitle='true'], " +
                "h2[data-pricing-subtitle='true'], " +
                "h2[data-genre-subtitle='true'], " +
                "p[data-static-subtitle='true'], " +
                "p[data-genre-subtitle='true']"
            );
            
            if (existingSubtitles.length > 0) {
                if (DEBUG) console.log('Subtitles already exist for path, skipping:', path);
                return;
            }
        }
        
        // Update current path
        currentPath = path;
        
        // Clear any existing timeout
        if (subtitleTimeout) {
            clearTimeout(subtitleTimeout);
        }
        
        // Process subtitles with a simple delay
        subtitleTimeout = setTimeout(() => {
            try {
                 if (DEBUG) console.log('Managing subtitles for path:', path);
                 
                 // Remove existing subtitles
                 const allSubtitleSelector = "h2[data-latestfeed-subtitle='true'], " +
                                           "h2[data-beatpacks-subtitle='true'], " +
                                           "h2[data-producers-subtitle='true'], " +
                                           "h2[data-trending-subtitle='true'], " +
                                           "h2[data-genre-channel-subtitle='true'], " +
                                           "h2[data-pricing-subtitle='true'], " +
                                           "h2[data-genre-subtitle='true'], " +
                                           "p[data-static-subtitle='true'], " +
                                           "p[data-genre-subtitle='true']";
                 
                 const existingSubtitles = document.querySelectorAll(allSubtitleSelector);
                 existingSubtitles.forEach(el => el.remove());
                 
                 // Add new subtitles
                 let genreSubtitleAdded = false;
                 if (isGenrePage()) {
                     genreSubtitleAdded = addGenreSubtitle();
                     if (DEBUG) console.log('Genre subtitle attempt result:', genreSubtitleAdded);
                 }
                 
                 let mainSubtitleAdded = false;
                 if (!genreSubtitleAdded) {
                     if (DEBUG) console.log('Adding H1-based subtitle for path:', path);
                     mainSubtitleAdded = addSubtitleForPath(path);
                 } else {
                     mainSubtitleAdded = true;
                 }
                 
                 if (!mainSubtitleAdded) {
                     if (DEBUG) console.log('Processing section-based subtitles');
                     addSectionBasedSubtitles();
                 } else {
                     if (DEBUG) console.log('Skipping section-based subtitles - main subtitle already added');
                 }
                 
            } catch (error) {
                console.error('Subtitle management error:', error);
            }
        }, 100);
    }

    function addSubtitleForPath(path) {
        // Use flexible h1 selector to match any h1 element
        const h1 = document.querySelector("h1");
        if (!h1) return false;
        
        let subtitleText = "";
        let dataAttribute = "";
        
        // Determine subtitle based on path
        if (path === "/" || path === "") {
            // For home page, check H1 text to determine content type
            const h1Text = h1.textContent.toLowerCase().trim();
            if (h1Text.includes("new beats") || h1Text.includes("discover") || h1Text.includes("latest")) {
                subtitleText = "Discover the latest beats, fresh and ready to inspire your next project.";
                dataAttribute = "data-latestfeed-subtitle";
            } else {
                // For home page without recognizable H1, don't add main subtitle
                return false;
            }
        } else if (path === "/genres" || path === "/channel/genres") {
            subtitleText = "Explore beats for every mood and style to inspire your sound.";
            dataAttribute = "data-genre-subtitle";
        } else if (path === "/new-beats" || path === "/channel/new-beats") {
            subtitleText = "Discover the latest beats, fresh and ready to inspire your next project.";
            dataAttribute = "data-latestfeed-subtitle";
        } else if (path === "/beatpacks" || path === "/channel/beatpacks") {
            subtitleText = "Browse curated beat collections by style, vibe, and creative flow.";
            dataAttribute = "data-beatpacks-subtitle";
        } else if (path === "/discover-producers" || path === "/channel/discover-producers") {
            subtitleText = "Discover BP's diverse producers, each with a unique signature sound.";
            dataAttribute = "data-producers-subtitle";
        } else if (path === "/trending-beats" || path === "/channel/trending-beats") {
            subtitleText = "Explore top beats across genres, trending with artists now.";
            dataAttribute = "data-trending-subtitle";
        } else if (path === "/pricing") {
            // Skip pricing page completely - the carousel handles its own title and subtitle
            if (DEBUG) console.log('Skipping pricing page subtitle - carousel will handle it');
            return false;
        } else if (path.startsWith("/channel/channel-restriction-display-name-trending-beats/")) {
            subtitleText = "Discover chart-topping beats, loved by artists and creators worldwide.";
            dataAttribute = "data-genre-channel-subtitle";
        } else if (path.startsWith("/channel/genre-tracks/")) {
            subtitleText = "Stay inspired with fresh beats, updated regularly to keep your sound current.";
            dataAttribute = "data-genre-channel-subtitle";
        } else if (path.startsWith("/channel/genre-artists/")) {
            subtitleText = "Meet the talented producers shaping unique sounds and vibes.";
            dataAttribute = "data-genre-channel-subtitle";
        } else {
            // For unknown paths, don't add main subtitle - let section-based detection handle it
            return false;
        }
        
        // Create and insert subtitle with duplicate prevention
        if (subtitleText) {
            // Double-check that no subtitle with this data attribute already exists
            const existingSubtitle = document.querySelector(`[${dataAttribute}='true']`);
            if (existingSubtitle) {
                if (DEBUG) console.log('Subtitle already exists, skipping creation:', dataAttribute);
                return true;
            }
            
            const subtitle = document.createElement("h2");
            subtitle.setAttribute(dataAttribute, "true");
            subtitle.className = "text-base text-muted mb-4 subtitle-element subtitle-fade-in";
            subtitle.textContent = subtitleText;
            h1.insertAdjacentElement("afterend", subtitle);
            return true;
        }
        
        return false;
    }

    function addSectionBasedSubtitles() {
        // Simplified section-based subtitle detection (from original addStaticSubtitles)
        const anchors = document.querySelectorAll(
            "a[href^='/channel/channel-restriction-display-name-trending-beats/'], " +
            "a[href^='/channel/genre-tracks/'], " +
            "a[href^='/channel/genre-artists/'], " +
            "a[href^='/channel/beatpacks'], " +
            "a[href^='/channel/trending-beats'], " +
            "a[href^='/channel/discover-producers'], " +
            "a[href^='/channel/new-beats'], " +
            "a[href^='/channel/genres']"
        );
        
        if (DEBUG) {
            console.log('Section anchors found:', anchors.length);
            anchors.forEach(anchor => console.log('Anchor href:', anchor.getAttribute("href")));
        }
        
        const SECTION_SUBTITLES = {
            "channel-restriction-display-name-trending-beats": "Discover chart-topping beats, loved by artists and creators worldwide.",
            "genre-tracks": "Stay inspired with fresh beats, updated regularly to keep your sound current.",
            "genre-artists": "Meet the talented producers shaping unique sounds and vibes.",
            "beatpacks": "Explore curated beat collections for every mood, genre, and creative flow.",
            "trending-beats": "Explore top beats across genres, trending with artists now.",
            "discover-producers": "Discover BP's diverse producers, each with a unique signature sound.",
            "new-beats": "Stay updated with the latest beats from producers worldwide.",
            "genres": "Find beats for every mood and style to elevate your music."
        };

        let addedCount = 0;
        anchors.forEach(anchor => {
            const parts = anchor.getAttribute("href").split("/").filter(Boolean);
            const key = parts[1];
            const text = SECTION_SUBTITLES[key];
            if (DEBUG) console.log('Processing anchor with key:', key, 'text:', text);
            
            if (!text) return;
            
            const container = anchor.closest("div.mb-50") || anchor.closest("div.pb-24");
            if (!container) {
                if (DEBUG) console.log('No container found for anchor:', anchor.getAttribute("href"));
                return;
            }
            
            const existing = container.querySelector("p[data-static-subtitle='true']");
            if (existing) existing.remove();
            
            const p = document.createElement("p");
            p.setAttribute("data-static-subtitle", "true");
            p.className = "text-base text-muted mb-4 subtitle-element subtitle-fade-in";
            p.textContent = text;

            let titleContainer;
            if (["channel-restriction-display-name-trending-beats", "genre-artists",
                "beatpacks", "trending-beats", "discover-producers", "new-beats", "genres"]
                .includes(key)) {
                titleContainer = anchor.closest("div.flex.items-center.justify-between.gap-24.mb-14") || anchor.parentElement;
            } else if (key === "genre-tracks") {
                titleContainer = container.firstElementChild;
            }
            if (!titleContainer) titleContainer = container.firstElementChild;
            
            if (titleContainer) {
                titleContainer.insertAdjacentElement("afterend", p);
                addedCount++;
                if (DEBUG) console.log('Section subtitle added for:', key);
            } else {
                if (DEBUG) console.log('No title container found for:', key);
            }
        });
        
        if (DEBUG) console.log('Total section subtitles added:', addedCount);
        return addedCount > 0;
    }

    // Section 1: Dynamic Genre Subtitle
    function isGenrePage() {
        const isGenre = /^\/channel\/genre\//.test(window.location.pathname);
        if (DEBUG) console.log('Checking if genre page:', window.location.pathname, 'Result:', isGenre);
        return isGenre;
    }
    const GENRE_DESCRIPTIONS = {
        "afro-dancehall": "Experience rhythm-driven beats infused with Afro and Tropical vibes, featuring melodic percussion and energetic grooves—perfect for uplifting tracks.",
        "hip-hop-rap": "Explore hard-hitting 808s, crisp hi-hats, and bold melodies that define modern Hip-Hop and Trap—ideal for artists pushing boundaries and telling authentic stories.",
        "r-b-soul": "Blend R&B soulfulness with Trap's rhythmic edge—lush chords, heartfelt melodies, and dynamic beats set the stage for expressive vocals and deep storytelling.",
        "electronic-house": "Immerse yourself in energetic House rhythms blended with Trap influences—featuring hypnotic basslines, punchy drums, and infectious hooks designed for club-ready tracks and bold creativity.",
        "drill-grime": "Feel the raw energy of Drill and Grime with gritty beats, sliding 808s, and relentless rhythms—designed for hard-hitting flows and powerful lyricism.",
        "lo-fi-ambient": "Immerse yourself in Lo-Fi and Vintage beats, featuring warm samples, crackling vinyl, and laid-back grooves—perfect for chill vibes and introspective lyrics.",
        "new-gen-hyper": "Experience Hyper Trap—where experimental sound design meets Trap's bounce. Fast-paced, glitchy, and unpredictable, these beats are made for boundary-pushing artists.",
        "old-school-boom-bap": "Return to the roots with Old School BoomBap—classic drum breaks, soulful samples, and raw energy, perfect for storytelling and lyrical mastery.",
        "dnb-2-step": "Experience the high-energy pulse of Drum & Bass and 2-Step—fast breakbeats, punchy basslines, and relentless rhythms built for movement and intensity.",
        "pop-hip-hop": "Merge retro-futuristic vibes with modern Hip-Hop in this Synth-Pop hybrid—shimmering synths, catchy hooks, and rhythmic grooves for a nostalgic yet fresh sound.",
        "new-jazz-trap": "Where jazz sophistication meets Trap's raw energy—smooth harmonies, soulful horns, lush keys, and deep 808s blend for a fresh, dynamic sound.",
        "exclusive": "Own your sound with exclusive beats—high-quality, one-of-a-kind productions across multiple genres, available only under exclusive license."
    };

    function addGenreSubtitle() {
        if (!isGenrePage()) return false;
        
        // Use flexible h1 selector to match any h1 element
        const h1 = document.querySelector("h1");
        if (!h1) return false;
        
        const slug = window.location.pathname.split("/").filter(Boolean).pop() || "";
        const desc = GENRE_DESCRIPTIONS[slug];
        
        // Debug logging
        if (DEBUG) {
            console.log('Genre page detected:', window.location.pathname);
            console.log('Extracted slug:', slug);
            console.log('Found description:', desc ? 'Yes' : 'No');
        }
        
        if (!desc) return false;
        
        // Remove any existing subtitles (all types) to avoid conflicts
        const existingSubtitles = document.querySelectorAll(
            "h2[data-genre-subtitle='true'], " +
            "h2[data-latestfeed-subtitle='true'], " +
            "h2[data-beatpacks-subtitle='true'], " +
            "h2[data-producers-subtitle='true'], " +
            "h2[data-trending-subtitle='true'], " +
            "h2[data-genre-channel-subtitle='true'], " +
            "h2[data-pricing-subtitle='true'], " +
            "p[data-genre-subtitle='true'], " +
            "p[data-static-subtitle='true']"
        );
        existingSubtitles.forEach(el => el.remove());
        
        const p = document.createElement("p");
        p.setAttribute("data-genre-subtitle", "true");
        p.className = "text-base text-muted mb-4 subtitle-element subtitle-fade-in";
        p.textContent = desc;
        h1.insertAdjacentElement("afterend", p);
        
        if (DEBUG) console.log('Genre subtitle added successfully');
        return true;
    }

    // Section 2: Simplified Static Subtitles - handled by centralized manager

        // Improved initialization system
    function initSubtitles() {
        // Add animation styles
        addSubtitleAnimationStyles();
        
        // Enhanced function to check if page is ready for subtitles (more lenient for SPA)
        function isPageReady() {
            const h1 = document.querySelector('h1.text-3xl');
            const main = document.querySelector('main');
            const hasContent = document.querySelector('.dashboard-grid-main, [role="main"], main > div, .container, .content');
            
            // For SPA, we're more lenient - just need basic elements
            const basicReady = h1 && main;
            
            // For SPA navigation, don't be too strict about readyState
            const readyStateOk = document.readyState !== 'loading';
            
            return basicReady && readyStateOk;
        }
        
        // Use UIHelpersInitManager if available, otherwise fallback to original logic
        if (window.UIHelpersInitManager && !window.UIHelpersInitManager.isInitialized()) {
            window.UIHelpersInitManager.init();
        } else if (!window.UIHelpersInitManager) {
            // Function to attempt subtitle management
            function attemptSubtitles() {
                if (isPageReady()) {
                    return manageSubtitlesWithRetry(true);
                }
                return false;
            }
            
            // Enhanced retry system for first page load
            let retryCount = 0;
            const maxRetries = 15;
            
            function retryWithBackoff() {
                if (retryCount >= maxRetries) return;
                
                if (attemptSubtitles()) {
                    if (DEBUG) console.log('Subtitles loaded successfully after', retryCount, 'retries');
                    return;
                }
                
                retryCount++;
                // Progressive backoff: 50ms, 100ms, 200ms, 400ms, 800ms, then 1000ms
                const delay = retryCount <= 5 ? Math.min(50 * Math.pow(2, retryCount - 1), 800) : 1000;
                
                setTimeout(retryWithBackoff, delay);
            }
            
            // Try immediately, then use backoff retry
            if (!attemptSubtitles()) {
                retryWithBackoff();
            }
        }
        
        // Use UIHelpersInitManager for mutation observation if available, otherwise fallback
        if (!window.UIHelpersInitManager) {
            // Enhanced mutation observer for better SPA support
            let mutationDebounceTimeout = null;
            const observer = new MutationObserver((mutations) => {
                let shouldUpdate = false;
                let hasSignificantChange = false;
                
                mutations.forEach(mutation => {
                    if (mutation.type === 'childList') {
                        const target = mutation.target;
                        
                        // Skip mutations related to subtitle elements to prevent infinite loops
                        const isSubtitleMutation = Array.from(mutation.addedNodes).some(node => 
                            node.nodeType === 1 && (
                                node.matches && (
                                    node.matches('h2[data-latestfeed-subtitle="true"]') ||
                                    node.matches('h2[data-beatpacks-subtitle="true"]') ||
                                    node.matches('h2[data-producers-subtitle="true"]') ||
                                    node.matches('h2[data-trending-subtitle="true"]') ||
                                    node.matches('h2[data-genre-channel-subtitle="true"]') ||
                                    node.matches('h2[data-pricing-subtitle="true"]') ||
                                    node.matches('h2[data-genre-subtitle="true"]') ||
                                    node.matches('p[data-static-subtitle="true"]') ||
                                    node.matches('p[data-genre-subtitle="true"]')
                                )
                            )
                        ) || Array.from(mutation.removedNodes).some(node => 
                            node.nodeType === 1 && (
                                node.matches && (
                                    node.matches('h2[data-latestfeed-subtitle="true"]') ||
                                    node.matches('h2[data-beatpacks-subtitle="true"]') ||
                                    node.matches('h2[data-producers-subtitle="true"]') ||
                                    node.matches('h2[data-trending-subtitle="true"]') ||
                                    node.matches('h2[data-genre-channel-subtitle="true"]') ||
                                    node.matches('h2[data-pricing-subtitle="true"]') ||
                                    node.matches('h2[data-genre-subtitle="true"]') ||
                                    node.matches('p[data-static-subtitle="true"]') ||
                                    node.matches('p[data-genre-subtitle="true"]')
                                )
                            )
                        );
                        
                        if (isSubtitleMutation) {
                            if (DEBUG) console.log('Ignoring subtitle-related mutation to prevent infinite loop');
                            return; // Skip this mutation
                        }
                        
                        // Check for significant DOM changes that indicate navigation
                        if (target.matches && (
                            target.matches('main') ||
                            target.closest('main') ||
                            target.matches('.dashboard-grid-main') ||
                            target.closest('.dashboard-grid-main') ||
                            target.matches('body') ||
                            target.matches('[data-page]') ||
                            target.closest('[data-page]')
                        )) {
                            shouldUpdate = true;
                            
                            // Check if h1 was added (not just any change)
                            if (Array.from(mutation.addedNodes).some(node => 
                                node.nodeType === 1 && (
                                    node.matches('h1') ||
                                    node.querySelector('h1')
                                )
                            )) {
                                hasSignificantChange = true;
                            }
                        }
                        
                        // Only watch for h1 additions, not all changes
                        if (Array.from(mutation.addedNodes).some(node => 
                            node.nodeType === 1 && (
                                node.matches('h1') ||
                                node.querySelector('h1')
                            )
                        )) {
                            shouldUpdate = true;
                            hasSignificantChange = true;
                        }
                    }
                });
                
                if (shouldUpdate) {
                    // Check if subtitles already exist for current path to prevent redundant processing
                    const currentPagePath = normalizePath(window.location.pathname);
                    const existingSubtitles = document.querySelectorAll(
                        "h2[data-latestfeed-subtitle='true'], " +
                        "h2[data-beatpacks-subtitle='true'], " +
                        "h2[data-producers-subtitle='true'], " +
                        "h2[data-trending-subtitle='true'], " +
                        "h2[data-genre-channel-subtitle='true'], " +
                        "h2[data-pricing-subtitle='true'], " +
                        "h2[data-genre-subtitle='true'], " +
                        "p[data-static-subtitle='true'], " +
                        "p[data-genre-subtitle='true']"
                    );
                    
                    // Skip if subtitles already exist and we're on the same path
                    if (existingSubtitles.length > 0 && currentPath === currentPagePath) {
                        if (DEBUG) console.log('Mutation observer: subtitles already exist for path:', currentPagePath);
                        return;
                    }
                    
                    // Use separate debounce for mutation observer to prevent conflicts
                    if (mutationDebounceTimeout) {
                        clearTimeout(mutationDebounceTimeout);
                    }
                    mutationDebounceTimeout = setTimeout(() => {
                        if (!manageSubtitlesWithRetry(hasSignificantChange)) {
                            // Retry if failed
                            setTimeout(() => manageSubtitlesWithRetry(hasSignificantChange), 150);
                        }
                    }, hasSignificantChange ? 200 : 400); // Reduced delays for better responsiveness
                }
            });
            
            // Start observing with DOM readiness check
            function startObserving() {
                const targetNode = document.body || document.documentElement;
                if (!targetNode) {
                    if (DEBUG) console.warn('[BeatPass] DOM not ready for UI helpers observer, retrying...');
                    setTimeout(startObserving, 100);
                    return;
                }
                observer.observe(targetNode, {
                    childList: true,
                    subtree: true
                });
                if (DEBUG) console.log('[BeatPass] UI helpers observer setup complete');
            }
            startObserving();
        }
        
        // Use UIHelpersInitManager for navigation handling if available, otherwise fallback
        if (!window.UIHelpersInitManager) {
            // Enhanced navigation detection for SPA
            const originalPushState = history.pushState;
            const originalReplaceState = history.replaceState;
            
            function handleNavigation(eventType) {
                const newPath = normalizePath(window.location.pathname);
                if (DEBUG) console.log('Navigation detected:', eventType, newPath);
                
                // Only process if path actually changed
                if (currentPath === newPath) {
                    if (DEBUG) console.log('Navigation ignored - same path:', newPath);
                    return;
                }
                
                // Immediately remove existing subtitles to prevent flicker
                const allSubtitleSelector = "h2[data-latestfeed-subtitle='true'], " +
                                          "h2[data-beatpacks-subtitle='true'], " +
                                          "h2[data-producers-subtitle='true'], " +
                                          "h2[data-trending-subtitle='true'], " +
                                          "h2[data-genre-channel-subtitle='true'], " +
                                          "h2[data-pricing-subtitle='true'], " +
                                          "h2[data-genre-subtitle='true'], " +
                                          "p[data-static-subtitle='true'], " +
                                          "p[data-genre-subtitle='true']";
                
                const existingSubtitles = document.querySelectorAll(allSubtitleSelector);
                existingSubtitles.forEach(el => {
                    if (el.parentNode) {
                        el.remove();
                    }
                });
                
                if (DEBUG && existingSubtitles.length > 0) {
                    console.log('Immediately removed', existingSubtitles.length, 'existing subtitles on navigation');
                }
                
                // Reset processing state for new navigation
                isProcessing = false;
                if (processingTimeout) {
                    clearTimeout(processingTimeout);
                    processingTimeout = null;
                }
                
                // Clear any existing debounce to prioritize navigation events
                if (debounceTimeout) {
                    clearTimeout(debounceTimeout);
                }
                
                // Update periodic check tracking to prevent redundant processing
                if (typeof window.updateLastSubtitleTime === 'function') {
                    window.updateLastSubtitleTime();
                }
                
                // Enhanced navigation handling with retry mechanism
                debounceTimeout = setTimeout(() => {
                    // Try immediate injection
                    if (manageSubtitlesWithRetry(true)) {
                        // Success - update periodic check tracking to prevent redundant processing
                        if (typeof window.updateLastSubtitleTime === 'function') {
                            window.updateLastSubtitleTime();
                        }
                    } else {
                        // If failed, retry with progressive delays
                        setTimeout(() => {
                            if (manageSubtitlesWithRetry(true) && typeof window.updateLastSubtitleTime === 'function') {
                                window.updateLastSubtitleTime();
                            }
                        }, 100);
                        setTimeout(() => {
                            if (manageSubtitlesWithRetry(true) && typeof window.updateLastSubtitleTime === 'function') {
                                window.updateLastSubtitleTime();
                            }
                        }, 300);
                        setTimeout(() => {
                            if (manageSubtitlesWithRetry(true) && typeof window.updateLastSubtitleTime === 'function') {
                                window.updateLastSubtitleTime();
                            }
                        }, 600);
                    }
                }, 150);
            }
            
            history.pushState = function(...args) {
                const res = originalPushState.apply(this, args);
                handleNavigation('pushState');
                return res;
            };
            
            history.replaceState = function(...args) {
                const res = originalReplaceState.apply(this, args);
                handleNavigation('replaceState');
                return res;
            };
            
            // Handle back/forward navigation
            window.addEventListener('popstate', () => {
                handleNavigation('popstate');
            });
            
            // Additional event listeners for common SPA frameworks
            window.addEventListener('hashchange', () => {
                handleNavigation('hashchange');
            });
            
            // Listen for custom navigation events that SPAs might dispatch
            window.addEventListener('routechange', () => {
                handleNavigation('routechange');
            });
            
            window.addEventListener('navigationend', () => {
                handleNavigation('navigationend');
            });
        }
        
        // Use UIHelpersInitManager for periodic checks if available, otherwise fallback
        if (!window.UIHelpersInitManager) {
            // Minimal periodic check as a fallback for SPA navigation
            let lastKnownPath = window.location.pathname;
            let lastKnownH1Text = '';
            let lastSubtitleUpdateTime = 0;
            
            // Make lastSubtitleUpdateTime accessible to navigation handler
            window.updateLastSubtitleTime = () => {
                lastSubtitleUpdateTime = Date.now();
            };
            
            setInterval(() => {
                const currentPagePath = window.location.pathname;
                // Use flexible h1 selector to match any h1 element
                const h1 = document.querySelector('h1');
                const currentH1Text = h1 ? h1.textContent.trim() : '';
                const now = Date.now();
                
                // Only trigger on path changes (ignore H1 changes to reduce noise)
                const pathChanged = currentPagePath !== lastKnownPath;
                
                // Simplified throttling - only allow updates if significant time has passed
                const timeSinceLastUpdate = now - lastSubtitleUpdateTime;
                
                // Don't process if:
                // 1. Path hasn't changed
                // 2. Not enough time since last update (increased to 5 seconds)
                // 3. Current path matches what we're already tracking (avoid redundant processing)
                const shouldUpdate = pathChanged && 
                                   timeSinceLastUpdate > 5000 && 
                                   currentPagePath !== currentPath;
                
                if (shouldUpdate) {
                    if (DEBUG) console.log('Periodic check detected path change:', {
                        oldPath: lastKnownPath,
                        newPath: currentPagePath,
                        timeSinceLastUpdate: timeSinceLastUpdate
                    });
                    
                    // Immediately remove existing subtitles to prevent flicker
                    const allSubtitleSelector = "h2[data-latestfeed-subtitle='true'], " +
                                              "h2[data-beatpacks-subtitle='true'], " +
                                              "h2[data-producers-subtitle='true'], " +
                                              "h2[data-trending-subtitle='true'], " +
                                              "h2[data-genre-channel-subtitle='true'], " +
                                              "h2[data-pricing-subtitle='true'], " +
                                              "h2[data-genre-subtitle='true'], " +
                                              "p[data-static-subtitle='true'], " +
                                              "p[data-genre-subtitle='true']";
                    
                    const existingSubtitles = document.querySelectorAll(allSubtitleSelector);
                    existingSubtitles.forEach(el => {
                        if (el.parentNode) {
                            el.remove();
                        }
                    });
                    
                    if (DEBUG && existingSubtitles.length > 0) {
                        console.log('Periodic check removed', existingSubtitles.length, 'existing subtitles');
                    }
                    
                    lastKnownPath = currentPagePath;
                    lastKnownH1Text = currentH1Text;
                    lastSubtitleUpdateTime = now;
                    
                    // Reset processing state and debounced update
                    isProcessing = false;
                    
                    // Clear existing debounce and set new one
                    if (debounceTimeout) {
                        clearTimeout(debounceTimeout);
                    }
                    debounceTimeout = setTimeout(() => {
                        if (manageSubtitlesWithRetry(true)) {
                            // Success - update tracking
                            lastSubtitleUpdateTime = now;
                        } else {
                            // Retry if failed
                            setTimeout(() => {
                                if (manageSubtitlesWithRetry(true)) {
                                    lastSubtitleUpdateTime = Date.now();
                                }
                            }, 200);
                            setTimeout(() => {
                                if (manageSubtitlesWithRetry(true)) {
                                    lastSubtitleUpdateTime = Date.now();
                                }
                            }, 500);
                        }
                    }, 200);
                } else if (pathChanged) {
                    // Update tracking variables even if we don't process
                    lastKnownPath = currentPagePath;
                    lastKnownH1Text = currentH1Text;
                }
            }, 4000); // Increased frequency to 4000ms to reduce interference with navigation events
        }
        
        // Use UIHelpersInitManager for load events if available, otherwise fallback
        if (!window.UIHelpersInitManager) {
            // Enhanced window load event handling
            window.addEventListener('load', () => {
                // Reset retry count on window load
                retryCount = 0;
                setTimeout(() => {
                    if (!attemptSubtitles()) {
                        // If still failing after window load, try more aggressively
                        setTimeout(() => manageSubtitlesWithRetry(true), 200);
                        setTimeout(() => manageSubtitlesWithRetry(true), 500);
                        setTimeout(() => manageSubtitlesWithRetry(true), 1000);
                    }
                }, 100);
            });
        }
        
        // Additional trigger for DOMContentLoaded if we missed it
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => {
                    if (!attemptSubtitles()) {
                        retryWithBackoff();
                    }
                }, 50);
            });
        }
    }

    // Expose global initialization function for SPA routing
    window.initUIHelpers = function() {
        const newPath = normalizePath(window.location.pathname);
        if (DEBUG) console.log('[UI Helpers] Re-initializing for SPA navigation...', newPath);
        
        // Only process if path actually changed
        if (currentPath === newPath) {
            if (DEBUG) console.log('[UI Helpers] Skipping re-init - same path:', newPath);
            return;
        }
        
        // Reset processing state
        isProcessing = false;
        if (processingTimeout) {
            clearTimeout(processingTimeout);
            processingTimeout = null;
        }
        if (debounceTimeout) {
            clearTimeout(debounceTimeout);
            debounceTimeout = null;
        }
        
        // Force subtitle management with retry
        setTimeout(() => {
            if (manageSubtitlesWithRetry(true)) {
                // Success - update periodic check tracking
                if (typeof window.updateLastSubtitleTime === 'function') {
                    window.updateLastSubtitleTime();
                }
            } else {
                // Retry if failed
                setTimeout(() => {
                    if (manageSubtitlesWithRetry(true) && typeof window.updateLastSubtitleTime === 'function') {
                        window.updateLastSubtitleTime();
                    }
                }, 150);
                setTimeout(() => {
                    if (manageSubtitlesWithRetry(true) && typeof window.updateLastSubtitleTime === 'function') {
                        window.updateLastSubtitleTime();
                    }
                }, 400);
                setTimeout(() => {
                    if (manageSubtitlesWithRetry(true) && typeof window.updateLastSubtitleTime === 'function') {
                        window.updateLastSubtitleTime();
                    }
                }, 800);
            }
        }, 100);
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initSubtitles);
    } else {
        setTimeout(initSubtitles, 50);
    }
})();
