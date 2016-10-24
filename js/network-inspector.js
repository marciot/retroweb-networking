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
    const ETH_V1_BROADCAST_ADDR = 0x00;

    namespace.NetworkInspector = class {
        constructor(dumpHeadElement, dumpHtmlElement) {
            this.verbose         = true;
            this.dumpHtmlElement = dumpHtmlElement;
            this.addHTMLHeading(dumpHeadElement);
            
            this.decoder         = new namespace.PupDecoder();
            this.services        = [];
        }

        startInspector(serverAddress, stateChangedCallback) {
            this.network = new RetroWeb.RetrowebNetwork(
                "Alto",
                RetroWeb.peerJSConfig,
                this.monitorCallback.bind(this),
                stateChangedCallback
            );

            this.network.joinRoom();

            var me = this;
            this.network.addEventListener("allPeersConnected", function() {
                console.log("Sending request to monitor connections");
                me.network.enableMonitoring();
            });
        }

        getPeers() {
            return this.network.peers;
        }

        getNodeIdForPeer(peer) {
            return this.network.peerMap.peerToNodeId(peer);
        }

        monitorCallback(dst, src, frame) {
            var obj = this.decoder.decodeFrame(frame);
            this.decodeService(obj);
            this.printFrame(obj, frame);
        }

        decodeService(requestObj) {
            for(var i = 0; i < this.services.length; i++) {
                var srvc = this.services[i];
                srvc.provideService.call(srvc, requestObj);
            }
        }

        enableMonitoring(peer) {
            this.network.enableMonitoring(peer);
        }

        printFrame(obj, frame) {
            this._info(namespace.frameDump(
                    frame,
                    obj.payloadOffset,
                    obj.checksumOffset
            ));

            function addField(el, className, text) {
                var s = document.createElement("span");
                s.className = className;
                s.innerHTML = text;
                el.appendChild(s);
            }

            if(this.dumpHtmlElement) {
                var payload = this.frameToString(
                    frame,
                    obj.payloadOffset,
                    obj.checksumOffset
                );
                var p = document.createElement("div");
                addField(p, "etherSrc", this._nodeStr(obj.srcId) );
                addField(p, "etherDst", this._nodeStr(obj.dstId) );
                if(obj.pupType !== undefined) {
                    addField(p, "pupType",   obj.pupType.toString(8) );
                } else {
                    addField(p, "etherType", obj.etherType.toString(8) );
                }
                addField(p, "pupId",    obj.pupType ? obj.pupIdentifier          : "?");
                addField(p, "dstHost",  obj.pupType ? this._nodeStr(obj.dstHost) : "?");
                addField(p, "dstNet",   obj.pupType ? obj.dstNet                 : "?");
                addField(p, "dstSock",  obj.pupType ? obj.dstSock                : "?");
                addField(p, "srcHost",  obj.pupType ? this._nodeStr(obj.srcHost) : "?");
                addField(p, "srcNet",   obj.pupType ? obj.srcNet                 : "?");
                addField(p, "srcSock",  obj.pupType ? obj.srcSock                : "?");
                addField(p, "payloadHex", payload.hex );
                addField(p, "payloadStr", payload.str );
                this.dumpHtmlElement.appendChild(p);
            }
        }

        frameToString(frame, start, end) {
            var obj = {
                hex: "",
                str: ""
            };
            start = start || 0;
            end = Math.min(end || frame.length, frame.length);
            for(var i = start; i < end; i++) {
                var c = frame[i];
                var hexByte = c.toString(16);
                obj.hex += hexByte.length == 2 ? hexByte : '0' + hexByte;
                obj.str += (c > 31 && c < 128) ? String.fromCharCode(c) : '.';
            }
            return obj;
        }

        addHTMLHeading(p) {
            function addHeading(el, className, name) {
                var s = document.createElement("span");
                s.className = className;
                s.innerHTML = name || className;
                el.appendChild(s);
            }

            addHeading(p, "etherSrc", "src");
            addHeading(p, "etherDst", "dst");
            addHeading(p, "pupType",  "type");
            addHeading(p, "pupId",    "id");
            addHeading(p, "dstHost",  "dst");
            addHeading(p, "dstNet",   "net");
            addHeading(p, "dstSock",  "sock");
            addHeading(p, "srcHost",  "src");
            addHeading(p, "srcNet",   "net");
            addHeading(p, "srcSock",  "sock");
            addHeading(p, "payloadHex");
            addHeading(p, "payloadStr");
        }

        _info() {
            if(this.verbose) {
                console.log.apply(console, arguments);
            }
        }

        _nodeStr(nodeId) {
            return ((nodeId !== ETH_V1_BROADCAST_ADDR) ? nodeId.toString(8) : "all");
        }

        addService(service) {
            this.services.push(service);
        }
    }
})(window.RetroWeb = window.RetroWeb || {});