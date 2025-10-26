"use client"
import { useState } from "react"
import { createDigest, getLatest } from "../lib/fetch"
import { Search, Loader2, FileText, Home, Github } from "lucide-react"
import Link from "next/link"

const SAMPLE_PAPERS = [
	{
		title: "Attention Is All You Need",
		authors: "Vaswani et al.",
		published: "2017-06-12",
		url: "https://arxiv.org/abs/1706.03762",
		arxivId: "1706.03762",
		cluster: "Transformer Architecture",
		summary:
			"We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely. Experiments on two machine translation tasks show these models to be superior in quality while being more parallelizable and requiring significantly less time to train.",
	},
	{
		title: "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding",
		authors: "Devlin et al.",
		published: "2018-10-11",
		url: "https://arxiv.org/abs/1810.04805",
		arxivId: "1810.04805",
		cluster: "Language Models",
		summary:
			"We introduce a new language representation model called BERT, which stands for Bidirectional Encoder Representations from Transformers. Unlike recent language representation models, BERT is designed to pre-train deep bidirectional representations from unlabeled text by jointly conditioning on both left and right context in all layers.",
	},
	{
		title: "Denoising Diffusion Probabilistic Models",
		authors: "Ho et al.",
		published: "2020-06-19",
		url: "https://arxiv.org/abs/2006.11239",
		arxivId: "2006.11239",
		cluster: "Generative Models",
		summary:
			"We present high quality image synthesis results using diffusion probabilistic models, a class of latent variable models inspired by considerations from nonequilibrium thermodynamics. Our best results are obtained by training on a weighted variational bound designed according to a novel connection between diffusion probabilistic models and denoising score matching with Langevin dynamics.",
	},
]

export default function Page() {
	const [topic, setTopic] = useState("")
	const [loading, setLoading] = useState(false)
	const [data, setData] = useState<any>(null)
	const [error, setError] = useState<string | null>(null)
	const [showSamples, setShowSamples] = useState(true)

	async function generate() {
		if (!topic.trim()) return
		console.log("🔵 Generate clicked with topic:", topic)
		setLoading(true)
		setError(null)
		setShowSamples(false)
		try {
			const result = await createDigest(topic, 7)
			console.log("✅ Received data from backend:", result)
			setData(result)
		} catch (e: any) {
			console.error("❌ Error generating digest:", e)
			setError(e.message || "Request failed")
		} finally {
			setLoading(false)
		}
	}

	async function loadLatest() {
		if (!topic.trim()) return
		console.log("🔵 Load Latest clicked with topic:", topic)
		setLoading(true)
		setError(null)
		setShowSamples(false)
		try {
			const result = await getLatest(topic)
			console.log("✅ Loaded latest digest:", result)
			setData(result)
		} catch (e: any) {
			console.error("❌ Error loading digest:", e)
			setError(e.message || "No cached digest")
		} finally {
			setLoading(false)
		}
	}

	const allPapers =
		data?.clusters?.flatMap((c: any) => c.topPapers?.map((p: any) => ({ ...p, cluster: c.label })) || []) || []

	console.log("📊 Current state:", {
		data,
		showSamples,
		allPapersCount: allPapers.length,
		displayingWhat: showSamples ? "SAMPLES" : "BACKEND DATA",
	})

	const displayPapers = showSamples ? SAMPLE_PAPERS : allPapers

	return (
		<main className="min-h-screen bg-background">
			<nav className="fixed top-6 right-6 z-50">
				<div className="flex items-center gap-2 px-4 py-2 bg-secondary/80 backdrop-blur-lg border border-border rounded-full shadow-lg">
					<Link
						href="/"
						className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-foreground hover:text-primary transition-colors rounded-full hover:bg-muted"
					>
						<Home className="h-4 w-4" />
						Home
					</Link>
					<div className="w-px h-4 bg-border" />
					<a
						href="https://github.com/rohankhatri7/CalHacks12.0"
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-foreground hover:text-primary transition-colors rounded-full hover:bg-muted"
					>
						<Github className="h-4 w-4" />
						GitHub
					</a>
				</div>
			</nav>

			<div className="border-b border-border bg-card/50 backdrop-blur-sm">
				<div className="mx-auto max-w-4xl px-6 py-20">
					<div className="text-center mb-12">
						<h1 className="text-6xl font-bold mb-4 text-balance tracking-tight">Kensa</h1>
						<p className="text-lg text-muted-foreground text-balance">AI-powered research paper digests from arXiv</p>
					</div>

					<div className="space-y-4">
						<div className="relative">
							<Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
							<input
								className="w-full h-16 pl-14 pr-5 bg-background border-2 border-border rounded-2xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all text-lg"
								value={topic}
								onChange={(e) => setTopic(e.target.value)}
								placeholder="Search research topics..."
								onKeyDown={(e) => e.key === "Enter" && generate()}
							/>
						</div>

						<div className="flex gap-3 justify-center">
							<button
								className="h-12 px-8 bg-secondary text-foreground border border-border rounded-xl font-medium hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
								onClick={loadLatest}
								disabled={loading || !topic.trim()}
							>
								{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
								Load Digest
							</button>
							<button
								className="h-12 px-8 bg-foreground text-background rounded-xl font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
								onClick={generate}
								disabled={loading || !topic.trim()}
							>
								{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
								Generate
							</button>
						</div>
					</div>

					{error && (
						<div className="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm text-center">
							{error}
						</div>
					)}
				</div>
			</div>

			{displayPapers.length > 0 && (
				<div className="mx-auto max-w-6xl px-6 py-12">
					<div className="space-y-6">
						{displayPapers.map((paper: any, idx: number) => (
							<a
								key={idx}
								href={paper.url}
								target="_blank"
								rel="noreferrer"
								className="flex gap-6 p-6 bg-card border border-border rounded-2xl hover:border-primary/50 transition-all group"
							>
								<div className="flex-shrink-0 w-48 h-64 bg-secondary rounded-xl overflow-hidden border border-border flex items-center justify-center relative">
									{paper.arxivId ? (
										<iframe
											src={`https://arxiv.org/pdf/${paper.arxivId}.pdf#view=FitH`}
											className="w-full h-full pointer-events-none"
											title={`PDF preview of ${paper.title}`}
										/>
									) : (
										<div className="text-center p-4">
											<FileText className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
											<p className="text-xs text-muted-foreground">PDF Preview</p>
											<p className="text-xs text-muted-foreground mt-1">arXiv</p>
										</div>
									)}
								</div>

								<div className="flex-1 min-w-0 flex flex-col">
									<div className="flex items-start justify-between gap-4 mb-3">
										<h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors text-pretty leading-tight">
											{paper.title}
										</h3>
									</div>

									{paper.cluster && (
										<div className="inline-flex items-center px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full mb-3 self-start">
											{paper.cluster}
										</div>
									)}

									{paper.summary && (
										<p className="text-muted-foreground leading-relaxed text-pretty flex-1">{paper.summary}</p>
									)}

									<div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground pt-4 border-t border-border">
										{paper.authors && <span className="truncate font-medium">{paper.authors}</span>}
										{paper.published && (
											<span className="flex items-center gap-1">
												<span className="text-muted-foreground/50">•</span>
												{new Date(paper.published).toLocaleDateString("en-US", {
													year: "numeric",
													month: "short",
													day: "numeric",
												})}
											</span>
										)}
									</div>
								</div>
							</a>
						))}
					</div>

					{showSamples && (
						<div className="mt-8 p-4 bg-muted/50 border border-border rounded-xl text-center">
							<p className="text-sm text-muted-foreground">
								Showing sample papers. Enter a topic above to generate or load a digest.
							</p>
						</div>
					)}
				</div>
			)}

			{/* Empty state - only show if no samples and no data */}
			{!showSamples && displayPapers.length === 0 && !loading && (
				<div className="mx-auto max-w-5xl px-6 py-24 text-center">
					<FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
					<h2 className="text-2xl font-semibold mb-2">No digest loaded</h2>
					<p className="text-muted-foreground">Enter a research topic above to generate or load a digest</p>
				</div>
			)}
		</main>
	)
}
