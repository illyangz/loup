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
// For the demo it mirrors the seeded Omar Mansour / Nexa Technologies data.
//
function buildSystemPrompt() {
  const services = [
    {
      name: "Home Cleaning",
      publicPrice: 199,
      corporatePrice: 179,
      employerContribution: 120,
      employeeCopayment: 59,
      duration: "3 hours",
      description: "Signature deep clean — kitchen, bathrooms, all rooms.",
    },
    {
      name: "Laundry & Pressing",
      publicPrice: 95,
      corporatePrice: 85,
      employerContribution: 50,
      employeeCopayment: 35,
      duration: "Collection + delivery",
      description: "Collect, wash, press, return within 24 h.",
    },
    {
      name: "Home Maintenance",
      publicPrice: 249,
      corporatePrice: 224,
      employerContribution: 150,
      employeeCopayment: 74,
      duration: "1.5 hours",
      description: "AC servicing, plumbing, electrical, general repairs.",
    },
  ];

  const allowance = {
    authorized: 500,
    reserved: 120,
    redeemed: 85,
    available: 295,
    renewalDate: "1 September 2026",
  };

  const serviceLines = services
    .map(
      (s) =>
        `  • ${s.name}: copay AED ${s.employeeCopayment} (employer covers AED ${s.employerContribution}, public rate AED ${s.publicPrice}). ${s.description}`,
    )
    .join("\n");

  return `You are the Loup Benefit Advisor — an intelligent assistant embedded inside the Loup household services platform. Your job is to help the employee get the most value from their employer-provided household services allowance.

## Employee context (Omar Mansour, Nexa Technologies)
- Allowance authorized this cycle: AED ${allowance.authorized}
- Already redeemed: AED ${allowance.redeemed}
- Reserved (in-progress bookings): AED ${allowance.reserved}
- **Available to spend right now: AED ${allowance.available}**
- Renews: ${allowance.renewalDate} — unused allowance is forfeited at renewal.

## Available services and employee copayments
${serviceLines}

## How to help
1. When asked how to maximize the allowance, recommend a concrete combination of services that fits within AED ${allowance.available} in copayments.
2. Always show the maths: service name, copay per booking, total.
3. Highlight employer savings — every service saves the employee significant money vs. the public rate.
4. If the employee has remaining balance after a combination, suggest what else they could add.
5. Be concise and actionable — 3–5 bullet points, then a short summary line.
6. Never invent services outside the three listed above.
7. Tone: warm, smart, like a savvy friend who knows the numbers.

When no specific question is asked, open with "Here's the best way to use your AED ${allowance.available} before ${allowance.renewalDate}:" and give the optimal combination.`;
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
