import { demoMasterKeyCache } from "$lib/demoCache";
import type { PageServerLoad } from "./$types";
import { randomBytes } from "crypto";

export const load: PageServerLoad = () => {
    // Create random client ID (5 chars)
    const clientId = Math.random().toString(36).substring(2, 7);

    // Create random 128-bit hex key (32 hex characters)
    const masterKey = randomBytes(16).toString('hex');

    // Add key to cache
    demoMasterKeyCache[clientId] = masterKey;

    return {
        clientId,
        masterKey,
    };
}