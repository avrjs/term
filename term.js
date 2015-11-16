/*
 term.js - A 'character by character' javascript terminal. Made for avrjs
 
 Copyright (C) 2015  Julian Ingram
 
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

function term(div, width, height, text_size, keypress)
{
    var padding = 6;
    div.css({
        "width": width,
        "height": height,
        "font-family": "'Courier New', Courier, monospace",
        "background-color": "#222222",
        "color": "#DADADA",
        "font-size": text_size.toString(10) + "pt",
        "white-space": "nowrap",
        "overflow-y": "scroll",
        "padding": padding + "px"
    });
    div.prop("tabindex", "1");

    var line_div_itt = 0;
    var line_divs = [];
    var linebuffer_size = 48;

    var scrollbar_width = get_scrollbar_width();
    var line_height = get_line_height();

    var resizing = 0;

    var cursor = 0;

    div.bind('paste', function (event)
    {
        var data = event.originalEvent.clipboardData.getData('text');
        console.log(data);

        var i = 0;
        function write_to_term()
        {
            if (i !== data.length)
            {
                keypress(data.charCodeAt(i));
                ++i;
                setTimeout(write_to_term, 12);
            }
        }
        ;
        write_to_term();
    });

    div.keypress(function (event)
    {
        if (!event.ctrlKey)
        {
            var keycode = event.keyCode ? event.keyCode : event.which;
            keypress(keycode);
        }
    });

    newline();

    function get_scrollbar_width()
    {
        var inner = $('<div style="width: 100%; height:200px;"></div>');
        var outer = $('<div style="width:200px; height:150px; position: absolute; top: 0; left: 0; visibility: hidden; overflow:hidden;"></div>').append(inner);

        $('body').append(outer[0]);
        var width1 = inner[0].offsetWidth;
        outer.css('overflow', 'scroll');
        var width2 = outer[0].clientWidth;
        outer.remove();

        return (width1 - width2);
    }

    function get_line_height()
    {
        var line = $('<div style="visibility:hidden;">Test</div>');

        div.append(line);
        var height = line.height();
        line.remove();

        return height;
    }

    function reflow()
    {
        // recored all text in terminal
        var text = "";
        line_div_itt = (line_div_itt + 1) % linebuffer_size;
        var lim = line_div_itt;
        do
        {
            if (line_divs[line_div_itt] !== undefined)
            {
                text += line_divs[line_div_itt].text();
                text += "\r\n";
            }
            line_div_itt = (line_div_itt + 1) % linebuffer_size;
        } while (line_div_itt !== lim);
        text = text.substring(0, text.length - 2); // remove the last \r\n
        
        clear();
        // re-write text
        for (var i = 0; i < text.length; ++i)
        {
            write(text.charCodeAt(i));
        }
    }

    function resize(width, height)
    {
        div.width(width - (padding * 2));
        div.height(height - (padding * 2));

        if (resizing === 0)
        {
            resizing = 1;
            setTimeout(function () {
                resizing = 0;
                reflow();
            }, 100);
        }
    }

    function delline(id)
    {
        line_divs[id].remove();
    }

    function newline()
    {
        // increment the itterator
        line_div_itt = (line_div_itt + 1) % linebuffer_size;

        // remove the last div if there are linebuffer_size divs
        if (line_divs[line_div_itt] !== undefined)
        {
            delline(line_div_itt);
        }

        // add the new div
        var line_div = $('<div id="line_' + line_div_itt + '" style="min-height:' + line_height + 'px; white-space:pre-wrap; word-wrap:break-word; clear:left;"></div>');
        line_divs[line_div_itt] = line_div;
        div.append(line_div);
    }

    function write(chr)
    {
        var line = line_divs[line_div_itt];
        var line_text = line.text();
        //console.log(String.fromCharCode(chr) + " cursor: " + cursor);
        
        switch (chr)
        {
            case 0x0A: // line feed
                newline();
                for (var i = 0; i < cursor; ++i)
                {
                    line.append(" ");
                }
                break;
            case 0x0D: // carriage return
                cursor = 0;
                break;
            case 0x08: // backspace
                if (cursor !== 0)
                {
                    --cursor;
                }
                break;
            default:
                line.text(line_text.substr(0, cursor) + String.fromCharCode(chr) + line_text.substr(cursor + 1));
                ++cursor;
                break;
        }
        div.scrollTop(div[0].scrollHeight); // keep the scrollbar at the bottom
    }

    function clear()
    {
        div.text("");
        line_div_itt = 0;
        line_divs = [];
        newline();
    }

    return {
        write: write,
        clear: clear,
        resize: resize
    };
}
