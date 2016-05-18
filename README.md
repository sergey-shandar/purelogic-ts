# purelogic-ts

PureLogic for TypeScript

## Tools For Development

### Required. Stage 1

- Node.js
- TypeScript

### Required. Stage 2

- TSNode
- TSLint
- Mocha
- Chai
- Istanbul
- [TypeDoc](http://typedoc.io/)

#### Optional

- Visual Studio Code

## Development Principals

Use interfaces instead of classes. For example,
```ts
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
