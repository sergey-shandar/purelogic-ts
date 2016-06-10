import * as Bag from "../bag";
import "mocha";
import * as chai from "chai";

chai.should();

interface Visitor<T> {
    flatten?: <I>(x: Bag.Flatten<T, I>) => void;
    disjointUnion?: (x: Bag.DisjointUnion<T>) => void;
    one?: (value: T) => void;
    input?: (id: number) => void;
    groupBy?: (x: Bag.GroupBy<T>) => void;
    product?: <A, B>(x: Bag.Product<T, A, B>) => void;

}

function check<T>(bag: Bag.Bag<T>, visitor: Visitor<T>) {
    bag.implementation(<Bag.Visitor<T, void>> visitor);
}

describe("bag.ts", function() {
    it("one()", () => check(Bag.one(5), { one: x => x.should.equal(5) }));
    it("input()", () => {
        const bag = Bag.input<string>()
        const bag2 = Bag.one(8);
        Number.parseInt(bag.id).should.equal(Number.parseInt(bag2.id) - 1);
        check(bag, {
            input: () => null
        })
    });
    describe("class Bag", function() {
        it("flatten()", () => {
            const i = Bag.input<number>();
            const f = (x: number) => [x, x * 2, x * 3];
            check(i.flatten(f), {
                flatten: <I>(x: Bag.Flatten<number, I>) => {
                    x.should.deep.equal(new Bag.Flatten(i, f));
                }
            });
        });
        it("disjointUnion()", () => {
            const a = Bag.one(1);
            const b = Bag.input<number>();
            check(a.disjointUnion(b), {
                disjointUnion: x => {
                    x.should.deep.equal(new Bag.DisjointUnion(a, b));
                }
            });
        });
        it("groupBy()", () => {
            const a = Bag.one("Hello World!");
            const key = (x: string) => x;
            const reduce = (a: string, b: string) => a;
            check(a.groupBy(key, reduce), {
                groupBy: (x: Bag.GroupBy<string>) =>  {
                    x.should.deep.equal(new Bag.GroupBy(a, key, reduce));
                }
            });
        });
        it("product()", () => {
            const a = Bag.one(3);
            const b = Bag.one("Hello world!");
            const f = (x: number, y: string) => [{ a: x, b: y }];
            check(a.product(b, f), {
                product: <A, B>(x: Bag.Product<{ a: number, b: string }, number, string>) => {
                    x.should.deep.equal(new Bag.Product(a, b, f));
                }
            });
        });
        it("map()", () => {
            const a = Bag.one(6);
            check(a.map(x => x / 2), {
                flatten: <I>(x: Bag.Flatten<number, I>) => {
                    x.input.should.equal(a)
                    x.func(<any> 10).should.deep.equal([5]);
                }
            });
        });
        it("filter()", () => {
            const a = Bag.one({ a: 5, b: "hello" });
            check(a.filter(x => x.a > 3), {
                flatten: (x: Bag.Flatten<any, any>) => {
                    x.input.should.equal(a);
                    x.func({ a: 5, b: "net" }).should.deep.equal([{ a: 5, b: "net" }]);
                    x.func({ a: 0, b: "net" }).should.deep.equal([]);
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
                groupBy: (x: Bag.GroupBy<any>) => {
                    x.input.should.equal(a);
                    chai.assert(x.toKey(5) === null);
                }
            });
        });
        it("dif()", () => {
            const a = Bag.one("hello");
            const b = Bag.one("world");
            check(a.dif(b), {
                groupBy: (x: Bag.GroupBy<any>) => {

                    x.toKey(new Bag.Dif("hello", 1, 2)).should.equal('"hello"');
                    x.reduce(new Bag.Dif("hello", 2, 3), new Bag.Dif("world", 4, 8)).should.deep
                        .equal(new Bag.Dif("hello", 6, 11));

                    check(x.input, {
                        disjointUnion: xx => check(xx.a, {
                            flatten: (y: Bag.Flatten<any, any>) => {
                                y.input.should.equal(a);
                                y.func("hello").should.deep.equal(
                                    [new Bag.Dif("hello", 1, 0)]);
                            },
                        }),
                    });
                },
            });
        });
    });
});
