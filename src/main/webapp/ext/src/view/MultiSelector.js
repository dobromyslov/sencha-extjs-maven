/**
 * This component provides a grid holding selected items from a second store of potential
 * members. The `store` of this component represents the selected items. The "search store"
 * represents the potentially selected items.
 */
Ext.define('Ext.view.MultiSelector', {
    extend: 'Ext.grid.Panel',

    xtype: 'multiselector',

    config: {
        field: 'name',

        /**
         * @cfg {Object} search
         * This object configures the search popup component. By default this contains the
         * `xtype` for a `Ext.view.MultiSelectorSearch` component and specifies `autoLoad`
         * for its `store`.
         */
        search: {
            xtype: 'multiselector-search',
            store: {
                autoLoad: true
            }
        }
    },

    removeRowText: '&#10006',
    removeRowTip: 'Remove this item',
    emptyText: 'Nothing selected',
    addToolText: 'Search for items to add',
    searchWidth: 200,
    searchHeight: 200,

    initComponent: function () {
        var me = this,
            emptyText = me.emptyText,
            store = me.getStore(),
            search = me.getSearch(),
            searchStore, model;

        //<debug>
        if (!search) {
            Ext.Error.raise('The search configuration is required for the multi selector');
        }
        //</debug>

        searchStore = search.store;
        if (searchStore.isStore) {
            model = searchStore.getModel();
        } else {
            model = searchStore.model;
        }

        if (!store) {
            me.store = store = {
                model: model
            };
        }

        if (emptyText && !me.viewConfig) {
            me.viewConfig = {
                deferEmptyText: false,
                emptyText: emptyText
            };
        }

        if (!me.columns) {
            me.hideHeaders = true;
            me.columns = [
                { dataIndex: me.getField(), flex: 1 },
                me.makeRemoveRowColumn()
            ];
        }

        me.callParent();
    },

    addTools: function () {
        this.addTool({
            type: 'plus',
            tooltip: this.addToolText,
            callback: 'onShowSearch',
            scope: this
        });
    },

    convertSearchRecord: Ext.identityFn,

    convertSelectionRecord: Ext.identityFn,

    makeRemoveRowColumn: function () {
        var me = this;

        return {
            width: 22,
            processEvent: me.processRowEvent.bind(me),
            renderer: me.renderRemoveRow,
            updater: Ext.emptyFn,
            scope: me
        };
    },

    processRowEvent: function (type, view, cell, recordIndex, cellIndex, e, record, row) {
        if (e.type !== 'click') {
            return;
        }

        if (Ext.fly(e.getTarget()).hasCls(Ext.baseCSSPrefix + 'multiselector-remove')) {
            this.store.remove(record);
        }
    },

    renderRemoveRow: function () {
        return '<span class="'+ Ext.baseCSSPrefix + 'multiselector-remove" ' +
               'data-qtip="'+ this.removeRowTip + '" role="button">' +
               this.removeRowText + '</span>';
    },

    beforeDestroy: function() {
        Ext.un({
            mousedown: 'onDismissSearch',
            scope: this
        });
        this.callParent();
    },

    privates: {
        onDismissSearch: function (e) {
            var searchPopup = this.searchPopup;

            if (searchPopup && !searchPopup.owns(e.getTarget())) {
                Ext.un({
                    mousedown: 'onDismissSearch',
                    scope: this
                });
                searchPopup.hide();
            }
        },

        onShowSearch: function (panel, tool) {
            var me = this,
                searchPopup = me.searchPopup;

            if (!searchPopup) {
                searchPopup = Ext.merge({
                    owner: me,
                    field: me.getField(),
                    floating: true,
                    width: me.searchWidth,
                    height: me.searchHeight
                }, me.getSearch());
                me.searchPopup = searchPopup = me.add(searchPopup);
            }

            searchPopup.showBy(tool, 'tl-tr?');
            Ext.on({
                mousedown: 'onDismissSearch',
                scope: me
            });
        }
    }
});
