/**
 * @class Ext.Config
 * This class manages a config property.
 * @private
 */
Ext.Config = function (name) {
// @define Ext.class.Config
// @define Ext.Config

    var me = this,
        capitalizedName = name.charAt(0).toUpperCase() + name.substr(1);

    me.name = name;
    me.names = {
        internal: '_' + name,
        initializing: 'is' + capitalizedName + 'Initializing',
        apply: 'apply' + capitalizedName,
        update: 'update' + capitalizedName,
        set: 'set' + capitalizedName,
        get: 'get' + capitalizedName,
        initGet: 'initGet' + capitalizedName,
        doSet : 'doSet' + capitalizedName,
        changeEvent: name.toLowerCase() + 'change'
    };
};

Ext.Config.map = {};

Ext.Config.get = function (name) {
    var map = Ext.Config.map,
        ret = map[name] || (map[name] = new Ext.Config(name));

    return ret;
};

Ext.Config.prototype = {
    self: Ext.Config,

    isConfig: true,

    getGetter: function () {
        return this.getter || (this.getter = this.makeGetter());
    },
    
    getInitGetter: function () {
        return this.initGetter || (this.initGetter = this.makeInitGetter());
    },

    getSetter: function () {
        return this.setter || (this.setter = this.makeSetter());
    },
    
    getInternalName: function(proto) {
        return proto.$configPrefixed ? this.names.internal : this.name;
    },

    //--------------------------------------------------
    // Factories

    makeGetter: function(proto) {
        var name = this.name,
            prefixedName = this.names.internal;

        return function() {
            var internalName = this.$configPrefixed ? prefixedName : name;
            return this[internalName];
        };
    },

    makeInitGetter: function () {
        var name = this.name,
            names = this.names,
            setName = names.set,
            getName = names.get,
            initializingName = names.initializing;

        return function() {
            var me = this;

            me[initializingName] = true;
            // Remove the initGetter from the instance now that the value has been set.
            delete me[getName];

            me[setName](me.config[name]);
            delete me[initializingName];

            return me[getName].apply(me, arguments);
        };
    },

    makeSetter: function (proto) {
        var name = this.name,
            names = this.names,
            prefixedName = names.internal,
            getName = names.get,
            applyName = names.apply,
            updateName = names.update,
            setter;

        setter = function(value) {
            var me = this,
                internalName = me.$configPrefixed ? prefixedName : name,
                oldValue = me[internalName],
                applier = me[applyName],
                updater = me[updateName];

            // Remove the initGetter from the instance now that the value has been set.
            delete me[getName];

            if (!applier || (value = applier.call(me, value, oldValue)) !== undefined) {
                // The old value might have been changed at this point
                // (after the apply call chain) so it should be read again
                if (value !== (oldValue = me[internalName])) {
                    me[internalName] = value;

                    if (updater) {
                        updater.call(me, value, oldValue);
                    }
                }
            }

            return me;
        };

        setter.$isDefault = true;

        return setter;
    }
};
