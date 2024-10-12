import { createEffect, onMount } from "solid-js";
import WSFApiClient,{GoogleApiClient} from "../api/apiClient"
import { StoreType, UserInfo, useStore } from "../lib/store";
import { useNavigate } from "@solidjs/router";

export default function Redirect(){
    const [state,action,{addNotification}]:StoreType = useStore()
    const navigate = useNavigate();

    onMount(async ()=>{
        let queryString = new URLSearchParams(location.href.replace(/(#)state/,a=>"?state"));
        let token = queryString.get("access_token")
        if (token) {
            // fetch("https://www.googleapis.com/userinfo/v2/me?access_token="+token)
            try {
                // let data:UserInfo =  await GoogleApiClient.get("/userinfo/v2/me?access_token="+token)
                let data:UserInfo = await WSFApiClient.get("/loginByGoogle",{access_token:token})
                // data.user_id = data.id.toString()
                // data.id = 0
                action.setUserInfo(data)
                localStorage.setItem("user",JSON.stringify(data))
                // await WSFApiClient.post("/user",data)
                navigate("/")
                window.history.replaceState({}, '')
                addNotification("LOGIN_BY_GOOGLE")
            } catch (err:any) {
                navigate("/", { 
                    state: { type:"error",message: "获取用户信息失败" } 
                })
            } 
            
        }
    })

    createEffect(()=>{
        console.log(state.alertMsg)
    })

    return <></>
}