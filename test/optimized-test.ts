import "mocha";
import { Node, NodeVisitor, Bag, input, one } from "../optimized";
import { ReduceFunc, KeyFunc, ProductFunc } from "../bag";
import * as flatten from "../flatten";

interface OptionalBagVisitor<T> {
    input?: (id: number) => void;
    one?: (value: T) => void;
    groupBy?: <K>(inputs: Bag<T>, toKey: KeyFunc<T, K>, reduce: ReduceFunc<T>) => void;
    product?: <A, B>(a: Bag<A>, b: Bag<B>, func: ProductFunc<A, B, T>) => void;
}

function check<T>(bag: Node<T>, visitor: OptionalBagVisitor<T>) {
    bag.implementation(<NodeVisitor<T, void>> visitor);
}

describe("optimized.ts", function() {
    it("input()", () => {
        input(7).id.should.equal(7);
        check(input(5), {
            input: () => null
        })
    });
    it("one()", () => check(one(0, "Hello!"), {
        one: s => s.should.equal("Hello!")
    }));
    describe("class Bag", function() {
        it("link()", () => {
            const a = one(0, "Hello world!");
            const f = (s: string) => [s.indexOf("H")];
            const link = a.link(f);
            link.implementation(<I>(b: Node<I>, bf: flatten.Func<I, number>) => {
                b.should.equal(a);
                bf.should.equal(f);
            })
        })
        it("bag()", () => {
            const a = one(42, "Hello world!");
            const bag = a.bag();
            bag.id.should.equal(42);
            bag.array.length.should.equal(1);
            bag.array[0].implementation(<I>(b: Node<I>, bf: flatten.Func<I, string>) => {
                b.should.equal(a);
                bf.should.equal(flatten.identity);
            })
        })
    })
    describe("class Link", function() {
        it("flatten()", () => {
            const a = one(0, 10);
            const f = (x: number) => [x, x * x];
            const link = a.link(flatten.identity).flatten(f);
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
            link.nodeEqual(x).should.equal(true);
            link.nodeEqual(one(0, "hello")).should.equal(false);
        })
        it("addFunc()", () => {
            const x = one(0, "something");
            const link = x.link(flatten.identity).addFunc(<I>() => () => ["xxx"]);
            link.implementation(<I>(b: Node<I>, bf: flatten.Func<I, string>) => {
                b.should.equal(x);
                bf(<I> <any> "x").should.deep.equal(["x", "xxx"]);
            });
        })
    })
    describe("class Bag", function() {
        it("constructor()", () => {
            const x = [one(1, 4).link(flatten.identity)];
            const bag = new Bag(43, x);
            bag.id.should.equal(43);
            bag.array.should.equal(x);
        })
        it("groupBy()", () => {
            const x = one(0, { a: 4, b: "hello" }).bag();
            const toKey = (v: {a:number, b: string}) => v.a;
            const reduce = <T>(a: T, b: T) => a;
            const node = x.groupBy(1, toKey, reduce);
            check(node, {
                groupBy: (links: any, k: any, r: any): void => {
                    links.should.equal(x);
                    k.should.equal(toKey);
                    r.should.equal(reduce);
                }
            });
        })
        it("product()", () => {
            const a = one(0, 3).bag();
            const b = one(1, "world").bag();
            const r = (x: number, y: string) => [{ a: x, b: y}];
            const p = a.product(2, b, r);
            check(p, {
                product: (ax: any, bx: any, rx: any): void => {
                    ax.should.equal(a);
                    bx.should.equal(b);
                    rx.should.equal(r);
                }
            });
        })
        it("flatten()", () => {
            const a = one(0, 9);
            const f = (x: number) => [x * 2];
            const r = a.bag().flatten(1, f);
            r.array[0].implementation((b: any, bf: any) => {
                b.should.equal(a);
                bf.should.equal(f);
            });
        })
        it("disjointUnion()", () => {
            const aNode = one(0, 1);
            const a = aNode.bag();
            const b = one(1, 2).bag();
            const d = a.disjointUnion(2, b);
            d.array.should.deep.equal([a.array[0], b.array[0]]);
            const d2 = a.disjointUnion(3, a);
            d2.array.length.should.equal(1);
            d2.array[0].implementation((b: Node<number>, bf: flatten.Func<number, number>) => {
                b.should.equal(aNode);
                bf(10).should.deep.equal([10, 10]);
            });
        })
    })
})