export const LAST_VIEWED_RECORD_KEY = "collector:lastViewedRecordId";

export function saveLastViewedRecord(recordId: string | number) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(LAST_VIEWED_RECORD_KEY, String(recordId));
}

export function readLastViewedRecord() {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(LAST_VIEWED_RECORD_KEY);
}

export function clearLastViewedRecord() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(LAST_VIEWED_RECORD_KEY);
}
