var assert = require('chai').assert,
    hessian = require('../lib'),
    Long = require('long'),
    Proxy = hessian.Proxy;

require('es6-map-shim');

describe('de/serialize', function() {
    var Reader = hessian.Reader2,
        Writer = hessian.Writer2;

    it('test de/serizlize', function() {
        var writer = new Writer();
        writer.write(null);
        writer.write(true);
        writer.write(false);

        var buf = writer.getBuffer();
        var reader = new Reader();
        reader.appendData(buf);
        assert.isNull(reader.read());
        assert.isTrue(reader.read());
        assert.isFalse(reader.read());
    });
});


describe('hessian 2.0 test', function() {
    this.timeout(10000);
    var proxy;
    before(function() {
        proxy = new Proxy('http://hessian.caucho.com/test/test2');
        proxy.on('call', function(data) {
            // console.log('call: ', data);
        });
        proxy.on('reply', function(data) {
            // console.log('reply:', data);
        });
    });


    it('methodNull', function(done) {
        proxy.invoke('methodNull', [], function(err, res) {
            assert.isNull(res);
            done(err);
        });
    });

    function MAKE_ARGTEST(method, args, as) {
        it(method, function(done) {
            proxy.invoke(method, args, function(err, res) {
                if (as) as(res);
                else assert.isTrue(res);
                done(err);
            });
        });
    }

    function MAKE_REPLYTEST(method, reply, as) {
        it(method, function(done) {
            proxy.invoke(method, [], function(err, res) {
                if (as) as(res, reply);
                else assert.strictEqual(res, reply);
                done(err);
            });
        });
    }


    describe('test Null|True|False', function() {

        MAKE_REPLYTEST('replyNull', null);
        MAKE_REPLYTEST('replyTrue', true);
        MAKE_REPLYTEST('replyFalse', false);


        MAKE_ARGTEST('argNull', [null]);
        MAKE_ARGTEST('argTrue', [true]);
        MAKE_ARGTEST('argFalse', [false]);
    });


    describe('test Map', function() {

        [0, 1, 2, 3].forEach(function(i) {
            MAKE_REPLYTEST('replyTypedMap_' + i, null, function(res) {
                assert.equal(res.__mapType__, 'java.util.Hashtable');
            });

            MAKE_REPLYTEST('replyUntypedMap_' + i, null, function(res) {
                if (i < 3) {
                    assert.lengthOf(res.keys(), i);
                } else {
                    assert.lengthOf(res.keys(), 1);
                }
            });
        });

        MAKE_ARGTEST('argUntypedMap_0', [{}]);
        MAKE_ARGTEST('argUntypedMap_1', [{
            'a': 0
        }]);

        var map = new Map();
        map.set(0, 'a');
        map.set(1, 'b');
        MAKE_ARGTEST('argUntypedMap_2', [map]);

        map = new Map();
        map.set(['a'], 0);
        MAKE_ARGTEST('argUntypedMap_3', [map]);



        var tmap = getHashtable();
        MAKE_ARGTEST('argTypedMap_0', [tmap]);

        tmap = getHashtable();
        tmap.a = 0;
        MAKE_ARGTEST('argTypedMap_1', [tmap]);

        tmap = getHashtable(new Map());
        tmap.set(0, 'a');
        tmap.set(1, 'b');
        MAKE_ARGTEST('argTypedMap_2', [tmap]);

        tmap = getHashtable(new Map());
        tmap.set(['a'], 0);
        MAKE_ARGTEST('argTypedMap_3', [tmap]);

        function getHashtable(map) {
            var map = map || {};
            map.__mapType__ = 'java.util.Hashtable';
            return map;
        }

    });

    describe('test List', function() {
        var list = [];
        [0, 1, 7, 8].forEach(function(len) {
            var list = [];
            for (var i = 0; i < len; ++i)
                list.push((i + 1) + '');

            MAKE_ARGTEST('argUntypedFixedList_' + len, [list]);

            var typedList = list.concat();
            typedList.__type__ = '[string';
            MAKE_ARGTEST('argTypedFixedList_' + len, [typedList]);
        });

    });


    describe('test Object', function() {
        MAKE_ARGTEST('argObject_0', [{
            __type__: 'com.caucho.hessian.test.A0'
        }]);

        MAKE_REPLYTEST('replyObject_0', null, function(res) {
            assert.equal(res.__type__, 'com.caucho.hessian.test.A0');
        });

        var testObject = 'com.caucho.hessian.test.TestObject';
        MAKE_ARGTEST('argObject_1', [{
            __type__: testObject,
            _value: 0
        }]);

        MAKE_REPLYTEST('replyObject_1', null, function(res) {
            assert.equal(res.__type__, testObject);
            assert.equal(res._value, 0);
        });


        MAKE_ARGTEST('argObject_2', [
            [{
                __type__: testObject,
                _value: 0
            }, {
                __type__: testObject,
                _value: 1
            }]
        ]);

        var obj = {
            __type__: testObject,
            _value: 0
        };

        MAKE_ARGTEST('argObject_2a', [
            [obj, obj]
        ]);

        MAKE_ARGTEST('argObject_2b', [
            [obj, {
                __type__: testObject,
                _value: 0
            }]
        ]);


        var cons = {
            __type__: 'com.caucho.hessian.test.TestCons',
            _first: 'a',
            _rest: null
        };

        cons._rest = cons;

        MAKE_ARGTEST('argObject_3', [cons]);

    });

    describe('test Date', function() {
        var dates = [new Date(0), new Date(Date.UTC(98, 4, 8, 9, 51, 31)), new Date(Date.UTC(98, 4, 8, 9, 51))];

        for (var i = 0; i < dates.length; ++i) {
            MAKE_ARGTEST('argDate_' + i, [dates[i]]);
            MAKE_REPLYTEST('replyDate_' + i, dates[i], function(res, reply) {
                assert.equal(res.getTime(), reply.getTime());
            });
        }
    });

    describe('test Binary', function() {
        var buf1023, ss = [];
        for (var i = 0; i < 16; i++) {
            ss.push("" + parseInt(i / 10, 10) + (i % 10) + " 456789012345678901234567890123456789012345678901234567890123\n");
        }

        buf1023 = new Buffer(ss.join('').substring(0, 1023));

        [new Buffer(0), new Buffer('012345678901234'),
            new Buffer('0123456789012345'),
            buf1023
        ].forEach(function(arg) {
            var len = arg.length;
            MAKE_ARGTEST('argBinary_' + len, [arg]);
            MAKE_REPLYTEST('replyBinary_' + len, arg, function(res) {
                assert.equal(res.length, len);
            });
        });
    });

    describe('test String', function() {
        [0, 1, 31, 32, 1023, 1024, 65536].forEach(function(length) {
            var str;

            if (length <= 32) {
                str = new Array(Math.ceil(length / 10)).join('0123456789');
                var rest = length % 10;
                for (var i = 0; i < rest; ++i) {
                    str += i + '';
                }
            } else if (length <= 1024) {
                var ss = [];
                for (var i = 0; i < 16; i++)
                    ss.push("" + parseInt(i / 10, 10) + (i % 10) + " 456789012345678901234567890123456789012345678901234567890123\n");

                str = ss.join('').substring(0, length);
            } else {
                var ss = [];
                for (var i = 0; i < 64 * 16; i++)
                    ss.push("" + parseInt(i / 100, 10) + (parseInt(i / 10, 10) % 10) + (i % 10) + " 56789012345678901234567890123456789012345678901234567890123\n");

                str = ss.join('').substring(0, length);
            }

            MAKE_ARGTEST('argString_' + length, [str]);
            MAKE_REPLYTEST('replyString_' + length, str);
        });
    });


    describe('test Int', function() {

        function MAKE_INT_TEST(val) {
            var arg = parseInt(val, /^-?0x/.test(val) ? 16 : 10),
                name = val;
            if (arg < 0)
                name = name.replace(/^./g, 'm');
            assert.isNumber(arg);
            MAKE_ARGTEST('argInt_' + name, [arg]);
            MAKE_REPLYTEST('replyInt_' + name, arg);
        }


        MAKE_INT_TEST('0');
        MAKE_INT_TEST('1');
        MAKE_INT_TEST('47');
        MAKE_INT_TEST('-16');
        MAKE_INT_TEST('0x30');
        MAKE_INT_TEST('0x7ff');
        MAKE_INT_TEST('-17');
        MAKE_INT_TEST('-0x800');
        MAKE_INT_TEST('0x800');
        MAKE_INT_TEST('0x3ffff');
        MAKE_INT_TEST('-0x801');
        MAKE_INT_TEST('-0x40000');
        MAKE_INT_TEST('0x40000');
        MAKE_INT_TEST('0x7fffffff');
        MAKE_INT_TEST('-0x40001');
        MAKE_INT_TEST('-0x80000000');
    });


    describe('test Long', function() {

        function MAKE_ARGLONG_TEST(name, low, high) {

            high = high || 0;
            var arg;
            if ((low > 0x7fffffff || low < 0) && high === 0) {
                arg = Long.fromNumber(low);
            } else {
                arg = {
                    high: high & 0xffffffff,
                    low: low & 0xffffffff
                };
            }
            var val;
            if (arg.hasOwnProperty('high'))
                val = new Long(arg.low, arg.high).toNumber();
            else
                val = arg.toNumber();


            MAKE_ARGTEST('argLong_' + name, [arg]);
            MAKE_REPLYTEST('replyLong_' + name, arg, function(res) {
                if (res.hasOwnProperty('high'))
                    res = new Long(res.low, res.high).toNumber();

                assert.equal(val, res);
            });
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
                proxy.invoke(method, [{
                    val: arg,
                    type: 'double'
                }], function(err, res) {
                    assert.isTrue(res);
                    done(err);
                });
            });

            it('replyDouble_' + name, function(done) {
                proxy.invoke('replyDouble_' + name, [], function(err, res) {
                    assert(res == arg);
                    done(err);
                });
            });
        }


        // MAKE_ARGDBOULE_TEST('0.0');
        // MAKE_ARGDBOULE_TEST('1.0');
        // MAKE_ARGDBOULE_TEST('2.0');
        // MAKE_ARGDBOULE_TEST('127.0');
        // MAKE_ARGDBOULE_TEST('-128.0');
        // MAKE_ARGDBOULE_TEST('128.0');
        // MAKE_ARGDBOULE_TEST('-129.0');
        // MAKE_ARGDBOULE_TEST('32767.0');
        // MAKE_ARGDBOULE_TEST('-32768.0');
        MAKE_ARGDBOULE_TEST('3.14159');
    });


});