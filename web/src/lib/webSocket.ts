import WebRTCImpl, { WebRTCInterface } from "./webrtc";
import { createStore, type SetStoreFunction, type Store } from "solid-js/store";
import { User } from "../boards/userlist";
import { ActionType, StateType, useStore, IReceiver } from "./store";
import { Console } from "console";
import { WebRTCReceiver, WebRTCSender } from "./mywebrtc";

export interface StoreType {
    userId: string;
    targetId: string;
    userIds: string[];
    userList: IReceiver[];
    file: null | File | { name: string; size: number; type: string };
    shareId: string;
    searchParam: URLSearchParams;
    progress: number;
    fileStream: Promise<any> | null;
    ws: WebSocketClient | null;
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

    sendOffer({userId,targetId,offer}:any){
        this.ws.send(JSON.stringify({
            type: "offer",
            userId,
            targetId,
            offer
        }))
    }

    listen(state: StateType, action: ActionType) {
        if (!this.ws) {
            throw new Error("WebSocket not initialized");
        }

        this.ws.onmessage = (e) => {
            let data = JSON.parse(e.data);

            // Common events for both sender and receiver
            switch (data.type) {
                case "user-id":
                    this.handleUserId(data, state, action);
                    break;
                case "new-ice-candidate":
                    this.handleNewIceCandidate(data, state);
                    break;
            }

            // Sender-specific events
            if (state.role === "sender") {
                this.handleSenderEvents(data, state, action);
            }

            // Receiver-specific events
            if (state.role === "receiver") {
                this.handleReceiverEvents(data, state, action);
            }
        };
    }

    private handleUserId(data: any, state: StateType, action: ActionType) {
        action.setUserId(data.userId);
        if (data.shareId) {
            sessionStorage.setItem("shareId", data.shareId);
            action.setShareId(data.shareId);
        }
        this.ws.send(JSON.stringify({
            type: state.searchParam.get("s") ? "receiver" : "sender",
            userId: data.userId
        }));
    }

    private handleNewIceCandidate(data: any, state: StateType) {
        // Implement ICE candidate handling for both sender and receiver
    }

    private handleSenderEvents(data: any, state: StateType, action: ActionType) {
        switch (data.type) {
            case "all-receivers":
                this.handleAllReceivers(data, state, action);
                break;
            case "answer":
                this.handleAnswer(data, state);
                break;
            case "request-status":
                this.handleRequestStatus(data, state);
                break;
            case "stats":
                this.handleStats(data, action);
                break;
        }
    }

    private handleAllReceivers(data: any, state: StateType, action: ActionType) {
        // Implement the logic for handling all receivers
        // For example:
        console.log(data)
        action.setUserList(data.userIds.map((user: string) => ({
            id: user,
            filename: '',
            progress: 0,
            speed: 0,
            start: false
        })));
    }

    private handleReceiverEvents(data: any, state: StateType, action: ActionType) {
        switch (data.type) {
            case "offer":
                this.handleOffer(data, state);
                break;
            case "file-transfer-request":
                this.handleFileTransferRequest(data, action);
                break;
        }
    }

    // Add this method
    private handleOffer(data: any, state: StateType) {
        // Implement the logic for handling the offer
        console.log("Received offer:", data);
        // Add your specific logic here, e.g.:
        // state.webRTC?.setRemoteDescription(data.offer);
    }

    private handleAnswer(data: any, state: StateType) {
        // Implement the logic for handling the answer
        // For example:
        // state.webRTC?.setRemoteDescription(data.answer);
    }

    private handleRequestStatus(data: any, state: StateType) {
        // Implement the logic for handling request status
        console.log("Received request status:", data);
        // Add your specific logic here
    }

    private handleStats(data: any, action: ActionType) {
        // Implement the logic for handling stats
        console.log("Received stats:", data);
        // Add your specific logic here, e.g.:
        // action.updateStats(data.stats);
    }

    // ... implement the individual handler methods ...

    // Add this method
    private handleFileTransferRequest(data: any, action: ActionType) {
        console.log("Received file transfer request:", data);
        // Implement the logic for handling file transfer request
        // For example:
        // action.setFileTransferRequest(data.fileInfo);
    }

    // ... existing code ...
}