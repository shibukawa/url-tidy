import { getCache, setCache } from "./cache";
import { overwrite, parse } from "./parser";
import type { overwriteOption, queryItemType, valueType } from "./parser";

export function customFormatter(opt: overwriteOption) {
    return function url(templateStrings: TemplateStringsArray, ...values: valueType[]): string {
        let baseTemplate = getCache(templateStrings);
        if (!baseTemplate) {
            baseTemplate = parse(templateStrings, ...values);
            setCache(templateStrings, baseTemplate);
        }
        const template = overwrite(baseTemplate, opt);

        let shouldRemoveProtocol = true;
        let shouldRemoveHostname = true;

        // Protocol
        // URL class only accept protocol changes when it is standard protocol(https, http, ftp, file, ws, wss)
        let protocol = "dummy";
        if (template.protocol) {
            if (template.protocol.type === "static") {
                protocol = template.protocol.value;
                shouldRemoveProtocol = false;
            } else {
                const value = values[template.protocol.index];
                if (value !== null) {
                    if (typeof value !== "string") {
                        throw new Error(`protocol must be a string, but '${value}' : ${typeof value}`);
                    }
                    protocol = value;
                    shouldRemoveProtocol = false;
                }
            }
        }
        const result = new URL(`${protocol}://dummy`);

        // Host
        if (template.hostname) {
            if (template.hostname.type === "static") {
                result.hostname = template.hostname.value;
                shouldRemoveHostname = false;
            } else {
                const value = values[template.hostname.index];
                if (value !== null) {
                    if (typeof value !== "string") {
                        throw new Error(`hostname must be a string, but '${value}' : ${typeof value}`);
                    }
                    result.hostname = value;
                    shouldRemoveHostname = false;
                }
            }
        }
        // Port
        if (template.port) {
            if (template.port.type === "static") {
                result.port = String(template.port.value);
            } else {
                const value = values[template.port.index];
                if (value !== null) {
                    // todo range check: 1-65535
                    if (typeof value !== "number") {
                        throw new Error(`port must be a string, but '${value}' : ${typeof value}`);
                    }
                    result.port = String(value);
                }
            }
        }
        // Path
        const path = [] as string[];
        for (const p of template.paths) {
            if (p.type === "static") {
                path.push(p.value);
            } else {
                const value = values[p.index];
                if (typeof value === "string" || typeof value === "number") {
                    path.push(encodeURI(String(value)));
                } else if (Array.isArray(value)) {
                    path.push(...value.flatMap((v) => ["/", encodeURI(String(v))]));
                    path.push("/");
                } else {
                    throw new Error(`path must be a string, number, array, but '${value}' : ${typeof value}`);
                }
            }
        }
        result.pathname = path.reduce((prev, curr) => {
            if (prev.endsWith("/") && curr.startsWith("/")) {
                return prev + curr.slice(1);
            }
            return prev + curr;
        }, "");
        // Query
        function updateQuery(key: string, value: queryItemType) {
            if (value !== null) {
                if (typeof value === "string" || typeof value === "number") {
                    result.searchParams.append(key, String(value));
                } else if (Array.isArray(value)) {
                    for (const [i, v] of value.entries()) {
                        if (i === 0) {
                            result.searchParams.set(key, String(v));
                        } else {
                            result.searchParams.append(key, String(v));
                        }
                    }
                } else {
                    throw new Error(`query must be a string, number, array, but '${value}' : ${typeof value}`);
                }
            }
        }
        for (const p of template.queries) {
            if (p.value.type === "static") {
                result.searchParams.append(p.key, p.value.value);
            } else if (p.key) {
                updateQuery(p.key, values[p.value.index] as queryItemType);
            } else {
                const obj = values[p.value.index];
                if (obj instanceof URLSearchParams) {
                    for (const key of obj.keys()) {
                        updateQuery(key, obj.getAll(key));
                    }
                } else if (obj !== null && typeof obj === "object") {
                    for (const [key, value] of Object.entries(obj)) {
                        updateQuery(key, value);
                    }
                }
            }
        }
        // Hash
        if (template.fragment) {
            if (template.fragment.type === "static") {
                result.hash = template.fragment.value;
            } else {
                const value = values[template.fragment.index];
                if (value !== null) {
                    if (typeof value !== "string") {
                        throw new Error(`hash must be a string, but '${value}' : ${typeof value}`);
                    }
                    result.hash = value;
                }
            }
        }
        // Basic Auth Credentials
        if (template.username) {
            result.username = template.username;
        }
        if (template.password) {
            result.password = template.password;
        }

        let resultUrl = result.href;
        if (shouldRemoveProtocol || shouldRemoveHostname) {
            resultUrl = resultUrl.replace(/^.*?:/, "");
        }
        if (shouldRemoveHostname) {
            resultUrl = resultUrl.replace(/^\/\/[^/]+/, "");
        }
        return resultUrl;
    };
}

export const url = customFormatter({});
