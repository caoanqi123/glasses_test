export const API_PREFIX = '/glassesBackend'

export class RequestError extends Error {
    constructor(message, status, data = null) {
        super(message)
        this.name = 'RequestError'
        this.status = status
        this.data = data
    }
}

const PASSTHROUGH_BODY_TYPES = [FormData, URLSearchParams, Blob]

function isPassthroughBody(body) {
    if (typeof body === 'string') {
        return true
    }
    return PASSTHROUGH_BODY_TYPES.some((Type) => body instanceof Type)
}

function createUrl(path, params) {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    const url = new URL(`${API_PREFIX}${normalizedPath}`, window.location.origin)

    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                url.searchParams.append(key, String(value))
            }
        })
    }

    return `${url.pathname}${url.search}`
}

function parseJson(text, status, strict) {
    if (!text) {
        return null
    }

    try {
        return JSON.parse(text)
    } catch {
        if (strict) {
            throw new RequestError('响应解析失败', status)
        }
        return null
    }
}

export async function request(path, options = {}) {
    const {
        method = 'GET',
        params,
        headers = {},
        body,
        responseType = 'json',
    } = options

    const requestHeaders = new Headers(headers)
    let requestBody = body

    if (body !== undefined && body !== null && !isPassthroughBody(body)) {
        if (!requestHeaders.has('Content-Type')) {
            requestHeaders.set('Content-Type', 'application/json')
        }
        requestBody = JSON.stringify(body)
    }

    const response = await fetch(createUrl(path, params), {
        method,
        headers: requestHeaders,
        body: requestBody,
    })

    if (responseType === 'blob') {
        if (!response.ok) {
            const text = await response.text()
            const parsedError = parseJson(text, response.status, false)
            throw new RequestError(
                parsedError?.message || `请求失败（${response.status}）`,
                response.status,
                parsedError,
            )
        }

        const data = await response.blob()
        return { data, response }
    }

    const text = await response.text()
    const parsed = parseJson(text, response.status, true)

    if (!response.ok) {
        throw new RequestError(parsed?.message || `请求失败（${response.status}）`, response.status, parsed)
    }

    return parsed
}

export function getErrorMessage(error, fallbackMessage = '请求失败') {
    if (error instanceof RequestError && error.message) {
        return error.message
    }

    if (error instanceof Error && error.message) {
        return error.message
    }

    return fallbackMessage
}

export const apiGet = (path, options = {}) => request(path, { ...options, method: 'GET' })
export const apiPost = (path, options = {}) => request(path, { ...options, method: 'POST' })
export const apiPut = (path, options = {}) => request(path, { ...options, method: 'PUT' })
export const apiDelete = (path, options = {}) => request(path, { ...options, method: 'DELETE' })
