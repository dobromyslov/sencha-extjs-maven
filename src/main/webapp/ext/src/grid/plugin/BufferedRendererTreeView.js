/**
 * @private
 * A set of overrides required by the presence of the BufferedRenderer plugin.
 * 
 * These overrides of Ext.tree.View take into account the affect of a buffered renderer and
 * divert execution from the default course where necessary.
 */
Ext.define('Ext.grid.plugin.BufferedRendererTreeView', {
    override: 'Ext.tree.View',

    onRemove: function(store, records, index, isMove, removeRange) {
        var me = this,
            bufferedRenderer = me.bufferedRenderer;

        // If there's a BufferedRenderer...
        if (me.rendered && bufferedRenderer) {
            bufferedRenderer.onReplace(store, index, records, []);
        } else {
            me.callParent([store, records, index]);
        }
    }
});
