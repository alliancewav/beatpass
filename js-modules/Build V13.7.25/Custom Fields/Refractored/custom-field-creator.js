// Custom Field Creator Module - IIFE
// Handles creation of custom form fields with native UI styling

(function() {
    'use strict';
    
    console.log('🎨 Custom Field Creator module loaded');
    
    // ---------------------------
    // Custom Field Creation Functions
    // ---------------------------
    
    function createDropdownField(labelText, id, placeholder, options, defaultValue = '', valueMap = {}) {
        const wrapper = document.createElement('div');
        wrapper.className = 'mb-24 text-sm';
        const label = document.createElement('label');
        label.className = 'block first-letter:capitalize text-left whitespace-nowrap text-sm mb-4';
        label.textContent = labelText;
        label.setAttribute('for', id);
        wrapper.appendChild(label);

        const isolateContainer = document.createElement('div');
        isolateContainer.className = 'isolate relative';

        const input = document.createElement('input');
        input.id = id;
        input.placeholder = placeholder;
        input.className = 'block text-left relative w-full appearance-none transition-shadow text bg-transparent rounded-input border-divider border focus:ring focus:ring-primary/focus focus:border-primary/60 focus:outline-none shadow-sm text-sm h-42 pl-12 pr-12';
        input.autocomplete = 'off';
        input.value = defaultValue;
        input.dataset.valueMap = JSON.stringify(valueMap);

        // Dropdown rendered in body to avoid clipping
        const dropdown = document.createElement('div');
        dropdown.className = 'hidden absolute border shadow-xl rounded-panel max-h-48 overflow-y-auto dropdown-panel';
        dropdown.style.cssText = 'background: rgba(25,25,25,.95);backdrop-filter:blur(90px) contrast(.9);border-color:rgba(255,255,255,.15);z-index:10000;';

        function populate(list) {
            dropdown.innerHTML = '';
            const listbox = document.createElement('div');
            listbox.setAttribute('role','listbox');
            list.forEach(opt=>{
                const item=document.createElement('div');
                item.setAttribute('role','option');
                item.className='w-full select-none cursor-pointer py-8 text-sm truncate px-20 hover:bg-hover rounded-md text-white';
                item.textContent=opt;
                item.addEventListener('click',()=>{
                    input.value=opt;
                    dropdown.classList.add('hidden');
                    input.dispatchEvent(new Event('change',{bubbles:true}));
                    if (window.enableSubmitButton) window.enableSubmitButton();
                    if (window.updatePendingCustomData) window.updatePendingCustomData();
                    if (window.isEditPage && window.isEditPage() && window.debouncedUpdateDashboardContent) {
                        setTimeout(()=>window.debouncedUpdateDashboardContent(),100);
                    }
                });
                listbox.appendChild(item);
            });
            dropdown.appendChild(listbox);
        }
        populate(options);

        document.body.appendChild(dropdown); // portal

        function positionDropdown() {
            const rect=input.getBoundingClientRect();
            dropdown.style.top=rect.bottom+window.scrollY+'px';
            dropdown.style.left=rect.left+window.scrollX+'px';
            dropdown.style.right='auto';
            dropdown.style.width=rect.width+'px';
        }

        input.addEventListener('focus',()=>{
            positionDropdown();
            dropdown.classList.remove('hidden');
        });
        input.addEventListener('input',()=>{
            const term=input.value.toLowerCase();
            const filtered=options.filter(o=>o.toLowerCase().includes(term));
            populate(filtered);
        });
        window.addEventListener('resize',()=>{if(!dropdown.classList.contains('hidden')) positionDropdown();});
        document.addEventListener('click',e=>{
            if(!wrapper.contains(e.target) && !dropdown.contains(e.target)) dropdown.classList.add('hidden');
        });

        isolateContainer.appendChild(input);
        wrapper.appendChild(isolateContainer);
        return wrapper;
    }

    function createBPMField(defaultValue = '') {
        // Use native form field structure
        const wrapper = document.createElement('div');
        wrapper.className = 'mb-24 text-sm';
        
        // Native label structure
        const label = document.createElement('label');
        label.className = 'block first-letter:capitalize text-left whitespace-nowrap text-sm mb-4';
        label.textContent = 'BPM';
        label.setAttribute('for', 'bpm');
        wrapper.appendChild(label);

        // Native isolate container
        const isolateContainer = document.createElement('div');
        isolateContainer.className = 'isolate relative';

        // Native input structure
        const input = document.createElement('input');
        input.id = 'bpm';
        input.type = 'number';
        input.placeholder = 'Enter BPM';
        input.min = 40;
        input.max = 300;
        input.className = 'block text-left relative w-full appearance-none transition-shadow text bg-transparent rounded-input border-divider border focus:ring focus:ring-primary/focus focus:border-primary/60 focus:outline-none shadow-sm text-sm h-42 pl-12 pr-12';
        input.value = defaultValue;
        input.setAttribute('aria-labelledby', label.id || '');
        
        input.addEventListener('input', e => {
            const bpm = parseInt(e.target.value, 10);
            if (isNaN(bpm) || bpm < 40 || bpm > 300) {
                // Use native error styling
                e.target.style.borderColor = 'rgb(239, 68, 68)';
                e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.05)';
            } else {
                // Reset to native styling
                e.target.style.borderColor = '';
                e.target.style.backgroundColor = '';
            }
            e.target.dispatchEvent(new Event('change', { bubbles: true }));
            if (window.enableSubmitButton) window.enableSubmitButton();
            if (window.updatePendingCustomData) window.updatePendingCustomData();
            if (window.isEditPage && window.isEditPage() && window.debouncedUpdateDashboardContent) {
                setTimeout(() => window.debouncedUpdateDashboardContent(), 100);
            }
        });
        
        isolateContainer.appendChild(input);
        wrapper.appendChild(isolateContainer);
        
        return wrapper;
    }
    
    function createPriceField(labelText, id, placeholder, defaultValue = '') {
        const wrapper = document.createElement('div');
        wrapper.className = 'mb-24 text-sm';
        
        const label = document.createElement('label');
        label.className = 'block first-letter:capitalize text-left whitespace-nowrap text-sm mb-4';
        label.textContent = labelText;
        label.setAttribute('for', id);
        wrapper.appendChild(label);

        const isolateContainer = document.createElement('div');
        isolateContainer.className = 'isolate relative';
        
        const input = document.createElement('input');
        input.id = id;
        input.type = 'number';
        input.min = '0';
        input.step = '0.01';
        input.placeholder = placeholder;
        input.className = 'block text-left relative w-full appearance-none transition-shadow text bg-transparent rounded-input border-divider border focus:ring focus:ring-primary/focus focus:border-primary/60 focus:outline-none shadow-sm text-sm h-42 pl-12 pr-12';
        input.value = defaultValue;
        
        input.addEventListener('input', () => {
            input.dispatchEvent(new Event('change', { bubbles: true }));
            if (window.enableSubmitButton) window.enableSubmitButton();
            if (window.updatePendingCustomData) window.updatePendingCustomData();
            if (window.isEditPage && window.isEditPage() && window.debouncedUpdateDashboardContent) {
                setTimeout(() => window.debouncedUpdateDashboardContent(), 100);
            }
        });

        isolateContainer.appendChild(input);
        wrapper.appendChild(isolateContainer);
        
        return wrapper;
    }
    
    // Helper to map label ↔ value
    function mapLabelToValue(inputEl){
        const map=inputEl?.dataset.valueMap?JSON.parse(inputEl.dataset.valueMap):null;
        if(!map) return inputEl?.value||'';
        const key=Object.keys(map).find(k=>map[k]===inputEl.value);
        return key||inputEl.value;
    }
    
    // ---------------------------
    // Global Exposure
    // ---------------------------
    
    // Expose functions to window object for cross-module access
    window.createDropdownField = createDropdownField;
    window.createBPMField = createBPMField;
    window.createPriceField = createPriceField;
    window.mapLabelToValue = mapLabelToValue;
    
    console.log('✅ Custom Field Creator functions exposed to window object');
    
})();