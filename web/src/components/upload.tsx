import { createEffect, onMount } from "solid-js"
import { formatBytes } from "../lib/fileUtil";
import { useStore } from "../lib/store";

function Upload(props:any) {
    const [state,action] = useStore()
    let drapRef: HTMLDivElement

    createEffect(() => {
        if (drapRef) {
            drapRef.addEventListener("dragstart", dragStart)
            drapRef.addEventListener("dragover", dragOver)
            drapRef.addEventListener("drop", drop)
        }
    })

    const change = (event: any) => {
        let files = event.currentTarget.files
        // props.setStore("file", () => files[0])
        props.onFileUpload(files)
        action.setFile(files[0])
        action.setUserList(state.userList.map(user=>{
            let nuser = {...user,filename:files[0].name}
            return nuser
        }))
    }

    const dragStart = (event: any) => {
        console.log(event)
    }

    const dragOver = (event: any) => {
        console.log('File is inside the drag area');
        event.preventDefault()
        // event.stopPropagation()  

    }

    const drop = (event: any) => {
        console.log('File is dropped in drag area');
        event.preventDefault()

        if (event.dataTransfer.items) {
            [...event.dataTransfer.items].forEach((item, i) => {
                // If dropped items aren't files, reject them
                if (item.kind === "file") {
                    const file = item.getAsFile();
                    console.log(`… file[${i}].name = ${file.name}`);
                    // props.setStore("file", () => file)
                    action.setFile(file)
                    action.setUserList(state.userList.map((user:any)=>{
                        user.filename=file.name
                        return user
                    }))
                   
                }
            });

        }
    }

    const deleteFile = () =>{
        // props.setStore("file", () => null)
        action.setFile(null)
    }

    return (
        <div class="col-span-full w-[90%] bg-white p-10 mt-8 md:mt-0 mr-auto ml-auto rounded">
            <label for="cover-photo" class="block font-medium leading-6 text-gray-900 text-2xl m-10">WebRTC File Sharing</label>
            <div data-progress="45%" class="m-4 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-6 relative" ref={el => drapRef=el}>
                {state.file ? <div class="hover:cursor-pointer hover:text-gray-200" onClick={deleteFile} title="remove">
                    <p class="h-12 flex justify-center items-center">{state.file.name}<span class="text-gray-400 ml-4">{formatBytes(state.file?.size||0)}</span></p>
                    

                </div> :
                    <div class="text-center">
                        <svg class="mx-auto h-12 w-12 text-gray-300" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path fill-rule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clip-rule="evenodd" />
                        </svg>
                        <div class="mt-4 flex text-sm leading-6 text-gray-600">
                            <label for="file-upload" class="relative cursor-pointer rounded-md bg-white font-semibold text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 hover:text-indigo-500">
                                <span>Upload a file</span>
                                <input id="file-upload" name="file-upload" type="file" class="sr-only" onChange={(e) => change(e)} />
                            </label>
                            <p class="pl-1">or drag and drop</p>
                        </div>
                        <p class="text-xs leading-5 text-gray-600">any file</p>
                    </div>
                }
            </div>
            {props.children}

        </div>
    );
}

export default Upload