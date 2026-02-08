import { supabase } from "@/integrations/supabase/client";
import { StructuredUserModel } from "@/pages/api/generateUserModel";
import { StructuredClothingModel } from "@/pages/api/generateClothingModel";

interface VirtualTryOnData {
  personImage: string;
  clothingDescription: string;
  clothingImage?: string;
  userModel?: StructuredUserModel | null;
  clothingModel?: StructuredClothingModel | null;
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
      clothingDescription: data.clothingDescription,
      hasUserModel: !!data.userModel,
      hasClothingModel: !!data.clothingModel
    });

    const { data: result, error } = await supabase.functions.invoke("virtual-tryon", {
      body: {
        personImage: data.personImage,
        clothingDescription: data.clothingDescription,
        clothingImage: data.clothingImage,
        userModel: data.userModel ? {
          skinTone: data.userModel.skinTone,
          bodyShape: data.userModel.bodyShape,
          heightCm: data.userModel.heightCm,
          ethnicity: data.userModel.ethnicity
        } : undefined,
        clothingModel: data.clothingModel ? {
          category: data.clothingModel.category,
          color: data.clothingModel.color,
          pattern: data.clothingModel.pattern,
          material: data.clothingModel.material,
          fit: data.clothingModel.fit,
          style: data.clothingModel.style
        } : undefined
      },
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