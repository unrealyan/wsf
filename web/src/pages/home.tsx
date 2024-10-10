import { createEffect, createSignal, onMount, Show, type Component, batch } from 'solid-js';
import { createStore } from "solid-js/store";
import Upload from '../components/upload';
import LargeFileReceiver from '../lib/largeFileReceiver';
import AcceptBanner from '../components/acceptBanner';
import Header from '../components/header';
import ProgressBar from "../components/progress/progress";
import Receiver from '../boards/reciever';
import Copy from '../components/copy';
import StatisticsManager from '../components/statisticsManager';
import UserListContainer, { User } from '../boards/userlist';
import Desc from '../components/desc';
import { useStore, StateType, StoreType, IReceiver, StoreManager } from '../lib/store';
import Sender from '../boards/sender'

import WSClient from "../lib/wsfws/webSocket";
import { useLocation } from "@solidjs/router";
import ErrorMessage from '../components/alertBar/error';


const urlSP = new URLSearchParams(window.location.search);

interface SendFile {
  name: string;
  size: number;
  type: string;
}
const App: Component = () => {
  const [state, action,{addNotification}]: StoreType = useStore();


  // const [,] = createSignal(new StoreManager({ state, action }))

  const location:any = useLocation();
  if (location.state) {
    console.log(location.state)
    // const message = location.state?.message;
    action.setAlertMsg(location.state)
  }


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
        <Show when={state.receivers.length > 0}>
          <div class={`sider w-[30%] overflow`}>
            <UserListContainer userList={state.receivers} />
          </div>
        </Show>

      </div>

      


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