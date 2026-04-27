import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Plus, Sparkles, X, AlertCircle, Radar } from "lucide-react";
import { generateBriefing, type BriefingResult } from "@/utils/briefing.functions";
import { BriefingDisplay } from "@/components/BriefingDisplay";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Deskflow · Competitive Intelligence" },
      {
        name: "description",
        content:
          "Internal Deskflow tool that auto-generates weekly competitive briefings on Freshservice, Jira Service Management, and SysAid using Reddit + Hacker News data and LLM analysis.",
      },
    ],
  }),
  component: Index,
});

const DEFAULT_COMPETITORS = ["Freshservice", "Jira Service Management", "SysAid"];

function Index() {
  const [competitors, setCompetitors] = useState<string[]>(DEFAULT_COMPETITORS);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BriefingResult | null>(null);
  const generate = useServerFn(generateBriefing);

  function addCompetitor() {
    const v = draft.trim();
    if (!v) return;
    if (competitors.length >= 6) return;
    if (competitors.some((c) => c.toLowerCase() === v.toLowerCase())) {
      setDraft("");
      return;
    }
    setCompetitors([...competitors, v]);
    setDraft("");
  }

  function removeCompetitor(c: string) {
    setCompetitors(competitors.filter((x) => x !== c));
  }

  async function handleGenerate() {
    if (competitors.length === 0) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await generate({ data: { competitors } });
      setResult(res);
    } catch (err) {
      setResult({
        briefing: null,
        rawMentions: [],
        warnings: [],
        error: err instanceof Error ? err.message : "Unexpected error.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Hero */}
      <header className="bg-gradient-hero text-primary-foreground">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-20">
          <div className="flex items-center gap-2 text-sm font-mono opacity-80 mb-4">
            <Radar className="w-4 h-4" />
            DESKFLOW · INTERNAL TOOL
          </div>
          <h1 className="text-5xl md:text-7xl font-display tracking-tight leading-[1.05] mb-5">
            Competitive Intelligence,
            <br />
            <span className="italic opacity-90">automated.</span>
          </h1>
          <p className="text-lg md:text-xl opacity-85 max-w-2xl leading-relaxed">
            Pulls fresh Reddit and Hacker News chatter on your competitors, runs it through an LLM,
            and ships a Monday-morning briefing in under a minute. Replaces 2.5 hours of manual scanning.
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 space-y-10">
        {/* Input panel */}
        <Card className="p-7 md:p-8 shadow-elegant border-border/60">
          <div className="mb-5">
            <h2 className="text-2xl font-display tracking-tight mb-1">Configure briefing</h2>
            <p className="text-sm text-muted-foreground">
              Add up to 6 competitors. Defaults are pre-filled for Deskflow's primary rivals.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {competitors.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium border border-border"
              >
                {c}
                <button
                  onClick={() => removeCompetitor(c)}
                  className="hover:text-destructive transition-colors"
                  aria-label={`Remove ${c}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
            {competitors.length === 0 && (
              <span className="text-sm text-muted-foreground italic">No competitors added.</span>
            )}
          </div>

          <div className="flex gap-2 mb-6">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCompetitor();
                }
              }}
              placeholder="Add a competitor (e.g. ServiceNow)"
              className="max-w-sm"
              disabled={competitors.length >= 6}
            />
            <Button
              type="button"
              variant="outline"
              onClick={addCompetitor}
              disabled={!draft.trim() || competitors.length >= 6}
              className="gap-1"
            >
              <Plus className="w-4 h-4" /> Add
            </Button>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={loading || competitors.length === 0}
            size="lg"
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Scanning sources & analyzing…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Briefing
              </>
            )}
          </Button>
          {loading && (
            <p className="text-xs text-muted-foreground mt-3 font-mono">
              Fetching Reddit + Hacker News for {competitors.length} competitor
              {competitors.length === 1 ? "" : "s"}, then calling the LLM. Usually 15–40s.
            </p>
          )}
        </Card>

        {/* Error */}
        {result?.error && (
          <Card className="p-5 border-destructive/40 bg-destructive/5">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-destructive mb-1">Couldn't generate briefing</h3>
                <p className="text-sm text-foreground/80">{result.error}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Warnings */}
        {result && result.warnings.length > 0 && result.briefing && (
          <Card className="p-4 border-warning/40 bg-warning/5">
            <h4 className="text-sm font-semibold mb-2">Heads up</h4>
            <ul className="text-xs text-muted-foreground space-y-1 font-mono">
              {result.warnings.map((w, i) => (
                <li key={i}>• {w}</li>
              ))}
            </ul>
          </Card>
        )}

        {/* Briefing */}
        {result?.briefing && <BriefingDisplay briefing={result.briefing} />}

        {/* Empty state */}
        {!result && !loading && (
          <Card className="p-10 text-center border-dashed border-border/60 bg-card/40">
            <Radar className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Your briefing will appear here. Click <span className="font-semibold text-foreground">Generate Briefing</span> to start.
            </p>
          </Card>
        )}
      </main>

      <footer className="max-w-6xl mx-auto px-6 py-10 text-xs text-muted-foreground font-mono border-t border-border/50 mt-12">
        Deskflow Competitive Intelligence · Internal use only · Sources: Reddit, Hacker News (Algolia)
      </footer>
    </div>
  );
}
