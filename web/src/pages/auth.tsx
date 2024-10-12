import { createEffect, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import WSFApiClient from "../api/apiClient";
import { StoreType, useStore } from "../lib/store";

export default function Auth() {
  const [isLogin, setIsLogin] = createSignal(true);
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const navigate = useNavigate();
  const [state, action] = useStore()


  const login = async ()=>{
    return WSFApiClient.post("/login",{
      email:email(),
      password:password()
    })
  }
  const register = async ()=>{
    return WSFApiClient.post("/register",{
      email:email(),
      password:password()
    })
  }

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    // 这里添加登录或注册的逻辑
    // console.log(isLogin() ? "登录" : "注册", email(), password());
    try {
      isLogin() ? await login().then((res:any)=>{
        console.log(res.user)
        localStorage.setItem("user",JSON.stringify(res.user))
        localStorage.setItem("token",res.token)
      }): await register()
      // 登录或注册成功后跳转到个人资料页面
      navigate("/profile");
    }catch(err) {
      console.log((err as Error ).message)
      action.setAlertMsg({type:"error",message:(err as Error ).message})
      // addNotification("AUTH_ERROR")
    }
    
  };

  return (
    <div class="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div class="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {isLogin() ? "登录您的账户" : "创建新账户"}
        </h2>
      </div>

      <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form class="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label for="email" class="block text-sm font-medium text-gray-700">
                电子邮箱
              </label>
              <div class="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autocomplete="email"
                  required
                  class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={email()}
                  onInput={(e) => setEmail(e.currentTarget.value)}
                />
              </div>
            </div>

            <div>
              <label for="password" class="block text-sm font-medium text-gray-700">
                密码
              </label>
              <div class="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autocomplete={isLogin() ? "current-password" : "new-password"}
                  required
                  class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={password()}
                  onInput={(e) => setPassword(e.currentTarget.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {isLogin() ? "登录" : "注册"}
              </button>
            </div>
          </form>

          <div class="mt-6">
            <div class="relative">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-gray-300"></div>
              </div>
              <div class="relative flex justify-center text-sm">
                <span class="px-2 bg-white text-gray-500">
                  {isLogin() ? "还没有账户?" : "已有账户?"}
                </span>
              </div>
            </div>

            <div class="mt-6">
              <button
                onClick={() => setIsLogin(!isLogin())}
                class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-indigo-600 bg-white hover:bg-gray-50"
              >
                {isLogin() ? "创建新账户" : "登录现有账户"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}