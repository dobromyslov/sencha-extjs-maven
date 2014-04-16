/**
 * @class Ext.chart.Tip
 * Mixin that provides tips for Ext.chart.series.Series.
 */
Ext.define('Ext.chart.Tip', {

    /* Begin Definitions */

    requires: ['Ext.tip.ToolTip', 'Ext.chart.TipSurface'],

    /* End Definitions */

    /**
     * @cfg {Object} tips
     * Add tooltips to the visualization's markers. The options for the tips are the
     * same configuration used with {@link Ext.tip.ToolTip}. For example:
     *
     *     tips: {
     *       trackMouse: true,
     *       width: 140,
     *       height: 28,
     *       renderer: function(storeItem, item) {
     *         this.setTitle(storeItem.get('name') + ': ' + storeItem.get('data1') + ' views');
     *       }
     *     },
     */

    constructor: function(config) {
        var me = this,
            chart, surface, sprites;
        if (config.tips) {
            chart = me.getChart() || config.chart;
            surface = chart.getSurface();
            me.tipTimeout = null;
            me.tipConfig = Ext.apply({}, config.tips, {
                renderer: Ext.emptyFn,
                constrainPosition: true,
                autoHide: true
            });
            me.tooltip = new Ext.tip.ToolTip(me.tipConfig);

            // Do not use setTarget(), it installs event handlers for ExtJS Components.
            // In Charts, the tooltips have their own event handlers in ItemInfo.
            me.tooltip.target = chart.el;
        }
    },

    showTip: function(item) {
        var me = this,
            tooltip,
            spriteTip,
            tipConfig,
            trackMouse,
            sprite,
            surface,
            surfaceExt,
            pos,
            x,
            y;
        if (!me.tooltip) {
            return;
        }
        clearTimeout(me.tipTimeout);
        tooltip = me.tooltip;
        spriteTip = me.spriteTip;
        tipConfig = me.tipConfig;
        trackMouse = tooltip.trackMouse;
        if (!trackMouse) {
            tooltip.trackMouse = true;
            sprite = item.sprite;
            surface = sprite.getParent();
            surfaceExt = Ext.get(surface.getId());
            if (surfaceExt) {
                pos = surfaceExt.getXY();
                x = pos[0] + (sprite.attr.x || 0) + (sprite.attr.translation && sprite.attr.translation.x || 0);
                y = pos[1] + (sprite.attr.y || 0) + (sprite.attr.translation && sprite.attr.translation.y || 0);
                tooltip.targetXY = [x, y];
            }
        }
        if (spriteTip) {
            tipConfig.renderer.call(tooltip, item.record, item, spriteTip.surface);
        } else {
            tipConfig.renderer.call(tooltip, item.record, item);
        }
        tooltip.show();
        tooltip.trackMouse = trackMouse;
    },

    hideTip: function(item) {
        var tooltip = this.tooltip;
        if (!tooltip) {
            return;
        }
        clearTimeout(this.tipTimeout);
        this.tipTimeout = setTimeout(function() {
            tooltip.hide();
        }, 0);
    }
});