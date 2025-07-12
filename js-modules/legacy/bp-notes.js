// ============================================================
// 11. Artist Profile Pinned Message Feature (Popup, Story Ring, Artist Page Only)
// ============================================================
(function() {
    const PIN_CONTAINER_ID = 'artist-pin-container';
    const PIN_RING_CLASS = 'artist-has-pin-ring';
    const MODAL_ID = 'artist-pin-modal';

    function isArtistProfilePage() {
        return /^\/artist\/(\d+)(\/|$)/.test(window.location.pathname);
    }

    // Optimized API with caching and error handling
    const api = {
        cache: new Map(),
        cacheTimeout: 30000, // 30 seconds
        
        async get(id) {
            const cacheKey = `get_${id}`;
            const cached = this.cache.get(cacheKey);
            
            if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
            
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);
                
                const r = await fetch(`pinned_message_handler.php?artist_id=${encodeURIComponent(id)}`, {
                    signal: controller.signal,
                    headers: {
                        'Accept': 'application/json',
                        'Cache-Control': 'no-cache'
                    }
                });
                
                clearTimeout(timeoutId);
                
                if (!r.ok) {
                    throw new Error(`HTTP ${r.status}: ${r.statusText}`);
                }
                
                const j = await r.json();
                const result = j.status === 'ok' ? j : {};
                
                // Cache successful results
                this.cache.set(cacheKey, {
                    data: result,
                    timestamp: Date.now()
                });
                
                return result;
            } catch (error) {
                console.warn('API get error:', error);
                return {};
            }
        },
        
        async save(id, msg, gradient, actions = []) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000);
                
                const r = await fetch('pinned_message_handler.php', {
                    method: 'POST',
                    signal: controller.signal,
                    headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ 
                        artist_id: id, 
                        message: msg, 
                        gradient, 
                        actions: Array.isArray(actions) ? actions : []
                    })
                });
                
                clearTimeout(timeoutId);
                
                if (!r.ok) {
                    throw new Error(`HTTP ${r.status}: ${r.statusText}`);
                }
                
                const j = await r.json();
                if (j.status !== 'ok') {
                    throw new Error(j.message || 'Error saving note');
                }
                
                // Invalidate cache for this artist
                this.cache.delete(`get_${id}`);
                
                return j.note || { message: msg, gradient, actions };
            } catch (error) {
                console.error('API save error:', error);
                throw error;
            }
        },
        
        async addNote(id, msg, gradient, actions = []) {
            return this.save(id, msg, gradient, actions);
        },
        
        async clearTimeline(id) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);
                
                const r = await fetch('pinned_message_handler.php', {
                    method: 'POST',
                    signal: controller.signal,
                    headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ 
                        artist_id: id, 
                        message: '', 
                        clear_timeline: true 
                    })
                });
                
                clearTimeout(timeoutId);
                
                if (!r.ok) {
                    throw new Error(`HTTP ${r.status}: ${r.statusText}`);
                }
                
                const j = await r.json();
                if (j.status !== 'ok') {
                    throw new Error(j.message || 'Error clearing timeline');
                }
                
                // Invalidate cache for this artist
                this.cache.delete(`get_${id}`);
                
                return j;
            } catch (error) {
                console.error('API clearTimeline error:', error);
                throw error;
            }
        }
    };
    // Fix: Expose api to global scope immediately after definition
    window.api = api;

    // Utility selectors
    function getProfileImage() {
        // Try to select the main profile image only in the profile header
        let container = document.querySelector('.flex.items-center.gap-12.mb-12, .flex.items-center.gap-12');
        if (container) {
            // Only use valid selectors
            let img = container.querySelector('img.w-256.h-256.rounded-full, img.rounded-full, img[alt*="Profile"], img[alt*="profile"]');
            // Optionally, filter for non-empty alt in JS
            if (img && img.alt && img.alt.trim() !== '') return img;
            // If not, just return the first match
            if (img) return img;
        }
        // Fallback: look for a large, rounded image anywhere in the DOM
        let img = document.querySelector('img.w-256.h-256.rounded-full, img.rounded-full, img[alt*="Profile"], img[alt*="profile"]');
        return img || null;
    }
    function getButtonRow() {
        // Try to find the row with Play/Follow/More
        return document.querySelector('div.flex.items-center.gap-12.mb-12, div.flex.items-center.gap-12');
    }
    function getArtistId() {
        const match = location.pathname.match(/\/artist\/(\d+)/);
        return match ? match[1] : null;
    }
    function getLoggedInName() {
        const selectors = [
            'button[role="presentation"] span.block.max-w-124',
            'span.mr-2.block.max-w-124.overflow-x-hidden.overflow-ellipsis.text-sm',
            'button span.block.max-w-124',
            'span.block.max-w-124'
        ];
        for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el) return el.textContent.trim();
        }
        return '';
    }
    function getProfileName() {
        const selectors = [
            'h1.text-2xl.md\\:text-4xl.font-semibold',
            'h1.text-2xl.md\\:text-4xl.font-semibold.mb-14.text-center.md\\:text-start',
            'h1.text-2xl.md\\:text-4xl.font-semibold.mb-14',
            'h1.text-2xl.md\\:text-4xl'
        ];
        for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el) {
                let text = '';
                for (let node of el.childNodes) {
                    if (node.nodeType === Node.TEXT_NODE) text += node.textContent;
                }
                return text.trim();
            }
        }
        return '';
    }

    // Enhanced fade helpers for banner with smooth animations
    function fadeIn(element) {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px) scale(0.95)';
        element.style.transition = 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1), transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
        
        // Force layout to ensure initial styles are applied
        element.offsetHeight;
        
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0) scale(1)';
            });
        });
    }
    
    function fadeOut(element, callback) {
        if (!element || !element.parentNode) {
            if (callback) callback();
            return;
        }
        
        if (window._pinBannerRemoving) return;
        window._pinBannerRemoving = true;
        
        element.style.transition = 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        element.style.transform = 'translateY(-15px) scale(0.95)';
        element.style.opacity = '0';
        
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
            window._pinBannerRemoving = false;
            if (callback) callback();
        }, 400);
    }

    // Enhanced story ring fade with premium glow-up effect
    function fadeInStoryRing(wrapper) {
        wrapper.style.opacity = '0';
        wrapper.style.transform = 'scale(0.8)';
        wrapper.style.boxShadow = '0 0 0px 0px transparent';
        wrapper.style.transition = 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)';
        
        // Force layout
        wrapper.offsetHeight;
        
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                wrapper.style.opacity = '1';
                wrapper.style.transform = 'scale(1)';
                wrapper.style.boxShadow = '0 0 32px 8px #ee2a7b77';
                
                // After glow-up, settle to normal state
                setTimeout(() => {
                    wrapper.style.transition = 'background-position 1.5s cubic-bezier(.4,2,.3,1), box-shadow 0.2s, transform 0.2s';
                    wrapper.style.boxShadow = '0 0 16px 2px #ee2a7b55';
                }, 800);
            });
        });
    }
    
    function fadeOutStoryRing(wrapper, callback) {
        if (!wrapper || !wrapper.parentNode) {
            if (callback) callback();
            return;
        }
        
        wrapper.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
        wrapper.style.transform = 'scale(0.8)';
        wrapper.style.opacity = '0';
        wrapper.style.boxShadow = '0 0 0px 0px transparent';
        
        setTimeout(() => {
            if (wrapper.parentNode) {
                const img = wrapper.querySelector('img');
                if (img && wrapper.parentNode) {
                    wrapper.parentNode.replaceChild(img, wrapper);
                }
            }
            if (callback) callback();
        }, 500);
    }

    // Modal helpers (redesigned to match native UI)
    function showModal(content, editable, onSave) {
        let modal = document.getElementById(MODAL_ID);
        if (modal) modal.remove();
        // Backdrop
        modal = document.createElement('div');
        modal.id = MODAL_ID;
        modal.className = 'pointer-events-none fixed inset-0 z-50 flex h-full w-full items-center justify-center';
        modal.style.opacity = '0';
        modal.style.transition = 'opacity 0.25s';
        modal.style.background = 'rgba(18, 18, 20, 0.72)';
        modal.style.backdropFilter = 'blur(6px)';
        modal.setAttribute('role', 'presentation');
        // Dialog
        const dialog = document.createElement('div');
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('tabindex', '-1');
        dialog.setAttribute('aria-modal', 'true');
        dialog.className = 'mx-auto pointer-events-auto outline-none flex flex-col overflow-hidden bp-modal-glass bp-modal-beatpass';
        dialog.style.maxWidth = '420px';
        dialog.style.width = '100%';
        dialog.style.margin = '0 auto';
        dialog.style.position = 'relative';
        // Gradient accent bar
        const gradientBar = document.createElement('div');
        gradientBar.className = 'bp-modal-gradient-header';
        gradientBar.style.background = 'linear-gradient(90deg, #ff8c42 0%, #ff3c3c 100%)';
        dialog.appendChild(gradientBar);
        // Header
        const header = document.createElement('div');
        header.className = 'flex flex-shrink-0 items-center gap-10 font-semibold px-24 py-16 text-main justify-between bp-modal-header';
        const h3 = document.createElement('h3');
        h3.className = 'text-lg font-bold mr-auto leading-6 text-white';
        h3.textContent = editable ? 'Edit Pinned Note' : 'Pinned Note';
        header.appendChild(h3);
        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'focus-visible:ring bg-transparent border-transparent hover:bg-hover disabled:text-disabled disabled:bg-transparent whitespace-nowrap inline-flex align-middle flex-shrink-0 items-center transition-button duration-200 select-none appearance-none no-underline outline-none disabled:pointer-events-none disabled:cursor-default rounded-button justify-center text-lg h-36 w-36 -mr-8 text-muted bp-modal-close-btn';
        closeBtn.setAttribute('aria-label', 'Dismiss');
        closeBtn.innerHTML = '<svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="svg-icon icon-sm" height="1em" width="1em"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"></path></svg>';
        closeBtn.onclick = () => fadeOut(modal);
        header.appendChild(closeBtn);
        dialog.appendChild(header);
        // Content
        const contentDiv = document.createElement('div');
        contentDiv.className = 'px-24 py-24 overflow-y-auto overflow-x-hidden overscroll-contain text-base flex-auto flex flex-col gap-20 bp-modal-content';
        if (editable) {
            const textarea = document.createElement('textarea');
            textarea.value = content || '';
            textarea.className = 'block w-full bg-[#181818] rounded-2xl border border-[#444] focus:ring focus:ring-primary/focus focus:border-primary/60 focus:outline-none shadow-sm text-base min-h-120 pl-20 pr-20 py-20 mb-24 text-white font-semibold bp-modal-textarea';
            textarea.style.resize = 'vertical';
            textarea.style.minHeight = '120px';
            textarea.style.maxHeight = '220px';
            textarea.style.fontSize = '1.08em';
            textarea.style.lineHeight = '1.5';
            textarea.style.boxSizing = 'border-box';
            textarea.style.backgroundColor = '#35353573';
            textarea.style.color = '#e4e4e4';
            textarea.maxLength = 60;
            contentDiv.appendChild(textarea);
            // Character counter
            const charCounter = document.createElement('div');
            charCounter.className = 'text-xs mt-2 mb-8 text-right font-mono opacity-85 bp-modal-charcount';
            charCounter.textContent = `${textarea.value.length}/60`;
            contentDiv.appendChild(charCounter);
            textarea.addEventListener('input', function(e) {
                if (textarea.value.length > 60) {
                    textarea.value = textarea.value.slice(0, 60);
                }
                charCounter.textContent = `${textarea.value.length}/60`;
                charCounter.style.color = textarea.value.length > 60 ? '#ef4444' : '#e4e4e4';
                
                // Update preview in real-time
                previewMsg.textContent = textarea.value || 'Your note will appear here...';
                previewMsg.style.opacity = textarea.value ? '1' : '0.5';
                
                // Enable/disable save button with smooth transition
                const shouldDisable = textarea.value.length === 0 || textarea.value.length > 60;
                if (postBtn.disabled !== shouldDisable) {
                    postBtn.disabled = shouldDisable;
                    postBtn.style.transform = shouldDisable ? 'scale(0.95)' : 'scale(1)';
                    postBtn.style.opacity = shouldDisable ? '0.6' : '1';
                }
            });
            // Save/Cancel row
            const btnRow = document.createElement('div');
            btnRow.className = 'flex gap-10 mt-20 justify-end';
            const saveBtn = document.createElement('button');
            saveBtn.textContent = 'Save';
            saveBtn.className = 'focus-visible:ring text-on-primary bg-gradient-to-r from-[#ff8c42] to-[#ff3c3c] border-0 hover:from-[#ff3c3c] hover:to-[#ff8c42] disabled:text-disabled disabled:bg-disabled disabled:border-transparent disabled:shadow-none whitespace-nowrap inline-flex align-middle flex-shrink-0 items-center transition-button duration-200 select-none appearance-none no-underline outline-none disabled:pointer-events-none disabled:cursor-default rounded-full justify-center font-bold text-base h-40 px-28 shadow-lg bp-modal-save-btn';
            saveBtn.disabled = (textarea.value.length === 0 || textarea.value.length > 60);
            saveBtn.onclick = async () => {
                saveBtn.disabled = true;
                try {
                    await onSave(textarea.value.trim());
                    fadeOut(modal);
                } catch (e) {
                    alert(e.message);
                    saveBtn.disabled = false;
                }
            };
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Cancel';
            cancelBtn.className = 'focus-visible:ring bg-transparent border border-[#444] hover:bg-hover disabled:text-disabled disabled:bg-transparent whitespace-nowrap inline-flex align-middle flex-shrink-0 items-center transition-button duration-200 select-none appearance-none no-underline outline-none disabled:pointer-events-none disabled:cursor-default rounded-full justify-center text-base h-40 px-28 text-white font-bold bp-modal-cancel-btn';
            cancelBtn.onclick = () => fadeOut(modal);
            btnRow.appendChild(saveBtn);
            btnRow.appendChild(cancelBtn);
            contentDiv.appendChild(btnRow);
        } else {
            const msg = document.createElement('div');
            msg.textContent = content || '';
            msg.className = 'text-lg text-white text-center py-16 px-16 rounded-2xl bg-black/70 mb-12 shadow border border-divider font-semibold bp-modal-message';
            msg.style.whiteSpace = 'pre-line';
            contentDiv.appendChild(msg);
        }
        dialog.appendChild(contentDiv);
        modal.appendChild(dialog);
        document.body.appendChild(modal);
        // Fade in
        setTimeout(() => { modal.style.opacity = '1'; }, 10);
        dialog.focus();
    }

    // Helper: format time ago
    function timeAgo(ts) {
        const now = Date.now();
        const diff = Math.floor((now - ts) / 1000); // seconds
        if (diff < 5) return 'just now';
        if (diff < 60) return `${diff} second${diff === 1 ? '' : 's'} ago`;
        if (diff < 3600) {
            const m = Math.floor(diff / 60);
            return `${m} minute${m === 1 ? '' : 's'} ago`;
        }
        if (diff < 86400) {
            const h = Math.floor(diff / 3600);
            return `${h} hour${h === 1 ? '' : 's'} ago`;
        }
        return 'yesterday';
    }

    // Helper: parse note content for URLs and Beatpass track links
    function parseNoteContent(note) {
        if (!note) return document.createTextNode('');
        const container = document.createElement('div');
        container.style.wordBreak = 'break-word';
        // Regex for URLs
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        // Regex for Beatpass track URLs
        const beatpassTrackRegex = /https?:\/\/(?:open\.)?beatpass\.ca\/track\/(\d+)(?:\/[^\s]*)?/g;
        let lastIndex = 0;
        let match;
        let hasTrack = false;
        let trackId = null;
        let trackUrl = null;
        let text = note;
        // First, check for Beatpass track link
        while ((match = beatpassTrackRegex.exec(note)) !== null) {
            hasTrack = true;
            trackId = match[1];
            trackUrl = match[0];
        }
        // If Beatpass track, show preview
        if (hasTrack && trackId) {
            // Add text before the link
            const before = note.slice(0, note.indexOf(trackUrl));
            if (before) container.appendChild(document.createTextNode(before));
            // Add track preview
            const preview = document.createElement('div');
            preview.className = 'bp-track-preview flex items-center gap-12 p-12 rounded-lg bg-black/60 mb-10';
            // Cover art (use Beatpass CDN or fallback)
            const cover = document.createElement('img');
            cover.className = 'w-48 h-48 rounded-md object-cover border border-divider';
            cover.src = `https://open.beatpass.ca/api/cover/${trackId}`;
            cover.onerror = function() { this.style.display = 'none'; };
            preview.appendChild(cover);
            // Info
            const info = document.createElement('div');
            info.className = 'flex flex-col gap-4';
            // Title (fetch via API if desired, else just show link)
            const title = document.createElement('div');
            title.className = 'font-semibold text-base text-white';
            title.textContent = 'Beatpass Track';
            info.appendChild(title);
            // CTAs
            const ctas = document.createElement('div');
            ctas.className = 'flex gap-8 mt-4';
            // Play button
            const playBtn = document.createElement('button');
            playBtn.className = 'px-10 py-6 rounded bg-primary text-white font-semibold hover:bg-primary-dark shadow';
            playBtn.textContent = 'Play';
            playBtn.onclick = () => { window.open(trackUrl, '_blank'); };
            ctas.appendChild(playBtn);
            // Copy link button
            const copyBtn = document.createElement('button');
            copyBtn.className = 'px-10 py-6 rounded bg-black/40 text-white font-semibold hover:bg-black/70 border border-divider';
            copyBtn.textContent = 'Copy Link';
            copyBtn.onclick = () => { navigator.clipboard.writeText(trackUrl); copyBtn.textContent = 'Copied!'; setTimeout(() => copyBtn.textContent = 'Copy Link', 1200); };
            ctas.appendChild(copyBtn);
            info.appendChild(ctas);
            preview.appendChild(info);
            container.appendChild(preview);
            // Add text after the link
            const after = note.slice(note.indexOf(trackUrl) + trackUrl.length);
            if (after) container.appendChild(document.createTextNode(after));
        } else {
            // Otherwise, linkify all URLs
            let lastIdx = 0;
            let m;
            while ((m = urlRegex.exec(note)) !== null) {
                const url = m[0];
                if (m.index > lastIdx) {
                    container.appendChild(document.createTextNode(note.slice(lastIdx, m.index)));
                }
                const a = document.createElement('a');
                a.href = url;
                a.textContent = url;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                a.className = 'text-primary underline hover:text-primary-dark';
                container.appendChild(a);
                // CTA for non-beatpass links
                if (!url.includes('beatpass.ca/track/')) {
                    const visitBtn = document.createElement('button');
                    visitBtn.className = 'ml-6 px-8 py-4 rounded bg-primary text-white font-semibold hover:bg-primary-dark shadow text-xs';
                    visitBtn.textContent = 'Visit';
                    visitBtn.onclick = () => { window.open(url, '_blank'); };
                    container.appendChild(visitBtn);
                }
                lastIdx = m.index + url.length;
            }
            if (lastIdx < note.length) {
                container.appendChild(document.createTextNode(note.slice(lastIdx)));
            }
        }
        return container;
    }

    // Add at the top: define available emojis for reactions
    const BP_NOTE_EMOJIS = ['👍', '🔥', '❤️'];

    // Refined BP Notes Modal (reference-inspired, new lord-icon for view count)
    function showBPNoteModal({ message, editable, onSave, onDelete, viewerCount, createdAt, isLoggedIn, avatarUrl, forceEdit = false, currentGradient, actions = {}, reactions = {} }) {
        let modal = document.getElementById(MODAL_ID);
        if (modal) modal.remove();
        // Modal root
        modal = document.createElement('div');
        modal.id = MODAL_ID;
        modal.className = 'fixed inset-0 isolate z-modal';
        modal.tabIndex = -1;
        modal.style.opacity = '0';
        modal.style.transition = 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        // Backdrop
        const backdrop = document.createElement('div');
        backdrop.className = 'bg-background/80 inset-0 z-10 h-full w-full absolute backdrop-blur-sm';
        backdrop.setAttribute('aria-hidden', 'true');
        backdrop.style.opacity = '0';
        backdrop.style.transition = 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        modal.appendChild(backdrop);
        // Centering wrapper
        const centerWrap = document.createElement('div');
        centerWrap.className = 'pointer-events-none absolute inset-0 z-20 flex h-full w-full items-center justify-center';
        centerWrap.setAttribute('role', 'presentation');
        centerWrap.style.opacity = '0';
        centerWrap.style.transform = 'scale(0.95) translateY(20px)';
        centerWrap.style.transition = 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
        // Modal card
        const card = document.createElement('div');
        card.setAttribute('role', 'dialog');
        card.setAttribute('tabindex', '-1');
        card.setAttribute('aria-modal', 'true');
        card.className = 'mx-auto pointer-events-auto outline-none flex flex-col overflow-hidden bg-paper w-780 shadow-2xl border max-h-dialog rounded-2xl max-w-dialog';
        card.style.setProperty('--be-dialog-padding', '24px');
        card.style.filter = 'drop-shadow(0 25px 50px rgba(0, 0, 0, 0.25))';
        // Header: Avatar, Name, Subtitle, Close
        const header = document.createElement('div');
        header.className = 'flex items-center gap-16 px-24 py-16 border-b border-divider bg-background/80';
        // Avatar
        const avatar = document.createElement('img');
        avatar.src = avatarUrl || 'https://bpass24.s3.us-east-005.backblazeb2.com/storage/branding_media/8524b656-7e0d-4271-9503-03d515ac6ecc.png';
        avatar.className = 'w-48 h-48 rounded-full object-cover border border-divider shadow-sm';
        header.appendChild(avatar);
        // Name & subtitle
        const nameCol = document.createElement('div');
        nameCol.className = 'flex flex-col';
        const name = document.createElement('div');
        name.className = 'font-bold text-lg text-white';
        name.textContent = getProfileName() || 'Producer';
        nameCol.appendChild(name);
        const subtitle = document.createElement('div');
        subtitle.className = 'text-sm text-muted font-medium';
        subtitle.textContent = editable ? (forceEdit ? 'Post a Note to your profile' : 'Pinned Note') : 'Pinned Note';
        nameCol.appendChild(subtitle);
        header.appendChild(nameCol);
        // Helper (only in edit mode)
        if (editable && forceEdit) {
            const helper = document.createElement('div');
            helper.className = 'text-xs text-muted mt-2';
            helper.textContent = 'Share an update, inspiration, or note with your fans. Notes appear on your profile and can include a call-to-action.';
            nameCol.appendChild(helper);
        }
        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'ml-auto focus-visible:ring bg-transparent border-transparent hover:bg-hover disabled:text-disabled disabled:bg-transparent whitespace-nowrap inline-flex align-middle flex-shrink-0 items-center transition-button duration-200 select-none appearance-none no-underline outline-none disabled:pointer-events-none disabled:cursor-default rounded-button justify-center text-sm h-36 w-36 -mr-8 text-muted';
        closeBtn.setAttribute('aria-label', 'Dismiss');
        closeBtn.innerHTML = '<svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="svg-icon icon-sm" height="1em" width="1em"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"></path></svg>';
        closeBtn.onclick = closeModal;
        header.appendChild(closeBtn);
        card.appendChild(header);
        // Content
        const content = document.createElement('div');
        content.className = 'px-24 py-20 overflow-y-auto overflow-x-hidden overscroll-contain text-sm flex-auto flex flex-col gap-24';
        if (forceEdit) {
            // --- Note Section (Edit Mode) ---
            const noteSection = document.createElement('div');
            noteSection.className = 'flex flex-col gap-8';
            const noteLabel = document.createElement('div');
            noteLabel.className = 'font-semibold text-base text-white mb-2';
            noteLabel.textContent = 'Note';
            noteSection.appendChild(noteLabel);
            const noteHelper = document.createElement('div');
            noteHelper.className = 'text-xs text-muted mb-4';
            noteHelper.textContent = "What's on your mind? (max 60 characters)";
            noteSection.appendChild(noteHelper);
            // Textarea
            const textarea = document.createElement('textarea');
            textarea.value = message || '';
            textarea.className = 'block text-left relative w-full appearance-none transition-shadow text bg-transparent rounded-input border-divider border focus:ring focus:ring-primary/focus focus:border-primary/60 focus:outline-none shadow-sm text-base min-h-80 pl-16 pr-16 py-12 font-semibold resize-none';
            textarea.placeholder = 'Share an update, inspiration, or note with your fans…';
            textarea.maxLength = 60;
            noteSection.appendChild(textarea);
            // Char counter
            const charCounter = document.createElement('div');
            charCounter.className = 'text-xs text-right text-muted font-mono mt-2';
            charCounter.textContent = `${textarea.value.length}/60`;
            noteSection.appendChild(charCounter);
            content.appendChild(noteSection);
            // --- Live Preview (Edit Mode) ---
            const previewSection = document.createElement('div');
            previewSection.className = 'flex flex-col gap-8';
            const previewLabel = document.createElement('div');
            previewLabel.className = 'font-semibold text-base text-white mb-2';
            previewLabel.textContent = 'Live Preview';
            previewSection.appendChild(previewLabel);
            const previewDiv = document.createElement('div');
            previewDiv.className = 'rounded-2xl min-h-80 px-20 py-16 flex flex-col gap-8 shadow-lg border border-divider bg-gradient-to-br';
            // background will be set after gradient picker
            // Avatar, name, timestamp
            const previewHeader = document.createElement('div');
            previewHeader.className = 'flex items-center gap-10 mb-4';
            const previewAvatar = avatar.cloneNode(true);
            previewHeader.appendChild(previewAvatar);
            const previewNameCol = document.createElement('div');
            previewNameCol.className = 'flex flex-col';
            const previewName = document.createElement('div');
            previewName.className = 'font-bold text-base text-white';
            previewName.textContent = name.textContent;
            previewNameCol.appendChild(previewName);
            const previewTime = document.createElement('div');
            previewTime.className = 'text-xs text-muted';
            previewTime.textContent = createdAt ? timeAgoRefined(createdAt) : 'now';
            previewNameCol.appendChild(previewTime);
            previewHeader.appendChild(previewNameCol);
            previewDiv.appendChild(previewHeader);
            // Message
            const previewMsg = document.createElement('div');
            previewMsg.className = 'text-lg text-white font-semibold mb-2';
            previewMsg.textContent = textarea.value;
            previewDiv.appendChild(previewMsg);
            // Actions preview
            const previewActions = document.createElement('div');
            previewActions.className = 'flex gap-8 mt-2';
            previewDiv.appendChild(previewActions);
            previewSection.appendChild(previewDiv);
            content.appendChild(previewSection);
            // --- Gradient Picker (Edit Mode) ---
            const gradSection = document.createElement('div');
            gradSection.className = 'flex flex-col gap-8';
            const gradLabel = document.createElement('div');
            gradLabel.className = 'font-semibold text-base text-white mb-2';
            gradLabel.textContent = 'Background';
            gradSection.appendChild(gradLabel);
            const gradHelper = document.createElement('div');
            gradHelper.className = 'text-xs text-muted mb-4';
            gradHelper.textContent = 'Choose a background for your note.';
            gradSection.appendChild(gradHelper);
            const gradRow = document.createElement('div');
            gradRow.className = 'flex gap-12';
            let selectedGradient = currentGradient || BP_NOTE_GRADIENTS[0].value;
            previewDiv.style.background = selectedGradient;
            // Helper to update both preview and #artist-pin-container
            function updateAllGradients(newGradient) {
                previewDiv.style.background = newGradient;
                // Also update #artist-pin-container if present
                const pinBanner = document.getElementById('artist-pin-container');
                if (pinBanner) {
                    pinBanner.style.background = newGradient;
                    pinBanner.style.backgroundSize = '200% 100%';
                    pinBanner.style.backgroundPosition = '0% 50%';
                    pinBanner.style.animation = 'bp-gradient-pan 12s linear infinite';
                    // Update box-shadow color
                    if (typeof getFirstGradientColor === 'function') {
                        const shadowColor = getFirstGradientColor(newGradient) + '33';
                        pinBanner.style.boxShadow = `0 4px 18px 0 ${shadowColor}, 0 1.5px 6px 0 rgba(0,0,0,0.10)`;
                    }
                }
            }
            BP_NOTE_GRADIENTS.forEach(preset => {
                const swatch = document.createElement('button');
                swatch.type = 'button';
                swatch.title = preset.name;
                swatch.className = 'w-40 h-40 rounded-2xl border-2 border-divider focus:outline-none transition-all duration-200';
                swatch.style.background = preset.value;
                swatch.style.marginRight = '4px';
                swatch.style.cursor = 'pointer';
                swatch.style.boxShadow = '0 2px 8px 0 rgba(0,0,0,0.10)';
                swatch.style.outline = selectedGradient === preset.value ? '2.5px solid #fff' : '';
                swatch.onfocus = () => { swatch.style.outline = '2.5px solid #fff'; };
                swatch.onblur = () => { if (selectedGradient !== preset.value) swatch.style.outline = ''; };
                swatch.onmouseenter = () => { swatch.style.transform = 'scale(1.08)'; };
                swatch.onmouseleave = () => { swatch.style.transform = 'scale(1)'; };
                swatch.onclick = () => {
                    selectedGradient = preset.value;
                    gradRow.querySelectorAll('button').forEach(b => b.style.outline = '');
                    swatch.style.outline = '2.5px solid #fff';
                    updateAllGradients(selectedGradient);
                };
                gradRow.appendChild(swatch);
            });
            gradSection.appendChild(gradRow);
            content.appendChild(gradSection);
            // --- Actions Section (Edit Mode) ---
            const actionsSection = document.createElement('div');
            actionsSection.className = 'flex flex-col gap-4 p-24 rounded-panel border border-divider bg-background/60';
            
            const actionsLabel = document.createElement('div');
            actionsLabel.className = 'font-semibold text-base text-main mb-1 flex items-center gap-2';
            actionsLabel.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3"/></svg>Action Button';
            actionsSection.appendChild(actionsLabel);
            
            const actionsHelper = document.createElement('div');
            actionsHelper.className = 'text-xs text-muted mb-4 leading-5';
            actionsHelper.textContent = 'Add a call-to-action button to drive engagement. Choose from presets or create a custom action.';
            actionsSection.appendChild(actionsHelper);
            
            // Enhanced CTA row with better layout
            const ctaRow = document.createElement('div');
            ctaRow.className = 'bp-modal-cta-row flex flex-col gap-3';
            
            // Label selection with improved design
            const labelContainer = document.createElement('div');
            labelContainer.className = 'flex flex-col gap-2';
            const labelTitle = document.createElement('label');
            labelTitle.className = 'text-sm font-medium text-main';
            labelTitle.textContent = 'Button Type';
            labelContainer.appendChild(labelTitle);
            
            // Dropdown wrapper (like native dropdowns)
            const selectWrapper = document.createElement('div');
            selectWrapper.className = 'isolate relative';
            // Add dark mode styles for select
            const labelSelect = document.createElement('select');
            labelSelect.className = 'block text-left relative w-full appearance-none transition-shadow text bg-transparent rounded-input border-divider border focus:ring focus:ring-primary/focus focus:border-primary/60 focus:outline-none shadow-sm text-sm h-42 pl-12 pr-46 min-w-128';
            labelSelect.style.background = 'rgba(30,30,35,0.98)';
            labelSelect.style.color = '#e4e4e4';
            labelSelect.style.borderColor = 'rgba(255,255,255,0.12)';
            labelSelect.style.boxShadow = '0 2px 8px 0 rgba(0,0,0,0.18)';
            labelSelect.style.fontWeight = '500';
            // Add dark mode styles for options
            const presets = [
                { label: '🎵 Listen', value: 'Listen' },
                { label: '💰 Buy', value: 'Buy' },
                { label: '🌐 Visit Website', value: 'Visit Website' },
                { label: '🎬 Watch Video', value: 'Watch Video' },
                { label: '💿 Stream', value: 'Stream' },
                { label: '🔗 Custom…', value: 'custom' }
            ];
            presets.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt.value === 'custom' ? opt.value : opt.value;
                option.textContent = opt.label;
                option.style.background = 'rgba(30,30,35,0.98)';
                option.style.color = '#e4e4e4';
                option.style.fontWeight = '500';
                labelSelect.appendChild(option);
            });
            selectWrapper.appendChild(labelSelect);
            
            // Add native dropdown arrow icon
            const arrowIcon = document.createElement('div');
            arrowIcon.className = 'pointer-events-none absolute top-0 z-10 flex h-full min-w-42 items-center justify-center text-muted right-0 icon-sm';
            arrowIcon.innerHTML = '<svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" data-testid="KeyboardArrowDownOutlinedIcon" class="svg-icon icon-md" height="1em" width="1em"><path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"></path></svg>';
            selectWrapper.appendChild(arrowIcon);
            
            labelContainer.appendChild(selectWrapper);
            ctaRow.appendChild(labelContainer);
            
            // Custom label input with smooth transition
            const customContainer = document.createElement('div');
            customContainer.className = 'flex flex-col gap-2 transition-all duration-300';
            customContainer.style.maxHeight = '0';
            customContainer.style.opacity = '0';
            customContainer.style.overflow = 'hidden';
            
            const customTitle = document.createElement('label');
            customTitle.className = 'text-sm font-medium text-main';
            customTitle.textContent = 'Custom Label';
            customContainer.appendChild(customTitle);
            
            const customLabelInput = document.createElement('input');
            customLabelInput.type = 'text';
            customLabelInput.placeholder = 'Enter button text (e.g. "Stream Now", "Download")';
            customLabelInput.className = 'block text-left relative w-full appearance-none transition-shadow text bg-transparent rounded-input border-divider border focus:ring focus:ring-primary/focus focus:border-primary/60 focus:outline-none shadow-sm text-sm h-42 pl-12 pr-12';
            customLabelInput.maxLength = 20;
            customContainer.appendChild(customLabelInput);
            ctaRow.appendChild(customContainer);
            
            // URL input with validation indicator
            const urlContainer = document.createElement('div');
            urlContainer.className = 'flex flex-col gap-2';
            const urlTitle = document.createElement('label');
            urlTitle.className = 'text-sm font-medium text-main';
            urlTitle.textContent = 'Destination URL';
            urlContainer.appendChild(urlTitle);
            
            const urlInputWrapper = document.createElement('div');
            urlInputWrapper.className = 'relative';
            const urlInput = document.createElement('input');
            urlInput.type = 'url';
            urlInput.placeholder = 'https://example.com/your-link';
            urlInput.className = 'block text-left relative w-full appearance-none transition-shadow text bg-transparent rounded-input border-divider border focus:ring focus:ring-primary/focus focus:border-primary/60 focus:outline-none shadow-sm text-sm h-42 pl-12 pr-46';
            // Prefill with current CTA URL if available
            if (actions && actions.length > 0 && actions[0].url) {
                urlInput.value = actions[0].url;
            }
            
            const urlValidationIcon = document.createElement('div');
            urlValidationIcon.className = 'absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 opacity-0 transition-opacity duration-200';
            urlValidationIcon.innerHTML = '<svg viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 text-green-400"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>';
            
            urlInputWrapper.appendChild(urlInput);
            urlInputWrapper.appendChild(urlValidationIcon);
            urlContainer.appendChild(urlInputWrapper);
            ctaRow.appendChild(urlContainer);
            
            actionsSection.appendChild(ctaRow);
            content.appendChild(actionsSection);
            // Prefill button type from existing action if available
            if (actions && actions.length > 0 && actions[0].label) {
                const existingLabel = actions[0].label;
                const presetValues = presets.map(p => p.value);
                if (presetValues.includes(existingLabel)) {
                    labelSelect.value = existingLabel;
                } else {
                    labelSelect.value = 'custom';
                    customLabelInput.value = existingLabel;
                    // Show custom input
                    customContainer.style.maxHeight = '120px';
                    customContainer.style.opacity = '1';
                    customContainer.style.marginTop = '8px';
                }
            }
            
            // Enhanced show/hide custom label input with smooth transitions
            labelSelect.addEventListener('change', () => {
                if (labelSelect.value === 'custom') {
                    customContainer.style.maxHeight = '120px';
                    customContainer.style.opacity = '1';
                    customContainer.style.marginTop = '8px';
                    setTimeout(() => customLabelInput.focus(), 300);
                } else {
                    customContainer.style.maxHeight = '0';
                    customContainer.style.opacity = '0';
                    customContainer.style.marginTop = '0';
                }
            });
            
            // URL validation with visual feedback
            function validateUrl(url) {
                try {
                    new URL(url);
                    return true;
                } catch { return false; }
            }
            
            urlInput.addEventListener('input', () => {
                const isValid = urlInput.value && validateUrl(urlInput.value);
                if (isValid) {
                    urlValidationIcon.style.opacity = '1';
                    urlInput.style.borderColor = 'var(--be-success, rgb(34, 197, 94))';
                } else if (urlInput.value) {
                    urlValidationIcon.style.opacity = '0';
                    urlInput.style.borderColor = 'var(--be-danger, rgb(239, 68, 68))';
                } else {
                    urlValidationIcon.style.opacity = '0';
                    urlInput.style.borderColor = '';
                }
            });
            
            // Character counter for custom label
            const customCharCounter = document.createElement('div');
            customCharCounter.className = 'text-xs text-muted text-right mt-1 font-mono';
            customCharCounter.textContent = '0/20';
            customContainer.appendChild(customCharCounter);
            
            customLabelInput.addEventListener('input', () => {
                const len = customLabelInput.value.length;
                customCharCounter.textContent = `${len}/20`;
                customCharCounter.style.color = len > 20 ? 'rgb(239, 68, 68)' : '';
            });
            // --- Footer: Post/Cancel/Delete (Edit Mode) ---
            const footer = document.createElement('div');
            footer.className = 'px-24 py-20 flex items-center gap-10 flex-shrink-0 justify-end border-t border-divider bg-background/80';
            let postBtn;
            if (forceEdit) {
                // Edit mode: Post, Cancel, Delete
                postBtn = document.createElement('button');
                postBtn.textContent = 'Post';
                postBtn.className = 'focus-visible:ring text-on-primary bg-primary border border-primary hover:bg-primary-dark hover:border-primary-dark disabled:text-disabled disabled:bg-disabled disabled:border-transparent disabled:shadow-none whitespace-nowrap inline-flex align-middle flex-shrink-0 items-center transition-button duration-200 select-none appearance-none no-underline outline-none disabled:pointer-events-none disabled:cursor-default rounded-button justify-center font-semibold text-base h-40 px-28 shadow-lg';
                postBtn.style.borderRadius = '8px';
                postBtn.style.height = '44px';
                postBtn.style.minWidth = '44px';
                postBtn.style.padding = '0 24px';
                postBtn.disabled = textarea.value.length === 0 || textarea.value.length > 60;
                postBtn.onclick = async () => {
                    postBtn.disabled = true;
                    // Collect action
                    let label = labelSelect.value === 'custom' ? customLabelInput.value.trim() : labelSelect.value;
                    let url = urlInput.value.trim();
                    const newActions = [];
                    if (label && url) newActions.push({ label, url });
                    try {
                        // Always pass selectedGradient to onSave
                        await onSave(textarea.value.trim(), selectedGradient, newActions);
                        // Always fetch latest backend value and re-render
                        if (typeof render === 'function') await render();
                        closeModal();
                    } catch (e) {
                        alert(e.message);
                        postBtn.disabled = false;
                    }
                };
                const cancelBtn = document.createElement('button');
                cancelBtn.textContent = 'Cancel';
                cancelBtn.className = 'focus-visible:ring bg-transparent border border-divider hover:bg-hover disabled:text-disabled disabled:bg-transparent whitespace-nowrap inline-flex align-middle flex-shrink-0 items-center transition-button duration-200 select-none appearance-none no-underline outline-none disabled:pointer-events-none disabled:cursor-default rounded-button justify-center font-semibold text-base h-40 px-28 text-main';
                cancelBtn.style.borderRadius = '8px';
                cancelBtn.style.height = '44px';
                cancelBtn.style.minWidth = '44px';
                cancelBtn.style.padding = '0 24px';
                cancelBtn.onclick = closeModal;
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Delete';
                deleteBtn.className = 'focus-visible:ring text-danger border border-danger hover:bg-danger/10 hover:border-danger whitespace-nowrap inline-flex align-middle flex-shrink-0 items-center transition-button duration-200 select-none appearance-none no-underline outline-none rounded-button justify-center font-semibold text-base h-40 px-28';
                deleteBtn.style.borderRadius = '8px';
                deleteBtn.style.height = '44px';
                deleteBtn.style.minWidth = '44px';
                deleteBtn.style.padding = '0 24px';
                deleteBtn.onclick = async () => {
                    if (confirm('Are you sure you want to delete your pinned note?')) {
                        try {
                            await onDelete();
                            closeModal();
                        } catch (e) {
                            alert(e.message);
                        }
                    }
                };
                footer.appendChild(cancelBtn);
                footer.appendChild(deleteBtn);
                footer.appendChild(postBtn);
                
                // Setup textarea input event listener after all buttons are created
                textarea.addEventListener('input', function(e) {
                    if (textarea.value.length > 60) {
                        textarea.value = textarea.value.slice(0, 60);
                    }
                    charCounter.textContent = `${textarea.value.length}/60`;
                    charCounter.style.color = textarea.value.length > 60 ? '#ef4444' : '#e4e4e4';
                    
                    // Update preview in real-time
                    previewMsg.textContent = textarea.value || 'Your note will appear here...';
                    previewMsg.style.opacity = textarea.value ? '1' : '0.5';
                    
                    // Enable/disable save button with smooth transition
                    const shouldDisable = textarea.value.length === 0 || textarea.value.length > 60;
                    if (postBtn.disabled !== shouldDisable) {
                        postBtn.disabled = shouldDisable;
                        postBtn.style.transform = shouldDisable ? 'scale(0.95)' : 'scale(1)';
                        postBtn.style.opacity = shouldDisable ? '0.6' : '1';
                    }
                });
            }
            card.appendChild(content);
            card.appendChild(footer);
        } else {
            // --- View Mode ---
            const viewSection = document.createElement('div');
            viewSection.className = 'flex flex-col gap-8';
            // Banner preview
            const banner = document.createElement('div');
            banner.className = 'rounded-2xl min-h-80 px-20 py-16 flex flex-col gap-8 shadow-lg border border-divider';
            banner.style.background = currentGradient || BP_NOTE_GRADIENTS[0].value;
            // Avatar, name, timestamp
            const bannerHeader = document.createElement('div');
            bannerHeader.className = 'flex items-center gap-10 mb-4';
            const bannerAvatar = avatar.cloneNode(true);
            bannerHeader.appendChild(bannerAvatar);
            const bannerNameCol = document.createElement('div');
            bannerNameCol.className = 'flex flex-col';
            const bannerName = document.createElement('div');
            bannerName.className = 'font-bold text-base text-white';
            bannerName.textContent = name.textContent;
            bannerNameCol.appendChild(bannerName);
            const bannerTime = document.createElement('div');
            bannerTime.className = 'text-xs text-muted';
            bannerTime.textContent = createdAt ? timeAgoRefined(createdAt) : 'now';
            bannerNameCol.appendChild(bannerTime);
            bannerHeader.appendChild(bannerNameCol);
            banner.appendChild(bannerHeader);
            // Message
            const bannerMsg = document.createElement('div');
            bannerMsg.className = 'text-lg text-white font-semibold mb-2';
            bannerMsg.textContent = message || '';
            banner.appendChild(bannerMsg);
            // Enhanced action button display with SEO image background
            if (actions && actions.length > 0 && actions[0].label && actions[0].url) {
                const actionContainer = document.createElement('div');
                actionContainer.className = 'bp-modal-action-container';
                actionContainer.style.cssText = `
                    margin-top: 16px;
                    position: relative;
                    overflow: hidden;
                    border-radius: 12px;
                    min-height: 56px;
                `;

                // Create background overlay for SEO image
                const backgroundOverlay = document.createElement('div');
                backgroundOverlay.style.cssText = `
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(135deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 100%);
                    backdrop-filter: blur(8px);
                    z-index: 1;
                `;

                // SEO image background removed - using clean glassmorphism design

                const actionBtn = document.createElement('a');
                actionBtn.href = actions[0].url;
                actionBtn.target = '_blank';
                actionBtn.rel = 'noopener noreferrer';
                actionBtn.className = 'bp-modal-enhanced-action-btn';
                actionBtn.style.cssText = `
                    position: relative;
                    z-index: 2;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    padding: 14px 24px;
                    background: rgba(255, 255, 255, 0.18);
                    color: #fff;
                    text-decoration: none;
                    font-weight: 600;
                    font-size: 15px;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    backdrop-filter: blur(20px);
                    min-height: 56px;
                    width: 100%;
                    letter-spacing: 0.02em;
                `;
                
                // Enhanced hover effects
                actionBtn.addEventListener('mouseenter', () => {
                    actionBtn.style.background = 'rgba(255, 255, 255, 0.28)';
                    actionBtn.style.transform = 'translateY(-3px) scale(1.02)';
                    actionBtn.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.4)';
                    actionBtn.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                });
                
                actionBtn.addEventListener('mouseleave', () => {
                    actionBtn.style.background = 'rgba(255, 255, 255, 0.18)';
                    actionBtn.style.transform = 'translateY(0) scale(1)';
                    actionBtn.style.boxShadow = 'none';
                    actionBtn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                });
                
                // Enhanced icon mapping
                const iconMap = {
                    'Listen': '🎵',
                    'Buy': '🛒',
                    'Visit Website': '🌐',
                    'Watch Video': '📺',
                    'Stream': '🎶',
                    'Download': '⬇️',
                    'Subscribe': '⭐',
                    'Follow': '👤'
                };
                const icon = iconMap[actions[0].label] || '🔗';
                
                const buttonContent = document.createElement('span');
                buttonContent.style.cssText = 'display: flex; align-items: center; gap: 10px;';
                buttonContent.innerHTML = `<span style="font-size: 18px;">${icon}</span><span>${actions[0].label}</span>`;
                actionBtn.appendChild(buttonContent);

                // Assemble the action container (clean glassmorphism design)
                actionContainer.appendChild(backgroundOverlay);
                actionContainer.appendChild(actionBtn);
                
                banner.appendChild(actionContainer);
            }
            viewSection.appendChild(banner);
            content.appendChild(viewSection);
            // --- Footer: Edit button for owner (View Mode) ---
            const footer = document.createElement('div');
            footer.className = 'px-24 py-20 flex items-center gap-10 flex-shrink-0 justify-end border-t border-divider bg-background/80';
            if (editable) {
                const editBtn = document.createElement('button');
                editBtn.textContent = 'Edit';
                editBtn.className = 'focus-visible:ring text-on-primary bg-primary border border-primary hover:bg-primary-dark hover:border-primary-dark whitespace-nowrap inline-flex align-middle flex-shrink-0 items-center transition-button duration-200 select-none appearance-none no-underline outline-none rounded-button justify-center font-semibold text-base h-40 px-28 shadow-lg';
                // Fix: define all variables in this scope for the edit button
                const currentMsg = message;
                const currentActions = actions;
                const currentReactions = reactions;
                const capturedGradient = currentGradient || BP_NOTE_GRADIENTS[0].value;
                const capturedViewerCount = viewerCount || 0;
                editBtn.onclick = (e) => {
                    e.stopPropagation();
                    console.log('[BP] Edit button clicked in showBPNoteModal');
                    let modal = document.getElementById(MODAL_ID);
                    if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
                    // Ensure all variables are safely defined
                    const safeCreatedAt = (typeof createdAt !== 'undefined') ? createdAt : Date.now();
                    const safeIsLoggedIn = (typeof isLoggedIn !== 'undefined') ? isLoggedIn : isUserLoggedIn();
                    const safeAvatarUrl = (typeof avatarUrl !== 'undefined') ? avatarUrl : (getProfileImage() ? getProfileImage().src : '');
                    console.log('[BP] Opening edit modal with:', {currentMsg, capturedGradient, capturedViewerCount});
                    showBPNoteModal({
                        message: currentMsg,
                        editable: true,
                        onSave: async (newMsg, newGradient, newActions) => {
                            await api.save(getArtistId(), newMsg, newGradient, newActions);
                            if (typeof render === 'function') render();
                        },
                        onDelete: async () => { await api.save(getArtistId(), '', '', []); if (typeof render === 'function') render(); },
                        viewerCount: capturedViewerCount,
                        createdAt: safeCreatedAt,
                        isLoggedIn: safeIsLoggedIn,
                        avatarUrl: safeAvatarUrl,
                        forceEdit: true,
                        currentGradient: capturedGradient,
                        actions: currentActions || [],
                        reactions: currentReactions || {}
                    });
                };
                footer.appendChild(editBtn);
            }
            card.appendChild(content);
            card.appendChild(footer);
        }
        centerWrap.appendChild(card);
        modal.appendChild(centerWrap);
        document.body.appendChild(modal);
        
        // Enhanced modal animation sequence
        requestAnimationFrame(() => {
            modal.style.opacity = '1';
            backdrop.style.opacity = '1';
            requestAnimationFrame(() => {
                centerWrap.style.opacity = '1';
                centerWrap.style.transform = 'scale(1) translateY(0)';
            });
        });
        // Enhanced close modal animation
        function closeModal() {
            // Reverse animation sequence
            centerWrap.style.opacity = '0';
            centerWrap.style.transform = 'scale(0.95) translateY(20px)';
            backdrop.style.opacity = '0';
            
            setTimeout(() => {
            modal.style.opacity = '0';
                setTimeout(() => { 
                    if (modal.parentNode) modal.parentNode.removeChild(modal); 
                }, 200);
            }, 100);
            
            document.removeEventListener('mousedown', outsideClick, true);
            document.removeEventListener('keydown', escListener, true);
        }
        function outsideClick(e) {
            if (!card.contains(e.target)) closeModal();
        }
        function escListener(e) {
            if (e.key === 'Escape') closeModal();
        }
        setTimeout(() => {
            document.addEventListener('mousedown', outsideClick, true);
            document.addEventListener('keydown', escListener, true);
        }, 0);
    }

    // Refined time display: hours if > 1h, minutes if < 1h
    function timeAgoRefined(ts) {
        const now = Date.now();
        const diff = Math.floor((now - ts) / 1000); // seconds
        if (diff < 60) return 'just now';
        if (diff < 3600) {
            const m = Math.floor(diff / 60);
            return `${m} minute${m === 1 ? '' : 's'} ago`;
        }
        const h = Math.floor(diff / 3600);
        return `${h} hour${h === 1 ? '' : 's'} ago`;
    }

    // Track last rendered state
    let lastPinState = { id: null, msg: null, editable: null };

    // Gradient presets for BP Note banner
    const BP_NOTE_GRADIENTS = [
        { name: 'Sunset', value: 'linear-gradient(90deg, #ff8c42 0%, #ff3c3c 100%)' }, // Darker orange/red
        { name: 'Aqua', value: 'linear-gradient(90deg, #217a6a 0%, #185a9d 100%)' }, // Darker teal/blue
        { name: 'Purple Dream', value: 'linear-gradient(90deg, #6a4796 0%, #b97acc 100%)' }, // Darker purple
        { name: 'Nightlife', value: 'linear-gradient(90deg, #232526 0%, #414345 100%)' }, // Already dark
        { name: 'Forest', value: 'linear-gradient(90deg, #274d3d 0%, #3a7d5c 100%)' } // Replaces Lime Fizz with a dark green
    ];

    // Helper to get/set gradient for artist (now supports backend value)
    function getArtistNoteGradient(artistId, backendGradient) {
        // Only use backendGradient
        return backendGradient || BP_NOTE_GRADIENTS[0].value;
    }
    function setArtistNoteGradient(artistId, gradient) {
        // No-op: gradients are only stored in backend now
    }

    // Ensure lord-icon script is loaded once
    function ensureLordIconScript() {
        if (!window.lordIconScriptLoaded) {
            const lordScript = document.createElement('script');
            lordScript.src = 'https://cdn.lordicon.com/lordicon.js';
            document.body.appendChild(lordScript);
            window.lordIconScriptLoaded = true;
        }
    }

    // Helper: Find the closest preset gradient string for a given background (handles RGB/HEX)
    function matchPresetGradient(gradientStr) {
        if (!gradientStr) return BP_NOTE_GRADIENTS[0].value;
        // Try exact match first
        for (const preset of BP_NOTE_GRADIENTS) {
            if (gradientStr.trim() === preset.value.trim()) return preset.value;
        }
        // Try to match by color stops (HEX vs RGB)
        // Extract all color stops from the string
        function extractStops(str) {
            return (str.match(/#([0-9a-fA-F]{3,8})|rgb\([^)]*\)/g) || []).map(s => s.toLowerCase());
        }
        const stops = extractStops(gradientStr);
        for (const preset of BP_NOTE_GRADIENTS) {
            const presetStops = extractStops(preset.value);
            // If all stops match (allowing for RGB/HEX), consider it a match
            if (stops.length === presetStops.length && stops.every((s, i) => presetStops[i] === s)) {
                return preset.value;
            }
        }
        // Fallback: return first preset
        return BP_NOTE_GRADIENTS[0].value;
    }

    // Vibrant, engaging note banner with lord-icon and gradient picker
    async function render(attempt = 0) {
        console.log('[BP] render() called, attempt', attempt);
        
        // Use centralized state management if available
        const stateManager = window.BPNotesInitManager;
        const currentState = stateManager ? stateManager.state.lastRenderState : lastPinState;
        
        // Remove any stray containers/modals if not on artist profile page
        if (!isArtistProfilePage()) {
            const old = document.getElementById(PIN_CONTAINER_ID);
            if (old) fadeOut(old);
            const modal = document.getElementById(MODAL_ID);
            if (modal) modal.remove();
            const img = document.querySelector('img.' + PIN_RING_CLASS);
            if (img) img.classList.remove(PIN_RING_CLASS);
            // Fade out story ring if present
            const ring = document.querySelector('.bp-story-ring-wrapper');
            if (ring) fadeOutStoryRing(ring);
            
            // Update state
            if (stateManager) {
                stateManager.state.lastRenderState = { id: null, msg: null, editable: null };
            } else {
                lastPinState = { id: null, msg: null, editable: null };
            }
            return;
        }
        const id = getArtistId();
        if (!id) return;
        const currentUser = getLoggedInName();
        const profileOwner = getProfileName();
        const editable = currentUser === profileOwner;
        // Always define isProducerOwner at the top for use throughout render
        const isProducerOwner = currentUser === profileOwner;
        // Always fetch latest timeline data from backend
        let timelineData = {};
        try {
            const r = await fetch(`pinned_message_handler.php?artist_id=${id}`);
            timelineData = await r.json();
        } catch { timelineData = {}; }
        
        const notes = timelineData && timelineData.notes ? timelineData.notes : [];
        const latestNote = timelineData && timelineData.latest_note ? timelineData.latest_note : null;
        const hasNotes = timelineData && timelineData.exists;
        
        // For backward compatibility, use latest note data
        const msg = latestNote ? latestNote.message : '';
        const backendGradient = latestNote ? latestNote.gradient : BP_NOTE_GRADIENTS[0].value;
        const createdAt = latestNote ? latestNote.created_at : null;
        const viewerCount = latestNote ? (latestNote.viewers ? latestNote.viewers.length : 0) : 0;
        // Wait for profile image to exist before proceeding
        const profileImg = getProfileImage();
        if (!profileImg) {
            removeAllStoryRings();
            if (attempt < 15) {
                setTimeout(() => render(attempt + 1), 200);
            } else {
                console.warn('[BP] render() failed to find profile image after multiple attempts');
            }
            return;
        }
        // Always update story ring for everyone (public visibility)
        updateProfileImageRing(hasNotes);
        if (!hasNotes) {
            // Fade out story ring if present
            setTimeout(() => {
                const ring = document.querySelector('.bp-story-ring-wrapper');
                if (ring) fadeOutStoryRing(ring);
            }, 10);
            removeAllStoryRings();
        }
        // Always define gradient before use, prefer backend value
        const gradient = backendGradient || BP_NOTE_GRADIENTS[0].value;

        // --- Mini Dashboard Banner Logic: Only show for the producer owner ---
        if (!isProducerOwner) {
            // Remove any producer dashboard banner (if present) but keep story ring
            const old = document.getElementById(PIN_CONTAINER_ID);
            if (old) fadeOut(old);
            lastPinState = { id: null, msg: null, editable: null };
            return; // Non-producers only see the story ring, not the dashboard
        }

        // If nothing has changed, do nothing
        if (
            currentState.id === id &&
            currentState.msg === msg &&
            currentState.editable === editable
        ) {
            console.log('[BP] render() end (no change)');
            return;
        }

        // Update state
        const newState = { id, msg, editable };
        if (stateManager) {
            stateManager.state.lastRenderState = newState;
        } else {
            lastPinState = newState;
        }

        // --- Mini Dashboard Banner for Producers (Glassmorphism, Carousel Style) ---
        // Only show for the producer owner (mini dashboard, not public)
        if (isProducerOwner) {
            // Remove any old banner (if present)
            const oldBanner = document.getElementById(PIN_CONTAINER_ID);
            if (oldBanner) fadeOut(oldBanner);

            // Define notesCount before using it
            const notesCount = notes.length;

            // Create new mini dashboard banner (premium layout)
            const miniBanner = document.createElement('div');
            miniBanner.id = PIN_CONTAINER_ID;
            miniBanner.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 0;
                background: linear-gradient(135deg, rgba(45,45,55,0.65) 0%, rgba(35,35,45,0.75) 100%);
                backdrop-filter: blur(24px) saturate(1.3);
                border-radius: 24px;
                box-shadow: 0 12px 48px 0 rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.12);
                border: 1.5px solid rgba(255,255,255,0.15);
                padding: 0;
                width: 100%;
                max-width: none;
                margin: 32px 0 24px 0;
                position: relative;
                z-index: 10;
                opacity: 0;
                transform: translateY(20px) scale(0.95);
                transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
                overflow: hidden;
            `;
            
            // Header section with logo
            const headerSection = document.createElement('div');
            headerSection.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 24px 32px 20px 32px;
                background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%);
                border-bottom: 1px solid rgba(255,255,255,0.08);
            `;

            // Brand section (top-left)
            const brandSection = document.createElement('div');
            brandSection.style.cssText = `
                display: flex;
                align-items: center;
                gap: 12px;
            `;

            // Brand title
            const brandTitle = document.createElement('div');
            brandTitle.textContent = 'Timeline Notes';
            brandTitle.style.cssText = `
                font-size: 1.3rem;
                font-weight: 700;
                color: rgba(255, 255, 255, 0.95);
                letter-spacing: 0.02em;
                text-shadow: 0 1px 3px rgba(0,0,0,0.3);
            `;

            brandSection.appendChild(brandTitle);

            // Status indicator (top-right)
            const statusIndicator = document.createElement('div');
            statusIndicator.style.cssText = `
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 16px;
                background: rgba(34, 197, 94, 0.15);
                border: 1px solid rgba(34, 197, 94, 0.3);
                border-radius: 20px;
                backdrop-filter: blur(8px);
            `;

            const statusDot = document.createElement('div');
            statusDot.style.cssText = `
                width: 8px;
                height: 8px;
                background: #22c55e;
                border-radius: 50%;
                box-shadow: 0 0 8px rgba(34, 197, 94, 0.6);
            `;

            const statusText = document.createElement('span');
            statusText.textContent = `${notesCount} Active`;
            statusText.style.cssText = `
                font-size: 0.85rem;
                font-weight: 600;
                color: #22c55e;
                text-shadow: 0 1px 2px rgba(0,0,0,0.2);
            `;

            statusIndicator.appendChild(statusDot);
            statusIndicator.appendChild(statusText);

            headerSection.appendChild(brandSection);
            headerSection.appendChild(statusIndicator);
            miniBanner.appendChild(headerSection);

            // Content section
            const contentSection = document.createElement('div');
            contentSection.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 24px 32px;
                gap: 32px;
            `;

            // Text content (left side of content)
            const textContent = document.createElement('div');
            textContent.style.cssText = `
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 8px;
            `;

            const mainTitle = document.createElement('div');
            mainTitle.textContent = notesCount > 0 ? `Your Timeline (${notesCount} note${notesCount === 1 ? '' : 's'})` : 'Create Your First Timeline Note';
            mainTitle.style.cssText = `
                font-size: 1.4rem;
                font-weight: 700;
                color: #fff;
                letter-spacing: 0.01em;
                margin-bottom: 4px;
                text-shadow: 0 1px 3px rgba(0,0,0,0.3);
            `;

            const subtitle = document.createElement('div');
            subtitle.textContent = notesCount > 0 ? 
                'Notes expire after 24 hours and appear chronologically to your fans' : 
                'Share updates, stories, and inspiration with your fans';
            subtitle.style.cssText = `
                font-size: 1rem;
                color: rgba(255, 255, 255, 0.8);
                font-weight: 500;
                line-height: 1.5;
                text-shadow: 0 1px 2px rgba(0,0,0,0.2);
            `;

            textContent.appendChild(mainTitle);
            textContent.appendChild(subtitle);

            // Enhanced action buttons (right side of content)
            const actionButtons = document.createElement('div');
            actionButtons.style.cssText = `
                display: flex;
                align-items: center;
                gap: 16px;
                flex-shrink: 0;
            `;

            // Primary action button
            const primaryBtn = document.createElement('button');
            primaryBtn.type = 'button';
            primaryBtn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right: 10px;">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add Note
            `;
            primaryBtn.style.cssText = `
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                border: none;
                border-radius: 14px;
                color: #fff;
                font-weight: 600;
                font-size: 15px;
                padding: 14px 28px;
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 4px 16px rgba(59, 130, 246, 0.25);
                backdrop-filter: blur(8px);
                display: flex;
                align-items: center;
                min-width: 140px;
                justify-content: center;
            `;

            primaryBtn.onmouseenter = () => {
                primaryBtn.style.transform = 'translateY(-2px) scale(1.02)';
                primaryBtn.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.35)';
                primaryBtn.style.background = 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)';
            };
            primaryBtn.onmouseleave = () => {
                primaryBtn.style.transform = 'translateY(0) scale(1)';
                primaryBtn.style.boxShadow = '0 4px 16px rgba(59, 130, 246, 0.25)';
                primaryBtn.style.background = 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)';
            };

            primaryBtn.onclick = () => {
                showBPNoteModal({
                    message: '',
                    editable: true,
                    onSave: async (newMsg, newGradient, newActions) => {
                        await api.addNote(getArtistId(), newMsg, newGradient, newActions);
                        if (typeof render === 'function') render();
                    },
                    onDelete: async () => {
                        // Not applicable for new notes
                    },
                    viewerCount: 0,
                    createdAt: Date.now(),
                    isLoggedIn: isUserLoggedIn(),
                    avatarUrl: profileImg ? profileImg.src : '',
                    forceEdit: true,
                    currentGradient: BP_NOTE_GRADIENTS[0].value,
                    actions: [],
                    reactions: {}
                });
            };

            actionButtons.appendChild(primaryBtn);

            // Add view timeline button if notes exist
            if (notes && notes.length > 0) {
                const timelineBtn = document.createElement('button');
                timelineBtn.type = 'button';
                timelineBtn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px;">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    View Timeline
                `;
                timelineBtn.style.cssText = `
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 14px;
                    color: rgba(255, 255, 255, 0.9);
                    font-weight: 600;
                    font-size: 14px;
                    padding: 14px 24px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    backdrop-filter: blur(8px);
                    display: flex;
                    align-items: center;
                    min-width: 130px;
                    justify-content: center;
                `;

                timelineBtn.onmouseenter = () => {
                    timelineBtn.style.background = 'rgba(255, 255, 255, 0.15)';
                    timelineBtn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                    timelineBtn.style.transform = 'translateY(-1px)';
                };
                timelineBtn.onmouseleave = () => {
                    timelineBtn.style.background = 'rgba(255, 255, 255, 0.1)';
                    timelineBtn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    timelineBtn.style.transform = 'translateY(0)';
                };

                timelineBtn.onclick = () => {
                    if (typeof window.showTimelineModal === 'function') {
                        window.showTimelineModal({
                            notes: notes,
                            producerName: currentUser,
                            avatarUrl: profileImg ? profileImg.src : '',
                            isOwner: true,
                            onAddNote: () => {
                                showBPNoteModal({
                                    message: '',
                                    editable: true,
                                    onSave: async (newMsg, newGradient, newActions) => {
                                        await api.addNote(getArtistId(), newMsg, newGradient, newActions);
                                        if (typeof render === 'function') render();
                                    },
                                    onDelete: async () => {
                                        // Not applicable for new notes
                                    },
                                    viewerCount: 0,
                                    createdAt: Date.now(),
                                    isLoggedIn: isUserLoggedIn(),
                                    avatarUrl: profileImg ? profileImg.src : '',
                                    forceEdit: true,
                                    currentGradient: BP_NOTE_GRADIENTS[0].value,
                                    actions: [],
                                    reactions: {}
                                });
                            }
                        });
                    }
                };

                actionButtons.appendChild(timelineBtn);
            }

            contentSection.appendChild(textContent);
            contentSection.appendChild(actionButtons);
            miniBanner.appendChild(contentSection);

            // Footer section
            const footerSection = document.createElement('div');
            footerSection.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 32px 20px 32px;
                background: linear-gradient(135deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.05) 100%);
                border-top: 1px solid rgba(255, 255, 255, 0.06);
            `;

            // Helper text
            const helperText = document.createElement('div');
            const helperMessage = notesCount > 0 ? 
                `Timeline active with ${notesCount} note${notesCount === 1 ? '' : 's'}. Notes auto-expire after 24 hours.` :
                'Create timeline notes to engage with your fans. Notes expire automatically after 24 hours.';
            helperText.textContent = helperMessage;
            helperText.style.cssText = `
                font-size: 0.9rem;
                color: rgba(255, 255, 255, 0.65);
                font-weight: 500;
                letter-spacing: 0.01em;
                line-height: 1.4;
                flex: 1;
                margin-right: 16px;
            `;

            // Privacy indicator
            const privacyLabel = document.createElement('div');
            privacyLabel.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px; opacity: 0.7;">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                Producer Dashboard
            `;
            privacyLabel.style.cssText = `
                font-size: 0.8rem;
                color: rgba(255, 255, 255, 0.55);
                font-weight: 500;
                display: flex;
                align-items: center;
                background: rgba(255, 255, 255, 0.06);
                padding: 6px 14px;
                border-radius: 16px;
                border: 1px solid rgba(255, 255, 255, 0.08);
                white-space: nowrap;
                backdrop-filter: blur(4px);
            `;

            footerSection.appendChild(helperText);
            footerSection.appendChild(privacyLabel);
            miniBanner.appendChild(footerSection);
            
            // Find the header section and tabs section to position banner between them
            const header = document.querySelector('header.flex.flex-col.md\\:flex-row.gap-24.md\\:gap-34.items-center');
            const tabsSection = document.querySelector('.mt-24.md\\:mt-48.overflow-hidden.max-w-full');
            
            let insertionParent = null;
            let insertionTarget = null;
            
            if (header && tabsSection && header.parentNode === tabsSection.parentNode) {
                // Insert the banner between header and tabs
                insertionParent = header.parentNode;
                insertionTarget = tabsSection;
            } else {
                // Fallback: insert after the header's parent container
                const headerParent = header ? header.parentNode : null;
                if (headerParent) {
                    insertionParent = headerParent;
                    insertionTarget = null; // append at end
                } else {
                    // Last resort: insert after the button row as before
                    const mt30 = document.querySelector('div.mt-30');
                    let mainBtnRow = null;
                    if (mt30) {
                        mainBtnRow = mt30.querySelector('div.flex.items-center.justify-center.gap-24');
                    }
                    if (!mainBtnRow) {
                        const playBtn = document.querySelector('button svg[data-testid="PlayArrowFilledIcon"]');
                        if (playBtn) {
                            let el = playBtn.closest('div');
                            while (el && el !== document.body) {
                                const cl = el.classList;
                                if (cl && cl.contains('flex') && cl.contains('items-center') && cl.contains('gap-24') && cl.contains('justify-center')) {
                                    mainBtnRow = el;
                                    break;
                                }
                                el = el.parentElement;
                            }
                        }
                    }
                    
                    if (mainBtnRow && mainBtnRow.parentNode) {
                        insertionParent = mainBtnRow.parentNode;
                        insertionTarget = mainBtnRow.nextSibling;
                    }
                }
            }
            
            if (insertionParent) {
                // Add smooth layout transition to parent
                addLayoutTransition(insertionParent);
                
                // Insert the banner
                if (insertionTarget) {
                    insertionParent.insertBefore(miniBanner, insertionTarget);
                } else {
                    insertionParent.appendChild(miniBanner);
                }
                
                // Trigger smooth fade-in animation
                setTimeout(() => fadeIn(miniBanner), 50);
            }
        }
        
        // Early return for producer dashboard - no need for full banner
        console.log('[BP] render() end (producer dashboard)');
        return;
    }

    // Modal styling and auto-close logic
    function applyArtistPinModalStyles() {
        // Remove any previous style block with the same ID
        const oldStyle = document.getElementById('artist-pin-modal-style');
        if (oldStyle) oldStyle.remove();
        const style = document.createElement('style');
        style.id = 'artist-pin-modal-style';
        style.textContent = `
            .bp-modal-beatpass {
                background: rgba(var(--be-paper), 0.97) !important;
                box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
                border-radius: var(--be-panel-radius) !important;
                border: 1px solid rgba(var(--be-foreground-base), var(--be-divider-opacity)) !important;
                font-family: var(--be-font-family), 'Inter', 'Segoe UI', Arial, sans-serif;
                padding: 0 0 12px 0 !important;
            }
            .bp-modal-header {
                border-bottom: 1px solid rgba(var(--be-foreground-base), var(--be-divider-opacity)) !important;
                margin-bottom: 0.5em !important;
                padding-bottom: 0.5em !important;
            }
            .bp-modal-content {
                color: rgba(var(--be-foreground-base), var(--be-text-main-opacity)) !important;
                background: transparent !important;
                border-radius: var(--be-panel-radius) !important;
                padding: 18px 0 0 0 !important;
            }
            .bp-modal-section {
                background: #23232a !important;
                border-radius: 14px !important;
                border: 1.5px solid #222 !important;
                padding: 18px 18px 10px 18px !important;
                margin-bottom: 18px !important;
                box-shadow: 0 2px 8px 0 rgba(0,0,0,0.10) !important;
            }
            .bp-modal-cta-section {
                background: transparent !important;
                border: none !important;
                padding: 0 !important;
                margin: 0 !important;
                box-shadow: none !important;
            }
            .bp-modal-cta-row {
                /* Styles now handled by Tailwind classes */
            }
            .bp-modal-save-btn, .bp-modal-cancel-btn, .bp-modal-delete-btn {
                font-size: 1.08em !important;
                border-radius: 999px !important;
                font-weight: 700 !important;
                letter-spacing: 0.01em !important;
                padding: 0 28px !important;
                min-width: 100px !important;
                height: 40px !important;
            }
            .bp-modal-save-btn {
                background: linear-gradient(90deg, #ff8c42 0%, #ff3c3c 100%) !important;
                color: #fff !important;
                border: none !important;
                box-shadow: 0 2px 8px 0 rgba(255,94,98,0.10) !important;
                transition: background 0.2s, box-shadow 0.2s !important;
            }
            .bp-modal-save-btn:hover {
                background: linear-gradient(90deg, #ff3c3c 0%, #ff8c42 100%) !important;
                box-shadow: 0 4px 16px 0 rgba(255,94,98,0.18) !important;
            }
            .bp-modal-cancel-btn {
                background: transparent !important;
                color: rgba(var(--be-foreground-base), var(--be-text-main-opacity)) !important;
                border: 1px solid rgba(var(--be-foreground-base), var(--be-divider-opacity)) !important;
                transition: background 0.2s, color 0.2s !important;
            }
            .bp-modal-cancel-btn:hover {
                background: rgba(var(--be-foreground-base), var(--be-hover-opacity)) !important;
            }
            .bp-modal-cancel-btn:disabled {
                color: rgba(var(--be-foreground-base), var(--be-disabled-fg-opacity)) !important;
                background: rgba(var(--be-foreground-base), var(--be-disabled-bg-opacity)) !important;
            }
            .bp-modal-delete-btn {
                background: transparent !important;
                color: #ff3c3c !important;
                border: 1.5px solid #ff3c3c !important;
                transition: background 0.2s, color 0.2s !important;
            }
            .bp-modal-delete-btn:hover {
                background: rgba(255, 60, 60, 0.1) !important;
                color: rgba(var(--be-foreground-base), var(--be-text-main-opacity)) !important;
            }
            .bp-modal-textarea {
                font-size: 1.12em !important;
                font-weight: 600 !important;
                border-radius: var(--be-input-radius) !important;
                background: rgba(var(--be-background-alt), 0.8) !important;
                color: rgba(var(--be-foreground-base), var(--be-text-main-opacity)) !important;
                border: 1px solid rgba(var(--be-foreground-base), var(--be-divider-opacity)) !important;
                padding: 20px !important;
            }
            .bp-modal-textarea:focus {
                border: 1px solid rgb(255, 140, 66) !important;
                box-shadow: 0 0 0 3px rgba(255, 140, 66, 0.1) !important;
            }
            .bp-modal-message {
                font-size: 1.18em !important;
                font-weight: 600 !important;
                border-radius: var(--be-input-radius) !important;
                background: rgba(var(--be-background-alt), 0.8) !important;
                color: rgba(var(--be-foreground-base), var(--be-text-main-opacity)) !important;
                border: 1px solid rgba(var(--be-foreground-base), var(--be-divider-opacity)) !important;
            }
            .bp-modal-charcount {
                color: rgba(var(--be-foreground-base), var(--be-text-muted-opacity)) !important;
                font-family: monospace !important;
            }
            .bp-modal-close-btn {
                color: rgba(var(--be-foreground-base), var(--be-text-muted-opacity)) !important;
                background: none !important;
                border: none !important;
            }
            .bp-modal-close-btn:hover {
                color: rgba(var(--be-foreground-base), var(--be-text-main-opacity)) !important;
                background: rgba(var(--be-foreground-base), var(--be-hover-opacity)) !important;
            }
            /* Remove all custom dropdown styles - using native classes only */
        `;
        document.head.appendChild(style);
    }

    // Re-render on navigation or DOM changes
    const re = debounceBP(() => {
        if (window._bpNotesRendering) return;
        setTimeout(render, 0);
    }, 300);
    ['load', 'spa-route-change', 'popstate'].forEach(ev => window.addEventListener(ev, re));
    new MutationObserver(re).observe(document.body, { childList: true, subtree: true });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
    else render();

    // Add or remove the story ring on the profile image (with wrapper for true Instagram gradient)
    function updateProfileImageRing(hasPin) {
        window._bpNotesRendering = true;
        try {
            let img = getProfileImage();
            if (!img) {
                console.warn('[BP] updateProfileImageRing: No profile image found.');
                return;
            }
            const currentUser = getLoggedInName();
            const profileOwner = getProfileName();
            img.classList.remove('mx-auto', 'block');
            img.style.display = 'block';
            img.style.margin = '0';
            img.style.width = '256px';
            img.style.height = '256px';
            // Remove any previous click handler
            if (img._bpNoteClickHandler) {
                img.removeEventListener('click', img._bpNoteClickHandler);
                img._bpNoteClickHandler = null;
                img.style.cursor = '';
            }
            // If already inside a .bp-story-ring-wrapper, do not re-wrap
            if (img.parentElement && img.parentElement.classList.contains('bp-story-ring-wrapper')) {
                // Already wrapped, do nothing
            } else if (hasPin) {
                // Only wrap if not already wrapped
                const ringThickness = 8;
                const size = 256 + 2 * ringThickness;
                const wrapper = document.createElement('span');
                wrapper.className = 'bp-story-ring-wrapper';
                wrapper.style.display = 'inline-flex';
                wrapper.style.alignItems = 'center';
                wrapper.style.justifyContent = 'center';
                wrapper.style.position = 'relative';
                wrapper.style.overflow = 'visible';
                wrapper.style.width = wrapper.style.height = size + 'px';
                wrapper.style.background = 'conic-gradient(from 30deg, #f9ce34 0deg, #ee2a7b 110deg, #6228d7 220deg, #f9ce34 360deg)';
                wrapper.style.borderRadius = '50%';
                wrapper.style.aspectRatio = '1 / 1';
                wrapper.style.padding = ringThickness + 'px';
                wrapper.style.border = 'none';
                wrapper.style.transition = 'background-position 1.5s cubic-bezier(.4,2,.3,1), box-shadow 0.2s, transform 0.2s';
                wrapper.style.animation = 'bp-gradient-ring-pan 16s linear infinite';
                wrapper.style.zIndex = '9999';
                wrapper.style.boxShadow = '0 0 16px 2px #ee2a7b55';
                // Add hover effect for interactivity
                wrapper.style.cursor = 'pointer';
                wrapper.onmouseenter = () => {
                    wrapper.style.transform = 'scale(1.045)';
                    wrapper.style.boxShadow = '0 0 32px 6px #ee2a7b77';
                };
                wrapper.onmouseleave = () => {
                    wrapper.style.transform = 'scale(1)';
                    wrapper.style.boxShadow = '0 0 16px 2px #ee2a7b55';
                };
                // Insert wrapper in place of img
                if (img.parentElement) {
                    img.parentElement.replaceChild(wrapper, img);
                }
                wrapper.appendChild(img);
                
                // Trigger premium glow-up animation
                setTimeout(() => fadeInStoryRing(wrapper), 50);
                // Ensure keyframes are loaded (already added globally)
                // No need to add them again as they're added at the bottom of the file
                // Attach click handler to wrapper to open timeline modal
                if (wrapper._bpNoteClickHandler) {
                    wrapper.removeEventListener('click', wrapper._bpNoteClickHandler);
                }
                wrapper._bpNoteClickHandler = async function(e) {
                    e.stopPropagation();
                    const artistId = getArtistId();
                    let timelineData = {};
                    try {
                        const r = await fetch(`pinned_message_handler.php?artist_id=${artistId}`);
                        timelineData = await r.json();
                    } catch { timelineData = {}; }
                    
                    const notes = timelineData && timelineData.notes ? timelineData.notes : [];
                    const currentUser = getLoggedInName();
                    const profileOwner = getProfileName();
                    const isOwner = currentUser === profileOwner;
                    
                    console.log('[BP] Opening timeline modal with', notes.length, 'notes');
                    if (typeof window.showTimelineModal === 'function') {
                        window.showTimelineModal({
                            notes: notes,
                            producerName: profileOwner,
                            avatarUrl: img.src,
                            isOwner: isOwner,
                            onAddNote: isOwner ? () => {
                                console.log('[BP] Opening add note modal from timeline');
                                showBPNoteModal({
                                    message: '',
                                    editable: true,
                                    onSave: async (newMsg, newGradient, newActions) => {
                                        await api.addNote(artistId, newMsg, newGradient, newActions);
                                        if (typeof render === 'function') render();
                                    },
                                    onDelete: async () => {
                                        // Not applicable for new notes
                                    },
                                    viewerCount: 0,
                                    createdAt: Date.now(),
                                    isLoggedIn: isUserLoggedIn(),
                                    avatarUrl: img.src,
                                    forceEdit: true,
                                    currentGradient: BP_NOTE_GRADIENTS[0].value,
                                    actions: [],
                                    reactions: {}
                                });
                            } : null
                        });
                    }
                };
                wrapper.addEventListener('click', wrapper._bpNoteClickHandler);
            }
            // If hasPin is false and image is wrapped, unwrap it with smooth animation
            if (!hasPin && img.parentElement && img.parentElement.classList.contains('bp-story-ring-wrapper')) {
                const wrapper = img.parentElement;
                fadeOutStoryRing(wrapper);
            }
        } finally {
            window._bpNotesRendering = false;
        }
    }

    // Helper to check if user is logged in
    function isUserLoggedIn() {
        // If login/signup buttons are present, user is not logged in
        return !document.querySelector('a[href="/login"], a[href="/register"]');
    }

    // Helper to add smooth layout transitions to parent containers
    function addLayoutTransition(element) {
        if (!element) return;
        element.style.transition = 'height 0.6s cubic-bezier(0.4, 0, 0.2, 1), padding 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
    }

    // Ensure #artist-pin-container is always visible and interactive
    function ensurePinBannerStyles() {
        // CSS injection is now handled by BPNotesInitManager
        if (window.BPNotesInitManager) {
            // Styles are automatically injected by the manager
            return;
        }
        
        // Fallback for backward compatibility
        if (!document.getElementById('artist-pin-banner-style')) {
            const style = document.createElement('style');
            style.id = 'artist-pin-banner-style';
            style.textContent = `
                #artist-pin-container {
                    pointer-events: auto !important;
                    filter: none !important;
                    opacity: 1 !important;
                }
            `;
            document.head.appendChild(style);
        }
    }
    // Call this after rendering the banner
    // ... inside render() after banner is created/updated:
    ensurePinBannerStyles();

    // Expose functions globally
    window.showBPNoteModal = showBPNoteModal;
    window.showTimelineModal = showTimelineModal;
    window.render = render;

    // Auto-cleanup expired notes every 5 minutes
    setInterval(() => {
        if (isArtistProfilePage() && typeof render === 'function') {
            console.log('[BP] Auto-cleanup: checking for expired notes');
            render();
        }
    }, 5 * 60 * 1000); // 5 minutes
    
    // Add this at the very top of the file, before any code that might call getArtistId
    function safeGetArtistId() {
        return (typeof window !== 'undefined' && typeof window.getArtistId === 'function') ? window.getArtistId() : null;
    }

    // Clean Note Preview Modal - Production-ready, simplified modal for public view
    function showCleanNotePreview({ message, gradient, actions, createdAt, avatarUrl, producerName }) {
        // Remove any existing modal
        let existingModal = document.getElementById('clean-note-preview-modal');
        if (existingModal) existingModal.remove();

        // Create modal backdrop
        const modal = document.createElement('div');
        modal.id = 'clean-note-preview-modal';
        modal.style.cssText = `
            position: fixed;
            inset: 0;
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.75);
            backdrop-filter: blur(8px);
            opacity: 0;
            transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            padding: 20px;
        `;

        // Create modal content
        const content = document.createElement('div');
        content.style.cssText = `
            background: rgba(30, 30, 35, 0.95);
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(20px);
            max-width: 500px;
            width: 100%;
            transform: scale(0.9) translateY(20px);
            transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            position: relative;
            overflow: hidden;
        `;

        // Create close button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
            position: absolute;
            top: 16px;
            right: 16px;
            background: rgba(255, 255, 255, 0.1);
            border: none;
            border-radius: 50%;
            width: 36px;
            height: 36px;
            color: #fff;
            font-size: 24px;
            font-weight: 300;
            cursor: pointer;
            z-index: 10;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(10px);
        `;
        closeBtn.onmouseenter = () => {
            closeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
            closeBtn.style.transform = 'scale(1.1)';
        };
        closeBtn.onmouseleave = () => {
            closeBtn.style.background = 'rgba(255, 255, 255, 0.1)';
            closeBtn.style.transform = 'scale(1)';
        };

        // Create note banner preview
        const bannerPreview = document.createElement('div');
        bannerPreview.className = 'clean-note-banner-preview';
        bannerPreview.style.cssText = `
            /* margin: 24px; */
            border-radius: 16px;
            min-height: 180px;
            padding: 24px;
            display: flex;
            flex-direction: column;
            gap: 16px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.1);
            position: relative;
            overflow: hidden;
            background: ${gradient};
            background-size: 200% 100%;
            animation: bp-gradient-pan 20s ease-in-out infinite;
        `;

        // Header with avatar, name and timestamp
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 8px;
        `;

        const avatar = document.createElement('img');
        avatar.src = avatarUrl || 'https://bpass24.s3.us-east-005.backblazeb2.com/storage/branding_media/8524b656-7e0d-4271-9503-03d515ac6ecc.png';
        avatar.style.cssText = `
            width: 48px;
            height: 48px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        `;

        const nameTimeCol = document.createElement('div');
        nameTimeCol.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 2px;
        `;

        const nameEl = document.createElement('div');
        nameEl.textContent = producerName || 'Producer';
        nameEl.style.cssText = `
            font-weight: 700;
            font-size: 16px;
            color: #fff;
            text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        `;

        const timeEl = document.createElement('div');
        timeEl.textContent = timeAgoRefined(createdAt);
        timeEl.style.cssText = `
            font-size: 12px;
            color: rgba(255, 255, 255, 0.8);
            font-weight: 500;
        `;

        nameTimeCol.appendChild(nameEl);
        nameTimeCol.appendChild(timeEl);
        header.appendChild(avatar);
        header.appendChild(nameTimeCol);

        // Message text
        const messageEl = document.createElement('div');
        messageEl.textContent = message || 'No message available';
        messageEl.style.cssText = `
            font-size: 18px;
            font-weight: 600;
            color: #fff;
            line-height: 1.4;
            margin-bottom: 8px;
            text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        `;

        // Action button (if exists)
        let actionEl = null;
        if (actions && actions.length > 0 && actions[0].label && actions[0].url) {
            const action = actions[0];
            actionEl = document.createElement('div');
            actionEl.style.cssText = `
                margin-top: 16px;
                position: relative;
                border-radius: 12px;
                overflow: hidden;
            `;

            const actionBtn = document.createElement('a');
            actionBtn.href = action.url;
            actionBtn.target = '_blank';
            actionBtn.rel = 'noopener noreferrer';
            actionBtn.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
                padding: 16px 24px;
                background: rgba(255, 255, 255, 0.2);
                color: #fff;
                text-decoration: none;
                font-weight: 600;
                font-size: 15px;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                border: 1px solid rgba(255, 255, 255, 0.3);
                backdrop-filter: blur(20px);
                width: 100%;
                letter-spacing: 0.02em;
                border-radius: 12px;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
            `;

            // Enhanced icon mapping
            const iconMap = {
                'Listen': '🎵',
                'Buy': '🛒',
                'Visit Website': '🌐',
                'Watch Video': '📺',
                'Stream': '🎶',
                'Download': '⬇️',
                'Subscribe': '⭐',
                'Follow': '👤'
            };
            const icon = iconMap[action.label] || '🔗';

            actionBtn.innerHTML = `
                <span style="font-size: 18px;">${icon}</span>
                <span>${action.label}</span>
            `;

            // Enhanced hover effects
            actionBtn.addEventListener('mouseenter', () => {
                actionBtn.style.background = 'rgba(255, 255, 255, 0.3)';
                actionBtn.style.transform = 'translateY(-2px) scale(1.02)';
                actionBtn.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.4)';
            });

            actionBtn.addEventListener('mouseleave', () => {
                actionBtn.style.background = 'rgba(255, 255, 255, 0.2)';
                actionBtn.style.transform = 'translateY(0) scale(1)';
                actionBtn.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.2)';
            });

            actionEl.appendChild(actionBtn);
        }

        // Assemble banner
        bannerPreview.appendChild(header);
        bannerPreview.appendChild(messageEl);
        if (actionEl) bannerPreview.appendChild(actionEl);

        // Assemble modal
        content.appendChild(closeBtn);
        content.appendChild(bannerPreview);
        modal.appendChild(content);
        document.body.appendChild(modal);

        // Animate in
        requestAnimationFrame(() => {
            modal.style.opacity = '1';
            content.style.transform = 'scale(1) translateY(0)';
        });

        // Close handlers
        const closeModal = () => {
            modal.style.opacity = '0';
            content.style.transform = 'scale(0.9) translateY(20px)';
            setTimeout(() => {
                if (modal.parentNode) modal.parentNode.removeChild(modal);
            }, 300);
        };

        closeBtn.onclick = closeModal;
        modal.onclick = (e) => {
            if (e.target === modal) closeModal();
        };
        
        // ESC key handler
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    // On navigation or render, always remove any .bp-story-ring-wrapper from all images if no note is present
    function removeAllStoryRings() {
        document.querySelectorAll('.bp-story-ring-wrapper').forEach(wrapper => {
            const img = wrapper.querySelector('img');
            if (img && wrapper.parentElement) {
                wrapper.parentElement.replaceChild(img, wrapper);
            }
        });
    }

    // Modern Timeline/Stories Modal - Vertical scroll design combining Twitter threads + Instagram stories
    function showTimelineModal({ notes, producerName, avatarUrl, isOwner = false, onAddNote = null }) {
        // Remove any existing timeline modal
        let existingModal = document.getElementById('timeline-modal');
        if (existingModal) existingModal.remove();

        if (!notes || notes.length === 0) {
            if (isOwner && onAddNote) {
                showFirstNotePrompt(producerName, avatarUrl, onAddNote);
                return;
            } else {
                return;
            }
        }

        // Create modal backdrop
        const modal = document.createElement('div');
        modal.id = 'timeline-modal';
        modal.style.cssText = `
            position: fixed;
            inset: 0;
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(12px);
            opacity: 0;
            transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            padding: 20px;
        `;

        // Create timeline container with vertical scroll design
        const timelineContainer = document.createElement('div');
        timelineContainer.style.cssText = `
            position: relative;
            max-width: 480px;
            width: 100%;
            max-height: 90vh;
            background: linear-gradient(145deg, rgba(25,25,30,0.95), rgba(35,35,40,0.95));
            border-radius: 24px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 32px 64px rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(20px);
            overflow: hidden;
            transform: scale(0.9) translateY(40px);
            transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
            display: flex;
            flex-direction: column;
        `;

        // Header with producer info and close button
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 20px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            align-items: center;
            gap: 12px;
            flex-shrink: 0;
            background: rgba(0, 0, 0, 0.3);
        `;

        const avatar = document.createElement('img');
        avatar.src = avatarUrl || 'https://bpass24.s3.us-east-005.backblazeb2.com/storage/branding_media/8524b656-7e0d-4271-9503-03d515ac6ecc.png';
        avatar.style.cssText = `
            width: 48px;
            height: 48px;
            border-radius: 50%;
            border: 2px solid rgba(255, 255, 255, 0.3);
            object-fit: cover;
        `;

        const nameCol = document.createElement('div');
        nameCol.style.cssText = `
            flex: 1;
            color: #fff;
        `;

        const name = document.createElement('div');
        name.textContent = producerName || 'Producer';
        name.style.cssText = `
            font-weight: 700;
            font-size: 18px;
            text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
            margin-bottom: 4px;
        `;

        const subtitle = document.createElement('div');
        subtitle.textContent = `${notes.length} Timeline Note${notes.length === 1 ? '' : 's'}`;
        subtitle.style.cssText = `
            font-size: 13px;
            color: rgba(255, 255, 255, 0.7);
            font-weight: 500;
        `;

        nameCol.appendChild(name);
        nameCol.appendChild(subtitle);

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
            background: rgba(255, 255, 255, 0.2);
            border: none;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            color: #fff;
            font-size: 22px;
            cursor: pointer;
            transition: all 0.2s ease;
            backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 300;
        `;
        closeBtn.onmouseenter = () => {
            closeBtn.style.background = 'rgba(255, 255, 255, 0.3)';
            closeBtn.style.transform = 'scale(1.1)';
        };
        closeBtn.onmouseleave = () => {
            closeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
            closeBtn.style.transform = 'scale(1)';
        };

        header.appendChild(avatar);
        header.appendChild(nameCol);
        header.appendChild(closeBtn);
        timelineContainer.appendChild(header);

        // Vertical scroll timeline content
        const timelineContent = document.createElement('div');
        timelineContent.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 16px;
        `;

        // Create story cards in vertical layout
        notes.forEach((note, index) => {
            const storyCard = createStoryCard(note, index, notes.length, isOwner, onAddNote);
            timelineContent.appendChild(storyCard);
        });

        timelineContainer.appendChild(timelineContent);

        // Add note button for owners (floating)
        // (Removed as per user request)
        // if (isOwner && onAddNote) {
        //     const addNoteBtn = document.createElement('button');
        //     addNoteBtn.innerHTML = `
        //         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        //             <line x1="12" y1="5" x2="12" y2="19"></line>
        //             <line x1="5" y1="12" x2="19" y2="12"></line>
        //         </svg>
        //     `;
        //     addNoteBtn.style.cssText = `
        //         position: absolute;
        //         bottom: 20px;
        //         right: 20px;
        //         width: 56px;
        //         height: 56px;
        //         background: linear-gradient(135deg, #ff8c42, #ff3c3c);
        //         border: none;
        //         border-radius: 50%;
        //         color: #fff;
        //         cursor: pointer;
        //         transition: all 0.3s ease;
        //         box-shadow: 0 8px 24px rgba(255, 60, 60, 0.4);
        //         display: flex;
        //         align-items: center;
        //         justify-content: center;
        //         z-index: 10;
        //     `;
        //     addNoteBtn.onmouseenter = () => {
        //         addNoteBtn.style.transform = 'scale(1.1) translateY(-2px)';
        //         addNoteBtn.style.boxShadow = '0 12px 32px rgba(255, 60, 60, 0.6)';
        //     };
        //     addNoteBtn.onmouseleave = () => {
        //         addNoteBtn.style.transform = 'scale(1) translateY(0)';
        //         addNoteBtn.style.boxShadow = '0 8px 24px rgba(255, 60, 60, 0.4)';
        //     };
        //     addNoteBtn.onclick = () => {
        //         closeModal();
        //         onAddNote();
        //     };
        //     timelineContainer.appendChild(addNoteBtn);
        // }

        function createStoryCard(note, index, total, isOwner, onAddNote) {
            const card = document.createElement('div');
            card.className = 'timeline-story-card';
            card.style.cssText = `
                position: relative;
                background: rgba(255, 255, 255, 0.08);
                border-radius: 16px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                overflow: hidden;
                transition: all 0.3s ease;
                backdrop-filter: blur(20px);
                animation: fadeInUp 0.4s ease-out backwards;
                animation-delay: ${Math.min(index * 0.1, 0.5)}s;
            `;

            // Card content
            const cardContent = document.createElement('div');
            cardContent.style.cssText = `
                padding: 20px;
                position: relative;
            `;

            // Timeline indicator (left border accent)
            const timelineIndicator = document.createElement('div');
            timelineIndicator.className = 'timeline-indicator';
            timelineIndicator.style.cssText = `
                position: absolute;
                left: 0;
                top: 0;
                bottom: 0;
                width: 4px;
                background: ${note.gradient || 'linear-gradient(180deg, #ff8c42, #ff3c3c)'};
                border-radius: 0 2px 2px 0;
            `;
            card.appendChild(timelineIndicator);

            // Story header with timestamp and controls
            const storyHeader = document.createElement('div');
            storyHeader.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
            `;

            const timestamp = document.createElement('div');
            timestamp.textContent = formatTimeAgo(note.created_at);
            timestamp.style.cssText = `
                font-size: 13px;
                color: rgba(255, 255, 255, 0.7);
                font-weight: 500;
            `;

            // Control buttons for owners
            const controls = document.createElement('div');
            controls.style.cssText = `
                display: flex;
                gap: 8px;
                opacity: ${isOwner ? '1' : '0'};
                pointer-events: ${isOwner ? 'auto' : 'none'};
            `;

            if (isOwner) {
                // Edit button
                const editBtn = document.createElement('button');
                editBtn.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="m18.5 2.5 a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                `;
                editBtn.style.cssText = `
                    background: rgba(255, 255, 255, 0.15);
                    border: none;
                    border-radius: 8px;
                    width: 32px;
                    height: 32px;
                    color: rgba(255, 255, 255, 0.8);
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `;
                editBtn.onmouseenter = () => {
                    editBtn.style.background = 'rgba(255, 255, 255, 0.25)';
                    editBtn.style.color = '#fff';
                };
                editBtn.onmouseleave = () => {
                    editBtn.style.background = 'rgba(255, 255, 255, 0.15)';
                    editBtn.style.color = 'rgba(255, 255, 255, 0.8)';
                };
                editBtn.onclick = (e) => {
                    e.stopPropagation();
                    closeModal();
                    showBPNoteModal({
                        message: note.message,
                        editable: true,
                        onSave: async (newMsg, newGradient, newActions) => {
                            // Update existing note
                            const response = await fetch('pinned_message_handler.php', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ 
                                    artist_id: getArtistId(), 
                                    note_id: note.id,
                                    message: newMsg, 
                                    gradient: newGradient, 
                                    actions: newActions,
                                    edit_note: true
                                })
                            });
                            const result = await response.json();
                            if (result.status !== 'ok') throw new Error(result.message || 'Error updating note');
                            if (typeof render === 'function') render();
                        },
                        onDelete: async () => {
                            // Delete this specific note
                            const response = await fetch('pinned_message_handler.php', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ 
                                    artist_id: getArtistId(), 
                                    note_id: note.id,
                                    delete_note: true
                                })
                            });
                            const result = await response.json();
                            if (result.status !== 'ok') throw new Error(result.message || 'Error deleting note');
                            if (typeof render === 'function') render();
                        },
                        viewerCount: note.viewers ? note.viewers.length : 0,
                        createdAt: note.created_at,
                        isLoggedIn: isUserLoggedIn(),
                        avatarUrl: avatarUrl,
                        forceEdit: true,
                        currentGradient: note.gradient || BP_NOTE_GRADIENTS[0].value,
                        actions: note.actions || [],
                        reactions: note.reactions || {}
                    });
                };

                // Delete button
                const deleteBtn = document.createElement('button');
                deleteBtn.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3,6 5,6 21,6"></polyline>
                        <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                    </svg>
                `;
                deleteBtn.style.cssText = `
                    background: rgba(239, 68, 68, 0.15);
                    border: none;
                    border-radius: 8px;
                    width: 32px;
                    height: 32px;
                    color: rgba(239, 68, 68, 0.8);
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `;
                deleteBtn.onmouseenter = () => {
                    deleteBtn.style.background = 'rgba(239, 68, 68, 0.25)';
                    deleteBtn.style.color = 'rgb(239, 68, 68)';
                };
                deleteBtn.onmouseleave = () => {
                    deleteBtn.style.background = 'rgba(239, 68, 68, 0.15)';
                    deleteBtn.style.color = 'rgba(239, 68, 68, 0.8)';
                };
                deleteBtn.onclick = async (e) => {
                    e.stopPropagation();
                    if (confirm('Delete this note? This action cannot be undone.')) {
                        try {
                            const response = await fetch('pinned_message_handler.php', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ 
                                    artist_id: getArtistId(), 
                                    note_id: note.id,
                                    delete_note: true
                                })
                            });
                            const result = await response.json();
                            if (result.status !== 'ok') throw new Error(result.message || 'Error deleting note');
                            
                            // Refresh timeline
                            closeModal();
                            if (typeof render === 'function') render();
                        } catch (error) {
                            console.error('Error deleting note:', error);
                            alert('Failed to delete note: ' + error.message);
                        }
                    }
                };

                controls.appendChild(editBtn);
                controls.appendChild(deleteBtn);
            }

            storyHeader.appendChild(timestamp);
            storyHeader.appendChild(controls);
            cardContent.appendChild(storyHeader);

            // Story content
            const storyContent = document.createElement('div');
            storyContent.style.cssText = `
                margin-bottom: 16px;
            `;

            const message = document.createElement('div');
            message.textContent = note.message;
            message.style.cssText = `
                font-size: 16px;
                font-weight: 600;
                color: #fff;
                line-height: 1.4;
                margin-bottom: 12px;
                word-wrap: break-word;
            `;
            storyContent.appendChild(message);

            // Action button if exists
            if (note.actions && note.actions.length > 0) {
                const action = note.actions[0];
                const actionBtn = createActionButton(action);
                storyContent.appendChild(actionBtn);
            }

            cardContent.appendChild(storyContent);

            // Story footer with expiry
            const storyFooter = document.createElement('div');
            storyFooter.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 12px;
                color: rgba(255, 255, 255, 0.6);
            `;

            const expiryText = document.createElement('div');
            expiryText.textContent = `Expires ${formatTimeLeft(note.created_at)}`;
            expiryText.style.cssText = `
                display: flex;
                align-items: center;
                gap: 6px;
            `;

            const expiryDot = document.createElement('div');
            expiryDot.style.cssText = `
                width: 6px;
                height: 6px;
                background: rgba(255, 255, 255, 0.6);
                border-radius: 50%;
            `;
            expiryText.insertBefore(expiryDot, expiryText.firstChild);

            const viewCount = document.createElement('div');
            viewCount.textContent = `${note.viewers ? note.viewers.length : 0} views`;

            storyFooter.appendChild(expiryText);
            storyFooter.appendChild(viewCount);
            cardContent.appendChild(storyFooter);

            card.appendChild(cardContent);

            // Hover effects
            card.onmouseenter = () => {
                card.style.background = 'rgba(255, 255, 255, 0.12)';
                card.style.transform = 'translateY(-2px)';
                card.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.3)';
            };
            card.onmouseleave = () => {
                card.style.background = 'rgba(255, 255, 255, 0.08)';
                card.style.transform = 'translateY(0)';
                card.style.boxShadow = 'none';
            };

            return card;
        }

        function createActionButton(action) {
            const iconMap = {
                'Listen': '🎵', 'Buy': '🛒', 'Visit Website': '🌐',
                'Watch Video': '📺', 'Stream': '🎶', 'Download': '⬇️'
            };
            const icon = iconMap[action.label] || '🔗';

            const actionBtn = document.createElement('a');
            actionBtn.href = action.url;
            actionBtn.target = '_blank';
            actionBtn.rel = 'noopener noreferrer';
            actionBtn.className = 'timeline-action-btn';
            actionBtn.style.cssText = `
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 10px 16px;
                background: rgba(255, 255, 255, 0.15);
                color: #fff;
                text-decoration: none;
                font-weight: 600;
                font-size: 14px;
                border-radius: 12px;
                transition: all 0.3s ease;
                border: 1px solid rgba(255, 255, 255, 0.2);
                backdrop-filter: blur(10px);
                margin-top: 8px;
                position: relative;
                overflow: hidden;
            `;

            actionBtn.innerHTML = `
                <span style="font-size: 16px;">${icon}</span>
                <span>${action.label}</span>
            `;

            actionBtn.onmouseenter = () => {
                actionBtn.style.background = 'rgba(255, 255, 255, 0.25)';
                actionBtn.style.transform = 'translateY(-1px)';
                actionBtn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            };
            actionBtn.onmouseleave = () => {
                actionBtn.style.background = 'rgba(255, 255, 255, 0.15)';
                actionBtn.style.transform = 'translateY(0)';
                actionBtn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            };

            return actionBtn;
        }

        function formatTimeAgo(timestamp) {
            const now = Date.now();
            const diff = now - timestamp;
            const minutes = Math.floor(diff / 60000);
            const hours = Math.floor(diff / 3600000);
            const days = Math.floor(diff / 86400000);

            if (days > 0) return `${days}d ago`;
            if (hours > 0) return `${hours}h ago`;
            if (minutes > 0) return `${minutes}m ago`;
            return 'Just now';
        }

        function formatTimeLeft(createdAt) {
            const now = Date.now();
            const expiresAt = createdAt + (24 * 60 * 60 * 1000);
            const timeLeft = Math.max(0, expiresAt - now);
            
            if (timeLeft === 0) return 'expired';
            
            const hours = Math.floor(timeLeft / (60 * 60 * 1000));
            const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
            
            if (hours > 0) return `in ${hours}h ${minutes}m`;
            return `in ${minutes}m`;
        }

        function closeModal() {
            modal.style.opacity = '0';
            timelineContainer.style.transform = 'scale(0.9) translateY(40px)';
            setTimeout(() => {
                if (modal.parentNode) modal.parentNode.removeChild(modal);
            }, 400);
        }

        // Event listeners
        closeBtn.onclick = closeModal;
        modal.onclick = (e) => {
            if (e.target === modal) closeModal();
        };

        // Keyboard navigation
        const keyHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', keyHandler);
            }
        };
        document.addEventListener('keydown', keyHandler);

        // Assemble modal
        modal.appendChild(timelineContainer);
        document.body.appendChild(modal);

        // Animate in
        requestAnimationFrame(() => {
            modal.style.opacity = '1';
            timelineContainer.style.transform = 'scale(1) translateY(0)';
        });

        // Mobile responsiveness
        const updateForMobile = () => {
            const isMobile = window.innerWidth <= 768;
            if (isMobile) {
                timelineContainer.style.maxWidth = '95vw';
                timelineContainer.style.maxHeight = '95vh';
                timelineContainer.style.borderRadius = '20px';
                modal.style.padding = '10px';
                
                // Adjust story cards for mobile
                timelineContent.querySelectorAll('[style*="padding: 20px"]').forEach(card => {
                    card.style.padding = '16px';
                });
            }
        };
        updateForMobile();
        window.addEventListener('resize', updateForMobile);
    }

    function showFirstNotePrompt(producerName, avatarUrl, onAddNote) {
        const modal = document.createElement('div');
        modal.id = 'first-note-modal';
        modal.style.cssText = `
            position: fixed;
            inset: 0;
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(8px);
            opacity: 0;
            transition: opacity 0.3s ease;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: linear-gradient(145deg, rgba(25,25,30,0.95), rgba(35,35,40,0.95));
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
            padding: 40px;
            text-align: center;
            max-width: 380px;
            transform: scale(0.9);
            transition: transform 0.3s ease;
        `;

        content.innerHTML = `
            <div style="margin-bottom: 24px;">
                <div style="width: 80px; height: 80px; margin: 0 auto 16px; border-radius: 50%; background: linear-gradient(135deg, #ff8c42, #ff3c3c); display: flex; align-items: center; justify-content: center; font-size: 36px;">
                    📝
                </div>
                <h3 style="font-size: 22px; font-weight: 700; color: #fff; margin: 0 0 8px;">
                    Start Your Timeline
                </h3>
                <p style="color: rgba(255, 255, 255, 0.7); margin: 0; line-height: 1.5;">
                    Share your first note with fans! Notes expire after 24 hours and appear in chronological order.
                </p>
            </div>
            <button id="add-first-note" style="
                width: 100%;
                background: linear-gradient(135deg, #ff8c42, #ff3c3c);
                border: none;
                border-radius: 12px;
                color: #fff;
                font-weight: 600;
                font-size: 16px;
                padding: 16px;
                cursor: pointer;
                transition: all 0.3s ease;
                margin-bottom: 12px;
            ">Add Your First Note</button>
            <button id="close-prompt" style="
                width: 100%;
                background: transparent;
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 12px;
                color: rgba(255, 255, 255, 0.8);
                font-weight: 500;
                padding: 12px;
                cursor: pointer;
                transition: all 0.3s ease;
            ">Maybe Later</button>
        `;

        const addBtn = content.querySelector('#add-first-note');
        const closeBtn = content.querySelector('#close-prompt');

        addBtn.onmouseenter = () => addBtn.style.transform = 'translateY(-2px)';
        addBtn.onmouseleave = () => addBtn.style.transform = 'translateY(0)';
        closeBtn.onmouseenter = () => closeBtn.style.background = 'rgba(255, 255, 255, 0.1)';
        closeBtn.onmouseleave = () => closeBtn.style.background = 'transparent';

        const closeModal = () => {
            modal.style.opacity = '0';
            content.style.transform = 'scale(0.9)';
            setTimeout(() => {
                if (modal.parentNode) modal.parentNode.removeChild(modal);
            }, 300);
        };

        addBtn.onclick = () => {
            closeModal();
            onAddNote();
        };
        closeBtn.onclick = closeModal;
        modal.onclick = (e) => {
            if (e.target === modal) closeModal();
        };

        modal.appendChild(content);
        document.body.appendChild(modal);

        requestAnimationFrame(() => {
            modal.style.opacity = '1';
            content.style.transform = 'scale(1)';
        });
    }
})();

// Simplified initialization - delegates to BPNotesInitManager
function bpInitAll() {
    console.log('[BP] bpInitAll() called - delegating to BPNotesInitManager');
    if (window.BPNotesInitManager) {
        window.BPNotesInitManager.init();
    } else {
        console.warn('[BP] BPNotesInitManager not available, falling back to direct initialization');
        if (typeof render === 'function') render();
        if (typeof robustInitialize === 'function') robustInitialize();
    }
}

// Initialization is now handled by BPNotesInitManager
// These listeners are kept for backward compatibility
document.addEventListener('DOMContentLoaded', () => {
    console.log('[BP] DOMContentLoaded: delegating to BPNotesInitManager');
    if (window.BPNotesInitManager) {
        window.BPNotesInitManager.init();
    } else {
        bpInitAll();
    }
});

window.addEventListener('load', () => {
    console.log('[BP] window.load: delegating to BPNotesInitManager');
    if (window.BPNotesInitManager) {
        window.BPNotesInitManager.init();
    } else {
        bpInitAll();
    }
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('[BP] Immediate init: delegating to BPNotesInitManager');
    if (window.BPNotesInitManager) {
        window.BPNotesInitManager.init();
    } else {
        bpInitAll();
    }
}

// Helper: Extract first color stop from a linear-gradient string
function getFirstGradientColor(gradient) {
    const match = gradient.match(/#([0-9a-fA-F]{3,8})/);
    return match ? match[0] : '#444';
}



// CSS injection and library loading is now handled by BPNotesInitManager
// Keeping this as fallback for backward compatibility
if (!window.BPNotesInitManager) {
    // Add the keyframes for animations if not present
    if (!document.getElementById('bp-animation-keyframes')) {
        const style = document.createElement('style');
        style.id = 'bp-animation-keyframes';
        style.textContent = `
            @keyframes bp-gradient-ring-pan { 
                0% { background-position: 0% 50%; } 
                100% { background-position: 100% 50%; } 
            }
            @keyframes fadeInUp {
                0% {
                    opacity: 0;
                    transform: translateY(20px) scale(0.95);
                }
                100% {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }
            @keyframes bp-gradient-pan {
                0% { background-position: 0% 50%; }
                100% { background-position: 100% 50%; }
            }
        `;
        document.head.appendChild(style);
    }

    // Load Quill and DOMPurify if not already loaded
    if (!window.Quill) {
        const quillScript = document.createElement('script');
        quillScript.src = 'https://cdn.quilljs.com/1.3.7/quill.min.js';
        document.head.appendChild(quillScript);
        const quillStyle = document.createElement('link');
        quillStyle.rel = 'stylesheet';
        quillStyle.href = 'https://cdn.quilljs.com/1.3.7/quill.snow.css';
        document.head.appendChild(quillStyle);
    }
    if (!window.DOMPurify) {
        const purifyScript = document.createElement('script');
        purifyScript.src = 'https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js';
        document.head.appendChild(purifyScript);
    }
}

// Debounce utility - kept for backward compatibility
function debounceBP(fn, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), delay);
    };
}

// Resize event handling is now managed by BPNotesInitManager
// Keeping this as fallback for backward compatibility
if (!window.BPNotesInitManager) {
    window.addEventListener('resize', debounceBP(() => {
        if (typeof render === 'function') render();
    }, 300));
}