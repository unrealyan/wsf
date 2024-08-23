import { createEffect, createSignal, For } from "solid-js";
import UserItem from "../components/userItem";
import WebRTC from '../lib/webrtc';
import { createStore } from "solid-js/store";
import WebSocketClient, { StoreType } from "../lib/webSocket";
import { useStore } from "../lib/store";

interface UserListContainerProps {
    userList: User[];
    store: StoreType;
}
export interface User {
    id: string;
    filename: string;
    progress: number;
    speed: number;
    start: boolean;
    webrtc?: WebRTC | null
}
interface UserListStore {
    userList: User[]
}
export default function UserListContainer(props: UserListContainerProps) {
    const [state, action] = useStore()

    const [store, setStore] = createStore<UserListStore>({ userList: [] })

    createEffect(() => {
        console.log(props.userList)
        let userlist: User[] = state.userList.map((user: User) => {
            let storeUser = store.userList.find(su => su.id === user.id);

            // 如果用户不存在于列表中，添加新用户
            if (!storeUser) {
                console.log(state.file)
                return {
                    id: user.id,
                    filename: state.file?.name || "",
                    progress: 0,
                    speed: 0,
                    start: false
                };
            }
            return storeUser; // 返回已存在的用户
        }).filter(user => user !== undefined); // 过滤掉未定义的用户

        // 找出在 store.userList 中但不在 props.userList 中的用户
        const removedUsers = store.userList.filter(storeUser =>
            !state.userList.map((user: User) => user.id).includes(storeUser.id)
        );
        // 处理移除的用户（例如，可以在这里更新状态）
        userlist = userlist?.filter((user: User) => {
            if (!removedUsers.includes(user)) { return true }
        }) ?? [];

        // 使用 JSON.stringify 比较两个数组
        const isUserListChanged = JSON.stringify(state.userList) !== JSON.stringify(userlist);


        if (isUserListChanged) {
            // setStore("userList", userlist);
            action.setUserList(userlist)
            onInvite()

        }
    }, [props.userList, state.file?.name]);



    const onInvite = () => {
        console.log("oninvite")
        state.userList.forEach(user => {
            state.ws?.send(JSON.stringify({
                type: "accept-request",
                userId: state.userId,
                target: user.id,
                shareId: state.shareId,
                accepted: false,
                file: {name:state.file?.name,size:state.file?.size}
            }));
        })
    }

    const initiateWebrtc = () => {
        state.userList.forEach(user => {
            state.ws?.send(JSON.stringify({
                type: "accept-request",
                userId: state.userId,
                target: user.id,
                shareId: state.shareId,
                accepted: false,
                file: state.file
            }));
        })
    }

    return <For each={props.userList} fallback={<div>Loading...</div>}>
        {(user: User, index) => <UserItem
            key={`${user.id}-${user.filename}-${index()}`}
            userId={user.id}
            filename={user.filename}
            progress={user.progress}
            speed={user.speed}
        />}
    </For>
}