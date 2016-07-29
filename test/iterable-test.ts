import "mocha";
import { iterable } from "../index";
import * as chai from "chai";
import { iterableEqual } from "./iterable-helper";

chai.should();

describe("namespace iterable", function () {
    it("concat()", () => {
        function *x() { yield 1; yield 3; }
        iterableEqual(iterable.immutable(x).concat(x), [1, 3, 1, 3]);
        iterableEqual(
            iterable.immutable(x).concat(iterable.immutable(x)), [1, 3, 1, 3]);
        const m = [9, 7];
        iterableEqual(iterable.immutable(m).concat(m), [9, 7, 9, 7]);
    });
    it("flatMap()", () => {
        function *x() { yield 1; yield 4; }
        iterableEqual(iterable.immutable(x).flatMap(v => [v, v]), [1, 1, 4, 4]);
    });
    it("flatten()", () => {
        function *x() { yield 1; yield 4; }
        iterableEqual(iterable.flatten([x, x]), [ 1, 4, 1, 4]);
    });
});