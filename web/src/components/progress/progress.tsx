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

const ProgressBar: (props: ProgressBarProps) => JSX.Element = (props) => {
    const [packets, setPackets] = createSignal<Packet[]>([]);
    const [lastProgress, setLastProgress] = createSignal(0);
    const [progress, setProgress] = createSignal(0);
    const [status, setStatus] = createSignal(false);
    const [speed, setSpeed] = createSignal("");
    const [done, setDone] = createSignal(false);

    let nextPacketId = 0;

    const createPacket = () => {

        const newPacket: Packet = {
            id: nextPacketId++,
            active: true
        };

        setPackets(prev => [...prev, newPacket]);

        // Remove packet after animation
        setTimeout(() => {
            setPackets(prev => prev.filter(p => p.id !== newPacket.id));
        }, 1350); // Slightly longer than the total animation duration
    }
    props.ref({
        open: () => setStatus(true),
        close: () => setStatus(false),
        setValue: (val: number) => setProgress(val),
        setSpeed: (val: string) => setSpeed(val),
        setDone:(val:boolean) => setDone(val)
    })

    createEffect(() => {
        const currentProgress = progress();
        if (currentProgress > lastProgress()) {
            for (let i = lastProgress(); i < currentProgress; i++) {
                createPacket();
            }
            setLastProgress(currentProgress);
        }
    });


    return (
        <>
            {
                status() ? <div id="progress-container">
                    <div class="progress-container">
                        <div class="endpoint endpoint-left">A</div>
                        <div class="endpoint endpoint-right">B</div>
                        <div class="progress-text">{progress()}% 
                        {done() ? <span class='ml-4 text-blue-400'>Done</span> :<span class='text-blue-400'>{speed()}</span>}
                        </div>
                        <For each={packets()}>
                            {(packet) => (
                                <div
                                    class={`packet ${packet.active ? 'active' : ''}`}
                                />
                            )}
                        </For>
                    </div>
                </div> : null
            }
        </>
    );
};

export default ProgressBar;