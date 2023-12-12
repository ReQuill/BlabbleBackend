"use strict";
/* eslint-disable */
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestPairing = void 0;
const https_1 = require("firebase-functions/v2/https");
const options_1 = require("firebase-functions/v2/options");
const logger = require("firebase-functions/logger");
const utils_1 = require("./utils");
const admin = require("firebase-admin");
admin.initializeApp();
(0, options_1.setGlobalOptions)({
    maxInstances: 10
});
async function createBubble(userId, topics) {
    const lobbyDbRef = admin.database().ref("lobby");
    await admin.database().ref().child("lobby").child(userId).set(topics);
    const pendingMatchOffers = [];
    const lobbySnapshot = await lobbyDbRef.once("value");
    lobbySnapshot.forEach(snapshot => {
        if (snapshot.key != userId) {
            pendingMatchOffers.push(snapshot);
        }
    });
    let result = "";
    for (let snapshot of utils_1.default.shuffleArray(pendingMatchOffers)) {
        logger.log(snapshot.val());
        for (let topic in topics) {
            if (snapshot.hasChild(topic)) {
                result = snapshot.key;
                break;
            }
        }
        if (result) {
            break;
        }
    }
    if (result) {
        const bubble = await admin.database().ref().child("bubbles").push();
        await Promise.all([
            bubble.set({ users: [userId, result] }),
            lobbyDbRef.child(result).remove(),
            lobbyDbRef.child(userId).remove()
        ]);
        return bubble.key;
    }
    else {
        await utils_1.default.delay(10000);
        await lobbyDbRef.child(userId).remove();
        return Promise.reject(new Error("Matching user is not found"));
    }
}
exports.requestPairing = (0, https_1.onCall)({
    region: "asia-southeast1"
}, async (request) => {
    logger.info(`User ${request.data.userId} is waiting to be paired`);
    try {
        logger.debug("Match found");
        return await createBubble(request.data.userId, request.data.topics);
    }
    catch (error) {
        throw new https_1.HttpsError("not-found", `${error}`);
    }
});
//# sourceMappingURL=index.js.map