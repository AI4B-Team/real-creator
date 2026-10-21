# Project Rules

- The ebook dashboard's `source=url` entry must open the new-book link dialog and select the link source; preserve this route contract so source cards do not silently fall back to the AI entry screen.
- Complete local ebook snapshots use IndexedDB and are restored through EbookProvider; generated images exceed localStorage quotas.
- Ebook save operations return an acknowledged result, and generation checkpoints each chapter; UI-only login flags must never be treated as cloud authentication.