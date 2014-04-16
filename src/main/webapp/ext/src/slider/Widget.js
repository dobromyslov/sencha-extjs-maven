Ext.define('Ext.slider.Widget', {
    extend: 'Ext.Widget',
    alias: 'widget.sliderwidget',

    // Required to pull in the styles
    requires: [
        'Ext.slider.Multi'
    ], 

    cachedConfig: {
        vertical: false,

        cls: Ext.baseCSSPrefix + 'slider',
        
        baseCls: Ext.baseCSSPrefix + 'slider'        
    },

    config: {
        /**
         * @cfg {Boolean} clickToChange
         * Determines whether or not clicking on the Slider axis will change the slider.
         */
        clickToChange : true,

        ui: 'widget',
        
        value: 0,

        minValue: 0,

        maxValue: 100
    },

    defaultBindProperty: 'value',

    thumbCls: Ext.baseCSSPrefix + 'slider-thumb',

    horizontalProp: 'left',

    getElementConfig: function() {
        return {
            reference: 'element',
            cls: Ext.baseCSSPrefix + 'slider',
            listeners: {
                mousedown: 'onMouseDown',
                dragstart: 'cancelDrag',
                drag: 'cancelDrag',
                dragend: 'cancelDrag'
            },
            children: [{
                reference: 'endEl',
                cls: Ext.baseCSSPrefix + 'slider-end',
                children: [{
                    reference: 'innerEl',
                    cls: Ext.baseCSSPrefix + 'slider-inner'
                }]
            }]
        };
    },

    applyValue: function(value) {
        var i, len;

        if (Ext.isArray(value)) {
            value = Ext.Array.map(Ext.Array.from(value), Number);
            for (i = 0, len = value.length; i < len; ++i) {
                this.setThumbValue(i, value[i]);
            }
        } else {
            this.setThumbValue(0, value);
        }
        return value;
    },

    updateVertical: function(vertical, oldVertical) {
        this.element.removeCls(Ext.baseCSSPrefix + 'slider-' + (oldVertical ? 'vert' : 'horz'));
        this.element.addCls(   Ext.baseCSSPrefix + 'slider-' + (vertical    ? 'vert' : 'horz'));
    },

    doSetHeight: function(height) {
        this.callParent(arguments);
        this.endEl.dom.style.height = this.innerEl.dom.style.height = '100%';
    },

    cancelDrag: function(e) {
        // prevent the touch scroller from scrolling when the slider is being dragged
        e.stopPropagation();
    },

    getThumb: function(ordinal) {
        var me = this,
            thumbConfig,
            result = (me.thumbs || (me.thumbs = []))[ordinal];
        
        if (!result) {
            thumbConfig = {
                cls: me.thumbCls,
                style: {}
            };
            thumbConfig['data-thumbIndex'] = ordinal;
            result = me.thumbs[ordinal] = me.innerEl.createChild(thumbConfig);
        }
        return result;
    },

    getThumbPositionStyle: function() {
        return this.getVertical() ? 'bottom' : (this.rtl && Ext.rtl ? 'right' : 'left');
    },

    // TODO: RTL? How in this paradigm?
    getRenderTree: function() {
        var me = this,
            rtl = me.rtl;

        if (rtl && Ext.rtl) {
            me.baseCls += ' ' + (Ext.rtl.util.Renderable.prototype._rtlCls);
            me.horizontalProp = 'right';
        } else if (rtl === false) {
            me.addCls(Ext.rtl.util.Renderable.prototype._ltrCls);
        }

        return me.callParent();
    },

    update: function() {
        var me = this,
            values = me.getValue(),
            len = values.length,
            i;

        for (i = 0; i < len; i++) {
            this.thumbs[i].dom.style[me.getThumbPositionStyle()] = me.calculateThumbPosition(values[i]) + '%';
        }
    },

    onMouseDown: function(e) {
        var me = this,
            thumb,
            trackPoint = e.getXY(),
            delta;

        if (!me.disabled && e.button === 0) {
            thumb = e.getTarget('.' + me.thumbCls, null, true);

            if (thumb) {
                me.promoteThumb(thumb);
                me.captureMouse(me.onMouseMove, me.onMouseUp, [thumb], 1);
                delta = me.pointerOffset = thumb.getXY();

                // Work out the delta of the pointer from the dead centre of the thumb.
                // Slider.getTrackPoint positions the centre of the slider at the reported
                // pointer position, so we have to correct for that in getValueFromTracker.
                delta[0] += Math.floor(thumb.getWidth() / 2) - trackPoint[0];
                delta[1] += Math.floor(thumb.getHeight() / 2) - trackPoint[1];
            } else {
                if (me.getClickToChange()) {
                    trackPoint = me.getTrackpoint(trackPoint);
                    if (trackPoint != null) {
                        me.onClickChange(trackPoint);
                    }
                }
            }
        }
    },

    /**
     * @private
     * Moves the thumb to the indicated position.
     * Only changes the value if the click was within this.clickRange.
     * @param {Number} trackPoint local pixel offset **from the origin** (left for horizontal and bottom for vertical) along the Slider's axis at which the click event occured.
     */
    onClickChange : function(trackPoint) {
        var me = this,
            thumb, index;

        // How far along the track *from the origin* was the click.
        // If vertical, the origin is the bottom of the slider track.

        //find the nearest thumb to the click event
        thumb = me.getNearest(trackPoint);
        index = parseInt(thumb.getAttribute('data-thumbIndex'), 10);
        me.setThumbValue(index, Ext.util.Format.round(me.reversePixelValue(trackPoint), me.decimalPrecision), undefined, true);
    },

    /**
     * @private
     * Returns the nearest thumb to a click event, along with its distance
     * @param {Number} trackPoint local pixel position along the Slider's axis to find the Thumb for
     * @return {Object} The closest thumb object and its distance from the click event
     */
    getNearest: function(trackPoint) {
        var me = this,
            clickValue = me.reversePixelValue(trackPoint),
            nearestDistance = me.getRange() + 5, //add a small fudge for the end of the slider
            nearest = null,
            thumbs = me.thumbs,
            i = 0,
            len = thumbs.length,
            thumb,
            value,
            dist;

        for (; i < len; i++) {
            thumb = thumbs[i];
            value = me.reversePercentageValue(parseInt(thumb.dom.style[me.getThumbPositionStyle()], 10));
            dist  = Math.abs(value - clickValue);

            if (Math.abs(dist) <= nearestDistance) {
                nearest = thumb;
                nearestDistance = dist;
            }
        }
        return nearest;
    },

    /**
     * @private
     * Moves the given thumb above all other by increasing its z-index. This is called when as drag
     * any thumb, so that the thumb that was just dragged is always at the highest z-index. This is
     * required when the thumbs are stacked on top of each other at one of the ends of the slider's
     * range, which can result in the user not being able to move any of them.
     * @param {Ext.slider.Thumb} topThumb The thumb to move to the top
     */
    promoteThumb: function(topThumb) {
        var thumbs = this.thumbs,
            ln = thumbs.length,
            thumb, i;

        topThumb = Ext.getDom(topThumb);
        for (i = 0; i < ln; i++) {
            thumb = thumbs[i];
            thumb.setStyle('z-index', thumb.dom === topThumb ? 1000 : '');
        }
    },

    onMouseMove: function(e, thumb) {
        var me = this,
            trackerXY = e.getXY(),
            trackPoint,
            newValue;

        trackerXY[0] += this.pointerOffset[0];
        trackerXY[1] += this.pointerOffset[1];
        trackPoint = me.getTrackpoint(trackerXY);

        // If dragged out of range, value will be undefined
        if (trackPoint != null) {
            newValue = me.reversePixelValue(trackPoint);
            me.setThumbValue(thumb.getAttribute('data-thumbIndex'), newValue, false);
        }
    },

    onMouseUp: function(e, thumb) {
        var me = this,
            trackerXY = e.getXY(),
            trackPoint,
            newValue;

        trackerXY[0] += this.pointerOffset[0];
        trackerXY[1] += this.pointerOffset[1];
        trackPoint = me.getTrackpoint(trackerXY);

        // If dragged out of range, value will be undefined
        if (trackPoint != null) {
            newValue = me.reversePixelValue(trackPoint);
            me.setThumbValue(thumb.getAttribute('data-thumbIndex'), newValue, false, true);
        }
    },

    /**
     * Programmatically sets the value of the Slider. Ensures that the value is constrained within the minValue and
     * maxValue.
     *
     * Setting a single value:
     *     // Set the second slider value, don't animate
     *     mySlider.setThumbValue(1, 50, false);
     *
     * Setting multiple values at once
     *     // Set 3 thumb values, animate
     *     mySlider.setThumbValue([20, 40, 60], true);
     *
     * @param {Number/Number[]} index Index of the thumb to move. Alternatively, it can be an array of values to set
     * for each thumb in the slider.
     * @param {Number} value The value to set the slider to. (This will be constrained within minValue and maxValue)
     * @param {Boolean} [animate=true] Turn on or off animation
     * @return {Ext.slider.Multi} this
     */
    setThumbValue : function(index, value, animate, changeComplete) {
        var me = this,
            thumb, thumbValue, len, i, values;

        if (Ext.isArray(index)) {
            values = index;
            animate = value;

            for (i = 0, len = values.length; i < len; ++i) {
                me.setThumbValue(i, values[i], animate);
            }
            return me;
        }

        thumb = me.getThumb(index);
        thumbValue = me.reversePercentageValue(parseInt(thumb.dom.style[me.getThumbPositionStyle()], 10));

        // ensures value is contstrained and snapped
        value = me.normalizeValue(value);

        if (value !== thumbValue && me.fireEvent('beforechange', me, value, thumbValue, thumb) !== false) {
            if (me.element.dom) {
                // TODO this only handles a single value; need a solution for exposing multiple values to aria.
                // Perhaps this should go on each thumb element rather than the outer element.
                me.element.set({
                    'aria-valuenow': value,
                    'aria-valuetext': value
                });

                me.moveThumb(thumb, me.calculateThumbPosition(value), Ext.isDefined(animate) ? animate !== false : me.animate);
                me.fireEvent('change', me, value, thumb);
            }
        }
        return me;
    },

    /**
     * Returns the current value of the slider
     * @param {Number} index The index of the thumb to return a value for
     * @return {Number/Number[]} The current value of the slider at the given index, or an array of all thumb values if
     * no index is given.
     */
    getValue : function(index) {
        var me = this;
        return Ext.isNumber(index) ? me.reversePercentageValue(parseInt(me.thumbs[index].dom.style[me.getThumbPositionStyle()], 10)) : me.getValues();
    },

    /**
     * Returns an array of values - one for the location of each thumb
     * @return {Number[]} The set of thumb values
     */
    getValues: function() {
        var me = this,
            values = [],
            i = 0,
            thumbs = me.thumbs,
            len = thumbs.length;

        for (; i < len; i++) {
            values.push(me.reversePercentageValue(parseInt(me.thumbs[i].dom.style[me.getThumbPositionStyle()], 10)));
        }
        return values;
    },

    /**
     * @private
     * move the thumb
     */
    moveThumb: function(thumb, v, animate) {
        var me = this,
            styleProp = me.getThumbPositionStyle(),
            to,
            from;

        v += '%';

        if (!animate) {
            thumb.dom.style[styleProp] = v;
        } else {
            to = {};
            to[styleProp] = v;

            if (!Ext.supports.GetPositionPercentage) {
                from = {};
                from[styleProp] = thumb.dom.style[styleProp];
            }

            new Ext.fx.Anim({
                target: thumb,
                duration: 350,
                from: from,
                to: to
            });
        }
    },

    /**
     * @private
     * Returns a snapped, constrained value when given a desired value
     * @param {Number} value Raw number value
     * @return {Number} The raw value rounded to the correct d.p. and constrained within the set max and min values
     */
    normalizeValue : function(v) {
        var me = this,
            snapFn = me.zeroBasedSnapping ? 'snap' : 'snapInRange';

        v = Ext.Number[snapFn](v, me.increment, me.minValue, me.maxValue);
        v = Ext.util.Format.round(v, me.decimalPrecision);
        v = Ext.Number.constrain(v, me.minValue, me.maxValue);
        return v;
    },

    /**
     * @private
     * Given an `[x, y]` position within the slider's track (Points outside the slider's track are coerced to either the minimum or maximum value),
     * calculate how many pixels **from the slider origin** (left for horizontal Sliders and bottom for vertical Sliders) that point is.
     *
     * If the point is outside the range of the Slider's track, the return value is `undefined`
     * @param {Number[]} xy The point to calculate the track point for
     */
    getTrackpoint : function(xy) {
        var me = this,
            vertical = me.getVertical(),
            sliderTrack = me.innerEl,
            trackLength, result,
            positionProperty;

        if (vertical) {
            positionProperty = 'top';
            trackLength = sliderTrack.getHeight();
        } else {
            positionProperty = 'left';
            trackLength = sliderTrack.getWidth();
        }
        xy = me.transformTrackPoints(sliderTrack.translatePoints(xy));
        result = Ext.Number.constrain(xy[positionProperty], 0, trackLength);
        return vertical ? trackLength - result : result;
    },

    transformTrackPoints: Ext.identityFn,

    /**
     * @private
     * Given a value within this Slider's range, calculates a Thumb's percentage CSS position to map that value.
     */
    calculateThumbPosition : function(v) {
        var me = this,
            pos = (v - me.getMinValue()) / me.getRange() * 100;

        if (isNaN(pos)) {
            pos = 0;
        }

        return pos;
    },

    /**
     * @private
     * Returns the ratio of pixels to mapped values. e.g. if the slider is 200px wide and maxValue - minValue is 100,
     * the ratio is 2
     * @return {Number} The ratio of pixels to mapped values
     */
    getRatio : function() {
        var me = this,
            innerEl = me.innerEl,
            trackLength = me.getVertical() ? innerEl.getHeight() : innerEl.getWidth(),
            valueRange = me.getRange();

        return valueRange === 0 ? trackLength : (trackLength / valueRange);
    },

    getRange: function() {
        return this.getMaxValue() - this.getMinValue();
    },

    /**
     * @private
     * Given a pixel location along the slider, returns the mapped slider value for that pixel.
     * E.g. if we have a slider 200px wide with minValue = 100 and maxValue = 500, reversePixelValue(50)
     * returns 200
     * @param {Number} pos The position along the slider to return a mapped value for
     * @return {Number} The mapped value for the given position
     */
    reversePixelValue : function(pos) {
        return this.getMinValue() + (pos / this.getRatio());
    },

    /**
     * @private
     * Given a Thumb's percentage position along the slider, returns the mapped slider value for that pixel.
     * E.g. if we have a slider 200px wide with minValue = 100 and maxValue = 500, reversePercentageValue(25)
     * returns 200
     * @param {Number} pos The percentage along the slider track to return a mapped value for
     * @return {Number} The mapped value for the given position
     */
    reversePercentageValue : function(pos) {
        return this.getMinValue() + this.getRange() * (pos / 100);
    },

    captureMouse: function(onMouseMove, onMouseUp, args, appendArgs) {
        var me = this,
            onMouseupWrap,
            listeners;

        onMouseMove = onMouseMove && Ext.Function.bind(onMouseMove, me, args, appendArgs);
        onMouseUp   = onMouseUp   && Ext.Function.bind(onMouseUp,   me, args, appendArgs);
        onMouseupWrap = function() {
            Ext.getDoc().un(listeners);
            if (onMouseUp) {
                onMouseUp.apply(me, arguments);
            }
        };
        listeners = {
            mousemove: onMouseMove,
            mouseup: onMouseupWrap
        };

        // Funnel mousemove events and the final mouseup event back into the gadget
        Ext.getDoc().on(listeners);
    }
});