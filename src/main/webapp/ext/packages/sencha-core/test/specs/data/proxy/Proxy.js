describe("Ext.data.proxy.Proxy", function() {
    var proxy,
        Proxy = Ext.data.proxy.Proxy,
        AlienModelName   = 'spec.Alien',
        AlienModelConfig =  {
            extend: 'Ext.data.Model',
            fields: [
                {name: 'name',  type: 'string'},
                {name: 'age',   type: 'int'},
                {name: 'planet', type: 'string'}
            ]
        },
        AlienModel, HumanModel,
        HumanModelName   = 'spec.Human',
        HumanModelConfig =  {
            extend: 'Ext.data.Model',
            fields: [
                {name: 'name',  type: 'string'},
                {name: 'age',   type: 'int'},
                {name: 'planet', type: 'string', defaultValue: 'Earth'}
            ]
        };

    beforeEach(function() {
        Ext.ClassManager.enableNamespaceParseCache = false; 
        proxy = new Proxy({});
        
        AlienModel = Ext.define(AlienModelName, AlienModelConfig);
        HumanModel = Ext.define(HumanModelName, HumanModelConfig);

    });
    
    afterEach(function(){
        Ext.ClassManager.enableNamespaceParseCache = true; 
        Ext.data.Model.schema.clear();
        Ext.undefine('spec.Alien');
        Ext.undefine('spec.Human');
    });
    

    it("should mixin Ext.util.Observable", function() {
        expect(proxy.mixins.observable).toEqual(Ext.util.Observable.prototype);
    });

    describe("instantiation", function() {
        it("should have correct config options", function() {
            expect(proxy.getBatchOrder()).toBe('create,update,destroy');
        });

        it("should have methods create, read, update, destroy equals to EmptyFn", function() {
            expect(proxy.create).toBe(Ext.emptyFn);
            expect(proxy.read).toBe(Ext.emptyFn);
            expect(proxy.update).toBe(Ext.emptyFn);
            expect(proxy.destroy).toBe(Ext.emptyFn);
        });
    });

    describe("methods", function() {
        describe("getModel", function() {
            it ("should return the proxy model", function() {
                proxy.setModel(AlienModel);
                expect(proxy.getModel()).toEqual(AlienModel);
            });
        });

        describe("setModel", function() {
            it('should have a model equal to AlienModel', function(){
                proxy.setModel(AlienModel);
                expect(proxy.getModel()).toEqual(AlienModel);
            });

            describe("if the Reader has already been instantiated", function() {
                beforeEach(function() {
                    proxy.setReader(new Ext.data.reader.Reader({
                        model: null
                    }));

                    spyOn(proxy.getReader(), 'setModel').andReturn(true);
                });

                it("should set the Reader's Model", function() {
                    proxy.setModel(AlienModel);

                    expect(proxy.getReader().setModel).toHaveBeenCalledWith(AlienModel);
                });
            });
        });

        describe("batch", function() {
            var spy,
                batchOperations = {
                    create : [AlienModel, HumanModel],
                    update : [AlienModel]
                },
                batchListeners = {
                    complete: {
                        fn    : Ext.emptyFn,
                        scope : this
                    }
                };

            it('should run Ext.data.Batch.prototype.add 2 times', function() {
                spy = spyOn(Ext.data.Batch.prototype, 'add').andCallThrough();
                proxy.batch(batchOperations, batchListeners); 
                expect(spy.callCount).toEqual(2);
            });

            it('should run Ext.data.Batch.prototype.start 1 times', function(){
                spy = spyOn(Ext.data.Batch.prototype, 'start').andCallThrough();
                proxy.batch(batchOperations, batchListeners); 
                expect(spy.callCount).toEqual(1);
            });
        });
    });
    
});
