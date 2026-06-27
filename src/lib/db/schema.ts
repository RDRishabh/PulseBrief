import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  integer,
  jsonb,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const userStatusEnum = pgEnum("user_status", ["active", "inactive"]);
export const quoteCategoryEnum = pgEnum("quote_category", [
  "motivation",
  "wisdom",
  "success",
  "life",
  "business",
]);
export const deliveryStatusEnum = pgEnum("delivery_status", [
  "pending",
  "sent",
  "delivered",
  "read",
  "failed",
]);
export const zodiacSignEnum = pgEnum("zodiac_sign", [
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
]);

export const admins = pgTable("admins", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  email: text("email"),
  city: text("city").default("Mumbai").notNull(),
  zodiacSign: zodiacSignEnum("zodiac_sign").default("aries").notNull(),
  status: userStatusEnum("status").default("active").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const quotes = pgTable("quotes", {
  id: uuid("id").defaultRandom().primaryKey(),
  text: text("text").notNull(),
  author: text("author").notNull(),
  category: quoteCategoryEnum("category").default("motivation").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const userQuoteHistory = pgTable(
  "user_quote_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    quoteId: uuid("quote_id")
      .notNull()
      .references(() => quotes.id, { onDelete: "cascade" }),
    cycleNumber: integer("cycle_number").default(1).notNull(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("user_quote_cycle_idx").on(
      table.userId,
      table.quoteId,
      table.cycleNumber
    ),
  ]
);

export const deliveryLogs = pgTable("delivery_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  quoteId: uuid("quote_id").references(() => quotes.id, {
    onDelete: "set null",
  }),
  status: deliveryStatusEnum("status").default("pending").notNull(),
  messageContent: text("message_content"),
  weatherData: jsonb("weather_data"),
  goldData: jsonb("gold_data"),
  sensexData: jsonb("sensex_data"),
  horoscopeData: jsonb("horoscope_data"),
  errorMessage: text("error_message"),
  whatsappMessageId: text("whatsapp_message_id"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const settings = pgTable("settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const adminsRelations = relations(admins, () => ({}));

export const usersRelations = relations(users, ({ many }) => ({
  quoteHistory: many(userQuoteHistory),
  deliveryLogs: many(deliveryLogs),
}));

export const quotesRelations = relations(quotes, ({ many }) => ({
  history: many(userQuoteHistory),
  deliveryLogs: many(deliveryLogs),
}));

export const userQuoteHistoryRelations = relations(
  userQuoteHistory,
  ({ one }) => ({
    user: one(users, {
      fields: [userQuoteHistory.userId],
      references: [users.id],
    }),
    quote: one(quotes, {
      fields: [userQuoteHistory.quoteId],
      references: [quotes.id],
    }),
  })
);

export const deliveryLogsRelations = relations(deliveryLogs, ({ one }) => ({
  user: one(users, {
    fields: [deliveryLogs.userId],
    references: [users.id],
  }),
  quote: one(quotes, {
    fields: [deliveryLogs.quoteId],
    references: [quotes.id],
  }),
}));

export type Admin = typeof admins.$inferSelect;
export type NewAdmin = typeof admins.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Quote = typeof quotes.$inferSelect;
export type NewQuote = typeof quotes.$inferInsert;
export type UserQuoteHistory = typeof userQuoteHistory.$inferSelect;
export type DeliveryLog = typeof deliveryLogs.$inferSelect;
export type Setting = typeof settings.$inferSelect;
export type ZodiacSign = (typeof zodiacSignEnum.enumValues)[number];
export type QuoteCategory = (typeof quoteCategoryEnum.enumValues)[number];