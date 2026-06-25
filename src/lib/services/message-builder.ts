import { format } from "date-fns";
import type { BriefingPayload } from "./types";

export function buildBriefingMessage(payload: BriefingPayload): string {
  const { weather, gold, sensex, horoscope, quote } = payload;
  const date = format(new Date(), "EEEE, MMMM d, yyyy");

  const sensexArrow = sensex.change >= 0 ? "▲" : "▼";
  const goldArrow = gold.change >= 0 ? "▲" : "▼";

  return [
    `☀️ *PulseBrief — Daily Briefing*`,
    `📅 ${date}`,
    ``,
    `🌤 *Weather — ${weather.city}*`,
    `${weather.temperature}°C · ${weather.condition}`,
    `Humidity: ${weather.humidity}%`,
    ``,
    `🥇 *Gold (10g)*`,
    `₹${gold.pricePer10g.toLocaleString("en-IN")} ${goldArrow} ${Math.abs(gold.changePercent).toFixed(2)}%`,
    ``,
    `📈 *Sensex*`,
    `${sensex.value.toLocaleString("en-IN")} ${sensexArrow} ${sensex.change >= 0 ? "+" : ""}${sensex.change} (${sensex.changePercent >= 0 ? "+" : ""}${sensex.changePercent}%)`,
    ``,
    `✨ *Quote of the Day*`,
    `"${quote.text}"`,
    `— ${quote.author}`,
    ``,
    `🔮 *${horoscope.sign} Horoscope*`,
    horoscope.description,
    `Mood: ${horoscope.mood} · Lucky #: ${horoscope.luckyNumber} · Color: ${horoscope.color}`,
    ``,
    `_Powered by PulseBrief_`,
  ].join("\n");
}