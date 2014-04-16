/**
 * The Draw Container is a surface in which sprites can be rendered. The Draw Container
 * manages and holds a `Surface` instance: an interface that has
 * an SVG or Canvas implementation depending on the browser capabilities and where
 * Sprites can be appended.
 * One way to create a draw container is:
 *
 *     var drawContainer = new Ext.draw.Container({
 *         items: [{
 *             type: 'circle',
 *             fill: '#79BB3F',
 *             radius: 100,
 *             x: 100,
 *             y: 100
 *         }]
 *     });
 *
 *     new Ext.Panel({
 *         fullscreen: true,
 *         items: [drawContainer]
 *     });
 *
 * In this case we created a draw container and added a sprite to it.
 * The *type* of the sprite is *circle*, so if you run this code you'll see a yellow-ish circle.
 *
 * You can also add sprites by using the surface's add method:
 *
 *     drawContainer.getSurface('main').add({
 *         type: 'circle',
 *         fill: '#79BB3F',
 *         radius: 100,
 *         x: 100,
 *         y: 100
 *     });
 *
 * For more information on Sprites, the core elements added to a draw container's surface,
 * refer to the {@link Ext.draw.sprite.Sprite} documentation.
 */
Ext.define('Ext.draw.Container', {
    extend: 'Ext.draw.ContainerBase',
    alternateClassName: 'Ext.draw.Component',
    xtype: 'draw',
    defaultType: 'surface',

    requires: [
        'Ext.draw.Surface',
        'Ext.draw.engine.Svg',
        'Ext.draw.engine.Canvas',
        'Ext.draw.gradient.GradientDefinition'
    ],
    engine: 'Ext.draw.engine.Canvas',

    config: {
        cls: 'x-draw-container',

        /**
         * @cfg {Function} [resizeHandler] The resize function that can be configured to have a behavior.
         *
         * __Note:__ since resize events trigger {@link #renderFrame} calls automatically,
         * return `false` from the resize function, if it also calls `renderFrame`, to prevent double rendering.
         */
        resizeHandler: null,

        background: null,

        sprites: null,

        /**
         * @cfg {Object[]} gradients
         * Defines a set of gradients that can be used as color properties
         * (fillStyle and strokeStyle, but not shadowColor) in sprites.
         * The gradients array is an array of objects with the following properties:
         * - **id** - string - The unique name of the gradient.
         * - **type** - string, optional - The type of the gradient. Available types are: 'linear', 'radial'. Defaults to 'linear'.
         * - **angle** - number, optional - The angle of the gradient in degrees.
         * - **stops** - array - An array of objects with 'color' and 'offset' properties, where 'offset' is a real number from 0 to 1.
         *
         * For example:
         *
         *     gradients: [{
         *         id: 'gradientId1',
         *         type: 'linear',
         *         angle: 45,
         *         stops: [{
         *             offset: 0,
         *             color: 'red'
         *         }, {
         *            offset: 1,
         *            color: 'yellow'
         *         }]
         *     }, {
         *        id: 'gradientId2',
         *        type: 'radial',
         *        stops: [{
         *            offset: 0,
         *            color: '#555',
         *        }, {
         *            offset: 1,
         *            color: '#ddd',
         *        }]
         *     }]
         *
         * Then the sprites can use 'gradientId1' and 'gradientId2' by setting the color attributes to those ids, for example:
         *
         *     sprite.setAttributes({
         *         fillStyle: 'url(#gradientId1)',
         *         strokeStyle: 'url(#gradientId2)'
         *     });
         */
        gradients: []
    },

    constructor: function (config) {
        this.callParent([config]);
        this.frameCallbackId = Ext.draw.Animator.addFrameCallback('renderFrame', this);
    },

    applyGradients: function (gradients) {
        var result = [],
            i, n, gradient, offset;
        if (!Ext.isArray(gradients)) {
            return result;
        }
        for (i = 0, n = gradients.length; i < n; i++) {
            gradient = gradients[i];
            if (!Ext.isObject(gradient)) {
                continue;
            }
            // ExtJS only supported linear gradients, so we didn't have to specify their type
            if (typeof gradient.type !== 'string') {
                gradient.type = 'linear';
            }
            if (gradient.angle) {
                gradient.degrees = gradient.angle;
                delete gradient.angle;
            }
            // Convert ExtJS stops object to Touch stops array
            if (Ext.isObject(gradient.stops)) {
                gradient.stops = (function (stops) {
                    var result = [], stop;
                    for (offset in stops) {
                        stop = stops[offset];
                        stop.offset = offset / 100;
                        result.push(stop);
                    }
                    return result;
                })(gradient.stops);
            }
            result.push(gradient);
        }
        Ext.draw.gradient.GradientDefinition.add(result);
        return result;
    },

    applySprites: function (sprites) {
        // Never update
        if (!sprites) {
            return;
        }

        sprites = Ext.Array.from(sprites);

        var ln = sprites.length,
            i, surface;

        for (i = 0; i < ln; i++) {
            if (sprites[i].surface instanceof Ext.draw.Surface) {
                surface = sprites[i].surface;
            } else if (Ext.isString(sprites[i].surface)) {
                surface = this.getSurface(sprites[i].surface);
            } else {
                surface = this.getSurface('main');
            }
            surface.add(sprites[i]);
        }
    },

    /**
     * @protected
     * Place watermark after resize.
     * @param {Number} width
     * @param {Number} height
     */
    onPlaceWatermark: Ext.emptyFn,

    onBodyResize: function () {
        var me = this,
            size = me.element.getSize(),
            resizeHandler = me.getResizeHandler() || me.resizeHandler,
            result;
        me.fireEvent('resize', me, size);
        result = resizeHandler.call(me, size);
        if (result !== false) {
            me.renderFrame();
            me.onPlaceWatermark(size.width, size.height);
        }
    },

    resizeHandler: function (size) {
        this.getItems().each(function (surface) {
            surface.setRect([0, 0, size.width, size.height]);
        });
    },

    /**
     * Get a surface by the given id or create one if it doesn't exist.
     * @param {String} [id="main"]
     * @return {Ext.draw.Surface}
     */
    getSurface: function (id) {
        id = this.getId() + '-' + (id || 'main');
        var me = this,
            surfaces = me.getItems(),
            surface = surfaces.get(id);
        if (!surface) {
            surface = me.add({xclass: me.engine, id: id});
            surface.renderFrame();
        }
        return surface;
    },

    /**
     * Render all the surfaces in the container.
     */
    renderFrame: function () {
        var me = this,
            surfaces = me.getItems(),
            i, ln, item;

        for (i = 0, ln = surfaces.length; i < ln; i++) {
            item = surfaces.items[i];
            if (item.isSurface) {
                item.renderFrame();
            }
        }
    },

    /**
     * Produces an image of the chart.
     * @param {String} [format] Possible options are 'image' (the method will return an Image object)
     *                          and 'stream' (the method will return the image as a byte stream).
     *                          If missing, the DataURL of the chart's image will be returned.
     * @return {Object}
     * @return {String} return.data Image element, byte stream or DataURL.
     * @return {String} return.type The type of the data (e.g. 'png' or 'svg').
     */
    getImage: function (format) {
        var size = this.innerElement.getSize(),
            surfaces = Array.prototype.slice.call(this.items.items),
            image, imageElement,
            zIndexes = this.surfaceZIndexes,
            i, j, surface, zIndex;

        // Sort the surfaces by zIndex using insertion sort.
        for (j = 1; j < surfaces.length; j++) {
            surface = surfaces[j];
            zIndex = zIndexes[surface.type];
            i = j - 1;
            while (i >= 0 && zIndexes[surfaces[i].type] > zIndex) {
                surfaces[i + 1] = surfaces[i];
                i--;
            }
            surfaces[i + 1] = surface;
        }

        image = surfaces[0].flatten(size, surfaces);

        if (format === 'image') {
            imageElement = new Image();
            imageElement.src = image.data;
            image.data = imageElement;
            return image;
        }
        if (format === 'stream') {
            image.data = image.data.replace(/^data:image\/[^;]+/, 'data:application/octet-stream');
            return image;
        }
        return image;
    },

    /**
     * @deprecated Consistent behavior across devices cannot be guaranteed.
     * Use {@link #download} or {@link #preview} methods instead.
     * Saves the chart by either triggering a download or returning a string containing the chart data
     * as a DataURL.
     *
     * Example usage:
     *
     *     chart.save({
     *          type: 'image/png'
     *     });
     *
     * Note: the method is only preserved for backward compatibility with Ext Charts,
     * and will disregard the value of the 'type' parameter. The actual type of the data will
     * depend on the draw engine used. When type is omitted, or no config is provided, calling
     * this method is equivalent to calling {@link #getImage} with no format specified.
     * @param {Object} [config]
     * @return {Object}
     */
    save: function (config) {
        if (config && config.type) {
            if (Ext.os.is.Desktop) {
                this.download();
            } else {
                this.preview();
            }
        } else {
            return this.getImage();
        }
    },

    /**
     * Downloads an image of the chart.
     * Note: when running on a mobile device use {@link #preview} instead,
     *       since many mobile browsers won't let users download files.
     */
    download: function () {
        var a = document.createElement('a'),
            image = this.getImage('stream'),
            click;
        if (Ext.isString(a.download)) {
            a.href = image.data;
            a.download = 'chart-' + this.getId() + '.' + image.type;
            a.click();
        } else {
            window.open(image.data);
        }
    },

    /**
     * @method preview
     * Displays an image of the chart on screen.
     * On mobile devices this lets users tap-and-hold to bring up the menu
     * with image saving options.
     * TODO: iOS Safari won't download SVGs. Android's Chrome will,
     * TODO: but there are no means of viewing them anyway.
     */

    destroy: function () {
        Ext.draw.Animator.removeFrameCallback(this.frameCallbackId);
        this.callParent();
    }

}, function () {
    if (location.search.match('svg')) {
        Ext.draw.Container.prototype.engine = 'Ext.draw.engine.Svg';
    } else if ((Ext.os.is.BlackBerry && Ext.os.version.getMajor() === 10) || (Ext.browser.is.AndroidStock4 && (Ext.os.version.getMinor() === 1 || Ext.os.version.getMinor() === 2 || Ext.os.version.getMinor() === 3))) {
        // http://code.google.com/p/android/issues/detail?id=37529
        Ext.draw.Container.prototype.engine = 'Ext.draw.engine.Svg';
    }
});
