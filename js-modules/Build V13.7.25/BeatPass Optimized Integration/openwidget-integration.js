// OpenWidget Integration Module
// Immediately Invoked Function Expression (IIFE) for OpenWidget communication tool

(function() {
    'use strict';
    
    // OpenWidget: communication tool - Enhanced initialization
    // Ensure __ow object is properly initialized to prevent undefined errors
    window.__ow = {
        organizationId: "b3302ecd-2723-4154-95ee-1468ed9f1e4a",
        integration_name: "manual_settings",
        product_name: "openwidget",
        asyncInit: false
    };

    // Additional safety check
    if (typeof window.__ow !== 'object' || window.__ow === null) {
        console.warn('[OpenWidget] Failed to initialize __ow object, creating fallback');
        window.__ow = {
            organizationId: "b3302ecd-2723-4154-95ee-1468ed9f1e4a",
            integration_name: "manual_settings",
            product_name: "openwidget",
            asyncInit: false
        };
    }
    
    // OpenWidget integration function
    (function(n, t, c) {
        function i(n) {
            return e._h ? e._h.apply(null, n) : e._q.push(n);
        }
        var e = {
            _q: [],
            _h: null,
            _v: "2.0",
            on: function() { i(["on", c.call(arguments)]); },
            once: function() { i(["once", c.call(arguments)]); },
            off: function() { i(["off", c.call(arguments)]); },
            get: function() {
                if (!e._h) throw new Error("[OpenWidget] You can't use getters before load.");
                return i(["get", c.call(arguments)]);
            },
            call: function() { i(["call", c.call(arguments)]); },
            init: function() {
                var script = t.createElement("script");
                script.async = true;
                script.type = "text/javascript";
                script.src = "https://cdn.openwidget.com/openwidget.js";
                t.head.appendChild(script);
            }
        };
        !n.__ow.asyncInit && e.init();
        n.OpenWidget = n.OpenWidget || e;
    }(window, document, [].slice));
    
    console.log('[OpenWidget] Integration module loaded successfully');
})();