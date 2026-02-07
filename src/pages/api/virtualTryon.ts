import { supabase } from "@/integrations/supabase/client";

interface VirtualTryOnData {
  personImage: string;
  clothingDescription: string;
  clothingImage?: string;
}

interface VirtualTryOnResult {
  success: boolean;
  generatedImage?: string;
  error?: string;
}

export const generateVirtualTryOn = async (data: VirtualTryOnData): Promise<VirtualTryOnResult> => {
  try {
    console.log("Calling virtual-tryon edge function with data:", {
      hasPersonImage: !!data.personImage,
      hasClothingImage: !!data.clothingImage,
      clothingDescription: data.clothingDescription
    });

    const { data: result, error } = await supabase.functions.invoke("virtual-tryon", {
      body: data,
    });

    if (error) {
      console.error("Edge function error:", error);
      return {
        success: false,
        error: error.message || "Failed to generate virtual try-on",
      };
    }

    console.log("Virtual try-on response:", result);

    if (!result.success) {
      return {
        success: false,
        error: result.error || "Virtual try-on failed",
      };
    }

    return {
      success: true,
      generatedImage: result.generatedImage,
    };
  } catch (error) {
    console.error("Error generating virtual try-on:", error);
    return {
      success: false,
      error: "Failed to connect to backend",
    };
  }
};
