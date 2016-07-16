import * as Optimized from "./optimized";
import { bag } from "./index";

export class Dag {

    private readonly _map: { [id: string]: any } = {};

    get<T>(bag: bag.Bag<T>): Optimized.Bag<T> {
        const id = bag.id;
        const cached = this._map[id];
        if (cached !== undefined) {
            return cached;
        }
        const getOpimized = <I>(b: bag.Bag<I>) => this.get(b);
        class Visitor implements bag.Visitor<T, Optimized.Bag<T>> {
            flatten<I>(value: bag.Flatten<T, I>): Optimized.Bag<T> {
                return getOpimized(value.input).flatten(id, value.func);
            }
            disjointUnion(value: bag.DisjointUnion<T>): Optimized.Bag<T> {
                return getOpimized(value.a).disjointUnion(id, getOpimized(value.b));
            }
            one(value: T): Optimized.Bag<T> {
                return Optimized.one(id, value);
            }
            input(): Optimized.Bag<T> {
                return Optimized.input<T>(id);
            }
            groupBy(value: bag.GroupBy<T>): Optimized.Bag<T> {
                return getOpimized(value.input).groupBy(id, value.toKey, value.reduce);
            }
            product<A, B>(value: bag.Product<T, A, B>): Optimized.Bag<T> {
                return getOpimized(value.a).product(id, getOpimized(value.b), value.func);
            }
        }
        const result = bag.implementation(new Visitor());
        this._map[id] = result;
        return result;
    }
}