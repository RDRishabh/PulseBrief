export interface WeatherData {
  city: string;
  temperature: number;
  condition: string;
  humidity: number;
  icon: string;
}

export interface GoldData {
  pricePer10g: number;
  currency: string;
  change: number;
  changePercent: number;
}

export interface SensexData {
  value: number;
  change: number;
  changePercent: number;
  previousClose: number;
}

export interface HoroscopeData {
  sign: string;
  description: string;
  mood: string;
  luckyNumber: string;
  color: string;
}

export interface QuoteData {
  id: string;
  text: string;
  author: string;
  category: string;
}

export interface BriefingPayload {
  weather: WeatherData;
  gold: GoldData;
  sensex: SensexData;
  horoscope: HoroscopeData;
  quote: QuoteData;
}

export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  /** Meta numeric error code (e.g. 131030) */
  metaErrorCode?: number;
  /** Meta error type string (e.g. OAuthException) */
  metaErrorType?: string;
  /** Meta error sub-code */
  metaErrorSubcode?: number;
  /** HTTP status code from Meta API */
  apiHttpStatus?: number;
  /** Full raw API request + response body */
  rawApiResponse?: Record<string, unknown>;
  /** Formatted phone number that was actually sent to */
  formattedPhone?: string;
}