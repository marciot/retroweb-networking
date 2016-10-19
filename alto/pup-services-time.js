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

/* It appears as if most Alto programs rely on network services that were
 * provided by other Altos on the Xerox PARC network. Since these servers
 * are not available, we attempt to emulate them here.
 *
 * Reference: "Miscellaneous Services (Edition 4)", by Ed Taft, February 8, 1980
 *
 *  http://bitsavers.trailing-edge.com/pdf/xerox/alto/ethernet/miscSvcsProto.pdf
 */

(function(namespace){
    namespace.PupTimeServices = class extends namespace.PupService {
        constructor() {
            super();
            this.StringTimeRequest       = parseInt('0200', 8);
            this.StringTimeReply         = parseInt('0201', 8);
            this.TenexTimeRequest        = parseInt('0202', 8);
            this.AltoTimeRequest         = parseInt('0204', 8);
            this.NewAltoTimeRequest      = parseInt('0206', 8);
            this.NewAltoTimeReply        = parseInt('0207', 8);
            
            this.StringTimeReplySize     = 18;
            this.NewAltoTimeReplySize    = 10;
        }
        
        provideService(requestObj) {
            var reply = null;
            switch(requestObj.pupType) {
                case this.StringTimeRequest:
                    reply = this.stringTimeReply(requestObj);
                    console.log("StringTimeRequest: sending reply");
                    break;
                case this.TenexTimeRequest:
                    console.log("TenexTimeRequest: Not implemented");
                    break;
                case this.AltoTimeRequest:
                    console.log("AltoTimeRequest: Not implemented");
                    break;
                case this.NewAltoTimeRequest:
                    reply = this.newAltoTimeReply(requestObj);
                    console.log("NewAltoTimeRequest: sending reply");
                    break;
            }
            return reply;
        }
        
        newAltoTimeReply(requestObj) {
            var frameWriter = this.newPupReply(
                requestObj,
                this.NewAltoTimeReply,
                this.NewAltoTimeReplySize
            );

            /* Words 0,1 of the payload are the number of seconds since January 1, 1901 GMT.
               Hard code this as 1 Jan 1976 GMT because I found the constant on StackOverflow :P
               http://stackoverflow.com/questions/8805832/number-of-seconds-from-1st-january-1900-to-start-of-unix-epoch
             */
             
            var eastOfGMT     = false;
            var hrsFromGMT    = 8;
            var minFromGMT    = 0;
            
            var presentTime   = 2398291200;
            var localTimeZone = (eastOfGMT ? 0x8000 : 0) |
                                (hrsFromGMT << 8) | minFromGMT;
            var startDST      = 366;
            var endDST        = 366;

            frameWriter.long = presentTime;
            frameWriter.word = localTimeZone;
            frameWriter.word = startDST;
            frameWriter.word = endDST
            return frameWriter;
        }
        
        stringTimeReply(requestObj) {
            var frameWriter = this.newPupReply(
                requestObj,
                this.StringTimeReply,
                this.StringTimeReplySize
            );

            frameWriter.str = "11-SEP-75 15:44:25";
            return frameWriter;
        }
    }
})(window.RetroWeb = window.RetroWeb || {});