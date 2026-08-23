/**
 * Клиент Supabase — аккаунты и синхронизация библиотеки.
 *
 * URL и anon-ключ публичные: anon-ключ специально предназначен для браузера,
 * доступ ограничивают политики Row Level Security на стороне Supabase, а не
 * секретность ключа. Поэтому префикс VITE_ здесь уместен — в отличие от ключа
 * OpenAI, который остаётся только на сервере.
 *
 * Модуль подгружается динамически (см. AUTH_ON в App.jsx): SDK весит ~230 КБ,
 * и пока вход не настроен, тянуть его в основной бандл незачем.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = (import.meta.env.VITE_SUPABASE_URL || "").trim();
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

export const supabase: SupabaseClient = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // нужно для возврата после входа через Google
  },
});

/** Токен текущей сессии — им подписываются запросы к нашему /api/claude. */
export async function accessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
