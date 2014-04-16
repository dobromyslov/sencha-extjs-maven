/**
 * This plugin can be applied to any `Component` (although almost always to a `Container`)
 * to make it fill the browser viewport. This plugin is used internally by the more familiar
 * `Ext.container.Viewport` class.
 *
 * The `Viewport` container is commonly used but it can be an issue if you need to fill the
 * viewport with a container that derives from another class (e.g., `Ext.tab.Panel`). Prior
 * to this plugin, you would have to do this:
 *
 *      Ext.create('Ext.container.Viewport', {
 *          layout: 'fit', // full the viewport with the tab panel
 *
 *          items: [{
 *              xtype: 'tabpanel',
 *              items: [{
 *                  ...
 *              }]
 *          }]
 *      });
 *
 * With this plugin you can create the `tabpanel` as the viewport:
 *
 *      Ext.create('Ext.tab.Panel', {
 *          plugins: 'viewport',
 *
 *          items: [{
 *              ...
 *          }]
 *      });
 *
 * More importantly perhaps is that as a plugin, the view class can be reused in other
 * contexts such as the content of a `{@link Ext.window.Window window}`.
 *
 * The Viewport renders itself to the document body, and automatically sizes itself to the size of
 * the browser viewport and manages window resizing. There may only be one Viewport created
 * in a page.
 *
 * @since 5.0.0
 */
Ext.define('Ext.container.plugin.Viewport', {
    extend: 'Ext.AbstractPlugin',

    alias: 'plugin.viewport',

    /**
     * @cfg {Number} [maxUserScale=1]
     * The maximum zoom scale. Only applicable for touch devices. Set this to 1 to
     * disable zooming.  Setting this to any value other than "1" will disable all
     * multi-touch gestures.
     */

    setCmp: function (cmp) {
        this.callParent([ cmp ]);

        if (cmp && !cmp.isViewport) {
            this.apply(cmp);
            if (cmp.renderConfigs) {
                cmp.flushRenderConfigs();
            }
            cmp.setupViewport();
        }
    },

    statics: {
        apply: function (target) {
            Ext.applyIf(target.prototype || target, {
                ariaRole: 'application',

                viewportCls: Ext.baseCSSPrefix + 'viewport'
            });

            Ext.override(target, {
                isViewport: true,

                preserveElOnDestroy: true,

                initComponent : function() {
                    this.callParent();
                    this.setupViewport();
                },

                setupViewport : function() {
                    var me = this,
                        html = document.body.parentNode,
                        el = me.el = Ext.getBody();

                    // Get the DOM disruption over with before the Viewport renders and begins a layout
                    Ext.getScrollbarSize();

                    // Clear any dimensions, we will size later on
                    me.width = me.height = undefined;

                    Ext.fly(html).addCls(me.viewportCls);
                    if (me.autoScroll) {
                        Ext.fly(html).setStyle(me.getOverflowStyle());
                        delete me.autoScroll;
                    }
                    el.setHeight = el.setWidth = Ext.emptyFn;
                    el.dom.scroll = 'no';
                    me.allowDomMove = false;
                    me.renderTo = me.el;

                    if (Ext.supports.Touch) {
                        me.initMeta();
                    }
                },

                // override here to prevent an extraneous warning
                applyTargetCls: function(targetCls) {
                    this.el.addCls(targetCls);
                },

                onRender: function() {
                    var me = this;

                    me.callParent(arguments);

                    // Important to start life as the proper size (to avoid extra layouts)
                    // But after render so that the size is not stamped into the body
                    me.width = Ext.Element.getViewportWidth();
                    me.height = Ext.Element.getViewportHeight();

                    // prevent touchmove from panning the viewport in mobile safari
                    if (Ext.supports.TouchEvents) {
                        me.mon(Ext.getDoc(), {
                            touchmove: function(e) {
                                e.preventDefault();
                            },
                            translate: false,
                            delegated: false
                        });
                    }
                },

                afterFirstLayout: function() {
                    var me = this;

                    me.callParent(arguments);
                    setTimeout(function() {
                        Ext.on('resize', me.fireResize, me);
                    }, 1);
                },

                fireResize: function(width, height){
                    var me = this,
                        body = document.body,
                        isTouch = Ext.supports.Touch;

                    if (isTouch) {
                        // On touch devices resize event can fire as a result of zooming.  When this
                        // happens we want the Viewport to be the size of the body, not the zoomed
                        // in region.
                        width = body.offsetWidth;
                        height = body.offsetHeight;
                    }

                    // There are 2 reasons height width may not have changed here:
                    // 1. In IE we can get resize events that have the current size
                    // 2. on touch devices resize events can be triggered by a zoom.
                    // In either case we do not want to trigger a useless layout.
                    if (width != me.width || height != me.height) {
                        me.setSize(width, height);
                    }
                    if (isTouch) {
                        body.scrollTop = 0;
                    }
                },

                initInheritedState: function (inheritedState, inheritedStateInner) {
                    var me = this,
                        root = Ext.rootInheritedState;

                    if (inheritedState !== root) {
                        // We need to go at this again but with the rootInheritedState object. Let
                        // any derived class poke on the proper object!
                        me.initInheritedState(me.inheritedState = root,
                            me.inheritedStateInner = Ext.Object.chain(root));
                    } else {
                        me.callParent([ inheritedState, inheritedStateInner ]);
                    }
                },

                beforeDestroy: function(){
                    var me = this;

                    me.removeUIFromElement();
                    me.el.removeCls(me.baseCls);
                    Ext.fly(document.body.parentNode).removeCls(me.viewportCls);
                    me.callParent();
                },

                addMeta: function(name, content) {
                    var meta = document.createElement('meta');

                    meta.setAttribute('name', name);
                    meta.setAttribute('content', content);
                    Ext.getHead().appendChild(meta);
                },

                initMeta: function() {
                    var me = this,
                        maxScale = me.maxUserScale || 1;

                    me.addMeta('viewport', 'width=device-width, initial-scale=1, maximum-scale=' +
                           maxScale + ', user-scalable=' + (maxScale !== 1 ? 'yes' : 'no'));
                    me.addMeta('apple-mobile-web-app-capable', 'yes');
                }
            });
        }
    }
},
function () {
    this.prototype.apply = this.apply;
});
