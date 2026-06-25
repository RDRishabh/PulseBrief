import { z } from "zod";

export const zodiacSigns = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
] as const;

export const quoteCategories = [
  "motivation",
  "wisdom",
  "success",
  "life",
  "business",
] as const;

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const userSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z
    .string()
    .min(10, "Phone must be at least 10 digits")
    .regex(/^\+?[\d\s-]+$/, "Invalid phone number"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  city: z.string().min(2, "City is required"),
  zodiacSign: z.enum(zodiacSigns),
  status: z.enum(["active", "inactive"]),
});

export const quoteSchema = z.object({
  text: z.string().min(10, "Quote must be at least 10 characters"),
  author: z.string().min(2, "Author is required"),
  category: z.enum(quoteCategories),
  isActive: z.boolean(),
});

export const settingsSchema = z.object({
  briefingEnabled: z.boolean(),
  defaultCity: z.string().min(2),
  cronTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM format"),
  whatsappEnabled: z.boolean(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  status: z.enum(["active", "inactive", "all"]).optional(),
  category: z.enum([...quoteCategories, "all"]).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type UserInput = z.infer<typeof userSchema>;
export type QuoteInput = z.infer<typeof quoteSchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;