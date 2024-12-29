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
    paths: part<string>[];
    queries: { key: string; value: part<string> }[];
    fragment?: part<string>;
    username?: string;
    password?: string;
};

type StepType = "protocol" | "hostname" | "port" | "path" | "query" | "queryKey" | "queryValue" | "fragment" | "invalid";

const invalidSeparator: Record<StepType, Record<string, boolean>> = {
    protocol: { "://": true, "//": false, ":": true, "/": false, "?": true, "=": true, "&": true, "#": true, "@": true },
    hostname: {},
    port: {},
    path: { "://": true, "//": true, ":": true, "/": false, "?": false, "=": true, "&": true, "#": false, "@": true },
    query: { "://": true, "//": true, ":": true, "/": true, "?": false, "=": true, "&": true, "#": false, "@": true },
    queryKey: { "://": true, "//": true, ":": true, "/": true, "?": true, "=": false, "&": false, "#": false, "@": true },
    queryValue: { "://": true, "//": true, ":": true, "/": true, "?": true, "=": true, "&": false, "#": false, "@": true },
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

    type Token =
        | {
              type: "separator";
              str: string;
          }
        | {
              type: "placeholder";
              index: number;
          }
        | {
              type: "static";
              str: string;
          };
    const tokens: Token[] = [];
    for (const [i, text] of texts.entries()) {
        if (i !== 0) {
            tokens.push({ type: "placeholder", index: i - 1 });
        }
        for (const [j, str] of text.split(/((?::\/\/)|(?:\/\/)|[:/?&=#@])/g).entries()) {
            if (j % 2 === 1) {
                tokens.push({ type: "separator", str });
            } else if (str !== "") {
                tokens.push({ type: "static", str });
            }
        }
    }

    function appendPath(pathString: string) {
        const lastPath = result.paths[result.paths.length - 1];
        if (lastPath && lastPath.type === "static") {
            lastPath.value += pathString;
        } else {
            result.paths.push({ type: "static", value: pathString });
        }
    }

    let lastToken = "";

    while (tokens.length > 0) {
        switch (step) {
            case "protocol": {
                const [protocol, separator] = tokens;
                if (separator.type === "separator" && separator.str === "://") {
                    if (protocol.type === "placeholder") {
                        result.protocol = {
                            type: "param",
                            index: protocol.index,
                        };
                    } else if (protocol.str === "") {
                        throw new Error("protocol name should not be empty");
                    } else {
                        result.protocol = {
                            type: "static",
                            value: protocol.str,
                        };
                    }
                    step = "hostname";
                    tokens.splice(0, 2);
                    lastToken = separator.str;
                } else if (protocol.type === "separator") {
                    if (invalidSeparator.protocol[protocol.str]) {
                        throw new Error(`invalid character: '${protocol.str}'. only protocol name or //, / are available`);
                    }
                    if (protocol.str === "//") {
                        // Scheme relative URL
                        step = "hostname";
                        tokens.shift();
                        lastToken = protocol.str;
                    } else {
                        // slash
                        step = "path";
                    }
                } else {
                    step = "path";
                }
                break;
            }
            case "hostname": {
                const hostname = tokens[0];
                if (hostname.type === "separator") {
                    throw new Error(
                        `invalid character: '${hostname.str}'. after '${lastToken}' only hostname string is expected`,
                    );
                }
                if (hostname.type === "placeholder") {
                    result.hostname = { type: "param", index: hostname.index };
                } else {
                    result.hostname = { type: "static", value: hostname.str };
                }
                tokens.shift();
                lastToken = "hostname";
                step = "port";
                break;
            }
            case "port": {
                const [portSeparator, portToken] = tokens;
                if (portSeparator.type === "separator" && portSeparator.str === ":") {
                    switch (portToken.type) {
                        case "separator":
                            throw new Error(`invalid character: '${portToken.str}'. only port number is expected`);
                        case "placeholder":
                            result.port = { type: "param", index: portToken.index };
                            break;
                        case "static": {
                            const port = Number(portToken.str);
                            if (Number.isNaN(port)) {
                                throw new Error(`port must be a number, but ${portToken.str}`);
                            }
                            if (port < 1 || port > 65535) {
                                throw new Error(`port number must be in range 1-65535, but ${port}`);
                            }
                            result.port = { type: "static", value: port };
                            break;
                        }
                    }
                    lastToken = "port";
                    tokens.splice(0, 2);
                }
                step = "path";
                break;
            }
            case "path": {
                const [separator, path] = tokens;
                switch (separator.type) {
                    case "placeholder":
                        throw new Error(`invalid placeholder after ${lastToken}`);
                    case "static":
                        // if input is relative path like "./path/to/resource" or "path/to/resource", it is ok.
                        if (result.protocol || result.hostname) {
                            throw new Error(`invalid text after '${lastToken}': '${separator.str}'`);
                        }
                        appendPath(separator.str);
                        tokens.shift();
                        break;
                    case "separator":
                        if (invalidSeparator.path[separator.str]) {
                            throw new Error(`invalid character after ${lastToken}. / ? # are available but ${separator.type}`);
                        }
                        if (separator.str !== "/") {
                            step = "query";
                        } else if (path) {
                            switch (path.type) {
                                case "separator":
                                    appendPath("/");
                                    lastToken = "/";
                                    step = "query";
                                    tokens.shift();
                                    break;
                                case "placeholder":
                                    appendPath("/");
                                    result.paths.push({ type: "param", index: path.index });
                                    tokens.splice(0, 2);
                                    lastToken = `{${path.index}}`;
                                    break;
                                case "static":
                                    lastToken = `/${path.str}`;
                                    appendPath(lastToken);
                                    tokens.splice(0, 2);
                                    break;
                            }
                        } else {
                            // last token
                            appendPath("/");
                            tokens.shift();
                            step = "invalid";
                        }
                }
                break;
            }
            case "query": {
                const separator = tokens[0];
                switch (separator.type) {
                    case "separator":
                        if (invalidSeparator.query[separator.str]) {
                            throw new Error(
                                `invalid character after ${lastToken} should be '?' or '&', '#', but '${separator.str}'`,
                            );
                        }
                        if (separator.str === "?") {
                            lastToken = "?";
                            step = "queryKey";
                        } else if (separator.str === "#") {
                            step = "fragment";
                        }
                        tokens.shift();
                        break;
                    case "placeholder":
                        throw new Error(`invalid placeholder {${separator.index}} after ${lastToken}. It should be '?' or '#'`);
                    case "static":
                        throw new Error(`invalid character after ${lastToken} should be '?' or '#', but '${separator.str}'`);
                }
                break;
            }
            case "queryKey": {
                const [key, splitter] = tokens;
                switch (key.type) {
                    case "separator":
                        throw new Error(`query key should be a string or placeholder, but '${key.str}'`);
                    case "placeholder": {
                        // query-set
                        if (splitter) {
                            if (splitter.type === "static") {
                                throw new Error(
                                    `invalid character after query set placeholder {${key.index}}. Only &, # are available, but '${splitter.str}'`,
                                );
                            }
                            if (splitter.type === "separator") {
                                if (invalidSeparator.queryValue[splitter.str]) {
                                    throw new Error(
                                        `invalid character after query set placeholder {${key.index}}. only &, # are available but ${splitter.str}`,
                                    );
                                }
                                if (splitter.str === "#") {
                                    step = "fragment";
                                }
                            }
                        } else {
                            // last token
                            step = "invalid";
                        }
                        result.queries.push({ key: "", value: { type: "param", index: key.index } });
                        tokens.splice(0, 2);
                        break;
                    }
                    case "static":
                        if (!splitter) {
                            result.queries.push({ key: key.str, value: { type: "static", value: "" } });
                        } else if (splitter.type === "separator") {
                            if (invalidSeparator.queryKey[splitter.str]) {
                                throw new Error(
                                    `invalid character after query key '${key.str}'. only =, &, # are available but ${splitter.str}`,
                                );
                            }
                            switch (splitter.str) {
                                case "=":
                                    queryKey = key.str;
                                    lastToken = key.str;
                                    step = "queryValue";
                                    break;
                                // biome-ignore lint/suspicious/noFallthroughSwitchClause: <explanation>
                                case "#":
                                    step = "fragment";
                                case "&":
                                    result.queries.push({ key: key.str, value: { type: "static", value: "" } });
                                    break;
                            }
                            tokens.splice(0, 2);
                        }
                }
                break;
            }
            case "queryValue": {
                const [value, splitter] = tokens;
                switch (value.type) {
                    case "separator":
                        throw new Error(`query value of '${queryKey}' should be a string or placeholder, but '${value.str}'`);
                    case "placeholder":
                        result.queries.push({ key: queryKey, value: { type: "param", index: value.index } });
                        break;
                    case "static":
                        result.queries.push({ key: queryKey, value: { type: "static", value: value.str } });
                        break;
                }
                if (splitter) {
                    switch (splitter.type) {
                        case "placeholder":
                            throw new Error(`invalid placeholder ${splitter.index} after query value of '${queryKey}'`);
                        case "static":
                            throw new Error(`invalid text '${splitter.str}' after query value of '${queryKey}'`);
                        case "separator":
                            if (invalidSeparator.queryValue[splitter.str]) {
                                throw new Error(
                                    `invalid character after query value of '${queryKey}'. only &, # are available but '${splitter}`,
                                );
                            }
                            switch (splitter.str) {
                                case "&":
                                    step = "queryKey";
                                    break;
                                case "#":
                                    step = "fragment";
                                    break;
                            }
                            tokens.splice(0, 2);
                    }
                } else {
                    tokens.shift();
                }
                break;
            }
            case "fragment": {
                const token = tokens[0];
                switch (token.type) {
                    case "separator":
                        throw new Error(
                            `invalid character after fragment. A string ore placeholder are available but '${token.str}'`,
                        );
                    case "static":
                        result.fragment = { type: "static", value: token.str };
                        break;
                    case "placeholder":
                        result.fragment = { type: "param", index: token.index };
                        break;
                }
                tokens.shift();
                step = "invalid"; // this should be the last step
                break;
            }
            case "invalid": {
                throw new Error(`the url have invalid extra token: ${tokens.join("")}`);
            }
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
