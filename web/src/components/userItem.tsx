import { Component, createEffect, createSignal, onMount } from 'solid-js';

interface UserItemProps {
  key:string;
  userId: string;
  filename: string;
  progress: number;
  speed: number; // 传输速度
}

export default function UserItem({ userId, filename, progress, speed }:UserItemProps){

    return (
        <div class='bg-gradient-to-r from-gray-600 to-gray-900 m-4 p-2 rounded-lg' data-file={`${userId}-${filename}`}>
          <h3 class='text-white'>{userId}</h3>
          {filename && <p class='text-gray-300 overflow-hidden text-ellipsis whitespace-nowrap'>File: {filename}</p>}
          {/* <p class='text-gray-300'>Progress: {progress}%</p> */}
          <p class='text-gray-300'>Speed: {speed} KB/s</p>
          <button 
            style={{ '--width': `${progress}%` }}
            class={`w-full relative 
                before:contents[' '] 
                before:w-[var(--width)]
                before:bg-slate-500 
                before:absolute 
                before:h-full 
                before:left-0 
                before:top-0 
                before:rounded
                h-full py-2 px-4 bg-black rounded-md text-gray-300 hover:text-white`}
          >
            <span class="relative">{progress <=100 ? "Transfer" : "Done"}</span>
          </button>
        </div>
      );
}

  