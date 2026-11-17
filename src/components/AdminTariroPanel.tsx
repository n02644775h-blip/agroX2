import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import {
  syncKnowledgeDocToFirebase,
  deleteKnowledgeDocFromFirebase,
  subscribeToFirebaseKnowledgeDocs
} from '../services/firebaseTariro';
import {
  KnowledgeDocument,
  TariroAnalyticsSummary,
  TariroUnansweredQuestion
} from '../types';
import { LiquidGlassCard, LiquidGlassButton } from './glass';
import {
  Bot,
  Upload,
  FileText,
  Trash2,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  Sparkles,
  Power,
  RefreshCw,
  Plus,
  Edit2,
  Search,
  Save,
  X,
  ShieldCheck
} from 'lucide-react';

interface AdminTariroPanelProps {
  adminId: string;
  onNotice?: (message: string) => void;
}

const KNOWLEDGE_CATEGORIES = [
  'Crop Production',
  'Maize Production',
  'Tobacco Production',
  'Soya Bean Production',
  'Wheat Production',
  'Cotton Production',
  'Horticulture',
  'Vegetable Production',
  'Fruit Production',
  'Livestock Production',
  'Poultry Production',
  'Cattle Production',
  'Goat and Sheep Production',
  'Pig Production',
  'Soil Science',
  'Soil Fertility and Nutrient Management',
  'Soil pH and Lime Requirements',
  'Fertiliser Management',
  'Irrigation and Water Management',
  'Agricultural Pests and Diseases',
  'Weed Management',
  'Climate-Smart Agriculture',
  'Conservation Agriculture',
  'Agricultural Economics',
  'Farm Management',
  'Agricultural Marketing',
  'Post-Harvest Management',
  'Agricultural Entrepreneurship',
  'Zimbabwean Agricultural Practices',
  'FarmBridge Platform Guide'
];

export const AdminTariroPanel: React.FC<AdminTariroPanelProps> = ({ adminId, onNotice }) => {
  const [docs, setDocs] = useState<KnowledgeDocument[]>([]);
  const [analytics, setAnalytics] = useState<TariroAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Upload / Add / Edit Knowledge State
  const [uploadMode, setUploadMode] = useState<'file' | 'text'>('text');
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState('');
  const [docQuestion, setDocQuestion] = useState('');
  const [docAltQuestions, setDocAltQuestions] = useState('');
  const [docCategory, setDocCategory] = useState('Crop Production');
  const [docLanguage, setDocLanguage] = useState<'en' | 'sn' | 'nd' | 'multilingual'>('en');
  const [docTags, setDocTags] = useState('');
  const [docContent, setDocContent] = useState('');
  const [docFollowUps, setDocFollowUps] = useState('');
  const [docSourceOrg, setDocSourceOrg] = useState('AGRITEX / FarmBridge Agronomy');
  const [docSourceRef, setDocSourceRef] = useState('');
  const [docReviewStatus, setDocReviewStatus] = useState<'verified' | 'needs_review' | 'draft'>('verified');
  const [docReviewedAt, setDocReviewedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [resolvingQuestionId, setResolvingQuestionId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Library Filter & Search State
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [searchFilter, setSearchFilter] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [kbList, statsRes] = await Promise.all([
        api.getKnowledgeDocuments().catch(() => []),
        api.getTariroAnalytics(adminId).catch(() => null)
      ]);
      if (Array.isArray(kbList)) {
        setDocs(kbList);
      }
      if (statsRes) {
        setAnalytics(statsRes);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeToFirebaseKnowledgeDocs((fbDocs) => {
      if (fbDocs.length > 0) {
        setDocs(prev => {
          const map = new Map<string, KnowledgeDocument>();
          fbDocs.forEach(d => map.set(d.id, d));
          prev.forEach(d => map.set(d.id, d));
          return Array.from(map.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
      }
    });
    return () => unsub();
  }, [adminId]);

  const resetFormFields = () => {
    setEditingDocId(null);
    setDocTitle('');
    setDocQuestion('');
    setDocAltQuestions('');
    setDocTags('');
    setDocContent('');
    setDocFollowUps('');
    setDocSourceOrg('AGRITEX / FarmBridge Agronomy');
    setDocSourceRef('');
    setDocReviewStatus('verified');
    setDocReviewedAt(new Date().toISOString().slice(0, 10));
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleStartEdit = async (docItem: KnowledgeDocument) => {
    setUploadError('');
    setUploadSuccess('');
    setLoadingEditId(docItem.id);
    try {
      const fullDoc = await api.getKnowledgeDocumentById(docItem.id).catch(() => docItem);
      setUploadMode('text');
      setEditingDocId(fullDoc.id);
      setDocTitle(fullDoc.title || '');
      setDocQuestion(fullDoc.question || '');
      setDocAltQuestions(
        Array.isArray(fullDoc.alternativeQuestions) ? fullDoc.alternativeQuestions.join('\n') : ''
      );
      setDocCategory(fullDoc.category || 'Crop Production');
      setDocLanguage(fullDoc.language || 'en');
      setDocTags(Array.isArray(fullDoc.tags) ? fullDoc.tags.join(', ') : '');
      setDocContent(fullDoc.content || fullDoc.summary || '');
      setDocFollowUps(
        Array.isArray(fullDoc.followUpQuestions) ? fullDoc.followUpQuestions.join('\n') : ''
      );
      setDocSourceOrg(fullDoc.sourceOrganization || 'AGRITEX / FarmBridge Agronomy');
      setDocSourceRef(fullDoc.sourceReference || '');
      setDocReviewStatus(fullDoc.reviewStatus || 'verified');
      setDocReviewedAt(fullDoc.reviewedAt || new Date().toISOString().slice(0, 10));
      setResolvingQuestionId(null);
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to load full entry for editing.');
    } finally {
      setLoadingEditId(null);
    }
  };

  const handleSubmitKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError('');
    setUploadSuccess('');

    const tagsArray = docTags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const altQuestionsArray = docAltQuestions
      .split(/\n|;/)
      .map(q => q.trim())
      .filter(Boolean)
      .slice(0, 6);

    const followUpsArray = docFollowUps
      .split(/\n|;/)
      .map(q => q.trim())
      .filter(Boolean)
      .slice(0, 4);

    if (uploadMode === 'file' && !editingDocId && !selectedFile) {
      setUploadError('Please select a PDF (.pdf), Word (.docx), Text (.txt), or Markdown (.md) document.');
      return;
    }
    if ((uploadMode === 'text' || editingDocId) && (!docTitle.trim() || docContent.trim().length < 20)) {
      setUploadError('Please provide both a title and at least 20 characters of agricultural guidance.');
      return;
    }

    setSubmitting(true);
    try {
      let saved: KnowledgeDocument;
      if (editingDocId) {
        saved = await api.updateKnowledgeDocument(editingDocId, {
          actingAdminId: adminId,
          title: docTitle.trim(),
          question: docQuestion.trim() || undefined,
          alternativeQuestions: altQuestionsArray,
          category: docCategory,
          language: docLanguage,
          tags: tagsArray,
          followUpQuestions: followUpsArray,
          sourceOrganization: docSourceOrg.trim() || undefined,
          sourceReference: docSourceRef.trim() || undefined,
          reviewedAt: docReviewedAt || new Date().toISOString().slice(0, 10),
          reviewStatus: docReviewStatus,
          content: docContent.trim()
        });
      } else if (uploadMode === 'file' && selectedFile) {
        saved = await api.uploadKnowledgeDocumentFile(selectedFile, {
          actingAdminId: adminId,
          title: docTitle.trim() || selectedFile.name.replace(/\.[^.]+$/, ''),
          question: docQuestion.trim() || undefined,
          category: docCategory,
          language: docLanguage,
          tags: tagsArray
        });
      } else {
        saved = await api.createKnowledgeEntry({
          actingAdminId: adminId,
          title: docTitle.trim(),
          question: docQuestion.trim() || undefined,
          alternativeQuestions: altQuestionsArray,
          category: docCategory,
          language: docLanguage,
          tags: tagsArray,
          followUpQuestions: followUpsArray,
          sourceOrganization: docSourceOrg.trim() || undefined,
          sourceReference: docSourceRef.trim() || undefined,
          reviewedAt: docReviewedAt || new Date().toISOString().slice(0, 10),
          reviewStatus: docReviewStatus,
          content: docContent.trim()
        });
      }

      await syncKnowledgeDocToFirebase(saved);
      setDocs(prev => [saved, ...prev.filter(d => d.id !== saved.id)]);

      if (resolvingQuestionId) {
        await api
          .updateTariroUnanswered(resolvingQuestionId, {
            actingAdminId: adminId,
            status: 'resolved',
            resolvedDocId: saved.id,
            adminNotes: `Resolved with Knowledge Library document: ${saved.title}`
          })
          .catch(() => {});
        setResolvingQuestionId(null);
      }

      const wasEditing = Boolean(editingDocId);
      resetFormFields();

      setUploadSuccess(
        wasEditing
          ? `"${saved.title}" updated and re-indexed (${saved.chunkCount} searchable chunks).`
          : `"${saved.title}" indexed (${saved.chunkCount} searchable chunks) and ready for TARIRO!`
      );
      onNotice?.(
        wasEditing
          ? `Updated "${saved.title}" in TARIRO Knowledge Library.`
          : `Added "${saved.title}" to TARIRO Knowledge Library.`
      );
      await loadData();
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to save knowledge document.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (docItem: KnowledgeDocument) => {
    try {
      const updated = await api.toggleKnowledgeDocument(docItem.id, !docItem.active, adminId);
      await syncKnowledgeDocToFirebase(updated);
      setDocs(prev => prev.map(d => (d.id === docItem.id ? updated : d)));
      onNotice?.(`"${updated.title}" is now ${updated.active ? 'active' : 'paused'}.`);
      await loadData();
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to update document status.');
    }
  };

  const handleMarkReviewed = async (docItem: KnowledgeDocument) => {
    const today = new Date().toISOString().slice(0, 10);
    try {
      const updated = await api.updateKnowledgeDocument(docItem.id, {
        actingAdminId: adminId,
        reviewStatus: 'verified',
        reviewedAt: today
      });
      await syncKnowledgeDocToFirebase(updated);
      setDocs(prev => prev.map(d => (d.id === docItem.id ? updated : d)));
      onNotice?.(`Marked "${updated.title}" as verified on ${today}.`);
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to update review date.');
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    setPendingDeleteId(null);
    try {
      await api.deleteKnowledgeDocument(docId, adminId);
      await deleteKnowledgeDocFromFirebase(docId);
      setDocs(prev => prev.filter(d => d.id !== docId));
      if (editingDocId === docId) {
        resetFormFields();
      }
      onNotice?.('Removed outdated entry from TARIRO Knowledge Library.');
      await loadData();
    } catch (err: any) {
      setUploadError(err?.message || 'Could not remove document.');
    }
  };

  const handleResolveUnanswered = async (q: TariroUnansweredQuestion, withGuide: boolean) => {
    if (withGuide) {
      setEditingDocId(null);
      setUploadMode('text');
      setDocTitle(q.question.slice(0, 72));
      setDocQuestion(q.question);
      setDocLanguage(q.language === 'sn' || q.language === 'nd' ? q.language : 'en');
      setResolvingQuestionId(q.id);
      return;
    }
    try {
      await api.updateTariroUnanswered(q.id, {
        actingAdminId: adminId,
        status: 'resolved',
        adminNotes: 'Reviewed and resolved by Admin'
      });
      await loadData();
    } catch {
      // ignore
    }
  };

  const openUnanswered = (analytics?.unansweredQuestions || []).filter(q => q.status === 'open');
  const resolvedUnanswered = (analytics?.unansweredQuestions || []).filter(q => q.status === 'resolved');

  const availableCategories = Array.from(
    new Set([...KNOWLEDGE_CATEGORIES, ...docs.map(d => d.category).filter(Boolean)])
  );

  const filteredDocs = docs.filter((d) => {
    const matchesCategory = filterCategory === 'All' || d.category === filterCategory;
    const q = searchFilter.trim().toLowerCase();
    const matchesSearch =
      !q ||
      d.title.toLowerCase().includes(q) ||
      (d.question || '').toLowerCase().includes(q) ||
      d.summary.toLowerCase().includes(q) ||
      d.category.toLowerCase().includes(q) ||
      d.tags.some(t => t.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* TARIRO Overview Header & Metrics */}
      <LiquidGlassCard variant="mint" className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#062B1F] border border-[#A8E635]/50 flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5 text-[#A8E635]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-extrabold text-[#062B1F]">
                  TARIRO Agricultural Knowledge Assistant
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-[#DFF4E4] text-[#145A38] border-[#145A38]/25">
                  Free Knowledge Engine · Active (No API Key)
                </span>
              </div>
              <p className="text-xs text-[#0B3D2B]/75">
                Add or edit Q&amp;A guides, upload PDF/Word manuals, organise topics, and resolve farmer knowledge gaps.
              </p>
            </div>
          </div>

          <LiquidGlassButton
            type="button"
            variant="light"
            size="xs"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#145A38] ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </LiquidGlassButton>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums">
          <div className="p-3.5 rounded-2xl bg-white/80 border border-white">
            <div className="text-[11px] font-semibold text-[#0B3D2B]/65">Total Queries</div>
            <div className="text-2xl font-black text-[#062B1F] mt-0.5">
              {analytics?.totalQueries ?? 0}
            </div>
            <div className="text-[10px] text-[#145A38] font-semibold">
              EN {analytics?.languageBreakdown?.en ?? 0} · SN {analytics?.languageBreakdown?.sn ?? 0} · ND {analytics?.languageBreakdown?.nd ?? 0}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/80 border border-white">
            <div className="text-[11px] font-semibold text-[#0B3D2B]/65">Knowledge Entries</div>
            <div className="text-2xl font-black text-[#145A38] mt-0.5">
              {docs.filter(d => d.active).length}
            </div>
            <div className="text-[10px] text-[#0B3D2B]/65">
              {analytics?.totalChunksCount ?? docs.reduce((s, d) => s + (d.chunkCount || 0), 0)} chunks · {analytics?.totalCategoriesCount ?? availableCategories.length} topics
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/80 border border-white">
            <div className="text-[11px] font-semibold text-[#0B3D2B]/65">User Feedback</div>
            <div className="text-2xl font-black text-[#062B1F] mt-0.5 flex items-center gap-2">
              <span className="text-[#145A38]">{analytics?.helpfulCount ?? 0} 👍</span>
              <span className="text-sm text-rose-600">{analytics?.notHelpfulCount ?? 0} 👎</span>
            </div>
            <div className="text-[10px] text-[#0B3D2B]/65">Rated interactions</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/80 border border-white">
            <div className="text-[11px] font-semibold text-[#0B3D2B]/65">Open Unanswered</div>
            <div className="text-2xl font-black text-amber-700 mt-0.5">
              {openUnanswered.length}
            </div>
            <div className="text-[10px] text-[#0B3D2B]/65">
              {resolvedUnanswered.length} resolved
            </div>
          </div>
        </div>
      </LiquidGlassCard>

      {/* Add / Edit / Upload & Indexed Documents Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Add / Edit Form */}
        <LiquidGlassCard variant="light" className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="font-extrabold text-[#062B1F] text-base flex items-center gap-2">
              {editingDocId ? (
                <Edit2 className="w-4 h-4 text-[#145A38]" />
              ) : (
                <Upload className="w-4 h-4 text-[#145A38]" />
              )}
              <span>
                {editingDocId ? 'Edit Agricultural Knowledge Entry' : 'Add / Upload Agricultural Knowledge'}
              </span>
            </h3>

            {!editingDocId ? (
              <div className="flex items-center gap-1 bg-[#F2F6F3] p-1 rounded-xl text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setUploadMode('text')}
                  className={`px-2.5 py-1 rounded-lg cursor-pointer transition-colors ${
                    uploadMode === 'text' ? 'bg-[#062B1F] text-[#A8E635]' : 'text-[#0B3D2B]/70'
                  }`}
                >
                  Q&amp;A / Guide
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode('file')}
                  className={`px-2.5 py-1 rounded-lg cursor-pointer transition-colors ${
                    uploadMode === 'file' ? 'bg-[#062B1F] text-[#A8E635]' : 'text-[#0B3D2B]/70'
                  }`}
                >
                  PDF / Word File
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={resetFormFields}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-stone-200/80 text-[#062B1F] text-[11px] font-bold hover:bg-stone-300/80 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel Edit</span>
              </button>
            )}
          </div>

          {editingDocId && (
            <div className="p-2.5 rounded-xl bg-[#DFF4E4] border border-[#145A38]/20 text-[#062B1F] text-xs font-semibold flex items-center justify-between gap-2">
              <span className="truncate">Editing entry: {docTitle}</span>
            </div>
          )}

          {resolvingQuestionId && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2">
              <span>Drafting Q&amp;A guide to resolve an unanswered farmer question.</span>
              <button
                type="button"
                onClick={() => setResolvingQuestionId(null)}
                className="font-bold underline cursor-pointer shrink-0"
              >
                Clear
              </button>
            </div>
          )}

          {uploadError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {uploadSuccess && (
            <div className="p-3 rounded-xl bg-[#DFF4E4] border border-[#145A38]/25 text-[#062B1F] text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#145A38] shrink-0" />
              <span>{uploadSuccess}</span>
            </div>
          )}

          <form onSubmit={handleSubmitKnowledge} className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-[#062B1F] block mb-1">Topic / Guide Title *</label>
              <input
                id="tariro-kb-title-input"
                type="text"
                value={docTitle}
                onChange={e => setDocTitle(e.target.value)}
                placeholder="e.g. Maize Planting & Pfumvudza Spacing in Zimbabwe"
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#062B1F]/15 text-[#062B1F]"
              />
            </div>

            <div>
              <label className="font-bold text-[#062B1F] block mb-1">
                Target Farmer Question (optional)
              </label>
              <input
                id="tariro-kb-question-input"
                type="text"
                value={docQuestion}
                onChange={e => setDocQuestion(e.target.value)}
                placeholder="e.g. How do I plant maize under Pfumvudza and how much Compound D should I apply?"
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#062B1F]/15 text-[#062B1F]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-[#062B1F] block mb-1">Agricultural Topic</label>
                <select
                  value={docCategory}
                  onChange={e => setDocCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#062B1F]/15 text-[#062B1F]"
                >
                  {availableCategories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold text-[#062B1F] block mb-1">Language</label>
                <select
                  value={docLanguage}
                  onChange={e => setDocLanguage(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#062B1F]/15 text-[#062B1F]"
                >
                  <option value="en">English</option>
                  <option value="sn">Shona</option>
                  <option value="nd">Ndebele</option>
                  <option value="multilingual">Multilingual</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-bold text-[#062B1F] block mb-1">Keywords / Tags (comma separated)</label>
              <input
                type="text"
                value={docTags}
                onChange={e => setDocTags(e.target.value)}
                placeholder="maize, chibage, pfumvudza, basal fertiliser, Region II"
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#062B1F]/15 text-[#062B1F]"
              />
            </div>

            {uploadMode === 'file' && !editingDocId ? (
              <div>
                <label className="font-bold text-[#062B1F] block mb-1">
                  Upload File (.pdf, .docx, .txt, .md) *
                </label>
                <div className="p-4 rounded-2xl border-2 border-dashed border-[#145A38]/30 bg-white/75 text-center space-y-2">
                  <input
                    ref={fileInputRef}
                    id="tariro-kb-file-input"
                    type="file"
                    accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setSelectedFile(file);
                      if (file && !docTitle.trim()) {
                        setDocTitle(file.name.replace(/\.[^.]+$/, ''));
                      }
                    }}
                    className="block w-full text-xs text-[#0B3D2B] file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#062B1F] file:text-[#A8E635] hover:file:bg-[#0B3D2B] cursor-pointer"
                  />
                  {selectedFile && (
                    <div className="text-[11px] font-semibold text-[#145A38]">
                      Selected: {selectedFile.name} ({Math.max(1, Math.round(selectedFile.size / 1024))} KB)
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className="font-bold text-[#062B1F] block mb-1">
                    Alternative Question Phrasings (optional, one per line)
                  </label>
                  <textarea
                    rows={2}
                    value={docAltQuestions}
                    onChange={e => setDocAltQuestions(e.target.value)}
                    placeholder={"What spacing and basal rate does maize need?\nHow do I plant chibage with Pfumvudza basins?"}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#062B1F]/15 text-[#062B1F]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#062B1F] block mb-1">
                    Verified Answer / Agricultural Guide Content *
                  </label>
                  <textarea
                    id="tariro-kb-content-textarea"
                    rows={6}
                    value={docContent}
                    onChange={e => setDocContent(e.target.value)}
                    placeholder="Use clear headings (## Overview, ### Step-by-Step Management), numbered steps, Key Terms Explained, and Zimbabwe practical examples..."
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#062B1F]/15 text-[#062B1F]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#062B1F] block mb-1">
                    Suggested Follow-Up Questions (optional, one per line)
                  </label>
                  <textarea
                    id="tariro-kb-followups-textarea"
                    rows={2}
                    value={docFollowUps}
                    onChange={e => setDocFollowUps(e.target.value)}
                    placeholder={"How do I apply Compound D and top-dressing?\nHow do I test soil pH and apply lime?"}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#062B1F]/15 text-[#062B1F]"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="font-bold text-[#062B1F] block mb-1">Source Organisation</label>
                    <input
                      type="text"
                      value={docSourceOrg}
                      onChange={e => setDocSourceOrg(e.target.value)}
                      placeholder="e.g. AGRITEX Zimbabwe / DR&SS"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#062B1F]/15 text-[#062B1F]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[#062B1F] block mb-1">Source Reference / Manual</label>
                    <input
                      type="text"
                      value={docSourceRef}
                      onChange={e => setDocSourceRef(e.target.value)}
                      placeholder="e.g. Good Agronomic Practices Handbook"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#062B1F]/15 text-[#062B1F]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-[#062B1F] block mb-1">Review Status</label>
                    <select
                      value={docReviewStatus}
                      onChange={e => setDocReviewStatus(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#062B1F]/15 text-[#062B1F]"
                    >
                      <option value="verified">Verified</option>
                      <option value="needs_review">Needs Review</option>
                      <option value="draft">Draft</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-[#062B1F] block mb-1">Last Reviewed Date</label>
                    <input
                      type="date"
                      value={docReviewedAt}
                      onChange={e => setDocReviewedAt(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#062B1F]/15 text-[#062B1F]"
                    />
                  </div>
                </div>
              </>
            )}

            <LiquidGlassButton
              id="tariro-kb-submit-btn"
              type="submit"
              variant="emerald"
              size="sm"
              disabled={submitting}
              className="w-full"
            >
              {editingDocId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span>
                {submitting
                  ? 'Saving & Indexing...'
                  : editingDocId
                    ? 'Save Changes & Re-Index Entry'
                    : uploadMode === 'file'
                      ? 'Upload & Index Document'
                      : 'Save Q&A Entry to Knowledge Base'}
              </span>
            </LiquidGlassButton>
          </form>
        </LiquidGlassCard>

        {/* Indexed Agricultural Sources List */}
        <LiquidGlassCard variant="light" className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="font-extrabold text-[#062B1F] text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#145A38]" />
              <span>
                Indexed Agricultural Sources ({filteredDocs.length}
                {filteredDocs.length !== docs.length ? ` of ${docs.length}` : ''})
              </span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#0B3D2B]/45 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                placeholder="Search topics, keywords, questions..."
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-[#062B1F]/15 text-[#062B1F]"
              />
            </div>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#062B1F]/15 text-[#062B1F] font-semibold"
            >
              <option value="All">All Agricultural Topics ({docs.length})</option>
              {availableCategories.map(cat => {
                const count = docs.filter(d => d.category === cat).length;
                return (
                  <option key={cat} value={cat}>
                    {cat} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {filteredDocs.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-[#062B1F]/15 rounded-2xl p-6 space-y-2">
              <FileText className="w-9 h-9 text-[#145A38]/40 mx-auto" />
              <div className="text-sm font-bold text-[#062B1F]">
                {docs.length === 0 ? 'Knowledge Library is empty' : 'No entries match your filter'}
              </div>
              <p className="text-xs text-[#0B3D2B]/65">
                {docs.length === 0
                  ? 'Add Q&A entries or upload PDF/Word manuals so TARIRO can answer farmer questions.'
                  : 'Try clearing the search box or choosing a different agricultural topic.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {filteredDocs.map((d) => (
                <div
                  key={d.id}
                  className={`p-3.5 rounded-2xl border text-xs space-y-2 transition-colors ${
                    editingDocId === d.id
                      ? 'bg-[#DFF4E4]/70 border-[#145A38]'
                      : d.active
                        ? 'bg-white/85 border-[#145A38]/20'
                        : 'bg-stone-100/80 border-stone-200 opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-[#062B1F] truncate">{d.title}</span>
                        {d.isBuiltIn && (
                          <span className="px-1.5 py-0.5 rounded bg-[#062B1F]/10 text-[#062B1F] text-[9px] font-bold uppercase">
                            Built-in
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#145A38] font-semibold mt-0.5">
                        {d.category} · {d.sourceType.toUpperCase()} · {d.language.toUpperCase()}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMarkReviewed(d)}
                        title="Verify & stamp today's review date"
                        className="p-1.5 rounded-lg bg-[#F2F6F3] text-[#145A38] hover:bg-[#DFF4E4] cursor-pointer transition-colors"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStartEdit(d)}
                        disabled={loadingEditId === d.id}
                        title="Edit knowledge entry"
                        className="p-1.5 rounded-lg bg-[#F2F6F3] text-[#062B1F] hover:bg-[#DFF4E4] cursor-pointer transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleActive(d)}
                        title={d.active ? 'Disable entry from TARIRO search' : 'Activate entry'}
                        className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                          d.active
                            ? 'bg-[#DFF4E4] text-[#145A38]'
                            : 'bg-stone-200 text-stone-600'
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>

                      {pendingDeleteId === d.id ? (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDeleteDoc(d.id)}
                            className="px-2 py-1 rounded bg-rose-600 text-white text-[10px] font-bold cursor-pointer"
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingDeleteId(null)}
                            className="px-2 py-1 rounded bg-white border border-[#062B1F]/15 text-[10px] font-bold cursor-pointer"
                          >
                            Keep
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPendingDeleteId(d.id)}
                          title="Delete entry"
                          className="p-1.5 rounded-lg text-[#0B3D2B]/45 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {d.question && (
                    <div className="text-[11px] font-semibold text-[#062B1F]/80 italic">
                      Q: {d.question}
                    </div>
                  )}

                  <p className="text-[11px] text-[#0B3D2B]/75 line-clamp-2">{d.summary}</p>

                  <div className="flex items-center justify-between gap-2 text-[10px] text-[#0B3D2B]/65 pt-1 border-t border-[#062B1F]/10 tabular-nums flex-wrap">
                    <span>
                      {d.sourceOrganization || d.uploadedBy}
                      {d.reviewedAt ? ` · Reviewed ${d.reviewedAt}` : ''}
                    </span>
                    <span className="font-semibold text-[#145A38]">
                      {(d.reviewStatus || 'verified').toUpperCase()} · {d.chunkCount} chunks
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </LiquidGlassCard>
      </div>

      {/* Unanswered Questions + User Feedback Monitoring */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Unanswered Questions Monitor */}
        <LiquidGlassCard variant="light" className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-[#062B1F] text-base flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-600" />
              <span>Unanswered &amp; Low-Coverage Questions ({openUnanswered.length})</span>
            </h3>
          </div>

          {(analytics?.unansweredQuestions || []).length === 0 ? (
            <p className="text-xs text-[#0B3D2B]/65 py-6 text-center">
              Questions lacking Knowledge Library coverage or marked needing improvement appear here.
            </p>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {(analytics?.unansweredQuestions || []).map((q) => (
                <div
                  key={q.id}
                  className="p-3.5 rounded-2xl bg-white/80 border border-[#062B1F]/10 text-xs space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-[#062B1F]">{q.question}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                        q.status === 'open'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-[#DFF4E4] text-[#145A38]'
                      }`}
                    >
                      {q.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#0B3D2B]/70">{q.reason}</div>
                  {q.status === 'open' && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleResolveUnanswered(q, true)}
                        className="px-2.5 py-1 rounded-lg bg-[#062B1F] text-[#A8E635] text-[10px] font-bold cursor-pointer"
                      >
                        Add Knowledge Guide
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResolveUnanswered(q, false)}
                        className="px-2.5 py-1 rounded-lg bg-[#DFF4E4] text-[#145A38] text-[10px] font-bold cursor-pointer"
                      >
                        Mark Resolved
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </LiquidGlassCard>

        {/* Feedback & Top Topics */}
        <LiquidGlassCard variant="light" className="p-5 sm:p-6 space-y-4">
          <h3 className="font-extrabold text-[#062B1F] text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#145A38]" />
            <span>User Feedback &amp; Popular Topics</span>
          </h3>

          {(analytics?.topTopics || []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {analytics!.topTopics.map(t => (
                <span
                  key={t.topic}
                  className="px-2.5 py-1 rounded-xl bg-[#DFF4E4] border border-[#145A38]/20 text-[11px] font-bold text-[#062B1F] tabular-nums"
                >
                  {t.topic} ({t.count})
                </span>
              ))}
            </div>
          )}

          {(analytics?.recentFeedback || []).length === 0 ? (
            <p className="text-xs text-[#0B3D2B]/65 py-6 text-center">
              Farmer &amp; buyer feedback ratings from TARIRO chat replies appear here.
            </p>
          ) : (
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {analytics!.recentFeedback.map(fb => (
                <div
                  key={fb.id}
                  className="p-3 rounded-2xl bg-white/80 border border-[#062B1F]/10 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-[#062B1F] truncate">{fb.question || 'Chat reply'}</span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        fb.rating === 'helpful'
                          ? 'bg-[#DFF4E4] text-[#145A38]'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {fb.rating === 'helpful' ? (
                        <ThumbsUp className="w-3 h-3" />
                      ) : (
                        <ThumbsDown className="w-3 h-3" />
                      )}
                      {fb.rating === 'helpful' ? 'Helpful' : 'Needs Work'}
                    </span>
                  </div>
                  {fb.comment && (
                    <p className="text-[11px] text-[#0B3D2B]/80 italic">&ldquo;{fb.comment}&rdquo;</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </LiquidGlassCard>
      </div>
    </div>
  );
};
