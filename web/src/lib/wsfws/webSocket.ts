import eventManager, { EventManager } from '../eventManager';
// import WSFrtcClient from '../wsfrtc/webrtc';
export interface IWebSocket {
    ws: WebSocket | null;
    eventManager: EventManager;
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
    eventManager: EventManager;
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

        this.connect(wsUrl.toString());
        this.eventManager = eventManager;
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

    onmessage = () => {
        if (!this.ws) {
            throw new Error("WebSocket not initialized");
        }

        this.ws.onmessage = (e) => {
            let data = JSON.parse(e.data);

            // Common events for both sender and receiver
            switch (data.type) {
                case "user-id":


                    this.sendRole(data.shareId, data.userId)
                    this.emit("SET_SHARE_ID", data.shareId)

                    // new code
                    this.emit("SET_USER_ID", data.userId)
                    // this.sendJoin(data.userId)

                    break;
                case "stats":
                    this.emit("GET_STATISTICS",{totalFiles:data.totalFiles,totalSize:data.totalSize})
                    break;

                case "all-receivers":


                    this.emit("ALL_RECEIVERS", data.userIds || [])
                    // this.emit("INITIATE",data)
                    this.sendUserToReceiver(data.user,sessionStorage.getItem("shareId")||"",data.userIds||[])


                    break;
                case "notice":
                    this.emit("INIT_RECEIVER", data)
                    
                    break;
                case "request-status":
                     this.emit("ACCEPT", data)
                    break;
                case "accept-request":
                     this.emit("SEND_FILE",data)
                    break;
                case "offer":


                    // new code

                     this.emit("ACCEPT_OFFER_AND_SEND_ANSWER", data.sdp)
                    // this.emit("GET_TARGET_ID",data.userId)
                    // this.emit("GET_SHARE_ID",data.shareId)

                    break;
                case "answer":

                    // new code

                    // this.emit("ACCEPT_ANSWER_AND_SEND_CANDIDATE", data)
                    this.emit("ACCEPT_ANSWER", data.sdp)
                    // this.emit("GET_ANSWER",data.sdp)
                    break;
                case "new-ice-candidate":
                    const candidate = new RTCIceCandidate(data.candidate);
                    this.emit("ACCEPT_CANDIDATE_AND_EXCHANGE",candidate)

                    break;
            }
        }
    };
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

    sendShareFileInfo = ({senderId, sharerId,receiverId,filename,fileSize}:any)=>{

        this.ws?.send(JSON.stringify({
            type: "request-status",
            sharerId,
            target:receiverId,
            userId:senderId,
            filename,
            fileSize
        }));
    }

    sendUserToReceiver = (user: string, shareId: string, userIds: string[]) => {

        userIds.forEach((userId: string) => {
            let data = JSON.stringify({
                type: "notice",
                userId: user,
                shareId,
                target: userId
            })
            this.ws?.send(data)
        })
    }

    acceptFile = ({senderId, sharerId,receiverId,filename,fileSize}:any)=>{

        this.ws?.send(JSON.stringify({
            type: "accept-request",
            sharerId,
            target:receiverId,
            userId:senderId,
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