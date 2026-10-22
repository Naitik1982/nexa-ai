const express = require("express");
const path = require("path");
const OpenAI = require("openai");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/api/chat", async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(503).json({
        error: "Nexa AI is not connected yet. Please try again later."
      });
    }

    const message = req.body.message;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "Please enter a message."
      });
    }

    const client = new OpenAI({ apiKey });

    const response = await client.responses.create({
      model: "gpt-5-mini",
      input: message
    });

    res.json({
      reply: response.output_text
    });
  } catch (error) {
    console.error("Chat error:", error.message);

    res.status(500).json({
      error: "Unable to get an AI response. Please try again."
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Nexa AI running on port ${PORT}`);
});
