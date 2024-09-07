import { createEffect, createSignal, onCleanup, onMount } from "solid-js";
import ProgressBar, { UserProgressRef } from "../components/progress/progress";
import Upload from "../components/upload";
import { WebRTCSender } from "../lib/mywebrtc"
import { User, useStore,SenderStoreManager, Peer } from "../lib/store";
import { off } from "process";
import eventManager from "../lib/eventManager";
import WSFWebRTCImpl,{WSFWebRTC} from "../lib/wsfrtc/webrtc";
import WSClient from "../lib/wsfws/webSocket";


export default function Sender() {

    const [state, action] = useStore()
    // const [,]=createSignal(new SenderStoreManager(state,action))
    let userProgressRef: UserProgressRef;
    // const [webRTCSender, setWebRTCSender] = createSignal<WebRTCSender >(new WebRTCSender());
    // const [webRTCSender, setWebRTCSender] = createSignal<WSFWebRTC|null>();
    const [files, setFiles] = createSignal<File[]>([]);
    const [startShare, setStartShare] = createSignal(false)
    const [senderStore,] = createSignal(new SenderStoreManager(state,action))

    onMount(() => {
      
    })

    createEffect(() => {

        console.log(0)

        WSClient.on("ALL_RECEIVERS", getAllReceivers)
        WSClient.on("SET_SHARE_ID", getShareId)
        WSClient.on("SET_USER_ID", getSelfId)
       

    },0);

    const onInitiate = () => {

        state.userList.forEach((user:Peer) => {
            // WSClient.sendUserToReceiver(state.userId,state.shareId,user.id)
        })
    }

    const getSelfId = (id:string) => {
       action.setUserId(id)
    }

    const getAllReceivers = (userIds:string[]) => {
        action.setUserList(userIds.map(user=>{
            let webrtc = new WSFWebRTCImpl({role:"sender",peerId:user,sharerId:state.shareId,selfId:state.userId})
            webrtc.bindEvents()
           
            return {
                id:user,
                filename: state.file?.name || "",
                progress: 0,
                speed: 0,
                start: false,
                webrtc
         }}))
    }

    const getShareId = (id:string) => {
        action.setShareId(id)
    }

    const handleFileUpload = (uploadedFiles: File[]) => {
        console.log(files)
        setFiles(uploadedFiles);
    };

    const sendFiles = async () => {
        setStartShare(() => true)

        // eventManager.emit("START_WEBRTC",{})
        state.userList.forEach((user:Peer) => {
            user.webrtc?.setFile( new File(["hello"], "hello.txt", { type: "text/plain" }))
            user.webrtc?.sendOffer()
        })
    };


    return (
        <>
            <Upload onFileUpload={handleFileUpload}>
                <ProgressBar ref={(r: any) => (userProgressRef = r)} />
            </Upload>
            <button class={`text-white bg-blue-500 hover:bg-blue-700 font-bold py-2 px-4 rounded`} onClick={sendFiles}>
                Send Files
            </button>
        </>
    )
}