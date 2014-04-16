describe("Ext.data.schema.ManyToOne", function() {
    
    var schema, Post, Thread, threadRole, postRole;

    function definePost(refCfg) {
        Post = Ext.define('spec.Post', {
            extend: 'Ext.data.Model',
            fields: ['id', 'content', {
                name: 'threadId',
                reference: Ext.apply({
                    type: 'Thread'
                }, refCfg)
            }]
        });
        
        threadRole = Post.associations.thread;
        postRole = Thread.associations.posts;
    }
    
    beforeEach(function() {
        schema = Ext.data.Model.schema;
        
        Thread = Ext.define('spec.Thread', {
            extend: 'Ext.data.Model',
            fields: ['id', 'title']
        });
    });
    
    afterEach(function() {
        Ext.undefine('spec.Post');
        Ext.undefine('spec.Thread');
        
        schema.clear();
        schema.setNamespace(null); 
        Post = postRole = Thread = threadRole = schema = null;   
    });
    
    describe("Model.associations", function() {
        it("should have an association role on each model", function() {
            definePost();
            expect(Post.associations.thread).toBeDefined();
            expect(Thread.associations.posts).toBeDefined();
        });
        
        it("should have a reference back to the association for each role", function() {
            definePost();
            expect(Post.associations.thread.association).toBe(Thread.associations.posts.association);
            expect(Thread.associations.posts.association.isManyToOne).toBe(true);
        });     
    });
    
    describe("association default config", function() {
        var assoc;

        beforeEach(function() {
            definePost();
            assoc = threadRole.association;
        });
        
        it("should have a schema set", function() {
            expect(assoc.schema).toBe(schema);    
        });
        
        it("should have the reference field set", function() {
            expect(assoc.field).toBe(Post.getField('threadId'));
        });  
        
        it("should have the left part be set to the key holder", function() {
            expect(assoc.left).toBe(postRole);
        });
        
        it("should set definedBy to the key holder", function() {
            expect(assoc.definedBy).toBe(Post);    
        });
        
        it("should have the right part be set to the non key holder", function() {
            expect(assoc.right).toBe(threadRole);
        });
        
        it("should have the owner as null", function() {
            expect(assoc.owner).toBeNull();
        });
        
        it("should set the assoc name to {PluralKeyHolder}By{SingluarOther}", function() {
            expect(assoc.name).toBe('ThreadPosts');
        });
    });
    
    describe("left", function() {
        beforeEach(function() {
            definePost();
        });
        
        it("should set the role to be plural lowercase & the type to be the entity name", function() {
            expect(postRole.role).toBe('posts');
            expect(postRole.type).toBe('Post');
        });
        
        it("should set the inverse role to the right", function() {
            expect(postRole.inverse).toBe(threadRole);    
        });    
        
        it("should set the entity", function() {
            expect(postRole.cls).toBe(Post);    
        });
    });
    
    describe("right", function() {
        beforeEach(function() {
            definePost();
        });
        
        it("should set the role to be singular lowercase & the type to be the entity name", function() {
            expect(threadRole.role).toBe('thread');
            expect(threadRole.type).toBe('Thread');
        });
        
        it("should set the inverse role to the left", function() {
            expect(threadRole.inverse).toBe(postRole);    
        });    
        
        it("should set the entity", function() {
            expect(threadRole.cls).toBe(Thread);    
        });
    });
    
    describe("configuring", function() {
        it("should set an association name", function() {
            definePost({
                association: 'CustomName'
            });    
            expect(postRole.association.name).toBe('CustomName');
        });
        
        it("should set the owner based on the child param", function() {
            definePost({
                child: true
            });
            expect(postRole.association.owner).toBe(postRole);
            expect(postRole.owner).toBe(true);
        });
        
        it("should set the owner based on the parent param", function() {
            definePost({
                parent: true
            });
            expect(postRole.association.owner).toBe(threadRole);
            expect(threadRole.owner).toBe(true);
        });
        
        it("should be able to set a custom role", function() {
            definePost({
                role: 'foo'
            });
            threadRole = Post.associations.foo;
            expect(threadRole.association.name).toBe('ThreadFooPosts');
            expect(threadRole.role).toBe('foo');
        });
        
        describe("inverse", function() {
            it("should set with a string", function() {
                definePost({
                    inverse: 'foo'
                });
                postRole = Thread.associations.foo;
                expect(postRole.association.name).toBe('ThreadFoo');
                expect(postRole.role).toBe('foo');
            });
            
            it("should set with an object", function() {
                definePost({
                    inverse: {
                        role: 'foo'
                    }
                });
                postRole = Thread.associations.foo;
                expect(postRole.association.name).toBe('ThreadFoo');
                expect(postRole.role).toBe('foo');
            });
        });
    });
    
    describe("model decoration", function() {
        it("should generate a getter on the key holder", function() {
            definePost();
            expect(typeof Post.prototype.getThread).toBe('function');
        });
        
        it("should generate a setter on the key holder", function() {
            definePost();
            expect(typeof Post.prototype.setThread).toBe('function');
        });
        
        it("should define a getter on the inverse", function() {
            definePost();
            expect(typeof Thread.prototype.posts).toBe('function');
        });
        
        it("should allow a custom getter name on the key holder", function() {
            definePost({
                inverse: {
                    getterName: 'getFoo'
                }
            });
            expect(typeof Thread.prototype.getFoo).toBe('function');
        });
        
        it("should allow a custom setter name on the key holder", function() {
            definePost({
                setterName: 'setFoo'
            });
            expect(typeof Post.prototype.setFoo).toBe('function');
        });
        
        it("should allow a custom getter name on the inverse", function() {
            definePost({
                getterName: 'ghosts'
            });
            expect(typeof Post.prototype.ghosts).toBe('function');
        });

        it("should decorate the model based on the role", function() {
            var OtherPost = Ext.define('spec.OtherPost', {
                extend: 'Ext.data.Model',
                fields: ['id', 'name', {
                    name: 'threadAId',
                    reference: {
                        type: 'Thread',
                        role: 'ThreadA'
                    }
                }, {
                    name: 'threadBId',
                    reference: {
                        type: 'Thread',
                        role: 'ThreadB'
                    }
                }]
            });

            expect(typeof OtherPost.prototype.getThreadA).toBe('function');
            expect(typeof OtherPost.prototype.getThreadB).toBe('function');

            Ext.undefine('spec.OtherPost');
        });
    });
    
    describe("without session", function() {
        var post, thread;
        
        afterEach(function() {
            post = thread = null;
        });
        
        describe("getter behaviour", function() {
            describe("instance already set", function() {
                beforeEach(function() {
                    definePost();
                    
                    post = new Post({
                        id: 4
                    });
                    
                    thread = new Thread({
                        id: 2
                    });
                    
                    
                    post.setThread(thread);
                });      
                
                it("should return the same instance", function() {
                    expect(post.getThread()).toBe(thread);
                });
                
                it("should not attempt to load", function() {
                    spyOn(Thread, 'load');
                    post.getThread();
                    expect(Thread.load).not.toHaveBeenCalled();
                });
                
                it("should attempt to reload if called with options.reload", function() {
                    spyOn(Thread, 'load').andReturn();
                    post.getThread({
                        reload: true
                    });
                    expect(Thread.load).toHaveBeenCalled();
                });
                
                describe("callbacks", function() {
                    it("should accept a function and default the scope to the model", function() {
                        var scope, item;
                        post.getThread(function(arg1) {
                            item = arg1;
                            scope = this;
                        });
                        expect(item).toBe(thread);
                        expect(scope).toBe(post);
                    });
                    
                    it("should accept a function with a scope", function() {
                        var o = {},
                            scope; 
                            
                        post.getThread(function() {
                            scope = this;
                        }, o);
                        expect(scope).toBe(o);   
                    });
                    
                    it("should accept an options object and call success", function() {
                        var scope, item;
                        post.getThread({
                            success: function(arg1) {
                                item = arg1;
                                scope = this;
                            }
                        });  
                        expect(item).toBe(thread);
                        expect(scope).toBe(post);  
                    });
                    
                    it("should accept an options object and call callback", function() {
                        var scope, item;
                        post.getThread({
                            callback: function(arg1) {
                                item = arg1;
                                scope = this;
                            }
                        });  
                        expect(item).toBe(thread);
                        expect(scope).toBe(post);  
                    });
                });
            });
            
            describe("instance not set", function() {
                beforeEach(function() {
                    definePost();
                });
                
                describe("keys", function() {
                    it("should default the primaryKey to 'id' and set it on the model", function() {
                        post = new Post({
                            threadId: 10
                        });
                        spyOn(Thread, 'load').andReturn();
                        thread = post.getThread();
                        expect(thread.get('id')).toBe(10);    
                    });
                });
                
                describe("callbacks", function() {
                    it("should accept a function and the scope should default to the model", function() {
                        post = new Post({
                            threadId: 3
                        }); 
                        var info;
                        spyOn(Thread, 'load').andCallFake(function(arg1, arg2) {
                            info = arg2;
                        });
                        var fn = function() {};
                        post.getThread(fn);
                        expect(info.callback).toBe(fn);
                        expect(info.scope).toBe(post);
                    });
                    
                    it("should accept a function and a scope", function() {
                        post = new Post({
                            threadId: 3
                        }); 
                        var info;
                        spyOn(Thread, 'load').andCallFake(function(arg1, arg2) {
                            info = arg2;
                        });
                        var fn = function() {},
                            o = {};
                            
                        post.getThread(fn, o);
                        expect(info.callback).toBe(fn);
                        expect(info.scope).toBe(o);
                    });   
                    
                    it("should pass the options to load", function() {
                       post = new Post({
                            threadId: 3
                        }); 
                        var o = {
                            someKey: 1
                        }, info;
                            
                        spyOn(Thread, 'load').andCallFake(function(arg1, arg2) {
                            info = arg2;
                        });
                            
                        post.getThread(o);
                        expect(info.someKey).toBe(1);
                    });
                });
                
                it("should return null if the foreignKey value is empty", function() {
                    post = new Post();
                    expect(post.getThread()).toBeNull();    
                });
            });
        });
    
        describe("setter behaviour", function() {
            var post;
            
            beforeEach(function() {
                definePost();
                post = new Post({
                    id: 7
                });
            });
            
            afterEach(function() {
                post = null;
            });
            
            describe("instance", function() {
                it("should have the same record reference", function() {
                    var thread = new Thread({
                        id: 3
                    });
                    post.setThread(thread);
                    expect(post.getThread()).toBe(thread);
                });
                
                it("should set the underlying key value", function() {
                    var thread = new Thread({
                        id: 3
                    });
                    post.setThread(thread);
                    expect(post.get('threadId')).toBe(3);  
                });
            });
            
            describe("value", function() {
                it("should set the underlying key", function() {
                    post.setThread(16);
                    expect(post.get('threadId')).toBe(16);    
                });  
                
                it("should keep the same reference if setting the value with a matching id", function() {
                    var thread = new Thread({
                        id: 3
                    });
                    post.setThread(thread);
                    post.setThread(3);
                    expect(post.getThread()).toBe(thread);
                });
                
                it("should clear the reference if a model is already set and a new id is passed", function() {
                    var thread = new Thread({
                        id: 3
                    });
                    post.setThread(thread);
                    post.setThread(13);
                    spyOn(Thread, 'load');
                    // Reference doesn't exist, so need to grab it again here
                    post.getThread();
                    expect(Thread.load.mostRecentCall.args[0]).toBe(13);
                });
            });
            
            describe("callbacks", function() {
                it("should accept a function as the second arg, scope should default to the model", function() {
                    spyOn(post, 'save').andCallFake(function(options) {
                        var me  = options.scope || this;
                        Ext.callback(options.callback, me, [this]);
                    });
                    var item, scope;
                    post.setThread(16, function(arg1) {
                        item = arg1;
                        scope = this;
                    });
                    expect(item).toBe(post);
                    expect(scope).toBe(post);
                });    
                
                it("should accept a function with a scope", function() {
                    var o = {},
                        scope;
                        
                    spyOn(post, 'save').andCallFake(function(options) {
                        var scope  = options.scope || this;
                        Ext.callback(options.callback, scope, [this]);
                    });
                    var item;
                    post.setThread(16, function(arg1) {
                        item = arg1;
                        scope = this;
                    }, o);
                    expect(scope).toBe(o);
                });
                
                it("should accept an options object and forward it to save", function() {
                    spyOn(post, 'save').andReturn();
                    var o = {
                        scope: {},
                        success: function() {},
                        failure: function() {}
                    };
                    post.setThread(16, o);
                    expect(post.save).toHaveBeenCalledWith(o);
                });
            });
        });
        
        describe("store behaviour", function() {
            function makeThread() {
                thread = new Thread({
                    id: 3
                });
            }
            
            var thread;
            
            afterEach(function() {
                thread = null;
            });
            
            describe("instance", function() {
                it("should return a store", function() {
                    definePost();
                    makeThread();
                    expect(thread.posts().isStore).toBe(true);         
                });
                
                it("should set the appropriate model type", function() {
                    definePost();
                    makeThread();
                    expect(thread.posts().model).toBe(Post);    
                });
                
                it("should return the same store instance on multiple calls", function() {
                    definePost();
                    makeThread();
                    var s = thread.posts();
                    expect(thread.posts()).toBe(s);
                });
                
                it("should apply the storeConfig", function() {
                    definePost({
                        inverse: {
                            storeConfig: {
                                autoLoad: true
                            }
                        }
                    });
                    makeThread();
                    expect(thread.posts().getAutoLoad()).toBe(true);
                });
                
                describe("autoLoad", function() {
                    it("should not load the store by default", function() {
                        definePost();
                        makeThread();
                        var spy = spyOn(Ext.data.Store.prototype, 'load').andReturn();
                        thread.posts();
                        expect(spy.callCount).toBe(0);    
                    });  
                    
                    it("should load the store if configured with autoLoad: true", function() {
                        definePost({
                            inverse: {
                                autoLoad: true
                            }
                        }); 
                        
                        makeThread();
                        var spy = spyOn(Ext.data.Store.prototype, 'load').andReturn();
                        thread.posts();
                        expect(spy.callCount).toBe(1);          
                    });
                });
                
                describe("keys", function() {
                    
                    beforeEach(function() {
                        definePost();
                    });
                    
                    it("should default to the key to the primaryKey", function() {
                        makeThread();
                        var post = thread.posts().add({})[0];
                        expect(post.get('threadId')).toBe(3);
                    });
                    
                    it("should set the primaryKey onto the foreignKey on add", function() {
                        makeThread();
                        var post = thread.posts().add({
                            'threadId': 1
                        })[0];
                        expect(post.get('threadId')).toBe(3);
                    })
                });
            });
        })
    });
    
});
