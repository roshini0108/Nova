import {
    addDoc,
    collection,
    db,
    deleteDoc,
    doc,
    getDocs,
    limit,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    writeBatch
} from "../firebase.js";

function userDoc(uid) {
    return doc(db, "users", uid);
}

function chatsRef(uid) {
    return collection(db, "users", uid, "chats");
}

function chatDoc(uid, chatId) {
    return doc(db, "users", uid, "chats", chatId);
}

function messagesRef(uid, chatId) {
    return collection(db, "users", uid, "chats", chatId, "messages");
}

function normalizeSnapshotDoc(snapshotDoc) {
    const data = snapshotDoc.data();
    return {
        id: snapshotDoc.id,
        ...data,
        createdAtMs: data.createdAt?.toMillis?.() || 0,
        updatedAtMs: data.updatedAt?.toMillis?.() || 0
    };
}

export async function ensureUserProfile(user) {
    await setDoc(userDoc(user.uid), {
        displayName: user.displayName || "Nova user",
        email: user.email || "",
        photoURL: user.photoURL || "",
        lastLoginAt: serverTimestamp()
    }, { merge: true });
}

export async function createChat(uid, title = "New chat") {
    const chat = await addDoc(chatsRef(uid), {
        title,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });
    return chat.id;
}

export function loadChats(uid, onChange, onError) {
    const chatsQuery = query(chatsRef(uid), orderBy("updatedAt", "desc"));
    return onSnapshot(chatsQuery, snapshot => {
        onChange(snapshot.docs.map(normalizeSnapshotDoc));
    }, onError);
}

export function loadMessages(uid, chatId, onChange, onError) {
    const messagesQuery = query(messagesRef(uid, chatId), orderBy("createdAt", "asc"));
    return onSnapshot(messagesQuery, snapshot => {
        onChange(snapshot.docs.map(normalizeSnapshotDoc));
    }, onError);
}

export async function saveMessage(uid, chatId, message) {
    const saved = await addDoc(messagesRef(uid, chatId), {
        role: message.role,
        message: message.message,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });

    await updateDoc(chatDoc(uid, chatId), {
        updatedAt: serverTimestamp()
    });

    return saved.id;
}

export async function updateMessage(uid, chatId, messageId, fields) {
    await updateDoc(doc(db, "users", uid, "chats", chatId, "messages", messageId), {
        ...fields,
        updatedAt: serverTimestamp()
    });
    await updateDoc(chatDoc(uid, chatId), {
        updatedAt: serverTimestamp()
    });
}

export async function renameChat(uid, chatId, title) {
    await updateDoc(chatDoc(uid, chatId), {
        title,
        updatedAt: serverTimestamp()
    });
}

export async function deleteChat(uid, chatId) {
    const firstPage = query(messagesRef(uid, chatId), orderBy("createdAt"), limit(450));
    let messageDocs = await getDocs(firstPage);

    while (!messageDocs.empty) {
        const batch = writeBatch(db);
        messageDocs.forEach(messageDoc => batch.delete(messageDoc.ref));
        await batch.commit();
        messageDocs = await getDocs(firstPage);
    }

    const batch = writeBatch(db);
    batch.delete(chatDoc(uid, chatId));
    await batch.commit();
}
