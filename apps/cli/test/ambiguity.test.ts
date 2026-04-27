import test from "node:test";
import assert from "node:assert/strict";
import { findByIdOrName, requireByIdOrName, resolveGroupByPath } from "../src/lib/context.ts";
import * as resourceResolver from "../src/lib/resource-resolver.ts";
import { mock } from "node:test";

test("requireByIdOrName detects ambiguity between name and ID prefix", () => {
  const items = [
    { id: "abc12345", name: "foo" },
    { id: "foo78901", name: "bar" },
  ];

  // Query "foo" matches name "foo" exactly, and is a prefix of ID "foo78901"
  assert.throws(() => {
    requireByIdOrName(items, "foo", "test-item");
  }, {
    message: /Ambiguous query "foo". It matches a test-item name exactly, but also matches 1 test-item id prefix\(es\)./
  });
});

test("findByIdOrName returns undefined on ambiguity between name and ID prefix", () => {
  const items = [
    { id: "abc12345", name: "foo" },
    { id: "foo78901", name: "bar" },
  ];

  assert.equal(findByIdOrName(items, "foo"), undefined);
});

test("findByIdOrName returns item on exact ID match even if name matches another item", () => {
  const items = [
    { id: "abc12345", name: "foo" },
    { id: "foo78901", name: "bar" },
  ];

  assert.deepEqual(findByIdOrName(items, "abc12345"), items[0]);
});

test("requireByIdOrName returns item on exact ID match even if name matches another item", () => {
  const items = [
    { id: "abc12345", name: "foo" },
    { id: "foo78901", name: "bar" },
  ];

  assert.deepEqual(requireByIdOrName(items, "foo78901", "test-item"), items[1]);
});
