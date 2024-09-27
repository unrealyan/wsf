import { createSignal, onMount } from "solid-js";
import hello from "hellojs"


hello.init({
    google:"78725862759-ikks52n8tgqgsmi67r2ts14i8qg9sffn.apps.googleusercontent.com"
}, {
    redirect_uri: 'redirect.html',
})
export default function Login() {
    const [user, setUser] = createSignal<{name:string,picture:string}|null>(null);

    const login = (provider: string) => {
      hello(provider).login().then(() => {
        hello(provider).api('me').then((response:any) => {
          setUser(response);
        });
      }).then(null, (error: any) => {
        console.error('Login failed:', error);
      });
    };

    return (
        <div class="bg-white">
      <h1>Welcome to SolidJS with Hello.js</h1>
      {user() ? (
        <div >
          <h2>Hello, {user()?.name}</h2>
          <img src={user()?.picture} alt={user()?.name} />
        </div>
      ) : (
        <div>
          <button onClick={() => login('facebook')}>Login with Facebook</button>
          <button onClick={() => login('google')}>Login with Google</button>
        </div>
      )}
    </div>
    );
}