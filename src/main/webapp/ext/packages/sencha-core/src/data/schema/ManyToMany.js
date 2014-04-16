/**
 * This relationship describes the case where any one entity of one type may relate to any
 * number of entities of another type, and also in the reverse.
 * 
 * This form of association cannot store id's in the related entities since that would
 * limit the number of related entities to one for the entity with the foreign key. Instead,
 * these relationships are typically implemented using a so-called "matrix" table. This
 * table typically has two columns to hold the id's of a pair of related entities. This
 * pair of id's is unique in the matrix table.
 * 
 * # Declaration Forms
 * 
 *      // Fully spelled out - all properties are their defaults:
 *      
 *      Ext.define('App.models.Group', {
 *          extend: 'Ext.data.Model',
 *          
 *          manyToMany: {
 *              UserGroups: {
 *                  type: 'User',
 *                  role: 'users',
 *                  field: 'userId',
 *                  right: {
 *                      field: 'groupId',
 *                      role: 'groups'
 *                  }
 *              }
 *          }
 *      });
 *
 *      // Eliminate "right" object and use boolean to indicate Group is on the
 *      // right. By default, left/right is determined by alphabetic order.
 *      
 *      Ext.define('App.models.Group', {
 *          extend: 'Ext.data.Model',
 *          
 *          manyToMany: {
 *              UserGroups: {
 *                  type: 'User',
 *                  role: 'users',
 *                  field: 'userId',
 *                  right: true
 *              }
 *          }
 *      });
 *
 *      // Eliminate object completely and rely on string to name the other type. Still
 *      // keep Group on the "right".
 *      
 *      Ext.define('App.models.Group', {
 *          extend: 'Ext.data.Model',
 *          
 *          manyToMany: {
 *              UserGroups: 'User#'   // '#' is on the side (left or right) of Group
 *          }
 *      });
 *
 *      // Remove explicit matrix name and keep Group on the "right". Generated matrixName
 *      // remains "UserGroups".
 *      
 *      Ext.define('App.models.Group', {
 *          extend: 'Ext.data.Model',
 *          
 *          manyToMany: [
 *              'User#'
 *          ]
 *      });
 *
 *      // Minimal definition but now Group is on the "left" since "Group" sorts before
 *      // "User". Generated matrixName is now "GroupUsers".
 *      
 *      Ext.define('App.models.Group', {
 *          extend: 'Ext.data.Model',
 *          
 *          manyToMany: [
 *              'User'
 *          ]
 *      });
 */
Ext.define('Ext.data.schema.ManyToMany', {
    extend: 'Ext.data.schema.Association',
    uses: [
        'Ext.data.session.MatrixStub'
    ],

    isManyToMany: true,

    isToMany: true,

    kind: 'many-to-many',

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

        createStub: function (session, id, options) {
            // Example 1:
            // 
            //      User -> Group
            //
            // Example 2:
            //
            //      Group -> User
            // 
            // Being as we are the UserGroups (or GroupUsers) association and the "role" is
            // either "User" or "Group", the association we desire depends on which side we
            // are coming from.
            return new Ext.data.session.MatrixStub(session, id, options);
        },

        /*
         * This method is called when records are added to the association store. If this
         * is happening as a side-effect of the underlying matrix update, we skip telling
         * the matrix what it already knows. Otherwise we need to tell the matrix of the
         * changes on this side so that they can be reflected on the other side.
         */
        onAddToMany: function (store, records) {
            if (!store.matrixUpdate) {
                store.matrixUpdate = 1;
                store.matrix.update(records, 1);
                store.matrixUpdate = 0;
            }
        },

        /*
         * This method is called when records are removed from the association store. The
         * same logic applies here as in onAddToMany with respect to the update that may
         * or may not be taking place on the underlying matrix.
         */
        onRemoveFromMany: function (store, records) {
            if (!store.matrixUpdate) {
                store.matrixUpdate = 1;
                store.matrix.update(records, -1);
                store.matrixUpdate = 0;
            }
        },

        onMatrixUpdate: function (matrixSlice, id, state) {
            var store = matrixSlice.store,
                index, record, entry;

            if (store && !store.loading && !store.matrixUpdate) {
                store.matrixUpdate = 1;

                index = store.data.indexOfKey(id);
                if (state < 0) {
                    if (index >= 0) {
                        store.remove([ index ]);
                    }
                } else if (index < 0) {
                    entry = store.session.data[store.role.type][id];
                    record = entry && entry.record;

                    if (record) {
                        store.add(record);
                    }
                    //<debug>
                    else {
                        // Cannot update User(10).groups - missing Group(42)
                        Ext.Error.raise('Cannot update ' + store.role.inverse.type + '(' +
                                        store.associatedEntityId + ').' + store.role.role +
                                        ' - missing ' + store.role.type + '(' + id + ')');
                    }
                    //</debug>
                }

                store.matrixUpdate = 0;
            }
        }
    },
    function () {
        var Left = this; // Left is created but ManyToMany may not yet be created

        Ext.ClassManager.onCreated(function () {
            Ext.data.schema.ManyToMany.prototype.Right = Ext.define(null, {
                extend: Left,
                left: false,
                side: 'right'
            });
        }, null, 'Ext.data.schema.ManyToMany');
    })
});
