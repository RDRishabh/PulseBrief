import type { HoroscopeData } from "./types";
import type { ZodiacSign } from "@/lib/db/schema";
import { capitalize } from "@/lib/utils";

const FALLBACK_HOROSCOPES: Record<ZodiacSign, Omit<HoroscopeData, "sign">> = {
  aries: {
    description: "Your energy is high today. Take initiative on pending projects.",
    mood: "Energetic",
    luckyNumber: "7",
    color: "Red",
  },
  taurus: {
    description: "Financial matters look favorable. Stay grounded and patient.",
    mood: "Stable",
    luckyNumber: "4",
    color: "Green",
  },
  gemini: {
    description: "Communication flows easily. Network and share your ideas.",
    mood: "Curious",
    luckyNumber: "5",
    color: "Yellow",
  },
  cancer: {
    description: "Focus on home and family. Emotional clarity brings peace.",
    mood: "Nurturing",
    luckyNumber: "2",
    color: "Silver",
  },
  leo: {
    description: "Leadership opportunities arise. Shine with confidence today.",
    mood: "Bold",
    luckyNumber: "1",
    color: "Gold",
  },
  virgo: {
    description: "Attention to detail pays off. Organize and plan ahead.",
    mood: "Analytical",
    luckyNumber: "6",
    color: "Navy",
  },
  libra: {
    description: "Balance in relationships is key. Seek harmony in decisions.",
    mood: "Diplomatic",
    luckyNumber: "8",
    color: "Pink",
  },
  scorpio: {
    description: "Deep insights emerge. Trust your intuition in key matters.",
    mood: "Intense",
    luckyNumber: "9",
    color: "Maroon",
  },
  sagittarius: {
    description: "Adventure calls. Expand your horizons through learning.",
    mood: "Optimistic",
    luckyNumber: "3",
    color: "Purple",
  },
  capricorn: {
    description: "Discipline brings rewards. Stay focused on long-term goals.",
    mood: "Determined",
    luckyNumber: "10",
    color: "Brown",
  },
  aquarius: {
    description: "Innovation is your strength. Think outside the box today.",
    mood: "Visionary",
    luckyNumber: "11",
    color: "Blue",
  },
  pisces: {
    description: "Creativity flows freely. Express yourself through art or writing.",
    mood: "Dreamy",
    luckyNumber: "12",
    color: "Sea Green",
  },
};

export async function fetchHoroscope(sign: ZodiacSign): Promise<HoroscopeData> {
  try {
    const res = await fetch("https://aztro.sameerkumar.website/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sign, day: "today" }),
      next: { revalidate: 86400 },
    });

    if (res.ok) {
      const data = await res.json();
      return {
        sign: capitalize(sign),
        description: data.description ?? FALLBACK_HOROSCOPES[sign].description,
        mood: data.mood ?? FALLBACK_HOROSCOPES[sign].mood,
        luckyNumber: String(data.lucky_number ?? FALLBACK_HOROSCOPES[sign].luckyNumber),
        color: data.color ?? FALLBACK_HOROSCOPES[sign].color,
      };
    }
  } catch {
    // fall through
  }

  const fallback = FALLBACK_HOROSCOPES[sign];
  return {
    sign: capitalize(sign),
    ...fallback,
  };
}