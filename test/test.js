var assert = require('chai').assert,
    hessian = require('../lib'),
    Long = require('long'),
    Proxy = hessian.Proxy;


describe('hessian 1.0 test', function() {
    var proxy;
    before(function() {
        proxy = new Proxy('http://hessian.caucho.com/test/test');
        proxy.version = 1;
    });

    function MAKE_ARGTEST(method, args) {
        it(method, function(done) {
            proxy.invoke(method, args, function(err, res) {
                assert.isTrue(res);
                done(err);
            });
        });
    }

    it('methodNull', function(done) {
        proxy.invoke('methodNull', [], function(err, res) {
            assert.isNull(res);
            done(err);
        });
    });

    it('replyNull', function(done) {
        proxy.invoke('replyNull', null, function(err, res) {
            assert.isNull(res);
            done(err);
        });
    });



    MAKE_ARGTEST('argNull', [null]);
    MAKE_ARGTEST('argTrue', [true]);
    MAKE_ARGTEST('argFalse', [false]);

    describe.skip('test Date', function() {
        var dates = [new Date(0), new Date(1998, 4, 8, 7, 51), new Date(1998, 4, 8, 7, 51)];
        var method = 'argDate_1',
            arg = dates[1];

        it(method, function(done) {
            proxy.invoke(method, [arg], function(err, res) {
                console.log(res);
                done(err);
            });
        });

    });


    describe('test argInt', function() {

        function MAKE_ARGINT_TEST(val) {
            var arg = parseInt(val, 10),
                name = val;
            if (arg < 0)
                name = name.replace(/^./g, 'm');
            assert.isNumber(arg);
            MAKE_ARGTEST('argInt_' + name, [arg]);
        }

        MAKE_ARGINT_TEST('0');
        MAKE_ARGINT_TEST('1');
        MAKE_ARGINT_TEST('47');
        MAKE_ARGINT_TEST('-16');
        MAKE_ARGINT_TEST('0x30');
        MAKE_ARGINT_TEST('0x7ff');
        MAKE_ARGINT_TEST('-17');
        MAKE_ARGINT_TEST('-0x800');
        MAKE_ARGINT_TEST('0x800');
        MAKE_ARGINT_TEST('0x3ffff');
        MAKE_ARGINT_TEST('-0x801');
        MAKE_ARGINT_TEST('-0x40000');
        MAKE_ARGINT_TEST('0x40000');
        MAKE_ARGINT_TEST('0x7fffffff');
        MAKE_ARGINT_TEST('-0x40001');
        MAKE_ARGINT_TEST('-0x80000000');
    });


    describe('test argLong', function() {

        function MAKE_ARGLONG_TEST(name, low, high) {

            high = high || 0;
            var arg;
            if (low < 0 && high === 0) {
                var arg = Long.fromNumber(low);
            } else {
                var arg = {
                    high: high,
                    low: low
                };
            }

            MAKE_ARGTEST('argLong_' + name, [arg]);
        }


        MAKE_ARGLONG_TEST('0', 0);
        MAKE_ARGLONG_TEST('1', 1);
        MAKE_ARGLONG_TEST('15', 15);
        MAKE_ARGLONG_TEST('m8', -8);
        MAKE_ARGLONG_TEST('0x10', 0x10);
        MAKE_ARGLONG_TEST('0x7ff', 0x7ff);
        MAKE_ARGLONG_TEST('m9', -9);
        MAKE_ARGLONG_TEST('m0x800', -0x800);
        MAKE_ARGLONG_TEST('0x800', 0x800);
        MAKE_ARGLONG_TEST('0x3ffff', 0x3ffff);
        MAKE_ARGLONG_TEST('m0x801', -0x801);
        MAKE_ARGLONG_TEST('m0x40000', -0x40000);
        MAKE_ARGLONG_TEST('0x40000', 0x40000);
        MAKE_ARGLONG_TEST('0x7fffffff', 0x7fffffff);
        MAKE_ARGLONG_TEST('m0x40001', -0x40001);
        MAKE_ARGLONG_TEST('m0x80000000', -0x80000000);
        MAKE_ARGLONG_TEST('0x80000000', 0x80000000);
        MAKE_ARGLONG_TEST('m0x80000001', ~0x80000000, ~0x0); // 2-complement
    });


    describe('test argDouble', function() {

        function MAKE_ARGDBOULE_TEST(value) {
            var arg = parseFloat(value),
                name = value.replace(/\./g, '_');

            if (arg < 0)
                name = name.replace(/^./g, 'm');
            var buf = new Buffer(8);
            buf.writeDoubleBE(arg, 0);

            assert.isNumber(arg);
            // MAKE_ARGTEST('argDouble_' + name, [arg]);
            var method = 'argDouble_' + name;
            it(method, function(done) {
                proxy.invoke(method, [arg], function(err, res) {
                    // assert.isTrue(res);
                    if (res !== true)
                        console.log(res.toString());
                    done(err);
                });
            });
        }


        MAKE_ARGDBOULE_TEST('0.0');
        MAKE_ARGDBOULE_TEST('1.0');
        MAKE_ARGDBOULE_TEST('2.0');
        MAKE_ARGDBOULE_TEST('127.0');
        MAKE_ARGDBOULE_TEST('-128.0');
        MAKE_ARGDBOULE_TEST('128.0');
        MAKE_ARGDBOULE_TEST('-129.0');
        MAKE_ARGDBOULE_TEST('32767.0');
        MAKE_ARGDBOULE_TEST('-32768.0');
        MAKE_ARGDBOULE_TEST('0.001');
        MAKE_ARGDBOULE_TEST('-0.001');
        MAKE_ARGDBOULE_TEST('65.536');
        MAKE_ARGDBOULE_TEST('3.14159');
    });

});