import "./avatar.css"

export default function Avatar(props:{userId:string}) {
    return <>
        <div class="avatar mr-10 mt-2">
            <div class="user-id">
                {
                    props.userId.split("").map((user) => <span>{user}</span>)
                }
            </div>
        </div>
    </>
}