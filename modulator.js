var require, requirejs, define, Promise;

;(function(){
	'use strict';
	
	/**
	 * Helpers
	 */
	var os = Object.prototype.toString;
	
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
	
	/**
	 * Promise Default Functions
	 */
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
	
	
	/**
	 * If variable exists, so this will be asumed as config array
	 */
	var cnf = {};
	if (typeof window.Modulator !== 'undefined' && isObject(window.Modulator))
	{
		cnf = window.Modulator;
	}
	
	
	/**
	 * Default Variables
	 */
	var modulator, // función require, Using, Modulator
		wUsed // función WhenUsed
	;
	
	var awaiting = window.ModulatorAwaitings = [], // Contiene todos los promise que se ejecutan cuando la librería ha sido iniciada
		scripts = window.ModulatorScripts = {}, // Contiene todos las librerías junto con su SCRIPT
		nodes = window.ModulatorNodes = {} // Contiene todos los nodes leídos 
	;
	
	var instantDefine; // Para una definición de SCRIPT de librería inmediata
	
	/**
	 * Node Helpers
	 */
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
	
	/**
	 * Prototypes
	 */
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
		var ModulatorNode = function ModulatorNode (v, lnk)
		{
			var that  = this;
			
			that.startat = timestamp();
			that.endat = null;
			
			this.promise = new Promise(function(resolve, reject){
				var css = /\.css$/gi.test(v);
				
				if ( ! (/^http(s){0,1}\:\/\//gi.test(v)))
				{
					v = modulator.config.base + v;
				}
				
				that.load_evt = function(e){
					that.endat = timestamp();
					that.timer = (that.endat - that.startat) / 1000; // seconds

					delete that.endat;

					resolve([that, e]);
				};
				
				that.error_evt = function(){
					that.endat = timestamp();
					that.timer = (that.endat - that.startat) / 1000; // seconds

					delete that.endat;

					reject([that]);
				};
				
				if (css)
				{
					var node;
				
					node = createNodeCSS(v);
					node.setAttribute('data-module', lnk);
					
					try
					{
						node.attachEvent('onreadystatechange', that.load_evt);
					}catch(e){}

					try
					{
						node.addEventListener('load', that.load_evt, false);
						node.addEventListener('error', that.error_evt, false);
					}catch(e){}
					
					node.href = v;
					
					that.install = function AsyncInstall()
					{
						that.startat = timestamp();
						document.getElementsByTagName('body')[0].appendChild(node);
						that.install = noop;
					};
					
					return;
				}
				
				
				var xmlhttp = new XMLHttpRequest();
				xmlhttp.onreadystatechange = function() {
					if (xmlhttp.readyState === XMLHttpRequest.DONE)
					{   // XMLHttpRequest.DONE == 4
					   if (xmlhttp.status === 200)
					   {
						   instantDefine = lnk;
						   eval(xmlhttp.responseText);
						   
						   that.load_evt();
					   }
					   else
					   {
						  that.error_evt();
					   }
					}
				};

				xmlhttp.open("GET", v, true);
				
				that.install = function AsyncInstall()
				{
					that.startat = timestamp();
					xmlhttp.send();
					that.install = noop;
				};
				return;
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
	
	var script = window.ModulatorScript = function(){
		var ModulatorScript = function ModulatorScript (lnk, DEPS, ascript)
		{
			var that  = this;
			
			that.SCRIPT = undefined;
			that.promise = undefined;
			that.startat = timestamp();
			that.endat = null;

			that.lnk = lnk;
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
			
			that.promise = new Promise(function(resolve, reject){
				that.resolve = resolve;
				that.reject = reject;
				
				var deps = that.deps = (DEPS || []),
					files  = that.files = []
				;
				
				if (typeof modulator.paths[that.lnk.toLowerCase()] !== 'undefined')
				{
					that.lnk = that.lnk.toLowerCase();
				}
				
				if (typeof modulator.paths[that.lnk] !== 'undefined')
				{
					var pt = modulator.paths[that.lnk];
					
					if (isString(pt))
					{
						files.push(pt);
					}
					else if (isArray(pt))
					{
						each(pt, function(l){
							files.push(l);
						});
					}
					else if (isObject(pt))
					{
						pt = JSON.parse(JSON.stringify(pt));
						
						if (typeof pt.deps !== 'undefined')
						{
							if (isString(pt.deps))
							{
								pt.deps = [pt.deps];
							}
							
							extend(deps, pt.deps);
							delete pt.deps;
						}
						
						if (typeof pt.css !== 'undefined')
						{
							if (isString(pt.css))
							{
								pt.css = [pt.css];
							}

							each(pt.css, function(l){
								files.push(l);
							});
							
							delete pt.css;
						}

						if (typeof pt.js !== 'undefined')
						{
							if (isString(pt.js))
							{
								pt.js = [pt.js];
							}
							
							each(pt.js, function(l){
								files.push(l);
							});
							
							delete pt.js;
						}
						
						if (typeof pt.files !== 'undefined')
						{
							if (isString(pt.files))
							{
								pt.files = [pt.files];
							}
							
							each(pt.files, function(l){
								files.push(l);
							});
							
							delete pt.files;
						}
						
						each(pt, function(file){
							files.push(file);
						});
					}
				}
				else if (typeof ascript === 'undefined' || ascript === false)
				{
					files.push(that.lnk);
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

					setTimeout(function(){
						o.resolve(o.lnk);
					}, 10);
				}, 100);
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
					window[this.mns] = scripts[this.lnk].SCRIPT;
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
				
				var files = this.files;
				that.toProcess += files.length;

				var fn,
					ln;

				each(files, function(v){
					if (typeof nodes[v] === 'undefined')
					{
						nodes[v] = new node(v, that.lnk);
					}
					
					if (ln)
					{
						ln.then(function(){
							nodes[v].install();
						});
					}
					
					ln = nodes[v];
					
					if ( ! fn)
					{
						fn = ln;
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
				
				if (fn)
				{
					fn.install();
				}
				
				that.download = noop;
			},
			
			do      : _do,
			done    : _do,
			then    : _then,
			catch   : _catch,
			error   : _catch,
			finally : _finally,
			always  : _finally,
		};
		
		return function whitScript (v, DEPS, ascript){
			if (v === null || v.trim().length === 0)
			{
				return new loader(DEPS);
			}
			
			/**
			 * Obtener la verdadera librería y no el alias
			 */
			var lnk = v;
			if (typeof modulator.paths[lnk.toLowerCase()] !== 'undefined')
			{
				lnk = lnk.toLowerCase();
			}
			
			if (typeof modulator.paths[lnk] !== 'undefined')
			{
				var pt = modulator.paths[lnk];
				while (isString(pt) && typeof modulator.paths[pt] !== 'undefined')
				{
					// es un aliases
					lnk = pt;
					pt = modulator.paths[lnk];
				}
			}
			
			if (typeof scripts[lnk] === 'undefined')
			{
				if (typeof ascript === 'undefined')
				{
					ascript = false;
				}
				
				scripts[lnk] = new ModulatorScript(lnk, DEPS, ascript);
			}
						
			if (typeof awaiting[lnk] === 'undefined')
			{
				awaiting[lnk] = new awaiter(lnk);
			}
			
			if (typeof scripts[v] === 'undefined'){scripts[v] = scripts[lnk];}
			if (typeof awaiting[v] === 'undefined'){awaiting[v] = awaiting[lnk];}
			
			var lnk2 = v;
			if (typeof modulator.paths[lnk2.toLowerCase()] !== 'undefined'){lnk2 = lnk2.toLowerCase();}
			
			if (typeof modulator.paths[lnk2] !== 'undefined')
			{
				var pt = modulator.paths[lnk2];
				while (isString(pt) && typeof modulator.paths[pt] !== 'undefined')
				{
					// es un aliases
					lnk2 = pt;
					pt = modulator.paths[lnk2];
					
					if (typeof scripts[lnk2] === 'undefined'){scripts[lnk2] = scripts[lnk];}
					if (typeof awaiting[lnk2] === 'undefined'){awaiting[lnk2] = awaiting[lnk];}
				}
			}
			
			return scripts[lnk];
		};
	}();
	
	var ascript = function withAScript (v, DEPS)
	{
		return script(v, DEPS, true);
	}
	
	var loader = function()
	{
		//Procesador de dependencias
		
		var ModulatorLoader = function ModulatorLoader(toload, simple){
			if (isString(toload))
			{
				toload = [toload];
			}
			
			var that = this;
			
			that.startat = timestamp();
			that.endat = null;
			that.toload = toload;
			that.loaded = [];
			
			if (typeof simple !== 'undefined' && simple)
			{
				that.then = _then;
			}
			
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
					
					script(v)
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
	
	
	/**
	 * Función Modulator
	 * Retorna un loader (promise) de las dependencias
	 * Si las dependencias son leídas correctamente, ejecuta el callback, caso contrario ejecuta el errback
	 *
	 * @param Array|String deps Las dependencias a leer
	 * @param Function callback Función a ejecutar cuando se lee todas las dependencias de manera correcta
	 * @param Function errback Función a ejecutar si se produce un error al leer alguna dependncia
	 * @return ModulatorLoader (promise) instance
	 */
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
	
	modulator.prototype = {};
	
	
	/**
	 * Obteniendo el Base
	 */
	var base = document.getElementsByTagName('base');
	if (base.length > 0)
	{
		base = base[0].href;
	}
	else
	{
		base = location.href;
	}
	
	/**
	 * Definiendo la configuración básica
	 */
	modulator.config = {
		xhtml : false,
		scriptType : 'text/javascript',
		styleType : 'text/css',
		charset : 'utf-8',
		async : true,
		base : base
	};
	
	/**
	 * Definiendo los paths por defecto
	 * Este atributo contiene las rutas de las librerías por defecto que cuentan con una ruta definida
	 */
	modulator.paths = {
		'jquery'    : 'https://code.jquery.com/jquery-3.3.1.min.js',
		'jquery.ui' : 'https://code.jquery.com/ui/1.12.1/jquery-ui.min.js',
		'popper.js' : 'https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.3/umd/popper.min.js',
		'bootstrap' : {
			deps : ['jQuery', 'popper.js'],
			css  : 'https://stackpath.bootstrapcdn.com/bootstrap/4.1.3/css/bootstrap.min.css',
			js   : 'https://stackpath.bootstrapcdn.com/bootstrap/4.1.3/js/bootstrap.min.js'
		}
	};
	
	/**
	 * Definiendo los baseLoad por defecto
	 * Este atributo contiene las librerías que se desean leer por defecto apenas cargue el script
	 */
	modulator.baseLoad = [
//		'jQuery', 
//		'bootstrap'
	];
	
	/**
	 * Definiendo el baseLoaded por defecto
	 * Este atributo contiene la función a ejecutar cuando se lean las librerías en baseLoad
	 */
	modulator.baseLoaded = noop;
	
	/**
	 * Extendiendo la configuración por defecto
	 */
	extend(modulator, cnf);
	
	/**
	 * Función WhenUsed
	 * Permite ejecutar una función de manera inmediata cuando se lee correctamente una o mas librerías
	 */
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
	
	/**
	 * Registrando la función require
	 */
	ascript('require').setScript(modulator);
	
	/**
	 * Exports Function
	 */
	var exports = window.ModulatorExport = function ModulatorExport()
	{
		console.log(arguments, 'aun en desarrollo');
	};
	
	ascript('exports').setScript(function(mod){
		if (typeof mod.exports === 'undefined')
		{
			mod.exports = {};
		}
		
		return exports;
	});
	
	/**
	 * Si ya existe la función require es mejor que se quede la función nativa
	 */
	if ( ! require)
	{
		require = modulator;
	}
	
	/**
	 * Si ya existe la función requirejs es mejor que se quede la función nativa
	 */
	if ( ! requirejs)
	{
		requirejs = modulator;
	}
	
	/**
	 * Definiendo la funcion define en caso que no exista la función nativa
	 */
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
			
			new loader(deps, true)
			.then(function(args){
				ascript(name)
				.setScript(callback.apply(null, args), false);
			});
		};

		define.amd = {};
	}
	
	/**
	 * Leyendo las librerías de baseLoad y ejecutando la función baseLoaded
	 */
	modulator(modulator.baseLoad, modulator.baseLoaded);
}());
