import { test, expect } from "@playwright/test";

/**
 * Second critical-path test: a provider can decline a pending request, and the
 * requester's slot becomes bookable again (since a declined booking no longer blocks it).
 */
test("provider declines a booking and the slot opens back up", async ({ page }) => {
  await page.goto("/book/test-provider");

  const firstSlot = page.getByRole("button", { name: /\d{1,2}:\d{2}/ }).first();
  await expect(firstSlot).toBeVisible({ timeout: 15_000 });
  const slotLabel = await firstSlot.textContent();
  await firstSlot.click();

  await page.getByPlaceholder("Your name").fill("Alex Decline");
  await page.getByPlaceholder("Your email").fill("alex@example.com");
  await page.getByPlaceholder("Your phone number").fill("+1-555-0199");
  await page.getByRole("button", { name: "Request this slot" }).click();
  await expect(page.getByText(/Request sent/i)).toBeVisible();

  await page.goto("/login");
  await page.getByPlaceholder("Email").fill("provider@test.local");
  await page.getByPlaceholder("Password").fill("test-password-123");
  await page.getByRole("button", { name: "Sign in with email" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await expect(page.getByText("Alex Decline")).toBeVisible();
  await page.getByRole("button", { name: "Decline" }).first().click();
  await expect(page.getByText("No pending requests.")).toBeVisible();

  // The same slot should be offerable again now that the request was declined.
  await page.goto("/book/test-provider");
  await expect(page.getByRole("button", { name: slotLabel ?? "" })).toBeVisible({ timeout: 15_000 });
});
