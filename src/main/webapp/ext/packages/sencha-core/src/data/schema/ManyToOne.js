/**
 * This type of association describes the case where one entity is referenced by zero or
 * more other entities typically using a "foreign key" field.
 * 
 * The way this is defined is for one entity to have a field that holds the unique id (also
 * known as "Primary Key" or, more specifically, as the {@link Ext.data.Model#idProperty}
 * field) of the related entity. These fields have a {@link Ext.data.field.Field#reference}
 * in their definition. The value in the `reference` field of an entity instance holds the
 * value of the id of the related entity instance. Since many entities can hold the same
 * value in a `reference` field, this allows many entities to reference one entity.
 * 
 * Example 1:
 * 
 * OrderItem has a foreign key to Order.
 * 
 *      OrderItem -> Order
 * 
 * OrderItem is on the "left" and Order is on the "right". This is because the owner of
 * the foreign key is always on the "left". Many OrderItem's refer to one Order. The
 * default name of this association would be "Order_OrderItems".
 * 
 *      var Order_OrderItems = {
 *          name: 'Order_OrderItems',
 *          owner: Order_OrderItems.right,
 *          left: {
 *              cls: OrderItem,
 *              type: 'OrderItem',
 *              association: Order_OrderItems,
 *              left: true,
 *              owner: false,
 *              autoLoad: true,
 *              isMany: true,
 *              inverse: Order_OrderItems.right,
 *              role: 'orderItems'
 *          },
 *          right: {
 *              cls: Order,
 *              type: 'Order',
 *              association: Order_OrderItems,
 *              left: false,
 *              owner: true,
 *              autoLoad: true,
 *              isMany: false,
 *              inverse: Order_OrderItems.left,
 *              role: 'order'
 *          }
 *      };
 *      
 *      OrderItem.associations.order = Order_OrderItems.left;
 *      Order.associations.orderItems = Order_OrderItems.right;
 * 
 * Example 2:
 * 
 * Ticket entity has a "creator" backed by the creatorId foreign key. Like Order_OrderItems
 * this is a foreign-key based, many-to-one association. The Ticket entity has the foreign
 * key so it is the "left" and User is on the "right".
 * 
 *      var User_Creator_Tickets = {
 *          name: 'User_Creator_Tickets',
 *          owner: null,
 *          left: {
 *              cls: Ticket,
 *              type: 'Ticket',
 *              association: User_Creator_Tickets,
 *              left: true,
 *              owner: false,
 *              autoLoad: true,
 *              isMany: true,
 *              inverse: User_Creator_Tickets.right,
 *              role: 'creatorTickets',
 *              getterName: 'tickets'
 *          },
 *          right: {
 *              cls: User,
 *              type: 'User',
 *              association: User_Creator_Tickets,
 *              left: false,
 *              owner: false,
 *              autoLoad: true,
 *              isMany: false,
 *              inverse: User_Creator_Tickets.left,
 *              role: 'creator',
 *              getterName: 'getCreator'
 *          }
 *      };
 *      
 *      Ticket.associations.creator = User_Creator_Tickets.left;
 *      User.associations.creatorTickets = User_Creator_Tickets.right;
 */
Ext.define('Ext.data.schema.ManyToOne', {
    extend: 'Ext.data.schema.Association',
    uses: [
        'Ext.data.session.AssociatedEntitiesStub'
    ],

    isManyToOne: true,

    isToOne: true,

    kind: 'many-to-one',

    Left: Ext.define(null, {
        extend: 'Ext.data.schema.Role',

        isMany: true,

        createGetter: function() {
            var me = this;
            return function (data) {
                // 'this' refers to the Model instance inside this function
                return me.getAssociatedStore(this, data);
            };
        },

        createSetter: null, // no setter for an isMany side

        createStub: function (session, id, options) {
            // This role refers to Ticket (with the key), so we want to get tickets here, so in this case
            // we want to create multiple items.
            return new Ext.data.session.AssociatedEntitiesStub(session, id, options);
        },

        onAddToMany: function (store, records) {
            this.syncFK(records, store.associatedEntity || store.foreignKeyValue, false);
        },

        onRemoveFromMany: function (store, records) {
            this.syncFK(records, store.foreignKeyValue, true);
        },

        read: function(record, node, fromReader, readOptions) {
            var me = this,
                // We use the inverse role here since we're setting ourselves
                // on the other record
                key = me.inverse.role,
                result = me.callParent([ record, node, fromReader, readOptions ]),
                store, items, len, i;
            
            // Did the root exist in the data?
            if (result.getReadRoot()) {
                store = record[me.getterName](result.getRecords());
                items = store.data.items;
                len = items.length;

                for (i = 0; i < len; ++i) {
                    items[i][key] = record;
                }
            }
            
        }
    }),

    Right: Ext.define(null, {
        extend: 'Ext.data.schema.Role',

        left: false,
        side: 'right',

        createGetter: function() {
            // As the target of the FK (say "ticket" for the Comment entity) this
            // getter is responsible for getting the entity referenced by the FK value.
            var me = this;

            return function (options, scope) {
                // 'this' refers to the Comment instance inside this function
                return me.doGetFK(this, options, scope);
            };
        },
        
        createSetter: function() {
            var me = this;

            return function (rightRecord, options, scope) {
                // 'this' refers to the Comment instance inside this function
                return me.doSetFK(this, rightRecord, options, scope);
            };
        },

        createStub: function (session, id, options) {
            // This role refers to Creator (without a key), so we want to get a creator here, so in this case
            // we only want to create a single item.
            return new Ext.data.session.AssociatedEntityStub(session, id, options);
        },
        
        read: function(record, node, fromReader, readOptions) {
            var result = this.callParent([ record, node, fromReader, readOptions ]),
                other = result.getRecords()[0];

            if (other) {
                record[this.role] = other;
            }
        }
    })
});
