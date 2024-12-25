import { test, expect } from "vitest";
import { getCache, setCache } from "./cache";
import type { parseResult } from "./parser";

function getTaggedTemplateArray(template: TemplateStringsArray, ..._values: string[]) {
    return template;
}

test("cache-test", () => {
    const key = getTaggedTemplateArray`http://cache.test.1/${"test"}/`;

    // not stored yet
    expect(getCache(key)).toBe(null);
    const cachedValue = {
        hostname: { type: "static", value: "expected.cache.test.1" },
        paths: [],
        queries: [],
    } as parseResult;
    setCache(key, cachedValue);
    expect(getCache(key)).toStrictEqual({ ...cachedValue });
});
