import "fake-indexeddb/auto";
import { render, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { EbookProvider, useEbooks } from "./EbookContext";
import { readLocalEbooks, removeLocalEbook } from "@/lib/ebookLocalPersistence";

vi.mock("sonner", () => ({ toast: { info: vi.fn(), error: vi.fn() } }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  auth: {
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    getSession: async () => ({ data: { session: null } }),
  },
  from: vi.fn(() => { throw new Error("Local IDs must not be sent to cloud tables"); }),
} }));

describe("ebook persistence", () => {
  it("restores a newly created book and its complete edited outline after remount", async () => {
    let context: ReturnType<typeof useEbooks> | undefined;
    const Consumer = () => { context = useEbooks(); return null; };
    const first = render(<EbookProvider><Consumer /></EbookProvider>);
    let id = "";
    await act(async () => {
      const created = await context?.addEbook({ title: "Reload regression", description: "", chapters: 1, words: 25, status: "draft", createdAt: "2026-10-21", updatedAt: "2026-10-21", coverColor: "", tags: [], progress: 100 });
      id = created?.id || "";
    });
    expect(id.startsWith("local-")).toBe(true);
    const outline = { pages: [{ id: "page-one", title: "Saved chapter" }], elements: { "page-one": [{ type: "text", content: "Keep this after reload" }, { type: "image", src: "data:image/png;base64," + "a".repeat(6_000_000) }] } };
    await act(async () => { expect(await context?.updateEbook(id, { outline })).toBe(true); });
    first.unmount();
    const second = render(<EbookProvider><Consumer /></EbookProvider>);
    await waitFor(() => expect(context?.getEbook(id)?.outline).toEqual(outline));
    second.unmount();
    await removeLocalEbook(id);
    expect((await readLocalEbooks<{ id: string }>()).some(book => book.id === id)).toBe(false);
  });
});