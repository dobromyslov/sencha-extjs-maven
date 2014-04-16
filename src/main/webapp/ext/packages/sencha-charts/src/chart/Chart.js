/**
 * @class Ext.chart.Chart
 * @extends Ext.chart.AbstractChart
 * @xtype chart
 *
 * This class has been added to provide API compatibility between ExtJS and Touch, allowing 
 * applications to create a chart without specifying its type (`new Ext.chart.Chart({...})`
 * instead of `new Ext.chart.CartesianChart({...})` or `new Ext.chart.PolarChart({...})`).
 * 
 * It acts as a factory by looking at the first series in the config in order to determine
 * the exact type of chart (Cartesian or Polar) that is returned to the caller. Otherwise,
 * by default it represents a generic type of chart that fills the entire surface of the 
 * Component (e.g. Gauge, Treemap).
 *
 */

Ext.define('Ext.chart.Chart', {
    extend: 'Ext.chart.AbstractChart',
    xtype: 'chart',

    requires: [
        'Ext.chart.CartesianChart',
        'Ext.chart.PolarChart'
    ],

    statics: {
        chartTypes: {
            cartesian: 'cartesian',
            polar: 'polar',
            generic: 'generic',

            all: 'chart, cartesian, polar, generic'    // Can be used as selector in Ext.ComponentQuery.query() 
        }
    },

    config: {
        /**
         * @cfg {String} chartType The type of chart: `cartesian`, `polar`, or 'generic'
         * (see {@link Ext.chart.Chart.chartTypes}). Default is `undefined`.
         * This config needs to be specified only when the application creates a chart
         * without series (or a chart with custom series), otherwise the chart type
         * is determined by looking at the first series in the chart.
         */
        chartType: undefined
    },

    chartTypeFromSeries: function (series) {
        var me = this,
            types = me.self.chartTypes,
            seriesType = series && series.type,
            chartType;
        switch (seriesType) {
            case 'line':
            case 'scatter':
            case 'candlestick':
            case 'area':
            case 'bar':
            case 'column':
                chartType = types.cartesian;
                break;
            case 'pie':
            case 'pie3d':
            case 'radar':
                chartType = types.polar;
                break;
            case 'gauge':
                chartType = types.generic;
                break;
            default:
                Ext.Logger.warn('Unknown type of series.');
                chartType = types.generic;
                break;
        }
        return chartType;
    },

    constructor: function (config) {
        var me = this,
            types = me.self.chartTypes,
            chartType = config.chartType,
            series = config.series,
            len = series && series.length,
            firstSeries = series && series[0];

        // Determine the chart type by looking at the first series
        if (!chartType) {
            if (!firstSeries) {
                Ext.Logger.warn('Ext.chart.Chart requires at least one series.');
                return;
            }
            chartType = me.chartTypeFromSeries(firstSeries);
        }

        //<debug>
        // Make sure all the series match
        for (var i = 0; i < len; i++) {
            if (chartType !== me.chartTypeFromSeries(series[i])) {
                Ext.Logger.warn('The chart\'s type (cartesian, polar, spaceFilling) must match all its series.');
                return;
            }
        }
        //</debug>

        // Return the actual chart
        switch (chartType) {
            case types.cartesian:
                return new Ext.chart.CartesianChart(config);
            case types.polar:
                return new Ext.chart.PolarChart(config);
        }
        me.callParent(arguments);
    },

    performLayout: function () {
        try {
            this.resizing++;
            this.callParent();
            var me = this,
                size = me.element.getSize(),
                series = me.getSeries(), seriesItem,
                padding = me.getInsetPadding(),
                width = size.width - padding.left - padding.right,
                height = size.height - padding.top - padding.bottom,
                rect = [padding.left, padding.top, width, height],
                fullRect = [0, 0, size.width, size.height],
                i, ln;
            me.getSurface().setRect(rect);
            me.setMainRect(rect);
            for (i = 0, ln = series.length; i < ln; i++) {
                seriesItem = series[i];
                seriesItem.getSurface().setRect(rect);
                seriesItem.setRect(rect);

                seriesItem.getOverlaySurface().setRect(fullRect);
            }
            me.redraw();
        } catch (e) { // catch is required in IE8 (try/finally not supported)
            //<debug>
            Ext.log.error(this.$className + ': Unhandled Exception: ', e.description || e.message);
            //</debug>
            throw e;
        }
        finally {
            this.resizing--;
        }
    },

    redraw: function () {
        var me = this,
            series = me.getSeries(), seriesItem,
            i, ln;

        for (i = 0, ln = series.length; i < ln; i++) {
            seriesItem = series[i];
            seriesItem.getSprites();
        }

        me.renderFrame();
        me.callParent(arguments);
    }

});
