/*
 term.js - A 'character by character' javascript terminal. Made for AVRjs.

 Copyright (C) 2015-2018  Julian Ingram

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

"use strict";

const TERM_DEF_CONFIG = {
    "width": "600px",
    "height": "360px",
    "font_size": "1rem",
    "padding": "6px",
    "tabindex": 0
}

function term(div, keypress) {
    // hack to make firefox enable paste event on non contenteditable div
    /*var ff_paste_div = document.createElement("div");
    ff_paste_div.id = "ff_paste_hack";
    ff_paste_div.contentEditable = "True";
    ff_paste_div.style.display = "none";
    div.parentNode.insertBefore(ff_paste_div, div);*/

    var line_div_itt = 0;
    var line_divs = [];
    var linebuffer_size = 64;

    var line_height = get_line_height();

    var resizing = 0;

    var cursor_element = undefined;
    var eol_element = undefined;

    div.addEventListener("paste", function(event) {
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

    div.addEventListener("keydown", function(event) {
        var keycode = event.keyCode ? event.keyCode : event.which;
        if (keycode === 8) {
            event.preventDefault();
            keypress(keycode);
        } else if (keycode === 37) {
            event.preventDefault();
            keypress("left");
        } else if (keycode === 38) {
            event.preventDefault();
            keypress("up");
        } else if (keycode === 39) {
            event.preventDefault();
            keypress("right");
        } else if (keycode === 40) {
            event.preventDefault();
            keypress("down");
        } else if (keycode === 46) {
            event.preventDefault();
            keypress("del");
        }
    });

    div.addEventListener("keypress", function(event) {
        if (!event.ctrlKey) {
             keypress(event.keyCode ? event.keyCode : event.which);
        }
    });

    newline();

    function get_line_height() {
        var line = document.createElement("div"); //$('<div style="visibility:hidden;">Test</div>');
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
                text += line_divs[line_div_itt].innerHTML;
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
        line_divs[line_div_itt] = line_div;
        div.appendChild(line_div);

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
        div.scroll(0, div.scrollHeight);
    }

    function write_string(s) {
        for (var i = 0, l = s.length; i < l; ++i) {
            write(s.charCodeAt(i));
        }
    }

    function clear() {
        div.innerHTML = "";
        line_div_itt = 0;
        line_divs = [];
        newline();
    }

    function config(config) {
        var configuring = false;
        div.style.width = config["width"];
        div.style.height = config["height"];
        div.style.fontFamily = "'Courier New', Courier, monospace";
        div.style.backgroundColor = config["backgroud-color"] || "#222222";
        div.style.color = config["color"] || "#DADADA";
        div.style.fontSize = config["font-size"] || "1rem";
        div.style.whiteSpace = "nowrap";
        div.style.overflowY = "scroll";
        div.style.padding = config["padding"] || "6px";
        div.tabIndex = config["tabindex"];

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
        config: config,
    };
}
