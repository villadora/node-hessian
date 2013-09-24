"use strict";

var url = require('url'),
    util = require('util'),
    events = require('events'),
    assert = require('assert'),
    Writer = require('./writer'),
    Reader = require('./reader');

function Proxy(uri, username, password, proxy) {
    events.EventEmitter.call(this);
    var parsed = url.parse(uri);

    this.protocol = parsed.protocol.replace(/:$/g, '');
    this.hostname = parsed.hostname;
    this.port = parsed.port;
    this.pathname = parsed.pathname;

    this.username = username;
    this.password = password;

    assert((this.protocol == 'http' || this.protocol == 'https'), 'Unsupported Hessian protocal: ' + this.protocol);

    this.proxy = proxy;
}

util.inherits(Proxy, events.EventEmitter);


Proxy.prototype.call = function(method, args, callback) {
    var data = new Writer().writeCall(method, args).getBuffer(),
        options = {
            hostname: this.hostname,
            port: this.port,
            path: this.pathname,
            headers: {
                'Content-Type': 'application/binary'
            },
            method: 'POST'
        };

    if (this.username) {
        options.auth = {
            user: this.username,
            pass: this.password,
            sendImmediately: true
        };
    }

    var req = require(this.protocol).request(options, function(res) {
        var reply = res.body,
            reader = new Reader();
        console.log('status: ', res.statusCode);
        console.log('headers: ', JSON.stringify(res.headers));

        var data = '';
        res.on('data', function(chunk) {
            data += chunk;
        });

        res.on('end', function() {
            try {
                if (res.statusCode !== 200) {
                    callback(data);
                } else
                    callback(null, reader.parse(data).getData());
            } catch (e) {
                callback(e);
            }
        });
    });

    req.write(data);
    req.end();

};

module.exports = Proxy;