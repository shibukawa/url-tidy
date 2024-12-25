import type { parseResult } from "./parser";

const cache = new Map<string, parseResult>();

export function getCache(key: TemplateStringsArray): parseResult | null {
    const keyStr = Array.from(key).join("@@");
    return cache.get(keyStr) ?? null;
}

export function setCache(key: TemplateStringsArray, value: parseResult) {
    const keyStr = Array.from(key).join("@@");
    cache.set(keyStr, value);
}
