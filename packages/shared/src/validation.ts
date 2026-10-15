import { z } from "zod";

export const weeklyAvailabilityRuleSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    startMinute: z.number().int().min(0).max(1440),
    endMinute: z.number().int().min(0).max(1440),
  })
  .refine((rule) => rule.endMinute > rule.startMinute, {
    message: "endMinute must be after startMinute",
    path: ["endMinute"],
  });

export const blackoutDateSchema = z
  .object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    reason: z.string().max(200).optional(),
  })
  .refine((range) => range.endDate.getTime() >= range.startDate.getTime(), {
    message: "endDate must not be before startDate",
    path: ["endDate"],
  });

export const createBookingRequestSchema = z.object({
  providerSlug: z.string().min(1),
  slotStart: z.coerce.date(),
  slotEnd: z.coerce.date(),
  requesterName: z.string().min(1).max(120),
  requesterEmail: z.string().email(),
  requesterPhone: z.string().min(5).max(30),
  note: z.string().max(1000).optional(),
});
export type CreateBookingRequestInput = z.infer<typeof createBookingRequestSchema>;

export const providerSettingsSchema = z.object({
  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
  displayName: z.string().min(1).max(120),
  timezone: z.string().min(1),
  slotDurationMinutes: z.number().int().min(5).max(480),
  defaultReminderLeadMinutes: z.number().int().min(0).max(1440),
  bio: z.string().max(2000).optional(),
  requireApproval: z.boolean().default(false),
  welcomeMessage: z.string().max(500).optional(),
  minNoticeMinutes: z.number().int().min(0).max(10080).default(60),
  maxAdvanceDays: z.number().int().min(1).max(180).default(21),
  bufferMinutes: z.number().int().min(0).max(240).default(0),
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color like #4f46e5")
    .default("#4f46e5"),
});
export type ProviderSettingsInput = z.infer<typeof providerSettingsSchema>;

export const requestContactAccessSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
});
export type RequestContactAccessInput = z.infer<typeof requestContactAccessSchema>;

export const updateContactStatusSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "BLOCKED"]),
});
