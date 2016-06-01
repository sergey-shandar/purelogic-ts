export interface Visitor<T, R> {
    flatten<I>(input: Bag<I>, func: (value: I) => T[]): R;
    disjointUnion(a: Bag<T>, b: Bag<T>): R;
    one(value: T): R;
    input(): R;
    groupBy<K>(input: Bag<T>, toKey: (value: T) => K, reduce: (a: T, b: T) => T): R;
    product<A, B>(a: Bag<A>, b: Bag<B>, func: (a: A, b: B) => T[]): R;
}

export interface Implementation<T> {
    <R>(visitor: Visitor<T, R>): R;
}

export class Dif<T> { 
    value: T;
    a: number;
    b: number;
    constructor(value: T, a: number, b: number) {
        this.value = value;
        this.a = a;
        this.b = b;
    }
}

export function bag<T>(accept: Implementation<T>): Bag<T> {
    return new Bag<T>(accept);
}

export function one<T>(value: T): Bag<T> {
    return bag(<R>(visitor: Visitor<T, R>) => visitor.one(value));
}

export function input<T>(): Bag<T> {
    return bag(<R>(visitor: Visitor<T, R>) => visitor.input());
}

export class Bag<T> {
    
    constructor(implementation: Implementation<T>) {
        this.implementation = implementation;
    }
    
    implementation: Implementation<T>;
    
    flatten<O>(func: (value: T) => O[]): Bag<O> {
        return bag(<R>(visitor: Visitor<O, R>) => visitor.flatten(this, func));
    }
    disjointUnion(b: Bag<T>): Bag<T> {
        return bag(<R>(visitor: Visitor<T, R>) => visitor.disjointUnion(this, b));
    }
    groupBy<K>(toKey: (value: T) => K, reduce: (a: T, b: T) => T): Bag<T> {
        return bag(<R>(visitor: Visitor<T, R>) => visitor.groupBy(this, toKey, reduce));
    }
    product<B, O>(b: Bag<B>, func: (a: T, b: B) => O[]): Bag<O> {
        return bag(<R>(visitor: Visitor<O, R>) => visitor.product(this, b, func));
    }
    
    map<O>(func: (value: T) => O): Bag<O> {
        return this.flatten(value => [func(value)]);
    }
    filter(func: (value:T) => boolean): Bag<T> {
        return this.flatten(value => func(value) ? [value] : []);
    }
    compact(): Bag<T> {
        return this.filter(Boolean);
    }
    reduce(func: (a: T, b: T) => T): Bag<T> {
        return this.groupBy(() => null, func);
    }
    dif(b: Bag<T>): Bag<Dif<T>> {
        const toDif = (bag: Bag<T>, a: number, b: number) =>
            bag.map(v => new Dif(v, a, b));
        const aDif = toDif(this, 1, 0);
        const bDif = toDif(b, 0, 1);
        return aDif.disjointUnion(bDif)
            .groupBy(v => v.value, (x, y) => new Dif(x.value, x.a + y.a, x.b + y.b));
    }    
}
