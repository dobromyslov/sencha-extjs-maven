Ext.define('Ext.app.bindinspector.ComponentList', {
    alias: 'widget.bindinspector-componentlist',
    extend: 'Ext.tree.Panel',
    
    rootVisible: false,
    title: 'Component Tree',
    
    viewConfig: {
        toggleOnDblClick: false
    },
    
    initComponent: function() {
        var nodes = [];
        Ext.Array.forEach(this.components, function(comp) {
            nodes.push(this.buildNode(comp));
        }, this);

        this.store = {
            model: this.Model,
            root: {
                expanded: true,
                children: nodes
            }
        };
        this.callParent();
        this.getView().on('itemdblclick', this.onSelectItem, this);
    },
    
    buildNode: function(comp) {
        var childItems = comp.items,
            viewModel = comp.viewModel,
            hasBindings = !!comp.bindings,
            suffix = [],
            len, i, o, child;

        if (viewModel) {
            suffix.push('(VM)');
        }
        if (hasBindings) {
            suffix.push('(B)');
        }
        
        o = {
            id: comp.id,
            text: comp.id + (suffix.length ? (' ' + suffix.join(' ')) : ''),
            hasViewModel: !!viewModel,
            hasBindings: hasBindings,
            hasDeepBindings: hasBindings,
            reference: comp.reference,
            children: []
        };
        
        if (childItems) {
            for (i = 0, len = childItems.length; i < len; ++i) {
                child = this.buildNode(childItems[i]);
                o.hasDeepBindings = o.hasDeepBindings || child.hasDeepBindings;
                if (child.hasDeepBindings) {
                    o.children.push(child);
                }
            }
        }
        
        if (o.children.length) {
            o.expanded = true;
            o.leaf = false;
        } else {
            o.leaf = true;
        }
        
        return o;
    },
    
    onSelectItem: function(view, rec) {
        this.fireEvent('componentselect', this, rec);
    }
}, function() {
    this.prototype.Model = Ext.define(null, {
        extend: 'Ext.data.TreeModel',
        fields: ['hasViewModel', 'hasBindings', 'reference', 'hasDeepBindings']
    });
});