var BufferBuilder = require('buffer-builder'),
    Long = require('long');

function Writer(initial) {
    this.builder = new BufferBuilder(initial);
}

Writer.prototype.writeCall = function(method, args) {
    this.builder.appendString('H');
    this.builder.appendBuffer(new Buffer([2, 0]));
    this.builder.appendString('C');

    this.writeString(method);

    this.writeInt(args.length);

    if (args) {
        for (var i = 0, len = args.length; i < len; ++i) {
            this.write(args[i]);
        }
    }

    //    this.builder.appendString('z');
    return this;

};

Writer.prototype.getBuffer = function() {
    return this.builder.get();
};

Writer.prototype.write = function(data, type) {
    if (data === null) {
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
    }

    return this;
};

Writer.prototype.writeString = function(val) {
    if (val.length < 32) {
        this.writeInt(val.length);
        this.builder.appendString(val);
    } else {
        // TODO: 
        throw new Error('Not Implemented Yet');
    }
};


Writer.prototype.writeString = function(str) {

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
    this.builder.appendString('I');
    this.builder.appendInt32BE(data);
    return this;
};

Writer.prototype.writeLong = function(data) {
    var high = data.high,
        low = data.low;
    if (data instanceof Long) {
        high = data.getHighBits();
        low = data.getLowBitsUnsigned();
    }

    this.builder.appendString('L');
    this.builder.appendInt32BE(high);
    this.builder.appendUInt32BE(low);
    return this;
};


Writer.prototype.writeDouble = function(data) {
    this.builder.appendString('D');
    this.builder.appendDoubleLE(data);
    return this;
};

function isInt(data) {
    return typeof data === 'number' && parseFloat(data) === parseInt(data, 10) && !isNaN(data);
}

function isFloat(data) {
    return typeof data === 'number' && parseFloat(data) !== parseInt(data, 10) && !isNaN(data);
}


module.exports = Writer;