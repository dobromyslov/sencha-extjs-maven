Ext.define('Ext.app.bindinspector.Container', {
    extend: 'Ext.container.Container',
    alias: 'widget.bindinspector-container',
    requires: [
        'Ext.layout.container.Border',
        'Ext.tab.Panel',
        'Ext.app.bindinspector.ComponentDetail',
        'Ext.app.bindinspector.ComponentList',
        'Ext.app.bindinspector.Environment',
        'Ext.app.bindinspector.Util',
        'Ext.app.bindinspector.ViewModelDetail',
        'Ext.app.bindinspector.noconflict.BaseModel'
    ],
    
    initComponent: function() {      
        Ext.data.schema.Schema.get('Ext_app_bindinspector').clear();
        this.items = [{
            xtype: 'bindinspector-componentlist',
            reference: 'componentList',
            region: 'west',
            width: 300,
            split: true,
            collapsible: true,
            components: this.env.rootComponents,
            listeners: {
                scope: this,
                componentselect: this.onComponentSelect
            }
        }, {
            xtype: 'tabpanel',
            region: 'center',
            reference: 'tabs'
        }];
        this.callParent();
    },

    isBindInspector: true,
    referenceHolder: true,
    
    layout: 'border',

    onComponentSelect: function(tree, rec)  {
        var id = rec.getId(),
            tabId = 'bindtab-' + id,
            tabs = this.getReference('tabs'),
            tab = tabs.items.get(tabId);
        
        if (!tab) {
            tab = tabs.add({
                xtype: 'bindinspector-componentdetail',
                env: this.env,
                itemId: tabId,
                title: id,
                closable: true,
                component: this.env.getCmp(id)
            });
        }
        
        tabs.setActiveTab(tab);
    }
});