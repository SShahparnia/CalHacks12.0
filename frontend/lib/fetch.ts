const BASE_URL = "http://127.0.0.1:8000/";

export async function createDigest(topic: string, days = 7) {
  const url = new URL("/api/digest", BASE_URL);
  const r = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, days, voice: false }),
  });
  if (!r.ok) throw new Error("Failed to generate digest");
  return r.json();
}

export async function getLatest(topic: string) {
  const u = new URL("/api/digest/latest", BASE_URL);
  u.searchParams.set("topic", topic);
  const r = await fetch(u.toString());
  if (!r.ok) throw new Error("No cached digest");
  return r.json();
}
