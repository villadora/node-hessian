# Node Hessian Proxy

RPC Proxy support hessian 2.0 protocol, with fully tested via test service in [http://hessian.caucho.com/test/test2](http://hessian.caucho.com/test/test2)

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


```



## Support Value Types

### Binary

Binary will be represented by _Buffer_ in node js.

### Boolean

_true_ or _false_

### Date

Represented as _Date_ type.

### Double

In javascript, all double are numbers and represented via 64-bit double. so they will not be sent as 32-bit float, but it can receive 32-bit float as double

### Int

Just as normal int.

### List

Arrays will be sent as list, typed list need to add a property '__type__' to the array.
Typed List will have type in '__type__' property.

### Long

use _Long.js_ to handle long value.

### Map

If you don't care about key type, all the keys will be string. the normal Object will be treated as a map. If you want to parse/send maps that use objects as key. You have to expose a ES6 standard _Map_ Class to global namespace.

And typed Map will have type in '__mapType__' property.

For example:
```js
global.Map = require('es6-map-shim').Map;
```

### Ref

The proxy will take the job for you if the objects are equal via strict equal '===='.

### Object

To send Object, objects must have a type in '__type__' property. Otherwise, it will be send as a map.

### Null

Just as null.


### See _test/test2.js_ to get more examples how to use specific type.


## Reference

Notice: There are _some_ mistakes in the document and make a lot of confuse when writing protocol according to spec, especially when doing test and just find test docs are not correct for some arguments values.

[Hessian 2.0 Serialization](http://hessian.caucho.com/doc/hessian-serialization.html)

[Hessian 2.0 Web Service Protocol](http://hessian.caucho.com/doc/hessian-ws.html)

[Hessian Test](http://javadoc4.caucho.com/com/caucho/hessian/test/TestHessian2.html)

[Hessian 1.0 Spec](http://hessian.caucho.com/doc/hessian-1.0-spec.xtp)

## License

(The BSD License)

    Copyright (c) 2013, Villa.Gao <jky239@gmail.com>;
    All rights reserved.
