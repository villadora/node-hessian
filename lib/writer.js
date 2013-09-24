function Writer() {

}

Writer.prototype.writeCall = function(method, args) {
    var callbuf = new Buffer([0, 1, 0, 0, 0, 0]);
    callbuf.write('c');
    callbuf.write('m', 3);
    callbuf.writeInt16BE(method.length, 4);


    var argsbuf = [];
    if (args) {
        for (var i = 0, len = args.length; i < len; ++i) {
            var arg = this.write(args[i]);
            argsbuf.push(arg);
        }
    }

    argsbuf.push(new Buffer('z'));
    console.log(argsbuf);
    var buffer = this.buffer = Buffer.concat([callbuf, new Buffer(method)].concat(argsbuf));

    console.log(buffer.length, buffer);
    return this;

};

Writer.prototype.getBuffer = function() {
    return this.buffer;
};

Writer.prototype.write = function(data, type) {
    if (data === null) {
        return this.writeNull(data);
    } else if (typeof data === 'boolean') {
        return this.writeBoolean(data);
    }
};

Writer.prototype.writeNull = function() {
    return new Buffer('N');
};

Writer.prototype.writeBoolean = function(data) {
    return data ? new Buffer('T') : new Buffer('F');
};

Writer.prototype.writeInt = function(data) {
    var buf = new Buffer(5);
    buf.write('I');
    buf.write32IntBE(data, 1);
    return buf;
};

module.exports = Writer;