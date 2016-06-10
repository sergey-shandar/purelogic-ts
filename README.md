# purelogic-ts

PureLogic-TS is an 
[embedded DSL](https://en.wikipedia.org/wiki/Domain-specific_language#Usage_patterns) for describing
[map-reduce](https://en.wikipedia.org/wiki/MapReduce) logic on 
[TypeScript](http://www.typescriptlang.org/).

[![Build Status](https://travis-ci.org/sergey-shandar/purelogic-ts.svg?branch=master)](https://travis-ci.org/sergey-shandar/purelogic-ts)

[Web Site](http://sergey-shandar.github.io/purelogic-ts)

PureLogic for TypeScript

## Bag Types

- Input
- One
- Flatten
- DisjointUnion
- GroupBy. The key is always a string. [ES6 Map](https://tc39.github.io/ecma262/#sec-map-objects) shouldn't be used because some back-ends may serialize objects.
- Product

## Bag Methods

See [lodash](https://lodash.com/docs) and [underscore](http://underscorejs.org/).

## Back-ends

- Sync Memory
- Async Memory
- Event-based in Memory

# For Developers

## Required

- [Node.js](https://nodejs.org/en/) 6.2.0 or higher

## Optional

- [Visual Studio Code](https://www.visualstudio.com/products/code-vs)
- TypeScript `npm install typescript -g`

## Getting Started

- install dependencies `npm install`.
- run unit test and coverage `npm test`.

## Cloud9

Run `nvm install 6.2 && nvm use 6.2` in [Cloud9](https://c9.io) workspace.

## Conventions And Rules

- Don't use class inheritance. Use interfaces and sealed classes.
- The project targets "ES6" because TypeScript 1.8 supports `async` only for "ES6" and above. 
  According to [ES6 Compatibility Table](http://kangax.github.io/compat-table/es6/), we can use ES6
  for
  - Edge 13+ (Windows 10, Windows 10 Mobile, Xbox One),
  - FireFox 45+,
  - Chrome 51+ (including Android 4.2+),
  - Safari 9 (OS X 10.11 El Capitan),
  - iOS 9 (iPhone 4S+).
  - Node 6+,
- Print margin column (line width) is 100 symbols. 
- Keep object properties immutable, see also https://github.com/Microsoft/TypeScript/pull/6532
- Keep object properties non-nullable, see also https://github.com/Microsoft/TypeScript/pull/7140
