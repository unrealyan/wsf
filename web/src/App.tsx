import { createEffect, onMount, type Component } from 'solid-js';
import { createStore } from "solid-js/store";
import Upload from './components/upload';
import WebRTC from './lib/webrtc';
import LargeFileReceiver from './lib/largeFileReceiver';
import AcceptBanner from './components/acceptBanner';
import Header from './components/header';
import ProgressBar from "./components/progress/progress";
import Receiver from './boards/reciever';
import Copy from './components/copy';
import WebSocketClient, { StoreType } from './lib/webSocket';

const urlSP = new URLSearchParams(window.location.search);

const App: Component = () => {
  const [store, setStore] = createStore<StoreType>({
    userId: "",
    targetId: "",
    userIds: [],
    file: null,
    shareId: "",
    searchParam: urlSP,
    progress: 0,
    fileStream: null,
    ws: null,
    role: urlSP.get("s") ? "receiver" : "sender"
  });

  let acceptRef: { open: () => void, close: () => void };
  let userProgressRef: { open: () => void, close: () => void, setValue: (value: number) => void, setSpeed: (speed: number) => void, setDone: (done: boolean) => void };
  let receiverProgressRef: { open: () => void, setValue: (value: number) => void, setSpeed: (speed: number) => void, setDone: (done: boolean) => void };

  let webrtc: WebRTC;
  let wsClient: WebSocketClient;

  onMount(() => {
    wsClient = new WebSocketClient(userProgressRef, acceptRef);
    webrtc = new WebRTC(wsClient.ws);
    
    wsClient.listen(store, setStore, webrtc);
    setStore('ws', wsClient.ws);

    wsClient.ws.addEventListener('message', handleWebSocketMessage);
  });

  createEffect(() => {
    if (webrtc) {
      webrtc.onmessage = handleWebRTCMessage;
    }
    if (store.ws) {
      store.ws.onclose = () => {
        console.log("WebSocket connection closed...")
      };
    }
    if (!store.file) userProgressRef?.close();
    if (acceptRef){
      wsClient.acceptRef = acceptRef;
    }
    if (userProgressRef) {
      wsClient.userProgressRef = userProgressRef;
    }
  });

  const handleWebSocketMessage = (event: MessageEvent) => {
    const data = JSON.parse(event.data);
    if (data.type === 'file-transfer-request') {
      handleFileTransferRequest(data);
    }
    // Handle other message types as needed
  };

  const handleFileTransferRequest = (data: any) => {
    setStore('targetId', data.senderId);
    setStore('file', {
      name: data.fileName,
      size: data.fileSize,
      type: data.fileType
    });
    acceptRef?.open();
  };

  const handleWebRTCMessage = (e: any) => {
    if (e.type === "progress") {
      setStore("progress", e.data);
      updateProgress(e.data, e.speed);
    } else if (e.type === "fileReceived") {
      setProgressDone();
    }
  };

  const updateProgress = (value: number, speed: number) => {
    userProgressRef?.setValue(value);
    userProgressRef?.setSpeed(speed);
    receiverProgressRef?.setValue(value);
    receiverProgressRef?.setSpeed(speed);
  };

  const setProgressDone = () => {
    userProgressRef?.setDone(true);
    receiverProgressRef?.setDone(true);
    acceptRef?.close();
  };

  const onInvite = (targetId: string) => {
    const { ws, userId, file, shareId } = store;
    if (!file) {
      alert("Please select a file");
      return;
    }
    ws?.send(JSON.stringify({
      type: "accept-request",
      userId,
      target: targetId,
      shareId,
      accepted: false,
      file: {
        name: (file as File).name,
        size: (file as File).size,
        type: (file as File).type,
      }
    }));
  };

  const onAccept = async () => {
    webrtc.fileReceiver = new LargeFileReceiver((store.file as any)?.name || "test");
    await webrtc.fileReceiver.start();
    receiverProgressRef?.open();
    receiverProgressRef.setDone(false);
    receiverProgressRef.setValue(0)
    const { ws, userId, targetId, shareId } = store;
    ws?.send(JSON.stringify({
      type: "request-status",
      userId,
      target: targetId,
      shareId,
      status: "accepted"
    }));
    acceptRef?.close();
  };

  const onDecline = () => {
    const { ws, userId, shareId } = store;
    ws?.send(JSON.stringify({
      type: "request-status",
      userId,
      target: userId,
      shareId,
      status: "declined"
    }));
    acceptRef?.close();
  };

  return (
    <div class='container mx-auto text-center mt-2'>
      <Header store={store} setStore={setStore} />
      <div class="flex flex-auto w-full">
        {store.role === "sender" && (
          <div id="sender" class='w-full'>
            <Upload setStore={setStore} store={store}>
              <ProgressBar ref={(r: any) => userProgressRef = r} />
            </Upload>
            <div id="receiver-list" class='w-full container mt-4 flex flex-wrap justify-center'>
              {store.userIds.map(user => (
                <div class='bg-gradient-to-r from-gray-600 to-gray-900 min-w-[20%] max-w-[100%] m-4 p-0.5 rounded-lg hover:from-gray-100 hover:to-gray-600 transition duration-300'>
                  <button 
                    onClick={() => onInvite(user)}
                    class='w-full h-full py-3 px-4 bg-black rounded-md flex items-center justify-center text-gray-300 hover:text-white font-medium transition duration-300'
                  >
                    <span class='mr-2'>Transfer to {user.toLocaleUpperCase()}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            {store.userIds.length === 0 && <div class='m-2'>Wait for user join</div>}
            <Copy text={`${location.origin}/?s=${store.shareId}`} onCopy={() => console.log('Copied!')}>
              <p class="text-gray-400">{`${location.origin}/?s=${store.shareId}`}</p>
            </Copy>
          </div>
        )}
      </div>
      {store.role === "receiver" && (
        <div id="receivers" class='w-full container mt-4'>
          <Receiver file={store.file}>
            <ProgressBar ref={(r: any) => receiverProgressRef = r} />
          </Receiver>
        </div>
      )}
      <AcceptBanner ref={el => acceptRef = el} onAccept={onAccept} onDecline={onDecline} user={store.targetId} />
    </div>
  );
};

export default App;