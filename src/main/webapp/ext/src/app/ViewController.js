/**
 * A view controller is a controller that can be attached to a specific view
 * instance so it can manage the view and it's child components. Each instance of the view
 * will have a new view controller, so the instances are isolated.
 * 
 * When a controller is specified on a view, the view automatically becomes a {@link Ext.container.Container#referenceHolder},
 * so it will receive inline events declared on the view. Sample usage:
 * 
 *     @example
 *     Ext.define('User', {
 *        extend: 'Ext.data.Model',
 *        fields: ['name', 'phone']    
 *     });
 *
 *     Ext.define('UserListController', {
 *         extend : 'Ext.app.ViewController',
 *         alias: 'controller.userlist',
 *       
 *         init: function() {
 *             this.userCount = 0;
 *             var users = [],
 *                 i;
 *                 
 *             for (i = 0; i < 5; ++i) {
 *                 users.push(this.getUser());
 *             }  
 *             this.getView().getStore().add(users);
 *         },
 *       
 *         onAddClick: function() {
 *             this.addUser();
 *         },
 *             
 *         onDeleteClick: function() {
 *             var view = this.getView(),
 *                 selected = view.getSelectionModel().getSelection()[0],
 *                 store = view.getStore();
 *               
 *             store.remove(selected);
 *         },
 *       
 *         onSelectionChange: function(selModel, selections) {
 *             this.getReference('delete').setDisabled(selections.length === 0);
 *         },
 *       
 *         getUser: function() {
 *             ++this.userCount;
 *             return {
 *                 name: 'User ' + this.userCount,
 *                 phone: this.generatePhone()
 *             };
 *         },
 *       
 *         addUser: function() {
 *             this.getView().getStore().add(this.getUser());    
 *         },
 *       
 *         generatePhone: function() {
 *             var num = '',
 *                 i;
 *               
 *             for (i = 0; i < 7; ++i) {
 *                 num += Ext.Number.randomInt(0, 9);
 *                 if (num.length === 3) {
 *                     num += '-';
 *                 }
 *             }    
 *             return num;
 *         }
 *     });
 *   
 *     Ext.define('UserList', {
 *         extend: 'Ext.grid.Panel',
 *         controller: 'userlist',
 *       
 *         tbar: [{
 *             text: 'Add',
 *             listeners: {
 *                 click: 'onAddClick'
 *             }    
 *         }, {
 *             text: 'Delete',
 *             reference: 'delete',
 *             listeners: {
 *                 click: 'onDeleteClick'
 *             }
 *         }],
 *         store: {
 *             model: 'User'
 *         },
 *         selModel: {
 *             type: 'rowmodel',
 *             listeners: {
 *                 selectionchange: 'onSelectionChange'
 *             }    
 *         },
 *         columns: [{
 *             flex: 1,
 *             dataIndex: 'name',
 *             text: 'Name'
 *         }, {
 *             flex: 1,
 *             dataIndex: 'phone',
 *             text: 'Phone'
 *         }]
 *     });
 *   
 *     Ext.onReady(function() {
 *         new UserList({
 *             renderTo: Ext.getBody(),
 *             width: 400,
 *             height: 200
 *         });
 *     }); 
 */
Ext.define('Ext.app.ViewController', {
    extend: 'Ext.app.BaseController',
    
    requires: [
        'Ext.app.domain.View'
    ],
    
    mixins: [
        'Ext.mixin.Factoryable'
    ],
    
    isViewController: true,

    factoryConfig: { // configure Factoryable
        type: 'controller'
    },

    config: {
        closeViewAction: 'destroy'
    },

    constructor: function() {
        this.compDomain = new Ext.app.domain.View(this);
        this.callParent(arguments);
    },
    
    /**
     * Called when the view initializes with this controller
     * @param {Ext.Component} The view
     * @protected
     */
    init: Ext.emptyFn,

    /**
     * Called when the view model instance for an attached view is first created.
     * @param {Ext.app.ViewModel}
     * @protected
     */
    initViewModel: Ext.emptyFn,

    /**
     * Destroy the view controller.
     */
    destroy: function() {
        var me = this,
            domain = me.compDomain;

        if (domain) {
            domain.unlisten(me);
            domain.destroy();
        }
        me.compDomain = me.view = null;
        me.callParent();
    },

    /**
     * This method closes the associated view. The manner in which this is done (that is,
     * the method called to close the view) is specified by `closeViewAction`.
     *
     * It is common for views to map one or more events to this method to allow the view
     * to be closed.
     */
    closeView: function () {
        var view = this.getView(),
            action;

        if (view) {
            action = this.getCloseViewAction();
            view[action]();
        }
    },

    control: function(selectors, listeners) {
        var obj = selectors;
        if (Ext.isString(selectors)) {
            obj = {};
            obj[selectors] = listeners;
        }

        this.compDomain.listen(obj, this);
    },
    
    listen: function(to, controller) {
        var component = to.component;
        if (component) {
            to = Ext.apply({}, to);
            delete to.component;
            this.control(component);
        }
        this.callParent([to, controller]);
    },
    
    /**
     * Get the view for this controller.
     * @return {Ext.Component} The view.
     */
    getView: function() {
        return this.view;
    },

    lookupReferenceHolder: function() {
        var view = this.view;
        return view && view.lookupReferenceHolder();
    },
    
    /**
     * Get a reference to a component set with the {@link Ext.Component#reference}
     * configuration.
     * @param {String} key The key for the reference
     * @return {Ext.Component} The component, `null` if the reference doesn't exist.
     */
    getReference: function(key) {
        var view = this.view;
        return view && view.getReference(key);
    },

    getSession: function () {
        var view = this.view;
        return view && view.getInheritedSession();
    },

    getViewModel: function () {
        var view = this.view;
        return view && view.getInheritedViewModel();
    },

    getStore: function(name) {
        var viewModel = this.getViewModel();
        return viewModel ? viewModel.getStore(name) : null;
    },

    //=========================================================================
    privates: {
        view: null,

        ensureId: function() {
            var id = this.getId();
            if (!id) {
                this.setId(Ext.id(null, 'controller-'));
            }
        },

        /**
         * Set a reference to a component.
         * @param {Ext.Component} component The component to reference
         *
         * @private
         */
        setReference: function(ref) {
            var view = this.view;
            if (view) {
                view.setReference(ref);
            }
        },
        
        /**
         * Clear a reference to a component
         * @param {Ext.Component} component The component to reference
         * 
         * @private
         */
        clearReference: function(ref) {
            var view = this.view;
            if (view) {
                view.clearReference(ref);
            }
        },

        /**
         * Invalidates the references collection. Typically called when
         * removing a container from this container, since it's difficult
         * to know what references got removed.
         *
         * @private
         */
        clearReferences: function () {
            var view = this.view;
            if (view) {
                view.clearReferences();
            }
        },

        /**
         * Sets the view for this controller. To be called by the view
         * when it initializes.
         * @param {Object} view The view.
         *
         * @private
         */
        setView: function(view) {
            this.view = view;
        }
    }
});
