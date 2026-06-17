import test from "node:test";
import assert from "node:assert/strict";
import { normalizeUrl, hashUrl } from "./src/lib/dedup.ts";
import { cleanText, stripHtmlTags } from "./src/lib/text-cleaner.ts";
import { calcAgreement } from "./src/lib/stats/agreement.ts";

test("normalizeUrl strips tracking params and normalizes trailing slash", () => {
  const normalized = normalizeUrl("https://example.com/path/?utm_source=x&ref=y&b=2&a=1");
  assert.equal(normalized, "https://example.com/path?a=1&b=2");
});

test("hashUrl is stable for same normalized URL", () => {
  const url = normalizeUrl("https://example.com/article/?utm_medium=email");
  assert.equal(hashUrl(url), hashUrl(url));
});

test("stripHtmlTags removes markup and cleanText truncates copyright tail", () => {
  const stripped = stripHtmlTags('<div><p>Hello <strong>world</strong>.</p></div>');
  const longBody = `${stripped}\nThis article contains enough surrounding text to exceed the cleaner threshold for post-processing.\nCopyright 2025 Example`;
  const cleaned = cleanText(longBody);
  assert.equal(stripped, "Hello world.");
  assert.equal(cleaned, `${stripped}\nThis article contains enough surrounding text to exceed the cleaner threshold for post-processing.`);
});

test("calcAgreement returns perfect agreement and kappa for identical labels", () => {
  const annotationsA = [
    { id: "a1", node_id: "n1" },
    { id: "a2", node_id: "n2" },
  ];
  const annotationsB = [
    { id: "b1", node_id: "n1" },
    { id: "b2", node_id: "n2" },
  ];
  const nodes = [
    { id: "n1", parent_id: null },
    { id: "n2", parent_id: null },
    { id: "n3", parent_id: null },
  ];

  const result = calcAgreement(
    annotationsA as never,
    annotationsB as never,
    nodes as never,
  );

  assert.equal(result.agreementRate, 1);
  assert.equal(result.kappa, 1);
  assert.equal(result.matchedCount, 2);
});
