(function (global, undefined) {
    'use strict';

    // Const
    // -----------------------------------------------------------------------------
    var DEFAULT_TYPEWRITE_OPTIONS = {
        talkDelay:  0.04,
        duration:   0.5,
        commaWait:  1,
        periodWait: 2
    };
    var DEFAULT_META_CHAR = {
        START_TAG:  '{',
        END_TAG:    '}',
        BR:         '|',
        START_WRAP: '<',
        END_WRAP:   '>'
    };
    var DEFAULT_OPTIONS = {
        textElm:          '#text',
        prefix:           ['webkit', 'moz', 'o', 'ms'],
        typeWriteSetting: DEFAULT_TYPEWRITE_OPTIONS,
        metaChara:        DEFAULT_META_CHAR,
        onStart:          null,
        onEnd:            null
    };
    var COMMA_RE = /[,\u3001\uFF64]/;
    var PERIOD_RE = /[\.\u3002\uFF61]/;
    var ELEMENT_NODE_TYPE = global.Node.ELEMENT_NODE;


    // Class
    // -----------------------------------------------------------------------------
    /**
     * 文字送りモジュール
     *
     * ざっくり仕組みとしては、
     * - 対象となる独自タグ入りのテキストをパースしながらDOMにappend
     * - opacity: 0でappendし、すぐにopacity: 1することで順に表示していく
     *
     * @param {Object} options
     *     初期化オプション
     * @param {String|HTMLNode} options.textElm
     *     文字を表示するDOM要素 or セレクタ
     * @param {Array[String]} options.prefix
     *     対応するベンダープレフィックス
     * @param {Object} options.typeWriteSetting
     *     文字送りに関する設定オブジェクト
     * @param {Number} options.typeWriteSetting.talkDelay
     *     文字と文字の表示間隔(単位: 秒)
     * @param {Number} options.typeWriteSetting.duration
     *     文字自体の表示スピード(単位: 秒)
     * @param {Number} options.typeWriteSetting.commaWait
     *     ',' '、' などカンマの文字で一旦停止する時間(単位: 秒)
     * @param {Number} options.typeWriteSetting.periodWait
     *     '.' '。' などピリオドの文字で一旦停止する時間(単位: 秒)
     * @param {Object} options.metaChara
     *     独自タグに使用する文字列(内容はコード参照)
     * @param {Function} options.onStart
     *     文字送りの開始時のフック関数
     * @param {Function} options.onEnd
     *     文字送りの終了時のフック関数
     *
     * @class TypeWrite
     */
    var TypeWrite = function (options) {
        this._setting          = __extend(DEFAULT_OPTIONS, options);
        this._typeWriteSetting = __extend(DEFAULT_TYPEWRITE_OPTIONS, this._setting.typeWriteSetting);
        this._metaChar         = __extend(DEFAULT_META_CHAR, this._setting.metaChara);
        this._textElm          = __getElement(this._setting.textElm);

        this._onStart = this._setting.onStart || null;
        this._onEnd   = this._setting.onEnd   || null;

        // documentFragment入れ
        this._buffer     = null;
        // コールバック用タイマー
        this._onEndTimer = null;

        console.log('TypeWrite: initialize', this);
        return this;
    };

    TypeWrite.prototype = {
        constructor:        TypeWrite,
        start:              start,
        skip:               skip,
        _parseAndTypeWrite: _parseAndTypeWrite,
        _refreshTextElm:    _refreshTextElm,
        _addBr:             _addBr,
        _addTransitionSpan: _addTransitionSpan,
        _resetTransition:   _resetTransition,
        _applyPrefixStyle:  _applyPrefixStyle,
        _dispose:           _dispose
    };

    /**
     * 文字送りをスタートする
     *
     * @name start
     * @param {String} text
     *     文字送りして表示したいテキスト
     * @param {Object} setting
     *     文字送りに関するオプション(内容はinitialize時に渡すものと同じ)
     */
    function start(text, setting) {
        console.log('TypeWrite: start', text, setting);
        if (setting) {
            this._typeWriteSetting = __extend(this._setting.typeWriteSetting, setting);
        }
        this._refreshTextElm();
        this._parseAndTypeWrite(text);
    }

    /**
     * 文字送りを中断し、即座にすべての文字を表示する
     * 実質のdisposeメソッド
     *
     * @name skip
     */
    function skip() {
        console.log('TypeWrite: skip');
        this._resetTransition();
    }

    /**
     * 文字送りの実行
     * 初期化時に与えられた要素に対して文字を入れていく
     *
     * @name parseAndTypeWrite
     * @param {String} text
     *     文字送りして表示したいテキスト
     */
    function _parseAndTypeWrite(text) {
        console.log('TypeWrite: parseAndTypeWrite', text);
        var META_CHARA        = this._metaChar;
        var TYPEWRITE_SETTING = this._typeWriteSetting;

        var isTagParsing = false,
            isWraping    = false,
            isLastChar   = false,
            wrapClass    = '',
            char,
            wait = 0,
            i = 0, // 独自タグをパースするために、文字列全体を走査するにはこっち
            readableCharI = 0, // そうではなく、表示だけに関する文字を扱うカウンターはこっち
            l = text.length,
            lastIdx = l - 1;

        // コレにいれてく
        this._buffer = document.createDocumentFragment();
        this._onStart && this._onStart();

        for (; i < l; i++) {
            char = text[i];

            // 最後の文字ならフラグを立てて(iはインデックスなので-1)
            isLastChar = i === lastIdx;

            // 独自タグ処理開始
            if (char === META_CHARA.START_TAG) {
                isTagParsing = true;
            }

            // 独自タグ処理中なので、改行以外はループをcontinue
            if (isTagParsing) {
                switch (char) {
                case META_CHARA.END_TAG:
                    isTagParsing = false;
                    // ページの最後の文字がコレだった場合、
                    // 後続の処理を回すためにループを抜ける
                    // その時に出力されても困らないよう、空文字にしておく
                    char = '';
                    break;

                case META_CHARA.BR:
                    this._addBr();
                    break;

                case META_CHARA.START_WRAP:
                    isWraping = true;
                    break;

                case META_CHARA.END_WRAP:
                    isWraping = false;
                    wrapClass = '';
                    break;
                }

                // 独自タグを処理中で、Wrap対象があればパース
                if (isWraping && isTagParsing) {
                    switch (char) {
                    // ラップ開始タグは、独自タグのすぐ後に来るので無視
                    case META_CHARA.START_WRAP:
                        break;

                    // それ以外はラップ用クラスなので保存
                    default:
                        wrapClass += char;
                        break;
                    }
                }

                // [再掲] 独自タグ処理中なので、改行以外はループをcontinue
                // ただし最後の1文字の場合はcontinueしない
                // 最後のテキスト および ページ全体が独自タグで構成されていた場合、
                // 最後まで独自タグ処理中扱いになり、後続の処理が走らないままループが終わってしまう
                if (!isLastChar) {
                    continue;
                }
            }

            // ここでDOMの元を作る
            this._addTransitionSpan(char, readableCharI++, wait, wrapClass, isLastChar);

            // ディレイ系文字なら次の文字を遅延させる
            // この計算は文字を送り出した後じゃないとダメ
            if (COMMA_RE.test(char)) {
                wait += TYPEWRITE_SETTING.commaWait;
            } else if (PERIOD_RE.test(char)) {
                wait += TYPEWRITE_SETTING.periodWait;
            }
        }

        this._textElm.appendChild(this._buffer);
    }

    /**
     * コンテナを空っぽにして、次の文字送りに備える
     * 念のため、強制的にリペイントさせる
     *
     * @name refreshTextElm
     */
    function _refreshTextElm() {
        var elm = this._textElm;

        // 消す
        while (elm.firstChild) {
            elm.removeChild(elm.firstChild);
        }

        // L01とかいうAndroidで画面に文字が焼き付いたので念のためリペイント
        // ただし通常のノードのみ(fragmentのときは無視)
        if (elm.nodeType === ELEMENT_NODE_TYPE) {
            var display = elm.style.display;
            elm.style.display = 'none';
            elm.offsetHeight;
            elm.style.display = display;
        }
    }

    /**
     * <br>を出力する
     *
     * @name addBr
     */
    function _addBr() {
        var br = document.createElement('br');
        this._buffer.appendChild(br);
    }

    /**
     * <span>を出力する
     * ただし普通のspanではなく、opacityのCSSアニメーションつき
     * クラス名の付与が必要あればつける
     * 最後の1文字の場合は、コールバックを仕込む
     *
     * @name addTransitionSpan
     * @param {String} character
     *     表示する1文字
     * @param {Number} num
     *     いま何文字目か
     * @param {Number} wait
     *     カンマやピリオド文字で遅延させるべき秒数
     * @param {String|Null} wrapClass
     *     spanにつけるクラス名
     * @param {Boolean} isLastChar
     *     最後の1文字 or NOT
     */
    function _addTransitionSpan(character, num, wait, wrapClass, isLastChar) {
        var TYPEWRITE_SETTING = this._typeWriteSetting;
        var delay = (TYPEWRITE_SETTING.talkDelay * (num + 1)) + wait;

        // まず作る
        var span = document.createElement('span');
        span.textContent = character;

        // スタイル
        span.style.opacity = 0;
        this._applyPrefixStyle(span, 'transition', [
            'opacity',
            TYPEWRITE_SETTING.duration + 's',
            'linear',
            delay + 's'
        ].join(' '));

        // クラス名は必要あれば
        if (wrapClass) { span.className = wrapClass; }

        // いきなりDOMにいれず、バッファにためる
        this._buffer.appendChild(span);

        // これでtransitionが動いて文字送りを実現する
        setTimeout(function () {
            span.style.opacity = 1;
        });

        // 最後の文字の場合、onEndのコールバックを発火する
        // 最後の文字がtransitionし終わったであろう頃に発火
        if (isLastChar) {
            var timeoutDelay = 1000 * (TYPEWRITE_SETTING.duration + delay);
            var that = this;
            that._onEndTimer = setTimeout(function() {
                that._dispose();
                console.log('TypeWrite: textParser -> finish with callback delay ->', timeoutDelay);
            }, timeoutDelay);
        }
    }

    /**
     * 全てのタグのアニメーションを止めて、即座にすべての文字を表示
     *
     * @name resetTransition
     */
    function _resetTransition() {
        var child = this._textElm.childNodes;
        for (var i in child) {
            /*jshint forin: false*/
            if (child[i].tagName === 'SPAN') {
                this._applyPrefixStyle(child[i], 'transition', '');
            }
        }

        this._dispose();
    }

    /**
     * プレフィックスが必要なスタイルを、プレフィックスつきで反映
     *
     * @name applyPrefixStyle
     * @param {HTMLNode} elm
     *     対象となるDOM
     * @param {String} prop
     *     つけるスタイルの名前
     * @param {String} value
     *     つけるスタイルの値
     */
    function _applyPrefixStyle(elm, prop, value) {
        // No prefix
        elm.style[prop] = value;

        // Vendor prefix
        var supports = this._setting.prefix;
        prop = __toPascalCase(prop);
        var i = 0, l = supports.length;
        for (; i < l; i++) {
            elm.style[supports[i]+prop] = value;
        }
    }

    /**
     * いわゆる終了処理
     *
     * @name dispose
     */
    function _dispose() {
        console.log('TypeWrite: dispose');
        clearTimeout(this._onEndTimer);
        this._onEndTimer = null;

        this._onEnd && this._onEnd();
    }


    // Exports
    // -----------------------------------------------------------------------------
    var __isAMD      = (typeof global.define === 'function') && global.define.amd;
    var __isCommonJS = (typeof global.exports === 'object') && global.exports;
    if (__isAMD) {
        define([], function () {
            return TypeWrite;
        });
    } else if (__isCommonJS) {
        module.exports = TypeWrite;
    } else {
        global.TypeWrite = TypeWrite;
    }



    // Privates
    // -----------------------------------------------------------------------------
    /**
     * オブジェクトを拡張する
     * いわゆるshallowなやつ
     *
     * @param {Object} defaults
     *     このオブジェクトをベースにする
     * @param {Object} options
     *     このオブジェクトにあるものを上書きする
     * @return {Object}
     *     上書きされたオブジェクトのコピー
     */
    function __extend(defaults, options) {
        options = options || {};
        var key, ret = {};

        for (key in defaults) {
            /*jshint forin: false*/
            ret[key] = defaults[key];
        }
        for (key in options) {
            /*jshint forin: false*/
            if (options[key] !== undefined) { ret[key] = options[key]; }
        }

        return ret;
    }

    /**
     * DOM要素かセレクタを引数に、単一のDOMノードを返す
     *
     * @param {String|HTMLNode} node
     *     DOM要素 or セレクタ文字列
     * @return {HTMLNode}
     *     DOMノード
     */
    function __getElement(node) {
        var elm;
        if (typeof node === 'string') {
            elm = global.document.querySelectorAll(node)[0];
        } else {
            if (node.length > 1) {
                elm = node[0];
            } else {
                elm = node;
            }
        }

        return elm;
    }

    /**
     * 先頭文字を大文字に、あとはそのまま
     *
     * @param {String} text
     *     対象の文字列
     * @return {String}
     *     処理後のテキスト
     */
    function __toPascalCase(text) {
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    }

})(window);
