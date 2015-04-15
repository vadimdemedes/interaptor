SRC = $(wildcard src/*.js)
LIB = $(SRC:src/%.js=lib/%.js)

lib: $(LIB)
lib/%.js: src/%.js
	@mkdir -p $(@D)
	./node_modules/.bin/babel -L all $< -o $@

include node_modules/make-lint-es6/index.mk

test: lint
	@./node_modules/.bin/mocha
