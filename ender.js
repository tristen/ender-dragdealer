/*!
  * =======================================================
  * Ender: open module JavaScript framework
  * copyright Dustin Diaz & Jacob Thornton 2011 (@ded @fat)
  * https://ender.no.de
  * License MIT
  * Module's individual licenses still apply
  * Build: ender -b domready qwery ender-dragdealer
  * =======================================================
  */

/*!
  * Ender-JS: open module JavaScript framework (client-lib)
  * copyright Dustin Diaz & Jacob Thornton 2011 (@ded @fat)
  * https://ender.no.de
  * License MIT
  */
!function (context) {

  // a global object for node.js module compatiblity
  // ============================================

  context['global'] = context;

  // Implements simple module system
  // losely based on CommonJS Modules spec v1.1.1
  // ============================================

  var modules = {};

  function require (identifier) {
    var module = modules[identifier] || window[identifier];
    if (!module) throw new Error("Requested module '" + identifier + "' has not been defined.");
    return module;
  }

  function provide (name, what) {
    return modules[name] = what;
  }

  context['provide'] = provide;
  context['require'] = require;

  // Implements Ender's $ global access object
  // =========================================

  function aug(o, o2) {
    for (var k in o2) {
      k != 'noConflict' && k != '_VERSION' && (o[k] = o2[k]);
    }
    return o;
  }

  function boosh(s, r, els) {
                          // string || node || nodelist || window
    if (ender._select && (typeof s == 'string' || s.nodeName || s.length && 'item' in s || s == window)) {
      els = ender._select(s, r);
      els.selector = s;
    } else {
      els = isFinite(s.length) ? s : [s];
    }
    return aug(els, boosh);
  }

  function ender(s, r) {
    return boosh(s, r);
  }

  aug(ender, {
    _VERSION: '0.2.5',
    ender: function (o, chain) {
      aug(chain ? boosh : ender, o);
    },
    fn: context.$ && context.$.fn || {} // for easy compat to jQuery plugins
  });

  aug(boosh, {
    forEach: function (fn, scope, i) {
      // opt out of native forEach so we can intentionally call our own scope
      // defaulting to the current item and be able to return self
      for (i = 0, l = this.length; i < l; ++i) {
        i in this && fn.call(scope || this[i], this[i], i, this);
      }
      // return self for chaining
      return this;
    },
    $: ender // handy reference to self
  });

  var old = context.$;
  ender.noConflict = function () {
    context.$ = old;
    return this;
  };

  (typeof module !== 'undefined') && module.exports && (module.exports = ender);
  // use subscript notation as extern for Closure compilation
  context['ender'] = context['$'] = context['ender'] || ender;

}(this);

!function () {

  var module = { exports: {} }, exports = module.exports;

  !function (context, doc) {
    var fns = [], ol, fn, f = false,
        testEl = doc.documentElement,
        hack = testEl.doScroll,
        domContentLoaded = 'DOMContentLoaded',
        addEventListener = 'addEventListener',
        onreadystatechange = 'onreadystatechange',
        loaded = /^loade|c/.test(doc.readyState);
  
    function flush(i) {
      loaded = 1;
      while (i = fns.shift()) { i() }
    }
    doc[addEventListener] && doc[addEventListener](domContentLoaded, fn = function () {
      doc.removeEventListener(domContentLoaded, fn, f);
      flush();
    }, f);
  
  
    hack && doc.attachEvent(onreadystatechange, (ol = function () {
      if (/^c/.test(doc.readyState)) {
        doc.detachEvent(onreadystatechange, ol);
        flush();
      }
    }));
  
    context['domReady'] = hack ?
      function (fn) {
        self != top ?
          loaded ? fn() : fns.push(fn) :
          function () {
            try {
              testEl.doScroll('left');
            } catch (e) {
              return setTimeout(function() { context['domReady'](fn) }, 50);
            }
            fn();
          }()
      } :
      function (fn) {
        loaded ? fn() : fns.push(fn);
      };
  
  }(this, document);
  

  provide("domready", module.exports);

  !function ($) {
    $.ender({domReady: domReady});
    $.ender({
      ready: function (f) {
        domReady(f);
        return this;
      }
    }, true);
  }(ender);

}();

!function () {

  var module = { exports: {} }, exports = module.exports;

  /*!
    * Qwery - A Blazing Fast query selector engine
    * https://github.com/ded/qwery
    * copyright Dustin Diaz & Jacob Thornton 2011
    * MIT License
    */
  
  !function (context, doc) {
  
    var c, i, j, k, l, m, o, p, r, v,
        el, node, len, found, classes, item, items, token,
        html = doc.documentElement,
        id = /#([\w\-]+)/,
        clas = /\.[\w\-]+/g,
        idOnly = /^#([\w\-]+$)/,
        classOnly = /^\.([\w\-]+)$/,
        tagOnly = /^([\w\-]+)$/,
        tagAndOrClass = /^([\w]+)?\.([\w\-]+)$/,
        normalizr = /\s*([\s\+\~>])\s*/g,
        splitters = /[\s\>\+\~]/,
        splittersMore = /(?![\s\w\-\/\?\&\=\:\.\(\)\!,@#%<>\{\}\$\*\^'"]*\])/,
        dividers = new RegExp('(' + splitters.source + ')' + splittersMore.source, 'g'),
        tokenizr = new RegExp(splitters.source + splittersMore.source),
        specialChars = /([.*+?\^=!:${}()|\[\]\/\\])/g,
        simple = /^([a-z0-9]+)?(?:([\.\#]+[\w\-\.#]+)?)/,
        attr = /\[([\w\-]+)(?:([\|\^\$\*\~]?\=)['"]?([ \w\-\/\?\&\=\:\.\(\)\!,@#%<>\{\}\$\*\^]+)["']?)?\]/,
        pseudo = /:([\w\-]+)(\(['"]?(\w+)['"]?\))?/,
        chunker = new RegExp(simple.source + '(' + attr.source + ')?' + '(' + pseudo.source + ')?'),
        walker = {
      ' ': function (node) {
        return node && node !== html && node.parentNode
      },
      '>': function (node, contestant) {
        return node && node.parentNode == contestant.parentNode && node.parentNode;
      },
      '~': function (node) {
        return node && node.previousSibling;
      },
      '+': function (node, contestant, p1, p2) {
        if (!node) {
          return false;
        }
        p1 = previous(node);
        p2 = previous(contestant);
        return p1 && p2 && p1 == p2 && p1;
      }
    };
    function cache() {
      this.c = {};
    }
    cache.prototype = {
      g: function (k) {
        return this.c[k] || undefined;
      },
      s: function (k, v) {
        this.c[k] = v;
        return v;
      }
    };
  
    var classCache = new cache(),
        cleanCache = new cache(),
        attrCache = new cache(),
        tokenCache = new cache();
  
    function array(ar) {
      r = [];
      for (i = 0, len = ar.length; i < len; i++) {
        r[i] = ar[i];
      }
      return r;
    }
  
    function previous(n) {
      while (n = n.previousSibling) {
        if (n.nodeType == 1) {
          break;
        }
      }
      return n
    }
  
    function q(query) {
      return query.match(chunker);
    }
  
    // this next method expect at most these args
    // given => div.hello[title="world"]:foo('bar')
  
    // div.hello[title="world"]:foo('bar'), div, .hello, [title="world"], title, =, world, :foo('bar'), foo, ('bar'), bar]
  
    function interpret(whole, tag, idsAndClasses, wholeAttribute, attribute, qualifier, value, wholePseudo, pseudo, wholePseudoVal, pseudoVal) {
      var m, c, k;
      if (tag && this.tagName.toLowerCase() !== tag) {
        return false;
      }
      if (idsAndClasses && (m = idsAndClasses.match(id)) && m[1] !== this.id) {
        return false;
      }
      if (idsAndClasses && (classes = idsAndClasses.match(clas))) {
        for (i = classes.length; i--;) {
          c = classes[i].slice(1);
          if (!(classCache.g(c) || classCache.s(c, new RegExp('(^|\\s+)' + c + '(\\s+|$)'))).test(this.className)) {
            return false;
          }
        }
      }
      if (pseudo && qwery.pseudos[pseudo] && !qwery.pseudos[pseudo](this, pseudoVal)) {
        return false;
      }
      if (wholeAttribute && !value) {
        o = this.attributes;
        for (k in o) {
          if (Object.prototype.hasOwnProperty.call(o, k) && (o[k].name || k) == attribute) {
            return this;
          }
        }
      }
      if (wholeAttribute && !checkAttr(qualifier, this.getAttribute(attribute) || '', value)) {
        return false;
      }
      return this;
    }
  
    function clean(s) {
      return cleanCache.g(s) || cleanCache.s(s, s.replace(specialChars, '\\$1'));
    }
  
    function checkAttr(qualify, actual, val) {
      switch (qualify) {
      case '=':
        return actual == val;
      case '^=':
        return actual.match(attrCache.g('^=' + val) || attrCache.s('^=' + val, new RegExp('^' + clean(val))));
      case '$=':
        return actual.match(attrCache.g('$=' + val) || attrCache.s('$=' + val, new RegExp(clean(val) + '$')));
      case '*=':
        return actual.match(attrCache.g(val) || attrCache.s(val, new RegExp(clean(val))));
      case '~=':
        return actual.match(attrCache.g('~=' + val) || attrCache.s('~=' + val, new RegExp('(?:^|\\s+)' + clean(val) + '(?:\\s+|$)')));
      case '|=':
        return actual.match(attrCache.g('|=' + val) || attrCache.s('|=' + val, new RegExp('^' + clean(val) + '(-|$)')));
      }
      return 0;
    }
  
    function _qwery(selector) {
      var r = [], ret = [], i, j = 0, k, l, m, p, token, tag, els, root, intr, item, children,
          tokens = tokenCache.g(selector) || tokenCache.s(selector, selector.split(tokenizr)),
          dividedTokens = selector.match(dividers), dividedToken;
      tokens = tokens.slice(0); // this makes a copy of the array so the cached original is not effected
      if (!tokens.length) {
        return r;
      }
  
      token = tokens.pop();
      root = tokens.length && (m = tokens[tokens.length - 1].match(idOnly)) ? doc.getElementById(m[1]) : doc;
      if (!root) {
        return r;
      }
      intr = q(token);
      els = dividedTokens && /^[+~]$/.test(dividedTokens[dividedTokens.length - 1]) ? function (r) {
          while (root = root.nextSibling) {
            root.nodeType == 1 && (intr[1] ? intr[1] == root.tagName.toLowerCase() : 1) && r.push(root)
          }
          return r
        }([]) :
        root.getElementsByTagName(intr[1] || '*');
      for (i = 0, l = els.length; i < l; i++) {
        if (item = interpret.apply(els[i], intr)) {
          r[j++] = item;
        }
      }
      if (!tokens.length) {
        return r;
      }
  
      // loop through all descendent tokens
      for (j = 0, l = r.length, k = 0; j < l; j++) {
        p = r[j];
        // loop through each token backwards crawling up tree
        for (i = tokens.length; i--;) {
          // loop through parent nodes
          while (p = walker[dividedTokens[i]](p, r[j])) {
            if (found = interpret.apply(p, q(tokens[i]))) {
              break;
            }
          }
        }
        found && (ret[k++] = r[j]);
      }
      return ret;
    }
  
    function boilerPlate(selector, _root, fn) {
      var root = (typeof _root == 'string') ? fn(_root)[0] : (_root || doc);
      if (selector === window || isNode(selector)) {
        return !_root || (selector !== window && isNode(root) && isAncestor(selector, root)) ? [selector] : [];
      }
      if (selector && typeof selector === 'object' && isFinite(selector.length)) {
        return array(selector);
      }
      if (m = selector.match(idOnly)) {
        return (el = doc.getElementById(m[1])) ? [el] : [];
      }
      if (m = selector.match(tagOnly)) {
        return array(root.getElementsByTagName(m[1]));
      }
      return false;
    }
  
    function isNode(el) {
      return (el && el.nodeType && (el.nodeType == 1 || el.nodeType == 9));
    }
  
    function uniq(ar) {
      var a = [], i, j;
      label:
      for (i = 0; i < ar.length; i++) {
        for (j = 0; j < a.length; j++) {
          if (a[j] == ar[i]) {
            continue label;
          }
        }
        a[a.length] = ar[i];
      }
      return a;
    }
  
    function qwery(selector, _root) {
      var root = (typeof _root == 'string') ? qwery(_root)[0] : (_root || doc);
      if (!root || !selector) {
        return [];
      }
      if (m = boilerPlate(selector, _root, qwery)) {
        return m;
      }
      return select(selector, root);
    }
  
    var isAncestor = 'compareDocumentPosition' in html ?
      function (element, container) {
        return (container.compareDocumentPosition(element) & 16) == 16;
      } : 'contains' in html ?
      function (element, container) {
        container = container == doc || container == window ? html : container;
        return container !== element && container.contains(element);
      } :
      function (element, container) {
        while (element = element.parentNode) {
          if (element === container) {
            return 1;
          }
        }
        return 0;
      },
  
    select = (doc.querySelector && doc.querySelectorAll) ?
      function (selector, root) {
        if (doc.getElementsByClassName && (m = selector.match(classOnly))) {
          return array((root).getElementsByClassName(m[1]));
        }
        return array((root).querySelectorAll(selector));
      } :
      function (selector, root) {
        selector = selector.replace(normalizr, '$1');
        var result = [], collection, collections = [], i;
        if (m = selector.match(tagAndOrClass)) {
          items = root.getElementsByTagName(m[1] || '*');
          r = classCache.g(m[2]) || classCache.s(m[2], new RegExp('(^|\\s+)' + m[2] + '(\\s+|$)'));
          for (i = 0, l = items.length, j = 0; i < l; i++) {
            r.test(items[i].className) && (result[j++] = items[i]);
          }
          return result;
        }
        for (i = 0, items = selector.split(','), l = items.length; i < l; i++) {
          collections[i] = _qwery(items[i]);
        }
        for (i = 0, l = collections.length; i < l && (collection = collections[i]); i++) {
          var ret = collection;
          if (root !== doc) {
            ret = [];
            for (j = 0, m = collection.length; j < m && (element = collection[j]); j++) {
              // make sure element is a descendent of root
              isAncestor(element, root) && ret.push(element);
            }
          }
          result = result.concat(ret);
        }
        return uniq(result);
      };
  
    qwery.uniq = uniq;
    qwery.pseudos = {};
  
    var oldQwery = context.qwery;
    qwery.noConflict = function () {
      context.qwery = oldQwery;
      return this;
    };
    context['qwery'] = qwery;
  
  }(this, document);

  provide("qwery", module.exports);

  !function (doc) {
    var q = qwery.noConflict();
    var table = 'table',
        nodeMap = {
          thead: table,
          tbody: table,
          tfoot: table,
          tr: 'tbody',
          th: 'tr',
          td: 'tr',
          fieldset: 'form',
          option: 'select'
        }
    function create(node, root) {
      var tag = /^<([^\s>]+)/.exec(node)[1]
      var el = (root || doc).createElement(nodeMap[tag] || 'div'), els = [];
      el.innerHTML = node;
      var nodes = el.childNodes;
      el = el.firstChild;
      els.push(el);
      while (el = el.nextSibling) {
        (el.nodeType == 1) && els.push(el);
      }
      return els;
    }
    $._select = function (s, r) {
      return /^\s*</.test(s) ? create(s, r) : q(s, r);
    };
    $.pseudos = q.pseudos;
    $.ender({
      find: function (s) {
        var r = [], i, l, j, k, els;
        for (i = 0, l = this.length; i < l; i++) {
          els = q(s, this[i]);
          for (j = 0, k = els.length; j < k; j++) {
            r.push(els[j]);
          }
        }
        return $(q.uniq(r));
      }
      , and: function (s) {
        var plus = $(s);
        for (var i = this.length, j = 0, l = this.length + plus.length; i < l; i++, j++) {
          this[i] = plus[j];
        }
        return this;
      }
    }, true);
  }(document);

}();

!function () {

  var module = { exports: {} }, exports = module.exports;

  /**
   * Dragdealer JS v0.9.5
   * http://code.ovidiu.ch/Dragdealer-js
   *
   * Copyright (c) 2010, Ovidiu Chereches
   * Modified by Tristen Brown
   * MIT License
   * http://legal.ovidiu.ch/licenses/MIT
   */
   
  !function (context) {
  
      /* Cursor */
      var Cursor = {
          x: 0, y: 0,
          init: function() {
          	this.setEvent('mouse');
              this.setEvent('touch');
          },
          setEvent: function(type) {
              var moveHandler = document['on' + type + 'move'] || function(){};
              document['on' + type + 'move'] = function(e) {
                  moveHandler(e);
                  Cursor.refresh(e);
              };
          },
          refresh: function(e) {
              if(!e) {
                  e = window.event;
              } if(e.type === 'mousemove') {
                  this.set(e);
              } else if(e.touches) {
                  this.set(e.touches[0]);
              }
          },
          set: function(e) {
              if(e.pageX || e.pageY) {
                  this.x = e.pageX;
                  this.y = e.pageY;
              } else if(e.clientX || e.clientY) {
                  this.x = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
                  this.y = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
              }
          }
      };
      Cursor.init();
  
      /* Position */
      var Position = {
          get: function(obj) {
              var curleft = curtop = 0;
              if(obj.offsetParent) {
                  do {
                      curleft += obj.offsetLeft;
                      curtop += obj.offsetTop;
                  }
                  while((obj = obj.offsetParent));
              }
              return [curleft, curtop];
          }
      };
  
      /* Dragdealer */
      var Dragdealer = function(wrapper, options) {
          if(typeof(wrapper) === 'string') {
      		wrapper = document.getElementById(wrapper);
      	} if(!wrapper) {
      		return;
      	}
      	var handle = wrapper.getElementsByTagName('div')[0];
          if(!handle || handle.className.search(/(^|\s)handle(\s|$)/) === -1) {
      		return;
      	}
      	this.init(wrapper, handle, options || {});
      	this.setup();
      };
  
      Dragdealer.prototype = {
          init: function(wrapper, handle, options) {
          	this.wrapper = wrapper;
          	this.handle = handle;
          	this.options = options;
          	this.disabled = this.getOption('disabled', false);
          	this.horizontal = this.getOption('horizontal', true);
          	this.vertical = this.getOption('vertical', false);
          	this.slide = this.getOption('slide', true);
          	this.steps = this.getOption('steps', 0);
          	this.snap = this.getOption('snap', false);
          	this.loose = this.getOption('loose', false);
          	this.speed = this.getOption('speed', 10) / 100;
          	this.xPrecision = this.getOption('xPrecision', 0);
          	this.yPrecision = this.getOption('yPrecision', 0);
          	this.callback = options.callback || null;
          	this.animationCallback = options.animationCallback || null;
  
          	this.bounds = {
          		left: options.left || 0, right: -(options.right || 0),
          		top: options.top || 0, bottom: -(options.bottom || 0),
          		x0: 0, x1: 0, xRange: 0,
          		y0: 0, y1: 0, yRange: 0
          	};
          	this.value = {
          		prev: [-1, -1],
          		current: [options.x || 0, options.y || 0],
          		target: [options.x || 0, options.y || 0]
          	};
          	this.offset = {
          		wrapper: [0, 0],
          		mouse: [0, 0],
          		prev: [-999999, -999999],
          		current: [0, 0],
          		target: [0, 0]
          	};
          	this.change = [0, 0];
  
          	this.activity = false;
          	this.dragging = false;
          	this.tapping = false;
          },
          getOption: function(name, defaultValue) {
          	return this.options[name] !== undefined ? this.options[name] : defaultValue;
          },
          setup: function() {
          	this.setWrapperOffset();
          	this.setBoundsPadding();
          	this.setBounds();
          	this.setSteps();
          	this.addListeners();
          },
          setWrapperOffset: function() {
          	this.offset.wrapper = Position.get(this.wrapper);
          },
          setBoundsPadding: function() {
              if(!this.bounds.left && !this.bounds.right) {
          		this.bounds.left = Position.get(this.handle)[0] - this.offset.wrapper[0];
          		this.bounds.right = -this.bounds.left;
          	}
              if(!this.bounds.top && !this.bounds.bottom) {
          		this.bounds.top = Position.get(this.handle)[1] - this.offset.wrapper[1];
          		this.bounds.bottom = -this.bounds.top;
          	}
          },
          setBounds: function() {
          	this.bounds.x0 = this.bounds.left;
          	this.bounds.x1 = this.wrapper.offsetWidth + this.bounds.right;
          	this.bounds.xRange = (this.bounds.x1 - this.bounds.x0) - this.handle.offsetWidth;
  
          	this.bounds.y0 = this.bounds.top;
          	this.bounds.y1 = this.wrapper.offsetHeight + this.bounds.bottom;
          	this.bounds.yRange = (this.bounds.y1 - this.bounds.y0) - this.handle.offsetHeight;
  
          	this.bounds.xStep = 1 / (this.xPrecision || Math.max(this.wrapper.offsetWidth, this.handle.offsetWidth));
          	this.bounds.yStep = 1 / (this.yPrecision || Math.max(this.wrapper.offsetHeight, this.handle.offsetHeight));
          },
          setSteps: function() {
          	if(this.steps > 1) {
          		this.stepRatios = [];
          		for(var i = 0; i <= this.steps - 1; i++) {
          			this.stepRatios[i] = i / (this.steps - 1);
          		}
          	}
          },
          addListeners: function() {
          	var self = this;
  
          	this.wrapper.onselectstart = function() {
                  return false;
              };
          	this.handle.onmousedown = this.handle.ontouchstart = function(e) {
                  self.handleDownHandler(e);
              };
          	this.wrapper.onmousedown = this.wrapper.ontouchstart = function(e) {
                  self.wrapperDownHandler(e);
              };
          	var mouseUpHandler = document.onmouseup || function(){};
          	document.onmouseup = function(e) {
                  mouseUpHandler(e);
                  self.documentUpHandler(e);
              };
          	var touchEndHandler = document.ontouchend || function(){};
          	document.ontouchend = function(e) {
                  touchEndHandler(e);
                  self.documentUpHandler(e);
              };
          	var resizeHandler = window.onresize || function(){};
          	window.onresize = function(e) {
                  resizeHandler(e);
                  self.documentResizeHandler(e);
              };
          	this.wrapper.onmousemove = function(e) {
                  self.activity = true;
              };
          	this.wrapper.onclick = function(e) {
                  return !self.activity;
              };
  
              this.interval = setInterval(function(){ self.animate(); }, 25);
              self.animate(false, true);
          },
          handleDownHandler: function(e) {
          	this.activity = false;
          	Cursor.refresh(e);
  
          	this.preventDefaults(e, true);
          	this.startDrag();
          	this.cancelEvent(e);
          },
          wrapperDownHandler: function(e) {
          	Cursor.refresh(e);
  
          	this.preventDefaults(e, true);
          	this.startTap();
          },
          documentUpHandler: function(e) {
          	this.stopDrag();
          	this.stopTap();
          },
          documentResizeHandler: function(e) {
          	this.setWrapperOffset();
          	this.setBounds();
  
          	this.update();
          },
          enable: function() {
          	this.disabled = false;
          	this.handle.className = this.handle.className.replace(/\s?disabled/g, '');
          },
          disable: function() {
          	this.disabled = true;
          	this.handle.className += ' disabled';
          },
          setStep: function(x, y, snap) {
          	this.setValue(
          		this.steps && x > 1 ? (x - 1) / (this.steps - 1) : 0,
          		this.steps && y > 1 ? (y - 1) / (this.steps - 1) : 0,
          		snap
          	);
          },
          setValue: function(x, y, snap) {
          	this.setTargetValue([x, y || 0]);
              if(snap) {
                  this.groupCopy(this.value.current, this.value.target);
          	}
          },
          startTap: function(target) {
          	if(this.disabled) {
          		return;
          	}
          	this.tapping = true;
  
          	if(target === undefined) {
          		target = [
          			Cursor.x - this.offset.wrapper[0] - (this.handle.offsetWidth / 2),
          			Cursor.y - this.offset.wrapper[1] - (this.handle.offsetHeight / 2)
          		];
          	}
          	this.setTargetOffset(target);
          },
          stopTap: function() {
              if(this.disabled || !this.tapping) {
          		return;
          	}
          	this.tapping = false;
  
          	this.setTargetValue(this.value.current);
          	this.result();
          },
          startDrag: function() {
          	if(this.disabled) {
          		return;
          	}
          	this.offset.mouse = [
          		Cursor.x - Position.get(this.handle)[0],
          		Cursor.y - Position.get(this.handle)[1]
          	];
  
          	this.dragging = true;
          },
          stopDrag: function() {
          	if(this.disabled || !this.dragging) {
          		return;
          	}
          	this.dragging = false;
  
          	var target = this.groupClone(this.value.current);
          	if(this.slide) {
          		var ratioChange = this.change;
          		target[0] += ratioChange[0] * 4;
          		target[1] += ratioChange[1] * 4;
          	}
          	this.setTargetValue(target);
          	this.result();
          },
          feedback: function() {
          	var value = this.value.current;
          	if(this.snap && this.steps > 1) {
          		value = this.getClosestSteps(value);
          	}
          	if(!this.groupCompare(value, this.value.prev)) {
                  if(typeof(this.animationCallback) === 'function') {
          			this.animationCallback(value[0], value[1]);
          		}
          		this.groupCopy(this.value.prev, value);
          	}
          },
          result: function() {
              if(typeof(this.callback) == 'function') {
          		this.callback(this.value.target[0], this.value.target[1]);
          	}
          },
          animate: function(direct, first) {
          	if(direct && !this.dragging) {
          		return;
          	}
          	if(this.dragging) {
          		var prevTarget = this.groupClone(this.value.target);
  	
          		var offset = [
          			Cursor.x - this.offset.wrapper[0] - this.offset.mouse[0],
          			Cursor.y - this.offset.wrapper[1] - this.offset.mouse[1]
          		];
          		this.setTargetOffset(offset, this.loose);
  	
          		this.change = [
          			this.value.target[0] - prevTarget[0],
          			this.value.target[1] - prevTarget[1]
          		];
          	}
          	if(this.dragging || first) {
          		this.groupCopy(this.value.current, this.value.target);
          	}
          	if(this.dragging || this.glide() || first) {
          		this.update();
          		this.feedback();
          	}
          },
          glide: function() {
          	var diff = [
          		this.value.target[0] - this.value.current[0],
          		this.value.target[1] - this.value.current[1]
          	];
          	if(!diff[0] && !diff[1]) {
          		return false;
          	}
          	if(Math.abs(diff[0]) > this.bounds.xStep || Math.abs(diff[1]) > this.bounds.yStep) {
          		this.value.current[0] += diff[0] * this.speed;
          		this.value.current[1] += diff[1] * this.speed;
          	} else {
          		this.groupCopy(this.value.current, this.value.target);
          	}
          	return true;
          },
          update: function() {
          	if(!this.snap) {
          		this.offset.current = this.getOffsetsByRatios(this.value.current);
          	} else {
          		this.offset.current = this.getOffsetsByRatios(
          			this.getClosestSteps(this.value.current)
          		);
          	}
          	this.show();
          },
          show: function() {
          	if(!this.groupCompare(this.offset.current, this.offset.prev)) {
          		if(this.horizontal) {
          			this.handle.style.left = String(this.offset.current[0]) + 'px';
          		}
          		if(this.vertical) {
          			this.handle.style.top = String(this.offset.current[1]) + 'px';
          		}
          		this.groupCopy(this.offset.prev, this.offset.current);
          	}
          },
          setTargetValue: function(value, loose) {
          	var target = loose ? this.getLooseValue(value) : this.getProperValue(value);
  
          	this.groupCopy(this.value.target, target);
          	this.offset.target = this.getOffsetsByRatios(target);
          },
          setTargetOffset: function(offset, loose) {
          	var value = this.getRatiosByOffsets(offset);
          	var target = loose ? this.getLooseValue(value) : this.getProperValue(value);
  
          	this.groupCopy(this.value.target, target);
          	this.offset.target = this.getOffsetsByRatios(target);
          },
          getLooseValue: function(value) {
          	var proper = this.getProperValue(value);
          	return [
          		proper[0] + ((value[0] - proper[0]) / 4),
          		proper[1] + ((value[1] - proper[1]) / 4)
          	];
          },
          getProperValue: function(value) {
          	var proper = this.groupClone(value);
  
          	proper[0] = Math.max(proper[0], 0);
          	proper[1] = Math.max(proper[1], 0);
          	proper[0] = Math.min(proper[0], 1);
          	proper[1] = Math.min(proper[1], 1);
  
          	if((!this.dragging && !this.tapping) || this.snap) {
          		if(this.steps > 1) {
          			proper = this.getClosestSteps(proper);
          		}
          	}
          	return proper;
          },
          getRatiosByOffsets: function(group) {
          	return [
          		this.getRatioByOffset(group[0], this.bounds.xRange, this.bounds.x0),
          		this.getRatioByOffset(group[1], this.bounds.yRange, this.bounds.y0)
          	];
          },
          getRatioByOffset: function(offset, range, padding) {
          	return range ? (offset - padding) / range : 0;
          },
          getOffsetsByRatios: function(group) {
          	return [
          		this.getOffsetByRatio(group[0], this.bounds.xRange, this.bounds.x0),
          		this.getOffsetByRatio(group[1], this.bounds.yRange, this.bounds.y0)
          	];
          },
          getOffsetByRatio: function(ratio, range, padding) {
          	return Math.round(ratio * range) + padding;
          },
          getClosestSteps: function(group) {
          	return [
          		this.getClosestStep(group[0]),
          		this.getClosestStep(group[1])
          	];
          },
          getClosestStep: function(value) {
          	var k = 0;
          	var min = 1;
              for(var i = 0; i <= this.steps - 1; i++) {
          		if(Math.abs(this.stepRatios[i] - value) < min) {
          			min = Math.abs(this.stepRatios[i] - value);
          			k = i;
          		}
          	}
          	return this.stepRatios[k];
          },
          groupCompare: function(a, b) {
              return a[0] === b[0] && a[1] === b[1];
          },
          groupCopy: function(a, b) {
          	a[0] = b[0];
          	a[1] = b[1];
          },
          groupClone: function(a) {
          	return [a[0], a[1]];
          },
          preventDefaults: function(e, selection) {
          	if(!e){
          		e = window.event;
          	}
          	if(e.preventDefault) {
          		e.preventDefault();
          	}
          	e.returnValue = false;
  
          	if(selection && document.selection) {
          		document.selection.empty();
          	}
          },
          cancelEvent: function(e) {
          	if(!e) {
          		e = window.event;
          	}
          	if(e.stopPropagation) {
          		e.stopPropagation();
          	}
          	e.cancelBubble = true;
          }
      };
  
      function dragdealer(wrapper, options) {
          return new Dragdealer(wrapper, options);
      }
  
  context['dragdealer'] = dragdealer;
  }(this);

  provide("ender-dragdealer", module.exports);

  !function ($) {
  
      $.ender({
        dragdealer: dragdealer
      }, true);
  
  }(ender);

}();