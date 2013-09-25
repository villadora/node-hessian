var assert = require('assert'),
    BufferReader = require('buffer-reader');

function Reader() {
    this.reader = new BufferReader(new Buffer(0));
}

Reader.prototype.parse = function(data) {
    console.log(data.toString());
    this.res = data;
    this.reader.append(data);
    var r = this.reader.nextString(1);
    assert(r === 'R', "Invalid rsponse, expected 'R', recived '" + r + "'");
    this.reader.move(2);
    this.data = this.readObject();
    return this;
};

Reader.prototype.readObject = function() {
    var type = this.reader.nextString(1);
    switch (type) {
        case 'f':
            this.fault = true;
            // read fault
            break;
        case 'N':
            return null;
        case 'T':
            return true;
        case 'F':
            return false;
        case 'I':
            return this.reader.nextInt32BE();
        case 'L':
            return {
                high: this.reader.nextInt32BE(),
                low: this.reader.nextUInt32BE()
            };
        case 'D':
            return this.reader.nextDoubleBE();


    }
    return;
};


Reader.prototype.getData = function() {
    return this.data;
};

module.exports = Reader;