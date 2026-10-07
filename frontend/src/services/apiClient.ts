/**
 * Centralized API Client for CAMPUSLINK frontend.
 * Provides unified request handling, token injection, and FastAPI error normalization.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface NormalizedApiError {
  message: string;
  fieldErrors: Record<string, string>;
  status?: number;
}

export class ApiError extends Error {
  status: number;
  fieldErrors: Record<string, string>;

  constructor(message: string, status: number, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

/**
 * Normalizes backend responses (especially FastAPI 422 validation errors) into a friendly structure.
 */
export function parseApiError(error: any): NormalizedApiError {
  if (error instanceof ApiError) {
    return {
      message: error.message,
      fieldErrors: error.fieldErrors,
      status: error.status,
    };
  }

  // Handle fetch response or raw JSON payload
  if (error && typeof error === "object") {
    const status = error.status;
    const fieldErrors: Record<string, string> = {};
    let message = error.message || "An unexpected error occurred.";

    
    // Laravel 422 format
    if (error.errors && typeof error.errors === "object" && !Array.isArray(error.errors)) {
      Object.keys(error.errors).forEach((key) => {
        const val = error.errors[key];
        fieldErrors[key] = Array.isArray(val) ? val[0] : val;
      });
      return { message: error.message || "Validation error", fieldErrors, status };
    }

    if (Array.isArray(error.detail)) {
      // FastAPI 422 detail format: [{ loc: ["body", "fieldName"], msg: "...", type: "..." }]
      const firstError = error.detail[0];
      if (firstError) {
        message = firstError.msg || "Validation error occurred.";
      }
      error.detail.forEach((err: any) => {
        if (Array.isArray(err.loc) && err.loc.length > 0) {
          const field = String(err.loc[err.loc.length - 1]);
          fieldErrors[field] = err.msg || "Invalid value";
        }
      });
      return { message, fieldErrors, status };
    }

    if (typeof error.detail === "string") {
      return { message: error.detail, fieldErrors, status };
    }

    return { message, fieldErrors, status };
  }

  return {
    message: typeof error === "string" ? error : "An unexpected network or server error occurred.",
    fieldErrors: {},
  };
}

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    null
  );
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (
    options.body &&
    typeof options.body === "string" &&
    !headers["Content-Type"]
  ) {
    headers["Content-Type"] = "application/json";
  }

  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err: any) {
    if (err.name === "AbortError") throw err;
    throw new ApiError(
      err?.message || "Network error: Unable to connect to server.",
      0
    );
  }

  if (!response.ok) {
    let payload: any = null;
    try {
      payload = await response.json();
    } catch {
      payload = { detail: response.statusText };
    }

    const normalized = parseApiError({ ...payload, status: response.status });
    throw new ApiError(normalized.message, response.status, normalized.fieldErrors);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  try {
    return (await response.json()) as T;
  } catch {
    return {} as T;
  }
}

export const apiClient = {
  get: <T>(endpoint: string, options: RequestInit = {}) => request<T>(endpoint, { method: "GET", ...options }),

  post: <T>(endpoint: string, body?: any, headers?: Record<string, string>) =>
    request<T>(endpoint, {
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
      headers,
    }),

  put: <T>(endpoint: string, body?: any, headers?: Record<string, string>) =>
    request<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
      headers,
    }),

  patch: <T>(endpoint: string, body?: any, headers?: Record<string, string>) =>
    request<T>(endpoint, {
      method: "PATCH",
      body: JSON.stringify(body),
      headers,
    }),

  delete: <T>(endpoint: string, headers?: Record<string, string>) =>
    request<T>(endpoint, { method: "DELETE", headers }),

  upload: <T>(endpoint: string, formData: FormData) => {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return request<T>(endpoint, {
      method: "POST",
      body: formData,
      headers,
    });
  },
};


