import { expect, test, describe } from "vitest";
import { url, customFormatter } from "./formatter";

describe("formatter", () => {
    const cases: {
        name: string;
        actual: () => string;
        expected: string;
    }[] = [
        {
            name: "simple",
            actual: () => url`http://example.com/${1000}`,
            expected: "http://example.com/1000",
        },
        {
            name: "domain",
            actual: () => url`${"s3"}://bucket.example.com/file/path`,
            expected: "s3://bucket.example.com/file/path",
        },
        {
            name: "protocol-relative URL (static)",
            actual: () => url`//bucket.example.com/file/path`,
            expected: "//bucket.example.com/file/path",
        },
        {
            name: "protocol-relative URL (dynamic)",
            actual: () => url`${null}://bucket.example.com/file/path`,
            expected: "//bucket.example.com/file/path",
        },
        {
            name: "hostname",
            actual: () => url`http://${"api.example.com"}/to/resource/path`,
            expected: "http://api.example.com/to/resource/path",
        },
        {
            name: "omit hostname (static)",
            actual: () => url`/to/resource/path`,
            expected: "/to/resource/path",
        },
        {
            name: "omit hostname (dynamic)",
            actual: () => url`http://${null}/to/resource/path`,
            expected: "/to/resource/path",
        },
        {
            name: "port",
            actual: () => url`http://api.example.com:${1000}/to/resource/path`,
            expected: "http://api.example.com:1000/to/resource/path",
        },
        {
            name: "omit port (dynamic)",
            actual: () => url`http://api.example.com:${null}/to/resource/path`,
            expected: "http://api.example.com/to/resource/path",
        },
        {
            name: "path placeholder - string",
            actual: () => url`http://api.example.com/users/${"bob"}/`,
            expected: "http://api.example.com/users/bob/",
        },
        {
            name: "path placeholder - number",
            actual: () => url`http://api.example.com/users/${1000}/`,
            expected: "http://api.example.com/users/1000/",
        },
        {
            name: "path placeholder - number",
            actual: () => url`http://api.example.com/users/${1000}/`,
            expected: "http://api.example.com/users/1000/",
        },
        {
            name: "path placeholder - array",
            actual: () => url`http://api.example.com/users/${["a", "b", 1000]}/`,
            expected: "http://api.example.com/users/a/b/1000/",
        },
        {
            name: "path placeholder - string with path separator",
            actual: () => url`http://api.example.com/users/${"a/b/1000"}/`,
            expected: "http://api.example.com/users/a/b/1000/",
        },
        {
            name: "path placeholder - array (empty)",
            actual: () => url`http://api.example.com/users/${[]}/`,
            expected: "http://api.example.com/users/",
        },
        {
            name: "query placeholder - static",
            actual: () => url`http://api.example.com/users/?key=value`,
            expected: "http://api.example.com/users/?key=value",
        },
        {
            name: "query placeholder - static - same keys",
            actual: () => url`http://api.example.com/users/?key=value&key=value2`,
            expected: "http://api.example.com/users/?key=value&key=value2",
        },
        {
            name: "query placeholder - dynamic string",
            actual: () => url`http://api.example.com/users/?key=${"str-value"}`,
            expected: "http://api.example.com/users/?key=str-value",
        },
        {
            name: "query placeholder - null",
            actual: () => url`http://api.example.com/users/?key=${null}`,
            expected: "http://api.example.com/users/",
        },
        {
            name: "query placeholder - dynamic array: overwrite existing key",
            actual: () => url`http://api.example.com/users/?key=old&key=${["a", "b", "c"]}`,
            expected: "http://api.example.com/users/?key=a&key=b&key=c",
        },
        {
            name: "query placeholder - query set via record",
            actual: () => url`http://api.example.com/users/?${{ key: ["a", "b", "c"], key2: "value" }}`,
            expected: "http://api.example.com/users/?key=a&key=b&key=c&key2=value",
        },
        {
            name: "query placeholder - query set via record via URLSearchParams",
            actual: () => url`http://api.example.com/users/?key=old&${new URLSearchParams("key=a&key=b&key=c&key2=value")}`,
            expected: "http://api.example.com/users/?key=a&key=b&key=c&key2=value",
        },
        {
            name: "hash placeholder - static",
            actual: () => url`http://api.example.com/users/#hash`,
            expected: "http://api.example.com/users/#hash",
        },
        {
            name: "hash placeholder - dynamic",
            actual: () => url`http://api.example.com/users/#${"hash"}`,
            expected: "http://api.example.com/users/#hash",
        },
        {
            name: "hash placeholder - omit",
            actual: () => url`http://api.example.com/users/#${null}`,
            expected: "http://api.example.com/users/",
        },
    ];
    for (const { name, actual, expected } of cases) {
        test(name, () => {
            expect(actual()).toEqual(expected);
        });
    }
});

describe("customFormatter", () => {
    const cases: {
        name: string;
        actual: () => string;
        expected: string;
    }[] = [
        {
            name: "simple",
            actual: () => customFormatter({ username: "user", password: "pass" })`http://example.com/${1000}`,
            expected: "http://user:pass@example.com/1000",
        },
    ];
    for (const { name, actual, expected } of cases) {
        test(name, () => {
            expect(actual()).toEqual(expected);
        });
    }
});
