// 登录请求接口
export interface LoginRequest {
    email: string;
    password: string;
}

// 注册请求接口
export interface RegisterRequest {
    email: string;
    password: string;
}

// 认证响应接口
export interface AuthResponse {
    token: string;
    user: {
        id: string;
        email: string;
        // 可以根据需要添加其他用户信息字段
    };
}

// 错误响应接口
export interface ErrorResponse {
    message: string;
    errors?: Record<string, string[]>;
}