export namespace flatten {
    export type Func<I, O> = (value: I) => O[];
    export function identity<T>(value: T): T[] { return [value]; }
}

export function lazy<T>(f: () => T): () => T {
    let called = false;
    let result: T;
    return () => {
        if (!called) {
            result = f();
            called = true;
        }
        return result;
    };
}

export namespace array {

    export class Ref<T> {

        constructor(public readonly array: T[]) {}

        flatten<O>(f: flatten.Func<T, O>): O[] {
            const result: O[] = [];
            return result.concat(...this.array.map(f));
        }

        spliceOne(i: number): T {
            return this.array.splice(i, 1)[0];
        }
    }

    export function ref<T>(array: T[]): Ref<T> {
        return new Ref(array);
    }
}

export namespace bag {

    export type KeyFunc<T> = (value: T) => string;

    export type ReduceFunc<T> = (a: T, b: T) => T;

    export type ProductFunc<A, B, O> = (a: A, b: B) => O[];

    export class Flatten<T, I> {
        constructor(
            public readonly input: Bag<I>,
            public readonly func: flatten.Func<I, T>) {}
    }

    export class DisjointUnion<T> {
        constructor(
            public readonly a: Bag<T>,
            public readonly b: Bag<T>) {}
    }

    export class GroupBy<T> {
        constructor(
            public readonly input: Bag<T>,
            public readonly toKey: KeyFunc<T>,
            public readonly reduce: ReduceFunc<T>) {}
    }

    export class Product<T, A, B> {
        constructor(
            public readonly a: Bag<A>,
            public readonly b: Bag<B>,
            public readonly func: ProductFunc<A, B, T>) {}
    }

    export interface Visitor<T, R> {
        /**
         * LINQ: SelectMany
         */
        flatten<I>(value: Flatten<T, I>): R;
        disjointUnion(value: DisjointUnion<T>): R;
        one(value: T): R;
        input(): R;
        /**
         * LINQ: GroupBy
         */
        groupBy(value: GroupBy<T>): R;
        product<A, B>(value: Product<T, A, B>): R;
    }

    export type Implementation<T> = <R>(visitor: Visitor<T, R>) => R;

    export class Dif<T> {
        constructor(public readonly value: T, public readonly a: number, public readonly b: number) {}
    }

    export function one<T>(value: T): Bag<T> {
        return new Bag(<R>(visitor: Visitor<T, R>) => visitor.one(value));
    }

    export function input<T>(): Bag<T> {
        return new Bag(<R>(visitor: Visitor<T, R>) => visitor.input());
    }

    let bagCounter: number = 0;

    export class Bag<T> {

        readonly id: string;

        constructor(public readonly implementation: Implementation<T>) {
            this.id = bagCounter.toString();
            ++bagCounter;
        }

        /**
         * LINQ: SelectMany
         */
        flatten<O>(func: flatten.Func<T, O>): Bag<O> {
            return new Bag(<R>(visitor: Visitor<O, R>) => visitor.flatten(new Flatten(this, func)));
        }

        disjointUnion(b: Bag<T>): Bag<T> {
            return new Bag(<R>(visitor: Visitor<T, R>) =>
                visitor.disjointUnion(new DisjointUnion(this, b)));
        }

        /**
         * LINQ: GroupBy
         */
        groupBy(toKey: KeyFunc<T>, reduce: ReduceFunc<T>): Bag<T> {
            return new Bag(<R>(visitor: Visitor<T, R>) =>
                visitor.groupBy(new GroupBy(this, toKey, reduce)));
        }

        product<B, O>(b: Bag<B>, func: ProductFunc<T, B, O>): Bag<O> {
            return new Bag(<R>(visitor: Visitor<O, R>) => visitor.product(new Product(this, b, func)));
        }

        /**
         * LINQ: Select
         */
        map<O>(func: (value: T) => O): Bag<O> {
            return this.flatten(value => [func(value)]);
        }

        /**
         * LINQ: Where
         */
        filter(func: (value: T) => boolean): Bag<T> {
            return this.flatten(value => func(value) ? [value] : []);
        }

        compact(): Bag<T> {
            return this.filter(Boolean);
        }

        /**
         * LINQ: Accumulate
         */
        reduce(func: ReduceFunc<T>): Bag<T> {
            return this.groupBy(() => "", func);
        }

        dif(b: Bag<T>): Bag<Dif<T>> {
            const toDif = (bag: Bag<T>, a: number, b: number) =>
                bag.map(v => new Dif(v, a, b));
            const aDif = toDif(this, 1, 0);
            const bDif = toDif(b, 0, 1);
            return aDif.disjointUnion(bDif).groupBy(
                v => JSON.stringify(v.value),
                (x, y) => new Dif(x.value, x.a + y.a, x.b + y.b));
        }
    }
}

export namespace optimized {

    export interface NodeVisitor<T, R> {
        input(): R;
        one(value: T): R;
        groupBy(inputs: Bag<T>, toKey: bag.KeyFunc<T>, reduce: bag.ReduceFunc<T>): R;
        product<A, B>(a: Bag<A>, b: Bag<B>, func: bag.ProductFunc<A, B, T>): R;
    }

    export type NodeImplementation<T> = <R>(visitor: NodeVisitor<T, R>) => R;

    export class Node<T> {

        constructor(
            public readonly id: string,
            public readonly implementation: NodeImplementation<T>) {
        }

        link<O>(func: flatten.Func<T, O>): Link<O> {
            const value = new LinkValue(this, func);
            return new Link(<R>(visitor: LinkVisitor<O, R>) => visitor(value));
        }

        bag(): Bag<T> {
            return new Bag(this.id, [this.link(flatten.identity)]);
        }
    }

    export class LinkValue<T, I> {
        constructor(
            public readonly node: Node<I>,
            public readonly func: flatten.Func<I, T>) {
        }
    }

    export type LinkVisitor<T, R> = <I>(value: LinkValue<T, I>) => R;

    export type LinkImplementation<T> = <R>(visitor: LinkVisitor<T, R>) => R;

    export class Link<T> {

        constructor(public readonly implementation: LinkImplementation<T>) {}

        nodeId(): string {
            return this.implementation(<I>(x: LinkValue<T, I>) => x.node.id);
        }

        flatten<O>(func: flatten.Func<T, O>): Link<O> {
            function visitor<I>(x: LinkValue<T, I>): Link<O> {
                const f = x.func;
                const newFunc = f !== flatten.identity
                    ? (value: I) => array.ref(f(value)).flatten(func)
                    : <flatten.Func<I, O>> <any> func;
                return x.node.link(newFunc);
            }
            return this.implementation(visitor);
        }

        addFunc(getFunc: <I>() => flatten.Func<I, T>): Link<T> {
            function visitor<I>(link: LinkValue<T, I>): Link<T> {
                const f = link.func;
                const fNew = getFunc<I>();
                return link.node.link(i => f(i).concat(fNew(i)));
            }
            return this.implementation(visitor);
        }
    }

    export class Bag<T> {

        constructor(
            public readonly id: string,
            public readonly array: Link<T>[]) {
        }

        groupBy(id: string, toKey: bag.KeyFunc<T>, reduce: bag.ReduceFunc<T>): Bag<T> {
            return new Node(
                    id,
                    <R>(visitor: NodeVisitor<T, R>) => visitor.groupBy(this, toKey, reduce))
                .bag();
        }

        product<B, O>(id: string, b: Bag<B>, func: bag.ProductFunc<T, B, O>): Bag<O> {
            return new Node(id, <R>(visitor: NodeVisitor<O, R>) => visitor.product(this, b, func))
                .bag();
        }

        flatten<O>(id: string, func: flatten.Func<T, O>): Bag<O> {
            return new Bag(id, this.array.map(link => link.flatten(func)));
        }

        disjointUnion(id: string, b: Bag<T>): Bag<T> {
            const aLinks: Link<T>[] = [];
            this.array.forEach(aLink => aLinks.push(aLink));
            const bLinks: Link<T>[] = [];
            b.array.forEach(bLink => {
                function bVisitor<B>(x: LinkValue<T, B>): void {
                    const i = aLinks.findIndex(aLink => aLink.nodeId() === x.node.id);
                    function getFunc<I>(): flatten.Func<I, T> { return <any> x.func; }
                    bLinks.push(i !== -1
                        ? array.ref(aLinks).spliceOne(i).addFunc(getFunc)
                        : bLink
                    );
                }
                bLink.implementation(bVisitor);
            });
            return new Bag(id, aLinks.concat(bLinks));
        }
    }

    export function input<T>(id: string): Bag<T> {
        return new Node(id, <R>(visitor: NodeVisitor<T, R>) => visitor.input()).bag();
    }

    export function one<T>(id: string, value: T): Bag<T> {
        return new Node(id, <R>(visitor: NodeVisitor<T, R>) => visitor.one(value)).bag();
    }
}