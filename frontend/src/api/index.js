import { apiDelete, apiGet, apiPost, apiPut, request } from './request'

const encode = encodeURIComponent

export const authApi = {
    login({ username, password }) {
        return apiPost('/users/login', {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ username, password }),
        })
    },
    updatePassword({ username, currentUsername, newPassword }) {
        return apiPut(`/users/${encode(username)}/password`, {
            params: { currentUsername },
            body: { newPassword },
        })
    },
}

export const timeDataApi = {
    list(username) {
        return apiGet('/time-data', { params: { username } })
    },
    update(subjectPhone, glassesMac, startTime, payload) {
        return apiPut(`/time-data/${encode(subjectPhone)}/${encode(glassesMac)}`, {
            params: { startTime },
            body: payload,
        })
    },
    remove(subjectPhone, glassesMac, startTime, username) {
        return apiDelete(`/time-data/${encode(subjectPhone)}/${encode(glassesMac)}`, {
            params: { startTime, username },
        })
    },
    exportSelection(records) {
        return request('/time-data/export', {
            method: 'POST',
            body: records,
            responseType: 'blob',
        })
    },
}

export const organizationApi = {
    list() {
        return apiGet('/organizations')
    },
    create(currentUsername, payload) {
        return apiPost('/organizations', {
            params: { currentUsername },
            body: payload,
        })
    },
    update(organizationId, currentUsername, payload) {
        return apiPut(`/organizations/${encode(organizationId)}`, {
            params: { currentUsername },
            body: payload,
        })
    },
    remove(organizationId, currentUsername) {
        return apiDelete(`/organizations/${encode(organizationId)}`, {
            params: { currentUsername },
        })
    },
}

export const userApi = {
    list(username) {
        return apiGet('/users', { params: { username } })
    },
    create(currentUsername, payload) {
        return apiPost('/users', {
            params: { currentUsername },
            body: payload,
        })
    },
    update(username, currentUsername, payload) {
        return apiPut(`/users/${encode(username)}`, {
            params: { currentUsername },
            body: payload,
        })
    },
    remove(username, currentUsername) {
        return apiDelete(`/users/${encode(username)}`, {
            params: { currentUsername },
        })
    },
}
