/*
 cli.js

 Copyright (C) 2018  Julian Ingram

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

function cli(cmd_cb) {
    var t = undefined;
    var max_history = 20;
    var history = [];
    var hindex = 0;
    var tmp = "";

    function buf() {
        var buf = "";
        var index = 0;

        function flush() {
            buf = "";
            index = 0;
        }

        function get_cmd() {
            if (history[0] !== buf) {
                if (history.unshift(buf) > max_history) {
                    history.pop();
                }
            }
            flush();
            t.write_string("\r\n");
            hindex = 0;
            tmp = "";
            return history[0];
        }

        function append(s) {
            buf = buf.substr(0, index) + s + buf.substr(index, buf.length);
            t.write(buf.charCodeAt(index));
            ++index;
        }

        function del() {
            if (index <= buf.length) {
                t.write_string(buf.substr(index + 1, buf.length) + " " +
                    "\b".repeat(buf.length - index));
                buf = buf.substr(0, index) + buf.substr(index + 1, buf.length);
            }
        }

        function bspc() {
            if (index >= 0) {
                t.write_string("\b" + buf.substr(index, buf.length) + " \b" +
                    "\b".repeat(buf.length - index));
                buf = buf.substr(0, index - 1) + buf.substr(index, buf.length);
                --index;
            }
        }

        function left() {
            if (index >= 0) {
                --index;
                t.write_string("\b");
            }
        }

        function right() {
            if (index <= buf.length) {
                t.write(buf.charCodeAt(index));
                ++index;
            }
        }

        function del_line() {
            t.write_string("\r" + " ".repeat(buf.length) + "\r");
        }

        function up() {
            if (hindex < history.length) {
                if (hindex === 0) {
                    tmp = buf;
                }
                del_line();
                buf = history[hindex];
                t.write_string(buf);
                index = buf.length;
                ++hindex;
            }
        }

        function down() {
            if (hindex > 0) {
                del_line();
                --hindex;
                buf = (hindex === 0) ? tmp : history[hindex - 1];
                t.write_string(buf);
                index = buf.length;
            }
        }

        return {
            get_cmd: get_cmd,
            flush: flush,
            append: append,
            del: del,
            bspc: bspc,
            left: left,
            right: right,
            up: up,
            down: down
        };
    }


    function keypress(value) {
        // arrows
        if (value === "up") {
            b.up();
            return;
        } else if (value === "down") {
            b.down();
            return;
        } else if (value === "left") {
            b.left();
            return;
        } else if (value === "right") {
            b.right();
            return;
        } else if (value === "del") {
            b.deli();
            return;
        } else {
            var s = String.fromCharCode(value);
            if (s === "\r") {
                var cmd = b.get_cmd();
                console.log("cmd: " + cmd);
                cmd_cb(cmd.split(" "));
            } else if (s === "\b") {
                b.bspc();
            } else {
                b.append(s);
            }
        }
    }

    function term(_term) {
        t = _term;
    }

    var b = buf();

    return {
        keypress: keypress,
        term: term
    }
}
