import * as lodash from "lodash";

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

export class Map<T> {

    private readonly _map: { [id: string]: T } = {};

    set(id: string, value: T): void {
        this._map[id] = value;
    }

    get<X extends T>(id: string, create: () => X): X {
        const result = this._map[id];
        if (result === undefined) {
            const newResult = create();
            this._map[id] = newResult;
            return newResult;
        }
        return <X> result;
    }

    optionalGet(id: string): T|undefined {
        return this._map[id];
    }
}

/**
 * Flat Map functions.
 */
export namespace flatMap {
    export type Func<I, O> = (value: I) => O[];
    export function identity<T>(value: T): T[] { return [value]; }
}

/**
 * Array utilities.
 */
export namespace array {

    export function spliceOne<T>(array: T[], i: number): T {
        return array.splice(i, 1)[0];
    }
}

/**
 * Bag type and related functions.
 */
export namespace bag {

    export type KeyFunc<T> = (value: T) => string;

    export type ReduceFunc<T> = (a: T, b: T) => T;

    export type ProductFunc<A, B, O> = (a: A, b: B) => O[];

    export class FlatMap<T, I> {
        constructor(
            public readonly input: Bag<I>,
            public readonly func: flatMap.Func<I, T>) {}
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
        flatMap<I>(value: FlatMap<T, I>): R;
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
        constructor(
            public readonly value: T,
            public readonly a: number,
            public readonly b: number) {}
    }

    export function one<T>(value: T): Bag<T> {
        return new Bag(<R>(visitor: Visitor<T, R>) => visitor.one(value));
    }

    export function input<T>(): Bag<T> {
        return new Bag(<R>(visitor: Visitor<T, R>) => visitor.input());
    }

    let bagCounter: number = 0;

    export class Join<A, B> {
        constructor(
            public readonly key: string,
            public readonly a: A|undefined,
            public readonly b: B|undefined) {}
    }

    export class Bag<T> {

        readonly id: string;

        constructor(
            public readonly implementation: Implementation<T>) {

            this.id = bagCounter.toString();
            ++bagCounter;
        }

        /**
         * LINQ: SelectMany
         */
        flatMap<O>(func: flatMap.Func<T, O>): Bag<O> {
            return new Bag(<R>(visitor: Visitor<O, R>) => visitor.flatMap(new FlatMap(this, func)));
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
            return this.flatMap(value => [func(value)]);
        }

        /**
         * LINQ: Where
         */
        filter(func: (value: T) => boolean): Bag<T> {
            return this.flatMap(value => func(value) ? [value] : []);
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

        join<B>(
            b: Bag<B>,
            keyT: KeyFunc<T>,
            keyB: KeyFunc<B>,
            reduceT: ReduceFunc<T>,
            reduceB: ReduceFunc<B>):
                Bag<Join<T, B>> {

            function join(k: string, t: T|undefined, b: B|undefined) {
                return new Join(k, t, b);
            }

            const bagT = this.map(x => join(keyT(x), x, undefined));
            const bagB = b.map(x => join(keyB(x), undefined, x));
            const bagC = bagT.disjointUnion(bagB);

            function reduceOptional<M>(reduce: ReduceFunc<M>) {
                return (x: M|undefined, y: M|undefined) => {
                    if (x === undefined) { return y; }
                    if (y === undefined) { return x; }
                    return reduce(x, y);
                };
            }

            return bagC.groupBy(
                x => x.key,
                (x, y) => join(
                    x.key,
                    reduceOptional(reduceT)(x.a, y.a),
                    reduceOptional(reduceB)(x.b, y.b)));
        }
    }
}

/**
 * Optimized graph.
 */
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
            public readonly implementation: NodeImplementation<T>) {}

        link<O>(func: flatMap.Func<T, O>): Link<O> {
            const value = new LinkValue(this, func);
            return new Link(<R>(visitor: LinkVisitor<O, R>) => visitor(value));
        }

        bag(): Bag<T> {
            return new Bag(this.id, [this.link(flatMap.identity)]);
        }
    }

    export class LinkValue<T, I> {
        constructor(
            public readonly node: Node<I>,
            public readonly func: flatMap.Func<I, T>) {}
    }

    export type LinkVisitor<T, R> = <I>(value: LinkValue<T, I>) => R;

    export type LinkImplementation<T> = <R>(visitor: LinkVisitor<T, R>) => R;

    export class Link<T> {

        constructor(
            public readonly implementation: LinkImplementation<T>) {}

        nodeId(): string {
            return this.implementation(<I>(x: LinkValue<T, I>) => x.node.id);
        }

        flatMap<O>(func: flatMap.Func<T, O>): Link<O> {
            function visitor<I>(x: LinkValue<T, I>): Link<O> {
                const f = x.func;
                const newFunc = f !== flatMap.identity
                    ? (value: I) => lodash.flatMap(f(value), func)
                    : <flatMap.Func<I, O>> <any> func;
                return x.node.link(newFunc);
            }
            return this.implementation(visitor);
        }

        addFunc(getFunc: <I>() => flatMap.Func<I, T>): Link<T> {
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
            public readonly array: Link<T>[]) {}

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

        flatMap<O>(id: string, func: flatMap.Func<T, O>): Bag<O> {
            return new Bag(id, this.array.map(link => link.flatMap(func)));
        }

        disjointUnion(id: string, b: Bag<T>): Bag<T> {
            const aLinks: Link<T>[] = [];
            this.array.forEach(aLink => aLinks.push(aLink));
            const bLinks: Link<T>[] = [];
            b.array.forEach(bLink => {
                function bVisitor<B>(x: LinkValue<T, B>): void {
                    const i = aLinks.findIndex(aLink => aLink.nodeId() === x.node.id);
                    function getFunc<I>(): flatMap.Func<I, T> { return <any> x.func; }
                    bLinks.push(i !== -1
                        ? array.spliceOne(aLinks, i).addFunc(getFunc)
                        : bLink);
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

/**
 * DAG
 */
export namespace dag {

    export class Dag {

        private readonly _map = new Map<any>();

        get<T>(bag: bag.Bag<T>): optimized.Bag<T> {
            const id = bag.id;
            return this._map.get(id, () => {
                const getOpimized = <I>(b: bag.Bag<I>) => this.get(b);
                class Visitor implements bag.Visitor<T, optimized.Bag<T>> {
                    flatMap<I>(value: bag.FlatMap<T, I>): optimized.Bag<T> {
                        return getOpimized(value.input).flatMap(id, value.func);
                    }
                    disjointUnion(value: bag.DisjointUnion<T>): optimized.Bag<T> {
                        return getOpimized(value.a).disjointUnion(id, getOpimized(value.b));
                    }
                    one(value: T): optimized.Bag<T> {
                        return optimized.one(id, value);
                    }
                    input(): optimized.Bag<T> {
                        return optimized.input<T>(id);
                    }
                    groupBy(value: bag.GroupBy<T>): optimized.Bag<T> {
                        return getOpimized(value.input).groupBy(id, value.toKey, value.reduce);
                    }
                    product<A, B>(value: bag.Product<T, A, B>): optimized.Bag<T> {
                        return getOpimized(value.a).product(id, getOpimized(value.b), value.func);
                    }
                }
                return bag.implementation(new Visitor());
            });
        }
    }
}

/**
 * Synchronous memory back-end.
 */
export namespace syncmem {

    export type GetArray<T> = () => T[];

    export class SyncMem {

        private readonly _map = new Map<GetArray<any>>();

        private readonly _dag: dag.Dag = new dag.Dag();

        set<T>(input: bag.Bag<T>, getArray: GetArray<T>): void {
           this._map.set(input.id, getArray);
        }

        get<T>(b: bag.Bag<T>): GetArray<T> {
            return this._get(this._dag.get(b));
        }

        private _get<T>(o: optimized.Bag<T>): GetArray<T> {
            const id = o.id;
            return this._map.get(id, () => {
                const links = o.array
                    .map(link => link.implementation(<I>(value: optimized.LinkValue<T, I>) => {
                        // NOTE: possible optimization:
                        // if (f === flatMap.identity) { return nodeFunc; }
                        const f = value.func;
                        const nodeFunc = this._fromNode(value.node);
                        return () => lodash.flatMap(nodeFunc(), f);
                    }));
                // NOTE: possible optimization: if (links.lenght === 1) { newResult = links[0]; }
                return () => lodash.flatMap(links, f => f());
            });
        }

        private _fromNode<T>(n: optimized.Node<T>): GetArray<T> {
            const id = n.id;
            const map = this._map;
            return map.get(id, () => {
                const get = <I>(b: optimized.Bag<I>) => this._get(b);

                class Visitor implements optimized.NodeVisitor<T, GetArray<T>> {

                    /**
                     * when input is not defined yet.
                     */
                    input(): GetArray<T> { return () => (<GetArray<T>> map.optionalGet(id))(); }

                    one(value: T): GetArray<T> { return () => [value]; }

                    groupBy(
                        input: optimized.Bag<T>,
                        toKey: bag.KeyFunc<T>,
                        reduce: bag.ReduceFunc<T>):
                            GetArray<T> {

                        const inputLazyArray = get(input);
                        return lazy(() => {
                            const map: { [id: string]: T; } = {};
                            inputLazyArray().forEach(value => {
                                const key = toKey(value);
                                const current = map[key];
                                map[key] = current !== undefined ? reduce(current, value) : value;
                            });
                            return Object.keys(map).map(k => map[k]);
                        });
                    }

                    product<A, B>(
                        a: optimized.Bag<A>, b: optimized.Bag<B>, func: bag.ProductFunc<A, B, T>
                    ): GetArray<T> {
                        const getA = get(a);
                        const getB = get(b);
                        return lazy(() => {
                            const aArray = getA();
                            const bArray = getB();
                            return lodash.flatMap(
                                aArray, av => lodash.flatMap(bArray, bv => func(av, bv)));
                        });
                    }
                }
                return n.implementation(new Visitor());
            });
        }
    }
}

export namespace asyncmem {

    export type GetArray<T> = Promise<T[]>;

    export class InputError implements Error {
        readonly name: string = "InputError";
        readonly message: string;
        constructor(public readonly bagId: string) {
            this.message = `InputError: input bag ${bagId} is not defined`;
        }
    }

    export class AsyncMem {

        private readonly _map = new Map<GetArray<any>>();

        private readonly _dag: dag.Dag = new dag.Dag();

        set<T>(input: bag.Bag<T>, getArray: GetArray<T>): void {
           this._map.set(input.id, getArray);
        }

        get<T>(b: bag.Bag<T>): GetArray<T> {
            return this._get(this._dag.get(b));
        }

        private _get<T>(o: optimized.Bag<T>): GetArray<T> {
            const id = o.id;
            return this._map.get(id, () => {
                const links = o.array
                    .map(link => link.implementation(<I>(value: optimized.LinkValue<T, I>) => {
                        // NOTE: possible optimization:
                        // if (f === flatMap.identity) { return nodeFunc; }
                        const f = value.func;
                        return this._fromNode(value.node).then(x => lodash.flatMap(x, f));
                    }));
                // NOTE: possible optimization: if (links.lenght === 1) { newResult = links[0]; }
                return Promise.all(links).then(lodash.flatten);
            });
        }

        private _fromNode<T>(n: optimized.Node<T>): GetArray<T> {
            const id = n.id;
            const map = this._map;
            return map.get(id, () => {
                const get = <I>(b: optimized.Bag<I>) => this._get(b);

                class Visitor implements optimized.NodeVisitor<T, GetArray<T>> {

                    input(): GetArray<T> { throw new InputError(id); }

                    one(value: T): GetArray<T> { return Promise.resolve([value]); }

                    groupBy(
                        input: optimized.Bag<T>,
                        toKey: bag.KeyFunc<T>,
                        reduce: bag.ReduceFunc<T>):
                            GetArray<T> {

                        const inputLazyArray = get(input);
                        return inputLazyArray.then(x => {
                            const map: { [id: string]: T; } = {};
                            x.forEach(value => {
                                const key = toKey(value);
                                const current = map[key];
                                map[key] = current !== undefined ? reduce(current, value) : value;
                            });
                            return Object.keys(map).map(k => map[k]);
                        });
                    }

                    product<A, B>(
                        a: optimized.Bag<A>,
                        b: optimized.Bag<B>,
                        func: bag.ProductFunc<A, B, T>):
                            GetArray<T> {

                        const getA = get(a);
                        const getB = get(b);
                        return Promise.all([getA, getB]).then(x => {
                            const aArray = x[0];
                            const bArray = x[1];
                            return lodash.flatMap(
                                aArray, av => lodash.flatMap(bArray, bv => func(av, bv)));
                        });
                    }
                }
                return n.implementation(new Visitor());
            });
        }
    }
}