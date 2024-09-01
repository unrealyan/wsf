import { createEffect, createSignal, onCleanup } from "solid-js";
import ProgressBar, { UserProgressRef } from "../components/progress/progress";
import Upload from "../components/upload";
import { WebRTCSender } from "../lib/mywebrtc"
import { User, useStore } from "../lib/store";
import { off } from "process";

export default function Sender() {
    const [state, action] = useStore()
    let userProgressRef: UserProgressRef;
    const [webRTCSender, setWebRTCSender] = createSignal<WebRTCSender | null>(null);
    const [files, setFiles] = createSignal<File[]>([]);
    const [startShare, setStartShare] = createSignal(false)

    createEffect(() => {
        console.log("Creating WebRTCSender");
        const sender = new WebRTCSender();
        setWebRTCSender(sender);
        if (startShare()) {
            let sender = new WebRTCSender()
            // sender.createOffer().then((offer) => {
            //     state.ws?.sendOffer({
            //         userId: state.userId,
            //         targetId: state.targetId,
            //         offer:offer
            //     })
            // })


        }



    }, [startShare()]);



    const handleFileUpload = (uploadedFiles: File[]) => {
        console.log(files)
        setFiles(uploadedFiles);
    };

    const sendFiles = async () => {
        setStartShare(() => true)
    };


    return (
        <>
            <Upload onFileUpload={handleFileUpload}>
                <ProgressBar ref={(r: any) => (userProgressRef = r)} />
            </Upload>
            <button class={`text-white bg-blue-500 hover:bg-blue-700 font-bold py-2 px-4 rounded ${!webRTCSender() ? "disabled" : ''}`} onClick={sendFiles} disabled={!webRTCSender()}>
                Send Files
            </button>
        </>
    )
}