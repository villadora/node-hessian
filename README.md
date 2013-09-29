# Node Hessian Proxy

<!--[![Build Status](https://travis-ci.org/villadora/project?branch=master)](https://travis-ci.org/villadora/project)-->

## Installation

    npm install hessian-proxy

## Usage

``` js
var Proxy = require('hessian-proxy').Proxy;

var proxy = new Proxy('http://example.com/test', username, password, proxy);

proxy.invoke(methodName, [arg1, arg2, arg3..]);


```


## Reference

Notice: There are _some_ mistakes in the document and make a lot of confuse when writing protocol according to spec, especially  when doing test and just find test docs are not correct for some arguments values.

[Hessian 1.0 Spec](http://hessian.caucho.com/doc/hessian-1.0-spec.xtp)

[Hessian 2.0 Serialization](http://hessian.caucho.com/doc/hessian-serialization.html)

[Hessian 2.0 Web Service Protocol](http://hessian.caucho.com/doc/hessian-ws.html)

[Hessian Test](http://javadoc4.caucho.com/com/caucho/hessian/test/TestHessian2.html)

## License

(The BSD License)

    Copyright (c) 2013, Villa.Gao <jky239@gmail.com>;
    All rights reserved.
