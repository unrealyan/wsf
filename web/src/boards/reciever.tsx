import { createEffect, createSignal } from "solid-js"
import { formatBytes } from "../lib/fileUtil"
import { StoreType, useStore } from "../lib/store";
import { WebRTCReceiver } from "../lib/mywebrtc";
import AcceptBanner from "../components/acceptBanner";

export default function Receiver(props: any) {
    const [state, action]: StoreType = useStore();
    const [webRTCReceiver, setWebRTCReceiver] = createSignal<WebRTCReceiver | null>(null);
    const [receivedFile, setReceivedFile] = createSignal<File | null>(null);

    let acceptRef: { open: () => void, close: () => void };

    createEffect(() => {
        const receiver = new WebRTCReceiver();
        setWebRTCReceiver(receiver);

     
        receiver.onFileReceived((file) => {
            setReceivedFile(file);
        });
    });

  

    const handleSignaling = async (event: MessageEvent) => {
        const message = JSON.parse(event.data);
        const receiver = webRTCReceiver();

        switch (message.type) {
            case 'offer':
                try {
                    await receiver?.setRemoteDescription(new RTCSessionDescription(message));
                    const answer = await receiver?.createAnswer();
                    if (answer) {
                        await receiver?.setLocalDescription(answer);

                        // 发送 answer
                        // state.ws?.send(JSON.stringify({
                        //     shareId: state.shareId,
                        //     userId: state.userId,
                        //     target: state.targetId,
                        //     type: 'answer',
                        //     sdp: answer
                        // }));

                        // 添加文件接收监听器
                        receiver?.onFileReceived((file) => {
                            console.log('File received:', file);
                            // 处理接收到的文件
                        });

                        // 通知发送方接收端已准备就绪
                        // state.ws?.send(JSON.stringify({
                        //     type: 'receiver_ready'
                        // }));
                    }
                } catch (error) {
                    console.error('Error handling offer:', error);
                }
                break;
            // ... 其他情况
        }
    };

    const onAccept = async () => {
        let reciverWebrtc = new WebRTCReceiver();
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
            webrtc: reciverWebrtc
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