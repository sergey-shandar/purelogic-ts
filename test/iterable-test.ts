import "mocha";
import { iterable } from "../index";
import * as chai from "chai";
import { iterableEqual } from "./iterable-helper";

chai.should();

describe("namespace iterable", function () {
    it("concat()", () => {
        function *x() { yield 1; yield 3; }
        const i = x();
        iterableEqual(iterable.concat(i, i), [1, 3]);
        iterableEqual(iterable.concat(x(), x()), [1, 3, 1, 3]);
        iterableEqual(
            iterable.concat(iterable.factory(x), iterable.factory(x)), [1, 3, 1, 3]);
        const m = [9, 7];
        iterableEqual(
            iterable.concat(iterable.fromArray(m), iterable.fromArray(m)), [9, 7, 9, 7]);
    });
    it("flatMap()", () => {
        function *x() { yield 1; yield 4; }
        iterableEqual(iterable.flatMap(x(), v => [v, v]), [1, 1, 4, 4]);
    });
    it("flatten()", () => {
        function *x() { yield 1; yield 4; }
        iterableEqual(iterable.flatten([x(), x()]), [ 1, 4, 1, 4]);
    });
});