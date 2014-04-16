Ext.define('Ext.sparkline.Base', {
    extend: 'Ext.Widget',
    requires: [
        'Ext.XTemplate',
        'Ext.sparkline.CanvasCanvas',
        'Ext.sparkline.VmlCanvas'
    ],

    cachedConfig: {
        baseCls: Ext.baseCSSPrefix + 'sparkline',
        lineColor: '#157fcc',
        fillColor: '#def',
        defaultPixelsPerValue: 3,
        tagValuesAttribute: 'values',
        enableTagOptions: false,
        enableHighlight: true,
        highlightColor: null,
        highlightLighten: 1.4,
        tooltipSkipNull: true,
        tooltipPrefix: '',
        tooltipSuffix: '',
        disableHiddenCheck: false,
        disableTooltips: false,
        disableInteraction: false,
        tipTpl: null
    },

    config: {
        values: null
    },

    element: {
        tag: 'canvas',
        reference: 'element',
        style: {
            display: 'inline-block',
            verticalAlign: 'top'
        },
        listeners: {
            mouseenter: 'onMouseEnter',
            mouseleave: 'onMouseLeave',
            mousemove: 'onMouseMove'
        },
        // Create canvas zero sized so that it does not affect the containing element's initial layout
        // https://sencha.jira.com/browse/EXTJSIV-10145
        width: 0,
        height: 0
    },
    
    defaultBindProperty: 'values',

    // When any config is changed, the canvas needs to be redrawn.
    // This is done at the next animation frame when this queue is traversed.
    redrawQueue: {},

    inheritableStatics: {
        sparkLineTipClass: Ext.baseCSSPrefix + 'sparkline-tip-target',

        onClassCreated: function(cls) {
            var proto = cls.prototype,
                configs = cls.getConfigurator().configs,
                config;

            // Set up an applier for all local configs which kicks off a request to redraw on the next animation frame
            for (config in configs) {
                // tipTpl not included in this scheme
                if (config !== 'tipTpl') {
                    proto[Ext.Config.get(config).names.apply] = proto.applyConfigChange;
                }
            }    
        }
    },

    constructor: function(config) {
        var me = this;

        // The canvas sets our element config
        me.canvas = Ext.supports.Canvas ? new Ext.sparkline.CanvasCanvas(me)
                                        : new Ext.sparkline.VmlCanvas(me);
        if (!me.getDisableTooltips()) {
            me.element.cls = Ext.sparkline.Base.sparkLineTipClass;
        }

        Ext.apply(me, config);
        me.callParent([config]);

        // For compatibility of all the code.
        me.el = me.element;
    },

    // determine if all values of an array match a value
    // returns true if the array is empty
    all: function (val, arr, ignoreNull) {
        var i;
        for (i = arr.length; i--; ) {
            if (ignoreNull && arr[i] === null) continue;
            if (arr[i] !== val) {
                return false;
            }
        }
        return true;
    },

    // generic config value applier.
    // Adds this to the queue to do a redraw on the next animation frame
    applyConfigChange: function(newValue) {
        this.redrawQueue[this.getId()] = this;

        // Ensure that there is a single timer to handle all queued redraws.
        if (!this.redrawTimer) {
            Ext.sparkline.Base.prototype.redrawTimer =
                    Ext.Function.requestAnimationFrame(this.processRedrawQueue);
        }
        return newValue;
    },

    // Appliers convert an incoming config value.
    // Ensure the tipTpl is an XTemplate
    applyTipTpl: function(tipTpl) {
        if (!tipTpl.isTemplate) {
            tipTpl = new Ext.XTemplate(tipTpl);
        }
        return tipTpl;
    },

    normalizeValue: function (val) {
        var nf;
        switch (val) {
            case 'undefined':
                val = undefined;
                break;
            case 'null':
                val = null;
                break;
            case 'true':
                val = true;
                break;
            case 'false':
                val = false;
                break;
            default:
                nf = parseFloat(val);
                if (val == nf) {
                    val = nf;
                }
        }
        return val;
    },

    normalizeValues: function (vals) {
        var i, result = [];
        for (i = vals.length; i--;) {
            result[i] = this.normalizeValue(vals[i]);
        }
        return result;
    },

    doSetWidth: function(width) {
        var me = this,
            dom = me.element.dom;

        me.callParent(arguments);
        me.canvas.setWidth(width);
        me.width = width;
        if (me.height == null) {
            me.setHeight(parseInt(me.measurer.getCachedStyle(dom.parentNode, 'line-height')));
        }
        else {
            me.redrawQueue[me.getId()] = me;
        }
    },

    doSetHeight: function(height) {
        var me = this;

        me.callParent(arguments);
        me.canvas.setHeight(height);
        me.height = height;
        me.redrawQueue[me.getId()] = me;
    },

    updateValues: function(values) {
        this.values = values;
    },

    redraw: function() {
        var me = this;

        if (me.getValues()) {
            // Avoid the visible tooltup thinking a subsequent mousemove is a mouseout by updating its triggerElement
            if (me.tooltip && me.tooltip.isVisible() && me.currentPageXY && me.el.getRegion().contains(me.currentPageXY)) {
                me.tooltip.triggerElement = me.el.dom;
            }

            me.onUpdate();
            me.canvas.onOwnerUpdate();
            me.renderGraph();
        }
    },

    onUpdate: Ext.emptyFn,

    /*
     * Render the chart to the canvas
     */
    renderGraph: function () {
        if (this.disabled) {
            this.canvas.reset();
            return false;
        }
        return true;
    },

    onMouseEnter: function(e) {
        this.onMouseMove(e);
    },

    onMouseMove: function (e) {
        this.currentPageXY = e.getPoint();
        this.redraw();
    },

    onMouseLeave: function () {
        this.currentPageXY = this.targetX = this.targetY = null;
        this.redraw();
    },

    updateDisplay: function () {
        if (this.currentPageXY && this.el.getRegion().contains(this.currentPageXY)) {
            var me = this,
                offset = me.canvas.el.getXY(),
                tooltipHTML,
                region = me.getRegion(me.currentPageXY[0] - offset[0], me.currentPageXY[1] - offset[1]);

            if (region != null && !me.disableHighlight) {
                me.renderHighlight(region);
            }
            me.fireEvent('sparklineRegionChange', me);

            if (region != null && me.tooltip) {
                tooltipHTML = me.getRegionTooltip(region);
                if (tooltipHTML) {
                    if (!me.lastTooltipHTML || tooltipHTML[0] !== me.lastTooltipHTML[0] || tooltipHTML[1] !== me.lastTooltipHTML[1]) {
                        me.tooltip.setTitle(tooltipHTML[0]);
                        me.tooltip.update(tooltipHTML[1]);
                        me.lastTooltipHTML = tooltipHTML;
                    }
                } else {
                    me.tooltip.hide();
                }
            }
        }
    },

    /*
     * Return a region id for a given x/y co-ordinate
     */
    getRegion: Ext.emptyFn,

    /*
     * Fetch the HTML to display as a tooltip
     */
    getRegionTooltip: function(region) {
        var me = this,
            header = me.tooltipChartTitle,
            entries = [],
            fields,
            tipTpl = me.getTipTpl(),
            i,
            showFields, showFieldsKey, newFields, fv,
            formatter, fieldlen, j;

        fields = me.getRegionFields(region);
        formatter = me.tooltipFormatter;
        if (formatter) {
            return formatter(me, me, fields);
        }

        if (!tipTpl) {
            return '';
        }
        if (!Ext.isArray(fields)) {
            fields = [fields];
        }
        showFields = me.tooltipFormatFieldlist;
        showFieldsKey = me.tooltipFormatFieldlistKey;
        if (showFields && showFieldsKey) {
            // user-selected ordering of fields
            newFields = [];
            for (i = fields.length; i--;) {
                fv = fields[i][showFieldsKey];
                if ((j = Ext.Array.indexOf(fv, showFields)) != -1) {
                    newFields[j] = fields[i];
                }
            }
            fields = newFields;
        }
        fieldlen = fields.length;

        for (j = 0; j < fieldlen; j++) {
            if (!fields[j].isNull || !me.getTooltipSkipNull()) {
                Ext.apply(fields[j], {
                    prefix: me.getTooltipPrefix(),
                    suffix: me.getTooltipSuffix()
                });
                entries.push(tipTpl.apply(fields[j]));
            }
        }

        if (header || entries.length) {
            return [header, entries.join('<br>')];
        }
        return '';
    },

    getRegionFields: Ext.emptyFn,

    calcHighlightColor: function(color) {
        var me = this,
            highlightColor = me.getHighlightColor(),
            lighten = me.getHighlightLighten(),
            parse, mult, rgbnew, i;

        if (highlightColor) {
            return highlightColor;
        }
        if (lighten) {
            // extract RGB values
            parse = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(color) || /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color);
            if (parse) {
                rgbnew = [];
                mult = color.length === 4 ? 16 : 1;
                for (i = 0; i < 3; i++) {
                    rgbnew[i] = Ext.Number.constrain(Math.round(parseInt(parse[i + 1], 16) * mult * lighten), 0, 255);
                }
                return 'rgb(' + rgbnew.join(',') + ')';
            }
        }
        return color;
    }
}, function(cls) {
    var proto = cls.prototype;

    Ext.onReady(function() {
        proto.tooltip = new Ext.tip.ToolTip({
            id: 'sparklines-tooltip',
            target: document.body,
            delegate: '.' + cls.sparkLineTipClass,
            showDelay: 0,
            dismissDelay: 0,
            hideDelay: 400
        });
    });

    cls.onClassCreated(cls);
    
    proto.processRedrawQueue = function () {
        var redrawQueue = proto.redrawQueue,
            id;

        for (id in redrawQueue) {
            redrawQueue[id].redraw();
        }
        proto.redrawQueue = {};
        proto.redrawTimer = 0;
    };
});
