// Exclusive Licensing Module - IIFE
// Extracted from custom-fields.js for modular architecture

(function() {
    'use strict';
    
    // Helper function to check if we're on upload page
    function isUploadPage() {
        return window.location.pathname === '/upload';
    }
    
    // Helper function to check if we're on edit page
    function isEditPage() {
        return window.location.pathname.includes('/edit/');
    }
    
    // Helper function to enable submit button (assumes this exists globally)
    function enableSubmitButton() {
        if (typeof window.enableSubmitButton === 'function') {
            window.enableSubmitButton();
        }
    }
    
    // Helper function to update pending custom data (assumes this exists globally)
    function updatePendingCustomData() {
        if (typeof window.updatePendingCustomData === 'function') {
            window.updatePendingCustomData();
        }
    }
    
    // Helper function to update dashboard content (assumes this exists globally)
    function debouncedUpdateDashboardContent() {
        if (typeof window.debouncedUpdateDashboardContent === 'function') {
            window.debouncedUpdateDashboardContent();
        }
    }
    
    // Helper function to create price field (assumes this exists globally)
    function createPriceField(label, id, placeholder, defaultValue) {
        if (typeof window.createPriceField === 'function') {
            return window.createPriceField(label, id, placeholder, defaultValue);
        }
        // Fallback implementation
        const wrapper = document.createElement('div');
        wrapper.className = 'text-sm';
        
        const labelEl = document.createElement('label');
        labelEl.className = 'block first-letter:capitalize text-left whitespace-nowrap text-sm mb-4';
        labelEl.textContent = label;
        labelEl.setAttribute('for', id);
        wrapper.appendChild(labelEl);
        
        const isolateContainer = document.createElement('div');
        isolateContainer.className = 'isolate relative';
        
        const input = document.createElement('input');
        input.id = id;
        input.type = 'number';
        input.placeholder = placeholder;
        input.className = 'block text-left relative w-full appearance-none transition-shadow text bg-transparent rounded-input border-divider border focus:ring focus:ring-primary/focus focus:border-primary/60 focus:outline-none shadow-sm text-sm h-42 pl-12 pr-12';
        input.value = defaultValue;
        input.min = '0';
        input.step = '0.01';
        
        input.addEventListener('input', () => {
            input.dispatchEvent(new Event('change', { bubbles: true }));
            enableSubmitButton();
            updatePendingCustomData();
            if (isEditPage()) {
                setTimeout(() => debouncedUpdateDashboardContent(), 100);
            }
        });
        
        isolateContainer.appendChild(input);
        wrapper.appendChild(isolateContainer);
        
        return wrapper;
    }
    
    // Get exclusive licensing data from form
    function getExclusiveLicensingData() {
        const licensingInput = document.querySelector('#licensing_type');
        const statusInput = document.querySelector('#exclusive_status');
        const currencyInput = document.querySelector('#exclusive_currency');
        const price = document.querySelector('#exclusive_price')?.value || '';
        const buyerInfo = document.querySelector('#exclusive_buyer_info')?.value || '';
        
        // For button-based UI, the value is directly in the hidden input
        const licensing_type = licensingInput?.value || 'non_exclusive_only';
        const exclusive_status = licensing_type === 'non_exclusive_only' ? 'not_available' : (statusInput?.value || 'not_available');
        const exclusive_currency = currencyInput?.value || 'USD';
        
        return {
            licensing_type,
            exclusive_price: licensing_type !== 'non_exclusive_only' && price ? parseFloat(price) : '',
            exclusive_currency,
            exclusive_status,
            exclusive_buyer_info: buyerInfo
        };
    }
    
    // Create text field helper
    function createTextField(labelText, id, placeholder, defaultValue = '') {
        const wrapper = document.createElement('div');
        wrapper.className = 'text-sm';

        const label = document.createElement('label');
        label.className = 'block first-letter:capitalize text-left whitespace-nowrap text-sm mb-4';
        label.textContent = labelText;
        label.setAttribute('for', id);
        wrapper.appendChild(label);

        const isolateContainer = document.createElement('div');
        isolateContainer.className = 'isolate relative';

        const input = document.createElement('input');
        input.id = id;
        input.type = 'text';
        input.placeholder = placeholder;
        input.className = 'block text-left relative w-full appearance-none transition-shadow text bg-transparent rounded-input border-divider border focus:ring focus:ring-primary/focus focus:border-primary/60 focus:outline-none shadow-sm text-sm h-42 pl-12 pr-12';
        input.value = defaultValue;

        input.addEventListener('input', () => {
            input.dispatchEvent(new Event('change', { bubbles: true }));
            enableSubmitButton();
            updatePendingCustomData();
            if (isEditPage()) {
                setTimeout(() => debouncedUpdateDashboardContent(), 100);
            }
        });

        isolateContainer.appendChild(input);
        wrapper.appendChild(isolateContainer);

        return wrapper;
    }
    
    // Create exclusive licensing section with all fields
    function createExclusiveLicensingSection(existingData = {}) {
        const section = document.createElement('div');
        section.className = 'exclusive-licensing-section mt-20 sm:mt-32 mb-20 sm:mb-32';
        section.style.cssText = `
            background: linear-gradient(135deg, rgba(147, 51, 234, 0.05) 0%, rgba(139, 92, 246, 0.03) 100%);
            border: 1px solid rgba(147, 51, 234, 0.15);
            border-radius: 12px;
            padding: 24px;
            position: relative;
            overflow: visible;
        `;
        
        // Decorative background element
        const bgDecor = document.createElement('div');
        bgDecor.style.cssText = `
            position: absolute;
            top: -20px;
            right: -20px;
            width: 120px;
            height: 120px;
            background: radial-gradient(circle, rgba(147, 51, 234, 0.1) 0%, transparent 70%);
            pointer-events: none;
            opacity: 0.5;
        `;
        section.appendChild(bgDecor);
        
        // Section header with enhanced styling
        const sectionHeader = document.createElement('div');
        sectionHeader.className = 'mb-20 relative z-10';
        
        const headerContainer = document.createElement('div');
        headerContainer.className = 'mb-8';
        
        const headerTitle = document.createElement('h4');
        headerTitle.className = 'text-base font-bold text-white mb-4 flex items-center gap-10';
        headerTitle.innerHTML = `
            <div style="
                width: 32px;
                height: 32px;
                background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%);
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 12px rgba(147, 51, 234, 0.3);
            ">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1M12 7C13.66 7 15 8.34 15 10V11C16.1 11 17 11.9 17 13V17C17 18.1 16.1 19 15 19H9C7.9 19 7 18.1 7 17V13C7 11.9 7.9 11 9 11V10C9 8.34 10.34 7 12 7M12 9C11.45 9 11 9.45 11 10V11H13V10C13 9.45 12.55 9 12 9Z"></path>
            </svg>
            </div>
            Exclusive Licensing Options
        `;
        
        const headerDesc = document.createElement('p');
        headerDesc.className = 'text-sm text-white/80 leading-relaxed';
        headerDesc.textContent = 'Set pricing and availability for exclusive rights to this beat';
        
        headerContainer.appendChild(headerTitle);
        headerContainer.appendChild(headerDesc);
        sectionHeader.appendChild(headerContainer);
        
        section.appendChild(sectionHeader);
        
        // Licensing Type Button Selector
        const licensingTypeContainer = document.createElement('div');
        licensingTypeContainer.className = 'mb-20';
        
        const licensingTypeLabel = document.createElement('label');
        licensingTypeLabel.className = 'block text-sm font-semibold text-white mb-10';
        licensingTypeLabel.textContent = 'Licensing Type';
        
        const licensingTypeButtons = document.createElement('div');
        licensingTypeButtons.className = 'grid grid-cols-1 sm:grid-cols-3 gap-8 p-4 rounded-lg bg-black/20';
        licensingTypeButtons.setAttribute('role', 'radiogroup');
        
        const licensingOptions = [
            { value: 'non_exclusive_only', label: 'Non-Exclusive Only', desc: 'BeatPass licensing' },
            { value: 'both', label: 'Both Options', desc: 'Maximum flexibility' },
            { value: 'exclusive_only', label: 'Exclusive Only', desc: 'Single buyer' }
        ];
        
        licensingOptions.forEach(option => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'licensing-type-button relative p-12 rounded-lg border transition-all duration-200';
            button.setAttribute('data-value', option.value);
            button.setAttribute('role', 'radio');
            button.setAttribute('aria-checked', (existingData.licensing_type || 'non_exclusive_only') === option.value ? 'true' : 'false');
            
            const isSelected = (existingData.licensing_type || 'non_exclusive_only') === option.value;
            
            button.style.cssText = isSelected ? `
                background: linear-gradient(135deg, rgba(147, 51, 234, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%);
                border-color: #9333ea;
                transform: scale(1.02);
            ` : `
                background: rgba(255, 255, 255, 0.02);
                border-color: rgba(255, 255, 255, 0.1);
            `;
            
            button.innerHTML = `
                <div class="text-center">
                    <div class="font-semibold text-sm ${isSelected ? 'text-purple-300' : 'text-white'} mb-2">${option.label}</div>
                    <div class="text-xs ${isSelected ? 'text-purple-300/80' : 'text-white/60'}">${option.desc}</div>
                </div>
                ${isSelected ? `
                    <div class="absolute top-8 right-8 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                    </div>
                ` : ''}
            `;
            
            button.addEventListener('click', () => {
                // Update all buttons
                licensingTypeButtons.querySelectorAll('.licensing-type-button').forEach(btn => {
                    const value = btn.getAttribute('data-value');
                    const isNowSelected = value === option.value;
                    btn.setAttribute('aria-checked', isNowSelected ? 'true' : 'false');
                    
                    btn.style.cssText = isNowSelected ? `
                        background: linear-gradient(135deg, rgba(147, 51, 234, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%);
                        border-color: #9333ea;
                        transform: scale(1.02);
                    ` : `
                        background: rgba(255, 255, 255, 0.02);
                        border-color: rgba(255, 255, 255, 0.1);
                    `;
                    
                    // Update button content
                    const opt = licensingOptions.find(o => o.value === value);
                    btn.innerHTML = `
                        <div class="text-center">
                            <div class="font-semibold text-sm ${isNowSelected ? 'text-purple-300' : 'text-white'} mb-2">${opt.label}</div>
                            <div class="text-xs ${isNowSelected ? 'text-purple-300/80' : 'text-white/60'}">${opt.desc}</div>
                        </div>
                        ${isNowSelected ? `
                            <div class="absolute top-8 right-8 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                                </svg>
                            </div>
                        ` : ''}
                    `;
                });
                
                // Update hidden input
                let licensingInput = section.querySelector('#licensing_type');
                if (!licensingInput) {
                    licensingInput = document.createElement('input');
                    licensingInput.type = 'hidden';
                    licensingInput.id = 'licensing_type';
                    section.appendChild(licensingInput);
                }
                licensingInput.value = option.value;
                
                // Show/hide exclusive fields
                const exclusiveFieldsContainer = section.querySelector('.exclusive-fields-container');
                if (exclusiveFieldsContainer) {
                    exclusiveFieldsContainer.style.display = option.value !== 'non_exclusive_only' ? 'block' : 'none';
                }
                
                updatePendingCustomData();
                if (isEditPage()) {
                    setTimeout(() => debouncedUpdateDashboardContent(), 100);
                }
            });
            
            licensingTypeButtons.appendChild(button);
        });
        
        // Create hidden input for licensing type
        const licensingInput = document.createElement('input');
        licensingInput.type = 'hidden';
        licensingInput.id = 'licensing_type';
        licensingInput.value = existingData.licensing_type || 'non_exclusive_only';
        section.appendChild(licensingInput);
        
        licensingTypeContainer.appendChild(licensingTypeLabel);
        licensingTypeContainer.appendChild(licensingTypeButtons);
        section.appendChild(licensingTypeContainer);
        
        // Exclusive Fields Container (shown/hidden based on licensing type)
        const exclusiveFieldsContainer = document.createElement('div');
        exclusiveFieldsContainer.className = 'exclusive-fields-container';
        exclusiveFieldsContainer.style.display = (existingData.licensing_type && existingData.licensing_type !== 'non_exclusive_only') ? 'block' : 'none';
        
        // Status Button Selector
        const statusContainer = document.createElement('div');
        statusContainer.className = 'mb-20';
        
        const statusLabel = document.createElement('label');
        statusLabel.className = 'block text-sm font-semibold text-white mb-10';
        statusLabel.textContent = 'Availability Status';
        
        const statusButtons = document.createElement('div');
        statusButtons.className = 'flex flex-col sm:flex-row gap-8';
        statusButtons.setAttribute('role', 'radiogroup');
        
        const statusOptions = [
            { value: 'available', label: 'Available', icon: '✓', color: 'green' },
            { value: 'sold', label: 'Sold', icon: '●', color: 'red' },
            { value: 'not_available', label: 'Not Listed', icon: '○', color: 'gray' }
        ];
        
        statusOptions.forEach(option => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'status-button flex-1 p-12 rounded-lg border transition-all duration-200';
            button.setAttribute('data-value', option.value);
            button.setAttribute('role', 'radio');
            
            const isSelected = (existingData.exclusive_status || 'not_available') === option.value;
            button.setAttribute('aria-checked', isSelected ? 'true' : 'false');
            
            const colors = {
                green: { border: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981' },
                red: { border: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444' },
                gray: { border: 'rgba(255, 255, 255, 0.2)', bg: 'rgba(255, 255, 255, 0.05)', text: 'rgba(255, 255, 255, 0.7)' }
            };
            
            const color = colors[option.color];
            
            button.style.cssText = isSelected ? `
                background: ${color.bg};
                border-color: ${color.border};
                transform: scale(1.02);
            ` : `
                background: rgba(255, 255, 255, 0.02);
                border-color: rgba(255, 255, 255, 0.1);
            `;
            
            button.innerHTML = `
                <div class="text-center">
                    <div class="text-2xl mb-2">${option.icon}</div>
                    <div class="font-medium text-sm ${isSelected ? 'text-white' : 'text-white/80'}">${option.label}</div>
                </div>
            `;
            
            button.addEventListener('click', () => {
                // Update all status buttons
                statusButtons.querySelectorAll('.status-button').forEach(btn => {
                    const value = btn.getAttribute('data-value');
                    const isNowSelected = value === option.value;
                    btn.setAttribute('aria-checked', isNowSelected ? 'true' : 'false');
                    
                    const opt = statusOptions.find(o => o.value === value);
                    const optColor = colors[opt.color];
                    
                    btn.style.cssText = isNowSelected ? `
                        background: ${optColor.bg};
                        border-color: ${optColor.border};
                        transform: scale(1.02);
                    ` : `
                        background: rgba(255, 255, 255, 0.02);
                        border-color: rgba(255, 255, 255, 0.1);
                    `;
                });
                
                // Update hidden input
                let statusInput = section.querySelector('#exclusive_status');
                if (!statusInput) {
                    statusInput = document.createElement('input');
                    statusInput.type = 'hidden';
                    statusInput.id = 'exclusive_status';
                    section.appendChild(statusInput);
                }
                statusInput.value = option.value;
                
                // Show/hide sold info
                const soldInfoContainer = section.querySelector('.sold-info-container');
                if (soldInfoContainer) {
                    soldInfoContainer.style.display = option.value === 'sold' ? 'block' : 'none';
                }
                
                updatePendingCustomData();
                if (isEditPage()) {
                    setTimeout(() => debouncedUpdateDashboardContent(), 100);
                }
            });
            
            statusButtons.appendChild(button);
        });
        
        // Create hidden input for status
        const statusInput = document.createElement('input');
        statusInput.type = 'hidden';
        statusInput.id = 'exclusive_status';
        statusInput.value = existingData.exclusive_status || 'not_available';
        section.appendChild(statusInput);
        
        statusContainer.appendChild(statusLabel);
        statusContainer.appendChild(statusButtons);
        exclusiveFieldsContainer.appendChild(statusContainer);
        
        // Price and Currency Section
        const priceSection = document.createElement('div');
        priceSection.className = 'exclusive-price-container grid grid-cols-1 sm:grid-cols-2 gap-16 mb-20';
        
        // Price Field
        const priceField = createPriceField(
            'Exclusive Price',
            'exclusive_price',
            'Enter price...',
            existingData.exclusive_price || ''
        );
        priceField.classList.remove('mb-24');
        priceSection.appendChild(priceField);
        
        // Currency Selector
        const currencyContainer = document.createElement('div');
        currencyContainer.className = 'text-sm';
        
        const currencyLabel = document.createElement('label');
        currencyLabel.className = 'block first-letter:capitalize text-left whitespace-nowrap text-sm mb-4';
        currencyLabel.textContent = 'Currency';
        currencyLabel.setAttribute('for', 'exclusive_currency');
        
        const currencyButtonGroup = document.createElement('div');
        currencyButtonGroup.className = 'flex flex-wrap gap-6';
        
        const currencies = [
            { value: 'USD', symbol: '$', label: 'USD' },
            { value: 'EUR', symbol: '€', label: 'EUR' },
            { value: 'GBP', symbol: '£', label: 'GBP' },
            { value: 'CAD', symbol: 'C$', label: 'CAD' }
        ];
        
        currencies.forEach(curr => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'currency-button px-12 py-8 rounded-lg border text-sm font-medium transition-all duration-200';
            button.setAttribute('data-value', curr.value);
            
            const isSelected = (existingData.exclusive_currency || 'USD') === curr.value;
            
            button.style.cssText = isSelected ? `
                background: linear-gradient(135deg, rgba(147, 51, 234, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%);
                border-color: #9333ea;
                color: #a78bfa;
            ` : `
                background: rgba(255, 255, 255, 0.02);
                border-color: rgba(255, 255, 255, 0.1);
                color: rgba(255, 255, 255, 0.7);
            `;
            
            button.innerHTML = `<span style="margin-right: 4px;">${curr.symbol}</span>${curr.label}`;
            
            button.addEventListener('click', () => {
                // Update all currency buttons
                currencyButtonGroup.querySelectorAll('.currency-button').forEach(btn => {
                    const value = btn.getAttribute('data-value');
                    const isNowSelected = value === curr.value;
                    
                    btn.style.cssText = isNowSelected ? `
                        background: linear-gradient(135deg, rgba(147, 51, 234, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%);
                        border-color: #9333ea;
                        color: #a78bfa;
                    ` : `
                        background: rgba(255, 255, 255, 0.02);
                        border-color: rgba(255, 255, 255, 0.1);
                        color: rgba(255, 255, 255, 0.7);
                    `;
                });
                
                // Update hidden input
                let currencyInput = section.querySelector('#exclusive_currency');
                if (!currencyInput) {
                    currencyInput = document.createElement('input');
                    currencyInput.type = 'hidden';
                    currencyInput.id = 'exclusive_currency';
                    section.appendChild(currencyInput);
                }
                currencyInput.value = curr.value;
                
                updatePendingCustomData();
                if (isEditPage()) {
                    setTimeout(() => debouncedUpdateDashboardContent(), 100);
                }
            });
            
            currencyButtonGroup.appendChild(button);
        });
        
        // Create hidden input for currency
        const currencyInput = document.createElement('input');
        currencyInput.type = 'hidden';
        currencyInput.id = 'exclusive_currency';
        currencyInput.value = existingData.exclusive_currency || 'USD';
        section.appendChild(currencyInput);
        
        currencyContainer.appendChild(currencyLabel);
        currencyContainer.appendChild(currencyButtonGroup);
        priceSection.appendChild(currencyContainer);
        
        exclusiveFieldsContainer.appendChild(priceSection);
        
        // Sold Info Container (visibility toggled)
        const soldInfoContainer = document.createElement('div');
        soldInfoContainer.className = 'sold-info-container';
        soldInfoContainer.style.cssText = `
            display: ${existingData.exclusive_status === 'sold' ? 'block' : 'none'};
            background: rgba(239, 68, 68, 0.05);
            border: 1px solid rgba(239, 68, 68, 0.2);
            border-radius: 8px;
            padding: 16px;
            margin-top: 20px;
        `;
        
        const soldHeader = document.createElement('div');
        soldHeader.className = 'flex items-center gap-8 mb-12';
        soldHeader.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#ef4444">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <span class="text-sm font-semibold text-red-400">Sold Information</span>
        `;
        soldInfoContainer.appendChild(soldHeader);

        const buyerInfoField = createTextField(
            'Buyer Details',
            'exclusive_buyer_info',
            'Enter buyer name, ID, or contact info...',
            existingData.exclusive_buyer_info || ''
        );
        soldInfoContainer.appendChild(buyerInfoField);

        if (existingData.exclusive_sold_date) {
            const soldDateContainer = document.createElement('div');
            soldDateContainer.className = 'mt-12 p-12 rounded-lg bg-black/20';
            soldDateContainer.innerHTML = `
                <label class="block text-xs text-white/60 mb-4">Date of Sale</label>
                <p class="text-sm font-medium text-white/90">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" class="inline mr-6 text-white/60">
                        <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                    </svg>
                    ${new Date(existingData.exclusive_sold_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
            `;
            soldInfoContainer.appendChild(soldDateContainer);
        }
        
        exclusiveFieldsContainer.appendChild(soldInfoContainer);
        
        // Add exclusive fields container to section
        section.appendChild(exclusiveFieldsContainer);

        return section;
    }
    
    // Helper function to format price with currency
    function formatPrice(price, currency) {
        const symbols = {
            'USD': '$',
            'EUR': '€',
            'GBP': '£',
            'CAD': 'C$',
            'AUD': 'A$',
            'JPY': '¥'
        };
        const symbol = symbols[currency] || currency;
        const formattedPrice = parseFloat(price).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        return `${symbol}${formattedPrice}`;
    }
    
    // Helper function to create exclusive licensing display
    function createExclusiveLicensingDisplay(data) {
        if (!data || data.licensing_type === 'non_exclusive_only') {
            return null;
        }
        
        const container = document.createElement('div');
        container.className = 'exclusive-licensing-display mt-8 p-8 rounded-lg bg-white/5 border border-white/10';
        
        const statusColors = {
            'available': 'text-green-400',
            'sold': 'text-red-400',
            'not_available': 'text-gray-400'
        };
        
        const statusLabels = {
            'available': 'Available',
            'sold': 'Sold',
            'not_available': 'Not Available'
        };
        
        if (data.exclusive_price && data.exclusive_price > 0) {
            const priceRow = document.createElement('div');
            priceRow.className = 'flex items-center justify-between mb-4';
            priceRow.innerHTML = `
                <span class="text-xs text-white/60">Exclusive Price:</span>
                <span class="text-sm font-semibold text-white">${formatPrice(data.exclusive_price, data.exclusive_currency)}</span>
            `;
            container.appendChild(priceRow);
        }
        
        const statusRow = document.createElement('div');
        statusRow.className = 'flex items-center justify-between';
        statusRow.innerHTML = `
            <span class="text-xs text-white/60">Status:</span>
            <span class="text-xs font-medium ${statusColors[data.exclusive_status]}">${statusLabels[data.exclusive_status]}</span>
        `;
        container.appendChild(statusRow);
        
        if (data.exclusive_status === 'sold' && data.exclusive_sold_date) {
            const soldDate = new Date(data.exclusive_sold_date);
            const dateRow = document.createElement('div');
            dateRow.className = 'flex items-center justify-between mt-2';
            dateRow.innerHTML = `
                <span class="text-xs text-white/60">Sold Date:</span>
                <span class="text-xs text-white/80">${soldDate.toLocaleDateString()}</span>
            `;
            container.appendChild(dateRow);
        }
        
        if (data.exclusive_buyer_info) {
            const buyerInfoRow = document.createElement('div');
            buyerInfoRow.className = 'flex items-center justify-between mt-2';
            buyerInfoRow.innerHTML = `
                <span class="text-xs text-white/60">Buyer Info:</span>
                <span class="text-xs text-white/80">${data.exclusive_buyer_info}</span>
            `;
            container.appendChild(buyerInfoRow);
        }
        
        return container;
    }
    
    // Ensure exclusive licensing button styles are loaded
    function ensureExclusiveLicensingStyles() {
        if (document.getElementById('exclusive-licensing-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'exclusive-licensing-styles';
        style.textContent = `
            /* Exclusive Licensing Button Styles */
            .exclusive-licensing-section {
                animation: beatpass-fadeIn 0.5s ease-out;
            }
            
            .licensing-type-button:hover:not([aria-checked="true"]) {
                background: rgba(147, 51, 234, 0.08) !important;
                border-color: rgba(147, 51, 234, 0.3) !important;
                transform: scale(1.01);
            }
            
            .status-button:hover:not([aria-checked="true"]) {
                transform: scale(1.01);
                filter: brightness(1.1);
            }
            
            .currency-button:hover:not([style*="9333ea"]) {
                background: rgba(147, 51, 234, 0.08) !important;
                border-color: rgba(147, 51, 234, 0.3) !important;
                color: rgba(255, 255, 255, 0.9) !important;
            }
            
            /* Smooth transitions for exclusive fields visibility */
            .exclusive-fields-container {
                animation: beatpass-fadeIn 0.3s ease-out;
            }
            
            .sold-info-container {
                animation: beatpass-slideIn 0.3s ease-out;
            }
            
            /* Button press effect */
            .licensing-type-button:active,
            .status-button:active,
            .currency-button:active {
                transform: scale(0.98) !important;
            }
            
            /* Focus styles for accessibility */
            .licensing-type-button:focus-visible,
            .status-button:focus-visible,
            .currency-button:focus-visible {
                outline: 2px solid #9333ea;
                outline-offset: 2px;
            }
            
            /* Enhance the section appearance */
            .exclusive-licensing-section::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 1px;
                background: linear-gradient(90deg, transparent, rgba(147, 51, 234, 0.3), transparent);
                opacity: 0.5;
            }
            
            /* Mobile-specific styles */
            @media (max-width: 640px) {
                .exclusive-licensing-section {
                    margin-left: -8px;
                    margin-right: -8px;
                    padding: 16px;
                }
                
                .licensing-type-button {
                    padding: 16px 12px;
                    text-align: center;
                }
                
                .status-button {
                    padding: 16px 12px;
                    min-height: 80px;
                }
                
                .currency-button {
                    min-width: 80px;
                    flex: 1;
                    justify-content: center;
                }
                
                /* Reduce icon size in header on mobile */
                .exclusive-licensing-section h4 > div {
                    width: 28px !important;
                    height: 28px !important;
                }
                
                .exclusive-licensing-section h4 > div svg {
                    width: 16px !important;
                    height: 16px !important;
                }
            }
            
            /* Tablet-specific adjustments */
            @media (min-width: 641px) and (max-width: 1024px) {
                .currency-button {
                    flex: 1;
                    justify-content: center;
                }
            }
            
            /* Animation keyframes */
            @keyframes beatpass-fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            @keyframes beatpass-slideIn {
                from { opacity: 0; transform: translateX(-10px); }
                to { opacity: 1; transform: translateX(0); }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Initialize styles when module loads
    ensureExclusiveLicensingStyles();
    
    // Expose functions globally
    window.getExclusiveLicensingData = getExclusiveLicensingData;
    window.createExclusiveLicensingSection = createExclusiveLicensingSection;
    window.formatPrice = formatPrice;
    window.createExclusiveLicensingDisplay = createExclusiveLicensingDisplay;
    window.ensureExclusiveLicensingStyles = ensureExclusiveLicensingStyles;
    
    console.log('✅ Exclusive Licensing module loaded successfully');
})();