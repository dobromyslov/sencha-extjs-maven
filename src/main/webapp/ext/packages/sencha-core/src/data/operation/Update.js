Ext.define('Ext.data.operation.Update', {
    extend: 'Ext.data.operation.Operation',
    alias: 'data.operation.update',
    
    action: 'update',

    isUpdateOperation: true,

    order: 20,

    config: {
        recordCreator: Ext.identityFn
    },
    
    doExecute: function() {
        return this.getProxy().update(this);
    }
});
