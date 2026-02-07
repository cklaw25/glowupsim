const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface UserModelData {
  personImage: string | null;
  personDescription: string;
  clothingImage: string | null;
  clothingDescription: string;
  height?: string;
  bodyShape?: string;
}

interface StructuredUserModel {
  hasPhoto: boolean;
  skinTone: string;
  bodyShape: string;
  heightCm: number | null;
  ethnicity: string;
  sizeEstimate: string;
  notes: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const data: UserModelData = await req.json();
    console.log("Received user data:", JSON.stringify(data, null, 2));

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Build the prompt for AI analysis
    const promptParts: string[] = [];
    
    if (data.personImage) {
      promptParts.push("I have provided an image of the person.");
    }
    
    if (data.personDescription) {
      promptParts.push(`Person description: ${data.personDescription}`);
    }
    
    if (data.height) {
      promptParts.push(`Height: ${data.height} cm`);
    }
    
    if (data.bodyShape) {
      promptParts.push(`Self-reported body shape: ${data.bodyShape}`);
    }

    const systemPrompt = `You are an expert AI fashion stylist and body analyst. Your task is to analyze the provided information and create a comprehensive user model for personalized fashion recommendations.

CRITICAL INSTRUCTION: NEVER return "unknown" or null values unless absolutely impossible to estimate. Use all available context clues, cultural patterns, statistical averages, and logical inference to provide your best estimate for EVERY field.

For each attribute, follow these estimation rules:

- skinTone: If not explicitly stated, infer from ethnicity hints, regional context, or common associations. Always include undertone (warm/cool/neutral). Examples: "fair, cool undertone", "medium-olive, warm undertone", "deep-brown, neutral undertone"

- bodyShape: If not described, use height, weight hints, or default to the most common body shape for the demographic. Must be one of: "hourglass", "pear", "apple", "rectangle", "inverted triangle"

- heightCm: If exact height not given, estimate based on:
  - Gender hints (average male ~175cm, female ~162cm)
  - Descriptors like "tall", "short", "petite", "average"
  - Regional/ethnic averages if ethnicity is known
  - ALWAYS provide a number, never null

- ethnicity: Infer from names, language, regional context, or physical descriptions. If truly ambiguous, use "Mixed" or make your best educated guess.

- sizeEstimate: Estimate based on body shape, height, build descriptors ("slim", "athletic", "curvy", "plus-size"). Consider height when estimating - taller people often wear larger sizes. Must be: "XS", "S", "M", "L", "XL", "XXL"

- notes: Provide helpful styling insights based on the estimated body type. Include recommendations for flattering silhouettes, proportions to balance, or features to highlight.

Be confident in your estimates. Fashion stylists work with incomplete information all the time - your educated guesses are valuable.

Respond ONLY with a valid JSON object:
{
  "skinTone": "string",
  "bodyShape": "string",
  "heightCm": number,
  "ethnicity": "string",
  "sizeEstimate": "string",
  "notes": "string"
}`;

    const userMessage = promptParts.length > 0 
      ? promptParts.join("\n") 
      : "No specific details provided. Please return a generic user model with 'unknown' values.";

    // Build messages array
    const messages: any[] = [
      { role: "system", content: systemPrompt }
    ];

    // If we have an image, include it in the message
    if (data.personImage && data.personImage.startsWith("data:image")) {
      messages.push({
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: data.personImage
            }
          },
          {
            type: "text",
            text: userMessage
          }
        ]
      });
    } else {
      messages.push({
        role: "user",
        content: userMessage
      });
    }

    console.log("Calling Lovable AI Gateway...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: messages
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log("AI Response:", JSON.stringify(aiResponse, null, 2));

    const content = aiResponse.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON response from AI
    let structuredModel: Partial<StructuredUserModel>;
    try {
      // Clean up the response in case it has markdown code blocks
      const cleanedContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      structuredModel = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse AI response as JSON");
    }

    const result: StructuredUserModel = {
      hasPhoto: !!data.personImage,
      skinTone: structuredModel.skinTone || "unknown",
      bodyShape: structuredModel.bodyShape || data.bodyShape || "unknown",
      heightCm: structuredModel.heightCm || (data.height ? parseInt(data.height) : null),
      ethnicity: structuredModel.ethnicity || "unknown",
      sizeEstimate: structuredModel.sizeEstimate || "unknown",
      notes: structuredModel.notes || ""
    };

    console.log("Generated user model:", JSON.stringify(result, null, 2));

    return new Response(
      JSON.stringify({ success: true, userModel: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in analyze-user function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Failed to analyze user" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
