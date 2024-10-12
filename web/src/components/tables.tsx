import { For } from "solid-js"

type TableHead = {
    name: string
}

type TablePorps = {
    heads: string[],
    body: { [key: string]: string | number }[]
}
export default function Tables(props: TablePorps) {
    return <div id="wsf-table" class="w-full">
        <table class="bg-slate-300 w-full text-center" style={{ "line-height": "1.5em" }}>
            <thead>
                <tr>
                    <For each={props.heads} fallback={<div>Loading...</div>}>
                        {
                            (head: string) => <td class="py-2">{head}</td>
                        }
                    </For>
                </tr>
            </thead>
            <tbody>
                <For each={props.body}>{
                    (data: { [key: string]: string | number }, index) => (
                        <tr class={index() % 2 === 0 ? "bg-white" : "bg-gray-100"}>
                            <For each={Object.keys(data)}>{
                                (key: string) => <td class="py-2">{data[key]}</td>
                            }</For>
                        </tr>
                    )
                }</For>
            </tbody>
        </table>
    </div>
}