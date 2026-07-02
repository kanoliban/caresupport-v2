const STORAGE_KEY = "cs_attribution";

export interface Attribution {
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  landingPath?: string;
}

function readStored(): Attribution | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Attribution) : null;
  } catch {
    return null;
  }
}

export function captureAttribution(): void {
  if (typeof window === "undefined") return;
  if (readStored()) return;
  try {
    const params = new URLSearchParams(window.location.search);
    const attribution: Attribution = {};
    const referrer = document.referrer;
    if (referrer && !referrer.includes(window.location.hostname)) {
      attribution.referrer = referrer.slice(0, 500);
    }
    const utmSource = params.get("utm_source");
    const utmMedium = params.get("utm_medium");
    const utmCampaign = params.get("utm_campaign");
    const utmContent = params.get("utm_content");
    if (utmSource) attribution.utmSource = utmSource.slice(0, 100);
    if (utmMedium) attribution.utmMedium = utmMedium.slice(0, 100);
    if (utmCampaign) attribution.utmCampaign = utmCampaign.slice(0, 100);
    if (utmContent) attribution.utmContent = utmContent.slice(0, 100);
    attribution.landingPath = window.location.pathname.slice(0, 200);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
  } catch {
    // sessionStorage unavailable (private mode etc.) — attribution is best-effort
  }
}

export function getAttribution(): Attribution {
  if (typeof window === "undefined") return {};
  return readStored() ?? {};
}
