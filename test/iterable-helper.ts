import * as chai from "chai";
import { iterable } from "../index";

chai.should();

export function iterableEqual<T>(a: iterable.I<T>, b: iterable.I<T>) {
    iterable.toArray(a).should.deep.equal(iterable.toArray(b));
}