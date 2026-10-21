"""Run with python3 tests/ebook_insert_link_test.py against the running preview."""
import unittest
from playwright.sync_api import sync_playwright, expect


class EbookInsertLinkTest(unittest.TestCase):
    def setUp(self):
        self.playwright = sync_playwright().start()
        self.browser = self.playwright.chromium.launch(headless=True)
        self.page = self.browser.new_page(viewport={"width": 1280, "height": 1800})

    def tearDown(self):
        self.browser.close()
        self.playwright.stop()

    def attach_link(self, url, enter=False):
        dialog = self.page.get_by_role("dialog", name="Insert Link")
        expect(dialog).to_be_visible()
        field = dialog.get_by_role("textbox", name="Website Link")
        field.fill(url)
        if enter:
            field.press("Enter")
        else:
            dialog.get_by_role("button", name="Add", exact=True).click()
        expect(dialog).to_be_hidden()
        expect(self.page.get_by_text(url, exact=True)).to_be_visible()

    def test_dashboard_link_entry_and_add(self):
        self.page.goto("http://localhost:8080/ebook-creator")
        self.page.get_by_role("button", name="Insert Link").click()
        self.attach_link("https://example.com/article")

    def test_direct_link_entry_enter_and_reopen(self):
        self.page.goto("http://localhost:8080/ebook-creator/new?source=url")
        self.attach_link("https://example.com/reference", enter=True)
        self.page.get_by_role("button", name="Source: Link").click()
        self.page.get_by_role("button", name="Insert Link").click()
        expect(self.page.get_by_role("dialog", name="Insert Link")).to_be_visible()


if __name__ == "__main__":
    unittest.main()
