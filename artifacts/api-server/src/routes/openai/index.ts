import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, conversations, aiMessages } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import {
  CreateOpenaiConversationBody,
  SendOpenaiMessageBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

// ─── Loup benefit advisor system prompt ─────────────────────────────────────
//
// Injected on every request so the AI always has live allowance context.
// In a real deployment this data would be fetched per-authenticated-user.
// For the demo it mirrors the seeded Omar Mansour / Meridian Education Group data.
//
function buildSystemPrompt() {
  const categories = [
    { name: "Household & Life Admin",     examples: "home cleaning, laundry, AC repair",                       startingFrom: 85  },
    { name: "Personal Wellbeing",         examples: "beauty, nursing, IV therapy",                              startingFrom: 120 },
    { name: "Fitness & Recovery",         examples: "physio, personal training, yoga",                          startingFrom: 150 },
    { name: "Mobility & Convenience",     examples: "grocery runs, errands, pharmacy",                          startingFrom: 49  },
    { name: "Family & Dependent Support", examples: "babysitting, school pickups, elder companionship",         startingFrom: 99  },
    { name: "Personal Development",       examples: "private tutoring, language coaching, mentoring",           startingFrom: 120 },
    { name: "Recreation & Lifestyle",     examples: "cooking classes, food photography workshops, experiences", startingFrom: 175 },
  ];

  const allowance = {
    authorized: 750,
    reserved: 249,
    redeemed: 85,
    available: 416,
    renewalDate: "1 September 2026",
    tier: "Faculty",
    institution: "Meridian Education Group",
  };

  const categoryLines = categories
    .map((c) => `  • ${c.name} — from AED ${c.startingFrom} (e.g. ${c.examples})`)
    .join("\n");

  return `You are the Loup Benefit Advisor — an intelligent concierge embedded in the Loup employee lifestyle platform. Your job is to help the employee get the most value from their institution-provided monthly benefit allowance.

## Employee context (Omar Mansour, ${allowance.institution} — ${allowance.tier} tier)
- Allowance authorized this cycle: AED ${allowance.authorized}
- Already redeemed: AED ${allowance.redeemed}
- Reserved (active bookings): AED ${allowance.reserved}
- **Available to spend right now: AED ${allowance.available}**
- Renews: ${allowance.renewalDate} — unused allowance is forfeited at renewal, so use it before the month ends.

## Eligible service categories and starting prices
${categoryLines}

## How to help
1. When asked how to maximize the allowance, recommend a concrete mix of services that fits within AED ${allowance.available}.
2. Always show the maths: category, service example, estimated cost, running total.
3. Highlight the benefit: each booking is paid from the AED 750 allowance — the employee pays nothing extra unless they exceed it.
4. If balance remains after a combination, suggest what else they could add.
5. Be concise and actionable — 3–5 bullet points, then a short summary.
6. Never invent service categories beyond the seven listed above.
7. Tone: warm, smart, like a knowledgeable friend who knows Dubai and cares about the employee's wellbeing.

When no specific question is asked, open with "Here is the best way to use your AED ${allowance.available} before ${allowance.renewalDate}:" and give an optimal combination.`;
}

// ─── Routes ──────────────────────────────────────────────────────────────────

router.get("/openai/conversations", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(conversations)
    .orderBy(conversations.createdAt);
  res.json(rows);
});

router.post("/openai/conversations", async (req, res): Promise<void> => {
  const body = CreateOpenaiConversationBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const [row] = await db
    .insert(conversations)
    .values({ title: body.data.title })
    .returning();
  res.status(201).json(row);
});

router.get("/openai/conversations/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id));
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const msgs = await db
    .select()
    .from(aiMessages)
    .where(eq(aiMessages.conversationId, id))
    .orderBy(aiMessages.createdAt);
  res.json({ ...conv, messages: msgs });
});

router.post(
  "/openai/conversations/:id/messages",
  async (req, res): Promise<void> => {
    const id = Number(req.params.id);
    const body = SendOpenaiMessageBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }

    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    // Persist the user message
    await db.insert(aiMessages).values({
      conversationId: id,
      role: "user",
      content: body.data.content,
    });

    // Load history for multi-turn context
    const history = await db
      .select()
      .from(aiMessages)
      .where(eq(aiMessages.conversationId, id))
      .orderBy(aiMessages.createdAt);

    const chatMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: buildSystemPrompt() },
      ...history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let fullResponse = "";

    try {
      const stream = await openai.chat.completions.create({
        model: "gpt-5.6-luna",
        max_completion_tokens: 8192,
        messages: chatMessages,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      // Persist the assistant reply
      await db.insert(aiMessages).values({
        conversationId: id,
        role: "assistant",
        content: fullResponse,
      });

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (err) {
      req.log.error(err, "OpenAI streaming error");
      res.write(`data: ${JSON.stringify({ error: "AI response failed" })}\n\n`);
      res.end();
    }
  },
);

export default router;
