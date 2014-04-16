Ext.define('Ext.rtl.button.Button', {
    override: 'Ext.button.Button',

    getBtnWrapFrameWidth: function(side) {
        if (this.getInherited().rtl && side === 'r') {
            side = 'l';
        }
        return this.callParent(arguments);
    },

    getTriggerRegion: function() {
        var me = this,
            region = me._triggerRegion;

        if (!Ext.rootInheritedState.rtl !== !this.getInherited().rtl
            && me.arrowAlign === 'right') {
            region.begin = 0;
            region.end = me.getTriggerSize();
        } else {
            region = me.callParent();
        }

        return region;
    }
});
