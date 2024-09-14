import eventManager, { EventManager } from '../eventManager';

export interface IWebSocket {
    ws: WebSocket | null;
    role: string;
    connect: (url: string) => void;
    onopen: (event: Event) => void;
    onclose: (event: CloseEvent) => void;
    onmessage: () => void;
    onerror: (event: Event) => void;
    close: () => void;
    sendOffer: (data: string) => void;
    sendAnswer: (data: string) => void;
    sendCandidate: (data: string) => void;
    sendProgress: (data: string) => void;
    sendFile: (data: string) => void;
    sendDone: (data: string) => void;
    sendError: (data: string) => void;
}

const urlSP = new URLSearchParams(window.location.search);
const WEBSOCKET_URL = process.env.WEBSOCKET_URL || "";
const uuidRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;




export class WSFWebSocket implements IWebSocket {
    ws!: WebSocket;
    role: string
    protected eventListeners: { [key: string]: Function } = {};

    constructor() {
        let shareId = sessionStorage.getItem("shareId") || "";
        const urlShareId = urlSP.get("s") || "";
        this.role = urlShareId ? "receiver" : "sender"
        if (urlShareId && uuidRegex.test(urlShareId)) {
            shareId = urlShareId;
            sessionStorage.setItem("shareId", shareId);
        } else if (shareId && uuidRegex.test(shareId)) {
            urlSP.set("s", shareId);
        } else {
            shareId = "";
        }


        const wsUrl = new URL(WEBSOCKET_URL);
        if (shareId) {
            wsUrl.searchParams.set("s", shareId);
        }
        wsUrl.searchParams.set("r", this.role);

        this.connect(wsUrl.toString());
    }
    connect(url: string) {
        this.ws = new WebSocket(url);
        this.ws.onopen = () => console.log("Connected to " + url);
        this.ws.onclose = () => {
            console.log("Disconnected from " + url)
            this.connect(url);
        };
    }
    onopen(event: Event) {
        console.log(`websocket open`, event.type)
    };
    onclose = (event: CloseEvent) => {

    };

    on(event: string, callback: Function) {
        // if (!this.eventListeners[event]) {
        //     this.eventListeners[event] = [];
        // }
        // this.eventListeners[event].push(callback);
        this.eventListeners[event] = callback
    }

    protected emit(event: string, ...args: any[]) {
        this.eventListeners[event]?.(...args);
    }

    onmessageForSender = () => {
        this.ws.onmessage = (e) => {
            let data = JSON.parse(e.data);

            // Common events for both sender and receiver
            switch (data.type) {
                case "error":
                    break;
                case "stats":
                    this.emit("GET_STATISTICS", { totalFiles: data.totalFiles, totalSize: data.totalSize })
                    break;
                case "user-id":
                    this.emit("SET_SHARE_ID", data.shareId)
                    this.emit("SET_USER_ID", data.userId)
                    break;
                case "request-file":
                    this.emit("CREATE_RECEIVER", data)
                    break;
                case "answer":
                    this.emit("ACCEPT_ANSWER", data.sdp)
                    break;
                case "new-ice-candidate":
                    const candidate = new RTCIceCandidate(data.candidate);
                    this.emit("ACCEPT_CANDIDATE_AND_EXCHANGE", candidate)
                    break;
                case "receiver-offline":
                    this.emit("RECEIVER_OFFLINE",data.receiver)
                    break;
            }
        }
    }

    onmessageForReceiver = () => {

        this.ws.onmessage = (e) => {
            let data = JSON.parse(e.data);
            switch (data.type) {
                case "error":
                    this.emit("SET_OFFLINE", data)
                    break;
                case "stats":
                    this.emit("GET_STATISTICS", { totalFiles: data.totalFiles, totalSize: data.totalSize })
                    break;
                case "user-id":
                    this.emit("SET_SHARE_ID", data.shareId)
                    this.emit("SET_USER_ID", data.userId)
                    this.emit("SET_TARGETID", data.target)
                    this.emit("INIT_RECEIVER", data)
                    // send file request
                    this.sendFileRequest({ target: data.target, userId: data.userId })
                    break;
                case "sender-online":
                    this.emit("SET_ONLINE", data)
                    break;
                case "offer":
                    this.emit("ACCEPT_OFFER_AND_SEND_ANSWER", data.sdp)
                    break;
    
            }
        }
    }

    onmessage = () => {
        if (!this.ws) {
            throw new Error("WebSocket not initialized");
        }

        if (this.role === "sender") {
            this.onmessageForSender()
        }

        if (this.role === "receiver") {
            this.onmessageForReceiver()
        }
    }

    onerror = (event: Event) => {

    };

    close = () => {

    };
    sendCandidate = (data: string) => {
        this.ws.send(data);
    };
    sendProgress = (data: string) => {

    };
    sendFile = (data: string) => {

    };
    sendDone = (data: string) => {

    };
    sendError = (data: string) => {

    };

    sendRole = (shareId: string, userId: string) => {
        let data = JSON.stringify({
            type: this.role,
            shareId,
            userId,

        })
        this.ws?.send(data)
    }

    sendJoin = (userId: string) => {
        this.ws?.send(JSON.stringify({
            type: "initiate",
            userId,
            shareId: sessionStorage.getItem("shareId")
        }));
    }

    sendShareFileInfo = ({ senderId, sharerId, receiverId, filename, fileSize }: any) => {

        this.ws?.send(JSON.stringify({
            type: "request-status",
            sharerId,
            target: receiverId,
            userId: senderId,
            filename,
            fileSize
        }));
    }

    sendUserToReceiver = (user: string, shareId: string, userIds: string[], filename: string) => {

        userIds.forEach((userId: string) => {
            let data = JSON.stringify({
                type: "notice",
                userId: user,
                shareId,
                target: userId,
                filename
            })
            this.ws?.send(data)
        })
    }

    sendFileRequest = ({ target, userId }: { target: string, userId: string }) => {
        console.log("send file request")
        this.ws?.send(JSON.stringify({
            type: "request-file",
            target,
            userId
        }))
    }

    acceptFile = ({ senderId, sharerId, receiverId, filename, fileSize }: any) => {

        this.ws?.send(JSON.stringify({
            type: "accept-request",
            sharerId,
            target: receiverId,
            userId: senderId,
            filename,
            fileSize
        }));
    }

    sendOffer = (data: string) => {
        this.ws?.send(data);
    }

    sendAnswer = (data: string) => {

        this.ws?.send(data);
    }



}

const WSClient = new WSFWebSocket();
WSClient.onmessage();
export default WSClient