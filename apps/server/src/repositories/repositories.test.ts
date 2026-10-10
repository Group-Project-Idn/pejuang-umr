import { describe, expect, it } from "vitest";
import { IdempotencyRepository } from "./idempotency-repository";
import { FixedWindowRateLimiter } from "../services/rate-limit";

describe("bounded in-memory repositories", () => {
  it("menghapus idempotency response setelah TTL dan membatasi ukuran", () => {
    const repository = new IdempotencyRepository(100, 2);
    repository.set("p1", "event", "r1", { ok: true }, 0);
    expect(repository.get("p1", "event", "r1", 99)).toEqual({ ok: true });
    expect(repository.get("p1", "event", "r1", 100)).toBeUndefined();

    repository.set("p1", "event", "r2", 2, 200);
    repository.set("p1", "event", "r3", 3, 200);
    repository.set("p1", "event", "r4", 4, 200);
    expect(repository.size).toBe(2);
    expect(repository.get("p1", "event", "r2", 201)).toBeUndefined();
  });

  it("membersihkan rate-limit window lama dan membatasi jumlah key", () => {
    const limiter = new FixedWindowRateLimiter(1, 100, 2);
    expect(limiter.consume("a", 0)).toBe(true);
    expect(limiter.consume("a", 1)).toBe(false);
    expect(limiter.consume("b", 1)).toBe(true);
    expect(limiter.consume("c", 1)).toBe(true);
    expect(limiter.size).toBe(2);
    expect(limiter.consume("d", 101)).toBe(true);
    expect(limiter.size).toBe(1);
  });
});