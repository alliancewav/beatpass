// Webpushr Integration Module
// ============================================================

(function() {
    'use strict';
    
    // Enhanced script loader with caching and error handling
    function loadScript(src, { async = false, defer = false, cache = true } = {}) {
        // Simple implementation for this module
        return new Promise((resolve, reject) => {
            // Check if script already exists
            const existingScript = document.querySelector(`script[src="${src}"]`);
            if (existingScript) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = src;
            if (async) script.async = true;
            if (defer) script.defer = true;
            
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
            
            document.head.appendChild(script);
        });
    }
    
    // Webpushr for push notifications
    loadScript('https://cdn.webpushr.com/sw-server.min.js', { async: true });
    
    (function(w, d, s, id) {
        if (typeof(w.webpushr) !== 'undefined') return;
        w.webpushr = w.webpushr || function() {
            (w.webpushr.q = w.webpushr.q || []).push(arguments);
        };
        var js,
            fjs = d.getElementsByTagName(s)[0];
        js = d.createElement(s);
        js.id = id;
        js.async = 1;
        js.src = "https://cdn.webpushr.com/app.min.js";
        fjs.parentNode.appendChild(js);
    }(window, document, 'script', 'webpushr-jssdk'));
    
    // Setup webpushr only after it's loaded
    if (typeof webpushr === 'function') {
        webpushr('setup', {
            'key': 'BD9-HZVHJNOvIguBIG12bVGG7HBER_j11kXu84ymCs9CUXla9KdJxXLOzq_c2uv9YfqYdE6NP9_-GWxQ_U8qFY4'
        });
    } else {
        // Wait for webpushr to load
        const checkWebpushr = setInterval(() => {
            if (typeof webpushr === 'function') {
                clearInterval(checkWebpushr);
                webpushr('setup', {
                    'key': 'BD9-HZVHJNOvIguBIG12bVGG7HBER_j11kXu84ymCs9CUXla9KdJxXLOzq_c2uv9YfqYdE6NP9_-GWxQ_U8qFY4'
                });
            }
        }, 100);
        
        // Clear interval after 10 seconds to prevent infinite checking
        setTimeout(() => {
            clearInterval(checkWebpushr);
        }, 10000);
    }
    
})();