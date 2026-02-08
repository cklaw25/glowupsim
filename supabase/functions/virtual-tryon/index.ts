const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface TryOnRequest {
  personImage: string;
  clothingDescription: string;
  clothingImage?: string;
  userModel?: {
    skinTone?: string;
    bodyShape?: string;
    heightCm?: number;
    ethnicity?: string;
  };
  clothingModel?: {
    category?: string;
    color?: string;
    pattern?: string;
    material?: string;
    fit?: string;
    style?: string;
  };
}

interface TryOnResponse {
  success: boolean;
  generatedImage?: string;
  error?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const data: TryOnRequest = await req.json();
    console.log("Received virtual try-on request:", {
      hasPersonImage: !!data.personImage,
      hasClothingImage: !!data.clothingImage,
      clothingDescription: data.clothingDescription,
      hasUserModel: !!data.userModel,
      hasClothingModel: !!data.clothingModel
    });

    const FAL_KEY = Deno.env.get("FAL_KEY");
    if (!FAL_KEY) {
      throw new Error("FAL_KEY not configured");
    }

    if (!data.personImage) {
      throw new Error("Person image is required for virtual try-on");
    }

    // Build a detailed prompt for better face/body preservation
    let prompt = "An ultra-realistic photograph of the EXACT SAME person in the reference image. ";
    
    // Add user model details if available for better preservation
    if (data.userModel) {
      if (data.userModel.skinTone) {
        prompt += `The person has ${data.userModel.skinTone} skin tone. `;
      }
      if (data.userModel.bodyShape) {
        prompt += `They have a ${data.userModel.bodyShape} body shape. `;
      }
      if (data.userModel.ethnicity) {
        prompt += `Their ethnicity appears to be ${data.userModel.ethnicity}. `;
      }
    }

    // Add clothing details
    prompt += `They are now wearing: ${data.clothingDescription}. `;
    
    // Add clothing model details if available for more accurate clothing rendering
    if (data.clothingModel) {
      const clothingDetails: string[] = [];
      if (data.clothingModel.color) clothingDetails.push(`${data.clothingModel.color} color`);
      if (data.clothingModel.material) clothingDetails.push(`made of ${data.clothingModel.material}`);
      if (data.clothingModel.pattern && data.clothingModel.pattern !== "solid") {
        clothingDetails.push(`with ${data.clothingModel.pattern} pattern`);
      }
      if (data.clothingModel.fit) clothingDetails.push(`${data.clothingModel.fit} fit`);
      
      if (clothingDetails.length > 0) {
        prompt += `The clothing is ${clothingDetails.join(", ")}. `;
      }
    }

    // Critical face preservation instructions
    prompt += "CRITICAL: The person's face must be IDENTICAL to the original - same facial features, same expression, same eyes, nose, mouth, facial structure, and skin texture. ";
    prompt += "Only the clothing should change. Maintain the exact same body proportions, pose, and background. ";
    prompt += "Professional fashion photography, natural lighting, high resolution, photorealistic quality.";

    console.log("Using enhanced prompt:", prompt);

    // Use fal.ai's synchronous API endpoint with optimized settings for face preservation
    const response = await fetch("https://fal.run/fal-ai/flux/dev/image-to-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Key ${FAL_KEY}`
      },
      body: JSON.stringify({
        image_url: data.personImage,
        prompt: prompt,
        strength: 0.55, // Lower strength for better face preservation
        num_inference_steps: 35, // More steps for better quality
        guidance_scale: 8.5, // Higher guidance for prompt adherence
        image_size: "landscape_4_3"
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("fal.ai API error:", response.status, errorText);
      throw new Error(`fal.ai API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log("fal.ai response:", JSON.stringify(result, null, 2));

    // Extract the generated image URL
    const generatedImageUrl = result.images?.[0]?.url;
    
    if (!generatedImageUrl) {
      throw new Error("No image generated from fal.ai");
    }

    // Fetch the image and convert to base64 for frontend display
    const imageResponse = await fetch(generatedImageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
    const dataUrl = `data:image/png;base64,${base64Image}`;

    console.log("Successfully generated virtual try-on image with face preservation");

    return new Response(
      JSON.stringify({ 
        success: true, 
        generatedImage: dataUrl 
      } as TryOnResponse),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in virtual-tryon function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Failed to generate virtual try-on" 
      } as TryOnResponse),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});