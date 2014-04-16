/**
 * This class manages entities in a `Session`.
 * @private
 */
Ext.define('Ext.data.session.EntityStub', {
    extend: 'Ext.data.session.AbstractStub',

    isEntityStub: true,

    record: null,

    constructor: function (session, name, ref) {
        var me = this,
            record;

        // For this stub the owner is the session
        me.callParent([ session, name ]);

        // Ex: id = "12@User", entityType = App.models.User, entityId = "12"

        Ext.apply(me, ref);

        if (!(record = session.data[me.entityType.entityName][me.entityId].record)) {
            me.fetch();
        } else {
            me.set(record);
        }
    },

    destroy: function() {
        var me = this,
            record = me.record,
            fetchOperation = me.fetchOperation;
        
        if (record) {
            record.$stub = null;
        }
        if (fetchOperation) {
            fetchOperation.abort();
        }
        
        me.record = me.fetchOperation = null;
        
        me.callParent();
    },

    bind: function() {
        var binding = this.callParent(arguments);
        // The entity reference won't actually change, so any changes need to
        // track down and figure out if any bindings underneath changed
        binding.deep = true;
        return binding;
    },

    fetch: function () {
        var me = this,
            session = me.getSession();

        me.fetchOperation  = me.entityType.load(me.entityId, {
            success: me.onFetched,
            scope: me,
            recordCreator: session.recordCreator
        });
    },

    getDataObject: function () {
        return this.record;
    },

    getRawValue: function () {
        return this.record;
    },

    isLoading: function () {
        return !!this.fetchOperation ;
    },

    onFetched: function (record) {
        this.fetchOperation = null;
        this.set(record);
        this.schedule();
    },

    set: function (record) {
        this.record = record;

        if (record) {
            record.$stub = this;
        }
    }
});
