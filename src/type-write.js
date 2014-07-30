(function (global, undefined) {
    'use strict';

    /**
     * Defaults and constants.
     *
     */
    var DEFAULT_OPTIONS = {
        textElm:          '#text',
        prefix:           ['webkit', 'moz', 'o', 'ms'],
        typeWriteSetting: null,
        metaChara:        null,
        onStart:          null,
        onEnd:            null
    };
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
    var COMMA_RE = /[,\u3001\uFF64]/;
    var PERIOD_RE = /[\.\u3002\uFF61]/;

    /**
     * Class implementations.
     *
     */
    var TypeWrite = function (options) {
        this.initialize(options);
        return this;
    };

    TypeWrite.prototype = {
        constructor: TypeWrite,
        initialize: function (options) {
            this._setting          = __extend(DEFAULT_OPTIONS, options);
            this._typeWriteSetting = __extend(DEFAULT_TYPEWRITE_OPTIONS, this._setting.typeWriteSetting);
            this._metaChar         = __extend(DEFAULT_META_CHAR, this._setting.metaChara);
            this._textElm = __getElement(this._setting.textElm);

            this._onStart = this._setting.onStart || null;
            this._onEnd   = this._setting.onEnd   || null;

            this._onEndTimer = null;
            console.log('TypeWrite: initialize', this);
        },

        start: function(text, setting) {
            console.log('TypeWrite: start', text, setting);
            if (setting) {
                this._typeWriteSetting = __extend(this._setting.typeWriteSetting, setting);
            }
            this._textElm.innerHTML = '';
            this._parseAndTypeWrite(text);
        },

        skip: function() {
            console.log('TypeWrite: skip');
            this._resetTransition();
        },

        _parseAndTypeWrite: function (text) {
            console.log('TypeWrite: parseAndTypeWrite', text);
            var META_CHARA        = this._metaChar;
            var TYPEWRITE_SETTING = this._typeWriteSetting;

            var isTagParsing = false,
                isWraping    = false,
                isLastOne    = false,
                wrapClass = '',
                char,
                wait = 0,
                i = 0,
                l = text.length,
                lastCount = l - 1;

            for (; i < l; i++) {
                char = text[i];

                if (i === 0) {
                    this._onStart && this._onStart();
                }

                // 独自タグ処理開始
                if (char === META_CHARA.START_TAG) {
                    isTagParsing = true;
                }

                // 独自タグ処理中なので、改行以外はループをcontinue
                if (isTagParsing) {
                    switch (char) {
                    case META_CHARA.END_TAG:
                        isTagParsing = false;
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

                    default:
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

                    continue;
                }

                // 最後の文字ならフラグを立てて
                isLastOne = (i === lastCount);
                // ここでDOMに落ちる
                if (isWraping) {
                    this._addTransitionSpan(char, i, wait, wrapClass, isLastOne);
                } else {
                    this._addTransitionSpan(char, i, wait, null, isLastOne);
                }

                // ディレイ系文字なら次の文字を遅延させる
                // この計算は文字を送り出した後じゃないとダメ
                if (COMMA_RE.test(char)) {
                    wait += TYPEWRITE_SETTING.commaWait;
                } else if (PERIOD_RE.test(char)) {
                    wait += TYPEWRITE_SETTING.periodWait;
                }
            }
        },

        _addBr: function() {
            var br = document.createElement('br');
            this._textElm.appendChild(br);
        },

        _addTransitionSpan: function (character, num, wait, wrapClass, isLastOne) {
            var TYPEWRITE_SETTING = this._typeWriteSetting;
            var delay = (TYPEWRITE_SETTING.talkDelay * (num + 1)) + wait;
            var transition = [
                'opacity',
                TYPEWRITE_SETTING.duration + 's',
                'linear',
                delay + 's'
            ].join(' ');

            var span = document.createElement('span');
            span.textContent = character;
            span.style.opacity = 0;
            this._applyPrefixStyle(span, 'transition', transition);
            if (wrapClass) { span.className = wrapClass; }

            this._textElm.appendChild(span);
            setTimeout(function () {
                span.style.opacity = 1;
            });

            // 最後の文字の場合、onEndのコールバックを発火する
            // 最後の文字がtransitionし終わったであろう頃に発火
            if (isLastOne) {
                var timeoutDelay = 1000 * (TYPEWRITE_SETTING.duration + delay);
                var that = this;
                that._onEndTimer = setTimeout(function() {
                    that._onEnd && that._onEnd();
                    that._dispose();
                    console.log('TypeWrite: textParser -> finish with callback delay ->', timeoutDelay);
                }, timeoutDelay);
            }

        },

        _resetTransition: function () {
            var child = this._textElm.childNodes;
            for (var i in child) {
                /*jshint forin: false*/
                if (child[i].nodeType === 1) {
                    this._applyPrefixStyle(child[i], 'transition', '');
                }
            }
            this._onEnd && this._onEnd();
            this._dispose();
        },

        _applyPrefixStyle: function(elm, prop, value) {
            // No prefix
            elm.style[prop] = value;

            // Vendor prefix
            var supports = this._setting.prefix;
            prop = __toPascalCase(prop);
            var i = 0, l = supports.length;
            for (; i < l; i++) {
                elm.style[supports[i]+prop] = value;
            }
        },

        _dispose: function() {
            console.log('TypeWrite: dispose');
            clearTimeout(this._onEndTimer);
            this._onEndTimer = null;
        }
    };


    /**
     * Exports
     * AMD, CommonJS support.
     *
     */
    var __isAMD      = (typeof global.define === 'function') && global.define.amd;
    var __isCommonJS = (typeof global.exports === 'object') && global.exports;
    if (__isAMD) {
        global.define([], function () {
            return TypeWrite;
        });
    } else if (__isCommonJS) {
        global.exports.TypeWrite = TypeWrite;
    } else {
        global.TypeWrite = TypeWrite;
    }


    /**
     * Privates
     * Just simple implementations.
     *
     */
    function __extend(defaults, options) {
        options = options || {};
        var ret     = defaults;

        for (var key in options) {
            /*jshint forin: false*/
            ret[key] = (options[key] !== undefined) ? options[key]
                                                    : defaults[key];
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

    function __toPascalCase(text) {
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    }

})(this.self || global);
