export async function createDigest(topic: string, days = 7) {
  const r = await fetch(process.env.NEXT_PUBLIC_API_BASE + "/api/digest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, days, voice: false })
  });
  if (!r.ok) throw new Error("Failed to generate digest");
  return r.json();
}

export async function getLatest(topic: string) {
  const u = new URL(process.env.NEXT_PUBLIC_API_BASE + "/api/digest/latest");
  u.searchParams.set("topic", topic);
  const r = await fetch(u.toString());
  if (!r.ok) throw new Error("No cached digest");
  return r.json();
}
