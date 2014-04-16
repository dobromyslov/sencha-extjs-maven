Ext.define('Ext.app.bindinspector.ViewModelDetail', {
    extend: 'Ext.tree.Panel',
    alias: 'widget.bindinspector-viewmodeldetail',
    
    rootVisible: false,

    notifierCls: Ext.baseCSSPrefix + 'bindinspector-notifier',
    inheritedCls: Ext.baseCSSPrefix + 'bindinspector-inherited',
    
    initComponent: function() {
        var me = this,
            vm = this.vm;
        
        this.title = 'VM - ' + vm.view;
        
        this.store = {
            model: this.Model,
            root: {
                text: 'Root',
                expanded: true,
                children: this.setupData(vm.data, vm.rootStub)
            }
        };
        this.columns = [{
            flex: 1,
            xtype: 'treecolumn',
            dataIndex: 'name',
            text: 'Name',
            renderer: this.renderName
        }, {
            flex: 1,
            dataIndex: 'value',
            text: 'Value',
            scope: this,
            renderer: Ext.app.bindinspector.Util.valueRenderer
        }, {
            xtype: 'booleancolumn',
            dataIndex: 'isLoading',
            text: 'Loading',
            trueText: 'Yes',
            falseText: 'No'
        }, {
            dataIndex: 'cumulativeBindCount',
            text: 'Cumulative Bind Count'
        }, {
            dataIndex: 'bindCount',
            text: 'Direct Bind Count'
        }, {
            text: 'Status',
            scope: this,
            renderer: this.renderStatus
        }];
        this.callParent();
    },
    
    dataOnlyNode: 'This item contains data but has nothing requesting the value',
    stubOnlyNode: 'This item has the value requested but no data backing it',
    
    renderName: function(v, meta, rec) {
        if (rec.get('inherited')) {
            v = '<span class="' + this.inheritedCls + '">' + v + '</span>';
        }
        return v;
    },
    
    renderStatus: function(v, meta, rec) {
        var data = rec.get('hasData'),
            stub = rec.get('hasStub'),
            cls = this.notifierCls;
        
        v = '';
        if (data && (!stub || rec.get('cumulativeBindCount') === 0)) {
            v += '<div data-qtip="' + this.dataOnlyNode + '" class="' + cls + ' dataOnly"></div>';
        } else if (stub && !data) {
            v += '<div data-qtip="' + this.stubOnlyNode + '" class="' + cls + ' stubOnly"></div>';
        }
        return v;
    },
    
    setupData: function(data, stub, inherited) {
        var merged = {},
            out = [],
            item, children, stubChild, key, stopDigging, linkInfo;
        
        if (data && Ext.isObject(data)) {
            if (data.isModel) {
                data = data.data;
                // prevent looping any deeper over the model
                stopDigging = true;
            } else if (data.isStore) {
                stopDigging = true;
                data = null;
            }
            if (data) {
                for (key in data) {
                    item = {
                        name: key,
                        value: data[key],
                        inherited: Ext.isDefined(inherited) ? inherited : !data.hasOwnProperty(key),
                        hasData: true
                    };
                    stubChild = Ext.app.bindinspector.Util.getChildStub(key, stub);
                    if (stubChild) {
                        item.hasStub = true;
                        item.isLoading = stubChild.isLoading;
                        item.bindCount = stubChild.bindCount;
                        item.cumulativeBindCount = stubChild.cumulativeBindCount;
                        item.stub = stubChild;
                    }
                    merged[key] = item;
                }
            }
        }
        
        if (stub) {
            children = stub.children;
            for (key in children) {
                stubChild = children[key];
                item = merged[key];
                if (!item) {
                    item = {
                        name: key,
                        value: undefined,
                        inherited: false,
                        hasData: false,
                        hasStub: true,
                        isLoading: stubChild.isLoading,
                        bindCount: stubChild.bindCount,
                        cumulativeBindCount: stubChild.cumulativeBindCount,
                        stub: stubChild
                    };
                    linkInfo = stubChild.linkInfo;
                    if (linkInfo && linkInfo.sameTarget) {
                        item.value = linkInfo.value;
                        // Fudge having data, since we don't want to show an icon
                        // for all links
                        item.hasData = item.value !== undefined;
                    }
                    merged[key] = item;
                }
            }
        }
        
        for (key in merged) {
            item = merged[key];
            if (!stopDigging) {
                item.children = this.setupData(item.value, item.stub, item.inherited);
            }
            delete item.stub;
            if (item.children && item.children.length) {
                item.expanded = true;
                item.leaf = false;
            } else {
                item.leaf = true;
            }
            out.push(merged[key]);
        }
        
        return out;
    }
}, function() {
    this.prototype.Model = Ext.define(null, {
        extend: 'Ext.data.TreeModel',
        fields: ['name', 'value', 'inherited', 'hasData', 'hasStub', 'isLoading', 'bindCount', 'cumulativeBindCount']
    });
});