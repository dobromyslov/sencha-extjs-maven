describe("Ext.data.schema.ManyToMany", function() {
    
    var SimpleUser, SimpleGroup, FooBarThing, FooGoo,
        User2, Group2, User3, Group3, User4, Group4, User5, Group5,
        schema;

    beforeEach(function () {
        var Base = Ext.define('spec.many2many.Base', {
            extend: 'Ext.data.Model',

            schema: {
                //
            }
        });

        schema = Base.schema;
        schema.clear();

        // Simple (one-side specified, default ordering)
        SimpleUser = Ext.define('spec.many2many.User', {
            extend: 'spec.many2many.Base',
            manyToMany: 'Group'
        });

        SimpleGroup = Ext.define('spec.many2many.Group', {
            extend: 'spec.many2many.Base'
        });

        // Side-specified
        User2 = Ext.define('spec.many2many.User2', {
            extend: 'spec.many2many.Base',
            manyToMany: '#Group2'
        });

        Group2 = Ext.define('spec.many2many.Group2', {
            extend: 'spec.many2many.Base',
            manyToMany: 'User2#'
        });

        // Object form
        User3 = Ext.define('spec.many2many.User3', {
            extend: 'spec.many2many.Base',
            manyToMany: [{
                type: 'Group3',
                left: true
            }]
        });

        Group3 = Ext.define('spec.many2many.Group3', {
            extend: 'spec.many2many.Base',
            manyToMany: [{
                type: 'User3',
                right: true
            }]
        });

        // Full Object form
        User4 = Ext.define('spec.many2many.User4', {
            extend: 'spec.many2many.Base',
            manyToMany: [{
                type: 'Group4',
                role: 'groups',
                field: 'groupId',
                left: {
                    role: 'users',
                    field: 'userId'
                }
            }]
        });

        Group4 = Ext.define('spec.many2many.Group4', {
            extend: 'spec.many2many.Base',
            manyToMany: [{
                type: 'User4',
                role: 'users',
                field: 'userId',
                right: {
                    role: 'groups',
                    field: 'groupId'
                }
            }]
        });

        // Named Full Object form
        User5 = Ext.define('spec.many2many.User5', {
            extend: 'spec.many2many.Base',
            manyToMany: {
                foo: {
                    type: 'Group5',
                    role: 'theGroups',
                    field: 'theGroup_id',
                    left: {
                        role: 'theUsers',
                        field: 'theUser_id'
                    }
                }
            }
        });

        Group5 = Ext.define('spec.many2many.Group5', {
            extend: 'spec.many2many.Base',
            manyToMany: {
                foo: {
                    type: 'User5',
                    role: 'theUsers',
                    field: 'theUser_id',
                    right: {
                        role: 'theGroups',
                        field: 'theGroup_id'
                    }
                }
            }
        });

        Base = Ext.define('spec.many2many.FooBase', {
            extend: 'Ext.data.Model',

            schema: {
                namespace: 'spec.many2many'
            }
        });

        // Nested namespace
        FooBarThing = Ext.define('spec.many2many.foo.bar.Thing', {
            extend: 'spec.many2many.FooBase',
            manyToMany: 'foo.Goo'
        });

        FooGoo = Ext.define('spec.many2many.foo.Goo', {
            extend: 'spec.many2many.FooBase',
            manyToMany: 'foo.bar.Thing'
        });
        Ext.data.Model.schema.setNamespace('spec.many2many');
    });
    
    afterEach(function() {
        Ext.data.Model.schema.setNamespace(null);
        Ext.data.Model.schema.clear();
    });

    //-------------------------------------------------------------------------

    describe("Simple Association", function() {
        var User, Group, userGroups, users, groups;

        beforeEach(function () {
            User = SimpleUser;
            Group = SimpleGroup;

            groups = User.associations.groups;
            users = Group.associations.users;
            userGroups = groups.association;
        });

        describe('users role', function() {
            it("should have a role name", function() {
                expect(users.role).toBe('users');
            });

            it("should have an id field", function() {
                expect(users.field).toBe('userId');
            });

            it("should have the proper inverse role", function() {
                expect(users.inverse).toBe(groups);
            });

            it("should have the proper class", function() {
                expect(users.cls).toBe(User);
            });

            it("should have a reference back to the association", function() {
                expect(users.association.isManyToMany).toBe(true);
                expect(groups.association).toBe(users.association);
            });     
        });

        describe('groups role', function() {
            it("should have a role name", function() {
                expect(groups.role).toBe('groups');
            });

            it("should have an id field", function() {
                expect(groups.field).toBe('groupId');
            });

            it("should have the proper inverse role", function() {
                expect(groups.inverse).toBe(users);
            });

            it("should have the proper class", function() {
                expect(groups.cls).toBe(Group);
            });
        });
        
        describe('Common properties', function () {
            it("should set the assoc name", function() {
                expect(userGroups.name).toBe('GroupUsers');
            });

            it("should have a schema set", function() {
                expect(userGroups.schema).toBe(schema);    
            });

            it("should have no reference field set", function() {
                expect(userGroups.field).toBeNull();
            });  

            it("should set definedBy to the key holder", function() {
                expect(userGroups.definedBy).toBe(User);    
            });

            it("should have the owner as null", function() {
                expect(userGroups.owner).toBeNull();
            });
        });

        describe('Getter/setter methods', function () {
            it('should generate getGroups', function () {
                expect(typeof User.prototype.groups).toBe('function');
            });

            it('should generate getUsers', function () {
                expect(typeof Group.prototype.users).toBe('function');
            });
        });
    });

    //-------------------------------------------------------------------------

    describe("Side-specified Association", function() {
        var User, Group, userGroups, users, groups;

        beforeEach(function () {
            User = User2;
            Group = Group2;

            groups = User.associations.group2s;
            users = Group.associations.user2s;
            userGroups = groups.association;
        });

        describe('users role', function() {
            it("should have a role name", function() {
                expect(users.role).toBe('user2s');
            });

            it("should have an id field", function() {
                expect(users.field).toBe('user2Id');
            });

            it("should have the proper inverse role", function() {
                expect(users.inverse).toBe(groups);
            });

            it("should have the proper class", function() {
                expect(users.cls).toBe(User);
            });

            it("should have a reference back to the association", function() {
                expect(users.association.isManyToMany).toBe(true);
                expect(groups.association).toBe(users.association);
            });     
        });

        describe('groups role', function() {
            it("should have a role name", function() {
                expect(groups.role).toBe('group2s');
            });

            it("should have an id field", function() {
                expect(groups.field).toBe('group2Id');
            });

            it("should have the proper inverse role", function() {
                expect(groups.inverse).toBe(users);
            });

            it("should have the proper class", function() {
                expect(groups.cls).toBe(Group);
            });
        });
        
        describe('Common properties', function () {
            it("should set the assoc name", function() {
                expect(userGroups.name).toBe('User2Group2s');
            });

            it("should have a schema set", function() {
                expect(userGroups.schema).toBe(schema);    
            });

            it("should have no reference field set", function() {
                expect(userGroups.field).toBeNull();
            });  

            it("should set definedBy to the key holder", function() {
                expect(userGroups.definedBy).toBe(User);    
            });

            it("should have the owner as null", function() {
                expect(userGroups.owner).toBeNull();
            });
        });
    });

    //-------------------------------------------------------------------------

    describe("Simple Object-Form Association", function() {
        var User, Group, userGroups, users, groups;

        beforeEach(function () {
            User = User3;
            Group = Group3;

            groups = User.associations.group3s;
            users = Group.associations.user3s;
            userGroups = groups.association;
        });

        describe('users role', function() {
            it("should have a role name", function() {
                expect(users.role).toBe('user3s');
            });

            it("should have an id field", function() {
                expect(users.field).toBe('user3Id');
            });

            it("should have the proper inverse role", function() {
                expect(users.inverse).toBe(groups);
            });

            it("should have the proper class", function() {
                expect(users.cls).toBe(User);
            });

            it("should have a reference back to the association", function() {
                expect(users.association.isManyToMany).toBe(true);
                expect(groups.association).toBe(users.association);
            });     
        });

        describe('groups role', function() {
            it("should have a role name", function() {
                expect(groups.role).toBe('group3s');
            });

            it("should have an id field", function() {
                expect(groups.field).toBe('group3Id');
            });

            it("should have the proper inverse role", function() {
                expect(groups.inverse).toBe(users);
            });

            it("should have the proper class", function() {
                expect(groups.cls).toBe(Group);
            });
        });
        
        describe('Common properties', function () {
            it("should set the assoc name", function() {
                expect(userGroups.name).toBe('User3Group3s');
            });

            it("should have a schema set", function() {
                expect(userGroups.schema).toBe(schema);    
            });

            it("should have no reference field set", function() {
                expect(userGroups.field).toBeNull();
            });  

            it("should set definedBy to the key holder", function() {
                expect(userGroups.definedBy).toBe(User);    
            });

            it("should have the owner as null", function() {
                expect(userGroups.owner).toBeNull();
            });
        });
    });

    //-------------------------------------------------------------------------

    describe("Full Object-Form Association", function() {
        var User, Group, userGroups, users, groups;

        beforeEach(function () {
            User = User4;
            Group = Group4;

            groups = User.associations.groups;
            users = Group.associations.users;
            userGroups = groups.association;
        });

        describe('users role', function() {
            it("should have a role name", function() {
                expect(users.role).toBe('users');
            });

            it("should have an id field", function() {
                expect(users.field).toBe('userId');
            });

            it("should have the proper inverse role", function() {
                expect(users.inverse).toBe(groups);
            });

            it("should have the proper class", function() {
                expect(users.cls).toBe(User);
            });

            it("should have a reference back to the association", function() {
                expect(users.association.isManyToMany).toBe(true);
                expect(groups.association).toBe(users.association);
            });     
        });

        describe('groups role', function() {
            it("should have a role name", function() {
                expect(groups.role).toBe('groups');
            });

            it("should have an id field", function() {
                expect(groups.field).toBe('groupId');
            });

            it("should have the proper inverse role", function() {
                expect(groups.inverse).toBe(users);
            });

            it("should have the proper class", function() {
                expect(groups.cls).toBe(Group);
            });
        });
        
        describe('Common properties', function () {
            it("should set the assoc name", function() {
                expect(userGroups.name).toBe('User4Group4s');
            });

            it("should have a schema set", function() {
                expect(userGroups.schema).toBe(schema);    
            });

            it("should have no reference field set", function() {
                expect(userGroups.field).toBeNull();
            });  

            it("should set definedBy to the key holder", function() {
                expect(userGroups.definedBy).toBe(User);    
            });

            it("should have the owner as null", function() {
                expect(userGroups.owner).toBeNull();
            });
        });
    });

    //-------------------------------------------------------------------------

    describe("Named Full Object-Form Association", function() {
        var User, Group, userGroups, users, groups;

        beforeEach(function () {
            User = User5;
            Group = Group5;

            groups = User.associations.theGroups;
            users = Group.associations.theUsers;
            userGroups = groups.association;
        });

        describe('users role', function() {
            it("should have a role name", function() {
                expect(users.role).toBe('theUsers');
            });

            it("should have an id field", function() {
                expect(users.field).toBe('theUser_id');
            });

            it("should have the proper inverse role", function() {
                expect(users.inverse).toBe(groups);
            });

            it("should have the proper class", function() {
                expect(users.cls).toBe(User);
            });

            it("should have a reference back to the association", function() {
                expect(users.association.isManyToMany).toBe(true);
                expect(groups.association).toBe(users.association);
            });     
        });

        describe('groups role', function() {
            it("should have a role name", function() {
                expect(groups.role).toBe('theGroups');
            });

            it("should have an id field", function() {
                expect(groups.field).toBe('theGroup_id');
            });

            it("should have the proper inverse role", function() {
                expect(groups.inverse).toBe(users);
            });

            it("should have the proper class", function() {
                expect(groups.cls).toBe(Group);
            });
        });
        
        describe('Common properties', function () {
            it("should set the assoc name", function() {
                expect(userGroups.name).toBe('foo');
            });

            it("should have a schema set", function() {
                expect(userGroups.schema).toBe(schema);    
            });

            it("should have no reference field set", function() {
                expect(userGroups.field).toBeNull();
            });  

            it("should set definedBy to the key holder", function() {
                expect(userGroups.definedBy).toBe(User);    
            });

            it("should have the owner as null", function() {
                expect(userGroups.owner).toBeNull();
            });
        });
    });

    //-------------------------------------------------------------------------

    describe("Nested Namespace Association", function() {
        var assoc, fooBarThings, fooGoos;

        /*
        FooBarThing = Ext.define('spec.many2many.foo.bar.Thing', {
            extend: 'spec.many2many.FooBase',
            manyToMany: 'foo.Goo'
        });

        FooGoo = Ext.define('spec.many2many.foo.Goo', {
            extend: 'spec.many2many.FooBase',
            manyToMany: 'foo.bar.Thing'
        });
        */

        beforeEach(function () {
            fooGoos = FooBarThing.associations.fooGoos;
            fooBarThings = FooGoo.associations.fooBarThings;
            assoc = fooGoos.association;
        });

        it("should have proper left name", function() {
            expect(fooBarThings.association.left.role).toBe('fooBarThings');
        });

        it("should have proper right name", function() {
            expect(fooBarThings.association.right.role).toBe('fooGoos');
        });

        it("should have proper left getter", function() {
            expect(typeof FooBarThing.prototype.fooGoos).toBe('function');
        });

        it("should have proper right getter", function() {
            expect(typeof FooGoo.prototype.fooBarThings).toBe('function');
        });
    });




























    xdescribe("model decoration", function() {
        function expectFn(Type, member) {
            expect(typeof Type.prototype[member]).toBe('function');
        }
        
        it("should generate a getter on the key holder", function() {
            defineUser();
            expectFn(User, 'getAddress');  
        });
        
        it("should generate a setter on the key holder", function() {
            defineUser();
            expectFn(User, 'setAddress');  
        });
        
        it("should define a getter on the inverse", function() {
            defineUser();
            expectFn(Address, 'getUser');  
        });
        
        it("should allow a custom getter name on the key holder", function() {
            defineUser({
                getterName: 'getFoo'
            });
            expectFn(User, 'getFoo');  
        });
        
        it("should allow a custom setter name on the key holder", function() {
            defineUser({
                setterName: 'setFoo'
            });
            expectFn(User, 'setFoo');      
        });
        
        it("should allow a custom getter name on the inverse", function() {
            defineUser({
                inverse: {
                    getterName: 'getBar'
                }
            });
            expectFn(Address, 'getBar');
        });
        
        it("should decorate the model based on the role", function() {
            Ext.define('spec.OtherUser', {
                extend: 'Ext.data.Model',
                fields: ['id', 'name', {
                    name: 'postalAddressId',
                    reference: {
                        type: 'Address',
                        role: 'postalAddress'
                    }
                }, {
                    name: 'homeAddressId',
                    reference: {
                        type: 'Address',
                        role: 'homeAddress'
                    }
                }]
            });
            
            expectFn(spec.OtherUser, 'getPostalAddress');
            expectFn(spec.OtherUser, 'getHomeAddress');
            
            Ext.undefine('spec.OtherUser');
        });
    });
    
    xdescribe("without session", function() {
        var user, address;
        
        afterEach(function() {
            user = address = null;
        });
        
        describe("getter behaviour", function() {
            describe("instance already set", function() {
                beforeEach(function() {
                    defineUser();
                    
                    user = new User({
                        id: 4
                    });
                    
                    address = new Address({
                        id: 2
                    });
                    
                    
                    user.setAddress(address);
                });      
                
                it("should return the same instance", function() {
                    expect(user.getAddress()).toBe(address);
                });
                
                it("should not attempt to load", function() {
                    spyOn(Address, 'load');
                    user.getAddress();
                    expect(Address.load).not.toHaveBeenCalled();
                });
                
                it("should attempt to reload if called with options.reload", function() {
                    spyOn(Address, 'load').andReturn();
                    user.getAddress({
                        reload: true
                    });
                    expect(Address.load).toHaveBeenCalled();
                });
                
                describe("callbacks", function() {
                    it("should accept a function and default the scope to the model", function() {
                        var scope, item;
                        user.getAddress(function(arg1) {
                            item = arg1;
                            scope = this;
                        });
                        expect(item).toBe(address);
                        expect(scope).toBe(user);
                    });
                    
                    it("should accept a function with a scope", function() {
                        var o = {},
                            scope; 
                            
                        user.getAddress(function() {
                            scope = this;
                        }, o);
                        expect(scope).toBe(o);   
                    });
                    
                    it("should accept an options object and call success", function() {
                        var scope, item;
                        user.getAddress({
                            success: function(arg1) {
                                item = arg1;
                                scope = this;
                            }
                        });  
                        expect(item).toBe(address);
                        expect(scope).toBe(user);  
                    });
                    
                    it("should accept an options object and call callback", function() {
                        var scope, item;
                        user.getAddress({
                            callback: function(arg1) {
                                item = arg1;
                                scope = this;
                            }
                        });  
                        expect(item).toBe(address);
                        expect(scope).toBe(user);  
                    });
                });
            });
            
            describe("instance not set", function() {
                beforeEach(function() {
                    defineUser();
                });
                
                describe("keys", function() {
                    it("should default the primaryKey to 'id' and set it on the model", function() {
                        user = new User({
                            addressId: 10
                        });
                        spyOn(Address, 'load').andReturn();
                        address = user.getAddress();
                        expect(address.get('id')).toBe(10);    
                    });
                });
                
                describe("callbacks", function() {
                    it("should accept a function and the scope should default to the model", function() {
                        user = new User({
                            addressId: 3
                        }); 
                        var info;
                        spyOn(Address, 'load').andCallFake(function(arg1, arg2) {
                            info = arg2;
                        });
                        var fn = function() {};
                        user.getAddress(fn);
                        expect(info.callback).toBe(fn);
                        expect(info.scope).toBe(user);
                    });
                    
                    it("should accept a function and a scope", function() {
                        user = new User({
                            addressId: 3
                        }); 
                        var info;
                        spyOn(Address, 'load').andCallFake(function(arg1, arg2) {
                            info = arg2;
                        });
                        var fn = function() {},
                            o = {};
                            
                        user.getAddress(fn, o);
                        expect(info.callback).toBe(fn);
                        expect(info.scope).toBe(o);
                    });   
                    
                    it("should pass the options to load", function() {
                       user = new User({
                            addressId: 3
                        }); 
                        var o = {},
                            info;
                            
                        spyOn(Address, 'load').andCallFake(function(arg1, arg2) {
                            info = arg2;
                        });
                            
                        user.getAddress(o);
                        expect(info).toBe(o);
                    });
                });
                
                it("should return null if the foreignKey value is empty", function() {
                    user = new User();
                    expect(user.getAddress()).toBeNull();    
                });
            });
        });
    
        describe("setter behaviour", function() {
            var user;
            
            beforeEach(function() {
                defineUser();
                user = new User({
                    id: 7
                });
            });
            
            afterEach(function() {
                user = null;
            });
            
            describe("instance", function() {
                it("should have the same record reference", function() {
                    var address = new Address({
                        id: 3
                    });
                    user.setAddress(address);
                    expect(user.getAddress()).toBe(address);
                });
                
                it("should set the underlying key value", function() {
                    var address = new Address({
                        id: 3
                    });
                    user.setAddress(address);
                    expect(user.get('addressId')).toBe(3);  
                });
            });
            
            describe("value", function() {
                it("should set the underlying key", function() {
                    user.setAddress(16);
                    expect(user.get('addressId')).toBe(16);    
                });  
                
                it("should keep the same reference if setting the value with a matching id", function() {
                    var address = new Address({
                        id: 3
                    });
                    user.setAddress(address);
                    user.setAddress(3);
                    expect(user.getAddress()).toBe(address);
                });
                
                it("should clear the reference if a model is already set and a new id is passed", function() {
                    var address = new Address({
                        id: 3
                    });
                    user.setAddress(address);
                    user.setAddress(13);
                    spyOn(Address, 'load');
                    // Reference doesn't exist, so need to grab it again here
                    user.getAddress();
                    expect(Address.load.mostRecentCall.args[0]).toBe(13);
                });
            });
            
            describe("callbacks", function() {
                it("should accept a function as the second arg, scope should default to the model", function() {
                    spyOn(user, 'save').andCallFake(function(options) {
                        var me  = options.scope || this;
                        Ext.callback(options.callback, me, [this]);
                    });
                    var item, scope;
                    user.setAddress(16, function(arg1) {
                        item = arg1;
                        scope = this;
                    });
                    expect(item).toBe(user);
                    expect(scope).toBe(user);
                });    
                
                it("should accept a function with a scope", function() {
                    var o = {},
                        scope;
                        
                    spyOn(user, 'save').andCallFake(function(options) {
                        var scope  = options.scope || this;
                        Ext.callback(options.callback, scope, [this]);
                    });
                    var item;
                    user.setAddress(16, function(arg1) {
                        item = arg1;
                        scope = this;
                    }, o);
                    expect(scope).toBe(o);
                });
                
                it("should accept an options object and forward it to save", function() {
                    spyOn(user, 'save').andReturn();
                    var o = {
                        scope: {},
                        success: function() {},
                        failure: function() {}
                    };
                    user.setAddress(16, o);
                    expect(user.save).toHaveBeenCalledWith(o);
                });
            });
        });
    });
    
});
