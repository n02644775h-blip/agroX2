import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { sanitizeForFirestore } from '../context/AuthContext';
import {
  KnowledgeDocument,
  TariroFeedbackEntry,
  TariroUnansweredQuestion
} from '../types';

export function subscribeToFirebaseKnowledgeDocs(
  onUpdate: (docs: KnowledgeDocument[]) => void
): () => void {
  try {
    const q = query(collection(db, 'knowledgeDocuments'), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snap) => {
        const items: KnowledgeDocument[] = [];
        snap.forEach((d) => {
          const data = d.data();
          items.push({
            id: data?.id || d.id,
            title: data?.title || 'Agricultural Guide',
            question: typeof data?.question === 'string' ? data.question : undefined,
            alternativeQuestions: Array.isArray(data?.alternativeQuestions) ? data.alternativeQuestions : undefined,
            category: data?.category || 'Crop Production',
            language: data?.language || 'en',
            sourceType: data?.sourceType || 'manual',
            fileName: data?.fileName,
            fileSize: data?.fileSize,
            tags: Array.isArray(data?.tags) ? data.tags : [],
            summary: data?.summary || '',
            content: typeof data?.content === 'string' ? data.content : undefined,
            followUpQuestions: Array.isArray(data?.followUpQuestions) ? data.followUpQuestions : undefined,
            sourceOrganization: typeof data?.sourceOrganization === 'string' ? data.sourceOrganization : undefined,
            sourceReference: typeof data?.sourceReference === 'string' ? data.sourceReference : undefined,
            reviewedAt: typeof data?.reviewedAt === 'string' ? data.reviewedAt : undefined,
            reviewedBy: typeof data?.reviewedBy === 'string' ? data.reviewedBy : undefined,
            reviewStatus: data?.reviewStatus,
            isBuiltIn: Boolean(data?.isBuiltIn),
            chunkCount: Number(data?.chunkCount) || 0,
            charCount: Number(data?.charCount) || 0,
            active: data?.active !== false,
            uploadedBy: data?.uploadedBy || 'Admin',
            createdAt: typeof data?.createdAt === 'string' ? data.createdAt : new Date().toISOString(),
            updatedAt: typeof data?.updatedAt === 'string' ? data.updatedAt : new Date().toISOString()
          });
        });
        onUpdate(items);
      },
      () => {}
    );
  } catch {
    return () => {};
  }
}

export async function syncKnowledgeDocToFirebase(docData: KnowledgeDocument): Promise<void> {
  try {
    await setDoc(
      doc(db, 'knowledgeDocuments', docData.id),
      sanitizeForFirestore({
        ...docData,
        syncedAt: serverTimestamp()
      }),
      { merge: true }
    );
  } catch (err) {
    console.warn('Firestore knowledge doc sync warning:', err);
  }
}

export async function deleteKnowledgeDocFromFirebase(docId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'knowledgeDocuments', docId));
  } catch {
    // ignore
  }
}

export async function saveTariroFeedbackToFirebase(entry: TariroFeedbackEntry): Promise<void> {
  try {
    await setDoc(
      doc(db, 'tariroFeedback', entry.id),
      sanitizeForFirestore({
        ...entry,
        syncedAt: serverTimestamp()
      }),
      { merge: true }
    );
  } catch {
    // ignore
  }
}

export async function saveTariroUnansweredToFirebase(entry: TariroUnansweredQuestion): Promise<void> {
  try {
    await setDoc(
      doc(db, 'tariroUnanswered', entry.id),
      sanitizeForFirestore({
        ...entry,
        syncedAt: serverTimestamp()
      }),
      { merge: true }
    );
  } catch {
    // ignore
  }
}
