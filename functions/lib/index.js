"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeMatchedAttribute = exports.requestPairing = void 0;
const https_1 = require("firebase-functions/v2/https");
const database_1 = require("firebase-functions/v2/database");
const options_1 = require("firebase-functions/v2/options");
const logger = require("firebase-functions/logger");
const utils_1 = require("./utils");
const admin = require("firebase-admin");
admin.initializeApp();
(0, options_1.setGlobalOptions)({
    maxInstances: 10,
});
/**
 * Looks for matching users in the lobby and if succesful, pair them and return
 * the ID of the created bubble (chat room).
 *
 * @param {string} userId
 * @param {number[]} topics
 */
async function createBubble(userId, topics) {
    const lobbyDbRef = admin.database().ref("lobby");
    // Creates a match offer in the lobby with user id as key
    await lobbyDbRef.child(userId).set(topics);
    const pendingMatchOffers = [];
    const lobbySnapshot = await lobbyDbRef.once("value");
    lobbySnapshot.forEach((snapshot) => {
        if (snapshot.key != userId) {
            pendingMatchOffers.push(snapshot);
        }
    });
    let matchingPairId = "";
    // Core matching logic ("the algorithm"), it just checks for the existence of
    // certain topic ID in an array of other user's preferred topics from all
    // available match offers
    for (const matchOffer of utils_1.default.shuffleArray(pendingMatchOffers)) {
        logger.log(matchOffer.val());
        for (const topic of topics) {
            if (matchOffer.val().includes(topic)) {
                matchingPairId = matchOffer.key;
                break;
            }
        }
        if (matchingPairId) {
            break;
        }
    }
    if (matchingPairId) {
        // New bubble
        const bubbleDbRef = await admin.database().ref().child("bubbles").push();
        const user1MatchedDbRef = admin.database().ref().child("users")
            .child(userId).child("matched");
        const user2MatchedDbRef = admin.database().ref().child("users")
            .child(matchingPairId).child("matched");
        await Promise.all([
            // Set matched attribute for the requesting user
            user1MatchedDbRef.child("userId").set(matchingPairId),
            user1MatchedDbRef.child("bubbleId").set(bubbleDbRef.key),
            // Set matched attribute for the matching pair
            user2MatchedDbRef.child("userId").set(userId),
            user2MatchedDbRef.child("bubbleId").set(bubbleDbRef.key),
            bubbleDbRef.set({ users: [userId, matchingPairId] }),
            lobbyDbRef.child(userId).remove(),
            lobbyDbRef.child(matchingPairId).remove(),
        ]);
        return Promise.resolve();
    }
    else {
        await utils_1.default.delay(15000);
        await lobbyDbRef.child(userId).remove();
        return Promise.reject(new Error("Matching user is not found"));
    }
}
/**
 * Callable server-side function for user pairing request.
 * Responds with ID of the created chat room or 404 if unsuccessful.
 *
 */
exports.requestPairing = (0, https_1.onCall)({
    region: "asia-southeast1",
}, async (request) => {
    logger.info(`User ${request.data.userId} is waiting to be paired`);
    try {
        await createBubble(request.data.userId, request.data.topics);
        logger.debug("Match found");
        return { result: "success" };
    }
    catch (error) {
        throw new https_1.HttpsError("not-found", `${error}`);
    }
});
/**
 * Triggers when a bubble is destroyed (chat session ends)
 * and removes the "matched" attribute from all associated users
 * in that bubble.
 *
 */
exports.removeMatchedAttribute = (0, database_1.onValueDeleted)({
    ref: "/bubbles/*",
    region: "asia-southeast1",
}, (event) => {
    const usersDbRef = admin.database().ref().child("users");
    event.data.child("users").forEach((user) => {
        usersDbRef.child(user.val()).child("matched").remove();
    });
});
//# sourceMappingURL=index.js.map