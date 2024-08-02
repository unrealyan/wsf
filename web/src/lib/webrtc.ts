import { formatBytes } from "./fileUtil"
import LargeFileReceiver from "./largeFileReceiver"

export interface WebRTCInterface {
    peerConnection: RTCPeerConnection
    dataChannel: RTCDataChannel
    servers: { iceServers: { urls: string[] }[] }
    ws: WebSocket
    userId: string
    file: File
    fileReceiver: LargeFileReceiver
    createPeerConnection: (targetUserId: string, sender: boolean, store: any) => void
    createOffer: (targetUserId: string, store: any, setStore: any) => void
    createAnswer: (targetUserId: string, offer: RTCSessionDescriptionInit, setStore: any) => void
    addAnswer: (answer: RTCSessionDescriptionInit) => void
    addIceCandidates: (candidate?: RTCIceCandidateInit) => void
    downloadFile: (blob: Blob, fileName: string) => void
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
    servers: { iceServers: { urls: string[] }[] }
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

    constructor(ws: WebSocket) {
        this.servers = {
            iceServers: [
                {
                    urls: [
                        'stun:turn.cloudflare.com:3478',
                        'stun:stun.nextcloud.com:3478',
                        'stun:fwa.lifesizecloud.com:3478'
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

    createOffer = async (targetUserId: string, store: any, setStore: any) => {
        this.file = store.file
        this.userId = store.userId
        let { createPeerConnection, peerConnection, ws, userId } = this
        createPeerConnection(targetUserId, true, store);

        let offer = await peerConnection.createOffer();
        console.log("created-offer");
        await peerConnection.setLocalDescription(offer);
        ws.send(JSON.stringify({
            name: userId,
            target: targetUserId,
            type: "offer",
            sdp: offer
        }));
    }

    createAnswer = async (targetUserId: string, offer: RTCSessionDescriptionInit, setStore: any) => {
        let { createPeerConnection, peerConnection, ws, userId } = this
        createPeerConnection(targetUserId, false, setStore);
        await peerConnection.setRemoteDescription(offer).catch((e) => console.log(e));

        let answer = await peerConnection.createAnswer();
        console.log("created-answer");
        await peerConnection.setLocalDescription(answer);
        ws.send(JSON.stringify({
            name: userId,
            target: targetUserId,
            type: "answer",
            sdp: answer
        }));
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

    createPeerConnection = (targetUserId: string, sender = false, store: any) => {
        let { peerConnection, recieveChannel, ws, openDataChannel } = this
        this.peerConnection.addEventListener("icecandidate", (e) => {
            if (e.candidate) {
                ws.send(JSON.stringify({
                    type: "new-ice-candidate",
                    target: targetUserId,
                    candidate: e.candidate
                }));
            }
        });

        if (sender) {
            openDataChannel();
        }

        peerConnection.addEventListener("datachannel", (e) => {
            recieveChannel = e.channel;

            recieveChannel.addEventListener("error", (err) => {
                console.log("Error:", err);
            });

            let fileInfo: { name: string, size: number };
            recieveChannel.addEventListener("message", async (e) => {
                const { data } = e;
                const {fileReceiver} = this
                if (data === 'start') {
                    fileInfo = JSON.parse(recieveChannel.label);
                    this.receivedSize = 0;
                    this.startTime = Date.now();
                    this.lastUpdateTime = this.startTime;
                    this.lastReceivedSize = 0;
                } else if (data === 'done') {
                    recieveChannel.close();
                    fileReceiver.fileInfo = fileInfo;
                    await fileReceiver.finish();
                    this.fileWriter = null;
                    console.log('File received and saved, size:', this.receivedSize);
                    this.dispatch({
                        type: "fileReceived",
                        data: { name: fileInfo.name, size: this.receivedSize }
                    });
                } else {
                    await fileReceiver.receiveChunk(data);
                    this.receivedSize += data.byteLength;
                    const progress = Math.ceil(this.receivedSize / (fileInfo.size / 100));
                    const currentTime = Date.now();
                    const elapsedTime = (currentTime - this.lastUpdateTime) / 1000; // 转换为秒
                    
                    if (elapsedTime >= 1) { // 每秒更新一次速度
                        const speed = (this.receivedSize - this.lastReceivedSize) / elapsedTime;
                        this.dispatch({
                            type: "progress",
                            user:"receiver",
                            data: progress,
                            speed: formatBytes(speed)+"/s"
                        });
                        this.lastUpdateTime = currentTime;
                        this.lastReceivedSize = this.receivedSize;
                    } else {
                        const speed = (this.receivedSize - this.lastReceivedSize) / elapsedTime;
                        this.dispatch({
                            type: "progress",
                            user:"receiver",
                            data: progress,
                            speed: formatBytes(speed)+"/s"
                        });
                    }
                }
            });
        });
    };

    openDataChannel = () => {
        let { peerConnection, dataChannel, file } = this
        let options = {
            ordered: true
        };

        dataChannel = peerConnection.createDataChannel(JSON.stringify({ name: file.name, size: file.size }), options);
        dataChannel.binaryType = "arraybuffer";

        dataChannel.addEventListener("open", () => {
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
        });
    }

    downloadFile = (blob: Blob, fileName: string) => {
        const a = document.createElement('a');
        const url = window.URL.createObjectURL(blob);
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
    };

    async createWritableStream(fileName: string) {
        try {
            const handle = await (window as any).showSaveFilePicker({
                suggestedName: fileName,
            });
            return await handle.createWritable();
        } catch (err) {
            console.error('Error creating writable stream:', err);
            throw err;
        }
    }
}