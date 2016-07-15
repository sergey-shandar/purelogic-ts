import "mocha";
import * as chai from "chai";
import { Node, NodeVisitor, Bag, input, LinkValue, one } from "../optimized";
import { ReduceFunc, KeyFunc, ProductFunc } from "../bag";
import * as flatten from "../flatten";

chai.should();

interface OptionalBagVisitor<T> {
    input?: (id: number) => void;
    one?: (value: T) => void;
    groupBy?: (inputs: Bag<T>, toKey: KeyFunc<T>, reduce: ReduceFunc<T>) => void;
    product?: <A, B>(a: Bag<A>, b: Bag<B>, func: ProductFunc<A, B, T>) => void;
}

function check<T>(bag: Node<T>, visitor: OptionalBagVisitor<T>) {
    bag.implementation(<NodeVisitor<T, void>> visitor);
}

describe("optimized.ts", function() {
    it("input()", () => {
        input("7").id.should.equal("7");
        const b = input("5");
        b.array[0].implementation(<I>(link: LinkValue<number, I>) => {
            check(link.node, {
                input: () => null
            })
        });

    });
    it("one()", () => {
        one("0", "Hello!").array[0].implementation(<I>(link: LinkValue<string, I>) => {
            check(link.node, {
                one: s => s.should.equal("Hello!")
            })
        });
    });
    describe("class Node", function() {
        it("link()", () => {
            const a = new Node("0", <R>(visitor: NodeVisitor<string, R>) => visitor.one("Hello world!"));
            const f = (s: string) => [s.indexOf("H")];
            const link = a.link(f);
            link.implementation(<I>(x: LinkValue<number, I>) => {
                x.node.should.equal(a);
                x.func.should.equal(f);
            })
        })
        it("bag()", () => {
            const a = new Node("42", <R>(visitor: NodeVisitor<string, R>) => visitor.one("Hello world!"));
            const bag = a.bag();
            bag.id.should.equal("42");
            bag.array.length.should.equal(1);
            bag.array[0].implementation(<I>(x: LinkValue<string, I>) => {
                x.node.should.equal(a);
                x.func.should.equal(flatten.identity);
            })
        })
    })
    describe("class Link", function() {
        it("nodeId()", () => {
            one("42", "hello world").array[0].nodeId().should.equal("42");
        })
        it("flatten()", () => {
            const a = new Node("0", <R>(visitor: NodeVisitor<number, R>) => visitor.one(10));
            const f = (x: number) => [x, x * x];
            const link = a.link(flatten.identity).flatten(f);
            link.implementation(<I>(x: LinkValue<number, I>) => {
                x.node.should.equal(a);
                // an identity function should be removed
                x.func.should.equal(f);
            });
            const link2 = link.flatten(x => [x, x + 1]);
            link2.implementation(<I>(x: LinkValue<number, I>) => {
                x.node.should.equal(a);
                x.func(<I> <any> 10).should.deep.equal([10, 11, 100, 101]);
            });
        })
        it("addFunc()", () => {
            const x = new Node("0", <R>(visitor: NodeVisitor<string, R>) => visitor.one("something"));
            const link = x.link(flatten.identity).addFunc(() => () => ["xxx"]);
            link.implementation(<I>(bb: LinkValue<string, I>) => {
                bb.node.should.equal(x);
                bb.func(<I> <any> "x").should.deep.equal(["x", "xxx"]);
            });
        })
    })
    describe("class Bag", function() {
        it("constructor()", () => {
            const node = new Node("0", <R>(visitor: NodeVisitor<number, R>) => visitor.one(10));
            const x = [node.link(flatten.identity)];
            const bag = new Bag("43", x);
            bag.id.should.equal("43");
            bag.array.should.equal(x);
        })
        it("groupBy()", () => {
            const x = one("0", { a: 4, b: "hello" });
            const toKey = (v: {a:number, b: string}) => v.a.toString();
            const reduce = <T>(a: T, _: T) => a;
            const bag = x.groupBy("1", toKey, reduce);
            bag.array[0].implementation(<I>(link: LinkValue<{a:number, b: string}, I>) => {
                check(link.node, {
                    groupBy: (links: any, k: any, r: any): void => {
                        links.should.equal(x);
                        k.should.equal(toKey);
                        r.should.equal(reduce);
                    }
                });
            });
        })
        it("product()", () => {
            const a = one("0", 3);
            const b = one("1", "world");
            const r = (x: number, y: string) => [{ a: x, b: y}];
            const p = a.product("2", b, r);
            p.array[0].implementation(<I>(x: LinkValue<{a:number, b: string}, I>) => {
                check(x.node, {
                    product: (ax: any, bx: any, rx: any): void => {
                        ax.should.equal(a);
                        bx.should.equal(b);
                        rx.should.equal(r);
                    }
                });
            });
        })
        it("flatten()", () => {
            const a = one("123", 9);
            const f = (x: number) => [x * 2];
            const r = a.flatten("1", f);
            r.array[0].implementation(<I>(b: LinkValue<number, I>) => {
                b.node.id.should.equal("123");
                b.func.should.equal(f);
            });
        })
        it("disjointUnion()", () => {
            const a = one("101", 1);
            const b = one("1", 2);
            const d = a.disjointUnion("2", b);
            d.array.should.deep.equal([a.array[0], b.array[0]]);
            const d2 = a.disjointUnion("3", a);
            d2.array.length.should.equal(1);
            d2.array[0].implementation((x: LinkValue<number, number>) => {
                x.node.id.should.equal("101");
                x.func(10).should.deep.equal([10, 10]);
            });
        })
    })
})