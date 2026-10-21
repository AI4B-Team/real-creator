import { test, expect } from "../playwright-fixture";

test("dashboard Insert Link opens the dialog and attaches a URL", async ({ page }) => {
  await page.goto("/ebook-creator");
  await page.getByRole("button", { name: "Insert Link" }).click();
  const dialog = page.getByRole("dialog", { name: "Insert Link" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("textbox", { name: "Website Link" }).fill("https://example.com/article");
  await dialog.getByRole("button", { name: "Add", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator("span").filter({ hasText: /^https:\/\/example\.com\/article$/ })).toBeVisible();
});

test("direct link entry supports Enter and reopening from Source", async ({ page }) => {
  await page.goto("/ebook-creator/new?source=url");
  const dialog = page.getByRole("dialog", { name: "Insert Link" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("textbox", { name: "Website Link" }).fill("https://example.com/reference");
  await dialog.getByRole("textbox", { name: "Website Link" }).press("Enter");
  await expect(dialog).toBeHidden();
  await expect(page.locator("span").filter({ hasText: /^https:\/\/example\.com\/reference$/ })).toBeVisible();
  await page.getByRole("button", { name: "Source: Link" }).click();
  await page.getByRole("button", { name: "Insert Link" }).click();
  await expect(dialog).toBeVisible();
});