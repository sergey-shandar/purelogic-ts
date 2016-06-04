import "mocha";
import { Bag, BagVisitor, Links, input, one } from "../optimized";
import { ReduceFunc, KeyFunc, ProductFunc } from "../bag";
import * as flatten from "../flatten";

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
    it("one()", () => check(one("Hello!"), {
        one: s => s.should.equal("Hello!")
    }));
    describe("class Bag", function() {
        it("link()", () => {
            const a = one("Hello world!");
            const f = (s: string) => [s.indexOf("H")];
            const link = a.link(f);
            link.implementation(<I>(b: Bag<I>, bf: flatten.Func<I, number>) => {
                b.should.equal(a);
                bf.should.equal(f);
            })
        })
        it("identityLink()", () => {
            const a = one("Hello world!");
            const link = a.identityLink();
            link.implementation(<I>(b: Bag<I>, bf: flatten.Func<I, string>) => {
                b.should.equal(a);
                bf.should.equal(flatten.identity);
            })
        })
    })
    describe("class Link", function() {
        it("flatten()", () => {
            const a = one(10);
            const f = (x: number) => [x, x * x];
            const link = a.identityLink().flatten(f);
            link.implementation(<I>(b: Bag<I>, bf: flatten.Func<I, number>) => {
                b.should.equal(a);
                // an identity function should be removed
                bf.should.equal(f);
            });
            const link2 = link.flatten(x => [x, x + 1]);
            link2.implementation(<I>(b: Bag<I>, bf: flatten.Func<I, number>) => {
                b.should.equal(a);
                bf(<I> <any> 10).should.deep.equal([10, 11, 100, 101]);
            });
        })
        it("bagEqual()", () => {
            const x = input<string>(5);
            const link = x.link(v => [v, v + v]);
            link.bagEqual(x).should.equal(true);
            link.bagEqual(one("hello")).should.equal(false);
        })
    })
})