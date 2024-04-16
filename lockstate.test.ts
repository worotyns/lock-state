import { assert } from "./deps.ts";
import { LockState } from "./lockstate.ts";

Deno.test('lockstate with no expire time', function() {
    const lock = LockState.create();
    lock.lock(-1);
    assert(true === lock.isLocked());
});

Deno.test('lockstate with expire time', function() {
    const lock = LockState.create();
    lock.lock(10);
    const now = Date.now();
    const before = Date.now() + 9_000;
    const after = Date.now() + 90_000;
    assert(true === lock.isLocked(now));
    assert(true === lock.isLocked(before));
    assert(false === lock.isLocked(after));
});