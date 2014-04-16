describe("Ext.app.bind.Formula", function() {
    var vm;
    beforeEach(function() {
        vm = new Ext.app.ViewModel({
            // this is a config not an instance so the VM knows it owns the instance
            scheduler: {
                tickDelay: 1000000
            }
        });
    });

    afterEach(function() {
        vm.destroy();
        vm = null;
        expect(Ext.util.Scheduler.instances.length).toBe(0);
    });

    function makeFormula(fn, name) {
        var o = {};
        o[name || 'fn'] = fn;
        vm.setFormulas(o);
        return vm.getRoot().children.fn.formula;
    }

    function fakeFn(s) {
        return {
            toString: function() {
                return s;
            }
        }
    }

    function matchExpr(fn, result) {
        var fake = makeFormula(Ext.emptyFn),
            expr;

        expr = fake.parseFormula({
            toString: function() {
                return fn;
            }
        });
        delete expr.$literal;
        expect(expr).toEqual(result);
    }

    // we parse out the argument name, so it should give us argName.expression.
    // here, we just want to check whether we get the name correctly
    describe("argument parsing", function() {

        it("should work with a simple function definition", function() {
            matchExpr("function (data) { return data.foo; };", ['foo']);
        });

        it("should parse a var with numbers in the name", function() {
            matchExpr("function (d2ata) { return d2ata.foo; };", ['foo']);
        });

        it("should parse a var starting with an underscore", function() {
            matchExpr("function (_data) { return _data.foo; };", ['foo']);
        });

        it("should parse a with multi vars", function() {
            matchExpr("function (data, some, other, stuff) { return data.foo; };", ['foo']);
        });

        it("should parse with no spaces between function and parens", function() {
            matchExpr("function(data) { return data.foo; };", ['foo']);
        });

        it("should parse with no spaces between parens and curly", function() {
            matchExpr("function (data){ return data.foo; };", ['foo']);
        });

        it("should parse without an ending semi colon", function() {
            matchExpr("function (data) { return data.foo; }", ['foo']);
        });

        it("should parse with leading spaces", function() {
            matchExpr("    function (data) { return data.foo; }", ['foo']);
        });

        it("should parse with trailing spaces", function() {
            matchExpr("function (data) { return data.foo; };                ", ['foo']);
        });
    });

    describe("recognizing bindings", function() {
        describe("basic bindings", function() {
            it("should parse a simple variable", function() {
                matchExpr("function (data) { return data.foo; };", ['foo']);
            });

            it("should only match a variable once", function() {
                matchExpr("function (data) { return data.foo + data.foo + data.foo; };", ['foo']);
            });

            it("should not match when the identifier has a prefix", function() {
                matchExpr("function (data) { return data.foo + thedata.bar; };", ['foo']);
            });

            it("should not match when the identifier has a suffix", function() {
                matchExpr("function (data) { return data.foo + dataextra.bar; };", ['foo']);
            });

            it("should match multiple expressions", function() {
                matchExpr("function (data) { return data.foo + data.bar + data.baz; };", ['foo', 'bar', 'baz']);
            });

            it("should match an expression with a number in it", function() {   
                matchExpr("function (data) { return data.foo1; };", ['foo1']);
            });

            it("should match an expression that starts with an underscore", function() {   
                matchExpr("function (data) { return data._foo; };", ['_foo']);
            });
        });

        describe("fields", function() {
            it("should match a field name using single quotes", function() {
                matchExpr("function (data) { return data.user.get('name'); };", ['user.name']);
            });

            it("should match a field name using double quotes", function() {
                matchExpr("function (data) { return data.user.get(\"name\"); };", ['user.name']);
            });

            it("should match a nested expression ending with a field", function() {
                matchExpr("function (data) { return data.foo.bar.baz.user.get('name'); };", ['foo.bar.baz.user.name']);
            });
        });

        describe("functions", function() {
            it("should match only the expression part", function() {
                matchExpr("function (data) { return data.foo.substring(0, 3); };", ['foo']);
            });
        });

        describe("nesting", function() {
            it("should match multiple nested subpaths", function() {
                matchExpr("function (data) { return data.foo.bar.baz.a + data.foo.bar.baz.b; };", ['foo.bar.baz.a', 'foo.bar.baz.b']);
            });

            it("should match paths at different depths", function() {
                matchExpr("function (data) { return data.foo + data.bar.baz.a.b + data.some.other.path.x.y; };", ['foo', 'bar.baz.a.b', 'some.other.path.x.y']);
            });
        })
    });
});
