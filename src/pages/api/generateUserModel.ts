// Generate user model for AI styling
// This file handles the creation of user model data for virtual try-on

export interface UserModelData {
  personImage?: string;
  personDescription?: string;
  height?: string;
  bodyShape?: string;
  clothingImage?: string;
  clothingDescription?: string;
}

export interface GeneratedResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

export const generateUserModel = async (data: UserModelData): Promise<GeneratedResult> => {
  try {
    const response = await fetch("/api/generateUserModel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error generating user model:", error);
    return {
      success: false,
      error: "Failed to connect to backend",
    };
  }
};
