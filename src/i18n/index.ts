/**
 * Internationalization (i18n) System
 * Supports: English, Spanish, French, German, Japanese, Chinese, Portuguese, Russian, Korean, Arabic
 */
export type Locale = "en" | "es" | "fr" | "de" | "ja" | "zh" | "pt" | "ru" | "ko" | "ar";

export const SUPPORTED_LOCALES: { code: Locale; name: string; nativeName: string; dir: "ltr" | "rtl" }[] = [
  { code: "en", name: "English", nativeName: "English", dir: "ltr" },
  { code: "es", name: "Spanish", nativeName: "Español", dir: "ltr" },
  { code: "fr", name: "French", nativeName: "Français", dir: "ltr" },
  { code: "de", name: "German", nativeName: "Deutsch", dir: "ltr" },
  { code: "ja", name: "Japanese", nativeName: "日本語", dir: "ltr" },
  { code: "zh", name: "Chinese", nativeName: "中文", dir: "ltr" },
  { code: "pt", name: "Portuguese", nativeName: "Português", dir: "ltr" },
  { code: "ru", name: "Russian", nativeName: "Русский", dir: "ltr" },
  { code: "ko", name: "Korean", nativeName: "한국어", dir: "ltr" },
  { code: "ar", name: "Arabic", nativeName: "العربية", dir: "rtl" },
];

export function getLocaleDir(locale: Locale): "ltr" | "rtl" {
  const config = SUPPORTED_LOCALES.find((l) => l.code === locale);
  return config?.dir || "ltr";
}

// ─── Translation Dictionary ───

type TranslationDict = Record<string, Record<Locale, string>>;

const translations: TranslationDict = {
  // Navigation
  "nav.dashboard": { en: "Dashboard", es: "Panel", fr: "Tableau de bord", de: "Dashboard", ja: "ダッシュボード", zh: "仪表板", pt: "Painel", ru: "Панель", ko: "대시보드", ar: "لوحة القيادة" },
  "nav.analytics": { en: "Analytics", es: "Análisis", fr: "Analytique", de: "Analytik", ja: "分析", zh: "分析", pt: "Análise", ru: "Аналитика", ko: "분석", ar: "تحليلات" },
  "nav.compare": { en: "Compare", es: "Comparar", fr: "Comparer", de: "Vergleichen", ja: "比較", zh: "比较", pt: "Comparar", ru: "Сравнить", ko: "비교", ar: "مقارنة" },
  "nav.reports": { en: "Reports", es: "Informes", fr: "Rapports", de: "Berichte", ja: "レポート", zh: "报告", pt: "Relatórios", ru: "Отчеты", ko: "보고서", ar: "تقارير" },
  "nav.settings": { en: "Settings", es: "Configuración", fr: "Paramètres", de: "Einstellungen", ja: "設定", zh: "设置", pt: "Configurações", ru: "Настройки", ko: "설정", ar: "إعدادات" },
  "nav.team": { en: "Team", es: "Equipo", fr: "Équipe", de: "Team", ja: "チーム", zh: "团队", pt: "Equipe", ru: "Команда", ko: "팀", ar: "فريق" },
  "nav.billing": { en: "Billing", es: "Facturación", fr: "Facturation", de: "Abrechnung", ja: "請求", zh: "账单", pt: "Faturamento", ru: "Оплата", ko: "결제", ar: "الفواتير" },

  // Actions
  "action.analyze": { en: "Analyze Repo", es: "Analizar", fr: "Analyser", de: "Analysieren", ja: "分析", zh: "分析仓库", pt: "Analisar", ru: "Анализ", ko: "분석", ar: "تحليل" },
  "action.save": { en: "Save Changes", es: "Guardar", fr: "Enregistrer", de: "Speichern", ja: "保存", zh: "保存", pt: "Salvar", ru: "Сохранить", ko: "저장", ar: "حفظ" },
  "action.cancel": { en: "Cancel", es: "Cancelar", fr: "Annuler", de: "Abbrechen", ja: "キャンセル", zh: "取消", pt: "Cancelar", ru: "Отмена", ko: "취소", ar: "إلغاء" },
  "action.delete": { en: "Delete", es: "Eliminar", fr: "Supprimer", de: "Löschen", ja: "削除", zh: "删除", pt: "Excluir", ru: "Удалить", ko: "삭제", ar: "حذف" },
  "action.triage": { en: "Run AI Triage", es: "Ejecutar IA", fr: "Lancer IA", de: "KI starten", ja: "AI実行", zh: "运行AI分类", pt: "Executar IA", ru: "Запустить ИИ", ko: "AI 실행", ar: "تشغيل الذكاء" },
  "action.review": { en: "Run AI Review", es: "Revisar con IA", fr: "Réviser avec IA", de: "KI-Review", ja: "AIレビュー", zh: "AI审查", pt: "Revisar com IA", ru: "Обзор ИИ", ko: "AI 리뷰", ar: "مراجعة بالذكاء" },

  // Dashboard
  "dashboard.title": { en: "Repository Dashboard", es: "Panel de Repositorio", fr: "Tableau de bord", de: "Repository Dashboard", ja: "リポジトリダッシュボード", zh: "仓库仪表板", pt: "Painel do Repositório", ru: "Панель репозитория", ko: "저장소 대시보드", ar: "لوحة المستودع" },
  "dashboard.stars": { en: "Stars", es: "Estrellas", fr: "Étoiles", de: "Sterne", ja: "スター", zh: "星标", pt: "Estrelas", ru: "Звезды", ko: "스타", ar: "نجوم" },
  "dashboard.forks": { en: "Forks", es: "Forks", fr: "Forks", de: "Forks", ja: "フォーク", zh: "复刻", pt: "Forks", ru: "Форки", ko: "포크", ar: "فروع" },
  "dashboard.issues": { en: "Open Issues", es: "Issues Abiertos", fr: "Issues Ouverts", de: "Offene Issues", ja: "未解決Issue", zh: "待解决", pt: "Issues Abertos", ru: "Открытые задачи", ko: "열린 이슈", ar: "مشكلات مفتوحة" },
  "dashboard.prs": { en: "Open PRs", es: "PRs Abiertos", fr: "PRs Ouverts", de: "Offene PRs", ja: "未解決PR", zh: "待合并PR", pt: "PRs Abertos", ru: "Открытые PR", ko: "열린 PR", ar: "طلبات مفتوحة" },
  "dashboard.health": { en: "Project Health Score", es: "Salud del Proyecto", fr: "Santé du Projet", de: "Projekt-Gesundheit", ja: "プロジェクト健全性", zh: "项目健康分", pt: "Saúde do Projeto", ru: "Здоровье проекта", ko: "프로젝트 건강", ar: "صحة المشروع" },

  // Health
  "health.busFactor": { en: "Bus Factor", es: "Factor Bus", fr: "Facteur Bus", de: "Bus-Faktor", ja: "バスファクター", zh: "巴士因子", pt: "Fator Ônibus", ru: "Фактор автобуса", ko: "버스 팩터", ar: "عامل الحافلة" },
  "health.responseTime": { en: "Avg Response Time", es: "Tiempo de Respuesta", fr: "Temps de Réponse", de: "Antwortzeit", ja: "平均応答時間", zh: "平均响应时间", pt: "Tempo de Resposta", ru: "Время ответа", ko: "평균 응답 시간", ar: "وقت الاستجابة" },
  "health.staleRatio": { en: "Stale Issue Ratio", es: "Ratio Issues Estancados", fr: "Ratio Issues Stagnants", de: "Veraltete Issues", ja: "滞留Issue率", zh: "停滞问题比例", pt: "Taxa de Issues Parados", ru: "Доля устаревших", ko: "오래된 이슈 비율", ar: "نسبة المشكلات القديمة" },
  "health.prMerge": { en: "PR Merge Time", es: "Tiempo de Merge", fr: "Temps de Merge", de: "Merge-Zeit", ja: "PRマージ時間", zh: "PR合并时间", pt: "Tempo de Merge", ru: "Время слияния PR", ko: "PR 병합 시간", ar: "وقت دمج الطلبات" },

  // Settings
  "settings.appearance": { en: "Appearance", es: "Apariencia", fr: "Apparence", de: "Erscheinungsbild", ja: "外観", zh: "外观", pt: "Aparência", ru: "Внешний вид", ko: "외관", ar: "المظهر" },
  "settings.notifications": { en: "Notifications", es: "Notificaciones", fr: "Notifications", de: "Benachrichtigungen", ja: "通知", zh: "通知", pt: "Notificações", ru: "Уведомления", ko: "알림", ar: "إشعارات" },
  "settings.automation": { en: "Automation", es: "Automatización", fr: "Automatisation", de: "Automatisierung", ja: "自動化", zh: "自动化", pt: "Automação", ru: "Автоматизация", ko: "자동화", ar: "أتمتة" },
  "settings.alerts": { en: "Alert Thresholds", es: "Umbrales de Alerta", fr: "Seuils d'Alerte", de: "Alarmschwellen", ja: "アラート閾値", zh: "警报阈值", pt: "Limiares de Alerta", ru: "Пороги оповещений", ko: "경고 임계값", ar: "حدود التنبيه" },

  // Errors
  "error.rateLimit": { en: "Rate limit exceeded. Try again later.", es: "Límite excedido.", fr: "Limite dépassée.", de: "Limit überschritten.", ja: "制限超過", zh: "超出速率限制", pt: "Limite excedido.", ru: "Превышен лимит.", ko: "제한 초과", ar: "تم تجاوز الحد" },
  "error.unauthorized": { en: "Unauthorized. Please sign in.", es: "No autorizado.", fr: "Non autorisé.", de: "Nicht autorisiert.", ja: "認証が必要", zh: "未授权", pt: "Não autorizado.", ru: "Не авторизован.", ko: "인증 필요", ar: "غير مصرح" },
  "error.notFound": { en: "Not found.", es: "No encontrado.", fr: "Introuvable.", de: "Nicht gefunden.", ja: "見つかりません", zh: "未找到", pt: "Não encontrado.", ru: "Не найдено.", ko: "찾을 수 없음", ar: "غير موجود" },
  "error.serverError": { en: "Server error. Please try again.", es: "Error del servidor.", fr: "Erreur serveur.", de: "Serverfehler.", ja: "サーバーエラー", zh: "服务器错误", pt: "Erro do servidor.", ru: "Ошибка сервера.", ko: "서버 오류", ar: "خطأ في الخادم" },
  "error.githubApi": { en: "GitHub API error. Check repo name.", es: "Error API GitHub.", fr: "Erreur API GitHub.", de: "GitHub API Fehler.", ja: "GitHub APIエラー", zh: "GitHub API错误", pt: "Erro API GitHub.", ru: "Ошибка API GitHub.", ko: "GitHub API 오류", ar: "خطأ في API GitHub" },
};

// ─── Translation Engine ───

let currentLocale: Locale = "en";

export function setLocale(locale: Locale): void {
  currentLocale = locale;
  if (typeof document !== "undefined") {
    document.documentElement.lang = locale;
    document.documentElement.dir = getLocaleDir(locale);
  }
}

export function getLocale(): Locale {
  return currentLocale;
}

export function t(key: string, fallback?: string): string {
  const entry = translations[key];
  if (!entry) return fallback || key;
  return entry[currentLocale] || entry.en || fallback || key;
}

export function formatNumber(num: number, locale?: Locale): string {
  try {
    return new Intl.NumberFormat(locale || currentLocale).format(num);
  } catch {
    return num.toLocaleString();
  }
}

export function formatDate(date: Date | string, locale?: Locale, options?: Intl.DateTimeFormatOptions): string {
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    return new Intl.DateTimeFormat(locale || currentLocale, options || { dateStyle: "medium" }).format(d);
  } catch {
    return String(date);
  }
}

export function formatRelativeTime(date: Date | string, locale?: Locale): string {
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    const now = Date.now();
    const diff = now - d.getTime();
    const rtf = new Intl.RelativeTimeFormat(locale || currentLocale, { numeric: "auto" });

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (minutes < 1) return t("time.justNow", "just now");
    if (minutes < 60) return rtf.format(-minutes, "minute");
    if (hours < 24) return rtf.format(-hours, "hour");
    if (days < 30) return rtf.format(-days, "day");
    if (months < 12) return rtf.format(-months, "month");
    return rtf.format(-years, "year");
  } catch {
    return String(date);
  }
}

// ─── Detect Browser Locale ───

export function detectBrowserLocale(): Locale {
  if (typeof navigator === "undefined") return "en";
  const browserLang = navigator.language.split("-")[0];
  const supported = SUPPORTED_LOCALES.find((l) => l.code === browserLang);
  return supported?.code || "en";
}
