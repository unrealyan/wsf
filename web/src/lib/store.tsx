import { createStore } from 'solid-js/store';
import { Accessor, Component, createContext, createSignal, useContext } from 'solid-js';

import WSFWebRTCImpl,{ WSFWebRTC } from './wsfrtc/webrtc';

export type UserInfo = {
  id:number|string
  user_id:string
  name: string
  given_name: string
  family_name: string
  picture: string
}

export type AlertMessage = {
  type:string;
  message:string;
}

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

export interface Upload {
  disable:boolean
}


export interface ISender extends User {
  // Additional properties specific to Receiver can be added here
  webrtc?: WSFWebRTCImpl | null
}

export interface IReceiver extends User {
  // Additional properties specific to Receiver can be added here
  webrtc?: WSFWebRTCImpl | null
}
export type Receiver = {
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

export type OfflineType = {
  status:boolean
  message:string
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
  ws: WSFWebRTCImpl | null;
  role: "sender" | "receiver";
  totalFiles: number;
  totalSize: number;
  upload:Upload;
  sender: ISender;
  reciever: IReceiver;
  receivers: Receiver[];
  offline:OfflineType;
  isSahre:boolean;
  userInfo:UserInfo|null;
  alertMsg:AlertMessage|null;
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
  setWebSocket: (ws: WSFWebRTCImpl | null) => void;
  setRole: (role: "sender" | "receiver") => void;
  setTotalFiles: (total: number) => void;
  setTotalSize: (size: number) => void;
  setUpload:(upload:Upload) => void;
  setReciver: (user: IReceiver) => void;
  setReceivers: (receivers: Receiver[]) => void;
  updateState: (newState: Partial<StateType>) => void;
  setOffline:(offline:OfflineType) => void;
  setIsShare:(isShare:boolean)=>void;
  setUserInfo:(userInfo:UserInfo)=>void;
  setAlertMsg:(msg:AlertMessage)=>void;
}

export type StoreType = [
  state: StateType,
  action: ActionType,
  notice:{
    [x: string]: any;
    notification:Accessor<Notification>,
    addNotification:(message:string)=>void
  },
]

export type Notification = {
  id:number
  message:string
}

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
    upload:{
      disable:false
    },
  
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
    },
    receivers:[],
    offline:{status:false,message:""},
    isSahre:false,
    userInfo:null,
    alertMsg:{
      type:"",
      message:""
    },
  });

  const [notification,setNotification ]= createSignal<Notification>({id:Date.now(),message:""})

  const addNotification = (message:string)=>{
    const newNotification = { id: Date.now(), message };
    setNotification(newNotification);
  }

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
      setWebSocket: (ws: WSFWebRTCImpl | null) => setState('ws', ws),
      setRole: (role: "sender" | "receiver") => setState('role', role),
      setTotalFiles: (total: number) => setState('totalFiles', total),
      setTotalSize: (size: number) => setState('totalSize', size),
      setUpload:(upload:Upload) => setState('upload',upload),
      setReciver: (user: IReceiver) => setState('reciever', user),
      setReceivers: (receivers: Receiver[]) => setState('receivers', receivers),
      updateState: updateState,
      setOffline:(offline:OfflineType) => setState('offline',offline),
      setIsShare:(isShare:boolean)=>setState("isSahre",isShare),
      setUserInfo:(userInfo:UserInfo)=>setState("userInfo",userInfo),
      setAlertMsg:(msg:AlertMessage)=>setState("alertMsg",msg)
    },
    {notification,addNotification},
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
  public state: StateType;
  public action: ActionType;

  constructor({ state, action }: { state: StateType; action: ActionType }) {
    this.state = state;
    this.action = action;
  }


}

export class UploadStoreManager extends StoreManager {
  constructor(state: any, action: any) {
    super({ state, action });
    // this.eventManager.subscribe("CHANGE_FILES", this.handleOnChangeFiles.bind(this))
  }
}

export class SenderStoreManager extends StoreManager {
  public webrtc!: WSFWebRTCImpl
  constructor(state: any, action: any) {
    super({ state, action });

  }


 

}

export class ReceiverStoreManager extends StoreManager {
  public webrtc!: WSFWebRTCImpl
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
      // this.state.ws?.sendAnswer(data)
    }, rej => {
      console.log(rej)
    })
  }

}