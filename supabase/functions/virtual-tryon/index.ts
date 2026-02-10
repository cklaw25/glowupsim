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

    let response;

    if (data.personImage && data.clothingImage) {
      // Path 1: Both images - use IDM-VTON for garment transfer
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
    } else if (data.personImage) {
      // Path 2: Person image + text description - use image-to-image
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
        if (data.userModel.skinTone) prompt += `The person has ${data.userModel.skinTone} skin. `;
        if (data.userModel.ethnicity) prompt += `They appear to be ${data.userModel.ethnicity}. `;
      }

      prompt += "IMPORTANT: The person's face, hair, and body shape must remain IDENTICAL. ";
      prompt += "ONLY the clothing should be replaced. Professional fashion photography, high resolution.";

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
    } else {
      // Path 3: Text-only (no person image) - use text-to-image generation
      console.log("Using text-to-image model with descriptions only");
      
      let prompt = "A professional fashion photography portrait of a person wearing: ";
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
          prompt += `The outfit is ${clothingDetails.join(", ")}. `;
        }
      }

      if (data.userModel) {
        if (data.userModel.skinTone) prompt += `The person has ${data.userModel.skinTone} skin tone. `;
        if (data.userModel.bodyShape) prompt += `They have a ${data.userModel.bodyShape} body shape. `;
        if (data.userModel.ethnicity) prompt += `They appear to be ${data.userModel.ethnicity}. `;
        if (data.userModel.heightCm) prompt += `They are approximately ${data.userModel.heightCm}cm tall. `;
      }

      prompt += "Full body shot, studio lighting, high resolution, realistic.";

      response = await fetch("https://fal.run/fal-ai/flux/dev", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Key ${FAL_KEY}`
        },
        body: JSON.stringify({
          prompt: prompt,
          num_inference_steps: 40,
          guidance_scale: 7.5,
          image_size: "portrait_4_3"
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

    // Extract the generated image URL - IDM-VTON returns result.image.url, flux returns result.images[0].url
    const generatedImageUrl = result.image?.url || result.images?.[0]?.url;
    
    if (!generatedImageUrl) {
      throw new Error("No image generated from fal.ai");
    }

    // Fetch the image and convert to base64 for frontend display
    const imageResponse = await fetch(generatedImageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    
    // Convert to base64 in chunks to avoid stack overflow with large images
    const uint8Array = new Uint8Array(imageBuffer);
    let binaryString = '';
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      binaryString += String.fromCharCode.apply(null, Array.from(chunk));
    }
    const base64Image = btoa(binaryString);
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