import { createEffect, createSignal, onMount } from "solid-js"
import { formatBytes } from "../lib/fileUtil"
import { ReceiverStoreManager, StoreType, useStore } from "../lib/store";
import { WebRTCReceiver } from "../lib/mywebrtc";
import AcceptBanner from "../components/acceptBanner";
import eventManager from "../lib/eventManager";
import WSFWebRTCImpl, { WSFWebRTC } from "../lib/wsfrtc/webrtc";
import WSClient from "../lib/wsfws/webSocket";
import { userInteractionForSelectionManager } from "../lib/userInteractionManager";
import ProgressBar from "../components/progress/progress";

export default function Receiver(props: any) {
    const [state, action]: StoreType = useStore();
    //  const [,]=createSignal(new ReceiverStoreManager(state,action))
    const [webRTCReceiver, setWebRTCReceiver] = createSignal<WSFWebRTCImpl | undefined>();
    const [receivedFile, setReceivedFile] = createSignal<boolean>(false);

    let acceptRef: { open: () => void, close: () => void };
    let receiverProgressRef: { open: () => void, close: () => void, setValue: (value: number) => void, setSpeed: (speed: number) => void, setDone: (done: boolean) => void, status: boolean };
    onMount(() => {

        WSClient.on("SET_USER_ID", getSelfId)
        // WSClient.on("GET_TARGET_ID",getTargetId)
        // WSClient.on("GET_SHARE_ID",getShareId)

        WSClient.on("INIT_RECEIVER", onInitReceiver)
        // WSClient.on("ACCEPT", onOpenAccept)
        WSClient.on("ACCEPT", onAccept)

    })
    const getSelfId = (id: string) => {
        action.setUserId(id)
    }

    const onInitReceiver = (data: any) => {
        Promise.all([action.setUserId(data.target), action.setTargetId(data.userId), action.setShareId(data.shareId)]).then(() => {
            let webrtc = new WSFWebRTCImpl({ role: "receiver", peerId: state.targetId, sharerId: state.shareId, selfId: state.userId })
            webrtc?.bindEvents();
            webrtc.onmessage = handleWebRTCMessage
            setWebRTCReceiver(webrtc)

        })

    }

    const onOpenAccept = async (data: any): Promise<unknown> => {

        action.setReciver({
            id: data.target,
            filename: data.filename,
            handleFileSize: data.fileSize,
            fileSize: 0,
            progress: 0,
            speed: 0,
            start: false
        })
        // acceptRef.open()
        return await userInteractionForSelectionManager.waitForUserAction()
    }



    const onAccept = async () => {

        webRTCReceiver()?.setReceiverFile(state.reciever.filename)
        await webRTCReceiver()?.fileReceiver?.start()
        WSClient.acceptFile({
            senderId: state.userId,
            receiverId: state.targetId,
            sharerId: state.shareId
        })
        // acceptRef?.close();

    };

    const onDecline = () => {
        // acceptRef?.close();
    };

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
            updateUser(e.data)
        } else if (e.type === "transferStart") {
            setReceivedFile(true)
            receiverProgressRef.open()
            updateUser(e.data)
        }
    };

    console.log(state)

    return <div class="col-span-full w-[90%] bg-white p-10 mt-8 mr-auto ml-auto rounded">
        <label for="cover-photo" class="block font-medium leading-6 text-gray-900 text-2xl m-10">WebRTC File Sharing</label>
        {receivedFile() ? <ProgressBar
            ref={(r: any) => receiverProgressRef = r}
            filename={state.reciever.filename}
        /> : <div data-progress="45%" class="m-4 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-6 relative">
            <div>Wait for user to send file</div>
        </div>}
        {props.children}

        {/* <AcceptBanner ref={el => acceptRef = el} onAccept={onAccept} onDecline={onDecline} user={state.targetId} /> */}
    </div>
}