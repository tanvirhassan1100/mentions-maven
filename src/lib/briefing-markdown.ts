import type { Briefing } from "@/utils/briefing.functions";

export function briefingToMarkdown(b: Briefing): string {
  const date = new Date(b.generatedAt).toLocaleString();
  let md = `# Deskflow Competitive Intelligence Briefing\n\n`;
  md += `**Generated:** ${date}  \n`;
  md += `**Sources:** ${b.sources.join(", ")}  \n`;
  md += `**Total mentions analyzed:** ${b.totalMentions}\n\n`;
  md += `---\n\n## Executive Summary\n\n${b.executiveSummary}\n\n`;

  md += `## Competitor Breakdown\n\n`;
  for (const c of b.competitors) {
    md += `### ${c.name}\n\n`;
    md += `**Sentiment:** ${c.sentiment.toUpperCase()} — ${c.sentimentSummary}  \n`;
    md += `**Mentions analyzed:** ${c.mentionCount}\n\n`;
    md += `**Recurring themes:**\n`;
    for (const t of c.themes) md += `- ${t}\n`;
    md += `\n`;
    if (c.notableQuotes.length > 0) {
      md += `**Notable quotes:**\n\n`;
      for (const q of c.notableQuotes) {
        md += `> "${q.text}"\n> — [${q.source}](${q.url})\n\n`;
      }
    }
  }

  md += `## Positioning Opportunities\n\n`;
  for (const o of b.positioningOpportunities) md += `- ${o}\n`;
  md += `\n## Threats & Watch-outs\n\n`;
  for (const t of b.threats) md += `- ${t}\n`;
  return md;
}
