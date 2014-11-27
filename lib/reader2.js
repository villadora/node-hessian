var assert = require('assert'),
    BufferReader = require('buffer-reader'),
    Long = require('long'),
    Reader1 = require('./reader');


function Reader() {
    this.reader = new BufferReader(new Buffer(0));
    this.classDefs = [];
    this.valueRefs = [];
    this.typeRefs = [];
}

Reader.prototype.appendData = function(data) {
    this.reader.append(data);
    return this;
};


Reader.prototype.readRPCMessage = function(data) {
    if (data)
        this.reader = new BufferReader(data);

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


Reader.prototype.readContent = function(data) {
    if (data)
        this.reader = new BufferReader(data);

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
    throw new Error('Evelope is not implmented yet');
};


Reader.prototype.readFault = function(data) {
    if (data)
        this.reader = new BufferReader(data);

    var r = this.reader.nextString(1);
    assert(r === 'F', "Expect fault start with 'P', but receive: '" + r + "'");
    
    return {
        fault: true,
        content: this.readMap()
    };
};

Reader.prototype.readPacket = function() {
    throw new Error('Packet is not implmented yet');
};

Reader.prototype.readReply = function(data) {
    if (data)
        this.reader = new BufferReader(data);

    var r = this.reader.nextString(1);
    assert(r === 'R', "Expect Reply start with 'R', but receive: '" + r + "'");
    return this.read();
};



Reader.prototype.read = function(data) {
    if (data)
        this.reader = new BufferReader(data);

    var code = this.reader.nextUInt8();
    switch (code) {
        case 0x46:
            return false;
        case 0x4e:
            return null; // NULL
        case 0x54:
            return true;
        case 0x5b:
            return 0.0;
        case 0x5c:
            return 1.0;
    }

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
            this.readClassDef();
            return this.read();
        case 0x44:
            return this.readDouble();
        case 0x48:
            // untyped map 'H'
        case 0x4d:
            // map with type 'M'
            return this.readMap();
        case 0x49:
            return this.readInt();
        case 0x4a:
        case 0x4b:
            return this.readDate();
        case 0x4c:
            return this.readLong();
        case 0x4f:
            // Object instance
            return this.readObject();
        case 0x51:
            // reference 'Q'
            return this.readRef();
        case 0x52:
        case 0x53:
            return this.readString();
        case 0x55:
            // variable-length list/vector ('U')
        case 0x56:
            // fixed length list/vector 'V'
        case 0x57:
            // variable-length utyped list/vector  'W'
        case 0x58:
            // fixed-length untyped list/vector 'X'
            return this.readList();
        case 0x59:
            // Long encoded as 32-bit int 'Y'
            return this.readLong();
        case 0x5a:
            // list/map terminator 'Z'
            break;
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
    else if (code >= 0x60 && code <= 0x6f) // object with direct type
        return this.readObject();
    else if (code >= 0x70 && code <= 0x77) // fixed list with direct length
        return this.readList();
    else if (code >= 0x78 && code <= 0x7f) // fixed untyped list with direct length;
        return this.readList();
    else if (code >= 0x80 && code <= 0xbf) {
        return this.readInt();
    } else if ((code >= 0xc0 && code <= 0xcf) || (code >= 0xd0 && code <= 0xd7)) {
        return this.readInt();
    } else if (code >= 0xd8 && code <= 0xef) // one-octet compact long
        return this.readLong();
    else if (code >= 0xf0 && code <= 0xff) // two-octet compact long
        return this.readLong();

    return;
};


Reader.prototype.readInt = function(data) {
    if (data)
        this.reader = new BufferReader(data);

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

Reader.prototype.readClassDef = function(data) {
    if (data)
        this.reader = new BufferReader(data);

    var code = this.reader.nextString(1);
    if (code === 'C') {
        var clzDef = {};
        clzDef.name = this.readString();
        var flen = this.readInt();
        clzDef.fields = [];
        for (var i = 0; i < flen; ++i) {
            clzDef.fields[i] = this.readString();
        }

        this.classDefs.push(clzDef);
        return clzDef;
    }
};


Reader.prototype.readString = function(data) {
    if (data)
        this.reader = new BufferReader(data);

    var code = this.reader.nextUInt8();
    if (code >= 0 && code < 32) {
        return this.reader.nextString(code);
    } else if (code >= 0x30 && code <= 0x33) {
        this.reader.move(-1);
        var len = this.reader.nextUInt16BE() - 0x3000;
        return this.reader.nextString(len);
    } else if (code === 0x53) {
        var len = this.reader.nextUInt16BE();
        return this.reader.nextString(len);
    } else if (code === 0x52) {
        var len = this.reader.nextUInt16BE();
        return this.reader.nextString(len) + this.readString();
    }
};

Reader.prototype.readLong = function(data) {
    if (data)
        this.reader = new BufferReader(data);

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

Reader.prototype.readDate = function(data) {
    if (data)
        this.reader = new BufferReader(data);

    var code = this.reader.nextUInt8();
    if (code == 0x4a) {
        var high = this.reader.nextInt32BE(),
            low = this.reader.nextInt32BE(),
            l = new Long(low, high);

        return new Date(l.toNumber());
    } else if (code == 0x4b) {
        var min = this.reader.nextInt32BE();
        return new Date(min * 60 * 1000);
    }
};

Reader.prototype.readList = function(data) {
    if (data)
        this.reader = new BufferReader(data);

    var code = this.reader.nextUInt8(),
        rs = [],
        type;


    if (code >= 0x70 && code <= 0x7f) {
        this.valueRefs.push(rs);
        var len = code - 0x78;
        if (code <= 0x77) {
            type = this.readType();
            Object.defineProperty(rs, "__type__", {value: type, enumerable : false});
            len += 0x8;
        }

        for (var i = 0; i < len; ++i)
            rs.push(this.read());

        return rs;
    } else if (code >= 0x55 && code <= 0x58) {
        this.valueRefs.push(rs);

        if (code === 0x55 || code === 0x56) {
            type = this.readType();
            Object.defineProperty(rs, "__type__", {value: type, enumerable : false});
        }


        if (code === 0x56 || code === 0x58) { // fixed-length
            var len = this.readInt();
            for (var i = 0; i < len; ++i)
                rs.push(this.read());
        } else if (code === 0x55 || code === 0x57) { // variable-length
            var tag = this.reader.nextString(1);
            while (tag !== 'Z') {
                this.reader.move(-1);
                rs.push(this.read());
                tag = this.reader.nextString(1);
            }
        }
        return rs;
    }
};


Reader.prototype.readMap = function(data) {
    if (data)
        this.reader = new BufferReader(data);

    var code = this.reader.nextString(1);
    if (code === 'H' || code === 'M') {
        var Map = global.Map,
            map;
        if (Map)
            map = new Map();
        else
            map = {};

        if (code === 'M') {
            var type = this.readType();
            map.__mapType__ = type;
        }

        this.valueRefs.push(map);

        var tag = this.reader.nextString(1);
        while (tag !== 'Z') {
            this.reader.move(-1);
            var key = this.read(),
                val = this.read();

            if (map.set)
                map.set(key, val);
            else
                map[key] = val;

            tag = this.reader.nextString(1);
        }

        return map;
    }
};

Reader.prototype.readDouble = function(data) {
    if (data)
        this.reader = new BufferReader(data);

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
        return this.reader.nextDoubleBE();
    }
};

Reader.prototype.readBinary = function(data) {
    if (data)
        this.reader = new BufferReader(data);

    var code = this.reader.nextUInt8();
    if (code >= 0x20 && code <= 0x2f) {
        return this.reader.nextBuffer(code - 0x20);
    } else if (code >= 0x34 && code <= 0x37) {
        var len = this.reader.move(-1).nextInt16BE() - 0x3400;
        return this.reader.nextBuffer(len);
    } else if (code === 0x42) {
        var len = this.reader.nextInt16BE();
        return this.reader.nextBuffer(len);
    } else if (code === 0x41) {
        var len = this.reader.nextInt16BE();
        return Buffer.concat([this.reader.nextBuffer(lene), this.readBinary()]);
    }
};

Reader.prototype.readObject = function(data) {
    if (data)
        this.reader = new BufferReader(data);

    var code = this.reader.nextUInt8(),
        defRef;
    if (code === 0x4f) {
        defRef = this.readInt();
    } else if (code >= 0x60 && code <= 0x6f) {
        defRef = code - 0x60;
    }

    if (defRef || defRef === 0) {
        assert(defRef >= 0 && defRef < this.classDefs.length, 'Ref to classDef that not exist.');
        var classDef = this.classDefs[defRef],
            fLen = classDef.fields.length,
            rs = {};

        this.valueRefs.push(rs); // push to valueRefs first, for circle reference to itself
        Object.defineProperty(rs, "__type__", {value: classDef.name, enumerable : false});
        for (var i = 0; i < fLen; ++i) {
            var field = classDef.fields[i],
                value = this.read();
            rs[field] = value;
        }

        return rs;
    }
};


Reader.prototype.readRef = function(data) {
    if (data)
        this.reader = new BufferReader(data);

    var code = this.reader.nextUInt8();
    if (code === 0x51) {
        var refId = this.readInt();
        assert(refId >= 0 && refId < this.valueRefs.length);
        return this.valueRefs[refId];
    }
};

Reader.prototype.readType = function(data) {
    if (data)
        this.reader = new BufferReader(data);

    var type = this.read();
    if (typeof type === 'string')
        this.typeRefs.push(type);
    else if (typeof type === 'number') {
        assert(type >= 0 && type < this.typeRefs.length, 'Reference to type that not exists');
        type = this.typeRefs[type];
    }
    return type;
};



Reader.prototype.getData = function() {
    return this.data;
};

module.exports = Reader;
