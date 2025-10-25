"use client";
import { useState } from "react";
import { createDigest, getLatest } from "../lib/fetch";

export default function Page() {
  const [topic, setTopic] = useState("diffusion models");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true); setError(null);
    try { setData(await createDigest(topic, 7)); } 
    catch (e:any) { setError(e.message || "Request failed"); } 
    finally { setLoading(false); }
  }

  async function loadLatest() {
    setLoading(true); setError(null);
    try { setData(await getLatest(topic)); } 
    catch (e:any) { setError(e.message || "No cached digest"); } 
    finally { setLoading(false); }
  }

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-3xl font-semibold">Kensa</h1>
      <div className="flex gap-2">
        <input className="border flex-1 p-2 rounded" value={topic} onChange={e=>setTopic(e.target.value)} />
        <button className="px-4 py-2 bg-black text-white rounded" onClick={generate}>Generate</button>
        <button className="px-4 py-2 border rounded" onClick={loadLatest}>Load Latest</button>
      </div>

      {loading && <div>Loading...</div>}
      {error && <div className="text-red-600">{error}</div>}
      {data && (
        <section className="space-y-4">
          <p className="text-lg whitespace-pre-wrap">{data.summary}</p>
          <div className="grid gap-3">
            {data.clusters?.map((c: any, i: number)=>(
              <div key={i} className="border rounded p-3">
                <h3 className="font-medium">{c.label}</h3>
                <ul className="list-disc ml-5">
                  {c.bullets?.map((b: string, j: number)=><li key={j}>{b}</li>)}
                </ul>
                <div className="mt-2 flex flex-wrap gap-2">
                  {c.topPapers?.map((p: any, k: number)=>(
                    <a key={k} href={p.url} className="text-blue-600 underline" target="_blank" rel="noreferrer">{p.title}</a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
