/**
 * @class Ext.chart.interactions.ItemHighlight
 * @extends Ext.chart.interactions.Abstract
 *
 * The ItemHighlight interaction allows the user to highlight series items in the chart.
 */
Ext.define('Ext.chart.interactions.ItemHighlight', {

    extend: 'Ext.chart.interactions.Abstract',

    type: 'itemhighlight',
    alias: 'interaction.itemhighlight',

    config: {
        //@inheritdoc
        gestures: {
            tap: 'onHighlightGesture',
            mousemove: 'onMouseMoveGesture'
        }
        // TODO:ps The triggers above should be 'itemclick' and 'itemtap', not 'click' and 'tap'.
    },

    highlightItem: null,

    onMouseMoveGesture: function (e) {
        var me = this;
        if (!me.getLocks().drag && !me.highlightItem) {
            // An item can be highlighted on mousemove if no other item is highlighted
            // and no other interaction is responding to the drag/mousemove event.
            me.getChart().setHighlightItem(me.getItemForEvent(e));
            me.sync();
            return false;
        }
    },

    onHighlightGesture: function (e) {
        // A click/tap on an item makes its highlight sticky. It requires another click/tap to unhighlight.
        var me = this,
            item = me.getItemForEvent(e);
        if (me.highlightItem && item && (me.highlightItem.index === item.index)) {
            item = null;
        }
        me.highlightItem = item;
        me.getChart().setHighlightItem(item);
    }
});
