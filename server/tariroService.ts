import fs from 'fs';
import path from 'path';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import { store } from './store';
import { Product, User } from '../src/types';
import firebaseConfigJson from '../firebase-applet-config.json';
import { TARIRO_SEED_KNOWLEDGE, TARIRO_SEED_VERSION } from './tariroKnowledgeSeed';
import {
  GENERIC_NON_TOPIC_TOKENS,
  ConversationContextSlots,
  buildDomainVocabulary,
  classifyTopic,
  correctSpelling,
  detectClarifyingQuestions,
  detectMarketplaceIntent,
  expandQueryTokens,
  extractConversationContext,
  normalizeText,
  tokenize
} from './tariroNlu';

export type TariroLanguage = 'auto' | 'en' | 'sn' | 'nd';

export interface KnowledgeChunk {
  id: string;
  docId: string;
  title: string;
  category: string;
  language: string;
  index: number;
  text: string;
  tokens: string[];
}

export interface StoredKnowledgeDocument {
  id: string;
  title: string;
  question?: string;
  alternativeQuestions?: string[];
  category: string;
  language: 'en' | 'sn' | 'nd' | 'multilingual';
  sourceType: 'pdf' | 'docx' | 'txt' | 'md' | 'manual';
  fileName?: string;
  fileSize?: number;
  tags: string[];
  summary: string;
  content?: string;
  followUpQuestions?: string[];
  sourceOrganization?: string;
  sourceReference?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewStatus?: 'verified' | 'needs_review' | 'draft';
  chunkCount: number;
  charCount: number;
  active: boolean;
  uploadedBy: string;
  isBuiltIn?: boolean;
  adminModified?: boolean;
  seedVersion?: string;
  createdAt: string;
  updatedAt: string;
  chunks: KnowledgeChunk[];
}

export interface TariroFeedbackRecord {
  id: string;
  interactionId: string;
  userId?: string;
  userRole?: string;
  question: string;
  answerSnippet: string;
  rating: 'helpful' | 'not_helpful';
  comment?: string;
  language?: string;
  createdAt: string;
}

export interface TariroUnansweredRecord {
  id: string;
  question: string;
  language: string;
  userId?: string;
  userRole?: string;
  reason: string;
  botReplySnippet?: string;
  status: 'open' | 'resolved';
  resolvedDocId?: string;
  adminNotes?: string;
  createdAt: string;
  resolvedAt?: string;
}

interface TariroAnalyticsStore {
  totalQueries: number;
  languageBreakdown: Record<string, number>;
  topicCounts: Record<string, number>;
  feedback: TariroFeedbackRecord[];
  unansweredQuestions: TariroUnansweredRecord[];
  deletedSeedIds?: string[];
}

export interface MatchedMarketplaceProduct {
  id: string;
  name: string;
  price: number;
  unit: string;
  farmName: string;
  farmerName: string;
  city: string;
  province: string;
  availability: string;
  quantityAvailable: number;
  categoryName: string;
  image?: string;
}

export interface TariroCitation {
  docId: string;
  title: string;
  category: string;
  excerpt: string;
  sourceOrganization?: string;
  reviewedAt?: string;
  confidenceScore?: number;
}

export interface TariroChatResponse {
  interactionId: string;
  reply: string;
  language: 'en' | 'sn' | 'nd';
  topic: string;
  citations: TariroCitation[];
  matchedProducts: MatchedMarketplaceProduct[];
  followUpQuestions: string[];
  confidenceScore: number;
  confidenceBand: 'high' | 'moderate' | 'low';
  needsClarification: boolean;
  correctedTerms: string[];
  resolvedContext?: ConversationContextSlots;
  lowConfidence: boolean;
  unansweredLogged: boolean;
  knowledgeDocsSearched: number;
}

const TARIRO_DATA_DIR = path.join(process.cwd(), 'server', 'data', 'tariro');
const KB_FILE = path.join(TARIRO_DATA_DIR, 'knowledge-library.json');
const ANALYTICS_FILE = path.join(TARIRO_DATA_DIR, 'analytics.json');

const SHONA_MARKERS = [
  'ndinga', 'ndapota', 'mhoro', 'mhoroi', 'tatenda', 'mazvita', 'chibage', 'huku', 'mombe',
  'mbudzi', 'hwai', 'madomasi', 'ivhu', 'mvura', 'fetiraiza', 'munda', 'kurima', 'zvipfuyo',
  'zvirimwa', 'ndezvipi', 'izvozvi', 'kutengeswa', 'makonye', 'masora', 'gorosi', 'donje',
  'muriwo', 'nguruve', 'zvakadii', 'ndimi', 'ndeipi', 'mushonga'
];

const NDEBELE_MARKERS = [
  'nginga', 'sawubona', 'salibonani', 'ngiyabonga', 'siyabonga', 'umbila', 'umumbu', 'inkukhu',
  'izinkukhu', 'inkomo', 'izinkomo', 'imbuzi', 'imvu', 'itamatisi', 'umhlabathi', 'amanzi',
  'umanyolo', 'ukulima', 'izilimo', 'kuyini', 'okuthengiswayo', 'khathesi', 'emakethe',
  'ekhulaneni', 'emkhuhlaneni', 'malini', 'njani', 'amabele', 'igwayi', 'ingqoloyi', 'utshinda'
];

function chunkText(
  rawText: string,
  docId: string,
  title: string,
  category: string,
  language: string
): KnowledgeChunk[] {
  const normalized = rawText
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!normalized) return [];

  const maxChars = 1100;
  const overlap = 140;
  const chunks: KnowledgeChunk[] = [];
  let cursor = 0;
  let index = 0;

  while (cursor < normalized.length) {
    let end = Math.min(normalized.length, cursor + maxChars);
    if (end < normalized.length) {
      const lastParagraph = normalized.lastIndexOf('\n\n', end);
      const lastSentence = normalized.lastIndexOf('. ', end);
      const lastSpace = normalized.lastIndexOf(' ', end);
      if (lastParagraph > cursor + 420) end = lastParagraph;
      else if (lastSentence > cursor + 420) end = lastSentence + 1;
      else if (lastSpace > cursor + 420) end = lastSpace;
    }

    const slice = normalized.slice(cursor, end).trim();
    if (slice.length >= 20) {
      chunks.push({
        id: `${docId}-c${index}`,
        docId,
        title,
        category,
        language,
        index,
        text: slice,
        tokens: tokenize(`${title} ${category} ${slice}`)
      });
      index += 1;
    }

    if (end >= normalized.length) break;
    cursor = Math.max(end - overlap, cursor + 240);
  }

  return chunks;
}

function decodeFirestoreValue(val: any): any {
  if (!val || typeof val !== 'object') return undefined;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('nullValue' in val) return null;
  if ('timestampValue' in val) return val.timestampValue;
  if ('arrayValue' in val) {
    return Array.isArray(val.arrayValue?.values)
      ? val.arrayValue.values.map(decodeFirestoreValue)
      : [];
  }
  if ('mapValue' in val) {
    const out: Record<string, any> = {};
    const fields = val.mapValue?.fields || {};
    for (const [k, v] of Object.entries(fields)) {
      out[k] = decodeFirestoreValue(v);
    }
    return out;
  }
  return undefined;
}

class TariroService {
  private docs: StoredKnowledgeDocument[] = [];
  private domainVocabulary: Set<string> = new Set();
  private analytics: TariroAnalyticsStore = {
    totalQueries: 0,
    languageBreakdown: { en: 0, sn: 0, nd: 0 },
    topicCounts: {},
    feedback: [],
    unansweredQuestions: [],
    deletedSeedIds: []
  };
  private firestoreProductCache: { items: Product[]; fetchedAt: number } = { items: [], fetchedAt: 0 };
  private firestoreUserCache: { items: User[]; fetchedAt: number } = { items: [], fetchedAt: 0 };

  constructor() {
    this.loadFromDisk();
    this.ensureSeedKnowledge();
    this.rebuildVocabulary();
  }

  private ensureDir() {
    if (!fs.existsSync(TARIRO_DATA_DIR)) {
      fs.mkdirSync(TARIRO_DATA_DIR, { recursive: true });
    }
  }

  private rebuildVocabulary() {
    const vocabWords: string[] = [];
    for (const doc of this.docs) {
      for (const t of tokenize(`${doc.title} ${doc.question || ''} ${doc.category} ${(doc.alternativeQuestions || []).join(' ')}`)) {
        vocabWords.push(t);
      }
      for (const tag of doc.tags || []) {
        for (const t of tokenize(tag)) vocabWords.push(t);
      }
    }
    this.domainVocabulary = buildDomainVocabulary(vocabWords);
  }

  private loadFromDisk() {
    try {
      this.ensureDir();
      if (fs.existsSync(KB_FILE)) {
        const raw = fs.readFileSync(KB_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) this.docs = parsed;
      }
      if (fs.existsSync(ANALYTICS_FILE)) {
        const raw = fs.readFileSync(ANALYTICS_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          this.analytics = {
            totalQueries: Number(parsed.totalQueries) || 0,
            languageBreakdown: parsed.languageBreakdown || { en: 0, sn: 0, nd: 0 },
            topicCounts: parsed.topicCounts || {},
            feedback: Array.isArray(parsed.feedback) ? parsed.feedback : [],
            unansweredQuestions: Array.isArray(parsed.unansweredQuestions) ? parsed.unansweredQuestions : [],
            deletedSeedIds: Array.isArray(parsed.deletedSeedIds) ? parsed.deletedSeedIds : []
          };
        }
      }
    } catch (err) {
      console.warn('Failed to load TARIRO persistent store:', err);
    }
  }

  private ensureSeedKnowledge() {
    const deletedSet = new Set(this.analytics.deletedSeedIds || []);
    let changed = false;
    const now = new Date().toISOString();

    // Retire superseded v1 combined/split seed IDs when untouched by admin
    const supersededSeedIds = new Set([
      'seed-goats-pigs',
      'seed-natural-regions-zim',
      'seed-soil-fertility-lime',
      'seed-agribusiness-marketing',
      'seed-horticulture-tomatoes-greens'
    ]);
    const beforeCount = this.docs.length;
    this.docs = this.docs.filter(d => !(supersededSeedIds.has(d.id) && !d.adminModified));
    if (this.docs.length !== beforeCount) changed = true;

    for (const seed of TARIRO_SEED_KNOWLEDGE) {
      if (deletedSet.has(seed.id)) continue;

      const existingIdx = this.docs.findIndex(d => d.id === seed.id);
      const indexableText = [
        seed.question,
        ...(seed.alternativeQuestions || []),
        seed.content
      ].join('\n\n');
      const chunks = chunkText(indexableText, seed.id, seed.title, seed.category, seed.language);

      if (existingIdx === -1) {
        this.docs.push({
          id: seed.id,
          title: seed.title,
          question: seed.question,
          alternativeQuestions: seed.alternativeQuestions,
          category: seed.category,
          language: seed.language,
          sourceType: 'manual',
          tags: seed.tags,
          summary: seed.content.replace(/[#*`•]/g, '').replace(/\s+/g, ' ').slice(0, 260) + '...',
          content: seed.content,
          followUpQuestions: seed.followUpQuestions,
          sourceOrganization: seed.sourceOrganization,
          sourceReference: seed.sourceReference,
          reviewedAt: seed.reviewedAt,
          reviewedBy: 'FarmBridge Agronomy Review',
          reviewStatus: seed.reviewStatus,
          chunkCount: chunks.length,
          charCount: seed.content.length,
          active: true,
          uploadedBy: seed.sourceOrganization,
          isBuiltIn: true,
          adminModified: false,
          seedVersion: TARIRO_SEED_VERSION,
          createdAt: now,
          updatedAt: now,
          chunks
        });
        changed = true;
      } else {
        const existing = this.docs[existingIdx];
        if (!existing.adminModified && existing.seedVersion !== TARIRO_SEED_VERSION) {
          this.docs[existingIdx] = {
            ...existing,
            title: seed.title,
            question: seed.question,
            alternativeQuestions: seed.alternativeQuestions,
            category: seed.category,
            language: seed.language,
            tags: seed.tags,
            summary: seed.content.replace(/[#*`•]/g, '').replace(/\s+/g, ' ').slice(0, 260) + '...',
            content: seed.content,
            followUpQuestions: seed.followUpQuestions,
            sourceOrganization: seed.sourceOrganization,
            sourceReference: seed.sourceReference,
            reviewedAt: seed.reviewedAt,
            reviewedBy: existing.reviewedBy || 'FarmBridge Agronomy Review',
            reviewStatus: seed.reviewStatus,
            chunkCount: chunks.length,
            charCount: seed.content.length,
            uploadedBy: seed.sourceOrganization,
            isBuiltIn: true,
            seedVersion: TARIRO_SEED_VERSION,
            updatedAt: now,
            chunks
          };
          changed = true;
        }
      }
    }

    if (changed) {
      this.saveKb();
    }
  }

  private saveKb() {
    try {
      this.ensureDir();
      fs.writeFileSync(KB_FILE, JSON.stringify(this.docs, null, 2), 'utf8');
    } catch (err) {
      console.warn('Failed to persist TARIRO knowledge library:', err);
    }
  }

  private saveAnalytics() {
    try {
      this.ensureDir();
      fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(this.analytics, null, 2), 'utf8');
    } catch (err) {
      console.warn('Failed to persist TARIRO analytics:', err);
    }
  }

  // --- Knowledge Library Document Parsing & Full Admin CRUD ---
  async extractTextFromFile(
    buffer: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<{ text: string; sourceType: StoredKnowledgeDocument['sourceType'] }> {
    const ext = path.extname(fileName || '').toLowerCase();
    const mime = (mimeType || '').toLowerCase();

    if (ext === '.pdf' || mime === 'application/pdf') {
      const parser = new PDFParse({ data: buffer });
      try {
        const result = await parser.getText();
        const text = (result?.text || '').trim();
        if (!text || text.length < 15) {
          throw new Error(
            'Could not extract readable text from this PDF. It may be an image-only scan without embedded text.'
          );
        }
        return { text, sourceType: 'pdf' };
      } finally {
        await parser.destroy().catch(() => {});
      }
    }

    if (
      ext === '.docx' ||
      mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const result = await mammoth.extractRawText({ buffer });
      const text = (result?.value || '').trim();
      if (!text || text.length < 15) {
        throw new Error('Could not extract readable text from this Word (.docx) document.');
      }
      return { text, sourceType: 'docx' };
    }

    if (ext === '.doc' || mime === 'application/msword') {
      throw new Error(
        'Legacy binary .doc files are not directly supported. Please save as .docx, .pdf, or .txt and upload again.'
      );
    }

    if (ext === '.txt' || ext === '.md' || ext === '.csv' || mime.startsWith('text/')) {
      const text = buffer.toString('utf8').trim();
      if (!text || text.length < 10) {
        throw new Error('Uploaded text document appears to be empty.');
      }
      return { text, sourceType: ext === '.md' ? 'md' : 'txt' };
    }

    throw new Error('Unsupported document type. Upload PDF (.pdf), Word (.docx), Text (.txt), or Markdown (.md) files.');
  }

  async addKnowledgeDocument(params: {
    title: string;
    question?: string;
    alternativeQuestions?: string[];
    category: string;
    language: 'en' | 'sn' | 'nd' | 'multilingual';
    tags?: string[];
    followUpQuestions?: string[];
    sourceOrganization?: string;
    sourceReference?: string;
    reviewedAt?: string;
    reviewedBy?: string;
    reviewStatus?: 'verified' | 'needs_review' | 'draft';
    uploadedBy: string;
    rawText?: string;
    fileBuffer?: Buffer;
    fileName?: string;
    mimeType?: string;
  }) {
    let extractedText = (params.rawText || '').trim();
    let sourceType: StoredKnowledgeDocument['sourceType'] = 'manual';
    let fileSize: number | undefined;

    if (params.fileBuffer && params.fileBuffer.length > 0) {
      fileSize = params.fileBuffer.length;
      const parsed = await this.extractTextFromFile(
        params.fileBuffer,
        params.fileName || 'document.txt',
        params.mimeType || ''
      );
      extractedText = extractedText ? `${extractedText}\n\n${parsed.text}` : parsed.text;
      sourceType = parsed.sourceType;
    }

    if (!extractedText || extractedText.length < 15) {
      throw new Error('Please upload a document with readable text or enter agricultural guidance text.');
    }

    const id = `kb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const title = params.title.trim() || params.fileName || 'Agricultural Extension Guide';
    const question = params.question?.trim() || undefined;
    const alternativeQuestions = Array.isArray(params.alternativeQuestions)
      ? params.alternativeQuestions.map(q => q.trim()).filter(Boolean).slice(0, 6)
      : [];
    const category = params.category.trim() || 'Crop Production';
    const language = params.language || 'en';
    const indexableBody = [question, ...alternativeQuestions, extractedText].filter(Boolean).join('\n\n');
    const chunks = chunkText(indexableBody, id, title, category, language);
    const now = new Date().toISOString();

    const summary =
      extractedText.replace(/[#*`•]/g, '').replace(/\s+/g, ' ').slice(0, 260) +
      (extractedText.length > 260 ? '...' : '');

    const doc: StoredKnowledgeDocument = {
      id,
      title,
      question,
      alternativeQuestions,
      category,
      language,
      sourceType,
      fileName: params.fileName,
      fileSize,
      tags: Array.isArray(params.tags) ? params.tags.filter(Boolean) : [],
      summary,
      content: extractedText,
      followUpQuestions: Array.isArray(params.followUpQuestions)
        ? params.followUpQuestions.filter(Boolean).slice(0, 4)
        : [],
      sourceOrganization: params.sourceOrganization?.trim() || 'FarmBridge Agronomy Administration',
      sourceReference: params.sourceReference?.trim() || params.fileName || undefined,
      reviewedAt: params.reviewedAt?.trim() || now.slice(0, 10),
      reviewedBy: params.reviewedBy?.trim() || params.uploadedBy || 'Admin',
      reviewStatus: params.reviewStatus || 'verified',
      chunkCount: chunks.length,
      charCount: extractedText.length,
      active: true,
      uploadedBy: params.uploadedBy || 'Admin',
      isBuiltIn: false,
      adminModified: true,
      createdAt: now,
      updatedAt: now,
      chunks
    };

    this.docs.unshift(doc);
    this.saveKb();
    this.rebuildVocabulary();
    return this.sanitizePublicDoc(doc);
  }

  private sanitizePublicDoc(doc: StoredKnowledgeDocument, includeContent = false) {
    const { chunks, content, ...meta } = doc;
    if (!includeContent) {
      return meta;
    }
    const reconstructed =
      content ||
      (Array.isArray(chunks) ? chunks.map(c => c.text).join('\n\n') : '');
    return {
      ...meta,
      content: reconstructed
    };
  }

  listKnowledgeDocuments() {
    return this.docs.map(d => this.sanitizePublicDoc(d, false));
  }

  getKnowledgeDocumentById(id: string) {
    const found = this.docs.find(d => d.id === id);
    if (!found) return null;
    return this.sanitizePublicDoc(found, true);
  }

  updateKnowledgeDocument(
    id: string,
    updates: {
      title?: string;
      question?: string;
      alternativeQuestions?: string[];
      category?: string;
      language?: 'en' | 'sn' | 'nd' | 'multilingual';
      tags?: string[];
      content?: string;
      followUpQuestions?: string[];
      sourceOrganization?: string;
      sourceReference?: string;
      reviewedAt?: string;
      reviewedBy?: string;
      reviewStatus?: 'verified' | 'needs_review' | 'draft';
      active?: boolean;
    }
  ) {
    const found = this.docs.find(d => d.id === id);
    if (!found) return null;

    if (typeof updates.title === 'string' && updates.title.trim()) {
      found.title = updates.title.trim();
    }
    if (updates.question !== undefined) {
      found.question = updates.question.trim() || undefined;
    }
    if (Array.isArray(updates.alternativeQuestions)) {
      found.alternativeQuestions = updates.alternativeQuestions.map(q => q.trim()).filter(Boolean).slice(0, 6);
    }
    if (typeof updates.category === 'string' && updates.category.trim()) {
      found.category = updates.category.trim();
    }
    if (updates.language) {
      found.language = updates.language;
    }
    if (Array.isArray(updates.tags)) {
      found.tags = updates.tags.map(t => t.trim()).filter(Boolean);
    }
    if (Array.isArray(updates.followUpQuestions)) {
      found.followUpQuestions = updates.followUpQuestions.map(q => q.trim()).filter(Boolean).slice(0, 4);
    }
    if (updates.sourceOrganization !== undefined) {
      found.sourceOrganization = updates.sourceOrganization.trim() || undefined;
    }
    if (updates.sourceReference !== undefined) {
      found.sourceReference = updates.sourceReference.trim() || undefined;
    }
    if (updates.reviewedAt !== undefined) {
      found.reviewedAt = updates.reviewedAt.trim() || new Date().toISOString().slice(0, 10);
    }
    if (updates.reviewedBy !== undefined) {
      found.reviewedBy = updates.reviewedBy.trim() || undefined;
    }
    if (updates.reviewStatus) {
      found.reviewStatus = updates.reviewStatus;
    }
    if (typeof updates.active === 'boolean') {
      found.active = updates.active;
    }

    const updatedContent =
      typeof updates.content === 'string' && updates.content.trim().length >= 15
        ? updates.content.trim()
        : found.content || found.chunks.map(c => c.text).join('\n\n');

    found.content = updatedContent;
    found.summary =
      updatedContent.replace(/[#*`•]/g, '').replace(/\s+/g, ' ').slice(0, 260) +
      (updatedContent.length > 260 ? '...' : '');
    found.charCount = updatedContent.length;

    const indexableBody = [
      found.question,
      ...(found.alternativeQuestions || []),
      updatedContent
    ].filter(Boolean).join('\n\n');
    found.chunks = chunkText(indexableBody, found.id, found.title, found.category, found.language);
    found.chunkCount = found.chunks.length;
    found.adminModified = true;
    found.updatedAt = new Date().toISOString();

    this.saveKb();
    this.rebuildVocabulary();
    return this.sanitizePublicDoc(found, true);
  }

  toggleKnowledgeDocument(id: string, active: boolean) {
    const found = this.docs.find(d => d.id === id);
    if (!found) return null;
    found.active = active;
    found.adminModified = true;
    found.updatedAt = new Date().toISOString();
    this.saveKb();
    return this.sanitizePublicDoc(found, false);
  }

  deleteKnowledgeDocument(id: string): boolean {
    const target = this.docs.find(d => d.id === id);
    if (!target) return false;
    this.docs = this.docs.filter(d => d.id !== id);
    if (target.isBuiltIn || target.id.startsWith('seed-')) {
      const deletedSet = new Set(this.analytics.deletedSeedIds || []);
      deletedSet.add(target.id);
      this.analytics.deletedSeedIds = Array.from(deletedSet);
      this.saveAnalytics();
    }
    this.saveKb();
    this.rebuildVocabulary();
    return true;
  }

  // --- Language Detection ---
  private detectLanguage(text: string, requested?: TariroLanguage): 'en' | 'sn' | 'nd' {
    if (requested === 'en' || requested === 'sn' || requested === 'nd') {
      return requested;
    }
    const padded = ` ${text.toLowerCase()} `;
    let snScore = 0;
    let ndScore = 0;

    for (const marker of SHONA_MARKERS) {
      if (padded.includes(` ${marker}`) || padded.includes(`${marker} `)) snScore += 1;
    }
    for (const marker of NDEBELE_MARKERS) {
      if (padded.includes(` ${marker}`) || padded.includes(`${marker} `)) ndScore += 1;
    }

    if (ndScore > snScore && ndScore >= 1) return 'nd';
    if (snScore > ndScore && snScore >= 1) return 'sn';
    return 'en';
  }

  // --- Upgraded Search, Topic-Boosted Scoring & Confidence Calculation ---
  retrieveKnowledgeMatches(
    queryText: string,
    targetLanguage: 'en' | 'sn' | 'nd',
    classifiedTopic: string | null,
    topK = 4
  ): {
    activeDocsCount: number;
    correctedTerms: string[];
    expandedTokens: string[];
    results: Array<{
      doc: StoredKnowledgeDocument;
      chunk: KnowledgeChunk;
      rawScore: number;
      normalizedConfidence: number;
    }>;
  } {
    const activeDocs = this.docs.filter(d => d.active);
    if (activeDocs.length === 0) {
      return { activeDocsCount: 0, correctedTerms: [], expandedTokens: [], results: [] };
    }

    const normalizedQuery = normalizeText(queryText);
    const rawTokens = tokenize(queryText);
    const { correctedTokens, correctedTerms } = correctSpelling(rawTokens, this.domainVocabulary);
    const domainTokens = correctedTokens.filter(t => !GENERIC_NON_TOPIC_TOKENS.has(t));
    const searchBase = domainTokens.length > 0 ? domainTokens : correctedTokens;
    const correctedSentence = [normalizedQuery, ...correctedTokens].join(' ');
    const expandedTokens = expandQueryTokens(searchBase, correctedSentence);

    const bestPerDoc: Array<{
      doc: StoredKnowledgeDocument;
      chunk: KnowledgeChunk;
      rawScore: number;
      normalizedConfidence: number;
    }> = [];

    for (const doc of activeDocs) {
      const titleLower = normalizeText(doc.title);
      const questionLower = normalizeText(doc.question || '');
      const altLowerList = (doc.alternativeQuestions || []).map(q => normalizeText(q));
      const categoryLower = normalizeText(doc.category);

      const titleQuestionTokens = new Set(
        tokenize(`${doc.title} ${doc.question || ''} ${(doc.alternativeQuestions || []).join(' ')} ${doc.category}`)
      );
      const tagTokens = new Set((doc.tags || []).flatMap(t => tokenize(t)));

      let docBonus = 0;

      // Exact phrase / strong substring match bonus
      if (
        normalizedQuery.length >= 6 &&
        (titleLower.includes(normalizedQuery) ||
          questionLower.includes(normalizedQuery) ||
          altLowerList.some(aq => aq.includes(normalizedQuery)))
      ) {
        docBonus += 14;
      }

      // Topic classification alignment bonus
      if (classifiedTopic && doc.category.toLowerCase() === classifiedTopic.toLowerCase()) {
        docBonus += 22;
      }

      // Token hits across title, question, alternativeQuestions, tags & category
      let domainHitCount = 0;
      const matchedBaseSet = new Set<string>();

      for (const dt of searchBase) {
        let hitHere = false;
        if (titleQuestionTokens.has(dt)) {
          docBonus += 6;
          hitHere = true;
        }
        if (tagTokens.has(dt)) {
          docBonus += 5.5;
          hitHere = true;
        }
        if (hitHere) {
          domainHitCount += 1;
          matchedBaseSet.add(dt);
        }
      }

      let expandedTitleTagBonus = 0;
      for (const qt of expandedTokens) {
        if (titleQuestionTokens.has(qt)) expandedTitleTagBonus += 2;
        if (tagTokens.has(qt)) expandedTitleTagBonus += 2;
        if (categoryLower.includes(qt)) expandedTitleTagBonus += 2;
      }
      docBonus += Math.min(12, expandedTitleTagBonus);

      // Take the strongest single alternative question phrasing match (prevent multi-question stacking)
      let bestAltBonus = 0;
      let bestAltShared = 0;
      for (const aq of altLowerList) {
        const aqTokens = tokenize(aq).filter(t => !GENERIC_NON_TOPIC_TOKENS.has(t));
        const shared = aqTokens.filter(t => expandedTokens.includes(t)).length;
        if (shared >= 2 && shared * 2.5 > bestAltBonus) {
          bestAltBonus = shared * 2.5;
          bestAltShared = shared;
        }
      }
      docBonus += bestAltBonus;
      domainHitCount += bestAltShared;

      // Language preference bonus
      if (doc.language === targetLanguage) docBonus += 2.5;
      else if (doc.language === 'multilingual') docBonus += 1.2;

      // Evaluate chunks inside document
      let bestChunk: KnowledgeChunk | null = doc.chunks[0] || null;
      let bestChunkScore = -1;

      for (const chunk of doc.chunks) {
        let cScore = 0;
        const lowerChunk = normalizeText(chunk.text);
        const chunkTokenSet = new Set(chunk.tokens);

        for (const dt of searchBase) {
          if (chunkTokenSet.has(dt) || (dt.length >= 4 && lowerChunk.includes(dt))) {
            cScore += 4;
            domainHitCount += 1;
            matchedBaseSet.add(dt);
          }
        }
        for (const qt of expandedTokens) {
          if (chunkTokenSet.has(qt)) cScore += 1.8;
          else if (qt.length >= 4 && lowerChunk.includes(qt)) cScore += 0.9;
        }

        if (cScore > bestChunkScore) {
          bestChunkScore = cScore;
          bestChunk = chunk;
        }
      }

      const rawScore = docBonus + Math.max(0, bestChunkScore);
      const coverage = searchBase.length > 0 ? matchedBaseSet.size / searchBase.length : 0;
      const normalizedConfidence = Number(
        Math.min(0.99, Math.max(0, rawScore / 34 * 0.72 + coverage * 0.28)).toFixed(2)
      );

      if (bestChunk && rawScore >= 5.5 && (domainHitCount > 0 || bestChunkScore >= 5)) {
        bestPerDoc.push({
          doc,
          chunk: bestChunk,
          rawScore,
          normalizedConfidence
        });
      }
    }

    bestPerDoc.sort((a, b) => b.rawScore - a.rawScore);
    return {
      activeDocsCount: activeDocs.length,
      correctedTerms,
      expandedTokens,
      results: bestPerDoc.slice(0, topK)
    };
  }

  // --- Real-Time Marketplace Inventory + Farmers Query ---
  private async fetchFirestoreCollection(collectionName: string): Promise<any[]> {
    const projectId = firebaseConfigJson.projectId;
    const databaseId = firebaseConfigJson.firestoreDatabaseId || '(default)';
    const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/${encodeURIComponent(databaseId)}/documents/${encodeURIComponent(collectionName)}?pageSize=100`;

    const res = await fetch(url, { signal: AbortSignal.timeout(4500) });
    if (!res.ok) return [];
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (!ct.includes('application/json')) return [];
    const json: any = await res.json();
    const docs = Array.isArray(json?.documents) ? json.documents : [];
    return docs.map((d: any) => {
      const id = String(d.name || '').split('/').pop() || '';
      const fields = d.fields || {};
      const parsed: Record<string, any> = { id };
      for (const [k, v] of Object.entries(fields)) {
        parsed[k] = decodeFirestoreValue(v);
      }
      return parsed;
    });
  }

  private async getLiveMarketplaceSnapshot(): Promise<{ products: Product[]; sellers: User[] }> {
    const now = Date.now();
    if (now - this.firestoreProductCache.fetchedAt > 15000) {
      try {
        const [fsProducts, fsUsers] = await Promise.all([
          this.fetchFirestoreCollection('products'),
          this.fetchFirestoreCollection('users')
        ]);
        this.firestoreProductCache = { items: fsProducts as Product[], fetchedAt: now };
        this.firestoreUserCache = { items: fsUsers as User[], fetchedAt: now };
      } catch {
        // Keep existing cache if offline
      }
    }

    const productMap = new Map<string, Product>();
    for (const p of store.getProducts({})) {
      productMap.set(p.id, p);
    }
    for (const fp of this.firestoreProductCache.items) {
      if (fp && fp.id && fp.name) {
        productMap.set(fp.id, {
          ...fp,
          price: Number(fp.price) || 0,
          quantityAvailable: Number(fp.quantityAvailable) || 0,
          location: fp.location || { province: 'Harare', city: 'Harare' }
        } as Product);
      }
    }

    const userMap = new Map<string, User>();
    for (const u of store.getUsers()) {
      if (u.role === 'farmer' || u.role === 'fodder_supplier') {
        userMap.set(u.id, u);
      }
    }
    for (const fu of this.firestoreUserCache.items) {
      if (
        fu &&
        fu.id &&
        (fu.role === 'farmer' || fu.role === 'fodder_supplier') &&
        fu.status !== 'suspended' &&
        fu.status !== 'deleted'
      ) {
        userMap.set(fu.id, {
          ...fu,
          name: (fu as any).fullName || fu.name || 'Local Producer'
        } as User);
      }
    }

    return {
      products: Array.from(productMap.values()),
      sellers: Array.from(userMap.values())
    };
  }

  private matchMarketplaceProducts(
    effectiveQuery: string,
    allProducts: Product[],
    contextSlots: ConversationContextSlots
  ): {
    isMarketplaceIntent: boolean;
    isCategoryBrowse: boolean;
    matched: Product[];
    categoriesSummary: string[];
  } {
    const available = allProducts.filter(
      p => p.availability !== 'temporarily_unavailable' && p.availability !== 'out_of_stock' && p.quantityAvailable > 0
    );
    const normalizedLower = normalizeText(effectiveQuery);
    const { isMarketplaceIntent, isCategoryBrowse } = detectMarketplaceIntent(normalizedLower);

    const categoriesSummary = Array.from(
      new Set(available.map(p => p.categoryName).filter(Boolean))
    );

    const rawBase = tokenize(effectiveQuery).filter(t => !GENERIC_NON_TOPIC_TOKENS.has(t));
    const { correctedTokens } = correctSpelling(rawBase, this.domainVocabulary);
    const baseTokens = correctedTokens.filter(t => !GENERIC_NON_TOPIC_TOKENS.has(t));
    const expanded = expandQueryTokens(baseTokens, normalizedLower);

    if (expanded.length === 0) {
      return {
        isMarketplaceIntent,
        isCategoryBrowse,
        matched: isMarketplaceIntent ? available.slice(0, 4) : [],
        categoriesSummary
      };
    }

    const scored = available.map(p => {
      const nameNorm = normalizeText(p.name || '');
      const catNorm = normalizeText(p.categoryName || '');
      const hay = normalizeText(
        `${p.name} ${p.categoryName} ${p.description} ${p.farmName} ${p.farmerName} ${p.location?.city || ''} ${p.location?.province || ''} ${p.isOrganic ? 'organic' : ''}`
      );
      const hayTokens = new Set(tokenize(hay));
      let score = 0;
      let nameOrCatMatched = false;
      let baseMatchedCount = 0;

      for (const bt of baseTokens) {
        const wordRegex = new RegExp(`\\b${bt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
        if (wordRegex.test(nameNorm) || hayTokens.has(bt) && nameNorm.includes(bt)) {
          score += 6;
          nameOrCatMatched = true;
          baseMatchedCount += 1;
        } else if (wordRegex.test(catNorm)) {
          score += 4.5;
          nameOrCatMatched = true;
          baseMatchedCount += 1;
        } else if (hayTokens.has(bt) || wordRegex.test(hay)) {
          score += 3;
          baseMatchedCount += 1;
        }
      }
      for (const et of expanded) {
        if (et.length >= 3 && (hayTokens.has(et) || new RegExp(`\\b${et.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(hay))) {
          score += 1.5;
        }
      }
      if (contextSlots.activeCrop && hay.includes(contextSlots.activeCrop.toLowerCase())) score += 2;
      if (contextSlots.activeLivestock && hay.includes(contextSlots.activeLivestock.toLowerCase())) score += 2;
      if (p.availability === 'available') score += 0.5;
      return { product: p, score, nameOrCatMatched, baseMatchedCount };
    });

    const matches = scored
      .filter(s => {
        if (s.score < 3) return false;
        if (baseTokens.length >= 2 && !s.nameOrCatMatched && s.baseMatchedCount < 2) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.score - a.score)
      .map(m => m.product);

    if (matches.length === 0 && (isCategoryBrowse || (isMarketplaceIntent && baseTokens.length === 0))) {
      return {
        isMarketplaceIntent,
        isCategoryBrowse,
        matched: available.slice(0, 4),
        categoriesSummary
      };
    }

    return {
      isMarketplaceIntent,
      isCategoryBrowse,
      matched: matches.slice(0, 4),
      categoriesSummary
    };
  }

  private mapPublicProduct(p: Product): MatchedMarketplaceProduct {
    return {
      id: p.id,
      name: p.name,
      price: Number(p.price) || 0,
      unit: p.unit || 'unit',
      farmName: p.farmName || p.farmerName || 'Local Farm',
      farmerName: p.farmerName || 'Verified Producer',
      city: p.location?.city || 'Harare',
      province: p.location?.province || 'Zimbabwe',
      availability: p.availability || 'available',
      quantityAvailable: Number(p.quantityAvailable) || 0,
      categoryName: p.categoryName || 'Farm Produce',
      image: p.images?.[0]
    };
  }

  private localizedLabels(lang: 'en' | 'sn' | 'nd') {
    if (lang === 'sn') {
      return {
        greeting:
          'Mhoro! Ini ndiri TARIRO, mubatsiri wenyu wekurima nemisika yeFarmBridge (ndinoshanda neKnowledge Base yemahara pasina API inobhadhariswa).\n\nNdingakubatsirai nezvirimwa (chibage, fodya, soya, gorosi, donje, muriwo nemichero), zvipfuyo (huku, mombe, mbudzi, hwai, nguruve), ivhu nefetiraiza, mvura, tupukanana nemasora, kuchengetedza goho (post-harvest), bhizinesi rekurima, uye zviri kutengeswa paFarmBridge. Mungada kubvunza chii nhasi?',
        thanks:
          'Mazvita zvikuru! Kana muine mumwe mubvunzo pamusoro pekurima, zvipfuyo, kana kutenga/kutengesa paFarmBridge, bva mabvunza hako.',
        liveListingsHeader: 'Zvirimwa & Zvipfuyo Zviri Kutengeswa Izvozvi paFarmBridge:',
        noMatchingProduct:
          'Parizvino handina kuona chigadzirwa chinopindirana nemubvunzo wenyu chiri kutengeswa paFarmBridge. Munogona kuisa "Buyer Request" kuti varimi vakupindurei.',
        relatedPrefix: 'Ruzivo Rwakabatana Kubva kuKnowledge Base:',
        clarifyHeader: 'Kuti ndikupindurei zvakanyatsoenderana nemunda wenyu, mungandiwedzera izvi:',
        sourceFooterPrefix: 'Kunobva Ruzivo',
        unavailableReply:
          'Ndine urombo — parizvino handina ruzivo rwakakwana kana gwaro remusoro iwoyo muFarmBridge Agricultural Knowledge Base yedu.\n\nIni ndiri mubatsiri wekurima unobva muruzivo rwakachengetwa muKnowledge Base yemuno (kwete AI inofungidzira), saka handidi kukunyeperai kana kugadzira mhinduro isina chokwadi. Ndanyora mubvunzo uyu kuti maneja weFarmBridge azowedzera ruzivo rwacho.',
        availableTopicsHeader: 'Misoro yamungabvunza izvozvi:',
        defaultFollowUps: [
          'Ndingagadzirira sei munda wechibage nePfumvudza?',
          'Ndezvipi zvirimwa zviri kutengeswa paFarmBridge izvozvi?',
          'Ndingachengeta sei huku dzebroiler zvakanaka?'
        ]
      };
    }

    if (lang === 'nd') {
      return {
        greeting:
          'Sawubona! NginguTARIRO, umsizi wakho wokulima lemakethe yeFarmBridge (ngisebenzisa iKnowledge Base yamahhala engela-API ekhokhelwayo).\n\nNgingakusiza ngezilimo (umumbu, igwayi, isoya, ingqoloyi, utshinda, imibhida lezithelo), izifuyo (izinkukhu, izinkomo, imbuzi, izimvu, ingulube), umhlabathi lomanyolo, amanzi okunkcenkceshela, izibungu lokhula, ukulondoloza isivuno, ibhizimusi lezolimo, lokuthengiswayo kuFarmBridge. Ungathanda ukubuza ngani lamhlanje?',
        thanks:
          'Ngiyabonga kakhulu! Nxa ulomunye umbuzo ngekulima, ukufuya, loba ukuthenga lokuthengisa kuFarmBridge, khululeka ukubuza.',
        liveListingsHeader: 'Okuthengiswayo Okukhona Khathesi kuFarmBridge:',
        noMatchingProduct:
          'Khathesi angitholanga okuhambelana lalokho okudingayo osekulistiwe kuFarmBridge. Ungafaka i-"Buyer Request" ukuze abalimi abaseduze bakuphendule.',
        relatedPrefix: 'Okunye okuhambelanayo okuvela kuKnowledge Base:',
        clarifyHeader: 'Ukuze ngikunikeze impendulo eqondileyo ngomhlabathi kumbe indawo yakho:',
        sourceFooterPrefix: 'Umthombo Wolwazi',
        unavailableReply:
          'Uxolo — khathesi angilalo ulwazi oluqinisekisiweyo ngalowo mbuzo kuFarmBridge Agricultural Knowledge Base yethu.\n\nNgingumsizi osebenzisa ulwazi olugcinwe emtapweni wethu wezolimo (hayi i-AI eqambayo), ngakho ngingeke ngiqambe impendulo. Sengiwulobile umbuzo wakho ukuze abaphathi beFarmBridge bangezelele umhlahlandlela wakhona.',
        availableTopicsHeader: 'Izihloko ongazibuza khathesi:',
        defaultFollowUps: [
          'Ngingawulungiselela njani umhlabathi womumbu ngePfumvudza?',
          'Kuyini okuthengiswayo emakethe yeFarmBridge khathesi?',
          'Ngingavikela njani izinkukhu zami emkhuhlaneni?'
        ]
      };
    }

    return {
      greeting:
        "Hello! I'm TARIRO, your FarmBridge agricultural knowledge assistant (free local knowledge engine, no paid AI APIs).\n\nI cover 28+ agricultural topics for Zimbabwe — crops (maize, tobacco, soya, wheat, cotton), horticulture (vegetables & fruit orchards), livestock (poultry, cattle, goats, sheep, pigs), soil science/pH/lime & fertilisers, irrigation, pests/diseases & weeds, conservation & climate-smart farming, post-harvest storage, agribusiness economics & marketing, plus live FarmBridge listings. What would you like to learn or check today?",
      thanks:
        "You're very welcome! Feel free to ask any follow-up question about Zimbabwean farming practices or what is available on FarmBridge.",
      liveListingsHeader: 'Live FarmBridge Listings Matching Your Query:',
      noMatchingProduct:
        'I checked the live FarmBridge marketplace and did not find an active listing matching that exact item right now. You can post a Buyer Request so nearby farmers can reply directly.',
      relatedPrefix: 'Related Guidance From the Knowledge Base:',
      clarifyHeader: 'To tailor this advice even more closely to your farm, could you share:',
      sourceFooterPrefix: 'Source & Last Reviewed',
      unavailableReply:
        "I don't currently have verified information in my FarmBridge Agricultural Knowledge Base to answer that question reliably.\n\nBecause I am a searchable agricultural knowledge assistant (and not an unrestricted generative model), I will never guess or invent advice. I have logged your question so FarmBridge administrators can add a verified guide for this topic.",
      availableTopicsHeader: 'Here are agricultural topics covered in my knowledge base right now:',
      defaultFollowUps: [
        'How do I prepare soil for maize under Pfumvudza?',
        'What fresh produce is available on FarmBridge right now?',
        'How should I test soil pH and apply agricultural lime?'
      ]
    };
  }

  // --- Free Knowledge-Based Chat Pipeline (Zero External AI APIs) ---
  async chat(params: {
    message: string;
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    language?: TariroLanguage;
    userId?: string;
    userRole?: string;
  }): Promise<TariroChatResponse> {
    const cleanMessage = (params.message || '').trim();
    if (!cleanMessage) {
      const err: any = new Error('Please enter a question for TARIRO.');
      err.status = 400;
      throw err;
    }

    const interactionId = `tar-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const lang = this.detectLanguage(cleanMessage, params.language);
    const labels = this.localizedLabels(lang);

    const trimmedLower = cleanMessage.toLowerCase().replace(/[!?.]/g, '').trim();
    if (/^(hi|hello|hey|mhoro|mhoroi|mangwanani|masikati|manheru|sawubona|salibonani|who are you|what can you do)$/.test(trimmedLower)) {
      return {
        interactionId,
        reply: labels.greeting,
        language: lang,
        topic: 'Welcome & Scope',
        citations: [],
        matchedProducts: [],
        followUpQuestions: labels.defaultFollowUps,
        confidenceScore: 1,
        confidenceBand: 'high',
        needsClarification: false,
        correctedTerms: [],
        lowConfidence: false,
        unansweredLogged: false,
        knowledgeDocsSearched: this.docs.filter(d => d.active).length
      };
    }

    if (/^(thanks|thank you|tatenda|mazvita|ngiyabonga|siyabonga|ok thanks|thank you very much)$/.test(trimmedLower)) {
      return {
        interactionId,
        reply: labels.thanks,
        language: lang,
        topic: 'Conversation',
        citations: [],
        matchedProducts: [],
        followUpQuestions: labels.defaultFollowUps,
        confidenceScore: 1,
        confidenceBand: 'high',
        needsClarification: false,
        correctedTerms: [],
        lowConfidence: false,
        unansweredLogged: false,
        knowledgeDocsSearched: this.docs.filter(d => d.active).length
      };
    }

    // 1. Multi-Turn Context & Slot Extraction
    const { slots, carryForwardTokens, usedHistoryContext } = extractConversationContext(
      cleanMessage,
      params.history
    );
    const effectiveQuery =
      usedHistoryContext && carryForwardTokens.length > 0
        ? `${cleanMessage} ${carryForwardTokens.join(' ')}`
        : cleanMessage;

    // 2. Topic Classification & Knowledge Retrieval
    const normalizedEff = normalizeText(effectiveQuery);
    const preliminaryTokens = tokenize(effectiveQuery);
    const { correctedTokens: prelimCorrected } = correctSpelling(preliminaryTokens, this.domainVocabulary);
    const prelimExpanded = expandQueryTokens(prelimCorrected, `${normalizedEff} ${prelimCorrected.join(' ')}`);
    const topicGuess = classifyTopic(normalizedEff, prelimExpanded);

    const kbSearch = this.retrieveKnowledgeMatches(effectiveQuery, lang, topicGuess.topic, 4);

    // 3. Live Marketplace Query (Express store + Firestore)
    const snapshot = await this.getLiveMarketplaceSnapshot();
    const mpResult = this.matchMarketplaceProducts(effectiveQuery, snapshot.products, slots);
    const matchedProducts: MatchedMarketplaceProduct[] = mpResult.matched.map(p =>
      this.mapPublicProduct(p)
    );

    const clarifyingQuestions = detectClarifyingQuestions(cleanMessage, slots, lang);

    const citations: TariroCitation[] = kbSearch.results.slice(0, 3).map(r => ({
      docId: r.doc.id,
      title: r.doc.title,
      category: r.doc.category,
      excerpt: r.chunk.text.replace(/[#*`•]/g, '').slice(0, 180) + (r.chunk.text.length > 180 ? '...' : ''),
      sourceOrganization: r.doc.sourceOrganization,
      reviewedAt: r.doc.reviewedAt,
      confidenceScore: r.normalizedConfidence
    }));

    let replyParts: string[] = [];
    let topic = topicGuess.topic || 'General Agriculture';
    let confidenceScore = 0;
    let confidenceBand: 'high' | 'moderate' | 'low' = 'low';
    let lowConfidence = false;
    let unansweredLogged = false;
    const followUpSet = new Set<string>();

    const hasKbMatch = kbSearch.results.length > 0;
    const primaryMatch = kbSearch.results[0];

    if (mpResult.isMarketplaceIntent && (!hasKbMatch || mpResult.isCategoryBrowse)) {
      topic = 'FarmBridge Marketplace';
      confidenceScore = 0.88;
      confidenceBand = 'high';

      if (mpResult.isCategoryBrowse && mpResult.categoriesSummary.length > 0) {
        replyParts.push(
          `Active FarmBridge categories currently include: **${mpResult.categoriesSummary.join(', ')}**.`
        );
      }
      if (matchedProducts.length > 0) {
        replyParts.push(labels.liveListingsHeader);
        for (const prod of matchedProducts) {
          replyParts.push(
            `• **${prod.name}** — $${prod.price.toFixed(2)}/${prod.unit} (${prod.quantityAvailable} ${prod.unit} available) from ${prod.farmName} in ${prod.city}, ${prod.province}.`
          );
        }
        replyParts.push('Tap any listing card below to view full details or add it to your cart.');
      } else {
        replyParts.push(labels.noMatchingProduct);
      }
      if (snapshot.sellers.length > 0) {
        const sampleSellers = snapshot.sellers
          .slice(0, 3)
          .map(s => `${s.farmerProfile?.farmName || s.name} (${s.location?.city || 'Zimbabwe'})`)
          .join(', ');
        replyParts.push(`Verified active producers include: ${sampleSellers}.`);
      }
      followUpSet.add('How do buyers place an order and upload Proof of Payment on FarmBridge?');
      followUpSet.add('Which crops suit my Natural Region in Zimbabwe?');
    } else if (hasKbMatch && primaryMatch) {
      topic = primaryMatch.doc.category;
      confidenceScore = primaryMatch.normalizedConfidence;
      confidenceBand = confidenceScore >= 0.55 ? 'high' : 'moderate';

      // Context acknowledgment header when carrying context forward
      const activeLabels = [slots.activeCrop, slots.activeLivestock, slots.activeRegion].filter(Boolean);
      if (usedHistoryContext && activeLabels.length > 0) {
        replyParts.push(`_Continuing with context: **${activeLabels.join(' · ')}**_`);
      }

      if (confidenceBand === 'moderate' && clarifyingQuestions.length > 0) {
        replyParts.push(
          `Here is verified guidance on **${primaryMatch.doc.title}** (partial match — share a bit more detail if you need tailored specifics):`
        );
      } else {
        replyParts.push(`## ${primaryMatch.doc.title}`);
      }

      if (primaryMatch.doc.question && primaryMatch.doc.sourceType === 'manual' && !primaryMatch.doc.isBuiltIn) {
        replyParts.push(`**Q:** ${primaryMatch.doc.question}`);
      }

      const primaryBody =
        primaryMatch.doc.content && primaryMatch.doc.content.length <= 2400
          ? primaryMatch.doc.content
          : primaryMatch.chunk.text;
      replyParts.push(primaryBody);

      // Include a concise related note if a second distinct guide scored strongly
      if (kbSearch.results.length > 1 && kbSearch.results[1].rawScore >= primaryMatch.rawScore * 0.62) {
        const secondary = kbSearch.results[1];
        const snippet = secondary.chunk.text.replace(/[#*`]/g, '').slice(0, 240);
        replyParts.push(
          `\n${labels.relatedPrefix}\n• **${secondary.doc.title}**: ${snippet}${secondary.chunk.text.length > 240 ? '...' : ''}`
        );
      }

      // Include verified source + review date footer cleanly
      if (primaryMatch.doc.sourceOrganization || primaryMatch.doc.reviewedAt) {
        replyParts.push(
          `_${labels.sourceFooterPrefix}: ${primaryMatch.doc.sourceOrganization || 'FarmBridge Agronomy Library'}${primaryMatch.doc.reviewedAt ? ` · Reviewed ${primaryMatch.doc.reviewedAt}` : ''}_`
        );
      }

      // Append live FarmBridge products if relevant to query
      if (matchedProducts.length > 0 && (mpResult.isMarketplaceIntent || usedHistoryContext)) {
        replyParts.push(`\n${labels.liveListingsHeader}`);
        for (const prod of matchedProducts.slice(0, 3)) {
          replyParts.push(
            `• **${prod.name}** — $${prod.price.toFixed(2)}/${prod.unit} (${prod.quantityAvailable} ${prod.unit} available) at ${prod.farmName}, ${prod.city}.`
          );
        }
      } else if (mpResult.isMarketplaceIntent) {
        replyParts.push(`\n${labels.noMatchingProduct}`);
      }

      // Proactive clarifying follow-up questions if query was under-specified
      if (clarifyingQuestions.length > 0) {
        replyParts.push(`\n**${labels.clarifyHeader}**\n${clarifyingQuestions.map(q => `• ${q}`).join('\n')}`);
      }

      // Populate related follow-up questions
      for (const fq of primaryMatch.doc.followUpQuestions || []) {
        followUpSet.add(fq);
      }
      if (kbSearch.results[1]?.doc.question) {
        followUpSet.add(kbSearch.results[1].doc.question);
      }
    } else {
      // Honest limitation: no reliable match found
      lowConfidence = true;
      confidenceScore = 0.12;
      confidenceBand = 'low';
      topic = 'Knowledge Gap';
      const availableCategories = Array.from(
        new Set(this.docs.filter(d => d.active).map(d => d.category))
      );
      replyParts.push(labels.unavailableReply);
      if (availableCategories.length > 0) {
        replyParts.push(`\n**${labels.availableTopicsHeader}**\n• ${availableCategories.slice(0, 14).join('\n• ')}`);
      }
      labels.defaultFollowUps.forEach(f => followUpSet.add(f));
    }

    const reply = replyParts.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();

    // Record analytics & unanswered question queue
    this.analytics.totalQueries += 1;
    this.analytics.languageBreakdown[lang] = (this.analytics.languageBreakdown[lang] || 0) + 1;
    this.analytics.topicCounts[topic] = (this.analytics.topicCounts[topic] || 0) + 1;

    if (lowConfidence) {
      const alreadyOpen = this.analytics.unansweredQuestions.some(
        u => u.question.toLowerCase() === cleanMessage.toLowerCase() && u.status === 'open'
      );
      if (!alreadyOpen) {
        unansweredLogged = true;
        this.analytics.unansweredQuestions.unshift({
          id: `unans-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          question: cleanMessage,
          language: lang,
          userId: params.userId,
          userRole: params.userRole,
          reason: 'No matching verified entry found in Knowledge Base or live Marketplace',
          botReplySnippet: reply.slice(0, 220),
          status: 'open',
          createdAt: new Date().toISOString()
        });
        if (this.analytics.unansweredQuestions.length > 250) {
          this.analytics.unansweredQuestions.length = 250;
        }
      }
    }
    this.saveAnalytics();

    const followUpQuestions = Array.from(followUpSet)
      .filter(q => q.toLowerCase() !== cleanMessage.toLowerCase())
      .slice(0, 3);

    return {
      interactionId,
      reply,
      language: lang,
      topic,
      citations,
      matchedProducts: matchedProducts.slice(0, 4),
      followUpQuestions,
      confidenceScore,
      confidenceBand,
      needsClarification: clarifyingQuestions.length > 0,
      correctedTerms: kbSearch.correctedTerms,
      resolvedContext: slots,
      lowConfidence,
      unansweredLogged,
      knowledgeDocsSearched: kbSearch.activeDocsCount
    };
  }

  recordFeedback(params: {
    interactionId: string;
    userId?: string;
    userRole?: string;
    question: string;
    answerSnippet: string;
    rating: 'helpful' | 'not_helpful';
    comment?: string;
    language?: string;
  }): TariroFeedbackRecord {
    const entry: TariroFeedbackRecord = {
      id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      interactionId: params.interactionId,
      userId: params.userId,
      userRole: params.userRole,
      question: params.question.slice(0, 300),
      answerSnippet: params.answerSnippet.slice(0, 300),
      rating: params.rating,
      comment: params.comment?.trim() || undefined,
      language: params.language,
      createdAt: new Date().toISOString()
    };

    this.analytics.feedback = [
      entry,
      ...this.analytics.feedback.filter(f => f.interactionId !== params.interactionId)
    ].slice(0, 300);

    if (params.rating === 'not_helpful') {
      const alreadyLogged = this.analytics.unansweredQuestions.some(
        u => u.question.toLowerCase() === params.question.trim().toLowerCase() && u.status === 'open'
      );
      if (!alreadyLogged && params.question.trim()) {
        this.analytics.unansweredQuestions.unshift({
          id: `unans-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          question: params.question.slice(0, 400),
          language: params.language || 'en',
          userId: params.userId,
          userRole: params.userRole,
          reason: params.comment?.trim() || 'Marked not helpful by user',
          botReplySnippet: params.answerSnippet.slice(0, 220),
          status: 'open',
          createdAt: new Date().toISOString()
        });
      }
    }

    this.saveAnalytics();
    return entry;
  }

  resolveUnansweredQuestion(
    id: string,
    status: 'open' | 'resolved',
    adminNotes?: string,
    resolvedDocId?: string
  ) {
    const item = this.analytics.unansweredQuestions.find(u => u.id === id);
    if (!item) return null;
    item.status = status;
    if (adminNotes !== undefined) item.adminNotes = adminNotes;
    if (resolvedDocId !== undefined) item.resolvedDocId = resolvedDocId;
    if (status === 'resolved') item.resolvedAt = new Date().toISOString();
    this.saveAnalytics();
    return item;
  }

  getAnalyticsSummary() {
    const helpfulCount = this.analytics.feedback.filter(f => f.rating === 'helpful').length;
    const notHelpfulCount = this.analytics.feedback.filter(f => f.rating === 'not_helpful').length;
    const activeDocs = this.docs.filter(d => d.active);
    const totalChunksCount = activeDocs.reduce((sum, d) => sum + d.chunkCount, 0);
    const totalCategoriesCount = new Set(this.docs.map(d => d.category)).size;
    const topTopics = Object.entries(this.analytics.topicCounts)
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return {
      knowledgeEngineMode: 'free_local_kb' as const,
      totalQueries: this.analytics.totalQueries,
      helpfulCount,
      notHelpfulCount,
      openUnansweredCount: this.analytics.unansweredQuestions.filter(u => u.status === 'open').length,
      activeDocumentsCount: activeDocs.length,
      totalDocumentsCount: this.docs.length,
      totalChunksCount,
      totalCategoriesCount,
      languageBreakdown: this.analytics.languageBreakdown,
      topTopics,
      recentFeedback: this.analytics.feedback.slice(0, 30),
      unansweredQuestions: this.analytics.unansweredQuestions.slice(0, 50)
    };
  }

  async verifyAdminActor(adminId: string): Promise<{ id: string; name: string } | null> {
    const cleanId = (adminId || '').trim();
    if (!cleanId) return null;

    const storeUser = store.getUserById(cleanId);
    if (storeUser) {
      if (storeUser.role === 'admin' && storeUser.status !== 'suspended') {
        return { id: storeUser.id, name: storeUser.name || 'Administrator' };
      }
      return null;
    }

    try {
      const projectId = firebaseConfigJson.projectId;
      const databaseId = firebaseConfigJson.firestoreDatabaseId || '(default)';
      const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/${encodeURIComponent(databaseId)}/documents/users/${encodeURIComponent(cleanId)}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) return null;
      const ct = (res.headers.get('content-type') || '').toLowerCase();
      if (!ct.includes('application/json')) return null;
      const json: any = await res.json();
      const fields = json?.fields;
      if (!fields) return null;
      const role = decodeFirestoreValue(fields.role);
      const status = decodeFirestoreValue(fields.status);
      const name =
        decodeFirestoreValue(fields.fullName) ||
        decodeFirestoreValue(fields.name) ||
        'Administrator';
      if (role === 'admin' && status !== 'suspended') {
        return { id: cleanId, name: String(name) };
      }
    } catch {
      // ignore
    }
    return null;
  }
}

export const tariroService = new TariroService();
