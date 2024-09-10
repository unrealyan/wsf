import { createEffect, createSignal, onMount, Show, type Component, batch } from 'solid-js';
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
import UserListContainer, { User } from './boards/userlist';
import Desc from './components/desc';
import { useStore, StateType, StoreType, IReceiver, StoreManager } from './lib/store';
import WebRTCImpl from './lib/webrtc';
import Sender from './boards/sender'
import { WebRTCReceiver } from './lib/mywebrtc';

import WSClient from "./lib/wsfws/webSocket";


const urlSP = new URLSearchParams(window.location.search);

interface SendFile {
  name: string;
  size: number;
  type: string;
}
const App: Component = () => {
  const [state, action]: StoreType = useStore();


  const [,] = createSignal(new StoreManager({ state, action }))

  onMount(() => {
    batch(() => {
      action.setSearchParam(urlSP)
      action.setRole(urlSP.get("s") ? "receiver" : "sender")
    })

    WSClient.on("GET_STATISTICS",getStatistics)

  });

  const getStatistics=({totalFiles,totalSize}:{totalFiles:number,totalSize:number})=>{
    batch(()=>{
      action.setTotalFiles(totalFiles)
      action.setTotalSize(totalSize)
    })
  }


  return (
    <div class='container mx-auto mt-2 px-4 sm:px-4 lg:px-4'>

      <Header />
      <div class={`main flex`}>
        <div class={`${state.userIds.length > 0 ? 'w-[70%]' : 'w-full'}`}>
          <Desc />
          <div class="flex flex-auto w-full text-center">
            <Show when={state.role === "sender"}>
              <div id="sender" class='w-full'>
                <Sender />
              </div>
            </Show>

          </div>
        </div>
        <Show when={state.userList.length > 0}>
          <div class={`sider w-[30%] overflow`}>
            <UserListContainer userList={state.userList} />
          </div>
        </Show>

      </div>

      <Show when={state.role === "sender"}>
        <div class='m-2 text-white text-center'>Wait for user join</div>
        <Copy text={`${location.origin}/?s=${state.shareId}`} onCopy={() => console.log('Copied!')}>
          <p class="text-gray-400">{`${location.origin}/?s=${state.shareId}`}</p>
        </Copy>
      </Show>


      {state.role === "receiver" && (
        <div id="receivers" class='w-full container mt-4'>
          <Receiver file={state.file} />
        </div>
      )}

      <StatisticsManager totalSize={state.totalSize} totalFiles={state.totalFiles} />
    </div>
  );
};

export default App;