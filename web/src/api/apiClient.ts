interface ApiClient {
    baseUrl: string;
    get<P extends string,T>(url: string, params: P): Promise<T>
    post<P,T>(url: string, data: P): Promise<T>
    put<P,T>(url: string, data: P): Promise<T>
    patch<P,T>(url: string, data: P): Promise<T>
    delete<P,T>(url: string, params: P): Promise<T>
}

class ApiClientImpl implements ApiClient {
    baseUrl: string;

    constructor(path: string) {
        this.baseUrl = path;
    }

    private getHeaders(): Headers {
        const headers = new Headers({
            'Content-Type': 'application/json',
        });
        if (localStorage.token) {
            headers.append('Authorization', `Bearer ${localStorage.token}`);
        }
        return headers;
    }

    private handleError(response: { status: number; }){
        if (response.status == 400) {
            throw new Error("api params error")
        } else if (response.status == 401){
            localStorage.clear()
            location.href = "/"
            throw new Error("login fail")
        } else if (response.status >400 && response.status <500){
            throw new Error("api fail")
        } else if (response.status > 500){
            throw new Error("system error")
        } 
    }

    async get<P extends Object, T>(url: string, params?: P): Promise<T>  {
        const queryParams = new URLSearchParams();
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                queryParams.append(key, value);
            });
        }
        url = this.baseUrl + url + "?"+queryParams.toString();
        try {
            const response = await fetch(url, { 
                method: "GET",
                headers: this.getHeaders()
            });
            this.handleError(response)
            const json = await response.json();
            return json
        } catch (error: any) {
            throw new Error(error);
        }
    }
    async post<P,T>(url: string, data: P): Promise<T> {
        url = this.baseUrl +url
        try {
            const response = await fetch(url,{
                method:"POST",
                headers: this.getHeaders(),
                body: JSON.stringify(data)
            })
            this.handleError(response)
           
            const json = await response.json();
            return json
        }catch (error: any) {
            throw new Error(error);
        }
    }
    put<P,T>(url: string, data: P): Promise<T> {
        throw new Error("Method not implemented.")
    }
    patch<P,T>(url: string, data: P): Promise<T> {
        throw new Error("Method not implemented.")
    }
    delete<P,T>(url: string, params: P): Promise<T> {
        throw new Error("Method not implemented.")
    }

}

const WSFApiClient = new ApiClientImpl("/api")
const GoogleApiClient = new ApiClientImpl("https://www.googleapis.com")
export {GoogleApiClient}
export default WSFApiClient