describe("Ext.data.association.BelongsTo_legacy", function() {
    
    var rec;
    
    function defineJob(cfg) {
        Ext.define('spec.Job', {
            extend: 'Ext.data.Model',
            fields: ['id', 'user_id', 'aField'],
            belongsTo: Ext.apply({
                model: 'spec.User'
            }, cfg)
        })
    }
    
    function doSet(user, options, scope) {
        return rec.setUser(user, options, scope);
    }
        
    function doGet(options, scope) {
        return rec.getUser(options, scope);
    }
    
    beforeEach(function() {
        Ext.define('spec.User', {
            extend: 'Ext.data.Model',
            fields: ['id', 'name']
        });
        
        Ext.define('spec.Post', {
            extend: 'Ext.data.Model',
            fields: ['id', 'title', 'content', 'user_id'],
            belongsTo: 'spec.User'
        });
    });
    
    afterEach(function() {
        Ext.undefine('spec.User');
        Ext.undefine('spec.Post');
        Ext.undefine('spec.Job');
        
        Ext.data.Model.schema.clear();
        
        rec = null;
    });
    
    describe("declarations", function() {
        afterEach(function() {
            Ext.undefine('spec.Foo');
        });
        
        var expectGetSet = function(getKey, setKey) {
            var proto = spec.Foo.prototype;
            expect(Ext.isFunction(proto[getKey])).toBe(true);
            expect(Ext.isFunction(proto[setKey])).toBe(true);
        }
        
        it("should read a single string", function() {
            Ext.define('spec.Foo', {
                extend: 'Ext.data.Model',
                belongsTo: 'spec.User'
            });
            expectGetSet('getUser', 'setUser');
        });  
        
        it("should read an array of strings", function() {
            Ext.define('spec.Bar', {
                extend: 'Ext.data.Model'
            });
            
            Ext.define('spec.Foo', {
                extend: 'Ext.data.Model',
                belongsTo: ['spec.User', 'spec.Bar']
            });
            expectGetSet('getUser', 'setUser');
            expectGetSet('getBar', 'setBar');
            
            Ext.undefine('spec.Bar');
        });
        
        it("should read a single object", function() {
            Ext.define('spec.Foo', {
                extend: 'Ext.data.Model',
                belongsTo: {
                    model: 'spec.User'
                }    
            });  
            expectGetSet('getUser', 'setUser');
        });
        
        it("should read an array of objects", function() {
            Ext.define('spec.Bar', {
                extend: 'Ext.data.Model'
            });
            
            Ext.define('spec.Foo', {
                extend: 'Ext.data.Model',
                belongsTo: [{
                    model: 'spec.User'
                }, {
                    model: 'spec.Bar'
                }]
            });
            
            expectGetSet('getUser', 'setUser');
            expectGetSet('getBar', 'setBar');
            
            Ext.undefine('spec.Bar');
        });
        
        it("should read an associations array", function() {
            Ext.define('spec.Bar', {
                extend: 'Ext.data.Model'
            });
            
            Ext.define('spec.Foo', {
                extend: 'Ext.data.Model',
                associations: [{
                    type: 'belongsTo',
                    model: 'spec.User'
                }, {
                    type: 'belongsTo',
                    model: 'spec.Bar'
                }]
            });
            
            expectGetSet('getUser', 'setUser');
            expectGetSet('getBar', 'setBar');
            
            Ext.undefine('spec.Bar');
        });
    });
    
    describe("getter", function() {
        var user;
        
        describe("instance already set", function() {
            beforeEach(function() {
                rec = new spec.Post({
                    id: 2
                });
                
                user = new spec.User({
                    id: 4
                });
                doSet(user);
            });
            
            afterEach(function() {
                user = null;
            });        
            
            it("should return the same instance", function() {
                expect(doGet()).toBe(user);
            });
            
            it("should not attempt to load", function() {
                spyOn(spec.User, 'load');
                doGet();
                expect(spec.User.load).not.toHaveBeenCalled();
            });
            
            it("should attempt to reload if called with options.reload", function() {
                spyOn(spec.User, 'load').andReturn();
                doGet({
                    reload: true
                });    
                expect(spec.User.load).toHaveBeenCalled();
            });
            
            describe("callbacks", function() {
                it("should accept a function and default the scope to the model", function() {
                    var scope, item;
                    doGet(function(arg1) {
                        item = arg1;
                        scope = this;
                    });
                    expect(item).toBe(user);
                    expect(scope).toBe(rec);
                });
                
                it("should accept a function with a scope", function() {
                    var o = {},
                        scope; 
                        
                    doGet(function() {
                        scope = this;
                    }, o);
                    expect(scope).toBe(o);   
                });
                
                it("should accept an options object and call success", function() {
                    var scope, item;
                    doGet({
                        success: function(arg1) {
                            item = arg1;
                            scope = this;
                        }
                    });  
                    expect(item).toBe(user);
                    expect(scope).toBe(rec);  
                });
                
                it("should accept an options object and call callback", function() {
                    var scope, item;
                    doGet({
                        callback: function(arg1) {
                            item = arg1;
                            scope = this;
                        }
                    });  
                    expect(item).toBe(user);
                    expect(scope).toBe(rec);  
                });
            });
        });
        
        describe("instance not set", function() {
            describe("keys", function() {
                it("should default the primaryKey to 'id' and set it on the model", function() {
                    rec = new spec.Post({
                        'user_id': 10
                    });
                    spyOn(spec.User, 'load').andReturn();
                    user = doGet();
                    expect(user.get('id')).toBe(10);    
                });
                
                it("should use a custom foreign key", function() {
                    defineJob({
                        foreignKey: 'aField'
                    });
                    rec = new spec.Job({
                        'aField': 12
                    });
                    spyOn(spec.User, 'load').andReturn();
                    user = doGet();
                    expect(user.get('id')).toBe(12); 
                });
            });
            
            describe("callbacks", function() {
                it("should accept a function and the scope should default to the model", function() {
                    rec = new spec.Post({
                        'user_id': 3
                    }); 
                    var info;
                    spyOn(spec.User, 'load').andCallFake(function(arg1, arg2) {
                        info = arg2;
                    });
                    var fn = function() {};
                    doGet(fn);
                    expect(info.callback).toBe(fn);
                    expect(info.scope).toBe(rec);
                });
                
                it("should accept a function and a scope", function() {
                    rec = new spec.Post({
                        'user_id': 3
                    }); 
                    var info;
                    spyOn(spec.User, 'load').andCallFake(function(arg1, arg2) {
                        info = arg2;
                    });
                    var fn = function() {},
                        o = {};
                        
                    doGet(fn, o);
                    expect(info.callback).toBe(fn);
                    expect(info.scope).toBe(o);
                });   
                
                it("should pass the options to load", function() {
                   rec = new spec.Post({
                        'user_id': 3
                    }); 
                    var o = {
                       someKey: 1 
                    }, info;
                        
                    spyOn(spec.User, 'load').andCallFake(function(arg1, arg2) {
                        info = arg2;
                    });
                        
                    doGet(o);
                    expect(info.someKey).toBe(1);
                });
            });
            
            it("should return null if the foreignKey value is empty", function() {
                rec = new spec.Post();
                expect(doGet()).toBeNull();    
            });
        });
    });
    
    describe("setter", function() {
        beforeEach(function() {
            rec = new spec.Post({
                id: 7
            });
        });
        
        describe("instance", function() {
            it("should have the same record reference", function() {
                var user = new spec.User({
                    id: 3
                });
                doSet(user);
            
                expect(doGet()).toBe(user);
            });
            
            it("should set the underlying key value", function() {
                var user = new spec.User({
                    id: 3
                });
                doSet(user);
                expect(rec.get('user_id')).toBe(3);  
            });
        });
        
        describe("value", function() {
            it("should set the underlying key", function() {
                doSet(16);
                expect(rec.get('user_id')).toBe(16);    
            });  
            
            it("should keep the same reference if setting the value with a matching id", function() {
                var user = new spec.User({
                    id: 3
                });
                doSet(user);
                doSet(3);
                expect(doGet()).toBe(user);
            });
            
            it("should clear the reference if a model is already set and a new id is passed", function() {
                var user = new spec.User({
                    id: 3
                });
                doSet(user);
                doSet(13);
                spyOn(spec.User, 'load');
                // Reference doesn't exist, so need to grab it again here
                doGet();
                expect(spec.User.load.mostRecentCall.args[0]).toBe(13);
            });
            
            it("should set a custom foreignKey", function() {
                defineJob({
                    foreignKey: 'aField'
                });
                rec = new spec.Job({
                    id: 1
                });    
                doSet(13);
                expect(rec.get('aField')).toBe(13);
                
            });
        });
        
        describe("callbacks", function() {
            it("should accept a function as the second arg, scope should default to the model", function() {
                spyOn(rec, 'save').andCallFake(function(options) {
                    var me  = options.scope || this;
                    Ext.callback(options.callback, me, [this]);
                });
                var item, scope;
                doSet(16, function(arg1) {
                    item = arg1;
                    scope = this;
                });
                expect(item).toBe(rec);
                expect(scope).toBe(rec);
            });    
            
            it("should accept a function with a scope", function() {
                var o = {},
                    scope;
                    
                spyOn(rec, 'save').andCallFake(function(options) {
                    var scope  = options.scope || this;
                    Ext.callback(options.callback, scope, [this]);
                });
                var item;
                doSet(16, function(arg1) {
                    item = arg1;
                    scope = this;
                }, o);
                expect(scope).toBe(o);
            });
            
            it("should accept an options object and forward it to save", function() {
                spyOn(rec, 'save').andReturn();
                var o = {
                    scope: {},
                    success: function() {},
                    failure: function() {}
                };
                doSet(16, o);
                expect(rec.save).toHaveBeenCalledWith(o);
            });
        });
    });
    
    describe("reading nested with assocationKey", function() {
        it("should default the key to the association name", function() {
            var reader = new Ext.data.reader.Json({
                model: spec.Post
            });
            
            rec = reader.read([{
                id: 1,
                'user': {
                    id: 3
                }
            }]).getRecords()[0];
            
            expect(doGet().getId()).toBe(3);
        });
        
        it("should read a complex association", function() {
            defineJob({
                associationKey: 'nested.another[1].two'
            });
            
            var reader = new Ext.data.reader.Json({
                model: spec.Job
            });
            
            rec = reader.read([{
                id: 1,
                nested: {
                    another: [{
                        
                    }, {
                        two: {
                            id: 65
                        }
                    }]
                }
            }]).getRecords()[0];
            expect(doGet().getId()).toBe(65);
        });
    });
    
});