/**
 * This class manages one side of a `Matrix`.
 * @private
 */
Ext.define('Ext.data.session.MatrixSide', {
    requires: [
        'Ext.data.session.MatrixSlice'
    ],

    /**
     * @property {Ext.data.session.MatrixSide} inverse
     * Reference to the opposite side of the matrix.
     * @readonly
     */

    constructor: function (matrix, index, role) {
        var me = this;

        /**
         * @property {Ext.data.session.Matrix} matrix
         * @readonly
         */
        me.matrix = matrix;

        /**
         * @property {Number} index
         * Either 0 or 1 which is the index of our id value in an association entry.
         * @readonly
         */
        me.index = index;

        /**
         * @property {Ext.data.schema.Role} role
         * The role for this side of the matrix.
         * @readonly
         */
        me.role = role;

        /**
         * @property {Object} slices
         * Keyed by the id for this side of the matrix to yield a `Slice`.
         * @readonly
         */
        me.slices = {};
    },

    get: function (id1, id2) {
        var me = this,
            slices = me.slices,
            slice = slices[id1] ||
                   (slices[id1] = new Ext.data.session.MatrixSlice(me, id1));

        return (id2 || id2 === 0) ? slice.members[id2] : slice;
    },

    update: function (id1, id2, state) {
        var slice = this.get(id1);
        return slice.update(id2, state);
    }
});
