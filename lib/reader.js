function Reader() {

}

Reader.prototype.parse = function(data) {
    this.data = data;
    return this;
};

Reader.prototype.getData = function() {
    return this.data;
};

module.exports = Reader;