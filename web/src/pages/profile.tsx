import { createSignal, onMount } from "solid-js";
import Header from "../components/header";
import Tables from "../components/tables";
import InfiniteScroll from "../components/list";
import { FaSolidFile, FaSolidFileZipper, FaSolidFileImage, FaSolidFileAudio, FaSolidFileVideo } from 'solid-icons/fa'
import WSFApiClient from "../api/apiClient";
import { formatBytes } from "../lib/fileUtil";
import { UploadRecord } from "../types/uploads";

export default function Profile() {
  
    const [page,setPage] = createSignal(1)
    const [pageSize,setPageSize] = createSignal(10)
    const [list,setList] = createSignal<UploadRecord[]>([])

    // const [items, setItems] = createSignal<any[]>(senerData.body);
    const [hasMore, setHasMore] = createSignal(true);

    onMount(()=>{
        findList()
    })

    const findList = async () => {
        try {
            const res: any = await WSFApiClient.get("/uploads", { page: page(), pageSize: pageSize() });
            if (res.Records && res.Records.length > 0) {
                setList((prev:UploadRecord[]) => [...prev, ...res.Records]);
                setPage(page() + 1);
                setHasMore(res.Records.length === pageSize());
            } else {
                setHasMore(false);
            }
        } catch (error) {
            console.error("获取上传记录失败:", error);
            setHasMore(false);
        }
    };

    const loadMore = async () => {
        await findList()
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

    const renderItem = <T extends UploadRecord,>(item:T) => (
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
                    <span class="text-gray-400">用户名:</span> {item.sender_id}
                </div>
                <div>
                    <span class="text-gray-400">文件大小:</span> {formatBytes(Number(item.filesize))} 字节
                </div>
                <div>
                    <span class="text-gray-400">接收者:</span> {item.receiver_id}
                </div>
                <div class="col-span-2">
                    <span class="text-gray-400">时间:</span> {item.send_time}
                </div>
            </div>
        </div>
    )

    return <div id="profile" class='container mx-auto mt-2 px-4 sm:px-4 lg:px-4'>
        <Header />
        <div id="sender_files" class="mt-4 text-yellow-50">
            {/* <Tables {...senerData}/> */}
            <InfiniteScroll
                items={list()}
                renderItem={renderItem}
                loadMore={loadMore}
                hasMore={hasMore()}
                loader={<div class="text-yellow-50">正在加载更多...</div>}
            />
        </div>
    </div>
}