import { createEffect, createSignal, onMount } from "solid-js"
import { StoreType, useStore } from "../lib/store";
import WSFWebRTCImpl from "../lib/wsfrtc/webrtc";
import WSClient from "../lib/wsfws/webSocket";
import ProgressBar from "../components/progress/progress";
import Offline from "../components/offline/offline";

export default function Receiver(props: any) {
    const [state, action,{notification}]: StoreType = useStore();
    const [webRTCReceiver, setWebRTCReceiver] = createSignal<WSFWebRTCImpl | undefined>();
    const [receivedFile, setReceivedFile] = createSignal<boolean>(false);

    let receiverProgressRef: { open: () => void, close: () => void, setValue: (value: number) => void, setSpeed: (speed: number) => void, setDone: (done: boolean) => void, status: boolean };
    onMount(() => {

        

    }) 


    createEffect(()=>{
        let notice = notification();
        if (notice.message === "LOGIN_BY_GOOGLE") {
            WSClient.start()
            WSClient.on("SET_USER_ID", getSelfId)
            WSClient.on("SET_SHARE_ID", getShareId)
            WSClient.on("SET_TARGETID", setTargetId)
            WSClient.on("INIT_RECEIVER", onInitReceiver)
            WSClient.on("SET_OFFLINE", setOffline)
            WSClient.on("SET_ONLINE", setOnline)
        }
    })

    const setOffline = (data: any) => {
        action.setOffline({ status: true, message: data.message })
    }
    const setOnline = (data: any) => {
        action.setOffline({ status: false, message: data.message })
    }

    const getShareId = (id: string) => {
        action.setShareId(id)
        sessionStorage.setItem("shareId", id)
    }

    const getSelfId = (id: string) => {
        console.log(id)
        action.setUserId(id)
    }
    const setTargetId = (id: string) => {
        action.setTargetId(id)
    }


    const onInitReceiver = (data: any) => {
        Promise.all([action.setUserId(data.userId), action.setTargetId(data.target), action.setShareId(data.shareId)]).then(() => {
            let webrtc = new WSFWebRTCImpl({ role: "receiver", peerId: state.targetId, sharerId: state.shareId, selfId: state.userId })
            setWebRTCReceiver(webrtc)
            const currentReceiver = webRTCReceiver(); // 确保获取当前的 webRTCReceiver
            if (currentReceiver) { // 检查是否有效
                currentReceiver.onmessage = handleWebRTCMessage; // 赋值
                currentReceiver.bindEvents();
            }
        })
    }


    const updateUser = ({ filename, receiverSize, progress, speed, fileSize }: any) => {
        let receiver = {
            ...state.reciever,
            filename,
            receiverSize,
            progress,
            speed,
            fileSize
        }

        action.setReciver(receiver)
    }

    const handleWebRTCMessage = (e: any) => {
        if (e.type === "progress") {
            receiverProgressRef.setValue(e.data.progress);
            receiverProgressRef.setSpeed(e.data.speed);
            updateUser(e.data)
        } else if (e.type === "fileReceived") {
            receiverProgressRef.setDone(true)
            WSClient.sendStats({
                filename:state.reciever.filename,
                fileSize:state.reciever.fileSize,
                target:state.targetId,
            })
            updateUser(e.data)
        } else if (e.type === "transferStart") {
            setReceivedFile(true)
            receiverProgressRef.open()
            updateUser(e.data)
        }
    };

    const onErrorRTC = () =>{
        // close webrtc
    }


    return <div class="col-span-full w-[90%] bg-white p-10 mt-8 mr-auto ml-auto rounded">
        <label for="cover-photo" class="flex font-medium leading-6 text-gray-900 text-2xl m-10 justify-center">WebRTC File Sharing</label>
        {
            state.offline.status ? <Offline message={state.offline.message} /> : <>
                {receivedFile() ? <ProgressBar
                    ref={(r: any) => receiverProgressRef = r}
                    filename={state.reciever.filename}
                /> : <div data-progress="45%" class="m-4 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-6 relative">
                    <div>Wait for user to send file</div>
                </div>}</>
        }
        {props.children}
    </div>
}