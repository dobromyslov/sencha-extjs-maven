/**
 * This class manages a matrix association in a `Session`.
 * @private
 */
Ext.define('Ext.data.session.MatrixStub', {
    extend: 'Ext.data.session.AbstractStub',

    isAssociationStub: true,
    isMatrixStub: true,

    firstTick: true,

    constructor: function (session, name, ref) {
        var me = this,
            schema = session.getSchema(),
            associatedEntity, store;

        // For this stub the owner is the session
        me.callParent([ session, name ]);

        // Ex: id = "12@User:groups", entityType = App.models.User, entityId = "12",
        // role = App.models.User.associations.groups

        Ext.apply(me, ref);

        associatedEntity = me.associatedEntity;

        me.store = store = schema.createAssociationStore(session, me.role,
                                                         associatedEntity || me.entityId);

        store.$stub = me;

        // Defer initial load so that users can provide this data and avoid the ajax
        if (associatedEntity && associatedEntity.phantom) {
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
        var me = this;

        if (me.firstTick) {
            me.firstTick = false;
            me.store.load({
                callback: me.onLoad,
                scope: me
            });
        } else {
            me.callParent();
        }
    }
});
