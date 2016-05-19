export interface Visitor<T, R> {
    flatten<I>(input: Bag<I>, func: (value: I) => [T]): R;
    disjointUnion(a: Bag<T>, b: Bag<T>): R;
    one(value: T): R;
    input(): R;
    groupBy<K>(input: Bag<T>, toKey: (value: T) => K, reduce: (a: T, b: T) => T): R;
    product<A, B>(a: Bag<A>, b: Bag<B>, func: (a: A, b: B) => [T]): R;
}

export interface Accept<T> {
    <R>(visitor: Visitor<T, R>): R;
} 

export interface Bag<T> { 
    accept: Accept<T>;
    
    flatten<O>(func: (value: T) => [O]): Bag<O>;
    disjointUnion(b: Bag<T>): Bag<T>;
    groupBy<K>(toKey: (value: T) => K, reduce: (a: T, b: T) => T): Bag<T>;
    product<B, O>(b: Bag<B>, func: (a: T, b: B) => [O]): Bag<O>;
        
    map<O>(func: (value: T) => O): Bag<O>;
}

export function bag<T>(accept: Accept<T>): Bag<T> {
    return new BagImplementation<T>(accept);
}

export function one<T>(value: T): Bag<T> {
    return bag(<R>(visitor: Visitor<T, R>) => visitor.one(value));
}

export function input<T>(): Bag<T> {
    return bag(<R>(visitor: Visitor<T, R>) => visitor.input());
}

class BagImplementation<T> implements Bag<T> {
    constructor(accept: Accept<T>) {
        this.accept = accept;
    }
    accept: Accept<T>;
    flatten<O>(func: (value: T) => [O]): Bag<O> {
        return bag(<R>(visitor: Visitor<O, R>) => visitor.flatten(this, func));
    }
    disjointUnion(b: Bag<T>): Bag<T> {
        return bag(<R>(visitor: Visitor<T, R>) => visitor.disjointUnion(this, b));
    }
    groupBy<K>(toKey: (value: T) => K, reduce: (a: T, b: T) => T): Bag<T> {
        return bag(<R>(visitor: Visitor<T, R>) => visitor.groupBy(this, toKey, reduce));
    }
    product<B, O>(b: Bag<B>, func: (a: T, b: B) => [O]): Bag<O> {
        return bag(<R>(visitor: Visitor<O, R>) => visitor.product(this, b, func));
    }
    map<O>(func: (value: T) => O): Bag<O> {
        return this.flatten(value => [func(value)]);
    }
}
