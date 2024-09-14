import { For } from "solid-js";
import UserItem from "../components/userItem";
import { Peer } from "../lib/store";
import {WSFWebRTC} from "../lib/wsfrtc/webrtc";

interface UserListContainerProps {
    userList: Peer[];
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

export default function UserListContainer(props: UserListContainerProps) {

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