var tmp = {}
class TonConnectStorage {
    constructor(chatId) {
        this.chatId = chatId;
    }

    getKey(key) {
        return this.chatId.toString() + key;
    }

    async removeItem(key) {
        delete tmp[key];
    }

    async setItem(key, value) {
        tmp[this.getKey(key)] = value;
    }

    async getItem(key) {
        return (tmp[this.getKey(key)]) || null;
    }
}


module.exports = {
    TonConnectStorage
}