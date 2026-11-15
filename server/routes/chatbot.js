const express = require("express");
const router = express.Router();
const { GoogleGenAI } = require("@google/genai");
const Item = require("../models/Item");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

router.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        reply: "Please enter a message.",
      });
    }

    // Retrieve actual CampusLoop reports
    const items = await Item.find().sort({ createdAt: -1 }).limit(100).lean();

    // Keep only useful public report information
    const reports = items.map((item) => ({
      title: item.title,
      description: item.description,
      category: item.category,
      type: item.type,
      location: item.location,
      status: item.status,
      createdAt: item.createdAt,
    }));

    const prompt = `
You are CampusLoop Assistant, a helpful assistant for a college Lost and Found platform.

Your responsibilities:
1. Help students search for lost and found items.
2. Show all relevant possible matching reports.
3. Tell the user where an item was found, if available.
4. Clearly say when no matching found report exists.
5. Answer simple questions about reporting lost/found items and claiming belongings.
6. Be polite, simple and concise.

Important rules:
- Use only the supplied CampusLoop report data for item availability and locations.
- Never invent an item, location, report, or match.
- Do not expose contact information or private claim details.
- Treat similarity as a possible match, not confirmed ownership.
- If no matching report exists, explain that clearly.

CampusLoop reports:
${JSON.stringify(reports, null, 2)}

Student's question:
${message}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    res.json({
      reply: response.text,
    });
  } catch (error) {
    console.error("Chatbot error:", error);

    res.status(500).json({
      reply: "Sorry, the CampusLoop assistant is temporarily unavailable.",
    });
  }
});

module.exports = router;
