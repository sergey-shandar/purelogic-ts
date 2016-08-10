import "mocha";
import * as chai from "chai";
import { bag, optimized } from "../index";

chai.should();

describe("namespac optimized", function() {
    describe("class Dag", function() {
        it("get()", () => {
            const d = new optimized.Dag();
            const one = bag.one("Hello world!");
            const xOne = d.get(one);
            xOne.links.length.should.equal(1);
            xOne.id.should.equal(one.id);

            const xOne2 = d.get(one);
            xOne.should.equal(xOne2);

            const input = bag.input<number>();
            const xInput = d.get(input);
            xInput.links.length.should.equal(1);
            xInput.id.should.equal(input.id);
            xOne.should.not.equal(xInput);

            const flatMap = one.map(x => x + "xxx");
            const xFlatMap = d.get(flatMap);
            xFlatMap.links.length.should.equal(1);
            xFlatMap.id.should.equal(flatMap.id);
            xFlatMap.links[0].nodeId().should.equal(one.id);
            xFlatMap.id.should.not.equal(one.id);

            const disjointUnion = flatMap.disjointUnion(one);
            const xDisjointUnion = d.get(disjointUnion);
            xDisjointUnion.links.length.should.equal(1);
            xDisjointUnion.links[0].nodeId().should.equal(one.id);
            xDisjointUnion.id.should.equal(disjointUnion.id);

            const flatMap2 = input.filter(x => x > 0).map(x => x.toString());
            const xFlatMap2 = d.get(flatMap2);
            xFlatMap2.links.length.should.equal(1);
            xFlatMap2.links[0].nodeId().should.equal(input.id);
            xFlatMap2.id.should.equal(flatMap2.id);

            const disjointUnion2 = flatMap.disjointUnion(flatMap2);
            const xDisjointUnion2 = d.get(disjointUnion2);
            xDisjointUnion2.links.length.should.equal(2);
            xDisjointUnion2.id.should.equal(disjointUnion2.id);
            xDisjointUnion2.links[0].nodeId().should.equal(one.id);
            xDisjointUnion2.links[1].nodeId().should.equal(input.id);

            const groupBy = one.reduce((a, _) => a);
            const xGroupBy = d.get(groupBy);
            xGroupBy.id.should.equal(groupBy.id);
            xGroupBy.links.length.should.equal(1);
            xGroupBy.links[0].nodeId().should.equal(groupBy.id);

            const product = one.product(input, (a, b) => [{ a: a, b: b}]);
            const xProduct = d.get(product);
            xProduct.links.length.should.equal(1);
            xProduct.id.should.equal(product.id);
            xProduct.links[0].nodeId().should.equal(product.id);
        });
    });
});