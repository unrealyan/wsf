import { createEffect, createSignal, onMount, Show } from "solid-js";
import Upload from "../components/upload";
import { useStore, Peer, Receiver } from "../lib/store";
import WSFWebRTCImpl from "../lib/wsfrtc/webrtc";
import WSClient from "../lib/wsfws/webSocket";
import Copy from "../components/copy";


export default function Sender() {

    const [state, action] = useStore()

    const [files, setFiles] = createSignal<File[]>([]);

    onMount(() => {
        WSClient.onmessage()

        WSClient.on("SET_SHARE_ID", getShareId)
        WSClient.on("SET_USER_ID", getSelfId)
        WSClient.on("CREATE_RECEIVER", createReceiver)
        WSClient.on("RECEIVER_OFFLINE", onReceiverOffline)
    })


    const getSelfId = (id: string) => {
        action.setUserId(id)
    }

    const updateUser = (id: string, { receiverSize, progress, speed, fileSize }: any) => {
        let userList = state.receivers.map(item => Object.assign({}, item))
        let user = userList.find(user => user.id === id)
        if (user) {
            user.progress = progress
            user.speed = speed
            user.fileSize = fileSize
        }
        action.setReceivers(userList)
    }

    const handleWebRTCMessage = (e: any) => {
        if (e.type === "progress") {
            updateUser(e.data.peerId, {
                receiverSize: e.data.receiverSize,
                speed: e.data.speed,
                progress: e.data.progress,
                fileSize: e.data.fileSize
            })
        } else if (e.type === "fileReceived") {
            updateUser(e.data.peerId, {
                receiverSize: e.data.receiverSize,
                speed: e.data.speed,
                progress: e.data.progress,
                fileSize: e.data.fileSize
            })
            action.setUpload({ disable: false })
        } else if (e.type === "transferStart") {
            action.setUpload({ disable: true })
        }
    };



    const createReceiver = (data: any) => {
        if (!state.file) return
        let webrtc = new WSFWebRTCImpl({ role: "sender", peerId: data.userId, sharerId: state.shareId, selfId: data.target })
        let receiver: Receiver = {
            id: data.userId,
            webrtc,
            filename: state.file?.name || "",
            fileSize: state.file?.size || 0,
            handleFileSize: 0,
            receiverSize: 0,
            progress: 0,
            speed: 0,
            start: false
        }
        webrtc.file = state.file;
        webrtc.bindEvents()
        webrtc.sendOffer()
        webrtc.onmessage = handleWebRTCMessage
        let receivers =  [...state.receivers]
        receivers= receivers.filter(rece=>rece.id != data.userId && rece.webrtc)
        action.setReceivers([...receivers, receiver])
    }

    const getShareId = (id: string) => {
        action.setShareId(id)
        sessionStorage.setItem("shareId", id)
    }

    const handleFileUpload = (uploadedFiles: File[]) => {
        setFiles(uploadedFiles);
    };

    const onReceiverOffline = (id: string) => {
        let receivers = state.receivers.filter(user => user.id != id)
        action.setReceivers(receivers)
    }

    const shareFile = async () => {
        action.setIsShare(true)
        WSClient.sendFileReadyNotice(state.userId,state.shareId)
    }

    return (
        <>
            <Upload onFileUpload={handleFileUpload}>
            </Upload>
            {/* <button class={`text-white bg-blue-500 hover:bg-blue-700 font-bold py-2 px-4 rounded mt-6 ${(!state.file || state.isSahre) ? "cursor-not-allowed bg-slate-400 hover:bg-slate-400" : ""}`} onClick={shareFile} disabled={(!state.file) || (state.isSahre)}>
                Share Files
            </button> */}
            <Show when={state.file}>
                <Copy text={`${location.origin}/?s=${state.shareId}`} onCopy={() => console.log('Copied!')}>
                    <p class="text-gray-400">{`${location.origin}/?s=${state.shareId}`}</p>
                </Copy>
            </Show>
        </>
    )
}