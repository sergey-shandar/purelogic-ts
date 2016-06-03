import "mocha";
import { Bag, BagVisitor, Links, input } from "../optimized";
import { ReduceFunc, KeyFunc, ProductFunc } from "../bag";

interface OptionalBagVisitor<T> {
    input?: (id: number) => void;
    one?: (value: T) => void;
    groupBy?: <K>(inputs: Links<T>, toKey: KeyFunc<T, K>, reduce: ReduceFunc<T>) => void;
    product?: <A, B>(a: Links<A>, b: Links<B>, func: ProductFunc<A, B, T>) => void;
}

function check<T>(bag: Bag<T>, visitor: OptionalBagVisitor<T>) {
    bag.implementation(<BagVisitor<T, void>> visitor);
}

describe("optimized.ts", function() {
    it("input()", () => check(input(5), {
        input: n => n.should.equal(5)
    }));
    describe("class Bag", function() {
    })
})