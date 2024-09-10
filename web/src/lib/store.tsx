import { createStore } from 'solid-js/store';
import { createContext, useContext } from 'solid-js';
import WebRTCImpl from './webrtc';
import { WebRTCReceiver, WebRTCSender } from './mywebrtc';
import WebSocketClient from './webSocket';
import { IWebSocket } from './mywebSocket';
import eventManager, { EventManager } from './eventManager';
import { off } from 'process';
import { error } from 'console';
import { WSFWebRTC } from './wsfrtc/webrtc';


export interface User {
  id: string;
  filename: string;
  fileSize:number,
  handleFileSize: number;
  progress: number;
  speed: number;
  start: boolean;
  // webrtc?: WebRTCSender |WebRTCSender| null
}

export interface Peer {
  id: string;
  filename: string;
  fileSize:number,
  handleFileSize: number;
  receiverSize: number;
  progress: number;
  speed: number;
  start: boolean;
  webrtc?: WSFWebRTC | null
}


export interface ISender extends User {
  // Additional properties specific to Receiver can be added here
  webrtc?: WebRTCSender | null
}

export interface IReceiver extends User {
  // Additional properties specific to Receiver can be added here
  webrtc?: WebRTCReceiver | null
}

// 定义 Store 的类型
export interface StateType {
  userId: string;
  userType: string;
  targetId: string;
  userIds: string[];
  userList: Peer[];
  file: File | null;
  shareId: string;
  searchParam: URLSearchParams;
  progress: number;
  fileStream: Promise<any> | null;
  ws: IWebSocket | null;
  role: "sender" | "receiver";
  totalFiles: number;
  totalSize: number;
  sender: ISender;
  reciever: IReceiver;
}

export interface ActionType {
  setUserId: (id: string) => void;
  setUserType: (type: string) => void;
  setTargetId: (id: string) => void;
  addUserId: (id: string) => void;
  removeUserId: (id: string) => void;
  setUserList: (list: Peer[]) => void;
  setFile: (file: File | { name: string; size: number; type: string } | null) => void;
  setShareId: (id: string) => void;
  setSearchParam: (params: URLSearchParams) => void;
  setProgress: (progress: number) => void;
  setFileStream: (stream: Promise<any> | null) => void;
  setWebSocket: (ws: IWebSocket | null) => void;
  setRole: (role: "sender" | "receiver") => void;
  setTotalFiles: (total: number) => void;
  setTotalSize: (size: number) => void;
  setReciver: (user: IReceiver) => void;
  updateState: (newState: Partial<StateType>) => void;
}

export type StoreType = [
  state: StateType,
  action: ActionType
]

// 创建一个 Store 的上下文，指定类型
const StoreContext = createContext<StoreType | undefined>(undefined);

// 创建一个包含全局状态的 Store Provider
export default function StoreProvider(props: any) {
  const [state, setState] = createStore<StateType>({
    userId: '',
    userType: "SENDER",
    targetId: '',
    userIds: [],
    userList: [],
    file: null,
    shareId: '',
    searchParam: new URLSearchParams(),
    progress: 0,
    fileStream: null,
    ws: null,
    role: "sender", // 或 "receiver"
    totalFiles: 0,
    totalSize: 0,
    sender: {
      id: "",
      filename: '',
      fileSize:0,
      handleFileSize: 0,
      progress: 0,
      speed: 0,
      start: false
    },
    reciever: {
      id: "",
      filename: '',
      fileSize:0,
      handleFileSize: 0,
      progress: 0,
      speed: 0,
      start: false
    }
  });

  const updateState = (newState: Partial<StateType>) => {
    setState(prev => ({ ...prev, ...newState }));
  };

  const store: StoreType = [
    state,
    {
      setUserId: (id: string) => setState('userId', id),
      setUserType: (type: string) => setState('userType', type),
      setTargetId: (id: string) => setState('targetId', id),
      addUserId: (id: string) => setState('userIds', ids => [...ids, id]),
      removeUserId: (id: string) => setState('userIds', ids => ids.filter(uid => uid !== id)),
      setUserList: (list: Peer[]) => setState('userList', [...list]),
      setFile: (file: File | { name: string; size: number; type: string } | null) => setState('file', file),
      setShareId: (id: string) => setState('shareId', id),
      setSearchParam: (params: URLSearchParams) => setState('searchParam', params),
      setProgress: (progress: number) => setState('progress', progress),
      setFileStream: (stream: Promise<any> | null) => setState('fileStream', stream),
      setWebSocket: (ws: IWebSocket | null) => setState('ws', ws),
      setRole: (role: "sender" | "receiver") => setState('role', role),
      setTotalFiles: (total: number) => setState('totalFiles', total),
      setTotalSize: (size: number) => setState('totalSize', size),
      setReciver: (user: IReceiver) => setState('reciever', user),
      updateState: updateState,
    }
  ];

  return (
    <StoreContext.Provider value={store}>
      {props.children}
    </StoreContext.Provider>
  );
}

// 使用自定义 Hook 来访问 Store
export function useStore() {
  const context = useContext(StoreContext);

  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }

  // 返回 StoreType 以便解构
  return context as StoreType;
}

export class StoreManager {
  public eventManager: EventManager;
  public state: StateType;
  public action: ActionType;

  constructor({ state, action }: { state: StateType; action: ActionType }) {
    this.eventManager = eventManager;
    this.state = state;
    this.action = action;
    // this.eventManager.subscribe("SET_USER_ID", this.handleSetUserId.bind(this))
    // this.eventManager.subscribe("SET_SHARE_ID", this.handleSetShareId.bind(this))
    // this.eventManager.subscribe("SET_STATS", this.handleSetStats.bind(this))
    // this.eventManager.subscribe("SET_RECEIVERS", this.handleSetReceivers.bind(this))
  }

  private handleSetUserId(userId: string) {

    this.action.setUserId(userId)
  }

  private handleSetUserType(userType: string) {
    this.action.setUserType(userType)
  }

  private handleSetTargetId(targetId: string) {
    this.action.setTargetId(targetId)
  }

  private handleAddUserId(userId: string) {
    this.action.addUserId(userId)
  }

  private handleSetShareId(shareId: string) {
    this.action.setShareId(shareId)
  }

  private handleSetStats({ totalFiles, totalSize }: { totalFiles: number, totalSize: number }) {
    this.action.setTotalFiles(totalFiles)
    this.action.setTotalSize(totalSize)
  }

  private handleSetReceivers(userIds: string[]) {

    let users = userIds.map((id: string) => {
      let user: Peer = {
        id,
        filename: "",
        fileSize:0,
        handleFileSize: 0,
        receiverSize:0,
        start: false,
        progress: 0,
        speed: 0
      }
      return user
    })
    this.action.setUserList(users)
  }

}

export class UploadStoreManager extends StoreManager {
  constructor(state: any, action: any) {
    super({ state, action });
    // this.eventManager.subscribe("CHANGE_FILES", this.handleOnChangeFiles.bind(this))
  }

  private handleOnChangeFiles(file: File) {
    this.action.setFile(file)
  }
}

export class SenderStoreManager extends StoreManager {
  public webrtc!: WebRTCSender
  constructor(state: any, action: any) {
    super({ state, action });

    // this.eventManager.subscribe("START_WEBRTC", this.handleStartWebRTC.bind(this))
    // this.eventManager.subscribe("GET_ANSWER", this.handleSetAnswer.bind(this))
    // this.eventManager.subscribe("SEND_NEW_ICE_CANDIDATE", this.handleNewIceCandidate.bind(this))
    // this.eventManager.subscribe("SAVE_ICE_CANDIDATE", this.handleSaveIceCandidate.bind(this))
    // this.eventManager.subscribe("FILE_TRANSFER_START", this.handleFileTransferStart.bind(this))
  }

  private handleStartWebRTC() {
    // this.webrtc = new WebRTCSender()
    this.webrtc.createOffer().then(offer => {

      this.state.userList.forEach(user => {
        let data = JSON.stringify({
          name: this.state.userId,
          type: "offer",
          sdp: offer,
          target: user.id
        })
        this.state.ws?.sendOffer(data)
      })
      // this.webrtc.setLocalDescription(new RTCSessionDescription(offer))
    })
  }

  private handleSetAnswer(answer: RTCSessionDescription) {
    console.log("answer: ",answer)
    this.webrtc.addAnswer(answer).then(() => {
      // const file = new File(["foo"], "foo.txt", {
      //   type: "text/plain",
      // });
      // this.webrtc.sendFile(file)
    })
    // this.webrtc.setRemoteDescription(answer)

  }
  private handleNewIceCandidate(candidate: RTCIceCandidate) {
    this.state.userList.forEach(user=>{
      let data = JSON.stringify({
      type: "new-ice-candidate",
      target: user.id,
      candidate: candidate
    })
    this.state.ws?.sendCandidate(data)
    })
  }

  private handleSaveIceCandidate(candidate:RTCIceCandidate){
    this.webrtc.addIceCandidate(candidate)
  }

  private handleFileTransferStart({role}:any) {
    console.log(role)
    const file = new File(["foo"], "foo.txt", {
      type: "text/plain",
    });
    this.webrtc.sendFile(file)
  }
}

export class ReceiverStoreManager extends StoreManager {
  public webrtc!: WebRTCReceiver
  constructor(state: any, action: any) {
    super({ state, action });
    // this.eventManager.subscribe("SET_RECEIVER_ID", this.handleSetReceiverId.bind(this))
    // this.eventManager.subscribe("GET_OFFER", this.handleGetOffer.bind(this))
    // this.eventManager.subscribe("SEND_NEW_ICE_CANDIDATE", this.handleNewIceCandidate.bind(this))
    // this.eventManager.subscribe("SAVE_ICE_CANDIDATE", this.handleSaveIceCandidate.bind(this))
  }

  handleSetReceiverId(target: string) {
    this.action.setTargetId(target)
  }

  handleGetOffer(offer: RTCSessionDescription) {
    this.webrtc.acceptOffer(offer).then((answer) => {
      let data = JSON.stringify({
        name: this.state.userId,
        type: "answer",
        sdp: answer,
        target: this.state.targetId
      })
      this.state.ws?.sendAnswer(data)
    }, rej => {
      console.log(rej)
    })
  }
  private handleNewIceCandidate(candidate: RTCIceCandidate) {
    let data = JSON.stringify({
      type: "new-ice-candidate",
      target: this.state.targetId,
      candidate: candidate
    })
    this.state.ws?.sendCandidate(data)
  }

  private handleSaveIceCandidate(candidate:RTCIceCandidate){
    this.webrtc.addIceCandidate(candidate)
  }

}