import { useNavigate } from "@solidjs/router";

export default function SignIn(){

    const navigate = useNavigate();
    const onOauthSignin = ()=>{
        // Google's OAuth 2.0 endpoint for requesting an access token
        let oauth2Endpoint = 'https://accounts.google.com/o/oauth2/v2/auth';

        // Create <form> element to submit parameters to OAuth 2.0 endpoint.
        var form = document.createElement('form');
        form.setAttribute('method', 'GET'); // Send as a GET request.
        form.setAttribute('action', oauth2Endpoint);

        // Parameters to pass to OAuth 2.0 endpoint.
        let params = {
            'client_id': '78725862759-ikks52n8tgqgsmi67r2ts14i8qg9sffn.apps.googleusercontent.com',
            'redirect_uri': 'https://wsf.ptcl.one/redirect',
            'response_type': 'token',
            'scope': 'https://www.googleapis.com/auth/drive.metadata.readonly',
            'include_granted_scopes': 'true',
            'state': 'pass-through value'
        };

        // Add form parameters as hidden input values.
        for (let p in params) {
            let input = document.createElement('input');
            input.setAttribute('type', 'hidden');
            input.setAttribute('name', p);
            input.setAttribute('value', params[p as keyof typeof params]);
            form.appendChild(input);
        }

        // Add form to page and submit it to open the OAuth 2.0 endpoint.
        document.body.appendChild(form);
        form.submit();
    }

    return <div class="mt-4"><span class="text-white hover:cursor-pointer" onClick={()=> navigate("/auth")}>SignIn</span></div>
}