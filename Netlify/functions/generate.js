// netlify/functions/generate.js

const SYSTEM_PROMPT = `You are a Nigerian campus content writer. You write WhatsApp and social media content for Nigerian university students. Your writing is:

- Casual, direct, and relatable to Nigerian students
- Uses light Pidgin English where it fits naturally (e.g., "no dull", "this one sweet", "sharp sharp")
- Never sounds like a corporate advertisement
- Never uses phrases like "In today's fast-paced world", "Elevate your", "Unlock the power of", "Discover the ultimate"
- Leads with a hook, not a description
- Short sentences. Line breaks. Emojis used sparingly but effectively.
- Speaks to the customer's real problem, not the seller's product features
- Never invents prices or details that were not provided
- Never uses hashtags unless specifically asked

When given a product, audience, and tone, you write content that a real Nigerian student would actually post on WhatsApp status or send in a campus group.`;

const SELLER_PROMPT = `Generate the following for a Nigerian student seller:

SELLER INFO:
- What they sell: {product}
- Price: {price}
- Who their customer is: {audience}
- Tone: {tone}

OUTPUT NEEDED:
1. FIVE WhatsApp status captions. Each must be 1-3 lines maximum. Each must start with a hook that stops scrolling. Each must end with a call to action (e.g., "DM me", "Slide into my DM", "Link in bio").
2. FIVE campus group post captions. These can be slightly longer (3-5 lines). They must sound like a real person posting in a group, not an advert. Include price and how to order.
3. THREE DM follow-up messages. These are for when someone showed interest but didn't buy. They must be polite, short, and create gentle urgency without being pushy.

RULES:
- Do not invent any details not given above
- Do not use hashtags
- Do not use corporate language
- If the price is provided, include it naturally in at least 3 of the group posts
- If the tone is "Funny", lean into Nigerian humour
- If the tone is "Urgent", create real scarcity (limited stock, today only, etc.) but do not lie
- If the tone is "Premium", be clean and aspirational without being fake

Format the output as:

STATUS POSTS:
1. [post]
2. [post]
...

GROUP POSTS:
1. [post]
...

DM FOLLOW-UPS:
1. [message]
...`;

const CREATOR_PROMPT = `Generate the following for a Nigerian content creator:

CREATOR INFO:
- Niche: {niche}
- What their content is about: {topic}
- Platform focus: {platform} (TikTok, YouTube, Instagram, or all three)
- Tone: {tone}

OUTPUT NEEDED:
1. FIVE video hooks. Each hook must be the first 3 seconds of a video. It must stop someone from scrolling. It must work for the specified platform. No generic "Hey guys" openings.
2. FIVE full short-form scripts (30-60 seconds). Each script must have:
   - Hook (first 3 seconds)
   - Body (the main content, 2-4 points)
   - Call to action (follow, comment, share, etc.)
3. FIVE Instagram/TikTok captions with relevant hashtags. Captions must match the tone and niche.
4. THREE posting time suggestions for Nigerian audiences (morning, afternoon, evening) with a one-line reason for each.

PLATFORM RULES:
- TikTok: Fast pace, punchy, trend-aware, hook must be extremely strong
- YouTube: Slightly more detailed, can be longer, SEO-friendly titles if relevant
- Instagram: Aesthetic, caption-driven, hashtag-friendly

RULES:
- Do not use generic openings like "Hey guys, welcome back"
- Do not use "In today's video"
- Write like a Nigerian creator talking to Nigerian viewers
- If the niche is comedy, the scripts must actually be funny
- If the niche is fitness, the scripts must give real actionable tips
- If the niche is fashion, the scripts must reference real style scenarios
- Never invent facts or statistics

Format the output as:

HOOKS:
1. [hook]
...

SCRIPTS:
SCRIPT 1:
Hook: [hook]
Body: [body]
CTA: [cta]
...

CAPTIONS:
1. [caption]
...

POSTING TIMES:
1. [time] - [reason]
...`;

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const payload = await req.json();
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
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const model = "gemini-2.5-flash-lite";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
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
          maxOutputTokens: 2048,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", errorText);
      return new Response(
        JSON.stringify({ error: "AI generation failed. Please try again." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      return new Response(
        JSON.stringify({ error: "No content generated. Please try again." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ content: generatedText }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ error: "Something went wrong. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
