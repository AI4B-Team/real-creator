import { useState, useRef, useEffect, useCallback } from "react";
import { flushSync } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useEbooks } from "@/contexts/EbookContext";
import {
  Upload, Mic, Sparkles, ArrowLeft, BookOpen, Headphones, Presentation,
  Lightbulb, Palette, Send, Globe, MessageSquare,
  Bot, Link2, FileText, X, Plus, Layers,
  Briefcase, Coffee, GraduationCap, Heart, Shield, Flame, Search, ChevronDown,
  Check, Pencil, Eye, Loader2, Wand2, RefreshCw,
  ArrowRight, Target, Zap, Undo2, Redo2, ZoomIn, ZoomOut, Minus,
  Share2, Lock, Cloud, Copy, Cpu, ArrowRightLeft, UserPlus, Download, Settings, MoreVertical, Shuffle,
  ChevronLeft, ChevronRight, Image, BookOpenCheck, Hash, Star, Trophy, Gem, Rocket, Users,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import PageShell from "@/components/PageShell";
import EbookGenerationOverlay, { type LiveGenerationState } from "@/components/ebook/EbookGenerationOverlay";
import EbookCanvasEditor, { type EbookCanvasEditorHandle, getElementsForPage, buildTocElements, type Page as CanvasPage } from "@/components/ebook/EbookCanvasEditor";
import EbookDesignSidebar from "@/components/ebook/EbookDesignSidebar";
import EbookShareModal from "@/components/ebook/EbookShareModal";
import EbookInviteModal from "@/components/ebook/EbookInviteModal";
import PageSettingsPanel from "@/components/ebook/PageSettingsPanel";
import BookSettingsPanel from "@/components/ebook/BookSettingsPanel";
import LockedPagesModal from "@/components/ebook/LockedPagesModal";
import EbookRecordingModal from "@/components/ebook/EbookRecordingModal";

type ChapterContentType = "text-only" | "text-images" | "text-images-interactive";

interface NewBookData {
  prompt: string;
  sourceType: "ai" | "upload" | "link" | "record";
  contentType: "ebook" | "audiobook" | "presentation";
  chapterContentType: ChapterContentType;
  language: string;
  tone: string;
  audience: string;
  chapters: number;
  wordsPerChapter: number;
  includeImages: boolean;
  selectedTitle: string;
  model: string;
}

const WORDS_PRESETS = [
  { value: 500, label: "500", sub: "Quick read" },
  { value: 1000, label: "1,000", sub: "Standard" },
  { value: 1500, label: "1,500", sub: "Detailed" },
  { value: 2000, label: "2,000", sub: "In-depth" },
  { value: 3000, label: "3,000", sub: "Comprehensive" },
];

const CHAPTER_CONTENT_TYPES = [
  { id: "text-only" as const, label: "Text Only", desc: "Clean text content only", icon: FileText },
  { id: "text-images" as const, label: "Text + Images", desc: "AI-generated images per chapter", icon: Image },
  { id: "text-images-interactive" as const, label: "Text + Images + Interactive", desc: "Includes quizzes & flashcards", icon: Sparkles },
];

const CONTENT_TYPES = [
  { id: "ebook", label: "eBook", icon: BookOpen },
  { id: "audiobook", label: "AudioBook", icon: Headphones },
  { id: "presentation", label: "Presentation", icon: Presentation },
];

const LANGUAGES = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "it", name: "Italian", flag: "🇮🇹" },
  { code: "pt", name: "Portuguese", flag: "🇧🇷" },
  { code: "zh", name: "Chinese", flag: "🇨🇳" },
  { code: "ja", name: "Japanese", flag: "🇯🇵" },
  { code: "ko", name: "Korean", flag: "🇰🇷" },
  { code: "ar", name: "Arabic", flag: "🇸🇦" },
  { code: "hi", name: "Hindi", flag: "🇮🇳" },
  { code: "ru", name: "Russian", flag: "🇷🇺" },
];

const TONES = [
  { id: "professional", name: "Professional", icon: Briefcase },
  { id: "conversational", name: "Conversational", icon: Coffee },
  { id: "academic", name: "Academic", icon: GraduationCap },
  { id: "friendly", name: "Friendly", icon: Heart },
  { id: "authoritative", name: "Authoritative", icon: Shield },
  { id: "inspirational", name: "Inspirational", icon: Flame },
];

const TITLE_BADGES: { label: string; icon: React.ComponentType<any>; color: string }[] = [
  { label: "Professional", icon: Briefcase, color: "text-foreground/70 bg-foreground/[0.05]" },
  { label: "Advanced", icon: Gem, color: "text-foreground/70 bg-foreground/[0.05]" },
  { label: "Bold & Tactical", icon: Flame, color: "text-foreground/70 bg-foreground/[0.05]" },
  { label: "Practical", icon: Target, color: "text-foreground/70 bg-foreground/[0.05]" },
  { label: "Beginner-Friendly", icon: Heart, color: "text-foreground/70 bg-blue-50" },
  { label: "Advanced", icon: Gem, color: "text-foreground/70 bg-foreground/[0.05]" },
  { label: "Creative / Strategy", icon: Sparkles, color: "text-foreground/70 bg-foreground/[0.05]" },
  { label: "Transformation", icon: Rocket, color: "text-foreground/70 bg-foreground/[0.05]" },
  { label: "Reference", icon: BookOpenCheck, color: "text-foreground/70 bg-foreground/[0.05]" },
  { label: "Beginner-Friendly", icon: Heart, color: "text-foreground/70 bg-blue-50" },
];

const AI_MODELS = [
  { id: "auto", name: "Auto", description: "Automatically selects the best model" },
  { id: "gemini-3-flash", name: "Gemini 3 Flash", description: "Fast & balanced" },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", description: "Top-tier reasoning" },
  { id: "gpt-5", name: "GPT-5", description: "Powerful all-rounder" },
  { id: "gpt-5-mini", name: "GPT-5 Mini", description: "Fast & efficient" },
];

const SOURCE_OPTIONS = [
  { id: "ai", label: "GhostInk", icon: Bot },
  { id: "upload", label: "Upload", icon: Upload },
  { id: "link", label: "Link", icon: Link2 },
  { id: "record", label: "Record", icon: Mic },
];

type TabId = "idea" | "generate" | "design";

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "idea", label: "Idea", icon: Lightbulb },
  { id: "generate", label: "Generate", icon: Sparkles },
  { id: "design", label: "Design", icon: Palette },
];

const SCROLLABLE_OVERFLOW_VALUES = new Set(["auto", "scroll", "overlay"]);

const scrollPageToTop = (anchor?: HTMLElement | null) => {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;

  let current = anchor?.parentElement ?? null;
  while (current) {
    const { overflowY } = window.getComputedStyle(current);
    if (SCROLLABLE_OVERFLOW_VALUES.has(overflowY) && current.scrollHeight > current.clientHeight) {
      current.scrollTop = 0;
    }
    current = current.parentElement;
  }
};

export interface ChapterData {
  id: string;
  title: string;
  description: string;
  topics: string[];
  includeImages: boolean;
  pageCount: number;
}

const ProjectNameInput = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => { setDraft(value); }, [value]);

  const handleSave = () => { onChange(draft.trim() || "Untitled Book"); setIsEditing(false); };
  const handleCancel = () => { setDraft(value); setIsEditing(false); };

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2 pointer-events-auto">
        <span className="text-sm text-muted-foreground">Project Name:</span>
        <button onClick={() => setIsEditing(true)}
          className="text-sm font-medium text-foreground bg-foreground/[0.03] border border-foreground/[0.08] rounded-lg px-3 py-1.5 min-w-[20rem] text-left hover:border-foreground/[0.15] transition-colors">
          {value}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 pointer-events-auto">
      <span className="text-sm text-muted-foreground">Project Name:</span>
      <input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel(); }}
        autoFocus
        className="text-sm font-medium text-foreground bg-foreground/[0.03] border border-accent/40 rounded-lg px-3 py-1.5 min-w-[20rem] focus:outline-none transition-colors"
      />
      <button onClick={handleSave} className="p-1.5 rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors">
        <Check className="w-3.5 h-3.5" />
      </button>
      <button onClick={handleCancel} className="p-1.5 rounded-lg bg-foreground/[0.06] text-muted-foreground hover:bg-foreground/[0.1] transition-colors">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

const NewEbookPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { updateEbook, addEbook } = useEbooks();

  const scrollToTopRef = useRef<ReturnType<typeof requestAnimationFrame>>();
  const pageTopRef = useRef<HTMLDivElement>(null);

  const cancelScheduledScrollReset = useCallback(() => {
    if (scrollToTopRef.current) cancelAnimationFrame(scrollToTopRef.current);
  }, []);

  const scheduleScrollReset = useCallback(() => {
    cancelScheduledScrollReset();
    scrollToTopRef.current = requestAnimationFrame(() => {
      scrollToTopRef.current = requestAnimationFrame(() => {
        scrollPageToTop(pageTopRef.current);
      });
    });
  }, [cancelScheduledScrollReset]);


  const initialTab = (() => {
    const tab = searchParams.get("tab");
    if (tab && ["idea", "generate", "design"].includes(tab)) return tab as TabId;
    const state = window.history.state?.usr as { book?: any } | null;
    if (state?.book) return "design" as TabId;
    return "idea" as TabId;
  })();

  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  useEffect(() => {
    scheduleScrollReset();
    return cancelScheduledScrollReset;
  }, [cancelScheduledScrollReset, scheduleScrollReset]);

  // Scroll to top whenever switching to a non-design (scrollable) tab
  useEffect(() => {
    if (activeTab !== "design") {
      scheduleScrollReset();
    }
    return cancelScheduledScrollReset;
  }, [activeTab, cancelScheduledScrollReset, scheduleScrollReset]);

  useEffect(() => {
    sessionStorage.setItem("ebook-last-url", location.pathname + location.search);
  }, [location.pathname, location.search, activeTab]);

  // Also update when tab changes (since tab is local state, not always in URL)
  useEffect(() => {
    const url = `${location.pathname}?tab=${activeTab}`;
    sessionStorage.setItem("ebook-last-url", url);
  }, [activeTab, location.pathname]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);
  const [recommendedTitleIndex, setRecommendedTitleIndex] = useState<number>(0);
  const [titleBatchVersion, setTitleBatchVersion] = useState(0);
  const [languageSearch, setLanguageSearch] = useState("");
  const [languageOpen, setLanguageOpen] = useState(false);
  const [isGeneratingBook, setIsGeneratingBook] = useState(false);
  const [liveGenerationState, setLiveGenerationState] = useState<LiveGenerationState | null>(null);
  const [chapterSequence, setChapterSequence] = useState<ChapterData[]>([]);
  const [improvingChapterIdx, setImprovingChapterIdx] = useState<number | null>(null);
  const [bookDescription, setBookDescription] = useState("");
  const [generateStep, setGenerateStep] = useState<"titles" | "chapters">("titles");
  const [editingTitleIndex, setEditingTitleIndex] = useState<number | null>(null);
  const [customTitle, setCustomTitle] = useState("");
  const [showCustomTitle, setShowCustomTitle] = useState(false);
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showSourceCards, setShowSourceCards] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(searchParams.get("source") === "url");
  const [linkInputValue, setLinkInputValue] = useState("");
  const [attachedSources, setAttachedSources] = useState<{ id: string; type: "file" | "link" | "audio"; label: string }[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [accessMode, setAccessMode] = useState<'editing' | 'viewing' | 'commenting' | 'admin'>('editing');
  const [currentEbookId, setCurrentEbookId] = useState<string | null>(() => sessionStorage.getItem("ebook-current-id"));
  const titleGenerationRequestRef = useRef(0);

  // Brand profile integration
  const [brandActive, setBrandActive] = useState<boolean>(() => {
    try { return localStorage.getItem("brand_profile_use") === "true"; } catch { return false; }
  });
  const [showBrandDialog, setShowBrandDialog] = useState(false);
  const isBrandProfileSetup = () => {
    try { return localStorage.getItem("brand_profile_complete") === "true"; } catch { return false; }
  };
  const handleBrandClick = () => {
    if (!isBrandProfileSetup()) {
      setShowBrandDialog(true);
      return;
    }
    setBrandActive(prev => {
      const next = !prev;
      try { localStorage.setItem("brand_profile_use", String(next)); } catch {}
      sonnerToast.success(next ? "Brand voice will be applied" : "Brand voice disabled");
      return next;
    });
  };

  useEffect(() => {
    if (activeTab === "generate" && !isGenerating) {
      scheduleScrollReset();
    }
    return cancelScheduledScrollReset;
  }, [activeTab, cancelScheduledScrollReset, generateStep, isGenerating, scheduleScrollReset]);

  const addSource = useCallback((type: "file" | "link" | "audio", label: string) => {
    setAttachedSources(prev => [...prev, { id: `src-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, type, label }]);
  }, []);

  const removeSource = useCallback((id: string) => {
    setAttachedSources(prev => prev.filter(s => s.id !== id));
  }, []);

  const [bookData, setBookData] = useState<NewBookData>({
    prompt: "",
    sourceType: searchParams.get("source") === "url" ? "link" : "ai",
    contentType: "ebook",
    chapterContentType: "text-images",
    language: "en",
    tone: "professional",
    audience: "",
    chapters: 8,
    wordsPerChapter: 1500,
    includeImages: true,
    selectedTitle: "How to Use the eBook Creator",
    model: "auto",
  });
  const [showBookSettingsDialog, setShowBookSettingsDialog] = useState(false);
  const [customWordsInput, setCustomWordsInput] = useState("");
  const [isApplyingSettings, setIsApplyingSettings] = useState(false);

  const [contentTypeSelected, setContentTypeSelected] = useState(initialTab === "design");

  // Honor the dashboard's link entry point, including navigation within this page.
  useEffect(() => {
    if (searchParams.get("source") !== "url") return;
    setActiveTab("idea");
    setShowLinkInput(true);
    setBookData(prev => ({ ...prev, sourceType: "link" }));
  }, [searchParams]);

  // Canvas design state
  type PageType = "cover" | "toc" | "chapter" | "chapter-page" | "back" | "blank";
  interface UnifiedPage { id: string; title: string; type: PageType; locked?: boolean; }

  const getDefaultPages = (): UnifiedPage[] => [
    { id: "1", title: "Cover", type: "cover" },
    { id: "2", title: "Table of Contents", type: "toc" },
    { id: "3", title: "Getting Started", type: "chapter" },
    { id: "4", title: "Your First AI-Generated Book", type: "chapter-page" },
    { id: "5", title: "", type: "chapter-page" },
    { id: "6", title: "Customizing Your Outline", type: "chapter-page" },
    { id: "7", title: "The Canvas Editor", type: "chapter" },
    { id: "8", title: "Working with Text & Images", type: "chapter-page" },
    { id: "9", title: "Page Management", type: "chapter-page" },
    { id: "10", title: "Templates & Themes", type: "chapter" },
    { id: "11", title: "Applying & Switching Templates", type: "chapter-page" },
    { id: "12", title: "AI Tools & Assistant", type: "chapter" },
    { id: "13", title: "Using the AI Writing Tools", type: "chapter-page" },
    { id: "14", title: "Publishing & Sharing", type: "chapter" },
    { id: "15", title: "Exporting Your Finished Book", type: "chapter-page" },
    { id: "16", title: "Back Cover", type: "back" },
  ];

  const STORAGE_KEY_PAGES = "ebook_pages_data";
  const STORAGE_KEY_ELEMENTS = "ebook_elements_data";

  const [ebookPages, setEbookPages] = useState<UnifiedPage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PAGES);
      if (saved) return JSON.parse(saved);
    } catch {}
    return getDefaultPages();
  });

  const [savedPageElements, setSavedPageElements] = useState<Record<string, any[]>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ELEMENTS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  // Persist pages to localStorage
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY_PAGES, JSON.stringify(ebookPages)); } catch {}
  }, [ebookPages]);

  // Callback when canvas elements change
  const handlePageElementsChange = useCallback((elements: Record<string, any[]>) => {
    setSavedPageElements(elements);
    try { localStorage.setItem(STORAGE_KEY_ELEMENTS, JSON.stringify(elements)); } catch {}
  }, []);

  const [selectedPageId, setSelectedPageId] = useState<string | null>("1");
  const [zoom, setZoom] = useState(100);
  const [isGridView, setIsGridView] = useState(false);
  const [findReplaceMode, setFindReplaceMode] = useState<'find' | 'find-replace' | null>(null);
  const [showPageSettings, setShowPageSettings] = useState(true);
  const [manualPageSettings, setManualPageSettings] = useState(false);
  const [sidebarOpenSection, setSidebarOpenSection] = useState<string | null>(null);
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);
  const [rightPanelMode, setRightPanelMode] = useState<'settings' | 'ai' | 'chat'>('settings');
  const [sidebarMode, setSidebarMode] = useState<'design' | 'ai'>('design');
  const [pageWidth, setPageWidth] = useState(480);
  const [pageHeight, setPageHeight] = useState(640);
  const canvasRef = useRef<EbookCanvasEditorHandle>(null);
  const projectSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isReplacingImage, setIsReplacingImage] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date>(new Date());
  const [lockedPagesModal, setLockedPagesModal] = useState<{
    open: boolean;
    actionLabel: string;
    onUnlockAllAndApply: () => void;
    onProceedSkipping: () => void;
  }>({ open: false, actionLabel: '', onUnlockAllAndApply: () => {}, onProceedSkipping: () => {} });

  const buildSavedProjectSnapshot = useCallback((
    pages: UnifiedPage[] = ebookPages,
    elements: Record<string, any[]> = savedPageElements,
  ) => ({
    chapters: chapterSequence,
    description: bookDescription,
    pages,
    elements,
    settings: {
      ...bookData,
    },
  }), [bookData, bookDescription, chapterSequence, ebookPages, savedPageElements]);

  const showLockedPagesWarning = useCallback((
    actionLabel: string,
    onApplyAll: () => void,
    onApplySkipping: () => void,
  ) => {
    const lockedPages = ebookPages.filter(p => p.locked);
    if (lockedPages.length === 0) {
      onApplyAll();
      return false;
    }
    setLockedPagesModal({
      open: true,
      actionLabel,
      onUnlockAllAndApply: () => {
        setEbookPages(prev => prev.map(p => ({ ...p, locked: false })));
        onApplyAll();
      },
      onProceedSkipping: () => {
        onApplySkipping();
      },
    });
    return true;
  }, [ebookPages]);

  // Sections that should keep the Page Settings panel visible
  const PAGE_SETTINGS_SECTIONS = new Set(['content', 'templates']);

  const handleSidebarSectionChange = useCallback((sections: Set<string>) => {
    const shouldShow = Array.from(sections).some(s => PAGE_SETTINGS_SECTIONS.has(s));
    if (shouldShow) {
      setManualPageSettings(false);
    }
    if (!manualPageSettings) {
      setShowPageSettings(shouldShow);
    }
  }, [manualPageSettings]);

  // ⌘H / Ctrl+H shortcut for Find & Replace
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'h') {
        e.preventDefault();
        setFindReplaceMode(prev => prev === 'find-replace' ? null : 'find-replace');
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'f' && activeTab === 'design') {
        e.preventDefault();
        setFindReplaceMode(prev => prev === 'find' ? null : 'find');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeTab]);

  useEffect(() => {
    const state = location.state as { book?: any; fromCreate?: boolean; prompt?: string } | null;
    if (state?.book) {
      setActiveTab("design");
      setContentTypeSelected(true);
      setCurrentEbookId(state.book.id || null);

      const savedProject = state.book.outline || {};
      const savedSettings = savedProject.settings || {};

      if (Array.isArray(savedProject.pages) && savedProject.pages.length > 0) {
        setEbookPages(savedProject.pages);
        setSelectedPageId(savedProject.pages[0]?.id || null);
      } else {
        // Load default tutorial pages for the demo book
        const defaultPages = getDefaultPages();
        setEbookPages(defaultPages);
        setSelectedPageId(defaultPages[0]?.id || null);
        try { localStorage.setItem(STORAGE_KEY_PAGES, JSON.stringify(defaultPages)); } catch {}
      }

      if (savedProject.elements && typeof savedProject.elements === "object" && Object.keys(savedProject.elements).length > 0) {
        setSavedPageElements(savedProject.elements);
        try { localStorage.setItem(STORAGE_KEY_ELEMENTS, JSON.stringify(savedProject.elements)); } catch {}
      } else {
        // Clear stale elements so canvas generates fresh tutorial content
        setSavedPageElements({});
        localStorage.removeItem(STORAGE_KEY_ELEMENTS);
      }

      if (Array.isArray(savedProject.chapters) && savedProject.chapters.length > 0) {
        setChapterSequence(savedProject.chapters);
      }

      if (typeof savedProject.description === "string") {
        setBookDescription(savedProject.description);
      }

      setBookData(prev => ({
        ...prev,
        ...savedSettings,
        contentType: "ebook",
        selectedTitle: state.book.title || savedSettings.selectedTitle || "",
        prompt: state.book.prompt || savedSettings.prompt || state.book.description || "",
        tone: state.book.tone || savedSettings.tone || prev.tone,
        language: state.book.language || savedSettings.language || prev.language,
        model: state.book.model || savedSettings.model || prev.model,
      }));
    }
    // Coming from Create page with a prompt — pre-fill and auto-generate
    if (state?.fromCreate && state?.prompt) {
      setBookData(prev => ({ ...prev, prompt: state.prompt!, sourceType: "ai" }));
      setContentTypeSelected(true);
      // Clear state so refresh doesn't re-trigger
      window.history.replaceState({}, document.title);
      // Auto-trigger generation after a short delay
      setTimeout(() => {
        const fakeBtn = document.getElementById("ghost-ink-generate-btn");
        if (fakeBtn) fakeBtn.click();
      }, 500);
    }
  }, [location.state]);

  useEffect(() => {
    if (currentEbookId) {
      sessionStorage.setItem("ebook-current-id", currentEbookId);
      return;
    }
    sessionStorage.removeItem("ebook-current-id");
  }, [currentEbookId]);

  useEffect(() => {
    if (!currentEbookId || activeTab !== "design") return;
    if (currentEbookId.startsWith("demo-") || isGeneratingBook) return;

    if (projectSaveTimeoutRef.current) {
      clearTimeout(projectSaveTimeoutRef.current);
    }

    projectSaveTimeoutRef.current = setTimeout(() => {
      void updateEbook(currentEbookId, {
        outline: buildSavedProjectSnapshot(),
      }).then(saved => { if (saved) setLastSaved(new Date()); });
    }, 1000);

    return () => {
      if (projectSaveTimeoutRef.current) {
        clearTimeout(projectSaveTimeoutRef.current);
      }
    };
  }, [activeTab, buildSavedProjectSnapshot, currentEbookId, ebookPages, savedPageElements, updateEbook, isGeneratingBook]);

  const currentLanguage = LANGUAGES.find(l => l.code === bookData.language);
  const currentTone = TONES.find(t => t.id === bookData.tone);

  const toTitleCase = (str: string) => str.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
  const isTitleGenerationVisible = isGenerating && (activeTab === "idea" || activeTab === "generate");
  const isRegeneratingTitles = isGenerating && activeTab === "generate";
  const titleGenerationLabel = isRegeneratingTitles
    ? toTitleCase("generating a fresh batch of titles...")
    : toTitleCase("generating title ideas...");

  const handleGenerate = async () => {
    if (!bookData.prompt.trim()) { toast({ title: "Please describe your topic", variant: "destructive" }); return; }
    if (isGenerating) return;

    const requestId = ++titleGenerationRequestRef.current;
    setIsGenerating(true);
    setGenerationProgress(0);

    const titlesToExclude =
      activeTab === "generate" && titleSuggestions.length > 0
        ? titleSuggestions.filter(Boolean)
        : [];

    // Animate progress bar while waiting
    const interval = window.setInterval(() => {
      setGenerationProgress(prev => Math.min(prev + Math.random() * 8, 90));
    }, 600);

    try {
      const { data, error } = await supabase.functions.invoke('generate-ebook', {
        body: {
          action: 'generate-outline',
          prompt: bookData.prompt.trim(),
          model: bookData.model,
          language: bookData.language,
          tone: bookData.tone,
          chapters: bookData.chapters,
          wordsPerChapter: bookData.wordsPerChapter,
          excludeTitles: titlesToExclude,
        },
      });

      window.clearInterval(interval);

      if (error) throw new Error(error.message || 'Generation failed');
      if (data?.error) throw new Error(data.error);
      if (requestId !== titleGenerationRequestRef.current) return;

      const result = data.result;
      const freshTitles = Array.isArray(result?.titles) ? [...result.titles] : [];
      const recIdx = typeof result?.recommendedIndex === "number" && result.recommendedIndex >= 0 && result.recommendedIndex < freshTitles.length
        ? result.recommendedIndex : 0;

      setTitleSuggestions(freshTitles);
      setRecommendedTitleIndex(recIdx);
      setTitleBatchVersion(prev => prev + 1);
      setEditingTitleIndex(null);
      setShowCustomTitle(false);
      setCustomTitle("");
      setBookDescription(result.description || '');
      setChapterSequence(
        (result.chapters || []).map((ch: any, i: number) => ({
          id: `ch-${i + 1}`,
          title: ch.title,
          description: ch.description,
          topics: ch.topics || [],
          includeImages: true,
          pageCount: ch.pageCount || 8,
        }))
      );
      setBookData(prev => ({ ...prev, selectedTitle: '' }));
      setGenerateStep("titles");
      setGenerationProgress(100);
      setActiveTab("generate");
      toast({ title: titlesToExclude.length > 0 ? "Fresh title ideas are ready!" : "AI-powered outline generated!" });
    } catch (e: any) {
      window.clearInterval(interval);
      if (requestId !== titleGenerationRequestRef.current) return;
      console.error('Generate outline error:', e);
      toast({ title: e.message || "Generation failed", variant: "destructive" });
    } finally {
      if (requestId === titleGenerationRequestRef.current) {
        setIsGenerating(false);
      }
    }
  };

  const handleGenerateBook = async () => {
    if (!bookData.selectedTitle) { toast({ title: "Please select a title first", variant: "destructive" }); return; }
    setActiveTab("design");
    setIsGeneratingBook(true);

    let newEbook: any = null;

    try {
      // Clear stale cached pages/elements from any previous book
      localStorage.removeItem(STORAGE_KEY_PAGES);
      localStorage.removeItem(STORAGE_KEY_ELEMENTS);
      setSavedPageElements({});

      // Stable theme seed — same for initial + every per-chapter update
      const liveThemeSeed = `${bookData.selectedTitle}-${bookData.prompt}`;

      // Pre-populate cover + TOC immediately using the layout engine
      const { buildGeneratedBookLayout } = await import("@/lib/ebookGenerationLayout");
      const initLayout = buildGeneratedBookLayout({
        bookTitle: bookData.selectedTitle,
        bookDescription: bookDescription || bookData.prompt,
        prompt: bookData.prompt,
        generatedChapters: [],
        includeImages: false,
        themeSeed: liveThemeSeed,
      });
      flushSync(() => {
        setLiveGenerationState({
          pages: initLayout.pages,
          elements: initLayout.elementsByPage,
          completedChapterCount: 0,
          totalChapterCount: chapterSequence.length,
          currentChapterTitle: chapterSequence[0]?.title ?? "",
        });
      });

      const baseSnapshot = {
        chapters: chapterSequence,
        description: bookDescription,
        settings: { ...bookData },
      };

      // Save ebook to DB/context
      newEbook = await addEbook({
        title: bookData.selectedTitle,
        description: bookDescription,
        chapters: chapterSequence.length,
        words: 0,
        status: "generating",
        createdAt: new Date().toISOString().split("T")[0],
        updatedAt: new Date().toISOString().split("T")[0],
        coverColor: "#6366F1",
        tags: [],
        progress: 10,
        prompt: bookData.prompt,
        tone: bookData.tone,
        language: bookData.language,
        model: bookData.model,
        outline: baseSnapshot,
      });

      if (newEbook) {
        setCurrentEbookId(newEbook.id);
      } else {
        throw new Error("Your book could not be saved. Please try again.");
      }

      const shouldGenerateImages = bookData.includeImages && bookData.chapterContentType !== "text-only";
      const generatedChapters: {
        title: string;
        summary: string;
        coverImagePrompt?: string;
        pages: { title: string; content: string; imagePrompt?: string }[];
      }[] = [];
      let totalWords = 0;

      for (const chapter of chapterSequence) {
        let chapterResult: { pages?: any[] } | null = null;
        let chapterFailureReason: string | null = null;

        const initialChapterResponse = await supabase.functions.invoke('generate-ebook', {
          body: {
            action: 'generate-chapter',
            title: bookData.selectedTitle,
            model: bookData.model,
            language: bookData.language,
            tone: bookData.tone,
            wordsPerChapter: bookData.wordsPerChapter,
            pageCount: chapter.pageCount,
            chapterTitle: chapter.title,
            chapterDescription: chapter.description,
            chapterTopics: chapter.topics,
          },
        });

        const initialChapterError =
          initialChapterResponse.error?.message ||
          initialChapterResponse.data?.error ||
          null;

        if (!initialChapterError && Array.isArray(initialChapterResponse.data?.result?.pages)) {
          chapterResult = initialChapterResponse.data.result;
        } else {
          chapterFailureReason = initialChapterError || `Failed to write ${chapter.title}`;
          console.warn(`Chapter generation failed for "${chapter.title}". Falling back.`, chapterFailureReason);
        }

        if ((!chapterResult?.pages || chapterResult.pages.length === 0) && chapterFailureReason) {
          const retry = await supabase.functions.invoke('generate-ebook', {
            body: {
              action: 'generate-chapter',
              title: bookData.selectedTitle,
              model: bookData.model,
              language: bookData.language,
              tone: bookData.tone,
              wordsPerChapter: Math.min(bookData.wordsPerChapter, 1200),
              pageCount: Math.min(chapter.pageCount, 4),
              chapterTitle: chapter.title,
              chapterDescription: chapter.description,
              chapterTopics: chapter.topics,
            },
          });
          const retryError = retry.error?.message || retry.data?.error || null;

          if (!retryError && Array.isArray(retry.data?.result?.pages) && retry.data.result.pages.length > 0) {
            chapterResult = retry.data.result;
            chapterFailureReason = null;
          } else {
            chapterFailureReason = retryError || chapterFailureReason;
          }
        }

        const chapterPages = ((chapterResult?.pages ?? []) as any[])
          .map((page: any, index: number) => ({
            title: typeof page?.title === "string" && page.title.trim() ? page.title.trim() : `${chapter.title} — Part ${index + 1}`,
            content: typeof page?.content === "string" ? page.content.trim() : "",
            imagePrompt: shouldGenerateImages && typeof page?.imagePrompt === "string" ? page.imagePrompt.trim() : undefined,
          }))
          .filter((page) => page.content.length > 80);

        const maxExtraPages = 3;
        let extraPagesGenerated = 0;
        while (chapterPages.length < chapter.pageCount && extraPagesGenerated < maxExtraPages) {
          extraPagesGenerated++;
          const pageNumber = chapterPages.length + 1;
          const coveredSections = chapterPages.map((page) => page.title).join(", ") || "none yet";
          const { data: extraPageData, error: extraPageError } = await supabase.functions.invoke('generate-ebook', {
            body: {
              action: 'generate-page',
              title: bookData.selectedTitle,
              model: bookData.model,
              language: bookData.language,
              tone: bookData.tone,
              chapterTitle: chapter.title,
              pageContent: `Write page ${pageNumber} of ${chapter.pageCount} for the chapter "${chapter.title}". Chapter description: ${chapter.description}. Topics: ${chapter.topics.join(", ")}. Avoid repeating: ${coveredSections}.`,
            },
          });

          if (extraPageError || extraPageData?.error || !extraPageData?.result?.content) break;
          chapterPages.push({
            title: `${chapter.title} — Section ${pageNumber}`,
            content: extraPageData.result.content.trim(),
            imagePrompt: shouldGenerateImages && typeof extraPageData.result.imagePrompt === "string"
              ? extraPageData.result.imagePrompt.trim()
              : undefined,
          });
        }

        if (chapterPages.length === 0) {
          throw new Error(`No content was generated for "${chapter.title}".${chapterFailureReason ? ` ${chapterFailureReason}` : ""}`);
        }

        const finalPages = chapterPages.slice(0, chapter.pageCount);
        totalWords += finalPages.reduce((sum, page) => sum + page.content.split(/\s+/).filter(Boolean).length, 0);

        generatedChapters.push({
          title: chapter.title,
          summary: chapter.description,
          coverImagePrompt: shouldGenerateImages
            ? (finalPages[0]?.imagePrompt || `Editorial chapter cover image for "${chapter.title}" in a book about ${bookData.prompt}. ${chapter.description}`)
            : undefined,
          pages: finalPages,
        });

        // Update live preview after each chapter — flushSync forces immediate render
        const liveLayout = buildGeneratedBookLayout({
          bookTitle: bookData.selectedTitle,
          bookDescription: bookDescription || bookData.prompt,
          prompt: bookData.prompt,
          generatedChapters,
          includeImages: false,
          themeSeed: liveThemeSeed,
        });
        flushSync(() => {
          setLiveGenerationState({
            pages: liveLayout.pages,
            elements: liveLayout.elementsByPage,
            completedChapterCount: generatedChapters.length,
            totalChapterCount: chapterSequence.length,
            currentChapterTitle: chapterSequence[generatedChapters.length]?.title ?? "",
          });
        });
        if (newEbook) {
          await updateEbook(newEbook.id, {
            words: totalWords,
            outline: { ...baseSnapshot, generatedChapters, pages: liveLayout.pages, elements: liveLayout.elementsByPage },
          });
        }
      }

      // Final layout with fresh random theme
      const layout = buildGeneratedBookLayout({
        bookTitle: bookData.selectedTitle,
        bookDescription: bookDescription || bookData.prompt,
        prompt: bookData.prompt,
        generatedChapters,
        includeImages: shouldGenerateImages,
      });

      const prebuiltElements: Record<string, any[]> = { ...layout.elementsByPage };

      // Generate images in parallel batches (max 12)
      if (shouldGenerateImages && layout.imageTasks.length > 0) {
        const limited = layout.imageTasks.slice(0, 12);
        const BATCH_SIZE = 4;

        const generateOneImage = async ({ pageId: pid, imagePrompt }: { pageId: string; imagePrompt: string }) => {
          try {
            const { data, error } = await supabase.functions.invoke('generate-ebook-image', {
              body: { prompt: imagePrompt, style: 'photo' },
            });
            if (error || data?.error) {
              console.warn(`Image gen failed for page ${pid}:`, error?.message || data?.error);
              return;
            }
            if (data?.imageUrl) {
              const pageElems = prebuiltElements[pid] || [];
              const imgIdx = pageElems.findIndex((e: any) => e.type === 'image');
              if (imgIdx !== -1) {
                const updated = [...pageElems];
                updated[imgIdx] = { ...updated[imgIdx], src: data.imageUrl };
                prebuiltElements[pid] = updated;
              }
            }
          } catch (e) {
            console.warn(`Image gen error for page ${pid}:`, e);
          }
        };

        for (let i = 0; i < limited.length; i += BATCH_SIZE) {
          const batch = limited.slice(i, i + BATCH_SIZE);
          await Promise.all(batch.map(item => generateOneImage(item)));
        }
      }

      // Set pages and elements
      setSavedPageElements(prebuiltElements);
      try {
        localStorage.setItem(STORAGE_KEY_ELEMENTS, JSON.stringify(prebuiltElements));
      } catch (storageErr) {
        console.warn("localStorage quota exceeded, skipping cache:", storageErr);
      }
      setEbookPages(layout.pages);
      setSelectedPageId(layout.pages[0]?.id ?? null);

      if (newEbook) {
        const saved = await updateEbook(newEbook.id, {
          status: "draft",
          progress: 100,
          words: totalWords,
          chapters: generatedChapters.length,
          outline: {
            ...baseSnapshot,
            generatedChapters,
            pages: layout.pages,
            elements: prebuiltElements,
          },
        });
        if (saved) setLastSaved(new Date());
      }

      toast({ title: "Your AI-written book is ready!" });
    } catch (e: any) {
      console.error('Generate book error:', e);
      if (newEbook) {
        updateEbook(newEbook.id, { status: "draft", progress: 0 });
      }
      toast({ title: e.message || "Book generation failed. The outline is still available.", variant: "destructive" });
    } finally {
      setIsGeneratingBook(false);
      setLiveGenerationState(null);
    }
  };



  const handleAutoPrompt = () => {
    const ideas = [
      "How to build a profitable online business in 2026",
      "The definitive guide to personal finance and investing",
      "Mastering AI tools for creative professionals",
      "Building a remote-first company culture",
      "Digital marketing strategies for small businesses",
    ];
    setBookData(prev => ({ ...prev, prompt: ideas[Math.floor(Math.random() * ideas.length)] }));
    toast({ title: "Idea generated!" });
  };

  const handleRecordingComplete = useCallback((data: { transcript: string; duration: number; label: string }) => {
    addSource("audio", data.label);
    if (data.transcript) {
      setBookData(prev => ({
        ...prev,
        prompt: prev.prompt ? prev.prompt + "\n\n" + data.transcript : data.transcript,
      }));
    }
  }, [addSource]);

  const buildChapterGroups = (pages: UnifiedPage[]) => {
    const groups: { cover: UnifiedPage; startIndex: number; endIndex: number; pageIds: string[] }[] = [];
    let current: { cover: UnifiedPage; startIndex: number; endIndex: number; pageIds: string[] } | null = null;

    pages.forEach((page, index) => {
      if (page.type === "chapter") {
        if (current) groups.push(current);
        current = { cover: page, startIndex: index, endIndex: index, pageIds: [page.id] };
        return;
      }

      if (current && page.type !== "cover" && page.type !== "toc" && page.type !== "back") {
        current.endIndex = index;
        current.pageIds.push(page.id);
        return;
      }

      if (current) {
        groups.push(current);
        current = null;
      }
    });

    if (current) groups.push(current);
    return groups;
  };

  const moveArrayItem = <T,>(items: T[], from: number, to: number) => {
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
  };

  const chapterGroups = buildChapterGroups(ebookPages);
  const coverPage = ebookPages.find((page) => page.type === "cover");
  const tocPage = ebookPages.find((page) => page.type === "toc");
  const backPage = ebookPages.find((page) => page.type === "back");

  // Include ALL pages in canvas order so page numbers are always accurate.
  // Build a title lookup from chapterSequence keyed by chapter group index,
  // but prefer the actual page title from ebookPages when available.
  const chapterSeqTitleByGroupIdx = new Map(
    chapterSequence.map((ch, idx) => [idx, ch.title])
  );

  const sidebarChapters = [
    ...(coverPage ? [{ id: coverPage.id, title: "Cover", type: "cover" as const }] : []),
    ...(tocPage ? [{ id: tocPage.id, title: "Table of Contents", type: "toc" as const }] : []),
    ...chapterGroups.flatMap((group, groupIdx) => [
      {
        id: group.cover.id,
        // Use page's own title first (set during generation), then chapterSequence fallback
        title: group.cover.title || chapterSeqTitleByGroupIdx.get(groupIdx) || `Chapter ${groupIdx + 1}`,
        type: "chapter" as const,
      },
      // Include all content pages nested under this chapter
      ...ebookPages
        .slice(group.startIndex + 1, group.endIndex + 1)
        .map(p => ({ id: p.id, title: p.title || "(continued)", type: p.type as "chapter-page" | "blank" })),
    ]),
    ...(backPage ? [{ id: backPage.id, title: "Back Cover", type: "back" as const }] : []),
  ];

  // Actual canvas page numbers (1-based) keyed by page ID — excludes cover, toc, back
  const numberablePages = ebookPages.filter(p => p.type !== 'cover' && p.type !== 'toc' && p.type !== 'back');
  const pageNumberMap = new Map<string, number>();
  numberablePages.forEach((p, i) => pageNumberMap.set(p.id, i + 1));

  // Since sidebarChapters now includes all pages, the selected sidebar item IS the
  // selected canvas page — no need to map content pages to their chapter cover.
  const selectedSidebarChapterId = selectedPageId;

  const handleSidebarChapterAdd = (afterId: string, pageType?: string) => {
    const pt = (pageType || "chapter") as "cover" | "toc" | "chapter" | "chapter-page" | "back" | "blank";
    const groupIndex = chapterGroups.findIndex((group) => group.cover.id === afterId);
    const afterPageIndex = ebookPages.findIndex((page) => page.id === afterId);
    const insertIndex = groupIndex !== -1
      ? chapterGroups[groupIndex].endIndex + 1
      : afterPageIndex >= 0
        ? afterPageIndex + 1
        : ebookPages.length;
    const newPage = {
      id: crypto.randomUUID(),
      title: pt === "chapter" ? `Chapter ${chapterSequence.length + 1}` : pt === "chapter-page" ? "Content Page" : pt === "blank" ? "Blank Page" : "New Page",
      type: pt,
    };

    setEbookPages((prev) => {
      const next = [...prev];
      next.splice(insertIndex, 0, newPage);
      return next;
    });

    if (pt === "chapter") {
      const insertChapterAt = groupIndex !== -1 ? groupIndex + 1 : chapterSequence.length;
      setChapterSequence((prev) => {
        const next = [...prev];
        next.splice(insertChapterAt, 0, {
          id: `ch-${Date.now()}`,
          title: newPage.title,
          description: "New chapter",
          topics: [],
          includeImages: bookData.chapterContentType !== "text-only",
          pageCount: 8,
        });
        return next;
      });
    }

    setSelectedPageId(newPage.id);
  };

  const handleSidebarChapterTitleEdit = (id: string, title: string) => {
    setEbookPages((prev) => prev.map((page) => page.id === id ? { ...page, title } : page));
    const chapterIndex = chapterGroups.findIndex((group) => group.cover.id === id);
    if (chapterIndex !== -1) {
      setChapterSequence((prev) => prev.map((chapter, index) => index === chapterIndex ? { ...chapter, title } : chapter));
    }
  };

  const handleSidebarChapterDelete = (id: string) => {
    const groupIndex = chapterGroups.findIndex((group) => group.cover.id === id);
    if (groupIndex !== -1) {
      const removeIds = new Set(chapterGroups[groupIndex].pageIds);
      setEbookPages((prev) => prev.filter((page) => !removeIds.has(page.id)));
      setChapterSequence((prev) => prev.filter((_, index) => index !== groupIndex));
      if (selectedPageId && removeIds.has(selectedPageId)) {
        setSelectedPageId(ebookPages.find((page) => !removeIds.has(page.id))?.id || null);
      }
      return;
    }

    if (ebookPages.length <= 1) return;
    setEbookPages((prev) => prev.filter((page) => page.id !== id));
    if (selectedPageId === id) {
      setSelectedPageId(ebookPages.find((page) => page.id !== id)?.id || null);
    }
  };

  const handleSidebarChapterReorder = (fromSidebarIdx: number, toSidebarIdx: number) => {
    // Look up which chapter group each sidebar index belongs to by page ID
    const fromPageId = sidebarChapters[fromSidebarIdx]?.id;
    const toPageId = sidebarChapters[toSidebarIdx]?.id;
    const fromGroupIdx = chapterGroups.findIndex(g => g.cover.id === fromPageId);
    const toGroupIdx = chapterGroups.findIndex(g => g.cover.id === toPageId);

    if (fromGroupIdx < 0 || toGroupIdx < 0 || fromGroupIdx === toGroupIdx) return;

    setChapterSequence(prev => moveArrayItem(prev, fromGroupIdx, toGroupIdx));
    setEbookPages(prev => {
      const groups = buildChapterGroups(prev);
      if (groups.length === 0) return prev;
      const firstChapterStart = groups[0].startIndex;
      const lastChapterEnd = groups[groups.length - 1].endIndex;
      const prefix = prev.slice(0, firstChapterStart);
      const suffix = prev.slice(lastChapterEnd + 1);
      const chapterBlocks = groups.map(group => prev.slice(group.startIndex, group.endIndex + 1));
      return [...prefix, ...moveArrayItem(chapterBlocks, fromGroupIdx, toGroupIdx).flat(), ...suffix];
    });
  };

  const isDesign = activeTab === "design";

  return (
    <PageShell>
      <div ref={pageTopRef} aria-hidden="true" className="h-0" />
      <div className={isDesign ? "flex flex-col h-[calc(100vh-64px)] overflow-hidden" : "max-w-7xl mx-auto px-6 py-6"}>

        {/* === DESIGN TAB TOP BAR === */}
        {activeTab === "design" && (
          <div className="relative h-14 bg-foreground/[0.95] flex items-center px-4 gap-3 shrink-0">
            {/* Left: Title + Editing badge + Auto-Saved */}
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="text-base font-display font-bold text-background tracking-tight">eBOOK <span className="font-black">STUDIO</span></span>

              <Popover>
                <PopoverTrigger asChild>
                  <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-colors ${
                    accessMode === 'editing' ? 'bg-violet-500' :
                    accessMode === 'viewing' ? 'bg-blue-500' :
                    accessMode === 'commenting' ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}>
                    {accessMode === 'editing' && <Pencil className="w-3.5 h-3.5" />}
                    {accessMode === 'viewing' && <Eye className="w-3.5 h-3.5" />}
                    {accessMode === 'commenting' && <MessageSquare className="w-3.5 h-3.5" />}
                    {accessMode === 'admin' && <Shield className="w-3.5 h-3.5" />}
                    <span className="capitalize">{accessMode}</span>
                    <ChevronDown className="w-3 h-3 opacity-70" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" align="start" side="bottom">
                  <p className="text-xs text-muted-foreground font-medium px-2 pb-2">Your Access Level</p>
                  {([
                    { mode: "editing" as const, label: "Editing", desc: "Full Edit Access", icon: Pencil, color: "text-violet-500", dotColor: "bg-violet-500" },
                    { mode: "viewing" as const, label: "Viewing", desc: "Read Only", icon: Eye, color: "text-blue-500", dotColor: "bg-blue-500" },
                    { mode: "commenting" as const, label: "Commenting", desc: "Comments Only", icon: MessageSquare, color: "text-amber-500", dotColor: "bg-amber-500" },
                    { mode: "admin" as const, label: "Admin", desc: "Full Admin Access", icon: Shield, color: "text-emerald-500", dotColor: "bg-emerald-500" },
                  ]).map(item => (
                    <button key={item.mode} onClick={() => setAccessMode(item.mode)}
                      className={`w-full flex items-center gap-3 px-2 py-2.5 rounded-lg text-left transition-colors ${accessMode === item.mode ? 'bg-foreground/[0.03]' : 'hover:bg-foreground/[0.04]'}`}>
                      <span className={`w-2 h-2 rounded-full shrink-0 ${item.dotColor}`} />
                      <item.icon className={`w-4 h-4 shrink-0 ${item.color}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                      {accessMode === item.mode && <Check className={`w-4 h-4 shrink-0 ${item.color}`} />}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>

              <div className="relative group">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button onClick={async () => {
                      if (!currentEbookId) return;
                      const saved = await updateEbook(currentEbookId, { outline: buildSavedProjectSnapshot() });
                      if (saved) { setLastSaved(new Date()); toast({ title: currentEbookId.startsWith("local-") ? "Saved On This Device" : "Project Saved" }); }
                    }}
                      className="flex items-center gap-1.5 bg-emerald-500/20 px-2.5 py-1 rounded-lg hover:bg-emerald-500/30 transition-colors">
                      <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-xs font-medium text-emerald-400">{currentEbookId?.startsWith("local-") ? "Saved On This Device" : "Auto-Saved"}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs z-[9999]">
                    Save Project
                  </TooltipContent>
                </Tooltip>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 rounded-md bg-popover text-popover-foreground text-xs shadow-md border border-border whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[9999]">
                  Click To Save (Last Saved: {lastSaved.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })} // {lastSaved.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })})
                </div>
              </div>
            </div>

            {/* Center: Step Tabs */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="flex items-center gap-6 pointer-events-auto">
                {TABS.map((tab) => {
                  const isActive = activeTab === tab.id;
                  const tabIndex = TABS.findIndex(t => t.id === activeTab);
                  const isCompleted = (tab.id === "idea" && tabIndex > 0) || (tab.id === "generate" && tabIndex > 1);
                  return (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${isActive ? "text-background" : isCompleted ? "text-accent" : "text-background/40 hover:text-background/70"}`}>
                      {isCompleted ? <Check size={14} className="text-accent" /> : <tab.icon className="w-4 h-4" />}
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Collaborators + Actions */}
            <div className="flex items-center gap-2.5 ml-auto shrink-0">
              {(() => {
                const avatars = ["photo-1494790108377-be9c29b29330", "photo-1507003211169-0a1dd7228f2d", "photo-1534528741775-53994a69daeb", "photo-1438761681033-6461ffad8d80", "photo-1472099645785-5658abf4ff4e"];
                const maxShow = 2;
                const extra = avatars.length - maxShow;
                return (
                  <div className="flex items-center -space-x-2">
                    {avatars.slice(0, maxShow).map((id, i) => (
                      <img key={i} src={`https://images.unsplash.com/${id}?w=32&h=32&fit=crop`} alt="" className="w-7 h-7 rounded-full border-2 border-foreground object-cover" />
                    ))}
                    {extra > 0 && (
                      <div className="w-7 h-7 rounded-full border-2 border-foreground bg-accent flex items-center justify-center">
                        <span className="text-[10px] font-bold text-white">+{extra}</span>
                      </div>
                    )}
                  </div>
                );
              })()}
              <button onClick={() => setShowInviteModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-background/10 hover:bg-background/15 rounded-lg text-xs text-background font-medium transition-colors">
                <UserPlus className="w-3.5 h-3.5" />Invite
              </button>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent/90 rounded-lg text-xs text-white font-semibold transition-colors">
                    <Sparkles className="w-3.5 h-3.5" />Create<ChevronDown className="w-3 h-3 opacity-70" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-1.5" align="end" sideOffset={6}>
                  {[
                    { id: 'audiobook' as const, label: 'AudioBook', icon: Headphones },
                    { id: 'presentation' as const, label: 'Video Presentation', icon: Presentation },
                  ].map(opt => (
                    <button key={opt.id}
                      onClick={() => {
                        setBookData(prev => ({ ...prev, contentType: opt.id }));
                        setContentTypeSelected(true);
                        if (activeTab === 'design') {
                          toast({ title: `Switched to ${opt.label} mode` });
                        } else {
                          setActiveTab('idea');
                          toast({ title: `Creating ${opt.label}`, description: 'Enter your prompt to get started' });
                        }
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        bookData.contentType === opt.id ? 'bg-accent/10 text-accent font-medium' : 'hover:bg-foreground/[0.04]'
                      }`}>
                      <opt.icon className="w-4 h-4" />
                      {opt.label}
                      {bookData.contentType === opt.id && <Check className="w-3.5 h-3.5 ml-auto" />}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
              <button onClick={() => setShowShareModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-background/10 hover:bg-background/15 rounded-lg text-xs text-background font-medium transition-colors">
                <Share2 className="w-3.5 h-3.5" />Share
              </button>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="p-1.5 rounded-lg hover:bg-background/15 text-background/70 hover:text-background transition-colors">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-52 p-1.5 z-[10050]" align="end" side="bottom">
                  <button onClick={() => setShowBookSettingsDialog(true)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm hover:bg-foreground/[0.04] transition-colors">
                    <Settings className="w-4 h-4 text-muted-foreground" />Book Settings
                  </button>
                  <div className="my-1 border-t border-foreground/[0.06]" />
                  <button onClick={() => {
                    if (confirm('Are you sure you want to reset this book? All pages and content will be deleted. This cannot be undone.')) {
                      localStorage.removeItem(STORAGE_KEY_PAGES);
                      localStorage.removeItem(STORAGE_KEY_ELEMENTS);
                      sessionStorage.removeItem('ebook-last-url');
                      sessionStorage.removeItem('ebook-current-id');
                      setCurrentEbookId(null);
                      setEbookPages(getDefaultPages());
                      setSavedPageElements({});
                      setBookData(prev => ({ ...prev, selectedTitle: '', prompt: '' }));
                      setTitleSuggestions([]);
                      setTitleBatchVersion(0);
                      setChapterSequence([]);
                      setActiveTab('idea');
                      sonnerToast.success('Book has been reset');
                    }
                  }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors">
                    <X className="w-4 h-4" />Reset Book
                  </button>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}

        {/* === DESIGN SUB-BAR: Back + Project Name + Canvas Tools === */}
        {activeTab === "design" && (
          <div className="relative flex items-center px-4 py-2 border-b border-foreground/[0.04] bg-background">
            <div className="flex items-center gap-3 shrink-0">
              <button onClick={() => {
                if (showBookSettingsDialog) {
                  setShowBookSettingsDialog(false);
                } else {
                  sessionStorage.removeItem("ebook-last-url");
                  navigate("/ebook-creator");
                }
              }} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                <ArrowLeft size={16} />{showBookSettingsDialog ? "Back To Editor" : "Back To Projects"}
              </button>
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <ProjectNameInput
                value={bookData.selectedTitle || "Untitled Book"}
                onChange={val => setBookData(prev => ({ ...prev, selectedTitle: val }))}
              />
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <Tooltip><TooltipTrigger asChild><button onClick={() => canvasRef.current?.undo()} className="p-1.5 rounded-lg hover:bg-foreground/[0.05] text-muted"><Undo2 size={15} /></button></TooltipTrigger><TooltipContent>Undo (⌘Z)</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><button onClick={() => canvasRef.current?.redo()} className="p-1.5 rounded-lg hover:bg-foreground/[0.05] text-muted"><Redo2 size={15} /></button></TooltipTrigger><TooltipContent>Redo (⌘⇧Z)</TooltipContent></Tooltip>
              <div className="w-px h-5 bg-foreground/[0.08] mx-0.5" />
              <Tooltip><TooltipTrigger asChild><button onClick={() => setFindReplaceMode(prev => prev === 'find' ? null : 'find')} className={`p-1.5 rounded-lg hover:bg-foreground/[0.05] ${findReplaceMode === 'find' ? 'text-accent bg-accent/10' : 'text-muted'}`}><Search size={15} /></button></TooltipTrigger><TooltipContent>Find</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><button onClick={() => setFindReplaceMode(prev => prev === 'find-replace' ? null : 'find-replace')} className={`p-1.5 rounded-lg hover:bg-foreground/[0.05] ${findReplaceMode === 'find-replace' ? 'text-accent bg-accent/10' : 'text-muted'}`}><ArrowRightLeft size={15} /></button></TooltipTrigger><TooltipContent>Find &amp; Replace (⌘H)</TooltipContent></Tooltip>
              <div className="w-px h-5 bg-foreground/[0.08] mx-0.5" />
               <Tooltip><TooltipTrigger asChild><button onClick={() => setZoom(z => Math.max(z - 10, 25))} className="p-1.5 rounded-lg hover:bg-foreground/[0.05] text-muted"><Minus size={15} /></button></TooltipTrigger><TooltipContent>Zoom Out</TooltipContent></Tooltip>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-1 text-xs text-muted font-medium hover:bg-foreground/[0.05] rounded px-2 py-1 transition-colors">
                    {zoom}%<ChevronDown size={11} className="opacity-60" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-28 p-1" align="center" side="bottom">
                  {[25, 50, 75, 100, 125, 150, 175, 200].map(v => (
                    <button key={v} onClick={() => setZoom(v)}
                      className={`w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors ${zoom === v ? 'bg-accent/10 text-accent font-medium' : 'hover:bg-foreground/[0.04]'}`}>
                      {v}%
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
              <Tooltip><TooltipTrigger asChild><button onClick={() => setZoom(z => Math.min(z + 10, 200))} className="p-1.5 rounded-lg hover:bg-foreground/[0.05] text-muted"><Plus size={15} /></button></TooltipTrigger><TooltipContent>Zoom In</TooltipContent></Tooltip>
            </div>
          </div>
        )}

        {/* Non-design top bar */}
        {activeTab !== "design" && (
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button onClick={() => { sessionStorage.removeItem("ebook-last-url"); navigate("/ebook-creator"); }} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"><ArrowLeft size={16} />Back To Projects</button>
            </div>
          </div>
        )}

        {/* Generation progress bar */}
        {isTitleGenerationVisible && (
          <div className="max-w-3xl mx-auto mb-6 p-4 rounded-xl border border-foreground/[0.08] bg-background">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
                {isRegeneratingTitles ? <Loader2 className="w-5 h-5 text-accent animate-spin" /> : <Sparkles className="w-5 h-5 text-accent animate-pulse" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{titleGenerationLabel}</p>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <span>{Math.round(generationProgress)}% Complete</span>
                  {isRegeneratingTitles && <span aria-hidden="true">•</span>}
                  {isRegeneratingTitles && <span>Current Titles Stay Visible Until The New Batch Is Ready.</span>}
                </div>
              </div>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${generationProgress}%` }} />
            </div>
          </div>
        )}

        {/* === IDEA TAB === */}
        {activeTab === "idea" && (
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-display font-bold text-foreground text-center mb-8">What Would You Like To Create?</h2>

            {/* Prompt box */}
            <div className="rounded-2xl border-2 border-accent/30 bg-background p-1 mb-6">
              <div className="flex items-center gap-2 px-3 py-3">
                <button onClick={handleAutoPrompt} className="text-emerald-500 hover:text-emerald-400 shrink-0 self-start mt-0.5"><Shuffle size={18} /></button>
                <div className="flex-1 min-w-0">
                  {/* Attached source pills */}
                  {attachedSources.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {attachedSources.map(src => (
                        <span key={src.id} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                          src.type === "file" ? "bg-accent/10 text-accent" :
                          src.type === "link" ? "bg-accent/10 text-accent" :
                          "bg-destructive/10 text-destructive"
                        }`}>
                          {src.type === "file" && <Upload size={11} />}
                          {src.type === "link" && <Link2 size={11} />}
                          {src.type === "audio" && <Mic size={11} />}
                          {src.label}
                          <button onClick={() => removeSource(src.id)} className="ml-0.5 hover:opacity-70"><X size={10} /></button>
                        </span>
                      ))}
                    </div>
                  )}
                  <textarea
                    value={bookData.prompt}
                    onChange={e => setBookData(prev => ({ ...prev, prompt: e.target.value }))}
                    placeholder="What is your topic or niche? (e.g., digital marketing for small business)"
                    className="w-full min-h-[60px] bg-transparent text-foreground placeholder:text-muted-foreground/50 focus:outline-none resize-none text-sm"
                  />
                </div>
              </div>

              {/* Toolbar chips */}
              <div className="flex items-center gap-2 px-3 pb-3 flex-wrap">
                {/* Source */}
                <button onClick={() => setShowSourceCards(prev => !prev)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${showSourceCards ? "bg-accent text-white" : "bg-accent/10 text-accent hover:bg-accent/15"}`}>
                  <Mic size={13} />Source: {SOURCE_OPTIONS.find(s => s.id === bookData.sourceType)?.label}
                  <ChevronDown size={11} className={`transition-transform ${showSourceCards ? "rotate-180" : ""}`} />
                </button>

                {/* Type */}
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground/[0.05] text-foreground text-xs font-medium hover:bg-foreground/[0.08] transition-colors">
                      <Cpu size={13} />Type
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-1.5" align="start">
                    {CONTENT_TYPES.map(ct => (
                      <button key={ct.id} onClick={() => setBookData(prev => ({ ...prev, contentType: ct.id as any }))}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${bookData.contentType === ct.id ? "bg-accent/10 text-accent" : "hover:bg-foreground/[0.04]"}`}>
                        <ct.icon size={14} />{ct.label}{bookData.contentType === ct.id && <Check size={12} className="ml-auto" />}
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>

                {/* Model */}
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground/[0.05] text-foreground text-xs font-medium hover:bg-foreground/[0.08] transition-colors">
                      <Cpu size={13} />{AI_MODELS.find(m => m.id === bookData.model)?.name}
                      <ChevronDown size={11} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-1.5" align="start">
                    {AI_MODELS.map(m => (
                      <button key={m.id} onClick={() => setBookData(prev => ({ ...prev, model: m.id }))}
                        className={`w-full flex items-start gap-2 px-3 py-2.5 rounded-lg text-left transition-colors ${bookData.model === m.id ? "bg-accent/10" : "hover:bg-foreground/[0.04]"}`}>
                        <div><p className={`text-sm font-semibold ${bookData.model === m.id ? "text-accent" : "text-foreground"}`}>{m.name}</p><p className="text-xs text-muted-foreground">{m.description}</p></div>
                        {bookData.model === m.id && <Check size={14} className="text-accent shrink-0 mt-0.5" />}
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>

                {/* Language */}
                <Popover open={languageOpen} onOpenChange={o => { setLanguageOpen(o); if (!o) setLanguageSearch(""); }}>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground/[0.05] text-foreground text-xs font-medium hover:bg-foreground/[0.08] transition-colors">
                      <span>{currentLanguage?.flag}</span>{currentLanguage?.name}
                      <ChevronDown size={11} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2" align="start">
                    <div className="relative mb-2">
                      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input type="text" value={languageSearch} onChange={e => setLanguageSearch(e.target.value)} placeholder="Search Languages" className="w-full pl-8 pr-3 py-2 rounded-lg border border-foreground/[0.1] bg-background text-xs focus:outline-none" />
                    </div>
                    <div className="max-h-52 overflow-y-auto">
                      {LANGUAGES.filter(l => l.name.toLowerCase().includes(languageSearch.toLowerCase())).map(l => (
                        <button key={l.code} onClick={() => { setBookData(prev => ({ ...prev, language: l.code })); setLanguageOpen(false); }}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${bookData.language === l.code ? "bg-accent/10 text-accent" : "hover:bg-foreground/[0.04]"}`}>
                          <span>{l.flag}</span>{l.name}{bookData.language === l.code && <Check size={14} className="ml-auto text-accent" />}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Tone */}
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground/[0.05] text-foreground text-xs font-medium hover:bg-foreground/[0.08] transition-colors">
                      <MessageSquare size={13} />Tone: {currentTone?.name}
                      <ChevronDown size={11} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-1.5" align="start">
                    {TONES.map(t => (
                      <button key={t.id} onClick={() => setBookData(prev => ({ ...prev, tone: t.id }))}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${bookData.tone === t.id ? "bg-accent/10 text-accent" : "hover:bg-foreground/[0.04]"}`}>
                        <t.icon size={14} />{t.name}{bookData.tone === t.id && <Check size={12} className="ml-auto" />}
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>

                {/* Brand */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button onClick={handleBrandClick}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${brandActive ? "bg-accent text-white" : "bg-foreground/[0.05] text-foreground hover:bg-foreground/[0.08]"}`}>
                      <Palette size={13} />
                      Brand{brandActive ? ": On" : ""}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isBrandProfileSetup()
                      ? (brandActive ? "Using your brand voice & style" : "Apply your brand voice & style")
                      : "Set up your brand profile to write in your voice"}
                  </TooltipContent>
                </Tooltip>

                <div className="flex-1" />
                {/* Send button */}
                <button id="ghost-ink-generate-btn" onClick={handleGenerate} disabled={isGenerating || !bookData.prompt.trim()}
                  className="w-10 h-10 rounded-lg bg-accent text-white flex items-center justify-center hover:bg-accent/90 transition-colors disabled:opacity-50 shrink-0">
                  <Send size={16} />
                </button>
              </div>
            </div>

            {/* Source cards — shown when Source button is toggled */}
            {showSourceCards && (
            <div className="grid grid-cols-3 gap-4">
              {/* Upload File */}
              <button onClick={() => { fileInputRef.current?.click(); setShowSourceCards(false); }} className="group flex flex-col items-center p-6 rounded-2xl border border-foreground/[0.1] hover:border-foreground/[0.2] bg-background transition-all">
                <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-3 group-hover:bg-accent/15 transition-colors">
                  <Upload className="w-6 h-6 text-accent" />
                </div>
                <span className="text-sm font-semibold text-foreground mb-2">Upload File</span>
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-foreground/[0.04]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="2" width="18" height="20" rx="2" fill="#E53E3E" /><text x="12" y="15" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">PDF</text></svg>
                    <span className="text-[10px] font-semibold text-muted-foreground">PDF</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-foreground/[0.04]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="2" width="18" height="20" rx="2" fill="#2B6CB0" /><text x="12" y="15" textAnchor="middle" fill="white" fontSize="6" fontWeight="bold">DOC</text></svg>
                    <span className="text-[10px] font-semibold text-muted-foreground">DOCX</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-foreground/[0.04]">
                    <span className="text-[10px] font-semibold text-muted-foreground">+</span>
                  </div>
                </div>
              </button>

              {/* Insert Link */}
              <button onClick={() => { setShowLinkInput(true); setShowSourceCards(false); setBookData(prev => ({ ...prev, sourceType: "link" })); }} className="group flex flex-col items-center p-6 rounded-2xl border border-foreground/[0.1] hover:border-foreground/[0.2] bg-background transition-all">
                <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-3 group-hover:bg-accent/15 transition-colors">
                  <Link2 className="w-6 h-6 text-accent" />
                </div>
                <span className="text-sm font-semibold text-foreground mb-2">Insert Link</span>
                <div className="flex items-center gap-1.5">
                  <svg width="16" height="16" viewBox="0 0 24 24"><path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 00.5 6.2 31.5 31.5 0 000 12a31.5 31.5 0 00.5 5.8 3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1A31.5 31.5 0 0024 12a31.5 31.5 0 00-.5-5.8z" fill="#FF0000"/><path d="M9.75 15.02l6.27-3.02-6.27-3.02v6.04z" fill="#FFF"/></svg>
                  <svg width="14" height="14" viewBox="0 0 24 24"><path d="M19.3 6.7A4.5 4.5 0 0116 5.1V2h-3v14a3 3 0 11-2-2.8V10a6 6 0 105 5.9V10a7.5 7.5 0 003.3.8V8a4.5 4.5 0 01-1-.3z" fill="currentColor"/></svg>
                  <svg width="14" height="14" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" fill="url(#ig)" /><circle cx="12" cy="12" r="4" stroke="white" strokeWidth="1.5" fill="none" /><circle cx="17.5" cy="6.5" r="1.2" fill="white" /><defs><linearGradient id="ig" x1="0" y1="24" x2="24" y2="0"><stop stopColor="#FD5" /><stop offset=".5" stopColor="#FF543E" /><stop offset="1" stopColor="#C837AB" /></linearGradient></defs></svg>
                  <span className="text-[10px] font-semibold text-muted-foreground">+45</span>
                </div>
              </button>

              {/* Audio */}
              <button onClick={() => { setShowRecordModal(true); setShowSourceCards(false); }} className="group flex flex-col items-center p-6 rounded-2xl border border-foreground/[0.1] hover:border-foreground/[0.2] bg-background transition-all">
                <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-3 group-hover:bg-accent/15 transition-colors">
                  <Mic className="w-6 h-6 text-accent" />
                </div>
                <span className="text-sm font-semibold text-foreground mb-2">Audio</span>
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-foreground/[0.04]">
                    <Upload className="w-2.5 h-2.5 text-muted-foreground" />
                    <span className="text-[10px] font-semibold text-muted-foreground">Upload</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-foreground/[0.04]">
                    <span className="flex items-center gap-1 text-[10px] font-bold text-destructive"><span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />Record</span>
                  </div>
                </div>
              </button>
            </div>
            )}
          </div>
        )}

        {/* Audio Recording Modal */}
        <EbookRecordingModal
          open={showRecordModal}
          onClose={() => setShowRecordModal(false)}
          onComplete={handleRecordingComplete}
        />

        {/* Hidden file input for Upload File card */}
        <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt,.rtf,.epub,.md" multiple className="hidden" onChange={e => {
          const files = e.target.files;
          if (files) {
            Array.from(files).forEach(f => addSource("file", f.name));
            toast({ title: `${files.length} file${files.length > 1 ? "s" : ""} attached` });
          }
          if (e.target) e.target.value = "";
        }} />

        {/* Link input dialog */}
        <Dialog open={showLinkInput} onOpenChange={setShowLinkInput}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Insert Link</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3 py-2">
              <p className="text-xs text-muted-foreground">Paste a URL to use as a source (YouTube, article, website, etc.)</p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input aria-label="Website Link" autoFocus value={linkInputValue} onChange={e => setLinkInputValue(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && linkInputValue.trim()) { addSource("link", linkInputValue.trim()); setLinkInputValue(""); setShowLinkInput(false); toast({ title: "Link attached" }); } }}
                    placeholder="https://..."
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-foreground/[0.1] bg-background text-sm outline-none focus:border-accent transition-colors" />
                </div>
                <Button onClick={() => { if (linkInputValue.trim()) { addSource("link", linkInputValue.trim()); setLinkInputValue(""); setShowLinkInput(false); toast({ title: "Link attached" }); } }}
                  disabled={!linkInputValue.trim()}
                  className="px-4 py-2.5 rounded-lg bg-accent text-accent-foreground text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50">
                  Add
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        {activeTab === "generate" && (
          <div className="max-w-3xl mx-auto">
            {/* Step Progress Bar */}
            <div className="flex items-center justify-center gap-0 mb-10">
              {(() => {
                const steps = [
                  { key: "source", label: "Source Material", done: true, active: false },
                  { key: "titles", label: "Book Title", done: generateStep === "chapters", active: generateStep === "titles" },
                  { key: "chapters", label: "Book Outline", done: false, active: generateStep === "chapters" },
                  { key: "drafts", label: "Chapter Drafts", done: false, active: false },
                ];
                return steps.map((step, i) => (
                <div key={step.key} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mb-1.5 transition-all ${
                      step.done ? "bg-emerald-500 text-white" : step.active ? "bg-accent text-white ring-4 ring-accent/20" : "bg-foreground/[0.06] text-muted-foreground"
                    }`}>
                      {step.done ? <Check size={18} /> : i + 1}
                    </div>
                    <span className={`text-xs font-medium ${step.done ? "text-emerald-600" : step.active ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`w-16 h-0.5 mx-2 mt-[-18px] ${step.done ? "bg-emerald-500" : "bg-foreground/[0.08]"}`} />
                  )}
                </div>
              ));
              })()}
            </div>

            {/* TITLE SELECTION PAGE */}
            {generateStep === "titles" && (
              <div>
                <h2 className="text-2xl font-bold text-foreground text-center mb-2">Pick Your Winning Title</h2>
                <p className="text-sm text-muted-foreground text-center mb-8">Select A Title Or Tweak One To Match Your Voice. You Can Change It Anytime.</p>

                <div key={titleBatchVersion} aria-busy={isGenerating} className={`space-y-3 mb-6 transition-opacity ${isGenerating ? "opacity-70" : "opacity-100"}`}>
                  {titleSuggestions.map((title, i) => {
                    const badge = TITLE_BADGES[i % TITLE_BADGES.length];
                    const isSelected = bookData.selectedTitle === title;
                    const isEditing = editingTitleIndex === i;
                    const isRecommended = i === recommendedTitleIndex;

                    return (
                      <button key={`${titleBatchVersion}-${i}-${title}`} onClick={() => { if (!isEditing) setBookData(prev => ({ ...prev, selectedTitle: title })); }}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 group relative ${
                          isSelected ? "border-accent bg-accent/[0.04] shadow-sm shadow-accent/10 animate-[titleSelect_0.25s_ease-out]"
                          : isRecommended ? "border-amber-200/80 bg-amber-50/30 shadow-[0_0_12px_-3px_rgba(245,185,60,0.15)] hover:border-amber-300/80"
                          : "border-foreground/[0.08] hover:border-foreground/[0.15]"
                        }`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                            isSelected ? "bg-accent text-white animate-[checkPop_0.35s_cubic-bezier(0.34,1.56,0.64,1)]" : "bg-foreground/[0.08] text-foreground/60"
                          }`}>
                            {isSelected ? <Check size={16} /> : i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            {isEditing ? (
                              <input
                                autoFocus
                                value={title}
                                onChange={e => {
                                  const newTitle = e.target.value;
                                  setTitleSuggestions(prev => prev.map((t, idx) => idx === i ? newTitle : t));
                                  if (isSelected) setBookData(prev => ({ ...prev, selectedTitle: newTitle }));
                                }}
                                onBlur={() => setEditingTitleIndex(null)}
                                onKeyDown={e => { if (e.key === "Enter") setEditingTitleIndex(null); }}
                                className="w-full text-sm font-semibold text-foreground bg-transparent border-b-2 border-accent outline-none py-0.5"
                                onClick={e => e.stopPropagation()}
                              />
                            ) : (
                              <p className="text-sm font-semibold text-foreground">{title}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${badge.color}`}>
                                <badge.icon size={10} />{badge.label}
                              </span>
                              {isRecommended && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-amber-700 bg-amber-50 ring-1 ring-amber-200/60">
                                  <Star size={10} className="fill-amber-400 text-amber-400" />Recommended For You
                                </span>
                              )}
                            </div>
                          </div>
                          <button onClick={e => { e.stopPropagation(); setEditingTitleIndex(isEditing ? null : i); }}
                            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-foreground/[0.05] text-muted-foreground transition-all">
                            <Pencil size={14} />
                          </button>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Write My Own Title */}
                {showCustomTitle ? (
                  <div className="p-4 rounded-xl border-2 border-foreground/[0.08] mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-foreground/[0.06] flex items-center justify-center shrink-0">
                        <Pencil size={14} className="text-muted-foreground" />
                      </div>
                      <input
                        autoFocus
                        value={customTitle}
                        onChange={e => setCustomTitle(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter" && customTitle.trim()) {
                            setBookData(prev => ({ ...prev, selectedTitle: customTitle.trim() }));
                          }
                        }}
                        placeholder="Type your book title..."
                        className="flex-1 text-sm font-semibold text-foreground bg-transparent outline-none placeholder:text-muted-foreground/50"
                      />
                      {customTitle.trim() && (
                        <button onClick={() => setBookData(prev => ({ ...prev, selectedTitle: customTitle.trim() }))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            bookData.selectedTitle === customTitle.trim() ? "bg-accent text-white" : "bg-foreground/[0.05] hover:bg-foreground/[0.08] text-foreground"
                          }`}>
                          {bookData.selectedTitle === customTitle.trim() ? "Selected" : "Use This"}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowCustomTitle(true)}
                    className="w-full p-4 rounded-xl border-2 border-dashed border-foreground/[0.1] hover:border-foreground/[0.2] text-sm font-medium text-muted-foreground hover:text-foreground transition-all mb-6 flex items-center gap-3">
                    <Pencil size={16} /> Write My Own Title
                  </button>
                )}

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-foreground/[0.06]">
                  <button onClick={() => { setTitleSuggestions([]); setGenerateStep("titles"); setActiveTab("idea"); }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors">
                    <ArrowLeft size={16} />Back
                  </button>
                  <div className="flex items-center gap-3">
                    <button onClick={handleGenerate} disabled={isGenerating}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-foreground/[0.1] text-sm font-medium hover:bg-foreground/[0.04] transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                      {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      {isGenerating ? "Regenerating..." : "Regenerate"}
                    </button>
                    <button onClick={async () => {
                      if (chapterSequence.length > 0) {
                        setGenerateStep("chapters");
                      } else {
                        // Custom title with no outline yet — generate one
                        setIsGenerating(true);
                        setGenerationProgress(0);
                        const interval = window.setInterval(() => {
                          setGenerationProgress(prev => Math.min(prev + Math.random() * 8, 90));
                        }, 600);
                        try {
                          const { data, error } = await supabase.functions.invoke('generate-ebook', {
                            body: {
                              action: 'generate-outline',
                              prompt: bookData.prompt?.trim() || bookData.selectedTitle,
                              model: bookData.model,
                              language: bookData.language,
                              tone: bookData.tone,
                              chapters: bookData.chapters,
                              wordsPerChapter: bookData.wordsPerChapter,
                              selectedTitle: bookData.selectedTitle,
                            },
                          });
                          window.clearInterval(interval);
                          if (error) throw new Error(error.message);
                          if (data?.error) throw new Error(data.error);
                          const result = data.result;
                          setBookDescription(result.description || '');
                          setChapterSequence(
                            (result.chapters || []).map((ch: any, i: number) => ({
                              id: `ch-${i + 1}`,
                              title: ch.title,
                              description: ch.description,
                              topics: ch.topics || [],
                              includeImages: true,
                              pageCount: ch.pageCount || 8,
                            }))
                          );
                          setGenerationProgress(100);
                          setGenerateStep("chapters");
                        } catch (e) {
                          window.clearInterval(interval);
                          console.error("Failed to generate outline:", e);
                          // Fallback: create default chapters
                          const count = bookData.chapters || 5;
                          setChapterSequence(
                            Array.from({ length: count }, (_, i) => ({
                              id: `ch-${i + 1}`,
                              title: `Chapter ${i + 1}`,
                              description: "",
                              topics: [],
                              includeImages: true,
                              pageCount: 8,
                            }))
                          );
                          setGenerateStep("chapters");
                        } finally {
                          setIsGenerating(false);
                        }
                      }
                    }} disabled={!bookData.selectedTitle || isGenerating}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50">
                      {isGenerating ? <><Loader2 size={14} className="animate-spin" />Generating...</> : <>Continue<ArrowRight size={16} /></>}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* CHAPTER OUTLINE PAGE */}
            {generateStep === "chapters" && chapterSequence.length > 0 && (
              <div>
                {/* Stronger heading */}
                <h2 className="text-2xl font-bold text-foreground text-center mb-1">Your Book Blueprint</h2>
                <p className="text-sm text-foreground/80 text-center mb-1">
                  <span className="font-semibold text-foreground">{bookData.selectedTitle}</span>
                </p>
                <p className="text-xs text-muted-foreground text-center mb-8">Edit, refine, and finalize your chapters before generating your book.</p>

                {/* Confidence Stats Bar */}
                <div className="flex items-center justify-center gap-4 mb-10 p-4 bg-foreground/[0.02] rounded-2xl border border-foreground/[0.06] shadow-sm">
                  {[
                    { icon: BookOpen, value: chapterSequence.length, label: "Chapters" },
                    { icon: FileText, value: `~${chapterSequence.reduce((sum, ch) => sum + (ch.pageCount || 8), 0)}`, label: "Pages" },
                    { icon: Hash, value: `~${(bookData.wordsPerChapter * chapterSequence.length).toLocaleString()}`, label: "Words" },
                    { icon: Image, value: chapterSequence.filter(ch => ch.includeImages).length, label: "w/ Images" },
                  ].map((stat, idx) => (
                    <div key={stat.label} className="flex items-center gap-2">
                      {idx > 0 && <div className="w-px h-5 bg-foreground/[0.08] mr-2" />}
                      <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                        <stat.icon size={14} className="text-accent" />
                      </div>
                      <div>
                        <span className="font-bold text-foreground text-sm">{stat.value}</span>
                        <span className="text-[11px] text-muted-foreground ml-1">{stat.label}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chapter Cards */}
                <div className="space-y-3 mb-8">
                  {chapterSequence.map((ch, i) => (
                    <div key={ch.id} className={`group/card relative rounded-xl border bg-background overflow-hidden transition-all duration-200 ${improvingChapterIdx === i ? 'border-amber-500/40 shadow-[0_4px_20px_-6px_hsl(40_95%_55%/0.2)]' : 'border-foreground/[0.08] hover:border-accent/30 hover:shadow-[0_4px_20px_-6px_hsl(var(--accent)/0.12)] hover:-translate-y-[2px]'}`}>
                      {/* Loading shimmer overlay */}
                      {improvingChapterIdx === i && (
                        <div className="absolute inset-0 z-10 pointer-events-none">
                          <div className="absolute inset-0 bg-amber-500/[0.03] animate-pulse" />
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/[0.06] to-transparent animate-[shimmer_1.5s_infinite]" style={{ backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
                        </div>
                      )}
                      {/* Left accent bar */}
                      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent/0 group-hover/card:bg-accent rounded-l-xl transition-all duration-200" />
                      <div className="flex items-start gap-3 p-5 pl-6">
                        <span className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 group-hover/card:bg-accent group-hover/card:text-white transition-colors duration-200">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          {/* Title — darker, bigger */}
                          <input
                            value={ch.title}
                            onChange={e => setChapterSequence(prev => prev.map((c, idx) => idx === i ? { ...c, title: e.target.value } : c))}
                            className="w-full font-bold text-foreground text-[15px] bg-transparent outline-none border-b border-transparent hover:border-foreground/[0.1] focus:border-accent transition-colors pb-0.5"
                          />
                          {/* Description — lighter */}
                          <p className="text-xs text-muted-foreground/80 mt-1.5 leading-relaxed">{ch.description}</p>
                          {/* Topics — even more subtle */}
                          <div className="flex flex-wrap gap-1.5 mt-2.5">
                            {ch.topics.map(t => <span key={t} className="px-2 py-0.5 bg-foreground/[0.03] text-muted-foreground/60 text-[10px] rounded-full border border-foreground/[0.04]">{t}</span>)}
                          </div>

                          {/* Chapter metadata row — smallest + muted */}
                          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-foreground/[0.04]">
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
                              <FileText size={11} />
                              <span>~{ch.pageCount || 8} pages</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
                              <Hash size={11} />
                              <span>~{bookData.wordsPerChapter.toLocaleString()} words</span>
                            </div>
                            {/* Images toggle — neutral style, NOT red */}
                            <button
                              onClick={() => setChapterSequence(prev => prev.map((c, idx) => idx === i ? { ...c, includeImages: !c.includeImages } : c))}
                              className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors ${
                                ch.includeImages
                                  ? "text-emerald-600 bg-emerald-500/10 border border-emerald-500/20"
                                  : "text-muted-foreground/60 bg-foreground/[0.03] border border-foreground/[0.06]"
                              }`}>
                              <Image size={11} />
                              {ch.includeImages ? "Images: On" : "Images: Off"}
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-1.5 shrink-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200">
                          <button onClick={(e) => { e.stopPropagation(); /* focus the title input */ const input = e.currentTarget.closest('[class*="group/card"]')?.querySelector('input'); input?.focus(); }}
                            className="p-1.5 rounded-lg hover:bg-accent/10 text-muted-foreground/50 hover:text-accent transition-colors" title="Edit">
                            <Pencil size={13} />
                          </button>
                          <button disabled={improvingChapterIdx !== null} onClick={async (e) => {
                            e.stopPropagation();
                            setImprovingChapterIdx(i);
                            try {
                              const resp = await supabase.functions.invoke("generate-ebook", {
                                body: {
                                  action: "generate-outline",
                                  prompt: `Improve this chapter for the book "${bookData.selectedTitle}": Title: "${ch.title}", Description: "${ch.description}". Make the title more compelling and the description richer with actionable insights. Keep the same topic focus.`,
                                  model: bookData.model || "auto",
                                  tone: bookData.tone || "professional",
                                  language: bookData.language || "en",
                                  chapters: 1,
                                  wordsPerChapter: bookData.wordsPerChapter || 1500,
                                },
                              });
                              const result = resp.data?.result;
                              if (result?.chapters?.[0]) {
                                const improved = result.chapters[0];
                                setChapterSequence(prev => prev.map((c, idx) => idx === i ? { ...c, title: improved.title || c.title, description: improved.description || c.description, topics: improved.topics?.length ? improved.topics : c.topics } : c));
                                toast({ title: "Chapter improved ✨" });
                              }
                            } catch { toast({ title: "Improvement failed", variant: "destructive" }); } finally { setImprovingChapterIdx(null); }
                          }}
                            className={`p-1.5 rounded-lg transition-colors ${improvingChapterIdx === i ? 'bg-amber-500/20 text-amber-600' : 'hover:bg-amber-500/10 text-muted-foreground/50 hover:text-amber-600'}`} title="AI Improve">
                            {improvingChapterIdx === i ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
                          </button>
                          <button onClick={() => setChapterSequence(prev => prev.filter((_, idx) => idx !== i))}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground/50 hover:text-destructive transition-colors" title="Remove">
                            <X size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Chapter — prominent */}
                <div className="flex gap-2 mb-12">
                  <button onClick={() => setChapterSequence(prev => [...prev, {
                    id: `ch-${Date.now()}`,
                    title: `Chapter ${prev.length + 1}`,
                    description: "New chapter",
                    topics: [],
                    includeImages: true,
                    pageCount: 8,
                  }])}
                    className="flex-1 p-4 rounded-xl border-2 border-dashed border-foreground/[0.1] hover:border-accent/30 hover:bg-accent/[0.02] text-sm font-semibold text-muted-foreground hover:text-accent transition-all flex items-center justify-center gap-2 group">
                    <Plus size={18} className="group-hover:scale-110 transition-transform" />
                    Add New Chapter
                  </button>
                  <button onClick={async () => {
                    const lastChapter = chapterSequence[chapterSequence.length - 1];
                    const newId = `ch-${Date.now()}`;
                    setChapterSequence(prev => [...prev, { id: newId, title: "Generating...", description: "AI is writing this chapter...", topics: [], includeImages: true, pageCount: 8 }]);
                    try {
                      const resp = await supabase.functions.invoke("generate-ebook", {
                        body: {
                          action: "generate-outline",
                          prompt: `Given the book titled "${bookData.selectedTitle}" with existing chapters: ${chapterSequence.map((c, i) => `${i+1}. ${c.title}`).join(", ")}. Generate ONE additional chapter that logically follows and complements the existing content.`,
                          model: bookData.model || "auto",
                          tone: bookData.tone || "professional",
                          language: bookData.language || "en",
                          chapters: 1,
                          wordsPerChapter: bookData.wordsPerChapter || 2000,
                        },
                      });
                      const result = resp.data?.result;
                      if (result?.chapters?.[0]) {
                        const ch = result.chapters[0];
                        setChapterSequence(prev => prev.map(c => c.id === newId ? { ...c, title: ch.title || "New Chapter", description: ch.description || "", topics: ch.topics || [], pageCount: ch.pageCount || 8 } : c));
                      } else {
                        setChapterSequence(prev => prev.map(c => c.id === newId ? { ...c, title: `Chapter ${chapterSequence.length + 1}`, description: "AI-suggested chapter" } : c));
                      }
                    } catch {
                      setChapterSequence(prev => prev.map(c => c.id === newId ? { ...c, title: `Chapter ${chapterSequence.length + 1}`, description: "New chapter" } : c));
                    }
                  }}
                    className="px-4 py-4 rounded-xl border-2 border-dashed border-foreground/[0.1] hover:border-amber-400/40 hover:bg-amber-50/30 text-sm font-semibold text-muted-foreground hover:text-amber-600 transition-all flex items-center gap-2 group">
                    <Sparkles size={16} className="group-hover:scale-110 transition-transform text-amber-500" />
                    AI Chapter
                  </button>
                </div>

                {/* Chapter Settings */}
                <div className="p-5 rounded-xl border border-foreground/[0.08] bg-foreground/[0.01] mb-10 space-y-6">
                  <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                    <Sparkles size={14} className="text-accent" />Chapter Settings
                  </h4>

                  {/* Generate Chapter As */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Generate Chapter As</span>
                      <Tooltip><TooltipTrigger><span className="w-4 h-4 rounded-full bg-foreground/[0.06] flex items-center justify-center text-[9px] text-muted-foreground">?</span></TooltipTrigger>
                      <TooltipContent className="max-w-[240px] text-xs">Choose what type of content each chapter includes</TooltipContent></Tooltip>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {CHAPTER_CONTENT_TYPES.map(ct => {
                        const isActive = bookData.chapterContentType === ct.id;
                        return (
                          <button key={ct.id} onClick={() => {
                            setBookData(prev => ({ ...prev, chapterContentType: ct.id, includeImages: ct.id !== "text-only" }));
                            if (ct.id === "text-only") setChapterSequence(prev => prev.map(ch => ({ ...ch, includeImages: false })));
                            else setChapterSequence(prev => prev.map(ch => ({ ...ch, includeImages: true })));
                          }}
                            className={`flex flex-col items-center p-5 rounded-xl border-2 transition-all ${
                              isActive ? "border-accent bg-accent/[0.04] shadow-sm" : "border-foreground/[0.08] hover:border-foreground/[0.15]"
                            }`}>
                            <ct.icon className={`w-6 h-6 mb-2.5 ${isActive ? "text-accent" : "text-muted-foreground"}`} />
                            <span className={`text-sm font-semibold mb-1 ${isActive ? "text-foreground" : "text-foreground/80"}`}>{ct.label}</span>
                            <span className="text-[10px] text-muted-foreground text-center">{ct.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Words Per Chapter */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Words Per Chapter</span>
                      <Tooltip><TooltipTrigger><span className="w-4 h-4 rounded-full bg-foreground/[0.06] flex items-center justify-center text-[9px] text-muted-foreground">?</span></TooltipTrigger>
                      <TooltipContent className="max-w-[240px] text-xs">Target word count for each chapter. You can also enter a custom number.</TooltipContent></Tooltip>
                    </div>
                    <div className="flex gap-2 mb-2">
                      {WORDS_PRESETS.map(wp => (
                        <button key={wp.value} onClick={() => { setBookData(prev => ({ ...prev, wordsPerChapter: wp.value })); setCustomWordsInput(""); }}
                          className={`flex-1 py-3 rounded-xl border-2 text-center transition-all ${
                            bookData.wordsPerChapter === wp.value && !customWordsInput
                              ? "border-accent bg-accent/[0.04]"
                              : "border-foreground/[0.08] hover:border-foreground/[0.15]"
                          }`}>
                          <span className={`block text-sm font-bold ${bookData.wordsPerChapter === wp.value && !customWordsInput ? "text-accent" : "text-foreground"}`}>{wp.label}</span>
                          <span className="block text-[10px] text-muted-foreground mt-0.5">{wp.sub}</span>
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="Custom (e.g. 1800)"
                        value={customWordsInput}
                        onChange={e => {
                          setCustomWordsInput(e.target.value);
                          const v = parseInt(e.target.value);
                          if (v && v >= 100 && v <= 20000) setBookData(prev => ({ ...prev, wordsPerChapter: v }));
                        }}
                        className="flex-1 px-3 py-2.5 rounded-lg border border-foreground/[0.1] bg-background text-sm outline-none focus:border-accent/40 placeholder:text-muted-foreground/40"
                        min={100} max={20000}
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">words/chapter</span>
                    </div>
                  </div>

                  {/* Include AI-Generated Images — Switch-style */}
                  <div className="flex items-center justify-between p-4 rounded-xl border border-foreground/[0.08] bg-foreground/[0.01]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                        <Image className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Include AI-Generated Images</p>
                        <p className="text-xs text-muted-foreground">Generate relevant images for each chapter</p>
                      </div>
                    </div>
                    <button onClick={() => {
                      const newVal = !bookData.includeImages;
                      setBookData(prev => ({ ...prev, includeImages: newVal, chapterContentType: newVal ? "text-images" : "text-only" }));
                      setChapterSequence(prev => prev.map(ch => ({ ...ch, includeImages: newVal })));
                    }}
                      className={`relative w-12 h-7 rounded-full transition-colors ${bookData.includeImages ? "bg-emerald-500" : "bg-foreground/[0.15]"}`}>
                      <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${bookData.includeImages ? "translate-x-5" : "translate-x-0.5"}`} />
                    </button>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-6 border-t border-foreground/[0.06]">
                  <button onClick={() => setGenerateStep("titles")}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors">
                    <ArrowLeft size={16} />Back
                  </button>
                  <div className="flex items-center gap-3">
                    <button onClick={() => { handleGenerate(); }}
                    disabled={isGenerating}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-foreground/[0.1] text-sm font-medium hover:bg-foreground/[0.04] transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                    {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    {isGenerating ? "Regenerating..." : "Regenerate"}
                    </button>
                    <div className="flex flex-col items-center gap-1">
                      <button onClick={handleGenerateBook} disabled={!bookData.selectedTitle}
                        className="flex items-center gap-2 px-8 py-3 rounded-xl bg-accent text-white text-sm font-bold hover:bg-accent/90 transition-all disabled:opacity-50 shadow-lg shadow-accent/20 hover:shadow-accent/30">
                        <Zap size={16} />Generate eBook<ArrowRight size={16} />
                      </button>
                      <span className="text-[10px] text-muted-foreground/60">Generate Your Full Book In Minutes</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* === DESIGN TAB === */}
        {activeTab === "design" && (
          <div className="relative flex-1 min-h-0">
            <div className="flex h-full">
              {/* LEFT: Design Sidebar (hidden in grid view) */}
              {!isGridView && !isLeftPanelCollapsed && !showBookSettingsDialog && (
              <EbookDesignSidebar
                bookTitle={bookData.selectedTitle}
                chapters={sidebarChapters}
                selectedChapterId={selectedSidebarChapterId}
                onChapterSelect={(id) => setSelectedPageId(id)}
                onChapterAdd={handleSidebarChapterAdd}
                onChapterTitleEdit={handleSidebarChapterTitleEdit}
                onChapterDelete={handleSidebarChapterDelete}
                onChapterReorder={handleSidebarChapterReorder}
                onSectionChange={handleSidebarSectionChange}
                onAIClick={() => setSidebarMode('ai')}
                sidebarMode={sidebarMode}
                onSidebarModeChange={setSidebarMode}
                selectedPageTitle={ebookPages.find(p => p.id === selectedPageId)?.title}
                pageCount={ebookPages.length}
                pageIndex={ebookPages.findIndex(p => p.id === selectedPageId)}
                pageNumberMap={pageNumberMap}
                onOpenImageSection={() => { setSidebarOpenSection('image'); setTimeout(() => setSidebarOpenSection(null), 100); }}
                openSection={sidebarOpenSection as any}
                onAddElement={(type, data) => canvasRef.current?.addElement(type, data)}
                onReplaceImage={isReplacingImage ? (src) => canvasRef.current?.replaceImage(src) : null}
                currentPageElements={selectedPageId ? (savedPageElements[selectedPageId] ?? []) : []}
                onSelectElement={(id) => canvasRef.current?.selectElement(id)}
                onEditElement={(id) => canvasRef.current?.editElement(id)}
                onReplaceElementImage={(id) => canvasRef.current?.triggerReplaceImage(id)}
                pages={ebookPages as any}
                onApplyTemplate={async (templateId) => {
                  try {
                    const { getTemplate } = await import("@/lib/ebookTemplates");
                    const template = getTemplate(templateId);
                    if (!template) { toast({ title: "Template not found", variant: "destructive" }); return; }
                    const newElements: Record<string, any[]> = {};
                    ebookPages.forEach(page => {
                      const freshElements = template.buildPage(page as any, ebookPages as any, bookData.selectedTitle, bookDescription);
                      // Preserve existing text content (body, title) from old elements
                      const oldElements = savedPageElements[page.id] || [];
                      if (oldElements.length > 0) {
                        // Map old content by element role (body, title, etc.)
                        const oldBody = oldElements.find((e: any) => e.id === 'body-text' || e.id?.includes('-body') || (e.id === 'body' && e.type === 'text'));
                        const oldTitle = oldElements.find((e: any) => (e.id === 'page-title' || e.id?.includes('-title')) && e.type === 'text');
                        freshElements.forEach((el: any) => {
                          if ((el.id === 'body' || el.id === 'body-text' || el.id?.includes('-body')) && el.type === 'text' && !el.content && oldBody?.content) {
                            el.content = oldBody.content;
                          }
                          if ((el.id === 'title' || el.id?.includes('-title') || el.id === 'page-title') && el.type === 'text' && oldTitle?.content && page.type === 'chapter-page') {
                            el.content = oldTitle.content;
                          }
                        });
                      }
                      newElements[page.id] = freshElements;
                    });
                    setSavedPageElements(newElements);
                    try { localStorage.setItem(STORAGE_KEY_ELEMENTS, JSON.stringify(newElements)); } catch {}
                    const name = templateId.charAt(0).toUpperCase() + templateId.slice(1);
                    toast({ title: `✦ ${name} template applied to all ${ebookPages.length} pages` });
                  } catch (e) {
                    console.error("Template apply error:", e);
                    toast({ title: "Failed to apply template", variant: "destructive" });
                  }
                }}
                onTranslate={async (scope, language) => {
                  // Check for locked pages when applying to entire book
                  if (scope === 'book') {
                    const hasLocked = showLockedPagesWarning(
                      'Translate Entire Book',
                      () => {
                        sonnerToast.success('All pages unlocked. Please run the translation again.');
                      },
                      () => {
                        sonnerToast.info('Locked pages were skipped during translation.');
                      },
                    );
                    if (hasLocked) return;
                  }
                  // Check if current page is locked for page-level scope
                  if (scope === 'page' || scope === 'selected') {
                    const currentPage = ebookPages.find(p => p.id === selectedPageId);
                    if (currentPage?.locked) {
                      sonnerToast.error('This page is locked. Unlock it to make changes.');
                      return;
                    }
                  }
                  const textScope = scope === 'selected' ? 'page' : scope;
                  const elements = canvasRef.current?.getTextElements(textScope)?.filter(el => {
                    const page = ebookPages.find(p => p.id === el.pageId);
                    return !page?.locked;
                  });
                  if (!elements || elements.length === 0) {
                    toast({ title: 'No text elements found', variant: 'destructive' });
                    return;
                  }

                  // Detect language mode
                  if (language === '__detect__') {
                    toast({ title: 'Detecting current language...' });
                    try {
                      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-text-edit`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
                        body: JSON.stringify({
                          action: 'custom',
                          texts: [elements[0].content],
                          customInstruction: 'Detect the language of this text. Return ONLY a JSON array with one string: the language name in English (e.g. ["English"]). No explanations.',
                        }),
                      });
                      const result = await response.json();
                      if (result.result) {
                        try {
                          const detected = JSON.parse(result.result);
                          toast({ title: `Detected language: ${Array.isArray(detected) ? detected[0] : detected}` });
                        } catch { toast({ title: `Detected: ${result.result}` }); }
                      } else {
                        toast({ title: result.error || 'Detection failed', variant: 'destructive' });
                      }
                    } catch { toast({ title: 'Detection request failed', variant: 'destructive' }); }
                    return;
                  }

                  toast({ title: `Translating ${elements.length} text element${elements.length > 1 ? 's' : ''} to ${language}...` });
                  try {
                    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-text-edit`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
                      body: JSON.stringify({
                        action: 'custom',
                        texts: elements.map(e => e.content),
                        customInstruction: `Translate each text to ${language}. Return ONLY the translated texts as a JSON array of strings, in the same order. Keep formatting, line breaks, and special characters. Do not add explanations.`,
                      }),
                    });
                    const result = await response.json();
                    if (result.result) {
                      try {
                        const translated: string[] = JSON.parse(result.result);
                        if (Array.isArray(translated) && translated.length === elements.length) {
                          const updates = elements.map((el, i) => ({ ...el, content: translated[i] }));
                          canvasRef.current?.updateTextContent(updates);
                          toast({ title: `Translated ${elements.length} element${elements.length > 1 ? 's' : ''} to ${language}` });
                        } else {
                          toast({ title: 'Translation returned unexpected format', variant: 'destructive' });
                        }
                      } catch { toast({ title: 'Failed to parse translation result', variant: 'destructive' }); }
                    } else {
                      toast({ title: result.error || 'Translation failed', variant: 'destructive' });
                    }
                  } catch {
                    toast({ title: 'Translation request failed', variant: 'destructive' });
                  }
                }}
              />
              )}

              {/* Left panel collapse toggle */}
              {!isGridView && !showBookSettingsDialog && (
                <button onClick={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
                  className="absolute top-1/2 -translate-y-1/2 z-10 w-5 h-10 bg-accent rounded-r-lg flex items-center justify-center hover:bg-accent/90 transition-colors"
                  style={{ left: isLeftPanelCollapsed ? 0 : 320 }}>
                  <ChevronLeft className={`w-3 h-3 text-white transition-transform ${isLeftPanelCollapsed ? "rotate-180" : ""}`} />
                </button>
              )}

              {/* CENTER: Book Settings Page OR Canvas Editor */}
              {showBookSettingsDialog ? (
                <BookSettingsPanel
                  bookData={bookData}
                  onBookDataChange={(updater) => setBookData(updater as any)}
                  chapterCount={chapterSequence.length || bookData.chapters}
                  pageCount={ebookPages.length}
                  onApply={async () => {
                    setIsApplyingSettings(true);
                    try {
                      const { data, error } = await supabase.functions.invoke('generate-ebook', {
                        body: {
                          action: 'generate-outline',
                          prompt: bookData.prompt || bookData.selectedTitle,
                          model: bookData.model,
                          language: bookData.language,
                          tone: bookData.tone,
                          chapters: chapterSequence.length || bookData.chapters,
                          wordsPerChapter: bookData.wordsPerChapter,
                        },
                      });
                      if (error) throw new Error(error.message);
                      if (data?.error) throw new Error(data.error);
                      const result = data.result;
                      if (result?.chapters) {
                        setChapterSequence(result.chapters.map((ch: any, i: number) => ({
                          id: `ch-${i + 1}`,
                          title: ch.title,
                          description: ch.description,
                          topics: ch.topics || [],
                          includeImages: bookData.chapterContentType !== "text-only",
                          pageCount: ch.pageCount || 8,
                        })));
                      }
                      toast({ title: "Settings applied! Outline regenerated with new parameters." });
                      setShowBookSettingsDialog(false);
                    } catch (e: any) {
                      toast({ title: e.message || "Failed to apply settings", variant: "destructive" });
                    } finally {
                      setIsApplyingSettings(false);
                    }
                  }}
                  isApplying={isApplyingSettings}
                  onClose={() => setShowBookSettingsDialog(false)}
                  storageKeyPages={STORAGE_KEY_PAGES}
                  storageKeyElements={STORAGE_KEY_ELEMENTS}
                />
              ) : (
              <EbookCanvasEditor
                ref={canvasRef}
                pages={ebookPages}
                selectedPageId={selectedPageId}
                onPageSelect={setSelectedPageId}
                onPagesChange={setEbookPages}
                bookTitle={bookData.selectedTitle}
                showPagesPanel={false}
                zoom={zoom}
                onZoomChange={setZoom}
                isGridView={isGridView}
                onGridViewToggle={() => setIsGridView(false)}
                findReplaceMode={findReplaceMode}
                onFindReplaceModeChange={setFindReplaceMode}
                onPageSettingsToggle={() => { setManualPageSettings(true); setShowPageSettings(prev => !prev); setRightPanelMode('settings'); }}
                onOpenImageSection={() => { setSidebarOpenSection('image'); setTimeout(() => setSidebarOpenSection(null), 100); }}
                onReplaceStateChange={setIsReplacingImage}
                pageWidth={pageWidth}
                pageHeight={pageHeight}
                accessMode={accessMode}
                initialPageElements={savedPageElements}
                onPageElementsChange={handlePageElementsChange}
                onAiPanelToggle={(isOpen) => {
                  if (isOpen) {
                    setSidebarMode('ai');
                    setIsLeftPanelCollapsed(false);
                  } else {
                    setSidebarMode('design');
                  }
                }}
                panelOffset={(() => {
                  const leftW = (!isGridView && !isLeftPanelCollapsed && !showBookSettingsDialog) ? 320 : 0;
                  const rightW = (!isGridView && showPageSettings && !isRightPanelCollapsed && !showBookSettingsDialog) ? 320 : 0;
                  return (rightW - leftW) / 2;
                })()}
              />
              )}

              {/* Right panel collapse toggle */}
              {!isGridView && showPageSettings && !showBookSettingsDialog && (
                <button onClick={() => setIsRightPanelCollapsed(!isRightPanelCollapsed)}
                  className="absolute top-1/2 -translate-y-1/2 z-10 w-5 h-10 bg-accent rounded-l-lg flex items-center justify-center hover:bg-accent/90 transition-colors"
                  style={{ right: isRightPanelCollapsed ? 0 : 320 }}>
                  <ChevronRight className={`w-3 h-3 text-white transition-transform ${isRightPanelCollapsed ? "rotate-180" : ""}`} />
                </button>
              )}

              {/* RIGHT: Page Settings Panel */}
              {!isGridView && showPageSettings && !isRightPanelCollapsed && !showBookSettingsDialog && (
              <PageSettingsPanel
                pages={ebookPages}
                selectedPageId={selectedPageId}
                onPageSelect={setSelectedPageId}
                onPagesChange={setEbookPages}
                onGridViewToggle={() => setIsGridView(true)}
                bookTitle={bookData.selectedTitle}
                pageWidth={pageWidth}
                pageHeight={pageHeight}
                onDimensionsChange={(w, h) => { setPageWidth(w); setPageHeight(h); }}
                onOpenImageSection={() => { setSidebarOpenSection('image'); setTimeout(() => setSidebarOpenSection(null), 100); }}
                showLockedPagesWarning={showLockedPagesWarning}
                sidebarMode={sidebarMode}
                forceTab={sidebarMode === 'ai' ? 'director' : null}
                selectedPageTitle={ebookPages.find(p => p.id === selectedPageId)?.title}
                pageIndex={ebookPages.findIndex(p => p.id === selectedPageId)}
                pageElements={savedPageElements}
                onSendToChat={(prompt) => {
                  setSidebarMode('ai');
                  setIsLeftPanelCollapsed(false);
                }}
              />
              )}
            </div>
            <EbookGenerationOverlay isGenerating={isGeneratingBook} bookTitle={bookData.selectedTitle} liveState={liveGenerationState} />
          </div>
        )}
      </div>
      <EbookShareModal open={showShareModal} onOpenChange={setShowShareModal} projectName={bookData.selectedTitle || "Untitled Book"} />
      <EbookInviteModal open={showInviteModal} onOpenChange={setShowInviteModal} />
      <Dialog open={showBrandDialog} onOpenChange={setShowBrandDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-accent" />
              Set Up Your Brand Profile
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              You don't have a brand profile yet. A brand profile lets the AI write your eBook in your unique voice, tone, and style — using your colors, fonts, and audience details.
            </p>
            <p className="text-xs text-muted-foreground">
              You can still create eBooks without one — but setting it up makes every book feel unmistakably yours.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowBrandDialog(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-foreground/[0.05] transition-colors"
              >
                Maybe Later
              </button>
              <button
                onClick={() => { setShowBrandDialog(false); navigate("/brand"); }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent/90 transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Brand Profile
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <LockedPagesModal
        open={lockedPagesModal.open}
        onOpenChange={(open) => setLockedPagesModal(prev => ({ ...prev, open }))}
        lockedPages={ebookPages.filter(p => p.locked).map(p => ({ page: p, index: ebookPages.indexOf(p) }))}
        actionLabel={lockedPagesModal.actionLabel}
        onUnlockAll={lockedPagesModal.onUnlockAllAndApply}
        onUnlockPage={(pageId) => setEbookPages(prev => prev.map(p => p.id === pageId ? { ...p, locked: false } : p))}
        onProceedSkipping={lockedPagesModal.onProceedSkipping}
      />
    </PageShell>
  );
};

export default NewEbookPage;