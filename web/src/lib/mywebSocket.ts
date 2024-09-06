import eventManager, { EventManager } from './eventManager';

export interface IWebSocket {
    ws: WebSocket | null;
    eventManager: EventManager;
    role:string;
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

export class MyWebSocket implements IWebSocket {
    eventManager: EventManager;
    ws!: WebSocket;
    role:string

    constructor() {

        let shareId = sessionStorage.getItem("shareId") || "";
        const urlShareId = urlSP.get("s") || "";
        this.role = urlShareId? "receiver" : "sender"
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
    onmessage = () => {
        if (!this.ws) {
            throw new Error("WebSocket not initialized");
        }

        this.ws.onmessage = (e) => {
            let data = JSON.parse(e.data);

            // Common events for both sender and receiver
            switch (data.type) {
                case "user-id":

                    this.eventManager.emit("SET_USER_ID",data.userId)
                    this.eventManager.emit("SET_SHARE_ID",data.shareId)
                    this.sendRole(data.shareId,data.userId)
                    break;
                case "stats":
                    this.eventManager.emit("SET_STATS",{totalFiles:data.totalFiles,totalSize:data.totalSize})
                    break;
                case "all-receivers":
                    this.eventManager.emit("SET_RECEIVERS",data.userIds||[])
                    break;
                 case "offer":
                    this.eventManager.emit("SET_RECEIVER_ID",data.name)
                    this.eventManager.emit("GET_OFFER",data.sdp)
                    break;
                case "answer":
                    this.eventManager.emit("GET_ANSWER",data.sdp)
                    break;
                case "new-ice-candidate":
                    const candidate = new RTCIceCandidate(data.candidate);
                    this.eventManager.emit("SAVE_ICE_CANDIDATE",candidate)
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

    sendRole = (shareId:string,userId:string) => {
        let data =JSON.stringify({
            type:this.role,
            shareId,
            userId,

        })
        this.ws?.send(data)
    }

    sendOffer = (data: string) => {
        this.ws?.send(data);
    }

    sendAnswer = (data: string) => {

        this.ws?.send(data);
    }



}

const WSClient = new MyWebSocket();
export default WSClient