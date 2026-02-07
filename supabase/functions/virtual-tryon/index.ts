const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface TryOnRequest {
  personImage: string;
  clothingDescription: string;
  clothingImage?: string;
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
      clothingDescription: data.clothingDescription
    });

    const FAL_KEY = Deno.env.get("FAL_KEY");
    if (!FAL_KEY) {
      throw new Error("FAL_KEY not configured");
    }

    if (!data.personImage) {
      throw new Error("Person image is required for virtual try-on");
    }

    // Build the prompt for fal.ai
    let prompt = `A photorealistic image of the exact same person wearing ${data.clothingDescription}. `;
    prompt += "Preserve the person's face, body proportions, skin tone, and all physical features exactly. ";
    prompt += "Only change the clothing. High quality, professional fashion photography style.";

    console.log("Using prompt:", prompt);

    // Use fal.ai's synchronous API endpoint (not the queue endpoint)
    // Using fal.run instead of queue.fal.run for immediate results
    const response = await fetch("https://fal.run/fal-ai/flux/dev/image-to-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Key ${FAL_KEY}`
      },
      body: JSON.stringify({
        image_url: data.personImage,
        prompt: prompt,
        strength: 0.65, // Keep person's features but allow clothing change
        num_inference_steps: 28,
        guidance_scale: 7.5,
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

    console.log("Successfully generated virtual try-on image");

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
