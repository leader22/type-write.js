;(function (global, undefined) {
    'use strict';

    // Const and settings
    var __isAMD = (typeof global.define === 'function') && global.define.amd;
    var DEFAULT_META_CHAR = {
        START_TAG:      '{',
        END_TAG:        '}',
        BR:             '|',
        START_WRAP:     '<',
        END_WRAP:       '>'
    };


    // Class definitions
    /**
     * タイプライターのように、一連の文字列を一文字ずつ出力する
     * 独自のタグを含むテキストをパースして、任意のタイミングで出力する
     *
     * @class TypeWrite
     */
    var TypeWrite = function(options) {
        // オプションの内容は後述
        this.initialize(options);
    };

    TypeWrite.prototype = {
        constructor: TypeWrite,
        /**
         * 初期化処理
         *
         * @name initialize
         * @param {Object} options
         *    初期化設定
         * @param {String} options.text
         *    処理したい文字列
         * @param {Boolean} options.isResult
         *    パースだけ実行して、結果だけ欲しいならtrue
         * @param {Number} options.typeWriteDuration
         *    文字送りのタイミング
         * @param {Object} options.metaChar
         *    独自のタグに使う区切り文字など
         * @param {Function} options.forceStop
         *    実行結果がtrueになると、文字送りを強制的に終わらせる
         * @param {Function} options.onStart
         *    文字送りを開始する前のフック
         * @param {Function} options.onTypeWrite
         *    文字送りされる度に呼ばれるフックで、送られた文字が引数として渡る
         * @param {Function} options.onEnd
         *    文字送りが全て終わった後のフック
         */
        initialize: function(options) {
            this._text      = options.text     || '';
            this._isResult  = options.isResult || false;

            this._metaChar = __extend(options.metaChar, DEFAULT_META_CHAR);
            this._typeWriteDuration = options.typeWriteDuration || 80;

            this._forceStop   = options.forceStop   || __nope;
            this._onStart     = options.onStart     || __nope;
            this._onTypeWrite = options.onTypeWrite || __nope;
            this._onEnd       = options.onEnd       || __nope;
        },
        /**
         * 処理開始メソッド
         *
         * @name start
         * @return {String}
         *     初期化時にisResultがtrueにした場合のみ、処理後のテキストが返る
         */
        start: function() {
            var that = this;
            var META_CHARA = that._metaChar;

            // 即パース後が欲しいケース
            var isResult = that._isResult;
            var resultText = '';
            if (isResult) {
                that._onTypeWrite = function(char) {
                    resultText = resultText + char;
                };
            }

            // 処理に必要な変数をまとめて初期化
            var textArr = that._text.split(''),
                i = 0,    // 何文字目まで表示してるかカウンター
                timer,    // 使いまわす用タイマー
                parseTag, // 特殊文字をパース中であるフラグ
                isWrap,   // 文字をラップするかどうかフラグ
                wrapClass = '', // ラップするときのクラス名、下の%に入る
                wrapStart = '<span class="%">', wrapEnd = '</span>';

            // 処理開始
            __type();

            // 即パース時は同期実行するのでreturnしてあげる
            if (isResult) { return resultText; }

            /**
             * ループされるメインのパーサー
             *
             * @name __type
             */
            function __type() {
                // 最初にやっておきたいことがあれば
                if (i === 0) {
                    that._onStart && that._onStart();
                }
                // 最後まで来たら or 強制終了されたら終わる
                if (i === textArr.length || that._forceStop()) {
                    clearTimeout(timer);
                    timer = null;
                    that._onEnd && that._onEnd();
                    return;
                }

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
                        that._onTypeWrite('<br>');
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
                    return __type();
                }

                // 独自タグ処理をしてない時は、出力する
                // ラッパーの指定(主にフォント)があれば、包んで出力
                if (isWrap) {
                    that._onTypeWrite(wrapStart.replace('%', wrapClass) + char + wrapEnd);
                } else {
                    that._onTypeWrite(char);
                }

                // 即パースしたい場合は同期で実行
                if (isResult) {
                    __type();
                } else {
                    timer = setTimeout(__type, that._typeWriteDuration);
                }
            }
        }
    };


    // Exports
    if (__isAMD) {
        define([], function() {
            return TypeWrite;
        });
    } else {
        global.TypeWrite = TypeWrite;
    }


    // Private functions
    function __nope() {}
    function __extend(options, defaults) {
        var ret = defaults;
        for (var key in options) {
            /*jshint forin: false*/
            ret[key] = options[key];
        }

        return ret;
    }

}(window));
