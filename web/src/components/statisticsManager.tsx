import { formatBytes } from "../lib/fileUtil";

export default function StatisticsManager(props:{totalFiles:number,totalSize:number}){

    return <>
        <div class="text-gray-400 mt-8 text-xl text-center">
        We've already transferred <span class="text-white text-2xl">{props.totalFiles}</span> files with a total size of <span class="text-white text-2xl">{formatBytes(props.totalSize)}</span>.
        </div>
    </>
}