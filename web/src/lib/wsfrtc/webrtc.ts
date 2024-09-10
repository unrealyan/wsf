import WSclient from "../../lib/wsfws/webSocket";
import { formatBytes } from "../fileUtil";
import LargeFileReceiver from "../largeFileReceiver";

export interface WSFWebRTC {
    webrtcPeer: RTCPeerConnection
    peerId: string
    sharerId: string
    file:File | null
    fileReceiver: LargeFileReceiver
    sendSize: number
    // peerConnection(): RTCPeerConnection
    onIceCandidate(candidate: RTCIceCandidate): void
    sendOffer(): Promise<void>
    acceptOffer(offer: RTCSessionDescription): void
    sendAnswer(): void
    acceptAnswer(answer: RTCSessionDescription): void
    sendCandidate(candidate: RTCIceCandidate): void
    acceptCandidate(candidate: RTCIceCandidate): void
    setFile(file:File|null): void
    sendFile(): void
    bindEvents(): void
    setReceiverFile(filename:string):void

}

const configuration: RTCConfiguration = {
    iceServers: [
        {
            urls: [
                "stun:stun.l.google.com:19302",
                'stun:stun.nextcloud.com:3478',
                'stun:fwa.lifesizecloud.com:3478',
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
type WSFWebRTCType = { role:string,peerId: string, sharerId: string, selfId: string }

class WSFWebRTCImpl implements WSFWebRTC {
    webrtcPeer!: RTCPeerConnection
    peerId!: string;
    selfId!: string;
    sharerId!: string;
    role:string;
    sendSize: number = 0
    private receivedSize: number = 0
    private startTime: number = 0
    private lastUpdateTime: number = 0
    private lastReceivedSize: number = 0
    private isTransferring: boolean = false;
    private isReceiving: boolean = false;
    fileReceiver!: LargeFileReceiver;
    channel!:RTCDataChannel
    private messageHandler: ((e: MessageEvent) => void) | null = null;
    private fileWriter: FileSystemWritableFileStream | null = null
    file!: File | null;
    private _onmessage: (event: any) => void;

    constructor({ role,peerId, sharerId, selfId }: WSFWebRTCType) {

        this.role =role
        this.peerId = peerId
        this.selfId = selfId
        this.sharerId = sharerId
        this.webrtcPeer = new RTCPeerConnection(configuration)
        this.fileReceiver = new LargeFileReceiver("test")
        this._onmessage = (event: any) => { }
        if (role === "sender") {
            this.channel?.addEventListener("open", this.onDataChannelOpen)
        } else if (role === "receiver") {
            this.webrtcPeer.addEventListener("datachannel", (e:any)=>this.onRecieveChannelOpen(e))
        }

        this.webrtcPeer.addEventListener("datachannel", (e) => {
            console.log(e)
        })
        

        // Add onicecandidate event listener here
        this.webrtcPeer.onicecandidate = (event) => {
            console.log("onicecandidate event triggered", event);
            if (event.candidate) {
                console.log("ICE candidate:", event.candidate);
                this.onIceCandidate(event.candidate);
            } else {
                console.log("ICE candidate gathering completed");
            }
        };
    
        this.webrtcPeer.onicegatheringstatechange = (event) => {
            console.log("ICE gathering state changed:", this.webrtcPeer.iceGatheringState);
        };
    
        this.webrtcPeer.onconnectionstatechange = (event) => {
            console.log("Connection state changed:", this.webrtcPeer.connectionState);
        };
        this.webrtcPeer.addEventListener(
            "connectionstatechange",
            (event) => {
              switch (this.webrtcPeer.connectionState) {
                case "new":
                case "connecting":
                  console.log("Connecting…");
                  break;
                case "connected":
                    console.log("Online");
                  break;
                case "disconnected":
                    console.log("Disconnecting…");
                  break;
                case "closed":
                    console.log("Offline");
                  break;
                case "failed":
                    console.log("Error");
                  break;
                default:
                    console.log("Unknown");
                  break;
              }
            },
            false,
          );
        this.acceptOffer = this.acceptOffer.bind(this)
        this.acceptAnswer = this.acceptAnswer.bind(this)
        this.sendOffer = this.sendOffer.bind(this)
        this.sendAnswer = this.sendAnswer.bind(this)
        this.sendCandidate = this.sendCandidate.bind(this)
        this.sendFile = this.sendFile.bind(this)
        this.acceptCandidate = this.acceptCandidate.bind(this)
        this.bindEvents = this.bindEvents.bind(this)
        this.onDataChannelOpen = this.onDataChannelOpen.bind(this)
        this.onRecieveChannelOpen = this.onRecieveChannelOpen.bind(this)
        this.setFile = this.setFile.bind(this)
        this.acceptOfferAndSendAnswer = this.acceptOfferAndSendAnswer.bind(this)
        
    }

    bindEvents(): void {

        this.webrtcPeer.oniceconnectionstatechange = event => {
            console.log("ICE connection state changed:", event);
        }

        // WSclient.on("SEND_OFFER", this.sendOffer)
        WSclient.on("ACCEPT_OFFER_AND_SEND_ANSWER", this.acceptOfferAndSendAnswer)
        WSclient.on("ACCEPT_ANSWER", this.acceptAnswer)
        // WSclient.on("ACCEPT_ANSWER_AND_SEND_CANDIDATE", this.sendCandidate)
        WSclient.on("ACCEPT_CANDIDATE_AND_EXCHANGE", this.acceptCandidate)
    }

    setReceiverFile(filename: string): void {
        this.fileReceiver = new LargeFileReceiver(filename)
    }

    setFile(file: File): void {
        if (file){
            this.file = file;
        }
    }

    onIceCandidate(candidate: RTCIceCandidate): void {

        this.sendCandidate(candidate)
    }
    async acceptOfferAndSendAnswer(offer: RTCSessionDescription): Promise<void> {
        // await this.fileReceiver.start()
        await this.acceptOffer(offer).then(this.sendAnswer)
    }
    async sendOffer(): Promise<void> {
      
        this.channel = this.webrtcPeer.createDataChannel(JSON.stringify({
            name:this.file?.name,
            size:this.file?.size
        }),{
            ordered:true
        })
        this.channel.addEventListener("open", this.onDataChannelOpen, { once: true });
        this.channel.addEventListener("message", (e)=>{
            console.log(e)
        })
        this.channel.addEventListener("close", () => {
            this.isTransferring = false;
            console.log('Data channel closed');
        });
        this.channel.binaryType = "arraybuffer";

        let offer = await this.webrtcPeer.createOffer()
        let data = JSON.stringify({
            type: "offer",
            shareId: this.sharerId,
            target: this.peerId,
            userId: this.selfId,
            sdp: offer,
            filename:this.file?.name,
        })

        await this.webrtcPeer.setLocalDescription(offer)
        WSclient.sendOffer(data)
        return Promise.resolve()
    }
    async acceptOffer(offer: RTCSessionDescription): Promise<void> {

        return await this.webrtcPeer.setRemoteDescription(offer)
    }
    async sendAnswer(): Promise<void> {

        let answer = await this.webrtcPeer.createAnswer()

        await this.webrtcPeer.setLocalDescription(answer)
        let data = JSON.stringify({
            type: "answer",
            shareId: this.sharerId,
            target: this.peerId,
            userId: this.selfId,
            sdp: answer
        })
        WSclient.sendAnswer(data)
    }
    async acceptAnswer(answer: RTCSessionDescription): Promise<void> {
        await this.webrtcPeer.setRemoteDescription(answer)

        // let dataChannel.binaryType = "arraybuffer";;
        // this.sendAnswer()
    }
    async sendCandidate(candidate:RTCIceCandidate): Promise<void> {
        let data = JSON.stringify({
            type: "new-ice-candidate",
            shareId: this.sharerId,
            target: this.peerId,
            userId: this.selfId,
            candidate
        })
        WSclient.sendCandidate(data)
    }
    async acceptCandidate(candidate: RTCIceCandidate): Promise<void> {
        await this.webrtcPeer.addIceCandidate(candidate)
    }

    async onDataChannelOpen () {
        // let file = new File(["hello"], "hello.txt", { type: "text/plain" });
        let file = this.file ||  new File(["hello"], "hello2.txt", { type: "text/plain" }); 
        if (this.isTransferring) {
            console.warn('Transfer already in progress');
            return;
        }
        this.isTransferring = true;

        // 通知传输开始
        // this.dispatch({
        //     type: "transferStart",
        //     data: null
        // });
        
        let dataChannel = this.channel
        const chunkSize = 64 * 1024; // 64KB chunks
        let offset = 0;
        this.sendSize = 0;
        let startTime = Date.now();
        let lastUpdateTime = startTime;
        let lastReceivedSize = 0;

        dataChannel.bufferedAmountLowThreshold = 1024 * 1024; // 1MB

        const sendNextChunk = () => {
            if (offset >= file.size) {
                dataChannel.send('done');
                // this message for sender
                this.dispatch({
                    type: "fileReceived",
                    data: { 
                        progress:100,
                        receiverSize: this.sendSize,
                        fileSize: file.size,
                        user:"sender",
                        peerId:this.peerId
                    }
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
            console.log('sendChunk',offset,chunk.byteLength)
            dataChannel.send(chunk);
            offset += chunk.byteLength;
            this.sendSize  += chunk.byteLength;

            const progress = Math.ceil(this.sendSize  / (file.size / 100));
            const currentTime = Date.now();
            const elapsedTime = (currentTime - lastUpdateTime) / 1000; // 转换为秒
            
            if (elapsedTime >= 1) { // 每秒更新一次速度
                const speed = (this.sendSize  - lastReceivedSize) / elapsedTime;
                this.dispatch({
                    type: "progress",
                    data: {
                        progress,
                        receiverSize: this.sendSize,
                        fileSize: file.size,
                        user:"sender",
                        peerId:this.peerId,
                        speed: formatBytes(speed)+"/s"
                    }
                });
                lastUpdateTime = currentTime;
                lastReceivedSize = this.sendSize ;
            } else {
                const speed = (this.sendSize  - lastReceivedSize) / elapsedTime;
                this.dispatch({
                    type: "progress",
                    data: {
                        progress,
                        receiverSize: this.sendSize,
                        fileSize: file.size,
                        user:"sender",
                        peerId:this.peerId,
                        speed: formatBytes(speed)+"/s"
                    }
                });
            }

            if (offset <= file.size) {
                sendNextChunk();
            }
        };

        this.channel.send('start');
        sendNextChunk();
      
        
    };

    async onRecieveChannelOpen(e:RTCDataChannelEvent): Promise<void> {
        console.log(e)
        let recieveChannel = e.channel;

            recieveChannel.addEventListener("error", (err) => {
                console.log("Error:", err);
            });

            let fileInfo: { name: string, size: number };

            const handleMessage = async (e: MessageEvent) => {
                const { data } = e;
                const { fileReceiver } = this

                if (data === 'start') {
                    if (this.isReceiving) {
                        console.warn('Already receiving a file');
                        return;
                    }
                    this.isReceiving = true;
                    console.log("receiver start");
                    fileInfo = JSON.parse(recieveChannel.label);
                    this.receivedSize = 0;
                    this.startTime = Date.now();
                    this.lastUpdateTime = this.startTime;
                    this.lastReceivedSize = 0;
                    this.dispatch({
                        type: "transferStart",
                        data: {
                            progress:0,
                            receiverSize: this.sendSize,
                            filename: fileInfo.name,
                            fileSize: fileInfo.size,
                            user:"sender",
                            peerId:this.peerId,
                            speed: formatBytes(0)+"/s"
                        }
                    });
                } else if (data === 'done') {
                    if (this.messageHandler) {
                        recieveChannel.removeEventListener("message", this.messageHandler);
                        this.messageHandler = null;
                    }
                    recieveChannel.close();
                    fileReceiver.fileInfo = fileInfo;
                    this.fileWriter = null;
                    console.log('File received, size:', this.receivedSize);
                    await fileReceiver.finish();
                    // this.dispatch({
                    //     type: "fileReceived",
                    //     data: { name: fileInfo.name, size: this.receivedSize }
                    // });
                    this.dispatch({
                        type: "fileReceived",
                        data: {
                            progress:100,
                            receiverSize: this.sendSize,
                            filename: fileInfo.name,
                            fileSize: fileInfo.size,
                            user:"sender",
                            peerId:this.peerId,
                            speed: formatBytes(0)+"/s"
                        }
                    });
                    this.isReceiving = false;
                } else {
                    await fileReceiver.receiveChunk(data);
                    this.receivedSize += data.byteLength;
                    const progress = Math.ceil(this.receivedSize / (fileInfo.size / 100));

                    const currentTime = Date.now();
                    const elapsedTime = (currentTime - this.lastUpdateTime) / 1000; // 转换为秒
                    
                    if (elapsedTime >= 1) { // 每秒更新一次速度
                        const speed = (this.receivedSize - this.lastReceivedSize) / elapsedTime;
                        console.log(speed)
                        this.dispatch({
                            type: "progress",
                            data: {
                                progress,
                                receiverSize: this.sendSize,
                                filename: fileInfo.name,
                                fileSize: fileInfo.size,
                                user:"sender",
                                peerId:this.peerId,
                                speed: formatBytes(speed)+"/s"
                            }
                        });
                        this.lastUpdateTime = currentTime;
                        this.lastReceivedSize = this.receivedSize;
                    } else {
                        const speed = (this.receivedSize - this.lastReceivedSize) / elapsedTime;
                        this.dispatch({
                            type: "progress",
                            data: {
                                progress,
                                receiverSize: this.sendSize,
                                filename: fileInfo.name,
                                fileSize: fileInfo.size,
                                user:"sender",
                                peerId:this.peerId,
                                speed: formatBytes(speed)+"/s"
                            }
                        });
                    }
                }
            };

            // 移除旧的事件监听器（如果存在）
            if (this.messageHandler) {
                recieveChannel.removeEventListener("message", this.messageHandler);
            }

            // 添加新的事件监听器
            this.messageHandler = handleMessage;
            recieveChannel.addEventListener("message", this.messageHandler);

            // 当数据通道关闭时，清理事件监听器
            recieveChannel.addEventListener("close", () => {
                if (this.messageHandler) {
                    recieveChannel.removeEventListener("message", this.messageHandler);
                    this.messageHandler = null;
                }
                this.isReceiving = false;
            });
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
    sendFile(): void {
        // let file = new File(["hello"], "hello.txt", { type: "text/plain" });
        // this.file = file
        // this.channel.send(file)
    }
    // async peerConnection(): Promise<RTCPeerConnection> {
    //     return await new RTCPeerConnection(configuration)
    // }
}

// const WSFrtcClient =  new WSFWebRTCImpl()

// export default WSFrtcClient

export default WSFWebRTCImpl