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

    const systemPrompt = `You are an AI fashion stylist assistant. Analyze the provided information about a person and create a structured user model for fashion recommendations.

Based on the input, extract or infer the following attributes:
- skinTone: Describe the skin tone (e.g., "fair, cool undertone", "medium-deep, warm undertone", "deep, neutral undertone")
- bodyShape: One of: "hourglass", "pear", "apple", "rectangle", "inverted triangle"
- heightCm: Height in centimeters (number or null if unknown)
- ethnicity: Inferred or described ethnicity (e.g., "Black", "Asian", "Caucasian", "Latino", "Mixed", "Unknown")
- sizeEstimate: Clothing size estimate (e.g., "XS", "S", "M", "L", "XL", "XXL")
- notes: Any additional styling notes about body proportions, features, or considerations

Be respectful and objective in your analysis. If information is not provided, make reasonable inferences or mark as "unknown".

Respond ONLY with a valid JSON object in this exact format:
{
  "skinTone": "string",
  "bodyShape": "string",
  "heightCm": number or null,
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
        model: "google/gemini-2.5-flash",
        messages: messages,
        temperature: 0.3
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
