/*
 * Tristate charts
 */
Ext.define('Ext.sparkline.TriState', {
    extend: 'Ext.sparkline.BarBase',
    requires: [
        'Ext.sparkline.RangeMap'
    ],

    alias: 'widget.sparklinetristate',

    config: {
        barWidth: 4,
        barSpacing: 1,
        posBarColor: '#6f6',
        negBarColor: '#f44',
        zeroBarColor: '#999',
        colorMap: {},
        tipTpl: new Ext.XTemplate('&#9679; {value:this.states}', {
            states: function(v) {
                var value = Number(v);
                if (value === -1) {
                    return 'Loss';
                }
                if (value === 0) {
                    return 'Draw';
                }
                if (value === 1) {
                    return 'Win';
                }
                return v;
            }
        })
    },

    applyColorMap: function(colorMap) {
        var me = this;

        if (Ext.isArray(colorMap)) {
            me.colorMapByIndex = colorMap;
            me.colorMapByValue = null;
        } else {
            me.colorMapByIndex = null;
            me.colorMapByValue = colorMap;
            if (me.colorMapByValue && me.colorMapByValue.get == null) {
                me.colorMapByValue = new Ext.sparkline.RangeMap(colorMap);
            }
        }
        return colorMap;
    },

    // Ensure values is an array of numbers
    applyValues: function(newValues) {
        newValues = Ext.Array.map(Ext.Array.from(newValues), Number);
        this.disabled = !(newValues && newValues.length);
        return newValues;
    },

    onUpdate: function() {
        this.totalBarWidth = this.getBarWidth() + this.getBarSpacing();
    },

    getBarWidth: function() {
        var values = this.values;

        return this._barWidth || (this.getWidth() - (values.length - 1) * this.getBarSpacing()) / values.length;
    },

    getRegion: function (x, y) {
        return Math.floor(x / this.totalBarWidth);
    },

    getRegionFields: function (region) {
        return {
            isNull: this.values[region] == null,
            value: this.values[region],
            color: this.calcColor(this.values[region], region),
            offset: region
        };
    },

    calcColor: function (value, valuenum) {
        var me = this,
            values = me.values,
            colorMapByIndex = me.colorMapByIndex,
            colorMapByValue = me.colorMapByValue,
            color, newColor;

        if (colorMapByValue && (newColor = colorMapByValue.get(value))) {
            color = newColor;
        } else if (colorMapByIndex && colorMapByIndex.length > valuenum) {
            color = colorMapByIndex[valuenum];
        } else if (values[valuenum] < 0) {
            color = me.getNegBarColor();
        } else if (values[valuenum] > 0) {
            color = me.getPosBarColor();
        } else {
            color = me.getZeroBarColor();
        }
        return color;
    },

    renderRegion: function (valuenum, highlight) {
        var me = this,
            values = me.values,
            canvas = me.canvas,
            canvasHeight, height, halfHeight, x, y, color;

        canvasHeight = canvas.pixelHeight;
        halfHeight = Math.round(canvasHeight / 2);

        x = valuenum * me.totalBarWidth;
        if (values[valuenum] < 0) {
            y = halfHeight;
            height = halfHeight - 1;
        } else if (values[valuenum] > 0) {
            y = 0;
            height = halfHeight - 1;
        } else {
            y = halfHeight - 1;
            height = 2;
        }
        color = me.calcColor(values[valuenum], valuenum);
        if (color == null) {
            return;
        }
        if (highlight) {
            color = me.calcHighlightColor(color);
        }
        canvas.drawRect(x, y, me.getBarWidth() - 1, height - 1, color, color).append();
    }
});