const STORAGE_KEYS = {
    username: 'username',
    name: 'name',
    authorityType: 'authorityType',
    organizationId: 'organizationId',
}

export function readStoredUser() {
    const username = localStorage.getItem(STORAGE_KEYS.username)
    const authorityType = localStorage.getItem(STORAGE_KEYS.authorityType)

    if (!username || !authorityType) {
        return null
    }

    return {
        username,
        name: localStorage.getItem(STORAGE_KEYS.name) || '',
        authorityType,
        organizationId: localStorage.getItem(STORAGE_KEYS.organizationId) || '',
    }
}

export function storeUser(user) {
    localStorage.setItem(STORAGE_KEYS.username, user.username)
    localStorage.setItem(STORAGE_KEYS.name, user.name || '')
    localStorage.setItem(STORAGE_KEYS.authorityType, user.authorityType)
    localStorage.setItem(STORAGE_KEYS.organizationId, user.organizationId || '')
}

export function clearStoredUser() {
    Object.values(STORAGE_KEYS).forEach((key) => {
        localStorage.removeItem(key)
    })
}
