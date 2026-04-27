import type { Briefing } from "@/utils/briefing.functions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, Sparkles, FileText, FileDown } from "lucide-react";
import { briefingToMarkdown } from "@/lib/briefing-markdown";
import jsPDF from "jspdf";

const sentimentStyles: Record<string, string> = {
  positive: "bg-[oklch(0.65_0.15_155)]/15 text-[oklch(0.45_0.15_155)] border-[oklch(0.65_0.15_155)]/30",
  mixed: "bg-warning/15 text-[oklch(0.5_0.16_75)] border-warning/30",
  negative: "bg-destructive/10 text-destructive border-destructive/30",
  neutral: "bg-muted text-muted-foreground border-border",
};

export function BriefingDisplay({ briefing }: { briefing: Briefing }) {
  const date = new Date(briefing.generatedAt).toLocaleString();
  const dateStamp = new Date(briefing.generatedAt).toISOString().split("T")[0];

  function downloadMarkdown() {
    const md = briefingToMarkdown(briefing);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deskflow-briefing-${dateStamp}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadPDF() {
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 48;
    const maxW = pageW - margin * 2;
    let y = margin;

    const ensureSpace = (needed: number) => {
      if (y + needed > pageH - margin) {
        doc.addPage();
        y = margin;
      }
    };

    const writeWrapped = (text: string, size: number, style: "normal" | "bold" | "italic", color: [number, number, number] = [30, 30, 50], lineGap = 4) => {
      doc.setFont("helvetica", style);
      doc.setFontSize(size);
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(text, maxW);
      for (const line of lines) {
        ensureSpace(size + lineGap);
        doc.text(line, margin, y);
        y += size + lineGap;
      }
    };

    // Title
    writeWrapped("Deskflow Competitive Intelligence", 22, "bold", [25, 25, 70]);
    y += 4;
    writeWrapped(`${date}  ·  ${briefing.totalMentions} mentions  ·  ${briefing.sources.join(" + ")}`, 9, "normal", [110, 110, 130]);
    y += 14;

    // Executive Summary
    writeWrapped("Executive Summary", 14, "bold", [25, 25, 70]);
    y += 2;
    writeWrapped(briefing.executiveSummary, 11, "normal");
    y += 10;

    // Competitors
    for (const c of briefing.competitors) {
      ensureSpace(60);
      writeWrapped(c.name, 16, "bold", [25, 25, 70]);
      writeWrapped(`Sentiment: ${c.sentiment.toUpperCase()}  ·  ${c.mentionCount} mentions`, 9, "italic", [110, 110, 130]);
      y += 4;
      writeWrapped(c.sentimentSummary, 10, "normal");
      y += 6;
      writeWrapped("Recurring themes:", 10, "bold");
      for (const t of c.themes) writeWrapped(`• ${t}`, 10, "normal");
      if (c.notableQuotes.length > 0) {
        y += 4;
        writeWrapped("Notable quotes:", 10, "bold");
        for (const q of c.notableQuotes) {
          writeWrapped(`"${q.text}"`, 10, "italic", [60, 60, 90]);
          writeWrapped(`— ${q.source}`, 9, "normal", [110, 110, 130]);
        }
      }
      y += 12;
    }

    // Opportunities
    ensureSpace(40);
    writeWrapped("Positioning Opportunities", 14, "bold", [25, 25, 70]);
    y += 2;
    briefing.positioningOpportunities.forEach((o, i) => writeWrapped(`${i + 1}. ${o}`, 11, "normal"));
    y += 10;

    // Threats
    ensureSpace(40);
    writeWrapped("Threats & Watch-outs", 14, "bold", [25, 25, 70]);
    y += 2;
    for (const t of briefing.threats) writeWrapped(`• ${t}`, 11, "normal");

    doc.save(`deskflow-briefing-${dateStamp}.pdf`);
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
          <div className="flex gap-2 flex-wrap">
            <Button onClick={downloadMarkdown} variant="outline" className="gap-2">
              <FileText className="w-4 h-4" /> Markdown
            </Button>
            <Button onClick={downloadPDF} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
              <FileDown className="w-4 h-4" /> PDF
            </Button>
          </div>
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
