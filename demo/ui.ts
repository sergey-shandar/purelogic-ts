import { bag, syncmem } from "../index";

// Data Structure

class Account {
    constructor(
        public name: string,
        public total: number) {
    }
}

// Logic

const accountsBag = bag.input<Account>();

const sumBug = accountsBag.map(account => account.total).reduce((a, b) => a + b);

// Data for synchronous back-end

const accountsArray = [
    new Account("First Account", 123.00),
    new Account("Second Account", 123.45),
];

// Using SyncMem back-end.

const engine = new syncmem.SyncMem();

// associate local data and generic logic.
engine.set(accountsBag, () => accountsArray);

export const total = engine.get(sumBug)()[0];