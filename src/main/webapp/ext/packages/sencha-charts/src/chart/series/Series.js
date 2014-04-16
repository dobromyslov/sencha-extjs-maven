/**
 * Series is the abstract class containing the common logic to all chart series. Series includes
 * methods from Labels, Highlights, and Callouts mixins. This class implements the logic of
 * animating, hiding, showing all elements and returning the color of the series to be used as a legend item.
 *
 * ## Listeners
 *
 * The series class supports listeners via the Observable syntax. Some of these listeners are:
 *
 *  - `itemmouseup` When the user interacts with a marker.
 *  - `itemmousedown` When the user interacts with a marker.
 *  - `itemmousemove` When the user interacts with a marker.
 *  - (similar `item*` events occur for many raw mouse and touch events)
 *  - `afterrender` Will be triggered when the animation ends or when the series has been rendered completely.
 *
 * For example:
 *
 *     series: [{
 *         type: 'bar',
 *         axis: 'left',
 *         listeners: {
 *             'afterrender': function() {
 *                 console('afterrender');
 *             }
 *         },
 *         xField: 'category',
 *         yField: 'data1'
 *     }]
 *
 */
Ext.define('Ext.chart.series.Series', {

    requires: ['Ext.chart.Markers', 'Ext.chart.label.Label'],

    mixins: {
        tips: 'Ext.chart.Tip',
        observable: 'Ext.mixin.Observable'
    },

    /**
     * @property {String} type
     * The type of series. Set in subclasses.
     * @protected
     */
    type: null,

    /**
     * @property {String} seriesType
     * Default series sprite type.
     */
    seriesType: 'sprite',

    /**
     * @property {String} chartType
     * The type of chart this series belongs to: cartesian, polar or generic. 
     * Set in subclasses and defined in {@link Ext.chart.Chart.chartTypes}.
     */
    chartType: null,

    identifiablePrefix: 'ext-line-',

    observableType: 'series',

    darkerStrokeRatio: 0.15,

    /**
     * @event chartattached
     * Fires when the {@link Ext.chart.AbstractChart} has been attached to this series.
     * @param {Ext.chart.AbstractChart} chart
     * @param {Ext.chart.series.Series} series
     */
    /**
     * @event chartdetached
     * Fires when the {@link Ext.chart.AbstractChart} has been detached from this series.
     * @param {Ext.chart.AbstractChart} chart
     * @param {Ext.chart.series.Series} series
     */

    config: {
        /**
         * @private
         * @cfg {Object} chart The chart that the series is bound.
         */
        chart: null,

        /**
         * @cfg {String|String[]} title
         * The human-readable name of the series (displayed in the legend).
         */
        title: null,

        /**
         * @cfg {Function} renderer
         * A function that can be provided to set custom styling properties to each rendered element.
         * It receives `(sprite, config, rendererData, index)` as parameters.
         *
         * @param {Object} sprite The sprite affected by the renderer. The visual attributes are in `sprite.attr`.
         * The data field is available in `sprite.getField()`.
         * @param {Object} config The sprite configuration. It varies with the series and the type of sprite:
         * for instance, a Line chart sprite might have just the `x` and `y` properties while a Bar
         * chart sprite also has `width` and `height`. A `type` might be present too. For instance to
         * draw each marker and each segment of a Line chart, the renderer is called with the
         * `config.type` set to either `marker` or `line`.
         * @param {Object} rendererData A record with different properties depending on the type of chart.
         * The only guaranteed property is `rendererData.store`, the store used by the series.
         * In some cases, a store may not exist: for instance a Gauge chart may read its value directly
         * from its configuration; in this case rendererData.store is null and the value is
         * available in rendererData.value.
         * @param {Number} index The index of the sprite. It is usually the index of the store record associated
         * with the sprite, in which case the record can be obtained with `store.getData().items[index]`.
         * If the chart is not associated with a store, the index represents the index of the sprite within
         * the series. For instance a Gauge chart may have as many sprites as there are sectors in the
         * background of the gauge, plus one for the needle.
         *
         * @return {Object} The attributes that have been changed or added. Note: it is usually possible to
         * add or modify the attributes directly into the `config` parameter and not return anything,
         * but returning an object with only those attributes that have been changed may allow for
         * optimizations in the rendering of some series. Example to draw every other marker in red:
         *
         *      renderer: function (sprite, config, rendererData, index) {
         *          if (config.type === 'marker') {
         *              return { strokeStyle: (index % 2 === 0 ? 'red' : 'black') };
         *          }
         *      }
         */
        renderer: null,

        /**
         * @cfg {Boolean} showInLegend
         * Whether to show this series in the legend.
         */
        showInLegend: true,

        //@private triggerdrawlistener flag
        triggerAfterDraw: false,

        /**
         * @cfg {Object} style Custom style configuration for the sprite used in the series.
         * It overrides the style that is provided by the current theme.
         */
        style: {},

        /**
         * @cfg {Object} subStyle This is the cyclic used if the series has multiple sprites.
         */
        subStyle: {},

        /**
         * @private
         * @cfg {Object} themeStyle Style configuration that is provided by the current theme.
         * It is composed of five objects:
         * @cfg {Object} themeStyle.style Properties common to all the series, for instance the 'stroke-width'.
         * @cfg {Object} themeStyle.subStyle Cyclic used if the series has multiple sprites.
         * @cfg {Object} themeStyle.label Sprite config for the labels, for instance the font and color.
         * @cfg {Object} themeStyle.marker Sprite config for the markers, for instance the size and stroke color.
         * @cfg {Object} themeStyle.markerSubStyle Cyclic used if series have multiple marker sprites.
         */
        themeStyle: {},

        /**
         * @cfg {Array} colors
         * An array of color values which is used, in order of appearance, by the series. Each series
         * can request one or more colors from the array. Radar, Scatter or Line charts require just 
         * one color each. Candlestick and OHLC require two (1 for drops + 1 for rises). Pie charts  
         * and Stacked charts (like Column or Pie charts) require one color for each data category 
         * they represent, so one color for each slice of a Pie chart or each segment of a Column chart.
         * It overrides the colors that are provided by the current theme.
         */
        colors: null,

        /**
         * @cfg {Boolean|Number} useDarkerStrokeColor
         * Colors for the series can be set directly through the 'colors' config, or indirectly
         * with the current theme or the 'colors' config that is set onto the chart. These colors
         * are used as "fill color". Set this config to true, if you want a darker color for the
         * strokes. Set it to false if you want to use the same color as the fill color.
         * Alternatively, you can set it to a number between 0 and 1 to control how much darker
         * the strokes should be.
         */
        useDarkerStrokeColor: true,

        /**
         * @protected
         * @cfg {Object} store The store of values used in the series.
         */
        store: null,

        /**
         * @cfg {Object} label
         * Object with the following properties:
         *
         * @cfg {String} label.display
         *
         * Specifies the presence and position of the labels. The possible values depend on the chart type.
         * For Line charts: 'under' | 'over' | 'rotate'.
         * For Bar charts: 'insideStart' | 'insideEnd' | 'outside'.
         * For Pie charts: 'outside' | 'rotate'.
         * For all charts: 'none' hides the labels.
         *
         * Default value: 'none'.
         *
         * @cfg {String} label.color
         *
         * The color of the label text.
         *
         * Default value: '#000' (black).
         *
         * @cfg {String|String[]} label.field
         *
         * The name(s) of the field(s) to be displayed in the labels. If your chart has 3 series
         * that correspond to the fields 'a', 'b', and 'c' of your model and you only want to
         * display labels for the series 'c', you must still provide an array `[null, null, 'c']`.
         *
         * Default value: null.
         *
         * @cfg {String} label.font
         *
         * The font used for the labels.
         *
         * Default value: '14px Helvetica'.
         *
         * @cfg {String} label.orientation
         *
         * Either 'horizontal' or 'vertical'. If not set (default), the orientation is inferred
         * from the value of the flipXY property of the series.
         *
         * Default value: ''.
         *
         * @cfg {Function} label.renderer
         *
         * Optional function for formatting the label into a displayable value.
         *
         * The arguments to the method are:
         *
         *   - *`text`*, *`sprite`*, *`config`*, *`rendererData`*, *`index`*
         *
         *     Label's renderer is passed the same arguments as {@link #renderer}
         *     plus one extra 'text' argument which comes first.
         *
         * @return {Object|String} The attributes that have been changed or added, or the text for the label.
         * Example to enclose every other label in parentheses:
         *
         *      renderer: function (text) {
         *          if (index % 2 == 0) {
         *              return '(' + text + ')'
         *          }
         *      }
         *
         * Default value: null.
         */
        label: {textBaseline: 'middle', textAlign: 'center', font: '14px Helvetica'},

        /**
         * @cfg {Number} labelOverflowPadding
         * Extra distance value for which the labelOverflow listener is triggered.
         */
        labelOverflowPadding: 5,

        /**
         * @cfg {String|String[]} labelField
         * @deprecated Use 'field' property of {@link Ext.chart.series.Series#label} instead.
         * The store record field name to be used for the series labels.
         */
        labelField: null,

        /**
         * @cfg {Boolean} showMarkers
         * Whether markers should be displayed at the data points along the line. If true,
         * then the {@link #marker} config item will determine the markers' styling.
         */
        showMarkers: true,

        /**
         * @cfg {Object} marker
         * The sprite template used by marker instances on the series.
         */
        marker: null,

        /**
         * @cfg {Object} markerConfig
         * @deprecated Use {@link #marker} instead
         */
        markerConfig: null,

        /**
         * @cfg {Object} markerSubStyle
         * This is cyclic used if series have multiple marker sprites.
         */
        markerSubStyle: null,

        /**
         * @protected
         * @cfg {Object} itemInstancing The sprite template used to create sprite instances in the series.
         */
        itemInstancing: null,

        /**
         * @cfg {Object} background Sets the background of the surface the series is attached.
         */
        background: null,

        /**
         * @cfg {Object} highlightItem The item currently highlighted in the series.
         */
        highlightItem: null,

        /**
         * @protected
         * @cfg {Object} surface The surface that the series is attached.
         */
        surface: null,

        /**
         * @protected
         * @cfg {Object} overlaySurface The surface that series markers are attached.
         */
        overlaySurface: null,

        /**
         * @cfg {Boolean|Array} hidden
         */
        hidden: false,

        /**
         * @cfg {Object} highlightCfg The sprite configuration used when highlighting items in the series.
         */
        highlightCfg: null,

        /**
         * @cfg {Object} animation The series animation configuration.
         */
        animation: null
    },

    directions: [],

    sprites: null,

    /**
     * @private
     * Returns the number of colors this series needs.
     * A Pie chart needs one color per slice while a Stacked Bar chart needs one per segment.
     * An OHLC chart needs 2 colors (one for drops, one for rises), and most other charts need just 1 color.
     */
    themeColorCount: function() {
        return 1;
    },

    /**
     * @private
     * Returns the number of markers this series needs.
     * Currently, only the Line, Scatter and Radar series use markers - and they need just one each.
     */
    themeMarkerCount: function() {
        return 0;
    },

    setMarkerConfig: function (m) {
        return this.setMarker(m);
    },

    getMarkerConfig: function () {
        return this.getMarker();
    },

    getFields: function (fieldCategory) {
        var me = this,
            fields = [], fieldsItem,
            i, ln;
        for (i = 0, ln = fieldCategory.length; i < ln; i++) {
            fieldsItem = me['get' + fieldCategory[i] + 'Field']();
            fields.push(fieldsItem);
        }
        return fields;
    },

    applyAnimation: function (newAnimation, oldAnimation) {
        if (!newAnimation) {
            newAnimation = {
                duration: 0
            };
        } else if (newAnimation === true) {
            newAnimation = {
                easing: 'easeInOut',
                duration: 500
            };
        }
        return oldAnimation ? Ext.apply({}, newAnimation, oldAnimation) : newAnimation;
    },

    updateTitle: function(newTitle) {
        if (!this._chart) {
            return;
        }
        var me = this,
            newTitle = Ext.Array.from(newTitle),
            chart = me.getChart(),
            series = chart.getSeries(),
            seriesIndex = (series && Ext.Array.indexOf(series, me)) || -1,
            legendStore = chart.getLegendStore(),
            ln = Math.min(newTitle.length, me.getYField().length),
            i, item, title;

        if (newTitle) {
            if (seriesIndex !== -1) {
                for (i = 0; i < ln; i++) {
                    title = newTitle[i];
                    if (title) {
                        item = legendStore.getAt(seriesIndex + i);
                        item.set('name', title);
                    }
                }
            }
        }
    },

    applyHighlightCfg: function (highlight, oldHighlight) {
        return Ext.apply(oldHighlight || {}, highlight);
    },

    applyItemInstancing: function (instancing, oldInstancing) {
        return Ext.merge(oldInstancing || {}, instancing);
    },

    setAttributesForItem: function (item, change) {
        if (item && item.sprite) {
            if (item.sprite.itemsMarker && item.category === 'items') {
                item.sprite.putMarker(item.category, change, item.index, false, true);
            }
            if (item.sprite.isMarkerHolder && item.category === 'markers') {
                item.sprite.putMarker(item.category, change, item.index, false, true);
            } else if (item.sprite instanceof Ext.draw.sprite.Instancing) {
                item.sprite.setAttributesFor(item.index, change);
            } else {
                item.sprite.setAttributes(change);
            }
        }
    },

    applyHighlightItem: function (newHighlightItem, oldHighlightItem) {
        if (newHighlightItem === oldHighlightItem) {
            return;
        }
        if (Ext.isObject(newHighlightItem) && Ext.isObject(oldHighlightItem)) {
            if (newHighlightItem.sprite === oldHighlightItem.sprite &&
                newHighlightItem.index === oldHighlightItem.index
                ) {
                return;
            }
        }
        return newHighlightItem;
    },

    updateHighlightItem: function (newHighlightItem, oldHighlightItem) {
        this.setAttributesForItem(oldHighlightItem, {highlighted: false});
        this.setAttributesForItem(newHighlightItem, {highlighted: true});
    },

    constructor: function (config) {
        var me = this;
        me.getId();
        me.sprites = [];
        me.dataRange = [];
        Ext.ComponentManager.register(me);
        me.mixins.tips.constructor.apply(me, arguments);
        me.mixins.observable.constructor.apply(me, arguments);
    },

    applyStore: function (store) {
        return store && Ext.StoreManager.lookup(store);
    },

    getStore: function () {
        return this._store || this.getChart() && this.getChart().getStore();
    },

    updateStore: function (newStore, oldStore) {
        var me = this,
            chartStore = this.getChart() && this.getChart().getStore(),
            sprites = me.getSprites(),
            ln = sprites.length,
            i, sprite;
        newStore = newStore || chartStore;
        oldStore = oldStore || chartStore;

        if (oldStore) {
            oldStore.un('updaterecord', 'onUpdateRecord', me);
            oldStore.un('refresh', 'refresh', me);
        }
        if (newStore) {
            newStore.on('updaterecord', 'onUpdateRecord', me);
            newStore.on('refresh', 'refresh', me);
            for (i = 0; i < ln; i++) {
                sprite = sprites[i];
                if (sprite.setStore) {
                    sprite.setStore(newStore);
                }
            }
            me.refresh();
        }
    },

    onStoreChange: function (store, oldStore) {
        if (!this._store) {
            this.updateStore(store, oldStore);
        }
    },

    coordinateStacked: function (direction, directionOffset, directionCount) {
        var me = this,
            store = me.getStore(),
            items = store.getData().items,
            axis = me['get' + direction + 'Axis'](),
            hidden = me.getHidden(),
            range = {min: 0, max: 0},
            directions = me['fieldCategory' + direction],
            fieldCategoriesItem,
            i, j, k, fields, field, data, style = {},
            dataStart = [], dataEnd, posDataStart = [], negDataStart = [],
            stacked = me.getStacked(),
            sprites = me.getSprites();

        if (sprites.length > 0) {
            for (i = 0; i < directions.length; i++) {
                fieldCategoriesItem = directions[i];
                fields = me.getFields([fieldCategoriesItem]);
                for (j = 0; j < items.length; j++) {
                    dataStart[j] = 0;
                    posDataStart[j] = 0;
                    negDataStart[j] = 0;
                }
                for (j = 0; j < fields.length; j++) {
                    style = {};
                    field = fields[j];
                    if (hidden[j]) {
                        style['dataStart' + fieldCategoriesItem] = dataStart;
                        style['data' + fieldCategoriesItem] = dataStart;
                        sprites[j].setAttributes(style);
                        continue;
                    }
                    data = me.coordinateData(items, field, axis);
                    if (stacked) {
                        dataEnd = [];
                        for (k = 0; k < items.length; k++) {
                            if (!data[k]) {
                                data[k] = 0;
                            }
                            if (data[k] >= 0) {
                                dataStart[k] = posDataStart[k];
                                posDataStart[k] += data[k];
                                dataEnd[k] = posDataStart[k];
                            } else {
                                dataStart[k] = negDataStart[k];
                                negDataStart[k] += data[k];
                                dataEnd[k] = negDataStart[k];
                            }
                        }
                        style['dataStart' + fieldCategoriesItem] = dataStart;
                        style['data' + fieldCategoriesItem] = dataEnd;
                        me.getRangeOfData(dataStart, range);
                        me.getRangeOfData(dataEnd, range);
                    } else {
                        style['dataStart' + fieldCategoriesItem] = dataStart;
                        style['data' + fieldCategoriesItem] = data;
                        me.getRangeOfData(data, range);
                    }
                    sprites[j].setAttributes(style);
                }
            }
            me.dataRange[directionOffset] = range.min;
            me.dataRange[directionOffset + directionCount] = range.max;
            style = {};
            style['dataMin' + direction] = range.min;
            style['dataMax' + direction] = range.max;
            for (i = 0; i < sprites.length; i++) {
                sprites[i].setAttributes(style);
            }
        }
    },

    coordinate: function (direction, directionOffset, directionCount) {
        var me = this,
            store = me.getStore(),
            hidden = me.getHidden(),
            items = store.getData().items,
        // TODO: in this.processData we check if we have the getX(Y)Axis method,
        // TODO: if we don't, we call coordinateX(Y) instead, which calls this method,
        // TODO: but here we just call getX(Y)Axis even though it doesn't exist
        // TODO: (check cartesian charts without axes)
            axis = me['get' + direction + 'Axis'](),
            range = {min: Infinity, max: -Infinity},
            fieldCategory = me['fieldCategory' + direction] || [direction],
            fields = me.getFields(fieldCategory),
            i, field, data, style = {},
            sprites = me.getSprites();
        if (sprites.length > 0) {
            if (!Ext.isBoolean(hidden) || !hidden) {
                for (i = 0; i < fieldCategory.length; i++) {
                    field = fields[i];
                    data = me.coordinateData(items, field, axis);
                    me.getRangeOfData(data, range);
                    style['data' + fieldCategory[i]] = data;
                }
            }
            me.dataRange[directionOffset] = range.min;
            me.dataRange[directionOffset + directionCount] = range.max;
            style['dataMin' + direction] = range.min;
            style['dataMax' + direction] = range.max;
            if (axis) {
                axis.range = null;
                style['range' + direction] = axis.getRange();
            }
            for (i = 0; i < sprites.length; i++) {
                sprites[i].setAttributes(style);
            }
        }
    },

    /**
     * @private
     * This method will return an array containing data coordinated by a specific axis.
     * @param {Array} items
     * @param {String} field
     * @param {Ext.chart.axis.Axis} axis
     * @return {Array}
     */
    coordinateData: function (items, field, axis) {
        var data = [],
            length = items.length,
            layout = axis && axis.getLayout(),
            coord = axis ? function (x, field, idx, items) {
                return layout.getCoordFor(x, field, idx, items);
            } : function (x) { return +x; },
            i, x;
        for (i = 0; i < length; i++) {
            x = items[i].data[field];
            data[i] = !Ext.isEmpty(x) ? coord(x, field, i, items) : x;
        }
        return data;
    },

    getRangeOfData: function (data, range) {
        var i, length = data.length,
            value, min = range.min, max = range.max;
        for (i = 0; i < length; i++) {
            value = data[i];
            if (value < min) {
                min = value;
            }
            if (value > max) {
                max = value;
            }
        }
        range.min = min;
        range.max = max;
    },

    updateLabelData: function () {
        var me = this,
            store = me.getStore(),
            items = store.getData().items,
            sprites = me.getSprites(),
            labelTpl = me.getLabel().getTemplate(),
            labelFields = Ext.Array.from(labelTpl.getField() || me.getLabelField()),
            i, j, ln, labels,
            sprite, field;

        if (!sprites.length || !labelFields.length) {
            return;
        }

        for (i = 0; i < sprites.length; i++) {
            labels = [];
            sprite = sprites[i];
            field = sprite.getField();
            if (labelFields.indexOf(field) < 0) {
                field = labelFields[i];
            }
            for (j = 0, ln = items.length; j < ln; j++) {
                labels.push(items[j].get(field));
            }
            sprite.setAttributes({labels: labels});
        }
    },

    updateLabelField: function (labelField) {
        var labelTpl = this.getLabel().getTemplate();
        if (!labelTpl.config.field) {
            labelTpl.setField(labelField);
        }
    },

    processData: function () {
        if (!this.getStore()) {
            return;
        }

        var me = this,
            directions = this.directions,
            i, ln = directions.length,
            direction, axis;

        for (i = 0; i < ln; i++) {
            direction = directions[i];
            if (me['get' + direction + 'Axis']) {
                axis = me['get' + direction + 'Axis']();
                if (axis) {
                    axis.processData(me);
                    continue;
                }
            }
            if (me['coordinate' + direction]) {
                me['coordinate' + direction]();
            }
        }
        me.updateLabelData();
    },

    applyBackground: function (background) {
        if (this.getChart()) {
            this.getSurface().setBackground(background);
            return this.getSurface().getBackground();
        } else {
            return background;
        }
    },

    updateChart: function (newChart, oldChart) {
        var me = this;
        if (oldChart) {
            oldChart.un('axeschange', 'onAxesChange', me);
            // TODO: destroy them
            me.sprites = [];
            me.setSurface(null);
            me.setOverlaySurface(null);
            me.onChartDetached(oldChart);
        }
        if (newChart) {
            me.setSurface(newChart.getSurface('series'));
            me.setOverlaySurface(newChart.getSurface('overlay'));

            newChart.on('axeschange', 'onAxesChange', me);
            // TODO: Gauge series should render correctly when chart's store is missing.
            // TODO: When store is initially missing the getAxes will return null here,
            // TODO: since applyAxes has actually triggered this series.updateChart call
            // TODO: indirectly.
            // TODO: Figure out why it doesn't go this route when a store is present.
            if (newChart.getAxes()) {
                me.onAxesChange(newChart);
            }
            me.onChartAttached(newChart);
        }

        me.updateStore(me._store, null);
    },

    onAxesChange: function (chart) {
        var me = this,
            axes = chart.getAxes(), axis,
            directionAxesMap = {}, directionAxes,
            directionFieldsMap = {}, directionFields,
            needHighPrecision = false,
            directions = this.directions, direction,
            i, ln, j, ln2, k, ln3;

        for (i = 0, ln = directions.length; i < ln; i++) {
            direction = directions[i];
            directionFieldsMap[direction] = me.getFields(me['fieldCategory' + direction]);
        }

        for (i = 0, ln = axes.length; i < ln; i++) {
            axis = axes[i];
            if (!directionAxesMap[axis.getDirection()]) {
                directionAxesMap[axis.getDirection()] = [axis];
            } else {
                directionAxesMap[axis.getDirection()].push(axis);
            }
        }

        for (i = 0, ln = directions.length; i < ln; i++) {
            direction = directions[i];
            if (me['get' + direction + 'Axis']()) {
                continue;
            }
            if (directionAxesMap[direction]) {
                directionAxes = directionAxesMap[direction];
                for (j = 0, ln2 = directionAxes.length; j < ln2; j++) {
                    axis = directionAxes[j];
                    if (axis.getFields().length === 0) {
                        me['set' + direction + 'Axis'](axis);
                        if (axis.getNeedHighPrecision()) {
                            needHighPrecision = true;
                        }
                        break;
                    } else {
                        directionFields = directionFieldsMap[direction];
                        if (directionFields) {
                            for (k = 0, ln3 = directionFields.length; k < ln3; k++) {
                                if (axis.fieldsMap[directionFields[k]]) {
                                    me['set' + direction + 'Axis'](axis);
                                    if (axis.getNeedHighPrecision()) {
                                        needHighPrecision = true;
                                    }
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }
        this.getSurface().setHighPrecision(needHighPrecision);
    },

    onChartDetached: function (oldChart) {
        var me = this;
        me.fireEvent('chartdetached', oldChart, me);
        oldChart.un('storechange', 'onStoreChange', me);
    },

    onChartAttached: function (chart) {
        var me = this;
        me.setBackground(me.getBackground());
        me.fireEvent('chartattached', chart, me);
        chart.on('storechange', 'onStoreChange', me);
        me.processData();
    },

    updateOverlaySurface: function (overlaySurface) {
        var me = this;
        if (overlaySurface) {
            if (me.getLabel()) {
                me.getOverlaySurface().add(me.getLabel());
            }
        }
    },

    applyLabel: function (newLabel, oldLabel) {
        if (!oldLabel) {
            oldLabel = new Ext.chart.Markers({zIndex: 10});
            oldLabel.setTemplate(new Ext.chart.label.Label(newLabel));
        } else {
            oldLabel.getTemplate().setAttributes(newLabel);
        }
        return oldLabel;
    },

    createItemInstancingSprite: function (sprite, itemInstancing) {
        var me = this,
            template,
            markers = new Ext.chart.Markers();

        markers.setAttributes({zIndex: Number.MAX_VALUE});
        var config = Ext.apply({}, itemInstancing);
        if (me.getHighlightCfg()) {
            config.highlightCfg = me.getHighlightCfg();
            config.modifiers = ['highlight'];
        }
        markers.setTemplate(config);
        template = markers.getTemplate();
        template.setAttributes(me.getStyle());
        template.fx.on('animationstart', 'onSpriteAnimationStart', this);
        template.fx.on('animationend', 'onSpriteAnimationEnd', this);
        sprite.bindMarker('items', markers);

        me.getSurface().add(markers);
        return markers;
    },

    getDefaultSpriteConfig: function () {
        return {
            type: this.seriesType,
            renderer: this.getRenderer()
        };
    },

    createSprite: function () {
        var me = this,
            surface = me.getSurface(),
            itemInstancing = me.getItemInstancing(),
            marker, config,
            sprite = surface.add(me.getDefaultSpriteConfig());

        sprite.setAttributes(this.getStyle());

        if (itemInstancing) {
            sprite.itemsMarker = me.createItemInstancingSprite(sprite, itemInstancing);
        }

        if (sprite.bindMarker) {
            if (me.getShowMarkers() && me.getMarker()) {
                marker = new Ext.chart.Markers();
                config = Ext.merge({}, me.getMarker());
                if (me.getHighlightCfg()) {
                    config.highlightCfg = me.getHighlightCfg();
                    config.modifiers = ['highlight'];
                }
                marker.setTemplate(config);
                marker.getTemplate().fx.setCustomDuration({
                    translationX: 0,
                    translationY: 0
                });
                sprite.dataMarker = marker;
                sprite.bindMarker('markers', marker);
                me.getOverlaySurface().add(marker);
            }
            if (me.getLabel().getTemplate().getField() || me.getLabelField()) {
                sprite.bindMarker('labels', me.getLabel());
            }
        }

        if (sprite.setStore) {
            sprite.setStore(me.getStore());
        }

        sprite.fx.on('animationstart', 'onSpriteAnimationStart', me);
        sprite.fx.on('animationend', 'onSpriteAnimationEnd', me);

        me.sprites.push(sprite);

        return sprite;
    },

    /**
     * Performs drawing of this series.
     */
    getSprites: Ext.emptyFn,

    onUpdateRecord: function () {
        // TODO: do something REALLY FAST.
        this.processData();
    },

    refresh: function () {
        this.processData();
    },

    isXType: function (xtype) {
        return xtype === 'series';
    },

    getItemId: function () {
        return this.getId();
    },

    applyThemeStyle: function (theme, oldTheme) {
        var me = this,
            fill, stroke;

        fill = theme && theme.subStyle && theme.subStyle.fillStyle;
        stroke = fill && theme.subStyle.strokeStyle;
        if (fill && !stroke) {
            theme.subStyle.strokeStyle = me.getStrokeColorsFromFillColors(fill);
        }

        fill = theme && theme.markerSubStyle && theme.markerSubStyle.fillStyle;
        stroke = fill && theme.markerSubStyle.strokeStyle;
        if (fill && !stroke) {
            theme.markerSubStyle.strokeStyle = me.getStrokeColorsFromFillColors(fill);
        }
        return Ext.apply(oldTheme || {}, theme);
    },

    applyStyle: function (style, oldStyle) {
        // TODO: Incremental setter
        var cls = Ext.ClassManager.get(Ext.ClassManager.getNameByAlias('sprite.' + this.seriesType));
        if (cls && cls.def) {
            style = cls.def.normalize(style);
        }
        return Ext.apply(oldStyle || {}, style);
    },

    applySubStyle: function (subStyle, oldSubStyle) {
        var cls = Ext.ClassManager.get(Ext.ClassManager.getNameByAlias('sprite.' + this.seriesType));
        if (cls && cls.def) {
            subStyle = cls.def.batchedNormalize(subStyle, true);
        }
        return Ext.merge(oldSubStyle || {}, subStyle);
    },

    applyMarker: function (marker, oldMarker) {
        var type = (marker && marker.type) || (oldMarker && oldMarker.type) || 'circle',    // TODO:ps Should use marker theme instead of 'circle'
            cls = Ext.ClassManager.get(Ext.ClassManager.getNameByAlias('sprite.' + type));
        if (cls && cls.def) {
            marker = cls.def.normalize(marker, true);
            marker.type = type;
        }
        return Ext.merge(oldMarker || {}, marker);
    },

    applyMarkerSubStyle: function (marker, oldMarker) {
        var type = (marker && marker.type) || (oldMarker && oldMarker.type) || 'circle',   // TODO:ps Should use marker theme instead of 'circle'
            cls = Ext.ClassManager.get(Ext.ClassManager.getNameByAlias('sprite.' + type));
        if (cls && cls.def) {
            marker = cls.def.batchedNormalize(marker, true);
        }
        return Ext.merge(oldMarker || {}, marker);
    },

    updateHidden: function (hidden) {
        // TODO: remove this when jacky fix the problem.
        this.getColors();
        this.getSubStyle();
        this.setSubStyle({hidden: hidden});
        this.processData();
        this.doUpdateStyles();
    },

    /**
     *
     * @param {Number} index
     * @param {Boolean} value
     */
    setHiddenByIndex: function (index, value) {
        if (Ext.isArray(this.getHidden())) {
            this.getHidden()[index] = value;
            this.updateHidden(this.getHidden());
        } else {
            this.setHidden(value);
        }
    },

    getStrokeColorsFromFillColors: function (colors) {
        var me = this,
            darker = me.getUseDarkerStrokeColor(),
            darkerRatio = (Ext.isNumber(darker) ? darker : me.darkerStrokeRatio),
            strokeColors;
        if (darker) {
            strokeColors = colors.map(function(colorString) {
                var color = Ext.draw.Color.fromString(colorString);
                return color.getDarker(darkerRatio).toString();
            });
        } else {
            strokeColors = Ext.Array.clone(colors);
        }
        return strokeColors;
    },

    updateThemeColors: function (colors) {
        var me = this,
            theme = me.getThemeStyle(),
            fillColors = Ext.Array.clone(colors),
            strokeColors = me.getStrokeColorsFromFillColors(colors),
            newSubStyle = { fillStyle: fillColors, strokeStyle: strokeColors };

        theme.subStyle = Ext.apply(theme.subStyle || {}, newSubStyle);
        theme.markerSubStyle = Ext.apply(theme.markerSubStyle || {}, newSubStyle);

        me.doUpdateStyles();
    },

    /**
     * @private
     * When the chart's "colors" config changes, these colors are passed onto the series
     * where they are used with the same priority as theme colors, ie. they do not override
     * the series' "colors" config, nor the series' "style" config, but they do override
     * the colors from the theme's "seriesThemes" config.
     */
    updateChartColors: function (colors) {
        var me = this;

        if (!me.getColors()) {
            me.updateThemeColors(colors);
        }
    },

    updateColors: function (colors) {
        this.updateThemeColors(colors);
    },

    updateStyle: function () {
        this.doUpdateStyles();
    },

    updateSubStyle: function () {
        this.doUpdateStyles();
    },

    updateThemeStyle: function () {
        this.doUpdateStyles();
    },

    doUpdateStyles: function () {
        var sprites = this.sprites,
            itemInstancing = this.getItemInstancing(),
            i = 0, ln = sprites && sprites.length,
            markerCfg = this.getMarker(),
            style;
        for (; i < ln; i++) {
            style = this.getStyleByIndex(i);
            if (itemInstancing) {
                sprites[i].itemsMarker.getTemplate().setAttributes(style);
            }
            sprites[i].setAttributes(style);
            if (markerCfg && sprites[i].dataMarker) {
                sprites[i].dataMarker.getTemplate().setAttributes(this.getMarkerStyleByIndex(i));
            }
        }
    },

    getStyleWithTheme: function() {
        var me = this,
            theme = me.getThemeStyle(),
            seriesThemeStyle = (theme && theme.style) || {},
            style = Ext.applyIf(Ext.apply({}, me.getStyle()), seriesThemeStyle);
        return style;
    },

    getSubStyleWithTheme: function() {
        var me = this,
            theme = me.getThemeStyle(),
            seriesThemeSubStyle = (theme && theme.subStyle) || {},
            subStyle = Ext.applyIf(Ext.apply({}, me.getSubStyle()), seriesThemeSubStyle);
        return subStyle;
    },

    // getMarkerStyleWithTheme: function() {
    //     var me = this,
    //         theme = me.getThemeStyle(),
    //         seriesThemeStyle = (theme && theme.style) || {},
    //         style = Ext.applyIf(Ext.apply({}, me.getMarker()), seriesThemeStyle);
    //     return style;
    // },

    // getMarkerSubStyleWithTheme: function() {
    //     var me = this,
    //         theme = me.getThemeStyle(),
    //         seriesThemeStyle = (theme && theme.style) || {},
    //         style = Ext.applyIf(Ext.apply({}, me.getMarkerSubStyle()), seriesThemeStyle);
    //     return style;
    // },

    getStyleByIndex: function (i) {
        var me = this,
            theme = me.getThemeStyle(),
            style, themeStyle, subStyle, themeSubStyle,
            result = {};

        style = me.getStyle();
        themeStyle = (theme && theme.style) || {};

        subStyle = me.styleDataForIndex(me.getSubStyle(), i);
        themeSubStyle = me.styleDataForIndex((theme && theme.subStyle), i);

        Ext.apply(result, themeStyle);
        Ext.apply(result, themeSubStyle);

        Ext.apply(result, style);
        Ext.apply(result, subStyle);

        return result;
    },

    getMarkerStyleByIndex: function (i) {
        var me = this,
            theme = me.getThemeStyle(),
            style, themeStyle, subStyle, themeSubStyle,
            markerStyle, themeMarkerStyle, markerSubStyle, themeMarkerSubStyle,
            result = {};

        style = me.getStyle();
        themeStyle = (theme && theme.style) || {};

        subStyle = me.styleDataForIndex(me.getSubStyle(), i);
        themeSubStyle = me.styleDataForIndex((theme && theme.subStyle), i);

        markerStyle = me.getMarker();
        themeMarkerStyle = (theme && theme.marker) || {};

        markerSubStyle = me.getMarkerSubStyle();
        themeMarkerSubStyle = me.styleDataForIndex((theme && theme.markerSubStyle), i);

        Ext.apply(result, themeStyle);
        Ext.apply(result, themeSubStyle);
        Ext.apply(result, themeMarkerStyle);
        Ext.apply(result, themeMarkerSubStyle);

        Ext.apply(result, style);
        Ext.apply(result, subStyle);
        Ext.apply(result, markerStyle);
        Ext.apply(result, markerSubStyle);

        return result;
    },

    styleDataForIndex: function (style, i) {
        var value, name, result = {};

        if (style) {
            for (name in style) {
                value = style[name];
                if (Ext.isArray(value)) {
                    result[name] = value[i % value.length];
                } else {
                    result[name] = value;
                }
            }
        }
        return result;
    },

    /**
     * For a given x/y point relative to the main rect, find a corresponding item from this
     * series, if any.
     * @param {Number} x
     * @param {Number} y
     * @param {Object} [target] optional target to receive the result
     * @return {Object} An object describing the item, or null if there is no matching item. The exact contents of
     * this object will vary by series type, but should always contain at least the following:
     *
     * @return {Ext.data.Model} return.record the record of the item.
     * @return {Array} return.point the x/y coordinates relative to the chart box of a single point
     * for this data item, which can be used as e.g. a tooltip anchor point.
     * @return {Ext.draw.sprite.Sprite} return.sprite the item's rendering Sprite.
     * @return {Number} return.subSprite the index if sprite is an instancing sprite.
     */
    getItemForPoint: Ext.emptyFn,

    getItemByIndex: function (index) {
        if (this.getSprites()) {
            var me = this,
                sprite = me.getSprites()[0],
                store = me.getStore(),
                item;

            if (sprite) {
                item = {
                    series: this,
                    category: this.getItemInstancing() ? 'items' : 'markers',
                    index: index,
                    record: store.getData().items[index],
                    field: this.getYField(),
                    sprite: sprite
                };
                return item;
            }
        }
    },

    onSpriteAnimationStart: function (sprite) {
        this.fireEvent('animationstart', sprite);
    },

    onSpriteAnimationEnd: function (sprite) {
        this.fireEvent('animationend', sprite);
    },

    /**
     * Provide legend information to target array.
     *
     * @param {Array} target
     *
     * The information consists:
     * @param {String} target.name
     * @param {String} target.markColor
     * @param {Boolean} target.disabled
     * @param {String} target.series
     * @param {Number} target.index
     */
    provideLegendInfo: function (target) {
        target.push({
            name: this.getTitle() || this.getId(),
            mark: 'black',
            disabled: false,
            series: this.getId(),
            index: 0
        });
    },

    destroy: function () {
        this.clearListeners();
        Ext.ComponentManager.unregister(this);
        var store = this.getStore();
        if (store && store.getAutoDestroy()) {
            Ext.destroy(store);
        }
        this.setStore(null);
        this.callParent();
    }
});
