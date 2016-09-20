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
	/* The following API should only be used for RetroWeb network traffic.
       If you want a PeerJS key for an unrelated project, please get your
       own free PeerJS Cloud API key from http://peerjs.com! */
	namespace.peerJSConfig = {key: 'u7htss9n8pz257b9'}
    
	namespace.PeerNetwork = class {
		constructor(peerOptions, networkDataCallback, stateChangedCallback) {
			this.peerOptions                = peerOptions;
			this.networkDataCallback        = networkDataCallback;
			this.stateChangedCallback       = stateChangedCallback;
			this.verbose                    = false;
			this.peerPrefix                 = "retroweb_";
			this.reset();
		}

		reset() {
			if(this.peer) {
				this.peer.destroy();
				this.peer = null;
			}
			this.joinInitiated              = false;
			this.isJoined                   = false;
			this.isMaster                   = false;
			this.roomId                     = null;
			this.masterId                   = null;
			this.myId                       = null;
			this.onceJoinedCallback         = null;
			this.connections                = {};
			this._setState('offline');
		}
		
		leaveRoom() {
			this.reset();
		}

		_getMasterPeerId(roomId) {
			var sanitized = roomId ? roomId.replace(/[^0-9a-zA-Z]/g,'').toLowerCase() : null;
			var id = this.peerPrefix + (sanitized ? sanitized : 'lobby');
			this._info("retroweb-network: Generated master id ", id);
			return id;
		}

		/* joinRoom attempts to start a new room as the master (leave blank for lobby).
		 * If that room is already started, then join as a member.
		 */
		joinRoom(roomId) {
			if(this.joinInitiated) {
				return;
			}
			this.joinInitiated = true;

			var me = this;

			function errorFunc(err) {
				if(err.type == 'unavailable-id') {
					/* The peer-id is unavailable, this means a master already exists */
					window.setTimeout(me._joinAsMember.bind(me, me.roomId), 10);
				} else {
					me._setState('error', err.type);
				}
			}

			this.roomId    = roomId;
			this.masterId  = this._getMasterPeerId(this.roomId);
			this.peer      = new Peer(this.masterId, this.peerOptions);
			this.peer.on('error', errorFunc);
			this.peer.on('open', function(id) {
				me.myId        = id;
				me.isJoined    = true;
				me.isMaster    = true;
				me._setState('joined');

				me._info("retroweb-network: I am the master of network. My id is ", id);
				me.peer.on('connection', function(conn) {me._processPeerConnection(conn);});
				if(me.onceJoinedCallback) {
					me.onceJoinedCallback();
				}
			});
		}

		_joinAsMember(roomId) {
			var me = this;

			function errorFunc(err) {
				me._setState('error', err.type);
			}

			this.roomId    = roomId;
			this.masterId  = this._getMasterPeerId(this.roomId);
			this.peer = new Peer(this.peerOptions);
			this.peer.on('error', errorFunc);
			this.peer.on('open', function(id) {
				me.myId = id;
				me._info("retroweb-network: I am member of the network. My id is ", id);
				me._info("retroweb-network: Trying to connect to master ", me.masterId);
				me.peer.on('connection', function(conn) {me._processPeerConnection(conn);});
				me._processPeerConnection(me.peer.connect(me.masterId));
			});
		}

		_processPeerConnection(newConnection) {
			var peer = newConnection.peer;
			if(this.connections[peer]) {
				/* If we are already connected, reject the new connection */
				this._info("retroweb-network: Rejecting connection from", peer, "; already connected");
			} else {
				this._info("retroweb-network: Accepting connection from", peer);
				this.connections[peer] = newConnection;
				var me = this;
				newConnection.on('data',  function(obj) {me._receivedNetworkObject(peer, obj);});
				newConnection.on('close', function()    {me._connectionClosed(peer);});
				this._setState('joined');
				this.isJoined = true;
				if(this.isMaster) {
					/* If I am the master, I need to inform this new network member of the other peers */
					window.setTimeout(this._sendPeerList.bind(this), 1000);
				}
			}
		}

		/* To reconnect as a master, we save a list of connected peers, destroy the current Peer object,
		 * rejoin (which creates a new Peer object) and re-establish the connections we had before.
		 */
		_reconnectAsMaster() {
			var peers = Object.getOwnPropertyNames(this.connections);
			this.leaveRoom();
			this.onceJoinedCallback = this._connectToPeers.bind(this, peers);
			this.joinRoom(this.roomId);
		}

		/* When a connection is closed, we remove it from the connections list. However, if the master
		 * closes a connection, then the first member in the peers list must take over as a master.
		 */
		_connectionClosed(peer) {
			this._info("retroweb-network: Connection closed:", peer);
			delete this.connections[peer];
			if(peer == this.masterId && this.myId == this.peerList[0]) {
				this._info("retroweb-network: Master closed connection. Promoting myself to master");
				this._reconnectAsMaster();
			}
		}

		/* Sends a list of peers as a broadcast. This is only ever done by the master
		 * of the room. Upon receipt of the peerList, a peer makes connections to all
		 * other peers.
		 */
		_sendPeerList() {
			var peers = Object.getOwnPropertyNames(this.connections);
			this._info("retroweb-network: Sending peers list:", peers);
			this.sendObjectToAll({peerList: peers});
		}

		_isConnectedTo(peer) {
			return this.connections[peer];
		}

		/* Make sure we have an open connection to all peers in the list. If a filterFunc
		 * is provided, then a connection is made only if that function returns true.
		*/
		_connectToPeers(peerList, filterFunc) {
			for(var i = 0; i < peerList.length; i++) {
				var peer = peerList[i];
				if(!this._isConnectedTo(peer) && peer != this.myId && (filterFunc ? filterFunc(peer) : true)) {
					this._info("retroweb-network: Connecting to new peer", peer);
					this._processPeerConnection(this.peer.connect(peer));
				}
			}
		}

		_receivedNetworkObject(peer, obj) {
			if(obj.hasOwnProperty("peerList")) {
				this._info("retroweb-network: Receiving updated peer list", obj.peerList);
				this.peerList = obj.peerList;
				/* All peers will receive the peerList updates. To avoid two peers from
				 * trying to make redundant connections to each other, we impose a rule
				 * where only a peer with the higher ID connects to the peer with the
				 * lower ID */
				function connectionSieve(peer) {
					return this.myId > peer;
				}
				this._connectToPeers(this.peerList, connectionSieve.bind(this));
			} else {
				this.receivedNetworkObject(peer, obj);
			}
		}

		receivedNetworkObject(peer, object) {
			this.networkDataCallback(peer, object);
		}

		sendObjectToAll(obj) {
			var peers = Object.getOwnPropertyNames(this.connections);
			for(var i = 0; i < peers.length; i++) {
				this.connections[peers[i]].send(obj);
			}
		}

		sendObjectToPeer(peer, obj) {
			if(this.connections[peer]) {
				this.connections[peer].send(obj);
			} else {
				this._error("retroweb-network: Trying to send to", peer, " to which we are not already connected. This should not happen");
			}
		}

		_setState(state, info) {
			if(state === "error") {
				this._error("retroweb-network: error: ", info);
			}
			if(this.stateChangedCallback) {
				this.stateChangedCallback(state);
			}
		}

		get isPrivateRoom() {
			return !!this.roomId;
		}

		_info() {
			if(this.verbose) {
				console.log.apply(console, arguments);
			}
		}

		_error() {
			console.log.apply(console, arguments);
		}
	};

	/* BinarySwitchedNetwork build upon PeerNetwork for implementing a network that is suitable
	 * for tunneling binary data link protocols.
	 *
	 *   1) A linkType can be used, in addition to roomIds, to keep incompatible traffic separate.
     *        LocalTalk - Legacy LocalTalk packets
     *        Alto      - Legacy Ethernet v1/PARC Universal Packet
	 *   2) A new sendFrame method works with source and destination addresses native to the
	 *      tunneled protocol and the map from addresses to connected peers is learned automatically.
	 *   3) sendFrame takes in a Uint8Array (possibly a view into a larger buffer) and trims it to
	 *      an appropriately sized ArrayBuffer for transmission.
	 */
	namespace.BinarySwitchedNetwork = class extends namespace.PeerNetwork {
		constructor(linkType, peerOptions, networkDataCallback, stateChangedCallback) {
			super(peerOptions, networkDataCallback, stateChangedCallback);
			this.broadcastDstId             = "*";
			switch(linkType.toUpperCase()) {
				case "LOCALTALK": this.peerPrefix = "retroweb_lt"; break;
				case "ALTO":      this.peerPrefix = "retroweb_al"; break;
				default:
					this.peerPrefix = "retroweb_" + linkType.toLowerCase() + "_";
					this._error("retroweb-network: Unknown link type", linkType);
					break;
			}
		}

		reset() {
			super.reset();
			this.peerMap = [];
		}

		set broadcastId(id) {
			this.broadcastDstId = id;
		}

		receivedNetworkObject(peer, obj) {
			this._info("Received frame of", obj.frame.byteLength, "bytes from", obj.src);
			this._learnNodeIdToPeerMapping(obj.src, peer);
			this.networkDataCallback(obj.dst, obj.src, new Uint8Array(obj.frame));
		}

		sendFrame(dstId, srcId, uint8Array) {
			/* It is necessary to clone the ArrayBuffer, as a uint8Array may only be subset
			 * of a much larger buffer which we don't want to serialize and transmit */
			var frame = new ArrayBuffer(uint8Array.length);
			var array = new Uint8Array(frame);
			array.set(uint8Array);
			/* Send the packet. We make a copy of the destination and source address so the
			 * as the receiving end may not know how to decode the frame */
			var peer = this._nodeIdToPeer(dstId);
			if(peer === this.broadcastDstId) {
				this.sendObjectToAll({dst: dstId, src: srcId, frame: frame});
			} else {
				this.sendObjectToPeer(peer, {dst: dstId, src: srcId, frame: frame});
			}
		}

		_learnNodeIdToPeerMapping(nodeId, peer) {
			if(peer != this.peerMap[nodeId]) {
				this._info("retroweb-network: Node ID", nodeId.toString(16), "is now associated with peer", peer);
				this.peerMap[nodeId] = peer;
			}
		}

		_nodeIdToPeer(nodeId) {
			if(nodeId === this.broadcastDstId) {
				return nodeId;
			}
			var peer = this.peerMap[nodeId];
			if(!peer) {
				this._info("retroweb-network: Attempting to send packet to node ID ", nodeId, "for which a peer is not yet known. Broadcasting.");
				peer = this.broadcastDstId;
			}
			return peer;
		}
	}
})(window.RetroWeb = window.RetroWeb || {});