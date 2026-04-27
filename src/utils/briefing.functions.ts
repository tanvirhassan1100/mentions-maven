import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  competitors: z.array(z.string().min(1).max(80)).min(1).max(6),
});

export type Mention = {
  source: "Reddit" | "Hacker News";
  competitor: string;
  title: string;
  url: string;
  snippet: string;
  score?: number;
  createdAt?: string;
  author?: string;
};

export type CompetitorSection = {
  name: string;
  sentiment: "positive" | "mixed" | "negative" | "neutral";
  sentimentSummary: string;
  themes: string[];
  notableQuotes: { text: string; source: string; url: string }[];
  mentionCount: number;
};

export type Briefing = {
  generatedAt: string;
  competitors: CompetitorSection[];
  positioningOpportunities: string[];
  threats: string[];
  executiveSummary: string;
  totalMentions: number;
  sources: string[];
};

export type BriefingResult = {
  briefing: Briefing | null;
  rawMentions: Mention[];
  warnings: string[];
  error: string | null;
};

async function fetchReddit(competitor: string): Promise<Mention[]> {
  try {
    const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(competitor)}&sort=new&limit=10&t=month`;
    const res = await fetch(url, {
      headers: { "User-Agent": "DeskflowCompIntel/1.0" },
    });
    if (!res.ok) {
      console.error(`Reddit ${competitor} failed: ${res.status}`);
      return [];
    }
    const json = (await res.json()) as {
      data?: { children?: Array<{ data: Record<string, unknown> }> };
    };
    const children = json.data?.children ?? [];
    return children.slice(0, 8).map((c) => {
      const d = c.data;
      const selftext = (d.selftext as string) || "";
      const title = (d.title as string) || "";
      return {
        source: "Reddit" as const,
        competitor,
        title,
        url: `https://reddit.com${(d.permalink as string) || ""}`,
        snippet: selftext.slice(0, 500) || title,
        score: (d.score as number) ?? 0,
        createdAt: d.created_utc
          ? new Date((d.created_utc as number) * 1000).toISOString()
          : undefined,
        author: (d.author as string) || undefined,
      };
    });
  } catch (err) {
    console.error(`Reddit fetch error for ${competitor}:`, err);
    return [];
  }
}

async function fetchHackerNews(competitor: string): Promise<Mention[]> {
  try {
    const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(competitor)}&tags=(story,comment)&hitsPerPage=10`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`HN ${competitor} failed: ${res.status}`);
      return [];
    }
    const json = (await res.json()) as {
      hits?: Array<Record<string, unknown>>;
    };
    const hits = json.hits ?? [];
    return hits.slice(0, 8).map((h) => {
      const title =
        (h.title as string) ||
        (h.story_title as string) ||
        (h.comment_text as string)?.slice(0, 80) ||
        "HN discussion";
      const text =
        (h.story_text as string) ||
        (h.comment_text as string) ||
        title;
      const objectID = h.objectID as string;
      return {
        source: "Hacker News" as const,
        competitor,
        title: title.replace(/<[^>]+>/g, "").slice(0, 200),
        url: `https://news.ycombinator.com/item?id=${objectID}`,
        snippet: text.replace(/<[^>]+>/g, "").slice(0, 500),
        score: (h.points as number) ?? 0,
        createdAt: (h.created_at as string) || undefined,
        author: (h.author as string) || undefined,
      };
    });
  } catch (err) {
    console.error(`HN fetch error for ${competitor}:`, err);
    return [];
  }
}

async function callLovableAI(mentions: Mention[], competitors: string[]): Promise<Briefing> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

  const mentionsByCompetitor: Record<string, Mention[]> = {};
  for (const c of competitors) mentionsByCompetitor[c] = [];
  for (const m of mentions) {
    const key = competitors.find((c) => c.toLowerCase() === m.competitor.toLowerCase()) || m.competitor;
    if (!mentionsByCompetitor[key]) mentionsByCompetitor[key] = [];
    mentionsByCompetitor[key].push(m);
  }

  const systemPrompt = `You are a senior competitive intelligence analyst at Deskflow, a B2B SaaS IT Service Management (ITSM) platform targeting mid-market companies (200-2,000 employees). Deskflow competes with the listed competitors. Analyze the raw web mentions and produce a sharp, executive-ready briefing. Be specific, cite real themes from the data, and surface positioning angles Deskflow can exploit. Never fabricate quotes — only use snippets present in the input data.`;

  const userPrompt = `Generate a competitive intelligence briefing.

Competitors: ${competitors.join(", ")}

Raw mentions (JSON):
${JSON.stringify(mentionsByCompetitor, null, 2).slice(0, 18000)}

Produce a structured briefing using the provided tool. For each competitor:
- sentiment: overall vibe from the mentions
- sentimentSummary: 1-2 sentences on tone
- themes: 3-5 recurring topics or complaints (specific, not generic)
- notableQuotes: 1-3 actual snippets worth flagging, with their source URL
- mentionCount: number analyzed

Then provide:
- executiveSummary: 2-3 sentences for the Head of Marketing
- positioningOpportunities: 3-5 concrete ways Deskflow can win against these competitors based on the data
- threats: 2-4 risks or things competitors are doing well`;

  const tool = {
    type: "function",
    function: {
      name: "submit_briefing",
      description: "Submit the structured competitive intelligence briefing.",
      parameters: {
        type: "object",
        properties: {
          executiveSummary: { type: "string" },
          competitors: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                sentiment: { type: "string", enum: ["positive", "mixed", "negative", "neutral"] },
                sentimentSummary: { type: "string" },
                themes: { type: "array", items: { type: "string" } },
                notableQuotes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      text: { type: "string" },
                      source: { type: "string" },
                      url: { type: "string" },
                    },
                    required: ["text", "source", "url"],
                    additionalProperties: false,
                  },
                },
                mentionCount: { type: "number" },
              },
              required: ["name", "sentiment", "sentimentSummary", "themes", "notableQuotes", "mentionCount"],
              additionalProperties: false,
            },
          },
          positioningOpportunities: { type: "array", items: { type: "string" } },
          threats: { type: "array", items: { type: "string" } },
        },
        required: ["executiveSummary", "competitors", "positioningOpportunities", "threats"],
        additionalProperties: false,
      },
    },
  };

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [tool],
      tool_choice: { type: "function", function: { name: "submit_briefing" } },
    }),
  });

  if (res.status === 429) throw new Error("Rate limit exceeded on AI gateway. Please wait a minute and try again.");
  if (res.status === 402) throw new Error("AI credits exhausted. Add credits in Settings → Workspace → Usage.");
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI gateway error ${res.status}: ${t.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{
      message?: {
        tool_calls?: Array<{ function?: { arguments?: string } }>;
        content?: string;
      };
    }>;
  };
  const toolCall = json.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) {
    throw new Error("AI did not return a structured briefing. Try again.");
  }

  let parsed: Omit<Briefing, "generatedAt" | "totalMentions" | "sources">;
  try {
    parsed = JSON.parse(toolCall.function.arguments);
  } catch {
    throw new Error("AI returned malformed JSON. Try again.");
  }

  return {
    ...parsed,
    generatedAt: new Date().toISOString(),
    totalMentions: mentions.length,
    sources: ["Reddit", "Hacker News (Algolia)"],
  };
}

export const generateBriefing = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<BriefingResult> => {
    const warnings: string[] = [];
    try {
      // Fetch from both sources for each competitor in parallel
      const fetchPromises = data.competitors.flatMap((c) => [
        fetchReddit(c).then((m) => ({ competitor: c, mentions: m, source: "reddit" as const })),
        fetchHackerNews(c).then((m) => ({ competitor: c, mentions: m, source: "hn" as const })),
      ]);
      const results = await Promise.all(fetchPromises);

      const allMentions: Mention[] = [];
      for (const r of results) {
        if (r.mentions.length === 0) {
          warnings.push(`No ${r.source === "reddit" ? "Reddit" : "Hacker News"} mentions found for "${r.competitor}".`);
        }
        allMentions.push(...r.mentions);
      }

      if (allMentions.length === 0) {
        return {
          briefing: null,
          rawMentions: [],
          warnings,
          error: "No mentions found from any source. Try different competitor names or check again later.",
        };
      }

      const briefing = await callLovableAI(allMentions, data.competitors);

      return { briefing, rawMentions: allMentions, warnings, error: null };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error generating briefing.";
      console.error("generateBriefing error:", err);
      return { briefing: null, rawMentions: [], warnings, error: msg };
    }
  });
