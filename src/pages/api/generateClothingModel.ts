import { supabase } from "@/integrations/supabase/client";

interface ClothingModelData {
  clothingImage: string | null;
  clothingDescription: string;
}

export interface StructuredClothingModel {
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

interface GeneratedResult {
  success: boolean;
  error?: string;
  clothingModel?: StructuredClothingModel;
}

export const generateClothingModel = async (data: ClothingModelData): Promise<GeneratedResult> => {
  try {
    console.log("Calling analyze-clothing edge function with data:", {
      hasClothingImage: !!data.clothingImage,
      clothingDescription: data.clothingDescription,
    });

    const { data: result, error } = await supabase.functions.invoke("analyze-clothing", {
      body: data,
    });

    if (error) {
      console.error("Edge function error:", error);
      return {
        success: false,
        error: error.message || "Failed to analyze clothing",
      };
    }

    console.log("Edge function response:", result);

    if (!result.success) {
      return {
        success: false,
        error: result.error || "Analysis failed",
      };
    }

    return {
      success: true,
      clothingModel: result.clothingModel,
    };
  } catch (error) {
    console.error("Error generating clothing model:", error);
    return {
      success: false,
      error: "Failed to connect to backend",
    };
  }
};
