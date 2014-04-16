Ext.define('Ext.data.operation.Create', {
    extend: 'Ext.data.operation.Operation',
    alias: 'data.operation.create',
    
    action: 'create',

    isCreateOperation: true,

    order: 10,

    config: {
        recordCreator: Ext.identityFn
    },
    
    doExecute: function() {
        return this.getProxy().create(this);
    }
});
