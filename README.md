# Modulator.JS

Script rústico que complemente o define las funciones `require`, `requirejs` o `define`.

## Modo de Uso

Se recomienda que el archivo sea leído de **modo asíncrona**.

```
<script>
var Modulator = {
    // Datos de configuración básica
};
</script>
<script src="modulator.js" async></script>
```

## Datos de configuración básica

Los datos con los que cuenta los datos que se puede asignar a la variable *Modulator* son los mismos atributos que cuenta la función

## Atríbutos de función `Modulator`

#### Modulator`.config`

Opciones de configuración

Opción | Tipo | Default | Descripción
---|---|---|---
xhtml | Boolean | false | Si los nodes serán generados como XHTML
scriptType | String | text/javascript | Tipo de los nodes JS
styleType | String | text/css | Tipo de los nodes CSS
charset | String | utf-8 | Charset aplicado para los nodes
async | Boolean | true | Si el node será ejecutado de modo `async`

#### Modulator`.paths`

Array que contiene los archivos CSS, JS y las Dependencias de los plugins mas comunes.

1. Asignación simple de módulo<br>Por defecto se asigna el archivo js al plugin
```
'jQuery' : 'https://code.jquery.com/jquery-3.3.1.min.js'
```

2. Asignación múltiple de módulo<br>Se puede cargar varios archivos JS a un mismo módulo<br><small>(El primer define anónimo asignará el SCRIPT al plugin)</small>
```
'jQuery' : [
    'https://code.jquery.com/jquery-3.3.1.slim.min.js',
    'https://code.jquery.com/ui/1.12.1/jquery-ui.min.js'
]
```

3. Asignación compleja de módulo<br>Se puede asignar dependencias así como archivos CSS y JS a un mismo módulo<br><small>(El primer define anónimo asignará el SCRIPT al plugin)</small>
```
'bootstrap' : {
    deps : [
        'jQuery', 
        'https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.3/umd/popper.min.js'
    ],
    css  : 'https://stackpath.bootstrapcdn.com/bootstrap/4.1.3/css/bootstrap.min.css',
    js   : [
        'https://stackpath.bootstrapcdn.com/bootstrap/4.1.3/js/bootstrap.min.js'
    ]
}
```

#### Modulator`.baseLoad`

Array de Plugins leído por defecto cuando finalice la carga asíncrona del script

```
modulator.baseLoad = [
    'jQuery', 
    'bootstrap'
];
```

#### Modulator`.baseLoaded`

Función a ejecutar cuando se completa la lectura de los plugins `modulator.baseLoad`

```
modulator.baseLoaded = function(){};
```


## Formas de Uso

La función utiliza los `Promise` por tanto se puede complementar funciones `then`, `catch` y `finaly` usables por defecto de los `Promise`, adicionalmente se pueden usar `do`, `done`, `fail`, `always`.

La función puede ser ejecutada como `Modulator(deps, callback, errback)` así como `Using(...)`, `require(...)` y `requirejs(...)`

```
Using('jquery')
.do(function($){
    $('body').ready(function(){
        
    });
})
```

```
Using('jquery')
.then(function($){
    $('body').ready(function(){
        
    });
})
.catch(function(){
    alert('no se logró procesar los plugins');
})
```

```
require(['jquery', 'bootstrap'], function($){
    $('body').ready(function(){
        
    });
})
```

Se puede ejecutar un define anónimo lo cual sirve como una función más si el define no ha sido ejecutado desde un archivo script.

```
define('MyPlugin', ['jquery'], function($){
    $('body').ready(function(){
        
    });
})
```
