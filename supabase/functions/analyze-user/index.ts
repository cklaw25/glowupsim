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

    const systemPrompt = `You are an expert AI body and facial analyst. Your task is to analyze the provided information and create a comprehensive physical profile focusing ONLY on the person's body and facial features.

CRITICAL INSTRUCTION: 
1. NEVER return "unknown" or null values unless absolutely impossible to estimate.
2. DO NOT include ANY information about clothing, outfits, fashion, or what the person is wearing.
3. Focus ONLY on physical attributes: face, body structure, skin, build, and proportions.

For each attribute, follow these estimation rules:

- skinTone: Analyze the person's natural skin color and undertone. Always include undertone (warm/cool/neutral). Examples: "fair, cool undertone", "medium-olive, warm undertone", "deep-brown, neutral undertone", "light-medium, warm undertone"

- bodyShape: Analyze body proportions and structure. Must be one of: "hourglass", "pear", "apple", "rectangle", "inverted triangle"

- heightCm: Estimate based on:
  - Gender hints (average male ~175cm, female ~162cm)
  - Descriptors like "tall", "short", "petite", "average"
  - Visual proportions if image provided
  - ALWAYS provide a number, never null

- ethnicity: Infer from facial features, skin tone, and physical characteristics. If truly ambiguous, use "Mixed" or make your best educated guess.

- sizeEstimate: Estimate based on body frame, build, and proportions. Must be: "XS", "S", "M", "L", "XL", "XXL"

- notes: Describe ONLY physical characteristics - NO clothing or fashion advice. Include:
  - Facial features (face shape, eyes, hair color/texture if visible)
  - Body proportions and build (slim, athletic, curvy, broad shoulders, etc.)
  - Distinguishing physical features
  - Posture or stance observations
  DO NOT mention any clothing, outfits, or styling recommendations.

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

    const maxRetries = 3;
    let response: Response | null = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${LOVABLE_API_KEY}`
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: messages
        })
      });

      if (response.ok) break;

      const errorText = await response.text();
      console.error(`AI Gateway error (attempt ${attempt}/${maxRetries}):`, response.status, errorText);

      if (response.status === 429 || response.status === 402) {
        throw new Error(response.status === 429 ? "Rate limit exceeded, please try again later." : "Payment required, please add credits.");
      }

      if (attempt < maxRetries && (response.status >= 500)) {
        const delay = attempt * 2000;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      throw new Error(`AI Gateway error: ${response.status}`);
    }

    if (!response || !response.ok) {
      throw new Error("AI Gateway failed after retries");
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
