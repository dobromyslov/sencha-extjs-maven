describe("Ext.ComponentQuery", function() {
    var cq,
        cm,
        EA,
        result,
        root,
        child1,
        child2,
        child3,
        child4,
        child5,
        child6,
        child7,
        child8,
        child9,
        child10,
        child11,
        setup = function(o, parent) {
            if (o.items) {
                for (var i = 0; i < o.items.length; i++) {
                    setup(o.items[i], o);
                }
            }
            
            Ext.apply(o, {
                getItemId: function() {
                    return this.id;
                },

                getId: function() {
                    return this.id;
                },

                getRefItems: function(deep) {
                    var items = this.items || [],
                        len = items.length,
                        i = 0,
                        item;
            
                    if (deep) {
                        for (; i < len; i++) {
                            item = items[i];
                            if (item.getRefItems) {
                                items = items.concat(item.getRefItems(true));
                            }
                        }
                    }
                    
                    return items;
                },
                
                getRefOwner: function() {
                    return this.ownerCt;
                },
                
                hasCls: function(cls) {
                    return this.cls == cls;
                },
                
                isHidden: function() {
                    return this.hidden;
                },
                
                isXType: function(type) {
                    return EA.contains(this.type.split('/'), type);
                },
                
                ownerCt: parent
            });
            
            cm.register(o);
        };

    beforeEach(function() {
        cq = Ext.ComponentQuery;
        cm = Ext.ComponentManager;
        EA = Ext.Array;

        root = {
            id: 'root',
            cls: 'root-cls',
            type: 'A',
            items: [child1 = {
                $className: 'Foo',
                id: 'child1',
                cls: 'child1-cls',
                type: 'B/G/Z'
            }, child2 = {
                $className: 'Bar',
                id: 'child2',
                cls: 'child2-cls',
                type: 'B/G/Z'
            }, child3 = {
                $className: 'Foo',
                id: 'child3',
                cls: 'child3-cls',
                type: 'B/C/D',
                layout: 'card',
                items: [child4 = {
                    id: 'child4',
                    cls: 'child4-cls',
                    type: 'B/C/E',
                    layout: 'hbox',
                    items: [child5 = {
                        id: 'child5',
                        cls: 'child5-cls',
                        type: 'B/C/F',
                        items: [child7 = {
                            id: 'child7',
                            cls: 'child7-cls',
                            type: 'B/G/H'
                        }, child8 = {
                            id: 'child8',
                            cls: 'child8-cls',
                            type: 'B/G/I'
                        }, child9 = {
                            id: 'child9',
                            cls: 'child9-cls',
                            type: 'B/G/J'
                        }]
                    }, child6 = {
                        id: 'child6',
                        cls: 'child6-cls',
                        type: 'B/G/Z',
                        hidden: true
                    }, child10 = {
                        id   : 'child10',
                        cls  : 'child10-cls my-foo-cls',
                        type : 'B'
                    }, child11 = {
                        id   : 'child11',
                        cls  : 'child11-cls my-foo-cls-test',
                        type : 'B'
                    }]
                }]
            }]
        };
        setup(root);
    });
    
    afterEach(function() {
        cm.all = {};
    });
    
    describe("is", function(){
        var item;
        beforeEach(function() {
           item = Ext.getCmp('root');
        });
        
        afterEach(function(){
            item = null;
        });
        
        it("should return true if there is no selector", function(){
            expect(cq.is(root)).toBe(true);
        });
        
        it("should return true if component matches the selector", function(){
            expect(cq.is(root, '[type=A]')).toBe(true);
        });  
        
        it("should return true if component matches any selector", function(){
            expect(cq.is(root, 'button, #foo, #root, [type=A]')).toBe(true);
        });  
        
        it("should return false if the component doesn't match the selector", function(){
            expect(cq.is(root, '#foo')).toBe(false);
        });
        
        it("should work with the :not pseudo", function() {
            var comp = new Ext.Component({
                foo: 1
            });
            
            expect(comp.is('[foo]:not([bar])')).toBe(true);
        });
        
        it("should be able to run on destroyed components", function(){
            var comp = new Ext.Component({
                foo: 1
            });
            
            comp.destroy();
            expect(comp.is('[foo]:not([bar])')).toBe(true);
        });
        
        describe("hierarchy selectors", function() {
            it("should match a direct child", function(){
                expect(cq.is(child6, '#child4 > #child6')).toBe(true);    
            });  
            
            it("should return false if it's not a direct child", function() {
                expect(cq.is(child6, '#child3 > #child6')).toBe(false);    
            });
            
            it("should match deep children", function() {
                expect(cq.is(child6, '#child3 #child6')).toBe(true);    
            });
            
            it("should match an upward selector", function() {
                expect(cq.is(child3, '#child6 ^ #child3')).toBe(true);  
            });
        });
    });
    
    describe("simple query by xtype", function() {
        it("should select all six items of type G", function() {
            result = cq.query('G', root);
            expect(result.length).toEqual(6);
            expect(result[2].id).toEqual(child6.id);
        });
    });
    
    describe("simple query by xtype prefixed with dot", function() {
        it("should select all six items of type G", function() {
            result = cq.query('.G', root);
            expect(result.length).toEqual(6);
            expect(result[2].id).toEqual(child6.id);
        });
    });
    
    describe("attributes starting with $", function(){
        it("should match $className variable", function(){
            result = cq.query('[$className=Foo]');    
            expect(result.length).toBe(2);
            expect(result[0].id).toBe('child1');
            expect(result[1].id).toBe('child3');
        });  
    });
    
    describe("query by id", function() {
        it("should select the second child", function() {
            result = cq.query('G#child2', root);
            expect(result.length).toEqual(1);
            expect(result[0].id).toEqual(child2.id);
        });
        
        it("should select the fifth child", function() {
            result = cq.query('#child5', root);
            expect(result.length).toEqual(1);
            expect(result[0].id).toEqual(child5.id);
        });
    });
    
    describe("query by property", function() {
        it("should select the second child", function() {
            result = cq.query('G[cls=child2-cls]', root);
            expect(result.length).toEqual(1);
            expect(result[0].id).toEqual(child2.id);
        });

        it("should select the sixth child", function () {
            result = cq.query('[hidden]', root);
            expect(result.length).toEqual(1);
            expect(result[0].id).toEqual(child6.id);
        });
        
        describe("matchers", function(){
            it("should select the tenth child", function () {
                result = cq.query('[cls~=my-foo-cls]', root);
                expect(result.length).toEqual(1);
                expect(result[0].id).toEqual(child10.id);
            }); 
            
            it("should select items where id starts with child1", function(){
                result = cq.query('[id^=child1]', root);
                expect(result.length).toBe(3);
                expect(result[0].id).toBe('child1');
                expect(result[1].id).toBe('child10'); 
                expect(result[2].id).toBe('child11');                 
            });
            
            it("should select items where cls ends with 9-cls", function(){
                result = cq.query('[cls$=9-cls]', root);
                expect(result.length).toBe(1);
                expect(result[0].cls).toBe('child9-cls');                
            });
        });
    });
    
    describe("query using mode ^", function() {
        it("should select the fourth child", function() {
            result = cq.query('G[cls=child8-cls]^#child4', root);
            expect(result.length).toEqual(1);
            expect(result[0].id).toEqual(child4.id);
        });
    });

    describe("query using mode ^ and >", function() {
        it("should select the sixth child", function() {
            result = cq.query('G[cls=child8-cls]^#child4>G', root);
            expect(result.length).toEqual(1);
            expect(result[0].id).toEqual(child6.id);
        });
    });

    describe("query using multiple selectors", function() {
        it("should select the third and fifth child", function() {
            result = cq.query('#child3,F', root);
            expect(result.length).toEqual(2);
            expect(result[0].id).toEqual(child3.id);
            expect(result[1].id).toEqual(child5.id);
        });
    });

    describe("query using member function", function() {
        it("should select the sixth child that is hidden", function() {
            result = cq.query('{isHidden()}', root);
            expect(result.length).toEqual(1);
            expect(result[0].id).toEqual(child6.id);
        });
    });

    describe("query using pseudo-class", function() {
        beforeEach(function() {
            cq.pseudos.cardLayout = function(items) {
                var result = [], c, i = 0, l = items.length;
                for (; i < l; i++) {
                    if ((c = items[i]).layout === 'card') {
                        result.push(c);
                    }
                }
                return result;
            };
        });

        it("should select the third child with layout == 'card'", function() {
            result = cq.query('C:cardLayout', root);
            delete cq.pseudos.cardLayout;
            expect(result.length).toEqual(1);
            expect(result[0].id).toEqual(child3.id);
        });
        
        it("should not select the sixth child which is filtered by :not()", function(){
            result = cq.query(':not([hidden])', root);
            var all = root.getRefItems(true),
                getId = function(o){ return o.id; },
                allIds = EA.map(all, getId),
                resultIds = EA.map(result, getId),
                diffIds = EA.difference(allIds, resultIds);
            expect(result.length).toEqual(all.length - 1);
            expect(diffIds.length).toEqual(1);
            expect(diffIds[0]).toEqual(child6.id);
        });
        
        it("should accept back-to-back pseudo-class selectors with cumulative results", function(){
            result = cq.query(':not(G):not(F)', root);
            expect(result.length).toEqual(4);
            expect(result[0].id).toEqual(child3.id);
            expect(result[1].id).toEqual(child4.id);
            expect(result[2].id).toEqual(child10.id);
            expect(result[3].id).toEqual(child11.id);
        });
        
        it("should accept member expression selectors", function() {
            result = cq.query(':not({isHidden()})', root);
            var all = root.getRefItems(true),
                getId = function(o){ return o.id; },
                allIds = EA.map(all, getId),
                resultIds = EA.map(result, getId),
                diffIds = EA.difference(allIds, resultIds);
            expect(result.length).toEqual(all.length - 1);
            expect(diffIds.length).toEqual(1);
            expect(diffIds[0]).toEqual(child6.id);
        });
        
        describe("first/last", function() {
            var items;
            beforeEach(function(){
                items = [
                    new Ext.Component({
                        action: 'type1',
                        id: 'id1'
                    }),
                    new Ext.container.Container({
                        action: 'type1',
                        id: 'id2'
                    }),
                    new Ext.container.Container({
                        action: 'type2',
                        id: 'id3'
                    }),
                    new Ext.Component({
                        action: 'type2',
                        id: 'id4'
                    }),
                    new Ext.container.Container({
                        action: 'type2',
                        id: 'id5'
                    })
                ];
            });
            
            afterEach(function(){
                Ext.Array.forEach(items, function(item){
                    item.destroy();
                });
                items = null;
            });
            
            describe("first", function(){
                it("should return an empty array if no items match", function(){
                    var result = cq.query('button:first', items);
                    expect(result).toEqual([]);  
                });
                
                it("should return the first matching component by type", function(){
                    var result = cq.query('container:first', items);
                    expect(result).toEqual([items[1]]);  
                });
                
                it("should return the last matching component by attribute", function(){
                    var result = cq.query('[action=type2]:first', items);
                    expect(result).toEqual([items[2]]);  
                });
                
                it("should return the first component", function(){
                    var result = cq.query('*:first', items);
                    expect(result).toEqual([items[0]]);  
                });
                
                describe("no items/single item", function(){
                    it("should return an empty array if there are no items", function(){
                        var result = cq.query('*:first', []);
                        expect(result).toEqual([]);    
                    });
                    
                    it("should return an a single item if it matches", function(){
                        var c = new Ext.Component();
                        var result = cq.query('component:first', [c]);
                        expect(result).toEqual([c]); 
                        c.destroy();   
                    });    
                });
            });
        
            describe("last", function(){
                it("should return an empty array if no items match", function(){
                    var result = cq.query('button:last', items);
                    expect(result).toEqual([]);  
                });
                
                it("should return the last matching component by type", function(){
                    var result = cq.query('component:last', items);
                    expect(result).toEqual([items[4]]);  
                });
                
                it("should return the first matching component by attribute", function(){
                    var result = cq.query('[action=type1]:last', items);
                    expect(result).toEqual([items[1]]);  
                });
                
                it("should return the first component", function(){
                    var result = cq.query('*:last', items);
                    expect(result).toEqual([items[4]]);  
                });
                
                describe("no items/single item", function(){
                    it("should return an empty array if there are no items", function(){
                        var result = cq.query('*:last', []);
                        expect(result).toEqual([]);    
                    });
                    
                    it("should return an a single item if it matches", function(){
                        var c = new Ext.Component();
                        var result = cq.query('component:last', [c]);
                        expect(result).toEqual([c]); 
                        c.destroy();   
                    });    
                });
            });
        });
    });
    
    describe('attribute value coercion', function() {
        var candidates = [{
            att1: 0,
            att2: 0,
            att3: 0,
            att4: 0
        }, {
            att1: null,
            att2: false,
            att3: true,
            att4: undefined
        }, {
            att1: 0,
            att2: 0,
            att3: 0,
            att4: 0
        }];

        if('should coerce "null" to match a null property value', function() {
            expect(cq.query('[att1=null]', candidates)).toBe(candidates[1]);
        });

        if('should coerce "false" to match a Boolean property value', function() {
            expect(cq.query('[att2=false]', candidates)).toBe(candidates[1]);
        });

        if('should coerce "true" to match a Boolean property value', function() {
            expect(cq.query('[att3=true]', candidates)).toBe(candidates[1]);
        });

        if('should coerce "undefined" to match an undefined property value', function() {
            expect(cq.query('[att4=undefined]', candidates)).toBe(candidates[1]);
        });
    });
    
    describe('ownProperty tests', function() {
        var TestClass = function(){},
            candidates;

        TestClass.prototype = { foo: 'bar', bletch: 0 };

         // Only candidates[1] has *ownProperties* foo and bletch
         // And the value of bletch is zero, so by [bletch] will never match.
         // Test that [?bletch] tests for just *presence* of property in object.
        candidates = [new TestClass(), {
            foo: 'bar',
            bletch: 0
        }];

        it('should only match candidates [@foo=bar] with ownProperty "foo" equal to "bar"', function() {
            expect(Ext.ComponentQuery.query('[@foo=bar]', candidates).length).toBe(1);
            expect(Ext.ComponentQuery.query('[@foo=bar]', candidates)[0]).toBe(candidates[1])
            expect(Ext.ComponentQuery.is(candidates[0], '[@foo=bar]')).toBe(false);
            expect(Ext.ComponentQuery.is(candidates[1], '[@foo=bar]')).toBe(true);
        });

        it('should not match candidates [bletch] where bletch is a falsy property', function() {
            expect(Ext.ComponentQuery.query('[bletch]', candidates).length).toBe(0);
            expect(Ext.ComponentQuery.is(candidates[0], '[bletch]')).toBe(false);
            expect(Ext.ComponentQuery.is(candidates[1], '[bletch]')).toBe(false);
        });

        it('should match candidates [?bletch] where bletch is a falsy property', function() {
            expect(Ext.ComponentQuery.query('[?bletch]', candidates).length).toBe(1);
            expect(Ext.ComponentQuery.query('[?bletch]', candidates)[0]).toBe(candidates[1]);
            expect(Ext.ComponentQuery.is(candidates[0], '[?bletch]')).toBe(false);
            expect(Ext.ComponentQuery.is(candidates[1], '[?bletch]')).toBe(true);
        });
    });
    
    describe('Querying floating descendants', function() {
        var c;
            
        beforeEach(function() {
            c = new Ext.container.Container({
                items: {
                    xtype: 'container',
                    floating: true,
                    id: 'floating-cq-child',
                    items: {
                        xtype: 'container',
                        floating: true,
                        id: 'floating-cq-grandchild',
                        items: {
                            floating: true,
                            id: 'floating-cq-great-grandchild'
                        }
                    }
                },
                renderTo: document.body
            });
        });
        afterEach(function() {
            c.destroy();
        });

        it('should find all descendants', function() {
            var d = c.query();
            expect(d.length).toEqual(3);
            expect(d[0]).toBe(Ext.getCmp('floating-cq-child'));
            expect(d[1]).toBe(Ext.getCmp('floating-cq-grandchild'));
            expect(d[2]).toBe(Ext.getCmp('floating-cq-great-grandchild'));
        });
        it('should find individual descendants', function() {
            var d = c.query('>*');
            expect(d.length).toEqual(1);
            expect(d[0]).toBe(Ext.getCmp('floating-cq-child'));

            d = c.query('>>*');
            expect(d.length).toEqual(1);
            expect(d[0]).toBe(Ext.getCmp('floating-cq-grandchild'));

            d = c.query('>>>*');
            expect(d.length).toEqual(1);
            expect(d[0]).toBe(Ext.getCmp('floating-cq-great-grandchild'));
        });
    });

    describe('trimming spaces', function () {
        var c;

        beforeEach(function () {
            c = new Ext.container.Container({
                items: {
                    xtype: 'button',
                    text: 'Test',
                    action: 'selectVendors'
                },
                renderTo: document.body
            });
        });

        afterEach(function () {
            c.destroy();
            c = null;
        });

        describe('single space', function () {
            it('should trim leading space in attribute matching expressions', function () {
                result = cq.query('[action =selectVendors]', c);
                expect(result.length).toBe(1);
                expect(result[0].action).toBe('selectVendors');

                result = cq.query('[action ^=selectVendors]', c);
                expect(result.length).toBe(1);
                expect(result[0].action).toBe('selectVendors');

                result = cq.query('[action $=selectVendors]', c);
                expect(result.length).toBe(1);
                expect(result[0].action).toBe('selectVendors');
            });

            it('should trim trailing space in attribute matching expressions', function () {
                result = cq.query('[action= selectVendors]', c);
                expect(result.length).toBe(1);
                expect(result[0].action).toBe('selectVendors');

                result = cq.query('[action*= selectVendors]', c);
                expect(result.length).toBe(1);
                expect(result[0].action).toBe('selectVendors');

                result = cq.query('[action~= selectVendors]', c);
                expect(result.length).toBe(1);
                expect(result[0].action).toBe('selectVendors');
            });

            it('should trim both spaces in attribute matching expressions', function () {
                result = cq.query('[action = selectVendors]', c);
                expect(result.length).toBe(1);
                expect(result[0].action).toBe('selectVendors');

                result = cq.query('[action *= selectVendors]', c);
                expect(result.length).toBe(1);
                expect(result[0].action).toBe('selectVendors');

                result = cq.query('[action ~= selectVendors]', c);
                expect(result.length).toBe(1);
                expect(result[0].action).toBe('selectVendors');
            });
        });

        describe('multiple spaces', function () {
            it('should trim multiple leading space in attribute matching expressions', function () {
                result = cq.query('[action     =selectVendors]', c);
                expect(result.length).toBe(1);
                expect(result[0].action).toBe('selectVendors');

                result = cq.query('[action     ^=selectVendors]', c);
                expect(result.length).toBe(1);
                expect(result[0].action).toBe('selectVendors');

                result = cq.query('[action     $=selectVendors]', c);
                expect(result.length).toBe(1);
                expect(result[0].action).toBe('selectVendors');
            });

            it('should trim multiple trailing space in attribute matching expressions', function () {
                result = cq.query('[action=      selectVendors]', c);
                expect(result.length).toBe(1);
                expect(result[0].action).toBe('selectVendors');

                result = cq.query('[action*=      selectVendors]', c);
                expect(result.length).toBe(1);
                expect(result[0].action).toBe('selectVendors');

                result = cq.query('[action~=      selectVendors]', c);
                expect(result.length).toBe(1);
                expect(result[0].action).toBe('selectVendors');
            });

            it('should trim multiple spaces in both attribute matching expressions', function () {
                result = cq.query('[action      =      selectVendors]', c);
                expect(result.length).toBe(1);
                expect(result[0].action).toBe('selectVendors');

                result = cq.query('[action      *=      selectVendors]', c);
                expect(result.length).toBe(1);
                expect(result[0].action).toBe('selectVendors');

                result = cq.query('[action      ~=      selectVendors]', c);
                expect(result.length).toBe(1);
                expect(result[0].action).toBe('selectVendors');
            });
        });
    });
});
