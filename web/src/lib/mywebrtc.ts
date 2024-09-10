import eventManager, { EventManager } from './eventManager';

class WebRTCBase {
    protected peerConnection: RTCPeerConnection;
    protected dataChannel: RTCDataChannel | null = null;
    protected eventListeners: { [key: string]: Function[] } = {};

    constructor(configuration: RTCConfiguration = {
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
    }) {

        this.peerConnection = new RTCPeerConnection(configuration);
        this.setupPeerConnectionListeners();
    }

    protected setupPeerConnectionListeners() {
        this.peerConnection.ondatachannel = (event) => {
            this.dataChannel = event.channel;
            this.setupDataChannelListeners();
        };

        this.peerConnection.addEventListener("icecandidate", (e) => {
            if (e.candidate) {
                console.log(e.candidate)
                // this.onIceCandidate(e.candidate);
            } else {
                console.log("ICE candidate gathering completed");
                this.onIceGatheringComplete();
            }
        });

        this.peerConnection.addEventListener("connectionstatechange", () => {
            console.log("Connection state:", this.peerConnection.connectionState);
            if (this.peerConnection.connectionState === "connected") {
                this.onConnected();
            }
        });
    }

    protected onIceCandidate(candidate: RTCIceCandidate) {
        console.log("New ICE candidate:", candidate);

        this.emit('iceCandidate', candidate);
    }

    protected onIceGatheringComplete() {
        // This method can be overridden in child classes if needed
        console.log("ICE gathering complete");
    }

    protected onConnected() {
        // This method should be overridden in child classes to handle the connected state
        console.log("WebRTC connection established");
    }

    protected setupDataChannelListeners() {
        if (!this.dataChannel) return;

        this.dataChannel.onopen = () => this.emit('channelOpen');
        this.dataChannel.onclose = () => this.emit('channelClose');
        this.dataChannel.onmessage = (event) => this.handleIncomingData(event.data);
    }

    protected handleIncomingData(data: any) {
        // 子类中实现具体逻辑
    }

    protected logSDP(sdp: string, type: string) {
        console.log(`${type} SDP:`);
        sdp.split('\r\n').forEach(line => console.log(line));
    }

    async setRemoteDescription(description: RTCSessionDescription) {
        try {
            if (!description || !description.type) {
                throw new Error('Invalid remote description: missing or invalid type');
            }
            if (!['offer', 'answer', 'pranswer', 'rollback'].includes(description.type)) {
                throw new Error(`Invalid remote description type: ${description.type}`);
            }
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(description));
        } catch (error) {
            console.error('Failed to set remote description:', error);
            console.log('Problematic description:', JSON.stringify(description));
            throw error;
        }
    }

    on(event: string, callback: Function) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }

    protected emit(event: string, ...args: any[]) {
        const listeners = this.eventListeners[event] || [];
        listeners.forEach(listener => listener(...args));
    }

    close() {
        if (this.dataChannel) {
            this.dataChannel.close();
        }
        this.peerConnection.close();
    }
    isDataChannelReady(): boolean {
        console.log("Checking data channel readiness");
        console.log("Data channel:", this.dataChannel);
        console.log("Data channel state:", this.dataChannel?.readyState);
        return !!this.dataChannel && this.dataChannel.readyState === 'open';
    }
}

export class WebRTCSender extends WebRTCBase {
    public dataChannel: RTCDataChannel | null = null;
    private role:string

    constructor(configuration: RTCConfiguration = {}) {
        super(configuration);

        this.createDataChannel();
        this.role = "SENDER"
        this.peerConnection.addEventListener("iceconnectionstatechange",e=>{
            console.log("ice: ",e)
        })
      
        // this.peerConnection.addEventListener("datachannel",this.handleDatachannel);
        this.peerConnection.addEventListener("signalingstatechange",e=>{
            switch (this.peerConnection.iceConnectionState) {
                case 'new':
                    console.log('新连接');
                    break;
                case 'checking':
                    console.log('正在检查连接');
                    break;
                case 'connected':
                    console.log('连接成功');
                    // 可以开始数据传输
                    break;
                case 'disconnected':
                    console.log('连接已断开');
                    // 处理连接断开逻辑
                    break;
                case 'failed':
                    console.log('连接失败');
                    // 处理连接失败逻辑
                    break;
                case 'closed':
                    console.log('连接已关闭');
                    // 清理资源
                    break;
                default:
                    break;
            }
        })



    }

    private createDataChannel() {
        console.log("Creating data channel");
        this.dataChannel = this.peerConnection.createDataChannel("fileTransfer",{
            ordered:true
        });
        this.dataChannel.binaryType = "arraybuffer";
        this.setupDataChannelListeners();
    }

    private handleDatachannel(e:RTCDataChannelEvent){
        let recieveChannel = e.channel;

        recieveChannel.addEventListener("error", (err) => {
            console.log("Error:", err);
        });

        recieveChannel.addEventListener("message", e=>{
            console.log(e)
        });
    }

    protected setupDataChannelListeners() {
        if (!this.dataChannel) return;

        this.dataChannel.onopen = () => {
            console.log("Data channel opened");
            // this.emit('dataChannelOpen');
            eventManager.emit("FILE_TRANSFER_START",{role:this.role})
        };

        this.dataChannel.onclose = () => {
            console.log("Data channel closed");
        };

        this.dataChannel.onerror = (error) => {
            console.error("Data channel error:", error);
        };
    }

    async createOffer(): Promise<RTCSessionDescriptionInit> {
        console.log("createOffer")
    
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);

        return offer;
    }

    async addAnswer (answer: RTCSessionDescriptionInit) {
        console.log("addAnswer")
        let { peerConnection } = this;
        // 检查当前状态是否为 'have-remote-offer' 并且 answer 包含有效的 sdp 和 type
        if (peerConnection.signalingState === 'have-local-offer' && answer && answer.sdp && answer.type) {
            await peerConnection.setRemoteDescription(answer);
            console.log("accepted-answer");
            this.peerConnection.addEventListener("icecandidate", (e) => {
                if (e.candidate) {
                    console.log(e.candidate)
                    eventManager.emit("SEND_NEW_ICE_CANDIDATE",e.candidate)
                    this.addIceCandidate(new RTCIceCandidate(e.candidate))
                }
            });
        } else {
            console.error("Cannot set remote description: Current state is", peerConnection.signalingState);
            console.error("Invalid answer:", answer);
        }
    };

    async sendFile(file: File) {
        // if (!this.isDataChannelReady()) {
        //     throw new Error("Data channel is not ready");
        // }

        const chunkSize = 16384; // 16 KB chunks
        const fileReader = new FileReader();
        let offset = 0;

        const readSlice = (o: number) => {
            const slice = file.slice(o, o + chunkSize);
            fileReader.readAsArrayBuffer(slice);
        };

        return new Promise<void>((resolve, reject) => {
            fileReader.onload = (e) => {
                if (e.target?.result && this.dataChannel) {
                    this.dataChannel.send(e.target.result as ArrayBuffer);
                    offset += (e.target.result as ArrayBuffer).byteLength;
                    if (offset < file.size) {
                        readSlice(offset);
                    } else {
                        resolve();
                    }
                }
            };

            fileReader.onerror = (error) => reject(error);

            readSlice(0);
        });
    }

    async addIceCandidate(candidate: RTCIceCandidate) {
        await this.peerConnection.addIceCandidate(candidate);
    }

    getSignalingState(): RTCSignalingState {
        return this.peerConnection.signalingState;
    }

    async setLocalDescription(description: RTCSessionDescription): Promise<void> {
        await this.peerConnection.setLocalDescription(description);
    }

    protected onIceCandidate(candidate: RTCIceCandidate) {
        // Implement the logic to send the ICE candidate to the other peer
        // For example, you might emit an event that can be handled by the application
        this.emit('newIceCandidate', candidate);
    }

    protected onConnected() {
        super.onConnected();
        this.emit('ready_for_file');
    }
}

export class WebRTCReceiver extends WebRTCBase {
    private fileBuffer: ArrayBuffer[] = [];
    private expectedFileSize: number = 0;
    private receivedSize: number = 0;

    constructor(configuration: RTCConfiguration = {}) {
        super(configuration);

       

        this.peerConnection.addEventListener("iceconnectionstatechange",e=>{
            switch (this.peerConnection.iceConnectionState) {
                case 'new':
                    console.log('新连接');
                    break;
                case 'checking':
                    console.log('正在检查连接');
                    break;
                case 'connected':
                    console.log('连接成功');
                    this.openDataChannel()
                    // this.setupPeerConnectionListeners();
                    // 可以开始数据传输
                    break;
                case 'disconnected':
                    console.log('连接已断开');
                    // 处理连接断开逻辑
                    break;
                case 'failed':
                    console.log('连接失败');
                    // 处理连接失败逻辑
                    break;
                case 'closed':
                    console.log('连接已关闭');
                    // 清理资源
                    break;
                default:
                    break;
            }
        })
    }

   

    async acceptOffer(offer: RTCSessionDescription): Promise<RTCSessionDescriptionInit> {
        console.log("acceptOffer")
        await this.peerConnection.setRemoteDescription(offer);
        // 检查状态
        if (this.peerConnection.signalingState === 'have-remote-offer') {
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            this.peerConnection.addEventListener("icecandidate", (e) => {
                if (e.candidate) {
                    console.log(e.candidate)
                    eventManager.emit("SEND_NEW_ICE_CANDIDATE",e.candidate)
                    this.addIceCandidate(new RTCIceCandidate(e.candidate))
                }
            });
            return answer;
        } else {
            throw new Error('PeerConnection is not in the correct state to set local description');
        }
    }

    async createAnswer(): Promise<RTCSessionDescriptionInit> {
        const answer = await this.peerConnection.createAnswer();
        return answer;
    }

    async addIceCandidate(candidate: RTCIceCandidate) {
        await this.peerConnection.addIceCandidate(candidate);
    }

    async setLocalDescription(description: RTCSessionDescription): Promise<void> {
        await this.peerConnection.setLocalDescription(description);
    }

    async setRemoteDescription(description: RTCSessionDescription): Promise<void> {
        await this.peerConnection.setRemoteDescription(description);
    }

    async openDataChannel() {
        console.log("receiver openDataChannel")
        if (!this.isDataChannelReady()) {
            this.dataChannel = await this.peerConnection.createDataChannel('fileTransfer');
            this.dataChannel.addEventListener('message', (event) => {
                console.log(event.data)
                this.handleIncomingData(event.data);
            });
        }
    }

    onFileReceived(callback: (file: File) => void) {
        this.on('fileReceived', callback);
    }

    protected handleIncomingData(data: any) {
        if (typeof data === 'string') {
            const metadata = JSON.parse(data);
            if (metadata.type === 'fileStart') {
                eventManager.emit('fileTransferStart', { name: metadata.name, size: metadata.size });
            }
        } else if (data instanceof ArrayBuffer) {
            eventManager.emit('fileChunkReceived', data);
        }
    }

    protected onIceCandidate(candidate: RTCIceCandidate) {
        // Implement the logic to send the ICE candidate to the other peer
        // For example, you might emit an event that can be handled by the application
        eventManager.emit('newIceCandidate', candidate);
    }

    protected onConnected() {
        super.onConnected();
        eventManager.emit('ready_for_file',"");
    }
}
