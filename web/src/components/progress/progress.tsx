import { createSignal, createEffect, For } from 'solid-js';
import { JSX } from 'solid-js/jsx-runtime';
import "./progress.css";

interface Packet {
    id: number;
    active: boolean;
}

interface ProgressBarProps {
    [x: string]: any;
    // progress: number;
    ref:any
}

export interface UserProgressRef {
    status: () => boolean;
    open: () => void;
    close: () => void;
    setValue: (val: number) => void;
    setSpeed: (val: string) => void;
    setDone: (val: boolean) => void;
  }
  

const ProgressBar: (props: ProgressBarProps) => JSX.Element = (props) => {
    const [packets, setPackets] = createSignal<Packet[]>([]);
    const [lastProgress, setLastProgress] = createSignal(0);
    const [progress, setProgress] = createSignal(0);
    const [status, setStatus] = createSignal(true);
    const [speed, setSpeed] = createSignal("");
    const [done, setDone] = createSignal(false);



    props.ref({
        status:status,
        open: () => setStatus(true),
        close: () => setStatus(false),
        setValue: (val: number) => setProgress(val),
        setSpeed: (val: string) => setSpeed(val),
        setDone:(val:boolean) => setDone(val)
    })

    return (
        <>
            {status() && (
                <div id="progress-container" class="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                    <div class="font-semibold text-lg text-gray-800">FileName: <span class="text-gray-600">{props.filename}</span></div>
                    <div class="flex items-center justify-between mb-2">
                        <span class="font-semibold text-lg text-gray-800">progress</span>
                        <span class="text-gray-600">{speed()}</span>
                    </div>
                    <div class="relative pt-1">
                        <div class="flex mb-2 items-center justify-between">
                            <div>
                                <span class="text-xs font-semibold inline-block py-1 px-2 rounded-full text-gray-800 bg-gray-200">
                                    {progress()}%
                                </span>
                            </div>
                            {done() && (
                                <div class="text-right">
                                    <span class="text-xs font-semibold inline-block text-gray-600">
                                        Done
                                    </span>
                                </div>
                            )}
                        </div>
                        <div class="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
                            <div
                                style={`width: ${progress()}%`}
                                class="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gray-600 transition-all duration-500"
                            ></div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ProgressBar;