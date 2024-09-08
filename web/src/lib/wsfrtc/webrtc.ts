import WSclient from "../../lib/wsfws/webSocket";
import LargeFileReceiver from "../largeFileReceiver";

export interface WSFWebRTC {
    webrtcPeer: RTCPeerConnection
    peerId: string
    sharerId: string
    file:File | null
    // peerConnection(): RTCPeerConnection
    onIceCandidate(candidate: RTCIceCandidate): void
    sendOffer(): Promise<void>
    acceptOffer(offer: RTCSessionDescription): void
    sendAnswer(): void
    acceptAnswer(answer: RTCSessionDescription): void
    sendCandidate(candidate: RTCIceCandidate): void
    acceptCandidate(candidate: RTCIceCandidate): void
    setFile(file:File): void
    sendFile(): void
    bindEvents(): void

}

const configuration: RTCConfiguration = {
    iceServers: [
        {
            urls: [
                "stun:stun.l.google.com:19302"
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

    constructor({ role,peerId, sharerId, selfId }: WSFWebRTCType) {
        console.log("connectWebRTC", peerId, sharerId)
        console.log(peerId, sharerId)
        this.role =role
        this.peerId = peerId
        this.selfId = selfId
        this.sharerId = sharerId
        this.webrtcPeer = new RTCPeerConnection(configuration)
        this.fileReceiver = new LargeFileReceiver("test")
        
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
        console.log("bindEvents")
        this.webrtcPeer.oniceconnectionstatechange = event => {
            console.log("ICE connection state changed:", event);
        }

        // WSclient.on("SEND_OFFER", this.sendOffer)
        WSclient.on("ACCEPT_OFFER_AND_SEND_ANSWER", this.acceptOfferAndSendAnswer)
        WSclient.on("ACCEPT_ANSWER", this.acceptAnswer)
        // WSclient.on("ACCEPT_ANSWER_AND_SEND_CANDIDATE", this.sendCandidate)
        WSclient.on("ACCEPT_CANDIDATE_AND_EXCHANGE", this.acceptCandidate)
    }

    setFile(file: File): void {
        this.file = file;
    }

    onIceCandidate(candidate: RTCIceCandidate): void {
        console.log("onIceCandidate", candidate)
        this.sendCandidate(candidate)
    }
    async acceptOfferAndSendAnswer(offer: RTCSessionDescription): Promise<void> {
        await this.fileReceiver.start()
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
        let file = this.file ||  new File(["hello"], "hello.txt", { type: "text/plain" }); 
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
        let sentSize = 0;
        let startTime = Date.now();
        let lastUpdateTime = startTime;
        let lastReceivedSize = 0;

        dataChannel.bufferedAmountLowThreshold = 1024 * 1024; // 1MB

        const sendNextChunk = () => {
            if (offset >= file.size) {
                dataChannel.send('done');
                // this message for sender
                // this.dispatch({
                //     type: "fileReceived",
                //     data: { name: file.name, size: file.name }
                // });
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
            const elapsedTime = (currentTime - lastUpdateTime) / 1000; // 转换为秒
            
            if (elapsedTime >= 1) { // 每秒更新一次速度
                const speed = (sentSize - lastReceivedSize) / elapsedTime;
                // this.dispatch({
                //     type: "progress",
                //     data: progress,
                //     user:"sender",
                //     speed: formatBytes(speed)+"/s"
                // });
                lastUpdateTime = currentTime;
                lastReceivedSize = sentSize;
            } else {
                const speed = (sentSize - lastReceivedSize) / elapsedTime;
                // this.dispatch({
                //     type: "progress",
                //     data: progress,
                //     user:"sender",
                //     speed: formatBytes(speed)+"/s"
                // });
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
                    this.dispatch({
                        type: "fileReceived",
                        data: { name: fileInfo.name, size: this.receivedSize }
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
                        // this.dispatch({
                        //     type: "progress",
                        //     user:"receiver",
                        //     data: progress,
                        //     speed: formatBytes(speed)+"/s"
                        // });
                        this.lastUpdateTime = currentTime;
                        this.lastReceivedSize = this.receivedSize;
                    } else {
                        const speed = (this.receivedSize - this.lastReceivedSize) / elapsedTime;
                        // this.dispatch({
                        //     type: "progress",
                        //     user:"receiver",
                        //     data: progress,
                        //     speed: formatBytes(speed)+"/s"
                        // });
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
    dispatch(arg0: { type: string; data: { name: string; size: number; }; }) {
        throw new Error("Method not implemented.");
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