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
        const b = input(5);
        b.array[0].implementation(<I>(n: Node<I>, bf: flatten.Func<I, number>) => {
            check(n, {
                input: () => null
            })
        });

    });
    it("one()", () => {
        one(0, "Hello!").array[0].implementation(<I>(n: Node<I>, bf: flatten.Func<I, string>) => {
            check(n, {
                one: s => s.should.equal("Hello!")
            })
        });
    });
    describe("class Node", function() {
        it("link()", () => {
            const a = new Node(0, <R>(visitor: NodeVisitor<string, R>) => visitor.one("Hello world!"));
            const f = (s: string) => [s.indexOf("H")];
            const link = a.link(f);
            link.implementation(<I>(b: Node<I>, bf: flatten.Func<I, number>) => {
                b.should.equal(a);
                bf.should.equal(f);
            })
        })
        it("bag()", () => {
            const a = new Node(42, <R>(visitor: NodeVisitor<string, R>) => visitor.one("Hello world!"));
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
            const a = new Node(0, <R>(visitor: NodeVisitor<number, R>) => visitor.one(10));
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
        it("nodeEqual()", () => {
            const x = new Node(0, <R>(visitor: NodeVisitor<string, R>) => visitor.input());
            const x1 = new Node(0, <R>(visitor: NodeVisitor<string, R>) => visitor.input());
            const y = new Node(1, <R>(visitor: NodeVisitor<string, R>) => visitor.input());
            const link = x.link(v => [v, v + v]);
            link.nodeEqual(x).should.equal(true);
            link.nodeEqual(x1).should.equal(true);
            link.nodeEqual(y).should.equal(false);
        })
        it("addFunc()", () => {
            const x = new Node(0, <R>(visitor: NodeVisitor<string, R>) => visitor.one("something"));
            const link = x.link(flatten.identity).addFunc(<I>() => () => ["xxx"]);
            link.implementation(<I>(b: Node<I>, bf: flatten.Func<I, string>) => {
                b.should.equal(x);
                bf(<I> <any> "x").should.deep.equal(["x", "xxx"]);
            });
        })
    })
    describe("class Bag", function() {
        it("constructor()", () => {
            const node = new Node(0, <R>(visitor: NodeVisitor<number, R>) => visitor.one(10));
            const x = [node.link(flatten.identity)];
            const bag = new Bag(43, x);
            bag.id.should.equal(43);
            bag.array.should.equal(x);
        })
        it("groupBy()", () => {
            const x = one(0, { a: 4, b: "hello" });
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
            const a = one(0, 3);
            const b = one(1, "world");
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
            const a = one(123, 9);
            const f = (x: number) => [x * 2];
            const r = a.flatten(1, f);
            r.array[0].implementation((b: any, bf: any) => {
                b.id.should.equal(123);
                bf.should.equal(f);
            });
        })
        it("disjointUnion()", () => {
            const a = one(101, 1);
            const b = one(1, 2);
            const d = a.disjointUnion(2, b);
            d.array.should.deep.equal([a.array[0], b.array[0]]);
            const d2 = a.disjointUnion(3, a);
            d2.array.length.should.equal(1);
            d2.array[0].implementation((b: Node<number>, bf: flatten.Func<number, number>) => {
                b.id.should.equal(101);
                bf(10).should.deep.equal([10, 10]);
            });
        })
    })
})