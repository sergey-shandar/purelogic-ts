import * as Bag from "../bag";
import "mocha";

describe("bag.ts", function() {
    it("one()", () => {
        const one = Bag.one(5);
        one.implementation({
            flatten: null,
            disjointUnion: null,
            one: x => null,
            input: null,
            groupBy: null,
            product: null,
        });
    });
    it("input()", () => {
        Bag.input<number>(); 
    });    
    describe("class bag", function() {
        it("flatten()", () => {
           Bag.input<number>().flatten(x => [x, x * 2, x * 3]);
        });
        it("disjointUnion()", () => {
           Bag.one(1).disjointUnion(Bag.input<number>()); 
        });
        it("groupBy()", () => {
           Bag.one("Hello World!").groupBy(x => x, (a, b) => a); 
        });
        it("product()", () => {
           Bag.one(3).product(Bag.one("Hello world!"), (a, b) => [{ a: a, b: b }]); 
        });
        it("map()", () => {
           Bag.one(6).map(x => x / 2); 
        });
        it("filter()", () => {
           Bag.one({ a: 5, b: "hello" }).filter(x => x.a > 3); 
        });
        it("compact()", () => {
            Bag.one(0).compact();
        });
        it("reduce()", () => {
           Bag.one({ a: 4, b: 12 }).reduce((x, y) => ({ a: x.a + y.b, b: x.b + y.b })); 
        });
        it("dif()", () => {
           Bag.one(6).dif(Bag.one(7)); 
        });
    });
});