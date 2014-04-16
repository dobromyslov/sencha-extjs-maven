/**
 * @private
 * A set of overrides required by the presence of the BufferedRenderer plugin.
 * 
 * These overrides of Ext.view.Table take into account the affect of a buffered renderer and
 * divert execution from the default course where necessary.
 */
Ext.define('Ext.grid.plugin.BufferedRendererTableView', {
    override: 'Ext.view.Table',

    onUpdate : function(store, record, operation, modifiedFieldNames) {
        var me = this;

        // If we are buffer rendered, and using throttled update and the record is not in view, we do not have to queue the change.
        // The row will be rendered correctly directly from the record when it is scrolled into view.
        if (me.rendered && me.throttledUpdate && me.bufferedRenderer && !me.getNode(record)) {
            return;
        }
        me.callParent(arguments);
    },

    onReplace: function(store, startIndex, oldRecords, newRecords) {
        var me = this,
            bufferedRenderer = me.bufferedRenderer;

        // If there's a buffered renderer and the removal range falls inside the current view...
        if (me.rendered && bufferedRenderer) {
            bufferedRenderer.onReplace(store, startIndex, oldRecords, newRecords);
        } else {
            me.callParent(arguments);
        }
    },

    // Listener function for the Store's add event
    onAdd: function(store, records, index) {
        var me = this,
            bufferedRenderer = me.bufferedRenderer;

        if (me.rendered && bufferedRenderer) {
             bufferedRenderer.onReplace(store, index, [], records);
        }
        // No BufferedRenderer present
        else {
            me.callParent([store, records, index]);
        }
    },

    onRemove: function(store, records, index, isMove, removeRange) {
        var me = this,
            bufferedRenderer = me.bufferedRenderer;

        // If there's a BufferedRenderer...
        if (me.rendered && bufferedRenderer) {
            bufferedRenderer.onReplace(store, index, records, []);
        } else {
            me.callParent([store, records, index]);
        }
    },

    // When there's a buffered renderer present, store refresh events cause TableViews to go to scrollTop:0
    onDataRefresh: function() {
        var me = this;

        if (me.bufferedRenderer) {
            // Clear NodeCache. Do NOT remove nodes from DOM - that would blur the view, and then refresh will not refocus after the refresh.
            me.all.clear();
            me.bufferedRenderer.onStoreClear();
        }
        me.callParent();
    },

    refreshScroll: function() {
        var me = this,
            bufferedRenderer = me.bufferedRenderer;

        // If there is a BufferedRenderer, we must refresh the scroller using BufferedRenderer methods
        // which take account of the full virtual scroll range.
        if (bufferedRenderer && me.touchScroll) {
            bufferedRenderer.stretchView(me, bufferedRenderer.scrollHeight);
        } else {
            me.callParent();
        }
    },

    getViewRange: function() {
        var me = this;

        if (me.bufferedRenderer) {
            return me.bufferedRenderer.getViewRange();
        }
        return me.callParent();
    }
});
