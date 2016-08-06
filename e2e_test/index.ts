import { iterable } from "purelogic-ts";

function *x() { yield 1; }

iterable.stateless(x);