import { createStore } from 'solid-js/store';
import { createContext, useContext } from 'solid-js';
import WebRTCImpl from './webrtc';
import { WebRTCReceiver, WebRTCSender } from './mywebrtc';
import WebSocketClient from './webSocket';
import { IWebSocket } from './mywebSocket';
import eventManager, { EventManager } from './eventManager';


export interface User {
  id: string;
  filename: string;
  progress: number;
  speed: number;
  start: boolean;
  // webrtc?: WebRTCSender |WebRTCSender| null
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
  userList: User[];
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
  setUserList: (list: User[]) => void;
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
      progress: 0,
      speed: 0,
      start: false
    },
    reciever: {
      id: "",
      filename: '',
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
      setUserList: (list: User[]) => setState('userList', list => [...list]),
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
  private eventManager: EventManager;
  private state: StateType;
  private action: ActionType;

  constructor({ state, action }: { state: StateType; action: ActionType }) {
    this.eventManager = eventManager;
    this.state = state;
    this.action = action;
    this.eventManager.subscribe("SET_USER_ID", this.handleSetUserId.bind(this))
    this.eventManager.subscribe("SET_SHARE_ID", this.handleSetShareId.bind(this))
    this.eventManager.subscribe("SET_STATS",this.handleSetStats.bind(this))
  }

  private handleSetUserId(userId: string) {
    console.log(userId)
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


}