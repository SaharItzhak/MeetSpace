import { test, expect } from "@playwright/test";

/**
 * Critical path: provider's pre-seeded availability -> requester books an open slot ->
 * provider approves it from the dashboard -> the booking shows up as approved with the
 * requester's details. Calendar + email are mocked (MOCK_CALENDAR=1 / MOCK_EMAIL=1) so
 * this never talks to real Google/Resend APIs.
 */
test("provider approves a requester's booking", async ({ page }) => {
  await page.goto("/book/test-provider");

  await expect(page.getByRole("heading", { name: "Test Provider" })).toBeVisible();
  const firstSlot = page.getByRole("button", { name: /\d{1,2}:\d{2}/ }).first();
  await expect(firstSlot).toBeVisible({ timeout: 15_000 });
  await firstSlot.click();

  await page.getByPlaceholder("Your name").fill("Jamie Requester");
  await page.getByPlaceholder("Your email").fill("jamie@example.com");
  await page.getByPlaceholder("Your phone number").fill("+1-555-0100");
  await page.getByRole("button", { name: "Request this slot" }).click();

  await expect(page.getByText(/Request sent/i)).toBeVisible();

  // Sign in as the provider and approve the new pending request.
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill("provider@test.local");
  await page.getByPlaceholder("Password").fill("test-password-123");
  await page.getByRole("button", { name: "Sign in with email" }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText("Jamie Requester")).toBeVisible();
  await page.getByRole("button", { name: "Approve" }).first().click();

  await expect(page.getByText("Upcoming approved calls")).toBeVisible();
  await expect(page.getByText(/Jamie Requester/)).toBeVisible();
  await expect(page.getByText("+1-555-0100")).toBeVisible();
});
