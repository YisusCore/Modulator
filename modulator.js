var require, requirejs, define, Promise;

;(function(){
	'use strict';
	
//	var log = console.log;
	
	var cnf = {};
	if (typeof window.Modulator !== 'undefined')
	{
		cnf = window.Modulator;
	}
	
	var op = Object.prototype,
		os = op.toString;
	
	function isArray(e)
	{
		return os.call(e) === '[object Array]';
	}
	
	function isString(e)
	{
		return os.call(e) === '[object String]';
	}
	
	function isFunction(e)
	{
		return os.call(e) === '[object Function]';
	}
	
	function isObject(e)
	{
		return os.call(e) === '[object Object]';
	}
	
	function each(arr, callback)
	{
		var i;
		
		if (isArray(arr))
		{
			for (i = 0; i < arr.length; i += 1)
			{
				if (arr[i] && callback(arr[i], i, arr))
				{
					break;
				}
			}
		}
		else
		{
			for (i in arr)
			{
				if (arr[i] && callback(arr[i], i, arr))
				{
					break;
				}
			}
		}
    }
	
	function extend (arr, arr2)
	{
		var ret = arr;
		
        each(arr2, function(v,k){
			if (isArray(v) || isObject(v))
			{
				if (typeof ret[k] === 'undefined')
				{
					ret[k] = v;
				}
				
				ret[k] = extend(ret[k], v);
				return;
			}
			
			ret[k] = v;
		});
		
		return ret;
    }
	
	function timestamp()
	{
		return (new Date()).getTime();
	}
	
	var noop = function(){};
	
	var _do = function Do (callback)
	{
		this.then(callback);
		return this;
	};
	
	var _then = function Then (callback, errback)
	{
		this.promise.then(callback);
		
		if (isFunction(errback))
		{
			this.promise.catch(errback);
		}
	
		return this;
	};
	
	var _then2 = function Then (callback, errback)
	{
		this.promise.then(function(callback){
			return function(args)
			{
				if (isArray(args))
				{
					callback.apply(null, args);
				}
				else
				{
					callback(args);
				}
			};
		}(callback));
		
		if (isFunction(errback))
		{
			this.promise.catch(errback);
		}
	
		return this;
	};
	
	var _catch = function Catch (errback)
	{
		this.promise.catch(errback);
		return this;
	};
	
	var _finally = function Finally (callback)
	{
		this.promise.finally(callback);
		return this;
	};
	
	var modulator;
	var wUsed, awaiting = window.ModulatorAwaitings = [];
	
	var createNodeCSS = function () {
        var node = modulator.config.xhtml ?
                document.createElementNS('http://www.w3.org/1999/xhtml', 'html:link') :
                document.createElement('link');
		
        node.rel = 'stylesheet';
        node.type = modulator.config.styleType;
        node.charset = modulator.config.charset;
        node.async = modulator.config.async;
		
        return node;
    };
	
	var createNodeJS = function () {
        var node = modulator.config.xhtml ?
                document.createElementNS('http://www.w3.org/1999/xhtml', 'html:script') :
                document.createElement('script');
		
        node.type = modulator.config.scriptType;
        node.charset = modulator.config.charset;
        node.async = modulator.config.async;
		
        return node;
    };
	
	var scripts = window.ModulatorScripts = {},
		nodes = window.ModulatorNodes = {}
	;
	
	var instantDefine;
	
	var awaiter = function(){
		var ins = 0;
		
		var ModulatorAwaiter = function ModulatorAwaiter (v)
		{
			this.ins = ++ins;
			var that  = this;
			
			if (typeof awaiting[v] === 'undefined')
			{
				awaiting[v] = this;
			}
			
			this.promise = new Promise(function(resolve, reject){
				that.resolve = resolve;
				that.reject = reject;
			});
		};
		
		ModulatorAwaiter.prototype = {
			do      : _do,
			done    : _do,
			then    : _then2,
			catch   : _catch,
			error   : _catch,
			finally : _finally,
			always  : _finally,
		};
		
		return ModulatorAwaiter;
	}();
	
	var node = function(){
		var ModulatorNode = function ModulatorNode (v, type, lnk, install)
		{
			if (typeof install === 'undefined')
			{
				install = true;
			}
			
			var that  = this;
			
			that.startat = timestamp();
			that.endat = null;
			
			this.promise = new Promise(function(resolve, reject){
				var node;
				
				if (/\.css$/gi.test(v) && type !== 'css')
				{
					type = 'css';
				}
				
				if (/\.js$/gi.test(v) && type !== 'js')
				{
					type = 'js';
				}
				
				if (type === 'css')
				{
					node = createNodeCSS(v);
				}
				else
				{
					node = createNodeJS(v);
					instantDefine = lnk;
				}
				
				node.setAttribute('data-module', lnk);
				node.load_evt = function(e){
					that.endat = timestamp();
					that.timer = (that.endat - that.startat) / 1000; // seconds
					
			//		delete that.startat;
					delete that.endat;

					resolve(node, e);
				};
				node.error_evt = function(){
					that.endat = timestamp();
					that.timer = (that.endat - that.startat) / 1000; // seconds
					
			//		delete that.startat;
					delete that.endat;

					reject();
				};
				
				try
				{
					node.attachEvent('onreadystatechange', node.load_evt);
				}catch(e){}
				
				try
				{
					node.addEventListener('load', node.load_evt, false);
					node.addEventListener('error', node.error_evt, false);
				}catch(e){}
				
				if ( ! (/^http(s){0,1}\:\/\//gi.test(v)))
				{
					v = modulator.config.base + v;
				}
				
				if (type === 'css')
				{
					node.href = v;
				}
				else
				{
					node.src = v;
				}
				
				if ( ! install)
				{
					that.install = function(){
						that.startat = timestamp();
						document.getElementsByTagName('body')[0].appendChild(node);
						that.install = noop;
					};
					return;
				}
				
				document.getElementsByTagName('body')[0].appendChild(node);
			});
		};
		
		ModulatorNode.prototype = {
			do      : _do,
			done    : _do,
			then    : _then,
			catch   : _catch,
			error   : _catch,
			finally : _finally,
			always  : _finally,
			install : noop
		};
		
		return ModulatorNode;
	}();
	
	var script = function(){
		var ModulatorScript = function ModulatorScript (lnk, SCRIPT, DEPS, fDef)
		{
			if (typeof fDef === 'undefined')
			{
				fDef = false;
			}
			
			var that  = this;
			that.SCRIPT = undefined;
			that.promise = undefined;
			that.startat = timestamp();
			that.endat = null;

			that.lnk = lnk;
			
			if (lnk !== null && lnk.trim().length > 0 && typeof scripts[lnk] === 'undefined')
			{
				scripts[lnk] = that;
			}
			
			if (lnk !== null && lnk.trim().length > 0 && typeof awaiting[lnk] === 'undefined')
			{
				awaiting[lnk] = new awaiter(lnk);
			}
			
			that.mns = lnk;

			var lnk2;
			if (/^http(s){0,1}\:/gi.test(that.mns))
			{
				lnk2 = that.mns.split('/').pop();
				if (lnk2 !== that.mns)
				{
					scripts[lnk2] = scripts[lnk];
					
					if (typeof awaiting[lnk2] !== 'undefined')
					{
						awaiting[lnk].then(function(v){
							awaiting[lnk2].resolve(v);
						});
					}
			
					awaiting[lnk2] = awaiting[lnk];
				}
				that.mns = lnk2;
			}
			
			if (/(\.min)?\.js$/gi.test(that.mns))
			{
				lnk2 = that.mns.replace(/(\.min)?\.js$/gi, '');
				if (lnk2 !== that.mns)
				{
					scripts[lnk2] = scripts[lnk];
					
					if (typeof awaiting[lnk2] !== 'undefined')
					{
						awaiting[lnk].then(function(v){
							awaiting[lnk2].resolve(v);
						});
					}
			
					awaiting[lnk2] = awaiting[lnk];
				}
				that.mns = lnk2;
			}
			
			this.promise = new Promise(function(resolve, reject){
				that.resolve = resolve;
				that.reject = reject;
				
				var deps = that.deps = (DEPS || []),
					js   = that.js = [],
					css  = that.css = []
				;
				
				if (typeof SCRIPT !== 'undefined')
				{
					if (deps.length > 0)
					{
						new loader(deps)
							.then(function(){
								that.setScript(SCRIPT, fDef);
							
								if (typeof awaiting[that.lnk] !== 'undefined')
								{
									awaiting[that.lnk].resolve(that.lnk);
								}

								that.endat = timestamp();
								that.timer = (that.endat - that.startat) / 1000; // seconds

			//					delete that.startat;
								delete that.endat;

								that.resolve(that.lnk);
							})
							.catch(function(){that.reject();})
						;
					}
					else
					{
						setTimeout(function(){
							that.setScript(SCRIPT, fDef);
							
							if (typeof awaiting[that.lnk] !== 'undefined')
							{
								awaiting[that.lnk].resolve(that.lnk);
							}

							that.endat = timestamp();
							that.timer = (that.endat - that.startat) / 1000; // seconds

			//				delete that.startat;
							delete that.endat;

							that.resolve(that.lnk);
						}, 4);
					}
					return;
				}
				
				if (typeof modulator.paths[that.lnk] !== 'undefined')
				{
					var pt = modulator.paths[that.lnk];
					
					while (isString(pt) && typeof modulator.paths[pt] !== 'undefined')
					{
						// es un aliases
						scripts[pt] = that;
						pt = modulator.paths[pt];
					}
					
					if (isString(pt))
					{
						js.push(pt);
					}
					else if (isArray(pt))
					{
						js = pt;
					}
					else if (isObject(pt))
					{
						if (typeof pt.deps !== 'undefined')
						{
							if (isString(pt.deps))
							{
								pt.deps = [pt.deps];
							}
							
							extend(deps, pt.deps);
						}
						
						if (typeof pt.css !== 'undefined')
						{
							if (isString(pt.css))
							{
								pt.css = [pt.css];
							}
							
							extend(css, pt.css);
						}
						
						if (typeof pt.js !== 'undefined')
						{
							if (isString(pt.js))
							{
								pt.js = [pt.js];
							}
							
							extend(js, pt.js);
						}
					}
				
				}
				else
				{
					js.push(that.lnk);
				}
				
				if (deps.length > 0)
				{
					new loader(deps)
						.then(function(){that.download();})
						.catch(function(){that.reject();})
					;
				}
				else
				{
					setTimeout(function(){that.download();}, 4);
				}
			});
		};
		
		var resolver = function(node, o)
		{
			o.processed++;
			
			try
			{
				node.detachEvent('onreadystatechange', node.load_evt);
			}catch(e){}
			
			try
			{
				node.removeEventListener('load', node.load_evt);
				node.removeEventListener('error', node.error_evt);
			}catch(e){}
			
			delete node.load_evt;
			delete node.error_evt;
			
			if (o.processed > 0 && o.processed === o.toProcess)
			{
				o.tmo = setTimeout(function(){
					clearTimeout(o.tmo);
					delete o.tmo;
					
					awaiting[o.lnk].resolve(o.lnk);
					
					o.endat = timestamp();
					o.timer = (o.endat - o.startat) / 1000; // seconds

			//		delete o.startat;
					delete o.endat;

					o.resolve(o.lnk);
				}, 200);
			}
		};
		
		var rejector = function(o)
		{
			o.reject();
		};
		
		ModulatorScript.prototype = {
			setScript : function(SCRIPT, tryF)
			{
				if (typeof tryF === 'undefined')
				{
					tryF = true;
				}
				
				try
				{
					if ( ! tryF)
					{
						throw tryF;
					}
					
					var loaded = [];
					
					each(this.deps, function(v){
						var SCRIPT = isFunction(v) ? v : scripts[v].SCRIPT;
						loaded.push(SCRIPT);
					});
					
					loaded.push(this);
					
					var SCRIPT2 = SCRIPT.apply(null, loaded);
					SCRIPT = SCRIPT2;
				}
				catch(e){}

				this.SCRIPT = SCRIPT;
				
				if (this.lnk === null || this.lnk.trim().length === 0)
				{
					if (typeof this.tmo !== 'undefined')
					{
						clearTimeout(this.tmo);
						delete this.tmo;
						
						this.endat = timestamp();
						this.timer = (this.endat - this.startat) / 1000; // seconds

			//			delete this.startat;
						delete this.endat;

						this.resolve(this.lnk);
					}
					
					return;
				}
				
				if (typeof scripts[this.lnk] === 'undefined')
				{
					scripts[this.lnk] = this;
				}
				
				var that = scripts[this.lnk];
				
				if (that !== this)
				{
					that.SCRIPT = SCRIPT;
				}
				
				if (typeof window[this.lnk] === 'undefined')
				{
					window[this.lnk] = scripts[this.lnk].SCRIPT;
				}
				
				if (typeof window[this.mns] === 'undefined')
				{
					window[this.mns] = scripts[this.mns].SCRIPT;
				}
				
				if (typeof that.tmo !== 'undefined')
				{
					clearTimeout(that.tmo);
					delete that.tmo;
					
					awaiting[that.lnk].resolve(that.lnk);
					
					that.endat = timestamp();
					that.timer = (this.endat - this.startat) / 1000; // seconds

			//		delete that.startat;
					delete that.endat;

					that.resolve(that.lnk);
					
				}
				
				if (instantDefine === this.lnk)
				{
					instantDefine = undefined;
				}
				
				return this;
			},
			
			download : function()
			{
				//all dependencies was downloaded
				
				var that = this;
				that.toProcess = 0;
				that.processed = 0;
				
				var css = this.css;
				that.toProcess += css.length;
				
				var js = this.js;
				that.toProcess += js.length;

				each(css, function(v){
					if (typeof nodes[v] === 'undefined')
					{
						nodes[v] = new node(v, 'css', that.lnk);
					}
					
					nodes[v]
						.then(function(e){
							resolver(e, that);
						})
						.catch(function(){
							rejector(that);
						})
					;
				});
				
				var fn = undefined, 
					ln = undefined;
				
				each(js, function(v){
					if (typeof nodes[v] === 'undefined')
					{
						nodes[v] = new node(v, 'js', that.lnk, false);
					}

					nodes[v]
						.then(function(e){resolver(e, that);})
						.catch(function(){rejector(that);})
					;
					
					if (typeof ln !== 'undefined')
					{
						ln.then(function(){
							nodes[v].install()
						})
					}
					
					if (typeof fn === 'undefined')
					{
						fn = nodes[v];
					}
					
					ln = nodes[v];
				});
				
				if (typeof fn !== 'undefined')
				{
					fn.install();
				}
				
				this.download = noop;
			},
			
			do      : _do,
			done    : _do,
			then    : _then,
			catch   : _catch,
			error   : _catch,
			finally : _finally,
			always  : _finally,
		};
		
		return ModulatorScript;
	}();
	
	var loader = function()
	{
		//Procesador de dependencias
		
		var ModulatorLoader = function ModulatorLoader(toload){
			if (isString(toload))
			{
				toload = [toload];
			}
			
			var that = this;
			
			that.startat = timestamp();
			that.endat = null;
			that.toload = toload;
			that.loaded = [];
			
			that.promise = new Promise(function(resolve, reject){
				that.resolve = resolve;
				that.reject = reject;
				
				if (toload.length === 0)
				{
					resolve();
					return;
				}
				
				each(toload, function(v){
					if (isFunction(v))
					{
						return that.loader(v);
					}
					
					if (typeof scripts[v] === 'undefined')
					{
						new script(v);
					}

					scripts[v]
						.then(function(v){that.loader(v);})
						.catch(function(){that.loader(v);})
					;
				});
			});
			
			return this;
		};
		
		ModulatorLoader.prototype = {
			do      : _do,
			done    : _do,
			then    : _then2,
			catch   : _catch,
			error   : _catch,
			finally : _finally,
			always  : _finally,
			
			loader   : function(v){
				this.loaded.push(v);
				
				if (this.loaded.length >= this.toload.length)
				{
					var that = this;
					that.endat = timestamp();
					that.timer = (that.endat - that.startat) / 1000; // seconds
					
//					delete that.startat;
					delete that.endat;
					
					setTimeout(function(){
						var loaded = [];

						each(that.toload, function(v){
							var SCRIPT = isFunction(v) ? v : scripts[v].SCRIPT;
							
							loaded.push(SCRIPT);
						});
						
						loaded.push(that);
						
						that.resolve(loaded);
					}, 4);
				}
			}
		};
		
		return ModulatorLoader;
	}();
	
	modulator = window.Modulator = window.Using = function Modulator(deps, callback, errback)
	{
		if (isFunction(deps))
		{
			errback = callback;
			callback = deps;
			deps = undefined;
		}
		
		if ( ! isFunction(callback))
		{
			callback = noop;
		}
		
		if ( ! isFunction(errback))
		{
			errback = noop;
		}
		
		if (isString(deps) && deps.trim().length > 0)
		{
			deps = [deps];
		}
		
		if ( ! isArray(deps))
		{
			deps = [];
		}
		
		return new loader(deps)
			.then(callback)
			.catch(errback)
		;
	};
	
	modulator.prototype = {
		
	};
	
	var base = document.getElementsByTagName('base');
	if (base.length > 0)
	{
		base = base[0].href;
	}
	else
	{
		base = location.href;
	}
	
	modulator.config = {
		xhtml : false,
		scriptType : 'text/javascript',
		styleType : 'text/css',
		charset : 'utf-8',
		async : true,
		base : base
	};
	
	modulator.paths = {
		'jQuery' : 'https://code.jquery.com/jquery-3.3.1.min.js',
		'jQuery.slim' : 'https://code.jquery.com/jquery-3.3.1.slim.min.js',
		'jQuery.ui' : 'https://code.jquery.com/ui/1.12.1/jquery-ui.min.js',
		'Popper' : 'https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.3/umd/popper.min.js',
		'bootstrap' : {
			deps : ['jQuery', 'Popper'],
			css  : 'https://stackpath.bootstrapcdn.com/bootstrap/4.1.3/css/bootstrap.min.css',
			js   : 'https://stackpath.bootstrapcdn.com/bootstrap/4.1.3/js/bootstrap.min.js'
		},
		
		'jquery' : 'jQuery',
		'popper.js' : 'Popper',
	};
	
	modulator.baseLoad = [
//		'jQuery', 
//		'bootstrap'
	];
	modulator.baseLoaded = noop;
	
	extend(modulator, cnf);
	
	wUsed = window.WhenUsed = function(){
		var ModulatorWhenUsed = function ModulatorWhenUsed(deps, callback)
		{
			if (isString(deps) && deps.trim().length > 0)
			{
				deps = [deps];
			}

			if ( ! isFunction(callback))
			{
				callback = noop;
			}

			if ( ! isArray(deps))
			{
				deps = [];
			}

			if (deps.length === 0)
			{
				throw "Sin dependencias";
			}

			var that = this;

			that.promise = new Promise(function(resolve){
				that.startat = timestamp();
				that.endat = null;
				that.toload = deps;
				that.loaded = [];

				that.loader = function(v) {
					that.loaded.push(v);

					if (that.loaded.length >= that.toload.length)
					{
						that.endat = timestamp();
						that.timer = (that.endat - that.startat) / 1000; // seconds

//						delete that.startat;
						delete that.endat;

						setTimeout(function(){
							var loaded = [];

							each(that.toload, function(v){
								var SCRIPT = isFunction(v) ? v : scripts[v].SCRIPT;

								loaded.push(SCRIPT);
							});

							loaded.push(that);

							resolve(loaded);
						}, 4);
					}
				};
			}).then(callback);

			each(deps, function(v){
				if (typeof awaiting[v] === 'undefined')
				{
					awaiting[v] = new awaiter(v);
				}

				awaiting[v].then(function(){
					that.loader(v);
				});
			});
		};
		
		ModulatorWhenUsed.prototype = {
			do      : _do,
			done    : _do,
			then    : _then2,
			catch   : _catch,
			error   : _catch,
			finally : _finally,
			always  : _finally
		};
		
		return function WhenUsed(deps, callback)
		{
			return new ModulatorWhenUsed(deps, callback);
		};
	}();
	
	new script('require', modulator);
	new script('exports', function(mod){
		if (typeof mod.exports === 'undefined')
		{
			mod.exports = {};
		}
		
		return function(){
			console.log(arguments, 'aun en desarrollo');
		};
	});
	
	if ( ! require)
	{
		require = modulator;
	}
	
	if ( ! requirejs)
	{
		requirejs = modulator;
	}
	
	var commentRegExp = /\/\*[\s\S]*?\*\/|([^:"'=]|^)\/\/.*$/mg,
        cjsRequireRegExp = /[^.]\s*require\s*\(\s*["']([^'"\s]+)["']\s*\)/g
	;
	
	if ( ! define)
	{
		define = function ModulatorDefine(name, deps, callback)
		{
			//Allow for anonymous modules
			if (typeof name !== 'string') {
				//Adjust args appropriately
				callback = deps;
				deps = name;
				name = null;
			}
			
			//This module may not have dependencies
			if (!isArray(deps)) {
				callback = deps;
				deps = [];
			}

			if (deps.length === 0 && isFunction(callback))
			{
				//Remove comments from the callback string,
				//look for require calls, and pull them into the dependencies,
				//but only if there are function args.
				if (callback.length) {
					callback
						.toString()
						.replace(commentRegExp, function(match, singlePrefix){return singlePrefix || '';})
						.replace(cjsRequireRegExp, function (match, dep) {deps.push(dep);})
					;

					//May be a CommonJS thing even without require calls, but still
					//could use exports, and module. Avoid doing exports and module
					//work though if it just needs require.
					//REQUIRES the function to expect the CommonJS variables in the
					//order listed below.
					deps = (callback.length === 1 ? ['require'] : ['require', 'exports']).concat(deps);
				}
			}

			if (name === null && typeof instantDefine !== 'undefined')
			{
				name = instantDefine;
			}
			
			new script(name, callback, deps, true)
			.then(function(v){
				for(var plg in modulator.paths)
				{
					var ref = modulator.paths[plg];

					if (isString(plg) && plg === v)
					{
						var sc = scripts[ref];
						if (typeof sc !== 'undefined' && ! sc.SCRIPT)
						{
							//buscar algun plugin que hay dependido
							sc.setScript(scripts[v].SCRIPT, false);
						}
					}
				}
			})
			;
		};

		define.amd = {};
	}
	
	modulator(modulator.baseLoad, modulator.baseLoaded);
}());
