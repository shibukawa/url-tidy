import { expect, test, describe } from "vitest";
import { parse, overwrite } from "./parser";
import type { overwriteOption, parseResult } from "./parser";

describe("valid cases", () => {
    const cases: {
        name: string;
        actual: parseResult;
        expected: parseResult;
    }[] = [
        {
            name: "no param: protocol, hostname",
            actual: parse`http://example.com`,
            expected: {
                protocol: { type: "static", value: "http" },
                hostname: { type: "static", value: "example.com" },
                paths: [],
                queries: [],
            },
        },
        {
            name: "no param: protocol relative, hostname",
            actual: parse`//example.com`,
            expected: {
                hostname: { type: "static", value: "example.com" },
                paths: [],
                queries: [],
            },
        },
        {
            name: "no param: hostname, port",
            actual: parse`//example.com:8080`,
            expected: {
                hostname: { type: "static", value: "example.com" },
                port: { type: "static", value: 8080 },
                paths: [],
                queries: [],
            },
        },
        {
            name: "no param: protocol, hostname, path",
            actual: parse`http://example.com/path/to/resource`,
            expected: {
                protocol: { type: "static", value: "http" },
                hostname: { type: "static", value: "example.com" },
                paths: [{ type: "static", value: "/path/to/resource" }],
                queries: [],
            },
        },
        {
            name: "no param: abs path",
            actual: parse`/path/to/resource`,
            expected: {
                paths: [{ type: "static", value: "/path/to/resource" }],
                queries: [],
            },
        },
        {
            name: "no param: rel path",
            actual: parse`./path/to/resource`,
            expected: {
                paths: [{ type: "static", value: "./path/to/resource" }],
                queries: [],
            },
        },
        {
            name: "no param: protocol, hostname, port, path",
            actual: parse`http://example.com:8080/path/to/resource`,
            expected: {
                protocol: { type: "static", value: "http" },
                hostname: { type: "static", value: "example.com" },
                port: { type: "static", value: 8080 },
                paths: [{ type: "static", value: "/path/to/resource" }],
                queries: [],
            },
        },
        {
            name: "no param: protocol, hostname, port, path, query",
            actual: parse`http://example.com:8080/path/to/resource?query1=value1&query2=value2`,
            expected: {
                protocol: { type: "static", value: "http" },
                hostname: { type: "static", value: "example.com" },
                port: { type: "static", value: 8080 },
                paths: [{ type: "static", value: "/path/to/resource" }],
                queries: [
                    { key: "query1", value: { type: "static", value: "value1" } },
                    { key: "query2", value: { type: "static", value: "value2" } },
                ],
            },
        },
        {
            name: "no param: protocol, hostname, port, path, fragment",
            actual: parse`http://example.com:8080/path/to/resource#test`,
            expected: {
                protocol: { type: "static", value: "http" },
                hostname: { type: "static", value: "example.com" },
                port: { type: "static", value: 8080 },
                paths: [{ type: "static", value: "/path/to/resource" }],
                queries: [],
                fragment: { type: "static", value: "test" },
            },
        },
        {
            name: "no param: protocol, hostname, port, path, query, fragment",
            actual: parse`http://example.com:8080/path/to/resource?query1=value1&query2=value2#test`,
            expected: {
                protocol: { type: "static", value: "http" },
                hostname: { type: "static", value: "example.com" },
                port: { type: "static", value: 8080 },
                paths: [{ type: "static", value: "/path/to/resource" }],
                queries: [
                    { key: "query1", value: { type: "static", value: "value1" } },
                    { key: "query2", value: { type: "static", value: "value2" } },
                ],
                fragment: { type: "static", value: "test" },
            },
        },
        {
            name: "param: [protocol], hostname",
            actual: parse`${"https"}://example.com`,
            expected: {
                protocol: { type: "param", index: 0 },
                hostname: { type: "static", value: "example.com" },
                paths: [],
                queries: [],
            },
        },
        {
            name: "param: protocol, [hostname]",
            actual: parse`http://${"example.com"}`,
            expected: {
                protocol: { type: "static", value: "http" },
                hostname: { type: "param", index: 0 },
                paths: [],
                queries: [],
            },
        },
        {
            name: "param: [protocol], [hostname]",
            actual: parse`${"https"}://${"example.com"}`,
            expected: {
                protocol: { type: "param", index: 0 },
                hostname: { type: "param", index: 1 },
                paths: [],
                queries: [],
            },
        },
        {
            name: "param: [protocol], [hostname], path",
            actual: parse`${"https"}://${"example.com"}/path/to/resource`,
            expected: {
                protocol: { type: "param", index: 0 },
                hostname: { type: "param", index: 1 },
                paths: [{ type: "static", value: "/path/to/resource" }],
                queries: [],
            },
        },
        {
            name: "param: protocol hostname, [port]",
            actual: parse`https://example.com:${8080}`,
            expected: {
                protocol: { type: "static", value: "https" },
                hostname: { type: "static", value: "example.com" },
                port: { type: "param", index: 0 },
                paths: [],
                queries: [],
            },
        },
        {
            name: "param: hostname, [port]",
            actual: parse`//example.com:${8080}`,
            expected: {
                hostname: { type: "static", value: "example.com" },
                port: { type: "param", index: 0 },
                paths: [],
                queries: [],
            },
        },
        {
            name: "param: [hostname], [port]",
            actual: parse`//${"example.com"}:${8080}`,
            expected: {
                hostname: { type: "param", index: 0 },
                port: { type: "param", index: 1 },
                paths: [],
                queries: [],
            },
        },
        {
            name: "param: [protocol], [hostname], [path]",
            actual: parse`${"https"}://${"example.com"}/${"path"}`,
            expected: {
                protocol: { type: "param", index: 0 },
                hostname: { type: "param", index: 1 },
                paths: [
                    { type: "static", value: "/" },
                    { type: "param", index: 2 },
                ],
                queries: [],
            },
        },
        {
            name: "param: [protocol], [hostname], path1, [path2]",
            actual: parse`${"https"}://${"example.com"}/parent/${"path"}`,
            expected: {
                protocol: { type: "param", index: 0 },
                hostname: { type: "param", index: 1 },
                paths: [
                    { type: "static", value: "/parent/" },
                    { type: "param", index: 2 },
                ],
                queries: [],
            },
        },
        {
            name: "param: [protocol], [hostname], path1, [path2], path3",
            actual: parse`${"https"}://${"example.com"}/parent/${"path"}/child`,
            expected: {
                protocol: { type: "param", index: 0 },
                hostname: { type: "param", index: 1 },
                paths: [
                    { type: "static", value: "/parent/" },
                    { type: "param", index: 2 },
                    { type: "static", value: "/child" },
                ],
                queries: [],
            },
        },
        {
            name: "param: hostname, port, [path]",
            actual: parse`//example.com:8000/${"path"}`,
            expected: {
                hostname: { type: "static", value: "example.com" },
                port: { type: "static", value: 8000 },
                paths: [
                    { type: "static", value: "/" },
                    { type: "param", index: 0 },
                ],
                queries: [],
            },
        },
        {
            name: "param: hostname, [port], path",
            actual: parse`//example.com:${8080}/path/to/resource`,
            expected: {
                hostname: { type: "static", value: "example.com" },
                port: { type: "param", index: 0 },
                paths: [{ type: "static", value: "/path/to/resource" }],
                queries: [],
            },
        },
        {
            name: "param: hostname, [port], [path]",
            actual: parse`//example.com:${8080}/${"path"}`,
            expected: {
                hostname: { type: "static", value: "example.com" },
                port: { type: "param", index: 0 },
                paths: [
                    { type: "static", value: "/" },
                    { type: "param", index: 1 },
                ],
                queries: [],
            },
        },
        {
            name: "param: hostname, [path]",
            actual: parse`//example.com/${"path"}`,
            expected: {
                hostname: { type: "static", value: "example.com" },
                paths: [
                    { type: "static", value: "/" },
                    { type: "param", index: 0 },
                ],
                queries: [],
            },
        },
        {
            name: "param: hostname, path, [query]",
            actual: parse`//example.com/path?query=${"value"}`,
            expected: {
                hostname: { type: "static", value: "example.com" },
                paths: [{ type: "static", value: "/path" }],
                queries: [{ key: "query", value: { type: "param", index: 0 } }],
            },
        },
        {
            name: "param: hostname, path, [query], query, [query]",
            actual: parse`//example.com/path?query=${"value"}&query2=value&query3=${"value"}`,
            expected: {
                hostname: { type: "static", value: "example.com" },
                paths: [{ type: "static", value: "/path" }],
                queries: [
                    { key: "query", value: { type: "param", index: 0 } },
                    { key: "query2", value: { type: "static", value: "value" } },
                    { key: "query3", value: { type: "param", index: 1 } },
                ],
            },
        },
        {
            name: "param: hostname, path, [query], [query]",
            actual: parse`//example.com/path?query=${"value"}&query2=${"value"}`,
            expected: {
                hostname: { type: "static", value: "example.com" },
                paths: [{ type: "static", value: "/path" }],
                queries: [
                    { key: "query", value: { type: "param", index: 0 } },
                    { key: "query2", value: { type: "param", index: 1 } },
                ],
            },
        },
        {
            name: "param: hostname, path, [query-set]",
            actual: parse`//example.com/path?${{ query: "value", query2: "value" }}`,
            expected: {
                hostname: { type: "static", value: "example.com" },
                paths: [{ type: "static", value: "/path" }],
                queries: [{ key: "", value: { type: "param", index: 0 } }],
            },
        },
        {
            name: "param: hostname, port, path, [fragment]",
            actual: parse`//example.com:8000/path#${"fragment"}`,
            expected: {
                hostname: { type: "static", value: "example.com" },
                port: { type: "static", value: 8000 },
                paths: [{ type: "static", value: "/path" }],
                queries: [],
                fragment: { type: "param", index: 0 },
            },
        },
        {
            name: "param: hostname, port, [path], fragment",
            actual: parse`//example.com:8000/${"path"}#fragment`,
            expected: {
                hostname: { type: "static", value: "example.com" },
                port: { type: "static", value: 8000 },
                paths: [
                    { type: "static", value: "/" },
                    { type: "param", index: 0 },
                ],
                queries: [],
                fragment: { type: "static", value: "fragment" },
            },
        },
        {
            name: "param: hostname, port, [path], fragment",
            actual: parse`//example.com:8000/${"path"}#fragment`,
            expected: {
                hostname: { type: "static", value: "example.com" },
                port: { type: "static", value: 8000 },
                paths: [
                    { type: "static", value: "/" },
                    { type: "param", index: 0 },
                ],
                queries: [],
                fragment: { type: "static", value: "fragment" },
            },
        },
        {
            name: "no param: protocol, hostname, path(encoded)",
            actual: parse`http://example.com/🐙`,
            expected: {
                protocol: { type: "static", value: "http" },
                hostname: { type: "static", value: "example.com" },
                paths: [{ type: "static", value: "/%F0%9F%90%99" }],
                queries: [],
            },
        },
    ];
    for (const { name, actual, expected } of cases) {
        test(name, () => {
            expect(actual).toEqual(expected);
        });
    }
});

describe("overwriting by options", () => {
    const cases: {
        name: string;
        config: overwriteOption;
        src: parseResult;
        expected: parseResult;
    }[] = [
        {
            name: "overwrite: protocol",
            config: { protocol: "https" },
            src: parse`http://example.com`,
            expected: {
                protocol: { type: "static", value: "https" },
                hostname: { type: "static", value: "example.com" },
                paths: [],
                queries: [],
            },
        },
        {
            name: "overwrite: hostname",
            config: { hostname: "api.example.com" },
            src: parse`http://example.com`,
            expected: {
                protocol: { type: "static", value: "http" },
                hostname: { type: "static", value: "api.example.com" },
                paths: [],
                queries: [],
            },
        },
        {
            name: "overwrite: port",
            config: { port: 8080 },
            src: parse`http://example.com`,
            expected: {
                protocol: { type: "static", value: "http" },
                hostname: { type: "static", value: "example.com" },
                port: { type: "static", value: 8080 },
                paths: [],
                queries: [],
            },
        },
        {
            name: "overwrite: host and port",
            config: { hostname: "api.example.com:8080" },
            src: parse`http://example.com`,
            expected: {
                protocol: { type: "static", value: "http" },
                hostname: { type: "static", value: "api.example.com" },
                port: { type: "static", value: 8080 },
                paths: [],
                queries: [],
            },
        },
        {
            name: "overwrite: protocol and host and porty",
            config: { hostname: "https://api.example.com:8080" },
            src: parse`http://example.com`,
            expected: {
                protocol: { type: "static", value: "https" },
                hostname: { type: "static", value: "api.example.com" },
                port: { type: "static", value: 8080 },
                paths: [],
                queries: [],
            },
        },
        {
            name: "overwrite: basic auth credentials",
            config: { username: "admin-user", password: "pAssw0rd" },
            src: parse`http://example.com`,
            expected: {
                protocol: { type: "static", value: "http" },
                hostname: { type: "static", value: "example.com" },
                paths: [],
                queries: [],
                username: "admin-user",
                password: "pAssw0rd",
            },
        },
    ];
    for (const { name, config, src, expected } of cases) {
        test(name, () => {
            expect(overwrite(src, config)).toEqual(expected);
        });
    }
});
