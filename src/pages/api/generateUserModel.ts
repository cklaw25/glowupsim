import { supabase } from "@/integrations/supabase/client";

interface UserModelData {
  personImage: string | null;
  personDescription: string;
  clothingImage: string | null;
  clothingDescription: string;
  height?: string;
  bodyShape?: string;
}

export interface StructuredUserModel {
  hasPhoto: boolean;
  skinTone: string;
  bodyShape: string;
  heightCm: number | null;
  ethnicity: string;
  sizeEstimate: string;
  notes: string;
}

interface GeneratedResult {
  success: boolean;
  error?: string;
  userModel?: StructuredUserModel;
}

export const generateUserModel = async (data: UserModelData): Promise<GeneratedResult> => {
  try {
    console.log("Calling analyze-user edge function with data:", {
      hasPersonImage: !!data.personImage,
      personDescription: data.personDescription,
      hasClothingImage: !!data.clothingImage,
      clothingDescription: data.clothingDescription,
      height: data.height,
      bodyShape: data.bodyShape
    });

    const { data: result, error } = await supabase.functions.invoke("analyze-user", {
      body: data,
    });

    if (error) {
      console.error("Edge function error:", error);
      return {
        success: false,
        error: error.message || "Failed to analyze user",
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
      userModel: result.userModel,
    };
  } catch (error) {
    console.error("Error generating user model:", error);
    return {
      success: false,
      error: "Failed to connect to backend",
    };
  }
};
