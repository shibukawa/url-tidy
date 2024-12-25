# url-tidy: URLフォーマットユーティリティ

url-tidy は TypeScript 用の URL インジェクションを防ぐための安全な URL 構築ライブラリです。

このライブラリはタグ付きテンプレートリテラル関数として、短く読みやすいAPIを提供します。URL文字列のテンプレートに設定された文字列は適切にエスケープされます。

安全なURLを生成する`URL`クラスのラッパーですが、ワンライナーで使いやすいAPIを提供するとともに、`URL`クラスがサポートしていないスキーマ相対URLや、ホスト名のない相対パスなどもサポートしています。

## インストール

```bash
$ npm install url-tidy
```

## 基本の利用方法

url-tidyはタグ付きテンプレートリテラルの関数を提供します。この関数はフォーマットされたURL文字列を返します。
そのまま`fetch()`関数に渡せます

```ts
import { url } from 'url-tidy';

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

apiUrl`https://api-server/api/users/${'id'}/profile`
// => 'https://user:pAssw0rd@localhost:8080/api/users/1000/profile'
// "https://api-server" はダミーの文字列で、customFormatter()のホスト名オプションで置き換わる
// プロジェクトコードに実際のホスト名をハードコードすることを避けることができます。
```

## License

Apache-2.0
