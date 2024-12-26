import { expect, test, describe } from "vitest";
import { parse } from "./parser";

describe("invalid cases", () => {
    const cases: {
        name: string;
        exec: () => void;
    }[] = [
        {
            name: "empty protocol",
            exec: () => parse`://example.com`,
        },
        {
            name: "invalid initial character",
            exec: () => parse`:example.com`,
        },
        {
            name: "invalid port character",
            exec: () => parse`http://example.com:a`,
        },
        {
            name: "invalid special character after hostname",
            exec: () => parse`http://example.com=`,
        },
        {
            name: "invalid special character after path separator",
            exec: () => {
                parse`http://example.com/&`;
            },
        },
        {
            name: "invalid special character after path",
            exec: () => {
                parse`http://example.com/test&`;
            },
        },
        {
            name: "empty query key",
            exec: () => {
                parse`http://example.com/test?=`;
            },
        },
        {
            name: "invalid character after query key",
            exec: () => {
                parse`http://example.com/test??`;
            },
        },
        {
            name: "invalid character after query key",
            exec: () => {
                parse`http://example.com/test?q=v?`;
            },
        },
        {
            name: "invalid character after protocol placeholder",
            exec: () => parse`${"protocol"}//example.com`,
        },
        {
            name: "invalid character after host placeholder",
            exec: () => parse`http://${"protocol"}&`,
        },
    ];
    for (const { name, exec } of cases) {
        test(name, () => {
            expect(exec).toThrowError();
        });
    }
});
