# url-tidy: URLフォーマットユーティリティ

[![npm version](https://badge.fury.io/js/url-tidy.svg)](https://badge.fury.io/js/url-tidy)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Deno JS](https://img.shields.io/badge/deno%20js-000000?style=for-the-badge&logo=deno&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-%23000000.svg?style=for-the-badge&logo=bun&logoColor=white)

* [English](https://github.com/shibukawa/url-tidy/blob/main/README.md)

url-tidy は TypeScript 用の URL 構築ライブラリです。このライブラリはタグ付きテンプレートリテラル関数として、短く読みやすいAPIを提供します。URL文字列のテンプレートに設定された文字列は適切にエスケープされ、URLインジェクションを防ぎます。

安全なURLを生成する`URL`クラスのラッパーですが、ワンライナーで使いやすいAPIを提供するとともに、`URL`クラスがサポートしていないスキーマ相対URLや、ホスト名のない相対パスなどもサポートしています。

このパッケージはNode.js、Deno、Bunをサポートしています。

## インストール

Node.jsを使う場合は、お好きなパッケージマネージャでパッケージをインストールしてください。Bunもサポートしています。

```bash
# Node.jsではお好きなパッケージマネージャを使ってください
$ npm install url-tidy

# Bun
$ bun install url-tidy
```

## 基本の利用方法

Node.jsやBunの場合のインポートパスは以下の通りです。

```ts
import { url } from 'url-tidy';
```

Denoを使っている場合はインポートパスに`npm:`プレフィックスが必要です。

```ts
import { url } from 'npm:url-tidy';
```

url-tidyはタグ付きテンプレートリテラルの関数を提供します。この関数はフォーマットされたURL文字列を返します。
そのまま`fetch()`関数に渡せます

```ts
const id = 1000;

const res = fetch(url`https://example.com/api/users/${id}/profile`)
// => fetch('https://example.com/api/users/1000/profile')
```

## URLテンプレートルール

次の場所にプレースホルダーを置けます。

- プロトコル
- ホスト名
- ポート (`number`)
- パス
- クエリーの値
- クエリーセット (`object` もしくは `URLSearchParams`)
- フラグメント

```ts
url`${protocol}://${hostname}:${port}/${path}?queryKey=${queryValue}&${querySet}#${fragment}`
```

プレースホルダはそれぞれの区切り記号（`://`、`:`、`/`、`?`、`=`、`&`、`#`）の間にしか書けず、展開された文字列は適切にエスケープされます。

### パス階層

パスのプレースホルダには配列や/区切りの文字列を設定でき、階層が可変のURLにも対応します。

```ts
const areaList = ["japan", "tokyo", "shinjuku"];
url`https://example.com/menu/${areaList}`
// => 'https://example.com/menu/japan/tokyo/shinjuku'

const areaStr = "japan/tokyo/shinjuku";
url`https://example.com/menu/${areaStr}`
// => 'https://example.com/menu/japan/tokyo/shinjuku'
```

### null

`null`をプレースホルダーに指定すると、クエリーのキーなどその関連項目ごと消去されて出力されます。

```ts
const port = null;
const value1 = null;
const value2 = "value2";
const fragment = null;

url`https://example.com:${port}/api/users?key1=${value1}&key2=${value2}#${fragment}`
// => 'https://example.com/api/users?key2=value2'
```

ページングのクエリーなどの場合は`URLSearchParams`を使うよりもコンパクトに書けます。

```ts
const word = "spicy food";
const page = 10;
const perPage = null; // use default
const limit = null;        // use default
url`https://example.com/api/search?word=${word}&page=${page}&perPage=${perPage}&limit=${limit}`
// => 'https://example.com/api/search?word=spicy+food&page=10'
```

### クエリーセット

クエリーをオブジェクトや`URISearchParams`でまとめて設定してマージさせることも可能です。フォームバリデータなどを使って生成したデータをそのまま渡せます。

```ts
const searchParams = {
    word: "spicy food",
    safeSearch: false,
    spicyLevel: Infinity,
}
url`https://example.com/api/search?${searchParams}`
// => 'https://example.com/api/search?word=spicy+food&safeSearch=false'
```

## より高度な使用方法

カスタムのファクトリー関数を使い、URLの一部を定義して上書きできます。環境変数経由で設定するAPIのホスト名や、ソースコードにハードコードすべきではないクレデンシャル情報を設定するのに便利です。

- `protocol`
- `hostname`: プロトコルやポートも指定可能
- `port`
- `username`、`password`: このライブラリではこの場所でしか設定できません。

```ts
import { customFormatter } from 'url-tidy';

const apiUrl = customFormatter({
    domain: process.env.API_SERVER_HOST, // 'https://localhost:8080'
    username: 'user',
    password: 'pAssw0rd',
})

const id = 1000;

apiUrl`https://api-server/api/users/${id}/profile`
// => 'https://user:pAssw0rd@localhost:8080/api/users/1000/profile'
// "https://api-server" はダミーの文字列で、customFormatter()のホスト名オプションで置き換わる
// プロジェクトコードに実際のホスト名をハードコードすることを避けることができます。
```

## License

Apache-2.0

## Reference

* Goバージョン: [github.com/shibukawa/urlf](https://pkg.go.dev/github.com/shibukawa/urlf)
