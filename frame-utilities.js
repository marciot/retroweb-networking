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
            this.frame[this.index++] = val;
        }

        set word(val) {
            this.frame[this.index++] = (val & 0xFF00) >> 8;
            this.frame[this.index++] = (val & 0x00FF);
        }

        set long(val) {
            this.frame[this.index++] = (val & 0xFF000000) >> 24;
            this.frame[this.index++] = (val & 0x00FF0000) >> 16;
            this.frame[this.index++] = (val & 0x0000FF00) >> 8;
            this.frame[this.index++] = (val & 0x000000FF);
        }

        skip(bytes) {
            this.index += bytes;
        }

        seek(pos) {
            this.index = pos;
        }
    }

    namespace.FrameReader = class {
        constructor(frame) {
            this.frame = frame;
            this.index = 0;
        }

        get byte() {
            return this.frame[this.index++];
        }

        get word() {
            return this.frame[this.index++] << 8 |
                   this.frame[this.index++];
        }

        get long() {
            return this.frame[this.index++] << 24 |
                   this.frame[this.index++] << 16 |
                   this.frame[this.index++] << 8  | 
                   this.frame[this.index++];
        }

        skip(bytes) {
            this.index += bytes;
        }

        seek(pos) {
            this.index = pos;
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
            str += (c > 31 && c < 128) ? String.fromCharCode(c) : '.';
        }
        return "" + (end - start) + " bytes: " + hex + " " + str;
    }
})(window.RetroWeb = window.RetroWeb || {});