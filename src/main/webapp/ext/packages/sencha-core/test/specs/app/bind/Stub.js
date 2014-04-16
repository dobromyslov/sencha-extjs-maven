// This is a private class, so we're reaching into a lot of internals here, blech
describe("Ext.app.bind.Stub", function() {
    var session, vm;
    
    function completeWithData(data) {
        Ext.Ajax.mockComplete({
            status: 200,
            responseText: Ext.encode(data)
        });
    }
    
    function completeWithId(id) {
        completeWithData({
            id: id
        });
    }
    
    beforeEach(function() {
        MockAjaxManager.addMethods();
        session = new Ext.data.session.Session({
            scheduler: {
                // Make a huge tickDelay, we'll control it by forcing ticks
                tickDelay: 1000000
            }
        });
        
        vm = new Ext.app.ViewModel({
            session: session
        });
    });
    
    afterEach(function() {
        Ext.data.Model.schema.clear();
        Ext.destroy(vm, session);
    });
    
    describe("stub - getAssociationBinding", function() {
        beforeEach(function() {
            Ext.define('spec.User', {
                extend: 'Ext.data.Model',
                fields: ['id', 'name']
            });
            
            Ext.define('spec.Project', {
                extend: 'Ext.data.Model',
                fields: ['id', 'name']
            });

            Ext.define('spec.Post', {
                extend: 'Ext.data.Model',
                fields: ['id', 'content', {
                    name: 'userId',
                    reference: 'User'
                }, {
                    name: 'projectId',
                    reference: 'Project'
                }]
            });
        });

        afterEach(function() {
            MockAjaxManager.removeMethods();
            Ext.undefine('spec.User');
            Ext.undefine('specProject');
            Ext.undefine('spec.Post');            
        });

        describe("associations", function() {
            it("should create a binding if one doesn't exist", function() {
                vm.linkTo('theUser', {
                    reference: 'User',
                    id: 1
                });
                completeWithId(1);
                session.notify();
                vm.bind('theUser.posts', Ext.emptyFn);
                var stub = vm.getStub('theUser.posts');
                stub.getRawValue();
                expect(stub.assocBinding).toBeDefined();
            });

            it("should keep the same instance if the owner doesn't change", function() {
                vm.linkTo('theUser', {
                    reference: 'User',
                    id: 1
                });
                completeWithId(1);
                session.notify();
                vm.bind('theUser.posts', Ext.emptyFn);
                var stub = vm.getStub('theUser.posts');
                stub.getRawValue();
                var b = stub.assocBinding;
                stub.getRawValue();
                expect(stub.assocBinding).toBe(b);
            });

            it("should destroy the old binding and create a new one if the id of the initial binding changes", function() {
                vm.linkTo('theUser', {
                    reference: 'User',
                    id: 1
                });
                completeWithId(1);
                session.notify();
                vm.bind('theUser.posts', Ext.emptyFn);
                var stub = vm.getStub('theUser.posts');
                stub.getRawValue();
                var b = stub.assocBinding;
                spyOn(b, 'destroy');
                vm.linkTo('theUser', {
                    reference: 'User',
                    id: 2
                });
                completeWithId(2);
                session.notify();
                stub.getRawValue();
                expect(b.destroy).toHaveBeenCalled();
                expect(stub.assocBinding).not.toBe(b);
            });

            it("should destroy the old binding and create a new one if the type of the initial binding changes", function() {
                vm.linkTo('theThing', {
                    reference: 'User',
                    id: 1
                });
                completeWithId(1);
                session.notify();
                vm.bind('theThing.posts', Ext.emptyFn);
                var stub = vm.getStub('theThing.posts');
                stub.getRawValue();
                var b = stub.assocBinding;
                spyOn(b, 'destroy');
                vm.linkTo('theThing', {
                    reference: 'Project',
                    id: 1
                });
                completeWithId(1);
                session.notify();
                stub.getRawValue();
                expect(b.destroy).toHaveBeenCalled();
                expect(stub.assocBinding).not.toBe(b);
            });
        });
        
        describe("validations", function() {
            it("should create a binding if one doesn't exist", function() {
                vm.linkTo('theUser', {
                    reference: 'User',
                    id: 1
                });
                completeWithId(1);
                session.notify();
                vm.bind('theUser.validation', Ext.emptyFn);
                var stub = vm.getStub('theUser.validation');
                stub.getRawValue();
                expect(stub.assocBinding).toBeDefined();
            });

            it("should keep the same instance if the owner doesn't change", function() {
                vm.linkTo('theUser', {
                    reference: 'User',
                    id: 1
                });
                completeWithId(1);
                session.notify();
                vm.bind('theUser.validation', Ext.emptyFn);
                var stub = vm.getStub('theUser.validation');
                stub.getRawValue();
                var b = stub.assocBinding;
                stub.getRawValue();
                expect(stub.assocBinding).toBe(b);
            });
            
            it("should destroy the old binding and create a new one if the id of the initial binding changes", function() {
                vm.linkTo('theUser', {
                    reference: 'User',
                    id: 1
                });
                completeWithId(1);
                session.notify();
                vm.bind('theUser.validation', Ext.emptyFn);
                var stub = vm.getStub('theUser.validation');
                stub.getRawValue();
                var b = stub.assocBinding;
                spyOn(b, 'destroy');
                vm.linkTo('theUser', {
                    reference: 'User',
                    id: 2
                });
                completeWithId(2);
                session.notify();
                stub.getRawValue();
                expect(b.destroy).toHaveBeenCalled();
                expect(stub.assocBinding).not.toBe(b);
            });

            it("should destroy the old binding and create a new one if the type of the initial binding changes", function() {
                vm.linkTo('theThing', {
                    reference: 'User',
                    id: 1
                });
                completeWithId(1);
                session.notify();
                vm.bind('theThing.validation', Ext.emptyFn);
                var stub = vm.getStub('theThing.validation');
                stub.getRawValue();
                var b = stub.assocBinding;
                spyOn(b, 'destroy');
                vm.linkTo('theThing', {
                    reference: 'Project',
                    id: 1
                });
                completeWithId(1);
                session.notify();
                stub.getRawValue();
                expect(b.destroy).toHaveBeenCalled();
                expect(stub.assocBinding).not.toBe(b);
            });
        });
    });
});