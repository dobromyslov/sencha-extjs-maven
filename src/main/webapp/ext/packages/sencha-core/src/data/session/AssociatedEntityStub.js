/**
 * This class manages an association from one entity to another in a `Session`.
 * 
 * The `role` given to this instance is that of the entity with the foreign key, so for
 * example the "creator" role of the Ticket entity. The `entityId` we have is that of the
 * Ticket so we need to bind to:
 * 
 *      {
 *          reference: Ticket,
 *          id: entityId
 *      }
 *
 * Then when we receive the Ticket entity, we bind to:
 * 
 *      {
 *          reference: User,
 *          id: ticket.data.creatorId
 *      }
 * 
 * It is possible that the association has no defining foreign key which simply means the
 * entities must be delivered as a unit somehow.
 * 
 * @private
 */
Ext.define('Ext.data.session.AssociatedEntityStub', {
    extend: 'Ext.data.session.AbstractStub',

    isAssociationStub: true,
    isAssociatedEntityStub: true,

    assocBinding: null,

    entity: null,

    lastId: undefined,

    record: null,

    constructor: function (session, name, ref) {
        var me = this;

        // For this stub the owner is the session
        me.callParent([ session, name ]);

        Ext.apply(me, ref);

        // This is something like the "creatorId" field of the Ticket entity (or null if
        // there is no FK):
        me.foreignKey = me.role.association.field;

        // We watch the entity with the foreign key first (so we can get the FK value):
        me.entityBinding = session.bind({
            reference: me.role.inverse.type,
            id: me.entityId
        }, me.onEntity, me);
        
    },

    destroy: function () {
        var me = this,
            assocBinding = me.assocBinding,
            entityBinding = me.entityBinding;
        
        if (assocBinding) {
            assocBinding.destroy();
        }
    
        if (entityBinding) {
            entityBinding.destroy();
        }

        me.assocBinding = me.entityBinding = null;
        me.callParent();
    },

    bind: function() {
        var binding = this.callParent(arguments);
        // Once we have a record, the instance will never change here. Any change really
        // means something underneath the record changed
        binding.deep = true;
        return binding;
    },

    getRawValue: function () {
        return this.record;
    },

    isLoading: function () {
        var me = this,
            assocBinding = me.assocBinding;

        if (me.foreignKey) {
            // If we have a foreignKey then we are loading up until we create assocBinding
            // and it achieves loaded state.
            return !assocBinding || assocBinding.isLoading();
        }

        // With no FK we have to rely on the property on me.entity, so we have to see
        // if it is loading.
        return me.entityBinding.isLoading();
    },

    /**
     * This method is called when we first receive the entity from which we associated as
     * well as when that entity changes in some way.
     * @private
     */
    onEntity: function (entity) {
        var me = this,
            session = me.getSession(),
            foreignKey = me.foreignKey,
            role = me.role,
            assocBinding = me.assocBinding,
            associatedId;

        if (!(me.entity = entity)) {
            // No entity from which to associate so the result is null. Perhaps there is
            // no entity by this id.
            me.push(null);
        } else if (foreignKey) {
            associatedId = entity.get(foreignKey.name);
            if (associatedId === undefined) {
                // promote undefined to null so our initial lastId won't be === to it
                associatedId = null;
            }

            if (me.lastId !== associatedId) {
                // The foreign key value has changed since last we met so we destroy any
                // existing assocBinding and bind to the associated entity with this id.
                if (assocBinding) {
                    assocBinding.destroy();
                }

                me.assocBinding = session.bind({
                    reference: role.type,
                    id: (me.lastId = associatedId) // update lastId
                }, me.push, me);
            }
        } else {
            me.push(entity[role.role]);
        }
    },

    push: function (record) {
        var me = this;

        if (me.record || record) {
            // The only time we can avoid scheduling a binding callback is if we are null
            // now and we were null already...

            me.entity[me.role.role] = me.record = record || null;

            if (!me.scheduled) {
                me.schedule();
            }
        }
    },

    sort: function () {
        var me = this,
            assocBinding = me.assocBinding,
            entityBinding = me.entityBinding,
            scheduler = me.scheduler;

        if (entityBinding) {
            scheduler.sortItem(entityBinding);
        }
        if (assocBinding) {
            scheduler.sortItem(assocBinding);
        }

        me.callParent();
    }
});
