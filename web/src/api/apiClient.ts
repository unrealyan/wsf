
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
        this.baseUrl = path
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
            const response = await fetch(url, { method: "GET" });
            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }
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
                body: JSON.stringify(data)
            })
            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }
            const json = await response.json();
            return json
        }catch (error: any) {
            return error
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