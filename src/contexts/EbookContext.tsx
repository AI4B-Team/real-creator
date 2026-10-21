import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { readLocalEbooks, saveLocalEbook, removeLocalEbook } from "@/lib/ebookLocalPersistence";
import { toast } from "sonner";

export interface Ebook {
  id: string;
  title: string;
  description: string;
  chapters: number;
  words: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  coverColor: string;
  coverImage?: string;
  tags: string[];
  progress: number;
  prompt?: string;
  tone?: string;
  language?: string;
  model?: string;
  outline?: any;
  userId?: string;
}

interface EbookContextType {
  ebooks: Ebook[];
  loading: boolean;
  setEbooks: React.Dispatch<React.SetStateAction<Ebook[]>>;
  updateEbook: (id: string, updates: Partial<Ebook>) => Promise<boolean>;
  addEbook: (ebook: Omit<Ebook, "id">) => Promise<Ebook | null>;
  deleteEbook: (id: string) => void;
  getEbook: (id: string) => Ebook | undefined;
  refreshEbooks: () => Promise<void>;
}

const EbookContext = createContext<EbookContextType | undefined>(undefined);

const DEMO_EBOOKS: Ebook[] = [
  { id: "demo-tutorial", title: "How to Use the eBook Creator", description: "A hands-on tutorial guide covering every feature of the eBook Creator — from generating your first book with AI to customizing templates, editing on the canvas, and publishing.", chapters: 5, words: 8500, status: "published", createdAt: "2026-04-12", updatedAt: "2026-04-12", coverColor: "#0891b2", coverImage: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200&h=300&fit=crop", tags: ["Tutorial", "Guide", "Getting Started"], progress: 100 },
];

function mapRow(row: any): Ebook {
  return {
    id: row.id,
    title: row.title,
    description: row.description || "",
    chapters: row.chapters || 0,
    words: row.words || 0,
    status: row.status || "draft",
    createdAt: row.created_at?.split("T")[0] || "",
    updatedAt: row.updated_at?.split("T")[0] || "",
    coverColor: row.cover_color || "#6366F1",
    coverImage: row.cover_image,
    tags: row.tags || [],
    progress: row.progress || 0,
    prompt: row.prompt,
    tone: row.tone,
    language: row.language,
    model: row.model,
    outline: row.outline,
    userId: row.user_id,
  };
}

export const EbookProvider = ({ children }: { children: ReactNode }) => {
  const [ebooks, setEbooks] = useState<Ebook[]>(DEMO_EBOOKS);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const booksRef = useRef(ebooks);
  booksRef.current = ebooks;

  // Listen for auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const refreshEbooks = useCallback(async () => {
    if (!userId) {
      const storedBooks = await readLocalEbooks<Ebook>().catch(() => []);
      setEbooks(prev => {
        const localBooks = [...new Map([...storedBooks.filter(b => !b.userId), ...prev.filter(b => b.id.startsWith("local-"))].map(b => [b.id, b])).values()];
        return localBooks.length > 0 ? [...localBooks, ...DEMO_EBOOKS] : DEMO_EBOOKS;
      });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.from("ebooks").select("*").eq("user_id", userId).order("updated_at", { ascending: false });
      if (error) throw error;
      const dbEbooks = (data || []).map(mapRow);
      const storedBooks = await readLocalEbooks<Ebook>().catch(() => []);
      setEbooks(prev => {
        const localBooks = [...new Map([...storedBooks, ...prev].filter(b => b.id.startsWith("local-") && (!b.userId || b.userId === userId)).map(b => [b.id, b])).values()];
        if (dbEbooks.length > 0 || localBooks.length > 0) {
          return [...localBooks, ...dbEbooks];
        }
        return DEMO_EBOOKS;
      });
    } catch (e) {
      console.error("Failed to load ebooks:", e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refreshEbooks();
  }, [refreshEbooks]);

  const updateEbook = useCallback(async (id: string, updates: Partial<Ebook>): Promise<boolean> => {
    const existing = booksRef.current.find(book => book.id === id);
    if (!existing) return false;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString().split("T")[0] };
    booksRef.current = booksRef.current.map(book => book.id === id ? updated : book);
    setEbooks(prev => prev.map(book =>
      book.id === id ? updated : book
    ));
    try {
      await saveLocalEbook(updated);
    } catch (error) {
      console.error("Failed to save local ebook:", error);
      toast.error("Could not save a copy on this device. Keep this page open and free up storage.");
      if (id.startsWith("local-") || id.startsWith("demo-") || !userId) return false;
    }
    // If it's a real UUID (not demo), persist to DB
    if (!id.startsWith("demo-") && !id.startsWith("local-") && userId) {
      const dbUpdates: {
        title?: string; description?: string; status?: string; progress?: number;
        chapters?: number; words?: number; cover_color?: string; cover_image?: string;
        tags?: string[]; outline?: any;
      } = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.progress !== undefined) dbUpdates.progress = updates.progress;
      if (updates.chapters !== undefined) dbUpdates.chapters = updates.chapters;
      if (updates.words !== undefined) dbUpdates.words = updates.words;
      if (updates.coverColor !== undefined) dbUpdates.cover_color = updates.coverColor;
      if (updates.coverImage !== undefined) dbUpdates.cover_image = updates.coverImage;
      if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
      if (updates.outline !== undefined) dbUpdates.outline = updates.outline;
      if (Object.keys(dbUpdates).length > 0) {
        const { error } = await supabase.from("ebooks").update(dbUpdates).eq("id", id).eq("user_id", userId);
        if (error) {
          console.error("Failed to update ebook:", error);
          toast.error("Cloud saving failed. A copy is saved on this device; please try saving again.");
          return false;
        }
      }
    }
    return true;
  }, [userId]);

  const addEbook = useCallback(async (ebook: Omit<Ebook, "id">): Promise<Ebook | null> => {
    if (!userId) {
      const newEbook: Ebook = { ...ebook, id: `local-${crypto.randomUUID()}` };
      try {
        await saveLocalEbook(newEbook);
      } catch (error) {
        console.error("Failed to save local ebook:", error);
        toast.error("Could not save your book on this device. Free up storage and try again.");
        return null;
      }
      booksRef.current = [newEbook, ...booksRef.current];
      setEbooks(prev => [newEbook, ...prev]);
      toast.info("Book saved on this device only. There is no active cloud sign-in.");
      return newEbook;
    }
    try {
      const { data, error } = await supabase.from("ebooks").insert({
        user_id: userId,
        title: ebook.title,
        description: ebook.description,
        status: ebook.status || "draft",
        cover_color: ebook.coverColor || "#6366F1",
        cover_image: ebook.coverImage,
        tags: ebook.tags || [],
        progress: ebook.progress || 0,
        chapters: ebook.chapters || 0,
        words: ebook.words || 0,
        prompt: ebook.prompt || "",
        tone: ebook.tone || "professional",
        language: ebook.language || "en",
        model: ebook.model || "auto",
        outline: ebook.outline,
      }).select().single();
      if (error) throw error;
      const newEbook = mapRow(data);
      booksRef.current = [newEbook, ...booksRef.current];
      setEbooks(prev => [newEbook, ...prev]);
      return newEbook;
    } catch (e) {
      console.error("Failed to add ebook:", e);
      const newEbook: Ebook = { ...ebook, id: `local-${crypto.randomUUID()}`, userId };
      try { await saveLocalEbook(newEbook); } catch {
        toast.error("Your book could not be saved. Please try again before closing this page.");
        return null;
      }
      booksRef.current = [newEbook, ...booksRef.current];
      setEbooks(prev => [newEbook, ...prev]);
      toast.error("Cloud saving failed. Your book is saved on this device only.");
      return newEbook;
    }
  }, [userId]);

  const deleteEbook = useCallback((id: string) => {
    setEbooks(prev => prev.filter(book => book.id !== id));
    void removeLocalEbook(id).catch(error => console.error("Failed to remove local ebook:", error));
    if (!id.startsWith("demo-") && !id.startsWith("local-") && userId) {
      supabase.from("ebooks").delete().eq("id", id).then(({ error }) => {
        if (error) console.error("Failed to delete ebook:", error);
      });
    }
  }, [userId]);

  const getEbook = useCallback((id: string) => {
    return ebooks.find(book => book.id === id);
  }, [ebooks]);

  return (
    <EbookContext.Provider value={{ ebooks, loading, setEbooks, updateEbook, addEbook, deleteEbook, getEbook, refreshEbooks }}>
      {children}
    </EbookContext.Provider>
  );
};

export const useEbooks = () => {
  const context = useContext(EbookContext);
  if (context === undefined) {
    throw new Error("useEbooks must be used within an EbookProvider");
  }
  return context;
};
