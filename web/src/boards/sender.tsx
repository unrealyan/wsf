import { createEffect, createSignal, onCleanup, onMount,on } from "solid-js";
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
    const [files, setFiles] = createSignal<File[]>([]);
    const [startShare, setStartShare] = createSignal(false)
    const [senderStore,] = createSignal(new SenderStoreManager(state,action))

    onMount(() => {
        WSClient.on("ALL_RECEIVERS", getAllReceivers)
        WSClient.on("SET_SHARE_ID", getShareId)
        WSClient.on("SET_USER_ID", getSelfId)
        WSClient.on("SEND_FILE", sendFiles)
    })

    const getSelfId = (id:string) => {
       action.setUserId(id)
    }

    const updateUser = (id:string,{receiverSize,progress,speed,fileSize}:any)=>{
        let userList = state.userList.map(item=>Object.assign({},item))
        let user = userList.find(user => user.id === id)
        if(user){
            user.progress = progress
            user.speed = speed
            user.fileSize = fileSize
        }
        action.setUserList(userList)
    }

    const handleWebRTCMessage = (e: any) => {
     if (e.type === "progress") {        
        updateUser(e.data.peerId,{
            receiverSize: e.data.receiverSize,
            speed:e.data.speed,
            progress:e.data.progress,
            fileSize:e.data.fileSize
        })
    } else if (e.type === "fileReceived") {
        console.log(e.data)
        updateUser(e.data.peerId,{
            receiverSize: e.data.receiverSize,
            speed:e.data.speed,
            progress:e.data.progress,
            fileSize:e.data.fileSize
        })
        action.setUpload({disable:false})
    } else if (e.type === "transferStart") {
        action.setUpload({disable:true})
    }
  };

    const getAllReceivers = (userIds:string[]) => {
        action.setUserList(userIds.map(user=>{
            let webrtc = new WSFWebRTCImpl({role:"sender",peerId:user,sharerId:state.shareId,selfId:state.userId})
            webrtc.bindEvents()
            webrtc.onmessage=handleWebRTCMessage
           
            return {
                id:user,
                filename: state.file?.name || "",
                fileSize:state.file?.size || 0,
                handleFileSize:0,
                receiverSize:0,
                progress: 0,
                speed: 0,
                start: false,
                webrtc
         }}))
    }

    const getShareId = (id:string) => {
        action.setShareId(id)
        sessionStorage.setItem("shareId",id)
    }

    const handleFileUpload = (uploadedFiles: File[]) => {
        console.log(files)
        setFiles(uploadedFiles);
    };

    const shareFile =  async () => {
        state.userList.forEach((user:Peer) => {
           WSClient.sendShareFileInfo({
               sharerId:state.shareId,
               receiverId:user.id,
               senderId:state.userId,
               filename:state.file?.name || "",
               fileSize:state.file?.size || 0
           })
        })
    }

    const sendFiles = async () => {
        setStartShare(() => true)

        // eventManager.emit("START_WEBRTC",{})
        state.userList.forEach((user:Peer) => {
            user.webrtc?.setFile(state.file)
            user.webrtc?.sendOffer()
        })
    };


    return (
        <>
            <Upload onFileUpload={handleFileUpload}>
                {/* <ProgressBar ref={(r: any) => (userProgressRef = r)} /> */}
            </Upload>
            <button class={`text-white bg-blue-500 hover:bg-blue-700 font-bold py-2 px-4 rounded mt-6`} onClick={shareFile}>
                Share Files
            </button>
            {/* <button class={`text-white bg-blue-500 hover:bg-blue-700 font-bold py-2 px-4 rounded`} onClick={sendFiles}>
                Send Files
            </button> */}
        </>
    )
}