/**
 * This class manages columns in a `Dashboard`. The primary role here is the `defaultType`
 * config which points to `Ext.dashboard.Panel` and the self-destruct mechanism to get
 * rid of empty columns.
 * @protected
 */
Ext.define('Ext.dashboard.Column', {
    extend: 'Ext.container.Container',
    xtype: 'dashboard-column',

    requires: [
        'Ext.layout.container.Anchor',
        'Ext.dashboard.Panel'
    ],

    layout: 'anchor',

    isDashboardColumn : true,

    defaultType: 'dashboard-panel',

    cls: Ext.baseCSSPrefix + 'dashboard-column',

    synthetic: true, // not user-defined

    onRemove: function () {
        var me = this,
            ownerCt = me.ownerCt;

        if (ownerCt && !me.destroyed && me.items.getCount() === 0) {
            ownerCt.remove(me);
        }
    }
});
