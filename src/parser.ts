type pathItemType = string | number;
type queryItemPrimitiveType = string | number | boolean;
export type queryItemType = queryItemPrimitiveType | queryItemPrimitiveType[] | null;

export type valueType = string | number | pathItemType[] | Record<string, queryItemType> | URLSearchParams | null;

export type part<T> =
    | {
          type: "static";
          value: T;
      }
    | {
          type: "param";
          index: number;
      };

export type overwriteOption = {
    hostname?: string;
    port?: number;
    protocol?: string;
    username?: string;
    password?: string;
};

export type parseResult = {
    protocol?: part<string>;
    hostname?: part<string>;
    port?: part<number>;
    hash?: part<string>;
    paths: part<string>[];
    queries: { key: string; value: part<string> }[];
    fragment?: part<string>;
    username?: string;
    password?: string;
};

type StepType =
    | "protocol"
    | "hostname"
    | "port"
    | "path"
    | "queryKey"
    | "queryValue"
    | "querySet"
    | "fragment"
    | "invalid";

const invalidSeparator: Record<StepType, Record<string, boolean>> = {
    protocol: { "://": true, ":": true, "?": true, "=": true, "&": true, "#": true, "@": true },
    hostname: { "://": true, "//": true, "&": true, "=": true, "@": true },
    port: {},
    path: { "://": true, "//": true, ":": true, "=": true, "&": true, "@": true },
    queryKey: { "://": true, "//": true, ":": true, "?": true, "@": true },
    queryValue: { "://": true, "//": true, ":": true, "?": true, "=": true, "@": true },
    querySet: { "&": true, "#": true },
    fragment: {},
    invalid: {},
};

export function parse(texts: TemplateStringsArray, ..._values: valueType[]): parseResult {
    const result: parseResult = {
        paths: [],
        queries: [],
    };

    let step: StepType = "protocol";

    let queryKey = "";

    const fragments = Array.from(texts);
    let currentIndex = 0;
    let tokens = fragments[0].split(/((?::\/\/)|(?:\/\/)|[:/?&=#@])/g);
    if (tokens[0] === "") {
        tokens.shift();
    }

    while (currentIndex < texts.length) {
        // static text part
        while (tokens.length > 0) {
            switch (step) {
                case "protocol": {
                    const [protocol, separator, ...rest] = tokens;
                    if (separator === "://") {
                        if (protocol === "") {
                            throw new Error("protocol name should not be empty");
                        }
                        result.protocol = {
                            type: "static",
                            value: protocol,
                        };
                        step = "hostname";
                        tokens = rest;
                    } else {
                        if (invalidSeparator.protocol[protocol]) {
                            throw new Error(
                                `invalid character: '${protocol}'. only protocol name or //, / are available`,
                            );
                        }
                        if (protocol === "//") {
                            // Scheme relative URL
                            step = "hostname";
                            tokens.shift();
                        } else {
                            // slash or path name
                            step = "path";
                        }
                    }
                    break;
                }
                case "hostname": {
                    if (tokens[0] === "" && tokens.length === 1) {
                        tokens.shift();
                        break;
                    }
                    const [hostname, portSeparator, ...rest] = tokens;
                    if (invalidSeparator.hostname[portSeparator]) {
                        throw new Error(
                            `invalid character after hostname: '${portSeparator}'. only :, /, ?, # are available`,
                        );
                    }
                    result.hostname = { type: "static", value: hostname };
                    if (portSeparator === ":") {
                        step = "port";
                        tokens = rest;
                    } else {
                        step = "path";
                        tokens.shift();
                    }
                    break;
                }
                case "port": {
                    if (tokens[0] === "" && tokens.length === 1) {
                        tokens.shift();
                        break;
                    }
                    const [portStr, ...rest] = tokens;
                    const port = Number(portStr);
                    if (Number.isNaN(port)) {
                        throw new Error(`port must be a number, but ${portStr}`);
                    }
                    result.port = { type: "static", value: port };
                    tokens = rest;
                    step = "path";
                    break;
                }
                case "path": {
                    const [separator, path, ...rest] = tokens;
                    switch (separator) {
                        case "/": {
                            if (invalidSeparator.path[rest[0]]) {
                                throw new Error(
                                    `invalid character after path separator '/'. only path string, '?', '#' are available but ${path}`,
                                );
                            }
                            let pathString = separator;
                            if (path === "?") {
                                step = "queryKey";
                            } else if (path === "#") {
                                step = "fragment";
                            } else {
                                pathString = separator + path;
                            }
                            const lastPath = result.paths[result.paths.length - 1];
                            if (lastPath && lastPath.type === "static") {
                                lastPath.value += pathString;
                            } else {
                                result.paths.push({ type: "static", value: separator + path });
                            }
                            tokens = rest;
                            break;
                        }
                        case "?":
                            step = "queryKey";
                            tokens.shift();
                            break;
                        case "#":
                            step = "fragment";
                            tokens.shift();
                            break;
                        default:
                            result.paths.push({ type: "static", value: separator });
                            tokens.shift();
                            break;
                    }
                    break;
                }
                case "queryKey": {
                    if (tokens[0] === "" && tokens.length === 1) {
                        tokens.shift();
                        step = "querySet";
                        break;
                    }
                    const [key, splitter, ...rest] = tokens;
                    if (invalidSeparator.queryKey[splitter]) {
                        throw new Error(
                            `invalid character after query key '${key}'. only =, &, # are available but '${splitter}`,
                        );
                    }
                    switch (splitter) {
                        case "=":
                            if (key === "") {
                                throw new Error("query key should not be empty");
                            }
                            step = "queryValue";
                            queryKey = key;
                            if (rest.length === 1 && rest[0] === "") {
                                rest.shift();
                            }
                            tokens = rest;
                            break;
                        case "&":
                            step = "queryValue";
                            result.queries.push({ key, value: { type: "static", value: "" } });
                            tokens = rest;
                            break;
                        case "#":
                            step = "fragment";
                            result.queries.push({ key, value: { type: "static", value: "" } });
                            queryKey = key;
                            tokens = rest;
                            break;
                        default:
                            result.queries.push({ key, value: { type: "static", value: "" } });
                            tokens = [];
                            step = "invalid";
                            break;
                    }
                    break;
                }
                case "queryValue": {
                    const [value, splitter, ...rest] = tokens;
                    if (invalidSeparator.queryValue[splitter]) {
                        throw new Error(
                            `invalid character after query value of '${queryKey}'. only &, # are available but '${splitter}`,
                        );
                    }
                    switch (splitter) {
                        case "&":
                            step = "queryKey";
                            result.queries.push({ key: queryKey, value: { type: "static", value } });
                            tokens = rest;
                            break;
                        case "#":
                            step = "fragment";
                            result.queries.push({ key: queryKey, value: { type: "static", value } });
                            tokens = rest;
                            break;
                        default:
                            result.queries.push({ key: queryKey, value: { type: "static", value } });
                            tokens = [];
                            step = "invalid";
                            break;
                    }
                    break;
                }
                case "fragment": {
                    if (tokens[0] === "" && tokens.length === 1) {
                        tokens.shift();
                        break;
                    }
                    const [fragment, ...rest] = tokens;
                    result.fragment = { type: "static", value: fragment };
                    tokens = rest;
                    step = "invalid";
                    break;
                }
                case "invalid": {
                    throw new Error(`the url have invalid extra token: ${tokens.join("")}`);
                }
            }
        }
        const fragment = fragments[++currentIndex];
        if (fragment === undefined) {
            break;
        }
        tokens = fragment.split(/((?::\/\/)|(?:\/\/)|[:/?&=#])/g);
        if (tokens[0] === "") {
            tokens.shift();
        }
        // dynamic text part
        switch (step) {
            case "protocol":
                if (tokens[0] === "://") {
                    result.protocol = {
                        type: "param",
                        index: currentIndex - 1,
                    };
                    step = "hostname";
                    tokens.shift();
                } else {
                    throw new Error(`protocol must end with '://', but ${tokens[0]}`);
                }
                break;
            case "hostname":
                if (invalidSeparator.hostname[tokens[0]]) {
                    throw new Error(`hostname must end with ':' or '/', but ${tokens[0]}`);
                }
                switch (tokens[0]) {
                    case ":":
                        step = "port";
                        tokens.shift();
                        break;
                    case "/":
                        step = "path";
                        break;
                    case "?":
                        step = "queryKey";
                        tokens.shift();
                        break;
                    case "#":
                        step = "fragment";
                        tokens.shift();
                        break;
                }
                result.hostname = {
                    type: "param",
                    index: currentIndex - 1,
                };
                break;
            case "port":
                if (tokens[0] === "/") {
                    step = "path";
                } else if (tokens[0] && currentIndex !== fragments.length - 1) {
                    throw new Error(`port number must end with '/', but ${tokens[0]}`);
                }
                result.port = {
                    type: "param",
                    index: currentIndex - 1,
                };
                break;
            case "path":
                if (tokens[0] === "?") {
                } else if (tokens[0] === "#") {
                    step = "fragment";
                    tokens.shift();
                } else if (tokens[0] && !tokens[0].startsWith("/")) {
                    throw new Error(`static path fragment '${tokens[0]}' must start with '/', but ${tokens[0]}`);
                }
                result.paths.push({
                    type: "param",
                    index: currentIndex - 1,
                });
                break;
            case "queryKey":
                break;
            case "queryValue":
                if (tokens[0] === "&") {
                    step = "queryKey";
                    tokens.shift();
                } else if (tokens[0] === "#") {
                    step = "fragment";
                    tokens.shift();
                } else if (tokens[0] === "") {
                    step = "invalid";
                }
                result.queries.push({
                    key: queryKey,
                    value: {
                        type: "param",
                        index: currentIndex - 1,
                    },
                });
                break;
            case "querySet":
                if (tokens[0] === "&") {
                    step = "queryKey";
                    tokens.shift();
                } else if (tokens[0] === "#") {
                    step = "fragment";
                    tokens.shift();
                } else if (tokens[0] === "") {
                    step = "invalid";
                }
                result.queries.push({
                    key: "",
                    value: {
                        type: "param",
                        index: currentIndex - 1,
                    },
                });
                break;
            case "fragment":
                result.fragment = {
                    type: "param",
                    index: currentIndex - 1,
                };
                break;
            case "invalid":
                throw new Error(`invalid fragment: ${fragment}`);
        }
    }

    // encode path string
    for (const path of result.paths) {
        if (path.type === "static") {
            path.value = encodeURI(path.value);
        }
    }
    return result;
}

export function overwrite(src: parseResult, option: overwriteOption): parseResult {
    const result = { ...src };
    if (option.hostname) {
        const match = /^(?<protocol>\w+:\/\/)?(?<hostname>[^:]+)(?<port>:\d+)?/.exec(option.hostname);
        if (match?.groups) {
            if (match.groups.protocol) {
                result.protocol = { type: "static", value: match.groups.protocol.slice(0, -3) };
            }
            if (match.groups.hostname) {
                result.hostname = { type: "static", value: match.groups.hostname };
            }
            if (match.groups.port) {
                result.port = { type: "static", value: Number(match.groups.port.slice(1)) };
            }
        }
    }
    if (option.protocol) {
        result.protocol = { type: "static", value: option.protocol };
    }
    if (option.port) {
        result.port = { type: "static", value: option.port };
    }
    result.username = option.username;
    result.password = option.password;
    return result;
}
