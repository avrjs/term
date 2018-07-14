/*
 term.js - A 'character by character' javascript terminal. Made for AVRjs.

 Copyright (C) 2015-2018  Julian Ingram

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at
     http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

"use strict";

const TERM_DEF_CONFIG = {};

function term(div, keypress) {
    var line_div_itt = 0;
    var line_divs = [];
    var linebuffer_size = 64;

    var line_height = get_line_height();

    var resizing = 0;
    var digi = "";

    var cursor_element = undefined;
    var eol_element = undefined;

    var op_div = document.createElement("div");
    op_div.style.margin = "0px";
    op_div.style.padding = "0px";
    op_div.style.width = "100%";
    op_div.id = "term_output";
    div.appendChild(op_div);

    var ip_div = document.createElement("input");
    ip_div.id = "term_input";
    ip_div.setAttribute("type", "text");
    ip_div.setAttribute("autocorrect", "off");
    ip_div.setAttribute("autocapitalize", "none");
    ip_div.style.position = "relative";
    ip_div.style.padding = "0";
    ip_div.style.border = "0";
    ip_div.style.zIndex = "-1";
    ip_div.style.height = "0px";
    ip_div.style.width = "0px";
    div.appendChild(ip_div);
    ip_div.style.top = "-" + line_height + "px";

    div.addEventListener("mouseup", function(event) {
        var tpos = div.scrollTop;
        var lpos = div.scrollLeft;
        var sel = window.getSelection();
        if (!sel.toString()) {
            // bring up virtual keyboard on mobile
            ip_div.focus();
            div.scrollTo(lpos, tpos);
        }
    });

    function keydown(event) {
        /* Capture unprintables */
        var keycode = event.keyCode ? event.keyCode : event.which;
        if (keycode === 8) {
            keypress(keycode);
        } else if (keycode === 13) {
            keypress(keycode);
        } else if (keycode === 37) {
            keypress(0x1b);
            keypress("[".charCodeAt(0));
            keypress("D".charCodeAt(0));
        } else if (keycode === 38) {
            keypress(0x1b);
            keypress("[".charCodeAt(0));
            keypress("A".charCodeAt(0));
        } else if (keycode === 39) {
            keypress(0x1b);
            keypress("[".charCodeAt(0));
            keypress("C".charCodeAt(0));
        } else if (keycode === 40) {
            keypress(0x1b);
            keypress("[".charCodeAt(0));
            keypress("B".charCodeAt(0));
        } else if (keycode === 46) {
            keypress(0x7f);
        } else {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
    }

    div.addEventListener("keydown", function(event) {
        if (!event.ctrlKey) {
            ip_div.focus();
            keydown(event);
        }
    });

    op_div.addEventListener("keydown", function(event) {
        if (!event.ctrlKey) {
            ip_div.focus();
            keydown(event);
        }
    });

    ip_div.addEventListener("keydown", function(event) {
        keydown(event);
    });

    document.addEventListener('copy', function(event) {
        event.preventDefault();
        var sel = window.getSelection();
        if (sel.rangeCount) {
            event.clipboardData.setData("text/plain", sel.toString());
            event.clipboardData.setData("text/html", sel.toString());
        }
    });

    ip_div.addEventListener("paste", function(event) {
        var clipboard_data = event.clipboardData || window.clipboardData;
        var data = clipboard_data.getData('Text');

        event.preventDefault();
        event.stopPropagation();

        var i = 0;
        function write_to_term() {
            if (i !== data.length) {
                keypress(data.charCodeAt(i));
                ++i;
                setTimeout(write_to_term, 12);
            }
        };
        write_to_term();
    });

    ip_div.addEventListener("input", function(event) {
        var len = ip_div.value.length;
        var val = ip_div.value;
        if (len < digi.length) {
             digi = val;
        } else if (len) {
            // remove the digi string from the input string
            if (digi == val.slice(0, digi.length)) {
                var c = ip_div.value.charCodeAt(digi.length);
            } else if (digi == val.slice(len - digi.length)) {
                var c = ip_div.value.charCodeAt(0);
            } else {
                console.log("Error: digi input");
                return;
            }
            keypress(c);
            if ((c >= "0".charCodeAt(0)) && (c <= "9".charCodeAt(0))) {
                digi = ip_div.value;
            } else {
                ip_div.value = "";
                digi = "";
            }
        }
    });

    newline();

    function get_line_height() {
        var line = document.createElement("div");
        line.style.visibility = "hidden";
        line.innerHTML = "Test";

        div.appendChild(line);
        var height = line.clientHeight;
        line.remove();

        return height;
    }

    function reflow()
    {
        // remove eol_element
        if (eol_element !== undefined) {
            eol_element.remove();
            eol_element = undefined;
        }

        // recored all text in terminal
        var text = "";
        line_div_itt = (line_div_itt + 1) % linebuffer_size;
        var lim = line_div_itt;
        do
        {
            if (line_divs[line_div_itt] !== undefined)
            {
                var line_div = line_divs[line_div_itt];
                for (var i = 0, l = line_div.children.length; i < l; ++i) {
                    text += line_div.children[i].innerHTML;
                }
                text += "\r\n";
            }
            line_div_itt = (line_div_itt + 1) % linebuffer_size;
        } while (line_div_itt !== lim);
        text = text.substring(0, text.length - 2); // remove the last \r\n

        clear();

        for (var i = 0; i < text.length; ++i) { // re-write text
            write(text.charCodeAt(i));
        }
    }

    function delline(id)  {
        line_divs[id].remove();
    }

    function newline() {
        // remove cursor
        if (eol_element !== undefined) {
            eol_element.remove();
        }
        if (cursor_element !== undefined) {
            cursor_element.style.textDecoration = "none";
        }

        // increment the itterator
        line_div_itt = (line_div_itt + 1) % linebuffer_size;

        // remove the last div if there are linebuffer_size divs
        if (line_divs[line_div_itt] !== undefined) {
            delline(line_div_itt);
        }

        // add the new div
        var line_div = document.createElement("div");
        line_div.id = "line_" + line_div_itt;
        line_div.style.minHeight = line_height + "px";
        line_div.style.whiteSpace = "pre-wrap";
        line_div.style.wordWrap = "break-word";
        line_div.style.clear = "left";
        line_div.addEventListener("keydown", function(event) {
            if (!event.ctrlKey) {
                ip_div.focus();
                keydown(event);
            }
        });
        line_divs[line_div_itt] = line_div;

        op_div.appendChild(line_div);

        // add eol/cursorelement
        eol_element = document.createElement("span");
        eol_element.id = "term_eol";
        eol_element.style.textDecoration = "underline";
        eol_element.innerHTML = "&nbsp;";
        line_div.appendChild(eol_element);
        cursor_element = eol_element;
    }

    function write(chr) {
        var line = line_divs[line_div_itt];
        var line_text = line.innerHTML;

        switch (chr) {
        case 0x0A: // line feed
            newline();
            line = line_divs[line_div_itt];
            for (var i = 1,
                l = Array.from(line.childNodes).indexOf(cursor_element); i < l;
                ++i) {
                var ws_element = document.createElement("span");
                ws_element.innerHTML = "&nbsp;";
                line.prepend(ws_element);
            }
            break;
        case 0x0D: // carriage return
        cursor_element.style.textDecoration = "none";
            cursor_element = line.firstChild;
            cursor_element.style.textDecoration = "underline";
            break;
        case 0x08: // backspace
            if (cursor_element !== line.firstChild) {
                var els = Array.from(line.childNodes);
                cursor_element.style.textDecoration = "none";
                cursor_element = els[els.indexOf(cursor_element) - 1];
                cursor_element.style.textDecoration = "underline";
            }
            break;
        default:
            var char_element = document.createElement("span");
            char_element.innerHTML = String.fromCharCode(chr);
            cursor_element.before(char_element);
            if (cursor_element !== eol_element) { // overwrite
                var els = Array.from(line.childNodes);
                cursor_element.remove();
                cursor_element = els[els.indexOf(cursor_element) + 1];
                cursor_element.style.textDecoration = "underline";
            }
            break;
        }
        // keep the scrollbar at the bottom
        div.scroll(0, op_div.scrollHeight);
    }

    function write_string(s) {
        for (var i = 0, l = s.length; i < l; ++i) {
            write(s.charCodeAt(i));
        }
    }

    function clear() {
        op_div.innerHTML = "";
        line_div_itt = 0;
        line_divs = [];
        newline();
    }

    function config(config) {
        var configuring = false;
        op_div.style.fontFamily = "'Courier New', Courier, monospace";
        op_div.style.whiteSpace = "nowrap";
        div.style.overflowY = "scroll";
        ip_div.tabIndex = config["tabindex"] || "0";
        div.addEventListener("click", function(){void(0)}); // mobile safari

        if (configuring === false) {
            configuring = true;
            setTimeout(function () {
                configuring = false;
                reflow();
            }, 100);
        }
    }

    return {
        write: write,
        write_string: write_string,
        clear: clear,
        reflow: reflow,
        config: config
    };
}
