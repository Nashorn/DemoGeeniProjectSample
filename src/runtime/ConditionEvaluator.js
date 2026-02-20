// ConditionEvaluator.js
export default class ConditionEvaluator {
  eval(expr, vars = {}) {
    return this._eval(expr, vars);
  }

  _eval(expr, vars) {
    if (!expr) return true;
    if (typeof expr === "boolean") return expr;

    // Composites
    if (expr.and) return expr.and.every((c) => this._eval(c, vars));
    if (expr.or)  return expr.or.some((c) => this._eval(c, vars));
    if (expr.not) return !this._eval(expr.not, vars);

    // Leaf
    if (expr.var) {
      const val = this._get(vars, expr.var);
      if ("eq"  in expr) return val === expr.eq;
      if ("neq" in expr) return val !== expr.neq;
      if ("gt"  in expr) return val >  expr.gt;
      if ("lt"  in expr) return val <  expr.lt;

      // new: set membership
      if ("in" in expr) {
        const set = Array.isArray(expr.in) ? expr.in : [];
        return set.includes(val);
      }

      // new: inclusive range
      if ("between" in expr) {
        const [min, max] = Array.isArray(expr.between) ? expr.between : [];
        if (min === undefined || max === undefined) return false;
        return val >= min && val <= max;
      }

      // Fallback: truthiness of the variable
      return Boolean(val);
    }

    // Unknown shape
    return false;
  }

  // Supports dot paths: "user.role"
  _get(obj, path) {
    if (!path) return undefined;

    // Support array-of-keys too: ["Session","State","user","age"]
    const parts = Array.isArray(path)
        ? path
        : String(path)
            .replace(/\[(\d+)\]/g, '.$1')  // cart.items[0] -> cart.items.0
            .split('.')
            .filter(Boolean);

    let cur = obj;
    for (const key of parts) {
        if (cur == null) return undefined;
        cur = cur[key];
    }
    return cur;
    }
}


/*

const ev = new ConditionEvaluator();
var User = {age:2};
var Cart = { items: [{ price: 50 }] }
ev.eval({
  "and": [
    {
      "var": "User.age",
      "eq": 2
    }
  ]
}, globalThis);   // false

*/