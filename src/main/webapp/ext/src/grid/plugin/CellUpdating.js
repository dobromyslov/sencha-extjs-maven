/**
 * This plugin enhances the performance of rapid, repeated grid cell updates by eliminating as much as possible
 * the overhead associated with such updates.
 *
 * This imposes a couple of slight restrictions upon the usage of the grid.
 *
 * * The grid's layout state is not recalculated upon update, meaning that the update SHOULD not change
 * the "shape" of the data, for example expanding the height of cells which may require layout recalulations
 * due to the fact that it *may* trigger the creation of a vertical scrollbar which then makes the grid view narrower
 * (on browsers which show space-consuming scrollbars) which will mean that the column widths may need recalculating.
 *
 * * The column renderer and column updater methods are only passed the following parameters:
 *    * cell
 *    * value
 *    * record
 *
 * Note that if performing rapid data updates, then to get the best results by avoiding too frequent browser style recalculations,
 * layout recalculations and painting operations, you should configure your grid with {@link Ext.table.Panel#throttledUpdate}: `true`
 * which will mean that the view will be updated at {@link Ext.view.AbstractView#updateFPS} frames per second instead of on every cell change.
 */
Ext.define('Ext.grid.plugin.CellUpdating', {
    alias: 'plugin.cellupdating',
    extend: 'Ext.AbstractPlugin',
    lockableScope: 'both',

    requires: [
        'Ext.grid.column.Column',
        'Ext.view.Table'
    ],

    /**
     * @cfg {String} [highlightClass]
     * A CSS class name to be applied to modified cells to highlight changed state which is removed after a
     * {@link #unhighlightDelay configurable} amount of time.
     *
     */

    /**
     * @cfg {Number} [unhighlightDelay=1000]
     * Number of milliseconds to leave the {@link #highlight} class on a modified cell before restoring it to default state.
     */
    unhighlightDelay: 1000,

    constructor: function(cfg) {
        var me = this,
            grid = cfg.cmp,
            viewCfg = grid.viewConfig || (grid.viewConfig = {}),
            viewxHooks = viewCfg.xhooks || (viewCfg.xhooks = {});

        // override the onUpdate method of the client view with an inline override
        viewxHooks.handleUpdate = me.handleRecordUpdate;

        me.callParent(arguments);
     },

    /**
     * This method is injected into the client grid's {@link Ext.table.View view} to take over responsibility
     * for updating the view upon record modification.
     *
     * This method usually calls the {@link Ext.grid.column.Column#renderer column renderer} for the modified fields
     * and replaces the content of the grid's cell with the resulting string. If the resulting string is to be
     * interprested as HTML and not plain text, then the column must be configured with
     *
     *    producesHTML: true
     *
     * This is so that the overhead of parsing and inserting HTML can be avoided if all that is required is changing a textual value.
     *
     * If replacing the HTML within a cell is not required (for example if there is complex content), then the
     * column's `updater` method will be called if present.
     *
     * To make use of this, configure your column as follows:
     *
     *    {
     *        width: 200,
     *        text: '% complete',
     *        dataIndex: 'pctComplete',
     *
     *        // Initial render; output the sized div
     *        renderer: function(value) {
     *            return '<div style="background-color:green;height:15px;width:' + value + '%"></div>';
     *        },
     *
     *        // When used by CellUpdating plugin, update the width of the progress bar to reflect %age completed
     *        updater: function(cell, value, dataObject, record) {
     *            cell.style.width = value + '%';
     *        }
     *    }
     */
    handleRecordUpdate : function(store, record, operation, changedFieldNames) {
        var me = this,
            ownerCt = me.ownerCt,
            columns = ownerCt.visibleColumnManager.getColumns(),
            row = me.getNodeByRecord(record),
            i, len, column, fieldName, value, cell, defaultRenderer, scope;

        // Buffered rendering might mean that there is no view row for the record
        if (!row) {
            return;
        }

        // Flyweight for manipulation of the update cell
        if (!me.cellFly) {
            me.cellFly = new Ext.dom.Fly();
        }

        // Loop through the grid's columns'
        for (i = 0, len = columns.length; i < len; i++) {
            column = columns[i];

            // The dataIndex of the column is the field name
            fieldName = column.dataIndex;

            // If the field is among the list of changed fields, then call its renderer to create the rendered value
            if (!changedFieldNames || Ext.Array.indexOf(changedFieldNames, fieldName) !== -1) {
                value = record.get(fieldName);
                cell = row.firstChild.firstChild.childNodes[i];

                // Mark the field's dirty status if we are configured to do so (defaults to true)
                if (me.markDirty) {
                    me.cellFly.attach(cell);
                    if (record.isModified(column.dataIndex)) {
                        me.cellFly.addCls(me.dirtyCls);
                    } else {
                        me.cellFly.removeCls(me.dirtyCls);
                    }
                }

                defaultRenderer = column.usingDefaultRenderer;
                scope = defaultRenderer ? column : column.scope;

                // Call the column updater which gets passed the TD element
                if (column.updater) {
                    Ext.callback(column.updater, scope, [cell, value, record, me], 0, column, ownerCt);
                }
                else {
                    if (column.renderer) {
                        value = Ext.callback(column.renderer, scope,
                                [value, null, record, 0, 0, me.dataSource, me], 0, column, ownerCt);
                    }

                    // Update the value of the cell's inner in the best way.
                    // We only use innerHTML of the cell's inner DIV if the renderer produces HTML
                    // Otherwise we change the value of the single text node within the inner DIV
                    if (column.producesHTML) {
                        cell.childNodes[0].innerHTML = value;
                    } else {
                        cell.childNodes[0].childNodes[0].data = value;
                    }
                }

                // Add the highlight class if there is one
                if (me.highlightClass) {
                    Ext.fly(cell).addCls(me.highlightClass);

                    // Start up a DelayedTask which will purge the changedCells stack, removing the highlight class
                    // after the expiration time
                    if (!me.changedCells) {
                        me.self.prototype.changedCells = [];
                        me.prototype.clearChangedTask = new Ext.util.DelayedTask(me.clearChangedCells, me.prototype);
                        me.clearChangedTask.delay(me.unhighlightDelay);
                    }

                    // Post a changed cell to the stack along with expiration time
                    me.changedCells.push({
                        cell: cell,
                        cls: me.highlightClass,
                        expires: Ext.Date.now() + 1000
                    });
                }
            }
        }
        // Coalesce any layouts which happen due to any itemupdate handlers (eg Widget columns).
        Ext.suspendLayouts();

        // Since we don't actually replace the row, we need to fire the event with the old row
        // because it's the thing that is still in the DOM
        me.fireEvent('itemupdate', record, me.store.indexOf(record), row);

        // Ensure any layouts queued by itemupdate handlers are executed.
        Ext.resumeLayouts(true);
    },

    clearChangedCells: function() {
        var me = this,
            now = Ext.Date.now(),
            changedCell;

        for (var i = 0, len = me.changedCells.length; i < len; ) {
            changedCell = me.changedCells[i];
            if (changedCell.expires <= now) {
                Ext.fly(changedCell.cell).removeCls(changedCell.highlightClass);
                Ext.Array.erase(me.changedCells, i, 1);
                len--;
            } else {
                break;
            }
        }

        // Keep repeating the delay until all highlighted cells have been cleared
        if (len) {
            me.clearChangedTask.delay(me.unhighlightDelay);
        }
    }
});
