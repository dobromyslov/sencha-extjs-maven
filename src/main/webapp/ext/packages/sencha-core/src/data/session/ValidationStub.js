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
Ext.define('Ext.data.session.ValidationStub', {
    extend: 'Ext.data.session.AbstractStub',

    isValidationStub: true,

    entity: null,

    lastGeneration: undefined,

    validation: null,

    constructor: function (session, name, ref) {
        var me = this;

        // For this stub the owner is the session
        me.callParent([ session, name + '/validation' ]);

        Ext.apply(me, ref);

        // We watch the entity with the foreign key first (so we can get the FK value):
        me.entityBinding = session.bind({
            reference: me.entityType.entityName,
            id: me.entityId
        }, me.onEntity, me);
        
    },

    destroy: function () {
        var me = this;

        me.entityBinding = Ext.destroy(me.entityBinding);
    },

    collect: function() {
        return this.callParent() + (this.entityBinding ? 1 : 0);
    },

    getRawValue: function () {
        return this.validation;
    },

    isLoading: function () {
        var binding = this.entityBinding;
        return binding && binding.isLoading();
    },

    /**
     * This method is called when we first receive the entity from which we associated as
     * well as when that entity changes in some way.
     * @private
     */
    onEntity: function (entity) {
        this.entity = entity;
        if (!this.scheduled) {
            this.schedule();
        }
    },

    react: function () {
        var me = this,
            entity = me.entity,
            validation = me.validation,
            generation;

        if (entity) {
            if (validation) {
                validation.refresh();
            } else {
                me.validation = validation = entity.getValidation();
            }

            if (me.lastGeneration === (generation = validation.generation)) {
                return;
            }

            me.lastGeneration = generation;
        } else if (validation) {
            me.validation = null;
        } else {
            // We have no entity (hence no validation) now and previously so nothing to
            // do here...
            return;
        }

        me.callParent(); // schedules bindings
    },

    sort: function () {
        this.callParent();

        var binding = this.entityBinding;
        if (binding) {
            this.scheduler.sortItem(binding);
        }
    }
});
