describe("Ext.data.session.Session", function() {
    function completeRequest(data, requestId) {
        Ext.Ajax.mockComplete({
            status: 200,
            responseText: Ext.encode(data)
        }, requestId);
    }

    describe('Provisional identifiers', function () {
        function makeSuite (title, schema, expectations) {
            describe('Schema with ' + title, function () {
                var scheduler, session;
                var Base, Derived;

                beforeEach(function() {
                    Base = Ext.define('spec.Base', {
                        extend: Ext.data.Model,

                        schema: schema,

                        fields: ['id', 'name', 'key']
                    });

                    Derived = Ext.define('spec.Derived', {
                        extend: Base
                    });

                    session = new Ext.data.session.Session({
                        schema: Base.schema,

                        scheduler: {
                            // Make a huge tickDelay, we'll control it by forcing ticks
                            tickDelay: 1000000
                        }
                    });

                    scheduler = session.getScheduler();
                });

                afterEach(function() {
                    Ext.destroy(session);

                    Base.schema.clear();
                    Ext.undefine('spec.Base');
                    Ext.undefine('spec.Derived');

                    session = scheduler = null;
                    Base = Derived = null;
                });

                describe("record creation", function() {
                    it('should isolate id generation to the session', function () {
                        var standaloneRecord = new Base();

                        var sessionRecord = session.createRecord('Base', {
                            name: 'Don'
                        });

                        expect(standaloneRecord).not.toBe(sessionRecord);
                        expect(sessionRecord.id).toBe(standaloneRecord.id);
                    });

                    it('should track all created records', function () {
                        var a = session.createRecord('Base', {
                            name: 'Don'
                        });
                        expect(a.id).toBe(expectations['B-1']);

                        var b = session.createRecord('Derived', {
                            name: 'Evan'
                        });
                        expect(b.id).toBe(expectations['D-1']);

                        var changes = session.getChanges();

                        expect(changes).toEqual({
                            Base: {
                                C: [{
                                    id: a.id,
                                    name: 'Don'
                                }]
                            },
                            Derived: {
                                C: [{
                                    id: b.id,
                                    name: 'Evan'
                                }]
                            }
                        });
                    });
                }); // record creation
            });
        } // makeSuite

        makeSuite('default identities', Ext.data.Model.schema, {
            'B-1': 'Base-1',
            'D-1': 'Derived-1'
        });

        makeSuite('negative identities', new Ext.data.schema.Schema({
            defaultIdentifier: 'negative'
        }), {
            'B-1': -1,
            'D-1': -1
        });

        makeSuite('sequential identities', new Ext.data.schema.Schema({
            defaultIdentifier: 'sequential'
        }), {
            'B-1': 1,
            'D-1': 1
        });
    });

    describe("Random UUID's", function () {
        var scheduler, session;
        var Base, Derived;
        var schema;

        beforeEach(function() {
            if (!schema) {
                schema = new Ext.data.schema.Schema({
                    defaultIdentifier: 'uuid'
                });
            }

            Base = Ext.define('spec.Base', {
                extend: Ext.data.Model,

                schema: schema,

                fields: ['id', 'name', 'key']
            });

            session = new Ext.data.session.Session({
                schema: Base.schema,

                scheduler: {
                    // Make a huge tickDelay, we'll control it by forcing ticks
                    tickDelay: 1000000
                }
            });

            scheduler = session.getScheduler();
        });

        afterEach(function() {
            Ext.destroy(session);

            Base.schema.clear();
            Ext.undefine('spec.Base');
            Ext.undefine('spec.Derived');

            session = scheduler = null;
            Base = Derived = null;
        });

        describe("record creation", function() {
            it('should copy identifier reference into the session', function () {
                var standaloneRecord = new Base();

                var sessionRecord = session.createRecord('Base', {
                    name: 'Don'
                });

                expect(standaloneRecord).not.toBe(sessionRecord);
                expect(sessionRecord.id).not.toBe(standaloneRecord.id); // uuid !

                var defaultIdentifier = session.getSchema().getDefaultIdentifier();
                var identA = session.getIdentifier(Base);

                expect(identA).toBe(Base.identifier); // not cloned
                expect(identA).toBe(defaultIdentifier);
                expect(identA).toBe(Ext.data.identifier.Uuid.Global);
            });
        }); // record creation
    }); // Random UUID's

    describe("Sequential UUID's", function () {
        var scheduler, session;
        var Base, Derived;
        var schema;

        beforeEach(function() {
            if (!schema) {
                schema = new Ext.data.schema.Schema({
                    defaultIdentifier: {
                        type: 'uuid',
                        version: 1,
                        timestamp: 0xDEFACED,
                        salt: 0xBEEFF00D,
                        clockSeq: 0xBAD
                    }
                });
            }

            Base = Ext.define('spec.Base', {
                extend: Ext.data.Model,

                schema: schema,

                fields: ['id', 'name', 'key']
            });

            session = new Ext.data.session.Session({
                schema: Base.schema,

                scheduler: {
                    // Make a huge tickDelay, we'll control it by forcing ticks
                    tickDelay: 1000000
                }
            });

            scheduler = session.getScheduler();
        });

        afterEach(function() {
            Ext.destroy(session);

            Base.schema.clear();
            Ext.undefine('spec.Base');
            Ext.undefine('spec.Derived');

            session = scheduler = null;
            Base = Derived = null;
        });

        describe("record creation", function() {
            it('should copy identifier reference into the session', function () {
                var standaloneRec = new Base();

                var sessionRecord = session.createRecord('Base', {
                    name: 'Don'
                });

                expect(standaloneRec.id).toBe('0defaced-0000-1000-8bad-0100beeff00d');
                expect(sessionRecord.id).toBe('0defacee-0000-1000-8bad-0100beeff00d');
                // changes right here                 ^

                var defaultIdentifier = session.getSchema().getDefaultIdentifier();
                var identA = session.getIdentifier(Base);

                expect(identA).toBe(Base.identifier); // not cloned
                expect(identA).toBe(defaultIdentifier);

                expect(identA).not.toBe(Ext.data.identifier.Uuid.Global);
            });
        }); // record creation
    }); // Sequential UUID's

    var adminGroup = {
        id: 42,
        name: 'Admins'
    };
    var peonGroup = {
        id: 427,
        name: 'Peons'
    };
    var userRufus = {
        id: 10,
        name: 'Rufus'
    };
    var userBill = {
        id: 20,
        name: 'Bill'
    };
    var userTed = {
        id: 30,
        name: 'Ted'
    };

    var rufusGroups = [ adminGroup, peonGroup ];
    var billGroups = [ peonGroup ];
    var tedGroups = [ peonGroup ];

    var adminUsers = [ userRufus ];
    var peonUsers = [ userBill, userTed, userRufus ];

    describe('Many-to-many associations', function () {
        var scheduler, session;
        var User, Group;

        beforeEach(function() {
            MockAjaxManager.addMethods();

            User = Ext.define('spec.User', {
                extend: Ext.data.Model,

                fields: [ 'name', 'key' ],

                manyToMany: '#Group'
            });

            Group = Ext.define('spec.Group', {
                extend: Ext.data.Model,

                fields: [ 'name', 'key' ]

                // should not need to specify manyToMany here
            });

            session = new Ext.data.session.Session({
                schema: User.schema,

                scheduler: {
                    // Make a huge tickDelay, we'll control it by forcing ticks
                    tickDelay: 1000000
                }
            });

            scheduler = session.getScheduler();
        });

        afterEach(function() {
            Ext.destroy(session);

            MockAjaxManager.removeMethods();

            User.schema.clear();
            Ext.undefine('spec.User');
            Ext.undefine('spec.Group');

            session = scheduler = null;
            User = Group = null;
        });

        describe("loading a many-to-many", function() {
            it('should load groups for a user', function () {
                var groups=0;

                session.bind({
                        reference: 'User',
                        id: userRufus.id,
                        association: 'groups'
                    },
                    function (loaded) {
                        groups = loaded;
                    });

                scheduler.notify(); // ajax loads are scheduled so let the load start

                completeRequest(rufusGroups);

                scheduler.notify();

                expect(groups.isStore).toBe(true);
                expect(groups.getCount()).toBe(2);
                expect(groups.getById(adminGroup.id)).toBeTruthy();
                expect(groups.getById(peonGroup.id)).toBeTruthy();

                // Some whitebox testing here. We peek into the sessions matrix pool and
                // verify that ids are on the proper "sides".
                var matrix = session.matrices.UserGroups;

                expect(matrix.left.slices[10].members[42]).toEqual([10, 42, 0]);
                expect(matrix.left.slices[10].members[427]).toEqual([10, 427, 0]);

                expect(matrix.right.slices[42].members[10]).toEqual([10, 42, 0]);
                expect(matrix.right.slices[427].members[10]).toEqual([10, 427, 0]);
            });

            it('should load both sides of a matrix', function () {
                var rufusGroupsStore= 0,
                    adminUsersStore=0,
                    peonUsersStore=0;

                session.bind({
                        reference: 'User',
                        id: userRufus.id,
                        association: 'groups'
                    },
                    function (loaded) {
                        rufusGroupsStore = loaded;
                    });
                session.bind({
                        reference: 'Group',
                        id: peonGroup.id,
                        association: 'users'
                    },
                    function (loaded) {
                        peonUsersStore = loaded;
                    });
                session.bind({
                        reference: 'Group',
                        id: adminGroup.id,
                        association: 'users'
                    },
                    function (loaded) {
                        adminUsersStore = loaded;
                    });

                scheduler.notify(); // ajax loads are scheduled so let the load start

                completeRequest(rufusGroups, 1);
                completeRequest(peonUsers, 2);
                completeRequest(adminUsers, 3);

                scheduler.notify();

                expect(rufusGroupsStore.isStore).toBe(true);
                expect(rufusGroupsStore.getCount()).toBe(2);
                expect(rufusGroupsStore.getById(adminGroup.id)).toBeTruthy();
                expect(rufusGroupsStore.getById(peonGroup.id)).toBeTruthy();

                var rufusRec1, rufusRec2;

                expect(adminUsersStore.isStore).toBe(true);
                expect(adminUsersStore.getCount()).toBe(1);
                expect(rufusRec1 = adminUsersStore.getById(userRufus.id)).toBeTruthy();

                expect(peonUsersStore.isStore).toBe(true);
                expect(peonUsersStore.getCount()).toBe(3);
                expect(peonUsersStore.getById(userBill.id)).toBeTruthy();
                expect(peonUsersStore.getById(userTed.id)).toBeTruthy();
                expect(rufusRec2 = peonUsersStore.getById(userRufus.id)).toBeTruthy();

                expect(rufusRec1).toBe(rufusRec2);
            });

            it('should allow editing on both sides of a matrix', function () {
                var billGroupsStore = 0,
                    rufusGroupsStore = 0,
                    adminUsersStore = 0,
                    peonUsersStore = 0;

                session.bind({
                        reference: 'User',
                        id: userRufus.id,
                        association: 'groups'
                    },
                    function (loaded) {
                        rufusGroupsStore = loaded;
                    });
                session.bind({
                        reference: 'User',
                        id: userBill.id,
                        association: 'groups'
                    },
                    function (loaded) {
                        billGroupsStore = loaded;
                    });
                session.bind({
                        reference: 'Group',
                        id: peonGroup.id,
                        association: 'users'
                    },
                    function (loaded) {
                        peonUsersStore = loaded;
                    });
                session.bind({
                        reference: 'Group',
                        id: adminGroup.id,
                        association: 'users'
                    },
                    function (loaded) {
                        adminUsersStore = loaded;
                    });

                scheduler.notify(); // ajax loads are scheduled so let the load start

                completeRequest(rufusGroups, 1);
                completeRequest(billGroups, 2);
                completeRequest(peonUsers, 3);
                completeRequest(adminUsers, 4);

                scheduler.notify();

                // Removing Rufus from the adminUsersStore should reflexively remove
                // the adminGroup from rufusGroupsStore.
                expect(rufusGroupsStore.getCount()).toBe(2);
                expect(rufusGroupsStore.getById(adminGroup.id)).toBeTruthy();

                var rufusRec = adminUsersStore.getById(userRufus.id);
                adminUsersStore.remove(rufusRec);

                expect(rufusGroupsStore.getCount()).toBe(1);
                expect(rufusGroupsStore.getById(adminGroup.id)).toBe(null);

                // Adding Bill to the adminUsersStore should reflexively add adminGroup
                // to billGroupsStore
                expect(billGroupsStore.getCount()).toBe(1);
                expect(billGroupsStore.getById(adminGroup.id)).toBe(null);

                var billRec = peonUsersStore.getById(userBill.id);
                adminUsersStore.add(billRec);

                expect(billGroupsStore.getCount()).toBe(2);
                expect(billGroupsStore.getById(adminGroup.id)).toBeTruthy();

                var changes = session.getChanges();
                expect(changes).toEqual({
                    User: {
                        groups: {
                            C: {
                                20: [42]
                            },
                            D: {
                                10: [42]
                            }
                        }
                    }
                });
            }); // should allow editing on both sides of a matrix
        }); // loading a many-to-many
    }); // Many-to-many associations

    describe('transactions', function () {
        var scheduler, session;
        var Base, Parent, Child, GrandChild, Group, User;

        var parentData = [ { id: 1, name: 'parent1', code: 'abc', foo: 42 },
            { id: 2, name: 'parent2', code: 'def', foo: 427 } ];

        var childData = [ { id: 10, name: 'child1', parentId: 1 },
            { id: 20, name: 'child2', parentId: 2 } ];

        var grandChildData = [ { id: 100, name: 'grand1', childId: 10 },
            { id: 200, name: 'grand2', childId: 20 } ];

        beforeEach(function() {
            MockAjaxManager.addMethods();

            Base = Ext.define('spec.Base', {
                extend: Ext.data.Model
            });

            User = Ext.define('spec.User', {
                extend: Ext.data.Model,

                fields: [ 'name', 'key' ],

                manyToMany: '#Group'
            });

            Group = Ext.define('spec.Group', {
                extend: Ext.data.Model,

                fields: [ 'name', 'key' ]

                // should not need to specify manyToMany here
            });

            Parent = Ext.define('spec.Parent', {
                extend: Base,

                identifier: {
                    type: 'negative'
                },
                fields: [
                    'name',
                    'code',
                    { name: 'foo', critical: true }
                ]
            });

            Child = Ext.define('spec.Child', {
                extend: Base,

                identifier: {
                    type: 'negative',
                    seed: -10
                },
                fields: [
                    'name',
                    { name: 'parentId', reference: 'Parent' }
                ]
            });

            GrandChild = Ext.define('spec.GrandChild', {
                extend: Base,

                identifier: {
                    type: 'negative',
                    seed: -100
                },

                clientIdProperty: 'cid',

                fields: [
                    'name',
                    { name: 'childId', reference: 'Child' }
                ]
            });

            session = new Ext.data.session.Session({
                schema: Base.schema,

                scheduler: {
                    // Make a huge tickDelay, we'll control it by forcing ticks
                    tickDelay: 1000000
                }
            });

            scheduler = session.getScheduler();
        });

        afterEach(function() {
            Ext.destroy(session);

            MockAjaxManager.removeMethods();

            Base.schema.clear();
            Ext.undefine('spec.Base');
            Ext.undefine('spec.Parent');
            Ext.undefine('spec.Child');
            Ext.undefine('spec.GrandChild');
            Ext.undefine('spec.Group');
            Ext.undefine('spec.User');

            session = scheduler = null;
            Base = Parent = Child = GrandChild = Group = User = null;
        });

        describe('complex transaction', function () {
            var state;

            beforeEach(function () {
                state = {
                    calls: 0,
                    parentRecs: [],
                    childRecs: [],
                    grandChildRecs: []
                };

                Ext.each([1, 2], function (id) {
                    session.bind({ reference: 'GrandChild', id: id * 100 },
                        function (loaded) {
                            ++state.calls;
                            state.grandChildRecs[id-1] = loaded;
                        });
                    session.bind({ reference: 'Child', id: id * 10 },
                        function (loaded) {
                            ++state.calls;
                            state.childRecs[id-1] = loaded;
                        });
                    session.bind({ reference: 'Parent', id: id },
                        function (loaded) {
                            ++state.calls;
                            state.parentRecs[id-1] = loaded;
                        });
                });

                expect(state.calls).toBe(0);
                session.notify(); // starts the loads
                expect(state.calls).toBe(0);

                Ext.each([0, 1], function (n) {
                    completeRequest(grandChildData[n], n * 3 + 1);
                    completeRequest(childData[n], n * 3 + 2);
                    completeRequest(parentData[n], n * 3 + 3);
                });

                expect(state.calls).toBe(0);
                session.notify(); // notifies bindings of loaded records
                expect(state.calls).toBe(6);

                // Make some changes - creates, updates and deletes of all types
                state.parentRecs[0].set('code', 'xyz');
                state.childRecs[0].set('name', 'child1a');
                state.grandChildRecs[0].set('name', 'grand1a');

                state.parentRecs[1].drop();
                state.childRecs[1].drop();
                state.grandChildRecs[1].drop();

                state.newParent = session.createRecord('Parent', { name: 'newParent', foo: -42 });
                state.newChild = session.createRecord('Child', { name: 'newChild' });
                state.newGrandChild = session.createRecord('GrandChild');

                state.newChild.setParent(state.newParent);
                state.newGrandChild.setChild(state.newChild);

                return state;
            });
            afterEach(function () {
                state = null;
            });

            it('should describe the transaction via getChanges', function () {
                // Quick sanity check on pending changes
                var changes = session.getChanges();

                expect(changes).toEqual({
                    Parent: {
                        C: [ { id: -1, name: 'newParent', foo: -42 } ],
                        U: [ { id: 1, code: 'xyz', foo: 42 } ], // foo is a "critical" field
                        D: [ 2 ]
                    },
                    Child: {
                        C: [ { id: -10, name: 'newChild', parentId: -1 } ],
                        U: [ { id: 10, name: 'child1a' } ],
                        D: [ 20 ]
                    },
                    GrandChild: {
                        C: [ { id: -100, childId: -10 } ],
                        U: [ { id: 100, name: 'grand1a' } ],
                        D: [ 200 ]
                    }
                });
            });

            it('should produce a Batch via getSaveBatch', function () {
                var batch = session.getSaveBatch();

                expect(batch.operations.length).toBe(9);

                Ext.each([
                    [ 'create', 'Parent',       [ state.newParent ] ],
                    [ 'create', 'Child',        [ state.newChild ] ],
                    [ 'create', 'GrandChild',   [ state.newGrandChild ] ],

                    [ 'update', 'Parent',       [ state.parentRecs[0] ] ],
                    [ 'update', 'Child',        [ state.childRecs[0] ] ],
                    [ 'update', 'GrandChild',   [ state.grandChildRecs[0] ] ],

                    [ 'destroy', 'GrandChild',  [ state.grandChildRecs[1] ] ],
                    [ 'destroy', 'Child',       [ state.childRecs[1] ] ],
                    [ 'destroy', 'Parent',      [ state.parentRecs[1] ] ]
                ], function (expectedData, index) {
                    var operation = batch.operations[index],
                        str;

                    str = 'operation[' + index + '].action=';
                    expect(str + operation.action).toBe(str + expectedData[0]);

                    str = 'operation[' + index + '].type=';
                    expect(str + operation.entityType.entityName).toBe(str + expectedData[1]);

                    str = 'operation[' + index + '].records=';
                    var actual = Ext.Array.pluck(operation.getRecords(), 'id');
                    actual = Ext.encode(actual);
                    var expected = Ext.Array.pluck(expectedData[2], 'id');
                    expected = Ext.encode(expected);
                    expect(str + actual).toBe(str + expected);
                });
            });

            it('should progress save batch to completion', function () {
                var newGrandChild2 = session.createRecord('GrandChild');

                newGrandChild2.setChild(state.newChild);
                expect(newGrandChild2.id).toBe(-101);
                expect(newGrandChild2.data.childId).toBe(-10);

                var batch = session.getSaveBatch();

                expect(batch.operations.length).toBe(9);

                // These should be in this order so that clientIdProperty can be tested
                // properly - we send the response records in the reverse order to ensure
                // we are not just matching by indexes.
                var createGrandChildRecs = batch.operations[2].getRecords();
                expect(createGrandChildRecs[0]).toBe(state.newGrandChild);
                expect(createGrandChildRecs[1]).toBe(newGrandChild2);

                batch.start();

                // Create Parent
                completeRequest({
                    id: 1000
                });
                expect(state.newParent.id).toBe(1000);
                expect(state.newChild.data.parentId).toBe(1000);

                // Create Child
                completeRequest({
                    id: 2000
                });
                expect(state.newChild.id).toBe(2000);
                expect(state.newGrandChild.data.childId).toBe(2000);
                expect(newGrandChild2.data.childId).toBe(2000);

                // Create GrandChild (respond in reverse order & custom clientIdProperty)
                completeRequest([{
                    cid: newGrandChild2.id,
                    id: 3001
                },{
                    cid: state.newGrandChild.id,
                    id: 3000
                }]);
                expect(state.newGrandChild.id).toBe(3000);
                expect(newGrandChild2.id).toBe(3001);

            });
        }); // complex transaction

        describe('matrix updates', function () {
            it('should be able to create matrix for new record', function () {
                var rufusGroupsStore=0;

                session.bind({
                        reference: 'User',
                        id: userRufus.id,
                        association: 'groups'
                    },
                    function (loaded) {
                        rufusGroupsStore = loaded;
                    });

                scheduler.notify(); // allow loads to start
                completeRequest(rufusGroups);
                scheduler.notify(); // allow bindings to fire

                var user = session.createRecord('User');
                var groups = user.groups();
                groups.add(rufusGroupsStore.getAt(0));

                var batch = session.getSaveBatch();
                var changes = session.getChanges();

                expect(batch.operations.length).toBe(1); // Create for new User
                expect(changes).toEqual({
                    User: {
                        C: [{
                            id: 'User-1'
                        }],

                        groups: {
                            C: {
                                'User-1': [ 42 ] // this is the generated id
                            }
                        }
                    }
                });

                batch.start();
                completeRequest({
                    id: 500
                });

                var remainingChanges = session.getChanges();
                expect(remainingChanges).toEqual({
                    User: {
                        groups: {
                            C: {
                                500: [ 42 ]  // make sure the matrix has the newId
                            }
                        }
                    }
                });
            });
        });
    });
});
