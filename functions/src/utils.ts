/* eslint-disable */

function shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export default {
    shuffleArray,
    delay
}