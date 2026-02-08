const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ClothingModelData {
  clothingImage: string | null;
  clothingDescription: string;
}

interface StructuredClothingModel {
  hasImage: boolean;
  category: string;
  color: string;
  pattern: string;
  material: string;
  fit: string;
  style: string;
  occasion: string;
  notes: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const data: ClothingModelData = await req.json();
    console.log("Received clothing data:", JSON.stringify(data, null, 2));

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Build the prompt for AI analysis
    const promptParts: string[] = [];
    
    if (data.clothingImage) {
      promptParts.push("I have provided an image of the clothing item.");
    }
    
    if (data.clothingDescription) {
      promptParts.push(`Clothing description: ${data.clothingDescription}`);
    }

    const systemPrompt = `You are an expert AI fashion analyst specializing in clothing analysis. Your task is to analyze the provided clothing information and create a comprehensive clothing profile.

CRITICAL INSTRUCTION: NEVER return "unknown" or null values unless absolutely impossible to estimate. Use all available context clues, fashion knowledge, and logical inference to provide your best estimate for EVERY field.

For each attribute, follow these analysis rules:

- category: The type of clothing item. Must be one of: "top", "bottom", "dress", "outerwear", "footwear", "accessory", "swimwear", "activewear", "formal", "underwear"

- color: Primary color(s) of the item. Include secondary colors if present. Examples: "navy blue", "black with white stripes", "burgundy and gold"

- pattern: The pattern on the fabric. Must be one of: "solid", "striped", "plaid", "floral", "geometric", "animal print", "paisley", "checkered", "abstract", "graphic"

- material: Best estimate of fabric/material. Examples: "cotton", "silk", "denim", "leather", "wool", "polyester blend", "linen", "cashmere"

- fit: How the item is designed to fit. Must be one of: "slim", "regular", "relaxed", "oversized", "fitted", "tailored", "loose"

- style: The fashion style category. Must be one of: "casual", "formal", "business casual", "streetwear", "bohemian", "minimalist", "vintage", "athletic", "preppy", "edgy"

- occasion: Best suited occasion(s). Examples: "everyday casual", "office wear", "date night", "formal event", "workout", "beach"

- notes: Provide helpful styling recommendations. Include what body types this would flatter, what to pair it with, and any care considerations.

Be confident in your analysis. Fashion experts work with visual and textual descriptions all the time.

Respond ONLY with a valid JSON object:
{
  "category": "string",
  "color": "string",
  "pattern": "string",
  "material": "string",
  "fit": "string",
  "style": "string",
  "occasion": "string",
  "notes": "string"
}`;

    const userMessage = promptParts.length > 0 
      ? promptParts.join("\n") 
      : "No specific details provided. Please return a generic clothing profile.";

    // Build messages array
    const messages: any[] = [
      { role: "system", content: systemPrompt }
    ];

    // If we have an image, include it in the message
    if (data.clothingImage && data.clothingImage.startsWith("data:image")) {
      messages.push({
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: data.clothingImage
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

    console.log("Calling Lovable AI Gateway for clothing analysis...");

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
    let structuredModel: Partial<StructuredClothingModel>;
    try {
      // Clean up the response in case it has markdown code blocks
      const cleanedContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      structuredModel = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse AI response as JSON");
    }

    const result: StructuredClothingModel = {
      hasImage: !!data.clothingImage,
      category: structuredModel.category || "unknown",
      color: structuredModel.color || "unknown",
      pattern: structuredModel.pattern || "solid",
      material: structuredModel.material || "unknown",
      fit: structuredModel.fit || "regular",
      style: structuredModel.style || "casual",
      occasion: structuredModel.occasion || "everyday",
      notes: structuredModel.notes || ""
    };

    console.log("Generated clothing model:", JSON.stringify(result, null, 2));

    return new Response(
      JSON.stringify({ success: true, clothingModel: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in analyze-clothing function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Failed to analyze clothing" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
