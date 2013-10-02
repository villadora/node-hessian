# Node Hessian Proxy

RPC Proxy support hessian 2.0 protocol, with fully tested via test service in [http://hessian.caucho.com/test/test2](http://hessian.caucho.com/test/test2)


I couldn't not find a stable hessian 1.0 protocol test service. so 1.0 is not fully implmented yet.


[![Build Status](https://travis-ci.org/villadora/node-hessian.png?branch=master)](https://travis-ci.org/villadora/node-hessian)

## Installation

    npm install hessian-proxy

## Usage

``` js
var Proxy = require('hessian-proxy').Proxy;

var proxy = new Proxy('http://example.com/test', username, password, proxy);

proxy.invoke(methodName, [arg1, arg2, arg3..], function(err, reply) {
    // ... do with reply
});

// use writer2
var Writer = require('hessian-proxy').Writer2; // for hessian2.0

var writer = new Writer();
writer.writeCall(method, [arg1, arg2…]);

var buffer = writer.getBuffer();

// use reader2
var Reader = require('hessian-proxy').Reader2; // for hessian2.0

var reader = new Reader();
var data = reader.readRPCMessage(buffer).getData();



```



## Support Value Types

### Binary

Binary will be represented by _Buffer_ in node js.

### Boolean

_true_ or _false_

### Date

Represented as _Date_ type.

### Double

In javascript, all double are numbers and represented via 64-bit double. so it will not be able to write a 32-bit float format, but it can read 32-bit float as double.


### Int

Just as normal int.

### List

Arrays will be sent as list, typed list need to add a property '__type__' to the array.
Typed List will have type in '__type__' property.

``` js
// untyped list
var list = [1,2,3];

// typed list
var list = ['a', 'b', 'c'];
list.__type__ = '[string';
```

### Long

use [Long.js](https://npmjs.org/package/long) to handle long value.

``` js
var Long = require('long');

var long = new Long(low, high);

// or 
var long = { low: lowbit, high: highbit };
```


### Map

If you don't care about key type, all the keys will be string. the normal Object will be treated as a map. If you want to parse/send maps that use objects as key. You have to expose a ES6 standard _Map_ Class to global namespace.

And typed Map will have type in '__mapType__' property.

For example:
```js
global.Map = require('es6-map-shim').Map;
```

```js
// normal untyped map, all the key will be string
var map = {  
	1: 1,
	'a': 0, 
	'b': 2
};

// normal typed map
var map = {  
    'a': 0, 
    'b': 1
};

map.__mapType__ = 'java.util.Hashtable';

// es6 Map, object can be used as key
var map = new Map();
map.set(['a'], 0);
map.set('b', 1);
map.set(true, 'true');

// add type
map.__mapType__ = 'java.util.Hashtable';

```

### Ref

The proxy will take the job for you if the objects are equal via strict equal '===='.


### Object

To send Object, objects must have a type in '__type__' property. Otherwise, it will be send as a map.

```js
var obj = {
    'value': 0,
    'next': 1
};

obj.__type__ = 'com.test.TestObject';

```

### Null

Just as null.


### Web Service

For webservice support call, reply, fault. packet+ and envelope+ current are not supported yet.


###### See _[test/test2.js](./test/test2.js)_ to get more examples how to use specific type.


## Reference

[Hessian 2.0 Serialization](http://hessian.caucho.com/doc/hessian-serialization.html)

[Hessian 2.0 Web Service Protocol](http://hessian.caucho.com/doc/hessian-ws.html)

[Hessian Test](http://javadoc4.caucho.com/com/caucho/hessian/test/TestHessian2.html)

[Hessian 1.0 Spec](http://hessian.caucho.com/doc/hessian-1.0-spec.xtp)

Notice: There are _some_ mistakes in the document and make a lot of confuse when writing protocol according to spec, especially when doing test and just find test docs are not correct for some arguments values.


## License

(The BSD License)

    Copyright (c) 2013, Villa.Gao <jky239@gmail.com>;
    All rights reserved.
