import { resolve } from "path"
import { formatBytes } from "./fileUtil"
import LargeFileReceiver from "./largeFileReceiver"
import { ActionType, StateType } from "./store"
import { rejects } from "assert"

export interface WebRTCInterface {
    peerConnection: RTCPeerConnection
    dataChannel: RTCDataChannel
    servers: { iceServers: { urls: string[] }[] }
    ws: WebSocket
    userId: string
    file: File | null
    fileReceiver: LargeFileReceiver
    // createPeerConnection: (targetUserId: string, sender: boolean, store: any) => void
    createOffer: () => Promise<any>
    createAnswer: () => Promise<any>
    // createAnswer: (targetUserId: string, offer: RTCSessionDescriptionInit, setStore: any) => void
    addAnswer: (answer: RTCSessionDescriptionInit) => void
    addIceCandidates: (candidate?: RTCIceCandidateInit) => void
    // downloadFile: (blob: Blob, fileName: string) => void
}

interface ProgressEvent {
    type: 'progress';
    data: number;
    speed?: number; // 传输速度 (bytes/second)
}

export default class WebRTC implements WebRTCInterface {
    peerConnection!: RTCPeerConnection
    recieveChannel!: RTCDataChannel
    dataChannel!: RTCDataChannel
    iceServers!: RTCIceServer[]
    servers: { iceServers:  any}
    ws: WebSocket;
    userId!: string
    file!: File
    fileReceiver: LargeFileReceiver
    
    private _onmessage: any
    private fileWriter: FileSystemWritableFileStream | null = null
    private receivedSize: number = 0
    private startTime: number = 0
    private lastUpdateTime: number = 0
    private lastReceivedSize: number = 0
    private isTransferring: boolean = false;
    private isReceiving: boolean = false;
    private messageHandler: ((e: MessageEvent) => void) | null = null;

    constructor(ws: WebSocket) {
        this.servers = {
            iceServers: [
                {
                    urls: [
                        "stun:stun.nextcloud.com:443",
                        "stun:meet-jit-si-turnrelay.jitsi.net:443",
                        "stun:global.stun.twilio.com",
                        "stun:sg1.stun.twilio.com",
                        "stun:us1.stun.twilio.com",
                        "stun:us2.stun.twilio.com",
                        "stun:stun.cloudflare.com",
                        "stun:stun.miwifi.com",
                        "stun:39.107.142.158",
                        "stun:hw-v2-web-player-tracker.biliapi.net",
                        "stun:stun.smartgslb.com:19302"
                    ]
                  }
            ]
        }
        this.peerConnection = new RTCPeerConnection(this.servers);
        this.peerConnection.oniceconnectionstatechange = e => console.log(this.peerConnection.iceConnectionState);
        this.peerConnection.onicecandidate = event => {
            if (event.candidate) {
                console.log("New ICE candidate: " + JSON.stringify(event.candidate));
            }
        };
        this.peerConnection.addEventListener('connectionstatechange', (event) => {
            this.dispatch('Connection state:' + this.peerConnection.connectionState)
            console.log('Connection state:', this.peerConnection.connectionState);
        });
        this.ws = ws;
        this._onmessage = (event: any) => { }
        this.fileReceiver = new LargeFileReceiver("test")
    }

    get onmessage() {
        return this._onmessage;
    }

    set onmessage(handler) {
        if (typeof handler === 'function' || handler === null) {
            this._onmessage = handler;
        } else {
            throw new Error('Message handler must be a function or null');
        }
    }

    dispatch = <T>(data: T) => {
        if (typeof this.onmessage === 'function') {
            const event = data;
            this.onmessage(event);
        } else {
            console.warn('No message handler set. Use object.onmessage to set a handler.');
        }
    }

    createOffer = async () =>{   
        try {
            await this.listenPeerConnection()
            let offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            return Promise.resolve(offer)
        } catch (error) {
            return  Promise.reject(error)
        }
    }

    createAnswer = async () =>{   
        try {
            await this.listenPeerConnection()
            let offer = await this.peerConnection.createOffer();
            await this.peerConnection.setRemoteDescription(offer);
            let answer = await this.peerConnection.createAnswer();
            console.log("created-answer");
            await this.peerConnection.setLocalDescription(answer);
            return Promise.resolve(answer)
        } catch (error) {
            return  Promise.reject(error)
        }
    }

    addAnswer = async (answer: RTCSessionDescriptionInit) => {
        let { peerConnection } = this
        if (!peerConnection.currentRemoteDescription) {
            await peerConnection.setRemoteDescription(answer);
            console.log("accepted-answer");
        }
    };

    addIceCandidates = (candidate?: RTCIceCandidateInit) => {
        let { peerConnection } = this
        peerConnection.addIceCandidate(candidate);
        console.log("counterpart's-ice-candidates-added");
    };


    listenPeerConnection = async (sender=false)=>{
        this.peerConnection.addEventListener("icecandidate", (e) => {
            if (e.candidate) {
                this.dispatch({
                    type:"icecandidate"
                })
            }
        });

        if (sender) {
            this.openDataChannel();
        }
    }

    openDataChannel = () => {
        let { peerConnection, dataChannel, file } = this
        let options = {
            ordered: true
        };

        dataChannel = peerConnection.createDataChannel(JSON.stringify({ name: file.name, size: file.size }), options);
        dataChannel.binaryType = "arraybuffer";

        const onDataChannelOpen = () => {
            if (this.isTransferring) {
                console.warn('Transfer already in progress');
                return;
            }
            this.isTransferring = true;

            // 通知传输开始
            this.dispatch({
                type: "transferStart",
                data: null
            });

            const chunkSize = 64 * 1024; // 64KB chunks
            let offset = 0;
            let sentSize = 0;
            this.startTime = Date.now();
            this.lastUpdateTime = this.startTime;
            this.lastReceivedSize = 0;

            dataChannel.bufferedAmountLowThreshold = 1024 * 1024; // 1MB

            const sendNextChunk = () => {
                if (offset >= file.size) {
                    dataChannel.send('done');
                    // this message for sender
                    this.dispatch({
                        type: "fileReceived",
                        data: { name: file.name, size: file.name }
                    });
                    return;
                }

                const slice = file.slice(offset, offset + chunkSize);
                const reader = new FileReader();
                reader.onload = (e) => {
                    const chunk = e.target?.result as ArrayBuffer;
                    if (dataChannel.bufferedAmount > dataChannel.bufferedAmountLowThreshold) {
                        dataChannel.onbufferedamountlow = () => {
                            dataChannel.onbufferedamountlow = null;
                            sendChunk(chunk);
                        };
                    } else {
                        sendChunk(chunk);
                    }
                };
                reader.readAsArrayBuffer(slice);
            };

            const sendChunk = (chunk: ArrayBuffer) => {
    
                dataChannel.send(chunk);
                offset += chunk.byteLength;
                sentSize += chunk.byteLength;

                const progress = Math.ceil(sentSize / (file.size / 100));
                const currentTime = Date.now();
                const elapsedTime = (currentTime - this.lastUpdateTime) / 1000; // 转换为秒
                
                if (elapsedTime >= 1) { // 每秒更新一次速度
                    const speed = (sentSize - this.lastReceivedSize) / elapsedTime;
                    this.dispatch({
                        type: "progress",
                        data: progress,
                        user:"sender",
                        speed: formatBytes(speed)+"/s"
                    });
                    this.lastUpdateTime = currentTime;
                    this.lastReceivedSize = sentSize;
                } else {
                    const speed = (sentSize - this.lastReceivedSize) / elapsedTime;
                    this.dispatch({
                        type: "progress",
                        data: progress,
                        user:"sender",
                        speed: formatBytes(speed)+"/s"
                    });
                }

                if (offset <= file.size) {
                    sendNextChunk();
                }
            };

            dataChannel.send('start');
            sendNextChunk();
        };

        dataChannel.addEventListener("open", onDataChannelOpen, { once: true });

        dataChannel.addEventListener("close", () => {
            this.isTransferring = false;
            console.log('Data channel closed');
        });
    }

   
}