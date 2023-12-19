import {HttpsError, onCall} from "firebase-functions/v2/https";
import {onValueDeleted} from "firebase-functions/v2/database";
import {setGlobalOptions} from "firebase-functions/v2/options";
import {DataSnapshot} from "firebase-admin/database";
import * as logger from "firebase-functions/logger";
import utils from "./utils";
import admin = require("firebase-admin");

admin.initializeApp();

setGlobalOptions({
  maxInstances: 10,
});

/**
 * Looks for matching users in the lobby and if succesful, pair them and return
 * the ID of the created bubble (chat room).
 *
 * @param {string} userId
 * @param {number[]} topics
 */
async function createBubble(userId: string, topics: number[]): Promise<void> {
  const lobbyDbRef = admin.database().ref("lobby");

  // Creates a match offer in the lobby with user id as key
  await lobbyDbRef.child(userId).set(topics);

  const pendingMatchOffers: DataSnapshot[] = [];

  const lobbySnapshot = await lobbyDbRef.once("value");
  lobbySnapshot.forEach((snapshot) => {
    if (snapshot.key != userId) {
      pendingMatchOffers.push(snapshot);
    }
  });

  let matchingPairId: string | null = "";

  // Core matching logic ("the algorithm"), it just checks for the existence of
  // certain topic ID in an array of other user's preferred topics from all
  // available match offers
  for (const matchOffer of utils.shuffleArray(pendingMatchOffers)) {
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

      bubbleDbRef.set({users: [userId, matchingPairId]}),
      lobbyDbRef.child(userId).remove(),
      lobbyDbRef.child(matchingPairId).remove(),
    ]);

    return Promise.resolve();
  } else {
    // TODO: not the best approach
    await utils.delay(15000);
    await lobbyDbRef.child(userId).remove();
    return Promise.reject(new Error("Matching user is not found"));
  }
}

/**
 * Callable server-side function for user pairing request.
 * Responds with ID of the created chat room or 404 if unsuccessful.
 *
 */
export const requestPairing = onCall(
  {
    region: "asia-southeast1",
  },
  async (request) => {
    logger.info(`User ${request.data.userId} is waiting to be paired`);

    try {
      await createBubble(request.data.userId, request.data.topics);
      logger.debug("Match found");
      return {result: "success"};
    } catch (error) {
      throw new HttpsError("not-found", `${error}`);
    }
  }
);

/**
 * Triggers when a bubble is destroyed (chat session ends)
 * and removes the "matched" attribute from all associated users
 * in that bubble.
 *
 */
export const removeMatchedAttribute = onValueDeleted(
  {
    ref: "/bubbles/*",
    region: "asia-southeast1",
  },
  (event) => {
    const usersDbRef = admin.database().ref().child("users");

    event.data.child("users").forEach((user) => {
      usersDbRef.child(user.val()).child("matched").remove();
    });
  }
);
