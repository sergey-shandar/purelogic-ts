import "mocha";
import { Node, BagVisitor, Links, input, one } from "../optimized";
import { ReduceFunc, KeyFunc, ProductFunc } from "../bag";
import * as flatten from "../flatten";

interface OptionalBagVisitor<T> {
    input?: (id: number) => void;
    one?: (value: T) => void;
    groupBy?: <K>(inputs: Links<T>, toKey: KeyFunc<T, K>, reduce: ReduceFunc<T>) => void;
    product?: <A, B>(a: Links<A>, b: Links<B>, func: ProductFunc<A, B, T>) => void;
}

function check<T>(bag: Node<T>, visitor: OptionalBagVisitor<T>) {
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
            link.implementation(<I>(b: Node<I>, bf: flatten.Func<I, number>) => {
                b.should.equal(a);
                bf.should.equal(f);
            })
        })
        it("identityLink()", () => {
            const a = one("Hello world!");
            const link = a.identityLink();
            link.implementation(<I>(b: Node<I>, bf: flatten.Func<I, string>) => {
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
            link.implementation(<I>(b: Node<I>, bf: flatten.Func<I, number>) => {
                b.should.equal(a);
                // an identity function should be removed
                bf.should.equal(f);
            });
            const link2 = link.flatten(x => [x, x + 1]);
            link2.implementation(<I>(b: Node<I>, bf: flatten.Func<I, number>) => {
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
        it("addFunc()", () => {
            const x = one("something");
            const link = x.identityLink().addFunc(<I>() => () => ["xxx"]);
            link.implementation(<I>(b: Node<I>, bf: flatten.Func<I, string>) => {
                b.should.equal(x);
                bf(<I> <any> "x").should.deep.equal(["x", "xxx"]);
            });
        })
        it("links()", () => {
           const x = one(4).identityLink();
           x.links().array.should.deep.equal([x]);
        });
    })
    describe("class Links", function() {
        it("constructor()", () => {
            const x = [one(4).identityLink()];
            new Links(x).array.should.equal(x);
        })
        it("groupBy()", () => {
            const x = one({ a: 4, b: "hello" }).identityLink().links();
            const toKey = (v: {a:number, b: string}) => v.a;
            const reduce = <T>(a: T, b: T) => a;
            const bag = x.groupBy(toKey, reduce);
            check(bag, {
                groupBy: (links: any, k: any, r: any): void => {
                    links.should.equal(x);
                    k.should.equal(toKey);
                    r.should.equal(reduce);
                }
            });
        })
        it("product()", () => {
            const a = one(3).identityLink().links();
            const b = one("world").identityLink().links();
            const r = (x: number, y: string) => [{ a: x, b: y}];
            const p = a.product(b, r);
            check(p, {
                product: (ax: any, bx: any, rx: any): void => {
                    ax.should.equal(a);
                    bx.should.equal(b);
                    rx.should.equal(r);
                }
            });
        })
        it("flatten()", () => {
            const a = one(9);
            const f = (x: number) => [x * 2];
            const r = a.identityLink().links().flatten(f);
            r.array[0].implementation((b: any, bf: any) => {
                b.should.equal(a);
                bf.should.equal(f);
            });
        })
        it("disjointUnion()", () => {
            const bag = one(1);
            const a = bag.identityLink();
            const b = one(2).identityLink();
            const d = a.links().disjointUnion(b.links());
            d.array.should.deep.equal([a, b]);
            const d2 = a.links().disjointUnion(a.links());
            d2.array.length.should.equal(1);
            d2.array[0].implementation((b: Node<number>, bf: flatten.Func<number, number>) => {
                b.should.equal(bag);
                bf(10).should.deep.equal([10, 10]);
            });
        })
    })
})