"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e2) {
        reject(e2);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e2) {
        reject(e2);
      }
    };
    var step = (x2) => x2.done ? resolve(x2.value) : Promise.resolve(x2.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// ../../node_modules/react-is/cjs/react-is.production.min.js
var require_react_is_production_min = __commonJS({
  "../../node_modules/react-is/cjs/react-is.production.min.js"(exports) {
    "use strict";
    var b2 = "function" === typeof Symbol && Symbol.for;
    var c2 = b2 ? Symbol.for("react.element") : 60103;
    var d = b2 ? Symbol.for("react.portal") : 60106;
    var e2 = b2 ? Symbol.for("react.fragment") : 60107;
    var f2 = b2 ? Symbol.for("react.strict_mode") : 60108;
    var g2 = b2 ? Symbol.for("react.profiler") : 60114;
    var h = b2 ? Symbol.for("react.provider") : 60109;
    var k2 = b2 ? Symbol.for("react.context") : 60110;
    var l2 = b2 ? Symbol.for("react.async_mode") : 60111;
    var m2 = b2 ? Symbol.for("react.concurrent_mode") : 60111;
    var n2 = b2 ? Symbol.for("react.forward_ref") : 60112;
    var p = b2 ? Symbol.for("react.suspense") : 60113;
    var q2 = b2 ? Symbol.for("react.suspense_list") : 60120;
    var r2 = b2 ? Symbol.for("react.memo") : 60115;
    var t2 = b2 ? Symbol.for("react.lazy") : 60116;
    var v2 = b2 ? Symbol.for("react.block") : 60121;
    var w2 = b2 ? Symbol.for("react.fundamental") : 60117;
    var x2 = b2 ? Symbol.for("react.responder") : 60118;
    var y2 = b2 ? Symbol.for("react.scope") : 60119;
    function z2(a2) {
      if ("object" === typeof a2 && null !== a2) {
        var u2 = a2.$$typeof;
        switch (u2) {
          case c2:
            switch (a2 = a2.type, a2) {
              case l2:
              case m2:
              case e2:
              case g2:
              case f2:
              case p:
                return a2;
              default:
                switch (a2 = a2 && a2.$$typeof, a2) {
                  case k2:
                  case n2:
                  case t2:
                  case r2:
                  case h:
                    return a2;
                  default:
                    return u2;
                }
            }
          case d:
            return u2;
        }
      }
    }
    function A2(a2) {
      return z2(a2) === m2;
    }
    exports.AsyncMode = l2;
    exports.ConcurrentMode = m2;
    exports.ContextConsumer = k2;
    exports.ContextProvider = h;
    exports.Element = c2;
    exports.ForwardRef = n2;
    exports.Fragment = e2;
    exports.Lazy = t2;
    exports.Memo = r2;
    exports.Portal = d;
    exports.Profiler = g2;
    exports.StrictMode = f2;
    exports.Suspense = p;
    exports.isAsyncMode = function(a2) {
      return A2(a2) || z2(a2) === l2;
    };
    exports.isConcurrentMode = A2;
    exports.isContextConsumer = function(a2) {
      return z2(a2) === k2;
    };
    exports.isContextProvider = function(a2) {
      return z2(a2) === h;
    };
    exports.isElement = function(a2) {
      return "object" === typeof a2 && null !== a2 && a2.$$typeof === c2;
    };
    exports.isForwardRef = function(a2) {
      return z2(a2) === n2;
    };
    exports.isFragment = function(a2) {
      return z2(a2) === e2;
    };
    exports.isLazy = function(a2) {
      return z2(a2) === t2;
    };
    exports.isMemo = function(a2) {
      return z2(a2) === r2;
    };
    exports.isPortal = function(a2) {
      return z2(a2) === d;
    };
    exports.isProfiler = function(a2) {
      return z2(a2) === g2;
    };
    exports.isStrictMode = function(a2) {
      return z2(a2) === f2;
    };
    exports.isSuspense = function(a2) {
      return z2(a2) === p;
    };
    exports.isValidElementType = function(a2) {
      return "string" === typeof a2 || "function" === typeof a2 || a2 === e2 || a2 === m2 || a2 === g2 || a2 === f2 || a2 === p || a2 === q2 || "object" === typeof a2 && null !== a2 && (a2.$$typeof === t2 || a2.$$typeof === r2 || a2.$$typeof === h || a2.$$typeof === k2 || a2.$$typeof === n2 || a2.$$typeof === w2 || a2.$$typeof === x2 || a2.$$typeof === y2 || a2.$$typeof === v2);
    };
    exports.typeOf = z2;
  }
});

// ../../node_modules/react-is/cjs/react-is.development.js
var require_react_is_development = __commonJS({
  "../../node_modules/react-is/cjs/react-is.development.js"(exports) {
    "use strict";
    if (process.env.NODE_ENV !== "production") {
      (function() {
        "use strict";
        var hasSymbol = typeof Symbol === "function" && Symbol.for;
        var REACT_ELEMENT_TYPE = hasSymbol ? Symbol.for("react.element") : 60103;
        var REACT_PORTAL_TYPE = hasSymbol ? Symbol.for("react.portal") : 60106;
        var REACT_FRAGMENT_TYPE = hasSymbol ? Symbol.for("react.fragment") : 60107;
        var REACT_STRICT_MODE_TYPE = hasSymbol ? Symbol.for("react.strict_mode") : 60108;
        var REACT_PROFILER_TYPE = hasSymbol ? Symbol.for("react.profiler") : 60114;
        var REACT_PROVIDER_TYPE = hasSymbol ? Symbol.for("react.provider") : 60109;
        var REACT_CONTEXT_TYPE = hasSymbol ? Symbol.for("react.context") : 60110;
        var REACT_ASYNC_MODE_TYPE = hasSymbol ? Symbol.for("react.async_mode") : 60111;
        var REACT_CONCURRENT_MODE_TYPE = hasSymbol ? Symbol.for("react.concurrent_mode") : 60111;
        var REACT_FORWARD_REF_TYPE = hasSymbol ? Symbol.for("react.forward_ref") : 60112;
        var REACT_SUSPENSE_TYPE = hasSymbol ? Symbol.for("react.suspense") : 60113;
        var REACT_SUSPENSE_LIST_TYPE = hasSymbol ? Symbol.for("react.suspense_list") : 60120;
        var REACT_MEMO_TYPE = hasSymbol ? Symbol.for("react.memo") : 60115;
        var REACT_LAZY_TYPE = hasSymbol ? Symbol.for("react.lazy") : 60116;
        var REACT_BLOCK_TYPE = hasSymbol ? Symbol.for("react.block") : 60121;
        var REACT_FUNDAMENTAL_TYPE = hasSymbol ? Symbol.for("react.fundamental") : 60117;
        var REACT_RESPONDER_TYPE = hasSymbol ? Symbol.for("react.responder") : 60118;
        var REACT_SCOPE_TYPE = hasSymbol ? Symbol.for("react.scope") : 60119;
        function isValidElementType(type) {
          return typeof type === "string" || typeof type === "function" || // Note: its typeof might be other than 'symbol' or 'number' if it's a polyfill.
          type === REACT_FRAGMENT_TYPE || type === REACT_CONCURRENT_MODE_TYPE || type === REACT_PROFILER_TYPE || type === REACT_STRICT_MODE_TYPE || type === REACT_SUSPENSE_TYPE || type === REACT_SUSPENSE_LIST_TYPE || typeof type === "object" && type !== null && (type.$$typeof === REACT_LAZY_TYPE || type.$$typeof === REACT_MEMO_TYPE || type.$$typeof === REACT_PROVIDER_TYPE || type.$$typeof === REACT_CONTEXT_TYPE || type.$$typeof === REACT_FORWARD_REF_TYPE || type.$$typeof === REACT_FUNDAMENTAL_TYPE || type.$$typeof === REACT_RESPONDER_TYPE || type.$$typeof === REACT_SCOPE_TYPE || type.$$typeof === REACT_BLOCK_TYPE);
        }
        function typeOf(object) {
          if (typeof object === "object" && object !== null) {
            var $$typeof = object.$$typeof;
            switch ($$typeof) {
              case REACT_ELEMENT_TYPE:
                var type = object.type;
                switch (type) {
                  case REACT_ASYNC_MODE_TYPE:
                  case REACT_CONCURRENT_MODE_TYPE:
                  case REACT_FRAGMENT_TYPE:
                  case REACT_PROFILER_TYPE:
                  case REACT_STRICT_MODE_TYPE:
                  case REACT_SUSPENSE_TYPE:
                    return type;
                  default:
                    var $$typeofType = type && type.$$typeof;
                    switch ($$typeofType) {
                      case REACT_CONTEXT_TYPE:
                      case REACT_FORWARD_REF_TYPE:
                      case REACT_LAZY_TYPE:
                      case REACT_MEMO_TYPE:
                      case REACT_PROVIDER_TYPE:
                        return $$typeofType;
                      default:
                        return $$typeof;
                    }
                }
              case REACT_PORTAL_TYPE:
                return $$typeof;
            }
          }
          return void 0;
        }
        var AsyncMode = REACT_ASYNC_MODE_TYPE;
        var ConcurrentMode = REACT_CONCURRENT_MODE_TYPE;
        var ContextConsumer = REACT_CONTEXT_TYPE;
        var ContextProvider = REACT_PROVIDER_TYPE;
        var Element = REACT_ELEMENT_TYPE;
        var ForwardRef = REACT_FORWARD_REF_TYPE;
        var Fragment = REACT_FRAGMENT_TYPE;
        var Lazy = REACT_LAZY_TYPE;
        var Memo = REACT_MEMO_TYPE;
        var Portal = REACT_PORTAL_TYPE;
        var Profiler = REACT_PROFILER_TYPE;
        var StrictMode = REACT_STRICT_MODE_TYPE;
        var Suspense = REACT_SUSPENSE_TYPE;
        var hasWarnedAboutDeprecatedIsAsyncMode = false;
        function isAsyncMode(object) {
          {
            if (!hasWarnedAboutDeprecatedIsAsyncMode) {
              hasWarnedAboutDeprecatedIsAsyncMode = true;
              console["warn"]("The ReactIs.isAsyncMode() alias has been deprecated, and will be removed in React 17+. Update your code to use ReactIs.isConcurrentMode() instead. It has the exact same API.");
            }
          }
          return isConcurrentMode(object) || typeOf(object) === REACT_ASYNC_MODE_TYPE;
        }
        function isConcurrentMode(object) {
          return typeOf(object) === REACT_CONCURRENT_MODE_TYPE;
        }
        function isContextConsumer(object) {
          return typeOf(object) === REACT_CONTEXT_TYPE;
        }
        function isContextProvider(object) {
          return typeOf(object) === REACT_PROVIDER_TYPE;
        }
        function isElement(object) {
          return typeof object === "object" && object !== null && object.$$typeof === REACT_ELEMENT_TYPE;
        }
        function isForwardRef(object) {
          return typeOf(object) === REACT_FORWARD_REF_TYPE;
        }
        function isFragment(object) {
          return typeOf(object) === REACT_FRAGMENT_TYPE;
        }
        function isLazy(object) {
          return typeOf(object) === REACT_LAZY_TYPE;
        }
        function isMemo(object) {
          return typeOf(object) === REACT_MEMO_TYPE;
        }
        function isPortal(object) {
          return typeOf(object) === REACT_PORTAL_TYPE;
        }
        function isProfiler(object) {
          return typeOf(object) === REACT_PROFILER_TYPE;
        }
        function isStrictMode(object) {
          return typeOf(object) === REACT_STRICT_MODE_TYPE;
        }
        function isSuspense(object) {
          return typeOf(object) === REACT_SUSPENSE_TYPE;
        }
        exports.AsyncMode = AsyncMode;
        exports.ConcurrentMode = ConcurrentMode;
        exports.ContextConsumer = ContextConsumer;
        exports.ContextProvider = ContextProvider;
        exports.Element = Element;
        exports.ForwardRef = ForwardRef;
        exports.Fragment = Fragment;
        exports.Lazy = Lazy;
        exports.Memo = Memo;
        exports.Portal = Portal;
        exports.Profiler = Profiler;
        exports.StrictMode = StrictMode;
        exports.Suspense = Suspense;
        exports.isAsyncMode = isAsyncMode;
        exports.isConcurrentMode = isConcurrentMode;
        exports.isContextConsumer = isContextConsumer;
        exports.isContextProvider = isContextProvider;
        exports.isElement = isElement;
        exports.isForwardRef = isForwardRef;
        exports.isFragment = isFragment;
        exports.isLazy = isLazy;
        exports.isMemo = isMemo;
        exports.isPortal = isPortal;
        exports.isProfiler = isProfiler;
        exports.isStrictMode = isStrictMode;
        exports.isSuspense = isSuspense;
        exports.isValidElementType = isValidElementType;
        exports.typeOf = typeOf;
      })();
    }
  }
});

// ../../node_modules/react-is/index.js
var require_react_is = __commonJS({
  "../../node_modules/react-is/index.js"(exports, module2) {
    "use strict";
    if (process.env.NODE_ENV === "production") {
      module2.exports = require_react_is_production_min();
    } else {
      module2.exports = require_react_is_development();
    }
  }
});

// ../../node_modules/react/cjs/react.production.min.js
var require_react_production_min = __commonJS({
  "../../node_modules/react/cjs/react.production.min.js"(exports) {
    "use strict";
    var l2 = Symbol.for("react.element");
    var n2 = Symbol.for("react.portal");
    var p = Symbol.for("react.fragment");
    var q2 = Symbol.for("react.strict_mode");
    var r2 = Symbol.for("react.profiler");
    var t2 = Symbol.for("react.provider");
    var u2 = Symbol.for("react.context");
    var v2 = Symbol.for("react.forward_ref");
    var w2 = Symbol.for("react.suspense");
    var x2 = Symbol.for("react.memo");
    var y2 = Symbol.for("react.lazy");
    var z2 = Symbol.iterator;
    function A2(a2) {
      if (null === a2 || "object" !== typeof a2)
        return null;
      a2 = z2 && a2[z2] || a2["@@iterator"];
      return "function" === typeof a2 ? a2 : null;
    }
    var B2 = { isMounted: function() {
      return false;
    }, enqueueForceUpdate: function() {
    }, enqueueReplaceState: function() {
    }, enqueueSetState: function() {
    } };
    var C2 = Object.assign;
    var D2 = {};
    function E2(a2, b2, e2) {
      this.props = a2;
      this.context = b2;
      this.refs = D2;
      this.updater = e2 || B2;
    }
    E2.prototype.isReactComponent = {};
    E2.prototype.setState = function(a2, b2) {
      if ("object" !== typeof a2 && "function" !== typeof a2 && null != a2)
        throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
      this.updater.enqueueSetState(this, a2, b2, "setState");
    };
    E2.prototype.forceUpdate = function(a2) {
      this.updater.enqueueForceUpdate(this, a2, "forceUpdate");
    };
    function F2() {
    }
    F2.prototype = E2.prototype;
    function G2(a2, b2, e2) {
      this.props = a2;
      this.context = b2;
      this.refs = D2;
      this.updater = e2 || B2;
    }
    var H2 = G2.prototype = new F2();
    H2.constructor = G2;
    C2(H2, E2.prototype);
    H2.isPureReactComponent = true;
    var I2 = Array.isArray;
    var J2 = Object.prototype.hasOwnProperty;
    var K2 = { current: null };
    var L2 = { key: true, ref: true, __self: true, __source: true };
    function M2(a2, b2, e2) {
      var d, c2 = {}, k2 = null, h = null;
      if (null != b2)
        for (d in void 0 !== b2.ref && (h = b2.ref), void 0 !== b2.key && (k2 = "" + b2.key), b2)
          J2.call(b2, d) && !L2.hasOwnProperty(d) && (c2[d] = b2[d]);
      var g2 = arguments.length - 2;
      if (1 === g2)
        c2.children = e2;
      else if (1 < g2) {
        for (var f2 = Array(g2), m2 = 0; m2 < g2; m2++)
          f2[m2] = arguments[m2 + 2];
        c2.children = f2;
      }
      if (a2 && a2.defaultProps)
        for (d in g2 = a2.defaultProps, g2)
          void 0 === c2[d] && (c2[d] = g2[d]);
      return { $$typeof: l2, type: a2, key: k2, ref: h, props: c2, _owner: K2.current };
    }
    function N2(a2, b2) {
      return { $$typeof: l2, type: a2.type, key: b2, ref: a2.ref, props: a2.props, _owner: a2._owner };
    }
    function O2(a2) {
      return "object" === typeof a2 && null !== a2 && a2.$$typeof === l2;
    }
    function escape(a2) {
      var b2 = { "=": "=0", ":": "=2" };
      return "$" + a2.replace(/[=:]/g, function(a3) {
        return b2[a3];
      });
    }
    var P2 = /\/+/g;
    function Q2(a2, b2) {
      return "object" === typeof a2 && null !== a2 && null != a2.key ? escape("" + a2.key) : b2.toString(36);
    }
    function R2(a2, b2, e2, d, c2) {
      var k2 = typeof a2;
      if ("undefined" === k2 || "boolean" === k2)
        a2 = null;
      var h = false;
      if (null === a2)
        h = true;
      else
        switch (k2) {
          case "string":
          case "number":
            h = true;
            break;
          case "object":
            switch (a2.$$typeof) {
              case l2:
              case n2:
                h = true;
            }
        }
      if (h)
        return h = a2, c2 = c2(h), a2 = "" === d ? "." + Q2(h, 0) : d, I2(c2) ? (e2 = "", null != a2 && (e2 = a2.replace(P2, "$&/") + "/"), R2(c2, b2, e2, "", function(a3) {
          return a3;
        })) : null != c2 && (O2(c2) && (c2 = N2(c2, e2 + (!c2.key || h && h.key === c2.key ? "" : ("" + c2.key).replace(P2, "$&/") + "/") + a2)), b2.push(c2)), 1;
      h = 0;
      d = "" === d ? "." : d + ":";
      if (I2(a2))
        for (var g2 = 0; g2 < a2.length; g2++) {
          k2 = a2[g2];
          var f2 = d + Q2(k2, g2);
          h += R2(k2, b2, e2, f2, c2);
        }
      else if (f2 = A2(a2), "function" === typeof f2)
        for (a2 = f2.call(a2), g2 = 0; !(k2 = a2.next()).done; )
          k2 = k2.value, f2 = d + Q2(k2, g2++), h += R2(k2, b2, e2, f2, c2);
      else if ("object" === k2)
        throw b2 = String(a2), Error("Objects are not valid as a React child (found: " + ("[object Object]" === b2 ? "object with keys {" + Object.keys(a2).join(", ") + "}" : b2) + "). If you meant to render a collection of children, use an array instead.");
      return h;
    }
    function S2(a2, b2, e2) {
      if (null == a2)
        return a2;
      var d = [], c2 = 0;
      R2(a2, d, "", "", function(a3) {
        return b2.call(e2, a3, c2++);
      });
      return d;
    }
    function T2(a2) {
      if (-1 === a2._status) {
        var b2 = a2._result;
        b2 = b2();
        b2.then(function(b3) {
          if (0 === a2._status || -1 === a2._status)
            a2._status = 1, a2._result = b3;
        }, function(b3) {
          if (0 === a2._status || -1 === a2._status)
            a2._status = 2, a2._result = b3;
        });
        -1 === a2._status && (a2._status = 0, a2._result = b2);
      }
      if (1 === a2._status)
        return a2._result.default;
      throw a2._result;
    }
    var U2 = { current: null };
    var V2 = { transition: null };
    var W2 = { ReactCurrentDispatcher: U2, ReactCurrentBatchConfig: V2, ReactCurrentOwner: K2 };
    exports.Children = { map: S2, forEach: function(a2, b2, e2) {
      S2(a2, function() {
        b2.apply(this, arguments);
      }, e2);
    }, count: function(a2) {
      var b2 = 0;
      S2(a2, function() {
        b2++;
      });
      return b2;
    }, toArray: function(a2) {
      return S2(a2, function(a3) {
        return a3;
      }) || [];
    }, only: function(a2) {
      if (!O2(a2))
        throw Error("React.Children.only expected to receive a single React element child.");
      return a2;
    } };
    exports.Component = E2;
    exports.Fragment = p;
    exports.Profiler = r2;
    exports.PureComponent = G2;
    exports.StrictMode = q2;
    exports.Suspense = w2;
    exports.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = W2;
    exports.cloneElement = function(a2, b2, e2) {
      if (null === a2 || void 0 === a2)
        throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + a2 + ".");
      var d = C2({}, a2.props), c2 = a2.key, k2 = a2.ref, h = a2._owner;
      if (null != b2) {
        void 0 !== b2.ref && (k2 = b2.ref, h = K2.current);
        void 0 !== b2.key && (c2 = "" + b2.key);
        if (a2.type && a2.type.defaultProps)
          var g2 = a2.type.defaultProps;
        for (f2 in b2)
          J2.call(b2, f2) && !L2.hasOwnProperty(f2) && (d[f2] = void 0 === b2[f2] && void 0 !== g2 ? g2[f2] : b2[f2]);
      }
      var f2 = arguments.length - 2;
      if (1 === f2)
        d.children = e2;
      else if (1 < f2) {
        g2 = Array(f2);
        for (var m2 = 0; m2 < f2; m2++)
          g2[m2] = arguments[m2 + 2];
        d.children = g2;
      }
      return { $$typeof: l2, type: a2.type, key: c2, ref: k2, props: d, _owner: h };
    };
    exports.createContext = function(a2) {
      a2 = { $$typeof: u2, _currentValue: a2, _currentValue2: a2, _threadCount: 0, Provider: null, Consumer: null, _defaultValue: null, _globalName: null };
      a2.Provider = { $$typeof: t2, _context: a2 };
      return a2.Consumer = a2;
    };
    exports.createElement = M2;
    exports.createFactory = function(a2) {
      var b2 = M2.bind(null, a2);
      b2.type = a2;
      return b2;
    };
    exports.createRef = function() {
      return { current: null };
    };
    exports.forwardRef = function(a2) {
      return { $$typeof: v2, render: a2 };
    };
    exports.isValidElement = O2;
    exports.lazy = function(a2) {
      return { $$typeof: y2, _payload: { _status: -1, _result: a2 }, _init: T2 };
    };
    exports.memo = function(a2, b2) {
      return { $$typeof: x2, type: a2, compare: void 0 === b2 ? null : b2 };
    };
    exports.startTransition = function(a2) {
      var b2 = V2.transition;
      V2.transition = {};
      try {
        a2();
      } finally {
        V2.transition = b2;
      }
    };
    exports.unstable_act = function() {
      throw Error("act(...) is not supported in production builds of React.");
    };
    exports.useCallback = function(a2, b2) {
      return U2.current.useCallback(a2, b2);
    };
    exports.useContext = function(a2) {
      return U2.current.useContext(a2);
    };
    exports.useDebugValue = function() {
    };
    exports.useDeferredValue = function(a2) {
      return U2.current.useDeferredValue(a2);
    };
    exports.useEffect = function(a2, b2) {
      return U2.current.useEffect(a2, b2);
    };
    exports.useId = function() {
      return U2.current.useId();
    };
    exports.useImperativeHandle = function(a2, b2, e2) {
      return U2.current.useImperativeHandle(a2, b2, e2);
    };
    exports.useInsertionEffect = function(a2, b2) {
      return U2.current.useInsertionEffect(a2, b2);
    };
    exports.useLayoutEffect = function(a2, b2) {
      return U2.current.useLayoutEffect(a2, b2);
    };
    exports.useMemo = function(a2, b2) {
      return U2.current.useMemo(a2, b2);
    };
    exports.useReducer = function(a2, b2, e2) {
      return U2.current.useReducer(a2, b2, e2);
    };
    exports.useRef = function(a2) {
      return U2.current.useRef(a2);
    };
    exports.useState = function(a2) {
      return U2.current.useState(a2);
    };
    exports.useSyncExternalStore = function(a2, b2, e2) {
      return U2.current.useSyncExternalStore(a2, b2, e2);
    };
    exports.useTransition = function() {
      return U2.current.useTransition();
    };
    exports.version = "18.2.0";
  }
});

// ../../node_modules/react/cjs/react.development.js
var require_react_development = __commonJS({
  "../../node_modules/react/cjs/react.development.js"(exports, module2) {
    "use strict";
    if (process.env.NODE_ENV !== "production") {
      (function() {
        "use strict";
        if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ !== "undefined" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart === "function") {
          __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(new Error());
        }
        var ReactVersion = "18.2.0";
        var REACT_ELEMENT_TYPE = Symbol.for("react.element");
        var REACT_PORTAL_TYPE = Symbol.for("react.portal");
        var REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
        var REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode");
        var REACT_PROFILER_TYPE = Symbol.for("react.profiler");
        var REACT_PROVIDER_TYPE = Symbol.for("react.provider");
        var REACT_CONTEXT_TYPE = Symbol.for("react.context");
        var REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref");
        var REACT_SUSPENSE_TYPE = Symbol.for("react.suspense");
        var REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list");
        var REACT_MEMO_TYPE = Symbol.for("react.memo");
        var REACT_LAZY_TYPE = Symbol.for("react.lazy");
        var REACT_OFFSCREEN_TYPE = Symbol.for("react.offscreen");
        var MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
        var FAUX_ITERATOR_SYMBOL = "@@iterator";
        function getIteratorFn(maybeIterable) {
          if (maybeIterable === null || typeof maybeIterable !== "object") {
            return null;
          }
          var maybeIterator = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable[FAUX_ITERATOR_SYMBOL];
          if (typeof maybeIterator === "function") {
            return maybeIterator;
          }
          return null;
        }
        var ReactCurrentDispatcher = {
          /**
           * @internal
           * @type {ReactComponent}
           */
          current: null
        };
        var ReactCurrentBatchConfig = {
          transition: null
        };
        var ReactCurrentActQueue = {
          current: null,
          // Used to reproduce behavior of `batchedUpdates` in legacy mode.
          isBatchingLegacy: false,
          didScheduleLegacyUpdate: false
        };
        var ReactCurrentOwner = {
          /**
           * @internal
           * @type {ReactComponent}
           */
          current: null
        };
        var ReactDebugCurrentFrame = {};
        var currentExtraStackFrame = null;
        function setExtraStackFrame(stack) {
          {
            currentExtraStackFrame = stack;
          }
        }
        {
          ReactDebugCurrentFrame.setExtraStackFrame = function(stack) {
            {
              currentExtraStackFrame = stack;
            }
          };
          ReactDebugCurrentFrame.getCurrentStack = null;
          ReactDebugCurrentFrame.getStackAddendum = function() {
            var stack = "";
            if (currentExtraStackFrame) {
              stack += currentExtraStackFrame;
            }
            var impl = ReactDebugCurrentFrame.getCurrentStack;
            if (impl) {
              stack += impl() || "";
            }
            return stack;
          };
        }
        var enableScopeAPI = false;
        var enableCacheElement = false;
        var enableTransitionTracing = false;
        var enableLegacyHidden = false;
        var enableDebugTracing = false;
        var ReactSharedInternals = {
          ReactCurrentDispatcher,
          ReactCurrentBatchConfig,
          ReactCurrentOwner
        };
        {
          ReactSharedInternals.ReactDebugCurrentFrame = ReactDebugCurrentFrame;
          ReactSharedInternals.ReactCurrentActQueue = ReactCurrentActQueue;
        }
        function warn(format) {
          {
            {
              for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
                args[_key - 1] = arguments[_key];
              }
              printWarning("warn", format, args);
            }
          }
        }
        function error(format) {
          {
            {
              for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
                args[_key2 - 1] = arguments[_key2];
              }
              printWarning("error", format, args);
            }
          }
        }
        function printWarning(level, format, args) {
          {
            var ReactDebugCurrentFrame2 = ReactSharedInternals.ReactDebugCurrentFrame;
            var stack = ReactDebugCurrentFrame2.getStackAddendum();
            if (stack !== "") {
              format += "%s";
              args = args.concat([stack]);
            }
            var argsWithFormat = args.map(function(item) {
              return String(item);
            });
            argsWithFormat.unshift("Warning: " + format);
            Function.prototype.apply.call(console[level], console, argsWithFormat);
          }
        }
        var didWarnStateUpdateForUnmountedComponent = {};
        function warnNoop(publicInstance, callerName) {
          {
            var _constructor = publicInstance.constructor;
            var componentName = _constructor && (_constructor.displayName || _constructor.name) || "ReactClass";
            var warningKey = componentName + "." + callerName;
            if (didWarnStateUpdateForUnmountedComponent[warningKey]) {
              return;
            }
            error("Can't call %s on a component that is not yet mounted. This is a no-op, but it might indicate a bug in your application. Instead, assign to `this.state` directly or define a `state = {};` class property with the desired state in the %s component.", callerName, componentName);
            didWarnStateUpdateForUnmountedComponent[warningKey] = true;
          }
        }
        var ReactNoopUpdateQueue = {
          /**
           * Checks whether or not this composite component is mounted.
           * @param {ReactClass} publicInstance The instance we want to test.
           * @return {boolean} True if mounted, false otherwise.
           * @protected
           * @final
           */
          isMounted: function(publicInstance) {
            return false;
          },
          /**
           * Forces an update. This should only be invoked when it is known with
           * certainty that we are **not** in a DOM transaction.
           *
           * You may want to call this when you know that some deeper aspect of the
           * component's state has changed but `setState` was not called.
           *
           * This will not invoke `shouldComponentUpdate`, but it will invoke
           * `componentWillUpdate` and `componentDidUpdate`.
           *
           * @param {ReactClass} publicInstance The instance that should rerender.
           * @param {?function} callback Called after component is updated.
           * @param {?string} callerName name of the calling function in the public API.
           * @internal
           */
          enqueueForceUpdate: function(publicInstance, callback, callerName) {
            warnNoop(publicInstance, "forceUpdate");
          },
          /**
           * Replaces all of the state. Always use this or `setState` to mutate state.
           * You should treat `this.state` as immutable.
           *
           * There is no guarantee that `this.state` will be immediately updated, so
           * accessing `this.state` after calling this method may return the old value.
           *
           * @param {ReactClass} publicInstance The instance that should rerender.
           * @param {object} completeState Next state.
           * @param {?function} callback Called after component is updated.
           * @param {?string} callerName name of the calling function in the public API.
           * @internal
           */
          enqueueReplaceState: function(publicInstance, completeState, callback, callerName) {
            warnNoop(publicInstance, "replaceState");
          },
          /**
           * Sets a subset of the state. This only exists because _pendingState is
           * internal. This provides a merging strategy that is not available to deep
           * properties which is confusing. TODO: Expose pendingState or don't use it
           * during the merge.
           *
           * @param {ReactClass} publicInstance The instance that should rerender.
           * @param {object} partialState Next partial state to be merged with state.
           * @param {?function} callback Called after component is updated.
           * @param {?string} Name of the calling function in the public API.
           * @internal
           */
          enqueueSetState: function(publicInstance, partialState, callback, callerName) {
            warnNoop(publicInstance, "setState");
          }
        };
        var assign = Object.assign;
        var emptyObject = {};
        {
          Object.freeze(emptyObject);
        }
        function Component(props, context, updater) {
          this.props = props;
          this.context = context;
          this.refs = emptyObject;
          this.updater = updater || ReactNoopUpdateQueue;
        }
        Component.prototype.isReactComponent = {};
        Component.prototype.setState = function(partialState, callback) {
          if (typeof partialState !== "object" && typeof partialState !== "function" && partialState != null) {
            throw new Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
          }
          this.updater.enqueueSetState(this, partialState, callback, "setState");
        };
        Component.prototype.forceUpdate = function(callback) {
          this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
        };
        {
          var deprecatedAPIs = {
            isMounted: ["isMounted", "Instead, make sure to clean up subscriptions and pending requests in componentWillUnmount to prevent memory leaks."],
            replaceState: ["replaceState", "Refactor your code to use setState instead (see https://github.com/facebook/react/issues/3236)."]
          };
          var defineDeprecationWarning = function(methodName, info) {
            Object.defineProperty(Component.prototype, methodName, {
              get: function() {
                warn("%s(...) is deprecated in plain JavaScript React classes. %s", info[0], info[1]);
                return void 0;
              }
            });
          };
          for (var fnName in deprecatedAPIs) {
            if (deprecatedAPIs.hasOwnProperty(fnName)) {
              defineDeprecationWarning(fnName, deprecatedAPIs[fnName]);
            }
          }
        }
        function ComponentDummy() {
        }
        ComponentDummy.prototype = Component.prototype;
        function PureComponent(props, context, updater) {
          this.props = props;
          this.context = context;
          this.refs = emptyObject;
          this.updater = updater || ReactNoopUpdateQueue;
        }
        var pureComponentPrototype = PureComponent.prototype = new ComponentDummy();
        pureComponentPrototype.constructor = PureComponent;
        assign(pureComponentPrototype, Component.prototype);
        pureComponentPrototype.isPureReactComponent = true;
        function createRef() {
          var refObject = {
            current: null
          };
          {
            Object.seal(refObject);
          }
          return refObject;
        }
        var isArrayImpl = Array.isArray;
        function isArray(a2) {
          return isArrayImpl(a2);
        }
        function typeName(value) {
          {
            var hasToStringTag = typeof Symbol === "function" && Symbol.toStringTag;
            var type = hasToStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
            return type;
          }
        }
        function willCoercionThrow(value) {
          {
            try {
              testStringCoercion(value);
              return false;
            } catch (e2) {
              return true;
            }
          }
        }
        function testStringCoercion(value) {
          return "" + value;
        }
        function checkKeyStringCoercion(value) {
          {
            if (willCoercionThrow(value)) {
              error("The provided key is an unsupported type %s. This value must be coerced to a string before before using it here.", typeName(value));
              return testStringCoercion(value);
            }
          }
        }
        function getWrappedName(outerType, innerType, wrapperName) {
          var displayName = outerType.displayName;
          if (displayName) {
            return displayName;
          }
          var functionName = innerType.displayName || innerType.name || "";
          return functionName !== "" ? wrapperName + "(" + functionName + ")" : wrapperName;
        }
        function getContextName(type) {
          return type.displayName || "Context";
        }
        function getComponentNameFromType(type) {
          if (type == null) {
            return null;
          }
          {
            if (typeof type.tag === "number") {
              error("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue.");
            }
          }
          if (typeof type === "function") {
            return type.displayName || type.name || null;
          }
          if (typeof type === "string") {
            return type;
          }
          switch (type) {
            case REACT_FRAGMENT_TYPE:
              return "Fragment";
            case REACT_PORTAL_TYPE:
              return "Portal";
            case REACT_PROFILER_TYPE:
              return "Profiler";
            case REACT_STRICT_MODE_TYPE:
              return "StrictMode";
            case REACT_SUSPENSE_TYPE:
              return "Suspense";
            case REACT_SUSPENSE_LIST_TYPE:
              return "SuspenseList";
          }
          if (typeof type === "object") {
            switch (type.$$typeof) {
              case REACT_CONTEXT_TYPE:
                var context = type;
                return getContextName(context) + ".Consumer";
              case REACT_PROVIDER_TYPE:
                var provider = type;
                return getContextName(provider._context) + ".Provider";
              case REACT_FORWARD_REF_TYPE:
                return getWrappedName(type, type.render, "ForwardRef");
              case REACT_MEMO_TYPE:
                var outerName = type.displayName || null;
                if (outerName !== null) {
                  return outerName;
                }
                return getComponentNameFromType(type.type) || "Memo";
              case REACT_LAZY_TYPE: {
                var lazyComponent = type;
                var payload = lazyComponent._payload;
                var init2 = lazyComponent._init;
                try {
                  return getComponentNameFromType(init2(payload));
                } catch (x2) {
                  return null;
                }
              }
            }
          }
          return null;
        }
        var hasOwnProperty = Object.prototype.hasOwnProperty;
        var RESERVED_PROPS = {
          key: true,
          ref: true,
          __self: true,
          __source: true
        };
        var specialPropKeyWarningShown, specialPropRefWarningShown, didWarnAboutStringRefs;
        {
          didWarnAboutStringRefs = {};
        }
        function hasValidRef(config) {
          {
            if (hasOwnProperty.call(config, "ref")) {
              var getter = Object.getOwnPropertyDescriptor(config, "ref").get;
              if (getter && getter.isReactWarning) {
                return false;
              }
            }
          }
          return config.ref !== void 0;
        }
        function hasValidKey(config) {
          {
            if (hasOwnProperty.call(config, "key")) {
              var getter = Object.getOwnPropertyDescriptor(config, "key").get;
              if (getter && getter.isReactWarning) {
                return false;
              }
            }
          }
          return config.key !== void 0;
        }
        function defineKeyPropWarningGetter(props, displayName) {
          var warnAboutAccessingKey = function() {
            {
              if (!specialPropKeyWarningShown) {
                specialPropKeyWarningShown = true;
                error("%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", displayName);
              }
            }
          };
          warnAboutAccessingKey.isReactWarning = true;
          Object.defineProperty(props, "key", {
            get: warnAboutAccessingKey,
            configurable: true
          });
        }
        function defineRefPropWarningGetter(props, displayName) {
          var warnAboutAccessingRef = function() {
            {
              if (!specialPropRefWarningShown) {
                specialPropRefWarningShown = true;
                error("%s: `ref` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", displayName);
              }
            }
          };
          warnAboutAccessingRef.isReactWarning = true;
          Object.defineProperty(props, "ref", {
            get: warnAboutAccessingRef,
            configurable: true
          });
        }
        function warnIfStringRefCannotBeAutoConverted(config) {
          {
            if (typeof config.ref === "string" && ReactCurrentOwner.current && config.__self && ReactCurrentOwner.current.stateNode !== config.__self) {
              var componentName = getComponentNameFromType(ReactCurrentOwner.current.type);
              if (!didWarnAboutStringRefs[componentName]) {
                error('Component "%s" contains the string ref "%s". Support for string refs will be removed in a future major release. This case cannot be automatically converted to an arrow function. We ask you to manually fix this case by using useRef() or createRef() instead. Learn more about using refs safely here: https://reactjs.org/link/strict-mode-string-ref', componentName, config.ref);
                didWarnAboutStringRefs[componentName] = true;
              }
            }
          }
        }
        var ReactElement = function(type, key, ref, self, source, owner, props) {
          var element = {
            // This tag allows us to uniquely identify this as a React Element
            $$typeof: REACT_ELEMENT_TYPE,
            // Built-in properties that belong on the element
            type,
            key,
            ref,
            props,
            // Record the component responsible for creating this element.
            _owner: owner
          };
          {
            element._store = {};
            Object.defineProperty(element._store, "validated", {
              configurable: false,
              enumerable: false,
              writable: true,
              value: false
            });
            Object.defineProperty(element, "_self", {
              configurable: false,
              enumerable: false,
              writable: false,
              value: self
            });
            Object.defineProperty(element, "_source", {
              configurable: false,
              enumerable: false,
              writable: false,
              value: source
            });
            if (Object.freeze) {
              Object.freeze(element.props);
              Object.freeze(element);
            }
          }
          return element;
        };
        function createElement(type, config, children) {
          var propName;
          var props = {};
          var key = null;
          var ref = null;
          var self = null;
          var source = null;
          if (config != null) {
            if (hasValidRef(config)) {
              ref = config.ref;
              {
                warnIfStringRefCannotBeAutoConverted(config);
              }
            }
            if (hasValidKey(config)) {
              {
                checkKeyStringCoercion(config.key);
              }
              key = "" + config.key;
            }
            self = config.__self === void 0 ? null : config.__self;
            source = config.__source === void 0 ? null : config.__source;
            for (propName in config) {
              if (hasOwnProperty.call(config, propName) && !RESERVED_PROPS.hasOwnProperty(propName)) {
                props[propName] = config[propName];
              }
            }
          }
          var childrenLength = arguments.length - 2;
          if (childrenLength === 1) {
            props.children = children;
          } else if (childrenLength > 1) {
            var childArray = Array(childrenLength);
            for (var i2 = 0; i2 < childrenLength; i2++) {
              childArray[i2] = arguments[i2 + 2];
            }
            {
              if (Object.freeze) {
                Object.freeze(childArray);
              }
            }
            props.children = childArray;
          }
          if (type && type.defaultProps) {
            var defaultProps = type.defaultProps;
            for (propName in defaultProps) {
              if (props[propName] === void 0) {
                props[propName] = defaultProps[propName];
              }
            }
          }
          {
            if (key || ref) {
              var displayName = typeof type === "function" ? type.displayName || type.name || "Unknown" : type;
              if (key) {
                defineKeyPropWarningGetter(props, displayName);
              }
              if (ref) {
                defineRefPropWarningGetter(props, displayName);
              }
            }
          }
          return ReactElement(type, key, ref, self, source, ReactCurrentOwner.current, props);
        }
        function cloneAndReplaceKey(oldElement, newKey) {
          var newElement = ReactElement(oldElement.type, newKey, oldElement.ref, oldElement._self, oldElement._source, oldElement._owner, oldElement.props);
          return newElement;
        }
        function cloneElement(element, config, children) {
          if (element === null || element === void 0) {
            throw new Error("React.cloneElement(...): The argument must be a React element, but you passed " + element + ".");
          }
          var propName;
          var props = assign({}, element.props);
          var key = element.key;
          var ref = element.ref;
          var self = element._self;
          var source = element._source;
          var owner = element._owner;
          if (config != null) {
            if (hasValidRef(config)) {
              ref = config.ref;
              owner = ReactCurrentOwner.current;
            }
            if (hasValidKey(config)) {
              {
                checkKeyStringCoercion(config.key);
              }
              key = "" + config.key;
            }
            var defaultProps;
            if (element.type && element.type.defaultProps) {
              defaultProps = element.type.defaultProps;
            }
            for (propName in config) {
              if (hasOwnProperty.call(config, propName) && !RESERVED_PROPS.hasOwnProperty(propName)) {
                if (config[propName] === void 0 && defaultProps !== void 0) {
                  props[propName] = defaultProps[propName];
                } else {
                  props[propName] = config[propName];
                }
              }
            }
          }
          var childrenLength = arguments.length - 2;
          if (childrenLength === 1) {
            props.children = children;
          } else if (childrenLength > 1) {
            var childArray = Array(childrenLength);
            for (var i2 = 0; i2 < childrenLength; i2++) {
              childArray[i2] = arguments[i2 + 2];
            }
            props.children = childArray;
          }
          return ReactElement(element.type, key, ref, self, source, owner, props);
        }
        function isValidElement(object) {
          return typeof object === "object" && object !== null && object.$$typeof === REACT_ELEMENT_TYPE;
        }
        var SEPARATOR = ".";
        var SUBSEPARATOR = ":";
        function escape(key) {
          var escapeRegex = /[=:]/g;
          var escaperLookup = {
            "=": "=0",
            ":": "=2"
          };
          var escapedString = key.replace(escapeRegex, function(match) {
            return escaperLookup[match];
          });
          return "$" + escapedString;
        }
        var didWarnAboutMaps = false;
        var userProvidedKeyEscapeRegex = /\/+/g;
        function escapeUserProvidedKey(text) {
          return text.replace(userProvidedKeyEscapeRegex, "$&/");
        }
        function getElementKey(element, index) {
          if (typeof element === "object" && element !== null && element.key != null) {
            {
              checkKeyStringCoercion(element.key);
            }
            return escape("" + element.key);
          }
          return index.toString(36);
        }
        function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
          var type = typeof children;
          if (type === "undefined" || type === "boolean") {
            children = null;
          }
          var invokeCallback = false;
          if (children === null) {
            invokeCallback = true;
          } else {
            switch (type) {
              case "string":
              case "number":
                invokeCallback = true;
                break;
              case "object":
                switch (children.$$typeof) {
                  case REACT_ELEMENT_TYPE:
                  case REACT_PORTAL_TYPE:
                    invokeCallback = true;
                }
            }
          }
          if (invokeCallback) {
            var _child = children;
            var mappedChild = callback(_child);
            var childKey = nameSoFar === "" ? SEPARATOR + getElementKey(_child, 0) : nameSoFar;
            if (isArray(mappedChild)) {
              var escapedChildKey = "";
              if (childKey != null) {
                escapedChildKey = escapeUserProvidedKey(childKey) + "/";
              }
              mapIntoArray(mappedChild, array, escapedChildKey, "", function(c2) {
                return c2;
              });
            } else if (mappedChild != null) {
              if (isValidElement(mappedChild)) {
                {
                  if (mappedChild.key && (!_child || _child.key !== mappedChild.key)) {
                    checkKeyStringCoercion(mappedChild.key);
                  }
                }
                mappedChild = cloneAndReplaceKey(
                  mappedChild,
                  // Keep both the (mapped) and old keys if they differ, just as
                  // traverseAllChildren used to do for objects as children
                  escapedPrefix + // $FlowFixMe Flow incorrectly thinks React.Portal doesn't have a key
                  (mappedChild.key && (!_child || _child.key !== mappedChild.key) ? (
                    // $FlowFixMe Flow incorrectly thinks existing element's key can be a number
                    // eslint-disable-next-line react-internal/safe-string-coercion
                    escapeUserProvidedKey("" + mappedChild.key) + "/"
                  ) : "") + childKey
                );
              }
              array.push(mappedChild);
            }
            return 1;
          }
          var child;
          var nextName;
          var subtreeCount = 0;
          var nextNamePrefix = nameSoFar === "" ? SEPARATOR : nameSoFar + SUBSEPARATOR;
          if (isArray(children)) {
            for (var i2 = 0; i2 < children.length; i2++) {
              child = children[i2];
              nextName = nextNamePrefix + getElementKey(child, i2);
              subtreeCount += mapIntoArray(child, array, escapedPrefix, nextName, callback);
            }
          } else {
            var iteratorFn = getIteratorFn(children);
            if (typeof iteratorFn === "function") {
              var iterableChildren = children;
              {
                if (iteratorFn === iterableChildren.entries) {
                  if (!didWarnAboutMaps) {
                    warn("Using Maps as children is not supported. Use an array of keyed ReactElements instead.");
                  }
                  didWarnAboutMaps = true;
                }
              }
              var iterator = iteratorFn.call(iterableChildren);
              var step;
              var ii = 0;
              while (!(step = iterator.next()).done) {
                child = step.value;
                nextName = nextNamePrefix + getElementKey(child, ii++);
                subtreeCount += mapIntoArray(child, array, escapedPrefix, nextName, callback);
              }
            } else if (type === "object") {
              var childrenString = String(children);
              throw new Error("Objects are not valid as a React child (found: " + (childrenString === "[object Object]" ? "object with keys {" + Object.keys(children).join(", ") + "}" : childrenString) + "). If you meant to render a collection of children, use an array instead.");
            }
          }
          return subtreeCount;
        }
        function mapChildren(children, func, context) {
          if (children == null) {
            return children;
          }
          var result = [];
          var count = 0;
          mapIntoArray(children, result, "", "", function(child) {
            return func.call(context, child, count++);
          });
          return result;
        }
        function countChildren(children) {
          var n2 = 0;
          mapChildren(children, function() {
            n2++;
          });
          return n2;
        }
        function forEachChildren(children, forEachFunc, forEachContext) {
          mapChildren(children, function() {
            forEachFunc.apply(this, arguments);
          }, forEachContext);
        }
        function toArray(children) {
          return mapChildren(children, function(child) {
            return child;
          }) || [];
        }
        function onlyChild(children) {
          if (!isValidElement(children)) {
            throw new Error("React.Children.only expected to receive a single React element child.");
          }
          return children;
        }
        function createContext(defaultValue) {
          var context = {
            $$typeof: REACT_CONTEXT_TYPE,
            // As a workaround to support multiple concurrent renderers, we categorize
            // some renderers as primary and others as secondary. We only expect
            // there to be two concurrent renderers at most: React Native (primary) and
            // Fabric (secondary); React DOM (primary) and React ART (secondary).
            // Secondary renderers store their context values on separate fields.
            _currentValue: defaultValue,
            _currentValue2: defaultValue,
            // Used to track how many concurrent renderers this context currently
            // supports within in a single renderer. Such as parallel server rendering.
            _threadCount: 0,
            // These are circular
            Provider: null,
            Consumer: null,
            // Add these to use same hidden class in VM as ServerContext
            _defaultValue: null,
            _globalName: null
          };
          context.Provider = {
            $$typeof: REACT_PROVIDER_TYPE,
            _context: context
          };
          var hasWarnedAboutUsingNestedContextConsumers = false;
          var hasWarnedAboutUsingConsumerProvider = false;
          var hasWarnedAboutDisplayNameOnConsumer = false;
          {
            var Consumer = {
              $$typeof: REACT_CONTEXT_TYPE,
              _context: context
            };
            Object.defineProperties(Consumer, {
              Provider: {
                get: function() {
                  if (!hasWarnedAboutUsingConsumerProvider) {
                    hasWarnedAboutUsingConsumerProvider = true;
                    error("Rendering <Context.Consumer.Provider> is not supported and will be removed in a future major release. Did you mean to render <Context.Provider> instead?");
                  }
                  return context.Provider;
                },
                set: function(_Provider) {
                  context.Provider = _Provider;
                }
              },
              _currentValue: {
                get: function() {
                  return context._currentValue;
                },
                set: function(_currentValue) {
                  context._currentValue = _currentValue;
                }
              },
              _currentValue2: {
                get: function() {
                  return context._currentValue2;
                },
                set: function(_currentValue2) {
                  context._currentValue2 = _currentValue2;
                }
              },
              _threadCount: {
                get: function() {
                  return context._threadCount;
                },
                set: function(_threadCount) {
                  context._threadCount = _threadCount;
                }
              },
              Consumer: {
                get: function() {
                  if (!hasWarnedAboutUsingNestedContextConsumers) {
                    hasWarnedAboutUsingNestedContextConsumers = true;
                    error("Rendering <Context.Consumer.Consumer> is not supported and will be removed in a future major release. Did you mean to render <Context.Consumer> instead?");
                  }
                  return context.Consumer;
                }
              },
              displayName: {
                get: function() {
                  return context.displayName;
                },
                set: function(displayName) {
                  if (!hasWarnedAboutDisplayNameOnConsumer) {
                    warn("Setting `displayName` on Context.Consumer has no effect. You should set it directly on the context with Context.displayName = '%s'.", displayName);
                    hasWarnedAboutDisplayNameOnConsumer = true;
                  }
                }
              }
            });
            context.Consumer = Consumer;
          }
          {
            context._currentRenderer = null;
            context._currentRenderer2 = null;
          }
          return context;
        }
        var Uninitialized = -1;
        var Pending = 0;
        var Resolved = 1;
        var Rejected = 2;
        function lazyInitializer(payload) {
          if (payload._status === Uninitialized) {
            var ctor = payload._result;
            var thenable = ctor();
            thenable.then(function(moduleObject2) {
              if (payload._status === Pending || payload._status === Uninitialized) {
                var resolved = payload;
                resolved._status = Resolved;
                resolved._result = moduleObject2;
              }
            }, function(error2) {
              if (payload._status === Pending || payload._status === Uninitialized) {
                var rejected = payload;
                rejected._status = Rejected;
                rejected._result = error2;
              }
            });
            if (payload._status === Uninitialized) {
              var pending = payload;
              pending._status = Pending;
              pending._result = thenable;
            }
          }
          if (payload._status === Resolved) {
            var moduleObject = payload._result;
            {
              if (moduleObject === void 0) {
                error("lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))\n\nDid you accidentally put curly braces around the import?", moduleObject);
              }
            }
            {
              if (!("default" in moduleObject)) {
                error("lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))", moduleObject);
              }
            }
            return moduleObject.default;
          } else {
            throw payload._result;
          }
        }
        function lazy(ctor) {
          var payload = {
            // We use these fields to store the result.
            _status: Uninitialized,
            _result: ctor
          };
          var lazyType = {
            $$typeof: REACT_LAZY_TYPE,
            _payload: payload,
            _init: lazyInitializer
          };
          {
            var defaultProps;
            var propTypes;
            Object.defineProperties(lazyType, {
              defaultProps: {
                configurable: true,
                get: function() {
                  return defaultProps;
                },
                set: function(newDefaultProps) {
                  error("React.lazy(...): It is not supported to assign `defaultProps` to a lazy component import. Either specify them where the component is defined, or create a wrapping component around it.");
                  defaultProps = newDefaultProps;
                  Object.defineProperty(lazyType, "defaultProps", {
                    enumerable: true
                  });
                }
              },
              propTypes: {
                configurable: true,
                get: function() {
                  return propTypes;
                },
                set: function(newPropTypes) {
                  error("React.lazy(...): It is not supported to assign `propTypes` to a lazy component import. Either specify them where the component is defined, or create a wrapping component around it.");
                  propTypes = newPropTypes;
                  Object.defineProperty(lazyType, "propTypes", {
                    enumerable: true
                  });
                }
              }
            });
          }
          return lazyType;
        }
        function forwardRef(render) {
          {
            if (render != null && render.$$typeof === REACT_MEMO_TYPE) {
              error("forwardRef requires a render function but received a `memo` component. Instead of forwardRef(memo(...)), use memo(forwardRef(...)).");
            } else if (typeof render !== "function") {
              error("forwardRef requires a render function but was given %s.", render === null ? "null" : typeof render);
            } else {
              if (render.length !== 0 && render.length !== 2) {
                error("forwardRef render functions accept exactly two parameters: props and ref. %s", render.length === 1 ? "Did you forget to use the ref parameter?" : "Any additional parameter will be undefined.");
              }
            }
            if (render != null) {
              if (render.defaultProps != null || render.propTypes != null) {
                error("forwardRef render functions do not support propTypes or defaultProps. Did you accidentally pass a React component?");
              }
            }
          }
          var elementType = {
            $$typeof: REACT_FORWARD_REF_TYPE,
            render
          };
          {
            var ownName;
            Object.defineProperty(elementType, "displayName", {
              enumerable: false,
              configurable: true,
              get: function() {
                return ownName;
              },
              set: function(name) {
                ownName = name;
                if (!render.name && !render.displayName) {
                  render.displayName = name;
                }
              }
            });
          }
          return elementType;
        }
        var REACT_MODULE_REFERENCE;
        {
          REACT_MODULE_REFERENCE = Symbol.for("react.module.reference");
        }
        function isValidElementType(type) {
          if (typeof type === "string" || typeof type === "function") {
            return true;
          }
          if (type === REACT_FRAGMENT_TYPE || type === REACT_PROFILER_TYPE || enableDebugTracing || type === REACT_STRICT_MODE_TYPE || type === REACT_SUSPENSE_TYPE || type === REACT_SUSPENSE_LIST_TYPE || enableLegacyHidden || type === REACT_OFFSCREEN_TYPE || enableScopeAPI || enableCacheElement || enableTransitionTracing) {
            return true;
          }
          if (typeof type === "object" && type !== null) {
            if (type.$$typeof === REACT_LAZY_TYPE || type.$$typeof === REACT_MEMO_TYPE || type.$$typeof === REACT_PROVIDER_TYPE || type.$$typeof === REACT_CONTEXT_TYPE || type.$$typeof === REACT_FORWARD_REF_TYPE || // This needs to include all possible module reference object
            // types supported by any Flight configuration anywhere since
            // we don't know which Flight build this will end up being used
            // with.
            type.$$typeof === REACT_MODULE_REFERENCE || type.getModuleId !== void 0) {
              return true;
            }
          }
          return false;
        }
        function memo(type, compare) {
          {
            if (!isValidElementType(type)) {
              error("memo: The first argument must be a component. Instead received: %s", type === null ? "null" : typeof type);
            }
          }
          var elementType = {
            $$typeof: REACT_MEMO_TYPE,
            type,
            compare: compare === void 0 ? null : compare
          };
          {
            var ownName;
            Object.defineProperty(elementType, "displayName", {
              enumerable: false,
              configurable: true,
              get: function() {
                return ownName;
              },
              set: function(name) {
                ownName = name;
                if (!type.name && !type.displayName) {
                  type.displayName = name;
                }
              }
            });
          }
          return elementType;
        }
        function resolveDispatcher() {
          var dispatcher = ReactCurrentDispatcher.current;
          {
            if (dispatcher === null) {
              error("Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:\n1. You might have mismatching versions of React and the renderer (such as React DOM)\n2. You might be breaking the Rules of Hooks\n3. You might have more than one copy of React in the same app\nSee https://reactjs.org/link/invalid-hook-call for tips about how to debug and fix this problem.");
            }
          }
          return dispatcher;
        }
        function useContext(Context) {
          var dispatcher = resolveDispatcher();
          {
            if (Context._context !== void 0) {
              var realContext = Context._context;
              if (realContext.Consumer === Context) {
                error("Calling useContext(Context.Consumer) is not supported, may cause bugs, and will be removed in a future major release. Did you mean to call useContext(Context) instead?");
              } else if (realContext.Provider === Context) {
                error("Calling useContext(Context.Provider) is not supported. Did you mean to call useContext(Context) instead?");
              }
            }
          }
          return dispatcher.useContext(Context);
        }
        function useState(initialState) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useState(initialState);
        }
        function useReducer(reducer, initialArg, init2) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useReducer(reducer, initialArg, init2);
        }
        function useRef(initialValue) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useRef(initialValue);
        }
        function useEffect(create, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useEffect(create, deps);
        }
        function useInsertionEffect(create, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useInsertionEffect(create, deps);
        }
        function useLayoutEffect(create, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useLayoutEffect(create, deps);
        }
        function useCallback(callback, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useCallback(callback, deps);
        }
        function useMemo(create, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useMemo(create, deps);
        }
        function useImperativeHandle(ref, create, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useImperativeHandle(ref, create, deps);
        }
        function useDebugValue(value, formatterFn) {
          {
            var dispatcher = resolveDispatcher();
            return dispatcher.useDebugValue(value, formatterFn);
          }
        }
        function useTransition() {
          var dispatcher = resolveDispatcher();
          return dispatcher.useTransition();
        }
        function useDeferredValue(value) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useDeferredValue(value);
        }
        function useId() {
          var dispatcher = resolveDispatcher();
          return dispatcher.useId();
        }
        function useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
        }
        var disabledDepth = 0;
        var prevLog;
        var prevInfo;
        var prevWarn;
        var prevError;
        var prevGroup;
        var prevGroupCollapsed;
        var prevGroupEnd;
        function disabledLog() {
        }
        disabledLog.__reactDisabledLog = true;
        function disableLogs() {
          {
            if (disabledDepth === 0) {
              prevLog = console.log;
              prevInfo = console.info;
              prevWarn = console.warn;
              prevError = console.error;
              prevGroup = console.group;
              prevGroupCollapsed = console.groupCollapsed;
              prevGroupEnd = console.groupEnd;
              var props = {
                configurable: true,
                enumerable: true,
                value: disabledLog,
                writable: true
              };
              Object.defineProperties(console, {
                info: props,
                log: props,
                warn: props,
                error: props,
                group: props,
                groupCollapsed: props,
                groupEnd: props
              });
            }
            disabledDepth++;
          }
        }
        function reenableLogs() {
          {
            disabledDepth--;
            if (disabledDepth === 0) {
              var props = {
                configurable: true,
                enumerable: true,
                writable: true
              };
              Object.defineProperties(console, {
                log: assign({}, props, {
                  value: prevLog
                }),
                info: assign({}, props, {
                  value: prevInfo
                }),
                warn: assign({}, props, {
                  value: prevWarn
                }),
                error: assign({}, props, {
                  value: prevError
                }),
                group: assign({}, props, {
                  value: prevGroup
                }),
                groupCollapsed: assign({}, props, {
                  value: prevGroupCollapsed
                }),
                groupEnd: assign({}, props, {
                  value: prevGroupEnd
                })
              });
            }
            if (disabledDepth < 0) {
              error("disabledDepth fell below zero. This is a bug in React. Please file an issue.");
            }
          }
        }
        var ReactCurrentDispatcher$1 = ReactSharedInternals.ReactCurrentDispatcher;
        var prefix;
        function describeBuiltInComponentFrame(name, source, ownerFn) {
          {
            if (prefix === void 0) {
              try {
                throw Error();
              } catch (x2) {
                var match = x2.stack.trim().match(/\n( *(at )?)/);
                prefix = match && match[1] || "";
              }
            }
            return "\n" + prefix + name;
          }
        }
        var reentry = false;
        var componentFrameCache;
        {
          var PossiblyWeakMap = typeof WeakMap === "function" ? WeakMap : Map;
          componentFrameCache = new PossiblyWeakMap();
        }
        function describeNativeComponentFrame(fn, construct) {
          if (!fn || reentry) {
            return "";
          }
          {
            var frame = componentFrameCache.get(fn);
            if (frame !== void 0) {
              return frame;
            }
          }
          var control;
          reentry = true;
          var previousPrepareStackTrace = Error.prepareStackTrace;
          Error.prepareStackTrace = void 0;
          var previousDispatcher;
          {
            previousDispatcher = ReactCurrentDispatcher$1.current;
            ReactCurrentDispatcher$1.current = null;
            disableLogs();
          }
          try {
            if (construct) {
              var Fake = function() {
                throw Error();
              };
              Object.defineProperty(Fake.prototype, "props", {
                set: function() {
                  throw Error();
                }
              });
              if (typeof Reflect === "object" && Reflect.construct) {
                try {
                  Reflect.construct(Fake, []);
                } catch (x2) {
                  control = x2;
                }
                Reflect.construct(fn, [], Fake);
              } else {
                try {
                  Fake.call();
                } catch (x2) {
                  control = x2;
                }
                fn.call(Fake.prototype);
              }
            } else {
              try {
                throw Error();
              } catch (x2) {
                control = x2;
              }
              fn();
            }
          } catch (sample) {
            if (sample && control && typeof sample.stack === "string") {
              var sampleLines = sample.stack.split("\n");
              var controlLines = control.stack.split("\n");
              var s2 = sampleLines.length - 1;
              var c2 = controlLines.length - 1;
              while (s2 >= 1 && c2 >= 0 && sampleLines[s2] !== controlLines[c2]) {
                c2--;
              }
              for (; s2 >= 1 && c2 >= 0; s2--, c2--) {
                if (sampleLines[s2] !== controlLines[c2]) {
                  if (s2 !== 1 || c2 !== 1) {
                    do {
                      s2--;
                      c2--;
                      if (c2 < 0 || sampleLines[s2] !== controlLines[c2]) {
                        var _frame = "\n" + sampleLines[s2].replace(" at new ", " at ");
                        if (fn.displayName && _frame.includes("<anonymous>")) {
                          _frame = _frame.replace("<anonymous>", fn.displayName);
                        }
                        {
                          if (typeof fn === "function") {
                            componentFrameCache.set(fn, _frame);
                          }
                        }
                        return _frame;
                      }
                    } while (s2 >= 1 && c2 >= 0);
                  }
                  break;
                }
              }
            }
          } finally {
            reentry = false;
            {
              ReactCurrentDispatcher$1.current = previousDispatcher;
              reenableLogs();
            }
            Error.prepareStackTrace = previousPrepareStackTrace;
          }
          var name = fn ? fn.displayName || fn.name : "";
          var syntheticFrame = name ? describeBuiltInComponentFrame(name) : "";
          {
            if (typeof fn === "function") {
              componentFrameCache.set(fn, syntheticFrame);
            }
          }
          return syntheticFrame;
        }
        function describeFunctionComponentFrame(fn, source, ownerFn) {
          {
            return describeNativeComponentFrame(fn, false);
          }
        }
        function shouldConstruct(Component2) {
          var prototype = Component2.prototype;
          return !!(prototype && prototype.isReactComponent);
        }
        function describeUnknownElementTypeFrameInDEV(type, source, ownerFn) {
          if (type == null) {
            return "";
          }
          if (typeof type === "function") {
            {
              return describeNativeComponentFrame(type, shouldConstruct(type));
            }
          }
          if (typeof type === "string") {
            return describeBuiltInComponentFrame(type);
          }
          switch (type) {
            case REACT_SUSPENSE_TYPE:
              return describeBuiltInComponentFrame("Suspense");
            case REACT_SUSPENSE_LIST_TYPE:
              return describeBuiltInComponentFrame("SuspenseList");
          }
          if (typeof type === "object") {
            switch (type.$$typeof) {
              case REACT_FORWARD_REF_TYPE:
                return describeFunctionComponentFrame(type.render);
              case REACT_MEMO_TYPE:
                return describeUnknownElementTypeFrameInDEV(type.type, source, ownerFn);
              case REACT_LAZY_TYPE: {
                var lazyComponent = type;
                var payload = lazyComponent._payload;
                var init2 = lazyComponent._init;
                try {
                  return describeUnknownElementTypeFrameInDEV(init2(payload), source, ownerFn);
                } catch (x2) {
                }
              }
            }
          }
          return "";
        }
        var loggedTypeFailures = {};
        var ReactDebugCurrentFrame$1 = ReactSharedInternals.ReactDebugCurrentFrame;
        function setCurrentlyValidatingElement(element) {
          {
            if (element) {
              var owner = element._owner;
              var stack = describeUnknownElementTypeFrameInDEV(element.type, element._source, owner ? owner.type : null);
              ReactDebugCurrentFrame$1.setExtraStackFrame(stack);
            } else {
              ReactDebugCurrentFrame$1.setExtraStackFrame(null);
            }
          }
        }
        function checkPropTypes(typeSpecs, values, location, componentName, element) {
          {
            var has = Function.call.bind(hasOwnProperty);
            for (var typeSpecName in typeSpecs) {
              if (has(typeSpecs, typeSpecName)) {
                var error$1 = void 0;
                try {
                  if (typeof typeSpecs[typeSpecName] !== "function") {
                    var err = Error((componentName || "React class") + ": " + location + " type `" + typeSpecName + "` is invalid; it must be a function, usually from the `prop-types` package, but received `" + typeof typeSpecs[typeSpecName] + "`.This often happens because of typos such as `PropTypes.function` instead of `PropTypes.func`.");
                    err.name = "Invariant Violation";
                    throw err;
                  }
                  error$1 = typeSpecs[typeSpecName](values, typeSpecName, componentName, location, null, "SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED");
                } catch (ex) {
                  error$1 = ex;
                }
                if (error$1 && !(error$1 instanceof Error)) {
                  setCurrentlyValidatingElement(element);
                  error("%s: type specification of %s `%s` is invalid; the type checker function must return `null` or an `Error` but returned a %s. You may have forgotten to pass an argument to the type checker creator (arrayOf, instanceOf, objectOf, oneOf, oneOfType, and shape all require an argument).", componentName || "React class", location, typeSpecName, typeof error$1);
                  setCurrentlyValidatingElement(null);
                }
                if (error$1 instanceof Error && !(error$1.message in loggedTypeFailures)) {
                  loggedTypeFailures[error$1.message] = true;
                  setCurrentlyValidatingElement(element);
                  error("Failed %s type: %s", location, error$1.message);
                  setCurrentlyValidatingElement(null);
                }
              }
            }
          }
        }
        function setCurrentlyValidatingElement$1(element) {
          {
            if (element) {
              var owner = element._owner;
              var stack = describeUnknownElementTypeFrameInDEV(element.type, element._source, owner ? owner.type : null);
              setExtraStackFrame(stack);
            } else {
              setExtraStackFrame(null);
            }
          }
        }
        var propTypesMisspellWarningShown;
        {
          propTypesMisspellWarningShown = false;
        }
        function getDeclarationErrorAddendum() {
          if (ReactCurrentOwner.current) {
            var name = getComponentNameFromType(ReactCurrentOwner.current.type);
            if (name) {
              return "\n\nCheck the render method of `" + name + "`.";
            }
          }
          return "";
        }
        function getSourceInfoErrorAddendum(source) {
          if (source !== void 0) {
            var fileName = source.fileName.replace(/^.*[\\\/]/, "");
            var lineNumber = source.lineNumber;
            return "\n\nCheck your code at " + fileName + ":" + lineNumber + ".";
          }
          return "";
        }
        function getSourceInfoErrorAddendumForProps(elementProps) {
          if (elementProps !== null && elementProps !== void 0) {
            return getSourceInfoErrorAddendum(elementProps.__source);
          }
          return "";
        }
        var ownerHasKeyUseWarning = {};
        function getCurrentComponentErrorInfo(parentType) {
          var info = getDeclarationErrorAddendum();
          if (!info) {
            var parentName = typeof parentType === "string" ? parentType : parentType.displayName || parentType.name;
            if (parentName) {
              info = "\n\nCheck the top-level render call using <" + parentName + ">.";
            }
          }
          return info;
        }
        function validateExplicitKey(element, parentType) {
          if (!element._store || element._store.validated || element.key != null) {
            return;
          }
          element._store.validated = true;
          var currentComponentErrorInfo = getCurrentComponentErrorInfo(parentType);
          if (ownerHasKeyUseWarning[currentComponentErrorInfo]) {
            return;
          }
          ownerHasKeyUseWarning[currentComponentErrorInfo] = true;
          var childOwner = "";
          if (element && element._owner && element._owner !== ReactCurrentOwner.current) {
            childOwner = " It was passed a child from " + getComponentNameFromType(element._owner.type) + ".";
          }
          {
            setCurrentlyValidatingElement$1(element);
            error('Each child in a list should have a unique "key" prop.%s%s See https://reactjs.org/link/warning-keys for more information.', currentComponentErrorInfo, childOwner);
            setCurrentlyValidatingElement$1(null);
          }
        }
        function validateChildKeys(node, parentType) {
          if (typeof node !== "object") {
            return;
          }
          if (isArray(node)) {
            for (var i2 = 0; i2 < node.length; i2++) {
              var child = node[i2];
              if (isValidElement(child)) {
                validateExplicitKey(child, parentType);
              }
            }
          } else if (isValidElement(node)) {
            if (node._store) {
              node._store.validated = true;
            }
          } else if (node) {
            var iteratorFn = getIteratorFn(node);
            if (typeof iteratorFn === "function") {
              if (iteratorFn !== node.entries) {
                var iterator = iteratorFn.call(node);
                var step;
                while (!(step = iterator.next()).done) {
                  if (isValidElement(step.value)) {
                    validateExplicitKey(step.value, parentType);
                  }
                }
              }
            }
          }
        }
        function validatePropTypes(element) {
          {
            var type = element.type;
            if (type === null || type === void 0 || typeof type === "string") {
              return;
            }
            var propTypes;
            if (typeof type === "function") {
              propTypes = type.propTypes;
            } else if (typeof type === "object" && (type.$$typeof === REACT_FORWARD_REF_TYPE || // Note: Memo only checks outer props here.
            // Inner props are checked in the reconciler.
            type.$$typeof === REACT_MEMO_TYPE)) {
              propTypes = type.propTypes;
            } else {
              return;
            }
            if (propTypes) {
              var name = getComponentNameFromType(type);
              checkPropTypes(propTypes, element.props, "prop", name, element);
            } else if (type.PropTypes !== void 0 && !propTypesMisspellWarningShown) {
              propTypesMisspellWarningShown = true;
              var _name = getComponentNameFromType(type);
              error("Component %s declared `PropTypes` instead of `propTypes`. Did you misspell the property assignment?", _name || "Unknown");
            }
            if (typeof type.getDefaultProps === "function" && !type.getDefaultProps.isReactClassApproved) {
              error("getDefaultProps is only used on classic React.createClass definitions. Use a static property named `defaultProps` instead.");
            }
          }
        }
        function validateFragmentProps(fragment) {
          {
            var keys = Object.keys(fragment.props);
            for (var i2 = 0; i2 < keys.length; i2++) {
              var key = keys[i2];
              if (key !== "children" && key !== "key") {
                setCurrentlyValidatingElement$1(fragment);
                error("Invalid prop `%s` supplied to `React.Fragment`. React.Fragment can only have `key` and `children` props.", key);
                setCurrentlyValidatingElement$1(null);
                break;
              }
            }
            if (fragment.ref !== null) {
              setCurrentlyValidatingElement$1(fragment);
              error("Invalid attribute `ref` supplied to `React.Fragment`.");
              setCurrentlyValidatingElement$1(null);
            }
          }
        }
        function createElementWithValidation(type, props, children) {
          var validType = isValidElementType(type);
          if (!validType) {
            var info = "";
            if (type === void 0 || typeof type === "object" && type !== null && Object.keys(type).length === 0) {
              info += " You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.";
            }
            var sourceInfo = getSourceInfoErrorAddendumForProps(props);
            if (sourceInfo) {
              info += sourceInfo;
            } else {
              info += getDeclarationErrorAddendum();
            }
            var typeString;
            if (type === null) {
              typeString = "null";
            } else if (isArray(type)) {
              typeString = "array";
            } else if (type !== void 0 && type.$$typeof === REACT_ELEMENT_TYPE) {
              typeString = "<" + (getComponentNameFromType(type.type) || "Unknown") + " />";
              info = " Did you accidentally export a JSX literal instead of a component?";
            } else {
              typeString = typeof type;
            }
            {
              error("React.createElement: type is invalid -- expected a string (for built-in components) or a class/function (for composite components) but got: %s.%s", typeString, info);
            }
          }
          var element = createElement.apply(this, arguments);
          if (element == null) {
            return element;
          }
          if (validType) {
            for (var i2 = 2; i2 < arguments.length; i2++) {
              validateChildKeys(arguments[i2], type);
            }
          }
          if (type === REACT_FRAGMENT_TYPE) {
            validateFragmentProps(element);
          } else {
            validatePropTypes(element);
          }
          return element;
        }
        var didWarnAboutDeprecatedCreateFactory = false;
        function createFactoryWithValidation(type) {
          var validatedFactory = createElementWithValidation.bind(null, type);
          validatedFactory.type = type;
          {
            if (!didWarnAboutDeprecatedCreateFactory) {
              didWarnAboutDeprecatedCreateFactory = true;
              warn("React.createFactory() is deprecated and will be removed in a future major release. Consider using JSX or use React.createElement() directly instead.");
            }
            Object.defineProperty(validatedFactory, "type", {
              enumerable: false,
              get: function() {
                warn("Factory.type is deprecated. Access the class directly before passing it to createFactory.");
                Object.defineProperty(this, "type", {
                  value: type
                });
                return type;
              }
            });
          }
          return validatedFactory;
        }
        function cloneElementWithValidation(element, props, children) {
          var newElement = cloneElement.apply(this, arguments);
          for (var i2 = 2; i2 < arguments.length; i2++) {
            validateChildKeys(arguments[i2], newElement.type);
          }
          validatePropTypes(newElement);
          return newElement;
        }
        function startTransition(scope, options) {
          var prevTransition = ReactCurrentBatchConfig.transition;
          ReactCurrentBatchConfig.transition = {};
          var currentTransition = ReactCurrentBatchConfig.transition;
          {
            ReactCurrentBatchConfig.transition._updatedFibers = /* @__PURE__ */ new Set();
          }
          try {
            scope();
          } finally {
            ReactCurrentBatchConfig.transition = prevTransition;
            {
              if (prevTransition === null && currentTransition._updatedFibers) {
                var updatedFibersCount = currentTransition._updatedFibers.size;
                if (updatedFibersCount > 10) {
                  warn("Detected a large number of updates inside startTransition. If this is due to a subscription please re-write it to use React provided hooks. Otherwise concurrent mode guarantees are off the table.");
                }
                currentTransition._updatedFibers.clear();
              }
            }
          }
        }
        var didWarnAboutMessageChannel = false;
        var enqueueTaskImpl = null;
        function enqueueTask(task) {
          if (enqueueTaskImpl === null) {
            try {
              var requireString = ("require" + Math.random()).slice(0, 7);
              var nodeRequire = module2 && module2[requireString];
              enqueueTaskImpl = nodeRequire.call(module2, "timers").setImmediate;
            } catch (_err) {
              enqueueTaskImpl = function(callback) {
                {
                  if (didWarnAboutMessageChannel === false) {
                    didWarnAboutMessageChannel = true;
                    if (typeof MessageChannel === "undefined") {
                      error("This browser does not have a MessageChannel implementation, so enqueuing tasks via await act(async () => ...) will fail. Please file an issue at https://github.com/facebook/react/issues if you encounter this warning.");
                    }
                  }
                }
                var channel = new MessageChannel();
                channel.port1.onmessage = callback;
                channel.port2.postMessage(void 0);
              };
            }
          }
          return enqueueTaskImpl(task);
        }
        var actScopeDepth = 0;
        var didWarnNoAwaitAct = false;
        function act(callback) {
          {
            var prevActScopeDepth = actScopeDepth;
            actScopeDepth++;
            if (ReactCurrentActQueue.current === null) {
              ReactCurrentActQueue.current = [];
            }
            var prevIsBatchingLegacy = ReactCurrentActQueue.isBatchingLegacy;
            var result;
            try {
              ReactCurrentActQueue.isBatchingLegacy = true;
              result = callback();
              if (!prevIsBatchingLegacy && ReactCurrentActQueue.didScheduleLegacyUpdate) {
                var queue = ReactCurrentActQueue.current;
                if (queue !== null) {
                  ReactCurrentActQueue.didScheduleLegacyUpdate = false;
                  flushActQueue(queue);
                }
              }
            } catch (error2) {
              popActScope(prevActScopeDepth);
              throw error2;
            } finally {
              ReactCurrentActQueue.isBatchingLegacy = prevIsBatchingLegacy;
            }
            if (result !== null && typeof result === "object" && typeof result.then === "function") {
              var thenableResult = result;
              var wasAwaited = false;
              var thenable = {
                then: function(resolve, reject) {
                  wasAwaited = true;
                  thenableResult.then(function(returnValue2) {
                    popActScope(prevActScopeDepth);
                    if (actScopeDepth === 0) {
                      recursivelyFlushAsyncActWork(returnValue2, resolve, reject);
                    } else {
                      resolve(returnValue2);
                    }
                  }, function(error2) {
                    popActScope(prevActScopeDepth);
                    reject(error2);
                  });
                }
              };
              {
                if (!didWarnNoAwaitAct && typeof Promise !== "undefined") {
                  Promise.resolve().then(function() {
                  }).then(function() {
                    if (!wasAwaited) {
                      didWarnNoAwaitAct = true;
                      error("You called act(async () => ...) without await. This could lead to unexpected testing behaviour, interleaving multiple act calls and mixing their scopes. You should - await act(async () => ...);");
                    }
                  });
                }
              }
              return thenable;
            } else {
              var returnValue = result;
              popActScope(prevActScopeDepth);
              if (actScopeDepth === 0) {
                var _queue = ReactCurrentActQueue.current;
                if (_queue !== null) {
                  flushActQueue(_queue);
                  ReactCurrentActQueue.current = null;
                }
                var _thenable = {
                  then: function(resolve, reject) {
                    if (ReactCurrentActQueue.current === null) {
                      ReactCurrentActQueue.current = [];
                      recursivelyFlushAsyncActWork(returnValue, resolve, reject);
                    } else {
                      resolve(returnValue);
                    }
                  }
                };
                return _thenable;
              } else {
                var _thenable2 = {
                  then: function(resolve, reject) {
                    resolve(returnValue);
                  }
                };
                return _thenable2;
              }
            }
          }
        }
        function popActScope(prevActScopeDepth) {
          {
            if (prevActScopeDepth !== actScopeDepth - 1) {
              error("You seem to have overlapping act() calls, this is not supported. Be sure to await previous act() calls before making a new one. ");
            }
            actScopeDepth = prevActScopeDepth;
          }
        }
        function recursivelyFlushAsyncActWork(returnValue, resolve, reject) {
          {
            var queue = ReactCurrentActQueue.current;
            if (queue !== null) {
              try {
                flushActQueue(queue);
                enqueueTask(function() {
                  if (queue.length === 0) {
                    ReactCurrentActQueue.current = null;
                    resolve(returnValue);
                  } else {
                    recursivelyFlushAsyncActWork(returnValue, resolve, reject);
                  }
                });
              } catch (error2) {
                reject(error2);
              }
            } else {
              resolve(returnValue);
            }
          }
        }
        var isFlushing = false;
        function flushActQueue(queue) {
          {
            if (!isFlushing) {
              isFlushing = true;
              var i2 = 0;
              try {
                for (; i2 < queue.length; i2++) {
                  var callback = queue[i2];
                  do {
                    callback = callback(true);
                  } while (callback !== null);
                }
                queue.length = 0;
              } catch (error2) {
                queue = queue.slice(i2 + 1);
                throw error2;
              } finally {
                isFlushing = false;
              }
            }
          }
        }
        var createElement$1 = createElementWithValidation;
        var cloneElement$1 = cloneElementWithValidation;
        var createFactory = createFactoryWithValidation;
        var Children = {
          map: mapChildren,
          forEach: forEachChildren,
          count: countChildren,
          toArray,
          only: onlyChild
        };
        exports.Children = Children;
        exports.Component = Component;
        exports.Fragment = REACT_FRAGMENT_TYPE;
        exports.Profiler = REACT_PROFILER_TYPE;
        exports.PureComponent = PureComponent;
        exports.StrictMode = REACT_STRICT_MODE_TYPE;
        exports.Suspense = REACT_SUSPENSE_TYPE;
        exports.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = ReactSharedInternals;
        exports.cloneElement = cloneElement$1;
        exports.createContext = createContext;
        exports.createElement = createElement$1;
        exports.createFactory = createFactory;
        exports.createRef = createRef;
        exports.forwardRef = forwardRef;
        exports.isValidElement = isValidElement;
        exports.lazy = lazy;
        exports.memo = memo;
        exports.startTransition = startTransition;
        exports.unstable_act = act;
        exports.useCallback = useCallback;
        exports.useContext = useContext;
        exports.useDebugValue = useDebugValue;
        exports.useDeferredValue = useDeferredValue;
        exports.useEffect = useEffect;
        exports.useId = useId;
        exports.useImperativeHandle = useImperativeHandle;
        exports.useInsertionEffect = useInsertionEffect;
        exports.useLayoutEffect = useLayoutEffect;
        exports.useMemo = useMemo;
        exports.useReducer = useReducer;
        exports.useRef = useRef;
        exports.useState = useState;
        exports.useSyncExternalStore = useSyncExternalStore;
        exports.useTransition = useTransition;
        exports.version = ReactVersion;
        if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ !== "undefined" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop === "function") {
          __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(new Error());
        }
      })();
    }
  }
});

// ../../node_modules/react/index.js
var require_react = __commonJS({
  "../../node_modules/react/index.js"(exports, module2) {
    "use strict";
    if (process.env.NODE_ENV === "production") {
      module2.exports = require_react_production_min();
    } else {
      module2.exports = require_react_development();
    }
  }
});

// ../../node_modules/shallowequal/index.js
var require_shallowequal = __commonJS({
  "../../node_modules/shallowequal/index.js"(exports, module2) {
    module2.exports = function shallowEqual(objA, objB, compare, compareContext) {
      var ret = compare ? compare.call(compareContext, objA, objB) : void 0;
      if (ret !== void 0) {
        return !!ret;
      }
      if (objA === objB) {
        return true;
      }
      if (typeof objA !== "object" || !objA || typeof objB !== "object" || !objB) {
        return false;
      }
      var keysA = Object.keys(objA);
      var keysB = Object.keys(objB);
      if (keysA.length !== keysB.length) {
        return false;
      }
      var bHasOwnProperty = Object.prototype.hasOwnProperty.bind(objB);
      for (var idx = 0; idx < keysA.length; idx++) {
        var key = keysA[idx];
        if (!bHasOwnProperty(key)) {
          return false;
        }
        var valueA = objA[key];
        var valueB = objB[key];
        ret = compare ? compare.call(compareContext, valueA, valueB, key) : void 0;
        if (ret === false || ret === void 0 && valueA !== valueB) {
          return false;
        }
      }
      return true;
    };
  }
});

// ../../node_modules/@emotion/stylis/dist/stylis.esm.js
function stylis_min(W2) {
  function M2(d, c2, e2, h, a2) {
    for (var m2 = 0, b2 = 0, v2 = 0, n2 = 0, q2, g2, x2 = 0, K2 = 0, k2, u2 = k2 = q2 = 0, l2 = 0, r2 = 0, I2 = 0, t2 = 0, B3 = e2.length, J2 = B3 - 1, y2, f2 = "", p = "", F3 = "", G3 = "", C2; l2 < B3; ) {
      g2 = e2.charCodeAt(l2);
      l2 === J2 && 0 !== b2 + n2 + v2 + m2 && (0 !== b2 && (g2 = 47 === b2 ? 10 : 47), n2 = v2 = m2 = 0, B3++, J2++);
      if (0 === b2 + n2 + v2 + m2) {
        if (l2 === J2 && (0 < r2 && (f2 = f2.replace(N2, "")), 0 < f2.trim().length)) {
          switch (g2) {
            case 32:
            case 9:
            case 59:
            case 13:
            case 10:
              break;
            default:
              f2 += e2.charAt(l2);
          }
          g2 = 59;
        }
        switch (g2) {
          case 123:
            f2 = f2.trim();
            q2 = f2.charCodeAt(0);
            k2 = 1;
            for (t2 = ++l2; l2 < B3; ) {
              switch (g2 = e2.charCodeAt(l2)) {
                case 123:
                  k2++;
                  break;
                case 125:
                  k2--;
                  break;
                case 47:
                  switch (g2 = e2.charCodeAt(l2 + 1)) {
                    case 42:
                    case 47:
                      a: {
                        for (u2 = l2 + 1; u2 < J2; ++u2) {
                          switch (e2.charCodeAt(u2)) {
                            case 47:
                              if (42 === g2 && 42 === e2.charCodeAt(u2 - 1) && l2 + 2 !== u2) {
                                l2 = u2 + 1;
                                break a;
                              }
                              break;
                            case 10:
                              if (47 === g2) {
                                l2 = u2 + 1;
                                break a;
                              }
                          }
                        }
                        l2 = u2;
                      }
                  }
                  break;
                case 91:
                  g2++;
                case 40:
                  g2++;
                case 34:
                case 39:
                  for (; l2++ < J2 && e2.charCodeAt(l2) !== g2; ) {
                  }
              }
              if (0 === k2)
                break;
              l2++;
            }
            k2 = e2.substring(t2, l2);
            0 === q2 && (q2 = (f2 = f2.replace(ca, "").trim()).charCodeAt(0));
            switch (q2) {
              case 64:
                0 < r2 && (f2 = f2.replace(N2, ""));
                g2 = f2.charCodeAt(1);
                switch (g2) {
                  case 100:
                  case 109:
                  case 115:
                  case 45:
                    r2 = c2;
                    break;
                  default:
                    r2 = O2;
                }
                k2 = M2(c2, r2, k2, g2, a2 + 1);
                t2 = k2.length;
                0 < A2 && (r2 = X2(O2, f2, I2), C2 = H2(3, k2, r2, c2, D2, z2, t2, g2, a2, h), f2 = r2.join(""), void 0 !== C2 && 0 === (t2 = (k2 = C2.trim()).length) && (g2 = 0, k2 = ""));
                if (0 < t2)
                  switch (g2) {
                    case 115:
                      f2 = f2.replace(da, ea);
                    case 100:
                    case 109:
                    case 45:
                      k2 = f2 + "{" + k2 + "}";
                      break;
                    case 107:
                      f2 = f2.replace(fa, "$1 $2");
                      k2 = f2 + "{" + k2 + "}";
                      k2 = 1 === w2 || 2 === w2 && L2("@" + k2, 3) ? "@-webkit-" + k2 + "@" + k2 : "@" + k2;
                      break;
                    default:
                      k2 = f2 + k2, 112 === h && (k2 = (p += k2, ""));
                  }
                else
                  k2 = "";
                break;
              default:
                k2 = M2(c2, X2(c2, f2, I2), k2, h, a2 + 1);
            }
            F3 += k2;
            k2 = I2 = r2 = u2 = q2 = 0;
            f2 = "";
            g2 = e2.charCodeAt(++l2);
            break;
          case 125:
          case 59:
            f2 = (0 < r2 ? f2.replace(N2, "") : f2).trim();
            if (1 < (t2 = f2.length))
              switch (0 === u2 && (q2 = f2.charCodeAt(0), 45 === q2 || 96 < q2 && 123 > q2) && (t2 = (f2 = f2.replace(" ", ":")).length), 0 < A2 && void 0 !== (C2 = H2(1, f2, c2, d, D2, z2, p.length, h, a2, h)) && 0 === (t2 = (f2 = C2.trim()).length) && (f2 = "\0\0"), q2 = f2.charCodeAt(0), g2 = f2.charCodeAt(1), q2) {
                case 0:
                  break;
                case 64:
                  if (105 === g2 || 99 === g2) {
                    G3 += f2 + e2.charAt(l2);
                    break;
                  }
                default:
                  58 !== f2.charCodeAt(t2 - 1) && (p += P2(f2, q2, g2, f2.charCodeAt(2)));
              }
            I2 = r2 = u2 = q2 = 0;
            f2 = "";
            g2 = e2.charCodeAt(++l2);
        }
      }
      switch (g2) {
        case 13:
        case 10:
          47 === b2 ? b2 = 0 : 0 === 1 + q2 && 107 !== h && 0 < f2.length && (r2 = 1, f2 += "\0");
          0 < A2 * Y2 && H2(0, f2, c2, d, D2, z2, p.length, h, a2, h);
          z2 = 1;
          D2++;
          break;
        case 59:
        case 125:
          if (0 === b2 + n2 + v2 + m2) {
            z2++;
            break;
          }
        default:
          z2++;
          y2 = e2.charAt(l2);
          switch (g2) {
            case 9:
            case 32:
              if (0 === n2 + m2 + b2)
                switch (x2) {
                  case 44:
                  case 58:
                  case 9:
                  case 32:
                    y2 = "";
                    break;
                  default:
                    32 !== g2 && (y2 = " ");
                }
              break;
            case 0:
              y2 = "\\0";
              break;
            case 12:
              y2 = "\\f";
              break;
            case 11:
              y2 = "\\v";
              break;
            case 38:
              0 === n2 + b2 + m2 && (r2 = I2 = 1, y2 = "\f" + y2);
              break;
            case 108:
              if (0 === n2 + b2 + m2 + E2 && 0 < u2)
                switch (l2 - u2) {
                  case 2:
                    112 === x2 && 58 === e2.charCodeAt(l2 - 3) && (E2 = x2);
                  case 8:
                    111 === K2 && (E2 = K2);
                }
              break;
            case 58:
              0 === n2 + b2 + m2 && (u2 = l2);
              break;
            case 44:
              0 === b2 + v2 + n2 + m2 && (r2 = 1, y2 += "\r");
              break;
            case 34:
            case 39:
              0 === b2 && (n2 = n2 === g2 ? 0 : 0 === n2 ? g2 : n2);
              break;
            case 91:
              0 === n2 + b2 + v2 && m2++;
              break;
            case 93:
              0 === n2 + b2 + v2 && m2--;
              break;
            case 41:
              0 === n2 + b2 + m2 && v2--;
              break;
            case 40:
              if (0 === n2 + b2 + m2) {
                if (0 === q2)
                  switch (2 * x2 + 3 * K2) {
                    case 533:
                      break;
                    default:
                      q2 = 1;
                  }
                v2++;
              }
              break;
            case 64:
              0 === b2 + v2 + n2 + m2 + u2 + k2 && (k2 = 1);
              break;
            case 42:
            case 47:
              if (!(0 < n2 + m2 + v2))
                switch (b2) {
                  case 0:
                    switch (2 * g2 + 3 * e2.charCodeAt(l2 + 1)) {
                      case 235:
                        b2 = 47;
                        break;
                      case 220:
                        t2 = l2, b2 = 42;
                    }
                    break;
                  case 42:
                    47 === g2 && 42 === x2 && t2 + 2 !== l2 && (33 === e2.charCodeAt(t2 + 2) && (p += e2.substring(t2, l2 + 1)), y2 = "", b2 = 0);
                }
          }
          0 === b2 && (f2 += y2);
      }
      K2 = x2;
      x2 = g2;
      l2++;
    }
    t2 = p.length;
    if (0 < t2) {
      r2 = c2;
      if (0 < A2 && (C2 = H2(2, p, r2, d, D2, z2, t2, h, a2, h), void 0 !== C2 && 0 === (p = C2).length))
        return G3 + p + F3;
      p = r2.join(",") + "{" + p + "}";
      if (0 !== w2 * E2) {
        2 !== w2 || L2(p, 2) || (E2 = 0);
        switch (E2) {
          case 111:
            p = p.replace(ha, ":-moz-$1") + p;
            break;
          case 112:
            p = p.replace(Q2, "::-webkit-input-$1") + p.replace(Q2, "::-moz-$1") + p.replace(Q2, ":-ms-input-$1") + p;
        }
        E2 = 0;
      }
    }
    return G3 + p + F3;
  }
  function X2(d, c2, e2) {
    var h = c2.trim().split(ia);
    c2 = h;
    var a2 = h.length, m2 = d.length;
    switch (m2) {
      case 0:
      case 1:
        var b2 = 0;
        for (d = 0 === m2 ? "" : d[0] + " "; b2 < a2; ++b2) {
          c2[b2] = Z2(d, c2[b2], e2).trim();
        }
        break;
      default:
        var v2 = b2 = 0;
        for (c2 = []; b2 < a2; ++b2) {
          for (var n2 = 0; n2 < m2; ++n2) {
            c2[v2++] = Z2(d[n2] + " ", h[b2], e2).trim();
          }
        }
    }
    return c2;
  }
  function Z2(d, c2, e2) {
    var h = c2.charCodeAt(0);
    33 > h && (h = (c2 = c2.trim()).charCodeAt(0));
    switch (h) {
      case 38:
        return c2.replace(F2, "$1" + d.trim());
      case 58:
        return d.trim() + c2.replace(F2, "$1" + d.trim());
      default:
        if (0 < 1 * e2 && 0 < c2.indexOf("\f"))
          return c2.replace(F2, (58 === d.charCodeAt(0) ? "" : "$1") + d.trim());
    }
    return d + c2;
  }
  function P2(d, c2, e2, h) {
    var a2 = d + ";", m2 = 2 * c2 + 3 * e2 + 4 * h;
    if (944 === m2) {
      d = a2.indexOf(":", 9) + 1;
      var b2 = a2.substring(d, a2.length - 1).trim();
      b2 = a2.substring(0, d).trim() + b2 + ";";
      return 1 === w2 || 2 === w2 && L2(b2, 1) ? "-webkit-" + b2 + b2 : b2;
    }
    if (0 === w2 || 2 === w2 && !L2(a2, 1))
      return a2;
    switch (m2) {
      case 1015:
        return 97 === a2.charCodeAt(10) ? "-webkit-" + a2 + a2 : a2;
      case 951:
        return 116 === a2.charCodeAt(3) ? "-webkit-" + a2 + a2 : a2;
      case 963:
        return 110 === a2.charCodeAt(5) ? "-webkit-" + a2 + a2 : a2;
      case 1009:
        if (100 !== a2.charCodeAt(4))
          break;
      case 969:
      case 942:
        return "-webkit-" + a2 + a2;
      case 978:
        return "-webkit-" + a2 + "-moz-" + a2 + a2;
      case 1019:
      case 983:
        return "-webkit-" + a2 + "-moz-" + a2 + "-ms-" + a2 + a2;
      case 883:
        if (45 === a2.charCodeAt(8))
          return "-webkit-" + a2 + a2;
        if (0 < a2.indexOf("image-set(", 11))
          return a2.replace(ja, "$1-webkit-$2") + a2;
        break;
      case 932:
        if (45 === a2.charCodeAt(4))
          switch (a2.charCodeAt(5)) {
            case 103:
              return "-webkit-box-" + a2.replace("-grow", "") + "-webkit-" + a2 + "-ms-" + a2.replace("grow", "positive") + a2;
            case 115:
              return "-webkit-" + a2 + "-ms-" + a2.replace("shrink", "negative") + a2;
            case 98:
              return "-webkit-" + a2 + "-ms-" + a2.replace("basis", "preferred-size") + a2;
          }
        return "-webkit-" + a2 + "-ms-" + a2 + a2;
      case 964:
        return "-webkit-" + a2 + "-ms-flex-" + a2 + a2;
      case 1023:
        if (99 !== a2.charCodeAt(8))
          break;
        b2 = a2.substring(a2.indexOf(":", 15)).replace("flex-", "").replace("space-between", "justify");
        return "-webkit-box-pack" + b2 + "-webkit-" + a2 + "-ms-flex-pack" + b2 + a2;
      case 1005:
        return ka.test(a2) ? a2.replace(aa, ":-webkit-") + a2.replace(aa, ":-moz-") + a2 : a2;
      case 1e3:
        b2 = a2.substring(13).trim();
        c2 = b2.indexOf("-") + 1;
        switch (b2.charCodeAt(0) + b2.charCodeAt(c2)) {
          case 226:
            b2 = a2.replace(G2, "tb");
            break;
          case 232:
            b2 = a2.replace(G2, "tb-rl");
            break;
          case 220:
            b2 = a2.replace(G2, "lr");
            break;
          default:
            return a2;
        }
        return "-webkit-" + a2 + "-ms-" + b2 + a2;
      case 1017:
        if (-1 === a2.indexOf("sticky", 9))
          break;
      case 975:
        c2 = (a2 = d).length - 10;
        b2 = (33 === a2.charCodeAt(c2) ? a2.substring(0, c2) : a2).substring(d.indexOf(":", 7) + 1).trim();
        switch (m2 = b2.charCodeAt(0) + (b2.charCodeAt(7) | 0)) {
          case 203:
            if (111 > b2.charCodeAt(8))
              break;
          case 115:
            a2 = a2.replace(b2, "-webkit-" + b2) + ";" + a2;
            break;
          case 207:
          case 102:
            a2 = a2.replace(b2, "-webkit-" + (102 < m2 ? "inline-" : "") + "box") + ";" + a2.replace(b2, "-webkit-" + b2) + ";" + a2.replace(b2, "-ms-" + b2 + "box") + ";" + a2;
        }
        return a2 + ";";
      case 938:
        if (45 === a2.charCodeAt(5))
          switch (a2.charCodeAt(6)) {
            case 105:
              return b2 = a2.replace("-items", ""), "-webkit-" + a2 + "-webkit-box-" + b2 + "-ms-flex-" + b2 + a2;
            case 115:
              return "-webkit-" + a2 + "-ms-flex-item-" + a2.replace(ba, "") + a2;
            default:
              return "-webkit-" + a2 + "-ms-flex-line-pack" + a2.replace("align-content", "").replace(ba, "") + a2;
          }
        break;
      case 973:
      case 989:
        if (45 !== a2.charCodeAt(3) || 122 === a2.charCodeAt(4))
          break;
      case 931:
      case 953:
        if (true === la.test(d))
          return 115 === (b2 = d.substring(d.indexOf(":") + 1)).charCodeAt(0) ? P2(d.replace("stretch", "fill-available"), c2, e2, h).replace(":fill-available", ":stretch") : a2.replace(b2, "-webkit-" + b2) + a2.replace(b2, "-moz-" + b2.replace("fill-", "")) + a2;
        break;
      case 962:
        if (a2 = "-webkit-" + a2 + (102 === a2.charCodeAt(5) ? "-ms-" + a2 : "") + a2, 211 === e2 + h && 105 === a2.charCodeAt(13) && 0 < a2.indexOf("transform", 10))
          return a2.substring(0, a2.indexOf(";", 27) + 1).replace(ma, "$1-webkit-$2") + a2;
    }
    return a2;
  }
  function L2(d, c2) {
    var e2 = d.indexOf(1 === c2 ? ":" : "{"), h = d.substring(0, 3 !== c2 ? e2 : 10);
    e2 = d.substring(e2 + 1, d.length - 1);
    return R2(2 !== c2 ? h : h.replace(na, "$1"), e2, c2);
  }
  function ea(d, c2) {
    var e2 = P2(c2, c2.charCodeAt(0), c2.charCodeAt(1), c2.charCodeAt(2));
    return e2 !== c2 + ";" ? e2.replace(oa, " or ($1)").substring(4) : "(" + c2 + ")";
  }
  function H2(d, c2, e2, h, a2, m2, b2, v2, n2, q2) {
    for (var g2 = 0, x2 = c2, w3; g2 < A2; ++g2) {
      switch (w3 = S2[g2].call(B2, d, x2, e2, h, a2, m2, b2, v2, n2, q2)) {
        case void 0:
        case false:
        case true:
        case null:
          break;
        default:
          x2 = w3;
      }
    }
    if (x2 !== c2)
      return x2;
  }
  function T2(d) {
    switch (d) {
      case void 0:
      case null:
        A2 = S2.length = 0;
        break;
      default:
        if ("function" === typeof d)
          S2[A2++] = d;
        else if ("object" === typeof d)
          for (var c2 = 0, e2 = d.length; c2 < e2; ++c2) {
            T2(d[c2]);
          }
        else
          Y2 = !!d | 0;
    }
    return T2;
  }
  function U2(d) {
    d = d.prefix;
    void 0 !== d && (R2 = null, d ? "function" !== typeof d ? w2 = 1 : (w2 = 2, R2 = d) : w2 = 0);
    return U2;
  }
  function B2(d, c2) {
    var e2 = d;
    33 > e2.charCodeAt(0) && (e2 = e2.trim());
    V2 = e2;
    e2 = [V2];
    if (0 < A2) {
      var h = H2(-1, c2, e2, e2, D2, z2, 0, 0, 0, 0);
      void 0 !== h && "string" === typeof h && (c2 = h);
    }
    var a2 = M2(O2, e2, c2, 0, 0);
    0 < A2 && (h = H2(-2, a2, e2, e2, D2, z2, a2.length, 0, 0, 0), void 0 !== h && (a2 = h));
    V2 = "";
    E2 = 0;
    z2 = D2 = 1;
    return a2;
  }
  var ca = /^\0+/g, N2 = /[\0\r\f]/g, aa = /: */g, ka = /zoo|gra/, ma = /([,: ])(transform)/g, ia = /,\r+?/g, F2 = /([\t\r\n ])*\f?&/g, fa = /@(k\w+)\s*(\S*)\s*/, Q2 = /::(place)/g, ha = /:(read-only)/g, G2 = /[svh]\w+-[tblr]{2}/, da = /\(\s*(.*)\s*\)/g, oa = /([\s\S]*?);/g, ba = /-self|flex-/g, na = /[^]*?(:[rp][el]a[\w-]+)[^]*/, la = /stretch|:\s*\w+\-(?:conte|avail)/, ja = /([^-])(image-set\()/, z2 = 1, D2 = 1, E2 = 0, w2 = 1, O2 = [], S2 = [], A2 = 0, R2 = null, Y2 = 0, V2 = "";
  B2.use = T2;
  B2.set = U2;
  void 0 !== W2 && U2(W2);
  return B2;
}
var stylis_esm_default;
var init_stylis_esm = __esm({
  "../../node_modules/@emotion/stylis/dist/stylis.esm.js"() {
    stylis_esm_default = stylis_min;
  }
});

// ../../node_modules/@emotion/unitless/dist/unitless.esm.js
var unitlessKeys, unitless_esm_default;
var init_unitless_esm = __esm({
  "../../node_modules/@emotion/unitless/dist/unitless.esm.js"() {
    unitlessKeys = {
      animationIterationCount: 1,
      borderImageOutset: 1,
      borderImageSlice: 1,
      borderImageWidth: 1,
      boxFlex: 1,
      boxFlexGroup: 1,
      boxOrdinalGroup: 1,
      columnCount: 1,
      columns: 1,
      flex: 1,
      flexGrow: 1,
      flexPositive: 1,
      flexShrink: 1,
      flexNegative: 1,
      flexOrder: 1,
      gridRow: 1,
      gridRowEnd: 1,
      gridRowSpan: 1,
      gridRowStart: 1,
      gridColumn: 1,
      gridColumnEnd: 1,
      gridColumnSpan: 1,
      gridColumnStart: 1,
      msGridRow: 1,
      msGridRowSpan: 1,
      msGridColumn: 1,
      msGridColumnSpan: 1,
      fontWeight: 1,
      lineHeight: 1,
      opacity: 1,
      order: 1,
      orphans: 1,
      tabSize: 1,
      widows: 1,
      zIndex: 1,
      zoom: 1,
      WebkitLineClamp: 1,
      // SVG-related properties
      fillOpacity: 1,
      floodOpacity: 1,
      stopOpacity: 1,
      strokeDasharray: 1,
      strokeDashoffset: 1,
      strokeMiterlimit: 1,
      strokeOpacity: 1,
      strokeWidth: 1
    };
    unitless_esm_default = unitlessKeys;
  }
});

// ../../node_modules/@emotion/memoize/dist/emotion-memoize.esm.js
function memoize(fn) {
  var cache = /* @__PURE__ */ Object.create(null);
  return function(arg) {
    if (cache[arg] === void 0)
      cache[arg] = fn(arg);
    return cache[arg];
  };
}
var init_emotion_memoize_esm = __esm({
  "../../node_modules/@emotion/memoize/dist/emotion-memoize.esm.js"() {
  }
});

// ../../node_modules/@emotion/is-prop-valid/dist/emotion-is-prop-valid.esm.js
var reactPropsRegex, isPropValid;
var init_emotion_is_prop_valid_esm = __esm({
  "../../node_modules/@emotion/is-prop-valid/dist/emotion-is-prop-valid.esm.js"() {
    init_emotion_memoize_esm();
    reactPropsRegex = /^((children|dangerouslySetInnerHTML|key|ref|autoFocus|defaultValue|defaultChecked|innerHTML|suppressContentEditableWarning|suppressHydrationWarning|valueLink|abbr|accept|acceptCharset|accessKey|action|allow|allowUserMedia|allowPaymentRequest|allowFullScreen|allowTransparency|alt|async|autoComplete|autoPlay|capture|cellPadding|cellSpacing|challenge|charSet|checked|cite|classID|className|cols|colSpan|content|contentEditable|contextMenu|controls|controlsList|coords|crossOrigin|data|dateTime|decoding|default|defer|dir|disabled|disablePictureInPicture|download|draggable|encType|enterKeyHint|form|formAction|formEncType|formMethod|formNoValidate|formTarget|frameBorder|headers|height|hidden|high|href|hrefLang|htmlFor|httpEquiv|id|inputMode|integrity|is|keyParams|keyType|kind|label|lang|list|loading|loop|low|marginHeight|marginWidth|max|maxLength|media|mediaGroup|method|min|minLength|multiple|muted|name|nonce|noValidate|open|optimum|pattern|placeholder|playsInline|poster|preload|profile|radioGroup|readOnly|referrerPolicy|rel|required|reversed|role|rows|rowSpan|sandbox|scope|scoped|scrolling|seamless|selected|shape|size|sizes|slot|span|spellCheck|src|srcDoc|srcLang|srcSet|start|step|style|summary|tabIndex|target|title|translate|type|useMap|value|width|wmode|wrap|about|datatype|inlist|prefix|property|resource|typeof|vocab|autoCapitalize|autoCorrect|autoSave|color|incremental|fallback|inert|itemProp|itemScope|itemType|itemID|itemRef|on|option|results|security|unselectable|accentHeight|accumulate|additive|alignmentBaseline|allowReorder|alphabetic|amplitude|arabicForm|ascent|attributeName|attributeType|autoReverse|azimuth|baseFrequency|baselineShift|baseProfile|bbox|begin|bias|by|calcMode|capHeight|clip|clipPathUnits|clipPath|clipRule|colorInterpolation|colorInterpolationFilters|colorProfile|colorRendering|contentScriptType|contentStyleType|cursor|cx|cy|d|decelerate|descent|diffuseConstant|direction|display|divisor|dominantBaseline|dur|dx|dy|edgeMode|elevation|enableBackground|end|exponent|externalResourcesRequired|fill|fillOpacity|fillRule|filter|filterRes|filterUnits|floodColor|floodOpacity|focusable|fontFamily|fontSize|fontSizeAdjust|fontStretch|fontStyle|fontVariant|fontWeight|format|from|fr|fx|fy|g1|g2|glyphName|glyphOrientationHorizontal|glyphOrientationVertical|glyphRef|gradientTransform|gradientUnits|hanging|horizAdvX|horizOriginX|ideographic|imageRendering|in|in2|intercept|k|k1|k2|k3|k4|kernelMatrix|kernelUnitLength|kerning|keyPoints|keySplines|keyTimes|lengthAdjust|letterSpacing|lightingColor|limitingConeAngle|local|markerEnd|markerMid|markerStart|markerHeight|markerUnits|markerWidth|mask|maskContentUnits|maskUnits|mathematical|mode|numOctaves|offset|opacity|operator|order|orient|orientation|origin|overflow|overlinePosition|overlineThickness|panose1|paintOrder|pathLength|patternContentUnits|patternTransform|patternUnits|pointerEvents|points|pointsAtX|pointsAtY|pointsAtZ|preserveAlpha|preserveAspectRatio|primitiveUnits|r|radius|refX|refY|renderingIntent|repeatCount|repeatDur|requiredExtensions|requiredFeatures|restart|result|rotate|rx|ry|scale|seed|shapeRendering|slope|spacing|specularConstant|specularExponent|speed|spreadMethod|startOffset|stdDeviation|stemh|stemv|stitchTiles|stopColor|stopOpacity|strikethroughPosition|strikethroughThickness|string|stroke|strokeDasharray|strokeDashoffset|strokeLinecap|strokeLinejoin|strokeMiterlimit|strokeOpacity|strokeWidth|surfaceScale|systemLanguage|tableValues|targetX|targetY|textAnchor|textDecoration|textRendering|textLength|to|transform|u1|u2|underlinePosition|underlineThickness|unicode|unicodeBidi|unicodeRange|unitsPerEm|vAlphabetic|vHanging|vIdeographic|vMathematical|values|vectorEffect|version|vertAdvY|vertOriginX|vertOriginY|viewBox|viewTarget|visibility|widths|wordSpacing|writingMode|x|xHeight|x1|x2|xChannelSelector|xlinkActuate|xlinkArcrole|xlinkHref|xlinkRole|xlinkShow|xlinkTitle|xlinkType|xmlBase|xmlns|xmlnsXlink|xmlLang|xmlSpace|y|y1|y2|yChannelSelector|z|zoomAndPan|for|class|autofocus)|(([Dd][Aa][Tt][Aa]|[Aa][Rr][Ii][Aa]|x)-.*))$/;
    isPropValid = /* @__PURE__ */ memoize(
      function(prop) {
        return reactPropsRegex.test(prop) || prop.charCodeAt(0) === 111 && prop.charCodeAt(1) === 110 && prop.charCodeAt(2) < 91;
      }
      /* Z+1 */
    );
  }
});

// ../../node_modules/hoist-non-react-statics/dist/hoist-non-react-statics.cjs.js
var require_hoist_non_react_statics_cjs = __commonJS({
  "../../node_modules/hoist-non-react-statics/dist/hoist-non-react-statics.cjs.js"(exports, module2) {
    "use strict";
    var reactIs = require_react_is();
    var REACT_STATICS = {
      childContextTypes: true,
      contextType: true,
      contextTypes: true,
      defaultProps: true,
      displayName: true,
      getDefaultProps: true,
      getDerivedStateFromError: true,
      getDerivedStateFromProps: true,
      mixins: true,
      propTypes: true,
      type: true
    };
    var KNOWN_STATICS = {
      name: true,
      length: true,
      prototype: true,
      caller: true,
      callee: true,
      arguments: true,
      arity: true
    };
    var FORWARD_REF_STATICS = {
      "$$typeof": true,
      render: true,
      defaultProps: true,
      displayName: true,
      propTypes: true
    };
    var MEMO_STATICS = {
      "$$typeof": true,
      compare: true,
      defaultProps: true,
      displayName: true,
      propTypes: true,
      type: true
    };
    var TYPE_STATICS = {};
    TYPE_STATICS[reactIs.ForwardRef] = FORWARD_REF_STATICS;
    TYPE_STATICS[reactIs.Memo] = MEMO_STATICS;
    function getStatics(component) {
      if (reactIs.isMemo(component)) {
        return MEMO_STATICS;
      }
      return TYPE_STATICS[component["$$typeof"]] || REACT_STATICS;
    }
    var defineProperty = Object.defineProperty;
    var getOwnPropertyNames = Object.getOwnPropertyNames;
    var getOwnPropertySymbols = Object.getOwnPropertySymbols;
    var getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
    var getPrototypeOf = Object.getPrototypeOf;
    var objectPrototype = Object.prototype;
    function hoistNonReactStatics(targetComponent, sourceComponent, blacklist) {
      if (typeof sourceComponent !== "string") {
        if (objectPrototype) {
          var inheritedComponent = getPrototypeOf(sourceComponent);
          if (inheritedComponent && inheritedComponent !== objectPrototype) {
            hoistNonReactStatics(targetComponent, inheritedComponent, blacklist);
          }
        }
        var keys = getOwnPropertyNames(sourceComponent);
        if (getOwnPropertySymbols) {
          keys = keys.concat(getOwnPropertySymbols(sourceComponent));
        }
        var targetStatics = getStatics(targetComponent);
        var sourceStatics = getStatics(sourceComponent);
        for (var i2 = 0; i2 < keys.length; ++i2) {
          var key = keys[i2];
          if (!KNOWN_STATICS[key] && !(blacklist && blacklist[key]) && !(sourceStatics && sourceStatics[key]) && !(targetStatics && targetStatics[key])) {
            var descriptor = getOwnPropertyDescriptor(sourceComponent, key);
            try {
              defineProperty(targetComponent, key, descriptor);
            } catch (e2) {
            }
          }
        }
      }
      return targetComponent;
    }
    module2.exports = hoistNonReactStatics;
  }
});

// ../../node_modules/styled-components/dist/styled-components.esm.js
var styled_components_esm_exports = {};
__export(styled_components_esm_exports, {
  ServerStyleSheet: () => Ue,
  StyleSheetConsumer: () => ce,
  StyleSheetContext: () => ae,
  StyleSheetManager: () => fe,
  ThemeConsumer: () => Me,
  ThemeContext: () => Be,
  ThemeProvider: () => Ge,
  __PRIVATE__: () => Ze,
  createGlobalStyle: () => He,
  css: () => Ne,
  default: () => styled_components_esm_default,
  isStyledComponent: () => b,
  keyframes: () => $e,
  useTheme: () => Xe,
  version: () => N,
  withTheme: () => Je
});
function m() {
  return (m = Object.assign || function(e2) {
    for (var t2 = 1; t2 < arguments.length; t2++) {
      var n2 = arguments[t2];
      for (var r2 in n2)
        Object.prototype.hasOwnProperty.call(n2, r2) && (e2[r2] = n2[r2]);
    }
    return e2;
  }).apply(this, arguments);
}
function w(e2) {
  return "function" == typeof e2;
}
function E(e2) {
  return "production" !== process.env.NODE_ENV && "string" == typeof e2 && e2 || e2.displayName || e2.name || "Component";
}
function b(e2) {
  return e2 && "string" == typeof e2.styledComponentId;
}
function O() {
  for (var e2 = arguments.length <= 0 ? void 0 : arguments[0], t2 = [], n2 = 1, r2 = arguments.length; n2 < r2; n2 += 1)
    t2.push(n2 < 0 || arguments.length <= n2 ? void 0 : arguments[n2]);
  return t2.forEach(function(t3) {
    e2 = e2.replace(/%[a-z]/, t3);
  }), e2;
}
function R(e2) {
  for (var t2 = arguments.length, n2 = new Array(t2 > 1 ? t2 - 1 : 0), r2 = 1; r2 < t2; r2++)
    n2[r2 - 1] = arguments[r2];
  throw "production" === process.env.NODE_ENV ? new Error("An error occurred. See https://git.io/JUIaE#" + e2 + " for more information." + (n2.length > 0 ? " Args: " + n2.join(", ") : "")) : new Error(O.apply(void 0, [P[e2]].concat(n2)).trim());
}
function K(e2) {
  var t2, n2 = "";
  for (t2 = Math.abs(e2); t2 > 52; t2 = t2 / 52 | 0)
    n2 = Z(t2 % 52) + n2;
  return (Z(t2 % 52) + n2).replace(X, "$1-$2");
}
function te(e2) {
  for (var t2 = 0; t2 < e2.length; t2 += 1) {
    var n2 = e2[t2];
    if (w(n2) && !b(n2))
      return false;
  }
  return true;
}
function ie(e2) {
  var t2, n2, r2, o2, s2 = void 0 === e2 ? S : e2, i2 = s2.options, a2 = void 0 === i2 ? S : i2, c2 = s2.plugins, u2 = void 0 === c2 ? g : c2, l2 = new stylis_esm_default(a2), h = [], p = function(e3) {
    function t3(t4) {
      if (t4)
        try {
          e3(t4 + "}");
        } catch (e4) {
        }
    }
    return function(n3, r3, o3, s3, i3, a3, c3, u3, l3, d) {
      switch (n3) {
        case 1:
          if (0 === l3 && 64 === r3.charCodeAt(0))
            return e3(r3 + ";"), "";
          break;
        case 2:
          if (0 === u3)
            return r3 + "/*|*/";
          break;
        case 3:
          switch (u3) {
            case 102:
            case 112:
              return e3(o3[0] + r3), "";
            default:
              return r3 + (0 === d ? "/*|*/" : "");
          }
        case -2:
          r3.split("/*|*/}").forEach(t3);
      }
    };
  }(function(e3) {
    h.push(e3);
  }), f2 = function(e3, r3, s3) {
    return 0 === r3 && -1 !== se.indexOf(s3[n2.length]) || s3.match(o2) ? e3 : "." + t2;
  };
  function m2(e3, s3, i3, a3) {
    void 0 === a3 && (a3 = "&");
    var c3 = e3.replace(oe, ""), u3 = s3 && i3 ? i3 + " " + s3 + " { " + c3 + " }" : c3;
    return t2 = a3, n2 = s3, r2 = new RegExp("\\" + n2 + "\\b", "g"), o2 = new RegExp("(\\" + n2 + "\\b){2,}"), l2(i3 || !s3 ? "" : s3, u3);
  }
  return l2.use([].concat(u2, [function(e3, t3, o3) {
    2 === e3 && o3.length && o3[0].lastIndexOf(n2) > 0 && (o3[0] = o3[0].replace(r2, f2));
  }, p, function(e3) {
    if (-2 === e3) {
      var t3 = h;
      return h = [], t3;
    }
  }])), m2.hash = u2.length ? u2.reduce(function(e3, t3) {
    return t3.name || R(15), Q(e3, t3.name);
  }, 5381).toString() : "", m2;
}
function he() {
  return (0, import_react.useContext)(ae) || le;
}
function pe() {
  return (0, import_react.useContext)(ue) || de;
}
function fe(e2) {
  var t2 = (0, import_react.useState)(e2.stylisPlugins), n2 = t2[0], s2 = t2[1], c2 = he(), u2 = (0, import_react.useMemo)(function() {
    var t3 = c2;
    return e2.sheet ? t3 = e2.sheet : e2.target && (t3 = t3.reconstructWithOptions({ target: e2.target }, false)), e2.disableCSSOMInjection && (t3 = t3.reconstructWithOptions({ useCSSOMInjection: false })), t3;
  }, [e2.disableCSSOMInjection, e2.sheet, e2.target]), d = (0, import_react.useMemo)(function() {
    return ie({ options: { prefix: !e2.disableVendorPrefixes }, plugins: n2 });
  }, [e2.disableVendorPrefixes, n2]);
  return (0, import_react.useEffect)(function() {
    (0, import_shallowequal.default)(n2, e2.stylisPlugins) || s2(e2.stylisPlugins);
  }, [e2.stylisPlugins]), import_react.default.createElement(ae.Provider, { value: u2 }, import_react.default.createElement(ue.Provider, { value: d }, "production" !== process.env.NODE_ENV ? import_react.default.Children.only(e2.children) : e2.children));
}
function we(e2) {
  return ye.test(e2) ? e2.replace(ve, Se).replace(ge, "-ms-") : e2;
}
function be(e2, n2, r2, o2) {
  if (Array.isArray(e2)) {
    for (var s2, i2 = [], a2 = 0, c2 = e2.length; a2 < c2; a2 += 1)
      "" !== (s2 = be(e2[a2], n2, r2, o2)) && (Array.isArray(s2) ? i2.push.apply(i2, s2) : i2.push(s2));
    return i2;
  }
  if (Ee(e2))
    return "";
  if (b(e2))
    return "." + e2.styledComponentId;
  if (w(e2)) {
    if ("function" != typeof (l2 = e2) || l2.prototype && l2.prototype.isReactComponent || !n2)
      return e2;
    var u2 = e2(n2);
    return "production" !== process.env.NODE_ENV && (0, import_react_is.isElement)(u2) && console.warn(E(e2) + " is not a styled component and cannot be referred to via component selector. See https://www.styled-components.com/docs/advanced#referring-to-other-components for more details."), be(u2, n2, r2, o2);
  }
  var l2;
  return e2 instanceof me ? r2 ? (e2.inject(r2, o2), e2.getName(o2)) : e2 : v(e2) ? function e3(t2, n3) {
    var r3, o3, s3 = [];
    for (var i3 in t2)
      t2.hasOwnProperty(i3) && !Ee(t2[i3]) && (Array.isArray(t2[i3]) && t2[i3].isCss || w(t2[i3]) ? s3.push(we(i3) + ":", t2[i3], ";") : v(t2[i3]) ? s3.push.apply(s3, e3(t2[i3], i3)) : s3.push(we(i3) + ": " + (r3 = i3, null == (o3 = t2[i3]) || "boolean" == typeof o3 || "" === o3 ? "" : "number" != typeof o3 || 0 === o3 || r3 in unitless_esm_default || r3.startsWith("--") ? String(o3).trim() : o3 + "px") + ";"));
    return n3 ? [n3 + " {"].concat(s3, ["}"]) : s3;
  }(e2) : e2.toString();
}
function Ne(e2) {
  for (var t2 = arguments.length, n2 = new Array(t2 > 1 ? t2 - 1 : 0), r2 = 1; r2 < t2; r2++)
    n2[r2 - 1] = arguments[r2];
  return w(e2) || v(e2) ? _e(be(y(g, [e2].concat(n2)))) : 0 === n2.length && 1 === e2.length && "string" == typeof e2[0] ? e2 : _e(be(y(e2, n2)));
}
function De(e2) {
  return e2.replace(Oe, "-").replace(Re, "");
}
function Te(e2) {
  return "string" == typeof e2 && ("production" === process.env.NODE_ENV || e2.charAt(0) === e2.charAt(0).toLowerCase());
}
function Ve(e2, t2, n2) {
  var r2 = e2[n2];
  xe(t2) && xe(r2) ? ze(r2, t2) : e2[n2] = t2;
}
function ze(e2) {
  for (var t2 = arguments.length, n2 = new Array(t2 > 1 ? t2 - 1 : 0), r2 = 1; r2 < t2; r2++)
    n2[r2 - 1] = arguments[r2];
  for (var o2 = 0, s2 = n2; o2 < s2.length; o2++) {
    var i2 = s2[o2];
    if (xe(i2))
      for (var a2 in i2)
        ke(a2) && Ve(e2, i2[a2], a2);
  }
  return e2;
}
function Ge(e2) {
  var t2 = (0, import_react.useContext)(Be), n2 = (0, import_react.useMemo)(function() {
    return function(e3, t3) {
      if (!e3)
        return R(14);
      if (w(e3)) {
        var n3 = e3(t3);
        return "production" === process.env.NODE_ENV || null !== n3 && !Array.isArray(n3) && "object" == typeof n3 ? n3 : R(7);
      }
      return Array.isArray(e3) || "object" != typeof e3 ? R(8) : t3 ? m({}, t3, {}, e3) : e3;
    }(e2.theme, t2);
  }, [e2.theme, t2]);
  return e2.children ? import_react.default.createElement(Be.Provider, { value: n2 }, e2.children) : null;
}
function Fe(e2, t2, n2) {
  var o2 = b(e2), i2 = !Te(e2), a2 = t2.attrs, c2 = void 0 === a2 ? g : a2, l2 = t2.componentId, d = void 0 === l2 ? function(e3, t3) {
    var n3 = "string" != typeof e3 ? "sc" : De(e3);
    Le[n3] = (Le[n3] || 0) + 1;
    var r2 = n3 + "-" + je("5.3.11" + n3 + Le[n3]);
    return t3 ? t3 + "-" + r2 : r2;
  }(t2.displayName, t2.parentComponentId) : l2, h = t2.displayName, y2 = void 0 === h ? function(e3) {
    return Te(e3) ? "styled." + e3 : "Styled(" + E(e3) + ")";
  }(e2) : h, v2 = t2.displayName && t2.componentId ? De(t2.displayName) + "-" + t2.componentId : t2.componentId || d, _2 = o2 && e2.attrs ? Array.prototype.concat(e2.attrs, c2).filter(Boolean) : c2, N2 = t2.shouldForwardProp;
  o2 && e2.shouldForwardProp && (N2 = t2.shouldForwardProp ? function(n3, r2, o3) {
    return e2.shouldForwardProp(n3, r2, o3) && t2.shouldForwardProp(n3, r2, o3);
  } : e2.shouldForwardProp);
  var A2, C2 = new re(n2, v2, o2 ? e2.componentStyle : void 0), I2 = C2.isStatic && 0 === c2.length, P2 = function(e3, t3) {
    return function(e4, t4, n3, r2) {
      var o3 = e4.attrs, i3 = e4.componentStyle, a3 = e4.defaultProps, c3 = e4.foldedComponentIds, l3 = e4.shouldForwardProp, d2 = e4.styledComponentId, h2 = e4.target, f2 = function(e5, t5, n4) {
        void 0 === e5 && (e5 = S);
        var r3 = m({}, t5, { theme: e5 }), o4 = {};
        return n4.forEach(function(e6) {
          var t6, n5, s2, i4 = e6;
          for (t6 in w(i4) && (i4 = i4(r3)), i4)
            r3[t6] = o4[t6] = "className" === t6 ? (n5 = o4[t6], s2 = i4[t6], n5 && s2 ? n5 + " " + s2 : n5 || s2) : i4[t6];
        }), [r3, o4];
      }(Pe(t4, (0, import_react.useContext)(Be), a3) || S, t4, o3), y3 = f2[0], v3 = f2[1], g2 = function(e5, t5, n4, r3) {
        var o4 = he(), s2 = pe(), i4 = t5 ? e5.generateAndInjectStyles(S, o4, s2) : e5.generateAndInjectStyles(n4, o4, s2);
        return "production" !== process.env.NODE_ENV && !t5 && r3 && r3(i4), i4;
      }(i3, r2, y3, "production" !== process.env.NODE_ENV ? e4.warnTooManyClasses : void 0), E2 = n3, b2 = v3.$as || t4.$as || v3.as || t4.as || h2, _3 = Te(b2), N3 = v3 !== t4 ? m({}, t4, {}, v3) : t4, A3 = {};
      for (var C3 in N3)
        "$" !== C3[0] && "as" !== C3 && ("forwardedAs" === C3 ? A3.as = N3[C3] : (l3 ? l3(C3, isPropValid, b2) : !_3 || isPropValid(C3)) && (A3[C3] = N3[C3]));
      return t4.style && v3.style !== t4.style && (A3.style = m({}, t4.style, {}, v3.style)), A3.className = Array.prototype.concat(c3, d2, g2 !== d2 ? g2 : null, t4.className, v3.className).filter(Boolean).join(" "), A3.ref = E2, (0, import_react.createElement)(b2, A3);
    }(A2, e3, t3, I2);
  };
  return P2.displayName = y2, (A2 = import_react.default.forwardRef(P2)).attrs = _2, A2.componentStyle = C2, A2.displayName = y2, A2.shouldForwardProp = N2, A2.foldedComponentIds = o2 ? Array.prototype.concat(e2.foldedComponentIds, e2.styledComponentId) : g, A2.styledComponentId = v2, A2.target = o2 ? e2.target : e2, A2.withComponent = function(e3) {
    var r2 = t2.componentId, o3 = function(e4, t3) {
      if (null == e4)
        return {};
      var n3, r3, o4 = {}, s3 = Object.keys(e4);
      for (r3 = 0; r3 < s3.length; r3++)
        n3 = s3[r3], t3.indexOf(n3) >= 0 || (o4[n3] = e4[n3]);
      return o4;
    }(t2, ["componentId"]), s2 = r2 && r2 + "-" + (Te(e3) ? e3 : De(E(e3)));
    return Fe(e3, m({}, o3, { attrs: _2, componentId: s2 }), n2);
  }, Object.defineProperty(A2, "defaultProps", { get: function() {
    return this._foldedDefaultProps;
  }, set: function(t3) {
    this._foldedDefaultProps = o2 ? ze({}, e2.defaultProps, t3) : t3;
  } }), "production" !== process.env.NODE_ENV && (Ie(y2, v2), A2.warnTooManyClasses = function(e3, t3) {
    var n3 = {}, r2 = false;
    return function(o3) {
      if (!r2 && (n3[o3] = true, Object.keys(n3).length >= 200)) {
        var s2 = t3 ? ' with the id of "' + t3 + '"' : "";
        console.warn("Over 200 classes were generated for component " + e3 + s2 + ".\nConsider using the attrs method, together with a style object for frequently changed styles.\nExample:\n  const Component = styled.div.attrs(props => ({\n    style: {\n      background: props.background,\n    },\n  }))`width: 100%;`\n\n  <Component />"), r2 = true, n3 = {};
      }
    };
  }(y2, v2)), Object.defineProperty(A2, "toString", { value: function() {
    return "." + A2.styledComponentId;
  } }), i2 && (0, import_hoist_non_react_statics.default)(A2, e2, { attrs: true, componentStyle: true, displayName: true, foldedComponentIds: true, shouldForwardProp: true, styledComponentId: true, target: true, withComponent: true }), A2;
}
function He(e2) {
  for (var t2 = arguments.length, n2 = new Array(t2 > 1 ? t2 - 1 : 0), o2 = 1; o2 < t2; o2++)
    n2[o2 - 1] = arguments[o2];
  var i2 = Ne.apply(void 0, [e2].concat(n2)), a2 = "sc-global-" + je(JSON.stringify(i2)), u2 = new qe(i2, a2);
  function l2(e3) {
    var t3 = he(), n3 = pe(), o3 = (0, import_react.useContext)(Be), u3 = (0, import_react.useRef)(t3.allocateGSInstance(a2)).current;
    return "production" !== process.env.NODE_ENV && import_react.default.Children.count(e3.children) && console.warn("The global style component " + a2 + " was given child JSX. createGlobalStyle does not render children."), "production" !== process.env.NODE_ENV && i2.some(function(e4) {
      return "string" == typeof e4 && -1 !== e4.indexOf("@import");
    }) && console.warn("Please do not use @import CSS syntax in createGlobalStyle at this time, as the CSSOM APIs we use in production do not handle it well. Instead, we recommend using a library such as react-helmet to inject a typical <link> meta tag to the stylesheet, or simply embedding it manually in your index.html <head> section for a simpler app."), t3.server && d(u3, e3, t3, o3, n3), null;
  }
  function d(e3, t3, n3, r2, o3) {
    if (u2.isStatic)
      u2.renderStyles(e3, I, n3, o3);
    else {
      var s2 = m({}, t3, { theme: Pe(t3, r2, l2.defaultProps) });
      u2.renderStyles(e3, s2, n3, o3);
    }
  }
  return "production" !== process.env.NODE_ENV && Ie(a2), import_react.default.memo(l2);
}
function $e(e2) {
  "production" !== process.env.NODE_ENV && "undefined" != typeof navigator && "ReactNative" === navigator.product && console.warn("`keyframes` cannot be used on ReactNative, only on the web. To do animation in ReactNative please use Animated.");
  for (var t2 = arguments.length, n2 = new Array(t2 > 1 ? t2 - 1 : 0), r2 = 1; r2 < t2; r2++)
    n2[r2 - 1] = arguments[r2];
  var o2 = Ne.apply(void 0, [e2].concat(n2)).join(""), s2 = je(o2);
  return new me(s2, o2);
}
var import_react_is, import_react, import_shallowequal, import_hoist_non_react_statics, y, v, g, S, _, N, A, C, I, P, D, j, T, x, k, V, z, B, M, G, L, F, Y, q, H, $, W, U, J, X, Z, Q, ee, ne, re, oe, se, ae, ce, ue, le, de, me, ye, ve, ge, Se, Ee, _e, Ae, Ce, Ie, Pe, Oe, Re, je, xe, ke, Be, Me, Le, Ye, qe, We, Ue, Je, Xe, Ze, styled_components_esm_default;
var init_styled_components_esm = __esm({
  "../../node_modules/styled-components/dist/styled-components.esm.js"() {
    import_react_is = __toESM(require_react_is());
    import_react = __toESM(require_react());
    import_shallowequal = __toESM(require_shallowequal());
    init_stylis_esm();
    init_unitless_esm();
    init_emotion_is_prop_valid_esm();
    import_hoist_non_react_statics = __toESM(require_hoist_non_react_statics_cjs());
    y = function(e2, t2) {
      for (var n2 = [e2[0]], r2 = 0, o2 = t2.length; r2 < o2; r2 += 1)
        n2.push(t2[r2], e2[r2 + 1]);
      return n2;
    };
    v = function(t2) {
      return null !== t2 && "object" == typeof t2 && "[object Object]" === (t2.toString ? t2.toString() : Object.prototype.toString.call(t2)) && !(0, import_react_is.typeOf)(t2);
    };
    g = Object.freeze([]);
    S = Object.freeze({});
    _ = "undefined" != typeof process && void 0 !== process.env && (process.env.REACT_APP_SC_ATTR || process.env.SC_ATTR) || "data-styled";
    N = "5.3.11";
    A = "undefined" != typeof window && "HTMLElement" in window;
    C = Boolean("boolean" == typeof SC_DISABLE_SPEEDY ? SC_DISABLE_SPEEDY : "undefined" != typeof process && void 0 !== process.env && (void 0 !== process.env.REACT_APP_SC_DISABLE_SPEEDY && "" !== process.env.REACT_APP_SC_DISABLE_SPEEDY ? "false" !== process.env.REACT_APP_SC_DISABLE_SPEEDY && process.env.REACT_APP_SC_DISABLE_SPEEDY : void 0 !== process.env.SC_DISABLE_SPEEDY && "" !== process.env.SC_DISABLE_SPEEDY ? "false" !== process.env.SC_DISABLE_SPEEDY && process.env.SC_DISABLE_SPEEDY : "production" !== process.env.NODE_ENV));
    I = {};
    P = "production" !== process.env.NODE_ENV ? { 1: "Cannot create styled-component for component: %s.\n\n", 2: "Can't collect styles once you've consumed a `ServerStyleSheet`'s styles! `ServerStyleSheet` is a one off instance for each server-side render cycle.\n\n- Are you trying to reuse it across renders?\n- Are you accidentally calling collectStyles twice?\n\n", 3: "Streaming SSR is only supported in a Node.js environment; Please do not try to call this method in the browser.\n\n", 4: "The `StyleSheetManager` expects a valid target or sheet prop!\n\n- Does this error occur on the client and is your target falsy?\n- Does this error occur on the server and is the sheet falsy?\n\n", 5: "The clone method cannot be used on the client!\n\n- Are you running in a client-like environment on the server?\n- Are you trying to run SSR on the client?\n\n", 6: "Trying to insert a new style tag, but the given Node is unmounted!\n\n- Are you using a custom target that isn't mounted?\n- Does your document not have a valid head element?\n- Have you accidentally removed a style tag manually?\n\n", 7: 'ThemeProvider: Please return an object from your "theme" prop function, e.g.\n\n```js\ntheme={() => ({})}\n```\n\n', 8: 'ThemeProvider: Please make your "theme" prop an object.\n\n', 9: "Missing document `<head>`\n\n", 10: "Cannot find a StyleSheet instance. Usually this happens if there are multiple copies of styled-components loaded at once. Check out this issue for how to troubleshoot and fix the common cases where this situation can happen: https://github.com/styled-components/styled-components/issues/1941#issuecomment-417862021\n\n", 11: "_This error was replaced with a dev-time warning, it will be deleted for v4 final._ [createGlobalStyle] received children which will not be rendered. Please use the component without passing children elements.\n\n", 12: "It seems you are interpolating a keyframe declaration (%s) into an untagged string. This was supported in styled-components v3, but is not longer supported in v4 as keyframes are now injected on-demand. Please wrap your string in the css\\`\\` helper which ensures the styles are injected correctly. See https://www.styled-components.com/docs/api#css\n\n", 13: "%s is not a styled component and cannot be referred to via component selector. See https://www.styled-components.com/docs/advanced#referring-to-other-components for more details.\n\n", 14: 'ThemeProvider: "theme" prop is required.\n\n', 15: "A stylis plugin has been supplied that is not named. We need a name for each plugin to be able to prevent styling collisions between different stylis configurations within the same app. Before you pass your plugin to `<StyleSheetManager stylisPlugins={[]}>`, please make sure each plugin is uniquely-named, e.g.\n\n```js\nObject.defineProperty(importedPlugin, 'name', { value: 'some-unique-name' });\n```\n\n", 16: "Reached the limit of how many styled components may be created at group %s.\nYou may only create up to 1,073,741,824 components. If you're creating components dynamically,\nas for instance in your render method then you may be running into this limitation.\n\n", 17: "CSSStyleSheet could not be found on HTMLStyleElement.\nHas styled-components' style tag been unmounted or altered by another script?\n" } : {};
    D = function() {
      function e2(e3) {
        this.groupSizes = new Uint32Array(512), this.length = 512, this.tag = e3;
      }
      var t2 = e2.prototype;
      return t2.indexOfGroup = function(e3) {
        for (var t3 = 0, n2 = 0; n2 < e3; n2++)
          t3 += this.groupSizes[n2];
        return t3;
      }, t2.insertRules = function(e3, t3) {
        if (e3 >= this.groupSizes.length) {
          for (var n2 = this.groupSizes, r2 = n2.length, o2 = r2; e3 >= o2; )
            (o2 <<= 1) < 0 && R(16, "" + e3);
          this.groupSizes = new Uint32Array(o2), this.groupSizes.set(n2), this.length = o2;
          for (var s2 = r2; s2 < o2; s2++)
            this.groupSizes[s2] = 0;
        }
        for (var i2 = this.indexOfGroup(e3 + 1), a2 = 0, c2 = t3.length; a2 < c2; a2++)
          this.tag.insertRule(i2, t3[a2]) && (this.groupSizes[e3]++, i2++);
      }, t2.clearGroup = function(e3) {
        if (e3 < this.length) {
          var t3 = this.groupSizes[e3], n2 = this.indexOfGroup(e3), r2 = n2 + t3;
          this.groupSizes[e3] = 0;
          for (var o2 = n2; o2 < r2; o2++)
            this.tag.deleteRule(n2);
        }
      }, t2.getGroup = function(e3) {
        var t3 = "";
        if (e3 >= this.length || 0 === this.groupSizes[e3])
          return t3;
        for (var n2 = this.groupSizes[e3], r2 = this.indexOfGroup(e3), o2 = r2 + n2, s2 = r2; s2 < o2; s2++)
          t3 += this.tag.getRule(s2) + "/*!sc*/\n";
        return t3;
      }, e2;
    }();
    j = /* @__PURE__ */ new Map();
    T = /* @__PURE__ */ new Map();
    x = 1;
    k = function(e2) {
      if (j.has(e2))
        return j.get(e2);
      for (; T.has(x); )
        x++;
      var t2 = x++;
      return "production" !== process.env.NODE_ENV && ((0 | t2) < 0 || t2 > 1 << 30) && R(16, "" + t2), j.set(e2, t2), T.set(t2, e2), t2;
    };
    V = function(e2) {
      return T.get(e2);
    };
    z = function(e2, t2) {
      t2 >= x && (x = t2 + 1), j.set(e2, t2), T.set(t2, e2);
    };
    B = "style[" + _ + '][data-styled-version="5.3.11"]';
    M = new RegExp("^" + _ + '\\.g(\\d+)\\[id="([\\w\\d-]+)"\\].*?"([^"]*)');
    G = function(e2, t2, n2) {
      for (var r2, o2 = n2.split(","), s2 = 0, i2 = o2.length; s2 < i2; s2++)
        (r2 = o2[s2]) && e2.registerName(t2, r2);
    };
    L = function(e2, t2) {
      for (var n2 = (t2.textContent || "").split("/*!sc*/\n"), r2 = [], o2 = 0, s2 = n2.length; o2 < s2; o2++) {
        var i2 = n2[o2].trim();
        if (i2) {
          var a2 = i2.match(M);
          if (a2) {
            var c2 = 0 | parseInt(a2[1], 10), u2 = a2[2];
            0 !== c2 && (z(u2, c2), G(e2, u2, a2[3]), e2.getTag().insertRules(c2, r2)), r2.length = 0;
          } else
            r2.push(i2);
        }
      }
    };
    F = function() {
      return "undefined" != typeof __webpack_nonce__ ? __webpack_nonce__ : null;
    };
    Y = function(e2) {
      var t2 = document.head, n2 = e2 || t2, r2 = document.createElement("style"), o2 = function(e3) {
        for (var t3 = e3.childNodes, n3 = t3.length; n3 >= 0; n3--) {
          var r3 = t3[n3];
          if (r3 && 1 === r3.nodeType && r3.hasAttribute(_))
            return r3;
        }
      }(n2), s2 = void 0 !== o2 ? o2.nextSibling : null;
      r2.setAttribute(_, "active"), r2.setAttribute("data-styled-version", "5.3.11");
      var i2 = F();
      return i2 && r2.setAttribute("nonce", i2), n2.insertBefore(r2, s2), r2;
    };
    q = function() {
      function e2(e3) {
        var t3 = this.element = Y(e3);
        t3.appendChild(document.createTextNode("")), this.sheet = function(e4) {
          if (e4.sheet)
            return e4.sheet;
          for (var t4 = document.styleSheets, n2 = 0, r2 = t4.length; n2 < r2; n2++) {
            var o2 = t4[n2];
            if (o2.ownerNode === e4)
              return o2;
          }
          R(17);
        }(t3), this.length = 0;
      }
      var t2 = e2.prototype;
      return t2.insertRule = function(e3, t3) {
        try {
          return this.sheet.insertRule(t3, e3), this.length++, true;
        } catch (e4) {
          return false;
        }
      }, t2.deleteRule = function(e3) {
        this.sheet.deleteRule(e3), this.length--;
      }, t2.getRule = function(e3) {
        var t3 = this.sheet.cssRules[e3];
        return void 0 !== t3 && "string" == typeof t3.cssText ? t3.cssText : "";
      }, e2;
    }();
    H = function() {
      function e2(e3) {
        var t3 = this.element = Y(e3);
        this.nodes = t3.childNodes, this.length = 0;
      }
      var t2 = e2.prototype;
      return t2.insertRule = function(e3, t3) {
        if (e3 <= this.length && e3 >= 0) {
          var n2 = document.createTextNode(t3), r2 = this.nodes[e3];
          return this.element.insertBefore(n2, r2 || null), this.length++, true;
        }
        return false;
      }, t2.deleteRule = function(e3) {
        this.element.removeChild(this.nodes[e3]), this.length--;
      }, t2.getRule = function(e3) {
        return e3 < this.length ? this.nodes[e3].textContent : "";
      }, e2;
    }();
    $ = function() {
      function e2(e3) {
        this.rules = [], this.length = 0;
      }
      var t2 = e2.prototype;
      return t2.insertRule = function(e3, t3) {
        return e3 <= this.length && (this.rules.splice(e3, 0, t3), this.length++, true);
      }, t2.deleteRule = function(e3) {
        this.rules.splice(e3, 1), this.length--;
      }, t2.getRule = function(e3) {
        return e3 < this.length ? this.rules[e3] : "";
      }, e2;
    }();
    W = A;
    U = { isServer: !A, useCSSOMInjection: !C };
    J = function() {
      function e2(e3, t3, n2) {
        void 0 === e3 && (e3 = S), void 0 === t3 && (t3 = {}), this.options = m({}, U, {}, e3), this.gs = t3, this.names = new Map(n2), this.server = !!e3.isServer, !this.server && A && W && (W = false, function(e4) {
          for (var t4 = document.querySelectorAll(B), n3 = 0, r2 = t4.length; n3 < r2; n3++) {
            var o2 = t4[n3];
            o2 && "active" !== o2.getAttribute(_) && (L(e4, o2), o2.parentNode && o2.parentNode.removeChild(o2));
          }
        }(this));
      }
      e2.registerId = function(e3) {
        return k(e3);
      };
      var t2 = e2.prototype;
      return t2.reconstructWithOptions = function(t3, n2) {
        return void 0 === n2 && (n2 = true), new e2(m({}, this.options, {}, t3), this.gs, n2 && this.names || void 0);
      }, t2.allocateGSInstance = function(e3) {
        return this.gs[e3] = (this.gs[e3] || 0) + 1;
      }, t2.getTag = function() {
        return this.tag || (this.tag = (n2 = (t3 = this.options).isServer, r2 = t3.useCSSOMInjection, o2 = t3.target, e3 = n2 ? new $(o2) : r2 ? new q(o2) : new H(o2), new D(e3)));
        var e3, t3, n2, r2, o2;
      }, t2.hasNameForId = function(e3, t3) {
        return this.names.has(e3) && this.names.get(e3).has(t3);
      }, t2.registerName = function(e3, t3) {
        if (k(e3), this.names.has(e3))
          this.names.get(e3).add(t3);
        else {
          var n2 = /* @__PURE__ */ new Set();
          n2.add(t3), this.names.set(e3, n2);
        }
      }, t2.insertRules = function(e3, t3, n2) {
        this.registerName(e3, t3), this.getTag().insertRules(k(e3), n2);
      }, t2.clearNames = function(e3) {
        this.names.has(e3) && this.names.get(e3).clear();
      }, t2.clearRules = function(e3) {
        this.getTag().clearGroup(k(e3)), this.clearNames(e3);
      }, t2.clearTag = function() {
        this.tag = void 0;
      }, t2.toString = function() {
        return function(e3) {
          for (var t3 = e3.getTag(), n2 = t3.length, r2 = "", o2 = 0; o2 < n2; o2++) {
            var s2 = V(o2);
            if (void 0 !== s2) {
              var i2 = e3.names.get(s2), a2 = t3.getGroup(o2);
              if (i2 && a2 && i2.size) {
                var c2 = _ + ".g" + o2 + '[id="' + s2 + '"]', u2 = "";
                void 0 !== i2 && i2.forEach(function(e4) {
                  e4.length > 0 && (u2 += e4 + ",");
                }), r2 += "" + a2 + c2 + '{content:"' + u2 + '"}/*!sc*/\n';
              }
            }
          }
          return r2;
        }(this);
      }, e2;
    }();
    X = /(a)(d)/gi;
    Z = function(e2) {
      return String.fromCharCode(e2 + (e2 > 25 ? 39 : 97));
    };
    Q = function(e2, t2) {
      for (var n2 = t2.length; n2; )
        e2 = 33 * e2 ^ t2.charCodeAt(--n2);
      return e2;
    };
    ee = function(e2) {
      return Q(5381, e2);
    };
    ne = ee("5.3.11");
    re = function() {
      function e2(e3, t2, n2) {
        this.rules = e3, this.staticRulesId = "", this.isStatic = "production" === process.env.NODE_ENV && (void 0 === n2 || n2.isStatic) && te(e3), this.componentId = t2, this.baseHash = Q(ne, t2), this.baseStyle = n2, J.registerId(t2);
      }
      return e2.prototype.generateAndInjectStyles = function(e3, t2, n2) {
        var r2 = this.componentId, o2 = [];
        if (this.baseStyle && o2.push(this.baseStyle.generateAndInjectStyles(e3, t2, n2)), this.isStatic && !n2.hash)
          if (this.staticRulesId && t2.hasNameForId(r2, this.staticRulesId))
            o2.push(this.staticRulesId);
          else {
            var s2 = be(this.rules, e3, t2, n2).join(""), i2 = K(Q(this.baseHash, s2) >>> 0);
            if (!t2.hasNameForId(r2, i2)) {
              var a2 = n2(s2, "." + i2, void 0, r2);
              t2.insertRules(r2, i2, a2);
            }
            o2.push(i2), this.staticRulesId = i2;
          }
        else {
          for (var c2 = this.rules.length, u2 = Q(this.baseHash, n2.hash), l2 = "", d = 0; d < c2; d++) {
            var h = this.rules[d];
            if ("string" == typeof h)
              l2 += h, "production" !== process.env.NODE_ENV && (u2 = Q(u2, h + d));
            else if (h) {
              var p = be(h, e3, t2, n2), f2 = Array.isArray(p) ? p.join("") : p;
              u2 = Q(u2, f2 + d), l2 += f2;
            }
          }
          if (l2) {
            var m2 = K(u2 >>> 0);
            if (!t2.hasNameForId(r2, m2)) {
              var y2 = n2(l2, "." + m2, void 0, r2);
              t2.insertRules(r2, m2, y2);
            }
            o2.push(m2);
          }
        }
        return o2.join(" ");
      }, e2;
    }();
    oe = /^\s*\/\/.*$/gm;
    se = [":", "[", ".", "#"];
    ae = import_react.default.createContext();
    ce = ae.Consumer;
    ue = import_react.default.createContext();
    le = (ue.Consumer, new J());
    de = ie();
    me = function() {
      function e2(e3, t2) {
        var n2 = this;
        this.inject = function(e4, t3) {
          void 0 === t3 && (t3 = de);
          var r2 = n2.name + t3.hash;
          e4.hasNameForId(n2.id, r2) || e4.insertRules(n2.id, r2, t3(n2.rules, r2, "@keyframes"));
        }, this.toString = function() {
          return R(12, String(n2.name));
        }, this.name = e3, this.id = "sc-keyframes-" + e3, this.rules = t2;
      }
      return e2.prototype.getName = function(e3) {
        return void 0 === e3 && (e3 = de), this.name + e3.hash;
      }, e2;
    }();
    ye = /([A-Z])/;
    ve = /([A-Z])/g;
    ge = /^ms-/;
    Se = function(e2) {
      return "-" + e2.toLowerCase();
    };
    Ee = function(e2) {
      return null == e2 || false === e2 || "" === e2;
    };
    _e = function(e2) {
      return Array.isArray(e2) && (e2.isCss = true), e2;
    };
    Ae = /invalid hook call/i;
    Ce = /* @__PURE__ */ new Set();
    Ie = function(e2, t2) {
      if ("production" !== process.env.NODE_ENV) {
        var n2 = "The component " + e2 + (t2 ? ' with the id of "' + t2 + '"' : "") + " has been created dynamically.\nYou may see this warning because you've called styled inside another component.\nTo resolve this only create new StyledComponents outside of any render method and function component.", r2 = console.error;
        try {
          var o2 = true;
          console.error = function(e3) {
            if (Ae.test(e3))
              o2 = false, Ce.delete(n2);
            else {
              for (var t3 = arguments.length, s2 = new Array(t3 > 1 ? t3 - 1 : 0), i2 = 1; i2 < t3; i2++)
                s2[i2 - 1] = arguments[i2];
              r2.apply(void 0, [e3].concat(s2));
            }
          }, (0, import_react.useRef)(), o2 && !Ce.has(n2) && (console.warn(n2), Ce.add(n2));
        } catch (e3) {
          Ae.test(e3.message) && Ce.delete(n2);
        } finally {
          console.error = r2;
        }
      }
    };
    Pe = function(e2, t2, n2) {
      return void 0 === n2 && (n2 = S), e2.theme !== n2.theme && e2.theme || t2 || n2.theme;
    };
    Oe = /[!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~-]+/g;
    Re = /(^-|-$)/g;
    je = function(e2) {
      return K(ee(e2) >>> 0);
    };
    xe = function(e2) {
      return "function" == typeof e2 || "object" == typeof e2 && null !== e2 && !Array.isArray(e2);
    };
    ke = function(e2) {
      return "__proto__" !== e2 && "constructor" !== e2 && "prototype" !== e2;
    };
    Be = import_react.default.createContext();
    Me = Be.Consumer;
    Le = {};
    Ye = function(e2) {
      return function e3(t2, r2, o2) {
        if (void 0 === o2 && (o2 = S), !(0, import_react_is.isValidElementType)(r2))
          return R(1, String(r2));
        var s2 = function() {
          return t2(r2, o2, Ne.apply(void 0, arguments));
        };
        return s2.withConfig = function(n2) {
          return e3(t2, r2, m({}, o2, {}, n2));
        }, s2.attrs = function(n2) {
          return e3(t2, r2, m({}, o2, { attrs: Array.prototype.concat(o2.attrs, n2).filter(Boolean) }));
        }, s2;
      }(Fe, e2);
    };
    ["a", "abbr", "address", "area", "article", "aside", "audio", "b", "base", "bdi", "bdo", "big", "blockquote", "body", "br", "button", "canvas", "caption", "cite", "code", "col", "colgroup", "data", "datalist", "dd", "del", "details", "dfn", "dialog", "div", "dl", "dt", "em", "embed", "fieldset", "figcaption", "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "head", "header", "hgroup", "hr", "html", "i", "iframe", "img", "input", "ins", "kbd", "keygen", "label", "legend", "li", "link", "main", "map", "mark", "marquee", "menu", "menuitem", "meta", "meter", "nav", "noscript", "object", "ol", "optgroup", "option", "output", "p", "param", "picture", "pre", "progress", "q", "rp", "rt", "ruby", "s", "samp", "script", "section", "select", "small", "source", "span", "strong", "style", "sub", "summary", "sup", "table", "tbody", "td", "textarea", "tfoot", "th", "thead", "time", "title", "tr", "track", "u", "ul", "var", "video", "wbr", "circle", "clipPath", "defs", "ellipse", "foreignObject", "g", "image", "line", "linearGradient", "marker", "mask", "path", "pattern", "polygon", "polyline", "radialGradient", "rect", "stop", "svg", "text", "textPath", "tspan"].forEach(function(e2) {
      Ye[e2] = Ye(e2);
    });
    qe = function() {
      function e2(e3, t3) {
        this.rules = e3, this.componentId = t3, this.isStatic = te(e3), J.registerId(this.componentId + 1);
      }
      var t2 = e2.prototype;
      return t2.createStyles = function(e3, t3, n2, r2) {
        var o2 = r2(be(this.rules, t3, n2, r2).join(""), ""), s2 = this.componentId + e3;
        n2.insertRules(s2, s2, o2);
      }, t2.removeStyles = function(e3, t3) {
        t3.clearRules(this.componentId + e3);
      }, t2.renderStyles = function(e3, t3, n2, r2) {
        e3 > 2 && J.registerId(this.componentId + e3), this.removeStyles(e3, n2), this.createStyles(e3, t3, n2, r2);
      }, e2;
    }();
    We = /^\s*<\/[a-z]/i;
    Ue = function() {
      function e2() {
        var e3 = this;
        this._emitSheetCSS = function() {
          var t3 = e3.instance.toString();
          if (!t3)
            return "";
          var n2 = F();
          return "<style " + [n2 && 'nonce="' + n2 + '"', _ + '="true"', 'data-styled-version="5.3.11"'].filter(Boolean).join(" ") + ">" + t3 + "</style>";
        }, this.getStyleTags = function() {
          return e3.sealed ? R(2) : e3._emitSheetCSS();
        }, this.getStyleElement = function() {
          var t3;
          if (e3.sealed)
            return R(2);
          var n2 = ((t3 = {})[_] = "", t3["data-styled-version"] = "5.3.11", t3.dangerouslySetInnerHTML = { __html: e3.instance.toString() }, t3), o2 = F();
          return o2 && (n2.nonce = o2), [import_react.default.createElement("style", m({}, n2, { key: "sc-0-0" }))];
        }, this.seal = function() {
          e3.sealed = true;
        }, this.instance = new J({ isServer: true }), this.sealed = false;
      }
      var t2 = e2.prototype;
      return t2.collectStyles = function(e3) {
        return this.sealed ? R(2) : import_react.default.createElement(fe, { sheet: this.instance }, e3);
      }, t2.interleaveWithNodeStream = function(e3) {
        if (A)
          return R(3);
        if (this.sealed)
          return R(2);
        this.seal();
        var t3 = require("stream"), n2 = (t3.Readable, t3.Transform), r2 = e3, o2 = this.instance, s2 = this._emitSheetCSS, i2 = new n2({ transform: function(e4, t4, n3) {
          var r3 = e4.toString(), i3 = s2();
          if (o2.clearTag(), We.test(r3)) {
            var a2 = r3.indexOf(">") + 1, c2 = r3.slice(0, a2), u2 = r3.slice(a2);
            this.push(c2 + i3 + u2);
          } else
            this.push(i3 + r3);
          n3();
        } });
        return r2.on("error", function(e4) {
          i2.emit("error", e4);
        }), r2.pipe(i2);
      }, e2;
    }();
    Je = function(e2) {
      var t2 = import_react.default.forwardRef(function(t3, n2) {
        var o2 = (0, import_react.useContext)(Be), i2 = e2.defaultProps, a2 = Pe(t3, o2, i2);
        return "production" !== process.env.NODE_ENV && void 0 === a2 && console.warn('[withTheme] You are not using a ThemeProvider nor passing a theme prop or a theme in defaultProps in component class "' + E(e2) + '"'), import_react.default.createElement(e2, m({}, t3, { theme: a2, ref: n2 }));
      });
      return (0, import_hoist_non_react_statics.default)(t2, e2), t2.displayName = "WithTheme(" + E(e2) + ")", t2;
    };
    Xe = function() {
      return (0, import_react.useContext)(Be);
    };
    Ze = { StyleSheet: J, masterSheet: le };
    "production" !== process.env.NODE_ENV && "undefined" != typeof navigator && "ReactNative" === navigator.product && console.warn("It looks like you've imported 'styled-components' on React Native.\nPerhaps you're looking to import 'styled-components/native'?\nRead more about this at https://www.styled-components.com/docs/basics#react-native"), "production" !== process.env.NODE_ENV && "test" !== process.env.NODE_ENV && "undefined" != typeof window && (window["__styled-components-init__"] = window["__styled-components-init__"] || 0, 1 === window["__styled-components-init__"] && console.warn("It looks like there are several instances of 'styled-components' initialized in this application. This may cause dynamic styles to not render properly, errors during the rehydration process, a missing theme prop, and makes your application bigger without good reason.\n\nSee https://s-c.sh/2BAXzed for more info."), window["__styled-components-init__"] += 1);
    styled_components_esm_default = Ye;
  }
});

// ../../node_modules/react/cjs/react-jsx-runtime.production.min.js
var require_react_jsx_runtime_production_min = __commonJS({
  "../../node_modules/react/cjs/react-jsx-runtime.production.min.js"(exports) {
    "use strict";
    var f2 = require_react();
    var k2 = Symbol.for("react.element");
    var l2 = Symbol.for("react.fragment");
    var m2 = Object.prototype.hasOwnProperty;
    var n2 = f2.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner;
    var p = { key: true, ref: true, __self: true, __source: true };
    function q2(c2, a2, g2) {
      var b2, d = {}, e2 = null, h = null;
      void 0 !== g2 && (e2 = "" + g2);
      void 0 !== a2.key && (e2 = "" + a2.key);
      void 0 !== a2.ref && (h = a2.ref);
      for (b2 in a2)
        m2.call(a2, b2) && !p.hasOwnProperty(b2) && (d[b2] = a2[b2]);
      if (c2 && c2.defaultProps)
        for (b2 in a2 = c2.defaultProps, a2)
          void 0 === d[b2] && (d[b2] = a2[b2]);
      return { $$typeof: k2, type: c2, key: e2, ref: h, props: d, _owner: n2.current };
    }
    exports.Fragment = l2;
    exports.jsx = q2;
    exports.jsxs = q2;
  }
});

// ../../node_modules/react/cjs/react-jsx-runtime.development.js
var require_react_jsx_runtime_development = __commonJS({
  "../../node_modules/react/cjs/react-jsx-runtime.development.js"(exports) {
    "use strict";
    if (process.env.NODE_ENV !== "production") {
      (function() {
        "use strict";
        var React = require_react();
        var REACT_ELEMENT_TYPE = Symbol.for("react.element");
        var REACT_PORTAL_TYPE = Symbol.for("react.portal");
        var REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
        var REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode");
        var REACT_PROFILER_TYPE = Symbol.for("react.profiler");
        var REACT_PROVIDER_TYPE = Symbol.for("react.provider");
        var REACT_CONTEXT_TYPE = Symbol.for("react.context");
        var REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref");
        var REACT_SUSPENSE_TYPE = Symbol.for("react.suspense");
        var REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list");
        var REACT_MEMO_TYPE = Symbol.for("react.memo");
        var REACT_LAZY_TYPE = Symbol.for("react.lazy");
        var REACT_OFFSCREEN_TYPE = Symbol.for("react.offscreen");
        var MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
        var FAUX_ITERATOR_SYMBOL = "@@iterator";
        function getIteratorFn(maybeIterable) {
          if (maybeIterable === null || typeof maybeIterable !== "object") {
            return null;
          }
          var maybeIterator = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable[FAUX_ITERATOR_SYMBOL];
          if (typeof maybeIterator === "function") {
            return maybeIterator;
          }
          return null;
        }
        var ReactSharedInternals = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
        function error(format) {
          {
            {
              for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
                args[_key2 - 1] = arguments[_key2];
              }
              printWarning("error", format, args);
            }
          }
        }
        function printWarning(level, format, args) {
          {
            var ReactDebugCurrentFrame2 = ReactSharedInternals.ReactDebugCurrentFrame;
            var stack = ReactDebugCurrentFrame2.getStackAddendum();
            if (stack !== "") {
              format += "%s";
              args = args.concat([stack]);
            }
            var argsWithFormat = args.map(function(item) {
              return String(item);
            });
            argsWithFormat.unshift("Warning: " + format);
            Function.prototype.apply.call(console[level], console, argsWithFormat);
          }
        }
        var enableScopeAPI = false;
        var enableCacheElement = false;
        var enableTransitionTracing = false;
        var enableLegacyHidden = false;
        var enableDebugTracing = false;
        var REACT_MODULE_REFERENCE;
        {
          REACT_MODULE_REFERENCE = Symbol.for("react.module.reference");
        }
        function isValidElementType(type) {
          if (typeof type === "string" || typeof type === "function") {
            return true;
          }
          if (type === REACT_FRAGMENT_TYPE || type === REACT_PROFILER_TYPE || enableDebugTracing || type === REACT_STRICT_MODE_TYPE || type === REACT_SUSPENSE_TYPE || type === REACT_SUSPENSE_LIST_TYPE || enableLegacyHidden || type === REACT_OFFSCREEN_TYPE || enableScopeAPI || enableCacheElement || enableTransitionTracing) {
            return true;
          }
          if (typeof type === "object" && type !== null) {
            if (type.$$typeof === REACT_LAZY_TYPE || type.$$typeof === REACT_MEMO_TYPE || type.$$typeof === REACT_PROVIDER_TYPE || type.$$typeof === REACT_CONTEXT_TYPE || type.$$typeof === REACT_FORWARD_REF_TYPE || // This needs to include all possible module reference object
            // types supported by any Flight configuration anywhere since
            // we don't know which Flight build this will end up being used
            // with.
            type.$$typeof === REACT_MODULE_REFERENCE || type.getModuleId !== void 0) {
              return true;
            }
          }
          return false;
        }
        function getWrappedName(outerType, innerType, wrapperName) {
          var displayName = outerType.displayName;
          if (displayName) {
            return displayName;
          }
          var functionName = innerType.displayName || innerType.name || "";
          return functionName !== "" ? wrapperName + "(" + functionName + ")" : wrapperName;
        }
        function getContextName(type) {
          return type.displayName || "Context";
        }
        function getComponentNameFromType(type) {
          if (type == null) {
            return null;
          }
          {
            if (typeof type.tag === "number") {
              error("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue.");
            }
          }
          if (typeof type === "function") {
            return type.displayName || type.name || null;
          }
          if (typeof type === "string") {
            return type;
          }
          switch (type) {
            case REACT_FRAGMENT_TYPE:
              return "Fragment";
            case REACT_PORTAL_TYPE:
              return "Portal";
            case REACT_PROFILER_TYPE:
              return "Profiler";
            case REACT_STRICT_MODE_TYPE:
              return "StrictMode";
            case REACT_SUSPENSE_TYPE:
              return "Suspense";
            case REACT_SUSPENSE_LIST_TYPE:
              return "SuspenseList";
          }
          if (typeof type === "object") {
            switch (type.$$typeof) {
              case REACT_CONTEXT_TYPE:
                var context = type;
                return getContextName(context) + ".Consumer";
              case REACT_PROVIDER_TYPE:
                var provider = type;
                return getContextName(provider._context) + ".Provider";
              case REACT_FORWARD_REF_TYPE:
                return getWrappedName(type, type.render, "ForwardRef");
              case REACT_MEMO_TYPE:
                var outerName = type.displayName || null;
                if (outerName !== null) {
                  return outerName;
                }
                return getComponentNameFromType(type.type) || "Memo";
              case REACT_LAZY_TYPE: {
                var lazyComponent = type;
                var payload = lazyComponent._payload;
                var init2 = lazyComponent._init;
                try {
                  return getComponentNameFromType(init2(payload));
                } catch (x2) {
                  return null;
                }
              }
            }
          }
          return null;
        }
        var assign = Object.assign;
        var disabledDepth = 0;
        var prevLog;
        var prevInfo;
        var prevWarn;
        var prevError;
        var prevGroup;
        var prevGroupCollapsed;
        var prevGroupEnd;
        function disabledLog() {
        }
        disabledLog.__reactDisabledLog = true;
        function disableLogs() {
          {
            if (disabledDepth === 0) {
              prevLog = console.log;
              prevInfo = console.info;
              prevWarn = console.warn;
              prevError = console.error;
              prevGroup = console.group;
              prevGroupCollapsed = console.groupCollapsed;
              prevGroupEnd = console.groupEnd;
              var props = {
                configurable: true,
                enumerable: true,
                value: disabledLog,
                writable: true
              };
              Object.defineProperties(console, {
                info: props,
                log: props,
                warn: props,
                error: props,
                group: props,
                groupCollapsed: props,
                groupEnd: props
              });
            }
            disabledDepth++;
          }
        }
        function reenableLogs() {
          {
            disabledDepth--;
            if (disabledDepth === 0) {
              var props = {
                configurable: true,
                enumerable: true,
                writable: true
              };
              Object.defineProperties(console, {
                log: assign({}, props, {
                  value: prevLog
                }),
                info: assign({}, props, {
                  value: prevInfo
                }),
                warn: assign({}, props, {
                  value: prevWarn
                }),
                error: assign({}, props, {
                  value: prevError
                }),
                group: assign({}, props, {
                  value: prevGroup
                }),
                groupCollapsed: assign({}, props, {
                  value: prevGroupCollapsed
                }),
                groupEnd: assign({}, props, {
                  value: prevGroupEnd
                })
              });
            }
            if (disabledDepth < 0) {
              error("disabledDepth fell below zero. This is a bug in React. Please file an issue.");
            }
          }
        }
        var ReactCurrentDispatcher = ReactSharedInternals.ReactCurrentDispatcher;
        var prefix;
        function describeBuiltInComponentFrame(name, source, ownerFn) {
          {
            if (prefix === void 0) {
              try {
                throw Error();
              } catch (x2) {
                var match = x2.stack.trim().match(/\n( *(at )?)/);
                prefix = match && match[1] || "";
              }
            }
            return "\n" + prefix + name;
          }
        }
        var reentry = false;
        var componentFrameCache;
        {
          var PossiblyWeakMap = typeof WeakMap === "function" ? WeakMap : Map;
          componentFrameCache = new PossiblyWeakMap();
        }
        function describeNativeComponentFrame(fn, construct) {
          if (!fn || reentry) {
            return "";
          }
          {
            var frame = componentFrameCache.get(fn);
            if (frame !== void 0) {
              return frame;
            }
          }
          var control;
          reentry = true;
          var previousPrepareStackTrace = Error.prepareStackTrace;
          Error.prepareStackTrace = void 0;
          var previousDispatcher;
          {
            previousDispatcher = ReactCurrentDispatcher.current;
            ReactCurrentDispatcher.current = null;
            disableLogs();
          }
          try {
            if (construct) {
              var Fake = function() {
                throw Error();
              };
              Object.defineProperty(Fake.prototype, "props", {
                set: function() {
                  throw Error();
                }
              });
              if (typeof Reflect === "object" && Reflect.construct) {
                try {
                  Reflect.construct(Fake, []);
                } catch (x2) {
                  control = x2;
                }
                Reflect.construct(fn, [], Fake);
              } else {
                try {
                  Fake.call();
                } catch (x2) {
                  control = x2;
                }
                fn.call(Fake.prototype);
              }
            } else {
              try {
                throw Error();
              } catch (x2) {
                control = x2;
              }
              fn();
            }
          } catch (sample) {
            if (sample && control && typeof sample.stack === "string") {
              var sampleLines = sample.stack.split("\n");
              var controlLines = control.stack.split("\n");
              var s2 = sampleLines.length - 1;
              var c2 = controlLines.length - 1;
              while (s2 >= 1 && c2 >= 0 && sampleLines[s2] !== controlLines[c2]) {
                c2--;
              }
              for (; s2 >= 1 && c2 >= 0; s2--, c2--) {
                if (sampleLines[s2] !== controlLines[c2]) {
                  if (s2 !== 1 || c2 !== 1) {
                    do {
                      s2--;
                      c2--;
                      if (c2 < 0 || sampleLines[s2] !== controlLines[c2]) {
                        var _frame = "\n" + sampleLines[s2].replace(" at new ", " at ");
                        if (fn.displayName && _frame.includes("<anonymous>")) {
                          _frame = _frame.replace("<anonymous>", fn.displayName);
                        }
                        {
                          if (typeof fn === "function") {
                            componentFrameCache.set(fn, _frame);
                          }
                        }
                        return _frame;
                      }
                    } while (s2 >= 1 && c2 >= 0);
                  }
                  break;
                }
              }
            }
          } finally {
            reentry = false;
            {
              ReactCurrentDispatcher.current = previousDispatcher;
              reenableLogs();
            }
            Error.prepareStackTrace = previousPrepareStackTrace;
          }
          var name = fn ? fn.displayName || fn.name : "";
          var syntheticFrame = name ? describeBuiltInComponentFrame(name) : "";
          {
            if (typeof fn === "function") {
              componentFrameCache.set(fn, syntheticFrame);
            }
          }
          return syntheticFrame;
        }
        function describeFunctionComponentFrame(fn, source, ownerFn) {
          {
            return describeNativeComponentFrame(fn, false);
          }
        }
        function shouldConstruct(Component) {
          var prototype = Component.prototype;
          return !!(prototype && prototype.isReactComponent);
        }
        function describeUnknownElementTypeFrameInDEV(type, source, ownerFn) {
          if (type == null) {
            return "";
          }
          if (typeof type === "function") {
            {
              return describeNativeComponentFrame(type, shouldConstruct(type));
            }
          }
          if (typeof type === "string") {
            return describeBuiltInComponentFrame(type);
          }
          switch (type) {
            case REACT_SUSPENSE_TYPE:
              return describeBuiltInComponentFrame("Suspense");
            case REACT_SUSPENSE_LIST_TYPE:
              return describeBuiltInComponentFrame("SuspenseList");
          }
          if (typeof type === "object") {
            switch (type.$$typeof) {
              case REACT_FORWARD_REF_TYPE:
                return describeFunctionComponentFrame(type.render);
              case REACT_MEMO_TYPE:
                return describeUnknownElementTypeFrameInDEV(type.type, source, ownerFn);
              case REACT_LAZY_TYPE: {
                var lazyComponent = type;
                var payload = lazyComponent._payload;
                var init2 = lazyComponent._init;
                try {
                  return describeUnknownElementTypeFrameInDEV(init2(payload), source, ownerFn);
                } catch (x2) {
                }
              }
            }
          }
          return "";
        }
        var hasOwnProperty = Object.prototype.hasOwnProperty;
        var loggedTypeFailures = {};
        var ReactDebugCurrentFrame = ReactSharedInternals.ReactDebugCurrentFrame;
        function setCurrentlyValidatingElement(element) {
          {
            if (element) {
              var owner = element._owner;
              var stack = describeUnknownElementTypeFrameInDEV(element.type, element._source, owner ? owner.type : null);
              ReactDebugCurrentFrame.setExtraStackFrame(stack);
            } else {
              ReactDebugCurrentFrame.setExtraStackFrame(null);
            }
          }
        }
        function checkPropTypes(typeSpecs, values, location, componentName, element) {
          {
            var has = Function.call.bind(hasOwnProperty);
            for (var typeSpecName in typeSpecs) {
              if (has(typeSpecs, typeSpecName)) {
                var error$1 = void 0;
                try {
                  if (typeof typeSpecs[typeSpecName] !== "function") {
                    var err = Error((componentName || "React class") + ": " + location + " type `" + typeSpecName + "` is invalid; it must be a function, usually from the `prop-types` package, but received `" + typeof typeSpecs[typeSpecName] + "`.This often happens because of typos such as `PropTypes.function` instead of `PropTypes.func`.");
                    err.name = "Invariant Violation";
                    throw err;
                  }
                  error$1 = typeSpecs[typeSpecName](values, typeSpecName, componentName, location, null, "SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED");
                } catch (ex) {
                  error$1 = ex;
                }
                if (error$1 && !(error$1 instanceof Error)) {
                  setCurrentlyValidatingElement(element);
                  error("%s: type specification of %s `%s` is invalid; the type checker function must return `null` or an `Error` but returned a %s. You may have forgotten to pass an argument to the type checker creator (arrayOf, instanceOf, objectOf, oneOf, oneOfType, and shape all require an argument).", componentName || "React class", location, typeSpecName, typeof error$1);
                  setCurrentlyValidatingElement(null);
                }
                if (error$1 instanceof Error && !(error$1.message in loggedTypeFailures)) {
                  loggedTypeFailures[error$1.message] = true;
                  setCurrentlyValidatingElement(element);
                  error("Failed %s type: %s", location, error$1.message);
                  setCurrentlyValidatingElement(null);
                }
              }
            }
          }
        }
        var isArrayImpl = Array.isArray;
        function isArray(a2) {
          return isArrayImpl(a2);
        }
        function typeName(value) {
          {
            var hasToStringTag = typeof Symbol === "function" && Symbol.toStringTag;
            var type = hasToStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
            return type;
          }
        }
        function willCoercionThrow(value) {
          {
            try {
              testStringCoercion(value);
              return false;
            } catch (e2) {
              return true;
            }
          }
        }
        function testStringCoercion(value) {
          return "" + value;
        }
        function checkKeyStringCoercion(value) {
          {
            if (willCoercionThrow(value)) {
              error("The provided key is an unsupported type %s. This value must be coerced to a string before before using it here.", typeName(value));
              return testStringCoercion(value);
            }
          }
        }
        var ReactCurrentOwner = ReactSharedInternals.ReactCurrentOwner;
        var RESERVED_PROPS = {
          key: true,
          ref: true,
          __self: true,
          __source: true
        };
        var specialPropKeyWarningShown;
        var specialPropRefWarningShown;
        var didWarnAboutStringRefs;
        {
          didWarnAboutStringRefs = {};
        }
        function hasValidRef(config) {
          {
            if (hasOwnProperty.call(config, "ref")) {
              var getter = Object.getOwnPropertyDescriptor(config, "ref").get;
              if (getter && getter.isReactWarning) {
                return false;
              }
            }
          }
          return config.ref !== void 0;
        }
        function hasValidKey(config) {
          {
            if (hasOwnProperty.call(config, "key")) {
              var getter = Object.getOwnPropertyDescriptor(config, "key").get;
              if (getter && getter.isReactWarning) {
                return false;
              }
            }
          }
          return config.key !== void 0;
        }
        function warnIfStringRefCannotBeAutoConverted(config, self) {
          {
            if (typeof config.ref === "string" && ReactCurrentOwner.current && self && ReactCurrentOwner.current.stateNode !== self) {
              var componentName = getComponentNameFromType(ReactCurrentOwner.current.type);
              if (!didWarnAboutStringRefs[componentName]) {
                error('Component "%s" contains the string ref "%s". Support for string refs will be removed in a future major release. This case cannot be automatically converted to an arrow function. We ask you to manually fix this case by using useRef() or createRef() instead. Learn more about using refs safely here: https://reactjs.org/link/strict-mode-string-ref', getComponentNameFromType(ReactCurrentOwner.current.type), config.ref);
                didWarnAboutStringRefs[componentName] = true;
              }
            }
          }
        }
        function defineKeyPropWarningGetter(props, displayName) {
          {
            var warnAboutAccessingKey = function() {
              if (!specialPropKeyWarningShown) {
                specialPropKeyWarningShown = true;
                error("%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", displayName);
              }
            };
            warnAboutAccessingKey.isReactWarning = true;
            Object.defineProperty(props, "key", {
              get: warnAboutAccessingKey,
              configurable: true
            });
          }
        }
        function defineRefPropWarningGetter(props, displayName) {
          {
            var warnAboutAccessingRef = function() {
              if (!specialPropRefWarningShown) {
                specialPropRefWarningShown = true;
                error("%s: `ref` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", displayName);
              }
            };
            warnAboutAccessingRef.isReactWarning = true;
            Object.defineProperty(props, "ref", {
              get: warnAboutAccessingRef,
              configurable: true
            });
          }
        }
        var ReactElement = function(type, key, ref, self, source, owner, props) {
          var element = {
            // This tag allows us to uniquely identify this as a React Element
            $$typeof: REACT_ELEMENT_TYPE,
            // Built-in properties that belong on the element
            type,
            key,
            ref,
            props,
            // Record the component responsible for creating this element.
            _owner: owner
          };
          {
            element._store = {};
            Object.defineProperty(element._store, "validated", {
              configurable: false,
              enumerable: false,
              writable: true,
              value: false
            });
            Object.defineProperty(element, "_self", {
              configurable: false,
              enumerable: false,
              writable: false,
              value: self
            });
            Object.defineProperty(element, "_source", {
              configurable: false,
              enumerable: false,
              writable: false,
              value: source
            });
            if (Object.freeze) {
              Object.freeze(element.props);
              Object.freeze(element);
            }
          }
          return element;
        };
        function jsxDEV(type, config, maybeKey, source, self) {
          {
            var propName;
            var props = {};
            var key = null;
            var ref = null;
            if (maybeKey !== void 0) {
              {
                checkKeyStringCoercion(maybeKey);
              }
              key = "" + maybeKey;
            }
            if (hasValidKey(config)) {
              {
                checkKeyStringCoercion(config.key);
              }
              key = "" + config.key;
            }
            if (hasValidRef(config)) {
              ref = config.ref;
              warnIfStringRefCannotBeAutoConverted(config, self);
            }
            for (propName in config) {
              if (hasOwnProperty.call(config, propName) && !RESERVED_PROPS.hasOwnProperty(propName)) {
                props[propName] = config[propName];
              }
            }
            if (type && type.defaultProps) {
              var defaultProps = type.defaultProps;
              for (propName in defaultProps) {
                if (props[propName] === void 0) {
                  props[propName] = defaultProps[propName];
                }
              }
            }
            if (key || ref) {
              var displayName = typeof type === "function" ? type.displayName || type.name || "Unknown" : type;
              if (key) {
                defineKeyPropWarningGetter(props, displayName);
              }
              if (ref) {
                defineRefPropWarningGetter(props, displayName);
              }
            }
            return ReactElement(type, key, ref, self, source, ReactCurrentOwner.current, props);
          }
        }
        var ReactCurrentOwner$1 = ReactSharedInternals.ReactCurrentOwner;
        var ReactDebugCurrentFrame$1 = ReactSharedInternals.ReactDebugCurrentFrame;
        function setCurrentlyValidatingElement$1(element) {
          {
            if (element) {
              var owner = element._owner;
              var stack = describeUnknownElementTypeFrameInDEV(element.type, element._source, owner ? owner.type : null);
              ReactDebugCurrentFrame$1.setExtraStackFrame(stack);
            } else {
              ReactDebugCurrentFrame$1.setExtraStackFrame(null);
            }
          }
        }
        var propTypesMisspellWarningShown;
        {
          propTypesMisspellWarningShown = false;
        }
        function isValidElement(object) {
          {
            return typeof object === "object" && object !== null && object.$$typeof === REACT_ELEMENT_TYPE;
          }
        }
        function getDeclarationErrorAddendum() {
          {
            if (ReactCurrentOwner$1.current) {
              var name = getComponentNameFromType(ReactCurrentOwner$1.current.type);
              if (name) {
                return "\n\nCheck the render method of `" + name + "`.";
              }
            }
            return "";
          }
        }
        function getSourceInfoErrorAddendum(source) {
          {
            if (source !== void 0) {
              var fileName = source.fileName.replace(/^.*[\\\/]/, "");
              var lineNumber = source.lineNumber;
              return "\n\nCheck your code at " + fileName + ":" + lineNumber + ".";
            }
            return "";
          }
        }
        var ownerHasKeyUseWarning = {};
        function getCurrentComponentErrorInfo(parentType) {
          {
            var info = getDeclarationErrorAddendum();
            if (!info) {
              var parentName = typeof parentType === "string" ? parentType : parentType.displayName || parentType.name;
              if (parentName) {
                info = "\n\nCheck the top-level render call using <" + parentName + ">.";
              }
            }
            return info;
          }
        }
        function validateExplicitKey(element, parentType) {
          {
            if (!element._store || element._store.validated || element.key != null) {
              return;
            }
            element._store.validated = true;
            var currentComponentErrorInfo = getCurrentComponentErrorInfo(parentType);
            if (ownerHasKeyUseWarning[currentComponentErrorInfo]) {
              return;
            }
            ownerHasKeyUseWarning[currentComponentErrorInfo] = true;
            var childOwner = "";
            if (element && element._owner && element._owner !== ReactCurrentOwner$1.current) {
              childOwner = " It was passed a child from " + getComponentNameFromType(element._owner.type) + ".";
            }
            setCurrentlyValidatingElement$1(element);
            error('Each child in a list should have a unique "key" prop.%s%s See https://reactjs.org/link/warning-keys for more information.', currentComponentErrorInfo, childOwner);
            setCurrentlyValidatingElement$1(null);
          }
        }
        function validateChildKeys(node, parentType) {
          {
            if (typeof node !== "object") {
              return;
            }
            if (isArray(node)) {
              for (var i2 = 0; i2 < node.length; i2++) {
                var child = node[i2];
                if (isValidElement(child)) {
                  validateExplicitKey(child, parentType);
                }
              }
            } else if (isValidElement(node)) {
              if (node._store) {
                node._store.validated = true;
              }
            } else if (node) {
              var iteratorFn = getIteratorFn(node);
              if (typeof iteratorFn === "function") {
                if (iteratorFn !== node.entries) {
                  var iterator = iteratorFn.call(node);
                  var step;
                  while (!(step = iterator.next()).done) {
                    if (isValidElement(step.value)) {
                      validateExplicitKey(step.value, parentType);
                    }
                  }
                }
              }
            }
          }
        }
        function validatePropTypes(element) {
          {
            var type = element.type;
            if (type === null || type === void 0 || typeof type === "string") {
              return;
            }
            var propTypes;
            if (typeof type === "function") {
              propTypes = type.propTypes;
            } else if (typeof type === "object" && (type.$$typeof === REACT_FORWARD_REF_TYPE || // Note: Memo only checks outer props here.
            // Inner props are checked in the reconciler.
            type.$$typeof === REACT_MEMO_TYPE)) {
              propTypes = type.propTypes;
            } else {
              return;
            }
            if (propTypes) {
              var name = getComponentNameFromType(type);
              checkPropTypes(propTypes, element.props, "prop", name, element);
            } else if (type.PropTypes !== void 0 && !propTypesMisspellWarningShown) {
              propTypesMisspellWarningShown = true;
              var _name = getComponentNameFromType(type);
              error("Component %s declared `PropTypes` instead of `propTypes`. Did you misspell the property assignment?", _name || "Unknown");
            }
            if (typeof type.getDefaultProps === "function" && !type.getDefaultProps.isReactClassApproved) {
              error("getDefaultProps is only used on classic React.createClass definitions. Use a static property named `defaultProps` instead.");
            }
          }
        }
        function validateFragmentProps(fragment) {
          {
            var keys = Object.keys(fragment.props);
            for (var i2 = 0; i2 < keys.length; i2++) {
              var key = keys[i2];
              if (key !== "children" && key !== "key") {
                setCurrentlyValidatingElement$1(fragment);
                error("Invalid prop `%s` supplied to `React.Fragment`. React.Fragment can only have `key` and `children` props.", key);
                setCurrentlyValidatingElement$1(null);
                break;
              }
            }
            if (fragment.ref !== null) {
              setCurrentlyValidatingElement$1(fragment);
              error("Invalid attribute `ref` supplied to `React.Fragment`.");
              setCurrentlyValidatingElement$1(null);
            }
          }
        }
        function jsxWithValidation(type, props, key, isStaticChildren, source, self) {
          {
            var validType = isValidElementType(type);
            if (!validType) {
              var info = "";
              if (type === void 0 || typeof type === "object" && type !== null && Object.keys(type).length === 0) {
                info += " You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.";
              }
              var sourceInfo = getSourceInfoErrorAddendum(source);
              if (sourceInfo) {
                info += sourceInfo;
              } else {
                info += getDeclarationErrorAddendum();
              }
              var typeString;
              if (type === null) {
                typeString = "null";
              } else if (isArray(type)) {
                typeString = "array";
              } else if (type !== void 0 && type.$$typeof === REACT_ELEMENT_TYPE) {
                typeString = "<" + (getComponentNameFromType(type.type) || "Unknown") + " />";
                info = " Did you accidentally export a JSX literal instead of a component?";
              } else {
                typeString = typeof type;
              }
              error("React.jsx: type is invalid -- expected a string (for built-in components) or a class/function (for composite components) but got: %s.%s", typeString, info);
            }
            var element = jsxDEV(type, props, key, source, self);
            if (element == null) {
              return element;
            }
            if (validType) {
              var children = props.children;
              if (children !== void 0) {
                if (isStaticChildren) {
                  if (isArray(children)) {
                    for (var i2 = 0; i2 < children.length; i2++) {
                      validateChildKeys(children[i2], type);
                    }
                    if (Object.freeze) {
                      Object.freeze(children);
                    }
                  } else {
                    error("React.jsx: Static children should always be an array. You are likely explicitly calling React.jsxs or React.jsxDEV. Use the Babel transform instead.");
                  }
                } else {
                  validateChildKeys(children, type);
                }
              }
            }
            if (type === REACT_FRAGMENT_TYPE) {
              validateFragmentProps(element);
            } else {
              validatePropTypes(element);
            }
            return element;
          }
        }
        function jsxWithValidationStatic(type, props, key) {
          {
            return jsxWithValidation(type, props, key, true);
          }
        }
        function jsxWithValidationDynamic(type, props, key) {
          {
            return jsxWithValidation(type, props, key, false);
          }
        }
        var jsx2 = jsxWithValidationDynamic;
        var jsxs2 = jsxWithValidationStatic;
        exports.Fragment = REACT_FRAGMENT_TYPE;
        exports.jsx = jsx2;
        exports.jsxs = jsxs2;
      })();
    }
  }
});

// ../../node_modules/react/jsx-runtime.js
var require_jsx_runtime = __commonJS({
  "../../node_modules/react/jsx-runtime.js"(exports, module2) {
    "use strict";
    if (process.env.NODE_ENV === "production") {
      module2.exports = require_react_jsx_runtime_production_min();
    } else {
      module2.exports = require_react_jsx_runtime_development();
    }
  }
});

// ../../node_modules/pako/lib/zlib/trees.js
var require_trees = __commonJS({
  "../../node_modules/pako/lib/zlib/trees.js"(exports, module2) {
    "use strict";
    var Z_FIXED = 4;
    var Z_BINARY = 0;
    var Z_TEXT = 1;
    var Z_UNKNOWN = 2;
    function zero(buf) {
      let len = buf.length;
      while (--len >= 0) {
        buf[len] = 0;
      }
    }
    var STORED_BLOCK = 0;
    var STATIC_TREES = 1;
    var DYN_TREES = 2;
    var MIN_MATCH = 3;
    var MAX_MATCH = 258;
    var LENGTH_CODES = 29;
    var LITERALS = 256;
    var L_CODES = LITERALS + 1 + LENGTH_CODES;
    var D_CODES = 30;
    var BL_CODES = 19;
    var HEAP_SIZE = 2 * L_CODES + 1;
    var MAX_BITS = 15;
    var Buf_size = 16;
    var MAX_BL_BITS = 7;
    var END_BLOCK = 256;
    var REP_3_6 = 16;
    var REPZ_3_10 = 17;
    var REPZ_11_138 = 18;
    var extra_lbits = (
      /* extra bits for each length code */
      new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0])
    );
    var extra_dbits = (
      /* extra bits for each distance code */
      new Uint8Array([0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13])
    );
    var extra_blbits = (
      /* extra bits for each bit length code */
      new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 7])
    );
    var bl_order = new Uint8Array([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
    var DIST_CODE_LEN = 512;
    var static_ltree = new Array((L_CODES + 2) * 2);
    zero(static_ltree);
    var static_dtree = new Array(D_CODES * 2);
    zero(static_dtree);
    var _dist_code = new Array(DIST_CODE_LEN);
    zero(_dist_code);
    var _length_code = new Array(MAX_MATCH - MIN_MATCH + 1);
    zero(_length_code);
    var base_length = new Array(LENGTH_CODES);
    zero(base_length);
    var base_dist = new Array(D_CODES);
    zero(base_dist);
    function StaticTreeDesc(static_tree, extra_bits, extra_base, elems, max_length) {
      this.static_tree = static_tree;
      this.extra_bits = extra_bits;
      this.extra_base = extra_base;
      this.elems = elems;
      this.max_length = max_length;
      this.has_stree = static_tree && static_tree.length;
    }
    var static_l_desc;
    var static_d_desc;
    var static_bl_desc;
    function TreeDesc(dyn_tree, stat_desc) {
      this.dyn_tree = dyn_tree;
      this.max_code = 0;
      this.stat_desc = stat_desc;
    }
    var d_code = (dist) => {
      return dist < 256 ? _dist_code[dist] : _dist_code[256 + (dist >>> 7)];
    };
    var put_short = (s2, w2) => {
      s2.pending_buf[s2.pending++] = w2 & 255;
      s2.pending_buf[s2.pending++] = w2 >>> 8 & 255;
    };
    var send_bits = (s2, value, length) => {
      if (s2.bi_valid > Buf_size - length) {
        s2.bi_buf |= value << s2.bi_valid & 65535;
        put_short(s2, s2.bi_buf);
        s2.bi_buf = value >> Buf_size - s2.bi_valid;
        s2.bi_valid += length - Buf_size;
      } else {
        s2.bi_buf |= value << s2.bi_valid & 65535;
        s2.bi_valid += length;
      }
    };
    var send_code = (s2, c2, tree) => {
      send_bits(
        s2,
        tree[c2 * 2],
        tree[c2 * 2 + 1]
        /*.Len*/
      );
    };
    var bi_reverse = (code, len) => {
      let res = 0;
      do {
        res |= code & 1;
        code >>>= 1;
        res <<= 1;
      } while (--len > 0);
      return res >>> 1;
    };
    var bi_flush = (s2) => {
      if (s2.bi_valid === 16) {
        put_short(s2, s2.bi_buf);
        s2.bi_buf = 0;
        s2.bi_valid = 0;
      } else if (s2.bi_valid >= 8) {
        s2.pending_buf[s2.pending++] = s2.bi_buf & 255;
        s2.bi_buf >>= 8;
        s2.bi_valid -= 8;
      }
    };
    var gen_bitlen = (s2, desc) => {
      const tree = desc.dyn_tree;
      const max_code = desc.max_code;
      const stree = desc.stat_desc.static_tree;
      const has_stree = desc.stat_desc.has_stree;
      const extra = desc.stat_desc.extra_bits;
      const base = desc.stat_desc.extra_base;
      const max_length = desc.stat_desc.max_length;
      let h;
      let n2, m2;
      let bits;
      let xbits;
      let f2;
      let overflow = 0;
      for (bits = 0; bits <= MAX_BITS; bits++) {
        s2.bl_count[bits] = 0;
      }
      tree[s2.heap[s2.heap_max] * 2 + 1] = 0;
      for (h = s2.heap_max + 1; h < HEAP_SIZE; h++) {
        n2 = s2.heap[h];
        bits = tree[tree[n2 * 2 + 1] * 2 + 1] + 1;
        if (bits > max_length) {
          bits = max_length;
          overflow++;
        }
        tree[n2 * 2 + 1] = bits;
        if (n2 > max_code) {
          continue;
        }
        s2.bl_count[bits]++;
        xbits = 0;
        if (n2 >= base) {
          xbits = extra[n2 - base];
        }
        f2 = tree[n2 * 2];
        s2.opt_len += f2 * (bits + xbits);
        if (has_stree) {
          s2.static_len += f2 * (stree[n2 * 2 + 1] + xbits);
        }
      }
      if (overflow === 0) {
        return;
      }
      do {
        bits = max_length - 1;
        while (s2.bl_count[bits] === 0) {
          bits--;
        }
        s2.bl_count[bits]--;
        s2.bl_count[bits + 1] += 2;
        s2.bl_count[max_length]--;
        overflow -= 2;
      } while (overflow > 0);
      for (bits = max_length; bits !== 0; bits--) {
        n2 = s2.bl_count[bits];
        while (n2 !== 0) {
          m2 = s2.heap[--h];
          if (m2 > max_code) {
            continue;
          }
          if (tree[m2 * 2 + 1] !== bits) {
            s2.opt_len += (bits - tree[m2 * 2 + 1]) * tree[m2 * 2];
            tree[m2 * 2 + 1] = bits;
          }
          n2--;
        }
      }
    };
    var gen_codes = (tree, max_code, bl_count) => {
      const next_code = new Array(MAX_BITS + 1);
      let code = 0;
      let bits;
      let n2;
      for (bits = 1; bits <= MAX_BITS; bits++) {
        code = code + bl_count[bits - 1] << 1;
        next_code[bits] = code;
      }
      for (n2 = 0; n2 <= max_code; n2++) {
        let len = tree[n2 * 2 + 1];
        if (len === 0) {
          continue;
        }
        tree[n2 * 2] = bi_reverse(next_code[len]++, len);
      }
    };
    var tr_static_init = () => {
      let n2;
      let bits;
      let length;
      let code;
      let dist;
      const bl_count = new Array(MAX_BITS + 1);
      length = 0;
      for (code = 0; code < LENGTH_CODES - 1; code++) {
        base_length[code] = length;
        for (n2 = 0; n2 < 1 << extra_lbits[code]; n2++) {
          _length_code[length++] = code;
        }
      }
      _length_code[length - 1] = code;
      dist = 0;
      for (code = 0; code < 16; code++) {
        base_dist[code] = dist;
        for (n2 = 0; n2 < 1 << extra_dbits[code]; n2++) {
          _dist_code[dist++] = code;
        }
      }
      dist >>= 7;
      for (; code < D_CODES; code++) {
        base_dist[code] = dist << 7;
        for (n2 = 0; n2 < 1 << extra_dbits[code] - 7; n2++) {
          _dist_code[256 + dist++] = code;
        }
      }
      for (bits = 0; bits <= MAX_BITS; bits++) {
        bl_count[bits] = 0;
      }
      n2 = 0;
      while (n2 <= 143) {
        static_ltree[n2 * 2 + 1] = 8;
        n2++;
        bl_count[8]++;
      }
      while (n2 <= 255) {
        static_ltree[n2 * 2 + 1] = 9;
        n2++;
        bl_count[9]++;
      }
      while (n2 <= 279) {
        static_ltree[n2 * 2 + 1] = 7;
        n2++;
        bl_count[7]++;
      }
      while (n2 <= 287) {
        static_ltree[n2 * 2 + 1] = 8;
        n2++;
        bl_count[8]++;
      }
      gen_codes(static_ltree, L_CODES + 1, bl_count);
      for (n2 = 0; n2 < D_CODES; n2++) {
        static_dtree[n2 * 2 + 1] = 5;
        static_dtree[n2 * 2] = bi_reverse(n2, 5);
      }
      static_l_desc = new StaticTreeDesc(static_ltree, extra_lbits, LITERALS + 1, L_CODES, MAX_BITS);
      static_d_desc = new StaticTreeDesc(static_dtree, extra_dbits, 0, D_CODES, MAX_BITS);
      static_bl_desc = new StaticTreeDesc(new Array(0), extra_blbits, 0, BL_CODES, MAX_BL_BITS);
    };
    var init_block = (s2) => {
      let n2;
      for (n2 = 0; n2 < L_CODES; n2++) {
        s2.dyn_ltree[n2 * 2] = 0;
      }
      for (n2 = 0; n2 < D_CODES; n2++) {
        s2.dyn_dtree[n2 * 2] = 0;
      }
      for (n2 = 0; n2 < BL_CODES; n2++) {
        s2.bl_tree[n2 * 2] = 0;
      }
      s2.dyn_ltree[END_BLOCK * 2] = 1;
      s2.opt_len = s2.static_len = 0;
      s2.sym_next = s2.matches = 0;
    };
    var bi_windup = (s2) => {
      if (s2.bi_valid > 8) {
        put_short(s2, s2.bi_buf);
      } else if (s2.bi_valid > 0) {
        s2.pending_buf[s2.pending++] = s2.bi_buf;
      }
      s2.bi_buf = 0;
      s2.bi_valid = 0;
    };
    var smaller = (tree, n2, m2, depth) => {
      const _n2 = n2 * 2;
      const _m2 = m2 * 2;
      return tree[_n2] < tree[_m2] || tree[_n2] === tree[_m2] && depth[n2] <= depth[m2];
    };
    var pqdownheap = (s2, tree, k2) => {
      const v2 = s2.heap[k2];
      let j2 = k2 << 1;
      while (j2 <= s2.heap_len) {
        if (j2 < s2.heap_len && smaller(tree, s2.heap[j2 + 1], s2.heap[j2], s2.depth)) {
          j2++;
        }
        if (smaller(tree, v2, s2.heap[j2], s2.depth)) {
          break;
        }
        s2.heap[k2] = s2.heap[j2];
        k2 = j2;
        j2 <<= 1;
      }
      s2.heap[k2] = v2;
    };
    var compress_block = (s2, ltree, dtree) => {
      let dist;
      let lc;
      let sx = 0;
      let code;
      let extra;
      if (s2.sym_next !== 0) {
        do {
          dist = s2.pending_buf[s2.sym_buf + sx++] & 255;
          dist += (s2.pending_buf[s2.sym_buf + sx++] & 255) << 8;
          lc = s2.pending_buf[s2.sym_buf + sx++];
          if (dist === 0) {
            send_code(s2, lc, ltree);
          } else {
            code = _length_code[lc];
            send_code(s2, code + LITERALS + 1, ltree);
            extra = extra_lbits[code];
            if (extra !== 0) {
              lc -= base_length[code];
              send_bits(s2, lc, extra);
            }
            dist--;
            code = d_code(dist);
            send_code(s2, code, dtree);
            extra = extra_dbits[code];
            if (extra !== 0) {
              dist -= base_dist[code];
              send_bits(s2, dist, extra);
            }
          }
        } while (sx < s2.sym_next);
      }
      send_code(s2, END_BLOCK, ltree);
    };
    var build_tree = (s2, desc) => {
      const tree = desc.dyn_tree;
      const stree = desc.stat_desc.static_tree;
      const has_stree = desc.stat_desc.has_stree;
      const elems = desc.stat_desc.elems;
      let n2, m2;
      let max_code = -1;
      let node;
      s2.heap_len = 0;
      s2.heap_max = HEAP_SIZE;
      for (n2 = 0; n2 < elems; n2++) {
        if (tree[n2 * 2] !== 0) {
          s2.heap[++s2.heap_len] = max_code = n2;
          s2.depth[n2] = 0;
        } else {
          tree[n2 * 2 + 1] = 0;
        }
      }
      while (s2.heap_len < 2) {
        node = s2.heap[++s2.heap_len] = max_code < 2 ? ++max_code : 0;
        tree[node * 2] = 1;
        s2.depth[node] = 0;
        s2.opt_len--;
        if (has_stree) {
          s2.static_len -= stree[node * 2 + 1];
        }
      }
      desc.max_code = max_code;
      for (n2 = s2.heap_len >> 1; n2 >= 1; n2--) {
        pqdownheap(s2, tree, n2);
      }
      node = elems;
      do {
        n2 = s2.heap[
          1
          /*SMALLEST*/
        ];
        s2.heap[
          1
          /*SMALLEST*/
        ] = s2.heap[s2.heap_len--];
        pqdownheap(
          s2,
          tree,
          1
          /*SMALLEST*/
        );
        m2 = s2.heap[
          1
          /*SMALLEST*/
        ];
        s2.heap[--s2.heap_max] = n2;
        s2.heap[--s2.heap_max] = m2;
        tree[node * 2] = tree[n2 * 2] + tree[m2 * 2];
        s2.depth[node] = (s2.depth[n2] >= s2.depth[m2] ? s2.depth[n2] : s2.depth[m2]) + 1;
        tree[n2 * 2 + 1] = tree[m2 * 2 + 1] = node;
        s2.heap[
          1
          /*SMALLEST*/
        ] = node++;
        pqdownheap(
          s2,
          tree,
          1
          /*SMALLEST*/
        );
      } while (s2.heap_len >= 2);
      s2.heap[--s2.heap_max] = s2.heap[
        1
        /*SMALLEST*/
      ];
      gen_bitlen(s2, desc);
      gen_codes(tree, max_code, s2.bl_count);
    };
    var scan_tree = (s2, tree, max_code) => {
      let n2;
      let prevlen = -1;
      let curlen;
      let nextlen = tree[0 * 2 + 1];
      let count = 0;
      let max_count = 7;
      let min_count = 4;
      if (nextlen === 0) {
        max_count = 138;
        min_count = 3;
      }
      tree[(max_code + 1) * 2 + 1] = 65535;
      for (n2 = 0; n2 <= max_code; n2++) {
        curlen = nextlen;
        nextlen = tree[(n2 + 1) * 2 + 1];
        if (++count < max_count && curlen === nextlen) {
          continue;
        } else if (count < min_count) {
          s2.bl_tree[curlen * 2] += count;
        } else if (curlen !== 0) {
          if (curlen !== prevlen) {
            s2.bl_tree[curlen * 2]++;
          }
          s2.bl_tree[REP_3_6 * 2]++;
        } else if (count <= 10) {
          s2.bl_tree[REPZ_3_10 * 2]++;
        } else {
          s2.bl_tree[REPZ_11_138 * 2]++;
        }
        count = 0;
        prevlen = curlen;
        if (nextlen === 0) {
          max_count = 138;
          min_count = 3;
        } else if (curlen === nextlen) {
          max_count = 6;
          min_count = 3;
        } else {
          max_count = 7;
          min_count = 4;
        }
      }
    };
    var send_tree = (s2, tree, max_code) => {
      let n2;
      let prevlen = -1;
      let curlen;
      let nextlen = tree[0 * 2 + 1];
      let count = 0;
      let max_count = 7;
      let min_count = 4;
      if (nextlen === 0) {
        max_count = 138;
        min_count = 3;
      }
      for (n2 = 0; n2 <= max_code; n2++) {
        curlen = nextlen;
        nextlen = tree[(n2 + 1) * 2 + 1];
        if (++count < max_count && curlen === nextlen) {
          continue;
        } else if (count < min_count) {
          do {
            send_code(s2, curlen, s2.bl_tree);
          } while (--count !== 0);
        } else if (curlen !== 0) {
          if (curlen !== prevlen) {
            send_code(s2, curlen, s2.bl_tree);
            count--;
          }
          send_code(s2, REP_3_6, s2.bl_tree);
          send_bits(s2, count - 3, 2);
        } else if (count <= 10) {
          send_code(s2, REPZ_3_10, s2.bl_tree);
          send_bits(s2, count - 3, 3);
        } else {
          send_code(s2, REPZ_11_138, s2.bl_tree);
          send_bits(s2, count - 11, 7);
        }
        count = 0;
        prevlen = curlen;
        if (nextlen === 0) {
          max_count = 138;
          min_count = 3;
        } else if (curlen === nextlen) {
          max_count = 6;
          min_count = 3;
        } else {
          max_count = 7;
          min_count = 4;
        }
      }
    };
    var build_bl_tree = (s2) => {
      let max_blindex;
      scan_tree(s2, s2.dyn_ltree, s2.l_desc.max_code);
      scan_tree(s2, s2.dyn_dtree, s2.d_desc.max_code);
      build_tree(s2, s2.bl_desc);
      for (max_blindex = BL_CODES - 1; max_blindex >= 3; max_blindex--) {
        if (s2.bl_tree[bl_order[max_blindex] * 2 + 1] !== 0) {
          break;
        }
      }
      s2.opt_len += 3 * (max_blindex + 1) + 5 + 5 + 4;
      return max_blindex;
    };
    var send_all_trees = (s2, lcodes, dcodes, blcodes) => {
      let rank;
      send_bits(s2, lcodes - 257, 5);
      send_bits(s2, dcodes - 1, 5);
      send_bits(s2, blcodes - 4, 4);
      for (rank = 0; rank < blcodes; rank++) {
        send_bits(s2, s2.bl_tree[bl_order[rank] * 2 + 1], 3);
      }
      send_tree(s2, s2.dyn_ltree, lcodes - 1);
      send_tree(s2, s2.dyn_dtree, dcodes - 1);
    };
    var detect_data_type = (s2) => {
      let block_mask = 4093624447;
      let n2;
      for (n2 = 0; n2 <= 31; n2++, block_mask >>>= 1) {
        if (block_mask & 1 && s2.dyn_ltree[n2 * 2] !== 0) {
          return Z_BINARY;
        }
      }
      if (s2.dyn_ltree[9 * 2] !== 0 || s2.dyn_ltree[10 * 2] !== 0 || s2.dyn_ltree[13 * 2] !== 0) {
        return Z_TEXT;
      }
      for (n2 = 32; n2 < LITERALS; n2++) {
        if (s2.dyn_ltree[n2 * 2] !== 0) {
          return Z_TEXT;
        }
      }
      return Z_BINARY;
    };
    var static_init_done = false;
    var _tr_init = (s2) => {
      if (!static_init_done) {
        tr_static_init();
        static_init_done = true;
      }
      s2.l_desc = new TreeDesc(s2.dyn_ltree, static_l_desc);
      s2.d_desc = new TreeDesc(s2.dyn_dtree, static_d_desc);
      s2.bl_desc = new TreeDesc(s2.bl_tree, static_bl_desc);
      s2.bi_buf = 0;
      s2.bi_valid = 0;
      init_block(s2);
    };
    var _tr_stored_block = (s2, buf, stored_len, last) => {
      send_bits(s2, (STORED_BLOCK << 1) + (last ? 1 : 0), 3);
      bi_windup(s2);
      put_short(s2, stored_len);
      put_short(s2, ~stored_len);
      if (stored_len) {
        s2.pending_buf.set(s2.window.subarray(buf, buf + stored_len), s2.pending);
      }
      s2.pending += stored_len;
    };
    var _tr_align = (s2) => {
      send_bits(s2, STATIC_TREES << 1, 3);
      send_code(s2, END_BLOCK, static_ltree);
      bi_flush(s2);
    };
    var _tr_flush_block = (s2, buf, stored_len, last) => {
      let opt_lenb, static_lenb;
      let max_blindex = 0;
      if (s2.level > 0) {
        if (s2.strm.data_type === Z_UNKNOWN) {
          s2.strm.data_type = detect_data_type(s2);
        }
        build_tree(s2, s2.l_desc);
        build_tree(s2, s2.d_desc);
        max_blindex = build_bl_tree(s2);
        opt_lenb = s2.opt_len + 3 + 7 >>> 3;
        static_lenb = s2.static_len + 3 + 7 >>> 3;
        if (static_lenb <= opt_lenb) {
          opt_lenb = static_lenb;
        }
      } else {
        opt_lenb = static_lenb = stored_len + 5;
      }
      if (stored_len + 4 <= opt_lenb && buf !== -1) {
        _tr_stored_block(s2, buf, stored_len, last);
      } else if (s2.strategy === Z_FIXED || static_lenb === opt_lenb) {
        send_bits(s2, (STATIC_TREES << 1) + (last ? 1 : 0), 3);
        compress_block(s2, static_ltree, static_dtree);
      } else {
        send_bits(s2, (DYN_TREES << 1) + (last ? 1 : 0), 3);
        send_all_trees(s2, s2.l_desc.max_code + 1, s2.d_desc.max_code + 1, max_blindex + 1);
        compress_block(s2, s2.dyn_ltree, s2.dyn_dtree);
      }
      init_block(s2);
      if (last) {
        bi_windup(s2);
      }
    };
    var _tr_tally = (s2, dist, lc) => {
      s2.pending_buf[s2.sym_buf + s2.sym_next++] = dist;
      s2.pending_buf[s2.sym_buf + s2.sym_next++] = dist >> 8;
      s2.pending_buf[s2.sym_buf + s2.sym_next++] = lc;
      if (dist === 0) {
        s2.dyn_ltree[lc * 2]++;
      } else {
        s2.matches++;
        dist--;
        s2.dyn_ltree[(_length_code[lc] + LITERALS + 1) * 2]++;
        s2.dyn_dtree[d_code(dist) * 2]++;
      }
      return s2.sym_next === s2.sym_end;
    };
    module2.exports._tr_init = _tr_init;
    module2.exports._tr_stored_block = _tr_stored_block;
    module2.exports._tr_flush_block = _tr_flush_block;
    module2.exports._tr_tally = _tr_tally;
    module2.exports._tr_align = _tr_align;
  }
});

// ../../node_modules/pako/lib/zlib/adler32.js
var require_adler32 = __commonJS({
  "../../node_modules/pako/lib/zlib/adler32.js"(exports, module2) {
    "use strict";
    var adler32 = (adler, buf, len, pos) => {
      let s1 = adler & 65535 | 0, s2 = adler >>> 16 & 65535 | 0, n2 = 0;
      while (len !== 0) {
        n2 = len > 2e3 ? 2e3 : len;
        len -= n2;
        do {
          s1 = s1 + buf[pos++] | 0;
          s2 = s2 + s1 | 0;
        } while (--n2);
        s1 %= 65521;
        s2 %= 65521;
      }
      return s1 | s2 << 16 | 0;
    };
    module2.exports = adler32;
  }
});

// ../../node_modules/pako/lib/zlib/crc32.js
var require_crc32 = __commonJS({
  "../../node_modules/pako/lib/zlib/crc32.js"(exports, module2) {
    "use strict";
    var makeTable = () => {
      let c2, table = [];
      for (var n2 = 0; n2 < 256; n2++) {
        c2 = n2;
        for (var k2 = 0; k2 < 8; k2++) {
          c2 = c2 & 1 ? 3988292384 ^ c2 >>> 1 : c2 >>> 1;
        }
        table[n2] = c2;
      }
      return table;
    };
    var crcTable = new Uint32Array(makeTable());
    var crc32 = (crc, buf, len, pos) => {
      const t2 = crcTable;
      const end = pos + len;
      crc ^= -1;
      for (let i2 = pos; i2 < end; i2++) {
        crc = crc >>> 8 ^ t2[(crc ^ buf[i2]) & 255];
      }
      return crc ^ -1;
    };
    module2.exports = crc32;
  }
});

// ../../node_modules/pako/lib/zlib/messages.js
var require_messages = __commonJS({
  "../../node_modules/pako/lib/zlib/messages.js"(exports, module2) {
    "use strict";
    module2.exports = {
      2: "need dictionary",
      /* Z_NEED_DICT       2  */
      1: "stream end",
      /* Z_STREAM_END      1  */
      0: "",
      /* Z_OK              0  */
      "-1": "file error",
      /* Z_ERRNO         (-1) */
      "-2": "stream error",
      /* Z_STREAM_ERROR  (-2) */
      "-3": "data error",
      /* Z_DATA_ERROR    (-3) */
      "-4": "insufficient memory",
      /* Z_MEM_ERROR     (-4) */
      "-5": "buffer error",
      /* Z_BUF_ERROR     (-5) */
      "-6": "incompatible version"
      /* Z_VERSION_ERROR (-6) */
    };
  }
});

// ../../node_modules/pako/lib/zlib/constants.js
var require_constants = __commonJS({
  "../../node_modules/pako/lib/zlib/constants.js"(exports, module2) {
    "use strict";
    module2.exports = {
      /* Allowed flush values; see deflate() and inflate() below for details */
      Z_NO_FLUSH: 0,
      Z_PARTIAL_FLUSH: 1,
      Z_SYNC_FLUSH: 2,
      Z_FULL_FLUSH: 3,
      Z_FINISH: 4,
      Z_BLOCK: 5,
      Z_TREES: 6,
      /* Return codes for the compression/decompression functions. Negative values
      * are errors, positive values are used for special but normal events.
      */
      Z_OK: 0,
      Z_STREAM_END: 1,
      Z_NEED_DICT: 2,
      Z_ERRNO: -1,
      Z_STREAM_ERROR: -2,
      Z_DATA_ERROR: -3,
      Z_MEM_ERROR: -4,
      Z_BUF_ERROR: -5,
      //Z_VERSION_ERROR: -6,
      /* compression levels */
      Z_NO_COMPRESSION: 0,
      Z_BEST_SPEED: 1,
      Z_BEST_COMPRESSION: 9,
      Z_DEFAULT_COMPRESSION: -1,
      Z_FILTERED: 1,
      Z_HUFFMAN_ONLY: 2,
      Z_RLE: 3,
      Z_FIXED: 4,
      Z_DEFAULT_STRATEGY: 0,
      /* Possible values of the data_type field (though see inflate()) */
      Z_BINARY: 0,
      Z_TEXT: 1,
      //Z_ASCII:                1, // = Z_TEXT (deprecated)
      Z_UNKNOWN: 2,
      /* The deflate compression method */
      Z_DEFLATED: 8
      //Z_NULL:                 null // Use -1 or null inline, depending on var type
    };
  }
});

// ../../node_modules/pako/lib/zlib/deflate.js
var require_deflate = __commonJS({
  "../../node_modules/pako/lib/zlib/deflate.js"(exports, module2) {
    "use strict";
    var { _tr_init, _tr_stored_block, _tr_flush_block, _tr_tally, _tr_align } = require_trees();
    var adler32 = require_adler32();
    var crc32 = require_crc32();
    var msg = require_messages();
    var {
      Z_NO_FLUSH,
      Z_PARTIAL_FLUSH,
      Z_FULL_FLUSH,
      Z_FINISH,
      Z_BLOCK,
      Z_OK,
      Z_STREAM_END,
      Z_STREAM_ERROR,
      Z_DATA_ERROR,
      Z_BUF_ERROR,
      Z_DEFAULT_COMPRESSION,
      Z_FILTERED,
      Z_HUFFMAN_ONLY,
      Z_RLE,
      Z_FIXED,
      Z_DEFAULT_STRATEGY,
      Z_UNKNOWN,
      Z_DEFLATED
    } = require_constants();
    var MAX_MEM_LEVEL = 9;
    var MAX_WBITS = 15;
    var DEF_MEM_LEVEL = 8;
    var LENGTH_CODES = 29;
    var LITERALS = 256;
    var L_CODES = LITERALS + 1 + LENGTH_CODES;
    var D_CODES = 30;
    var BL_CODES = 19;
    var HEAP_SIZE = 2 * L_CODES + 1;
    var MAX_BITS = 15;
    var MIN_MATCH = 3;
    var MAX_MATCH = 258;
    var MIN_LOOKAHEAD = MAX_MATCH + MIN_MATCH + 1;
    var PRESET_DICT = 32;
    var INIT_STATE = 42;
    var GZIP_STATE = 57;
    var EXTRA_STATE = 69;
    var NAME_STATE = 73;
    var COMMENT_STATE = 91;
    var HCRC_STATE = 103;
    var BUSY_STATE = 113;
    var FINISH_STATE = 666;
    var BS_NEED_MORE = 1;
    var BS_BLOCK_DONE = 2;
    var BS_FINISH_STARTED = 3;
    var BS_FINISH_DONE = 4;
    var OS_CODE = 3;
    var err = (strm, errorCode) => {
      strm.msg = msg[errorCode];
      return errorCode;
    };
    var rank = (f2) => {
      return f2 * 2 - (f2 > 4 ? 9 : 0);
    };
    var zero = (buf) => {
      let len = buf.length;
      while (--len >= 0) {
        buf[len] = 0;
      }
    };
    var slide_hash = (s2) => {
      let n2, m2;
      let p;
      let wsize = s2.w_size;
      n2 = s2.hash_size;
      p = n2;
      do {
        m2 = s2.head[--p];
        s2.head[p] = m2 >= wsize ? m2 - wsize : 0;
      } while (--n2);
      n2 = wsize;
      p = n2;
      do {
        m2 = s2.prev[--p];
        s2.prev[p] = m2 >= wsize ? m2 - wsize : 0;
      } while (--n2);
    };
    var HASH_ZLIB = (s2, prev, data) => (prev << s2.hash_shift ^ data) & s2.hash_mask;
    var HASH = HASH_ZLIB;
    var flush_pending = (strm) => {
      const s2 = strm.state;
      let len = s2.pending;
      if (len > strm.avail_out) {
        len = strm.avail_out;
      }
      if (len === 0) {
        return;
      }
      strm.output.set(s2.pending_buf.subarray(s2.pending_out, s2.pending_out + len), strm.next_out);
      strm.next_out += len;
      s2.pending_out += len;
      strm.total_out += len;
      strm.avail_out -= len;
      s2.pending -= len;
      if (s2.pending === 0) {
        s2.pending_out = 0;
      }
    };
    var flush_block_only = (s2, last) => {
      _tr_flush_block(s2, s2.block_start >= 0 ? s2.block_start : -1, s2.strstart - s2.block_start, last);
      s2.block_start = s2.strstart;
      flush_pending(s2.strm);
    };
    var put_byte = (s2, b2) => {
      s2.pending_buf[s2.pending++] = b2;
    };
    var putShortMSB = (s2, b2) => {
      s2.pending_buf[s2.pending++] = b2 >>> 8 & 255;
      s2.pending_buf[s2.pending++] = b2 & 255;
    };
    var read_buf = (strm, buf, start, size) => {
      let len = strm.avail_in;
      if (len > size) {
        len = size;
      }
      if (len === 0) {
        return 0;
      }
      strm.avail_in -= len;
      buf.set(strm.input.subarray(strm.next_in, strm.next_in + len), start);
      if (strm.state.wrap === 1) {
        strm.adler = adler32(strm.adler, buf, len, start);
      } else if (strm.state.wrap === 2) {
        strm.adler = crc32(strm.adler, buf, len, start);
      }
      strm.next_in += len;
      strm.total_in += len;
      return len;
    };
    var longest_match = (s2, cur_match) => {
      let chain_length = s2.max_chain_length;
      let scan = s2.strstart;
      let match;
      let len;
      let best_len = s2.prev_length;
      let nice_match = s2.nice_match;
      const limit = s2.strstart > s2.w_size - MIN_LOOKAHEAD ? s2.strstart - (s2.w_size - MIN_LOOKAHEAD) : 0;
      const _win = s2.window;
      const wmask = s2.w_mask;
      const prev = s2.prev;
      const strend = s2.strstart + MAX_MATCH;
      let scan_end1 = _win[scan + best_len - 1];
      let scan_end = _win[scan + best_len];
      if (s2.prev_length >= s2.good_match) {
        chain_length >>= 2;
      }
      if (nice_match > s2.lookahead) {
        nice_match = s2.lookahead;
      }
      do {
        match = cur_match;
        if (_win[match + best_len] !== scan_end || _win[match + best_len - 1] !== scan_end1 || _win[match] !== _win[scan] || _win[++match] !== _win[scan + 1]) {
          continue;
        }
        scan += 2;
        match++;
        do {
        } while (_win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && scan < strend);
        len = MAX_MATCH - (strend - scan);
        scan = strend - MAX_MATCH;
        if (len > best_len) {
          s2.match_start = cur_match;
          best_len = len;
          if (len >= nice_match) {
            break;
          }
          scan_end1 = _win[scan + best_len - 1];
          scan_end = _win[scan + best_len];
        }
      } while ((cur_match = prev[cur_match & wmask]) > limit && --chain_length !== 0);
      if (best_len <= s2.lookahead) {
        return best_len;
      }
      return s2.lookahead;
    };
    var fill_window = (s2) => {
      const _w_size = s2.w_size;
      let n2, more, str;
      do {
        more = s2.window_size - s2.lookahead - s2.strstart;
        if (s2.strstart >= _w_size + (_w_size - MIN_LOOKAHEAD)) {
          s2.window.set(s2.window.subarray(_w_size, _w_size + _w_size - more), 0);
          s2.match_start -= _w_size;
          s2.strstart -= _w_size;
          s2.block_start -= _w_size;
          if (s2.insert > s2.strstart) {
            s2.insert = s2.strstart;
          }
          slide_hash(s2);
          more += _w_size;
        }
        if (s2.strm.avail_in === 0) {
          break;
        }
        n2 = read_buf(s2.strm, s2.window, s2.strstart + s2.lookahead, more);
        s2.lookahead += n2;
        if (s2.lookahead + s2.insert >= MIN_MATCH) {
          str = s2.strstart - s2.insert;
          s2.ins_h = s2.window[str];
          s2.ins_h = HASH(s2, s2.ins_h, s2.window[str + 1]);
          while (s2.insert) {
            s2.ins_h = HASH(s2, s2.ins_h, s2.window[str + MIN_MATCH - 1]);
            s2.prev[str & s2.w_mask] = s2.head[s2.ins_h];
            s2.head[s2.ins_h] = str;
            str++;
            s2.insert--;
            if (s2.lookahead + s2.insert < MIN_MATCH) {
              break;
            }
          }
        }
      } while (s2.lookahead < MIN_LOOKAHEAD && s2.strm.avail_in !== 0);
    };
    var deflate_stored = (s2, flush) => {
      let min_block = s2.pending_buf_size - 5 > s2.w_size ? s2.w_size : s2.pending_buf_size - 5;
      let len, left, have, last = 0;
      let used = s2.strm.avail_in;
      do {
        len = 65535;
        have = s2.bi_valid + 42 >> 3;
        if (s2.strm.avail_out < have) {
          break;
        }
        have = s2.strm.avail_out - have;
        left = s2.strstart - s2.block_start;
        if (len > left + s2.strm.avail_in) {
          len = left + s2.strm.avail_in;
        }
        if (len > have) {
          len = have;
        }
        if (len < min_block && (len === 0 && flush !== Z_FINISH || flush === Z_NO_FLUSH || len !== left + s2.strm.avail_in)) {
          break;
        }
        last = flush === Z_FINISH && len === left + s2.strm.avail_in ? 1 : 0;
        _tr_stored_block(s2, 0, 0, last);
        s2.pending_buf[s2.pending - 4] = len;
        s2.pending_buf[s2.pending - 3] = len >> 8;
        s2.pending_buf[s2.pending - 2] = ~len;
        s2.pending_buf[s2.pending - 1] = ~len >> 8;
        flush_pending(s2.strm);
        if (left) {
          if (left > len) {
            left = len;
          }
          s2.strm.output.set(s2.window.subarray(s2.block_start, s2.block_start + left), s2.strm.next_out);
          s2.strm.next_out += left;
          s2.strm.avail_out -= left;
          s2.strm.total_out += left;
          s2.block_start += left;
          len -= left;
        }
        if (len) {
          read_buf(s2.strm, s2.strm.output, s2.strm.next_out, len);
          s2.strm.next_out += len;
          s2.strm.avail_out -= len;
          s2.strm.total_out += len;
        }
      } while (last === 0);
      used -= s2.strm.avail_in;
      if (used) {
        if (used >= s2.w_size) {
          s2.matches = 2;
          s2.window.set(s2.strm.input.subarray(s2.strm.next_in - s2.w_size, s2.strm.next_in), 0);
          s2.strstart = s2.w_size;
          s2.insert = s2.strstart;
        } else {
          if (s2.window_size - s2.strstart <= used) {
            s2.strstart -= s2.w_size;
            s2.window.set(s2.window.subarray(s2.w_size, s2.w_size + s2.strstart), 0);
            if (s2.matches < 2) {
              s2.matches++;
            }
            if (s2.insert > s2.strstart) {
              s2.insert = s2.strstart;
            }
          }
          s2.window.set(s2.strm.input.subarray(s2.strm.next_in - used, s2.strm.next_in), s2.strstart);
          s2.strstart += used;
          s2.insert += used > s2.w_size - s2.insert ? s2.w_size - s2.insert : used;
        }
        s2.block_start = s2.strstart;
      }
      if (s2.high_water < s2.strstart) {
        s2.high_water = s2.strstart;
      }
      if (last) {
        return BS_FINISH_DONE;
      }
      if (flush !== Z_NO_FLUSH && flush !== Z_FINISH && s2.strm.avail_in === 0 && s2.strstart === s2.block_start) {
        return BS_BLOCK_DONE;
      }
      have = s2.window_size - s2.strstart;
      if (s2.strm.avail_in > have && s2.block_start >= s2.w_size) {
        s2.block_start -= s2.w_size;
        s2.strstart -= s2.w_size;
        s2.window.set(s2.window.subarray(s2.w_size, s2.w_size + s2.strstart), 0);
        if (s2.matches < 2) {
          s2.matches++;
        }
        have += s2.w_size;
        if (s2.insert > s2.strstart) {
          s2.insert = s2.strstart;
        }
      }
      if (have > s2.strm.avail_in) {
        have = s2.strm.avail_in;
      }
      if (have) {
        read_buf(s2.strm, s2.window, s2.strstart, have);
        s2.strstart += have;
        s2.insert += have > s2.w_size - s2.insert ? s2.w_size - s2.insert : have;
      }
      if (s2.high_water < s2.strstart) {
        s2.high_water = s2.strstart;
      }
      have = s2.bi_valid + 42 >> 3;
      have = s2.pending_buf_size - have > 65535 ? 65535 : s2.pending_buf_size - have;
      min_block = have > s2.w_size ? s2.w_size : have;
      left = s2.strstart - s2.block_start;
      if (left >= min_block || (left || flush === Z_FINISH) && flush !== Z_NO_FLUSH && s2.strm.avail_in === 0 && left <= have) {
        len = left > have ? have : left;
        last = flush === Z_FINISH && s2.strm.avail_in === 0 && len === left ? 1 : 0;
        _tr_stored_block(s2, s2.block_start, len, last);
        s2.block_start += len;
        flush_pending(s2.strm);
      }
      return last ? BS_FINISH_STARTED : BS_NEED_MORE;
    };
    var deflate_fast = (s2, flush) => {
      let hash_head;
      let bflush;
      for (; ; ) {
        if (s2.lookahead < MIN_LOOKAHEAD) {
          fill_window(s2);
          if (s2.lookahead < MIN_LOOKAHEAD && flush === Z_NO_FLUSH) {
            return BS_NEED_MORE;
          }
          if (s2.lookahead === 0) {
            break;
          }
        }
        hash_head = 0;
        if (s2.lookahead >= MIN_MATCH) {
          s2.ins_h = HASH(s2, s2.ins_h, s2.window[s2.strstart + MIN_MATCH - 1]);
          hash_head = s2.prev[s2.strstart & s2.w_mask] = s2.head[s2.ins_h];
          s2.head[s2.ins_h] = s2.strstart;
        }
        if (hash_head !== 0 && s2.strstart - hash_head <= s2.w_size - MIN_LOOKAHEAD) {
          s2.match_length = longest_match(s2, hash_head);
        }
        if (s2.match_length >= MIN_MATCH) {
          bflush = _tr_tally(s2, s2.strstart - s2.match_start, s2.match_length - MIN_MATCH);
          s2.lookahead -= s2.match_length;
          if (s2.match_length <= s2.max_lazy_match && s2.lookahead >= MIN_MATCH) {
            s2.match_length--;
            do {
              s2.strstart++;
              s2.ins_h = HASH(s2, s2.ins_h, s2.window[s2.strstart + MIN_MATCH - 1]);
              hash_head = s2.prev[s2.strstart & s2.w_mask] = s2.head[s2.ins_h];
              s2.head[s2.ins_h] = s2.strstart;
            } while (--s2.match_length !== 0);
            s2.strstart++;
          } else {
            s2.strstart += s2.match_length;
            s2.match_length = 0;
            s2.ins_h = s2.window[s2.strstart];
            s2.ins_h = HASH(s2, s2.ins_h, s2.window[s2.strstart + 1]);
          }
        } else {
          bflush = _tr_tally(s2, 0, s2.window[s2.strstart]);
          s2.lookahead--;
          s2.strstart++;
        }
        if (bflush) {
          flush_block_only(s2, false);
          if (s2.strm.avail_out === 0) {
            return BS_NEED_MORE;
          }
        }
      }
      s2.insert = s2.strstart < MIN_MATCH - 1 ? s2.strstart : MIN_MATCH - 1;
      if (flush === Z_FINISH) {
        flush_block_only(s2, true);
        if (s2.strm.avail_out === 0) {
          return BS_FINISH_STARTED;
        }
        return BS_FINISH_DONE;
      }
      if (s2.sym_next) {
        flush_block_only(s2, false);
        if (s2.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
      }
      return BS_BLOCK_DONE;
    };
    var deflate_slow = (s2, flush) => {
      let hash_head;
      let bflush;
      let max_insert;
      for (; ; ) {
        if (s2.lookahead < MIN_LOOKAHEAD) {
          fill_window(s2);
          if (s2.lookahead < MIN_LOOKAHEAD && flush === Z_NO_FLUSH) {
            return BS_NEED_MORE;
          }
          if (s2.lookahead === 0) {
            break;
          }
        }
        hash_head = 0;
        if (s2.lookahead >= MIN_MATCH) {
          s2.ins_h = HASH(s2, s2.ins_h, s2.window[s2.strstart + MIN_MATCH - 1]);
          hash_head = s2.prev[s2.strstart & s2.w_mask] = s2.head[s2.ins_h];
          s2.head[s2.ins_h] = s2.strstart;
        }
        s2.prev_length = s2.match_length;
        s2.prev_match = s2.match_start;
        s2.match_length = MIN_MATCH - 1;
        if (hash_head !== 0 && s2.prev_length < s2.max_lazy_match && s2.strstart - hash_head <= s2.w_size - MIN_LOOKAHEAD) {
          s2.match_length = longest_match(s2, hash_head);
          if (s2.match_length <= 5 && (s2.strategy === Z_FILTERED || s2.match_length === MIN_MATCH && s2.strstart - s2.match_start > 4096)) {
            s2.match_length = MIN_MATCH - 1;
          }
        }
        if (s2.prev_length >= MIN_MATCH && s2.match_length <= s2.prev_length) {
          max_insert = s2.strstart + s2.lookahead - MIN_MATCH;
          bflush = _tr_tally(s2, s2.strstart - 1 - s2.prev_match, s2.prev_length - MIN_MATCH);
          s2.lookahead -= s2.prev_length - 1;
          s2.prev_length -= 2;
          do {
            if (++s2.strstart <= max_insert) {
              s2.ins_h = HASH(s2, s2.ins_h, s2.window[s2.strstart + MIN_MATCH - 1]);
              hash_head = s2.prev[s2.strstart & s2.w_mask] = s2.head[s2.ins_h];
              s2.head[s2.ins_h] = s2.strstart;
            }
          } while (--s2.prev_length !== 0);
          s2.match_available = 0;
          s2.match_length = MIN_MATCH - 1;
          s2.strstart++;
          if (bflush) {
            flush_block_only(s2, false);
            if (s2.strm.avail_out === 0) {
              return BS_NEED_MORE;
            }
          }
        } else if (s2.match_available) {
          bflush = _tr_tally(s2, 0, s2.window[s2.strstart - 1]);
          if (bflush) {
            flush_block_only(s2, false);
          }
          s2.strstart++;
          s2.lookahead--;
          if (s2.strm.avail_out === 0) {
            return BS_NEED_MORE;
          }
        } else {
          s2.match_available = 1;
          s2.strstart++;
          s2.lookahead--;
        }
      }
      if (s2.match_available) {
        bflush = _tr_tally(s2, 0, s2.window[s2.strstart - 1]);
        s2.match_available = 0;
      }
      s2.insert = s2.strstart < MIN_MATCH - 1 ? s2.strstart : MIN_MATCH - 1;
      if (flush === Z_FINISH) {
        flush_block_only(s2, true);
        if (s2.strm.avail_out === 0) {
          return BS_FINISH_STARTED;
        }
        return BS_FINISH_DONE;
      }
      if (s2.sym_next) {
        flush_block_only(s2, false);
        if (s2.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
      }
      return BS_BLOCK_DONE;
    };
    var deflate_rle = (s2, flush) => {
      let bflush;
      let prev;
      let scan, strend;
      const _win = s2.window;
      for (; ; ) {
        if (s2.lookahead <= MAX_MATCH) {
          fill_window(s2);
          if (s2.lookahead <= MAX_MATCH && flush === Z_NO_FLUSH) {
            return BS_NEED_MORE;
          }
          if (s2.lookahead === 0) {
            break;
          }
        }
        s2.match_length = 0;
        if (s2.lookahead >= MIN_MATCH && s2.strstart > 0) {
          scan = s2.strstart - 1;
          prev = _win[scan];
          if (prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan]) {
            strend = s2.strstart + MAX_MATCH;
            do {
            } while (prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && scan < strend);
            s2.match_length = MAX_MATCH - (strend - scan);
            if (s2.match_length > s2.lookahead) {
              s2.match_length = s2.lookahead;
            }
          }
        }
        if (s2.match_length >= MIN_MATCH) {
          bflush = _tr_tally(s2, 1, s2.match_length - MIN_MATCH);
          s2.lookahead -= s2.match_length;
          s2.strstart += s2.match_length;
          s2.match_length = 0;
        } else {
          bflush = _tr_tally(s2, 0, s2.window[s2.strstart]);
          s2.lookahead--;
          s2.strstart++;
        }
        if (bflush) {
          flush_block_only(s2, false);
          if (s2.strm.avail_out === 0) {
            return BS_NEED_MORE;
          }
        }
      }
      s2.insert = 0;
      if (flush === Z_FINISH) {
        flush_block_only(s2, true);
        if (s2.strm.avail_out === 0) {
          return BS_FINISH_STARTED;
        }
        return BS_FINISH_DONE;
      }
      if (s2.sym_next) {
        flush_block_only(s2, false);
        if (s2.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
      }
      return BS_BLOCK_DONE;
    };
    var deflate_huff = (s2, flush) => {
      let bflush;
      for (; ; ) {
        if (s2.lookahead === 0) {
          fill_window(s2);
          if (s2.lookahead === 0) {
            if (flush === Z_NO_FLUSH) {
              return BS_NEED_MORE;
            }
            break;
          }
        }
        s2.match_length = 0;
        bflush = _tr_tally(s2, 0, s2.window[s2.strstart]);
        s2.lookahead--;
        s2.strstart++;
        if (bflush) {
          flush_block_only(s2, false);
          if (s2.strm.avail_out === 0) {
            return BS_NEED_MORE;
          }
        }
      }
      s2.insert = 0;
      if (flush === Z_FINISH) {
        flush_block_only(s2, true);
        if (s2.strm.avail_out === 0) {
          return BS_FINISH_STARTED;
        }
        return BS_FINISH_DONE;
      }
      if (s2.sym_next) {
        flush_block_only(s2, false);
        if (s2.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
      }
      return BS_BLOCK_DONE;
    };
    function Config(good_length, max_lazy, nice_length, max_chain, func) {
      this.good_length = good_length;
      this.max_lazy = max_lazy;
      this.nice_length = nice_length;
      this.max_chain = max_chain;
      this.func = func;
    }
    var configuration_table = [
      /*      good lazy nice chain */
      new Config(0, 0, 0, 0, deflate_stored),
      /* 0 store only */
      new Config(4, 4, 8, 4, deflate_fast),
      /* 1 max speed, no lazy matches */
      new Config(4, 5, 16, 8, deflate_fast),
      /* 2 */
      new Config(4, 6, 32, 32, deflate_fast),
      /* 3 */
      new Config(4, 4, 16, 16, deflate_slow),
      /* 4 lazy matches */
      new Config(8, 16, 32, 32, deflate_slow),
      /* 5 */
      new Config(8, 16, 128, 128, deflate_slow),
      /* 6 */
      new Config(8, 32, 128, 256, deflate_slow),
      /* 7 */
      new Config(32, 128, 258, 1024, deflate_slow),
      /* 8 */
      new Config(32, 258, 258, 4096, deflate_slow)
      /* 9 max compression */
    ];
    var lm_init = (s2) => {
      s2.window_size = 2 * s2.w_size;
      zero(s2.head);
      s2.max_lazy_match = configuration_table[s2.level].max_lazy;
      s2.good_match = configuration_table[s2.level].good_length;
      s2.nice_match = configuration_table[s2.level].nice_length;
      s2.max_chain_length = configuration_table[s2.level].max_chain;
      s2.strstart = 0;
      s2.block_start = 0;
      s2.lookahead = 0;
      s2.insert = 0;
      s2.match_length = s2.prev_length = MIN_MATCH - 1;
      s2.match_available = 0;
      s2.ins_h = 0;
    };
    function DeflateState() {
      this.strm = null;
      this.status = 0;
      this.pending_buf = null;
      this.pending_buf_size = 0;
      this.pending_out = 0;
      this.pending = 0;
      this.wrap = 0;
      this.gzhead = null;
      this.gzindex = 0;
      this.method = Z_DEFLATED;
      this.last_flush = -1;
      this.w_size = 0;
      this.w_bits = 0;
      this.w_mask = 0;
      this.window = null;
      this.window_size = 0;
      this.prev = null;
      this.head = null;
      this.ins_h = 0;
      this.hash_size = 0;
      this.hash_bits = 0;
      this.hash_mask = 0;
      this.hash_shift = 0;
      this.block_start = 0;
      this.match_length = 0;
      this.prev_match = 0;
      this.match_available = 0;
      this.strstart = 0;
      this.match_start = 0;
      this.lookahead = 0;
      this.prev_length = 0;
      this.max_chain_length = 0;
      this.max_lazy_match = 0;
      this.level = 0;
      this.strategy = 0;
      this.good_match = 0;
      this.nice_match = 0;
      this.dyn_ltree = new Uint16Array(HEAP_SIZE * 2);
      this.dyn_dtree = new Uint16Array((2 * D_CODES + 1) * 2);
      this.bl_tree = new Uint16Array((2 * BL_CODES + 1) * 2);
      zero(this.dyn_ltree);
      zero(this.dyn_dtree);
      zero(this.bl_tree);
      this.l_desc = null;
      this.d_desc = null;
      this.bl_desc = null;
      this.bl_count = new Uint16Array(MAX_BITS + 1);
      this.heap = new Uint16Array(2 * L_CODES + 1);
      zero(this.heap);
      this.heap_len = 0;
      this.heap_max = 0;
      this.depth = new Uint16Array(2 * L_CODES + 1);
      zero(this.depth);
      this.sym_buf = 0;
      this.lit_bufsize = 0;
      this.sym_next = 0;
      this.sym_end = 0;
      this.opt_len = 0;
      this.static_len = 0;
      this.matches = 0;
      this.insert = 0;
      this.bi_buf = 0;
      this.bi_valid = 0;
    }
    var deflateStateCheck = (strm) => {
      if (!strm) {
        return 1;
      }
      const s2 = strm.state;
      if (!s2 || s2.strm !== strm || s2.status !== INIT_STATE && //#ifdef GZIP
      s2.status !== GZIP_STATE && //#endif
      s2.status !== EXTRA_STATE && s2.status !== NAME_STATE && s2.status !== COMMENT_STATE && s2.status !== HCRC_STATE && s2.status !== BUSY_STATE && s2.status !== FINISH_STATE) {
        return 1;
      }
      return 0;
    };
    var deflateResetKeep = (strm) => {
      if (deflateStateCheck(strm)) {
        return err(strm, Z_STREAM_ERROR);
      }
      strm.total_in = strm.total_out = 0;
      strm.data_type = Z_UNKNOWN;
      const s2 = strm.state;
      s2.pending = 0;
      s2.pending_out = 0;
      if (s2.wrap < 0) {
        s2.wrap = -s2.wrap;
      }
      s2.status = //#ifdef GZIP
      s2.wrap === 2 ? GZIP_STATE : (
        //#endif
        s2.wrap ? INIT_STATE : BUSY_STATE
      );
      strm.adler = s2.wrap === 2 ? 0 : 1;
      s2.last_flush = -2;
      _tr_init(s2);
      return Z_OK;
    };
    var deflateReset = (strm) => {
      const ret = deflateResetKeep(strm);
      if (ret === Z_OK) {
        lm_init(strm.state);
      }
      return ret;
    };
    var deflateSetHeader = (strm, head) => {
      if (deflateStateCheck(strm) || strm.state.wrap !== 2) {
        return Z_STREAM_ERROR;
      }
      strm.state.gzhead = head;
      return Z_OK;
    };
    var deflateInit2 = (strm, level, method, windowBits, memLevel, strategy) => {
      if (!strm) {
        return Z_STREAM_ERROR;
      }
      let wrap = 1;
      if (level === Z_DEFAULT_COMPRESSION) {
        level = 6;
      }
      if (windowBits < 0) {
        wrap = 0;
        windowBits = -windowBits;
      } else if (windowBits > 15) {
        wrap = 2;
        windowBits -= 16;
      }
      if (memLevel < 1 || memLevel > MAX_MEM_LEVEL || method !== Z_DEFLATED || windowBits < 8 || windowBits > 15 || level < 0 || level > 9 || strategy < 0 || strategy > Z_FIXED || windowBits === 8 && wrap !== 1) {
        return err(strm, Z_STREAM_ERROR);
      }
      if (windowBits === 8) {
        windowBits = 9;
      }
      const s2 = new DeflateState();
      strm.state = s2;
      s2.strm = strm;
      s2.status = INIT_STATE;
      s2.wrap = wrap;
      s2.gzhead = null;
      s2.w_bits = windowBits;
      s2.w_size = 1 << s2.w_bits;
      s2.w_mask = s2.w_size - 1;
      s2.hash_bits = memLevel + 7;
      s2.hash_size = 1 << s2.hash_bits;
      s2.hash_mask = s2.hash_size - 1;
      s2.hash_shift = ~~((s2.hash_bits + MIN_MATCH - 1) / MIN_MATCH);
      s2.window = new Uint8Array(s2.w_size * 2);
      s2.head = new Uint16Array(s2.hash_size);
      s2.prev = new Uint16Array(s2.w_size);
      s2.lit_bufsize = 1 << memLevel + 6;
      s2.pending_buf_size = s2.lit_bufsize * 4;
      s2.pending_buf = new Uint8Array(s2.pending_buf_size);
      s2.sym_buf = s2.lit_bufsize;
      s2.sym_end = (s2.lit_bufsize - 1) * 3;
      s2.level = level;
      s2.strategy = strategy;
      s2.method = method;
      return deflateReset(strm);
    };
    var deflateInit = (strm, level) => {
      return deflateInit2(strm, level, Z_DEFLATED, MAX_WBITS, DEF_MEM_LEVEL, Z_DEFAULT_STRATEGY);
    };
    var deflate = (strm, flush) => {
      if (deflateStateCheck(strm) || flush > Z_BLOCK || flush < 0) {
        return strm ? err(strm, Z_STREAM_ERROR) : Z_STREAM_ERROR;
      }
      const s2 = strm.state;
      if (!strm.output || strm.avail_in !== 0 && !strm.input || s2.status === FINISH_STATE && flush !== Z_FINISH) {
        return err(strm, strm.avail_out === 0 ? Z_BUF_ERROR : Z_STREAM_ERROR);
      }
      const old_flush = s2.last_flush;
      s2.last_flush = flush;
      if (s2.pending !== 0) {
        flush_pending(strm);
        if (strm.avail_out === 0) {
          s2.last_flush = -1;
          return Z_OK;
        }
      } else if (strm.avail_in === 0 && rank(flush) <= rank(old_flush) && flush !== Z_FINISH) {
        return err(strm, Z_BUF_ERROR);
      }
      if (s2.status === FINISH_STATE && strm.avail_in !== 0) {
        return err(strm, Z_BUF_ERROR);
      }
      if (s2.status === INIT_STATE && s2.wrap === 0) {
        s2.status = BUSY_STATE;
      }
      if (s2.status === INIT_STATE) {
        let header = Z_DEFLATED + (s2.w_bits - 8 << 4) << 8;
        let level_flags = -1;
        if (s2.strategy >= Z_HUFFMAN_ONLY || s2.level < 2) {
          level_flags = 0;
        } else if (s2.level < 6) {
          level_flags = 1;
        } else if (s2.level === 6) {
          level_flags = 2;
        } else {
          level_flags = 3;
        }
        header |= level_flags << 6;
        if (s2.strstart !== 0) {
          header |= PRESET_DICT;
        }
        header += 31 - header % 31;
        putShortMSB(s2, header);
        if (s2.strstart !== 0) {
          putShortMSB(s2, strm.adler >>> 16);
          putShortMSB(s2, strm.adler & 65535);
        }
        strm.adler = 1;
        s2.status = BUSY_STATE;
        flush_pending(strm);
        if (s2.pending !== 0) {
          s2.last_flush = -1;
          return Z_OK;
        }
      }
      if (s2.status === GZIP_STATE) {
        strm.adler = 0;
        put_byte(s2, 31);
        put_byte(s2, 139);
        put_byte(s2, 8);
        if (!s2.gzhead) {
          put_byte(s2, 0);
          put_byte(s2, 0);
          put_byte(s2, 0);
          put_byte(s2, 0);
          put_byte(s2, 0);
          put_byte(s2, s2.level === 9 ? 2 : s2.strategy >= Z_HUFFMAN_ONLY || s2.level < 2 ? 4 : 0);
          put_byte(s2, OS_CODE);
          s2.status = BUSY_STATE;
          flush_pending(strm);
          if (s2.pending !== 0) {
            s2.last_flush = -1;
            return Z_OK;
          }
        } else {
          put_byte(
            s2,
            (s2.gzhead.text ? 1 : 0) + (s2.gzhead.hcrc ? 2 : 0) + (!s2.gzhead.extra ? 0 : 4) + (!s2.gzhead.name ? 0 : 8) + (!s2.gzhead.comment ? 0 : 16)
          );
          put_byte(s2, s2.gzhead.time & 255);
          put_byte(s2, s2.gzhead.time >> 8 & 255);
          put_byte(s2, s2.gzhead.time >> 16 & 255);
          put_byte(s2, s2.gzhead.time >> 24 & 255);
          put_byte(s2, s2.level === 9 ? 2 : s2.strategy >= Z_HUFFMAN_ONLY || s2.level < 2 ? 4 : 0);
          put_byte(s2, s2.gzhead.os & 255);
          if (s2.gzhead.extra && s2.gzhead.extra.length) {
            put_byte(s2, s2.gzhead.extra.length & 255);
            put_byte(s2, s2.gzhead.extra.length >> 8 & 255);
          }
          if (s2.gzhead.hcrc) {
            strm.adler = crc32(strm.adler, s2.pending_buf, s2.pending, 0);
          }
          s2.gzindex = 0;
          s2.status = EXTRA_STATE;
        }
      }
      if (s2.status === EXTRA_STATE) {
        if (s2.gzhead.extra) {
          let beg = s2.pending;
          let left = (s2.gzhead.extra.length & 65535) - s2.gzindex;
          while (s2.pending + left > s2.pending_buf_size) {
            let copy = s2.pending_buf_size - s2.pending;
            s2.pending_buf.set(s2.gzhead.extra.subarray(s2.gzindex, s2.gzindex + copy), s2.pending);
            s2.pending = s2.pending_buf_size;
            if (s2.gzhead.hcrc && s2.pending > beg) {
              strm.adler = crc32(strm.adler, s2.pending_buf, s2.pending - beg, beg);
            }
            s2.gzindex += copy;
            flush_pending(strm);
            if (s2.pending !== 0) {
              s2.last_flush = -1;
              return Z_OK;
            }
            beg = 0;
            left -= copy;
          }
          let gzhead_extra = new Uint8Array(s2.gzhead.extra);
          s2.pending_buf.set(gzhead_extra.subarray(s2.gzindex, s2.gzindex + left), s2.pending);
          s2.pending += left;
          if (s2.gzhead.hcrc && s2.pending > beg) {
            strm.adler = crc32(strm.adler, s2.pending_buf, s2.pending - beg, beg);
          }
          s2.gzindex = 0;
        }
        s2.status = NAME_STATE;
      }
      if (s2.status === NAME_STATE) {
        if (s2.gzhead.name) {
          let beg = s2.pending;
          let val;
          do {
            if (s2.pending === s2.pending_buf_size) {
              if (s2.gzhead.hcrc && s2.pending > beg) {
                strm.adler = crc32(strm.adler, s2.pending_buf, s2.pending - beg, beg);
              }
              flush_pending(strm);
              if (s2.pending !== 0) {
                s2.last_flush = -1;
                return Z_OK;
              }
              beg = 0;
            }
            if (s2.gzindex < s2.gzhead.name.length) {
              val = s2.gzhead.name.charCodeAt(s2.gzindex++) & 255;
            } else {
              val = 0;
            }
            put_byte(s2, val);
          } while (val !== 0);
          if (s2.gzhead.hcrc && s2.pending > beg) {
            strm.adler = crc32(strm.adler, s2.pending_buf, s2.pending - beg, beg);
          }
          s2.gzindex = 0;
        }
        s2.status = COMMENT_STATE;
      }
      if (s2.status === COMMENT_STATE) {
        if (s2.gzhead.comment) {
          let beg = s2.pending;
          let val;
          do {
            if (s2.pending === s2.pending_buf_size) {
              if (s2.gzhead.hcrc && s2.pending > beg) {
                strm.adler = crc32(strm.adler, s2.pending_buf, s2.pending - beg, beg);
              }
              flush_pending(strm);
              if (s2.pending !== 0) {
                s2.last_flush = -1;
                return Z_OK;
              }
              beg = 0;
            }
            if (s2.gzindex < s2.gzhead.comment.length) {
              val = s2.gzhead.comment.charCodeAt(s2.gzindex++) & 255;
            } else {
              val = 0;
            }
            put_byte(s2, val);
          } while (val !== 0);
          if (s2.gzhead.hcrc && s2.pending > beg) {
            strm.adler = crc32(strm.adler, s2.pending_buf, s2.pending - beg, beg);
          }
        }
        s2.status = HCRC_STATE;
      }
      if (s2.status === HCRC_STATE) {
        if (s2.gzhead.hcrc) {
          if (s2.pending + 2 > s2.pending_buf_size) {
            flush_pending(strm);
            if (s2.pending !== 0) {
              s2.last_flush = -1;
              return Z_OK;
            }
          }
          put_byte(s2, strm.adler & 255);
          put_byte(s2, strm.adler >> 8 & 255);
          strm.adler = 0;
        }
        s2.status = BUSY_STATE;
        flush_pending(strm);
        if (s2.pending !== 0) {
          s2.last_flush = -1;
          return Z_OK;
        }
      }
      if (strm.avail_in !== 0 || s2.lookahead !== 0 || flush !== Z_NO_FLUSH && s2.status !== FINISH_STATE) {
        let bstate = s2.level === 0 ? deflate_stored(s2, flush) : s2.strategy === Z_HUFFMAN_ONLY ? deflate_huff(s2, flush) : s2.strategy === Z_RLE ? deflate_rle(s2, flush) : configuration_table[s2.level].func(s2, flush);
        if (bstate === BS_FINISH_STARTED || bstate === BS_FINISH_DONE) {
          s2.status = FINISH_STATE;
        }
        if (bstate === BS_NEED_MORE || bstate === BS_FINISH_STARTED) {
          if (strm.avail_out === 0) {
            s2.last_flush = -1;
          }
          return Z_OK;
        }
        if (bstate === BS_BLOCK_DONE) {
          if (flush === Z_PARTIAL_FLUSH) {
            _tr_align(s2);
          } else if (flush !== Z_BLOCK) {
            _tr_stored_block(s2, 0, 0, false);
            if (flush === Z_FULL_FLUSH) {
              zero(s2.head);
              if (s2.lookahead === 0) {
                s2.strstart = 0;
                s2.block_start = 0;
                s2.insert = 0;
              }
            }
          }
          flush_pending(strm);
          if (strm.avail_out === 0) {
            s2.last_flush = -1;
            return Z_OK;
          }
        }
      }
      if (flush !== Z_FINISH) {
        return Z_OK;
      }
      if (s2.wrap <= 0) {
        return Z_STREAM_END;
      }
      if (s2.wrap === 2) {
        put_byte(s2, strm.adler & 255);
        put_byte(s2, strm.adler >> 8 & 255);
        put_byte(s2, strm.adler >> 16 & 255);
        put_byte(s2, strm.adler >> 24 & 255);
        put_byte(s2, strm.total_in & 255);
        put_byte(s2, strm.total_in >> 8 & 255);
        put_byte(s2, strm.total_in >> 16 & 255);
        put_byte(s2, strm.total_in >> 24 & 255);
      } else {
        putShortMSB(s2, strm.adler >>> 16);
        putShortMSB(s2, strm.adler & 65535);
      }
      flush_pending(strm);
      if (s2.wrap > 0) {
        s2.wrap = -s2.wrap;
      }
      return s2.pending !== 0 ? Z_OK : Z_STREAM_END;
    };
    var deflateEnd = (strm) => {
      if (deflateStateCheck(strm)) {
        return Z_STREAM_ERROR;
      }
      const status = strm.state.status;
      strm.state = null;
      return status === BUSY_STATE ? err(strm, Z_DATA_ERROR) : Z_OK;
    };
    var deflateSetDictionary = (strm, dictionary) => {
      let dictLength = dictionary.length;
      if (deflateStateCheck(strm)) {
        return Z_STREAM_ERROR;
      }
      const s2 = strm.state;
      const wrap = s2.wrap;
      if (wrap === 2 || wrap === 1 && s2.status !== INIT_STATE || s2.lookahead) {
        return Z_STREAM_ERROR;
      }
      if (wrap === 1) {
        strm.adler = adler32(strm.adler, dictionary, dictLength, 0);
      }
      s2.wrap = 0;
      if (dictLength >= s2.w_size) {
        if (wrap === 0) {
          zero(s2.head);
          s2.strstart = 0;
          s2.block_start = 0;
          s2.insert = 0;
        }
        let tmpDict = new Uint8Array(s2.w_size);
        tmpDict.set(dictionary.subarray(dictLength - s2.w_size, dictLength), 0);
        dictionary = tmpDict;
        dictLength = s2.w_size;
      }
      const avail = strm.avail_in;
      const next = strm.next_in;
      const input = strm.input;
      strm.avail_in = dictLength;
      strm.next_in = 0;
      strm.input = dictionary;
      fill_window(s2);
      while (s2.lookahead >= MIN_MATCH) {
        let str = s2.strstart;
        let n2 = s2.lookahead - (MIN_MATCH - 1);
        do {
          s2.ins_h = HASH(s2, s2.ins_h, s2.window[str + MIN_MATCH - 1]);
          s2.prev[str & s2.w_mask] = s2.head[s2.ins_h];
          s2.head[s2.ins_h] = str;
          str++;
        } while (--n2);
        s2.strstart = str;
        s2.lookahead = MIN_MATCH - 1;
        fill_window(s2);
      }
      s2.strstart += s2.lookahead;
      s2.block_start = s2.strstart;
      s2.insert = s2.lookahead;
      s2.lookahead = 0;
      s2.match_length = s2.prev_length = MIN_MATCH - 1;
      s2.match_available = 0;
      strm.next_in = next;
      strm.input = input;
      strm.avail_in = avail;
      s2.wrap = wrap;
      return Z_OK;
    };
    module2.exports.deflateInit = deflateInit;
    module2.exports.deflateInit2 = deflateInit2;
    module2.exports.deflateReset = deflateReset;
    module2.exports.deflateResetKeep = deflateResetKeep;
    module2.exports.deflateSetHeader = deflateSetHeader;
    module2.exports.deflate = deflate;
    module2.exports.deflateEnd = deflateEnd;
    module2.exports.deflateSetDictionary = deflateSetDictionary;
    module2.exports.deflateInfo = "pako deflate (from Nodeca project)";
  }
});

// ../../node_modules/pako/lib/utils/common.js
var require_common = __commonJS({
  "../../node_modules/pako/lib/utils/common.js"(exports, module2) {
    "use strict";
    var _has = (obj, key) => {
      return Object.prototype.hasOwnProperty.call(obj, key);
    };
    module2.exports.assign = function(obj) {
      const sources = Array.prototype.slice.call(arguments, 1);
      while (sources.length) {
        const source = sources.shift();
        if (!source) {
          continue;
        }
        if (typeof source !== "object") {
          throw new TypeError(source + "must be non-object");
        }
        for (const p in source) {
          if (_has(source, p)) {
            obj[p] = source[p];
          }
        }
      }
      return obj;
    };
    module2.exports.flattenChunks = (chunks) => {
      let len = 0;
      for (let i2 = 0, l2 = chunks.length; i2 < l2; i2++) {
        len += chunks[i2].length;
      }
      const result = new Uint8Array(len);
      for (let i2 = 0, pos = 0, l2 = chunks.length; i2 < l2; i2++) {
        let chunk = chunks[i2];
        result.set(chunk, pos);
        pos += chunk.length;
      }
      return result;
    };
  }
});

// ../../node_modules/pako/lib/utils/strings.js
var require_strings = __commonJS({
  "../../node_modules/pako/lib/utils/strings.js"(exports, module2) {
    "use strict";
    var STR_APPLY_UIA_OK = true;
    try {
      String.fromCharCode.apply(null, new Uint8Array(1));
    } catch (__) {
      STR_APPLY_UIA_OK = false;
    }
    var _utf8len = new Uint8Array(256);
    for (let q2 = 0; q2 < 256; q2++) {
      _utf8len[q2] = q2 >= 252 ? 6 : q2 >= 248 ? 5 : q2 >= 240 ? 4 : q2 >= 224 ? 3 : q2 >= 192 ? 2 : 1;
    }
    _utf8len[254] = _utf8len[254] = 1;
    module2.exports.string2buf = (str) => {
      if (typeof TextEncoder === "function" && TextEncoder.prototype.encode) {
        return new TextEncoder().encode(str);
      }
      let buf, c2, c22, m_pos, i2, str_len = str.length, buf_len = 0;
      for (m_pos = 0; m_pos < str_len; m_pos++) {
        c2 = str.charCodeAt(m_pos);
        if ((c2 & 64512) === 55296 && m_pos + 1 < str_len) {
          c22 = str.charCodeAt(m_pos + 1);
          if ((c22 & 64512) === 56320) {
            c2 = 65536 + (c2 - 55296 << 10) + (c22 - 56320);
            m_pos++;
          }
        }
        buf_len += c2 < 128 ? 1 : c2 < 2048 ? 2 : c2 < 65536 ? 3 : 4;
      }
      buf = new Uint8Array(buf_len);
      for (i2 = 0, m_pos = 0; i2 < buf_len; m_pos++) {
        c2 = str.charCodeAt(m_pos);
        if ((c2 & 64512) === 55296 && m_pos + 1 < str_len) {
          c22 = str.charCodeAt(m_pos + 1);
          if ((c22 & 64512) === 56320) {
            c2 = 65536 + (c2 - 55296 << 10) + (c22 - 56320);
            m_pos++;
          }
        }
        if (c2 < 128) {
          buf[i2++] = c2;
        } else if (c2 < 2048) {
          buf[i2++] = 192 | c2 >>> 6;
          buf[i2++] = 128 | c2 & 63;
        } else if (c2 < 65536) {
          buf[i2++] = 224 | c2 >>> 12;
          buf[i2++] = 128 | c2 >>> 6 & 63;
          buf[i2++] = 128 | c2 & 63;
        } else {
          buf[i2++] = 240 | c2 >>> 18;
          buf[i2++] = 128 | c2 >>> 12 & 63;
          buf[i2++] = 128 | c2 >>> 6 & 63;
          buf[i2++] = 128 | c2 & 63;
        }
      }
      return buf;
    };
    var buf2binstring = (buf, len) => {
      if (len < 65534) {
        if (buf.subarray && STR_APPLY_UIA_OK) {
          return String.fromCharCode.apply(null, buf.length === len ? buf : buf.subarray(0, len));
        }
      }
      let result = "";
      for (let i2 = 0; i2 < len; i2++) {
        result += String.fromCharCode(buf[i2]);
      }
      return result;
    };
    module2.exports.buf2string = (buf, max) => {
      const len = max || buf.length;
      if (typeof TextDecoder === "function" && TextDecoder.prototype.decode) {
        return new TextDecoder().decode(buf.subarray(0, max));
      }
      let i2, out;
      const utf16buf = new Array(len * 2);
      for (out = 0, i2 = 0; i2 < len; ) {
        let c2 = buf[i2++];
        if (c2 < 128) {
          utf16buf[out++] = c2;
          continue;
        }
        let c_len = _utf8len[c2];
        if (c_len > 4) {
          utf16buf[out++] = 65533;
          i2 += c_len - 1;
          continue;
        }
        c2 &= c_len === 2 ? 31 : c_len === 3 ? 15 : 7;
        while (c_len > 1 && i2 < len) {
          c2 = c2 << 6 | buf[i2++] & 63;
          c_len--;
        }
        if (c_len > 1) {
          utf16buf[out++] = 65533;
          continue;
        }
        if (c2 < 65536) {
          utf16buf[out++] = c2;
        } else {
          c2 -= 65536;
          utf16buf[out++] = 55296 | c2 >> 10 & 1023;
          utf16buf[out++] = 56320 | c2 & 1023;
        }
      }
      return buf2binstring(utf16buf, out);
    };
    module2.exports.utf8border = (buf, max) => {
      max = max || buf.length;
      if (max > buf.length) {
        max = buf.length;
      }
      let pos = max - 1;
      while (pos >= 0 && (buf[pos] & 192) === 128) {
        pos--;
      }
      if (pos < 0) {
        return max;
      }
      if (pos === 0) {
        return max;
      }
      return pos + _utf8len[buf[pos]] > max ? pos : max;
    };
  }
});

// ../../node_modules/pako/lib/zlib/zstream.js
var require_zstream = __commonJS({
  "../../node_modules/pako/lib/zlib/zstream.js"(exports, module2) {
    "use strict";
    function ZStream() {
      this.input = null;
      this.next_in = 0;
      this.avail_in = 0;
      this.total_in = 0;
      this.output = null;
      this.next_out = 0;
      this.avail_out = 0;
      this.total_out = 0;
      this.msg = "";
      this.state = null;
      this.data_type = 2;
      this.adler = 0;
    }
    module2.exports = ZStream;
  }
});

// ../../node_modules/pako/lib/deflate.js
var require_deflate2 = __commonJS({
  "../../node_modules/pako/lib/deflate.js"(exports, module2) {
    "use strict";
    var zlib_deflate = require_deflate();
    var utils = require_common();
    var strings = require_strings();
    var msg = require_messages();
    var ZStream = require_zstream();
    var toString = Object.prototype.toString;
    var {
      Z_NO_FLUSH,
      Z_SYNC_FLUSH,
      Z_FULL_FLUSH,
      Z_FINISH,
      Z_OK,
      Z_STREAM_END,
      Z_DEFAULT_COMPRESSION,
      Z_DEFAULT_STRATEGY,
      Z_DEFLATED
    } = require_constants();
    function Deflate(options) {
      this.options = utils.assign({
        level: Z_DEFAULT_COMPRESSION,
        method: Z_DEFLATED,
        chunkSize: 16384,
        windowBits: 15,
        memLevel: 8,
        strategy: Z_DEFAULT_STRATEGY
      }, options || {});
      let opt = this.options;
      if (opt.raw && opt.windowBits > 0) {
        opt.windowBits = -opt.windowBits;
      } else if (opt.gzip && opt.windowBits > 0 && opt.windowBits < 16) {
        opt.windowBits += 16;
      }
      this.err = 0;
      this.msg = "";
      this.ended = false;
      this.chunks = [];
      this.strm = new ZStream();
      this.strm.avail_out = 0;
      let status = zlib_deflate.deflateInit2(
        this.strm,
        opt.level,
        opt.method,
        opt.windowBits,
        opt.memLevel,
        opt.strategy
      );
      if (status !== Z_OK) {
        throw new Error(msg[status]);
      }
      if (opt.header) {
        zlib_deflate.deflateSetHeader(this.strm, opt.header);
      }
      if (opt.dictionary) {
        let dict;
        if (typeof opt.dictionary === "string") {
          dict = strings.string2buf(opt.dictionary);
        } else if (toString.call(opt.dictionary) === "[object ArrayBuffer]") {
          dict = new Uint8Array(opt.dictionary);
        } else {
          dict = opt.dictionary;
        }
        status = zlib_deflate.deflateSetDictionary(this.strm, dict);
        if (status !== Z_OK) {
          throw new Error(msg[status]);
        }
        this._dict_set = true;
      }
    }
    Deflate.prototype.push = function(data, flush_mode) {
      const strm = this.strm;
      const chunkSize = this.options.chunkSize;
      let status, _flush_mode;
      if (this.ended) {
        return false;
      }
      if (flush_mode === ~~flush_mode)
        _flush_mode = flush_mode;
      else
        _flush_mode = flush_mode === true ? Z_FINISH : Z_NO_FLUSH;
      if (typeof data === "string") {
        strm.input = strings.string2buf(data);
      } else if (toString.call(data) === "[object ArrayBuffer]") {
        strm.input = new Uint8Array(data);
      } else {
        strm.input = data;
      }
      strm.next_in = 0;
      strm.avail_in = strm.input.length;
      for (; ; ) {
        if (strm.avail_out === 0) {
          strm.output = new Uint8Array(chunkSize);
          strm.next_out = 0;
          strm.avail_out = chunkSize;
        }
        if ((_flush_mode === Z_SYNC_FLUSH || _flush_mode === Z_FULL_FLUSH) && strm.avail_out <= 6) {
          this.onData(strm.output.subarray(0, strm.next_out));
          strm.avail_out = 0;
          continue;
        }
        status = zlib_deflate.deflate(strm, _flush_mode);
        if (status === Z_STREAM_END) {
          if (strm.next_out > 0) {
            this.onData(strm.output.subarray(0, strm.next_out));
          }
          status = zlib_deflate.deflateEnd(this.strm);
          this.onEnd(status);
          this.ended = true;
          return status === Z_OK;
        }
        if (strm.avail_out === 0) {
          this.onData(strm.output);
          continue;
        }
        if (_flush_mode > 0 && strm.next_out > 0) {
          this.onData(strm.output.subarray(0, strm.next_out));
          strm.avail_out = 0;
          continue;
        }
        if (strm.avail_in === 0)
          break;
      }
      return true;
    };
    Deflate.prototype.onData = function(chunk) {
      this.chunks.push(chunk);
    };
    Deflate.prototype.onEnd = function(status) {
      if (status === Z_OK) {
        this.result = utils.flattenChunks(this.chunks);
      }
      this.chunks = [];
      this.err = status;
      this.msg = this.strm.msg;
    };
    function deflate(input, options) {
      const deflator = new Deflate(options);
      deflator.push(input, true);
      if (deflator.err) {
        throw deflator.msg || msg[deflator.err];
      }
      return deflator.result;
    }
    function deflateRaw(input, options) {
      options = options || {};
      options.raw = true;
      return deflate(input, options);
    }
    function gzip(input, options) {
      options = options || {};
      options.gzip = true;
      return deflate(input, options);
    }
    module2.exports.Deflate = Deflate;
    module2.exports.deflate = deflate;
    module2.exports.deflateRaw = deflateRaw;
    module2.exports.gzip = gzip;
    module2.exports.constants = require_constants();
  }
});

// ../../node_modules/pako/lib/zlib/inffast.js
var require_inffast = __commonJS({
  "../../node_modules/pako/lib/zlib/inffast.js"(exports, module2) {
    "use strict";
    var BAD = 16209;
    var TYPE = 16191;
    module2.exports = function inflate_fast(strm, start) {
      let _in;
      let last;
      let _out;
      let beg;
      let end;
      let dmax;
      let wsize;
      let whave;
      let wnext;
      let s_window;
      let hold;
      let bits;
      let lcode;
      let dcode;
      let lmask;
      let dmask;
      let here;
      let op;
      let len;
      let dist;
      let from;
      let from_source;
      let input, output;
      const state = strm.state;
      _in = strm.next_in;
      input = strm.input;
      last = _in + (strm.avail_in - 5);
      _out = strm.next_out;
      output = strm.output;
      beg = _out - (start - strm.avail_out);
      end = _out + (strm.avail_out - 257);
      dmax = state.dmax;
      wsize = state.wsize;
      whave = state.whave;
      wnext = state.wnext;
      s_window = state.window;
      hold = state.hold;
      bits = state.bits;
      lcode = state.lencode;
      dcode = state.distcode;
      lmask = (1 << state.lenbits) - 1;
      dmask = (1 << state.distbits) - 1;
      top:
        do {
          if (bits < 15) {
            hold += input[_in++] << bits;
            bits += 8;
            hold += input[_in++] << bits;
            bits += 8;
          }
          here = lcode[hold & lmask];
          dolen:
            for (; ; ) {
              op = here >>> 24;
              hold >>>= op;
              bits -= op;
              op = here >>> 16 & 255;
              if (op === 0) {
                output[_out++] = here & 65535;
              } else if (op & 16) {
                len = here & 65535;
                op &= 15;
                if (op) {
                  if (bits < op) {
                    hold += input[_in++] << bits;
                    bits += 8;
                  }
                  len += hold & (1 << op) - 1;
                  hold >>>= op;
                  bits -= op;
                }
                if (bits < 15) {
                  hold += input[_in++] << bits;
                  bits += 8;
                  hold += input[_in++] << bits;
                  bits += 8;
                }
                here = dcode[hold & dmask];
                dodist:
                  for (; ; ) {
                    op = here >>> 24;
                    hold >>>= op;
                    bits -= op;
                    op = here >>> 16 & 255;
                    if (op & 16) {
                      dist = here & 65535;
                      op &= 15;
                      if (bits < op) {
                        hold += input[_in++] << bits;
                        bits += 8;
                        if (bits < op) {
                          hold += input[_in++] << bits;
                          bits += 8;
                        }
                      }
                      dist += hold & (1 << op) - 1;
                      if (dist > dmax) {
                        strm.msg = "invalid distance too far back";
                        state.mode = BAD;
                        break top;
                      }
                      hold >>>= op;
                      bits -= op;
                      op = _out - beg;
                      if (dist > op) {
                        op = dist - op;
                        if (op > whave) {
                          if (state.sane) {
                            strm.msg = "invalid distance too far back";
                            state.mode = BAD;
                            break top;
                          }
                        }
                        from = 0;
                        from_source = s_window;
                        if (wnext === 0) {
                          from += wsize - op;
                          if (op < len) {
                            len -= op;
                            do {
                              output[_out++] = s_window[from++];
                            } while (--op);
                            from = _out - dist;
                            from_source = output;
                          }
                        } else if (wnext < op) {
                          from += wsize + wnext - op;
                          op -= wnext;
                          if (op < len) {
                            len -= op;
                            do {
                              output[_out++] = s_window[from++];
                            } while (--op);
                            from = 0;
                            if (wnext < len) {
                              op = wnext;
                              len -= op;
                              do {
                                output[_out++] = s_window[from++];
                              } while (--op);
                              from = _out - dist;
                              from_source = output;
                            }
                          }
                        } else {
                          from += wnext - op;
                          if (op < len) {
                            len -= op;
                            do {
                              output[_out++] = s_window[from++];
                            } while (--op);
                            from = _out - dist;
                            from_source = output;
                          }
                        }
                        while (len > 2) {
                          output[_out++] = from_source[from++];
                          output[_out++] = from_source[from++];
                          output[_out++] = from_source[from++];
                          len -= 3;
                        }
                        if (len) {
                          output[_out++] = from_source[from++];
                          if (len > 1) {
                            output[_out++] = from_source[from++];
                          }
                        }
                      } else {
                        from = _out - dist;
                        do {
                          output[_out++] = output[from++];
                          output[_out++] = output[from++];
                          output[_out++] = output[from++];
                          len -= 3;
                        } while (len > 2);
                        if (len) {
                          output[_out++] = output[from++];
                          if (len > 1) {
                            output[_out++] = output[from++];
                          }
                        }
                      }
                    } else if ((op & 64) === 0) {
                      here = dcode[(here & 65535) + (hold & (1 << op) - 1)];
                      continue dodist;
                    } else {
                      strm.msg = "invalid distance code";
                      state.mode = BAD;
                      break top;
                    }
                    break;
                  }
              } else if ((op & 64) === 0) {
                here = lcode[(here & 65535) + (hold & (1 << op) - 1)];
                continue dolen;
              } else if (op & 32) {
                state.mode = TYPE;
                break top;
              } else {
                strm.msg = "invalid literal/length code";
                state.mode = BAD;
                break top;
              }
              break;
            }
        } while (_in < last && _out < end);
      len = bits >> 3;
      _in -= len;
      bits -= len << 3;
      hold &= (1 << bits) - 1;
      strm.next_in = _in;
      strm.next_out = _out;
      strm.avail_in = _in < last ? 5 + (last - _in) : 5 - (_in - last);
      strm.avail_out = _out < end ? 257 + (end - _out) : 257 - (_out - end);
      state.hold = hold;
      state.bits = bits;
      return;
    };
  }
});

// ../../node_modules/pako/lib/zlib/inftrees.js
var require_inftrees = __commonJS({
  "../../node_modules/pako/lib/zlib/inftrees.js"(exports, module2) {
    "use strict";
    var MAXBITS = 15;
    var ENOUGH_LENS = 852;
    var ENOUGH_DISTS = 592;
    var CODES = 0;
    var LENS = 1;
    var DISTS = 2;
    var lbase = new Uint16Array([
      /* Length codes 257..285 base */
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      13,
      15,
      17,
      19,
      23,
      27,
      31,
      35,
      43,
      51,
      59,
      67,
      83,
      99,
      115,
      131,
      163,
      195,
      227,
      258,
      0,
      0
    ]);
    var lext = new Uint8Array([
      /* Length codes 257..285 extra */
      16,
      16,
      16,
      16,
      16,
      16,
      16,
      16,
      17,
      17,
      17,
      17,
      18,
      18,
      18,
      18,
      19,
      19,
      19,
      19,
      20,
      20,
      20,
      20,
      21,
      21,
      21,
      21,
      16,
      72,
      78
    ]);
    var dbase = new Uint16Array([
      /* Distance codes 0..29 base */
      1,
      2,
      3,
      4,
      5,
      7,
      9,
      13,
      17,
      25,
      33,
      49,
      65,
      97,
      129,
      193,
      257,
      385,
      513,
      769,
      1025,
      1537,
      2049,
      3073,
      4097,
      6145,
      8193,
      12289,
      16385,
      24577,
      0,
      0
    ]);
    var dext = new Uint8Array([
      /* Distance codes 0..29 extra */
      16,
      16,
      16,
      16,
      17,
      17,
      18,
      18,
      19,
      19,
      20,
      20,
      21,
      21,
      22,
      22,
      23,
      23,
      24,
      24,
      25,
      25,
      26,
      26,
      27,
      27,
      28,
      28,
      29,
      29,
      64,
      64
    ]);
    var inflate_table = (type, lens, lens_index, codes, table, table_index, work, opts) => {
      const bits = opts.bits;
      let len = 0;
      let sym = 0;
      let min = 0, max = 0;
      let root = 0;
      let curr = 0;
      let drop = 0;
      let left = 0;
      let used = 0;
      let huff = 0;
      let incr;
      let fill;
      let low;
      let mask;
      let next;
      let base = null;
      let match;
      const count = new Uint16Array(MAXBITS + 1);
      const offs = new Uint16Array(MAXBITS + 1);
      let extra = null;
      let here_bits, here_op, here_val;
      for (len = 0; len <= MAXBITS; len++) {
        count[len] = 0;
      }
      for (sym = 0; sym < codes; sym++) {
        count[lens[lens_index + sym]]++;
      }
      root = bits;
      for (max = MAXBITS; max >= 1; max--) {
        if (count[max] !== 0) {
          break;
        }
      }
      if (root > max) {
        root = max;
      }
      if (max === 0) {
        table[table_index++] = 1 << 24 | 64 << 16 | 0;
        table[table_index++] = 1 << 24 | 64 << 16 | 0;
        opts.bits = 1;
        return 0;
      }
      for (min = 1; min < max; min++) {
        if (count[min] !== 0) {
          break;
        }
      }
      if (root < min) {
        root = min;
      }
      left = 1;
      for (len = 1; len <= MAXBITS; len++) {
        left <<= 1;
        left -= count[len];
        if (left < 0) {
          return -1;
        }
      }
      if (left > 0 && (type === CODES || max !== 1)) {
        return -1;
      }
      offs[1] = 0;
      for (len = 1; len < MAXBITS; len++) {
        offs[len + 1] = offs[len] + count[len];
      }
      for (sym = 0; sym < codes; sym++) {
        if (lens[lens_index + sym] !== 0) {
          work[offs[lens[lens_index + sym]]++] = sym;
        }
      }
      if (type === CODES) {
        base = extra = work;
        match = 20;
      } else if (type === LENS) {
        base = lbase;
        extra = lext;
        match = 257;
      } else {
        base = dbase;
        extra = dext;
        match = 0;
      }
      huff = 0;
      sym = 0;
      len = min;
      next = table_index;
      curr = root;
      drop = 0;
      low = -1;
      used = 1 << root;
      mask = used - 1;
      if (type === LENS && used > ENOUGH_LENS || type === DISTS && used > ENOUGH_DISTS) {
        return 1;
      }
      for (; ; ) {
        here_bits = len - drop;
        if (work[sym] + 1 < match) {
          here_op = 0;
          here_val = work[sym];
        } else if (work[sym] >= match) {
          here_op = extra[work[sym] - match];
          here_val = base[work[sym] - match];
        } else {
          here_op = 32 + 64;
          here_val = 0;
        }
        incr = 1 << len - drop;
        fill = 1 << curr;
        min = fill;
        do {
          fill -= incr;
          table[next + (huff >> drop) + fill] = here_bits << 24 | here_op << 16 | here_val | 0;
        } while (fill !== 0);
        incr = 1 << len - 1;
        while (huff & incr) {
          incr >>= 1;
        }
        if (incr !== 0) {
          huff &= incr - 1;
          huff += incr;
        } else {
          huff = 0;
        }
        sym++;
        if (--count[len] === 0) {
          if (len === max) {
            break;
          }
          len = lens[lens_index + work[sym]];
        }
        if (len > root && (huff & mask) !== low) {
          if (drop === 0) {
            drop = root;
          }
          next += min;
          curr = len - drop;
          left = 1 << curr;
          while (curr + drop < max) {
            left -= count[curr + drop];
            if (left <= 0) {
              break;
            }
            curr++;
            left <<= 1;
          }
          used += 1 << curr;
          if (type === LENS && used > ENOUGH_LENS || type === DISTS && used > ENOUGH_DISTS) {
            return 1;
          }
          low = huff & mask;
          table[low] = root << 24 | curr << 16 | next - table_index | 0;
        }
      }
      if (huff !== 0) {
        table[next + huff] = len - drop << 24 | 64 << 16 | 0;
      }
      opts.bits = root;
      return 0;
    };
    module2.exports = inflate_table;
  }
});

// ../../node_modules/pako/lib/zlib/inflate.js
var require_inflate = __commonJS({
  "../../node_modules/pako/lib/zlib/inflate.js"(exports, module2) {
    "use strict";
    var adler32 = require_adler32();
    var crc32 = require_crc32();
    var inflate_fast = require_inffast();
    var inflate_table = require_inftrees();
    var CODES = 0;
    var LENS = 1;
    var DISTS = 2;
    var {
      Z_FINISH,
      Z_BLOCK,
      Z_TREES,
      Z_OK,
      Z_STREAM_END,
      Z_NEED_DICT,
      Z_STREAM_ERROR,
      Z_DATA_ERROR,
      Z_MEM_ERROR,
      Z_BUF_ERROR,
      Z_DEFLATED
    } = require_constants();
    var HEAD = 16180;
    var FLAGS = 16181;
    var TIME = 16182;
    var OS = 16183;
    var EXLEN = 16184;
    var EXTRA = 16185;
    var NAME = 16186;
    var COMMENT = 16187;
    var HCRC = 16188;
    var DICTID = 16189;
    var DICT = 16190;
    var TYPE = 16191;
    var TYPEDO = 16192;
    var STORED = 16193;
    var COPY_ = 16194;
    var COPY = 16195;
    var TABLE = 16196;
    var LENLENS = 16197;
    var CODELENS = 16198;
    var LEN_ = 16199;
    var LEN = 16200;
    var LENEXT = 16201;
    var DIST = 16202;
    var DISTEXT = 16203;
    var MATCH = 16204;
    var LIT = 16205;
    var CHECK = 16206;
    var LENGTH = 16207;
    var DONE = 16208;
    var BAD = 16209;
    var MEM = 16210;
    var SYNC = 16211;
    var ENOUGH_LENS = 852;
    var ENOUGH_DISTS = 592;
    var MAX_WBITS = 15;
    var DEF_WBITS = MAX_WBITS;
    var zswap32 = (q2) => {
      return (q2 >>> 24 & 255) + (q2 >>> 8 & 65280) + ((q2 & 65280) << 8) + ((q2 & 255) << 24);
    };
    function InflateState() {
      this.strm = null;
      this.mode = 0;
      this.last = false;
      this.wrap = 0;
      this.havedict = false;
      this.flags = 0;
      this.dmax = 0;
      this.check = 0;
      this.total = 0;
      this.head = null;
      this.wbits = 0;
      this.wsize = 0;
      this.whave = 0;
      this.wnext = 0;
      this.window = null;
      this.hold = 0;
      this.bits = 0;
      this.length = 0;
      this.offset = 0;
      this.extra = 0;
      this.lencode = null;
      this.distcode = null;
      this.lenbits = 0;
      this.distbits = 0;
      this.ncode = 0;
      this.nlen = 0;
      this.ndist = 0;
      this.have = 0;
      this.next = null;
      this.lens = new Uint16Array(320);
      this.work = new Uint16Array(288);
      this.lendyn = null;
      this.distdyn = null;
      this.sane = 0;
      this.back = 0;
      this.was = 0;
    }
    var inflateStateCheck = (strm) => {
      if (!strm) {
        return 1;
      }
      const state = strm.state;
      if (!state || state.strm !== strm || state.mode < HEAD || state.mode > SYNC) {
        return 1;
      }
      return 0;
    };
    var inflateResetKeep = (strm) => {
      if (inflateStateCheck(strm)) {
        return Z_STREAM_ERROR;
      }
      const state = strm.state;
      strm.total_in = strm.total_out = state.total = 0;
      strm.msg = "";
      if (state.wrap) {
        strm.adler = state.wrap & 1;
      }
      state.mode = HEAD;
      state.last = 0;
      state.havedict = 0;
      state.flags = -1;
      state.dmax = 32768;
      state.head = null;
      state.hold = 0;
      state.bits = 0;
      state.lencode = state.lendyn = new Int32Array(ENOUGH_LENS);
      state.distcode = state.distdyn = new Int32Array(ENOUGH_DISTS);
      state.sane = 1;
      state.back = -1;
      return Z_OK;
    };
    var inflateReset = (strm) => {
      if (inflateStateCheck(strm)) {
        return Z_STREAM_ERROR;
      }
      const state = strm.state;
      state.wsize = 0;
      state.whave = 0;
      state.wnext = 0;
      return inflateResetKeep(strm);
    };
    var inflateReset2 = (strm, windowBits) => {
      let wrap;
      if (inflateStateCheck(strm)) {
        return Z_STREAM_ERROR;
      }
      const state = strm.state;
      if (windowBits < 0) {
        wrap = 0;
        windowBits = -windowBits;
      } else {
        wrap = (windowBits >> 4) + 5;
        if (windowBits < 48) {
          windowBits &= 15;
        }
      }
      if (windowBits && (windowBits < 8 || windowBits > 15)) {
        return Z_STREAM_ERROR;
      }
      if (state.window !== null && state.wbits !== windowBits) {
        state.window = null;
      }
      state.wrap = wrap;
      state.wbits = windowBits;
      return inflateReset(strm);
    };
    var inflateInit2 = (strm, windowBits) => {
      if (!strm) {
        return Z_STREAM_ERROR;
      }
      const state = new InflateState();
      strm.state = state;
      state.strm = strm;
      state.window = null;
      state.mode = HEAD;
      const ret = inflateReset2(strm, windowBits);
      if (ret !== Z_OK) {
        strm.state = null;
      }
      return ret;
    };
    var inflateInit = (strm) => {
      return inflateInit2(strm, DEF_WBITS);
    };
    var virgin = true;
    var lenfix;
    var distfix;
    var fixedtables = (state) => {
      if (virgin) {
        lenfix = new Int32Array(512);
        distfix = new Int32Array(32);
        let sym = 0;
        while (sym < 144) {
          state.lens[sym++] = 8;
        }
        while (sym < 256) {
          state.lens[sym++] = 9;
        }
        while (sym < 280) {
          state.lens[sym++] = 7;
        }
        while (sym < 288) {
          state.lens[sym++] = 8;
        }
        inflate_table(LENS, state.lens, 0, 288, lenfix, 0, state.work, { bits: 9 });
        sym = 0;
        while (sym < 32) {
          state.lens[sym++] = 5;
        }
        inflate_table(DISTS, state.lens, 0, 32, distfix, 0, state.work, { bits: 5 });
        virgin = false;
      }
      state.lencode = lenfix;
      state.lenbits = 9;
      state.distcode = distfix;
      state.distbits = 5;
    };
    var updatewindow = (strm, src, end, copy) => {
      let dist;
      const state = strm.state;
      if (state.window === null) {
        state.wsize = 1 << state.wbits;
        state.wnext = 0;
        state.whave = 0;
        state.window = new Uint8Array(state.wsize);
      }
      if (copy >= state.wsize) {
        state.window.set(src.subarray(end - state.wsize, end), 0);
        state.wnext = 0;
        state.whave = state.wsize;
      } else {
        dist = state.wsize - state.wnext;
        if (dist > copy) {
          dist = copy;
        }
        state.window.set(src.subarray(end - copy, end - copy + dist), state.wnext);
        copy -= dist;
        if (copy) {
          state.window.set(src.subarray(end - copy, end), 0);
          state.wnext = copy;
          state.whave = state.wsize;
        } else {
          state.wnext += dist;
          if (state.wnext === state.wsize) {
            state.wnext = 0;
          }
          if (state.whave < state.wsize) {
            state.whave += dist;
          }
        }
      }
      return 0;
    };
    var inflate = (strm, flush) => {
      let state;
      let input, output;
      let next;
      let put;
      let have, left;
      let hold;
      let bits;
      let _in, _out;
      let copy;
      let from;
      let from_source;
      let here = 0;
      let here_bits, here_op, here_val;
      let last_bits, last_op, last_val;
      let len;
      let ret;
      const hbuf = new Uint8Array(4);
      let opts;
      let n2;
      const order = (
        /* permutation of code lengths */
        new Uint8Array([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15])
      );
      if (inflateStateCheck(strm) || !strm.output || !strm.input && strm.avail_in !== 0) {
        return Z_STREAM_ERROR;
      }
      state = strm.state;
      if (state.mode === TYPE) {
        state.mode = TYPEDO;
      }
      put = strm.next_out;
      output = strm.output;
      left = strm.avail_out;
      next = strm.next_in;
      input = strm.input;
      have = strm.avail_in;
      hold = state.hold;
      bits = state.bits;
      _in = have;
      _out = left;
      ret = Z_OK;
      inf_leave:
        for (; ; ) {
          switch (state.mode) {
            case HEAD:
              if (state.wrap === 0) {
                state.mode = TYPEDO;
                break;
              }
              while (bits < 16) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              if (state.wrap & 2 && hold === 35615) {
                if (state.wbits === 0) {
                  state.wbits = 15;
                }
                state.check = 0;
                hbuf[0] = hold & 255;
                hbuf[1] = hold >>> 8 & 255;
                state.check = crc32(state.check, hbuf, 2, 0);
                hold = 0;
                bits = 0;
                state.mode = FLAGS;
                break;
              }
              if (state.head) {
                state.head.done = false;
              }
              if (!(state.wrap & 1) || /* check if zlib header allowed */
              (((hold & 255) << 8) + (hold >> 8)) % 31) {
                strm.msg = "incorrect header check";
                state.mode = BAD;
                break;
              }
              if ((hold & 15) !== Z_DEFLATED) {
                strm.msg = "unknown compression method";
                state.mode = BAD;
                break;
              }
              hold >>>= 4;
              bits -= 4;
              len = (hold & 15) + 8;
              if (state.wbits === 0) {
                state.wbits = len;
              }
              if (len > 15 || len > state.wbits) {
                strm.msg = "invalid window size";
                state.mode = BAD;
                break;
              }
              state.dmax = 1 << state.wbits;
              state.flags = 0;
              strm.adler = state.check = 1;
              state.mode = hold & 512 ? DICTID : TYPE;
              hold = 0;
              bits = 0;
              break;
            case FLAGS:
              while (bits < 16) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              state.flags = hold;
              if ((state.flags & 255) !== Z_DEFLATED) {
                strm.msg = "unknown compression method";
                state.mode = BAD;
                break;
              }
              if (state.flags & 57344) {
                strm.msg = "unknown header flags set";
                state.mode = BAD;
                break;
              }
              if (state.head) {
                state.head.text = hold >> 8 & 1;
              }
              if (state.flags & 512 && state.wrap & 4) {
                hbuf[0] = hold & 255;
                hbuf[1] = hold >>> 8 & 255;
                state.check = crc32(state.check, hbuf, 2, 0);
              }
              hold = 0;
              bits = 0;
              state.mode = TIME;
            case TIME:
              while (bits < 32) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              if (state.head) {
                state.head.time = hold;
              }
              if (state.flags & 512 && state.wrap & 4) {
                hbuf[0] = hold & 255;
                hbuf[1] = hold >>> 8 & 255;
                hbuf[2] = hold >>> 16 & 255;
                hbuf[3] = hold >>> 24 & 255;
                state.check = crc32(state.check, hbuf, 4, 0);
              }
              hold = 0;
              bits = 0;
              state.mode = OS;
            case OS:
              while (bits < 16) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              if (state.head) {
                state.head.xflags = hold & 255;
                state.head.os = hold >> 8;
              }
              if (state.flags & 512 && state.wrap & 4) {
                hbuf[0] = hold & 255;
                hbuf[1] = hold >>> 8 & 255;
                state.check = crc32(state.check, hbuf, 2, 0);
              }
              hold = 0;
              bits = 0;
              state.mode = EXLEN;
            case EXLEN:
              if (state.flags & 1024) {
                while (bits < 16) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                state.length = hold;
                if (state.head) {
                  state.head.extra_len = hold;
                }
                if (state.flags & 512 && state.wrap & 4) {
                  hbuf[0] = hold & 255;
                  hbuf[1] = hold >>> 8 & 255;
                  state.check = crc32(state.check, hbuf, 2, 0);
                }
                hold = 0;
                bits = 0;
              } else if (state.head) {
                state.head.extra = null;
              }
              state.mode = EXTRA;
            case EXTRA:
              if (state.flags & 1024) {
                copy = state.length;
                if (copy > have) {
                  copy = have;
                }
                if (copy) {
                  if (state.head) {
                    len = state.head.extra_len - state.length;
                    if (!state.head.extra) {
                      state.head.extra = new Uint8Array(state.head.extra_len);
                    }
                    state.head.extra.set(
                      input.subarray(
                        next,
                        // extra field is limited to 65536 bytes
                        // - no need for additional size check
                        next + copy
                      ),
                      /*len + copy > state.head.extra_max - len ? state.head.extra_max : copy,*/
                      len
                    );
                  }
                  if (state.flags & 512 && state.wrap & 4) {
                    state.check = crc32(state.check, input, copy, next);
                  }
                  have -= copy;
                  next += copy;
                  state.length -= copy;
                }
                if (state.length) {
                  break inf_leave;
                }
              }
              state.length = 0;
              state.mode = NAME;
            case NAME:
              if (state.flags & 2048) {
                if (have === 0) {
                  break inf_leave;
                }
                copy = 0;
                do {
                  len = input[next + copy++];
                  if (state.head && len && state.length < 65536) {
                    state.head.name += String.fromCharCode(len);
                  }
                } while (len && copy < have);
                if (state.flags & 512 && state.wrap & 4) {
                  state.check = crc32(state.check, input, copy, next);
                }
                have -= copy;
                next += copy;
                if (len) {
                  break inf_leave;
                }
              } else if (state.head) {
                state.head.name = null;
              }
              state.length = 0;
              state.mode = COMMENT;
            case COMMENT:
              if (state.flags & 4096) {
                if (have === 0) {
                  break inf_leave;
                }
                copy = 0;
                do {
                  len = input[next + copy++];
                  if (state.head && len && state.length < 65536) {
                    state.head.comment += String.fromCharCode(len);
                  }
                } while (len && copy < have);
                if (state.flags & 512 && state.wrap & 4) {
                  state.check = crc32(state.check, input, copy, next);
                }
                have -= copy;
                next += copy;
                if (len) {
                  break inf_leave;
                }
              } else if (state.head) {
                state.head.comment = null;
              }
              state.mode = HCRC;
            case HCRC:
              if (state.flags & 512) {
                while (bits < 16) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                if (state.wrap & 4 && hold !== (state.check & 65535)) {
                  strm.msg = "header crc mismatch";
                  state.mode = BAD;
                  break;
                }
                hold = 0;
                bits = 0;
              }
              if (state.head) {
                state.head.hcrc = state.flags >> 9 & 1;
                state.head.done = true;
              }
              strm.adler = state.check = 0;
              state.mode = TYPE;
              break;
            case DICTID:
              while (bits < 32) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              strm.adler = state.check = zswap32(hold);
              hold = 0;
              bits = 0;
              state.mode = DICT;
            case DICT:
              if (state.havedict === 0) {
                strm.next_out = put;
                strm.avail_out = left;
                strm.next_in = next;
                strm.avail_in = have;
                state.hold = hold;
                state.bits = bits;
                return Z_NEED_DICT;
              }
              strm.adler = state.check = 1;
              state.mode = TYPE;
            case TYPE:
              if (flush === Z_BLOCK || flush === Z_TREES) {
                break inf_leave;
              }
            case TYPEDO:
              if (state.last) {
                hold >>>= bits & 7;
                bits -= bits & 7;
                state.mode = CHECK;
                break;
              }
              while (bits < 3) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              state.last = hold & 1;
              hold >>>= 1;
              bits -= 1;
              switch (hold & 3) {
                case 0:
                  state.mode = STORED;
                  break;
                case 1:
                  fixedtables(state);
                  state.mode = LEN_;
                  if (flush === Z_TREES) {
                    hold >>>= 2;
                    bits -= 2;
                    break inf_leave;
                  }
                  break;
                case 2:
                  state.mode = TABLE;
                  break;
                case 3:
                  strm.msg = "invalid block type";
                  state.mode = BAD;
              }
              hold >>>= 2;
              bits -= 2;
              break;
            case STORED:
              hold >>>= bits & 7;
              bits -= bits & 7;
              while (bits < 32) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              if ((hold & 65535) !== (hold >>> 16 ^ 65535)) {
                strm.msg = "invalid stored block lengths";
                state.mode = BAD;
                break;
              }
              state.length = hold & 65535;
              hold = 0;
              bits = 0;
              state.mode = COPY_;
              if (flush === Z_TREES) {
                break inf_leave;
              }
            case COPY_:
              state.mode = COPY;
            case COPY:
              copy = state.length;
              if (copy) {
                if (copy > have) {
                  copy = have;
                }
                if (copy > left) {
                  copy = left;
                }
                if (copy === 0) {
                  break inf_leave;
                }
                output.set(input.subarray(next, next + copy), put);
                have -= copy;
                next += copy;
                left -= copy;
                put += copy;
                state.length -= copy;
                break;
              }
              state.mode = TYPE;
              break;
            case TABLE:
              while (bits < 14) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              state.nlen = (hold & 31) + 257;
              hold >>>= 5;
              bits -= 5;
              state.ndist = (hold & 31) + 1;
              hold >>>= 5;
              bits -= 5;
              state.ncode = (hold & 15) + 4;
              hold >>>= 4;
              bits -= 4;
              if (state.nlen > 286 || state.ndist > 30) {
                strm.msg = "too many length or distance symbols";
                state.mode = BAD;
                break;
              }
              state.have = 0;
              state.mode = LENLENS;
            case LENLENS:
              while (state.have < state.ncode) {
                while (bits < 3) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                state.lens[order[state.have++]] = hold & 7;
                hold >>>= 3;
                bits -= 3;
              }
              while (state.have < 19) {
                state.lens[order[state.have++]] = 0;
              }
              state.lencode = state.lendyn;
              state.lenbits = 7;
              opts = { bits: state.lenbits };
              ret = inflate_table(CODES, state.lens, 0, 19, state.lencode, 0, state.work, opts);
              state.lenbits = opts.bits;
              if (ret) {
                strm.msg = "invalid code lengths set";
                state.mode = BAD;
                break;
              }
              state.have = 0;
              state.mode = CODELENS;
            case CODELENS:
              while (state.have < state.nlen + state.ndist) {
                for (; ; ) {
                  here = state.lencode[hold & (1 << state.lenbits) - 1];
                  here_bits = here >>> 24;
                  here_op = here >>> 16 & 255;
                  here_val = here & 65535;
                  if (here_bits <= bits) {
                    break;
                  }
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                if (here_val < 16) {
                  hold >>>= here_bits;
                  bits -= here_bits;
                  state.lens[state.have++] = here_val;
                } else {
                  if (here_val === 16) {
                    n2 = here_bits + 2;
                    while (bits < n2) {
                      if (have === 0) {
                        break inf_leave;
                      }
                      have--;
                      hold += input[next++] << bits;
                      bits += 8;
                    }
                    hold >>>= here_bits;
                    bits -= here_bits;
                    if (state.have === 0) {
                      strm.msg = "invalid bit length repeat";
                      state.mode = BAD;
                      break;
                    }
                    len = state.lens[state.have - 1];
                    copy = 3 + (hold & 3);
                    hold >>>= 2;
                    bits -= 2;
                  } else if (here_val === 17) {
                    n2 = here_bits + 3;
                    while (bits < n2) {
                      if (have === 0) {
                        break inf_leave;
                      }
                      have--;
                      hold += input[next++] << bits;
                      bits += 8;
                    }
                    hold >>>= here_bits;
                    bits -= here_bits;
                    len = 0;
                    copy = 3 + (hold & 7);
                    hold >>>= 3;
                    bits -= 3;
                  } else {
                    n2 = here_bits + 7;
                    while (bits < n2) {
                      if (have === 0) {
                        break inf_leave;
                      }
                      have--;
                      hold += input[next++] << bits;
                      bits += 8;
                    }
                    hold >>>= here_bits;
                    bits -= here_bits;
                    len = 0;
                    copy = 11 + (hold & 127);
                    hold >>>= 7;
                    bits -= 7;
                  }
                  if (state.have + copy > state.nlen + state.ndist) {
                    strm.msg = "invalid bit length repeat";
                    state.mode = BAD;
                    break;
                  }
                  while (copy--) {
                    state.lens[state.have++] = len;
                  }
                }
              }
              if (state.mode === BAD) {
                break;
              }
              if (state.lens[256] === 0) {
                strm.msg = "invalid code -- missing end-of-block";
                state.mode = BAD;
                break;
              }
              state.lenbits = 9;
              opts = { bits: state.lenbits };
              ret = inflate_table(LENS, state.lens, 0, state.nlen, state.lencode, 0, state.work, opts);
              state.lenbits = opts.bits;
              if (ret) {
                strm.msg = "invalid literal/lengths set";
                state.mode = BAD;
                break;
              }
              state.distbits = 6;
              state.distcode = state.distdyn;
              opts = { bits: state.distbits };
              ret = inflate_table(DISTS, state.lens, state.nlen, state.ndist, state.distcode, 0, state.work, opts);
              state.distbits = opts.bits;
              if (ret) {
                strm.msg = "invalid distances set";
                state.mode = BAD;
                break;
              }
              state.mode = LEN_;
              if (flush === Z_TREES) {
                break inf_leave;
              }
            case LEN_:
              state.mode = LEN;
            case LEN:
              if (have >= 6 && left >= 258) {
                strm.next_out = put;
                strm.avail_out = left;
                strm.next_in = next;
                strm.avail_in = have;
                state.hold = hold;
                state.bits = bits;
                inflate_fast(strm, _out);
                put = strm.next_out;
                output = strm.output;
                left = strm.avail_out;
                next = strm.next_in;
                input = strm.input;
                have = strm.avail_in;
                hold = state.hold;
                bits = state.bits;
                if (state.mode === TYPE) {
                  state.back = -1;
                }
                break;
              }
              state.back = 0;
              for (; ; ) {
                here = state.lencode[hold & (1 << state.lenbits) - 1];
                here_bits = here >>> 24;
                here_op = here >>> 16 & 255;
                here_val = here & 65535;
                if (here_bits <= bits) {
                  break;
                }
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              if (here_op && (here_op & 240) === 0) {
                last_bits = here_bits;
                last_op = here_op;
                last_val = here_val;
                for (; ; ) {
                  here = state.lencode[last_val + ((hold & (1 << last_bits + last_op) - 1) >> last_bits)];
                  here_bits = here >>> 24;
                  here_op = here >>> 16 & 255;
                  here_val = here & 65535;
                  if (last_bits + here_bits <= bits) {
                    break;
                  }
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                hold >>>= last_bits;
                bits -= last_bits;
                state.back += last_bits;
              }
              hold >>>= here_bits;
              bits -= here_bits;
              state.back += here_bits;
              state.length = here_val;
              if (here_op === 0) {
                state.mode = LIT;
                break;
              }
              if (here_op & 32) {
                state.back = -1;
                state.mode = TYPE;
                break;
              }
              if (here_op & 64) {
                strm.msg = "invalid literal/length code";
                state.mode = BAD;
                break;
              }
              state.extra = here_op & 15;
              state.mode = LENEXT;
            case LENEXT:
              if (state.extra) {
                n2 = state.extra;
                while (bits < n2) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                state.length += hold & (1 << state.extra) - 1;
                hold >>>= state.extra;
                bits -= state.extra;
                state.back += state.extra;
              }
              state.was = state.length;
              state.mode = DIST;
            case DIST:
              for (; ; ) {
                here = state.distcode[hold & (1 << state.distbits) - 1];
                here_bits = here >>> 24;
                here_op = here >>> 16 & 255;
                here_val = here & 65535;
                if (here_bits <= bits) {
                  break;
                }
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              if ((here_op & 240) === 0) {
                last_bits = here_bits;
                last_op = here_op;
                last_val = here_val;
                for (; ; ) {
                  here = state.distcode[last_val + ((hold & (1 << last_bits + last_op) - 1) >> last_bits)];
                  here_bits = here >>> 24;
                  here_op = here >>> 16 & 255;
                  here_val = here & 65535;
                  if (last_bits + here_bits <= bits) {
                    break;
                  }
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                hold >>>= last_bits;
                bits -= last_bits;
                state.back += last_bits;
              }
              hold >>>= here_bits;
              bits -= here_bits;
              state.back += here_bits;
              if (here_op & 64) {
                strm.msg = "invalid distance code";
                state.mode = BAD;
                break;
              }
              state.offset = here_val;
              state.extra = here_op & 15;
              state.mode = DISTEXT;
            case DISTEXT:
              if (state.extra) {
                n2 = state.extra;
                while (bits < n2) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                state.offset += hold & (1 << state.extra) - 1;
                hold >>>= state.extra;
                bits -= state.extra;
                state.back += state.extra;
              }
              if (state.offset > state.dmax) {
                strm.msg = "invalid distance too far back";
                state.mode = BAD;
                break;
              }
              state.mode = MATCH;
            case MATCH:
              if (left === 0) {
                break inf_leave;
              }
              copy = _out - left;
              if (state.offset > copy) {
                copy = state.offset - copy;
                if (copy > state.whave) {
                  if (state.sane) {
                    strm.msg = "invalid distance too far back";
                    state.mode = BAD;
                    break;
                  }
                }
                if (copy > state.wnext) {
                  copy -= state.wnext;
                  from = state.wsize - copy;
                } else {
                  from = state.wnext - copy;
                }
                if (copy > state.length) {
                  copy = state.length;
                }
                from_source = state.window;
              } else {
                from_source = output;
                from = put - state.offset;
                copy = state.length;
              }
              if (copy > left) {
                copy = left;
              }
              left -= copy;
              state.length -= copy;
              do {
                output[put++] = from_source[from++];
              } while (--copy);
              if (state.length === 0) {
                state.mode = LEN;
              }
              break;
            case LIT:
              if (left === 0) {
                break inf_leave;
              }
              output[put++] = state.length;
              left--;
              state.mode = LEN;
              break;
            case CHECK:
              if (state.wrap) {
                while (bits < 32) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold |= input[next++] << bits;
                  bits += 8;
                }
                _out -= left;
                strm.total_out += _out;
                state.total += _out;
                if (state.wrap & 4 && _out) {
                  strm.adler = state.check = /*UPDATE_CHECK(state.check, put - _out, _out);*/
                  state.flags ? crc32(state.check, output, _out, put - _out) : adler32(state.check, output, _out, put - _out);
                }
                _out = left;
                if (state.wrap & 4 && (state.flags ? hold : zswap32(hold)) !== state.check) {
                  strm.msg = "incorrect data check";
                  state.mode = BAD;
                  break;
                }
                hold = 0;
                bits = 0;
              }
              state.mode = LENGTH;
            case LENGTH:
              if (state.wrap && state.flags) {
                while (bits < 32) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                if (state.wrap & 4 && hold !== (state.total & 4294967295)) {
                  strm.msg = "incorrect length check";
                  state.mode = BAD;
                  break;
                }
                hold = 0;
                bits = 0;
              }
              state.mode = DONE;
            case DONE:
              ret = Z_STREAM_END;
              break inf_leave;
            case BAD:
              ret = Z_DATA_ERROR;
              break inf_leave;
            case MEM:
              return Z_MEM_ERROR;
            case SYNC:
            default:
              return Z_STREAM_ERROR;
          }
        }
      strm.next_out = put;
      strm.avail_out = left;
      strm.next_in = next;
      strm.avail_in = have;
      state.hold = hold;
      state.bits = bits;
      if (state.wsize || _out !== strm.avail_out && state.mode < BAD && (state.mode < CHECK || flush !== Z_FINISH)) {
        if (updatewindow(strm, strm.output, strm.next_out, _out - strm.avail_out)) {
          state.mode = MEM;
          return Z_MEM_ERROR;
        }
      }
      _in -= strm.avail_in;
      _out -= strm.avail_out;
      strm.total_in += _in;
      strm.total_out += _out;
      state.total += _out;
      if (state.wrap & 4 && _out) {
        strm.adler = state.check = /*UPDATE_CHECK(state.check, strm.next_out - _out, _out);*/
        state.flags ? crc32(state.check, output, _out, strm.next_out - _out) : adler32(state.check, output, _out, strm.next_out - _out);
      }
      strm.data_type = state.bits + (state.last ? 64 : 0) + (state.mode === TYPE ? 128 : 0) + (state.mode === LEN_ || state.mode === COPY_ ? 256 : 0);
      if ((_in === 0 && _out === 0 || flush === Z_FINISH) && ret === Z_OK) {
        ret = Z_BUF_ERROR;
      }
      return ret;
    };
    var inflateEnd = (strm) => {
      if (inflateStateCheck(strm)) {
        return Z_STREAM_ERROR;
      }
      let state = strm.state;
      if (state.window) {
        state.window = null;
      }
      strm.state = null;
      return Z_OK;
    };
    var inflateGetHeader = (strm, head) => {
      if (inflateStateCheck(strm)) {
        return Z_STREAM_ERROR;
      }
      const state = strm.state;
      if ((state.wrap & 2) === 0) {
        return Z_STREAM_ERROR;
      }
      state.head = head;
      head.done = false;
      return Z_OK;
    };
    var inflateSetDictionary = (strm, dictionary) => {
      const dictLength = dictionary.length;
      let state;
      let dictid;
      let ret;
      if (inflateStateCheck(strm)) {
        return Z_STREAM_ERROR;
      }
      state = strm.state;
      if (state.wrap !== 0 && state.mode !== DICT) {
        return Z_STREAM_ERROR;
      }
      if (state.mode === DICT) {
        dictid = 1;
        dictid = adler32(dictid, dictionary, dictLength, 0);
        if (dictid !== state.check) {
          return Z_DATA_ERROR;
        }
      }
      ret = updatewindow(strm, dictionary, dictLength, dictLength);
      if (ret) {
        state.mode = MEM;
        return Z_MEM_ERROR;
      }
      state.havedict = 1;
      return Z_OK;
    };
    module2.exports.inflateReset = inflateReset;
    module2.exports.inflateReset2 = inflateReset2;
    module2.exports.inflateResetKeep = inflateResetKeep;
    module2.exports.inflateInit = inflateInit;
    module2.exports.inflateInit2 = inflateInit2;
    module2.exports.inflate = inflate;
    module2.exports.inflateEnd = inflateEnd;
    module2.exports.inflateGetHeader = inflateGetHeader;
    module2.exports.inflateSetDictionary = inflateSetDictionary;
    module2.exports.inflateInfo = "pako inflate (from Nodeca project)";
  }
});

// ../../node_modules/pako/lib/zlib/gzheader.js
var require_gzheader = __commonJS({
  "../../node_modules/pako/lib/zlib/gzheader.js"(exports, module2) {
    "use strict";
    function GZheader() {
      this.text = 0;
      this.time = 0;
      this.xflags = 0;
      this.os = 0;
      this.extra = null;
      this.extra_len = 0;
      this.name = "";
      this.comment = "";
      this.hcrc = 0;
      this.done = false;
    }
    module2.exports = GZheader;
  }
});

// ../../node_modules/pako/lib/inflate.js
var require_inflate2 = __commonJS({
  "../../node_modules/pako/lib/inflate.js"(exports, module2) {
    "use strict";
    var zlib_inflate = require_inflate();
    var utils = require_common();
    var strings = require_strings();
    var msg = require_messages();
    var ZStream = require_zstream();
    var GZheader = require_gzheader();
    var toString = Object.prototype.toString;
    var {
      Z_NO_FLUSH,
      Z_FINISH,
      Z_OK,
      Z_STREAM_END,
      Z_NEED_DICT,
      Z_STREAM_ERROR,
      Z_DATA_ERROR,
      Z_MEM_ERROR
    } = require_constants();
    function Inflate(options) {
      this.options = utils.assign({
        chunkSize: 1024 * 64,
        windowBits: 15,
        to: ""
      }, options || {});
      const opt = this.options;
      if (opt.raw && opt.windowBits >= 0 && opt.windowBits < 16) {
        opt.windowBits = -opt.windowBits;
        if (opt.windowBits === 0) {
          opt.windowBits = -15;
        }
      }
      if (opt.windowBits >= 0 && opt.windowBits < 16 && !(options && options.windowBits)) {
        opt.windowBits += 32;
      }
      if (opt.windowBits > 15 && opt.windowBits < 48) {
        if ((opt.windowBits & 15) === 0) {
          opt.windowBits |= 15;
        }
      }
      this.err = 0;
      this.msg = "";
      this.ended = false;
      this.chunks = [];
      this.strm = new ZStream();
      this.strm.avail_out = 0;
      let status = zlib_inflate.inflateInit2(
        this.strm,
        opt.windowBits
      );
      if (status !== Z_OK) {
        throw new Error(msg[status]);
      }
      this.header = new GZheader();
      zlib_inflate.inflateGetHeader(this.strm, this.header);
      if (opt.dictionary) {
        if (typeof opt.dictionary === "string") {
          opt.dictionary = strings.string2buf(opt.dictionary);
        } else if (toString.call(opt.dictionary) === "[object ArrayBuffer]") {
          opt.dictionary = new Uint8Array(opt.dictionary);
        }
        if (opt.raw) {
          status = zlib_inflate.inflateSetDictionary(this.strm, opt.dictionary);
          if (status !== Z_OK) {
            throw new Error(msg[status]);
          }
        }
      }
    }
    Inflate.prototype.push = function(data, flush_mode) {
      const strm = this.strm;
      const chunkSize = this.options.chunkSize;
      const dictionary = this.options.dictionary;
      let status, _flush_mode, last_avail_out;
      if (this.ended)
        return false;
      if (flush_mode === ~~flush_mode)
        _flush_mode = flush_mode;
      else
        _flush_mode = flush_mode === true ? Z_FINISH : Z_NO_FLUSH;
      if (toString.call(data) === "[object ArrayBuffer]") {
        strm.input = new Uint8Array(data);
      } else {
        strm.input = data;
      }
      strm.next_in = 0;
      strm.avail_in = strm.input.length;
      for (; ; ) {
        if (strm.avail_out === 0) {
          strm.output = new Uint8Array(chunkSize);
          strm.next_out = 0;
          strm.avail_out = chunkSize;
        }
        status = zlib_inflate.inflate(strm, _flush_mode);
        if (status === Z_NEED_DICT && dictionary) {
          status = zlib_inflate.inflateSetDictionary(strm, dictionary);
          if (status === Z_OK) {
            status = zlib_inflate.inflate(strm, _flush_mode);
          } else if (status === Z_DATA_ERROR) {
            status = Z_NEED_DICT;
          }
        }
        while (strm.avail_in > 0 && status === Z_STREAM_END && strm.state.wrap > 0 && data[strm.next_in] !== 0) {
          zlib_inflate.inflateReset(strm);
          status = zlib_inflate.inflate(strm, _flush_mode);
        }
        switch (status) {
          case Z_STREAM_ERROR:
          case Z_DATA_ERROR:
          case Z_NEED_DICT:
          case Z_MEM_ERROR:
            this.onEnd(status);
            this.ended = true;
            return false;
        }
        last_avail_out = strm.avail_out;
        if (strm.next_out) {
          if (strm.avail_out === 0 || status === Z_STREAM_END) {
            if (this.options.to === "string") {
              let next_out_utf8 = strings.utf8border(strm.output, strm.next_out);
              let tail = strm.next_out - next_out_utf8;
              let utf8str = strings.buf2string(strm.output, next_out_utf8);
              strm.next_out = tail;
              strm.avail_out = chunkSize - tail;
              if (tail)
                strm.output.set(strm.output.subarray(next_out_utf8, next_out_utf8 + tail), 0);
              this.onData(utf8str);
            } else {
              this.onData(strm.output.length === strm.next_out ? strm.output : strm.output.subarray(0, strm.next_out));
            }
          }
        }
        if (status === Z_OK && last_avail_out === 0)
          continue;
        if (status === Z_STREAM_END) {
          status = zlib_inflate.inflateEnd(this.strm);
          this.onEnd(status);
          this.ended = true;
          return true;
        }
        if (strm.avail_in === 0)
          break;
      }
      return true;
    };
    Inflate.prototype.onData = function(chunk) {
      this.chunks.push(chunk);
    };
    Inflate.prototype.onEnd = function(status) {
      if (status === Z_OK) {
        if (this.options.to === "string") {
          this.result = this.chunks.join("");
        } else {
          this.result = utils.flattenChunks(this.chunks);
        }
      }
      this.chunks = [];
      this.err = status;
      this.msg = this.strm.msg;
    };
    function inflate(input, options) {
      const inflator = new Inflate(options);
      inflator.push(input);
      if (inflator.err)
        throw inflator.msg || msg[inflator.err];
      return inflator.result;
    }
    function inflateRaw(input, options) {
      options = options || {};
      options.raw = true;
      return inflate(input, options);
    }
    module2.exports.Inflate = Inflate;
    module2.exports.inflate = inflate;
    module2.exports.inflateRaw = inflateRaw;
    module2.exports.ungzip = inflate;
    module2.exports.constants = require_constants();
  }
});

// ../../node_modules/pako/index.js
var require_pako = __commonJS({
  "../../node_modules/pako/index.js"(exports, module2) {
    "use strict";
    var { Deflate, deflate, deflateRaw, gzip } = require_deflate2();
    var { Inflate, inflate, inflateRaw, ungzip } = require_inflate2();
    var constants = require_constants();
    module2.exports.Deflate = Deflate;
    module2.exports.deflate = deflate;
    module2.exports.deflateRaw = deflateRaw;
    module2.exports.gzip = gzip;
    module2.exports.Inflate = Inflate;
    module2.exports.inflate = inflate;
    module2.exports.inflateRaw = inflateRaw;
    module2.exports.ungzip = ungzip;
    module2.exports.constants = constants;
  }
});

// ../../node_modules/qr-image/lib/encode.js
var require_encode = __commonJS({
  "../../node_modules/qr-image/lib/encode.js"(exports, module2) {
    "use strict";
    function pushBits(arr, n2, value) {
      for (var bit = 1 << n2 - 1; bit; bit = bit >>> 1) {
        arr.push(bit & value ? 1 : 0);
      }
    }
    function encode_8bit(data) {
      var len = data.length;
      var bits = [];
      for (var i2 = 0; i2 < len; i2++) {
        pushBits(bits, 8, data[i2]);
      }
      var res = {};
      var d = [0, 1, 0, 0];
      pushBits(d, 16, len);
      res.data10 = res.data27 = d.concat(bits);
      if (len < 256) {
        var d = [0, 1, 0, 0];
        pushBits(d, 8, len);
        res.data1 = d.concat(bits);
      }
      return res;
    }
    var ALPHANUM = function(s2) {
      var res = {};
      for (var i2 = 0; i2 < s2.length; i2++) {
        res[s2[i2]] = i2;
      }
      return res;
    }("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:");
    function encode_alphanum(str) {
      var len = str.length;
      var bits = [];
      for (var i2 = 0; i2 < len; i2 += 2) {
        var b2 = 6;
        var n2 = ALPHANUM[str[i2]];
        if (str[i2 + 1]) {
          b2 = 11;
          n2 = n2 * 45 + ALPHANUM[str[i2 + 1]];
        }
        pushBits(bits, b2, n2);
      }
      var res = {};
      var d = [0, 0, 1, 0];
      pushBits(d, 13, len);
      res.data27 = d.concat(bits);
      if (len < 2048) {
        var d = [0, 0, 1, 0];
        pushBits(d, 11, len);
        res.data10 = d.concat(bits);
      }
      if (len < 512) {
        var d = [0, 0, 1, 0];
        pushBits(d, 9, len);
        res.data1 = d.concat(bits);
      }
      return res;
    }
    function encode_numeric(str) {
      var len = str.length;
      var bits = [];
      for (var i2 = 0; i2 < len; i2 += 3) {
        var s2 = str.substr(i2, 3);
        var b2 = Math.ceil(s2.length * 10 / 3);
        pushBits(bits, b2, parseInt(s2, 10));
      }
      var res = {};
      var d = [0, 0, 0, 1];
      pushBits(d, 14, len);
      res.data27 = d.concat(bits);
      if (len < 4096) {
        var d = [0, 0, 0, 1];
        pushBits(d, 12, len);
        res.data10 = d.concat(bits);
      }
      if (len < 1024) {
        var d = [0, 0, 0, 1];
        pushBits(d, 10, len);
        res.data1 = d.concat(bits);
      }
      return res;
    }
    function encode_url(str) {
      var slash = str.indexOf("/", 8) + 1 || str.length;
      var res = encode(str.slice(0, slash).toUpperCase(), false);
      if (slash >= str.length) {
        return res;
      }
      var path_res = encode(str.slice(slash), false);
      res.data27 = res.data27.concat(path_res.data27);
      if (res.data10 && path_res.data10) {
        res.data10 = res.data10.concat(path_res.data10);
      }
      if (res.data1 && path_res.data1) {
        res.data1 = res.data1.concat(path_res.data1);
      }
      return res;
    }
    function encode(data, parse_url) {
      var str;
      var t2 = typeof data;
      if (t2 == "string" || t2 == "number") {
        str = "" + data;
        data = new Buffer(str);
      } else if (Buffer.isBuffer(data)) {
        str = data.toString();
      } else if (Array.isArray(data)) {
        data = new Buffer(data);
        str = data.toString();
      } else {
        throw new Error("Bad data");
      }
      if (/^[0-9]+$/.test(str)) {
        if (data.length > 7089) {
          throw new Error("Too much data");
        }
        return encode_numeric(str);
      }
      if (/^[0-9A-Z \$%\*\+\.\/\:\-]+$/.test(str)) {
        if (data.length > 4296) {
          throw new Error("Too much data");
        }
        return encode_alphanum(str);
      }
      if (parse_url && /^https?:/i.test(str)) {
        return encode_url(str);
      }
      if (data.length > 2953) {
        throw new Error("Too much data");
      }
      return encode_8bit(data);
    }
    module2.exports = encode;
  }
});

// ../../node_modules/qr-image/lib/errorcode.js
var require_errorcode = __commonJS({
  "../../node_modules/qr-image/lib/errorcode.js"(exports, module2) {
    "use strict";
    var GF256_BASE = 285;
    var EXP_TABLE = [1];
    var LOG_TABLE = [];
    for (i2 = 1; i2 < 256; i2++) {
      n2 = EXP_TABLE[i2 - 1] << 1;
      if (n2 > 255)
        n2 = n2 ^ GF256_BASE;
      EXP_TABLE[i2] = n2;
    }
    var n2;
    var i2;
    for (i2 = 0; i2 < 255; i2++) {
      LOG_TABLE[EXP_TABLE[i2]] = i2;
    }
    var i2;
    function exp(k2) {
      while (k2 < 0)
        k2 += 255;
      while (k2 > 255)
        k2 -= 255;
      return EXP_TABLE[k2];
    }
    function log(k2) {
      if (k2 < 1 || k2 > 255) {
        throw Error("Bad log(" + k2 + ")");
      }
      return LOG_TABLE[k2];
    }
    var POLYNOMIALS = [
      [0],
      // a^0 x^0
      [0, 0],
      // a^0 x^1 + a^0 x^0
      [0, 25, 1]
      // a^0 x^2 + a^25 x^1 + a^1 x^0
      // and so on...
    ];
    function generatorPolynomial(num) {
      if (POLYNOMIALS[num]) {
        return POLYNOMIALS[num];
      }
      var prev = generatorPolynomial(num - 1);
      var res = [];
      res[0] = prev[0];
      for (var i3 = 1; i3 <= num; i3++) {
        res[i3] = log(exp(prev[i3]) ^ exp(prev[i3 - 1] + num - 1));
      }
      POLYNOMIALS[num] = res;
      return res;
    }
    module2.exports = function calculate_ec(msg, ec_len) {
      msg = [].slice.call(msg);
      var poly = generatorPolynomial(ec_len);
      for (var i3 = 0; i3 < ec_len; i3++)
        msg.push(0);
      while (msg.length > ec_len) {
        if (!msg[0]) {
          msg.shift();
          continue;
        }
        var log_k = log(msg[0]);
        for (var i3 = 0; i3 <= ec_len; i3++) {
          msg[i3] = msg[i3] ^ exp(poly[i3] + log_k);
        }
        msg.shift();
      }
      return new Buffer(msg);
    };
  }
});

// ../../node_modules/qr-image/lib/matrix.js
var require_matrix = __commonJS({
  "../../node_modules/qr-image/lib/matrix.js"(exports, module2) {
    "use strict";
    function init2(version) {
      var N2 = version * 4 + 17;
      var matrix = [];
      var zeros = new Buffer(N2);
      zeros.fill(0);
      zeros = [].slice.call(zeros);
      for (var i2 = 0; i2 < N2; i2++) {
        matrix[i2] = zeros.slice();
      }
      return matrix;
    }
    function fillFinders(matrix) {
      var N2 = matrix.length;
      for (var i2 = -3; i2 <= 3; i2++) {
        for (var j2 = -3; j2 <= 3; j2++) {
          var max = Math.max(i2, j2);
          var min = Math.min(i2, j2);
          var pixel = max == 2 && min >= -2 || min == -2 && max <= 2 ? 128 : 129;
          matrix[3 + i2][3 + j2] = pixel;
          matrix[3 + i2][N2 - 4 + j2] = pixel;
          matrix[N2 - 4 + i2][3 + j2] = pixel;
        }
      }
      for (var i2 = 0; i2 < 8; i2++) {
        matrix[7][i2] = matrix[i2][7] = matrix[7][N2 - i2 - 1] = matrix[i2][N2 - 8] = matrix[N2 - 8][i2] = matrix[N2 - 1 - i2][7] = 128;
      }
    }
    function fillAlignAndTiming(matrix) {
      var N2 = matrix.length;
      if (N2 > 21) {
        var len = N2 - 13;
        var delta = Math.round(len / Math.ceil(len / 28));
        if (delta % 2)
          delta++;
        var res = [];
        for (var p = len + 6; p > 10; p -= delta) {
          res.unshift(p);
        }
        res.unshift(6);
        for (var i2 = 0; i2 < res.length; i2++) {
          for (var j2 = 0; j2 < res.length; j2++) {
            var x2 = res[i2], y2 = res[j2];
            if (matrix[x2][y2])
              continue;
            for (var r2 = -2; r2 <= 2; r2++) {
              for (var c2 = -2; c2 <= 2; c2++) {
                var max = Math.max(r2, c2);
                var min = Math.min(r2, c2);
                var pixel = max == 1 && min >= -1 || min == -1 && max <= 1 ? 128 : 129;
                matrix[x2 + r2][y2 + c2] = pixel;
              }
            }
          }
        }
      }
      for (var i2 = 8; i2 < N2 - 8; i2++) {
        matrix[6][i2] = matrix[i2][6] = i2 % 2 ? 128 : 129;
      }
    }
    function fillStub(matrix) {
      var N2 = matrix.length;
      for (var i2 = 0; i2 < 8; i2++) {
        if (i2 != 6) {
          matrix[8][i2] = matrix[i2][8] = 128;
        }
        matrix[8][N2 - 1 - i2] = 128;
        matrix[N2 - 1 - i2][8] = 128;
      }
      matrix[8][8] = 128;
      matrix[N2 - 8][8] = 129;
      if (N2 < 45)
        return;
      for (var i2 = N2 - 11; i2 < N2 - 8; i2++) {
        for (var j2 = 0; j2 < 6; j2++) {
          matrix[i2][j2] = matrix[j2][i2] = 128;
        }
      }
    }
    var fillReserved = function() {
      var FORMATS = Array(32);
      var VERSIONS = Array(40);
      var gf15 = 1335;
      var gf18 = 7973;
      var formats_mask = 21522;
      for (var format = 0; format < 32; format++) {
        var res = format << 10;
        for (var i2 = 5; i2 > 0; i2--) {
          if (res >>> 9 + i2) {
            res = res ^ gf15 << i2 - 1;
          }
        }
        FORMATS[format] = (res | format << 10) ^ formats_mask;
      }
      for (var version = 7; version <= 40; version++) {
        var res = version << 12;
        for (var i2 = 6; i2 > 0; i2--) {
          if (res >>> 11 + i2) {
            res = res ^ gf18 << i2 - 1;
          }
        }
        VERSIONS[version] = res | version << 12;
      }
      var EC_LEVELS = { L: 1, M: 0, Q: 3, H: 2 };
      return function fillReserved2(matrix, ec_level, mask) {
        var N2 = matrix.length;
        var format2 = FORMATS[EC_LEVELS[ec_level] << 3 | mask];
        function F2(k2) {
          return format2 >> k2 & 1 ? 129 : 128;
        }
        ;
        for (var i3 = 0; i3 < 8; i3++) {
          matrix[8][N2 - 1 - i3] = F2(i3);
          if (i3 < 6)
            matrix[i3][8] = F2(i3);
        }
        for (var i3 = 8; i3 < 15; i3++) {
          matrix[N2 - 15 + i3][8] = F2(i3);
          if (i3 > 8)
            matrix[8][14 - i3] = F2(i3);
        }
        matrix[7][8] = F2(6);
        matrix[8][8] = F2(7);
        matrix[8][7] = F2(8);
        var version2 = VERSIONS[(N2 - 17) / 4];
        if (!version2)
          return;
        function V2(k2) {
          return version2 >> k2 & 1 ? 129 : 128;
        }
        ;
        for (var i3 = 0; i3 < 6; i3++) {
          for (var j2 = 0; j2 < 3; j2++) {
            matrix[N2 - 11 + j2][i3] = matrix[i3][N2 - 11 + j2] = V2(i3 * 3 + j2);
          }
        }
      };
    }();
    var fillData = function() {
      var MASK_FUNCTIONS = [
        function(i2, j2) {
          return (i2 + j2) % 2 == 0;
        },
        function(i2, j2) {
          return i2 % 2 == 0;
        },
        function(i2, j2) {
          return j2 % 3 == 0;
        },
        function(i2, j2) {
          return (i2 + j2) % 3 == 0;
        },
        function(i2, j2) {
          return (Math.floor(i2 / 2) + Math.floor(j2 / 3)) % 2 == 0;
        },
        function(i2, j2) {
          return i2 * j2 % 2 + i2 * j2 % 3 == 0;
        },
        function(i2, j2) {
          return (i2 * j2 % 2 + i2 * j2 % 3) % 2 == 0;
        },
        function(i2, j2) {
          return (i2 * j2 % 3 + (i2 + j2) % 2) % 2 == 0;
        }
      ];
      return function fillData2(matrix, data, mask) {
        var N2 = matrix.length;
        var row, col, dir = -1;
        row = col = N2 - 1;
        var mask_fn = MASK_FUNCTIONS[mask];
        var len = data.blocks[data.blocks.length - 1].length;
        for (var i2 = 0; i2 < len; i2++) {
          for (var b2 = 0; b2 < data.blocks.length; b2++) {
            if (data.blocks[b2].length <= i2)
              continue;
            put(data.blocks[b2][i2]);
          }
        }
        len = data.ec_len;
        for (var i2 = 0; i2 < len; i2++) {
          for (var b2 = 0; b2 < data.ec.length; b2++) {
            put(data.ec[b2][i2]);
          }
        }
        if (col > -1) {
          do {
            matrix[row][col] = mask_fn(row, col) ? 1 : 0;
          } while (next());
        }
        function put(byte) {
          for (var mask2 = 128; mask2; mask2 = mask2 >> 1) {
            var pixel = !!(mask2 & byte);
            if (mask_fn(row, col))
              pixel = !pixel;
            matrix[row][col] = pixel ? 1 : 0;
            next();
          }
        }
        function next() {
          do {
            if (col % 2 ^ col < 6) {
              if (dir < 0 && row == 0 || dir > 0 && row == N2 - 1) {
                col--;
                dir = -dir;
              } else {
                col++;
                row += dir;
              }
            } else {
              col--;
            }
            if (col == 6) {
              col--;
            }
            if (col < 0) {
              return false;
            }
          } while (matrix[row][col] & 240);
          return true;
        }
      };
    }();
    function calculatePenalty(matrix) {
      var N2 = matrix.length;
      var penalty = 0;
      for (var i2 = 0; i2 < N2; i2++) {
        var pixel = matrix[i2][0] & 1;
        var len = 1;
        for (var j2 = 1; j2 < N2; j2++) {
          var p = matrix[i2][j2] & 1;
          if (p == pixel) {
            len++;
            continue;
          }
          if (len >= 5) {
            penalty += len - 2;
          }
          pixel = p;
          len = 1;
        }
        if (len >= 5) {
          penalty += len - 2;
        }
      }
      for (var j2 = 0; j2 < N2; j2++) {
        var pixel = matrix[0][j2] & 1;
        var len = 1;
        for (var i2 = 1; i2 < N2; i2++) {
          var p = matrix[i2][j2] & 1;
          if (p == pixel) {
            len++;
            continue;
          }
          if (len >= 5) {
            penalty += len - 2;
          }
          pixel = p;
          len = 1;
        }
        if (len >= 5) {
          penalty += len - 2;
        }
      }
      for (var i2 = 0; i2 < N2 - 1; i2++) {
        for (var j2 = 0; j2 < N2 - 1; j2++) {
          var s2 = matrix[i2][j2] + matrix[i2][j2 + 1] + matrix[i2 + 1][j2] + matrix[i2 + 1][j2 + 1] & 7;
          if (s2 == 0 || s2 == 4) {
            penalty += 3;
          }
        }
      }
      function I2(k2) {
        return matrix[i2][j2 + k2] & 1;
      }
      ;
      function J2(k2) {
        return matrix[i2 + k2][j2] & 1;
      }
      ;
      for (var i2 = 0; i2 < N2; i2++) {
        for (var j2 = 0; j2 < N2; j2++) {
          if (j2 < N2 - 6 && I2(0) && !I2(1) && I2(2) && I2(3) && I2(4) && !I2(5) && I2(6)) {
            if (j2 >= 4 && !(I2(-4) || I2(-3) || I2(-2) || I2(-1))) {
              penalty += 40;
            }
            if (j2 < N2 - 10 && !(I2(7) || I2(8) || I2(9) || I2(10))) {
              penalty += 40;
            }
          }
          if (i2 < N2 - 6 && J2(0) && !J2(1) && J2(2) && J2(3) && J2(4) && !J2(5) && J2(6)) {
            if (i2 >= 4 && !(J2(-4) || J2(-3) || J2(-2) || J2(-1))) {
              penalty += 40;
            }
            if (i2 < N2 - 10 && !(J2(7) || J2(8) || J2(9) || J2(10))) {
              penalty += 40;
            }
          }
        }
      }
      var numDark = 0;
      for (var i2 = 0; i2 < N2; i2++) {
        for (var j2 = 0; j2 < N2; j2++) {
          if (matrix[i2][j2] & 1)
            numDark++;
        }
      }
      penalty += 10 * Math.floor(Math.abs(10 - 20 * numDark / (N2 * N2)));
      return penalty;
    }
    function getMatrix(data) {
      var matrix = init2(data.version);
      fillFinders(matrix);
      fillAlignAndTiming(matrix);
      fillStub(matrix);
      var penalty = Infinity;
      var bestMask = 0;
      for (var mask = 0; mask < 8; mask++) {
        fillData(matrix, data, mask);
        fillReserved(matrix, data.ec_level, mask);
        var p = calculatePenalty(matrix);
        if (p < penalty) {
          penalty = p;
          bestMask = mask;
        }
      }
      fillData(matrix, data, bestMask);
      fillReserved(matrix, data.ec_level, bestMask);
      return matrix.map(function(row) {
        return row.map(function(cell) {
          return cell & 1;
        });
      });
    }
    module2.exports = {
      getMatrix,
      init: init2,
      fillFinders,
      fillAlignAndTiming,
      fillStub,
      fillReserved,
      fillData,
      calculatePenalty
    };
  }
});

// ../../node_modules/qr-image/lib/qr-base.js
var require_qr_base = __commonJS({
  "../../node_modules/qr-image/lib/qr-base.js"(exports, module2) {
    "use strict";
    var encode = require_encode();
    var calculateEC = require_errorcode();
    var matrix = require_matrix();
    function _deepCopy(obj) {
      return JSON.parse(JSON.stringify(obj));
    }
    var EC_LEVELS = ["L", "M", "Q", "H"];
    var versions = [
      [],
      // there is no version 0
      // total number of codewords, (number of ec codewords, number of blocks) * ( L, M, Q, H )
      [26, 7, 1, 10, 1, 13, 1, 17, 1],
      [44, 10, 1, 16, 1, 22, 1, 28, 1],
      [70, 15, 1, 26, 1, 36, 2, 44, 2],
      [100, 20, 1, 36, 2, 52, 2, 64, 4],
      [134, 26, 1, 48, 2, 72, 4, 88, 4],
      // 5
      [172, 36, 2, 64, 4, 96, 4, 112, 4],
      [196, 40, 2, 72, 4, 108, 6, 130, 5],
      [242, 48, 2, 88, 4, 132, 6, 156, 6],
      [292, 60, 2, 110, 5, 160, 8, 192, 8],
      [346, 72, 4, 130, 5, 192, 8, 224, 8],
      // 10
      [404, 80, 4, 150, 5, 224, 8, 264, 11],
      [466, 96, 4, 176, 8, 260, 10, 308, 11],
      [532, 104, 4, 198, 9, 288, 12, 352, 16],
      [581, 120, 4, 216, 9, 320, 16, 384, 16],
      [655, 132, 6, 240, 10, 360, 12, 432, 18],
      // 15
      [733, 144, 6, 280, 10, 408, 17, 480, 16],
      [815, 168, 6, 308, 11, 448, 16, 532, 19],
      [901, 180, 6, 338, 13, 504, 18, 588, 21],
      [991, 196, 7, 364, 14, 546, 21, 650, 25],
      [1085, 224, 8, 416, 16, 600, 20, 700, 25],
      // 20
      [1156, 224, 8, 442, 17, 644, 23, 750, 25],
      [1258, 252, 9, 476, 17, 690, 23, 816, 34],
      [1364, 270, 9, 504, 18, 750, 25, 900, 30],
      [1474, 300, 10, 560, 20, 810, 27, 960, 32],
      [1588, 312, 12, 588, 21, 870, 29, 1050, 35],
      // 25
      [1706, 336, 12, 644, 23, 952, 34, 1110, 37],
      [1828, 360, 12, 700, 25, 1020, 34, 1200, 40],
      [1921, 390, 13, 728, 26, 1050, 35, 1260, 42],
      [2051, 420, 14, 784, 28, 1140, 38, 1350, 45],
      [2185, 450, 15, 812, 29, 1200, 40, 1440, 48],
      // 30
      [2323, 480, 16, 868, 31, 1290, 43, 1530, 51],
      [2465, 510, 17, 924, 33, 1350, 45, 1620, 54],
      [2611, 540, 18, 980, 35, 1440, 48, 1710, 57],
      [2761, 570, 19, 1036, 37, 1530, 51, 1800, 60],
      [2876, 570, 19, 1064, 38, 1590, 53, 1890, 63],
      // 35
      [3034, 600, 20, 1120, 40, 1680, 56, 1980, 66],
      [3196, 630, 21, 1204, 43, 1770, 59, 2100, 70],
      [3362, 660, 22, 1260, 45, 1860, 62, 2220, 74],
      [3532, 720, 24, 1316, 47, 1950, 65, 2310, 77],
      [3706, 750, 25, 1372, 49, 2040, 68, 2430, 81]
      // 40
    ];
    versions = versions.map(function(v2, index) {
      if (!index)
        return {};
      var res = {};
      for (var i2 = 1; i2 < 8; i2 += 2) {
        var length = v2[0] - v2[i2];
        var num_template = v2[i2 + 1];
        var ec_level = EC_LEVELS[i2 / 2 | 0];
        var level = {
          version: index,
          ec_level,
          data_len: length,
          ec_len: v2[i2] / num_template,
          blocks: [],
          ec: []
        };
        for (var k2 = num_template, n2 = length; k2 > 0; k2--) {
          var block = n2 / k2 | 0;
          level.blocks.push(block);
          n2 -= block;
        }
        res[ec_level] = level;
      }
      return res;
    });
    function getTemplate(message, ec_level) {
      var i2 = 1;
      var len;
      if (message.data1) {
        len = Math.ceil(message.data1.length / 8);
      } else {
        i2 = 10;
      }
      for (; i2 < 10; i2++) {
        var version = versions[i2][ec_level];
        if (version.data_len >= len) {
          return _deepCopy(version);
        }
      }
      if (message.data10) {
        len = Math.ceil(message.data10.length / 8);
      } else {
        i2 = 27;
      }
      for (; i2 < 27; i2++) {
        var version = versions[i2][ec_level];
        if (version.data_len >= len) {
          return _deepCopy(version);
        }
      }
      len = Math.ceil(message.data27.length / 8);
      for (; i2 < 41; i2++) {
        var version = versions[i2][ec_level];
        if (version.data_len >= len) {
          return _deepCopy(version);
        }
      }
      throw new Error("Too much data");
    }
    function fillTemplate(message, template) {
      var blocks = new Buffer(template.data_len);
      blocks.fill(0);
      if (template.version < 10) {
        message = message.data1;
      } else if (template.version < 27) {
        message = message.data10;
      } else {
        message = message.data27;
      }
      var len = message.length;
      for (var i2 = 0; i2 < len; i2 += 8) {
        var b2 = 0;
        for (var j2 = 0; j2 < 8; j2++) {
          b2 = b2 << 1 | (message[i2 + j2] ? 1 : 0);
        }
        blocks[i2 / 8] = b2;
      }
      var pad = 236;
      for (var i2 = Math.ceil((len + 4) / 8); i2 < blocks.length; i2++) {
        blocks[i2] = pad;
        pad = pad == 236 ? 17 : 236;
      }
      var offset = 0;
      template.blocks = template.blocks.map(function(n2) {
        var b3 = blocks.slice(offset, offset + n2);
        offset += n2;
        template.ec.push(calculateEC(b3, template.ec_len));
        return b3;
      });
      return template;
    }
    function QR(text, ec_level, parse_url) {
      ec_level = EC_LEVELS.indexOf(ec_level) > -1 ? ec_level : "M";
      var message = encode(text, parse_url);
      var data = fillTemplate(message, getTemplate(message, ec_level));
      return matrix.getMatrix(data);
    }
    module2.exports = {
      QR,
      getTemplate,
      fillTemplate
    };
  }
});

// ../../node_modules/qr-image/lib/crc32buffer.js
var require_crc32buffer = __commonJS({
  "../../node_modules/qr-image/lib/crc32buffer.js"(exports, module2) {
    "use strict";
    var crc_table = [];
    for (n2 = 0; n2 < 256; n2++) {
      c2 = crc_table[n2] = new Buffer(4);
      c2.writeUInt32BE(n2, 0);
      for (k2 = 0; k2 < 8; k2++) {
        b0 = c2[0] & 1;
        b1 = c2[1] & 1;
        b2 = c2[2] & 1;
        b3 = c2[3] & 1;
        c2[0] = c2[0] >> 1 ^ (b3 ? 237 : 0);
        c2[1] = c2[1] >> 1 ^ (b3 ? 184 : 0) ^ (b0 ? 128 : 0);
        c2[2] = c2[2] >> 1 ^ (b3 ? 131 : 0) ^ (b1 ? 128 : 0);
        c2[3] = c2[3] >> 1 ^ (b3 ? 32 : 0) ^ (b2 ? 128 : 0);
      }
    }
    var c2;
    var b0;
    var b1;
    var b2;
    var b3;
    var k2;
    var n2;
    function update(c3, buf) {
      var l2 = buf.length;
      for (var n3 = 0; n3 < l2; n3++) {
        var e2 = crc_table[c3[3] ^ buf[n3]];
        c3[3] = e2[3] ^ c3[2];
        c3[2] = e2[2] ^ c3[1];
        c3[1] = e2[1] ^ c3[0];
        c3[0] = e2[0];
      }
    }
    function crc32() {
      var l2 = arguments.length;
      var c3 = new Buffer(4);
      c3.fill(255);
      for (var i2 = 0; i2 < l2; i2++) {
        update(c3, new Buffer(arguments[i2]));
      }
      c3[0] = c3[0] ^ 255;
      c3[1] = c3[1] ^ 255;
      c3[2] = c3[2] ^ 255;
      c3[3] = c3[3] ^ 255;
      return c3.readUInt32BE(0);
    }
    module2.exports = crc32;
  }
});

// ../../node_modules/qr-image/lib/crc32.js
var require_crc322 = __commonJS({
  "../../node_modules/qr-image/lib/crc32.js"(exports, module2) {
    "use strict";
    (function() {
      if (process.arch === "arm") {
        module2.exports = require_crc32buffer();
        return;
      }
      var crc_table = [];
      (function() {
        for (var n2 = 0; n2 < 256; n2++) {
          var c2 = n2;
          for (var k2 = 0; k2 < 8; k2++) {
            if (c2 & 1) {
              c2 = 3988292384 ^ c2 >>> 1;
            } else {
              c2 = c2 >>> 1;
            }
          }
          crc_table[n2] = c2 >>> 0;
        }
      })();
      function update(c2, buf) {
        var l2 = buf.length;
        for (var n2 = 0; n2 < l2; n2++) {
          c2 = crc_table[(c2 ^ buf[n2]) & 255] ^ c2 >>> 8;
        }
        return c2;
      }
      function crc32() {
        var l2 = arguments.length;
        var c2 = -1;
        for (var i2 = 0; i2 < l2; i2++) {
          c2 = update(c2, new Buffer(arguments[i2]));
        }
        c2 = (c2 ^ -1) >>> 0;
        return c2;
      }
      module2.exports = crc32;
    })();
  }
});

// ../../node_modules/qr-image/lib/png.js
var require_png = __commonJS({
  "../../node_modules/qr-image/lib/png.js"(exports, module2) {
    "use strict";
    var zlib = require("zlib");
    var crc32 = require_crc322();
    var PNG_HEAD = new Buffer([137, 80, 78, 71, 13, 10, 26, 10]);
    var PNG_IHDR = new Buffer([0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0]);
    var PNG_IDAT = new Buffer([0, 0, 0, 0, 73, 68, 65, 84]);
    var PNG_IEND = new Buffer([0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]);
    function png(bitmap2, stream) {
      stream.push(PNG_HEAD);
      var IHDR = Buffer.concat([PNG_IHDR]);
      IHDR.writeUInt32BE(bitmap2.size, 8);
      IHDR.writeUInt32BE(bitmap2.size, 12);
      IHDR.writeUInt32BE(crc32(IHDR.slice(4, -4)), 21);
      stream.push(IHDR);
      var IDAT = Buffer.concat([
        PNG_IDAT,
        zlib.deflateSync(bitmap2.data, { level: 9 }),
        new Buffer(4)
      ]);
      IDAT.writeUInt32BE(IDAT.length - 12, 0);
      IDAT.writeUInt32BE(crc32(IDAT.slice(4, -4)), IDAT.length - 4);
      stream.push(IDAT);
      stream.push(PNG_IEND);
      stream.push(null);
    }
    function bitmap(matrix, size, margin) {
      var N2 = matrix.length;
      var X2 = (N2 + 2 * margin) * size;
      var data = new Buffer((X2 + 1) * X2);
      data.fill(255);
      for (var i2 = 0; i2 < X2; i2++) {
        data[i2 * (X2 + 1)] = 0;
      }
      for (var i2 = 0; i2 < N2; i2++) {
        for (var j2 = 0; j2 < N2; j2++) {
          if (matrix[i2][j2]) {
            var offset = ((margin + i2) * (X2 + 1) + (margin + j2)) * size + 1;
            data.fill(0, offset, offset + size);
            for (var c2 = 1; c2 < size; c2++) {
              data.copy(data, offset + c2 * (X2 + 1), offset, offset + size);
            }
          }
        }
      }
      return {
        data,
        size: X2
      };
    }
    module2.exports = {
      bitmap,
      png
    };
  }
});

// ../../node_modules/qr-image/lib/vector.js
var require_vector = __commonJS({
  "../../node_modules/qr-image/lib/vector.js"(exports, module2) {
    "use strict";
    function matrix2path(matrix) {
      var N2 = matrix.length;
      var filled = [];
      for (var row = -1; row <= N2; row++) {
        filled[row] = [];
      }
      var path = [];
      for (var row = 0; row < N2; row++) {
        for (var col = 0; col < N2; col++) {
          if (filled[row][col])
            continue;
          filled[row][col] = 1;
          if (isDark(row, col)) {
            if (!isDark(row - 1, col)) {
              path.push(plot(row, col, "right"));
            }
          } else {
            if (isDark(row, col - 1)) {
              path.push(plot(row, col, "down"));
            }
          }
        }
      }
      return path;
      function isDark(row2, col2) {
        if (row2 < 0 || col2 < 0 || row2 >= N2 || col2 >= N2)
          return false;
        return !!matrix[row2][col2];
      }
      function plot(row0, col0, dir) {
        filled[row0][col0] = 1;
        var res = [];
        res.push(["M", col0, row0]);
        var row2 = row0;
        var col2 = col0;
        var len = 0;
        do {
          switch (dir) {
            case "right":
              filled[row2][col2] = 1;
              if (isDark(row2, col2)) {
                filled[row2 - 1][col2] = 1;
                if (isDark(row2 - 1, col2)) {
                  res.push(["h", len]);
                  len = 0;
                  dir = "up";
                } else {
                  len++;
                  col2++;
                }
              } else {
                res.push(["h", len]);
                len = 0;
                dir = "down";
              }
              break;
            case "left":
              filled[row2 - 1][col2 - 1] = 1;
              if (isDark(row2 - 1, col2 - 1)) {
                filled[row2][col2 - 1] = 1;
                if (isDark(row2, col2 - 1)) {
                  res.push(["h", -len]);
                  len = 0;
                  dir = "down";
                } else {
                  len++;
                  col2--;
                }
              } else {
                res.push(["h", -len]);
                len = 0;
                dir = "up";
              }
              break;
            case "down":
              filled[row2][col2 - 1] = 1;
              if (isDark(row2, col2 - 1)) {
                filled[row2][col2] = 1;
                if (isDark(row2, col2)) {
                  res.push(["v", len]);
                  len = 0;
                  dir = "right";
                } else {
                  len++;
                  row2++;
                }
              } else {
                res.push(["v", len]);
                len = 0;
                dir = "left";
              }
              break;
            case "up":
              filled[row2 - 1][col2] = 1;
              if (isDark(row2 - 1, col2)) {
                filled[row2 - 1][col2 - 1] = 1;
                if (isDark(row2 - 1, col2 - 1)) {
                  res.push(["v", -len]);
                  len = 0;
                  dir = "left";
                } else {
                  len++;
                  row2--;
                }
              } else {
                res.push(["v", -len]);
                len = 0;
                dir = "right";
              }
              break;
          }
        } while (row2 != row0 || col2 != col0);
        return res;
      }
    }
    function pushSVGPath(matrix, stream, margin) {
      matrix2path(matrix).forEach(function(subpath) {
        var res = "";
        for (var k2 = 0; k2 < subpath.length; k2++) {
          var item = subpath[k2];
          switch (item[0]) {
            case "M":
              res += "M" + (item[1] + margin) + " " + (item[2] + margin);
              break;
            default:
              res += item.join("");
          }
        }
        res += "z";
        stream.push(res);
      });
    }
    function SVG_object(matrix, margin) {
      var stream = [];
      pushSVGPath(matrix, stream, margin);
      var result = {
        size: matrix.length + 2 * margin,
        path: stream.filter(Boolean).join("")
      };
      return result;
    }
    function SVG(matrix, stream, margin, size) {
      var X2 = matrix.length + 2 * margin;
      stream.push('<svg xmlns="http://www.w3.org/2000/svg" ');
      if (size > 0) {
        var XY = X2 * size;
        stream.push('width="' + XY + '" height="' + XY + '" ');
      }
      stream.push('viewBox="0 0 ' + X2 + " " + X2 + '">');
      stream.push('<path d="');
      pushSVGPath(matrix, stream, margin);
      stream.push('"/></svg>');
      stream.push(null);
    }
    function EPS(matrix, stream, margin) {
      var N2 = matrix.length;
      var scale = 9;
      var X2 = (N2 + 2 * margin) * scale;
      stream.push([
        "%!PS-Adobe-3.0 EPSF-3.0",
        "%%BoundingBox: 0 0 " + X2 + " " + X2,
        "/h { 0 rlineto } bind def",
        "/v { 0 exch neg rlineto } bind def",
        "/M { neg " + (N2 + margin) + " add moveto } bind def",
        "/z { closepath } bind def",
        scale + " " + scale + " scale",
        ""
      ].join("\n"));
      matrix2path(matrix).forEach(function(subpath) {
        var res = "";
        for (var k2 = 0; k2 < subpath.length; k2++) {
          var item = subpath[k2];
          switch (item[0]) {
            case "M":
              res += item[1] + margin + " " + item[2] + " M ";
              break;
            default:
              res += item[1] + " " + item[0] + " ";
          }
        }
        res += "z\n";
        stream.push(res);
      });
      stream.push("fill\n%%EOF\n");
      stream.push(null);
    }
    function PDF(matrix, stream, margin) {
      var N2 = matrix.length;
      var scale = 9;
      var X2 = (N2 + 2 * margin) * scale;
      var data = [
        "%PDF-1.0\n\n",
        "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
        "2 0 obj << /Type /Pages /Count 1 /Kids [ 3 0 R ] >> endobj\n"
      ];
      data.push("3 0 obj << /Type /Page /Parent 2 0 R /Resources <<>> /Contents 4 0 R /MediaBox [ 0 0 " + X2 + " " + X2 + " ] >> endobj\n");
      var path = scale + " 0 0 " + scale + " 0 0 cm\n";
      path += matrix2path(matrix).map(function(subpath) {
        var res = "";
        var x2, y2;
        for (var k2 = 0; k2 < subpath.length; k2++) {
          var item = subpath[k2];
          switch (item[0]) {
            case "M":
              x2 = item[1] + margin;
              y2 = N2 - item[2] + margin;
              res += x2 + " " + y2 + " m ";
              break;
            case "h":
              x2 += item[1];
              res += x2 + " " + y2 + " l ";
              break;
            case "v":
              y2 -= item[1];
              res += x2 + " " + y2 + " l ";
              break;
          }
        }
        res += "h";
        return res;
      }).join("\n");
      path += "\nf\n";
      data.push("4 0 obj << /Length " + path.length + " >> stream\n" + path + "endstream\nendobj\n");
      var xref = "xref\n0 5\n0000000000 65535 f \n";
      for (var i2 = 1, l2 = data[0].length; i2 < 5; i2++) {
        xref += ("0000000000" + l2).substr(-10) + " 00000 n \n";
        l2 += data[i2].length;
      }
      data.push(
        xref,
        "trailer << /Root 1 0 R /Size 5 >>\n",
        "startxref\n" + l2 + "\n%%EOF\n"
      );
      stream.push(data.join(""));
      stream.push(null);
    }
    module2.exports = {
      svg: SVG,
      eps: EPS,
      pdf: PDF,
      svg_object: SVG_object
    };
  }
});

// ../../node_modules/qr-image/lib/qr.js
var require_qr = __commonJS({
  "../../node_modules/qr-image/lib/qr.js"(exports, module2) {
    "use strict";
    var Readable = require("stream").Readable;
    var QR = require_qr_base().QR;
    var png = require_png();
    var vector = require_vector();
    var fn_noop = function() {
    };
    var BITMAP_OPTIONS = {
      parse_url: false,
      ec_level: "M",
      size: 5,
      margin: 4,
      customize: null
    };
    var VECTOR_OPTIONS = {
      parse_url: false,
      ec_level: "M",
      margin: 1,
      size: 0
    };
    function get_options(options, force_type) {
      if (typeof options === "string") {
        options = { "ec_level": options };
      } else {
        options = options || {};
      }
      var _options = {
        type: String(force_type || options.type || "png").toLowerCase()
      };
      var defaults = _options.type == "png" ? BITMAP_OPTIONS : VECTOR_OPTIONS;
      for (var k2 in defaults) {
        _options[k2] = k2 in options ? options[k2] : defaults[k2];
      }
      return _options;
    }
    function qr_image(text, options) {
      options = get_options(options);
      var matrix = QR(text, options.ec_level, options.parse_url);
      var stream = new Readable();
      stream._read = fn_noop;
      switch (options.type) {
        case "svg":
        case "pdf":
        case "eps":
          process.nextTick(function() {
            vector[options.type](matrix, stream, options.margin, options.size);
          });
          break;
        case "svgpath":
          process.nextTick(function() {
            var obj = vector.svg_object(matrix, options.margin, options.size);
            stream.push(obj.path);
            stream.push(null);
          });
          break;
        case "png":
        default:
          process.nextTick(function() {
            var bitmap = png.bitmap(matrix, options.size, options.margin);
            if (options.customize) {
              options.customize(bitmap);
            }
            png.png(bitmap, stream);
          });
      }
      return stream;
    }
    function qr_image_sync(text, options) {
      options = get_options(options);
      var matrix = QR(text, options.ec_level, options.parse_url);
      var stream = [];
      var result;
      switch (options.type) {
        case "svg":
        case "pdf":
        case "eps":
          vector[options.type](matrix, stream, options.margin, options.size);
          result = stream.filter(Boolean).join("");
          break;
        case "png":
        default:
          var bitmap = png.bitmap(matrix, options.size, options.margin);
          if (options.customize) {
            options.customize(bitmap);
          }
          png.png(bitmap, stream);
          result = Buffer.concat(stream.filter(Boolean));
      }
      return result;
    }
    function svg_object(text, options) {
      options = get_options(options, "svg");
      var matrix = QR(text, options.ec_level);
      return vector.svg_object(matrix, options.margin);
    }
    module2.exports = {
      matrix: QR,
      image: qr_image,
      imageSync: qr_image_sync,
      svgObject: svg_object
    };
  }
});

// ../passport-ui/dist/index.js
var require_dist = __commonJS({
  "../passport-ui/dist/index.js"(exports, module2) {
    "use strict";
    var __create2 = Object.create;
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __getProtoOf2 = Object.getPrototypeOf;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __export2 = (target, all) => {
      for (var name in all)
        __defProp2(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key) && key !== except)
            __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toESM2 = (mod, isNodeMode, target) => (target = mod != null ? __create2(__getProtoOf2(mod)) : {}, __copyProps2(
      // If the importer is in node compatibility mode or this is not an ESM
      // file that has been converted to a CommonJS file using a Babel-
      // compatible transform (i.e. "__esModule" has not been set), then set
      // "default" to the CommonJS "module.exports" for node compatibility.
      isNodeMode || !mod || !mod.__esModule ? __defProp2(target, "default", { value: mod, enumerable: true }) : target,
      mod
    ));
    var __toCommonJS2 = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var __async2 = (__this, __arguments, generator) => {
      return new Promise((resolve, reject) => {
        var fulfilled = (value) => {
          try {
            step(generator.next(value));
          } catch (e2) {
            reject(e2);
          }
        };
        var rejected = (value) => {
          try {
            step(generator.throw(value));
          } catch (e2) {
            reject(e2);
          }
        };
        var step = (x2) => x2.done ? resolve(x2.value) : Promise.resolve(x2.value).then(fulfilled, rejected);
        step((generator = generator.apply(__this, __arguments)).next());
      });
    };
    var src_exports2 = {};
    __export2(src_exports2, {
      FieldLabel: () => FieldLabel2,
      HiddenText: () => HiddenText,
      HiddenTextContainer: () => HiddenTextContainer,
      QR: () => QR,
      QRDisplay: () => QRDisplay,
      QRDisplayWithRegenerateAndStorage: () => QRDisplayWithRegenerateAndStorage,
      Separator: () => Separator2,
      Spacer: () => Spacer2,
      TextContainer: () => TextContainer2,
      decodeQRPayload: () => decodeQRPayload,
      encodeQRPayload: () => encodeQRPayload
    });
    module2.exports = __toCommonJS2(src_exports2);
    var import_styled_components2 = __toESM2((init_styled_components_esm(), __toCommonJS(styled_components_esm_exports)));
    var import_jsx_runtime2 = require_jsx_runtime();
    function Spacer2({
      w: w2,
      h
    }) {
      const width = w2 && `${w2}px`;
      const height = h && `${h}px`;
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { width, height, userSelect: "none" } });
    }
    var Separator2 = import_styled_components2.default.div`
  box-sizing: border-box;
  background-color: var(--primary-lite);
  width: 100%;
  height: 2px;
  border-radius: 99px;
  margin: 16px 0px;
  user-select: none;
`;
    var FieldLabel2 = import_styled_components2.default.span`
  font-weight: bold;
`;
    var import_react2 = require_react();
    var import_styled_components22 = __toESM2((init_styled_components_esm(), __toCommonJS(styled_components_esm_exports)));
    var import_jsx_runtime22 = require_jsx_runtime();
    function HiddenText({ text }) {
      const [visible, setVisible] = (0, import_react2.useState)(false);
      const onRevealClick = (0, import_react2.useCallback)(() => {
        setVisible(true);
      }, []);
      if (visible) {
        return /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(TextContainer2, { children: text });
      }
      return /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(HiddenTextContainer, { onClick: onRevealClick, children: "tap to reveal" });
    }
    var TextContainer2 = import_styled_components22.default.div`
  border: 2px solid var(--primary-lite);
  overflow: hidden;
  padding: 4px 8px;
  border-radius: 4px;
  margin-bottom: 8px;
`;
    var HiddenTextContainer = import_styled_components22.default.div`
  border: 2px solid var(--primary-lite);
  overflow: hidden;
  padding: 4px 8px;
  border-radius: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
  user-select: none;
  cursor: pointer;
  background-color: rgba(0, 0, 0, 0.1);
  &:hover {
    background-color: rgba(0, 0, 0, 0.12);
  }
`;
    var import_pako = require_pako();
    var import_qr_image = __toESM2(require_qr());
    var import_react22 = require_react();
    var import_styled_components3 = __toESM2((init_styled_components_esm(), __toCommonJS(styled_components_esm_exports)));
    var import_jsx_runtime3 = require_jsx_runtime();
    function encodeQRPayload(unencoded) {
      console.log(`encoding payload with length ${unencoded.length}`);
      const compressedData = (0, import_pako.gzip)(unencoded);
      const base64CompressedData = Buffer.from(compressedData).toString("base64");
      console.log(
        `Compressed: ${compressedData.length}, base64: ${base64CompressedData.length}`
      );
      return base64CompressedData;
    }
    function decodeQRPayload(encoded) {
      const buffer = Buffer.from(encoded, "base64");
      const unzippedBuffer = Buffer.from((0, import_pako.ungzip)(buffer));
      const decodedBuffer = unzippedBuffer.toString("utf8");
      return decodedBuffer;
    }
    function QRDisplayWithRegenerateAndStorage({
      generateQRPayload,
      maxAgeMs,
      uniqueId,
      loadingLogo,
      loadedLogo,
      fgColor,
      bgColor
    }) {
      const regenerateAfterMs = maxAgeMs * 2 / 3;
      const [savedState, setSavedState] = (0, import_react22.useState)(() => {
        const savedState2 = JSON.parse(
          localStorage[uniqueId] || "{}"
        );
        console.log(
          `[QR] ('${uniqueId}') loaded saved state for ${uniqueId}: ${JSON.stringify(
            savedState2
          )}`
        );
        const { timestamp, payload } = savedState2;
        if (timestamp != null && Date.now() - timestamp < maxAgeMs && payload !== void 0) {
          console.log(
            `[QR] ('${uniqueId}') from localStorage, timestamp ${timestamp}`
          );
          return { timestamp, payload };
        }
        return void 0;
      });
      const maybeGenerateQR = (0, import_react22.useCallback)(() => __async2(this, null, function* () {
        const timestamp = Date.now();
        if (savedState && timestamp - savedState.timestamp < regenerateAfterMs) {
          console.log(
            `[QR] ('${uniqueId}') not regenerating, timestamp ${timestamp}`
          );
          return;
        }
        console.log(`[QR] ('${uniqueId}') regenerating data ${timestamp}`);
        const newData = yield generateQRPayload();
        const newSavedState = { timestamp, payload: newData };
        localStorage[uniqueId] = JSON.stringify(newSavedState);
        setSavedState(newSavedState);
      }), [generateQRPayload, regenerateAfterMs, savedState, uniqueId]);
      (0, import_react22.useEffect)(() => {
        maybeGenerateQR();
        const interval = setInterval(maybeGenerateQR, maxAgeMs / 10);
        return () => clearInterval(interval);
      }, [maxAgeMs, maybeGenerateQR]);
      const logoOverlay = (0, import_react22.useMemo)(() => {
        return savedState ? loadedLogo : loadingLogo;
      }, [loadedLogo, loadingLogo, savedState]);
      console.log(`[QR] ('${uniqueId}') rendering ${savedState == null ? void 0 : savedState.payload}`);
      return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        QRDisplay,
        {
          logoOverlay,
          value: savedState == null ? void 0 : savedState.payload,
          fgColor,
          bgColor
        }
      );
    }
    function QRDisplay({
      value,
      logoOverlay,
      fgColor,
      bgColor
    }) {
      return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(QRWrap, { children: [
        value !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          QR,
          {
            value,
            bgColor: bgColor != null ? bgColor : "#ffffff",
            fgColor: fgColor != null ? fgColor : "#000000"
          }
        ),
        logoOverlay
      ] });
    }
    var qrSize = "300px";
    var QRWrap = import_styled_components3.default.div`
  position: relative;
  width: ${qrSize};
  height: ${qrSize};
  margin: 0 auto;
`;
    function QR({
      value,
      fgColor,
      bgColor
    }) {
      const [svgObject, setSvgObject] = (0, import_react22.useState)();
      (0, import_react22.useEffect)(() => {
        const svgObject2 = import_qr_image.default.svgObject(value, "L");
        setSvgObject(svgObject2);
      }, [bgColor, fgColor, value]);
      return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Container2, { children: svgObject && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        "svg",
        {
          viewBox: `0 0 ${svgObject.size} ${svgObject.size}`,
          preserveAspectRatio: "none",
          children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
            "path",
            {
              width: "100%",
              height: "100%",
              d: svgObject.path,
              fill: fgColor
            }
          )
        }
      ) });
    }
    var Container2 = import_styled_components3.default.div`
  width: 100% !important;
  height: 100% !important;

  svg {
    width: 100%;
    height: 100%;
  }
`;
  }
});

// src/index.ts
var src_exports = {};
__export(src_exports, {
  STATIC_TICKET_PCD_NULLIFIER: () => STATIC_TICKET_PCD_NULLIFIER,
  ZKEdDSATicketPCD: () => ZKEdDSATicketPCD,
  ZKEdDSATicketPCDPackage: () => ZKEdDSATicketPCDPackage,
  ZKEdDSATicketPCDTypeName: () => ZKEdDSATicketPCDTypeName,
  deserialize: () => deserialize,
  generateMessageHash: () => generateMessageHash,
  getDisplayOptions: () => getDisplayOptions,
  init: () => init,
  prove: () => prove,
  serialize: () => serialize,
  verify: () => verify
});
module.exports = __toCommonJS(src_exports);

// src/ZKEdDSATicketPCD.ts
var import_eddsa_ticket_pcd = require("@pcd/eddsa-ticket-pcd");
var import_semaphore_identity_pcd = require("@pcd/semaphore-identity-pcd");
var import_semaphore_signature_pcd = require("@pcd/semaphore-signature-pcd");
var import_util = require("@pcd/util");
var import_circomlibjs = require("circomlibjs");
var import_js_sha256 = require("js-sha256");
var import_json_bigint = __toESM(require("json-bigint"));
var import_snarkjs = require("snarkjs");
var import_uuid = require("uuid");

// artifacts-unsafe/verification_key.json
var verification_key_default = {
  protocol: "groth16",
  curve: "bn128",
  nPublic: 13,
  vk_alpha_1: [
    "20491192805390485299153009773594534940189261866228447918068658471970481763042",
    "9383485363053290200918347156157836566562967994039712273449902621266178545958",
    "1"
  ],
  vk_beta_2: [
    [
      "6375614351688725206403948262868962793625744043794305715222011528459656738731",
      "4252822878758300859123897981450591353533073413197771768651442665752259397132"
    ],
    [
      "10505242626370262277552901082094356697409835680220590971873171140371331206856",
      "21847035105528745403288232691147584728191162732299865338377159692350059136679"
    ],
    [
      "1",
      "0"
    ]
  ],
  vk_gamma_2: [
    [
      "10857046999023057135944570762232829481370756359578518086990519993285655852781",
      "11559732032986387107991004021392285783925812861821192530917403151452391805634"
    ],
    [
      "8495653923123431417604973247489272438418190587263600148770280649306958101930",
      "4082367875863433681332203403145435568316851327593401208105741076214120093531"
    ],
    [
      "1",
      "0"
    ]
  ],
  vk_delta_2: [
    [
      "815078292575531046192086663219724374727314877789944839022978763617270122529",
      "8517559326603021438395762869772699379953347763605027999467301461677329782142"
    ],
    [
      "11933475914403638011549199939127022412610408964856669625556435624444530846276",
      "10060216183518664336746758058415662772138621355827444612586836899950167107801"
    ],
    [
      "1",
      "0"
    ]
  ],
  vk_alphabeta_12: [
    [
      [
        "2029413683389138792403550203267699914886160938906632433982220835551125967885",
        "21072700047562757817161031222997517981543347628379360635925549008442030252106"
      ],
      [
        "5940354580057074848093997050200682056184807770593307860589430076672439820312",
        "12156638873931618554171829126792193045421052652279363021382169897324752428276"
      ],
      [
        "7898200236362823042373859371574133993780991612861777490112507062703164551277",
        "7074218545237549455313236346927434013100842096812539264420499035217050630853"
      ]
    ],
    [
      [
        "7077479683546002997211712695946002074877511277312570035766170199895071832130",
        "10093483419865920389913245021038182291233451549023025229112148274109565435465"
      ],
      [
        "4595479056700221319381530156280926371456704509942304414423590385166031118820",
        "19831328484489333784475432780421641293929726139240675179672856274388269393268"
      ],
      [
        "11934129596455521040620786944827826205713621633706285934057045369193958244500",
        "8037395052364110730298837004334506829870972346962140206007064471173334027475"
      ]
    ]
  ],
  IC: [
    [
      "21114630910485738807789898390929380951635025014446037914068379136757129292970",
      "5193146529383827856777511440181443603638181203324960225260062024408413143835",
      "1"
    ],
    [
      "7656402980882640472251132436835504617775522213183526075467659560593666252951",
      "13824119177556243485887393671920459289697611113139742790459838465078483159942",
      "1"
    ],
    [
      "9402532289491528480403121384601370642192444957700606072235525121025258237131",
      "8844026524955806427023591009774975002185740515538004721002760115629544057883",
      "1"
    ],
    [
      "3209772790915506010094970946069265859930215387573136374140338740646710069569",
      "5029541613153556132471139219804138973194462817535917126145433020645878104535",
      "1"
    ],
    [
      "7894267067137251445847045409851273123044684308575901007449099746807892070164",
      "11459854145021752481034133707558935063897108635919818214100915709687570695378",
      "1"
    ],
    [
      "7391545523834829651729945679475376137624456464304425898038268310059928879654",
      "15639202724599298723234306374184465195900266868060510060630431427830210306795",
      "1"
    ],
    [
      "10853893230385783768058730492177809595034412928964757997762611186627112182690",
      "16077335548695500375845799494293978848556426297434952495744646229024215704075",
      "1"
    ],
    [
      "12644364130516656984497050096482726372973877733368108111480848619059613558437",
      "8755023654887675671434430458175626998720951542507651813628756060986394677881",
      "1"
    ],
    [
      "17656884561955596075517962169709622276723077511995504729198224640514690103796",
      "19121922666383630331593154558359491791189550163738984392207454201198012422232",
      "1"
    ],
    [
      "1320784367237397950193194096805918827020809197899920776133117954952833790098",
      "18041698685484843108964982445411239299523663152171573659040481493954961999014",
      "1"
    ],
    [
      "5964936743494078132406452001652450500485121757619761907743960283588469300432",
      "15055806788305616147233632178990451134014122888777876306180484263922616915473",
      "1"
    ],
    [
      "10871157241663746123141313912093194009996021712267859035182409332939526774960",
      "11315342327029671781508997276826065886920517206974279552883506155973657428546",
      "1"
    ],
    [
      "8387589336694957835134637643591409614280879273715432071069722574165309498572",
      "5719583571647978909547247964442587299475779623368966908123200976053315064571",
      "1"
    ],
    [
      "11733643857764466171897819625043966788363634273586191355572514273472918993265",
      "1612731338924995071741204846238147315715524122254865341106981230678360804862",
      "1"
    ]
  ]
};

// src/CardBody.tsx
var import_passport_ui = __toESM(require_dist());
init_styled_components_esm();
var import_jsx_runtime = __toESM(require_jsx_runtime());
function ZKEdDSATicketCardBody({ pcd }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Container, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "This PCD represents a response to a request for information about a signed EdDSA ticket PCD that has been issued for a semaphore keypair that the user possesses." }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_passport_ui.Separator, {}),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_passport_ui.FieldLabel, { children: "Ticket ID" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_passport_ui.TextContainer, { children: pcd.claim.partialTicket.ticketId || "HIDDEN" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_passport_ui.Spacer, { h: 8 }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_passport_ui.FieldLabel, { children: "Event ID" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_passport_ui.TextContainer, { children: pcd.claim.partialTicket.eventId || "HIDDEN" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_passport_ui.Spacer, { h: 8 }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_passport_ui.FieldLabel, { children: "Product ID" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_passport_ui.TextContainer, { children: pcd.claim.partialTicket.productId || "HIDDEN" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_passport_ui.Spacer, { h: 8 }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_passport_ui.FieldLabel, { children: "Timestamp Consumed" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_passport_ui.TextContainer, { children: pcd.claim.partialTicket.timestampConsumed || "HIDDEN" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_passport_ui.Spacer, { h: 8 }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_passport_ui.FieldLabel, { children: "Timestamp Signed" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_passport_ui.TextContainer, { children: pcd.claim.partialTicket.timestampSigned || "HIDDEN" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_passport_ui.Spacer, { h: 8 }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_passport_ui.FieldLabel, { children: "Semaphore Public ID" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_passport_ui.TextContainer, { children: pcd.claim.partialTicket.attendeeSemaphoreId || "HIDDEN" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_passport_ui.Spacer, { h: 8 }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_passport_ui.FieldLabel, { children: "Consumed?" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_passport_ui.TextContainer, { children: pcd.claim.partialTicket.isConsumed || "HIDDEN" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_passport_ui.Spacer, { h: 8 }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_passport_ui.FieldLabel, { children: "Revoked?" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_passport_ui.TextContainer, { children: pcd.claim.partialTicket.isRevoked || "HIDDEN" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_passport_ui.Spacer, { h: 8 }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_passport_ui.FieldLabel, { children: "Watermark" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_passport_ui.TextContainer, { children: pcd.claim.watermark }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_passport_ui.Spacer, { h: 8 }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_passport_ui.FieldLabel, { children: "External Nullifier" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_passport_ui.TextContainer, { children: pcd.claim.externalNullifier || "NONE" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_passport_ui.Spacer, { h: 8 }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_passport_ui.FieldLabel, { children: "Nullifier Hash" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_passport_ui.TextContainer, { children: pcd.claim.externalNullifier || "HIDDEN" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_passport_ui.Spacer, { h: 8 }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_passport_ui.FieldLabel, { children: "Ticket Signer" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_passport_ui.TextContainer, { children: pcd.claim.signer[0] + ", " + pcd.claim.signer[1] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_passport_ui.Spacer, { h: 8 })
  ] });
}
var Container = styled_components_esm_default.div`
  padding: 16px;
  overflow: hidden;
  width: 100%;
`;

// src/ZKEdDSATicketPCD.ts
function generateMessageHash(signal) {
  return BigInt("0x" + (0, import_js_sha256.sha256)(signal)) >> BigInt(8);
}
var STATIC_TICKET_PCD_NULLIFIER = generateMessageHash(
  "dummy-nullifier-for-eddsa-ticket-pcds"
);
var ZKEdDSATicketPCDTypeName = "zk-eddsa-ticket-pcd";
var initializedPromise;
var babyJub;
var eddsa;
var initArgs = void 0;
var ZKEdDSATicketPCD = class {
  constructor(id, claim, proof) {
    this.id = id;
    this.claim = claim;
    this.proof = proof;
    this.type = ZKEdDSATicketPCDTypeName;
    this.id = id;
    this.claim = claim;
    this.proof = proof;
  }
};
function init(args) {
  return __async(this, null, function* () {
    initArgs = args;
  });
}
function ensureInitialized() {
  return __async(this, null, function* () {
    if (!initArgs) {
      throw new Error("missing init args");
    }
    if (!initializedPromise) {
      initializedPromise = (() => __async(this, null, function* () {
        babyJub = yield (0, import_circomlibjs.buildBabyjub)();
        eddsa = yield (0, import_circomlibjs.buildEddsa)();
      }))();
    }
    yield initializedPromise;
  });
}
function prove(args) {
  return __async(this, null, function* () {
    var _a, _b, _c, _d;
    yield ensureInitialized();
    if (!initArgs) {
      throw new Error("Cannot make proof: init has not been called yet");
    }
    const serializedTicketPCD = (_a = args.ticket.value) == null ? void 0 : _a.pcd;
    if (!serializedTicketPCD) {
      throw new Error("Cannot make proof: missing ticket PCD");
    }
    const serializedIdentityPCD = (_b = args.identity.value) == null ? void 0 : _b.pcd;
    if (!serializedIdentityPCD) {
      throw new Error("Cannot make proof: missing identity PCD");
    }
    const dataRequestObj = args.fieldsToReveal.value;
    if (!dataRequestObj) {
      throw new Error("Cannot make proof: missing fields request object");
    }
    if (!args.watermark.value) {
      throw new Error("Cannot make proof: missing watermark");
    }
    if (args.externalNullifier !== void 0 && args.externalNullifier.value !== void 0 && BigInt(args.externalNullifier.value) === import_semaphore_signature_pcd.STATIC_SIGNATURE_PCD_NULLIFIER) {
      throw new Error(
        "Cannot make proof: same externalNullifier as SemaphoreSignaturePCD, which would break anonymity"
      );
    }
    const deserializedTicket = yield import_eddsa_ticket_pcd.EdDSATicketPCDPackage.deserialize(serializedTicketPCD);
    const ticketAsBigIntArray = (0, import_eddsa_ticket_pcd.ticketDataToBigInts)(
      deserializedTicket.claim.ticket
    );
    const identityPCD = yield import_semaphore_identity_pcd.SemaphoreIdentityPCDPackage.deserialize(
      serializedIdentityPCD
    );
    const pubKey = deserializedTicket.proof.eddsaPCD.claim.publicKey;
    const rawSig = eddsa.unpackSignature(
      (0, import_util.fromHexString)(deserializedTicket.proof.eddsaPCD.proof.signature)
    );
    const snarkInput = {
      ticketId: ticketAsBigIntArray[0].toString(),
      revealTicketId: dataRequestObj.revealTicketId ? "1" : "0",
      eventId: ticketAsBigIntArray[1].toString(),
      revealEventId: dataRequestObj.revealEventId ? "1" : "0",
      productId: ticketAsBigIntArray[2].toString(),
      revealProductId: dataRequestObj.revealProductId ? "1" : "0",
      timestampConsumed: ticketAsBigIntArray[3].toString(),
      revealTimestampConsumed: dataRequestObj.revealTimestampConsumed ? "1" : "0",
      timestampSigned: ticketAsBigIntArray[4].toString(),
      revealTimestampSigned: dataRequestObj.revealTimestampSigned ? "1" : "0",
      attendeeSemaphoreId: ticketAsBigIntArray[5].toString(),
      revealAttendeeSemaphoreId: dataRequestObj.revealAttendeeSemaphoreId ? "1" : "0",
      isConsumed: ticketAsBigIntArray[6].toString(),
      revealIsConsumed: dataRequestObj.revealIsConsumed ? "1" : "0",
      isRevoked: ticketAsBigIntArray[7].toString(),
      revealIsRevoked: dataRequestObj.revealIsRevoked ? "1" : "0",
      externalNullifier: ((_c = args.externalNullifier) == null ? void 0 : _c.value) || STATIC_TICKET_PCD_NULLIFIER.toString(),
      revealNullifierHash: args.externalNullifier ? "1" : "0",
      Ax: babyJub.F.toObject((0, import_util.fromHexString)(pubKey[0])).toString(),
      Ay: babyJub.F.toObject((0, import_util.fromHexString)(pubKey[1])).toString(),
      R8x: babyJub.F.toObject(rawSig.R8[0]).toString(),
      R8y: babyJub.F.toObject(rawSig.R8[1]).toString(),
      S: rawSig.S.toString(),
      identityNullifier: identityPCD.claim.identity.getNullifier().toString(),
      identityTrapdoor: identityPCD.claim.identity.getTrapdoor().toString(),
      watermark: BigInt(args.watermark.value).toString()
    };
    const { proof, publicSignals } = yield import_snarkjs.groth16.fullProve(
      snarkInput,
      initArgs.wasmFilePath,
      initArgs.zkeyFilePath
    );
    const partialTicket = {};
    if (!(0, import_util.babyJubIsNegativeOne)(publicSignals[0])) {
      partialTicket.ticketId = (0, import_util.decStringToBigIntToUuid)(publicSignals[0]);
    }
    if (!(0, import_util.babyJubIsNegativeOne)(publicSignals[1])) {
      partialTicket.eventId = (0, import_util.decStringToBigIntToUuid)(publicSignals[1]);
    }
    if (!(0, import_util.babyJubIsNegativeOne)(publicSignals[2])) {
      partialTicket.productId = (0, import_util.decStringToBigIntToUuid)(publicSignals[2]);
    }
    if (!(0, import_util.babyJubIsNegativeOne)(publicSignals[3])) {
      partialTicket.timestampConsumed = parseInt(publicSignals[3]);
    }
    if (!(0, import_util.babyJubIsNegativeOne)(publicSignals[4])) {
      partialTicket.timestampSigned = parseInt(publicSignals[4]);
    }
    if (!(0, import_util.babyJubIsNegativeOne)(publicSignals[5])) {
      partialTicket.attendeeSemaphoreId = publicSignals[5];
    }
    if (!(0, import_util.babyJubIsNegativeOne)(publicSignals[6])) {
      partialTicket.isConsumed = publicSignals[6] !== "0";
    }
    if (!(0, import_util.babyJubIsNegativeOne)(publicSignals[7])) {
      partialTicket.isRevoked = publicSignals[7] !== "0";
    }
    const claim = {
      partialTicket,
      watermark: args.watermark.value,
      signer: pubKey
    };
    if (args.externalNullifier) {
      claim.nullifierHash = publicSignals[8];
      claim.externalNullifier = (_d = args.externalNullifier.value) == null ? void 0 : _d.toString();
    }
    return new ZKEdDSATicketPCD((0, import_uuid.v4)(), claim, proof);
  });
}
function publicSignalsFromClaim(claim) {
  var _a;
  const t2 = claim.partialTicket;
  const ret = [];
  const negOne = "21888242871839275222246405745257275088548364400416034343698204186575808495616";
  ret.push(
    t2.ticketId === void 0 ? negOne : (0, import_eddsa_ticket_pcd.uuidToBigInt)(t2.ticketId).toString()
  );
  ret.push(
    t2.eventId === void 0 ? negOne : (0, import_eddsa_ticket_pcd.uuidToBigInt)(t2.eventId).toString()
  );
  ret.push(
    t2.productId === void 0 ? negOne : (0, import_eddsa_ticket_pcd.uuidToBigInt)(t2.productId).toString()
  );
  ret.push(
    t2.timestampConsumed === void 0 ? negOne : t2.timestampConsumed.toString()
  );
  ret.push(
    t2.timestampSigned === void 0 ? negOne : t2.timestampSigned.toString()
  );
  ret.push(t2.attendeeSemaphoreId || negOne);
  ret.push(
    t2.isConsumed === void 0 ? negOne : (0, import_eddsa_ticket_pcd.booleanToBigInt)(t2.isConsumed).toString()
  );
  ret.push(
    t2.isRevoked === void 0 ? negOne : (0, import_eddsa_ticket_pcd.booleanToBigInt)(t2.isRevoked).toString()
  );
  ret.push(claim.nullifierHash || negOne);
  ret.push(
    ((_a = claim.externalNullifier) == null ? void 0 : _a.toString()) || STATIC_TICKET_PCD_NULLIFIER.toString()
  );
  ret.push(babyJub.F.toObject((0, import_util.fromHexString)(claim.signer[0])).toString());
  ret.push(babyJub.F.toObject((0, import_util.fromHexString)(claim.signer[1])).toString());
  ret.push(claim.watermark);
  return ret;
}
function verify(pcd) {
  return __async(this, null, function* () {
    yield ensureInitialized();
    const publicSignals = publicSignalsFromClaim(pcd.claim);
    return import_snarkjs.groth16.verify(verification_key_default, publicSignals, pcd.proof);
  });
}
function serialize(pcd) {
  return __async(this, null, function* () {
    return {
      type: ZKEdDSATicketPCDTypeName,
      pcd: (0, import_json_bigint.default)({ useNativeBigInt: true }).stringify(pcd)
    };
  });
}
function deserialize(serialized) {
  return __async(this, null, function* () {
    const parsed = (0, import_json_bigint.default)({ useNativeBigInt: true }).parse(serialized);
    const proof = parsed.proof;
    const claim = parsed.claim;
    return new ZKEdDSATicketPCD(parsed.id, claim, proof);
  });
}
function getDisplayOptions(pcd) {
  return {
    header: "ZK EdDSA Ticket PCD",
    displayName: "zk-eddsa-ticket-" + pcd.id.substring(0, 4)
  };
}
var ZKEdDSATicketPCDPackage = {
  name: ZKEdDSATicketPCDTypeName,
  getDisplayOptions,
  renderCardBody: ZKEdDSATicketCardBody,
  init,
  prove,
  verify,
  serialize,
  deserialize
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  STATIC_TICKET_PCD_NULLIFIER,
  ZKEdDSATicketPCD,
  ZKEdDSATicketPCDPackage,
  ZKEdDSATicketPCDTypeName,
  deserialize,
  generateMessageHash,
  getDisplayOptions,
  init,
  prove,
  serialize,
  verify
});
/*! Bundled license information:

react-is/cjs/react-is.production.min.js:
  (** @license React v16.13.1
   * react-is.production.min.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

react-is/cjs/react-is.development.js:
  (** @license React v16.13.1
   * react-is.development.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

react/cjs/react.production.min.js:
  (**
   * @license React
   * react.production.min.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

react/cjs/react.development.js:
  (**
   * @license React
   * react.development.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

react/cjs/react-jsx-runtime.production.min.js:
  (**
   * @license React
   * react-jsx-runtime.production.min.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

react/cjs/react-jsx-runtime.development.js:
  (**
   * @license React
   * react-jsx-runtime.development.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)
*/
