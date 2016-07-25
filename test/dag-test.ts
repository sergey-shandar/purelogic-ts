import "mocha";
import * as chai from "chai";
import { bag, dag } from "../index";

chai.should();

describe("namespac dag", function() {
    describe("class Dag", function() {
        it("get()", () => {
            const d = new dag.Dag();
            const one = bag.one("Hello world!");
            const xOne = d.get(one);
            xOne.array.length.should.equal(1);
            xOne.id.should.equal(one.id);

            const xOne2 = d.get(one);
            xOne.should.equal(xOne2);

            const input = bag.input<number>();
            const xInput = d.get(input);
            xInput.array.length.should.equal(1);
            xInput.id.should.equal(input.id);
            xOne.should.not.equal(xInput);

            const flatten = one.map(x => x + "xxx");
            const xFlatten = d.get(flatten);
            xFlatten.array.length.should.equal(1);
            xFlatten.id.should.equal(flatten.id);
            xFlatten.array[0].nodeId().should.equal(one.id);
            xFlatten.id.should.not.equal(one.id);

            const disjointUnion = flatten.disjointUnion(one);
            const xDisjointUnion = d.get(disjointUnion);
            xDisjointUnion.array.length.should.equal(1);
            xDisjointUnion.array[0].nodeId().should.equal(one.id);
            xDisjointUnion.id.should.equal(disjointUnion.id);

            const flatten2 = input.filter(x => x > 0).map(x => x.toString());
            const xFlatten2 = d.get(flatten2);
            xFlatten2.array.length.should.equal(1);
            xFlatten2.array[0].nodeId().should.equal(input.id);
            xFlatten2.id.should.equal(flatten2.id);

            const disjointUnion2 = flatten.disjointUnion(flatten2);
            const xDisjointUnion2 = d.get(disjointUnion2);
            xDisjointUnion2.array.length.should.equal(2);
            xDisjointUnion2.id.should.equal(disjointUnion2.id);
            xDisjointUnion2.array[0].nodeId().should.equal(one.id);
            xDisjointUnion2.array[1].nodeId().should.equal(input.id);

            const groupBy = one.reduce((a, _) => a);
            const xGroupBy = d.get(groupBy);
            xGroupBy.id.should.equal(groupBy.id);
            xGroupBy.array.length.should.equal(1);
            xGroupBy.array[0].nodeId().should.equal(groupBy.id);

            const product = one.product(input, (a, b) => [{ a: a, b: b}]);
            const xProduct = d.get(product);
            xProduct.array.length.should.equal(1);
            xProduct.id.should.equal(product.id);
            xProduct.array[0].nodeId().should.equal(product.id);
        });
    });
});