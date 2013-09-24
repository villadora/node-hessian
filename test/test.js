var assert = require('chai').assert,
    hessian = require('../lib'),
    Proxy = hessian.Proxy;


describe('test.js', function() {
    describe('hessian 1.0 test', function() {
        var proxy;
        before(function() {
            proxy = new Proxy('http://hessian.caucho.com/test/test');
        });

        it('methodNull', function(done) {
            proxy.call('methodNull', [], function(err, res) {
                console.log(res);
                done(err);
            });
        });

        it('replyNull', function(done) {
            proxy.call('replyNull', null, function(err, res) {
                console.log(res);
                done(err);
            });
        });

        it('argNull', function(done) {
            proxy.call('argNull', [null], function(err, res) {
                console.log(res);
                done(err);
            });
        });
    });
});