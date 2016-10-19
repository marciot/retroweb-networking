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
    namespace.PupNameServices = class extends namespace.PupService {
        constructor() {
            super();
            this.NameLookupRequest       = parseInt('0220', 8);
            this.NameLookupReply         = parseInt('0221', 8);

            this.NameLookupReplySize     = 6;
    
            this.networkNames = [];
        }

        bindName(name, host) {
            this.networkNames.push({name: name, host: host});
        }

        lookupName(name) {
            for(var i = 0; i < this.networkNames.length; i++) {
                if(this.networkNames[i].name == name) {
                    return this.networkNames[i].host;
                }
            }
            return 0;
        }

        provideService(requestObj) {
            var reply = null;
            switch(requestObj.pupType) {
                case this.NameLookupRequest:
                    reply = this.nameLookupReply(requestObj);
                    console.log("NameLookupRequest: sending reply");
                    break;
            }
            return reply;
        }

        nameLookupReply(requestObj) {
            var frameWriter = this.newPupReply(
                requestObj,
                this.NameLookupReply,
                this.NameLookupReplySize
            );

            var lookupNet  = 0;
            var lookupHost = this.lookupName(requestObj.payloadStr);
            var lookupSock = 0;

            if(!lookupHost) {
                return;
            }

            frameWriter.byte = lookupNet;
            frameWriter.byte = lookupHost;
            frameWriter.long = lookupSock;
            return frameWriter;
        }
    }
})(window.RetroWeb = window.RetroWeb || {});