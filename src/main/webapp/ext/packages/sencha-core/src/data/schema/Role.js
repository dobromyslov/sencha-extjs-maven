/**
 * @private
 */
Ext.define('Ext.data.schema.Role', {
    /**
     * @property {Ext.data.schema.Association} association
     * @readonly
     */

    isRole: true,

    /**
     * @property {Boolean} left
     * @readonly
     */
    left: true,

    /**
     * @property {Boolean} owner
     * @readonly
     */
    owner: false,

    /**
     * @property {String} side
     * @readonly
     */
    side: 'left',

    /**
     * @property {Boolean} isMany
     * @readonly
     */
    isMany: false,

    /**
     * @property {Class} cls
     * The `Ext.data.Model` derived class.
     * @readonly
     */

    /**
     * @property {Ext.data.schema.Role} inverse
     * @readonly
     */

    /**
     * @property {String} type
     * The `{@link Ext.data.Model#entityName}` derived class.
     * @readonly
     */

    /**
     * @property {String} role
     * @readonly
     */

    defaultReaderType: 'json',

    constructor: function (association, config) {
        var me = this,
            extra = config.extra;

        Ext.apply(me, config);
        if (extra) {
            delete extra.type;
            Ext.apply(me, extra);
            delete me.extra;
        }

        me.association = association;

        // The Association's owner property starts as either "left" or "right" (a string)
        // and we promote it to a reference to the appropriate Role instance here.
        if (association.owner === me.side) {
            association.owner = me;
            me.owner = true;
        }
    },

    getAssociatedStore: function (inverseRecord, data) {
        // Consider the Comment entity with a ticketId to a Ticket entity. The Comment
        // is on the left (the FK holder's side) so we are implementing the guts of
        // the comments() method to load the Store of Comment entities. This trek
        // begins from a Ticket (inverseRecord).

        var me = this,
            propertyName = me.storeName || me.getStoreName(),
            store = inverseRecord[propertyName],
            session = inverseRecord.session,
            binding;

        if (store === undefined) {
            if (session) {
                // This creates the Store immediately and starts loading it on the
                // firstTick... unless we add the data before then.
                binding = session.bind({
                    reference: inverseRecord.entityName,  // Ticket
                    id: inverseRecord.getId(),  // ticketId
                    association: me.role  // comments
                }, Ext.emptyFn, undefined, data ? {
                    data: data
                } : undefined);

                store = binding.stub.store;
                binding.destroy();
            } else {
                store = inverseRecord.schema.createAssociationStore(null, me, inverseRecord);

                if (!data && me.autoLoad) {
                    store.load();
                }
            }

            inverseRecord[propertyName] = store;
            if (data) {
                store.add(data);
            }
        }

        return store;
    },
    
    /**
     * Gets the store/record associated with this role from an existing record.
     * Will only return if the value is loaded.
     * 
     * @param {Ext.data.Model} rec The record
     * 
     * @return {Ext.data.Model/Ext.data.Store} The associated item. `null` if not loaded.
     * @private
     */
    getAssociatedItem: function(rec) {
        var key = this.isMany ? this.getStoreName() : this.role;
        return rec[key] || null;
    },

    getReaderRoot: function() {
        var me = this;

        return me.associationKey ||
              (me.associationKey = me.association.schema.getNamer().readerRoot(me.role));
    },
    
    getReader: function() {
        var me = this,
            reader = me.reader,
            Model = me.cls,
            useSimpleAccessors = !me.associationKey,
            root = this.getReaderRoot();
            
        if (reader) {
            if (Ext.isString(reader)) {
                reader = {
                    type: reader,
                    rootProperty: root,
                    useSimpleAccessors: useSimpleAccessors
                };
            }
            if (reader.isReader) {
                reader.setModel(Model);
                reader.setRootProperty(root);
                reader.setUseSimpleAccessors(useSimpleAccessors);
            } else {
                Ext.applyIf(reader, {
                    model: model,
                    rootProperty: root,
                    useSimpleAccessors: useSimpleAccessors,
                    type: me.defaultReaderType
                });
            }
            reader = me.reader = Ext.createByAlias('reader.' + reader.type, reader);
        }   
        return reader; 
    },

    getStoreName: function () {
        var me = this;
        return me.storeName ||
               (me.storeName = me.association.schema.getNamer().storeName(me.role));
    },
    
    constructReader: function(fromReader) {
        var me = this,
            reader = me.getReader(),
            Model = me.cls,
            useSimpleAccessors = !me.associationKey,
            root = me.getReaderRoot(),
            proxy;
        
        // No reader supplied
        if (!reader) {
            proxy = Model.getProxy();
            // if the associated model has a Reader already, use that, otherwise attempt to create a sensible one
            if (proxy) {
                reader = proxy.getReader();
                me.savedRoot = reader.getRootProperty();
                reader.setRootProperty(root);
            } else {
                reader = new fromReader.self({
                    model: Model,
                    useSimpleAccessors: useSimpleAccessors,
                    rootProperty: root
                });
            }
        }
        return reader;
    },
    
    read: function (record, data, fromReader, readOptions) {
        var me = this,
            reader = this.constructReader(fromReader),
            result = reader.read(data, readOptions),
            saved = me.savedRoot;
        
        if (saved !== undefined) {
            reader.setRootProperty(saved);
            delete me.savedRoot;
        }
        return result;
    },

    doGetFK: function (leftRecord, options, scope) {
        // Consider the Department entity with a managerId to a User entity. This method
        // is the guts of the getManager method that we place on the Department entity to
        // acquire a User entity. We are the "manager" role and that role describes a
        // User. This method is called, however, given a Department (leftRecord) as the
        // start of this trek.

        var me           = this,    // the "manager" role
            cls          = me.cls,  // User
            foreignKey   = me.association.getFieldName(),  // "managerId"
            propertyName = me.role,  // "manager"
            rightRecord  = leftRecord[propertyName], // = department.manager
            done         = rightRecord !== undefined && !(options && options.reload),
            session      = leftRecord.session,
            foreignKeyId, success, args, binding, result;

        if (!done) {
            // We don't have the User record yet, so try to get it.

            if (session) {
                binding = session.bind({
                    reference: leftRecord.entityName,
                    id: leftRecord.getId(),
                    association: me.role
                }, function(rec) {
                    binding.destroy();
                    if (!done && options) {
                        args = [rec];
                        scope = scope || options.scope || leftRecord;

                        Ext.callback(options, scope, args);
                        Ext.callback(options.success, scope, args);
                        Ext.callback(options.callback, scope, args);
                    }
                });
                result = session.getEntity(me.type, leftRecord.get(foreignKey));
                done = !!result;
                if (done) {
                    rightRecord = result;
                    leftRecord[propertyName] = rightRecord;
                }
            } else if (foreignKey) {
                // The good news is that we do indeed have a FK so we can do a load using
                // the value of the FK.

                if (Ext.isEmpty(foreignKeyId = leftRecord.get(foreignKey))) {
                    // A value of null ends that hope though... but we still need to do
                    // some callbacks perhaps.
                    done = true;
                    rightRecord = null;
                } else {
                    // foreignKeyId is the managerId from the Department (record), so
                    // make a new User, set its idProperty and load the real record via
                    // User.load method.
                    rightRecord = cls.createWithId(foreignKeyId);

                    // Assign temporarily while we wait for data to return.
                    leftRecord[propertyName] = rightRecord;

                    if (typeof options === 'function') {
                        options = {
                            callback: options,
                            scope: scope || leftRecord
                        };
                    } else {
                        options = Ext.apply({}, options);
                    }

                    // Overwrite the success handler so we can assign the current instance
                    success = options.success;
                    options.success = function(rec){
                        leftRecord[propertyName] = rec; // set the real one now that we have it
                        if (success) {
                            success.apply(this, arguments);
                        }
                    };

                    cls.load(foreignKeyId, options);
                    // we are not done in this case, so don't set "done"
                }
            } else {
                // Without a FK value by which to request the User record, we cannot do
                // anything. Declare victory and get out.
                done = true;
            }
        }

        if (done && options) {
            args = [rightRecord];
            scope = scope || options.scope || leftRecord;

            Ext.callback(options, scope, args);
            Ext.callback(options.success, scope, args);
            Ext.callback(options.callback, scope, args);
        }

        return rightRecord;
    },

    doSetFK: function (leftRecord, rightRecord, options, scope) {
        // Consider the Department entity with a managerId to a User entity. This method
        // is the guts of the setManager method that we place on the Department entity to
        // store the User entity. We are the "manager" role and that role describes a
        // User. This method is called, however, given a Department (record) and the User
        // (value).

        var me = this,
            foreignKey = me.association.getFieldName(),  // "managerId"
            propertyName = me.role,  // "managerDepartment"
            ret = leftRecord[propertyName],
            inverse = me.inverse,
            inverseSetter = inverse.setterName,  // setManagerDepartment for User
            session = leftRecord.session,
            modified;

        if (rightRecord && rightRecord.isEntity) {
            if (ret !== rightRecord) {
                leftRecord[propertyName] = rightRecord;

                if (foreignKey) {
                    leftRecord.set(foreignKey, rightRecord.getId());
                }

                if (inverseSetter) {
                    // Because the rightRecord has a reference back to the leftRecord
                    // we pass on to its setter (if there is one). We've already set
                    // the value on this side so we won't recurse back-and-forth.
                    rightRecord[inverseSetter](leftRecord);
                }
            }
        } else {
            // The value we received could just be the id of the rightRecord so we just
            // need to set the FK accordingly and cleanup any cached references.

            //<debug>
            if (!foreignKey) {
                Ext.Error.raise('No foreignKey specified for "' + me.association.left.role +
                    '" by ' + leftRecord.$className);
            }
            //</debug>

            modified = leftRecord.set(foreignKey, rightRecord);
            // set returns the modifiedFieldNames[] or null if nothing was changed

            if (modified && ret && ret.isEntity && !ret.isEqual(ret.getId(), rightRecord)) {
                // If we just modified the FK value and it no longer matches the id of the
                // record we had cached (ret), remove references from *both* sides:
                ret[inverse.role] = leftRecord[propertyName] = undefined;
            }
        }

        if (options) {
            if (session) {
                // @TODO
            } else {
                if (Ext.isFunction(options)) {
                    options = {
                        callback: options,
                        scope: scope || leftRecord
                    };
                }

                ret = leftRecord.save(options);
            }
        }

        return ret;
    },

    syncFK: function (records, foreignKeyValue, clearing) {
        // We are called to set things like the FK (ticketId) of an array of Comment
        // entities. The best way to do that is call the setter on the Comment to set
        // the Ticket. Since we are setting the Ticket, the name of that setter is on
        // our inverse role.

        var foreignKeyName = this.association.getFieldName(),
            setter = this.inverse.setterName, // setTicket
            i = records.length,
            newVal = clearing ? null : foreignKeyValue,
            different, rec;

        while (i-- > 0) {
            rec = records[i];
            different = !rec.isEqual(foreignKeyValue, rec.get(foreignKeyName));

            if (different !== clearing) {
                // clearing === true
                //      different === true  :: leave alone (not associated anymore)
                //   ** different === false :: null the value (no longer associated)
                //
                // clearing === false
                //   ** different === true  :: set the value (now associated)
                //      different === false :: leave alone (already associated)
                //
                if (setter) {
                    rec[setter](newVal);
                } else {
                    rec.set(foreignKeyName, newVal);
                }
            }
        }
    }
});
