

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
        console.log(configuration)
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
                this.onIceCandidate(e.candidate);
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

    async setRemoteDescription(description: RTCSessionDescriptionInit) {
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

    constructor(configuration: RTCConfiguration = {}) {
        super(configuration);
        console.log("WebRTCSender constructor");
        this.createDataChannel();
    }

    private createDataChannel() {
        console.log("Creating data channel");
        this.dataChannel = this.peerConnection.createDataChannel("fileTransfer");
        this.setupDataChannelListeners();
    }

    protected setupDataChannelListeners() {
        if (!this.dataChannel) return;

        this.dataChannel.onopen = () => {
            console.log("Data channel opened");
            this.emit('dataChannelOpen');
        };

        this.dataChannel.onclose = () => {
            console.log("Data channel closed");
        };

        this.dataChannel.onerror = (error) => {
            console.error("Data channel error:", error);
        };
    }

    async createOffer(): Promise<RTCSessionDescriptionInit> {
        const offerOptions: RTCOfferOptions = {
            offerToReceiveAudio: false,
            offerToReceiveVideo: false
        };
        const offer = await this.peerConnection.createOffer(offerOptions);
        await this.peerConnection.setLocalDescription(offer);
        return offer;
    }

    async sendFile(file: File) {
        if (!this.isDataChannelReady()) {
            throw new Error("Data channel is not ready");
        }

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
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }

    getSignalingState(): RTCSignalingState {
        return this.peerConnection.signalingState;
    }

    async setLocalDescription(description: RTCSessionDescriptionInit): Promise<void> {
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
        this.setupFileTransferListeners();
    }

    private setupFileTransferListeners() {
        this.on('fileTransferStart', (metadata: { name: string, size: number }) => {
            this.fileBuffer = [];
            this.expectedFileSize = metadata.size;
            this.receivedSize = 0;
        });

        this.on('fileChunkReceived', (chunk: ArrayBuffer) => {
            this.fileBuffer.push(chunk);
            this.receivedSize += chunk.byteLength;

            if (this.receivedSize === this.expectedFileSize) {
                const file = new File(this.fileBuffer, 'receivedFile', { type: 'application/octet-stream' });
                this.emit('fileReceived', file);
                this.fileBuffer = [];
            }
        });
    }

    async acceptOffer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        return answer;
    }

    async createAnswer(): Promise<RTCSessionDescriptionInit> {
        const answer = await this.peerConnection.createAnswer();
        return answer;
    }

    async setLocalDescription(description: RTCSessionDescriptionInit): Promise<void> {
        await this.peerConnection.setLocalDescription(description);
    }

    async setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void> {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(description));
    }

    onFileReceived(callback: (file: File) => void) {
        this.on('fileReceived', callback);
    }

    protected handleIncomingData(data: any) {
        if (typeof data === 'string') {
            const metadata = JSON.parse(data);
            if (metadata.type === 'fileStart') {
                this.emit('fileTransferStart', { name: metadata.name, size: metadata.size });
            }
        } else if (data instanceof ArrayBuffer) {
            this.emit('fileChunkReceived', data);
        }
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
