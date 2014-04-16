/**
 * Manages a collection of widgets or components and binds them to grid cells.
 * @since 5.0.0
 */
Ext.define('Ext.grid.column.Widget', {
    extend: 'Ext.grid.column.Column',
    alias: 'widget.widgetcolumn',

    sortable: false,

    /**
     * @cfg {Object} renderer
     * @hide
     */

    /**
     * @cfg {Object} scope
     * @hide
     */
    
    /**
     * @cfg {Boolean} [stopSelection=true]
     * Prevent grid selection upon click on the widget.
     */
     stopSelection: true,
     
     preventUpdate: true,

     processEvent : function(type, view, cell, recordIndex, cellIndex, e, record, row) {
         var selector = view.innerSelector,
             target;
         
         if (this.stopSelection && type === 'click') {
             // Grab the target that matches the cell inner selector. If we have a target, then,
             // that means we either clicked on the inner part or the widget inside us. If 
             // target === e.target, then it was on the cell, so it's ok. Otherwise, inside so
             // prevent the selection from happening
             target = e.getTarget(selector);
             if (target && target !== e.target) {
                 return false;
             }
         }
     },

    beforeRender: function() {
        var me = this,
            widget;

        me.liveWidgets = {};
        me.cachedStyles = {};
        me.freeWidgetStack = [];
        
        me.listenerScopeFn = function(defaultScope) {
            return me.resolveListenerScope(defaultScope);
        };
        
        widget = me.getWidget();
        me.tdCls = widget.getTdCls();
        me.setupViewListeners(me.getView());
        me.callParent(arguments);
    },
    
    setupViewListeners: function(view) {
        var me = this;
        
        me.viewListeners = view.on({
            refresh: me.onViewRefresh,
            itemupdate: me.onItemUpdate,
            itemadd: me.onItemAdd,
            itemremove: me.onItemRemove,
            scope: me,
            destroyable: true
        });
    },

    // Cell must be left blank
    defaultRenderer: Ext.emptyFn,

    updater: function(cell, value, record) {
        var me = this,
            widget = me.liveWidgets[record.internalId];

        // Call the appropriate setter with this column's data field
        if (widget && widget.defaultBindProperty && me.dataIndex) {
            widget.setConfig(widget.defaultBindProperty, record.get(me.dataIndex));
        }
    },

    onResize: function(newWidth) {
        var me = this,
            liveWidgets = me.liveWidgets,
            view = me.getView(),
            cell = view.el.down(me.getCellInnerSelector()),
            id;

        if (view.all.getCount()) {
            // Subtract innerCell padding width
            newWidth -= parseInt(me.getCachedStyle(cell, 'padding-left'), 10) + parseInt(me.getCachedStyle(cell, 'padding-right'), 10);

            for (id in liveWidgets) {
                liveWidgets[id].setWidth(newWidth);
            }
        }
    },

    onAdded: function() {
        var view;
        
        this.callParent(arguments);

        view = this.getView();

        // If we are being added to a rendered HeaderContainer
        if (view) {
            this.setupViewListeners(view);
        }
    },

    onRemoved: function(isDestroying) {
        var me = this,
            liveWidgets = me.liveWidgets,
            viewListeners = me.viewListeners,
            id, widget;

        if (viewListeners) {
            viewListeners.destroy();
            this.viewListeners = null;
        }

        // If we are being removed, we have to move all widget elements into the detached body
        if (!isDestroying) {
            for (id in liveWidgets) {
                widget = liveWidgets[id];
                Ext.detachedBodyEl.dom.appendChild((widget.el || widget.element).dom);
            }
        }
        me.callParent(arguments);
    },

    onViewRefresh: function(view, records) {
        var me = this,
            rows = view.all,
            hasAttach = !!me.onWidgetAttach,
            cell,
            widget,
            el,
            width,
            recordId,
            itemIndex,
            recordIndex,
            record,
            id,
            oldWidgetMap = me.liveWidgets;

        me.liveWidgets = {};

        if (!me.hidden) {
            Ext.suspendLayouts();
            for (itemIndex = rows.startIndex, recordIndex = 0; itemIndex <= rows.endIndex; itemIndex++, recordIndex++) {
                record = records[recordIndex];
                if (record.isNonData) {
                    continue;
                }

                recordId = record.internalId;
                cell = view.getRow(rows.item(itemIndex)).cells[me.getVisibleIndex()].firstChild;

                // Attempt to reuse the existing widget for this record.
                widget = me.liveWidgets[recordId] = oldWidgetMap[recordId] || me.getWidget();
                delete oldWidgetMap[recordId];

                if (width === undefined) {
                    width = me.lastBox.width - parseInt(me.getCachedStyle(cell, 'padding-left'), 10) - parseInt(me.getCachedStyle(cell, 'padding-right'), 10);
                }

                Ext.fly(cell).empty();
                if (el = (widget.el || widget.element)) {
                    cell.appendChild(el.dom);
                    widget.setWidth(width);
                } else {
                    widget.width = width;
                    widget.render(cell);
                }
                // Call the appropriate setter with this column's data field
                if (widget.defaultBindProperty && me.dataIndex) {
                    widget.setConfig(widget.defaultBindProperty, records[recordIndex].get(me.dataIndex));
                }
                widget.$widgetRecord = record;
                widget.$widgetColumn = me;
                if (hasAttach) {
                    me.onWidgetAttach(widget, record);
                }
            }

            Ext.resumeLayouts(true);
        }

        // Free any unused widgets from the old live map.
        // Move them into detachedBody.
        for (id in oldWidgetMap) {
            widget = oldWidgetMap[id];
            widget.$widgetRecord = widget.$widgetColumn = null;
            me.freeWidgetStack.unshift(widget);
            Ext.detachedBodyEl.dom.appendChild((widget.el || widget.element).dom);
        }
    },

    onItemUpdate: function(record, recordIndex, oldItemDom) {
        var me = this,
            widget = me.liveWidgets[record.internalId];

        // Call the appropriate setter with this column's data field
        if (widget && widget.defaultBindProperty && me.dataIndex) {
            widget.setConfig(widget.defaultBindProperty, record.get(me.dataIndex));
        }
    },

    onItemAdd: function(records, index, items) {
        var me = this,
            view = me.getView(),
            hasAttach = !!me.onWidgetAttach,
            len = records.length, i,
            record,
            row,
            cell,
            widget,
            el,
            width;

        // Loop through all records added, ensuring that our corresponding cell in each item
        // has a Widget of the correct type in it, and is updated with the correct value from the record.
        if (!me.hidden) {
            for (i = 0; i < len; i++) {
                record = records[i];
                if (record.isNonData) {
                    continue;
                }
                
                row = view.getRowFromItem(items[i]);

                // May be a placeholder with no data row
                if (row) {
                    cell = row.cells[me.getVisibleIndex()].firstChild;
                    if (!width) {
                        width = me.lastBox.width - parseInt(me.getCachedStyle(cell, 'padding-left'), 10) - parseInt(me.getCachedStyle(cell, 'padding-right'), 10);
                    }
                    widget = me.liveWidgets[record.internalId] = me.getWidget();

                    // Render/move a widget into the new row
                    Ext.fly(cell).empty();
                    if (el = (widget.el || widget.element)) {
                        cell.appendChild(el.dom);
                        widget.setWidth(width);
                    }
                    else {
                        widget.width = width;
                        widget.render(cell);
                    }
                    // Call the appropriate setter with this column's data field
                    if (widget.defaultBindProperty && me.dataIndex) {
                        widget.setConfig(widget.defaultBindProperty, record.get(me.dataIndex));
                    }
                    widget.$widgetRecord = record;
                    widget.$widgetColumn = me;
                    if (hasAttach) {
                        me.onWidgetAttach(widget, record);
                    }
                }
            }
        }
    },

    onItemRemove: function(record, index, item) {
        var me = this,
            widget;

        // If there was a real record (collapsed placeholder will no longer be acessible)...
        // return ousted widget to free stack, and move its element to the detached body
        if (record && (widget = me.liveWidgets[record.internalId])) {
            delete me.liveWidgets[record.internalId];
            me.freeWidgetStack.unshift(widget);
            widget.$widgetRecord = widget.$widgetColumn = null;
            Ext.detachedBodyEl.dom.appendChild((widget.el || widget.element).dom);
        }
    },

    onDestroy: function() {
        var me = this,
            oldWidgetMap = me.liveWidgets,
            freeWidgetStack = me.freeWidgetStack,
            id, widget, i, len;

        for (id in oldWidgetMap) {
            widget = oldWidgetMap[id];
            widget.$widgetRecord = widget.$widgetColumn = null;
            delete widget.getWidgetRecord;
            delete widget.getWidgetColumn;
            widget.destroy();
        }
        
        for (i = 0; i < len; ++i) {
            freeWidgetStack[i].destroy();
        }
        
        me.freeWidgetStack = me.liveWidgets = null;
        
        me.callParent();
    },

    getCachedStyle: function(el, style) {
        return this.cachedStyles[style] || (this.cachedStyles[style] = Ext.fly(el).getStyle(style));
    },

    getWidget: function() {
        var me = this,
            result = me.freeWidgetStack.pop();

        if (!result) {
            result = Ext.widget(me.widget);
            result.resolveListenerScope = me.listenerScopeFn;
            result.getWidgetRecord = me.widgetRecordDecorator;
            result.getWidgetColumn = me.widgetColumnDecorator;
            result.dataIndex = me.dataIndex;
            result.measurer = me;
        }
        return result;
    },
    
    widgetRecordDecorator: function() {
        return this.$widgetRecord;
    },
    
    widgetColumnDecorator: function() {
        return this.$widgetColumn;
    }
});
