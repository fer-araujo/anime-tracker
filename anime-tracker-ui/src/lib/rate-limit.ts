const rateLimitMap = new Map<string, number[]>();
export function checkRateLimit(key: string, maxPerMinute: number = 30): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(key) || [];
  const recent = timestamps.filter(t => now - t < 60000);
  if (recent.length >= maxPerMinute) return false;
  recent.push(now);
  rateLimitMap.set(key, recent);
  return true;
}
