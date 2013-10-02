"use strict";

var url = require('url'),
    util = require('util'),
    events = require('events'),
    assert = require('assert'),
    Writer = require('./writer'),
    Writer2 = require('./writer2'),
    Reader = require('./reader'),
    Reader2 = require('./reader2');


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
    this.version = 2;
    this.proxy = proxy;
}

util.inherits(Proxy, events.EventEmitter);


Proxy.prototype.invoke = function(method, args, callback) {

    var self = this,
        WriterClz = (this.version === 1) ? Writer : Writer2,
        ReaderClz = (this.version === 1) ? Reader : Reader2;

    var data = new WriterClz().writeCall(method, args).getBuffer(),
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
            reader = new ReaderClz();
        // console.log('status: ', res.statusCode);
        // console.log('headers: ', JSON.stringify(res.headers));

        var reply;
        res.on('data', function(chunk) {
            if (reply) reply = Buffer.concat([reply, chunk]);
            else
                reply = chunk;
        });

        res.on('end', function() {
            self.emit('reply', reply);
            try {
                if (res.statusCode !== 200) {
                    callback(reply);
                } else
                    callback(null, reader.readRPCMessage(reply).getData());
            } catch (e) {
                callback(e);
            }
        });
    });

    self.emit('call', data);
    req.write(data);
    req.end();

};

module.exports = Proxy;