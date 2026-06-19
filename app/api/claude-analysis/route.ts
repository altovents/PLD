import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

interface LeakInput {
  type: string;
  title: string;
  description: string;
  amount: number;
  priority: string;
  vendor: string;
  transactionCount: number;
}

interface EnrichedLeak {
  id: string;
  enrichedDescription: string;
  actionItems: string[];
  timeToFix: string;
  savingsConfidence: "haute" | "moyenne" | "faible";
}

const SYSTEM_PROMPT = `Tu es un expert en optimisation financière pour les PME suisses (10–200 employés).
Tu reçois une liste de fuites financières détectées dans les dépenses d'une entreprise.
Pour chaque fuite, tu fournis en JSON une analyse enrichie avec :
- "enrichedDescription": description précise et actionnable en français (2-3 phrases, vouvoiement)
- "actionItems": tableau de 2-3 actions concrètes et spécifiques pour résoudre le problème
- "timeToFix": estimation du temps pour résoudre ("5 minutes", "30 minutes", "1 heure", "quelques heures", "1 semaine")
- "savingsConfidence": niveau de confiance dans l'estimation d'économies ("haute", "moyenne", "faible")

Contexte : Suisse romande, montants en CHF, entreprises de services ou industrie légère.
Soyez précis sur les fournisseurs mentionnés et les démarches suisses.
Répondez UNIQUEMENT avec un JSON valide : {"leaks": [...]}`;

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 503 });
  }

  let leaks: LeakInput[];
  try {
    const body = await request.json() as { leaks: LeakInput[] };
    leaks = body.leaks;
    if (!Array.isArray(leaks) || leaks.length === 0) {
      return NextResponse.json({ error: "No leaks provided" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const leaksForClaude = leaks.map((l, i) => ({
    index: i,
    type: l.type,
    title: l.title,
    description: l.description,
    amount_chf_monthly: Math.round(l.amount),
    priority: l.priority,
    vendor: l.vendor,
    transaction_count: l.transactionCount,
  }));

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `Analyse ces ${leaks.length} fuites financières détectées :\n\n${JSON.stringify(leaksForClaude, null, 2)}\n\nRéponds UNIQUEMENT avec le JSON demandé.`,
        },
      ],
    });

    const raw = message.content[0]?.type === "text" ? message.content[0].text : "";

    // Extract JSON even if Claude adds surrounding text
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Invalid response from Claude" }, { status: 502 });
    }

    const parsed = JSON.parse(jsonMatch[0]) as { leaks: EnrichedLeak[] };
    return NextResponse.json({ leaks: parsed.leaks });
  } catch (err) {
    console.error("Claude analysis error:", err);
    return NextResponse.json({ error: "Claude analysis failed" }, { status: 502 });
  }
}
