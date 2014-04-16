Ext.define('Ext.app.bindinspector.ComponentDetail', {
    extend: 'Ext.container.Container',
    alias: 'widget.bindinspector-componentdetail',
    
    requires: [
        'Ext.form.field.Display',
        'Ext.grid.Panel',
        'Ext.layout.container.VBox'
    ],
    
    layout: {
        type: 'vbox',
        align: 'stretch'
    },

    activeCls: Ext.baseCSSPrefix + 'bindinspector-stub-active',
    
    initComponent: function() {
        var comp = this.component,
            env = this.env,
            publishes = comp.publishes,
            bindings = comp.bindings,
            viewModels = [],
            bindData, vm;
        
        vm = env.getInheritedVM(comp);
        while (vm) {
            viewModels.push({
                xtype: 'bindinspector-viewmodeldetail',
                itemId: 'vm-' + vm.id,
                vm: vm
            });
            vm = env.getVM(vm.parent);
        }
        
        if (bindings) {
            bindData = this.buildBindData(bindings);
        }
        
        this.items = [{
            xtype: 'displayfield',
            fieldLabel: 'Publishes',
            value: Ext.Object.getKeys(publishes).join(', ')
        }, {
            xtype: 'gridpanel',
            title: 'Bindings',
            flex: 1,
            collapsible: true,
            animCollapse: false,
            store: {
                model: this.BindingModel,
                data: bindData
            },
            columns: [{
                text: 'Key',
                dataIndex: 'key'
            }, {
                flex: 1,
                text: 'Descriptor',
                dataIndex: 'descriptor',
                scope: this,
                renderer: this.descriptorRenderer
            }, {
                text: 'Value',
                dataIndex: 'value',
                renderer: Ext.app.bindinspector.Util.valueRenderer
            }],
            listeners: {
                scope: this,
                cellclick: this.onCellClick
            }
        }, {
            xtype: 'tabpanel',
            itemId: 'tabs',
            flex: 1,
            items: viewModels
        }];
        this.callParent(arguments);
    },
    
    buildBindData: function(bind) {
        var out = [],
            key, o;
        
        for (key in bind) {
            o = bind[key];
            out.push({
                key: key,
                descriptor: o.descriptor,
                tokens: o.tokens,
                value: o.value,
                binding: o
            });
        }
        return out;
    },
    
    onCellClick: function(view, cell, colIdx, record, row, rowIdx, e) {
        var target = e.getTarget('.' + this.activeCls),
            path;
        
        if (target) {
            path = target.getAttribute('data-path');
            this.showPath(path);
        }
    },
    
    showPath: function(path) {
        var tabs = this.down('#tabs');
        tabs.setActiveTab(0);
        this.selectPath(tabs.items.first(), path);
    },
    
    selectPath: function(tab, path) {
        var node = tab.getRootNode(),
            parts = path.split('.'),
            len = parts.length,
            i;
        
        for (i = 0; node && i < len; ++i) {
            node = this.getChildByKey(node, parts[i]);
        }
        
        if (node) {
            tab.getSelectionModel().select(node);
        }
    },
    
    getChildByKey: function(node, key) {
        var childNodes = node.childNodes;
        if (childNodes) {
            return Ext.Array.findBy(childNodes, function(child) {
                return child.get('name') === key;
            });
        }
        return null;
    },
    
    descriptorRenderer: function(v, meta, rec) {
        var binding = rec.get('binding'),
            descriptor = rec.get('descriptor'),
            tokens = rec.get('tokens');
        
        if (binding.isTemplateBinding) {
            Ext.Array.forEach(tokens, function(token) {
                var tokenRe = new RegExp('{' + token.join('\\.') + '}', 'g');
                v = v.replace(tokenRe, this.parseTokens(token));
            }, this);
        } else if (binding.isMultiBinding) {
            // TODO
        } else {
            return v.replace(descriptor, this.parseTokens(tokens));
        }
        return Ext.String.htmlEncode(v);
    },
    
    parseTokens: function(tokens) {
        var out = [],
            vm = this.env.getInheritedVM(this.component),
            currPath = '',
            currParent = vm.rootStub;
        
        Ext.Array.forEach(tokens, function(token) {
            var stub = Ext.app.bindinspector.Util.getChildStub(token, currParent),
                cls = '',
                value;
                
            if (stub) {
                value = stub.value;
                if (value !== undefined) {
                    cls = this.activeCls;
                }
            } else {
                // TODO Never here...
            }
            out.push('<span data-path="' + currPath + token + '" class="stub ' + cls + '">' + token + '</span>');
            currPath += token + '.';
            currParent = stub;
        }, this);
        return '{' + out.join('.') + '}';
    }
}, function() {
    this.prototype.BindingModel = Ext.define(null, {
        extend: 'Ext.data.Model',
        
        fields: ['key', 'descriptor', 'tokens', 'value', 'binding']
    });
});