describe("Ext.data.schema.Schema", function() {
    
    var M = Ext.data.Model,
        schema;
        
    beforeEach(function() {
        schema = Ext.data.Model.schema;
    });
    
    afterEach(function() {
        schema = Ext.data.Model.schema;
        schema.clear();
        schema.setNamespace(null); 
        schema = null;   
    });
    
    describe("entity names", function() {
        function makeCls(name) {
            return {
                $className: name
            };
        }
        
        describe("without namespace", function() {
            it("should return null if there is no className", function() {
                expect(schema.getEntityName(makeCls())).toBeNull(); 
            });
            
            it("should return a simple name", function() {
                expect(schema.getEntityName(makeCls('User'))).toBe('User');
            });
            
            it("should return the last part of a name with namespaces", function() {
                expect(schema.getEntityName(makeCls('Foo.bar.baz.User'))).toBe('User');
            });
        });
        
        describe("with namespace", function() {            
            it("should return null if there is no className", function() {
                schema.setNamespace('spec.model');
                expect(schema.getEntityName(makeCls())).toBeNull(); 
            });
            
            it("should return the model name sans the namespace", function() {
                schema.setNamespace('spec.model');
                expect(schema.getEntityName(makeCls('spec.model.User'))).toBe('User'); 
            });
            
            it("should return the other parts of model name sans the namespace", function() {
                schema.setNamespace('spec.model');
                expect(schema.getEntityName(makeCls('spec.model.trading.Bid'))).toBe('trading.Bid'); 
            });
            
            it("should support putting the . at the end of the namespace", function() {
                schema.setNamespace('spec.model.');
                expect(schema.getEntityName(makeCls('spec.model.User'))).toBe('User'); 
            });
            
            it("should not remove an unrelated namespace", function() {
                schema.setNamespace('spec.model.');
                expect(schema.getEntityName(makeCls('spec.wodel.User'))).toBe('spec.wodel.User');
            });
        });
    });
    
    describe("one to one creation", function() {
        
    });
});
