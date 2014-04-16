Ext.define('Ext.data.operation.Destroy', {
    extend: 'Ext.data.operation.Operation',
    alias: 'data.operation.destroy',
    
    action: 'destroy',

    isDestroyOperation: true,

    order: 30,

    foreignKeyDirection: -1,

    doProcess: function(/* resultSet, request, response */) {
        var clientRecords = this.getRecords(), 
            clientLen = clientRecords.length,
            i;
        
        for (i = 0; i < clientLen; ++i) {
            clientRecords[i].setErased();
        }
    },
    
    doExecute: function() {
        return this.getProxy().destroy(this);
    },

    getRecordData: function (record, operation) {
        var data = {},
            idField = record.idField,
            nameProperty = this.getNameProperty() || 'name';

        data[idField[nameProperty]] = record.id;

        return data;
    }
});
