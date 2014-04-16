/**
 * This class and its derived classes are used to manage access to the properties of an
 * object stored in a `Session`.
 * @private
 */
Ext.define('Ext.app.bind.Stub', {
    extend: 'Ext.data.session.AbstractStub',

    requires: [
        'Ext.data.session.Binding'
    ],

    isStub: true,

    formula: null,

    constructor: function (owner, name, parent) {
        this.callParent([ owner, name ]);

        if (parent) {
            parent.add(this);
        }
    },
    
    destroy: function() {
        var me = this,
            formula = me.formula,
            parent = me.parent,
            assocBinding = me.assocBinding,
            storeBinding = me.storeBinding,
            recordBinding = me.recordBinding;

        if (assocBinding) {
            assocBinding.destroy();
        }
        if (formula) {
            formula.destroy();
        }
        if (storeBinding) {
            storeBinding.destroy();
        }
        if (recordBinding) {
            recordBinding.destroy();
        }

        me.formula = me.storeBinding = me.assocBinding = me.recordBinding = null;
        
        me.callParent();
    },

    collect: function() {
        var me = this,
            result = me.callParent(),
            assocBinding = me.assocBinding ? 1 : 0,
            storeBinding = me.storeBinding ? 1 : 0,
            recordBinding = me.recordBinding ? 1 : 0;
        
        return result + assocBinding + storeBinding + recordBinding;
    },

    bindValidation: function (callback, scope) {
        var parent = this.parent;
        return parent && parent.descend(['validation', this.name]).bind(callback, scope);
    },

    descend: function (path, index) {
        var me = this,
            children = me.children || (me.children = {}),
            pos = index || 0,
            name = path[pos++],
            ret;

        if (!(ret = children[name])) {
            ret = new Ext.app.bind.Stub(me.owner, name, me);
        }

        if (pos < path.length) {
            ret = ret.descend(path, pos);
        }

        return ret;
    },

    getAssociationBinding: function (rec, role) {
        // If getting a validation binding, role will be true.
        var me = this,
            old = me.assocBinding,
            stub = old ? old.stub : null,
            changed = !stub,
            stubRole,
            bind;

        if (stub) {
            stubRole = stub.role;
            if (stub.isValidationStub) {
                stubRole = true;
            }
            
            changed = stub.entityId !== rec.id ||
                      stub.entityType !== rec.self ||
                      stubRole !== role;
        }

        if (changed) {
            Ext.destroy(old);

            bind = {
                reference: rec.entityName,
                id: rec.getId()
            };

            if (role === true) {
                bind.validation = true;
            } else {
                bind.association = role.role;
            }

            me.assocBinding = me.owner.bind(bind, me.onAssociationLoad, me);
        }

        return me.assocBinding;
    },

    getChildValue: function (parentData) {
        var me = this,
            name = me.name,
            associations, ret;

        if (!parentData && !Ext.isString(parentData)) {
            // since these forms of falsey values (0, false, etc.) are not things we
            // can index into, this child stub must be null.
            ret = parentData === null ? undefined : null;
        } else if (parentData.isEntity) {
            associations = parentData.associations;

            if (associations && (name in associations)) {
                ret = me.getAssociationBinding(parentData, associations[name]).getValue();
            } else if (name === 'validation') {
                ret = me.getAssociationBinding(parentData, true).getValue();
            } else {
                // If not an association then it is a data field
                ret = parentData.data[name];
            }
        } else {
            ret = parentData[name];
        }

        return ret;
    },

    getDataObject: function () {
        var parentData = this.parent.getDataObject(), // RootStub does not get here
            name = this.name,
            ret = parentData ? parentData[name] : null;

        if (!ret || !(ret.$className || Ext.isObject(ret))) {
            if (ret) {
                //TODO - we probably need to schedule ourselves here
            }
            parentData[name] = ret = {};
            // We're implicitly setting a value on the object here
            this.hadValue = true;
        }

        return ret;
    },

    onAssociationLoad: function (rec) {
        // Our association has just presented, kick off any related children
        this.scheduleDeep();
    },

    getRawValue: function () {
        // NOTE: The RootStub class does not call here so we will *always* have a parent
        // unless dark energy has won and the laws of physics have broken down.
        return this.getChildValue(this.parent.getValue());
    },

    graft: function (replacement) {
        var me = this,
            parent = me.parent,
            children = me.children,
            name = me.name,
            i;

        replacement.parent = parent;
        replacement.children = children;

        if (parent) {
            parent.children[name] = replacement;
        }
        if (children) {
            for (i in children) {
                children[i].parent = replacement;
            }
        }

        me.children = null;

        return me.callParent([ replacement ]);
    },

    isLoading: function () {
        var me = this,
            parent = me.parent,
            loading = false,
            name = me.name,
            value, associations, binding;
        
        if (parent && !(loading = parent.isLoading())) {
            value = parent.getRawValue();

            if (value && value.isEntity) {
                associations = value.associations;
                if (associations && (name in associations)) {
                    binding = me.getAssociationBinding(value, associations[name]);
                } else if (name === 'validation') {
                    binding = me.getAssociationBinding(value, true);
                }
                if (binding) {
                    loading = binding.isLoading();
                }
            } else {
                loading = !me.hadValue && me.getRawValue() === undefined;
            }
        }

        return loading;
    },

    scheduleDeep: function () {
        var me = this,
            children = me.children,
            child, name;
            
        if (!me.isLoading()) {
            if (!me.scheduled) {
                // If we have no children, we're a leaf
                me.schedule();
            }

            if (children) {
                for (name in children) {
                    if (!(child = children[name]).scheduled) {
                        child.scheduleDeep();
                    }
                }
            }
        }
    },

    set: function (value) {
        var me = this,
            parent = me.parent,
            name = me.name,
            // To set a child property, the parent must be an object...
            parentData = parent.getDataObject(),
            recordBinding = me.recordBinding,
            associations, recordStub;
        
        if (recordBinding) {
            recordBinding.destroy();
            me.recordBinding = null;
        }

        if (parentData.isEntity) {
            associations = parentData.associations;

            if (associations && (name in associations)) {
                //TODO - handle FK type setters
            } else {
                // If not an association then it is a data field
                parentData.set(name, value);
            }

            // Setting fields or associated records will fire change notifications so we
            // handle the side effects there
        } else if ((value && value.constructor === Object) || value !== parentData[name]) {
            if (!me.setByLink(value)) {
                if (value === undefined) {
                    delete parentData[name];
                } else {
                    parentData[name] = value;
                    // Keep track of the fact that we've had a value set. We may get set
                    // to undefined in the future, we only need to know whether we
                    // are initially in an undefined state
                    me.hadValue = true;
                }

                // We have children, but we're overwriting the value with something else, so
                // we need to schedule our children
                me.scheduleDeep();
                
                if (value && value.isModel) {
                    recordStub = value.$stub;
                    if (recordStub) {
                        me.recordBinding = recordStub.bind(me.onRecordChange, me);
                    }
                }
            }
        }
    },

    setByLink: function (value) {
        var me = this,
            n = 0,
            i, link, path, stub;

        for (stub = me; stub; stub = stub.parent) {
            if (stub.isLinkStub) {
                link = stub;
                if (n) {
                    for (path = [], i = 0, stub = me; stub !== link; stub = stub.parent) {
                        ++i;
                        path[n - i] = stub.name;
                    }
                }
                break;
            }
            ++n;
        }

        if (!link || !(stub = link.getTargetStub())) {
            return false;
        }

        // We are a child of a link stub and that stub links to a Stub, so forward the set
        // call over there. This is needed to fire the bindings on that side of the link
        // and that will also arrive back here since we are a linked to it.
        if (path) {
            stub = stub.descend(path);
        }
        stub.set(value);
        return true;
    },

    setFormula: function (formula) {
        var me = this,
            oldFormula = me.formula;

        if (oldFormula) {
            oldFormula.destroy();
        }

        // The new formula will bind to what it needs and that will schedule it (and then
        // us when it sets our value).
        me.formula = new Ext.app.bind.Formula(me, formula);
    },
    
    setStore: function(storeBinding) {
        this.storeBinding = storeBinding;
    },

    sort: function () {
        var me = this,
            formula = me.formula,
            assocBinding = me.assocBinding,
            scheduler = me.scheduler,
            storeBinding = me.storeBinding,
            recordBinding = me.recordBinding;

        me.callParent();

        if (assocBinding) {
            scheduler.sortItem(assocBinding);
        }
        
        if (storeBinding) {
            scheduler.sortItem(storeBinding);
        }
        
        if (recordBinding) {
            scheduler.sortItem(recordBinding);
        }

        if (formula) {
            // Our formula must run before we do so it can set the value on us. Our
            // bindings in turn depend on us so they will be scheduled as part of the
            // current sweep if the formula produces a different result.
            scheduler.sortItem(formula);
        }
    },
    
    onRecordChange: function(rec) {
        var children = this.children,
            key, associations;
        
        // The current value is a record. Loop over all the children.
        // If the child is not an association, then it's a field so we
        // need to trigger them so we can respond to field changes
        if (children && rec) {
            for (key in children) {
                associations = rec.associations;
                if (!(associations && key in associations)) {
                    children[key].schedule();
                }
            }
        }
    }
});
