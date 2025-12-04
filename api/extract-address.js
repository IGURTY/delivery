import express from "express";
import axios from "axios";

const router = express.Router();

router.post("/", async (req, res) => {
  const { imageBase64 } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ error: "Imagem não enviada" });
  }

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Extraia o endereço da imagem. Responda apenas com o endereço, sem explicações." },
              { type: "image_url", image_url: { url: imageBase64 } },
            ],
          },
        ],
        max_tokens: 100,
      },
      {
        headers: {
          Authorization: `Bearer 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`,
          "Content-Type": "application/json",
        },
      }
    );
    const address = response.data.choices[0].message.content.trim();
    res.json({ address });
  } catch (err) {
    res.status(500).json({ error: "Erro ao extrair endereço" });
  }
});

export default router;