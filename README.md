# purelogic-ts

PureLogic-TS is an
[embedded DSL](https://en.wikipedia.org/wiki/Domain-specific_language#Usage_patterns) for describing
[map-reduce](https://en.wikipedia.org/wiki/MapReduce) logic on
[TypeScript](http://www.typescriptlang.org/).

[![npm version](https://badge.fury.io/js/purelogic-ts.svg)](https://badge.fury.io/js/purelogic-ts)
[![Build Status](https://travis-ci.org/sergey-shandar/purelogic-ts.svg?branch=master)](https://travis-ci.org/sergey-shandar/purelogic-ts)

## Bag Types

- Input
- One
- FlatMap
- DisjointUnion
- GroupBy. The key is always a string. [ES6 Map](https://tc39.github.io/ecma262/#sec-map-objects) shouldn't be used because some back-ends may serialize objects.
- Product

## Bag Methods

See [iterable-ts](https://github.com/sergey-shandar/iterable-ts/blob/master/index.ts), [lazy.js](http://danieltao.com/lazy.js/docs/), [lodash](https://lodash.com/docs) and [underscore](http://underscorejs.org/).

## Back-ends

- Sync Memory
- Async Memory
- Event-based in Memory

## Data And Data Operation Requirements

- Serializable. All data should be serializable.
- Immutable. All data operations (functions) should not change input data.

## Serialazable Data

Use TypeScript interfaces instead of classes. The interface should contain properties and no functions.

### Serialazible Union Type

```ts
interface MyUnion
{
    numberValue: number|undefined;
    stringValue: string|undefined;
}
```

# For Developers

## Required

- [Node.js](https://nodejs.org/en/) 6.7.0 or higher

## Optional

- [Visual Studio Code](https://www.visualstudio.com/products/code-vs)
- TypeScript `npm install typescript@beta -g`

## Getting Started

- install dependencies `npm install`.
- run unit test and coverage `npm test`.

## Cloud9

Run `nvm install 6.7.0 && nvm use 6.7.0` in [Cloud9](https://c9.io) workspace.

## Conventions And Rules

- Don't use class inheritance. Use interfaces and sealed classes.
- Print margin column (line width) is 100 symbols.
- Keep object properties immutable, see also https://github.com/Microsoft/TypeScript/pull/6532
- Keep object properties non-nullable, see also https://github.com/Microsoft/TypeScript/pull/7140

### ES6

The project targets "ES6" because TypeScript 2.0 supports `async` only for "ES6" and above.
According to [ES6 Compatibility Table](http://kangax.github.io/compat-table/es6/), we can use ES6 for
- Edge 14+ (Windows 10, Windows 10 Mobile, Xbox One),
- FireFox 48+,
- Chrome 53+ (including Android 4.2+),
- Node 6+,
- Safari 10 (OS X 10.12 Sierra, iOS 10 iPhone 5+).
