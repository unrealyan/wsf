import { createSignal } from "solid-js";
import Header from "../components/header";
import Tables from "../components/tables";
import InfiniteScroll from "../components/list";
import { FaSolidFile, FaSolidFileZipper, FaSolidFileImage, FaSolidFileAudio, FaSolidFileVideo } from 'solid-icons/fa'
import WSFApiClient from "../api/apiClient";

export default function Profile() {
    const senerData = {
        heads: ["id", "username", "filename", "fileSize", "receiver", "time"],
        body: [
            { id: 1, username: "hey", filename: "test.zip", fileSize: 10000, receiver: "bella", time: "2024-09-09" },
            { id: 2, username: "hey", filename: "test.txt", fileSize: 10000, receiver: "bella", time: "2024-09-09" },
            { id: 3, username: "hey", filename: "test.gif", fileSize: 10000, receiver: "bella", time: "2024-09-09" },
            { id: 4, username: "hey", filename: "test.zip", fileSize: 10000, receiver: "bella", time: "2024-09-09" },
            { id: 5, username: "hey", filename: "test.zip", fileSize: 10000, receiver: "bella", time: "2024-09-09" },
            { id: 6, username: "hey", filename: "test.zip", fileSize: 10000, receiver: "bella", time: "2024-09-09" },
            { id: 7, username: "hey", filename: "test.zip", fileSize: 10000, receiver: "bella", time: "2024-09-09" },
            { id: 8, username: "hey", filename: "test.zip", fileSize: 10000, receiver: "bella", time: "2024-09-09" },
            { id: 9, username: "hey", filename: "test.zip", fileSize: 10000, receiver: "bella", time: "2024-09-09" },
            { id: 10, username: "hey", filename: "test.zip", fileSize: 10000, receiver: "bella", time: "2024-09-09" },
        ]
    }
    const receiverData = {
        items:[
            { id: 1, username: "hey", filename: "test.zip", fileSize: 10000, receiver: "bella", time: "2024-09-09" },
            { id: 2, username: "hey", filename: "test.txt", fileSize: 10000, receiver: "bella", time: "2024-09-09" },
            { id: 3, username: "hey", filename: "test.word", fileSize: 10000, receiver: "bella", time: "2024-09-09" },
            { id: 4, username: "hey", filename: "test.exe", fileSize: 10000, receiver: "bella", time: "2024-09-09" },
            { id: 5, username: "hey", filename: "test.mp3", fileSize: 10000, receiver: "bella", time: "2024-09-09" },
            { id: 6, username: "hey", filename: "test.zip", fileSize: 10000, receiver: "bella", time: "2024-09-09" },
            { id: 7, username: "hey", filename: "test.zip", fileSize: 10000, receiver: "bella", time: "2024-09-09" },
        ],
        renderItem:(item:string)=><div>{item}</div>
    }

    const [items, setItems] = createSignal<any[]>(senerData.body);
    const [hasMore, setHasMore] = createSignal(true);

    const loadMore = () => {
        WSFApiClient.get("/uploads").then(res=>{
            console.log(res)
        })
        // const newItems = senerData.body.map((item,key)=>{item.id=item.id+key+1; return item})
        // setTimeout(()=>{
        //     setItems([...items(), ...newItems]);
        // },2000)
        // if (items().length >= 200) {
        //     setHasMore(false);
        // }
    };

    const getFileIcon = (filename: string) => {
        const extension = filename.split('.').pop()?.toLowerCase();
        switch (extension) {
            case 'zip':
            case 'rar':
            case '7z':
                return <FaSolidFileZipper />;
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif':
                return <FaSolidFileImage />;
            case 'mp3':
            case 'wav':
            case 'ogg':
                return <FaSolidFileAudio />;
            case 'mp4':
            case 'avi':
            case 'mov':
                return <FaSolidFileVideo />;
            default:
                return <FaSolidFile />;
        }
    };

    const renderItem = <T extends {[key:string]:string|number},>(item:T) => (
        <div class="bg-gray-800 rounded-lg shadow-md p-4 mb-4 text-white">
            <div class="flex items-center mb-2">
                <span class="text-2xl mr-3">{getFileIcon(item.filename as string)}</span>
                <span class="text-xl font-semibold">{item.filename}</span>
            </div>
            <div class="grid grid-cols-2 gap-2">
                <div>
                    <span class="text-gray-400">ID:</span> {item.id}
                </div>
                <div>
                    <span class="text-gray-400">用户名:</span> {item.username}
                </div>
                <div>
                    <span class="text-gray-400">文件大小:</span> {item.fileSize} 字节
                </div>
                <div>
                    <span class="text-gray-400">接收者:</span> {item.receiver}
                </div>
                <div class="col-span-2">
                    <span class="text-gray-400">时间:</span> {item.time}
                </div>
            </div>
        </div>
    )

    return <div id="profile" class='container mx-auto mt-2 px-4 sm:px-4 lg:px-4'>
        <Header />
        <div id="sender_files" class="mt-4 text-yellow-50">
            {/* <Tables {...senerData}/> */}
            <InfiniteScroll
                items={items()}
                renderItem={renderItem}
                loadMore={loadMore}
                hasMore={hasMore()}
                loader={<div>正在加载更多...</div>}
            />
        </div>
    </div>
}