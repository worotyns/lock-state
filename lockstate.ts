import { ulid, v1 } from "./deps.ts";

export class UnauthorizedError extends Error {
  name = "UnauthorizedError";
}

export class NotFoundError extends Error {
  name = "NotFound";
}

export interface LockStateDTO {
  i: string;
  k: string;
  v: boolean;
  e: number;
}

export class LockState {
  static create() {
    return new LockState({
      e: -1,
      i: ulid().toString().toLowerCase(),
      k: v1.generate().toString().toLowerCase(),
      v: false,
    });
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
    
    if (expireTime > -1) {
      this.e = Date.now() + (expireTime * 1000);
    }    
  }

  unlock() {
    this.v = false;
    this.e = -1;
  }

  isLocked(now = Date.now()) {
    if (this.v === false) {
      return false;
    }
    
    return this.checkIsExpired(now) === false;
  }

  isValidKey(k: string) {
    if (this.k !== k) {
      throw new UnauthorizedError("key is not valid");
    }

    return true;
  }

  getId() {
    return this.i;
  }

  getKey() {
    return this.k;
  }

  private checkIsExpired(now: number): boolean {
    return this.isExpiring() ? now > this.e : false;
  }

  private isExpiring() {
    return this.e > -1;
  }
}

export class LockStateAppService {
  constructor(private readonly kv: Deno.Kv) {
  }

  private async save(lock: LockState) {
    await this.kv.set(["locks", lock.getId()], lock);
  }

  private async get(lockId: string): Promise<LockState> {
    const lock = await this.kv.get<LockStateDTO>([
      "locks",
      lockId.toLowerCase(),
    ]);

    if (!lock.value) {
      throw new NotFoundError("Lock not found");
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
