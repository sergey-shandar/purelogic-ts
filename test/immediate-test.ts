import "mocha";
import * as index from "../index";

it("immediate()", async () => {
    await index.immediate();
});