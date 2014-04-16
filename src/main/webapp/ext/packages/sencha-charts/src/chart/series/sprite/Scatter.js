/**
 * @class Ext.chart.series.sprite.Scatter
 * @extends Ext.chart.series.sprite.Cartesian
 * 
 * Scatter series sprite.
 */
Ext.define("Ext.chart.series.sprite.Scatter", {
    alias: 'sprite.scatterSeries',
    extend: 'Ext.chart.series.sprite.Cartesian',
    renderClipped: function (surface, ctx, clip, clipRect) {
        if (this.cleanRedraw) {
            return;
        }
        var attr = this.attr,
            dataX = attr.dataX,
            dataY = attr.dataY,
            matrix = this.attr.matrix,
            xx = matrix.getXX(),
            yy = matrix.getYY(),
            dx = matrix.getDX(),
            dy = matrix.getDY(),
            markerCfg = {}, changes,
            left = clipRect[0] - xx,
            right = clipRect[0] + clipRect[2] + xx,
            top = clipRect[1] - yy,
            bottom = clipRect[1] + clipRect[3] + yy,
            x, y;
        for (var i = 0; i < dataX.length; i++) {
            x = dataX[i];
            y = dataY[i];
            x = x * xx + dx;
            y = y * yy + dy;
            if (left <= x && x <= right && top <= y && y <= bottom) {
                if (attr.renderer) {
                    markerCfg = {
                        type: 'items',
                        translationX: x,
                        translationY: y
                    };
                    changes = attr.renderer.call(this, this, markerCfg, {store:this.getStore()}, i);
                    markerCfg = Ext.apply(markerCfg, changes);
                } else {
                    markerCfg.translationX = x;
                    markerCfg.translationY = y;
                }
                this.putMarker("items", markerCfg, i, !attr.renderer);
            }
        }
    }
});
