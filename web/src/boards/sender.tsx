import { createStore, type SetStoreFunction, type Store } from "solid-js/store";
import Upload from '../components/upload';

export default function Sender<Store, SetStoreFunction>(props:
    { store: Store, setStore: SetStoreFunction, send: () => void }) {
    const { store, setStore, send } = props
    return <>
        <Upload setStore={setStore} store={store} />
        <div id="send" class='w-full container mt-4 bg-slate-300'>
            <button onClick={send}>Send</button>
        </div>
        <div id="recievers" class='w-full container mt-4 bg-slate-300'>
          {
            store.userIds.map(user => <div>{user}: <button onClick={() => acceptRequest(user)}>Accept Request</button></div>)
          }

        </div>
    </>

}