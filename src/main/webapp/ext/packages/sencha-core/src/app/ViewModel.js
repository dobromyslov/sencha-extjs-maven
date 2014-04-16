/**
 * This class manages arbitrary data and its relationship to data models. Instances of
 * `ViewModel` are associated with some `Component` and then used by their child items
 * for the purposes of Data Binding.
 * 
 * # Binding
 * 
 * The most commonly used aspect of a `ViewModel` is the `bind` method. This method takes
 * a "bind descriptor" (see below) and a callback to call when the data indicated by the
 * bind descriptor either becomes available or changes.
 *
 * The `bind` method, based on the bind descriptor given, will return different types of
 * "binding" objects. These objects maintain the connection between the requested data and
 * the callback. Bindings ultimately derive from `{@link Ext.data.session.BaseBinding}`
 * which provides several methods to help manage the binding.
 *
 * Perhaps the most important method is `destroy`. When the binding is no longer needed
 * it is important to remember to `destroy` it. Leaking bindings can cause performance
 * problems or worse when callbacks are called at unexpected times.
 *
 * The types of bindings produced by `bind` are:
 *
 *   * `{@link Ext.data.session.Binding}`
 *   * `{@link Ext.app.bind.Multi}`
 *   * `{@link Ext.app.bind.TemplateBinding}`
 *
 * ## Bind Descriptors
 * 
 * A "bind descriptor" is a value (a String, an Object or an array of these) that describe
 * the desired data. Any piece of data in the `ViewModel` can be described by a bind
 * descriptor.
 *
 * Some of this just arbitrary data put in the `ViewModel` by calls to the `set` method,
 * but some data may be requested from a server. Any desired model or association can be
 * retrieved by a suitable bind descriptor.
 * 
 * ### Textual Bind Descriptors
 * 
 * The simplest and most common form of bind descriptors are strings that look like an
 * `Ext.Template` containing text and tokens surrounded by "{}" with dot notation inside
 * to traverse objects and their properties.
 * 
 * For example:
 * 
 *   * `'Hello {user.name}!'`
 *   * `'You have selected "{selectedItem.text}".'`
 *   * `'{user.groups}'`
 *
 * The first two bindings are `{@link Ext.app.bind.TemplateBinding template bindings}`
 * which use the familiar `Ext.Template` syntax with some slight differences. For more on
 * templates see `{@link Ext.app.bind.Template}`.
 *
 * The third bind descriptor is called a "direct bind descriptor". This special form of
 * bind maps one-to-one to some piece of data in the `ViewModel` and is managed by the
 * `{@link Ext.data.session.Binding}` class.
 *
 * #### Two-Way Descriptors
 *
 * A direct bind descriptor may be able to write back a value to the `ViewModel` as well
 * as retrieve one. When this is the case, they are said to be "two-way". For example:
 *
 *      var binding = viewModel.bind('{s}', function(x) { console.log('s=' + s); });
 *
 *      binding.setValue('abc');
 *
 * Direct use of `ViewModel` in this way is not commonly needed because `Ext.Component`
 * automates this process. For example, a `textfield` component understands when it is
 * given a "two-way" binding and automatically synchronizes its value bidirectionally using
 * the above technique. For example:
 *
 *      Ext.widget({
 *          items: [{
 *              xtype: 'textfield',
 *              bind: '{s}'  // a two-way / direct bind descriptor
 *          }]
 *      });
 *
 * ### Object and Array Descriptors / Multi-Bind
 *
 * With two exceptions (see below) an Object is interpreted as a "shape" to produce by
 * treating each of its properties as individual bind descriptors. An object of the same
 * shape is passed as the value of the bind except that each property is populated with
 * the appropriate value. Of course, this definition is recursive, so these properties
 * may also be objects.
 *
 * For example:
 *
 *      viewModel.bind({
 *              x: '{x}',
 *              foo: {
 *                  bar: 'Hello {foo.bar}'
 *              }
 *          },
 *          function (obj) {
 *              //  obj = {
 *              //      x: 42,
 *              //      foo: {
 *              //          bar: 'Hello foobar'
 *              //      }
 *              //  }
 *          });
 *
 * Arrays are handled in the same way. Each element of the array is considered a bind
 * descriptor (recursively) and the value produced for the binding is an array with each
 * element set to the bound property.
 *
 * ### Bind Options
 *
 * One exception to the "object is a multi-bind" rule is when that object contains a
 * `bindTo` property. When an object contains a `bindTo` property the object is understood
 * to contain bind options and the value of `bindTo` is considered the actual bind
 * descriptor.
 *
 * For example:
 *
 *      viewModel.bind({
 *              bindTo: '{x}',
 *              single: true
 *          },
 *          function (x) {
 *              console.log('x: ' + x); // only called once
 *          });
 *
 * The available bind options depend on the type of binding, but since all bindings
 * derive from `{@link Ext.data.session.BaseBinding}` its options are always applicable.
 * For a list of the other types of bindings, see above.
 *
 * #### Deep Binding
 *
 * When a direct bind is made and the bound property is an object, by default the binding
 * callback is only called when that reference changes. This is the most efficient way to
 * understand a bind of this type, but sometimes you may need to be notified if any of the
 * properties of that object change.
 *
 * To do this, we create a "deep bind":
 *
 *      viewModel.bind({
 *              bindTo: '{someObject}',
 *              deep: true
 *          },
 *          function (someObject) {
 *              // called when reference changes or *any* property changes
 *          });
 *
 * ### References To The Data Model
 *
 * The second exception to the "object is a multi-bind" rule is when that object contains
 * a `reference` property. When there is a `reference` property, the bind descriptor is
 * either a "record bind" or an "association bind".
 *
 * These bindings are often combined with "links" (see below) and are typically used to
 * make an initial connection between a `ViewModel` and the Data Model of the application.
 * These forms of bind collaborate with the `session` instance if one is specified so that
 * records of specific type and id are not duplicated.
 *
 * For details on these bind descriptors see `{@link Ext.data.session.Session}`.
 *
 * ### Links
 *
 * While a `session` provides the raw access to records and associations, direct use of
 * these descriptors should be limited. When applications launch they often know of some
 * set of records that are needed (perhaps in the URL).
 *
 * If these records either need to be fetched from the server or their data has already
 * been added to the `session` (using `{@link Ext.data.session.Session#update}`), links
 * can be used to give these records meaningful names in the `ViewModel`. This essentially
 * automates the process of loading records and adding them as data to the `ViewModel`
 * manually.
 *
 * To create a link to a record (and automatically load it), do this:
 *
 *      viewModel.setLinks({
 *          theUser: {
 *              reference: 'User',
 *              id: 42
 *          }
 *      });
 *
 */
Ext.define('Ext.app.ViewModel', {
    mixins: [
        'Ext.mixin.Factoryable',
        'Ext.mixin.Identifiable'
    ],

    requires: [
        'Ext.util.Scheduler',
        'Ext.data.session.Session',
        //TODO - 'Ext.app.Container',
        'Ext.app.bind.RootStub',
        'Ext.app.bind.LinkStub',
        'Ext.app.bind.Multi',
        'Ext.app.bind.Formula',
        'Ext.app.bind.TemplateBinding',
        // TODO: this is an injected dependency in onStoreBind, need to define so 
        // cmd can detect it
        'Ext.data.ChainedStore'
    ],

    alias: 'viewmodel.default', // also configures Factoryable

    isViewModel: true,

    factoryConfig: {
        name: 'viewModel'
    },

    destroyed: false,

    expressionRe: /^(?:\{[!]?(?:(\d+)|([a-z_][\w\-\.]*))\})$/i,

    $configStrict: false, // allow "formulas" to be specified on derived class body
    config: {
        /**
         * @cfg {Object} data
         * This object holds the arbitrary data that populates the `ViewModel` and is
         * then available for binding.
         * @since 5.0.0
         */
        data: true,

        /**
         * @cfg {Object} formulas
         * An object that defines named values whose value is managed by function calls.
         * The names of the properties of this object are assigned as values in the
         * ViewModel.
         *
         * For example:
         *
         *      formulas: {
         *          xy: function (data) { return data.x * data.y; }
         *      }
         *
         * For more details about defining a formula, see `{@link Ext.app.bind.Formula}`.
         * @since 5.0.0
         */
        formulas: {
            merge: function(newValue, currentValue, isMixin) {
                var ret, key;

                if (!currentValue) {
                    ret = newValue;
                } else if (!newValue) {
                    ret = currentValue;
                } else {
                    ret = Ext.apply({}, currentValue);
                    for (key in newValue) {
                        if (!(isMixin && ret[key])) {
                            ret[key] = newValue[key];
                        }
                    }
                }
                return ret;
            },
            $value: null
        },

        /**
         * @cfg {Object} links
         * Links provide a way to assign a simple name to a more complex bind. The primary
         * use for this is to assign names to records in the data model.
         *
         *      links: {
         *          theUser: {
         *              reference: 'User',
         *              id: 12
         *          }
         *      }
         *
         * While that is the typical use, the value of each property in `links` is just
         * a bind descriptor (see `{@link #method-bind}` for the various forms of bind
         * descriptors).
         * @since 5.0.0
         */
        links: null,

        /**
         * @cfg {Ext.app.ViewModel} parent
         * The parent `ViewModel` of this `ViewModel`. Once set, this cannot be changed.
         * @readonly
         * @since 5.0.0
         */
        parent: null,

        /**
         * @cfg {Ext.app.bind.RootStub} root
         * A reference to the root "stub" (an object that manages bindings).
         * @private
         * @since 5.0.0
         */
        root: true,

        /**
         * @cfg {Ext.util.Scheduler} scheduler
         * The scheduler used to schedule and manage the delivery of notifications for
         * all connections to this `ViewModel` and any other attached to it. The normal
         * process to initialize the `scheduler` is to get the scheduler used by the
         * `parent` or `session` and failing either of those, create one.
         * @readonly
         * @private
         * @since 5.0.0
         */
        scheduler: null,

        /**
         * @cfg {Ext.data.session.Session} session
         * The session used to manage the data model (records and stores).
         * @since 5.0.0
         */
        session: null,

        /**
         * @cfg {Object} stores
         * A declaration of `Ext.data.Store` configurations that are first processed as
         * binds to produce an effective store configuration.
         * @since 5.0.0
         */
        stores: null,

        /**
         * @cfg {Ext.container.Container} view
         * The Container that owns this `ViewModel` instance.
         * @since 5.0.0
         */
        view: null
    },

    constructor: function (config) {
        /*
         *  me.data = {
         *      foo: {
         *      },
         *          
         *      selectedUser: {
         *          name: null
         *      },
         *  }
         *
         *  me.root = new Ext.app.bind.RootStub({
         *      children: {
         *          foo: new Ext.app.bind.Stub(),
         *          selectedUser: new Ext.app.bind.LinkStub({
         *              binding: session.bind(...),
         *              children: {
         *                  name: : new Ext.app.bind.Stub()
         *              }
         *          }),
         *      }
         *  })
         */

        this.initConfig(config);
    },

    destroy: function () {
        var me = this,
            scheduler = me._scheduler,
            stores = me.storeInfo,
            parent = me.getParent(),
            key;

        me.destroy = Ext.emptyFn;

        if (stores) {
            for (key in stores) {
                stores[key].destroyStore();
            }
        }

        if (parent) {
            parent.unregisterChild(me);
        }

        me.getRoot().destroy();

        if (scheduler && scheduler.$owner === me) {
            scheduler.$owner = null;
            scheduler.destroy();
        }

        me.children = me.storeInfo = me._session = me._view = me._scheduler =
                      me._root = me._parent = null;
    },

    /**
     * This method requests that data in this `ViewModel` be delivered to the specified
     * `callback`. The data desired is given in a "bind descriptor" which is the first
     * argument.
     *
     * @param {String/Object/Array} descriptor The bind descriptor. See class description
     * for details.
     * @param {Function} callback The function to call with the value of the bound property.
     * @param {Object} [scope] The scope (`this` pointer) for the callback.
     * @param {Object} [options]
     * @return {Ext.data.session.BaseBinding/Ext.data.session.Binding} The binding.
     */
    bind: function (descriptor, callback, scope, options) {
        var me = this,
            binding;

        scope = scope || me;

        if (descriptor.reference) {
            binding = me.bindEntity(descriptor, callback, scope, options);
        }
        else {
            if (!options && descriptor.bindTo !== undefined && !Ext.isString(descriptor)) {
                options = descriptor;
                descriptor = options.bindTo;
            }

            if (!Ext.isString(descriptor)) {
                binding = new Ext.app.bind.Multi(descriptor, me, callback, scope, options);
            }
            else if (me.expressionRe.test(descriptor)) {
                // If we have '{foo}' alone it is a literal
                descriptor = descriptor.substring(1, descriptor.length - 1);
                binding = me.bindExpression(descriptor, callback, scope, options);
            }
            else {
                binding = new Ext.app.bind.TemplateBinding(descriptor, me, callback, scope, options);
            }
        }

        return binding;
    },

    getSession: function () {
        var me = this,
            session = me._session,
            parent;

        if (!session && (parent = me.getParent())) {
            me.setSession(session = parent.getSession());
        }

        return session;
    },
    
    getStore: function(key) {
        var storeInfo = this.storeInfo,
            store;
        
        if (storeInfo) {
            store = storeInfo[key];
        }
        return store || null;
    },

    linkTo: function (key, reference, target) {
        var stub = this.getStub(key),
            linkStub;

        //<debug>
        if (stub.depth - this.getRoot().depth > 1) {
            Ext.Error.raise('Links can only be at the top-level: "' + key + '"');
        }
        //</debug>

        if (!stub.isLinkStub) {
            // Pass parent=null since we will graft in this new stub to replace us:
            linkStub = new Ext.app.bind.LinkStub(this, stub.name);
            stub.graft(linkStub);
            stub = linkStub;
        }

        stub.link(reference, target);
    },

    notify: function () {
        this.getScheduler().notify();
    },

    set: function (path, value) {
        var obj, stub;

        if (value === undefined && path && path.constructor === Object) {
            stub = this.getRoot();
            value = path;
        } else if (path && path.indexOf('.') < 0) {
            obj = {};
            obj[path] = value;
            value = obj;
            stub = this.getRoot();
        } else {
            stub = this.getStub(path);
        }

        stub.set(value);
    },

    //=========================================================================
    privates: {
        registerChild: function(child) {
            var children = this.children;
            if (!children) {
                this.children = children = {};
            }
            children[child.getId()] = child;
        },
        
        unregisterChild: function(child) {
            var children = this.children;
            if (children) {
                delete children[child.getId()];
            }
        },

        notFn: function (v) {
            return !v;
        },

        bindEntity: function (descriptor, callback, scope, options) {
            var session = this.getSession();

            return session.bind(descriptor, callback, scope, options);
        },

        bindExpression: function (descriptor, callback, scope, options) {
            var ch = descriptor.charAt(0),
                not = (ch === '!'),
                path = not ? descriptor.substring(1) : descriptor,
                stub = this.getStub(path),
                binding;

            binding =  stub.bind(callback, scope, options);
            if (not) {
                binding.transform = this.notFn;
            }

            return binding;
        },

        applyScheduler: function (scheduler) {
            if (scheduler && !scheduler.isInstance) {
                scheduler = new Ext.util.Scheduler(scheduler);
                scheduler.$owner = this;
            }
            return scheduler;
        },

        getScheduler: function () {
            var me = this,
                scheduler = me._scheduler,
                parent,
                session;

            if (!scheduler) {
                if (!(parent = me.getParent())) {
                    if (!(session = me.getSession())) {
                        scheduler = new Ext.util.Scheduler({
                            // See Session#scheduler
                            preSort: 'kind,-depth'
                        });
                        scheduler.$owner = me;
                    } else {
                        scheduler = session.getScheduler();
                    }
                } else {
                    scheduler = parent.getScheduler();
                }

                me.setScheduler(scheduler);
            }

            return scheduler;
        },

        /**
         * This method looks up the `Stub` for a single bind descriptor.
         * @param {String/Object} bindDescr The bind descriptor.
         * @return {Ext.data.session.Stub} The `Stub` associated to the bind descriptor.
         * @private
         */
        getStub: function (bindDescr) {
            var root = this.getRoot();
            return bindDescr ? root.getChild(bindDescr) : root;
        },

        collect: function() {
            var children = this.children,
                key;
            
            // We need to loop over the children first, since they may have link stubs
            // that create bindings inside our VM. Attempt to clean them up first.
            if (children) {
                for (key in children) {
                    children[key].collect();
                }
            }
            this.getRoot().collect();
        },

        //-------------------------------------------------------------------------
        // Config
        // <editor-fold>

        applyData: function (newData, data) {
            var me = this,
                linkData, parent;

            // Force any session to be invoked so we can access it
            me.getSession();
            if (!data) {
                parent = me.getParent();

                /**
                 * @property {Object} linkData
                 * This object is used to hold the result of a linked value. This is done
                 * so that the data object hasOwnProperty equates to whether or not this
                 * property is owned by this instance or inherited.
                 * @private
                 * @readonly
                 * @since 5.0.0
                 */
                me.linkData = linkData = parent ? Ext.Object.chain(parent.getData()) : {};

                /**
                 * @property {Object} data
                 * This object holds all of the properties of this `ViewModel`. It is
                 * prototype chained to the `linkData` which is, in turn, prototype chained
                 * to (if present) the `data` object of the parent `ViewModel`.
                 * @private
                 * @readonly
                 * @since 5.0.0
                 */
                me.data = me._data = Ext.Object.chain(linkData);
            }

            if (newData && newData.constructor === Object) {
                me.getRoot().set(newData);
            }
        },

        applyParent: function(parent) {
            if (parent) {
                parent.registerChild(this);
            }
            return parent;
        },
        
        applyStores: function(stores) {
            var me = this,
                root = me.getRoot(),
                key, cfg, storeBind, stub, listeners;
            
            me.storeInfo = {};
            me.listenerScopeFn = function() {
                return me.getView().getInheritedConfig('defaultListenerScope');
            };
            for (key in stores) {
                cfg = stores[key];
                if (Ext.isString(cfg)) {
                    cfg = {
                        source: cfg
                    };
                } else {
                    cfg = Ext.apply({}, cfg);
                }
                // Get rid of listeners o they don't get considered as a bind
                listeners = cfg.listeners;
                delete cfg.listeners;
                storeBind = me.bind(cfg, me.onStoreBind, me);
                storeBind.$storeKey = key;
                storeBind.$listeners = listeners;
                stub = root.createStubChild(key);
                stub.setStore(storeBind);
            }
        },
        
        onStoreBind: function(cfg, oldValue, binding) {
            var me = this,
                info = me.storeInfo,
                key = binding.$storeKey,
                listeners = binding.$listeners,
                store = info[key],
                session = me.getSession(),
                proxy;

            if (!store) {
                cfg = Ext.apply({
                    session: (cfg.isolated === false) && session ? session : undefined
                }, cfg);
                if (cfg.source) {
                    cfg = Ext.apply({
                        type: 'chained'
                    }, cfg);
                }
                // Restore the listeners from applyStores here
                cfg.listeners = listeners;
                store = Ext.Factory.store(cfg);
                store.resolveListenerScope = me.listenerScopeFn;
                info[key] = store;
                this.set(key, store);
            } else {
                cfg = Ext.merge({}, cfg);
                proxy = cfg.proxy;
                delete cfg.type;
                delete cfg.model;
                delete cfg.fields;
                delete cfg.proxy;
                delete cfg.listeners;
                
                // TODO: possibly optimize this so we can figure out what has changed
                // instead of smashing the whole lot
                if (proxy) {
                    delete proxy.reader;
                    delete proxy.writer;
                    store.getProxy().setConfig(proxy);
                }
                store.setConfig(cfg);
            }
        },

        applyFormulas: function (formulas) {
            var me = this,
                root = me.getRoot(),
                name, stub;

            me.getData(); // make sure our data is setup first

            for (name in formulas) {
                //<debug>
                if (name.indexOf('.') >= 0) {
                    Ext.Error.raise('Formula names cannot contain dots: ' + name);
                }
                //</debug>
                
                // Force a stub to be created
                root.createStubChild(name);

                stub = me.getStub(name);
                stub.setFormula(formulas[name]);
            }
            return formulas;
        },

        applyLinks: function (links) {
            for (var link in links) {
                this.linkTo(link, links[link]);
            }
        },

        applyRoot: function () {
            var root = new Ext.app.bind.RootStub(this),
                parent = this.getParent();

            if (parent) {
                // We are assigning the root of a child VM such that its bindings will be
                // pre-sorted after the bindings of the parent VM.
                root.depth = parent.getRoot().depth - 1000;
            }

            return root;
        }

        // </editor-fold>
    }
});
