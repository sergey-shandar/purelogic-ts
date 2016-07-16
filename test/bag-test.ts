import { bag } from "../index";
import "mocha";
import * as chai from "chai";

chai.should();

interface Visitor<T> {
    flatten?: <I>(x: bag.Flatten<T, I>) => void;
    disjointUnion?: (x: bag.DisjointUnion<T>) => void;
    one?: (value: T) => void;
    input?: (id: number) => void;
    groupBy?: (x: bag.GroupBy<T>) => void;
    product?: <A, B>(x: bag.Product<T, A, B>) => void;

}

function check<T>(bag: bag.Bag<T>, visitor: Visitor<T>) {
    bag.implementation(<bag.Visitor<T, void>> visitor);
}

describe("namespace bag", function() {
    it("one()", () => check(bag.one(5), { one: x => x.should.equal(5) }));
    it("input()", () => {
        const bag1 = bag.input<string>();
        const bag2 = bag.one(8);
        parseInt(bag1.id).should.equal(parseInt(bag2.id) - 1);
        check(bag1, {
            input: () => null
        });
    });
    describe("class Bag", function() {
        it("flatten()", () => {
            const i = bag.input<number>();
            const f = (x: number) => [x, x * 2, x * 3];
            check(i.flatten(f), {
                flatten: <I>(x: bag.Flatten<number, I>) => {
                    x.should.deep.equal(new bag.Flatten(i, f));
                }
            });
        });
        it("disjointUnion()", () => {
            const a = bag.one(1);
            const b = bag.input<number>();
            check(a.disjointUnion(b), {
                disjointUnion: x => {
                    x.should.deep.equal(new bag.DisjointUnion(a, b));
                }
            });
        });
        it("groupBy()", () => {
            const a = bag.one("Hello World!");
            const key = (x: string) => x;
            const reduce = (a: string, _: string) => a;
            check(a.groupBy(key, reduce), {
                groupBy: (x: bag.GroupBy<string>) =>  {
                    x.should.deep.equal(new bag.GroupBy(a, key, reduce));
                }
            });
        });
        it("product()", () => {
            const a = bag.one(3);
            const b = bag.one("Hello world!");
            const f = (x: number, y: string) => [{ a: x, b: y }];
            check(a.product(b, f), {
                product: (x: bag.Product<{ a: number, b: string }, number, string>) => {
                    x.should.deep.equal(new bag.Product(a, b, f));
                }
            });
        });
        it("map()", () => {
            const a = bag.one(6);
            check(a.map(x => x / 2), {
                flatten: <I>(x: bag.Flatten<number, I>) => {
                    x.input.should.equal(a);
                    x.func(<any> 10).should.deep.equal([5]);
                }
            });
        });
        it("filter()", () => {
            const a = bag.one({ a: 5, b: "hello" });
            check(a.filter(x => x.a > 3), {
                flatten: (x: bag.Flatten<any, any>) => {
                    x.input.should.equal(a);
                    x.func({ a: 5, b: "net" }).should.deep.equal([{ a: 5, b: "net" }]);
                    x.func({ a: 0, b: "net" }).should.deep.equal([]);
                }
            });
        });
        it("compact()", () => bag.one(0).compact());
        it("reduce()", () => {
            const a = bag.one({ a: 4, b: 12 });
            const f = (x: { a: number, b: number }, y: { a: number, b: number }) => ({
                a: x.a + y.b,
                b: x.b + y.b,
            });
            check(a.reduce(f), {
                groupBy: (x: bag.GroupBy<any>) => {
                    x.input.should.equal(a);
                    chai.assert(x.toKey(5) === "");
                }
            });
        });
        it("dif()", () => {
            const a = bag.one("hello");
            const b = bag.one("world");
            check(a.dif(b), {
                groupBy: (x: bag.GroupBy<any>) => {

                    x.toKey(new bag.Dif("hello", 1, 2)).should.equal("\"hello\"");
                    x.reduce(new bag.Dif("hello", 2, 3), new bag.Dif("world", 4, 8)).should.deep
                        .equal(new bag.Dif("hello", 6, 11));

                    check(x.input, {
                        disjointUnion: xx => check(xx.a, {
                            flatten: (y: bag.Flatten<any, any>) => {
                                y.input.should.equal(a);
                                y.func("hello").should.deep.equal(
                                    [new bag.Dif("hello", 1, 0)]);
                            },
                        }),
                    });
                },
            });
        });
    });
});
