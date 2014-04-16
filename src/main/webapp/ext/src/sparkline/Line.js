/*
 * Line charts
 */
Ext.define('Ext.sparkline.Line', {
    extend: 'Ext.sparkline.Base',
    requires: [
        'Ext.sparkline.RangeMap'
    ],

    alias: 'widget.sparklineline',

    config: {
        spotColor: '#f80',
        highlightSpotColor: '#5f5',
        highlightLineColor: '#f22',
        spotRadius: 1.5,
        minSpotColor: '#f80',
        maxSpotColor: '#f80',
        lineWidth: 1,
        normalRangeMin: null,
        normalRangeMax: null,
        normalRangeColor: '#ccc',
        drawNormalOnTop: false,
        chartRangeMin: null,
        chartRangeMax: null,
        chartRangeMinX: null,
        chartRangeMaxX: null,
        tipTpl: new Ext.XTemplate('&#9679; {prefix}{y}{suffix}'),
        valueSpots: null
    },

    applyValueSpots: function(valueSpots) {
        if (valueSpots && !valueSpots.get) {
            valueSpots = new Ext.sparkline.RangeMap(valueSpots);
        }
        return valueSpots;
    },

    onUpdate: function () {
        this.vertices = [];
        this.regionMap = [];
        this.xvalues = [];
        this.yvalues = [];
        this.yminmax = [];
        this.hightlightSpotId = null;
    },

    getRegion: function(x, y) {
        var i,
            regionMap = this.regionMap; // maps regions to value positions

        for (i = regionMap.length; i--;) {
            if (regionMap[i] !== null && x >= regionMap[i][0] && x <= regionMap[i][1]) {
                return regionMap[i][2];
            }
        }
        return undefined;
    },

    getRegionFields: function(region) {
        return {
            isNull: this.yvalues[region] === null,
            x: this.xvalues[region],
            y: this.yvalues[region],
            color: this.getLineColor(),
            fillColor: this.getFillColor(),
            offset: region
        };
    },

    renderHighlight: function(region) {
        var me = this,
            canvas = me.canvas,
            vertex = me.vertices[region],
            spotRadius = me.getSpotRadius(),
            highlightSpotColor = me.getHighlightSpotColor(),
            highlightLineColor = me.getHighlightLineColor();

        if (!vertex) {
            return;
        }
        if (spotRadius && highlightSpotColor) {
            canvas.drawCircle(vertex[0], vertex[1], spotRadius, null, highlightSpotColor).append();
        }
        if (highlightLineColor) {
            canvas.drawLine(vertex[0], me.canvasTop, vertex[0], me.canvasTop + me.getHeight(), highlightLineColor).append();
        }
    },

    scanValues: function () {
        var me = this,
            values = me.values,
            valcount = values.length,
            xvalues = me.xvalues,
            yvalues = me.yvalues,
            yminmax = me.yminmax,
            i, val, isStr, isArray, sp;

        for (i = 0; i < valcount; i++) {
            val = values[i];
            isStr = typeof(values[i]) === 'string';
            isArray = typeof(values[i]) === 'object' && values[i] instanceof Array;
            sp = isStr && values[i].split(':');

            if (isStr && sp.length === 2) { // x:y
                xvalues.push(Number(sp[0]));
                yvalues.push(Number(sp[1]));
                yminmax.push(Number(sp[1]));
            } else if (isArray) {
                xvalues.push(val[0]);
                yvalues.push(val[1]);
                yminmax.push(val[1]);
            } else {
                xvalues.push(i);
                if (values[i] === null || values[i] === 'null') {
                    yvalues.push(null);
                } else {
                    yvalues.push(Number(val));
                    yminmax.push(Number(val));
                }
            }
        }
        if (me.xvalues) {
            xvalues = me.xvalues;
        }

        me.maxy = me.maxyorg = Math.max.apply(Math, yminmax);
        me.miny = me.minyorg = Math.min.apply(Math, yminmax);

        me.maxx = Math.max.apply(Math, xvalues);
        me.minx = Math.min.apply(Math, xvalues);

        me.xvalues = xvalues;
        me.yvalues = yvalues;
        me.yminmax = yminmax;
    },

    processRangeOptions: function () {
        var me = this,
            normalRangeMin = me.getNormalRangeMin(),
            normalRangeMax = me.getNormalRangeMax(),
            chartRangeMin = me.getChartRangeMin(),
            chartRangeMinX = me.getChartRangeMinX(),
            chartRangeMax = me.getChartRangeMax(),
            chartRangeMaxX = me.getChartRangeMaxX();

        if (normalRangeMin != null) {
            if (normalRangeMin < me.miny) {
                me.miny = normalRangeMin;
            }
            if (normalRangeMax > me.maxy) {
                me.maxy = normalRangeMax;
            }
        }
        if (chartRangeMin != null && (me.chartRangeClip || chartRangeMin < me.miny)) {
            me.miny = chartRangeMin;
        }
        if (chartRangeMax != null && (me.chartRangeClip || chartRangeMax > me.maxy)) {
            this.maxy = chartRangeMax;
        }
        if (chartRangeMinX != null && (me.chartRangeClipX || chartRangeMinX < me.minx)) {
            me.minx = chartRangeMinX;
        }
        if (chartRangeMaxX != null && (me.chartRangeClipX || chartRangeMaxX > me.maxx)) {
            me.maxx = chartRangeMaxX;
        }

    },

    drawNormalRange: function (canvasLeft, canvasTop, canvasHeight, canvasWidth, rangey) {
        var normalRangeMin = this.getNormalRangeMin(),
            normalRangeMax = this.getNormalRangeMax(),
            ytop = canvasTop + Math.round(canvasHeight - (canvasHeight * ((normalRangeMax - this.miny) / rangey))),
            height = Math.round((canvasHeight * (normalRangeMax - normalRangeMin)) / rangey);
        this.canvas.drawRect(canvasLeft, ytop, canvasWidth, height, undefined, this.normalRangeColor).append();
    },

    renderGraph: function () {
        var me = this,
            canvas = me.canvas,
            canvasWidth = me.getWidth(),
            canvasHeight = me.getHeight(),
            vertices = me.vertices,
            spotRadius = me.getSpotRadius(),
            regionMap = me.regionMap,
            rangeX, Y, yvallast,
            canvasTop, canvasLeft,
            vertex, path, paths, x, y, xNext, xPos, xPosNext,
            last, next, yValCount, lineShapes, fillShapes, plen,
            valueSpots = me.getValueSpots(), hlSpotsEnabled, color, xValues, yValues, i,
            spotColor = me.getSpotColor(),
            minSpotColor = me.getMinSpotColor(),
            maxSpotColor = me.getMaxSpotColor(),
            normalRangeMin = me.getNormalRangeMin(),
            drawNormalOnTop = me.getDrawNormalOnTop();

        if (!me.callParent()) {
            return;
        }

        me.scanValues();
        me.processRangeOptions();

        xValues = me.xvalues;
        yValues = me.yvalues;

        if (!me.yminmax.length || me.yvalues.length < 2) {
            // empty or all null valuess
            return;
        }

        canvasTop = canvasLeft = 0;

        rangeX = me.maxx - me.minx === 0 ? 1 : me.maxx - me.minx;
        Y = me.maxy - me.miny === 0 ? 1 : me.maxy - me.miny;
        yvallast = me.yvalues.length - 1;

        if (spotRadius && (canvasWidth < (spotRadius * 4) || canvasHeight < (spotRadius * 4))) {
            spotRadius = 0;
        }
        if (spotRadius) {
            // adjust the canvas size as required so that spots will fit
            hlSpotsEnabled = me.getHighlightSpotColor() &&  !me.disableInteraction;
            if (hlSpotsEnabled || minSpotColor || (spotColor && yValues[yvallast] === me.miny)) {
                canvasHeight -= Math.ceil(spotRadius);
            }
            if (hlSpotsEnabled || maxSpotColor || (spotColor && yValues[yvallast] === me.maxy)) {
                canvasHeight -= Math.ceil(spotRadius);
                canvasTop += Math.ceil(spotRadius);
            }
            if (hlSpotsEnabled ||
                    ((minSpotColor || maxSpotColor) && (yValues[0] === me.miny || yValues[0] === me.maxy))) {
                canvasLeft += Math.ceil(spotRadius);
                canvasWidth -= Math.ceil(spotRadius);
            }
            if (hlSpotsEnabled || spotColor ||
                (minSpotColor || maxSpotColor &&
                    (yValues[yvallast] === me.miny || yValues[yvallast] === me.maxy))) {
                canvasWidth -= Math.ceil(spotRadius);
            }
        }

        canvasHeight--;

        if (normalRangeMin != null && !drawNormalOnTop) {
            me.drawNormalRange(canvasLeft, canvasTop, canvasHeight, canvasWidth, Y);
        }

        path = [];
        paths = [path];
        last = next = null;
        yValCount = yValues.length;
        for (i = 0; i < yValCount; i++) {
            x = xValues[i];
            xNext = xValues[i + 1];
            y = yValues[i];
            xPos = canvasLeft + Math.round((x - me.minx) * (canvasWidth / rangeX));
            xPosNext = i < yValCount - 1 ? canvasLeft + Math.round((xNext - me.minx) * (canvasWidth / rangeX)) : canvasWidth;
            next = xPos + ((xPosNext - xPos) / 2);
            regionMap[i] = [last || 0, next, i];
            last = next;
            if (y === null) {
                if (i) {
                    if (yValues[i - 1] !== null) {
                        path = [];
                        paths.push(path);
                    }
                    vertices.push(null);
                }
            } else {
                if (y < me.miny) {
                    y = me.miny;
                }
                if (y > me.maxy) {
                    y = me.maxy;
                }
                if (!path.length) {
                    // previous value was null
                    path.push([xPos, canvasTop + canvasHeight]);
                }
                vertex = [xPos, canvasTop + Math.round(canvasHeight - (canvasHeight * ((y - this.miny) / Y)))];
                path.push(vertex);
                vertices.push(vertex);
            }
        }

        lineShapes = [];
        fillShapes = [];
        plen = paths.length;
        for (i = 0; i < plen; i++) {
            path = paths[i];
            if (path.length) {
                if (me.fillColor) {
                    path.push([path[path.length - 1][0], (canvasTop + canvasHeight)]);
                    fillShapes.push(path.slice(0));
                    path.pop();
                }
                // if there's only a single point in this path, then we want to display it
                // as a vertical line which means we keep path[0]  as is
                if (path.length > 2) {
                    // else we want the first value
                    path[0] = [path[0][0], path[1][1]];
                }
                lineShapes.push(path);
            }
        }

        // draw the fill first, then optionally the normal range, then the line on top of that
        plen = fillShapes.length;
        for (i = 0; i < plen; i++) {
            canvas.drawShape(fillShapes[i],
                me.fillColor, me.fillColor).append();
        }

        if (normalRangeMin != null && drawNormalOnTop) {
            me.drawNormalRange(canvasLeft, canvasTop, canvasHeight, canvasWidth, Y);
        }

        plen = lineShapes.length;
        for (i = 0; i < plen; i++) {
            canvas.drawShape(lineShapes[i], me.getLineColor(), null, me.getLineWidth()).append();
        }

        if (spotRadius && valueSpots) {
            if (valueSpots.get == null) {
                valueSpots = new Ext.sparkline.RangeMap(valueSpots);
            }
            for (i = 0; i < yValCount; i++) {
                color = valueSpots.get(yValues[i]);
                if (color) {
                    canvas.drawCircle(canvasLeft + Math.round((xValues[i] - me.minx) * (canvasWidth / rangeX)),
                        canvasTop + Math.round(canvasHeight - (canvasHeight * ((yValues[i] - me.miny) / Y))),
                        spotRadius, null,
                        color).append();
                }
            }

        }
        if (spotRadius && spotColor && yValues[yvallast] != null) {
            canvas.drawCircle(canvasLeft + Math.round((xValues[xValues.length - 1] - me.minx) * (canvasWidth / rangeX)),
                canvasTop + Math.round(canvasHeight - (canvasHeight * ((yValues[yvallast] - me.miny) / Y))),
                spotRadius, null,
                spotColor).append();
        }
        if (me.maxy !== me.minyorg) {
            if (spotRadius && minSpotColor) {
                x = xValues[Ext.Array.indexOf(yValues, me.minyorg)];
                canvas.drawCircle(canvasLeft + Math.round((x - me.minx) * (canvasWidth / rangeX)),
                    canvasTop + Math.round(canvasHeight - (canvasHeight * ((me.minyorg - me.miny) / Y))),
                    spotRadius, null,
                    minSpotColor).append();
            }
            if (spotRadius && maxSpotColor) {
                x = xValues[Ext.Array.indexOf(yValues, me.maxyorg)];
                canvas.drawCircle(canvasLeft + Math.round((x - me.minx) * (canvasWidth / rangeX)),
                    canvasTop + Math.round(canvasHeight - (canvasHeight * ((me.maxyorg - me.miny) / Y))),
                    spotRadius, null,
                    maxSpotColor).append();
            }
        }

        me.canvasTop = canvasTop;

        // If mouse is over, apply the highlight
        if (me.currentPageXY && me.el.getRegion().contains(me.currentPageXY)) {
            me.updateDisplay();
        }
        canvas.render();
    }
});