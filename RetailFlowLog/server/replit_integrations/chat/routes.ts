import type { Express, Response } from "express";
import OpenAI from "openai";
import { chatStorage } from "./storage";
import { isAuthenticated } from "../../replitAuth";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export function registerChatRoutes(app: Express): void {
  // Get all conversations
  app.get("/api/conversations", isAuthenticated, async (req: any, res: Response) => {
    try {
      const conversations = await chatStorage.getAllConversations(req.userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // Get single conversation with messages
  app.get("/api/conversations/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const conversation = await chatStorage.getConversation(id, req.userId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      const messages = await chatStorage.getMessagesByConversation(id, req.userId);
      res.json({ ...conversation, messages });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  // Create new conversation
  app.post("/api/conversations", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { title } = req.body;
      const conversation = await chatStorage.createConversation(title || "New Chat", req.userId);
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  // Delete conversation
  app.delete("/api/conversations/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await chatStorage.deleteConversation(id, req.userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  // Send message and get AI response (streaming)
  app.post("/api/conversations/:id/messages", isAuthenticated, async (req: any, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { content, context } = req.body;

      // Verify conversation ownership first
      const conversation = await chatStorage.getConversation(conversationId, req.userId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      // Save user message
      await chatStorage.createMessage(conversationId, "user", content);

      // Get conversation history for context
      const messages = await chatStorage.getMessagesByConversation(conversationId, req.userId);
      const chatMessages = messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      // Set up SSE
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      // Stream response from OpenAI
      const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are "Your Ayurvedic Dietician", a personalized AI assistant.
Your context:
- Dosha: ${context?.dosha || "Unknown"}
- Health Goal: ${context?.goal || "General Wellness"}
- Recommended Foods: ${JSON.stringify(context?.foods?.recommended || [])}
- Good Foods: ${JSON.stringify(context?.foods?.good || [])}
- Neutral Foods: ${JSON.stringify(context?.foods?.neutral || [])}
- Caution Foods: ${JSON.stringify(context?.foods?.caution || [])}
- Avoid Foods: ${JSON.stringify(context?.foods?.avoid || [])}

Strict Guidelines:
1. Only recommend foods from the "Recommended", "Good", or "Neutral" lists.
2. NEVER suggest foods from the "Avoid" list.
3. Explain WHY specific foods are good or bad based on the user's dosha.
4. Reference the user's specific food list in your responses.
5. Provide practical Indian meal suggestions (Breakfast, Lunch, Dinner).
6. Offer spice recommendations and cooking methods suitable for the dosha.
7. Suggest substitutions using only the allowed foods.`
          },
          ...chatMessages
        ],
        stream: true,
        max_completion_tokens: 8192,
      });

      let fullResponse = "";

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      // Save assistant message
      await chatStorage.createMessage(conversationId, "assistant", fullResponse);

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error sending message:", error);
      // Check if headers already sent (SSE streaming started)
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Failed to send message" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to send message" });
      }
    }
  });
}

