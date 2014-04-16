/**
 * This class manages a formula defined for an `Ext.app.ViewModel`.
 *
 * ## Formula Basics
 *
 * Formulas in a `ViewModel` can be defined as simply as just a function:
 *
 *      formulas: {
 *          xy: function (data) { return data.x * data.y; }
 *      }
 *
 * When you need to be more explicit, "xy" can become an object. The following means the
 * same thing as above:
 *
 *      formulas: {
 *          xy: {
 *              get: function (data) { return data.x * data.y; }
 *          }
 *      }
 *
 * ### Data Dependencies
 *
 * One of the important aspects of a `ViewModel` is notification of change. In order to
 * manage this, a `ViewModel` *must* know the dependencies between data. In the above case
 * this is accomplished by **parsing the text of the function**. While this is convenient
 * and reduces the maintenance/risk that would come from explicitly listing dependencies
 * separately, there are some rules to be aware of:
 *
 *   * All uses of data in the `ViewModel` must be a "dot path" starting with the
 *     object passed as the first argument.
 *   * Method calls are recognized and eliminated from the "dot path".
 *   * if you need to use these values in other ways, cache them as a `var` (following
 *     the first rule to capture the value) and use that `var`.
 *
 * In the above formulas, the "xy" formula depends on "x" and "y" in the `ViewModel`. As
 * these values change, the formula is called to produce the correct value for "xy". This
 * in turn can be used by other formulas. For example:
 *
 *      formulas: {
 *          xy: function (data) {  // "data" is arbitrary but a good convention
 *              return data.x * data.y;
 *          },
 *
 *          xyz: function (data) {
 *              return data.xy * data.z;
 *          }
 *      }
 *
 * In the above, "xyz" depends on "xy" and "z" values in the `ViewModel`.
 *
 * ### Using Methods
 *
 * When method calls are used, they are removed from the name. For example:
 *
 *      formulas: {
 *          foo: function (data) {
 *              return data.text.substring(2);
 *          }
 *      }
 *
 * In the above, "foo" depends on the "text" property (not "text.substring"). There is
 * one exception to the understanding of method calls when the method name is "get". This
 * is to accommodate classes like `Ext.data.Model`. For example:
 *
 *      formulas: {
 *          bar: function (data) {
 *              return data.record.get('bar');
 *          }
 *      }
 *
 * The above "bar" formula depends on the "bar" field of the "record" property in the
 * `ViewModel`. This works whether "record" is in fact an `Ext.data.Model` instance with
 * a "bar" `Ext.data.field.Field` or a simple object like "record: { bar: 'value' }".
 *
 * ### Capturing Values
 *
 * If values need to be used repeatedly, you can use a `var` as long as the Rules are not
 * broken.
 *
 *      formulas: {
 *          x2y2: function (data) {
 *              // These are still "visible" as "data.x" and "data.y" so this is OK:
 *              var x = data.x,
 *                  y = data.y;
 *
 *              return x * x * y * y;
 *          }
 *      }
 *
 * ### Null References and Deep Paths
 *
 * When using objects (as opposed to simple values) from the `ViewModel`, the possibility
 * of `null` making an appearance must be taken into account. Consider:
 *
 *      formulas: {
 *          zip2: function (data) {
 *              return data.foo.bar.zip * 2;
 *          }
 *      }
 *
 * This follows the Rules and "foo.bar.zip" is picked up as the dependency for the formula.
 * But there is a problem if "data.foo" or "data.foo.bar" produces `null` or `undefined`.
 * To follow the Rules and guard for this possibility at the same time the formula can use
 * its second argument: "untracked".
 *
 * The second argument to a `get` method has the same value as the first ("data") but is
 * *not* picked up by the function parser and so references to data using the "untracked"
 * parameter are not considered dependencies. For example:
 *
 *      formulas: {
 *          zip2: function (data, untracked) {
 *              return untracked.foo && untracked.foo.bar && (data.foo.bar.zip * 2);
 *          }
 *      }
 *
 * In the above case, the only dependency for "zip2" is "foo.bar.zip" but it also won't
 * thrown an error should the object traversal hit `null` or `undefined`.
 *
 * ## Explicit Binding
 *
 * While function parsing is convenient, there are times it is not the best solution. In
 * these cases, an explicit `bind` can be given. To revisit the previous example with an
 * explicit binding:
 *
 *      formulas: {
 *          zip: {
 *              bind: '{foo.bar.zip}',
 *
 *              get: function (data) {
 *                  // NOTE: the only thing we get is what our bind produces.
 *                  return data * 2;
 *              }
 *          }
 *      }
 *
 * In this case we have given the formula an explicit `bind` value so it will no longer
 * parse the `get` function. Instead, it will call `{@link Ext.app.ViewModel#bind}` with
 * the value of the `bind` property and pass the produced value to `get` whenever it
 * changes.
 *
 * ## Settable Formulas
 *
 * When a formula is "reversible" it can be given a `set` method to allow it to participate
 * in two-way binding. For example:
 *
 *      formulas: {
 *             fullName: {
 *                 get: function (data) {
 *                     var ret = data.firstName || '';
 *
 *                     if (data.lastName) {
 *                         ret += ' ' +  data.lastName;
 *                     }
 *
 *                     return ret;
 *                 },
 *
 *                 set: function (value) {
 *                     var space = value.indexOf(' '),
 *                         split = (space < 0) ? value.length : space;
 *
 *                     this.set({
 *                         firstName: value.substring(0, split),
 *                         lastName: value.substring(split + 1)
 *                     });
 *                 }
 *             }
 *         }
 *
 * When the `set` method is called the `this` reference is the `Ext.app.ViewModel` so it
 * just calls its `{@link Ext.app.ViewModel#method-set set method}`.
 *
 * ## Single Run Formulas
 *
 * If a formula only needs to produce an initial valud, it can be marked as `single`.
 *
 *      formulas: {
 *          xy: {
 *              single: true,
 *
 *              get: function (data) {
 *                  return data.x * data.y;
 *              }
 *          }
 *      }
 *
 * This formula's `get` method will be called with `x` and `y` once and then its binding
 * to these properties will be destroyed. This means the `get` method (and hence the value
 * of `xy`
 */
Ext.define('Ext.app.bind.Formula', {
    extend: 'Ext.util.Schedulable',

    isFormula: true,

    calculation: null,

    explicit: false,

    /**
     * @cfg {Object} [bind]
     * An explicit bind request to produce data to provide the `get` function. If this is
     * specified, the result of this bind is the first argument to `get`. If not given,
     * then `get` receives the ViewModel's entire `data` object. For details on what can
     * be specified for this property see `{@link Ext.app.ViewModel#bind}`.
     * @since 5.0.0
     */

    /**
     * @cfg {Function} get
     * The function to call to calculate the formula's value. The `get` method executes
     * with a `this` pointer of the `ViewModel` and receives the `data` object of the
     * `ViewModel` or the result of a configured `bind`.
     * @since 5.0.0
     */

    /**
     * @cfg {Function} [set]
     * If provided this method allows a formula to be set. This method is typically called
     * when `{@link Ext.data.session.Binding#setValue}` is called. The `set` method executes
     * with a `this` pointer of the `ViewModel`. Whatever values need to be updated can
     * be set by calling `{@link Ext.app.ViewModel#set}`.
     * @since 5.0.0
     */
    set: null,

    /**
     * @cfg {Boolean} [single=false]
     * This option instructs the binding to call its `destroy` method immediately after
     * delivering the initial value.
     * @since 5.0.0
     */
    single: false,

    argumentNamesRe: /^function\s*\(\s*([^,\)\s]+)/,
    formulaRe: /[^\.a-z0-9_]([a-z_][a-z_0-9]*)((?:\.[a-z_][a-z_0-9]*)+)(?:[(](?:['"]([a-z_][a-z_0-9]*)['"][)])?)?/gi,
    //          non-identChars rootIdentifier          (.name)+                       ( ('name') )?

    constructor: function (stub, formula) {
        var me = this,
            owner = stub.owner,
            bindTo, expressions, getter, options;

        me.owner = owner;
        me.stub = stub;

        me.callParent();

        if (formula instanceof Function) {
            me.get = getter = formula;
        } else {
            me.get = getter = formula.get;
            me.set = formula.set;
            expressions = formula.bind;

            if (formula.single) {
                me.single = formula.single;
            }

            if (expressions) {
                bindTo = expressions.bindTo;

                if (bindTo) {
                    options = Ext.apply({}, expressions);
                    delete options.bindTo;
                    expressions = bindTo;
                }
            }
        }

        //<debug>
        if (!getter) {
            Ext.Error.raise('Must specify a getter method for a formula');
        }
        //</debug>

        if (expressions) {
            me.explicit = true;
        } else {
            expressions = getter.$expressions || me.parseFormula(getter);
        }

        me.binding = owner.bind(expressions, me.onChange, me, options);
    },

    destroy: function () {
        var me = this,
            binding = me.binding,
            stub = me.stub;

        if (binding) {
            binding.destroy();
            me.binding = null;
        }

        if (stub) {
            stub.formula = null;
        }

        me.callParent();

        // Save for last because this is used to remove us from the Scheduler
        me.owner = null;
    },

    getScheduler: function () {
        var owner = this.owner;
        return owner && owner.getScheduler();
    },

    getFullName: function () {
        return this.fullName ||
              (this.fullName = this.stub.getFullName() + '=' + this.callParent() + ')');
    },

    getRawValue: function () {
        return this.calculation;
    },

    onChange: function () {
        if (!this.scheduled) {
            this.schedule();
        }
    },

    parseFormula: function (formula) {
        var expressions = [],
            formulaRe = this.formulaRe,
            str = formula.toString(),
            map = {},
            dataProp, dot, field, full, match, subexpr;

        match = this.argumentNamesRe.exec(str);
        dataProp = match ? match[1] : 'data';

        while ((match = formulaRe.exec(str))) {
            full = match[0];
            if (match[1] !== dataProp) {
                // Since we look for a non-ident char before the match, a non-match
                // may have ended that way, so backup one...
                --formulaRe.lastIndex;
                continue;
            }

            subexpr = match[2].substring(1);
            field = match[3];
            if (field) {
                // If we have subexpr = "foo.bar.get('fld')" we want to transform the bind
                // expression to be "foo.bar.fld".
                //
                dot = subexpr.lastIndexOf('.');

                //<debug>
                if (subexpr.substring(dot) !== '.get') {
                    Ext.Error.raise('Unrecognized expression in formula: ' + subexpr);
                }
                //</debug>

                subexpr = subexpr.substring(0, dot + 1) + field;
            } else if (full.charAt(full.length - 1) === '(') {
                // If we have subexpr = "foo.bar.substring(" we want to transform the bind
                // expression to be "foo.bar".
                //
                dot = subexpr.lastIndexOf('.');
                subexpr = subexpr.substring(0, dot);
            }

            if (!map[subexpr]) {
                expressions.push(subexpr);
                map[subexpr] = 1;
            }
        }

        expressions.$literal = true;

        // We store the parse results on the function object because we might reuse the
        // formula function (typically when a ViewModel class is created a 2nd+ time).
        formula.$expressions = expressions;

        return expressions;
    },

    react: function () {
        var me = this,
            owner = me.owner,
            data = me.explicit ? me.binding.lastValue : owner.data;

        me.settingValue = true;
        me.stub.set(me.calculation = me.get.call(owner, data, data));
        me.settingValue = false;

        if (me.single) {
            me.destroy();
        }
    },

    sort: function () {
        var me = this,
            binding = me.binding;

        // Our binding may be single:true
        if (!binding.destroyed) {
            me.scheduler.sortItem(binding);
        }

        // Schedulable#sort === emptyFn
        //me.callParent();
    }
});
