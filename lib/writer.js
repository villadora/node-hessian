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
            if (arg)
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
    }
};



Writer.prototype.writeNull = function() {
    return new Buffer('N');
};

module.exports = Writer;