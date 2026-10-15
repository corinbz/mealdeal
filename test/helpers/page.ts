import assert from "node:assert/strict";

/** A value the test expects to be there: fails the test, rather than reading on, when it is null or undefined. */
export function must<T>(x: T, message?: string): NonNullable<T> {
  assert.ok(x !== null && x !== undefined, message ?? "expected a value");
  return x;
}
