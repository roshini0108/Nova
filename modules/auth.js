import {
    auth,
    getRedirectResult,
    onAuthStateChanged,
    provider,
    signInWithRedirect,
    signInWithPopup,
    signOut
} from "../firebase.js";
import { ensureUserProfile } from "./firestore.js";

export function watchAuth(onChange) {
    return onAuthStateChanged(auth, onChange);
}

export async function signInWithGoogle() {
    let result;

    try {
        result = await signInWithPopup(auth, provider);
    } catch (error) {
        if (error?.code !== "auth/popup-blocked") throw error;
        await signInWithRedirect(auth, provider);
        return null;
    }

    await ensureUserProfile(result.user);
    return result.user;
}

export async function completeRedirectSignIn() {
    const result = await getRedirectResult(auth);
    if (!result?.user) return null;
    await ensureUserProfile(result.user);
    return result.user;
}

export async function logout() {
    await signOut(auth);
}
