// ============================================================
// 8. Subtitle Injection for Various Pages
// ============================================================
(function() {
    // Centralized subtitle manager to prevent conflicts
    let isProcessing = false;
    let currentPath = null;
    let processingTimeout = null;
    
    // Add CSS animations for smooth transitions
    function addSubtitleAnimationStyles() {
        if (document.getElementById('subtitle-animation-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'subtitle-animation-styles';
        style.textContent = `
            .subtitle-fade-in {
                opacity: 0;
                transform: translateY(-10px);
                animation: subtitleFadeIn 0.4s ease-out forwards;
            }
            
            @keyframes subtitleFadeIn {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .subtitle-element {
                transition: opacity 0.3s ease, transform 0.3s ease;
            }
        `;
        document.head.appendChild(style);
    }
    function normalizePath(path) {
        return path.replace(/\/$/, "");
    }

    // Centralized subtitle manager
    function manageSubtitles() {
        const path = normalizePath(window.location.pathname);
        
        // Prevent duplicate processing
        if (isProcessing || currentPath === path) {
            return;
        }
        
        isProcessing = true;
        currentPath = path;
        
        // Clear any existing timeout
        if (processingTimeout) {
            clearTimeout(processingTimeout);
        }
        
        processingTimeout = setTimeout(() => {
            try {
                // Remove any existing subtitles immediately (no animation to prevent flicker)
                // But don't remove genre-specific subtitles if we're on a genre page
                let selector = "h2[data-latestfeed-subtitle='true'], " +
                               "h2[data-beatpacks-subtitle='true'], " +
                               "h2[data-producers-subtitle='true'], " +
                               "h2[data-trending-subtitle='true'], " +
                               "h2[data-genre-channel-subtitle='true'], " +
                               "h2[data-pricing-subtitle='true'], " +
                               "p[data-static-subtitle='true']";
                
                // Only remove genre subtitles if we're not on a genre page
                if (!isGenrePage()) {
                    selector = "h2[data-genre-subtitle='true'], " + selector + ", p[data-genre-subtitle='true']";
                }
                
                const existingSubtitles = document.querySelectorAll(selector);
                existingSubtitles.forEach(el => el.remove());
                
                // First, try to add genre subtitle if this is a genre page
                let genreSubtitleAdded = false;
                if (isGenrePage()) {
                    genreSubtitleAdded = addGenreSubtitle();
                    console.log('Genre subtitle attempt result:', genreSubtitleAdded);
                }
                
                // Add H1-based subtitle only if no genre subtitle was added
                if (!genreSubtitleAdded) {
                    console.log('Adding H1-based subtitle for path:', path);
                    addSubtitleForPath(path);
                }
                
                // Always try to add section-based subtitles
                console.log('Processing section-based subtitles');
                addSectionBasedSubtitles();
                
            } catch (error) {
                console.error('Subtitle management error:', error);
            } finally {
                isProcessing = false;
            }
        }, 100);
    }

    function addSubtitleForPath(path) {
        const h1 = document.querySelector("h1.text-3xl");
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
                // Fallback to section-based detection
                addSectionBasedSubtitles();
                return true;
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
            console.log('Skipping pricing page subtitle - carousel will handle it');
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
            // Try section-based detection for other pages
            addSectionBasedSubtitles();
            return true;
        }
        
        // Create and insert subtitle
        if (subtitleText) {
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
        
        console.log('Section anchors found:', anchors.length);
        anchors.forEach(anchor => console.log('Anchor href:', anchor.getAttribute("href")));
        
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
            console.log('Processing anchor with key:', key, 'text:', text);
            
            if (!text) return;
            
            const container = anchor.closest("div.mb-50") || anchor.closest("div.pb-24");
            if (!container) {
                console.log('No container found for anchor:', anchor.getAttribute("href"));
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
                console.log('Section subtitle added for:', key);
            } else {
                console.log('No title container found for:', key);
            }
        });
        
        console.log('Total section subtitles added:', addedCount);
        return addedCount > 0;
    }

    // Section 1: Dynamic Genre Subtitle
    function isGenrePage() {
        const isGenre = /^\/channel\/genre\//.test(window.location.pathname);
        console.log('Checking if genre page:', window.location.pathname, 'Result:', isGenre);
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
        
        const h1 = document.querySelector("h1.text-3xl");
        if (!h1) return false;
        
        const slug = window.location.pathname.split("/").filter(Boolean).pop() || "";
        const desc = GENRE_DESCRIPTIONS[slug];
        
        // Debug logging
        console.log('Genre page detected:', window.location.pathname);
        console.log('Extracted slug:', slug);
        console.log('Found description:', desc ? 'Yes' : 'No');
        
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
        
        console.log('Genre subtitle added successfully');
        return true;
    }

    // Section 2: Simplified Static Subtitles - handled by centralized manager

        // Simplified initialization system
    function initSubtitles() {
        // Add animation styles
        addSubtitleAnimationStyles();
        
        // Set up simple navigation detection
        ["pushState", "replaceState"].forEach(method => {
            const orig = history[method];
            history[method] = function(...args) {
                const res = orig.apply(this, args);
                // Reset state on navigation
                isProcessing = false;
                currentPath = null;
                setTimeout(() => {
                    manageSubtitles(); // Handle all subtitle types
                }, 150);
                return res;
            };
        });
        
        window.addEventListener("popstate", () => {
            // Reset state on navigation
            isProcessing = false;
            currentPath = null;
            setTimeout(() => {
                manageSubtitles(); // Handle all subtitle types
            }, 150);
        });
        
        // Initial load - try multiple times with increasing delays to ensure success
        const tryInitialLoad = () => {
            const h1Exists = document.querySelector("h1.text-3xl");
            if (h1Exists) {
                manageSubtitles(); // This now handles both genre and regular subtitles
                return true;
            }
            return false;
        };
        
        // Try immediately
        if (!tryInitialLoad()) {
            // Try after 200ms
            setTimeout(() => {
                if (!tryInitialLoad()) {
                    // Try after 500ms
                    setTimeout(() => {
                        if (!tryInitialLoad()) {
                            // Final try after 1000ms
                            setTimeout(tryInitialLoad, 1000);
                        }
                    }, 500);
                }
            }, 200);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initSubtitles);
    } else {
        setTimeout(initSubtitles, 50);
    }
})();
