Ext.define('Ext.overrides.data.NodeInterface', {
    override: 'Ext.NodeInterface',

    suspendUIChanges: function() {
        Ext.suspendLayouts();
    },

    resumeUIChanges: function() {
        Ext.resumeLayouts();
    }
});