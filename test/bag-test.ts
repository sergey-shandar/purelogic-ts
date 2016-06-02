import * as Bag from "../bag";
import "mocha";
import * as chai from "chai";

chai.should();

interface Visitor<T> {
    flatten?: <I>(input: Bag.Bag<I>, func: (value: I) => T[]) => void;
    disjointUnion?: (a: Bag.Bag<T>, b: Bag.Bag<T>) => void;
    one?: (value: T) => void;
    input?: (id: number) => void;
    groupBy?: <K>(input: Bag.Bag<T>, toKey: (value: T) => K, reduce: (a: T, b: T) => T) => void;
    product?: <A, B>(a: Bag.Bag<A>, b: Bag.Bag<B>, func: (a: A, b: B) => T[]) => void;
 
}

function check<T>(bag: Bag.Bag<T>, visitor: Visitor<T>) {
    bag.implementation(<Bag.Visitor<T, void>> visitor);
}

describe("bag.ts", function() {
    it("one()", () => check(Bag.one(5), { one: x => x.should.equal(5) }));
    it("input()", () => check(Bag.input<string>(), {
        input: i => (typeof i).should.equal("number") 
    }));
    describe("class Bag", function() {
        it("flatten()", () => {
            const i = Bag.input<number>();
            const f = (x: number) => [x, x * 2, x * 3];
            check(i.flatten(f), {
                flatten: <I>(input: Bag.Bag<I>, func: (value: I) => number[]) => {
                    input.should.equal(i);
                    func.should.equal(f); 
                }
            });
        });
        it("disjointUnion()", () => {
            const a = Bag.one(1);
            const b = Bag.input<number>();
            check(a.disjointUnion(b), {
                disjointUnion: (x, y) => {
                    x.should.equal(a);
                    y.should.equal(b);
                }
            });
        });
        it("groupBy()", () => {
            const a = Bag.one("Hello World!");
            const key = (x: string) => x;
            const reduce = (a: string, b: string) => a; 
            check(a.groupBy(key, reduce), {
                groupBy: (ax: any, keyx: any, reducex: any) =>  {
                    ax.should.equal(a);
                    keyx.should.equal(key);
                    reducex.should.equal(reduce);
                } 
            });
        });
        it("product()", () => {
            const a = Bag.one(3);
            const b = Bag.one("Hello world!");
            const f = (x: number, y: string) => [{ a: a, b: b }]; 
            check(a.product(b, f), {
                product: (ax: any, bx: any, fx: any) => {
                    ax.should.equal(a);
                    bx.should.equal(b);
                    fx.should.equal(f);
                }
            }); 
        });
        it("map()", () => {
            const a = Bag.one(6);
            check(a.map(x => x / 2), {
                flatten: (ax: any, f: (x: number) => number[]) => {
                    ax.should.equal(a);
                    f(10).should.deep.equal([5]);
                }
            });
        });
        it("filter()", () => {
            const a = Bag.one({ a: 5, b: "hello" });
            check(a.filter(x => x.a > 3), {
                flatten: (ax: any, f: any) => {
                    ax.should.equal(a);
                    f({ a: 5, b: "net" }).should.deep.equal([{ a: 5, b: "net" }]);
                    f({ a: 0, b: "net" }).should.deep.equal([]);
                }
            }); 
        });
        it("compact()", () => Bag.one(0).compact());
        it("reduce()", () => {
            const a = Bag.one({ a: 4, b: 12 });
            const f = (x: { a: number, b: number }, y: { a: number, b: number }) => ({
                a: x.a + y.b,
                b: x.b + y.b,
            }); 
            check(a.reduce(f), {
                groupBy: (ax: any, kx: any, rx: any) => {
                    ax.should.equal(a);
                    chai.assert(kx(5) === null);
                } 
            });
        });
        it("dif()", () => {
            const a = Bag.one("hello");
            const b = Bag.one("world");
            check(a.dif(b), {
                groupBy: (
                    m: Bag.Bag<Bag.Dif<string>>,
                    kx: (v: Bag.Dif<string>) => string, rx: any) => {
                            
                    kx(new Bag.Dif("hello", 1, 2)).should.equal("hello");
                    rx(new Bag.Dif("hello", 2, 3), new Bag.Dif("world", 4, 8)).should.deep
                        .equal(new Bag.Dif("hello", 6, 11));
                    
                    check(m, {
                        disjointUnion: (ad, bd) => check(ad, {
                            flatten: (ax: any, f: any) => {
                                ax.should.equal(a);
                                f("hello").should.deep.equal(
                                    [new Bag.Dif("hello", 1, 0)]);
                            },       
                        }),
                    });
                },
            }); 
        });
    });
});
