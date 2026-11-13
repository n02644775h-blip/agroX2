import {
  collection,
  doc,
  onSnapshot,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import { sanitizeForFirestore } from '../context/AuthContext';
import { parseFirestoreUser } from './firebaseUsers';
import { Conversation, Message, User } from '../types';

export function get1on1ConversationId(userAId: string, userBId: string): string {
  const sorted = [userAId, userBId].sort();
  // Safe alphanumeric doc id
  const sanitizedA = sorted[0].replace(/[^a-zA-Z0-9_-]/g, '_');
  const sanitizedB = sorted[1].replace(/[^a-zA-Z0-9_-]/g, '_');
  return `conv_${sanitizedA}__${sanitizedB}`;
}

export function parseFirestoreMessage(docId: string, data: any): Message {
  let createdAtStr = new Date().toISOString();
  if (data?.createdAt) {
    if (typeof data.createdAt === 'string') {
      createdAtStr = data.createdAt;
    } else if (typeof data.createdAt?.toDate === 'function') {
      createdAtStr = data.createdAt.toDate().toISOString();
    } else if (data.createdAt instanceof Date) {
      createdAtStr = data.createdAt.toISOString();
    } else if (typeof data.createdAt?.seconds === 'number') {
      createdAtStr = new Date(data.createdAt.seconds * 1000).toISOString();
    }
  }

  const text = data?.text || data?.content || '';

  return {
    id: data?.id || docId,
    conversationId: data?.conversationId || '',
    senderId: data?.senderId || '',
    senderName: data?.senderName || 'Member',
    senderAvatar: data?.senderAvatar || '',
    senderRole: data?.senderRole || 'buyer',
    receiverId: data?.receiverId || '',
    receiverName: data?.receiverName || '',
    receiverAvatar: data?.receiverAvatar || '',
    content: text,
    text: text,
    createdAt: createdAtStr,
    read: !!data?.read,
    productId: data?.productId,
    productSnippet: data?.productSnippet
  };
}

export function parseFirestoreConversation(docId: string, data: any): Conversation {
  let lastMessageTimeStr = new Date().toISOString();
  if (data?.lastMessageTime) {
    if (typeof data.lastMessageTime === 'string') {
      lastMessageTimeStr = data.lastMessageTime;
    } else if (typeof data.lastMessageTime?.toDate === 'function') {
      lastMessageTimeStr = data.lastMessageTime.toDate().toISOString();
    } else if (data.lastMessageTime instanceof Date) {
      lastMessageTimeStr = data.lastMessageTime.toISOString();
    } else if (typeof data.lastMessageTime?.seconds === 'number') {
      lastMessageTimeStr = new Date(data.lastMessageTime.seconds * 1000).toISOString();
    }
  }

  return {
    id: data?.id || docId,
    participants: Array.isArray(data?.participants) ? data.participants : [],
    lastMessage: data?.lastMessage || '',
    lastMessageTime: lastMessageTimeStr,
    unreadCountFor: data?.unreadCountFor || {},
    productId: data?.productId,
    productName: data?.productName,
    orderId: data?.orderId
  };
}

/**
 * Fetch a user profile from Firestore users collection
 */
export async function fetchUserFromFirestore(userId: string): Promise<User | null> {
  try {
    const userSnap = await getDoc(doc(db, 'users', userId));
    if (userSnap.exists()) {
      return parseFirestoreUser(userSnap.id, userSnap.data());
    }
    return null;
  } catch (err) {
    console.warn('Could not fetch user from Firestore:', userId, err);
    return null;
  }
}

/**
 * Subscribe to all conversations involving a user
 */
export function subscribeToFirebaseConversations(
  userId: string,
  onUpdate: (convs: Conversation[]) => void,
  onError?: (err: any) => void
): () => void {
  try {
    const colRef = collection(db, 'conversations');
    // Listen for conversations where participantIds contains userId
    const q = query(colRef, where('participantIds', 'array-contains', userId));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Conversation[] = [];
        snapshot.forEach((d) => {
          list.push(parseFirestoreConversation(d.id, d.data()));
        });
        list.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
        onUpdate(list);
      },
      (error) => {
        console.error('Firebase conversations subscription error:', error);
        if (onError) onError(error);
        else handleFirestoreError(error, OperationType.LIST, 'conversations');
      }
    );

    return unsubscribe;
  } catch (err) {
    console.error('Failed to subscribe to conversations:', err);
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Subscribe in real-time to messages in a conversation
 */
export function subscribeToFirebaseMessages(
  conversationId: string,
  onUpdate: (msgs: Message[]) => void,
  onError?: (err: any) => void
): () => void {
  try {
    const msgsColRef = collection(db, 'conversations', conversationId, 'messages');

    const unsubscribe = onSnapshot(
      msgsColRef,
      (snapshot) => {
        const list: Message[] = [];
        snapshot.forEach((d) => {
          list.push(parseFirestoreMessage(d.id, d.data()));
        });
        list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        onUpdate(list);
      },
      (error) => {
        console.error('Firebase messages subscription error:', error);
        if (onError) onError(error);
        else handleFirestoreError(error, OperationType.LIST, `conversations/${conversationId}/messages`);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.error('Failed to subscribe to messages:', err);
    if (onError) onError(err);
    return () => {};
  }
}

export async function markFirebaseConversationRead(conversationId: string, userId: string): Promise<void> {
  try {
    const convDocRef = doc(db, 'conversations', conversationId);
    await setDoc(
      convDocRef,
      {
        unreadCountFor: {
          [userId]: 0
        }
      },
      { merge: true }
    );
  } catch {
    // Non-critical if conversation doesn't exist in Firestore yet
  }
}

/**
 * Send a 1-on-1 direct message between Buyer and Farmer in Firestore
 */
export async function sendFirebaseMessage(
  conversationId: string,
  messageData: {
    sender: User;
    recipient: User;
    text: string;
    productId?: string;
    productSnippet?: {
      name: string;
      price: number;
      unit: string;
      image: string;
    };
  }
): Promise<Message> {
  const msgId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const msgDocRef = doc(db, 'conversations', conversationId, 'messages', msgId);
  const convDocRef = doc(db, 'conversations', conversationId);

  const cleanText = messageData.text.trim();

  // 1. Write the message document
  const rawMsg = {
    id: msgId,
    conversationId,
    senderId: messageData.sender.id,
    senderName: messageData.sender.name,
    senderAvatar: messageData.sender.avatar || '',
    senderRole: messageData.sender.role,
    receiverId: messageData.recipient.id,
    receiverName: messageData.recipient.name,
    receiverAvatar: messageData.recipient.avatar || '',
    text: cleanText,
    content: cleanText,
    productId: messageData.productId || null,
    productSnippet: messageData.productSnippet || null,
    read: false,
    createdAt: serverTimestamp()
  };

  await setDoc(msgDocRef, sanitizeForFirestore(rawMsg));

  // 2. Ensure parent conversation document is created or updated
  const existingConvSnap = await getDoc(convDocRef).catch(() => null);
  const existingUnread = existingConvSnap?.exists()
    ? Number((existingConvSnap.data() as any)?.unreadCountFor?.[messageData.recipient.id] || 0)
    : 0;

  const convPayload = {
    id: conversationId,
    participantIds: [messageData.sender.id, messageData.recipient.id],
    participants: [
      {
        id: messageData.sender.id,
        name: messageData.sender.name,
        role: messageData.sender.role,
        avatar: messageData.sender.avatar || '',
        farmName: messageData.sender.farmerProfile?.farmName || ''
      },
      {
        id: messageData.recipient.id,
        name: messageData.recipient.name,
        role: messageData.recipient.role,
        avatar: messageData.recipient.avatar || '',
        farmName: messageData.recipient.farmerProfile?.farmName || ''
      }
    ],
    unreadCountFor: {
      [messageData.recipient.id]: existingUnread + 1,
      [messageData.sender.id]: 0
    },
    lastMessage: cleanText,
    lastMessageTime: serverTimestamp(),
    productId: messageData.productId || null,
    productName: messageData.productSnippet?.name || null,
    updatedAt: serverTimestamp()
  };

  await setDoc(convDocRef, sanitizeForFirestore(convPayload), { merge: true });

  return parseFirestoreMessage(msgId, {
    ...rawMsg,
    createdAt: new Date().toISOString()
  });
}
