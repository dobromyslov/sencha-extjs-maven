/**
 * This class manages models and their associations. Instances of `Session` are typically
 * associated with some `Component` (perhaps the Viewport or a Window) and then used by
 * their `{@link Ext.app.ViewModel view models}` to enable data binding.
 *
 * The primary job of a Session is to manage a collection of records of many different
 * types and their associations. This often starts by loading records when requested (via
 * bind - see below) and culminates when it is time to save to the server.
 *
 * Because the Session tracks all records it loads, it ensures that for any given type of
 * model, only one record exists with a given `id`. This means that all edits of that
 * record are properly targeted at that one instance.
 *
 * Similarly, when associations are loaded, the `Ext.data.Store` created to hold the
 * associated records is tracked by the Session. So all requests for the "OrderItems" of
 * a particular Order id will result in the same Store. Adding and removing items from
 * that Order then is sure to remain consistent.
 *
 * # Data
 *
 * Since the Session is managing all this data, there are several methods it provides
 * to give convenient access to that data. The most important of these is `update` and
 * `getChanges`.
 *
 * The `update` and `getChanges` methods both operate on object that contains a summary
 * of records and associations and different CRUD operations.
 *
 * TODO
 *
 * ## Saving
 *
 * There are two basic ways to save the contents of a Session: `getChanges` and
 * `getSaveBatch`. We've already seen `getChanges`. The data contained in the CRUD object
 * can be translated into whatever shape is needed by the server.
 *
 * To leverage the `{@link Ext.data.Model#proxy proxy}` facilities defined by each Model
 * class, there is the `getSaveBatch` method. That method returns an `Ext.data.Batch`
 * object populated with the necessary `create`, `update` and `destory` operations to
 * save all of the changes in the Session.
 *
 * # Binding
 *
 * Most forms of data binding start with a `{@link Ext.app.ViewModel}` rather than a
 * session, but the session does provide binding for records and associations. These
 * forms of binding consist of an object with a `reference` and `id` property.
 *
 * ## Record Binding
 *
 * When a record of a particular `Ext.data.Model` derived type is desired, it can be bound
 * like so (we'll simplify this using links next):
 *
 *      viewModel.bind({
 *              reference: 'User',
 *              id: 42
 *          },
 *          function (user) {
 *              // called when the User with id=42 is loaded
 *          });
 *
 * ## Association Binding
 *
 * Similarly we can request an association by adding the `association` property.
 *
 *      viewModel.bind({
 *              reference: 'User',
 *              id: 42,
 *              association: 'groups'
 *          },
 *          function (groups) {
 *              // called when the "groups" for User id=42 are loaded
 *              // this will be an Ext.data.Store
 *          });
 */
Ext.define('Ext.data.session.Session', {
    requires: [
        'Ext.util.Scheduler',

        'Ext.data.schema.Schema',
        'Ext.data.Batch',
        'Ext.data.session.EntityStub',
        'Ext.data.session.Matrix',
        'Ext.data.session.ValidationStub'
    ],

    isSession: true,

    config: {
        scheduler: {
            // We sort stubs first then bindings as this ensures that stubs get to react
            // to changes and trigger bindings potentially for parent stubs (which are
            // always ahead of the child stubs).
            preSort: 'kind,-depth'
        },

        /**
         * @cfg {String/Ext.data.schema.Schema} schema
         */
        schema: 'default'
    },

    destroyed: false,

    constructor: function (config) {
        var me = this;

        /*
         *  {
         *      Order: {
         *          12: {
         *              record: new Order({
         *                  data: {
         *                  },
         *                  $stub: ...
         *              }),
         *
         *              refs: {
         *                  orderItems: {
         *                      100: orderItem (id = 100)
         *                  }
         *              },
         *
         *              stub: new Ext.data.session.EntityStub({
         *                  record: ...
         *              }),
         *
         *              val: new Ext.data.session.ValidationStub({
         *                  entityBinding: ...
         *              });
         *
         *              assoc: {
         *                  orderItems: new Ext.data.session.AssociationStub({
         *                      store: ...
         *                  })
         *              }
         *          }
         *      }
         *  }
         */
        me.data = {};

        /*
         *  {
         *      UserGroups: new Ext.data.session.Matrix({
         *          association: UserGroups
         *      })
         *  }
         */
        me.matrices = {};

        me.identifierCache = {};

        // Bind ourselves so we're always called in our own scope.
        me.recordCreator = me.recordCreator.bind(me);

        me.initConfig(config);
    },

    destroy: function () {
        var me = this,
            scheduler = me._scheduler;

        me.destroy = Ext.emptyFn;

        if (scheduler) {
            scheduler.destroy();
            me.scheduler = null;
        }
    },

    /**
     * Creates a new record and tracks it in this session.
     *
     * @param {String/Class} type The `entityName` or the actual class of record to create.
     * @param {Object} [data] The new record's data.
     * conversions.
     * @return {Ext.data.Model} The new record.
     */
    createRecord: function (type, data) {
        var me = this,
            entityType = type.$isClass ? type : me.getSchema().getEntity(type),
            record = new entityType(data, me); // this adds record to our data

        return record;
    },

    getSession: function () {
        return this;
    },

    /**
     *
     * @param descriptor
     * @param callback
     * @param scope
     * @param {Object} [options]
     * @return {Ext.data.session.Binding}
     */
    bind: function (descriptor, callback, scope, options) {
        var stub = this.getStub(descriptor.reference, descriptor.id,
                                descriptor.association, descriptor.validation, options);

        return stub.bind(callback, scope || this, options);
    },

    /**
     * Returns an object describing all of the modified fields, created or dropped records
     * and many-to-many association changes maintained by this session.
     *
     * @return {Object}
     */
    getChanges: function () {
        var me = this,
            data = me.data,
            matrices = me.matrices,
            ret = null,
            schema = me.getSchema(),
            all, bucket, created, dirty, dropped, entity, entityType, id, id2, matrix, name,
            assoc, assocName, createOpt, key, members, updateOpt, writer, slice, slices,
            state;

        for (name in data) {
            // Consult the Writer for the entity to determine its preferences for writing
            // complete or partial data. We rely on the serialization of the record's
            // getData method whereas the Writer has its own ideas on the matter.
            entityType = schema.getEntity(name);
            writer = entityType.getProxy().getWriter();
            createOpt = Ext.Object.chain(writer.getAllDataOptions());
            updateOpt = Ext.Object.chain(writer.getPartialDataOptions());
            createOpt.serialize = updateOpt.serialize = true;

            all = data[name];  // all entities of type "name"
            for (id in all) {
                entity = all[id].record;
                if (entity) {
                    created = entity.phantom;
                    dirty   = entity.dirty;
                    dropped = entity.dropped;

                    if (created && dropped) {
                        continue;
                    }

                    if (created || dirty || dropped) {
                        bucket = (ret || (ret = {}))[name] || (ret[name] = {});

                        //  User: {
                        //      C: [
                        //          { id: 20, name: 'Don' }
                        //      ],
                        //      U: [
                        //          { id: 30, name: 'Don' }
                        //      ],
                        //      D: [ 40, 50 ]
                        //  }
                        if (created) {
                            bucket = bucket.C || (bucket.C = []);
                            bucket.push(entity.getData(createOpt));
                        } else if (dropped) {
                            bucket = bucket.D || (bucket.D = []);
                            bucket.push(entity.id);
                        } else { // dirty
                            bucket = bucket.U || (bucket.U = []);
                            bucket.push(entity.getData(updateOpt));
                        }
                    }
                }
            }
        }

        for (name in matrices) {
            matrix = matrices[name].left;  // e.g., UserGroups.left (Users)
            slices = matrix.slices;
            name = matrix.role.type; // e.g., "User"
            assocName = matrix.role.inverse.role; // e.g., "groups"

            for (id in slices) {
                slice = slices[id];
                members = slice.members;

                for (id2 in members) {
                    state = (assoc = members[id2])[2];

                    //  User: {
                    //      groups: {
                    //          C: {
                    //              20: [ 30, 40 ]  // associate User 20 w/Groups 30 & 40
                    //          },
                    //          D: {
                    //              10: [ 50 ]  // disassociate User 10 w/Group 50
                    //          }
                    //      }
                    //  }
                    if (state) {
                        key = (state < 0) ? 'D' : 'C';
                        bucket = (ret || (ret = {}))[name] || (ret[name] = {}); // User
                        bucket = bucket[assocName] || (bucket[assocName] = {}); // groups
                        bucket = bucket[key] || (bucket[key] = {}); // C or D
                        bucket = bucket[id] || (bucket[id] = []);

                        bucket.push(assoc[1]);
                    }
                }
            }
        }

        return ret;
    },

    gatherSaveOperations: function (batch) {
        var me = this,
            entities = me.data,
            map = null,
            all, bucket, created, dirty, dropped, entity, id, key, name, operation, proxy;

        for (name in entities) {
            all = entities[name];  // all entities of this type
            for (id in all) {
                entity = all[id].record;
                if (entity) {
                    created = entity.phantom;
                    dirty   = entity.dirty;
                    dropped = entity.dropped;

                    if (created && dropped) {
                        continue;
                    }

                    if (created || dirty || dropped) {
                        bucket = (map || (map = {}))[name] || (map[name] = {
                            entity: entity.self
                        });

                        key = created ? 'create' : (dropped ? 'destroy' : 'update');
                        bucket = bucket[key] || (bucket[key] = []);
                        bucket.push(entity);

                        //  User: {
                        //      proxy: User.getProxy(),
                        //      create: [
                        //          { id: 20, name: 'Don' }
                        //      ]
                        //  }
                    }
                }
            }
        }

        if (map) {
            if (!batch) {
                batch = new Ext.data.Batch();
            }

            for (name in map) {
                bucket = map[name];
                entity = bucket.entity; // the entity class
                delete bucket.entity;
                proxy = entity.getProxy();

                for (key in bucket) {
                    operation = proxy.createOperation(key, {
                        records: bucket[key]
                    });
                    operation.entityType = entity;

                    batch.add(operation);
                }
            }
        }

        return batch;
    },

    /**
     * Returns an `Ext.data.Batch` containing the `Ext.data.operation.Operation` instances
     * that are needed to save all of the changes in this session. This sorting is based
     * on operation type, associations and foreign keys. Generally speaking the operations
     * in the batch can be committed to a server sequentially and the server will never be
     * sent a request with an invalid (client-generated) id in a foreign key field.
     *
     * @param {Boolean} [sort=true] Pass `false` to disable the batch operation sort.
     * @return {Ext.data.Batch}
     */
    getSaveBatch: function (sort) {
        var batch = this.gatherSaveOperations();

        if (batch && sort !== false) {
            batch.sort();
        }

        return batch;
    },
    
    /**
     * Checks whether an entity exists in the session.
     * @param {String/Ext.data.Model} entityName The entity name, or a model instance.
     * @param {Object} id The id of the entity. Not required when passign a model instance.
     * @return {Boolean} `true` if the entity exists in the session
     */
    contains: function(entityName, id) {
        return !!this.peekEntityStub(entityName, id);
    },
    
    getEntry: function(entityName, id) {
        if (entityName.isModel) {
            id = entityName.getId();
            entityName = entityName.entityName;
        }
        
        entityName = this.getSchema().getEntityName(entityName);
        var bucket = this.data[entityName],
            entry = bucket && bucket[id];
        
        return entry || null;
    },

    peekEntity: function (entityName, id) {
        var entry = this.getEntry(entityName, id);            
        return (entry && entry.record) || null;
    },
    
    peekEntityStub: function(entityName, id) {
        var entry = this.getEntry(entityName, id);   
        return entry && entry.stub || null;
    },
    
    getEntity: function(entityName, id) {
        var stub = this.getEntityStub(entityName, id),
            rec;
            
        if (stub) {
            rec = stub.getRawValue();    
        }
        return rec || null;
    },
    
    getEntityStub: function (entityName, id) {
        var peek = this.peekEntityStub(entityName, id);
        
        if (!peek) {
            peek = this.getStub(entityName, id);
        }
        return peek;
    },

    notify: function () {
        this.getScheduler().notify();
    },

    //-------------------------------------------------------------------------
    privates: {
        add: function (record) {
            var data = this.data,
                entityName = record.entityName,
                id = record.id,
                associatedRecord, associatedStub, associations, entry, name, role,
                roleName, store;

            // Track down the entry for this record
            entry = data[entityName] || (data[entityName] = {});
            entry = entry[id] || (entry[id] = { assoc: {} });
            associations = entry.assoc;

            //<debug>
            if (entry.record) {
                Ext.Error.raise('Duplicate id ' + record.id + ' for ' + entityName);
            }
            //</debug>

            entry.record = record;
            
            // Force stub creation & setting the stub reference on the instance
            this.getStub(entityName, id);

            // Update any associations to this record.
            for (roleName in associations) {
                associatedStub = associations[roleName];
                role = associatedStub.role;

                if (!(store = associatedStub.store)) {
                    associatedRecord = associatedStub.record;
                    if (associatedRecord) {
                        record[role.role] = associatedRecord;
                        associatedRecord[role.inverse.role] = record;
                    }
                } else {
                    name = role.storeName || role.getStoreName();
                    store.associatedEntity = record;
                    record[name] = store;
                }
            }

            this.registerReferences(record);
        },

        applyScheduler: function (scheduler) {
            if (scheduler && !scheduler.isScheduler) {
                scheduler = new Ext.util.Scheduler(scheduler);
            }

            return scheduler;
        },

        applySchema: function (schema) {
            return Ext.data.schema.Schema.get(schema);
        },

        getIdentifier: function (entityType) {
            var cache = this.identifierCache,
                identifier = entityType.identifier,
                key = identifier.id || entityType.entityName,
                ret = cache[key];

            if (!ret) {
                if (identifier.clone) {
                    ret = identifier.clone({
                        cache: cache
                    });
                } else {
                    ret = identifier;
                }

                cache[key] = ret;
            }

            return ret;
        },

        getMatrix: function (matrix) {
            var name = matrix.isManyToMany ? matrix.name : matrix,
                matrices = this.matrices;

            return matrices[name] ||
                   (matrices[name] = new Ext.data.session.Matrix(this, matrix));
        },

        getMatrixSlice: function (role, id) {
            var matrix = this.getMatrix(role.association),
                side = matrix[role.side];

            return side.get(id);
        },

        /**
         * This method looks up the `Stub` pieces of a single bind descriptor.
         *
         * @param {String} reference The `entityName` of the referenced type.
         * @param {String/Number} id The `idProperty` value of the entity.
         * @param {String} [association] The name of association role.
         * @param {Boolean} [validation] Passing `true` binds to the associated
         * `Ext.data.Validation` record for the entity.
         * @param {Object} [config] Extra configuration options to pass to the stub if it is
         * created by this call.
         * @return {Ext.data.session.AbstractStub} The `Stub` associated to the bind descriptor.
         * @private
         */
        getStub: function (reference, id, association, validation, config) {
            var me = this,
                entityType = reference,
                name = id,
                entry, map, role, stub;

            if (entityType.$isClass) {
                reference = entityType.entityName;
            } else {
                entityType = me.getSchema().getEntity(reference);
            }

            map = {
                entityId: id,
                entityType: entityType
            };
            config = config ? Ext.apply(map, config) : map;

            //<debug>
            if (!(id || id === 0)) {
                Ext.Error.raise('Must specify "id" on reference to ' + reference);
            }
            if (!entityType) {
                Ext.Error.raise('Entity type not defined: ' + reference);
            }
            //</debug>

            /*
             *  {
             *      Order: {
             *          12: {
             *              record: new Order({
             *                  data: {
             *                  },
             *                  $stub: ...
             *              }),
             *
             *              refs: {
             *                  orderItems: {
             *                      100: orderItem (id = 100)
             *                  }
             *              },
             *
             *              stub: new Ext.data.session.EntityStub({
             *                  record: ...
             *              }),
             *
             *              val: new Ext.data.session.ValidationStub({
             *                  entityBinding: ...
             *              });
             *
             *              assoc: {
             *                  orderItems: new Ext.data.session.AssociationStub({
             *                      store: ...
             *                  })
             *              }
             *          }
             *      }
             *  }
             */

            map = me.data;
            map = map[reference] || (map[reference] = {});  // entityName
            entry = map[id] || (map[id] = { assoc: {} });
            stub = association ? entry.assoc[association]
                               : (validation ? entry.val : entry.stub);

            if (!stub) {
                config.entry = entry;
                name += '@';
                name += reference;

                if (association) {
                    config.associatedEntity = entry.record;
                    config.role = role = entityType.associations[association];
                    //<debug>
                    if (!role) {
                        Ext.Error.raise('Entity ' + reference + ' has no association ' +
                                        association);
                    }
                    //</debug>

                    name += ':';
                    name += association;

                    entry.assoc[association] = stub = role.createStub(me, name, config);
                } else if (validation) {
                    entry.val = stub = new Ext.data.session.ValidationStub(me, name, config);
                } else {
                    entry.stub = stub = new Ext.data.session.EntityStub(me, name, config);
                }
            }

            return stub;
        },

        recordCreator: function (data, Model) {
            var me = this,
                idField = Model.idField,
                id = idField.calculated ? (new Model(data)).id : data[idField.name],
                entityName = Model.entityName,
                entry = me.data,
                record;

            entry = entry[entityName] || (entry[entityName] = {});
            entry = entry[id] || (entry[id] = { assoc: {} });

            if (!(record = entry.record)) {
                // We may have a stub that is loading the record (in fact this may be the
                // call coming from that Reader), but the resolution is simple. By creating
                // the record it is registered in the data[entityName][id] entry anyway
                // and the stub will deal with it onLoad.
                record = new Model(data, me);
            }
            //else {
                //TODO no easy answer here... we are trying to create a record and have
                //TODO some (potentially new) data. We probably should check for mid-air
                //TODO collisions using versionProperty but for now we just ignore the
                //TODO new data in favor of our potentially edited data.
            //}

            return record;
        },

        registerReferences: function (record, oldId) {
            var data = this.data,
                entityName = record.entityName,
                id = record.id,
                recordData = record.data,
                remove = oldId || oldId === 0,
                entry, i, fk, len, reference, references, refs, roleName;

            // Register this records references to other records
            len = (references = record.references).length;

            for (i = 0; i < len; ++i) {
                reference = references[i];  // e.g., an orderId field
                fk = recordData[reference.name];  // the orderId

                if (fk || fk === 0) {
                    reference = reference.reference; // the "order" association role
                    entityName = reference.type;
                    roleName = reference.inverse.role;

                    // Track down the entry for the associated record
                    entry = data[entityName] || (data[entityName] = {});
                    entry = entry[fk] || (entry[fk] = { assoc: {} });
                    refs = entry.refs || (entry.refs = {});
                    refs = refs[roleName] || (refs[roleName] = {});

                    refs[id] = record;
                    if (remove) {
                        delete refs[oldId];
                    }
                }
            }
        },

        spawn: function (config) {
            //TODO be more clever
            return new this.self(Ext.merge(Ext.merge({}, this.initialConfig), config));
        },

        updateReference: function (record, field, newValue, oldValue) {
            var data = this.data,
                reference = field.reference,
                entityName = reference.type,
                roleName = reference.inverse.role,
                id = record.id,
                bucket, entry, refs;

            bucket = data[entityName] || (data[entityName] = {});

            if (oldValue || oldValue === 0) {
                // We must be already in this entry.refs collection
                refs = bucket[oldValue].refs[roleName];
                delete refs[id];
            }

            if (newValue || newValue === 0) {
                entry = bucket[newValue] || (bucket[newValue] = { assoc: {} });
                refs = entry.refs || (entry.refs = {});
                refs = refs[roleName] || (refs[roleName] = {});
                refs[id] = record;
            }
        },

        //---------------------------------------------------------------------
        // Record callbacks called because we are the "session" for the record.

        afterEdit: function (record) {
            var stub = record.$stub;

            if (stub) {
                stub.schedule();
            }
        },

        _setNoRefs: {
            refs: false
        },

        onIdChanged: function (record, oldId, newId) {
            var me = this,
                entityName = record.entityName,
                id = record.id,
                bucket = me.data[entityName],
                entry = bucket[oldId],
                associations = entry.assoc,
                refs = entry.refs,
                setNoRefs = me._setNoRefs,
                association, fieldName, matrix, refId, role, roleName, roleRefs, store;

            //<debug>
            if (bucket[newId]) {
                Ext.Error.raise('Cannot change ' + entityName + ' id from ' + oldId +
                                ' to ' + newId + ' id already exists');
            }
            //</debug>

            delete bucket[oldId];
            bucket[newId] = entry;

            for (roleName in associations) {
                store = associations[roleName].store;
                if (store) {
                    store.associatedEntityId = newId;
                    matrix = store.matrix;
                    if (matrix) {
                        matrix.changeId(newId);
                    }
                }
            }

            if (refs) {
                associations = record.associations;

                for (roleName in refs) {
                    roleRefs = refs[roleName];
                    role = associations[roleName];
                    association = role.association;

                    if (association.isManyToMany) {
                        // TODO
                    } else {
                        fieldName = association.field.name;

                        for (refId in roleRefs) {
                            roleRefs[refId].set(fieldName, id, setNoRefs);
                        }
                    }
                }
            }

            me.registerReferences(record, oldId);
        }
    }
});
