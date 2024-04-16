import { ulid, v1 } from "./deps.ts";

export class UnauthorizedError extends Error {
    name = 'UnauthorizedError';
}

export class NotFoundError extends Error {
    name = 'NotFound';
}

export interface LockStateDTO {
    i: string;
    k: string;
    v: boolean;
    e: number;
}

class LockState {
    static create() {
        return new LockState({
            e: -1,
            i: ulid().toString().toLowerCase(),
            k: v1.generate().toString().toLowerCase(),
            v: false,
        })
    }

    public readonly i!: string;
    public readonly k!: string;
    public v!: boolean;
    public e!: number;

    constructor(obj: LockStateDTO) {
        Object.assign(this, obj);
    }

    toggle() {
        this.v = !this.v;
    }

    lock(expireTime: number) {
        this.v = true;
        this.e = expireTime;
    }

    unlock() {
        this.v = false;
    }

    isLocked() {
        return this.v === true;
    }

    isValidKey(k: string) {
        if (this.k !== k) {
            throw new UnauthorizedError('key is not valid');
        }

        return true;
    }

    getId() {
        return this.i;
    }

    getKey() {
        return this.k;
    }

    getTtl() {
        if (!this.isExpiring()) {
            return -1;
        }

        return Date.now() + this.e;
    }

    isExpiring() {
        return this.e > -1;
    }
}

export class LockStateAppService {
    constructor(private readonly kv: Deno.Kv) {

    }

    private async save(lock: LockState) {
        if (lock.isExpiring()) {
            await this.kv.set(["locks", lock.getId()], lock, {
                expireIn: lock.getTtl()
            });
        } else {
            await this.kv.set(["locks", lock.getId()], lock);
        }
    }

    private async get(lockId: string): Promise<LockState> {
        const lock = await this.kv.get<LockStateDTO>(["locks", lockId.toLowerCase()]);
        
        if (!lock.value) {
            throw new NotFoundError('Lock not found');
        }

        return new LockState(lock.value);
    }

    async lockByIdAndKey(lockId: string, lockKey: string, expireTime: number) {
        const lock = await this.get(lockId);
        lock.isValidKey(lockKey);
        lock.lock(expireTime);
        await this.save(lock);
        return lock.isLocked();
    }


    async unlock(lockId: string, lockKey: string) {
        const lock = await this.get(lockId);
        lock.isValidKey(lockKey);
        lock.unlock();
        await this.save(lock);
        return lock.isLocked();
    }

    async toggle(lockId: string, lockKey: string): Promise<boolean> {
        const lock = await this.get(lockId);
        lock.isValidKey(lockKey);
        lock.toggle();
        await this.save(lock);
        return lock.isLocked();
    }

    async isLocked(lockId: string): Promise<boolean> {
        const lock = await this.get(lockId);
        return lock.isLocked();
    }

    async createNew() {
        const newLock = LockState.create();
        await this.save(newLock);
        return newLock;
    }
}
