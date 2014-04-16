/**
 * This class manages one side of a `Matrix`.
 * @private
 */
Ext.define('Ext.data.session.MatrixSlice', {
    stub: null,

    constructor: function (side, id) {
        /**
         * @property {String/Number} id
         * The id of the interested entity. Based on whether this slice is on the "left"
         * or "right" of the matrix, this id identities the respective entity.
         * @readonly
         */
        this.id = id;

        /**
         * @property {Ext.data.session.MatrixSide} side
         * The side of the matrix to which this slice belongs.
         */
        this.side = side;

        /**
         * 
         */
        this.members = {};
    },

    attach: function (store) {
        //<debug>
        Ext.Assert.falsey(this.store, 'Store is already attached');
        //</debug>

        this.store = store;

        store.on({
            load: 'onStoreLoad',
            scope: this,
            single: true
        });
    },

    changeId: function (newId) {
        var me = this,
            oldId = me.id,
            side = me.side,
            slices = side.slices,
            slice = slices[oldId],
            members = slice.members,
            index = side.index,
            otherSlices = side.inverse.slices,
            assoc, otherId, otherMembers;

        me.id = newId;
        slices[newId] = slice;
        delete slices[oldId];

        for (otherId in members) {
            assoc = members[otherId];
            assoc[index] = newId;

            otherMembers = otherSlices[otherId].members;
            otherMembers[newId] = otherMembers[oldId];
            delete otherMembers[oldId];
        }
    },

    onStoreLoad: function (store) {
        this.update(store.data.items, 0);
    },

    update: function (recordsOrIds, state) {
        //<debug>
        if (!(recordsOrIds instanceof Array)) {
            Ext.Error.raise('Only array of records or record ids are supported');
        }
        //</debug>

        var me = this,
            MatrixSlice = Ext.data.session.MatrixSlice,
            side = me.side,
            assocIndex = side.index,
            length = recordsOrIds.length,
            id = me.id,
            members = me.members,
            otherSide = side.inverse,
            assoc, call, i, item, otherId, otherSlices, otherSlice, record;

        for (i = 0; i < length; ++i) {
            call = record = null;
            item = recordsOrIds[i];
            otherId = item.isEntity ? (record = item).id : item;

            if (record && record.phantom && record.dropped && state < 0) { // assoc DELETED
                delete members[otherId];
                otherSlice = otherSide[otherId];
                if (otherSlice) {
                    delete otherSlice.members[id];
                }
                call = 1;
            } else {
                if (!(assoc = members[otherId])) {
                    // Note - when we create a new matrix tuple we must catalog it on both
                    // sides of the matrix or risk losing it on only one side. To gather all
                    // of the tuples we need only visit one side.
                    assoc = [ otherId, otherId, state ];
                    assoc[assocIndex] = id;

                    members[otherId] = assoc;
                    if (!(otherSlice = (otherSlices = otherSide.slices)[otherId])) {
                        otherSlices[otherId] = otherSlice = new MatrixSlice(otherSide, otherId);
                    }
                    otherSlice.members[id] =  assoc;
                    call = 1;
                }
                //<debug>
                else if (state === 0) { // if (UNMODIFIED)
                    Ext.Assert.falsey(assoc[2], 'Invalid state change');
                }
                //</debug>
                else if (state !== assoc[2]) {
                    assoc[2] = state;
                    otherSlice = otherSide.slices[otherId];
                    // because the assoc exists the other side will have a slice
                    call = 1;
                }
            }

            if (call) {
                if (me.notify) {
                    me.notify.call(me.scope, me, otherId, state);
                }
                if (otherSlice && otherSlice.notify) {
                    otherSlice.notify.call(otherSlice.scope, otherSlice, id, state);
                }
            }
        }
    }
});
