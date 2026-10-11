const SYSTEM_PROMPT = `You are a Nigerian campus content writer. You write WhatsApp and social media content for Nigerian university students. Your writing is:

- Casual, direct, and relatable to Nigerian students
- Uses light Pidgin English where it fits naturally (e.g., "no dull", "this one sweet", "sharp sharp")
- Never sounds like a corporate advertisement
- Never uses phrases like "In today's fast-paced world", "Elevate your", "Unlock the power of", "Discover the ultimate"
- Leads with a hook, not a description
- Short sentences. Line breaks. Emojis used sparingly but effectively.
- Speaks to the customer's real problem, not the seller's product features
- Never invents prices or details that were not provided
- Never uses hashtags unless specifically asked`;

const SELLER_PROMPT = `Generate the following for a Nigerian student seller:

SELLER INFO:
- What they sell: {product}
- Price: {price}
- Who their customer is: {audience}
- Tone: {tone}

OUTPUT NEEDED:
1. FIVE WhatsApp status captions. Each must be 1-3 lines maximum. Each must start with a hook that stops scrolling. Each must end with a call to action.
2. FIVE campus group post captions. These can be slightly longer (3-5 lines). They must sound like a real person posting in a group, not an advert. Include price and how to order.
3. THREE DM follow-up messages. These are for when someone showed interest but didn't buy.

RULES:
- Do not invent any details not given above
- Do not use hashtags
- Do not use corporate language

Format the output as:

STATUS POSTS:
1. [post]
2. [post]

GROUP POSTS:
1. [post]

DM FOLLOW-UPS:
1. [message]`;

const CREATOR_PROMPT = `Generate the following for a Nigerian content creator:

CREATOR INFO:
- Niche: {niche}
- What their content is about: {topic}
- Platform focus: {platform}
- Tone: {tone}

OUTPUT NEEDED:
1. FIVE video hooks (first 3 seconds of a video).
2. FIVE full short-form scripts (30-60 seconds), each with Hook, Body, CTA.
3. FIVE captions with relevant hashtags.
4. THREE posting time suggestions for Nigerian audiences.

RULES:
- Do not use generic openings like "Hey guys, welcome back"
- Write like a Nigerian creator talking to Nigerian viewers

Format the output as:

HOOKS:
1. [hook]

SCRIPTS:
SCRIPT 1:
Hook: [hook]
Body: [body]
CTA: [cta]

CAPTIONS:
1. [caption]

POSTING TIMES:
1. [time] - [reason]`;

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  try {
    const payload = JSON.parse(event.body);
    const { type, tone } = payload;

    let filledPrompt;

    if (type === "seller") {
      filledPrompt = SELLER_PROMPT
        .replace("{product}", payload.product || "not specified")
        .replace("{price}", payload.price || "not specified")
        .replace("{audience}", payload.audience || "not specified")
        .replace("{tone}", tone || "Casual");
    } else {
      filledPrompt = CREATOR_PROMPT
        .replace("{niche}", payload.niche || "not specified")
        .replace("{topic}", payload.topic || "not specified")
        .replace("{platform}", payload.platform || "all three")
        .replace("{tone}", tone || "Casual");
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "API key not configured in Netlify" })
      };
    }

    const model = "gemini-2.0-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: SYSTEM_PROMPT + "\n\n" + filledPrompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 2048
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Gemini says: " + errorText.substring(0, 400)
        })
      };
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Gemini returned no text. Full response: " + JSON.stringify(data).substring(0, 400)
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ content: generatedText })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Function error: " + error.message })
    };
  }
};
