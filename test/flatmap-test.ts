import "mocha";
import { flatMap } from "../index";
import * as chai from "chai";
import { iterableEqual } from "./iterable-helper";

chai.should();

describe("namespace flatMap", function() {
    it("identity()", () => iterableEqual(flatMap.identity(5), [5]));
});