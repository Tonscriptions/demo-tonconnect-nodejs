const ton = require('@tonconnect/sdk')
const storage = require("./storage")
require('dotenv').config()
var connectors = {}
async function getConnector(chatId){
    var storedItem = {
        connector:ton.TonConnect,
        timeout: 0 ,
        onConnectorExpired:0
    };

    if (connectors[chatId]) {
        storedItem = connectors[chatId];
    } else {
        storedItem = {
            connector: new ton.TonConnect({
                manifestUrl: process.env.MANIFEST_URL,
                storage: new storage.TonConnectStorage(chatId)
            }),
            onConnectorExpired: []
        }
        connectors[chatId] = storedItem
    }
    return storedItem.connector;
}
module.exports = {
    getConnector
}