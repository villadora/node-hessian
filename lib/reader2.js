var assert = require('assert'),
    BufferReader = require('buffer-reader'),
    Reader1 = require('./reader');


function Reader() {
    this.reader = new BufferReader(new Buffer(0));
}

Reader.prototype.parse = function(data) {
    this.res = data;
    this.reader.append(data);

    var code = this.reader.nextString(1);

    if (code === 'H') {
        this.reader.move(2); // skip version header
    } else if (code === 'r') {
        // reply-1.0
        this.data = new Reader1().parse(data).getData();
        return this;
    }



    this.data = this.readContent();
    return this;
};


Reader.prototype.readContent = function() {
    var code = this.reader.nextString(1);
    this.reader.move(-1);
    switch (code) {
        case 'R':
            return this.readReply();
        case 'F':
            return this.readFault();
        case 'E':
            return this.readEnvelope();
    }
    return this.readPacket();
};

Reader.prototype.readEnvelope = function() {

};


Reader.prototype.readFault = function() {
    // skip Map Identity 'H'
    this.reader.move(1);
    this.readMap();
    return this.res.toString();
};

Reader.prototype.readPacket = function() {

};

Reader.prototype.readReply = function() {
    var r = this.reader.nextString(1);
    assert(r === 'R', "Expect Reply start with 'R', but receive: '" + r + "'");
    return this.readObject();
};



Reader.prototype.readObject = function() {
    var code = this.reader.nextUInt8();
    this.reader.move(-1);
    switch (code) {
        case 0x40:
        case 0x45:
        case 0x47:
        case 0x50:
            // reserved
            break;
        case 0x41:
        case 0x42:
            return this.readBinary();
        case 0x43:
            return this.readObjectTypeDef();
        case 0x44:
            return this.readDouble();
        case 0x46:
            return false;
        case 0x48:
            // untyped map 'H'
        case 0x4d:
            // map with type 'M'
            break;
        case 0x49:
            return this.readInt();
        case 0x4a:
        case 0x4b:
            return this.readDate();
        case 0x4c:
            return this.readLong();
        case 0x4e:
            return null; // NULL
        case 0x4f:
            // Object instance
            break;
        case 0x51:
            // reference 'Q'
            break;
        case 0x52:
        case 0x53:
            return this.readString();
        case 0x54:
            return true;
        case 0x55:
            // variable-length list/vector 'U'
        case 0x56:
            // fixed length list/vector 'V'
        case 0x57:
            // variable-length utyped list/vector  'W'
        case 0x58:
            // fixed-length untyped list/vector 'X'
            break;
        case 0x59:
            // Long encoded as 32-bit int 'Y'
            return this.readLong();
        case 0x5a:
            // list/map terminator 'Z'
            break;
        case 0x5b:
            return 0.0;
        case 0x5c:
            return 1.0;
        case 0x5d:
        case 0x5e:
        case 0x5f:
            return this.readDouble();
    }

    if (code >= 0x0 && code <= 0x1f)
        return this.readString();
    else if (code >= 0x20 && code <= 0x2f)
        return this.readBinary();
    else if (code >= 0x30 && code <= 0x33)
        return this.readString();
    else if (code >= 0x34 && code <= 0x37)
        return this.readBinary();
    else if (code >= 0x38 && code <= 0x3f)
    // three-octet compact long
        return this.readLong();
    else if (code >= 0x60 && code <= 0x6f)
    // object with direct type
        return 'type';
    else if (code >= 0x70 && code <= 0x77)
    // fixed list with direct length
        return 'no';
    else if (code >= 0x78 && code <= 0x7f)
    // fixed untyped list with direct length;
        return 'list';
    else if (code >= 0x80 && code <= 0xbf) {
        return code - 0x90;
    } else if ((code >= 0xc0 && code <= 0xcf) || (code >= 0xd0 && code <= 0xd7)) {
        return this.readInt();
    } else if (code >= 0xd8 && code <= 0xef)
    // one-octet compact long
        return this.readLong();
    else if (code >= 0xf0 && code <= 0xff)
    // two-octet compact long
        return this.readLong();

    return 'object';
};


Reader.prototype.readInt = function() {
    var code = this.reader.nextUInt8();
    if (code >= 0x80 && code <= 0xbf)
        return code - 0x90;
    else if (code >= 0xc0 && code <= 0xcf) {
        return ((code - 0xc8) << 8) | (this.reader.nextUInt8());
    } else if (code >= 0xd0 && code <= 0xd7) {
        return ((code - 0xd4) << 16) | (this.reader.nextUInt8() << 8) | (this.reader.nextUInt8());
    } else {
        assert(code === 0x49, "Expect 'I' but see: " + String.fromCharCode(code));
        return this.reader.nextInt32BE();
    }
};

Reader.prototype.readObjectTypeDef = function() {
    return 'objectType';
};


Reader.prototype.readString = function() {
    return 'string';
};

Reader.prototype.readLong = function() {
    var code = this.reader.nextUInt8();
    if (code >= 0xd8 && code <= 0xef)
        return code - 0xe0;
    else if (code >= 0xf0 && code <= 0xff) {
        return ((code - 0xf8) << 8) | this.reader.nextUInt8();
    } else if (code >= 0x38 && code <= 0x3f) {
        return ((code - 0x3c) << 16) | (this.reader.nextUInt8() << 8) | this.reader.nextUInt8();
    } else if (code === 0x59) {
        return this.reader.nextInt32BE();
    } else if (code === 0x4c) {
        var high = this.reader.nextInt32BE(),
            low = this.reader.nextInt32BE();
        return {
            high: high,
            low: low
        };
    }
};

Reader.prototype.readDate = function() {
    var code = this.reader.nextUInt8();
    if (code == 0x4a) {
        var high = this.reader.nextInt32BE(),
            low = this.reader.nextInt32BE(),
            l = new Long(low, high);

        return new Date(l.toNumber);
    } else if (code == 0x4b) {
        var min = this.reader.nextInt32BE();
        return new Date(min * 60 * 1000);
    }
};

Reader.prototype.readMap = function() {
    return 'map';
};

Reader.prototype.readDouble = function() {
    var code = this.reader.nextUInt8();
    if (code === 0x5b)
        return 0.0;
    else if (code === 0x5c)
        return 1.0;
    else if (code === 0x5d)
        return this.reader.nextInt8();
    else if (code === 0x5e)
        return this.reader.nextInt16BE();
    else if (code === 0x5f)
        return this.reader.nextFloatBE();
    else if (code === 0x44) {
        console.log('!');
        return this.reader.nextDoubleBE();
    }
};

Reader.prototype.readBinary = function() {
    return 'binary';
};

Reader.prototype.getData = function() {
    return this.data;
};

module.exports = Reader;