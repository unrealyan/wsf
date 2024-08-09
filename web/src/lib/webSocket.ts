import { WebRTCInterface } from "./webrtc";
import { createStore, type SetStoreFunction, type Store } from "solid-js/store";

export interface StoreType {
    userId: string;
    targetId: string;
    userIds: string[];
    file: null | File | { name: string; size: number; type: string };
    shareId: string;
    searchParam: URLSearchParams;
    progress: number;
    fileStream: Promise<any> | null;
    ws: WebSocket | null;
    role: "sender" | "receiver";
    totalFiles:number,
    totalSize:number
}

const urlSP = new URLSearchParams(window.location.search);
const WEBSOCKET_URL = process.env.WEBSOCKET_URL || "";
const uuidRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

export default class WebSocketClient {
    ws!: WebSocket;
    userProgressRef: {
        open: () => void;
        close: () => void;
        setValue: (value: number) => void;
        setSpeed: (speed: number) => void;
        setDone: (done: boolean) => void;
    };
    acceptRef: { open: () => void; close: () => void };

    constructor(
        userProgressRef: {
            open: () => void;
            close: () => void;
            setValue: (value: number) => void;
            setSpeed: (speed: number) => void;
            setDone: (done: boolean) => void;
        },
        acceptRef: { open: () => void; close: () => void }
    ) {
        this.userProgressRef = userProgressRef;
        this.acceptRef = acceptRef;
        let shareId = sessionStorage.getItem("shareId") || "";
        const urlShareId = urlSP.get("s") || "";

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
    }

    connect(url: string) {
        this.ws = new WebSocket(url);
        this.ws.onopen = () => console.log("Connected to " + url);
        this.ws.onclose = () => {
            console.log("Disconnected from " + url)
            this.connect(url);
        };
    }

    listen(store: Store<StoreType>, setStore: SetStoreFunction<StoreType>, webrtc: WebRTCInterface) {
        if (!this.ws) {
            throw new Error("WebSocket not initialized");
        }

        this.ws.onmessage = (e) => {
            let data = JSON.parse(e.data);

            switch (data.type) {
                case "user-id":
                    setStore("userId", data.userId);
                    if (data.shareId) {
                        sessionStorage.setItem("shareId", data.shareId);
                        setStore("shareId", data.shareId);
                    }

                    this.ws.send(JSON.stringify({
                        type: store.searchParam.get("s") ? "receiver" : "sender",
                        userId: data.userId
                    }));
                    break;

                case "all-receivers":
                    setStore("userIds", data.userIds || []);
                    break;

                case "join":
                    webrtc.createOffer(data.target, store, setStore);
                    break;

                case "offer":
                    webrtc.createAnswer(data.name, data.sdp, setStore);
                    break;

                case "answer":
                    webrtc.addAnswer(data.sdp);
                    break;

                case "new-ice-candidate":
                    const candidate = new RTCIceCandidate(data.candidate);
                    webrtc.addIceCandidates(candidate);
                    break;

                case "request-status":
                    if (data.status === "accepted") {
                        this.userProgressRef.open();
                        this.ws.send(JSON.stringify({
                            type: "initiate",
                            userId: store.userId,
                            shareId: store.shareId,
                            target: data.userId
                        }));
                    }
                    break;

                case "accept-request":
                    setStore({
                        file: data.file,
                        targetId: data.userId
                    });
                    console.log(this.acceptRef)
                    this.acceptRef.open();
                    break;

                case "file-transfer-request":
                    setStore('targetId', data.senderId);
                    setStore('file', {
                        name: data.fileName,
                        size: data.fileSize,
                        type: data.fileType
                    });
                    this.acceptRef.open();
                    break;

                case "stats":
                    setStore({
                        totalSize:data.totalSize,
                        totalFiles:data.totalFiles
                    })
                    break;
            }
        };
    }
}