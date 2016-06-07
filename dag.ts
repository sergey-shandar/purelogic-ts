import * as Optimized from "./optimized";
import * as Bag from "./bag";

class Dag {
    private map: { [id: number]: any } = {};
    public get<T>(bag: Bag.Bag<T>): Optimized.Bag<T> {
        const id = bag.id;
        const cached = this.map[id];
        if (cached !== undefined) {
            return cached;
        }
        const getOpimized = this.get;
        class Visitor implements Bag.Visitor<T, Optimized.Bag<T>> {
            flatten<I>(value: Bag.Flatten<T, I>): Optimized.Bag<T> {
                return getOpimized(value.input).flatten(id, value.func);
            }
            disjointUnion(value: Bag.DisjointUnion<T>): Optimized.Bag<T> {
                return getOpimized(value.a).disjointUnion(id, getOpimized(value.b));
            }
            one(value: T): Optimized.Bag<T> {
                return Optimized.one(id, value);
            }
            input(): Optimized.Bag<T> {
                return Optimized.input<T>(id);
            }
            groupBy<K>(value: Bag.GroupBy<T, K>): Optimized.Bag<T> {
                return getOpimized(value.input).groupBy(id, value.toKey, value.reduce);
            }
            product<A, B>(value: Bag.Product<T, A, B>): Optimized.Bag<T> {
                return getOpimized(value.a).product(id, getOpimized(value.b), value.func);
            }
        }
        const result = bag.implementation(new Visitor());
        this.map[id] = result;
        return result;
    }
}