describe("Ext.data.schema.OneToOne", function() {
    
    var schema, User, Address, userRole, addressRole, assoc;
    
    function defineUser(refCfg) {
        User = Ext.define('spec.User', {
            extend: 'Ext.data.Model',
            fields: ['id', 'name', {
                name: 'addressId',
                unique: true,
                reference: Ext.apply({
                    type: 'Address'
                }, refCfg)
            }]
        });
        userRole = Address.associations.user;
        addressRole = User.associations.address;
        if (userRole) {
            assoc = userRole.association;
        } else if (addressRole) {
            assoc = addressRole.association;
        }
    }
    
    beforeEach(function() {
        schema = Ext.data.Model.schema;
        
        Address = Ext.define('spec.Address', {
            extend: 'Ext.data.Model',
            fields: ['id', 'street', 'city', 'zip']
        });
        
    });
    
    afterEach(function() {
        Ext.undefine('spec.User');
        Ext.undefine('spec.Address');
        
        schema.clear();
        schema.setNamespace(null); 
        assoc = User = userRole = Address = addressRole = schema = null;   
    });
    
    describe("Model.associations", function() {
        it("should have an association role on each model", function() {
            defineUser();
            expect(User.associations.address).toBeDefined();
            expect(Address.associations.user).toBeDefined();
        });
        
        it("should have a reference back to the association for each role", function() {
            defineUser();
            expect(Address.associations.user.association).toBe(User.associations.address.association);
            expect(Address.associations.user.association.isOneToOne).toBe(true);
        });     
    });
    
    describe("association default config", function() {
        
        beforeEach(function() {
            defineUser();
        });
        
        it("should have a schema set", function() {
            expect(assoc.schema).toBe(schema);    
        });
        
        it("should have the reference field set", function() {
            expect(assoc.field).toBe(User.getField('addressId'));
        });  
        
        it("should have the left part be set to the key holder", function() {
            expect(assoc.left).toBe(userRole);
        });
        
        it("should set definedBy to the key holder", function() {
            expect(assoc.definedBy).toBe(User);    
        });
        
        it("should have the right part be set to the non key holder", function() {
            expect(assoc.right).toBe(addressRole);
        });
        
        it("should have the owner as null", function() {
            expect(assoc.owner).toBeNull();
        });
        
        it("should set the assoc name to {SingularRight}{SingularLeft}", function() {
            expect(assoc.name).toBe('AddressUser');
        });
    });
    
    describe("left", function() {
        beforeEach(function() {
            defineUser();
        });
        
        it("should set the role to be singular lowercase & the type to be the entity name", function() {
            expect(userRole.role).toBe('user');
            expect(userRole.type).toBe('User');
        });
        
        it("should set the inverse role to the right", function() {
            expect(userRole.inverse).toBe(addressRole);    
        });    
        
        it("should set the entity", function() {
            expect(userRole.cls).toBe(User);    
        });
    });
    
    describe("right", function() {
        beforeEach(function() {
            defineUser();
        });
        
        it("should set the role to be singular lowercase & the type to be the entity name", function() {
            expect(addressRole.role).toBe('address');
            expect(addressRole.type).toBe('Address');
        });
        
        it("should set the inverse role to the left", function() {
            expect(addressRole.inverse).toBe(userRole);    
        });    
        
        it("should set the entity", function() {
            expect(addressRole.cls).toBe(Address);    
        });
    });
    
    describe("configuring", function() {
        it("should set an association name", function() {
            defineUser({
                association: 'CustomName'
            });    
            expect(assoc.name).toBe('CustomName');
        });
        
        it("should set the owner based on the child param", function() {
            defineUser({
                child: true
            });
            expect(assoc.owner).toBe(userRole);
            expect(userRole.owner).toBe(true);
        });
        
        it("should set the owner based on the parent param", function() {
            defineUser({
                parent: true
            });
            expect(assoc.owner).toBe(addressRole);
            expect(addressRole.owner).toBe(true);
        });
        
        it("should be able to set a custom role", function() {
            defineUser({
                role: 'foo'
            });
            addressRole = User.associations.foo;
            assoc = addressRole.association;
            expect(assoc.name).toBe('AddressFooUser');
            expect(addressRole.role).toBe('foo');
        });
        
        describe("inverse", function() {
            it("should set with a string", function() {
                defineUser({
                    inverse: 'foo'
                });
                expect(assoc.name).toBe('AddressFoo');
                userRole = Address.associations.foo;
                expect(userRole.role).toBe('foo');
            });
            
            it("should set with an object", function() {
                defineUser({
                    inverse: {
                        role: 'foo'
                    }
                });
                expect(assoc.name).toBe('AddressFoo');
                userRole = Address.associations.foo;
                expect(userRole.role).toBe('foo');
            });
        });
    });
    
    describe("model decoration", function() {
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
                getterName: 'getCoolUser'
            });
            expectFn(User, 'getCoolUser');  
        });
        
        it("should allow a custom setter name on the key holder", function() {
            defineUser({
                setterName: 'setCoolUser'
            });
            expectFn(User, 'setCoolUser');      
        });
        
        it("should allow a custom getter name on the inverse", function() {
            defineUser({
                inverse: {
                    getterName: 'getCoolAddress'
                }
            });
            expectFn(Address, 'getCoolAddress');
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
    
    describe("without session", function() {
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
                        var o = {
                            someKey: 1
                        }, info;
                            
                        spyOn(Address, 'load').andCallFake(function(arg1, arg2) {
                            info = arg2;
                        });
                            
                        user.getAddress(o);
                        expect(info.someKey).toBe(1);
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
