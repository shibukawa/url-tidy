# url-tidy: URL formatting utility

[![npm version](https://badge.fury.io/js/url-tidy.svg)](https://badge.fury.io/js/url-tidy)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Deno JS](https://img.shields.io/badge/deno%20js-000000?style=for-the-badge&logo=deno&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-%23000000.svg?style=for-the-badge&logo=bun&logoColor=white)

* [日本語](https://github.com/shibukawa/url-tidy/blob/main/README.ja.md)

url-tidy is a Safe URL formatting library for TypeScript. This library provides a tagged template literal function that is short and easy to read API and escapes safely the values in the URL template to prevent URL injection.

It is a wrapper of `URL` class to generate safe URLs, but it provides an easy-to-use API in one line and supports schema-relative URLs and relative paths without hostnames that are not supported by the `URL` class.

This package supports Node.js and Deno and Bun.

## Installation

If you use Node.js, install the package with your favorite package manager. Bun is also supported.

```bash
# Node.js use your favorite package manager
$ npm install url-tidy

# Bun
$ bun install url-tidy
```

## Basic Usage

Import path for Node.js or Bun is as follows:

```ts
import { url } from 'url-tidy';
```

If you use Deno, import path requires `npm:` prefix.

```ts
import { url } from 'npm:url-tidy';
```

url-tidy provides tagged template literal function and it returns formatted URL string.

```ts
import { url } from 'url-tidy';

const id = 1000;

const res = fetch(url`https://example.com/api/users/${id}/profile`)
// => fetch('https://example.com/api/users/1000/profile')
```

## URL Template Rules

You can put placeholders in the following locations:

- protocol
- hostname
- port (`number`)
- path
- query value
- query set (`object` or `URLSearchParams`)
- fragment

```ts
url`${protocol}://${hostname}:${port}/${path}?queryKey=${queryValue}&${querySet}#${fragment}`
```

Placeholder can be written only between each delimiter (`://`, `:`, `/`, `?`, `=`, `&`, `#`) and interpolated strings are escaped properly.

### Path Hierarchies

Placeholders for path can accept array or `/` separated string, and it supports URLs with variable path hierarchies.

```ts
const areaList = ["japan", "tokyo", "shinjuku"];
url`https://example.com/menu/${areaList}`
// => 'https://example.com/menu/japan/tokyo/shinjuku'

const areaStr = "japan/tokyo/shinjuku";
url`https://example.com/menu/${areaStr}`
// => 'https://example.com/menu/japan/tokyo/shinjuku'
```

### null

If the placeholder value is `null`, the placeholder and related text (like query key) are removed from the resulting URL.

```ts
const port = null;
const value1 = null;
const value2 = "value2";
const fragment = null;

url`https://example.com:${port}/api/users?key1=${value1}&key2=${value2}#${fragment}`
// => 'https://example.com/api/users?key2=value2'
```

This behavior is useful when you want to implement paging query than `URLSearchParams`.

```ts
const word = "spicy food";
const page = 10;
const perPage = null; // use default
const limit = null;        // use default
url`https://example.com/api/search?word=${word}&page=${page}&perPage=${perPage}&limit=${limit}`
// => 'https://example.com/api/search?word=spicy+food&page=10'
```

### Query Set

It accepts an object or URLSearchParams object as a query set and merges it with other queries.
It is useful when you can pass the result of form validation library.

```ts
const searchParams = {
    word: "spicy food",
    safeSearch: false,
    spicyLevel: Infinity,
}
url`https://example.com/api/search?${searchParams}`
// => 'https://example.com/api/search?word=spicy+food&safeSearch=false'
```

## Advanced Usage

Custom factory function can overwrite the some parts of the URL. It is good for specifies the API host that is from environment variables or credentials that should not be hard-coded in the source code:

- `protocol`
- `hostname`: It can contains `protocol` and/or `port`.
- `port`
- `username` and `password`: It is only available location to define in this library.

```ts
import { customFormatter } from 'url-tidy';

const url = customFormatter({
    hostname: process.env.API_SERVER_HOST, // 'https://localhost:8080'
    username: 'user',
    password: 'pAssw0rd',

})

const id = 1000;

url`https://api-server/api/users/${id}/profile`
// => 'https://user:pAssw0rd@localhost:8080/api/users/1000/profile'
// "https://api-server" is a dummy string that is replaced with customFormatter()'s hostname option.
// You can avoid hard-coding the actual hostname in your project code.
```

## License

Apache-2.0

## Reference

* Go Version: [github.com/shibukawa/urlf](https://pkg.go.dev/github.com/shibukawa/urlf)
