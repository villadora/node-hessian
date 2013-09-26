test: 
	@./node_modules/.bin/mocha -R spec ./test/test2.js

jshint:
	@./node_modules/.bin/jshint Gruntfile.js lib/*.js test/*.js

.PHONY: jshint test
