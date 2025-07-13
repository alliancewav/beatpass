// ============================================================
// Sample-Safe™ Banner Module
// Extracted from custom-fields.js
// Creates comprehensive sample clearance and producer responsibility banner
// ============================================================
(function () {
    'use strict';

    /**
     * Creates a comprehensive Sample-Safe™ banner with terms of service,
     * producer responsibilities, and platform enforcement information
     * @returns {HTMLElement} The complete banner element
     */
    function createSampleSafeBanner() {
        // Create banner container using native form styling
        const banner = document.createElement('div');
        banner.className = 'mt-24 mb-8';
        banner.id = 'sample-safe-banner';
        
        // Start invisible for smooth animation
        banner.style.cssText = `
            opacity: 0;
            transform: translateY(15px);
            transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        `;
        
        // Main banner container with enhanced styling
        const bannerCard = document.createElement('div');
        bannerCard.className = 'isolate relative';
        bannerCard.style.cssText = `
            border-radius: 16px;
            box-shadow: 
                0 10px 32px rgba(0, 0, 0, 0.15),
                0 4px 16px rgba(0, 0, 0, 0.1),
                inset 0 1px 0 rgba(255, 255, 255, 0.1);
        `;
        
        const innerCard = document.createElement('div');
        innerCard.className = 'block relative w-full overflow-hidden';
        innerCard.style.cssText = `
            background: linear-gradient(135deg, 
                rgba(6, 17, 14, 0.95) 0%, 
                rgba(20, 33, 28, 0.92) 35%,
                rgba(16, 28, 24, 0.95) 100%);
            backdrop-filter: blur(20px) saturate(180%);
            border: 1px solid rgba(16, 185, 129, 0.25);
            border-radius: 16px;
            padding: 0;
        `;
        
        // Enhanced background pattern with subtle animation
        const bgPattern = document.createElement('div');
        bgPattern.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            opacity: 0.06;
            background: 
                radial-gradient(circle at 20% 30%, #10b981 0%, transparent 40%),
                radial-gradient(circle at 80% 70%, #059669 0%, transparent 40%),
                radial-gradient(circle at 60% 20%, #047857 0%, transparent 30%);
            animation: bgFloat 8s ease-in-out infinite;
            pointer-events: none;
        `;
        innerCard.appendChild(bgPattern);
        
        // Header section with improved styling
        const header = document.createElement('div');
        header.className = 'relative z-10';
        header.style.cssText = `
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.08) 100%);
            border-bottom: 1px solid rgba(16, 185, 129, 0.2);
            padding: 20px 24px;
        `;
        
        const headerContent = document.createElement('div');
        headerContent.className = 'flex items-center justify-between';
        
        // Enhanced Sample-Safe™ branding
        const brandingContainer = document.createElement('div');
        brandingContainer.className = 'flex items-center gap-16';
        
        const shieldContainer = document.createElement('div');
        shieldContainer.className = 'relative';
        
        const shieldIcon = document.createElement('div');
        shieldIcon.className = 'flex items-center justify-center w-12 h-12 rounded-xl';
        shieldIcon.style.cssText = `
            background: linear-gradient(135deg, #10b981 0%, #047857 100%);
            box-shadow: 
                0 8px 24px rgba(16, 185, 129, 0.4),
                inset 0 1px 0 rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(16, 185, 129, 0.3);
        `;
        shieldIcon.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1M10 17L6 13L7.41 11.59L10 14.17L16.59 7.58L18 9L10 17Z"/>
            </svg>
        `;
        
        // Pulse ring animation with proper class
        const pulseRing = document.createElement('div');
        pulseRing.className = 'pulse-ring';
        shieldContainer.appendChild(pulseRing);
        shieldContainer.appendChild(shieldIcon);
        
        const titleContainer = document.createElement('div');
        
        const sampleSafeBadge = document.createElement('div');
        sampleSafeBadge.className = 'mb-6';
        sampleSafeBadge.style.cssText = `
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 6px 12px;
            border-radius: 20px;
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(5, 150, 105, 0.15) 100%);
            border: 1px solid rgba(16, 185, 129, 0.4);
            font-size: 12px;
            font-weight: 600;
            color: #34d399;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        `;
        sampleSafeBadge.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            Sample-Safe™ Guarantee
        `;
        
        const headerTitle = document.createElement('h3');
        headerTitle.style.cssText = `
            font-size: 20px;
            font-weight: 700;
            color: white;
            margin: 0;
            letter-spacing: -0.02em;
        `;
        headerTitle.textContent = 'Producer Responsibility & Sample Clearance';
        
        titleContainer.appendChild(sampleSafeBadge);
        titleContainer.appendChild(headerTitle);
        
        brandingContainer.appendChild(shieldContainer);
        brandingContainer.appendChild(titleContainer);
        headerContent.appendChild(brandingContainer);
        header.appendChild(headerContent);
        
        // Main content sections with improved spacing
        const contentContainer = document.createElement('div');
        contentContainer.className = 'relative z-10';
        contentContainer.style.padding = '20px';
        
        // Create sections with professional styling
        const sections = [
            {
                id: 'warning',
                title: 'Terms of Service - Prohibited Content',
                icon: `<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>`,
                color: '#f59e0b',
                bgColor: 'rgba(245, 158, 11, 0.08)',
                borderColor: 'rgba(245, 158, 11, 0.25)',
                items: [
                    {
                        icon: `<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>`,
                        text: '<strong>STRICTLY PROHIBITED:</strong> Uploading beats containing <strong>uncleared samples</strong> or <strong>duplicate content</strong>'
                    },
                    {
                        icon: `<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>`,
                        text: '<strong>VIOLATIONS INCLUDE:</strong> Copyrighted material, unauthorized samples, previously uploaded beats, or content you do not own 100%'
                    }
                ]
            },
            {
                id: 'responsibility',
                title: 'Producer Legal Warranty & Responsibility',
                icon: `<path d="M9 16.17l-4.17-4.17-1.42 1.41L9 19 21 7l-1.41-1.41z"/>`,
                color: '#10b981',
                bgColor: 'rgba(16, 185, 129, 0.06)',
                borderColor: 'rgba(16, 185, 129, 0.2)',
                items: [
                    {
                        icon: `<path d="M9 16.17l-4.17-4.17-1.42 1.41L9 19 21 7l-1.41-1.41z"/>`,
                        text: '<strong>YOU WARRANT:</strong> All samples are properly cleared and licensed for commercial use'
                    },
                    {
                        icon: `<path d="M9 16.17l-4.17-4.17-1.42 1.41L9 19 21 7l-1.41-1.41z"/>`,
                        text: '<strong>YOU GUARANTEE:</strong> This work is 100% yours and safe to license commercially without copyright risk'
                    },
                    {
                        icon: `<path d="M9 16.17l-4.17-4.17-1.42 1.41L9 19 21 7l-1.41-1.41z"/>`,
                        text: '<strong>YOU INDEMNIFY:</strong> Buyers against any legal claims related to uncleared samples or copyright infringement'
                    }
                ]
            },
            {
                id: 'enforcement',
                title: 'Platform Enforcement & Community Safety',
                icon: `<path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1M11 7H13V9H11V7M11 11H13V17H11V11Z"/>`,
                color: '#ef4444',
                bgColor: 'rgba(239, 68, 68, 0.06)',
                borderColor: 'rgba(239, 68, 68, 0.2)',
                items: [
                    {
                        icon: `<path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1M10 17L6 13L7.41 11.59L10 14.17L16.59 7.58L18 9L10 17Z"/>`,
                        text: '<strong>OUR COMMITMENT:</strong> Maintaining a safe, trustworthy community for all producers and buyers'
                    },
                    {
                        icon: `<path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>`,
                        text: '<strong>ENFORCEMENT:</strong> We can terminate producer accounts if tracks are reported to contain uncleared samples after licensing'
                    },
                    {
                        icon: `<path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>`,
                        text: '<strong>DETECTION:</strong> Our BeatPassID system actively scans for duplicate content and copyright violations'
                    }
                ]
            }
        ];
        
        sections.forEach((section, index) => {
            const sectionElement = document.createElement('div');
            sectionElement.className = 'section-spacing';
            sectionElement.style.cssText = `
                background: linear-gradient(135deg, ${section.bgColor} 0%, rgba(0, 0, 0, 0.02) 100%);
                border: 1px solid ${section.borderColor};
                border-radius: 12px;
                padding: 16px;
                animation: slideInUp 0.6s ease-out ${(index + 1) * 0.1}s both;
            `;
           
            const sectionHeader = document.createElement('div');
            sectionHeader.className = 'flex items-center gap-10 mb-12';
           
            const iconContainer = document.createElement('div');
            iconContainer.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: center;
                width: 32px;
                height: 32px;
                border-radius: 8px;
                background: linear-gradient(135deg, ${section.color}20 0%, ${section.color}10 100%);
                border: 1px solid ${section.color}30;
            `;
            iconContainer.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="${section.color}">
                    ${section.icon}
                </svg>
            `;
            
            const sectionTitle = document.createElement('h4');
            sectionTitle.style.cssText = `
                font-size: 14px;
                font-weight: 700;
                color: ${section.color};
                margin: 0;
                letter-spacing: -0.01em;
            `;
            sectionTitle.textContent = section.title;
            
            sectionHeader.appendChild(iconContainer);
            sectionHeader.appendChild(sectionTitle);
            
            const itemsList = document.createElement('div');
            itemsList.style.cssText = 'display: flex; flex-direction: column;';
            
            section.items.forEach((item, itemIndex) => {
                const itemElement = document.createElement('div');
                itemElement.className = 'flex items-start gap-10 item-spacing';
               
                const itemIcon = document.createElement('div');
                itemIcon.style.cssText = `
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 20px;
                    height: 20px;
                    margin-top: 1px;
                    flex-shrink: 0;
                `;
                itemIcon.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="${section.color}">
                        ${item.icon}
                    </svg>
                `;
                
                const itemText = document.createElement('div');
                itemText.style.cssText = `
                    font-size: 13px;
                    line-height: 1.6;
                    color: rgba(255, 255, 255, 0.9);
                `;
                itemText.innerHTML = item.text;
                
                itemElement.appendChild(itemIcon);
                itemElement.appendChild(itemText);
                itemsList.appendChild(itemElement);
            });
            
            sectionElement.appendChild(sectionHeader);
            sectionElement.appendChild(itemsList);
            contentContainer.appendChild(sectionElement);
        });
        
        // Contact section with improved design
        const contactSection = document.createElement('div');
        contactSection.className = 'section-spacing';
        contactSection.style.cssText = `
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(29, 78, 216, 0.04) 100%);
            border: 1px solid rgba(59, 130, 246, 0.2);
            border-radius: 12px;
            padding: 16px;
        `;
        
        const contactHeader = document.createElement('div');
        contactHeader.className = 'flex items-center gap-10 mb-10';
        
        const contactIcon = document.createElement('div');
        contactIcon.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            border-radius: 6px;
            background: rgba(59, 130, 246, 0.15);
            border: 1px solid rgba(59, 130, 246, 0.3);
        `;
        contactIcon.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#3b82f6">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
            </svg>
        `;
        
        const contactTitle = document.createElement('h5');
        contactTitle.style.cssText = `
            font-size: 13px;
            font-weight: 600;
            color: #60a5fa;
            margin: 0;
        `;
        contactTitle.textContent = 'Questions or Issues?';
        
        contactHeader.appendChild(contactIcon);
        contactHeader.appendChild(contactTitle);
        
        const contactText = document.createElement('div');
        contactText.style.cssText = `
            font-size: 12px;
            line-height: 1.6;
            color: rgba(255, 255, 255, 0.8);
        `;
        contactText.innerHTML = `
            Contact BeatPass administrators at <a href="mailto:support@beatpass.ca" class="text-blue-400 hover:text-blue-300 underline font-medium transition-colors">support@beatpass.ca</a> 
            or through our <a href="https://open.beatpass.ca/support" target="_blank" class="text-blue-400 hover:text-blue-300 underline font-medium transition-colors">support portal</a> 
            for any questions about sample clearance, licensing, or platform policies.
        `;
        
        contactSection.appendChild(contactHeader);
        contactSection.appendChild(contactText);
        contentContainer.appendChild(contactSection);
        
        // Enhanced agreement checkbox section
        const agreementSection = document.createElement('div');
        agreementSection.style.cssText = `
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.06) 100%);
            border: 2px solid rgba(16, 185, 129, 0.3);
            border-radius: 12px;
            padding: 16px;
            position: relative;
            overflow: hidden;
            margin-top: 4px;
        `;
        
        // Agreement section background accent
        const agreementBg = document.createElement('div');
        agreementBg.style.cssText = `
            position: absolute;
            top: 0;
            right: 0;
            width: 80px;
            height: 80px;
            background: radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%);
            pointer-events: none;
        `;
        agreementSection.appendChild(agreementBg);
        
        const agreementContent = document.createElement('div');
        agreementContent.className = 'flex items-start gap-12 relative z-10';
        
        const checkboxContainer = document.createElement('div');
        checkboxContainer.className = 'relative flex-shrink-0 mt-2';
        
        const agreementCheckbox = document.createElement('input');
        agreementCheckbox.type = 'checkbox';
        agreementCheckbox.id = 'sample-safe-agreement';
        agreementCheckbox.style.cssText = `
            width: 20px;
            height: 20px;
            border-radius: 4px;
            border: 2px solid #10b981;
            background: transparent;
            accent-color: #10b981;
            cursor: pointer;
            transition: all 0.2s ease;
        `;
        
        const agreementLabel = document.createElement('label');
        agreementLabel.htmlFor = 'sample-safe-agreement';
        agreementLabel.style.cssText = `
            font-size: 14px;
            font-weight: 500;
            line-height: 1.6;
            color: white;
            cursor: pointer;
        `;
        agreementLabel.innerHTML = `
            <strong>I understand and agree:</strong> I warrant that this beat contains only cleared samples (or is 100% original), 
            does not violate any copyrights, is not a duplicate, and is safe for commercial licensing under the Sample-Safe™ guarantee. 
            I accept full legal responsibility for any sample clearance issues.
        `;
        
        checkboxContainer.appendChild(agreementCheckbox);
        agreementContent.appendChild(checkboxContainer);
        agreementContent.appendChild(agreementLabel);
        agreementSection.appendChild(agreementContent);
        contentContainer.appendChild(agreementSection);
        
        // Assemble components
        innerCard.appendChild(header);
        innerCard.appendChild(contentContainer);
        bannerCard.appendChild(innerCard);
        banner.appendChild(bannerCard);
        
        // Enhanced animations with proper CSS
        const style = document.createElement('style');
        style.textContent = `
            @keyframes bgFloat {
                0%, 100% { transform: translate(0, 0) scale(1); }
                33% { transform: translate(-10px, -10px) scale(1.05); }
                66% { transform: translate(10px, -5px) scale(0.95); }
            }
            
            @keyframes pulse {
                0%, 100% { 
                    opacity: 0.3; 
                    transform: scale(1); 
                }
                50% { 
                    opacity: 0.6; 
                    transform: scale(1.08); 
                }
            }
            
            @keyframes slideInUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            /* Ensure proper rendering of Sample-Safe banner elements */
            #sample-safe-banner .pulse-ring {
                animation: pulse 2.5s ease-in-out infinite !important;
                border: 2px solid rgba(16, 185, 129, 0.4) !important;
                border-radius: 16px !important;
                position: absolute !important;
                inset: -4px !important;
                pointer-events: none !important;
            }
            
            #sample-safe-banner svg {
                display: block !important;
                flex-shrink: 0 !important;
            }
            
            #sample-safe-banner .section-spacing {
                margin-bottom: 16px !important;
            }
            
            #sample-safe-banner .item-spacing {
                margin-bottom: 8px !important;
            }
        `;
        if (!document.getElementById('sample-safe-animations')) {
            style.id = 'sample-safe-animations';
            document.head.appendChild(style);
        }
        
        // Smooth entrance animation
        requestAnimationFrame(() => {
            setTimeout(() => {
                banner.style.opacity = '1';
                banner.style.transform = 'translateY(0)';
            }, 150);
        });
        
        // Enhanced checkbox validation with visual feedback
        agreementCheckbox.addEventListener('change', () => {
            const submitButton = document.querySelector('form button[type="submit"]');
            if (submitButton) {
                if (agreementCheckbox.checked) {
                    submitButton.disabled = false;
                    submitButton.style.opacity = '1';
                    agreementSection.style.borderColor = 'rgba(16, 185, 129, 0.5)';
                    agreementSection.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.08) 100%)';
                } else {
                    submitButton.disabled = true;
                    submitButton.style.opacity = '0.5';
                    agreementSection.style.borderColor = 'rgba(16, 185, 129, 0.3)';
                    agreementSection.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.06) 100%)';
                }
            }
        });
        
        // Initially disable submit button until agreement is checked
        setTimeout(() => {
            const submitButton = document.querySelector('form button[type="submit"]');
            if (submitButton && !agreementCheckbox.checked) {
                submitButton.disabled = true;
                submitButton.style.opacity = '0.5';
            }
        }, 500);
        
        return banner;
    }

    // Expose the function globally for use by other modules
    window.createSampleSafeBanner = createSampleSafeBanner;

    // Auto-initialize if DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('[Sample-Safe Banner] Module loaded and ready');
        });
    } else {
        console.log('[Sample-Safe Banner] Module loaded and ready');
    }

})();