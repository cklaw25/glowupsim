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
