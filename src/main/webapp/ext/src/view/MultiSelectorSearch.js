/**
 * This component provides a grid holding selected items from a second store of potential
 * members. The `store` of this component represents the selected items. The `searchStore`
 * represents the potentially selected items.
 *
 * The default view defined by this class is intended to be easily replaced by deriving a
 * new class and overriding the appropriate methods. For example, the following is a very
 * different view that uses a date range and a data view:
 *
 *      Ext.define('App.view.DateBoundSearch', {
 *          extend: 'Ext.view.MultiSelectorSearch',
 *
 *          makeDockedItems: function () {
 *              return {
 *                  xtype: 'toolbar',
 *                  items: [{
 *                      xtype: 'datefield',
 *                      emptyText: 'Start date...',
 *                      flex: 1
 *                  },{
 *                      xtype: 'datefield',
 *                      emptyText: 'End date...',
 *                      flex: 1
 *                  }]
 *              };
 *          },
 *
 *          makeItems: function () {
 *              return [{
 *                  xtype: 'dataview',
 *                  itemSelector: '.search-item',
 *                  selType: 'rowselection',
 *                  store: this.store,
 *                  autoScroll: true,
 *                  tpl:
 *                      '<tpl for=".">' +
 *                          '<div class="search-item">' +
 *                              '<img src="{icon}">' +
 *                              '<div>{name}</div>' +
 *                          '</div>' +
 *                      '</tpl>'
 *              }];
 *          },
 *
 *          getSearchStore: function () {
 *              return this.items.getAt(0).getStore();
 *          },
 *
 *          selectRecords: function (records) {
 *              var view = this.items.getAt(0);
 *              return view.getSelectionModel().select(records);
 *          }
 *      });
 */
Ext.define('Ext.view.MultiSelectorSearch', {
    extend: 'Ext.panel.Panel',

    xtype: 'multiselector-search',

    layout: 'fit',

    floating: true,
    resizable: true,
    minWidth: 200,
    minHeight: 200,
    border: true,

    /**
     * @cfg {String} searchText
     * This text is displayed as the "emptyText" of the search `textfield`.
     */
    searchText: 'Search...',

    initComponent: function () {
        var me = this,
            owner = me.owner,
            items = me.makeItems(),
            grid, i, item, records, store;

        me.dockedItems = me.makeDockedItems();
        me.items = items;

        store = Ext.data.StoreManager.lookup(me.store);

        for (i = items.length; i--; ) {
            if ((item = items[i]).xtype === 'grid') {
                item.store = store;
                item.isSearchGrid = true;
                item.selModel = item.selModel || {
                    selType: 'checkboxmodel',
                    pruneRemoved: false,
                    mode: 'SIMPLE',
                    listeners: {
                        selectionchange: 'onSelectionChange',
                        scope: me
                    }
                };

                Ext.merge(item, me.grid);

                if (!item.columns) {
                    item.hideHeaders = true;
                    item.columns = [{
                        flex: 1,
                        dataIndex: me.field
                    }];
                }

                break;
            }
        }

        me.callParent();

        /**
         * @property {Ext.form.field.Text} searchField
         * This component is the `textfield` that contains the user's search criteria. This
         * component's `change` event updates a filter applied to the `getSearchStore` to
         * filter the result.
         *
         * This component is produced by `makeDockedItems` but is retrieved by searching
         * for the child with the `isSearchField` set to `true`. It is not required that
         * this field be present.
         * @readonly
         */
        me.searchField = me.down('[isSearchField]');

        /**
         * @property {Ext.grid.Panel} searchGrid
         * This property holds the grid that displays search results. The only use for this
         * grid is to retrieve it's `store` in the `getSearchStore` method. This component
         * is found by its `isSearchGrid` property being true. If the view is modified such
         * that no suitable grid exists, the `getSearchStore` method must be overridden as
         * well.
         * @readonly
         */
        me.searchGrid = me.down('[isSearchGrid]');

        records = me.getOwnerStore().getRange();
        if (!owner.convertSelectionRecord.$nullFn) {
            for (i = records.length; i--; ) {
                records[i] = owner.convertSelectionRecord(records[i]);
            }
        }

        if (store.isLoading() || (store.loadCount === 0 && !store.getCount())) {
            store.on('load', function() {
                if (!me.isDestroyed) {
                    me.selectRecords(records);
                }
            }, null, {single: true});
        } else {
            me.selectRecords(records);
        }
    },

    getOwnerStore: function() {
        return this.owner.getStore();
    },

    afterShow: function () {
        var searchField = this.searchField;

        this.callParent(arguments);

        if (searchField) {
            searchField.focus();
        }
    },

    /**
     * Returns the store that holds search results. By default this comes from the
     * "search grid". If this aspect of the view is changed sufficiently so that the
     * search grid cannot be found, this method should be overridden to return the proper
     * store.
     * @return {Ext.data.Store}
     */
    getSearchStore: function () {
        return this.searchGrid.getStore();
    },

    makeDockedItems: function () {
        return [{
            xtype: 'textfield',
            dock: 'top',
            hideFieldLabel: true,
            isSearchField: true,
            emptyText: this.searchText,
            listeners: {
                change: 'onSearchChange',
                scope: this,
                buffer: 300
            }
        }];
    },

    makeItems: function () {
        return [{
            xtype: 'grid',
            plugins: {
                ptype: 'bufferedrenderer',
                trailingBufferZone: 2,
                leadingBufferZone: 2
            },
            viewConfig: {
                deferEmptyText: false,
                emptyText: 'No results.'
            }
        }];
    },

    selectRecords: function (records) {
        return this.searchGrid.getSelectionModel().select(records);
    },

    search: function (text) {
        var me = this,
            filter = me.searchFilter,
            filters = me.getSearchStore().getFilters();

        if (text) {
            filters.beginUpdate();

            if (filter) {
                filter.setValue(text);
            } else {
                me.searchFilter = filter = new Ext.util.Filter({
                    id: 'search',
                    property: me.field,
                    value: text
                });
            }

            filters.add(filter);

            filters.endUpdate();
        } else if (filter) {
            filters.remove(filter);
        }
    },

    privates: {
        onSearchChange: function (searchField) {
            this.search(searchField.getValue());
        },

        onSelectionChange: function (selModel, selection) {
            var owner = this.owner,
                store = owner.getStore(),
                data = store.data,
                remove = 0,
                map = {},
                add, i, id, record;

            for (i = selection.length; i--; ) {
                record = selection[i];
                id = record.id;
                map[id] = record;

                if (!data.containsKey(id)) {
                    (add || (add = [])).push(owner.convertSearchRecord(record));
                }
            }

            for (i = data.length; i--; ) {
                record = data.getAt(i);
                if (!map[record.id]) {
                    (remove || (remove = [])).push(record);
                }
            }

            if (add || remove) {
                data.splice(data.length, remove, add);
            }
        }
    }
});
