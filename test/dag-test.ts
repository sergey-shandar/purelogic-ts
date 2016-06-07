import "mocha";
import { Dag } from "../dag";
import * as B from "../bag";

describe("dag.ts", function() {
    describe("class Dag", function() {
        it("get()", () => {
            const dag = new Dag();
            const one = B.one("Hello world!");
            const xOne = dag.get(one);
            xOne.array.length.should.equal(1);
            xOne.id.should.equal(one.id);

            const xOne2 = dag.get(one);
            xOne.should.equal(xOne2);

            const input = B.input();
            const xInput = dag.get(input);
            xInput.array.length.should.equal(1);
            xInput.id.should.equal(input.id);
            // xOne.should.not.equal(xInput);

            const flatten = one.map(x => x.toString());
            const xFlatten = dag.get(flatten);
            xFlatten.array.length.should.equal(1);
            xFlatten.id.should.equal(flatten.id);
        })
    })
})