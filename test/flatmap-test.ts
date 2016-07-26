import "mocha";
import { flatMap } from "../index";
import * as chai from "chai";

chai.should();

describe("namespace flatMap", function() {
    it("identity()", () => flatMap.identity(5).should.deep.equal([5]));
});