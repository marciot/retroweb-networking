/*
RetroWeb Networking Components
Copyright (C) 2016 Marcio Teixeira

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 2
of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; if not, write to the Free Software
Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
*/

(function(namespace){
    namespace.FrameWriter = class {
        constructor(frame) {
            this.frame = frame;
            this.index = 0;
        }

        set byte(val) {
            this._checkRange();
            this.frame[this.index++] = val;
        }

        set word(val) {
            this._checkRange();
            this.frame[this.index++] = (val & 0xFF00) >> 8;
            this.frame[this.index++] = (val & 0x00FF);
        }

        set long(val) {
            this._checkRange();
            this.frame[this.index++] = (val & 0xFF000000) >> 24;
            this.frame[this.index++] = (val & 0x00FF0000) >> 16;
            this.frame[this.index++] = (val & 0x0000FF00) >> 8;
            this.frame[this.index++] = (val & 0x000000FF);
        }

        set char(c) {
            this.byte = c.charCodeAt(0);
        }

        set str(str) {
            for(var i = 0; i < str.length; i++) {
                this.byte = str.charCodeAt(i);
            }
        }

        set hex(str) {
            for(var i = 0; i < str.length; i += 2) {
                this.byte = parseInt(str.substr(i, 2), 16);
            }
        }

        skip(bytes) {
            this.index += bytes;
        }

        seek(pos) {
            this.index = pos;
        }

        get offset() {
            return this.index;
        }

        _checkRange() {
            if(this.index >= this.frame.length) {
                throw "Writing past end of frame";
            }
        }
    }

    namespace.FrameReader = class {
        constructor(frame) {
            this.frame = frame;
            this.index = 0;
        }

        get byte() {
            this._checkRange();
            return this.frame[this.index++];
        }

        get word() {
            this._checkRange();
            return this.frame[this.index++] << 8 |
                   this.frame[this.index++];
        }

        get long() {
            this._checkRange();
            return this.frame[this.index++] << 24 |
                   this.frame[this.index++] << 16 |
                   this.frame[this.index++] << 8  |
                   this.frame[this.index++];
        }

        // Return as a printable char
        get char() {
            var val = this.byte;
            if(val >= 32 && val <= 127) {
                // Only return printable chars
                return String.fromCharCode(val);
            } else {
                return ".";
            }
        }

        str(len) {
            var str = "";
            for(var i = 0; i < len; i++) {
                str += this.char;
            }
            return str;
        }

        skip(bytes) {
            this.index += bytes;
        }

        seek(pos) {
            this.index = pos;
        }

        get offset() {
            return this.index;
        }

        _checkRange() {
            if(this.index >= this.frame.length) {
                throw "Reading past end of frame";
            }
        }
    }

    namespace.frameDump = function(frame, start, end) {
        var hex = "";
        var str = "";
        start = start || 0;
        end = Math.min(end || frame.length, frame.length);
        for(var i = start; i < end; i++) {
            var c = frame[i];
            var hexByte = c.toString(16);
            hex += hexByte.length == 2 ? hexByte : '0' + hexByte;
            str += (c >= 32 && c <= 127) ? String.fromCharCode(c) : '.';
        }
        return "" + (end - start) + " bytes: " + hex + " " + str;
    }
})(window.RetroWeb = window.RetroWeb || {});