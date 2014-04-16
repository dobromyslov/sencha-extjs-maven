describe("Ext.app.ViewModel", function() {
    
    var viewModel, scheduler, session, spy;

    function bindDeepNotify (key, fn, scope) {
        viewModel.bind(key, fn || spy, scope).deep = true;
        viewModel.notify();
    }

    function bindNotify (key, fn, scope) {
        viewModel.bind(key, fn || spy, scope);
        viewModel.notify();
    }

    function setNotify (key, value) {
        viewModel.set(key, value);
        viewModel.notify();
    }
    
    function notify() {
        viewModel.notify();
    }

    function reset () {
        for (var i = 0, len = arguments.length; i < len; ++i) {
            arguments[i].reset();
        }
    }

    function expectArgs (newVal, oldVal) {
        var args = spy.mostRecentCall.args;
        expect(args[0]).toBe(newVal);
        if (arguments.length > 1) {
            expect(args[1]).toBe(oldVal);
        }
    }
    
    beforeEach(function() {
        MockAjaxManager.addMethods();

        session = new Ext.data.session.Session({
            scheduler: {
                // Make a huge tickDelay, we'll control it by forcing ticks
                tickDelay: 9999
            }
        });
        scheduler = session.getScheduler();

        viewModel = new Ext.app.ViewModel({
            id: 'rootVM',
            session: session
        });

        spy = jasmine.createSpy();
    });
    
    afterEach(function() {
        Ext.destroy(viewModel);
        Ext.destroy(session);
        session = scheduler = spy = viewModel = null;

        MockAjaxManager.removeMethods();
        Ext.data.Model.schema.clear();
    });

    describe("bind/set for non records/stores", function() {
        describe("setting simple value types", function() {
            it("should set a number", function() {
                bindNotify('{age}', spy);
                setNotify('age', 3);
                expectArgs(3, undefined);
            });
            
            it("should set a string", function() {
                bindNotify('{name}', spy);
                setNotify('name', 'Kenneth');
                expectArgs('Kenneth', undefined);
            });
            
            it("should set a bool", function() {
                bindNotify('{active}', spy);
                setNotify('active', true);
                expectArgs(true, undefined);
            });
            
            it("should set an array", function() {
                var arr = [18, 22, 13];
                bindNotify('{scores}', spy);
                setNotify('scores', arr);
                expectArgs(arr, undefined);
            });
            
            it("should set a date", function() {
                var d = new Date(1980, 0, 1);
                bindNotify('{dob}', spy);
                setNotify('dob', d);
                expectArgs(d, undefined);
            });
            
            it("should set an object instance", function() {
                var map = new Ext.util.HashMap();
                    
                bindNotify('{myMap}', spy);
                setNotify('myMap', map);
                expectArgs(map, undefined);
            });
        });

        describe("using bind options", function() {
            it("should set a number", function() {
                bindNotify({
                    bindTo: '{age}'
                }, spy);

                setNotify('age', 3);
                expectArgs(3, undefined);

                setNotify('age', 5);
                expectArgs(5, 3);
            });

            it("should set a number once", function() {
                bindNotify({
                    bindTo: '{age}',
                    single: true
                }, spy);

                expect(spy.callCount).toBe(0);
                setNotify('age', 3);
                expectArgs(3, undefined);
                expect(spy.callCount).toBe(1);

                setNotify('age', 5);
                expect(spy.callCount).toBe(1);
            });
        });

        describe("setting objects", function() {
            it("should set to the root if there's no name", function() {
                bindNotify('{name}', spy);
                setNotify('', {
                    name: 'Bar'
                });
                expectArgs('Bar', undefined);
            });
            
            it("should be able to set simple nested properties", function() {
                bindNotify('{user.name}', spy);
                setNotify('user', {
                    name: 'Foo'
                });
                expectArgs('Foo', undefined);
            });
            
            it("should set deeply nested properties", function() {
                bindNotify('{a.b.c.d.e.f.g}', spy);
                setNotify('a', {
                    b: {
                        c: {
                            d: {
                                e: {
                                    f: {
                                        g: 'val'
                                    }
                                }
                            }
                        }
                    }
                });
                expectArgs('val', undefined);
            });
            
            it("should be able to set mixes of values/objects", function() {
                var city = jasmine.createSpy();
                
                viewModel.bind('{user.name}', spy);
                viewModel.bind('{user.address.city}', city);
                viewModel.notify();
                setNotify('user', {
                    name: 'Foo',
                    address: {
                        city: 'Paris'
                    }
                });
                expectArgs('Foo', undefined);
                expect(city.mostRecentCall.args[0]).toBe('Paris');  
            });
        });
        
        describe("callback settings", function() {
            it("should pass the old and new value", function() {
                bindNotify('{name}', spy);
                setNotify('name', 'Foo');
                setNotify('name', 'Bar');
                expectArgs('Bar', 'Foo');
            });
            
            it("should default the scope to the session", function() {
                var scope;
                bindNotify('{name}', function() {
                    scope = this;
                });
                scope = undefined;
                setNotify('name', 'X');
                expect(scope).toBe(viewModel);
            });
            
            it("should use the passed scope", function() {
                var o = {},
                    scope;
                    
                bindNotify('{name}', function() {
                    scope = this;
                }, o);
                scope = undefined;
                setNotify('name', 'X');
                expect(scope).toBe(o);
            });    
        });
        
        describe("timing of callbacks", function() {
            it("should not trigger the callback if the value doesn't change", function() {
                viewModel.bind('{name}', spy);
                viewModel.set('name', 'Foo');
                viewModel.notify();
                spy.reset();
                setNotify('name', 'Foo');
                expect(spy).not.toHaveBeenCalled();
            });
            
            it("should not trigger any parent nodes if the leaf value doesn't change", function() {
                var inner = jasmine.createSpy();
                viewModel.bind('{foo}', spy);
                viewModel.bind('{foo.bar}', inner);
                viewModel.set('foo.bar.baz.x', 'Foo');
                viewModel.notify();
                reset(spy, inner);
                setNotify('foo.bar.baz.x', 'Foo');
                expect(spy).not.toHaveBeenCalled();
                expect(inner).not.toHaveBeenCalled();
            });
            
            it("should be able to bind twice to the same stub", function() {
                var other = jasmine.createSpy();
                bindNotify('{name}', spy);
                bindNotify('{name}', other);
                reset(spy, other);
                setNotify('name', 'A');
                expect(spy).toHaveBeenCalled();
                expect(other).toHaveBeenCalled();
            });
            
            it("should trigger a new binding when there is a set pending", function() {
                var other = jasmine.createSpy();
                bindNotify('{name}', spy);
                spy.reset();
                viewModel.set('name', 'A');
                bindNotify('{name}', other);
                expect(spy).toHaveBeenCalled();
                expect(other).toHaveBeenCalled();
            });
            
            it("should only fire a single callback inside the timer resolution", function() {
                bindNotify('{name}', spy);
                spy.reset();
                viewModel.set('name', 'A');
                viewModel.set('name', 'B');
                viewModel.set('name', 'C');
                viewModel.set('name', 'D');
                viewModel.notify();
                expect(spy.callCount).toBe(1);
            });
            
            it("should only pass the last value since the last fired change", function() {
                bindNotify('{name}', spy);
                setNotify('name', 'A');
                spy.reset();
                viewModel.set('name', 'B');
                viewModel.set('name', 'C');
                viewModel.set('name', 'D');
                viewModel.set('name', 'E');
                viewModel.notify();
                expectArgs('E', 'A');
            });
            
            it("should trigger the binding initially if a value exists", function() {
                viewModel.set('name', 'Foo');
                bindNotify('{name}', spy);
                expect(spy).toHaveBeenCalled();
                expectArgs('Foo', undefined);
            });
            
            it("should not trigger the binding initially if a value is not set", function() {
                bindNotify('{name}', spy);
                expect(spy).not.toHaveBeenCalled();
            });
            
            it("should suspend the initial binding if the value is set within the tick window", function() {
                viewModel.bind('{name}', spy);
                setNotify('name', 'Foo');
                expectArgs('Foo', undefined);
            });
        });
        
        describe("nesting nested values", function() {
            it("should trigger a new long chain binding", function() {
                bindNotify('{user.address.city}', spy);
                spy.reset();
                setNotify('user.address.city', 'Sydney');
                expect(spy).toHaveBeenCalled();
            });
            
            it("should trigger a parent binding when a child changes", function() {
                var city = jasmine.createSpy(),
                    address = jasmine.createSpy();
                    
                bindNotify('{user.address.city}', city);
                bindDeepNotify('{user.address}', address);
                
                reset(city, address);

                setNotify('user.address.city', 'Berlin');
                expect(city).toHaveBeenCalled();
                expect(address).toHaveBeenCalled();
            });
            
            it("should trigger all parent bindings when a child changes", function() {
                var city = jasmine.createSpy(),
                    address = jasmine.createSpy(),
                    user = jasmine.createSpy();
                    
                bindNotify('{user.address.city}', city);
                bindDeepNotify('{user.address}', address);
                bindDeepNotify('{user}', user);
                
                reset(city, address, user);

                setNotify('user.address.city', 'Jakarta');
                expect(city).toHaveBeenCalled();
                expect(address).toHaveBeenCalled();
                expect(user).toHaveBeenCalled();
            });
            
            it("should trigger parent bindings even if a node in the hierarchy is skipped", function() {
                var city = jasmine.createSpy(),
                    user = jasmine.createSpy();
                    
                bindNotify('{user.address.city}', city);
                bindDeepNotify('{user}', user);
                
                reset(city, user);
                
                setNotify('user.address.city', 'London');
                expect(city).toHaveBeenCalled();
                expect(user).toHaveBeenCalled();
            });
            
            it("should only trigger the parent binding once if several direct children change", function() {
                bindDeepNotify('{user.address}', spy);
                spy.reset();
                viewModel.set('user.address.street', '1 Foo St');
                viewModel.set('user.address.city', 'Moscow');
                viewModel.set('user.address.zip', 12345);
                viewModel.set('user.address.country', 'Russia');
                viewModel.notify();
                expect(spy.callCount).toBe(1);
            });
            
            it("should only trigger the parent once even if several indirect children change", function() {
                bindDeepNotify('{user}', spy);
                spy.reset();
                viewModel.set('user.homeAddress.street', 'Foo');
                viewModel.set('user.homeAddress.city', 'Florida');
                viewModel.set('user.postalAddress.street', 'Bar');
                viewModel.set('user.postalAddress.city', 'Baltimore');
                viewModel.notify();
                expect(spy.callCount).toBe(1);
            });
            
            it("should trigger changes on the children when hierarchy is overwritten with a primitive", function() {
                var xxx = jasmine.createSpy(),
                    baz = jasmine.createSpy(),
                    bar = jasmine.createSpy();
                    
                viewModel.bind('{foo.bar.baz.xxx}', xxx);
                viewModel.bind('{foo.bar.baz}', baz);
                viewModel.bind('{foo.bar}', bar);
                setNotify('foo.bar.baz.xxx', 1);
                
                reset(xxx, baz, bar);

                setNotify('foo', 1);
                expect(xxx).toHaveBeenCalled();
                expect(baz).toHaveBeenCalled();
                expect(bar).toHaveBeenCalled();
            });
            
            it("should be able to expand a primitive into a hierarchy", function() {
                var xxx = jasmine.createSpy(),
                    baz = jasmine.createSpy(), 
                    bar = jasmine.createSpy();
                    
                viewModel.bind('{foo.bar.baz.xxx}', xxx);
                viewModel.bind('{foo.bar.baz}', baz).deep = true;
                viewModel.bind('{foo.bar}', bar).deep = true;
                viewModel.notify();
                setNotify('foo', 1);
                reset(xxx, baz, bar);
                setNotify('foo.bar.baz.xxx', 1);
                
                expect(xxx).toHaveBeenCalled();
                expect(baz).toHaveBeenCalled();
                expect(bar).toHaveBeenCalled();
            });
        });
        
        describe("firing order", function() {
            it("should fire children before parents", function() {
                var values = [];

                viewModel.bind('{address}', function (v) {
                    values.push('address: ' + Ext.encode(v));
                }).deep = true;
                viewModel.bind('{address.city}', function (v) {
                    values.push('address.city: ' + v);
                });

                viewModel.notify();

                expect(values).toEqual([]);

                viewModel.set('address.city', 'Melbourne');
                viewModel.notify();

                expect(values[0]).toBe('address.city: Melbourne');
                expect(values[1]).toBe('address: {"city":"Melbourne"}');
            });

            it("should fire a single binding at the depth of it's stub", function() {
                setNotify('foo.bar.baz.x', 1);
                var values = [],
                    adder = function(arg1) {
                        values.push(arg1);    
                    };
                viewModel.bind('{foo.bar.baz.x}', adder);
                viewModel.bind('{foo.bar.y}', adder);
                viewModel.set('foo.bar.y', 3);
                viewModel.set('foo.bar.baz.x', 2);
                viewModel.notify();
                expect(values[0]).toBe(2);
                expect(values[1]).toBe(3);
            });

            it("should fire complex hierarchies in depth order", function() {
                var data = {
                    key1: {
                        key11: {
                            key111: {
                                key1111: 'a',                // d=4
                                key1112: 'b'                 // d=4
                            },
                            key112: 'c'                      // d=3
                        },
                        key12: {
                            key121: 'd',                     // d=3
                            key122: 'e'                      // d=3
                        }
                    },
                    key2: {
                        key21: {
                            key211: 'f'                      // d=3
                        },
                        key22: {
                            key221: {
                                key2211: {
                                    key22111: 'g'            // d=5
                                }
                            },
                            key222: {
                                key2221: 'h'                 // d=4
                            }
                        },
                        key23: {
                            key231: 'i'                      // d=3
                        }
                    },
                    key3: {
                        key31: 'j',                          // d=2
                        key32: {
                            key321: 'k'                      // d=3
                        },
                        key33: {
                            key331: {
                                key3311: 'l'                 // d=4
                            },
                            key332: 'm'                      // d=3
                        }
                    },
                    key4: {
                        key41: 'n'                          // d=2
                    },
                    key5: 'o',                              // d=1
                    key6: {
                        key61: {
                            key611: {
                                key6111: {
                                    key61111: {
                                        key611111: {
                                            key6111111: 'p' // d=7
                                        },
                                        key611112: 'q'      // d=6
                                    }
                                }
                            },
                            key612: {
                                key6121: {
                                    key61211: {
                                        key61211: 'r'      // d=6
                                    }
                                }
                            },
                            key613: {
                                key6131: {
                                    key61311: {
                                        key613111: {
                                            key6131111: 's' // d=7
                                        }
                                    }
                                }
                            }
                        }
                    }
                };

                var map = {};
                var items = [];
                var entryLog = [];
                var valueLog = [];

                function buildMap (value, parent, path) {
                    var entry = {
                            id: items.length + 1,
                            path: path,
                            parent: parent,
                            value: value
                        };

                    items.push(map[path] = entry);
                    if (path) {
                        viewModel.bind('{' + path + '}', function (v) {
                            entryLog.push(entry);
                            valueLog.push(v);

                            // We can say for certain that none of our parent objects
                            // should have called back at this time.
                            for (var p = parent; p; p = p.parent) {
                                expect(Ext.Array.contains(entryLog, p)).toBe(false);
                            }
                        });
                    }

                    if (value && value.constructor === Object) {
                        var subPath = path ? path + '.' : '';

                        Ext.Object.each(value, function (name, v) {
                            buildMap(v, entry, subPath + name);
                        });
                    }

                    return entry;
                }

                var root = buildMap(data, null, '');
                var prefix;
                var i;

                viewModel.notify();
                for (i = 0; i < valueLog.length; ++i) {
                    prefix = entryLog[i].path + '=';
                    expect(prefix + valueLog[i]).toEqual(prefix + 'null');
                }

                entryLog.length = valueLog.length = 0;

                setNotify('', data);
                viewModel.notify();

                for (i = 0; i < valueLog.length; ++i) {
                    // Each delivered value should preserve the references we passed in
                    // for this case.
                    expect(valueLog[i]).toBe(entryLog[i].value);
                }
            });
        });
    });

    describe('parsing formulas', function () {
        var vm;

        function getFormula (name) {
            var stub = vm.getStub(name);
            return stub.formula;
        }

        function getExpressions (name) {
            var formula = getFormula(name),
                expressions = formula.get.$expressions;

            // We have to slice here because the Formula parser adds other properties
            // to the array and toEqual hates that.
            return expressions && expressions.slice();
        }

        afterEach(function () {
            vm.destroy();
            vm = null;
        });

        describe('simple formulas', function () {
            it('should recognize property access', function () {
                vm = new Ext.app.ViewModel({
                    formulas: {
                        foo: function (data) {
                            return data.x.y + data.z;
                        }
                    }
                });

                var expressions = getExpressions('foo');
                expect(expressions).toEqual(['x.y', 'z']);
            });

            it('should ignore method calls', function () {
                vm = new Ext.app.ViewModel({
                    formulas: {
                        foo: function (data) {
                            return data.x.y.substring(1) + data.z.toLowerCase();
                        }
                    }
                });

                var expressions = getExpressions('foo');
                expect(expressions).toEqual(['x.y', 'z']);
            });

            it('should recognize data as method parameters', function () {
                vm = new Ext.app.ViewModel({
                    formulas: {
                        foo: function (data) {
                            return this.foo(data.x+data.y.z);
                        }
                    }
                });

                var expressions = getExpressions('foo');
                expect(expressions).toEqual(['x', 'y.z']);
            });

            it('should ignore data used in suffix expression', function () {
                vm = new Ext.app.ViewModel({
                    formulas: {
                        foo: function (data) {
                            return this.data.foo(data.x + data.y.z);
                        }
                    }
                });

                var expressions = getExpressions('foo');
                expect(expressions).toEqual(['x', 'y.z']);
            });
        });

        describe('formulas with untracked rferences', function () {
            it('should recognize property access only using "data"', function () {
                vm = new Ext.app.ViewModel({
                    formulas: {
                        foo: function (data, untracked) {
                            return data.x.y + data.z + untracked.abc;
                        }
                    }
                });

                var expressions = getExpressions('foo');
                expect(expressions).toEqual(['x.y', 'z']);
            });

            it('should ignore method calls', function () {
                vm = new Ext.app.ViewModel({
                    data: {
                        def: '!?',
                        x: {
                           y: 'ABC'
                        },
                        z: 'XYZ'
                    },
                    formulas: {
                        foo: function (data, untracked) {
                            return data.x.y.substring(1) + data.z.toLowerCase() +
                                untracked.def;
                        }
                    }
                });

                var expressions = getExpressions('foo');
                expect(expressions).toEqual(['x.y', 'z']);

                scheduler = vm.getScheduler();
                vm.notify();
                expect(scheduler.passes).toBe(1);
                var data = vm.getData();
                expect(data.foo).toBe('BCxyz!?');
            });
        });

        describe('formula config objects', function () {
            it('should recognize property access', function () {
                vm = new Ext.app.ViewModel({
                    formulas: {
                        foo: {
                            get: function (data) {
                                return data.x.y + data.z;
                            }
                        }
                    }
                });

                var expressions = getExpressions('foo');
                expect(expressions).toEqual(['x.y', 'z']);
            });

            it('should ignore method calls', function () {
                vm = new Ext.app.ViewModel({
                    formulas: {
                        foo: {
                            get: function (data) {
                                return data.x.y.substring(1) + data.z.toLowerCase();
                            }
                        }
                    }
                });

                var expressions = getExpressions('foo');
                expect(expressions).toEqual(['x.y', 'z']);
            });

            it('should allow for bind options', function () {
                vm = new Ext.app.ViewModel({
                    data: {
                        x: 'XYZ'
                    },
                    formulas: {
                        foo: {
                            bind: {
                                bindTo: '{x}',
                                single: true
                            },
                            get: function (data) {
                                return data;
                            }
                        }
                    }
                });

                var expressions = getExpressions('foo');
                expect(expressions).toBe(undefined);

                scheduler = vm.getScheduler();
                vm.notify();
                expect(scheduler.passes).toBe(1);

                var data = vm.getData();
                expect(data.foo).toBe('XYZ');

                vm.set('x', 'ABC');

                vm.notify();
                expect(scheduler.passes).toBe(2);
                expect(data.foo).toBe('XYZ');
            });

            it('should promote single:true to bind options', function () {
                vm = new Ext.app.ViewModel({
                    data: {
                        x: 'XYZ'
                    },
                    formulas: {
                        foo: {
                            bind: '{x}',
                            single: true,
                            get: function (data) {
                                return data;
                            }
                        }
                    }
                });

                var expressions = getExpressions('foo');
                expect(expressions).toBe(undefined);

                scheduler = vm.getScheduler();
                vm.notify();
                expect(scheduler.passes).toBe(1);

                var data = vm.getData();
                expect(data.foo).toBe('XYZ');

                vm.set('x', 'ABC');

                vm.notify();
                expect(scheduler.passes).toBe(2);
                expect(data.foo).toBe('XYZ');
            });
        });
    }); // parsing formulas

    describe('value propagation', function () {
        var rec, User;

        function completeWithRecord(id, data) {
            Ext.Ajax.mockComplete({
                status: 200,
                responseText: Ext.encode(Ext.apply({
                    id: id,
                    name: 'Name1',
                    age: 20,
                    description: 'Desc1'
                }, data))
            });
        }

        beforeEach(function() {
            User = Ext.define('spec.User', {
                extend: 'Ext.data.Model',
                fields: ['id', 'name', 'age', 'description']
            });
        });

        afterEach(function() {
            Ext.undefine('spec.User');
            User = rec = null;
        });

        describe('nesting ViewModels', function () {
            var subViewModel;
            var grandSubViewModel;

            beforeEach(function() {
                subViewModel = new Ext.app.ViewModel({
                    id: 'subVM',
                    parent: viewModel
                });
                grandSubViewModel = new Ext.app.ViewModel({
                    id: 'grandSubVM',
                    parent: subViewModel
                });
            });

            afterEach(function() {
                Ext.destroy(viewModel);
                subViewModel = null;
            });

            it('should inherit data from parent view models', function () {
                var fooBar = 0,
                    calls = 0;

                subViewModel.bind('{foo.bar}', function (value) {
                    fooBar = value;
                    ++calls;
                });

                viewModel.set('foo', { bar: 42 });

                scheduler.notify();

                expect(calls).toBe(1);
                expect(fooBar).toBe(42);
            });

            it('should inherit data from grandparent view models', function () {
                var fooBar = 0,
                    calls = 0;

                grandSubViewModel.bind('{foo.bar}', function (value) {
                    fooBar = value;
                    ++calls;
                });

                viewModel.set('foo', { bar: 42 });

                scheduler.notify();

                expect(calls).toBe(1);
                expect(fooBar).toBe(42);
            });

            it('should maintain indirection with multiple view models', function () {
                var fooBar = 0,
                    subFooBar = 0,
                    grandSubFooBar = 0,
                    calls = 0,
                    subCalls = 0,
                    grandSubCalls = 0;

                viewModel.bind('{foo.bar}', function (value) {
                    fooBar = value;
                    ++calls;
                });
                subViewModel.bind('{foo.bar}', function (value) {
                    subFooBar = value;
                    ++subCalls;
                });
                grandSubViewModel.bind('{foo.bar}', function (value) {
                    grandSubFooBar = value;
                    ++grandSubCalls;
                });

                viewModel.set('foo', { bar: 42 });
                scheduler.notify();

                expect(scheduler.passes).toBe(1);

                expect(calls).toBe(1);
                expect(fooBar).toBe(42);
                expect(subCalls).toBe(1);
                expect(subFooBar).toBe(42);
                expect(grandSubCalls).toBe(1);
                expect(grandSubFooBar).toBe(42);

                subViewModel.set('foo', { bar: 427 });
                scheduler.notify();

                // Should get this delivered in one pass due to sort order
                expect(scheduler.passes).toBe(2);

                expect(calls).toBe(1);
                expect(fooBar).toBe(42);
                expect(subCalls).toBe(2);
                expect(subFooBar).toBe(427);
                expect(grandSubCalls).toBe(2);
                expect(grandSubFooBar).toBe(427);

                subViewModel.set('foo', undefined);
                scheduler.notify();

                // Should get this delivered in one pass due to sort order
                expect(scheduler.passes).toBe(3);

                expect(calls).toBe(1);
                expect(fooBar).toBe(42);
                expect(subCalls).toBe(3);
                expect(subFooBar).toBe(42);
                expect(grandSubCalls).toBe(3);
                expect(grandSubFooBar).toBe(42);
            });

            it('should modify parent VM instances', function () {
                var fooBar = 0,
                    subFooBar = 0,
                    grandSubFooBar = 0,
                    calls = 0,
                    subCalls = 0,
                    grandSubCalls = 0;

                viewModel.bind('{foo.bar}', function (value) {
                    fooBar = value;
                    ++calls;
                });
                subViewModel.bind('{foo.bar}', function (value) {
                    subFooBar = value;
                    ++subCalls;
                });
                grandSubViewModel.bind('{foo.bar}', function (value) {
                    grandSubFooBar = value;
                    ++grandSubCalls;
                });

                viewModel.set('foo', { bar: 42 });
                scheduler.notify();

                expect(scheduler.passes).toBe(1);

                expect(calls).toBe(1);
                expect(fooBar).toBe(42);
                expect(subCalls).toBe(1);
                expect(subFooBar).toBe(42);
                expect(grandSubCalls).toBe(1);
                expect(grandSubFooBar).toBe(42);

                // We are navigating to "foo.bar" which is found in viewModel and setting
                // that to 427. Even though we have set this from subViewModel the fact that
                // we set "foo.bar" means we travel upwards to find the object.
                subViewModel.set('foo.bar',  427);
                scheduler.notify();

                // Should get this delivered in one pass due to sort order
                expect(scheduler.passes).toBe(2);

                expect(calls).toBe(2);
                expect(fooBar).toBe(427);
                expect(subCalls).toBe(2);
                expect(subFooBar).toBe(427);
                expect(grandSubCalls).toBe(2);
                expect(grandSubFooBar).toBe(427);
            });

            describe('with formulas', function () {
                var foo = 0,
                    bar = 0,
                    baz = 0,
                    fooCalls = 0,
                    barCalls = 0,
                    bazCalls = 0,
                    fooBinding;

                beforeEach(function () {
                    viewModel.set({
                        firstName: 'Don',
                        lastName: 'Griffin',
                        abc: {
                            v: 'abc'
                        },
                        xyz: 'xyz'
                    });
                    viewModel.setFormulas({
                        // simple function form
                        foo: function (data) {
                            return data.abc.v + data.xyz;
                        },
                        fullName: {
                            get: function (data) {
                                return data.firstName + ' ' + data.lastName;
                            },
                            set: function (name) {
                                var a = name.split(' ');

                                this.set({
                                    firstName: a[0],
                                    lastName: a[1]
                                });
                            }
                        }
                    });

                    subViewModel.set({
                        xyz: 'XYZ'
                    });
                    subViewModel.setFormulas({
                        // object w/get (no bind)
                        bar: {
                            get: function (data) {
                                return data.abc.v + data.xyz;
                            }
                        },
                        // object w/get and bind
                        explicit: {
                            get: function (data) {
                                return '(' + data.foo.v + '/' + data.foo.x + ')';
                            },
                            bind: {
                                foo: {
                                    v: '{abc.v}',
                                    x: '{xyz}'
                                }
                            }
                        }
                    });

                    grandSubViewModel.set({
                        abc: {
                            v: 'ABC'
                        }
                    });
                    grandSubViewModel.setFormulas({
                        baz: function (data) {
                            return data.abc.v + data.xyz;
                        },
                        welcome: function (data) {
                            return 'Hello ' + data.fullName + '!';
                        }
                    });

                    fooBinding = viewModel.bind('{foo}', function (value) {
                        foo = value;
                        ++fooCalls;
                    });
                    subViewModel.bind('{bar} - {foo}', function (value) {
                        bar = value;
                        ++barCalls;
                    });
                    grandSubViewModel.bind('{baz} - {bar} - {foo} - {explicit}', function (value) {
                        baz = value;
                        ++bazCalls;
                    });

                    scheduler.notify();
                });

                it('should bind formulas to values in ancestor viewmodels', function () {
                    expect(scheduler.passes).toBe(1);
                    expect(foo).toBe('abcxyz');
                    expect(bar).toBe('abcXYZ - abcxyz');
                    expect(baz).toBe('ABCXYZ - abcXYZ - abcxyz - (abc/XYZ)');
                });

                it('should not allow setting the value of a formula', function () {
                    expect(function () {
                        fooBinding.setValue(10);
                    }).toThrow();
                });

                it('should update when values change in ancestor viewmodels', function () {
                    viewModel.set('abc.v', '~abc~');
                    viewModel.set('xyz', '~xyz~');

                    scheduler.notify();
                    expect(scheduler.passes).toBe(2);

                    expect(foo).toBe('~abc~~xyz~');
                    expect(bar).toBe('~abc~XYZ - ~abc~~xyz~');
                    expect(baz).toBe('ABCXYZ - ~abc~XYZ - ~abc~~xyz~ - (~abc~/XYZ)');
                });

                it('should react to formula dependencies in base view models', function () {
                    var fullName, lastNameFirstName, welcome;

                    expect(scheduler.passes).toBe(1);

                    viewModel.bind('{lastName}, {firstName}', function (s) {
                        lastNameFirstName = s;
                    });
                    var fullNameBinding = viewModel.bind('{fullName}', function (s) {
                        fullName = s;
                    });
                    grandSubViewModel.bind('{welcome}', function (s) {
                        welcome = s;
                    });

                    scheduler.notify();
                    expect(scheduler.passes).toBe(2);
                    expect(fullName).toBe('Don Griffin');
                    expect(lastNameFirstName).toBe('Griffin, Don');
                    expect(welcome).toBe('Hello Don Griffin!');

                    fullNameBinding.setValue('Evan Trimboli');

                    scheduler.notify();
                    expect(scheduler.passes).toBe(3);
                    expect(fullName).toBe('Evan Trimboli');
                    expect(lastNameFirstName).toBe('Trimboli, Evan');
                    expect(welcome).toBe('Hello Evan Trimboli!');
                });

                it('should work with get() calls on records', function () {
                    subViewModel.setFormulas({
                        fromRecord: function (data) {
                            return data.rec.get('fld');
                        }
                    });

                    var Model = Ext.define(null, {
                        extend: 'Ext.data.Model',
                        fields: ['fld']
                    });

                    rec = new Model({ fld: 42 });
                    viewModel.set('rec', rec);

                    var value,
                        calls = 0;

                    grandSubViewModel.bind('The answer is {fromRecord}', function (v) {
                        value = v;
                        ++calls;
                    });

                    scheduler.notify();

                    expect(scheduler.passes).toBe(2);
                    expect(calls).toBe(1);
                    expect(value).toBe('The answer is 42');
                });

                it('should track field changes based on get() calls', function () {
                    subViewModel.setFormulas({
                        fromRecord: function (data) {
                            return data.rec.get('name');
                        }
                    });

                    viewModel.linkTo('rec', {
                        reference: 'User',
                        id: 1
                    });

                    var value,
                        calls = 0;

                    grandSubViewModel.bind('Greetings {fromRecord}!', function (v) {
                        value = v;
                        ++calls;
                    });

                    completeWithRecord(1, {
                        name: 'Don'
                    });

                    scheduler.notify();

                    expect(scheduler.passes).toBe(2);
                    expect(calls).toBe(1);
                    expect(value).toBe('Greetings Don!');

                    session.getEntity('User', 1).set('name', 'Evan');

                    scheduler.notify();

                    expect(scheduler.passes).toBe(3);
                    expect(calls).toBe(2);
                    expect(value).toBe('Greetings Evan!');
                });
            }); // with formulas

        }); // nesting ViewModels

        describe("binding records", function() {
            describe("initial loading", function() {
                it("should start in loading state", function() {
                    viewModel.linkTo('theUser', {
                        reference: 'User',
                        id: 1
                    });

                    var binding = viewModel.bind('{theUser}', Ext.emptyFn);
                    var subBinding = viewModel.bind('{theUser.name}', Ext.emptyFn);

                    expect(binding.isLoading()).toBe(true);
                    expect(subBinding.isLoading()).toBe(true);

                    completeWithRecord(1);

                    expect(binding.isLoading()).toBe(false);
                    expect(subBinding.isLoading()).toBe(false);
                });

                it("should request a model when bound to", function() {
                    spyOn(User, 'load');
                    viewModel.bind({
                        reference: 'User',
                        id: 1
                    }, Ext.emptyFn);
                    var options = User.load.mostRecentCall.args;
                    expect(options[0]).toBe(1);
                });

                it("should request the model when linked to", function() {
                    spyOn(User, 'load');
                    viewModel.linkTo('aUser', {
                        reference: 'User',
                        id: 1
                    });
                    var options = User.load.mostRecentCall.args;
                    expect(options[0]).toBe(1);
                });

                it("should not request the model when it already exists", function() {
                    viewModel.bind({
                        reference: 'User',
                        id: 1
                    }, Ext.emptyFn);
                    completeWithRecord(1);

                    spyOn(User, 'load');
                    viewModel.bind({
                        reference: 'User',
                        id: 1
                    }, Ext.emptyFn);
                    expect(User.load).not.toHaveBeenCalled();
                });
            });

            describe("record binding", function() {
                it("should trigger the binding when the record first loads", function() {
                    viewModel.bind({
                        reference: 'User',
                        id: 1
                    }, spy);
                    completeWithRecord(1);
                    viewModel.notify();
                    rec = viewModel.getSession().getEntity('User', 1);
                    expectArgs(rec, undefined);
                    expect(spy.callCount).toBe(1);
                });

                it("should trigger the record binding if a field value changes", function() {
                    viewModel.bind({
                        reference: 'User',
                        id: 1
                    }, spy);
                    completeWithRecord(1);
                    viewModel.notify();
                    spy.reset();
                    rec = viewModel.getSession().getEntity('User', 1);
                    rec.set('name', 'Foo');
                    viewModel.notify();
                    expect(spy).toHaveBeenCalled();
                });

                it("should only trigger the record binding once when multiple fields change", function() {
                    viewModel.bind({
                        reference: 'User',
                        id: 1
                    }, spy);
                    completeWithRecord(1);
                    viewModel.notify();
                    spy.reset();
                    rec = viewModel.getSession().getEntity('User', 1);
                    rec.set('name', 'Foo');
                    rec.set('age', 100);
                    rec.set('description', 'Bar');
                    viewModel.notify();
                    expect(spy.callCount).toBe(1);
                });

                it("should not trigger the callback if the value changes then back to non-dirty", function() {
                    viewModel.linkTo('theUser', {
                        reference: 'User',
                        id: 1
                    });
                    viewModel.bind('{theUser.name}', spy);
                    completeWithRecord(1);
                    viewModel.notify();
                    spy.reset();
                    rec = viewModel.getSession().getEntity('User', 1);
                    var orig = rec.get('name');
                    rec.set('name', orig + orig);
                    rec.set('name', orig);
                    viewModel.notify();
                    expect(spy).not.toHaveBeenCalled();
                });

                it("should trigger the callback if the value changes, notifies, then back to non-dirty", function() {
                    viewModel.linkTo('theUser', {
                        reference: 'User',
                        id: 1
                    });
                    viewModel.bind('{theUser.name}', spy);
                    completeWithRecord(1);
                    viewModel.notify();
                    spy.reset();
                    rec = viewModel.getSession().getEntity('User', 1);
                    var orig = rec.get('name');
                    rec.set('name', orig + orig);
                    notify();
                    expect(spy).toHaveBeenCalled();
                    spy.reset();
                    rec.set('name', orig);
                    notify();
                    expect(spy).toHaveBeenCalled();
                });
            });

            describe("field binding", function() {
                it("should trigger a binding when the record first loads", function() {
                    viewModel.linkTo('aUser', {
                        reference: 'User',
                        id: 10
                    });
                    viewModel.bind('{aUser.name}', spy);
                    completeWithRecord(10);
                    viewModel.notify();
                    expectArgs('Name1', undefined);
                });

                it("should trigger a binding for all fields when it loads", function() {
                    viewModel.linkTo('aUser', {
                        reference: 'User',
                        id: 10
                    });
                    var name = jasmine.createSpy(),
                        age = jasmine.createSpy(),
                        desc = jasmine.createSpy();

                    viewModel.bind('{aUser.name}', name);
                    viewModel.bind('{aUser.age}', age);
                    viewModel.bind('{aUser.description}', desc);
                    completeWithRecord(10);
                    viewModel.notify();
                    expect(name).toHaveBeenCalled();
                    expect(age).toHaveBeenCalled();
                    expect(desc).toHaveBeenCalled();
                });

                it("should trigger a binding if the field value changes", function() {
                    viewModel.linkTo('aUser', {
                        reference: 'User',
                        id: 10
                    });
                    viewModel.bind('{aUser.name}', spy);
                    completeWithRecord(10);
                    viewModel.notify();
                    spy.reset();

                    rec = viewModel.getSession().getEntity(User, 10);
                    rec.set('name', 'Foo');
                    viewModel.notify();
                    expectArgs('Foo', 'Name1');
                });

                it("should not trigger a binding if the field value returns to the original", function() {
                    viewModel.linkTo('aUser', {
                        reference: 'User',
                        id: 10
                    });
                    viewModel.bind('{aUser.name}', spy);
                    completeWithRecord(10);
                    viewModel.notify();
                    spy.reset();

                    rec = viewModel.getSession().getEntity(User, 10);
                    rec.set('name', 'Foo');
                    rec.set('name', 'Name1');
                    viewModel.notify();
                    expect(spy).not.toHaveBeenCalled();
                });
                
                describe("when the record is set via data", function() {
                    it("should trigger initially with the value", function() {
                        viewModel.bind('{aUser.name}', spy);
                        rec = new User({
                            id: 10,
                            name: 'Foo'
                        }, false, session);
                        viewModel.set('aUser', rec);
                        notify();
                        expect(spy).toHaveBeenCalled();
                        expectArgs('Foo', undefined);
                    });
                    
                    it("should trigger a binding if the field value changes", function() {
                        viewModel.bind('{aUser.name}', spy);
                        rec = new User({
                            id: 10,
                            name: 'Foo'
                        }, session);
                        viewModel.set('aUser', rec);
                        notify();
                        spy.reset();
                        rec.set('name', 'Bar');
                        notify();
                        expect(spy).toHaveBeenCalled();
                        expectArgs('Bar', 'Foo');
                    });
                });
            });

            describe("modifying links", function() {
                it("should not trigger the bind if the link is switched while loading", function() {
                    viewModel.linkTo('aUser', {
                        reference: 'User',
                        id: 1
                    });

                    viewModel.bind('{aUser}', spy);

                    // We changed our minds, now rec1 & rec2 are in flight
                    viewModel.linkTo('aUser', {
                        reference: 'User',
                        id: 2
                    });
                    completeWithRecord(1);
                    expect(spy).not.toHaveBeenCalled();
                });

                it("should trigger the bind once the new link loads", function() {
                    viewModel.bind('{aUser}', spy);
                    viewModel.notify();
                    spy.reset();

                    viewModel.linkTo('aUser', {
                        reference: 'User',
                        id: 1
                    });

                    // We changed our minds, now rec1 & rec2 are in flight
                    viewModel.linkTo('aUser', {
                        reference: 'User',
                        id: 2
                    });
                    completeWithRecord(1);
                    viewModel.notify();
                    expect(spy).not.toHaveBeenCalled();
                    completeWithRecord(2);
                    viewModel.notify();
                    expect(spy).toHaveBeenCalled();
                });

                it("should not trigger when binding to an existing record", function() {
                    viewModel.bind('{aUser}', spy);
                    viewModel.bind({
                        reference: 'User',
                        id: 1
                    }, Ext.emptyFn);
                    viewModel.bind({
                        reference: 'User',
                        id: 2
                    }, Ext.emptyFn);
                    completeWithRecord(1);
                    completeWithRecord(2);
                    viewModel.notify();
                    spy.reset();

                    viewModel.linkTo('aUser', {
                        reference: 'User',
                        id: 2
                    });
                    expect(spy).not.toHaveBeenCalled();
                });

                it("should be able to react to field changes on a newly linked reference", function() {
                    viewModel.bind('{aUser.name}', spy);
                    viewModel.bind({
                        reference: 'User',
                        id: 1
                    }, Ext.emptyFn);
                    viewModel.bind({
                        reference: 'User',
                        id: 2
                    }, Ext.emptyFn);
                    completeWithRecord(1);
                    completeWithRecord(2);
                    viewModel.notify();

                    rec = viewModel.getSession().getEntity('User', 2);

                    viewModel.linkTo('aUser', {
                        reference: 'User',
                        id: 2
                    });
                    spy.reset();
                    rec.set('name', 'Foo');
                    viewModel.notify();
                    expectArgs('Foo', undefined);
                });

                it("should be able to switch multiple times", function() {
                    var values = [];
                    viewModel.bind('{aUser.name}', function(arg1) {
                        values.push(arg1);
                    });
                    viewModel.bind({
                        reference: 'User',
                        id: 1
                    }, Ext.emptyFn);
                    viewModel.bind({
                        reference: 'User',
                        id: 2
                    }, Ext.emptyFn);
                    completeWithRecord(1);
                    completeWithRecord(2);
                    viewModel.notify();

                    var user1 = viewModel.getSession().getEntity('User', 1),
                        user2 = viewModel.getSession().getEntity('User', 2);

                    values = [];
                    viewModel.linkTo('aUser', {
                        reference: 'User',
                        id: 1
                    });
                    user1.set('name', 'a');
                    viewModel.notify();
                    viewModel.linkTo('aUser', {
                        reference: 'User',
                        id: 2
                    });
                    user2.set('name', 'b');
                    viewModel.notify();
                    viewModel.linkTo('aUser', {
                        reference: 'User',
                        id: 1
                    });
                    user1.set('name', 'c');
                    viewModel.notify();
                    viewModel.linkTo('aUser', {
                        reference: 'User',
                        id: 2
                    });
                    user2.set('name', 'd');
                    viewModel.notify();
                    expect(values.join('')).toBe('abcd');
                });

                it("should not trigger a change when pointed to a new link and the value is the same", function() {
                    viewModel.bind('{aUser.name}', spy);
                    viewModel.bind({
                        reference: 'User',
                        id: 1
                    }, Ext.emptyFn);
                    viewModel.bind({
                        reference: 'User',
                        id: 2
                    }, Ext.emptyFn);
                    completeWithRecord(1, {
                        name: 'A'
                    });
                    completeWithRecord(2, {
                        name: 'B'
                    });
                    viewModel.notify();

                    var user1 = viewModel.getSession().getEntity('User', 1),
                        user2 = viewModel.getSession().getEntity('User', 2);

                    viewModel.linkTo('aUser', {
                        reference: 'User',
                        id: 1
                    });
                    user1.set('name', 'Foo');
                    viewModel.notify();
                    expect(spy).toHaveBeenCalled();
                    spy.reset();

                    viewModel.linkTo('aUser', {
                        reference: 'User',
                        id: 2
                    });
                    user2.set('name', 'Foo');
                    viewModel.notify();
                    // The value for 'aUser' didn't change, don't fire
                    expect(spy).not.toHaveBeenCalled();
                });

                it("should trigger a change when pointed to a new link and the value is different", function() {
                    var count = 0,
                        name, text;

                    viewModel.bind('{aUser.name}', function (s) {
                        ++count;
                        name = s;
                    });
                    viewModel.bind('Hello {aUser.name}!', function (s) {
                        text = s;
                    });

                    viewModel.linkTo('aUser', {
                        reference: 'User',
                        id: 1
                    });
                    completeWithRecord(1, {
                        name: 'A'
                    });

                    viewModel.notify();
                    expect(count).toBe(1);
                    expect(name).toBe('A');
                    expect(text).toBe('Hello A!');

                    viewModel.linkTo('aUser', {
                        reference: 'User',
                        id: 2
                    });
                    completeWithRecord(2, {
                        name: 'B'
                    });
                    viewModel.notify();

                    expect(count).toBe(2);
                    expect(name).toBe('B');
                    expect(text).toBe('Hello B!');

                    viewModel.linkTo('aUser', {
                        reference: 'User',
                        id: 3
                    });
                    completeWithRecord(3, {
                        name: 'B'
                    });
                    viewModel.notify();

                    // The value for 'aUser' didn't change, don't fire
                    expect(count).toBe(2);
                    expect(name).toBe('B');
                    expect(text).toBe('Hello B!');
                });
            }); // modifying links

            describe('field changes', function () {
                it('should be able to change fields via binding', function () {
                    var nameCount = 0,
                        textCount = 0,
                        name, text;

                    var nameBinding = viewModel.bind('{aUser.name}', function (s) {
                        ++nameCount;
                        name = s;
                    });

                    var textBinding = viewModel.bind('Hello {aUser.name}!', function (s) {
                        ++textCount;
                        text = s;
                    });

                    viewModel.linkTo('aUser', {
                        reference: 'User',
                        id: 1
                    });
                    completeWithRecord(1, {
                        name: 'Don'
                    });

                    viewModel.notify();
                    viewModel.notify(); // should do nothing but make sure we don't fire twice

                    expect(nameCount).toBe(1);
                    expect(textCount).toBe(1);
                    expect(name).toBe('Don');
                    expect(text).toBe('Hello Don!');

                    nameBinding.setValue('Evan');

                    viewModel.notify();
                    viewModel.notify(); // should do nothing but make sure we don't fire twice

                    expect(nameCount).toBe(2);
                    expect(textCount).toBe(2);
                    expect(name).toBe('Evan');
                    expect(text).toBe('Hello Evan!');
                });

                it('should fail to set values on readonly bindings', function () {
                    var textBinding = viewModel.bind('Hello {aUser.name}!', Ext.emptyFn);

                    expect(function() {
                        textBinding.setValue('Evan');
                    }).toThrow();
                });
            }); // field changes
        }); // binding records
    }); // value propagation

    describe("associations", function() {
        function completeWithRecord(id, data) {
            data = data || {};
            Ext.Ajax.mockComplete({
                status: 200,
                responseText: Ext.JSON.encode(Ext.applyIf(data, {
                    id: id
                }))
            });
        }

        function completeWithRecordNotify(id, data) {
            completeWithRecord(id, data);
            viewModel.notify();
        }

        function completeWithData(data) {
            Ext.Ajax.mockComplete({
                status: 200,
                responseText: Ext.JSON.encode(data)
            });
        }

        function completeWithDataNotify(data) {
            completeWithData(data);
            viewModel.notify();
        }

        describe("one to many", function() {
            var Order, OrderItem;

            beforeEach(function() {
                Order = Ext.define('spec.Order', {
                    extend: 'Ext.data.Model',
                    fields: ['id', 'key']
                });

                OrderItem = Ext.define('spec.OrderItem', {
                    extend: 'Ext.data.Model',
                    fields: [{
                                 name: 'orderId',
                                 reference: 'Order'
                             }, 'qty', 'price']
                });
            });

            afterEach(function() {
                Ext.undefine('spec.Order');
                Ext.undefine('spec.OrderItem');
                Order = OrderItem = null;
            });

            describe("the one", function() {
                describe("loading", function() {
                    it("should trigger a load if the record doesn't exist", function() {
                        viewModel.linkTo('OI', {
                            reference: 'OrderItem',
                            id: 1
                        });
                        completeWithRecordNotify(1, {
                            orderId: 17
                        });

                        spyOn(Order, 'load');
                        bindNotify('{OI.order}');

                        var args = Order.load.mostRecentCall.args;
                        expect(args[0]).toBe(17);
                    });

                    it("should not trigger a load if the record exists", function() {
                        viewModel.bind({
                            reference: 'Order',
                            id: 17
                        }, spy);
                        completeWithRecordNotify(17);

                        viewModel.linkTo('OI', {
                            reference: 'OrderItem',
                            id: 1
                        });
                        completeWithRecordNotify(1, {
                            orderId: 17
                        });

                        spyOn(Order, 'load');
                        bindNotify('{OI.order}');

                        expect(Order.load).not.toHaveBeenCalled();
                    });
                    
                    it("should be able to bind to the many while the record is loading", function() {
                        viewModel.linkTo('OI', {
                            reference: 'OrderItem',
                            id: 1
                        });
                        notify();
                        viewModel.bind('{OI.order}', spy);
                        completeWithRecordNotify(1, {
                            orderId: 17
                        });
                        expect(spy).not.toHaveBeenCalled();
                        completeWithRecordNotify(17);
                        expect(spy).toHaveBeenCalled();
                        expect(spy.mostRecentCall.args[0]).toBe(session.getEntity('Order', 17));
                    });

                    describe("constructed API", function() {
                        it("should load via the constructed record API", function() {
                            viewModel.linkTo('OI', {
                                reference: 'OrderItem',
                                id: 1
                            });
                            completeWithRecordNotify(1, {
                                orderId: 17
                            });

                            var rec = session.getEntity('OrderItem', 1);

                            rec.getOrder(spy);
                            viewModel.notify();
                            completeWithRecordNotify(17);
                            expect(spy.mostRecentCall.args[0]).toBe(session.getEntity('Order', 17));
                        });

                        it("should return the record if it's already loaded", function() {
                            viewModel.bind({
                                reference: 'Order',
                                id: 17
                            }, spy);
                            completeWithRecordNotify(17);

                            viewModel.linkTo('OI', {
                                reference: 'OrderItem',
                                id: 1
                            });
                            completeWithRecordNotify(1, {
                                orderId: 17
                            });

                            var rec = session.getEntity('OrderItem', 1),
                                order = rec.getOrder();

                            expect(order.getId()).toBe(17);
                            expect(order.entityName).toBe('Order');
                        });
                    });
                });

                describe("binding to fields", function() {
                    it("should bind to a field on the record", function() {
                        viewModel.linkTo('OI', {
                            reference: 'OrderItem',
                            id: 1
                        });
                        completeWithRecordNotify(1, {
                            orderId: 17
                        });

                        bindNotify('{OI.order.key}', spy);
                        completeWithRecordNotify(17, {
                            key: '12345'
                        });
                        expectArgs('12345');
                    });

                    it("should update when the field changes", function() {
                        viewModel.linkTo('OI', {
                            reference: 'OrderItem',
                            id: 1
                        });
                        completeWithRecordNotify(1, {
                            orderId: 17
                        });

                        bindNotify('{OI.order.key}', spy);
                        completeWithRecordNotify(17, {
                            key: '12345'
                        });
                        var rec = session.getEntity('Order', 17);
                        rec.set('key', '67890');
                        viewModel.notify();
                        expectArgs('67890');
                    });
                });

                describe("changing the binding", function() {
                    it("should trigger a change when the linked item is new", function() {
                        viewModel.linkTo('OI', {
                            reference: 'OrderItem',
                            id: 1
                        });
                        completeWithRecordNotify(1, {
                            orderId: 17
                        });

                        bindNotify('{OI.order}', spy);
                        completeWithRecordNotify(17);
                        spy.reset();
                        viewModel.linkTo('OI', {
                            reference: 'OrderItem',
                            id: 2
                        });
                        completeWithRecordNotify(2, {
                            orderId: 39
                        });
                        // The record is loading, so we shouldn't trigger a change until it loads
                        expect(spy).not.toHaveBeenCalled();
                        completeWithRecordNotify(39);
                        expectArgs(session.getEntity('Order', 39));
                    });

                    it("should not trigger a change when the main item changes but the linked item is the same", function() {
                        viewModel.linkTo('OI', {
                            reference: 'OrderItem',
                            id: 1
                        });
                        completeWithRecordNotify(1, {
                            orderId: 17
                        });

                        bindNotify('{OI.order}', spy);
                        completeWithRecordNotify(17);
                        spy.reset();
                        viewModel.linkTo('OI', {
                            reference: 'OrderItem',
                            id: 2
                        });
                        completeWithRecordNotify(2, {
                            orderId: 17
                        });
                        expect(spy).not.toHaveBeenCalled();
                    });
                });
            }); // the one

            describe("the many", function() {
                describe("loading", function() {
                    it("should trigger a load of the store", function() {
                        viewModel.linkTo('O', {
                            reference: 'Order',
                            id: 1
                        });
                        completeWithRecordNotify(1);

                        var proto = Ext.data.Store.prototype;
                        spyOn(proto, 'load');
                        bindNotify('{O.orderItems}');
                        expect(proto.load).toHaveBeenCalled();
                    });

                    it("should set a filter on the store to load only the items with the key", function() {
                        viewModel.linkTo('O', {
                            reference: 'Order',
                            id: 1
                        });
                        completeWithRecordNotify(1);
                        bindNotify('{O.orderItems}', spy);
                        completeWithDataNotify([]);

                        var store = spy.mostRecentCall.args[0],
                            filter = store.getFilters().first();

                        expect(filter.getProperty()).toBe('orderId');
                        expect(filter.getValue()).toBe(1);
                    });
                    
                    it("should be able to bind to the many while the record is loading", function() {
                        viewModel.linkTo('O', {
                            reference: 'Order',
                            id: 1
                        });
                        notify();
                        viewModel.bind('{O.orderItems}', spy);
                        completeWithRecordNotify(1);
                        expect(spy).not.toHaveBeenCalled();
                        completeWithDataNotify([]);
                        expect(spy).toHaveBeenCalled();
                        expect(spy.mostRecentCall.args[0].isStore).toBe(true);
                    });

                    it("should not trigger a load when nested data is returned", function() {
                        viewModel.linkTo('O', {
                            reference: 'Order',
                            id: 1
                        });
                        notify();
                        completeWithRecordNotify(1, {
                            orderItems: [{
                                id: 1,
                                orderId: 1
                            }, {
                                id: 2,
                                orderId: 1
                            }, {
                                id: 3,
                                orderId: 1
                            }]
                        });
                        var loadSpy = spyOn(Ext.data.Store.prototype, 'load');
                        viewModel.bind('{O.orderItems}', spy);
                        notify();
                        expect(loadSpy).not.toHaveBeenCalled();
                        expect(spy).toHaveBeenCalled();
                        expect(spy.mostRecentCall.args[0].getCount()).toBe(3);
                    });

                    describe("constructed API", function() {
                        it("should return the store and not load it", function() {
                            viewModel.linkTo('O', {
                                reference: 'Order',
                                id: 1
                            });
                            completeWithRecordNotify(1);

                            var rec = session.getEntity('Order', 1);

                            var store = rec.orderItems();
                            expect(store.isLoading()).toBe(false);
                        });

                        it("should return the same store if it's already loaded", function() {
                            viewModel.linkTo('O', {
                                reference: 'Order',
                                id: 1
                            });
                            completeWithRecordNotify(1);

                            bindNotify('{O.orderItems}', spy);
                            completeWithDataNotify([]);

                            var rec = session.getEntity('Order', 1),
                                store = rec.orderItems();

                            expect(store).toBe(spy.mostRecentCall.args[0]);
                        });
                    });
                });

                describe("changing the binding", function() {
                    it("should trigger a change when the linked item is new", function() {
                        viewModel.linkTo('O', {
                            reference: 'Order',
                            id: 1
                        });
                        completeWithRecordNotify(1);

                        bindNotify('{O.orderItems}', spy);
                        completeWithDataNotify([]);
                        spy.reset();
                        viewModel.linkTo('O', {
                            reference: 'Order',
                            id: 2
                        });
                        completeWithRecordNotify(2);
                        // The store is loading, so we shouldn't trigger a change until it loads
                        expect(spy).not.toHaveBeenCalled();
                        completeWithDataNotify([]);
                        expect(spy).toHaveBeenCalled();
                    });
                });
            }); // the many
        }); // one to many

        describe("one to one", function() {
            var Person, Passport;

            beforeEach(function() {
                Person = Ext.define('spec.Person', {
                    extend: 'Ext.data.Model',
                    fields: ['id', {
                        name: 'passportId',
                        reference: {
                            type: 'Passport',
                            unique: true
                        }
                    }]
                });

                Passport = Ext.define('spec.Passport', {
                    extend: 'Ext.data.Model',
                    fields: ['id', 'country']
                });
            });

            afterEach(function() {
                Ext.undefine('spec.Passport');
                Ext.undefine('spec.Passport');
                Person = Passport = null;
            });

            describe("the key holder", function() {
                describe("loading", function() {
                    it("should trigger a load if the record doesn't exist", function() {
                        viewModel.linkTo('P', {
                            reference: 'Person',
                            id: 1
                        });
                        completeWithRecordNotify(1, {
                            passportId: 17
                        });

                        spyOn(Passport, 'load');
                        bindNotify('{P.passport}');

                        var args = Passport.load.mostRecentCall.args;
                        expect(args[0]).toBe(17);
                    });

                    it("should not trigger a load if the record exists", function() {
                        viewModel.bind({
                            reference: 'Passport',
                            id: 17
                        }, spy);
                        completeWithRecordNotify(17);

                        viewModel.linkTo('P', {
                            reference: 'Person',
                            id: 1
                        });
                        completeWithRecordNotify(1, {
                            passportId: 17
                        });

                        spyOn(Passport, 'load');
                        bindNotify('{P.passport}');

                        expect(Passport.load).not.toHaveBeenCalled();
                    });
                    
                    it("should be able to bind to the many while the record is loading", function() {
                        viewModel.linkTo('P', {
                            reference: 'Person',
                            id: 1
                        });
                        notify();
                        viewModel.bind('{P.passport}', spy);
                        completeWithRecordNotify(1, {
                            passportId: 17
                        });
                        expect(spy).not.toHaveBeenCalled();
                        completeWithRecordNotify(17);
                        expect(spy).toHaveBeenCalled();
                        expect(spy.mostRecentCall.args[0]).toBe(session.getEntity('Passport', 17));
                    });

                    describe("constructed API", function() {
                        it("should load via the constructed record API", function() {
                            viewModel.linkTo('P', {
                                reference: 'Person',
                                id: 1
                            });
                            completeWithRecordNotify(1, {
                                passportId: 17
                            });

                            var rec = session.getEntity('Person', 1);

                            rec.getPassport(spy);
                            viewModel.notify();
                            completeWithRecordNotify(17);
                            expect(spy.mostRecentCall.args[0]).toBe(session.getEntity('Passport', 17));
                        });

                        it("should return the record if it's already loaded", function() {
                            viewModel.bind({
                                reference: 'Passport',
                                id: 17
                            }, spy);
                            completeWithRecordNotify(17);

                            viewModel.linkTo('P', {
                                reference: 'Person',
                                id: 1
                            });
                            completeWithRecordNotify(1, {
                                passportId: 17
                            });

                            var rec = session.getEntity('Person', 1),
                                passport = rec.getPassport();

                            expect(passport.getId()).toBe(17);
                            expect(passport.entityName).toBe('Passport');
                        });
                    });
                });

                describe("binding to fields", function() {
                    it("should bind to a field on the record", function() {
                        viewModel.linkTo('P', {
                            reference: 'Person',
                            id: 1
                        });
                        completeWithRecordNotify(1, {
                            passportId: 17
                        });

                        bindNotify('{P.passport.country}', spy);
                        completeWithRecordNotify(17, {
                            country: 'Canada'
                        });
                        expectArgs('Canada');
                    });

                    it("should update when the field changes", function() {
                        viewModel.linkTo('P', {
                            reference: 'Person',
                            id: 1
                        });
                        completeWithRecordNotify(1, {
                            passportId: 17
                        });

                        bindNotify('{P.passport.country}', spy);
                        completeWithRecordNotify(17, {
                            country: 'Canada'
                        });
                        var rec = session.getEntity('Passport', 17);
                        rec.set('country', 'Spain');
                        viewModel.notify();
                        expectArgs('Spain');
                    });
                });

                describe("changing the binding", function() {
                    it("should trigger a change when the linked item is new", function() {
                        viewModel.linkTo('P', {
                            reference: 'Person',
                            id: 1
                        });
                        completeWithRecordNotify(1, {
                            passportId: 17
                        });

                        bindNotify('{P.passport}', spy);
                        completeWithRecordNotify(17);
                        spy.reset();
                        viewModel.linkTo('P', {
                            reference: 'Person',
                            id: 2
                        });
                        completeWithRecordNotify(2, {
                            passportId: 39
                        });
                        // The record is loading, so we shouldn't trigger a change until it loads
                        expect(spy).not.toHaveBeenCalled();
                        completeWithRecordNotify(39);
                        expectArgs(session.getEntity('Passport', 39));
                    });
                });
            }); // key holder
        }); // one-to-one
    }); // associations

    describe('validation binding', function () {
        var User;

        function completeRequest(data) {
            Ext.Ajax.mockComplete({
                status: 200,
                responseText: Ext.encode(data)
            });
        }

        beforeEach(function() {
            User = Ext.define('spec.User', {
                extend: Ext.data.Model,

                // W/o convert:null here the defaultValue kicks in and we get empty
                // strings. For this test we don't want that.
                fields: [
                    { name: 'first',       type: 'string', convert: null },
                    { name: 'last',        type: 'string', convert: null },
                    { name: 'email',       type: 'string', convert: null },
                    { name: 'formatField', type: 'string', convert: null },
                    { name: 'phone',       type: 'string', convert: null },
                    { name: 'color',       type: 'string', convert: null },
                    { name: 'description', type: 'string', convert: null },
                    { name: 'initial',     type: 'string', convert: null }
                ],

                validators: {
                    last:        'presence',
                    description: { type: 'length', min: 10, max: 200 },
                    color:       { type: 'inclusion', list: [ 'red', 'white', 'blue' ] },
                    first:       { type: 'exclusion', list: [ 'Ed' ] },
                    formatField: { type: 'format', matcher: /123/ },
                    email:       'email',
                    phone:       { type: 'presence', message: 'Phone number required' },
                    initial:     { type: 'length', min: 1 }
                },

                doValidate: function () {
                    //
                }
            });

            viewModel.linkTo('theUser', {
                reference: 'User',
                id: 42
            });
        });

        afterEach(function () {
            Ext.undefine('spec.User');
        });

        describe("delivering validation messages", function() {
            beforeEach(function() {
                completeRequest({
                    id: 42,
                    description: 'too short',
                    color: 'not a valid color',
                    first: 'Ed',
                    formatField: 'abc',
                    email: 'abc',
                    initial: 'X',
                    extraStuff: 42
                });
            });

            describe("for invalid fields", function() {
                var Val = Ext.data.validator.Validator.all;

                it('should report description too short', function () {
                    var value;
                    var calls = 0;

                    viewModel.bind('{theUser.validation.description}', function (v) {
                        value = v;
                        ++calls;
                    });

                    scheduler.notify();

                    expect(scheduler.passes).toBe(1);
                    expect(calls).toBe(1);
                    expect(value).toBe('Length must be between 10 and 200');

                    // Now make the field valid and see if our binding is notified.
                    var rec = session.getEntity('User', 42);
                    rec.set('description', '1234567890'); // long enough

                    scheduler.notify();

                    expect(scheduler.passes).toBe(2);
                    expect(calls).toBe(2);
                    expect(value).toBe(true);
                });

                it('should report missing last name', function () {
                    var value;
                    var calls = 0;

                    viewModel.bind('{theUser.validation.last}', function (v) {
                        value = v;
                        ++calls;
                    });

                    scheduler.notify();

                    expect(scheduler.passes).toBe(1);
                    expect(calls).toBe(1);
                    expect(value).toBe(Val.presence.config.message);

                    // Now make the field valid and see if our binding is notified.
                    var rec = session.getEntity('User', 42);
                    rec.set('last', 'Spencer'); // present

                    scheduler.notify();

                    expect(scheduler.passes).toBe(2);
                    expect(calls).toBe(2);
                    expect(value).toBe(true);
                });

                it("should have the correct bad format message", function() {
                    var value;
                    var calls = 0;

                    viewModel.bind('{theUser.validation.formatField}', function (v) {
                        value = v;
                        ++calls;
                    });

                    scheduler.notify();

                    expect(scheduler.passes).toBe(1);
                    expect(calls).toBe(1);
                    expect(value).toEqual(Val.format.config.message);

                    // Now make the field valid and see if our binding is notified.
                    var rec = session.getEntity('User', 42);
                    rec.set('formatField', '123'); // matches /123/

                    scheduler.notify();

                    expect(scheduler.passes).toBe(2);
                    expect(calls).toBe(2);
                    expect(value).toBe(true);
                });

                it("should have the correct non-inclusion message", function() {
                    var value;
                    var calls = 0;

                    viewModel.bind('{theUser.validation.color}', function (v) {
                        value = v;
                        ++calls;
                    });

                    scheduler.notify();

                    expect(scheduler.passes).toBe(1);
                    expect(calls).toBe(1);
                    expect(value).toEqual(Val.inclusion.config.message);

                    // Now make the field valid and see if our binding is notified.
                    var rec = session.getEntity('User', 42);
                    rec.set('color', 'red'); // in the color list

                    scheduler.notify();

                    expect(scheduler.passes).toBe(2);
                    expect(calls).toBe(2);
                    expect(value).toBe(true);
                });

                it("should have the correct non-exclusion message", function() {
                    var value;
                    var calls = 0;

                    viewModel.bind('{theUser.validation.first}', function (v) {
                        value = v;
                        ++calls;
                    });

                    scheduler.notify();

                    expect(scheduler.passes).toBe(1);
                    expect(calls).toBe(1);
                    expect(value).toEqual(Val.exclusion.config.message);

                    // Now make the field valid and see if our binding is notified.
                    var rec = session.getEntity('User', 42);
                    rec.set('first', 'Edward'); // not excluded

                    scheduler.notify();

                    expect(scheduler.passes).toBe(2);
                    expect(calls).toBe(2);
                    expect(value).toBe(true);
                });

                it("should have the correct bad email format message", function() {
                    var value;
                    var calls = 0;

                    viewModel.bind('{theUser.validation.email}', function (v) {
                        value = v;
                        ++calls;
                    });

                    scheduler.notify();

                    expect(scheduler.passes).toBe(1);
                    expect(calls).toBe(1);
                    expect(value).toEqual(Val.email.config.message);

                    // Now make the field valid and see if our binding is notified.
                    var rec = session.getEntity('User', 42);
                    rec.set('email', 'ed@sencha.com'); // a valid email

                    scheduler.notify();

                    expect(scheduler.passes).toBe(2);
                    expect(calls).toBe(2);
                    expect(value).toBe(true);
                });

                it("should allow user-defined error messages", function() {
                    var value;
                    var calls = 0;

                    viewModel.bind('{theUser.validation.phone}', function (v) {
                        value = v;
                        ++calls;
                    });

                    scheduler.notify();

                    expect(scheduler.passes).toBe(1);
                    expect(calls).toBe(1);
                    expect(value).toEqual('Phone number required');

                    // Now make the field valid and see if our binding is notified.
                    var rec = session.getEntity('User', 42);
                    rec.set('phone', '555-1212'); // present

                    scheduler.notify();

                    expect(scheduler.passes).toBe(2);
                    expect(calls).toBe(2);
                    expect(value).toBe(true);
                });
            }); // for invalid fields

            describe('for valid fields', function () {
                it('should report initial as valid', function () {
                    var value;
                    var calls = 0;

                    viewModel.bind('{theUser.validation.initial}', function (v) {
                        value = v;
                        ++calls;
                    });

                    scheduler.notify();

                    expect(scheduler.passes).toBe(1);
                    expect(calls).toBe(1);
                    expect(value).toBe(true);

                    // Now make the field valid and see if our binding is notified.
                    var rec = session.getEntity('User', 42);
                    rec.set('initial', ''); // too short now

                    scheduler.notify();

                    expect(scheduler.passes).toBe(2);
                    expect(calls).toBe(2);
                    expect(value).toBe('Length must be greater than 1');
                });
            });

            describe('for undeclared fields', function () {
                it('should report extraStuff as undefined', function () {
                    var value;
                    var calls = 0;

                    viewModel.bind('{theUser.validation.extraStuff}', function (v) {
                        value = v;
                        ++calls;
                    });

                    scheduler.notify();

                    var rec = session.getEntity('User', 42);

                    expect(rec.data.extraStuff).toBe(42);
                    expect(scheduler.passes).toBe(1);
                    expect(calls).toBe(1);
                    expect(value).toBe(undefined);
                });
            });
        }); // delivering validation messages
    }); // validation binding
    
    describe("multi binding", function() {
        var spy;
        beforeEach(function() {
            spy = jasmine.createSpy();
        });
        
        describe("basic static bindings", function() {
            describe("objects", function() {
                it("should bind to a simple object", function() {
                    viewModel.bind({
                        aProp: 'static'
                    }, spy);
                    notify();
                    expect(spy).toHaveBeenCalled();
                    expect(spy.mostRecentCall.args[0]).toEqual({
                        aProp: 'static'
                    });
                });
                
                it("should be able to bind to numeric values", function() {
                    viewModel.bind({
                        aProp: 1    
                    }, spy);
                    notify();
                    expect(spy).toHaveBeenCalled();
                    expect(spy.mostRecentCall.args[0]).toEqual({
                        aProp: 1
                    });
                });

                it("should be able to bind to boolean values", function() {
                    viewModel.bind({
                        aProp: true 
                    }, spy);
                    notify();
                    expect(spy).toHaveBeenCalled();
                    expect(spy.mostRecentCall.args[0]).toEqual({
                        aProp: true
                    });
                });
                
                it("should allow null values", function() {
                    viewModel.bind({
                        aProp: null 
                    }, spy);
                    notify();
                    expect(spy).toHaveBeenCalled();
                    expect(spy.mostRecentCall.args[0]).toEqual({
                        aProp: null
                    });
                });
            });
        
            describe("arrays", function() {
                it("should bind to a simple array", function() {
                    viewModel.bind(['static1', 'static2'], spy);
                    notify();
                    expect(spy).toHaveBeenCalled();
                    expect(spy.mostRecentCall.args[0]).toEqual(['static1', 'static2']);
                });
                
                it("should be able to bind to numeric values", function() {
                    viewModel.bind([1], spy);
                    notify();
                    expect(spy).toHaveBeenCalled();
                    expect(spy.mostRecentCall.args[0]).toEqual([1]);
                });

                it("should be able to bind to boolean values", function() {
                    viewModel.bind([true], spy);
                    notify();
                    expect(spy).toHaveBeenCalled();
                    expect(spy.mostRecentCall.args[0]).toEqual([true]);
                });
                
                it("should be able to bind to null values", function() {
                    viewModel.bind([null], spy);
                    notify();
                    expect(spy).toHaveBeenCalled();
                    expect(spy.mostRecentCall.args[0]).toEqual([null]);
                });
            });
        });
        
        describe("basic dynamic bindings", function() {
            describe("objects", function() {
                it("should resolve a binding for an object", function() {
                    viewModel.set('aBind', 'val');
                    viewModel.bind({
                        foo: '{aBind}'
                    }, spy);
                    notify();
                    expect(spy).toHaveBeenCalled();
                    expect(spy.mostRecentCall.args[0]).toEqual({
                        foo: 'val'
                    });
                });
                
                it("should resolve multiple bindings for an object", function() {
                    viewModel.set('aBind1', 'val1');
                    viewModel.set('aBind2', 'val2');
                    viewModel.bind({
                        foo: '{aBind1}',
                        bar: '{aBind2}'
                    }, spy);
                    notify();
                    expect(spy).toHaveBeenCalled();
                    expect(spy.mostRecentCall.args[0]).toEqual({
                        foo: 'val1',
                        bar: 'val2'
                    });
                });
            });
            
            describe("arrays", function() {
                it("should resolve a binding for an array", function() {
                    viewModel.set('aBind', 'val');
                    viewModel.bind(['{aBind}'], spy);
                    notify();
                    expect(spy).toHaveBeenCalled();
                    expect(spy.mostRecentCall.args[0]).toEqual(['val']);
                });
                
                it("should resolve multiple bindings for an array", function() {
                    viewModel.set('aBind1', 'val1');
                    viewModel.set('aBind2', 'val2');
                    viewModel.bind(['{aBind1}', '{aBind2}'], spy);
                    notify();
                    expect(spy).toHaveBeenCalled();
                    expect(spy.mostRecentCall.args[0]).toEqual(['val1', 'val2']);
                });
            });
        });
        
        describe("nested bindings", function() {
            beforeEach(function() {
                viewModel.set('aBind1', 'val1');
                viewModel.set('aBind2', 'val2');
                viewModel.set('aBind3', 'val3');
            });
            
            it("should resolve a nested object binding", function() {
                viewModel.bind({
                    bind1: '{aBind1}',
                    nest1: {
                        bind2: '{aBind2}',
                        nest2: {
                            bind3: '{aBind3}'
                        }
                    }
                }, spy);
                notify();
                expect(spy).toHaveBeenCalled();
                expect(spy.mostRecentCall.args[0]).toEqual({
                    bind1: 'val1',
                    nest1: {
                        bind2: 'val2',
                        nest2: {
                            bind3: 'val3'
                        }
                    }
                });
            });
            
            it("should resolved nested array bindings", function() {
                viewModel.bind([
                    '{aBind1}',
                    ['{aBind2}'],
                    [['{aBind3}']]
                ], spy);
                
                notify();
                expect(spy).toHaveBeenCalled();
                expect(spy.mostRecentCall.args[0]).toEqual([
                    'val1',
                    ['val2'],
                    [['val3']]
                ]);
            });
            
            it("should resolve arrays inside objects", function() {
                viewModel.bind({
                    bind1: ['{aBind1}'],
                    nest1: {
                        bind2: ['{aBind2}'],
                        nest2: {
                            bind3: ['{aBind3}']
                        }
                    }
                }, spy);
                notify();
                expect(spy).toHaveBeenCalled();
                expect(spy.mostRecentCall.args[0]).toEqual({
                    bind1: ['val1'],
                    nest1: {
                        bind2: ['val2'],
                        nest2: {
                            bind3: ['val3']
                        }
                    }
                });
            });
            
            it("should resolve objects inside arrays", function() {
                viewModel.bind([
                    {bind1: '{aBind1}'},
                    [{bind2: '{aBind2}'}],
                    [[{bind3: '{aBind3}'}]]
                ], spy);
                notify();
                expect(spy).toHaveBeenCalled();
                expect(spy.mostRecentCall.args[0]).toEqual([
                    {bind1: 'val1'},
                    [{bind2: 'val2'}],
                    [[{bind3: 'val3'}]]
                ]);
            });
        });
        
        describe("with formulas", function() {
            it("should not deliver until formulas is processed", function() {
                viewModel.setFormulas({
                    b: function(data) {
                        return data.a + 'b';
                    },
                    c: function(data) {
                        return data.b + 'c';
                    },
                    d: function(data) {
                        return data.c + 'd';
                    }
                });
                
                viewModel.set('a', 'a');
                
                viewModel.bind(['{d}', '{c}', '{b}', '{a}'], spy);
                notify();
                expect(spy).toHaveBeenCalled();
                expect(spy.mostRecentCall.args[0]).toEqual(['abcd', 'abc', 'ab', 'a']);
            });
        });
        
        describe("with async data", function() {
            function completeWithRecord(id, requestId) {
                completeWithData({
                    id: id
                }, requestId);
            }
            
            function completeWithData(data, requestId) {
                Ext.Ajax.mockComplete({
                    status: 200,
                    responseText: Ext.encode(data)
                }, requestId);
            }
            
            beforeEach(function() {
                Ext.define('spec.User', {
                    extend: 'Ext.data.Model',
                    fields: ['id', 'name']
                });
                
                Ext.define('spec.Post', {
                    extend: 'Ext.data.Model',
                    fields: ['id', 'content', {
                        name: 'userId',
                        reference: 'User'
                    }]
                });
            });
            
            afterEach(function() {
                Ext.undefine('spec.User');
                Ext.undefine('spec.Post');
            });
            
            it("should not deliver until a record is loaded", function() {
                viewModel.bind({
                    theUser: {
                        reference: 'User',
                        id: 1
                    }
                }, spy);
                notify();
                expect(spy).not.toHaveBeenCalled();
                completeWithRecord(1);
                notify();
                expect(spy).toHaveBeenCalled();
                expect(spy.mostRecentCall.args[0]).toEqual({
                    theUser: session.getEntity('User', 1)
                });
            });
            
            it("should not deliver until all records are loaded", function() {
                viewModel.bind({
                    user1: {
                        reference: 'User',
                        id: 1
                    },
                    user2: {
                        reference: 'User',
                        id: 2
                    },
                    user3: {
                        reference: 'User',
                        id: 3
                    }
                }, spy);
                notify();
                expect(spy).not.toHaveBeenCalled();
                completeWithRecord(2, 2);
                notify();
                expect(spy).not.toHaveBeenCalled();
                completeWithRecord(3, 3);
                notify();
                expect(spy).not.toHaveBeenCalled();
                completeWithRecord(1, 1);
                notify();
                expect(spy).toHaveBeenCalled();
                expect(spy.mostRecentCall.args[0]).toEqual({
                    user1: session.getEntity('User', 1),
                    user2: session.getEntity('User', 2),
                    user3: session.getEntity('User', 3)
                });
            });
            
            it("should not deliver until nested dependencies are loaded", function() {
                viewModel.bind({
                    user: {
                        reference: 'User',
                        id: 1
                    },
                    posts: {
                        reference: 'User',
                        id: 1,
                        association: 'posts'
                    }
                }, spy);
                notify();
                expect(spy).not.toHaveBeenCalled();
                completeWithRecord(1);
                notify();
                expect(spy).not.toHaveBeenCalled();
                completeWithData([{
                    id: 1
                }, {
                    id: 2
                }]);
                notify();
                expect(spy).toHaveBeenCalled();
                var args = spy.mostRecentCall.args[0];
                expect(args.user).toBe(session.getEntity('User', 1));
                expect(args.posts.isStore).toBe(true);
                expect(args.posts.getCount()).toBe(2);
            });
        });
    });
    
    describe("stores", function() {
        var User, Project;
        beforeEach(function() {
            Project = Ext.define('spec.Project', {
                extend: 'Ext.data.Model',
                fields: ['id', 'name', 'code']
            });
            
            User = Ext.define('spec.User', {
                extend: 'Ext.data.Model',
                fields: ['id', 'name', {
                    name: 'projectId',
                    reference: 'Project'
                }]
            });
        });
        
        afterEach(function() {
            Ext.undefine('spec.User');
            User = null;
        });
        
        it("should create a simple store", function() {
            viewModel.setStores({
                users: {
                    model: 'spec.User'
                }
            });
            notify();
            var users = viewModel.getStore('users');
            expect(users.isStore).toBe(true);
            expect(users.getModel()).toBe(User);
        });
        
        it("should bind multiple stores", function() {
            viewModel.setStores({
                users1: {
                    model: 'spec.User'
                },
                users2: {
                    model: 'spec.User',
                    filters: [{
                        property: 'name',
                        value: 'Foo'
                    }]
                }
            });
            notify();
            var users1 = viewModel.getStore('users1'),
                users2 = viewModel.getStore('users2');
                
            expect(users1.isStore).toBe(true);
            expect(users1.getModel()).toBe(User);
            expect(users2.isStore).toBe(true);
            expect(users2.getModel()).toBe(User);
            expect(users2.getFilters().getCount()).toBe(1);
        });
        
        it("should not attach the store to the session by default", function() {
            viewModel.setStores({
                users: {
                    model: 'spec.User'
                }
            });
            notify();
            var users = viewModel.getStore('users');
            expect(users.getSession()).toBeUndefined();
        });
        
        it("should attach to the session if we specify isolated: false", function() {
            viewModel.setStores({
                users: {
                    model: 'spec.User',
                    isolated: false
                }
            });
            notify();
            var users = viewModel.getStore('users');
            expect(users.getSession()).toBe(session);
        });
        
        it("should destroy the stores when the view model is destroyed", function() {
            viewModel.setStores({
                users1: {
                    model: 'spec.User'
                },
                users2: {
                    model: 'spec.User'
                }
            });
            notify();
            var users1 = viewModel.getStore('users1'),
                users2 = viewModel.getStore('users2');
                
            spyOn(users1, 'destroyStore');
            spyOn(users2, 'destroyStore');
            viewModel.destroy();
            expect(users1.destroyStore).toHaveBeenCalled();
            expect(users2.destroyStore).toHaveBeenCalled();
        });
        
        describe("bindings", function() {
            function completeWithRecord(id, data) {
                Ext.Ajax.mockComplete({
                    status: 200,
                    responseText: Ext.encode(Ext.apply({
                        id: id
                    }, data))
                });
            }
            
            describe("initial", function() {
                it("should not create the store until a required binding is present", function() {
                    viewModel.setStores({
                        users: {
                            model: 'spec.User',
                            proxy: {
                                type: 'ajax',
                                url: '{theUrl}'
                            }
                        }
                    });
                    notify();
                    expect(viewModel.getStore('users')).toBeNull();
                    setNotify('theUrl', '/foo');
                    var store = viewModel.getStore('users');
                    expect(store.isStore).toBe(true);
                    expect(store.getProxy().getUrl()).toBe('/foo');
                });

                it("should wait for all required bindings", function() {
                    viewModel.setStores({
                        users: {
                            model: 'spec.User',
                            proxy: {
                                type: 'ajax',
                                url: '{theUrl}',
                                extraParams: {
                                    id: '{theId}'
                                }
                            }
                        }
                    });
                    notify();
                    expect(viewModel.getStore('users')).toBeNull();
                    setNotify('theUrl', '/foo');
                    expect(viewModel.getStore('users')).toBeNull();
                    setNotify('theId', 12);
                    var store = viewModel.getStore('users');
                    expect(store.isStore).toBe(true);
                    expect(store.getProxy().getUrl()).toBe('/foo');
                    expect(store.getProxy().getExtraParams().id).toBe(12);
                });

                it("should wait for record bindings", function() {
                    viewModel.setStores({
                        users: {
                            model: 'spec.User',
                            proxy: {
                                type: 'ajax',
                                url: '/foo?code={theProject.code}'
                            }
                        }
                    });
                    notify();
                    expect(viewModel.getStore('users')).toBeNull();
                    viewModel.linkTo('theProject', {
                        reference: 'Project',
                        id: 1
                    });
                    notify();
                    expect(viewModel.getStore('users')).toBeNull();
                    completeWithRecord(1, {
                        code: 'asdf'
                    });
                    notify();
                    var store = viewModel.getStore('users');
                    expect(store.getProxy().getUrl()).toBe('/foo?code=asdf');
                });
            });
            
            describe("special bindings", function() {
                it("should be able to bind filters", function() {
                    setNotify('id', 1);
                    viewModel.setStores({
                        users: {
                            model: 'spec.User',
                            filters: [{
                                property: 'someFilter',
                                value: '{id}'
                            }]
                        }
                    });
                    notify();
                    expect(viewModel.getStore('users').getFilters().first().getValue()).toBe(1);
                });
                
                it("should be able to bind sorters", function() {
                    setNotify('someField', 'name');
                    viewModel.setStores({
                        users: {
                            model: 'spec.User',
                            sorters: [{
                                property: '{someField}',
                                direction: 'ASC'
                            }]
                        }
                    });
                    notify();
                    expect(viewModel.getStore('users').getSorters().first().getProperty()).toBe('name');
                });
                
                it("should be able to bind extraParams", function() {
                    setNotify('someParam', 'val');
                    viewModel.setStores({
                        users: {
                            model: 'spec.User',
                            proxy: {
                                type: 'ajax',
                                extraParams: {
                                    someParam: '{someParam}'
                                }
                            }
                        }
                    });
                    notify();
                    expect(viewModel.getStore('users').getProxy().getExtraParams().someParam).toBe('val');
                });
            });
            
            describe("post-creation bindings", function() {
                it("should not change the store instance", function() {
                    setNotify('remote', true);
                    viewModel.setStores({
                        users: {
                            model: 'spec.User',
                            remoteFilter: '{remote}'
                        }
                    });
                    notify();
                    var store = viewModel.getStore('users');
                    expect(store.getRemoteFilter()).toBe(true);
                    setNotify('remote', false);
                    expect(store.getRemoteFilter()).toBe(false);
                    expect(viewModel.getStore('users')).toBe(store);
                });
                
                it("should update the proxy instance", function() {
                    setNotify('theUrl', '/urlA');
                    viewModel.setStores({
                        users: {
                            model: 'spec.User',
                            proxy: {
                                type: 'ajax',
                                url: '{theUrl}'
                            }
                        }
                    });
                    notify();
                    var store = viewModel.getStore('users'),
                        proxy = viewModel.getStore('users').getProxy();
                        
                    expect(proxy.getUrl()).toBe('/urlA');
                    setNotify('theUrl', '/urlB');
                    expect(proxy.getUrl()).toBe('/urlB');
                    expect(store.getProxy()).toBe(proxy);
                });
                
                describe("filters", function() {
                    it("should update the existing filter with the new value", function() {
                        setNotify('filterVal', 1);
                        viewModel.setStores({
                            users: {
                                model: 'spec.User',
                                filters: [{
                                    property: 'id',
                                    value: '{filterVal}'
                                }]
                            }
                        });
                        notify();
                        var filters = viewModel.getStore('users').getFilters(),
                            f = filters.first();
                            
                        expect(filters.getCount()).toBe(1);
                        expect(f.getProperty()).toBe('id');
                        expect(f.getValue()).toBe(1);
                        setNotify('filterVal', 2);
                        expect(filters.getCount()).toBe(1);
                        f = filters.first();
                        expect(f.getProperty()).toBe('id');
                        expect(f.getValue()).toBe(2);
                    });
                    
                    it("should maintain existing filters", function() {
                        setNotify('filterVal', 1);
                        viewModel.setStores({
                            users: {
                                model: 'spec.User',
                                filters: [{
                                    property: 'id',
                                    value: '{filterVal}'
                                }, {
                                    property: 'name',
                                    value: 'foo'
                                }]
                            }
                        });
                        notify();
                        var filters = viewModel.getStore('users').getFilters(),
                            f = filters.first();
                            
                        expect(filters.getCount()).toBe(2);
                        expect(f.getProperty()).toBe('id');
                        expect(f.getValue()).toBe(1);
                        f = filters.last();
                        expect(f.getProperty()).toBe('name');
                        expect(f.getValue()).toBe('foo');
                        setNotify('filterVal', 2);
                        expect(filters.getCount()).toBe(2);
                        f = filters.first();
                        expect(f.getProperty()).toBe('id');
                        expect(f.getValue()).toBe(2);
                        f = filters.last();
                        expect(f.getProperty()).toBe('name');
                        expect(f.getValue()).toBe('foo');
                    });
                });
                
                describe("sorters", function() {
                    it("should update the existing sorter with the new direction", function() {
                        setNotify('sorterVal', 'ASC');
                        viewModel.setStores({
                            users: {
                                model: 'spec.User',
                                sorters: [{
                                    property: 'id',
                                    direction: '{sorterVal}'
                                }]
                            }
                        });
                        notify();
                        var sorters = viewModel.getStore('users').getSorters(),
                            s = sorters.first();
                            
                        expect(sorters.getCount()).toBe(1);
                        expect(s.getProperty()).toBe('id');
                        expect(s.getDirection()).toBe('ASC');
                        setNotify('sorterVal', 'DESC');
                        expect(sorters.getCount()).toBe(1);
                        s = sorters.first();
                        expect(s.getProperty()).toBe('id');
                        expect(s.getDirection()).toBe('DESC');
                    });
                    
                    it("should maintain existing sorters", function() {
                        setNotify('sorterVal', 'ASC');
                        viewModel.setStores({
                            users: {
                                model: 'spec.User',
                                sorters: [{
                                    property: 'id',
                                    direction: '{sorterVal}'
                                }, {
                                    property: 'name',
                                    direction: 'DESC'
                                }]
                            }
                        });
                        notify();
                        var sorters = viewModel.getStore('users').getSorters(),
                            s = sorters.first();
                            
                        expect(sorters.getCount()).toBe(2);
                        expect(s.getProperty()).toBe('id');
                        expect(s.getDirection()).toBe('ASC');
                        s = sorters.last();
                        expect(s.getProperty()).toBe('name');
                        expect(s.getDirection()).toBe('DESC');
                        setNotify('sorterVal', 'DESC');
                        expect(sorters.getCount()).toBe(2);
                        s = sorters.first();
                        expect(s.getProperty()).toBe('id');
                        expect(s.getDirection()).toBe('DESC');
                        s = sorters.last();
                        expect(s.getProperty()).toBe('name');
                        expect(s.getDirection()).toBe('DESC');
                    });
                });
            });
        });
        
        describe("chained stores", function() {
            it("should create a chained store", function() {
                viewModel.setStores({
                    parent: {
                        model: 'spec.User'
                    },
                    child: {
                        source: '{parent}'
                    }
                });
                notify();
                
                var child = viewModel.getStore('child');
                    
                expect(child instanceof Ext.data.ChainedStore).toBe(true);
            });
            
            it("should be able to set the source to an expression", function() {
                viewModel.setStores({
                    parent: {
                        model: 'spec.User'
                    },
                    child: {
                        source: '{parent}'
                    }
                });
                notify();
                
                var parent = viewModel.getStore('parent'),
                    child = viewModel.getStore('child');
                    
                expect(child.getSource()).toBe(parent);
            });
            
            it("should bind if the source is a string", function() {
                viewModel.setStores({
                    parent: {
                        model: 'spec.User'
                    },
                    child: '{parent}'
                });
                notify();
                
                var parent = viewModel.getStore('parent'),
                    child = viewModel.getStore('child');
                    
                expect(child.getSource()).toBe(parent);
            });
            
            it("should wait until the source binds", function() {
                viewModel.setStores({
                    parent: {
                        model: 'spec.User',
                        remoteSort: '{remoteSort}'
                    },
                    child: {
                        source: '{parent}'
                    }
                });
                notify();
                expect(viewModel.getStore('child')).toBeNull();
                viewModel.set('remoteSort', false);
                notify();

                var parent = viewModel.getStore('parent'),
                    child = viewModel.getStore('child');

                expect(child.getSource()).toBe(parent);
            });
        });

        describe("listeners", function() {
            var TestController = Ext.define(null, {
                extend: 'Ext.app.ViewController',
                someFn: function() {}
            });

            it("should resolve listener scope to the view controller", function() {
                var ctrl = new TestController();
                var c = new Ext.Component({
                    controller: ctrl,
                    viewModel: viewModel
                });

                viewModel.setView(c);
                viewModel.setStores({
                    test: {
                        model: 'spec.User',
                        listeners: {
                            beforeload: 'someFn'
                        }
                    }
                });
                notify();

                spyOn(ctrl, 'someFn').andReturn();
                viewModel.getStore('test').load();

                expect(ctrl.someFn).toHaveBeenCalled();

                Ext.destroy(c);
            });

            it("should resolve listener scope to the component", function() {
                var c = new Ext.Component({
                    viewModel: viewModel,
                    defaultListenerScope: true,
                    someFn: function() {}
                });

                viewModel.setView(c);
                viewModel.setStores({
                    test: {
                        model: 'spec.User',
                        listeners: {
                            beforeload: 'someFn'
                        }
                    }
                });
                notify();

                spyOn(c, 'someFn').andReturn();
                viewModel.getStore('test').load();

                expect(c.someFn).toHaveBeenCalled();

                Ext.destroy(c);
            });

            it("should be able to resolve up the hierarchy", function() {
                var ctrl = new TestController();
                var ct = new Ext.container.Container({
                    controller: ctrl,
                    items: {
                        xtype: 'container',
                        items: {
                            xtype: 'container',
                            items: {
                                xtype: 'component',
                                itemId: 'c',
                                viewModel: viewModel
                            }
                        }
                    }
                });
                viewModel.setView(ct.down('#c'));

                viewModel.setStores({
                    test: {
                        model: 'spec.User',
                        listeners: {
                            beforeload: 'someFn'
                        }
                    }
                });
                notify();

                spyOn(ctrl, 'someFn').andReturn();
                viewModel.getStore('test').load();

                expect(ctrl.someFn).toHaveBeenCalled();

                Ext.destroy(ct);
            });
        });
    });
    
    describe("formulas", function() {
        describe("configuring", function() {
            var initConfig = function(config)  { this.initConfig(config); }
            var o;

            afterEach(function() {
                o.destroy();
            });

            describe("class definition", function() {
                describe("sub classing", function() {
                    it("should inherit formulas from the superclass", function() {
                        var fn = function() {};

                        var A = Ext.define(null, {
                            extend: 'Ext.app.ViewModel',
                            constructor: initConfig,
                            formulas: {
                                foo: fn
                            }
                        });

                        var B = Ext.define(null, {
                            extend: A
                        });

                        o = new B();
                        expect(o.getFormulas().foo).toBe(fn);
                    });

                    it("should merge keys", function() {
                        var fn1 = function() {},
                            fn2 = function() {};

                        var A = Ext.define(null, {
                            extend: 'Ext.app.ViewModel',
                            constructor: initConfig,
                            formulas: {
                                foo: fn1
                            }
                        });

                        var B = Ext.define(null, {
                            extend: A,
                            formulas: {
                                bar: fn2
                            }
                        });

                        o = new B();
                        expect(o.getFormulas()).toEqual({
                            foo: fn1,
                            bar: fn2
                        });
                    });

                    it("should favour the subclass on collision", function() {
                        var fn1 = function() {},
                            fn2 = function() {};

                        var A = Ext.define(null, {
                            extend: 'Ext.app.ViewModel',
                            constructor: initConfig,
                            formulas: {
                                foo: fn1
                            }
                        });

                        var B = Ext.define(null, {
                            extend: A,
                            formulas: {
                                foo: fn2
                            }
                        });

                        o = new B();
                        expect(o.getFormulas().foo).toBe(fn2);
                    });

                    it("should not attempt to merge a function with an object definition", function() {
                        var fn = function() {};

                        var A = Ext.define(null, {
                            extend: 'Ext.app.ViewModel',
                            constructor: initConfig,
                            formulas: {
                                foo: {
                                    get: function() {},
                                    set: function() {}
                                }
                            }
                        });

                        var B = Ext.define(null, {
                            extend: A,
                            formulas: {
                                foo: fn
                            }
                        });

                        o = new B();
                        expect(o.getFormulas().foo).toBe(fn);
                    });
                });

                describe("mixin", function() {
                    afterEach(function() {
                        Ext.undefine('spec.Mixin');
                    });

                    it("should copy formulas from the mixin", function() {
                        var fn = function() {};

                        var Mix = Ext.define('spec.Mixin', {
                            config: {
                                formulas: {
                                    foo: fn
                                }
                            }
                        });

                        var B = Ext.define(null, {
                            extend: 'Ext.app.ViewModel',
                            constructor: initConfig,
                            mixins: [Mix]
                        });

                        o = new B();
                        expect(o.getFormulas().foo).toBe(fn);
                    });

                    it("should merge keys", function() {
                        var fn1 = function() {},
                            fn2 = function() {};

                        var Mix = Ext.define('spec.Mixin', {
                            config: {
                                formulas: {
                                    foo: fn1
                                }
                            }
                        });

                        var B = Ext.define(null, {
                            extend: 'Ext.app.ViewModel',
                            constructor: initConfig,
                            mixins: [Mix],
                            formulas: {
                                bar: fn2
                            }
                        });

                        o = new B();
                        expect(o.getFormulas()).toEqual({
                            foo: fn1,
                            bar: fn2
                        });
                    });

                    it("should favour the class on collision", function() {
                        var fn1 = function() {},
                            fn2 = function() {};

                        var Mix = Ext.define('spec.Mixin', {
                            config: {
                                formulas: {
                                    foo: fn1
                                }
                            }
                        });

                        var B = Ext.define(null, {
                            extend: 'Ext.app.ViewModel',
                            constructor: initConfig,
                            mixins: [Mix],
                            formulas: {
                                foo: fn2
                            }
                        });

                        o = new B();
                        expect(o.getFormulas().foo).toBe(fn2);
                    });

                    it("should not attempt to merge a function with an object definition", function() {
                        var fn = function() {};

                        var Mix = Ext.define('spec.Mixin', {
                            config: {
                                formulas: {
                                    foo: {
                                        get: function() {},
                                        set: function() {}
                                    }
                                }
                            }
                        });

                        var B = Ext.define(null, {
                            extend: 'Ext.app.ViewModel',
                            constructor: initConfig,
                            mixins: [Mix],
                            formulas: {
                                foo: fn
                            }
                        });

                        o = new B();
                        expect(o.getFormulas().foo).toBe(fn);
                    });
                });
            });

            describe("instance", function() {
                it("should inherit formulas from the class", function() {
                    var fn = function() {};

                    var A = Ext.define(null, {
                        extend: 'Ext.app.ViewModel',
                        constructor: initConfig,
                        formulas: {
                            foo: fn
                        }
                    });

                    o = new A();
                    expect(o.getFormulas().foo).toBe(fn);
                });

                it("should merge keys", function() {
                    var fn1 = function() {},
                        fn2 = function() {};

                    var A = Ext.define(null, {
                        extend: 'Ext.app.ViewModel',
                        constructor: initConfig,
                        formulas: {
                            foo: fn1
                        }
                    });

                    o = new A({
                        formulas: {
                            bar: fn2
                        }
                    });
                    expect(o.getFormulas()).toEqual({
                        foo: fn1,
                        bar: fn2
                    });
                });

                it("should favour the instance on collision", function() {
                    var fn1 = function() {},
                        fn2 = function() {};

                    var A = Ext.define(null, {
                        extend: 'Ext.app.ViewModel',
                        constructor: initConfig,
                        formulas: {
                            foo: fn1
                        }
                    });

                    o = new A({
                        formulas: {
                            foo: fn2
                        }
                    });
                    expect(o.getFormulas().foo).toBe(fn2);
                });

                it("should not attempt to merge a function with an object definition", function() {
                    var fn = function() {};

                    var A = Ext.define(null, {
                        extend: 'Ext.app.ViewModel',
                        constructor: initConfig,
                        formulas: {
                            foo: {
                                get: function() {},
                                set: function() {}
                            }
                        }
                    });

                    o = new A({
                        formulas: {
                            foo: fn
                        }
                    });
                    expect(o.getFormulas().foo).toBe(fn);
                });
            });
        });

        it("should deliver a value if it's static", function() {
            viewModel.bind('{formula1}', spy);
            viewModel.setFormulas({
                formula1: function() {
                    return 1;
                }
            });
            notify();
            expect(spy).toHaveBeenCalled();
            expect(spy.mostRecentCall.args[0]).toBe(1);
        });
        
        it("should wait until values are delivered before evaluating", function() {
            viewModel.bind('{f1}', spy);
            viewModel.setFormulas({
                f1: function(data) {
                    return data.foo + data.bar;
                }
            });
            notify();
            expect(spy).not.toHaveBeenCalled();
            setNotify('foo', 100);
            expect(spy).not.toHaveBeenCalled();
            setNotify('bar', 300);
            expect(spy).toHaveBeenCalled();
            expect(spy.mostRecentCall.args[0]).toBe(400);
        });
        
        it("should allow formulas to depend on other formulas", function() {
            viewModel.bind('{f1}', spy);
            viewModel.setFormulas({
                f1: function(data) {
                    return data.f2 + 1;
                },
                f2: function(data) {
                    return data.f3 + 1;
                },
                f3: function(data) {
                    return data.value + 1;
                }
            });
            setNotify('value', 100);
            expect(spy).toHaveBeenCalled();
            expect(spy.mostRecentCall.args[0]).toBe(103);
        });
    });
    
    describe("the scheduler", function() {
        it("should create a scheduler if there is no parent", function() {
            var newVM = new Ext.app.ViewModel();
            expect(newVM.getScheduler() instanceof Ext.util.Scheduler).toBe(true);
            newVM.destroy();
            newVM = null;
        });
        
        it("should use the scheduler of the parent VM", function() {
            var parentVM = new Ext.app.ViewModel(),
                childVM = new Ext.app.ViewModel({
                    parent: parentVM
                });
                
            expect(childVM.getScheduler()).toBe(parentVM.getScheduler());
            childVM.destroy();
            parentVM.destroy();
            parentVM = childVM = null;
        });
        
        it("should use the scheduler of the session", function() {
            var newVM = new Ext.app.ViewModel({
                session: session
            });
            expect(newVM.getScheduler()).toBe(session.getScheduler());
            newVM.destroy();
            newVM = null;
        });
    });
});
