type-write.js
===============

See this [example](http://labs.lealog.net/type-write-sample/). ;D

## 使い方

以下の2パターンが主な使い方になると思います。

### 文字送りしつつ使う

```javascript
var typeWrite = new TypeWrite({
  text: 'あいうえお{|}かきくけこ',
  typeWriteDuration: 50,
  onTypeWrite: function(char) {
    // => 50ms間隔で、ココに1文字ずつ返ってくる
    console.log(char);
  }
});

typeWrite.start();
```

### 文字送りした結果を使う

```javascript
var typeWrite = new TypeWrite({
  text: 'あいうえお{|}かきくけこ',
  isResult: true
});


var resultText = typeWrite.start(); // => 'あいうえおかきくけこ'
```

## 初期化オプション

```javascript
var typeWrite = new TypeWrite(options);
```

### options.text

{String} 文字送りしたい文字列

### options.isResult

{Boolean} 結果取得モードかどうか

### options.metaChar

{Object} 独自タグの文字指定

```javascript
// 初期設定
var DEFAULT_META_CHAR = {
  START_TAG:  '{',
  END_TAG:    '}',
  BR:         '|',
  START_WRAP: '<',
  END_WRAP:   '>'
};
```
### options.typeWriteDuration

{Number} 文字送りのスピード

### options.forceStop

{Function} 毎文字送りのタイミングで実行され、trueになると処理を終了します

### options.onStart

{Function} 文字送り開始前に1度呼ばれます

### options.onTypeWrite

{Function} 毎文字送りのタイミングで実行され、文字送りされた1文字が引数で渡ります

### options.onEnd

{Function} 文字送り終了時(forceStop終了含む)に1度呼ばれます


## 独自タグの書式

```
あのイーハトーヴォのすきとおった風、{|}
夏でも底に冷たさをもつ{<blue}青い{>}そら、{|}
うつくしい{<green}森{>}で飾られたモリーオ市、郊外のぎらぎらひかる草の{<italic blue}波{>}。
```

という文字は、以下のHTMLとして出力されます。

```html
あのイーハトーヴォのすきとおった風、<br>
夏でも底に冷たさをもつ<span class="blue">青</span><span class="blue">い</span>そら、<br>
うつくしい<span class="green">森</span>で飾られたモリーオ市、郊外のぎらぎらひかる草の<span class="italic blue">波</span>。
```

※見やすさのために改行してます。

### 注意
- 言わずもがな、事前にCSSの定義が必要です
- ``{}``のネストはできません
