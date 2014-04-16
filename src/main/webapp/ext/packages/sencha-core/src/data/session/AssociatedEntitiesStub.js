/**
 * This class manages an association of multiple entities to another in a `Session`.
 * 
 * The `role` given to this instance is that of the entity referenced by the foreign key,
 * so for example the "orderItems" role of the Order entity. The `entityId` we have is
 * that of the Order so we fetch all OrderItems with the appropriate foreign key value.
 * 
 * It is possible that the association has no defining foreign key which simply means the
 * entities must be delivered as a unit somehow.
 * 
 * @private
 */
Ext.define('Ext.data.session.AssociatedEntitiesStub', {
    extend: 'Ext.data.session.AbstractStub',

    isAssociationStub: true,
    isForeignKeyStub: true,

    firstTick: true,

    constructor: function (session, name, ref) {
        var me = this,
            schema = session.getSchema(),
            data = ref && ref.data,
            from, store, role, peek;

        // For this stub the owner is the session
        me.callParent([ session, name ]);

        Ext.apply(me, ref);

        from = me.entityId;
        role = me.role;
        peek =  session.peekEntityStub(role.inverse.cls, from);
        if (peek) {
            // May be loading, getValue() will return null in that case
            from = peek.getValue() || from;
        }

        me.store = store = schema.createAssociationStore(session, role, from, data);

        store.$stub = me;
        if (from.isEntity) {
            from[schema.getNamer().storeName(role.role)] = store;
            me.entity = from;
        }

        if (data) {
            me.firstTick = false;
        }
        me.schedule();
    },

    getRawValue: function () {
        return this.store;
    },

    isLoading: function () {
        return this.firstTick || this.store.isLoading();
    },

    onLoad: function () {
        this.react();
    },

    react: function () {
        var me = this,
            store = me.store;

        if (me.firstTick) {
            me.firstTick = false;
            if (!store.loadCount) {
                store.load({
                    callback: me.onLoad,
                    scope: me
                });
            }
        } else {
            me.callParent();
        }
    }
});
