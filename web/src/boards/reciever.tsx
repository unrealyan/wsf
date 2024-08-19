import { createSignal } from "solid-js"
import {formatBytes} from "../lib/fileUtil"

export default function Reciever(props:any){
    return <div class="col-span-full w-[90%] bg-white p-10 mt-8 mr-auto ml-auto rounded">
    <label for="cover-photo" class="block font-medium leading-6 text-gray-900 text-2xl m-10">WebRTC File Sharing</label>
    <div data-progress="45%" class="m-4 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-6 relative">
        {props.file ? <div class="">
            <p class="h-12 flex justify-center items-center">
                <span class="text-gray-800">{props.file?.name}</span>
                 <span class="text-gray-400 ml-4">{formatBytes(props.file?.size||0)}</span>
                </p>
        </div> :
            <div>Wait for user send file</div>
        }
    </div>
    {props.children}
</div>
}