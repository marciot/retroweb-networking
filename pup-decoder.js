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
    const PUP_ETHERTYPE         = parseInt('01000', 8);
    const ETH_V1_BROADCAST_ADDR = 0x00;

    namespace.PupDecoder = class {
        constructor() {
            this.verbose = true;
        }

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

            const payloadOffset  = frameReader.offset;
            const payloadLength  = obj.pupLength - pupChecksumSize - pupChecksumSize;

            obj.payloadStr = "";
            for(var i = 0; i < payloadLength; i++) {
                var val = frameReader.byte;
                if(val >= 37 && val <= 127) {
                    obj.payloadStr += String.fromCharCode(val);
                }
            }

            const checksumOffset  = frameReader.offset;
            obj.pupChecksum       = frameReader.word;

            this._info(
                this._addrStr(obj),
                "PUPType:", obj.pupType,
                "Id:", obj.pupIdentifier,
                "dstNetHostSock:",
                    obj.dstNet.toString(16),
                    obj.dstHost.toString(16), 
                    obj.dstSock.toString(16), 
                "srcNetHostSock:",
                    obj.srcNet.toString(16),
                    obj.srcHost.toString(16), 
                    obj.srcSock.toString(16),
                "Payload: ", namespace.frameDump(
                    frameReader.frame,
                    payloadOffset,
                    checksumOffset
                )
            );
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
                    this._info("Unrecognized Ethernet packet type", obj.etherType,
                        namespace.frameDump(frameReader.frame));
                    break;
            }
            return obj;
        }
 
        _addrStr(obj) {
            return ((obj.srcId !== ETH_V1_BROADCAST_ADDR) ? obj.srcId.toString(16) : "all") + " -> " +
                   ((obj.dstId !== ETH_V1_BROADCAST_ADDR) ? obj.dstId.toString(16) : "all");
        }

        _info() {
            if(this.verbose) {
                console.log.apply(console, arguments);
            }
        }
    }
})(window.RetroWeb = window.RetroWeb || {});