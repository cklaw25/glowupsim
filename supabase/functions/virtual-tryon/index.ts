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

    let response;

    // If we have a clothing image, use the dedicated virtual try-on model
    if (data.clothingImage) {
      console.log("Using IDM-VTON model with clothing image");
      
      response = await fetch("https://fal.run/fal-ai/idm-vton", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Key ${FAL_KEY}`
        },
        body: JSON.stringify({
          human_image_url: data.personImage,
          garment_image_url: data.clothingImage,
          description: data.clothingDescription || "clothing item"
        })
      });
    } else {
      // Fall back to image-to-image with text prompt only
      console.log("Using image-to-image model with text description only");
      
      let prompt = "TRANSFORM THE OUTFIT: Keep the exact same person, face, hair, and pose but COMPLETELY CHANGE their clothing to: ";
      prompt += data.clothingDescription + ". ";
      
      if (data.clothingModel) {
        const clothingDetails: string[] = [];
        if (data.clothingModel.color) clothingDetails.push(`${data.clothingModel.color} colored`);
        if (data.clothingModel.material) clothingDetails.push(`made of ${data.clothingModel.material}`);
        if (data.clothingModel.pattern && data.clothingModel.pattern !== "solid") {
          clothingDetails.push(`with ${data.clothingModel.pattern} pattern`);
        }
        if (data.clothingModel.fit) clothingDetails.push(`${data.clothingModel.fit} fit`);
        if (data.clothingModel.style) clothingDetails.push(`${data.clothingModel.style} style`);
        
        if (clothingDetails.length > 0) {
          prompt += `The new outfit should be ${clothingDetails.join(", ")}. `;
        }
      }

      if (data.userModel) {
        if (data.userModel.skinTone) {
          prompt += `The person has ${data.userModel.skinTone} skin. `;
        }
        if (data.userModel.ethnicity) {
          prompt += `They appear to be ${data.userModel.ethnicity}. `;
        }
      }

      prompt += "IMPORTANT: The person's face, hair, and body shape must remain IDENTICAL. ";
      prompt += "ONLY the clothing should be replaced with the new outfit described. ";
      prompt += "Remove ALL original clothing and dress them in the NEW outfit. ";
      prompt += "Professional fashion photography, studio lighting, high resolution.";

      console.log("Using text-only prompt:", prompt);

      response = await fetch("https://fal.run/fal-ai/flux/dev/image-to-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Key ${FAL_KEY}`
        },
        body: JSON.stringify({
          image_url: data.personImage,
          prompt: prompt,
          strength: 0.78,
          num_inference_steps: 40,
          guidance_scale: 9.5,
          image_size: "landscape_4_3"
        })
      });
    }

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