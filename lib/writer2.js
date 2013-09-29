var assert = require('assert'),
    BufferBuilder = require('buffer-builder'),
    Long = require('long');

function Writer(initial) {
    this.builder = new BufferBuilder(initial);
}

Writer.prototype.writeCall = function(method, args) {
    args = args || [];

    this.builder.appendString('H');
    this.builder.appendUInt16BE(0x0200);
    this.builder.appendString('C');

    this.writeString(method);

    this.writeInt(args.length);

    if (args) {
        for (var i = 0, len = args.length; i < len; ++i) {
            var arg = args[i];
            if (arg && arg.type)
                this.write(arg.val, arg.type);
            else
                this.write(args[i]);
        }
    }

    return this;

};

Writer.prototype.getBuffer = function() {
    return this.builder.get();
};

Writer.prototype.write = function(data, type) {
    if (type)
        this['write' + cap(type)](data);
    else if (data === null) {
        this.writeNull(data);
    } else if (typeof data === 'boolean') {
        this.writeBoolean(data);
    } else if (typeof data === "string") {
        this.writeString(data);
    } else if (isInt(data)) {
        this.writeInt(data);
    } else if (data instanceof Long || isInt(data.high) && isInt(data.low)) {
        this.writeLong(data);
    } else if (isFloat(data)) {
        this.writeDouble(data);
    } else if (data instanceof Date) {
        this.writeDate(data);
    } else if (data instanceof Buffer) {
        this.writeBinary(data);
    }

    return this;
};

Writer.prototype.writeString = function(val) {
    if (val.length < 32) {
        this.builder.appendUInt8(val.length);
        if (val.length)
            this.builder.appendString(val);
    } else if (val.length < 1024) {
        var hd = val.length + 0x3000;
        this.builder.appendUInt16BE(hd);
        this.builder.appendString(val);
    } else if (val.length < 0xffff) {
        this.builder.appendString('S');
        this.builder.appendUInt16BE(val.length);
        this.builder.appendString(val);
    } else {
        var len = 0xffff;
        this.builder.appendString('R');
        this.builder.appendUInt16BE(len);
        this.builder.appendString(val.substring(0, len));
        this.writeString(val.substring(len));
    }
    return this;
};


Writer.prototype.writeNull = function() {
    this.builder.appendString('N');
    return this;
};

Writer.prototype.writeBoolean = function(data) {
    this.builder.appendString(data ? new Buffer('T') : new Buffer('F'));
    return this;
};

Writer.prototype.writeInt = function(data) {
    // http://hessian.caucho.com/doc/hessian-serialization.html##int
    if (data >= -16 && data <= 47) {
        this.builder.appendUInt8(data + 0x90);
    } else if (data >= -2048 && data <= 2047) {
        this.builder.appendUInt8((data + 0xc800) >> 8);
        this.builder.appendUInt8(data & 0xff);
    } else if (data >= -262144 && data <= 262143) {
        this.builder.appendUInt8((data + 0xd40000) >> 16);
        this.builder.appendUInt8((data & 0xff00) >> 8);
        this.builder.appendUInt8(data & 0xff);
    } else {
        this.builder.appendString('I');
        this.builder.appendInt32BE(data);
    }
    return this;
};

Writer.prototype.writeLong = function(data) {
    var high = data.high,
        low = data.low,
        useHigh = true;
    if (data instanceof Long) {
        high = data.getHighBits() & 0xffffffff;
        low = data.getLowBits() & 0xffffffff;
    }

    if ((high === 0 && low >= 0) || (high === -1 && low < 0))
        useHigh = false;


    if (!useHigh && low >= -8 && low <= 15)
        this.builder.appendUInt8((low & 0xff) + 0xe0);
    else if (!useHigh && low >= -2048 && low <= 2047) {
        this.builder.appendUInt8((low + 0xf800) >> 8);
        this.builder.appendUInt8(low & 0xff);
    } else if (!useHigh && low >= -262144 && low <= 262143) {
        this.builder.appendUInt8((low + 0x3c0000) >> 16);
        this.builder.appendUInt8((low & 0xff00) >> 8);
        this.builder.appendUInt8(low & 0xff);
    } else if (!useHigh) {
        this.builder.appendUInt8(0x59);
        this.builder.appendInt32BE(low);
    } else {
        this.builder.appendString('L');
        this.builder.appendInt32BE(high);
        this.builder.appendUInt32BE(low);
    }
    return this;
};


Writer.prototype.writeDouble = function(data) {
    if (data === 0.0)
        this.builder.appendUInt8(0x5b);
    else if (data == 1.0)
        this.builder.appendUInt8(0x5c);
    else if (parseInt(data, 10) === parseFloat(data, 10) && data >= -128 && data <= 127) {
        this.builder.appendUInt8(0x5d);
        this.builder.appendInt8(parseInt(data, 10));
    } else if (parseInt(data, 10) === parseFloat(data, 10) && data >= -32768 && data <= 32767) {
        this.builder.appendUInt8(0x5e);
        this.builder.appendInt16BE(parseInt(data, 10));
    } else {
        // no easy way to compare float and double in javascript, as all the float-number are 64-bit representate
        // so the 4-octet double is not usefull here
        this.builder.appendString('D');
        this.builder.appendDoubleBE(data);
    }
    return this;
};


Writer.prototype.writeDate = function(data) {
    var timestamp = data.getTime();
    if (timestamp % 60000 === 0) {
        // compact in minutes
        this.builder.appendUInt8(0x4b);
        this.builder.appendInt32BE(timestamp / 60000);
    } else {
        this.builder.appendUInt8(0x4a);
        var ts = Long.fromNumber(timestamp);
        this.builder.appendInt32BE(ts.getHighBits());
        this.builder.appendInt32BE(ts.getLowBits());
    }
    return this;
};

Writer.prototype.writeBinary = function(data) {
    assert(Buffer.isBuffer(data), 'Argument must be a Buffer');
    var len = data.length;
    if (len < 16) {
        this.builder.appendUInt8(len + 0x20);
        this.builder.appendBuffer(data);
    } else if (len < 1024) {
        this.builder.appendUInt16BE(len + 0x3400);
        this.builder.appendBuffer(data);
    } else if (len < 0xffff) {
        this.builder.appendString('B');
        this.builder.appendUInt16BE(len);
        this.builder.appendBuffer(data);
    } else {
        var len = 0xffff;
        this.builder.appendString('A');
        this.builder.appendUInt16BE(len);
        this.builder.appendString(data.slice(0, len));
        this.writeBinary(data.slice(len));
    }
    return this;
};

function isInt(data) {
    return typeof data === 'number' && parseFloat(data) === parseInt(data, 10) && !isNaN(data);
}

function isFloat(data) {
    return typeof data === 'number' && parseFloat(data) !== parseInt(data, 10) && !isNaN(data);
}

function cap(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = Writer;