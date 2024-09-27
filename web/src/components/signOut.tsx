import { StoreType, useStore } from "../lib/store"

export default function SingOut(){
    const [,action]:StoreType = useStore()
    const singnOut = ()=>{
        localStorage.clear()
        action.setUserInfo({
            id: "",
            user_id: "",
            name: "",
            given_name: "",
            family_name: "",
            picture: ""
        })
    }
    return <><span class="ml-2 mt-4 text-white hover:cursor-pointer" onClick={singnOut}>SignOut</span></>
}