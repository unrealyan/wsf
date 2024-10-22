import { createEffect, createSignal, onMount, Show } from "solid-js";
import Upload from "../components/upload";
import { useStore, Peer, Receiver } from "../lib/store";
import WSFWebRTCImpl from "../lib/wsfrtc/webrtc";
import WSClient from "../lib/wsfws/webSocket";
import Copy from "../components/copy";
import Offline from "../components/offline/offline";


export default function Sender() {

    const [state, action,{notification,addNotification}] = useStore()

    const [files, setFiles] = createSignal<File[]>([]);


    onMount(() => {
      
    })

    createEffect(()=>{
        let notice = notification();
        WSClient.start()
        // if (notice.message === "LOGIN_BY_GOOGLE") {

            WSClient.on("SET_SHARE_ID", getShareId)
            WSClient.on("SET_USER_ID", getSelfId)
            WSClient.on("CREATE_RECEIVER", createReceiver)
            WSClient.on("RECEIVER_OFFLINE", onReceiverOffline)
        // }
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
        } else if (e.type === "error"){
            action.setOffline({ status: true, message: e.data.message })
            WSClient.sendError({
                userId:state.userId,
                shareId:state.shareId,
                msg: "webrtc stun failed"
            })
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
        
            <Show when={state.file}>
                <Copy text={`${location.origin}/?s=${state.shareId}`} onCopy={() => console.log('Copied!')}>
                    <p class="text-gray-400">{`${location.origin}/?s=${state.shareId}`}</p>
                </Copy>
            </Show>  
        </>
    )
}