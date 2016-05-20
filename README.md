# purelogic-ts

PureLogic for TypeScript

## Bag Types

## Bag Methods

See [lodash](https://lodash.com/docs) and [underscore](http://underscorejs.org/).

## Tools For Development

### Required. Stage 1

- [Node.js](https://nodejs.org/en/) 6.2.0 or higher
- TypeScript 1.8.10 or higher, `npm install typescript -g`

### Required. Stage 2

- TSNode
- TSLint
- Mocha
- Chai
- Istanbul
- [TypeDoc](http://typedoc.io/)

### Optional

- Visual Studio Code

## Code Conventions

Use interfaces instead of classes. For example,
```ts
interface Bag<T> {}

interface DisjointUnion<T> extends Bag<T> {
    a: Bag<T>;
    b: Bag<T>;
}

function disjointUnion<T>(a: Bag<T>, b: Bag<T>): DisjointUnion<T> {
    return {
        a: a,
        b: b,
    };
};
```

## Compilation Target

The project targets "ES6" because TypeScript 1.8 supports `async` only for "ES6" and above.
