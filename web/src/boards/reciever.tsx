import { createEffect, createSignal, onMount } from "solid-js"
import { formatBytes } from "../lib/fileUtil"
import { ReceiverStoreManager, StoreType, useStore } from "../lib/store";
import { WebRTCReceiver } from "../lib/mywebrtc";
import AcceptBanner from "../components/acceptBanner";
import eventManager from "../lib/eventManager";
import WSFWebRTCImpl,{WSFWebRTC} from "../lib/wsfrtc/webrtc";
import WSClient from "../lib/wsfws/webSocket";

export default function Receiver(props: any) {
    const [state, action]: StoreType = useStore();
    //  const [,]=createSignal(new ReceiverStoreManager(state,action))
    console.log(state)
    const [webRTCReceiver, setWebRTCReceiver] = createSignal<WSFWebRTC|null>(null);
    const [receivedFile, setReceivedFile] = createSignal<File | null>(null);

    let acceptRef: { open: () => void, close: () => void };
    onMount(() => {
       
        // WSClient.on("SET_USER_ID", getSelfId)
        // WSClient.on("GET_TARGET_ID",getTargetId)
        // WSClient.on("GET_SHARE_ID",getShareId)
        console.log("mount",WSClient)
        WSClient.on("INIT_RECEIVER", onInitReceiver)
    })

    createEffect(() => {
        console.log("effect")
        // const receiver = new WebRTCReceiver();
        // let receiverStore = new ReceiverStoreManager(state,action)
        // receiverStore.webrtc = webRTCReceiver()
        // setWebRTCReceiver(webRTCReceiver());

     
        // webRTCReceiver().onFileReceived((file) => {
        //     setReceivedFile(file);
        // });

        
        // webRTCReceiver().bindEvents();
    },[]);

    const onInitReceiver = (data:any) => {  
        Promise.all([action.setUserId(data.target),action.setTargetId(data.userId),action.setShareId(data.shareId)]).then(()=>{
            setWebRTCReceiver(new WSFWebRTCImpl({role:"receiver",peerId:state.targetId,sharerId:state.shareId,selfId:state.userId}))
            webRTCReceiver()?.bindEvents();

        })
        
    }

  

    const onAccept = async () => {
        // let reciverWebrtc = new WebRTCReceiver();
        // reciverWebrtc.fileReceiver = new LargeFileReceiver(state.file?.name || "test")
        // reciverWebrtc.onmessage = (e: any) => {
        //   console.log(e)
        //   if (e.type == "icecandidate") {
        //     state.ws?.send(JSON.stringify({
        //       type: "new-ice-candidate",
        //       target: state.userId,
        //       candidate: e.candidate
        //     }));
        //   }
        // }
        action.setReciver({
            ...state.reciever,
            filename: state.file?.name || "",
            // webrtc: reciverWebrtc
        })

        // webrtc.fileReceiver = new LargeFileReceiver(state.file?.name|| "test");
        // await reciverWebrtc.fileReceiver.start();
        // receiverProgressRef?.open();
        // receiverProgressRef?.setDone(false);

        const { ws, userId, targetId, shareId } = state;
        // ws?.send(JSON.stringify({
        //     type: "request-status",
        //     userId,
        //     target: targetId,
        //     shareId,
        //     status: "accepted",
        //     filename: state.file?.name,
        //     size: state.file?.size
        // }));
        acceptRef?.close();

    };

    const onDecline = () => {
        const { ws, userId, shareId, targetId } = state;
        // ws?.send(JSON.stringify({
        //     type: "request-status",
        //     userId,
        //     target: targetId,
        //     shareId,
        //     status: "declined"
        // }));
        // acceptRef?.close();
    };

    return <div class="col-span-full w-[90%] bg-white p-10 mt-8 mr-auto ml-auto rounded">
        <label for="cover-photo" class="block font-medium leading-6 text-gray-900 text-2xl m-10">WebRTC File Sharing</label>
        <div data-progress="45%" class="m-4 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-6 relative">
            {receivedFile() ? <div class="">
                <p class="h-12 flex justify-center items-center">
                    <span class="text-gray-800">{receivedFile()?.name}</span>
                    <span class="text-gray-400 ml-4">{formatBytes(receivedFile()?.size || 0)}</span>
                </p>
            </div> :
                <div>Wait for user to send file</div>
            }
        </div>
        {props.children}
        <AcceptBanner ref={el => acceptRef = el} onAccept={onAccept} onDecline={onDecline} user={state.targetId} />
    </div>
}