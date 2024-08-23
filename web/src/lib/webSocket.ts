import { WebRTCInterface } from "./webrtc";
import { createStore, type SetStoreFunction, type Store } from "solid-js/store";
import { User } from "../boards/userlist";
import { ActionType, StateType, useStore } from "./store";

export interface StoreType {
    userId: string;
    targetId: string;
    userIds: string[];
    userList: User[];
    file: null | File | { name: string; size: number; type: string };
    shareId: string;
    searchParam: URLSearchParams;
    progress: number;
    fileStream: Promise<any> | null;
    ws: WebSocket | null;
    role: "sender" | "receiver";
    totalFiles: number,
    totalSize: number
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

    join() {

    }

    listen(state: StateType, action: ActionType, webrtc: WebRTCInterface) {
        if (!this.ws) {
            throw new Error("WebSocket not initialized");
        }

        this.ws.onmessage = (e) => {
            let data = JSON.parse(e.data);
            switch (data.type) {
                case "user-id":
                    action.setUserId(data.userId);
                    if (data.shareId) {
                        sessionStorage.setItem("shareId", data.shareId);
                        action.setShareId(data.shareId);
                    }
                    this.ws.send(JSON.stringify({
                        type: state.searchParam.get("s") ? "receiver" : "sender",
                        userId: data.userId
                    }));
                    break;
                case "all-receivers":
                    // action.setUserIds(data.userIds || []); // 使用 action 更新 userIds
                    action.setUserList(data.userIds.map((id: string) => ({
                        id,
                        filename: "",
                        progress: 0,
                        speed: 0,
                        start: false
                    }))); // 使用 action 更新 userList
                    break;

                case "join":
                    state.userList.forEach(user=>{
                    webrtc.createOffer().then(offer => {
                        console.log(state)
                        this.ws.send(JSON.stringify({
                            name: state.userId,
                            target: user.id,
                            type: "offer",
                            sdp: offer
                        }));
                    });
                })
                    break;

                case "offer":
                    state.userList.forEach(user=>{
                        webrtc.createAnswer().then(answer => {
                            this.ws.send(JSON.stringify({
                                name: state.userId,
                                target: user.id,
                                type: "answer",
                                sdp: answer
                            }));
                        });
                    })
                    
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
                            userId: state.userId,
                            shareId: state.shareId,
                            target: data.userId
                        }));
                    }
                    break;

                case "accept-request":
                    action.setFile(data.file); // 使用 action 更新 file
                    action.setTargetId(data.userId); // 使用 action 更新 targetId
                    console.log(this.acceptRef)
                    this.acceptRef.open();
                    break;

                case "file-transfer-request":
                    action.setTargetId(data.senderId); // 使用 action 更新 targetId
                    action.setFile({
                        name: data.fileName,
                        size: data.fileSize,
                        type: data.fileType
                    }); // 使用 action 更新 file
                    this.acceptRef.open();
                    break;

                case "stats":
                    action.setTotalSize(data.totalSize); // 使用 action 更新 totalSize
                    action.setTotalFiles(data.totalFiles); // 使用 action 更新 totalFiles
                    break;
            }
        };
    }
}