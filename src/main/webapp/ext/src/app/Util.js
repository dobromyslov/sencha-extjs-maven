Ext.define('Ext.app.Util', {
}, function() {
    Ext.apply(Ext.app, {
        namespaces: {
            Ext: {}
        },
        
        /**
        * @private
        */
        collectNamespaces: function(paths) {
            var namespaces = Ext.app.namespaces,
                path;
            
            for (path in paths) {
                if (paths.hasOwnProperty(path)) {
                    namespaces[path] = true;
                }
            }
        },

        /**
        * Adds namespace(s) to known list.
        * @private
        *
        * @param {String/String[]} namespace
        */
        addNamespaces: function(ns) {
            var namespaces = Ext.app.namespaces,
                i, l;

            if (!Ext.isArray(ns)) {
                ns = [ns];
            }

            for (i = 0, l = ns.length; i < l; i++) {
                namespaces[ns[i]] = true;
            }
        },

        /**
        * @private Clear all namespaces from known list.
        */
        clearNamespaces: function() {
            Ext.app.namespaces = {};
        },

        /**
        * Get namespace prefix for a class name.
        * @private
        *
        * @param {String} className
        *
        * @return {String} Namespace prefix if it's known, otherwise undefined
        */
        getNamespace: function(className) {
            var namespaces    = Ext.app.namespaces,
                deepestPrefix = '',
                prefix;

            for (prefix in namespaces) {
                if (namespaces.hasOwnProperty(prefix)    &&
                    prefix.length > deepestPrefix.length &&
                    (prefix + '.' === className.substring(0, prefix.length + 1))) {
                    deepestPrefix = prefix;
                }
            }

            return deepestPrefix === '' ? undefined : deepestPrefix;
        }
    });
});