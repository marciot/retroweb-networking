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
    const PUP_ETHERTYPE           = parseInt('01000', 8);
    const ETHERNET_ADDR_BROADCAST = 0x00;

    const StringTimeRequest       = parseInt('0200', 8);
    const TenexTimeRequest        = parseInt('0202', 8);
    const AltoTimeRequest         = parseInt('0204', 8);
    const NewAltoTimeRequest      = parseInt('0206', 8);
    const NewAltoTimeReply        = parseInt('0207', 8);
    const NameLookupRequest       = parseInt('0220', 8);
    const NameLookupReply         = parseInt('0221', 8);

    const NewAltoTimeReplySize    = 10;
    const NameLookupReplySize     = 6;

    namespace.AltoNetworkServices = class {
        constructor() {
            this.decoder = new namespace.PupDecoder();
            this.networkNames = [];
        }

        startServices(serverAddress, serverNet, stateChangedCallback) {
            this.pupServerAddr = serverAddress;
            this.pupServerNet = serverNet;

            function gotNetworkPacket(dst, src, frame) {
                var reply = this.provideService(frame);
                if(reply) {
                    var dstAddress = reply[0];
                    var srcAddress = reply[1];
                    this.network.sendFrame(dstAddress, srcAddress, reply);
                }
            }

            this.network = new RetroWeb.BinarySwitchedNetwork(
                "Alto",
                RetroWeb.peerJSConfig,
                gotNetworkPacket.bind(this),
                stateChangedCallback
            );

            this.network.joinRoom();
            this.network.broadcastId = ETHERNET_ADDR_BROADCAST;
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

        provideService(frame) {
            var reply = null;
            var requestObj   = this.decoder.decodeFrame(frame);
            switch(requestObj.pupType) {
                case StringTimeRequest:
                    console.log("StringTimeRequest: Not implemented");
                    break;
                case TenexTimeRequest:
                    console.log("TenexTimeRequest: Not implemented");
                    break;
                case AltoTimeRequest:
                    console.log("AltoTimeRequest: Not implemented");
                    break;
                case NewAltoTimeRequest:
                    reply = this.newAltoTimeReply(requestObj);
                    console.log("NewAltoTimeRequest: sending reply");
                    break;
                case NameLookupRequest:
                    reply = this.nameLookupReply(requestObj);
                    console.log("NameLookupRequest: sending reply");
                    break;
            }
            if(reply) {
                this.decoder.decodeFrame(reply);
            }
            return reply;
        }

        makePupFrame(obj, payloadSize) {
            /* Reference: "Pup Specifications", by Ed Taft and Bob Metcalfe, June 30, 1978

            ftp://bitsavers.informatik.uni-stuttgart.de/pdf/xerox/alto/ethernet/pupSpec.pdf
             */
            const ethHeaderSize = 4;
            const pupHeaderSize = 20;
            const pupChecksumSize = 2;
            const pupLength = pupHeaderSize + payloadSize + pupChecksumSize;

            if((payloadSize % 2) != 0) {
                console.log("Error: Pup packets must be of even sizes");
            }

            var buffer = new ArrayBuffer(ethHeaderSize + pupLength);
            var frameWriter = new namespace.FrameWriter(new Uint8Array(buffer));

            // Ethernet v1 packet header
            frameWriter.byte = obj.dstId;
            frameWriter.byte = obj.srcId;
            frameWriter.word = PUP_ETHERTYPE;

            // Pup Header
            frameWriter.word = pupLength;
            frameWriter.byte = 0x00; // Transport Control
            frameWriter.byte = obj.pupType;
            frameWriter.long = obj.pupIdentifier;
            frameWriter.byte = obj.dstNet;
            frameWriter.byte = obj.dstHost;
            frameWriter.long = obj.dstSock;
            frameWriter.byte = obj.srcNet;
            frameWriter.byte = obj.srcHost;
            frameWriter.long = obj.srcSock;
            var payloadOffset = frameWriter.offset;

            frameWriter.skip(payloadSize);
            frameWriter.word = 0xFFFF; // No PUP Checksum

            frameWriter.seek(payloadOffset);
            return frameWriter;
        }

        makePupReply(requestObj, replyType, payloadSize) {
            return this.makePupFrame({
                pupType:       replyType,
                pupIdentifier: requestObj.pupIdentifier,
                dstId:         requestObj.srcId,
                dstNet:        requestObj.srcNet,
                dstHost:       requestObj.srcHost,
                dstSock:       requestObj.srcSock,
                srcId:         this.pupServerAddr,
                srcNet:        this.pupServerNet,
                srcHost:       this.pupServerAddr,
                srcSock:       requestObj.dstSock
            }, payloadSize);
        }

        newAltoTimeReply(requestObj) {
            var frameWriter = this.makePupReply(
                requestObj,
                NewAltoTimeReply,
                NewAltoTimeReplySize
            );

            /* Words 0,1 of the payload are the number of seconds since January 1, 1901 GMT.
               Hard code this as 1 Jan 1976 GMT because I found the constant on StackOverflow :P
               http://stackoverflow.com/questions/8805832/number-of-seconds-from-1st-january-1900-to-start-of-unix-epoch
             */
            var presentTime   = /*2398291200*/ 0;
            var localTimeZone = 0;
            var startDST      = 1;
            var endDST        = 31;

            frameWriter.long = presentTime;
            frameWriter.word = localTimeZone;
            frameWriter.word = startDST;
            frameWriter.word = endDST
            return frameWriter.frame;
        }

        nameLookupReply(requestObj) {
            var frameWriter = this.makePupReply(
                requestObj,
                NameLookupReply,
                NameLookupReplySize
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
            return frameWriter.frame;
        }
    }
})(window.RetroWeb = window.RetroWeb || {});