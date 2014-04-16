Ext.define('Ext.overrides.Widget', {
    override: 'Ext.Widget',

    $configStrict: false,

    isComponent: true,

    // in Ext JS the rendered flag is set as soon as a component has its element.  Since
    // widgets always have an element when constructed, they are always considered to be
    // "rendered"
    rendered: true,
    
    cachedConfig: {
        baseCls: Ext.baseCSSPrefix + 'widget'
    },

    constructor: function(config) {
        this.callParent([config]);

        // initialize the component layout
        this.getComponentLayout();
    },

    addCls: function(cls) {
        this.el.addCls(cls);
    },

    addClsWithUI: function(cls) {
        this.el.addCls(cls);
    },

    afterComponentLayout: Ext.emptyFn,

    getComponentLayout: function() {
        var me = this,
            layout = me.componentLayout;

        if (!layout) {
            layout = me.componentLayout = new Ext.layout.component.Auto();
            layout.setOwner(me);
        }

        return layout;
    },

    /**
     * @private
     * Needed for when widget is rendered into a grid cell. The class to add to the cell element.
     */
    getTdCls: function() {
        return this.getBaseCls() + '-cell';
    },

    /**
     * Returns the value of {@link #itemId} assigned to this component, or when that
     * is not set, returns the value of {@link #id}.
     * @return {String}
     */
    getItemId: function() {
        return this.itemId || this.id;
    },

    getSizeModel: function() {
        return Ext.Component.prototype.getSizeModel.apply(this, arguments);
    },

    onAdded: Ext.emptyFn,

    onRemoved: Ext.emptyFn,

    parseBox: function(box) {
        return Ext.Element.parseBox(box);
    },

    render: function(container, position) {
        var element = this.element,
            nextSibling;

        if (position) {
            nextSibiling = container.childNodes[position];
            if (nextSibling) {
                container.insertBefore(element, nextSibling);
                return;
            }
        }

        container.appendChild(element);
    },

    setPosition: function(x, y) {
        this.el.setLocalXY(x, y);
    }

}, function() {
    var prototype;

    if (Ext.isIE8) {
        prototype = Ext.Widget.prototype;
        // Since IE8 does not support Object.defineProperty we can't add the reference
        // node on demand, so we just fall back to adding all references up front.
        prototype.addElementReferenceOnDemand = prototype.addElementReference;
    }
});
