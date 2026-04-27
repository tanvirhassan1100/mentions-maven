import type { Briefing } from "@/utils/briefing.functions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, Sparkles } from "lucide-react";
import { briefingToMarkdown } from "@/lib/briefing-markdown";

const sentimentStyles: Record<string, string> = {
  positive: "bg-[oklch(0.65_0.15_155)]/15 text-[oklch(0.45_0.15_155)] border-[oklch(0.65_0.15_155)]/30",
  mixed: "bg-warning/15 text-[oklch(0.5_0.16_75)] border-warning/30",
  negative: "bg-destructive/10 text-destructive border-destructive/30",
  neutral: "bg-muted text-muted-foreground border-border",
};

export function BriefingDisplay({ briefing }: { briefing: Briefing }) {
  const date = new Date(briefing.generatedAt).toLocaleString();

  function downloadMarkdown() {
    const md = briefingToMarkdown(briefing);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deskflow-briefing-${new Date().toISOString().split("T")[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <Card className="p-8 shadow-elegant border-border/60">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <Sparkles className="w-4 h-4 text-accent" />
              AI-Generated Competitive Briefing
            </div>
            <h2 className="text-4xl font-display tracking-tight mb-2">Executive Summary</h2>
            <p className="text-xs font-mono text-muted-foreground">
              {date} · {briefing.totalMentions} mentions · {briefing.sources.join(" + ")}
            </p>
          </div>
          <Button onClick={downloadMarkdown} variant="outline" className="gap-2">
            <Download className="w-4 h-4" /> Markdown
          </Button>
        </div>
        <p className="mt-6 text-lg leading-relaxed text-foreground/90">{briefing.executiveSummary}</p>
      </Card>

      {/* Per-competitor */}
      <div className="grid gap-6">
        {briefing.competitors.map((c) => (
          <Card key={c.name} className="p-7 border-border/60 hover:shadow-elegant transition-shadow">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h3 className="text-2xl font-display tracking-tight">{c.name}</h3>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={sentimentStyles[c.sentiment]}>
                  {c.sentiment}
                </Badge>
                <span className="text-xs font-mono text-muted-foreground">
                  {c.mentionCount} mentions
                </span>
              </div>
            </div>
            <p className="text-muted-foreground mb-5 leading-relaxed">{c.sentimentSummary}</p>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wider text-foreground/70 mb-3">
                  Recurring Themes
                </h4>
                <ul className="space-y-2">
                  {c.themes.map((t, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <span className="text-accent mt-1">▸</span>
                      <span className="text-foreground/85">{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wider text-foreground/70 mb-3">
                  Notable Quotes
                </h4>
                {c.notableQuotes.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No standout quotes flagged.</p>
                ) : (
                  <div className="space-y-3">
                    {c.notableQuotes.map((q, i) => (
                      <blockquote
                        key={i}
                        className="border-l-2 border-accent pl-3 text-sm italic text-foreground/80"
                      >
                        "{q.text}"
                        <a
                          href={q.url}
                          target="_blank"
                          rel="noreferrer"
                          className="not-italic block mt-1 text-xs font-mono text-primary hover:text-accent inline-flex items-center gap-1"
                        >
                          {q.source} <ExternalLink className="w-3 h-3" />
                        </a>
                      </blockquote>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Opportunities + Threats */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-7 border-border/60 bg-gradient-to-br from-card to-secondary/40">
          <h3 className="text-2xl font-display tracking-tight mb-1">Positioning Opportunities</h3>
          <p className="text-xs text-muted-foreground mb-4">Where Deskflow can win</p>
          <ul className="space-y-3">
            {briefing.positioningOpportunities.map((o, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/15 text-accent flex items-center justify-center text-xs font-semibold">
                  {i + 1}
                </span>
                <span className="text-foreground/85 leading-relaxed pt-0.5">{o}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-7 border-border/60">
          <h3 className="text-2xl font-display tracking-tight mb-1">Threats & Watch-outs</h3>
          <p className="text-xs text-muted-foreground mb-4">What competitors are doing well</p>
          <ul className="space-y-3">
            {briefing.threats.map((t, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="flex-shrink-0 w-1.5 h-1.5 mt-2 rounded-full bg-destructive" />
                <span className="text-foreground/85 leading-relaxed">{t}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
