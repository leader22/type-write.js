;(function (global, undefined) {
    'use strict';

    // Const and settings
    var __isAMD = (typeof global.define === 'function') && global.define.amd;

    var DEFAULT_VISIBLE_CLASS_NAME = 'is-visible';
    var DEFAULT_META_CHAR = {
        START_TAG:      '{',
        END_TAG:        '}',
        BR:             '|',
        START_WRAP:     '<',
        END_WRAP:       '>'
    };
    var DEFAULT_DURATION = 80;


    // Class definitions
    /**
     * タイプライターのように、一連の文字列を一文字ずつ出力する
     * 独自のタグを含むテキストをパースして、任意のタイミングで出力する
     * TypeWriteとの違いは、こっちはCSSでも字送りを表現するところ
     *
     * @class CSSTypeWrite
     */
    var CSSTypeWrite = function(options) {
        // オプションの内容は後述
        this.initialize(options);
        return this;
    };

    CSSTypeWrite.prototype = {
        constructor: CSSTypeWrite,
        /**
         * 初期化処理
         *
         * @name initialize
         * @param {Object} options
         *    初期化設定
         * @param {String} options.text
         *    処理したい文字列
         * @param {HTMLElement|String} options.destElm
         *    文字送りを表示する要素 or セレクタ
         * @param {Number} options.typeWriteDuration
         *    文字送りのタイミング
         * @param {Object} options.metaChar
         *    独自のタグに使う区切り文字など
         * @param {Function} options.forceStop
         *    実行結果がtrueになると、文字送りを強制的に終わらせる
         * @param {Function} options.onStart
         *    文字送りを開始する前のフック
         * @param {Function} options.onTypeWrite
         *    文字送りされる度に呼ばれるフックで、送られたタグが引数として渡る
         * @param {Function} options.onEnd
         *    文字送りが全て終わった後のフック
         */
        initialize: function(options) {
            this._text    = options.text || '';
            this._destElm = __getElement(options.destElm);

            this._metaChar          = __easyExtend(options.metaChar, DEFAULT_META_CHAR);
            this._typeWriteDuration = options.typeWriteDuration || DEFAULT_DURATION;
            this._visibleClassName  = options.visibleClassName  || DEFAULT_VISIBLE_CLASS_NAME;

            this._forceStop   = options.forceStop   || function() {};
            this._onStart     = options.onStart     || null;
            this._onTypeWrite = options.onTypeWrite || null;
            this._onEnd       = options.onEnd       || null;

            return this;
        },

        /**
         * 処理開始メソッド
         *
         * @name start
         */
        start: function() {
            this.setPage();
            var charElms = this._destElm.getElementsByTagName('span'),
                i = 0,
                l = charElms.length,
                timer = null,
                that  = this;

            __show();

            function __show() {
              timer = setTimeout(function() {
                var isForceStop = that._forceStop();

                if (i === 0) {
                    that._onStart && that._onStart();
                }

                if (i === l || isForceStop) {
                  clearTimeout(timer);
                  timer = null;
                  console.log('FINISH');

                  if (isForceStop) {
                    that._destElm.className += ' '+that._visibleClassName;
                  }

                  that._onEnd && that._onEnd();
                  return;
                }

                charElms[i++].className += ' '+that._visibleClassName;
                that._onTypeWrite && that._onTypeWrite(charElms[i]);

                __show();
              }, that._typeWriteDuration);
            }
        },

        setPage: function() {
            this._destElm.innerHTML = this.parse();
        },

        /**
         * テキストをパースして返す
         *
         * @name parse
         * @return {String}
         *     パース済のテキスト
         */
        parse: function() {
            var that = this;
            var META_CHARA = that._metaChar;

            // 処理に必要な変数をまとめて初期化
            var textArr = that._text.split(''),
                i = 0,    // 何文字目まで表示してるかカウンター
                parseTag, // 特殊文字をパース中であるフラグ
                isWrap,   // 文字をラップするかどうかフラグ
                wrapClass = '', // ラップするときのクラス名、下の%に入る
                wrapStart = '<span class="%">', wrapEnd = '</span>',
                resultText = ''; // ここにパース済のテキスト

            // 処理開始
            __parse();
            return resultText;

            /**
             * ループされるメインのパーサー
             *
             * @name __parse
             */
            function __parse() {
                // 最後まで来たら終わる
                if (i === textArr.length) { return; }

                // 1文字ずつ取り出していく
                var char = textArr[i++];

                if (char === META_CHARA.START_TAG) {
                    parseTag = true;
                }

                // 独自タグ処理中は、出力をやめる
                if (parseTag) {
                    switch (char) {
                    case META_CHARA.END_TAG:
                        parseTag = false;
                        break;

                    case META_CHARA.BR:
                        resultText += '<br>';
                        break;

                    case META_CHARA.START_WRAP:
                        isWrap = true;
                        break;

                    case META_CHARA.END_WRAP:
                        isWrap = false;
                        wrapClass = '';
                        break;

                    default:
                        break;
                    }

                    // 独自タグを処理中で、Wrap対象があればパース
                    if (isWrap && parseTag) {
                        switch (char) {
                        case META_CHARA.START_WRAP:
                            break;

                        // それ以外はラップ用クラスなので保存
                        default:
                            wrapClass = wrapClass + char;
                            break;
                        }
                    }

                    // 独自タグが終わるまでやりなおす
                    return __parse();
                }

                // 独自タグ処理をしてない時は、出力する
                // ラッパーの指定(主にフォント)があれば、包んで出力
                if (isWrap) {
                    resultText += (__wrap(char, wrapClass));
                } else {
                    resultText += (__wrap(char));
                }

                __parse();
            }

            /**
             * 文字列をラップして返す
             *
             * @name __wrap
             * @param {String} char
             *     ラップされる文字列
             * @param {String|null} wrapClass
             *     ラップするときにクラス名の指定があれば
             * @return {String}
             *     ラップ済の文字列(HTML)
             */
            function __wrap(char, wrapClass) {
                var str = '';
                if (wrapClass) {
                  str = '<span class="%">'.replace('%', wrapClass) + char + '</span>';
                }
                else {
                  str = '<span>' + char + '</span>';
                }

                return str;
            }
        }
    };


    // Exports
    if (__isAMD) {
        define([], function() {
            return CSSTypeWrite;
        });
    } else {
        global.CSSTypeWrite = CSSTypeWrite;
    }


    // Private functions
    function __easyExtend(options, defaults) {
        var ret = defaults;
        for (var key in options) {
            /*jshint forin: false*/
            ret[key] = options[key];
        }

        return ret;
    }
    function __getElement(any) {
        var elm;
        if (typeof any === 'string') {
            elm = global.document.querySelector(any);
        } else {
            elm = any;
        }

        return elm;
    }

}(window));
