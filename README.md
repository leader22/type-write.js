type-write.js
===============
See this [example](http://labs.lealog.net/type-write-sample/). ;D

## 使い方

上記のデモと同じファイルがindex.htmlなので、そっち見るほうがはやいかも。

```javascript
var typeWrite = new TypeWrite({
    textElm: outputElm
});

typeWrite.start(targetText);
```

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
