import { createEffect, createSignal, For } from "solid-js";
import UserItem from "../components/userItem";
import WebRTCImpl from '../lib/webrtc';
import { createStore } from "solid-js/store";
import WebSocketClient, { StoreType } from "../lib/webSocket";
import { Peer, useStore } from "../lib/store";
import {WSFWebRTC} from "../lib/wsfrtc/webrtc";

interface UserListContainerProps {
    userList: Peer[];
    // store: StoreType;
}
export interface User {
    id: string;
    filename: string;
    progress: number;
    speed: number;
    start: boolean;
    receiverSize:number;
    webrtc?: WSFWebRTC | null
}
interface UserListStore {
    userList: Peer[]
}
export default function UserListContainer(props: UserListContainerProps) {
    const [state, action] = useStore()

    const [store, setStore] = createStore<UserListStore>({ userList: [] })

    createEffect(() => {

        let userlist: Peer[] = state.userList.map((user: Peer) => {
            let storeUser = store.userList.find(su => su.id === user.id);

            // 如果用户不存在于列表中，添加新用户
            if (!storeUser) {

                return {
                    ...user,
                    filename: state.file?.name || "",
                    fileSize: state.file?.size || 0,
                };
            }
            return storeUser; // 返回已存在的用户
        }).filter(user => user !== undefined); // 过滤掉未定义的用户

        // 找出在 store.userList 中但不在 props.userList 中的用户
        const removedUsers = store.userList.filter(storeUser =>
            !state.userList.map((user: Peer) => user.id).includes(storeUser.id)
        );
        // 处理移除的用户（例如，可以在这里更新状态）
        userlist = userlist?.filter((user: Peer) => {
            if (!removedUsers.includes(user)) { return true }
        }) ?? [];

        // 使用 JSON.stringify 比较两个数组
        const isUserListChanged = JSON.stringify(state.userList) !== JSON.stringify(userlist);


        if (isUserListChanged && state.file?.name) {
            // setStore("userList", userlist);
            action.setUserList(userlist)
            onInvite()

        }
    }, [props.userList, state.file?.name]);



    const onInvite = () => {
        console.log("oninvite")
        // state.userList.forEach(user => {
        //     state.ws?.send(JSON.stringify({
        //         type: "accept-request",
        //         userId: state.userId,
        //         target: user.id,
        //         shareId: state.shareId,
        //         accepted: false,
        //         file: {name:state.file?.name,size:state.file?.size}
        //     }));
        // })
    }

    const initiateWebrtc = () => {
        // state.userList.forEach(user => {
        //     state.ws?.send(JSON.stringify({
        //         type: "accept-request",
        //         userId: state.userId,
        //         target: user.id,
        //         shareId: state.shareId,
        //         accepted: false,
        //         file: state.file
        //     }));
        // })
    }

    return <For each={props.userList} fallback={<div>Loading...</div>}>
        {(user: Peer, index) => <UserItem
            key={`${user.id}-${user.filename}-${index()}`}
            userId={user.id}
            filename={user.filename}
            progress={user.progress}
            fileSize={user.fileSize}
            handleFileSize={user.handleFileSize}
            receiverSize={user.receiverSize}
            speed={user.speed}
        />}
    </For>
}