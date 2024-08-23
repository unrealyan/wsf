import { createEffect, createSignal, onMount, Show, type Component,batch } from 'solid-js';
import { createStore } from "solid-js/store";
import Upload from './components/upload';
import WebRTC from './lib/webrtc';
import LargeFileReceiver from './lib/largeFileReceiver';
import AcceptBanner from './components/acceptBanner';
import Header from './components/header';
import ProgressBar from "./components/progress/progress";
import Receiver from './boards/reciever';
import Copy from './components/copy';
import WebSocketClient from './lib/webSocket';
import StatisticsManager from './components/statisticsManager';
import UserListContainer,{User} from './boards/userlist';
import Desc from './components/desc';
import { useStore ,StateType,StoreType} from './lib/store';



const urlSP = new URLSearchParams(window.location.search);

interface SendFile {
  name:string;
  size:number;
  type:string;
}
const App: Component = () => {
  const [state,action]:StoreType = useStore();

  console.log(state)

  const [store, setStore] = createStore<StateType>({
    userId: "",
    userType:"",
    targetId: "",
    userIds: [],
    userList:[],
    file: null,
    shareId: "",
    searchParam: urlSP,
    progress: 0,
    fileStream: null,
    ws: null,
    role: urlSP.get("s") ? "receiver" : "sender",
    totalFiles: 0,
    totalSize: 0
  });

  let acceptRef: { open: () => void, close: () => void };
  let userProgressRef: { open: () => void, close: () => void, setValue: (value: number) => void, setSpeed: (speed: number) => void, setDone: (done: boolean) => void };
  let receiverProgressRef: { open: () => void, close: () => void, setValue: (value: number) => void, setSpeed: (speed: number) => void, setDone: (done: boolean) => void, status: boolean };

  let webrtc: WebRTC;
  let wsClient: WebSocketClient;

  const [isInviting, setIsInviting] = createSignal(false);

  onMount(() => {
    batch(()=>{
      action.setSearchParam(urlSP)
      action.setRole(urlSP.get("s") ? "receiver" : "sender")
    })
    wsClient = new WebSocketClient(userProgressRef, acceptRef);
    webrtc = new WebRTC(wsClient.ws);

    // wsClient.listen(store, setStore, webrtc);
    wsClient.listen(state, action, webrtc);
    setStore('ws', wsClient.ws);
    action.setWebSocket(wsClient.ws)

    wsClient.ws.addEventListener('message', handleWebSocketMessage);
  });


  createEffect(() => {

    if (webrtc) {
      webrtc.onmessage = handleWebRTCMessage;
    }
    if (state.ws) {
      state.ws.onclose = () => {
        console.log("WebSocket connection closed...")
      };
    }
    if (!state.file) userProgressRef?.close();
    if (acceptRef) {
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
      // receiverProgressRef
    }
    // Handle other message types as needed
  };

  const handleFileTransferRequest = (data: any) => {
    action.setTargetId(data.senderId)
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
    } else if (e.type === "transferStart") {
      resetProgress();
    }
  };

  const updateProgress = (value: number, speed: number) => {
    userProgressRef?.setValue(value);
    userProgressRef?.setSpeed(speed);
    receiverProgressRef?.setValue(value);
    receiverProgressRef?.setSpeed(speed);
  };

  const resetProgress = () => {
    userProgressRef?.setDone(false);
    userProgressRef?.setValue(0);
    userProgressRef?.setSpeed(0);
    receiverProgressRef?.setDone(false);
    receiverProgressRef?.setValue(0);
    receiverProgressRef?.setSpeed(0);
  };

  const setProgressDone = () => {
    userProgressRef?.setDone(true);
    receiverProgressRef?.setDone(true);
    acceptRef?.close();
  };


  const onInvite = (targetId: string) => {
    if (isInviting()) return; // If already inviting, return
    setIsInviting(true);

    const { ws, userId, file, shareId } = store;
    if (!file) {
      alert("Please select a file");
      setIsInviting(false);
      return;
    }
    if (file.size == 0) {
      alert("The selected file 0 size");
      setIsInviting(false);
      return;
    }

    // Reset progress bar status
    userProgressRef?.setDone(false);
    userProgressRef?.setValue(0);
    userProgressRef?.setSpeed(0);

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

    // Set a short delay to prevent rapid consecutive clicks
    setTimeout(() => {
      setIsInviting(false);
    }, 2000); // Reset status after 2 seconds
  };

  const onAccept = async () => {
    webrtc.fileReceiver = new LargeFileReceiver((store.file as any)?.name || "test");
    await webrtc.fileReceiver.start();
    receiverProgressRef?.open();
    receiverProgressRef?.setDone(false);

    const { ws, userId, targetId, shareId } = state;
    ws?.send(JSON.stringify({
      type: "request-status",
      userId,
      target: targetId,
      shareId,
      status: "accepted",
      filename: state.file?.name,
      size: state.file?.size
    }));
    acceptRef?.close();

  };

  const onDecline = () => {
    const { ws, userId, shareId, targetId } = store;
    ws?.send(JSON.stringify({
      type: "request-status",
      userId,
      target: targetId,
      shareId,
      status: "declined"
    }));
    acceptRef?.close();
  };

  return (
    <div class='container mx-auto mt-2 px-4 sm:px-4 lg:px-4'>

      <Header store={store} setStore={setStore} />
      <div class={`main flex`}>
        <div class={`${store.userIds.length > 0 ? 'w-[70%]' : 'w-full'}`}>
          <Desc />
          <div class="flex flex-auto w-full text-center">
            {store.role === "sender" && (
              <div id="sender" class='w-full'>
                <Upload setStore={setStore} store={store}>
                  <ProgressBar ref={(r: any) => userProgressRef = r} />
                </Upload>
                {/* <div id="receiver-list" class='w-full container mt-4 flex flex-wrap justify-center'>
                  {store.userIds.map(user => (
                    <div class='bg-gradient-to-r from-gray-600 to-gray-900 min-w-[20%] max-w-[100%] m-4 p-0.5 rounded-lg hover:from-gray-100 hover:to-gray-600 transition duration-300'>
                      <button
                        onClick={() => onInvite(user)}
                        disabled={isInviting()}
                        class={`w-full h-full py-3 px-4 bg-black rounded-md flex items-center justify-center text-gray-300 hover:text-white font-medium transition duration-300 ${isInviting() ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span class='mr-2'>Transfer to {user.toLocaleUpperCase()}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div> */}

              </div>
            )}
          </div>
        </div>
        <Show when={state.userList.length > 0}>
          <div class={`sider w-[30%] overflow`}>
            <UserListContainer userList={state.userList} store={store}/>
          </div>
        </Show>

      </div>

      {state.userIds.length === 0 && <div class='m-2 text-white text-center'>Wait for user join</div>}
      <Copy text={`${location.origin}/?s=${state.shareId}`} onCopy={() => console.log('Copied!')}>
        <p class="text-gray-400">{`${location.origin}/?s=${state.shareId}`}</p>
      </Copy>


      <AcceptBanner ref={el => acceptRef = el} onAccept={onAccept} onDecline={onDecline} user={store.targetId} />
      <StatisticsManager totalSize={state.totalSize} totalFiles={state.totalFiles} />
    </div>
  );
};

export default App;