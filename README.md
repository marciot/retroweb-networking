![alt text][logo]

retroweb-networking
===================

This repository provides peer-to-peer networking capabilities for emulated computers
written in JavaScript. It provides a virtual data-link layer that allows tunneling of
packets over WebRTC data channels, allowing an emulated computer that is running on
one web browser to communicate with an emulated computer that is running on another
web browser.

This repository also contains source code for a debugging tool that allows inspection
of packets travelling over said virtual data-link layer. There are also higher-level
implementations of specific network protocols and services for an Xerox Alto emulated
computer.

# How does it work?

This library uses [PeerJS](http://peerjs.com) for establishing one-to-one
connections between pairs of participants. This library builds on top of that capability
to create a many-to-many mesh network between more than two participants. This mesh
network simulates a shared medium that can carry binary packets, supports data link
addressing and broadcast packets among emulated computers.

When paired with an appropriate emulator, this virtual data link can carry vintage
network protocols such as legacy Ethernet (for emulated Xerox Alto computers) or
LocalTalk (for emulated Macintosh computers) and enable multi-player gaming.

## Related Projects:

This code has been developed to support the following projects:
* https://github.com/marciot/retroweb-vintage-computer-museum
* https://github.com/marciot/mazewar-vr
* https://github.com/sethm/ContrAltoJS


[logo]: https://github.com/marciot/retroweb-networking/raw/master/docs/diagram.png "A overview of the library"
