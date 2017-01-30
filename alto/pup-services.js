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

/* Reference: "ALTO: A Personal Computer System Hardware Manual", August 1976, pp 39
 *
 * http://bitsavers.informatik.uni-stuttgart.de/pdf/xerox/alto/Alto_Hardware_Manual_Aug76.pdf
 */

(function(namespace){
    const ETHERNET_ADDR_BROADCAST = 0x00;
    const PUP_ETHERTYPE           = parseInt('01000', 8);

    namespace.PupDecoder = class {
        decodePup(frameReader, obj) {
            /* Reference: "Pup: An Internetwork Architecture" by David R. Boggs, John
                F. Schoch, Edward A. Taft and Robert M. Metcalfe, July 1979, revised
                October 1979, pp 15

                http://129.69.211.95/pdf/xerox/alto/ethernet/pupArch.pdf
             */

            const pupHeaderSize = 20;
            const pupChecksumSize = 2;

            obj.pupLength        = frameReader.word;
            obj.transportControl = frameReader.byte;
            obj.pupType          = frameReader.byte;
            obj.pupIdentifier    = frameReader.long;
            obj.dstNet           = frameReader.byte;
            obj.dstHost          = frameReader.byte;
            obj.dstSock          = frameReader.long;
            obj.srcNet           = frameReader.byte;
            obj.srcHost          = frameReader.byte;
            obj.srcSock          = frameReader.long;

            obj.payloadOffset  = frameReader.offset;
            obj.payloadLength  = obj.pupLength - pupHeaderSize - pupChecksumSize;

            obj.payloadStr = "";
            for(var i = 0; i < obj.payloadLength; i++) {
                obj.payloadStr += frameReader.char;
            }

            obj.checksumOffset  = frameReader.offset;
            obj.pupChecksum     = frameReader.word;

            frameReader.seek(obj.payloadOffset);
        }

        decodeFrame(frame) {
            var frameReader = new namespace.FrameReader(frame);
            var obj = {};
            obj.dstId     = frameReader.byte;
            obj.srcId     = frameReader.byte;
            obj.etherType = frameReader.word;
            switch(obj.etherType) {
                case PUP_ETHERTYPE:
                    this.decodePup(frameReader, obj);
                    break;
                default:
                    console.log("Unrecognized Ethernet packet type", obj.etherType,
                        namespace.frameDump(frameReader.frame));
                    obj.payloadOffset   = 4;
                    obj.payloadLength   = frame.length - 4;
                    obj.checksumOffset  = frame.length;
                    break;
            }
            obj.reader = frameReader;
            return obj;
        }
    }

    namespace.PupServer = class {
        constructor() {
            this.decoder  = new namespace.PupDecoder();
            this.pupServices = [];
        }

        startServices(serverAddress, serverNet, stateChangedCallback) {
            if(typeof serverAddress === "string") {
                throw "Address is a string";
            }
            this.pupServerAddr = serverAddress;
            this.pupServerNet  = serverNet;

            function gotNetworkPacket(dst, src, frame) {
                var requestObj   = this.decoder.decodeFrame(frame);
                var reply = this.provideService(requestObj);
                if(reply) {
                    this.sendFrame(reply);
                }
            }

            var me = this;
            this.network = new RetroWeb.BinarySwitchedNetwork(
                "Alto",
                RetroWeb.peerJSConfig,
                gotNetworkPacket.bind(this),
                function(state, info) {
                    if(state === "joined") {
                        me.networkReady();
                    }
                    stateChangedCallback(state, info);
                }
            );

            this.network.joinRoom();
            this.network.broadcastId = ETHERNET_ADDR_BROADCAST;
        }

        stopServices(delayed) {
            const networkDisconnectDelay = 1000;
            if(delayed) {
                window.setTimeout(this.stopServices.bind(this), networkDisconnectDelay);
            } else {
                this.network.leaveRoom();
            }
        }

        networkReady() {
            for(var i = 0; i < this.pupServices.length; i++) {
                var srvc = this.pupServices[i];
                srvc.networkReady();
            }
        }

        provideService(requestObj) {
            var reply = null;
            for(var i = 0; i < this.pupServices.length; i++) {
                var srvc = this.pupServices[i];
                reply = srvc.provideService.call(srvc, requestObj);
                if(reply) {
                    reply = reply.frame;
                    break;
                }
            }
            if(reply) {
                this.decoder.decodeFrame(reply);
            }
            return reply;
        }

        addService(service) {
            this.pupServices.push(service);

            service.server = this;
        }

        sendFrame(frame) {
            if(this.network) {
                var dstAddress = frame[0];
                var srcAddress = frame[1];
                this.network.sendFrame(dstAddress, srcAddress, frame);
            }
        }
    }

    namespace.PupService = class {
        newPupFrame(obj, payloadSize) {
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

        newPupReply(requestObj, replyType, payloadSize) {
            return this.newPupFrame({
                pupType:       replyType,
                pupIdentifier: requestObj.pupIdentifier,
                dstId:         requestObj.srcId,
                dstNet:        requestObj.srcNet,
                dstHost:       requestObj.srcHost,
                dstSock:       requestObj.srcSock,
                srcId:         this.server.pupServerAddr,
                srcNet:        this.server.pupServerNet,
                srcHost:       this.server.pupServerAddr,
                srcSock:       requestObj.dstSock
            }, payloadSize);
        }

        provideService(requestObj) {
        }

        networkReady() {
        }

        sendFrame(frame) {
           this.server.sendFrame(frame);
        }

        multicastFrame(frame, addresses) {
            for(var i = 0; i < addresses.length; i++) {
                var dstHost = addresses[i];
                frame[0]  = dstHost;  // dstHost in ethHeader
                frame[13] = dstHost;  // dstHost in pupHeader
                this.server.sendFrame(frame);
            }
        }

        get myAddr() {
            return this.server.pupServerAddr;
        }
    }
})(window.RetroWeb = window.RetroWeb || {});