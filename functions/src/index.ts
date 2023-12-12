/* eslint-disable */

import { HttpsError, onCall } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2/options";
import * as logger from "firebase-functions/logger";
import utils from "./utils";
import admin = require("firebase-admin");

admin.initializeApp();

setGlobalOptions({
    maxInstances: 10
})

async function createBubble(userId: string, topics: string[]): Promise<string> {
    const lobbyDbRef = admin.database().ref("lobby");

    await lobbyDbRef.child(userId).set(topics);

    const pendingMatchOffers: any[] = [];

    const lobbySnapshot = await lobbyDbRef.once("value");
    lobbySnapshot.forEach(snapshot => {
        if (snapshot.key != userId) {
            pendingMatchOffers.push(snapshot);
        }
    })

    let result = "";

    for (let snapshot of utils.shuffleArray(pendingMatchOffers)) {
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
            admin.database().ref().child("users").child(result).child("matched").set(bubble.key),
            bubble.set({ users: [userId, result] }),
            lobbyDbRef.child(result).remove(),
            lobbyDbRef.child(userId).remove()
        ]);
        return bubble.key!;
    }
    else {
        await utils.delay(15000);
        await lobbyDbRef.child(userId).remove();
        return Promise.reject(new Error("Matching user is not found"));
    }
}

export const requestPairing = onCall(
    {
        region: "asia-southeast1"
    },
    async (request) => {
        logger.info(`User ${request.data.userId} is waiting to be paired`);

        try {
            logger.debug("Match found");
            return await createBubble(request.data.userId, request.data.topics);
        }
        catch (error) {
            throw new HttpsError("not-found", `${error}`);
        }
    });
