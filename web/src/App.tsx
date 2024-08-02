import { createEffect, createSignal, onMount, type Component } from 'solid-js';
import { createStore, type SetStoreFunction, type Store } from "solid-js/store";
import Upload from './components/upload';
import WebRTC from './lib/webrtc';
import LargeFileReceiver from './lib/largeFileReceiver';
import AcceptBanner from './components/acceptBanner';
import Header from './components/header';
import ProgressBar from "./components/progress/progress";
import Reciever from './boards/reciever';
import Copy from './components/copy';




const WEBSOCKET_URL = `ws://${location.hostname}:8895/ws`
let webrtc: WebRTC
let urlSP = new URLSearchParams(window.location.search)
const App: Component = () => {
  let [store, setStore] = createStore({
    userId: "",
    targetId: "",
    userIds: [],
    file: null,
    shareId: "",
    searchParam: urlSP,
    progress: 0,
    fileStream: Promise<any>,
    ws: new WebSocket(`${WEBSOCKET_URL}${urlSP.get("s") ? "?s=" + urlSP.get("s") : ""}`),
    role: "sender"
  })

  let acceotRef: {
    [x: string]: any; open: any; close: () => void;
  };


  let userProgressRef: {
    [x: string]: any; open: () => void;
  }
  let receiverProgressRef: {
    [x: string]: any; open: () => void;
  }

  onMount(() => {
    const { ws } = store;
    webrtc = new WebRTC(ws)
  })

  createEffect(() => {

    const { ws } = store;
    webrtc.onmessage = function (e: any) {
      if (e.type === "progress") {
        setStore("progress", () => e.data)
        userProgressRef?.setValue(e.data)
        userProgressRef?.setSpeed(e.speed)
        receiverProgressRef?.setValue(e.data)
        receiverProgressRef?.setSpeed(e.speed)
      } else if (e.type === "fileReceived") {
        userProgressRef?.setDone(true)
        receiverProgressRef?.setDone(true)
        acceotRef.close()
      }
    }

    if (store.searchParam.get("s")) {
      setStore("role", () => "receiver")
    }

    if (!store.file) {
      userProgressRef?.close()
    }


    ws.onclose = () => {
      console.log("WebSocket connection closed...");
    };
    ws.onmessage = (e) => {

      let data = JSON.parse(e.data);

      if (data.type === "user-id") {

        setStore("userId", () => data.userId)
        if (data.shareId) {
          setStore("shareId", () => data.shareId)
        }

        if (store.searchParam.get("s")) {
          ws.send(JSON.stringify({
            type: "receiver",
            userId: data.userId
          }))
        } else {
          ws.send(JSON.stringify({
            type: "sender",
            userId: data.userId
          }))
        }


      }

      if (data.type === "all-receivers") {
        setStore("userIds", () => data.userIds || [])
      }

      if (data.type === "join") {
        webrtc.createOffer(data.target, store, setStore);
      }

      if (data.type === "offer") {
        let sourceUserId = data.name;
        let offer = data.sdp;

        webrtc.createAnswer(sourceUserId, offer, setStore);
      }

      if (data.type === "answer") {
        let answer = data.sdp;
        webrtc.addAnswer(answer);
      }

      if (data.type === "new-ice-candidate") {
        const candidate = new RTCIceCandidate(data.candidate);
        webrtc.addIceCandidates(candidate);
      }

      if (data.type === "request-status") {
        if (data.status === "accepted") {
          userProgressRef.open()
          ws.send(JSON.stringify({
            type: "initiate",
            userId: store.userId,
            shareId: store.shareId,
            target: data.userId
          }));
        }
      }

      if (data.type === "accept-request") {
        setStore({
          file: data.file,
          targetId: data.userId
        })

        acceotRef.open()
      }
    }
  })


  const onInvite = (targetId: string) => {
    const { ws, userId, file } = store;
    if (file) {
      ws.send(JSON.stringify({
        type: "accept-request",
        userId: userId,
        target: targetId,
        shareId: store.shareId,
        accepted: false,
        file: {
          name: (file as unknown as File).name,
          size: (file as unknown as File).size,
          type: (file as unknown as File).type,
        }
      }));
    } else {
      alert("Please select a file")
    }

  }



  const onAccept = async () => {
    webrtc.fileReceiver = new LargeFileReceiver((store.file as any)?.name || "test")
    await webrtc.fileReceiver.start()
    receiverProgressRef.open()
    const { ws, userId, targetId } = store;

    ws.send(JSON.stringify({
      type: "request-status",
      userId: userId,
      target: targetId,
      shareId: store.shareId,
      status: "accepted"
    }));
    acceotRef.close()
  }

  const onDecline = () => {
    const { ws, userId } = store;
    ws.send(JSON.stringify({
      type: "request-status",
      userId: store.userId,
      target: userId,
      shareId: store.shareId,
      status: "declined"
    }));
    acceotRef.close()
  }

  return (
    <div class='container mx-auto text-center mt-2'>
      <Header store={store} setStore={setStore} />
      <div class="flex flex-auto w-full">
        {
          store.role === "sender" ? <div id="sender" class='w-full '>
            <Upload setStore={setStore} store={store}><ProgressBar ref={(r: any) => userProgressRef = r} /></Upload>
            <div id="receiver-list" class='w-full container mt-4 flex flex-wrap justify-center'>
              {
                store.userIds.map(user => <div class='bg-slate-300 min-w-[20%] max-w-[100%]  m-4 h-10 flex justify-center items-center'><button onClick={() => onInvite(user)}>Transfer to {user}</button></div>)
              }

            </div>
            {
              store.userIds.length == 0 ? <div class='m-2'>Wait for user join</div> : null
            }
            <Copy text={`${location.origin}/?s=${store.shareId}`} onCopy={() => console.log('Copied!')}>
              <p class="text-gray-400">{`${location.origin}/?s=${store.shareId}`}</p>
            </Copy>
          </div>
            : null
        }
      </div>

      {
        store.role === "receiver" ? <div id="receivers" class='w-full container mt-4'>
          <Reciever file={store.file}>
            <ProgressBar ref={(r: any) => receiverProgressRef = r} />
          </Reciever>

        </div> : null
      }
      <AcceptBanner ref={el => acceotRef = el} onAccept={() => onAccept()} onDecline={onDecline} user={store.targetId} />
    </div>
  );
};

export default App;
