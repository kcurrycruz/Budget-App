export type PlaidSyncResult = {
  results: Array<
    | { itemId: string; added: number; modified: number; removed: number }
    | { itemId: string; error: string }
  >;
  syncedItems: number;
};

export function recoverFailedPlaidSync(payload: unknown): PlaidSyncResult | null {
  if (!payload || typeof payload !== 'object' || !('results' in payload) || !Array.isArray(payload.results)) return null;
  const results = payload.results;
  if (results.length === 0 || !results.every((result) => (
    result && typeof result === 'object'
    && typeof result.itemId === 'string' && result.itemId.length > 0
    && typeof result.error === 'string' && result.error.length > 0
  ))) return null;
  return { syncedItems: 0, results };
}
