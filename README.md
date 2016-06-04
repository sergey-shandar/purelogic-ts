# purelogic-ts

PureLogic-TS is an [embedded DSL](https://en.wikipedia.org/wiki/Domain-specific_language#Usage_patterns) for describing [map-reduce](https://en.wikipedia.org/wiki/MapReduce) logic on [TypeScript](http://www.typescriptlang.org/).

[![Build Status](https://travis-ci.org/sergey-shandar/purelogic-ts.svg?branch=master)](https://travis-ci.org/sergey-shandar/purelogic-ts)

[Web Site](http://sergey-shandar.github.io/purelogic-ts)

PureLogic for TypeScript

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

- Visual Studio Code

## Getting Started

- install dependencies `npm install`.
- run unit test and coverage `npm test`.

## Conventions And Rules

- Don't use class inheritance. Use interfaces and sealed classes.
- The project targets "ES6" because TypeScript 1.8 supports `async` only for "ES6" and above.
- Keep object properties immutable, see also https://github.com/Microsoft/TypeScript/pull/6532
- Keep object properties non-nullable, see also https://github.com/Microsoft/TypeScript/pull/7140
