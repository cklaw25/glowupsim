import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { UploadZone } from "@/components/UploadZone";
import { PreviewSection } from "@/components/PreviewSection";
import { UserModelCard } from "@/components/UserModelCard";
import { ClothingModelCard } from "@/components/ClothingModelCard";
import { toast } from "sonner";
import { generateUserModel } from "@/pages/api/generateUserModel.ts";
import { generateClothingModel } from "@/pages/api/generateClothingModel.ts";
import { generateVirtualTryOn } from "@/pages/api/virtualTryon.ts";
import { useUserModel } from "@/contexts/UserModelContext";
import { useClothingModel } from "@/contexts/ClothingModelContext";

const Index = () => {
  // Global models from context
  const { userModel, setUserModel } = useUserModel();
  const { clothingModel, setClothingModel } = useClothingModel();

  // Person state
  const [personImage, setPersonImage] = useState<string | null>(null);
  const [personDescription, setPersonDescription] = useState("");

  // Clothing state
  const [clothingImage, setClothingImage] = useState<string | null>(null);
  const [clothingDescription, setClothingDescription] = useState("");

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const [height, setHeight] = useState("");
  const [bodyShape, setBodyShape] = useState("");

  const handlePersonImageUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setPersonImage(e.target?.result as string);
      toast.success("Photo uploaded successfully!");
    };
    reader.readAsDataURL(file);
  }, []);

  const handleClothingImageUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setClothingImage(e.target?.result as string);
      toast.success("Clothing image uploaded!");
    };
    reader.readAsDataURL(file);
  }, []);

  const isReady = (personImage || personDescription.trim()) && (clothingImage || clothingDescription.trim());

  const handleGenerate = async () => {
    if (!isReady) {
      toast.error("Please provide both your photo/description and clothing details");
      return;
    }

    setIsGenerating(true);
    
    const hasPersonImage = !!personImage;
    const hasClothingInput = clothingImage || clothingDescription.trim();
    
    toast.info("Analyzing your appearance and clothing...");

    // Run all analysis in parallel
    const userModelPromise = generateUserModel({
      personImage,
      personDescription,
      clothingImage,
      clothingDescription,
      height,
      bodyShape,
    });

    const clothingModelPromise = hasClothingInput 
      ? generateClothingModel({
          clothingImage,
          clothingDescription,
        })
      : Promise.resolve({ success: false, clothingModel: undefined });

    // Wait for both analyses to complete
    const [userModelResult, clothingModelResult] = await Promise.all([
      userModelPromise,
      clothingModelPromise
    ]);

    console.log("AI Analysis result:", userModelResult);
    console.log("Clothing Analysis result:", clothingModelResult);

    if (!userModelResult.success || !userModelResult.userModel) {
      toast.error(userModelResult.error || "Failed to analyze your appearance");
      setIsGenerating(false);
      return;
    }

    // Store the structured user model
    setUserModel(userModelResult.userModel);
    console.log("Structured User Model:", JSON.stringify(userModelResult.userModel, null, 2));

    // Store the clothing model if successful
    if (clothingModelResult.success && clothingModelResult.clothingModel) {
      setClothingModel(clothingModelResult.clothingModel);
      console.log("Structured Clothing Model:", JSON.stringify(clothingModelResult.clothingModel, null, 2));
    }

    // Generate virtual try-on
    toast.info(hasPersonImage ? "Generating virtual try-on..." : "Generating styled look from descriptions...");
    
    // Build a comprehensive clothing description from the model
    let enhancedClothingDescription = clothingDescription;
    if (clothingModelResult.success && clothingModelResult.clothingModel) {
      const cm = clothingModelResult.clothingModel;
      enhancedClothingDescription = `${cm.color} ${cm.category} with ${cm.pattern} pattern, made of ${cm.material}, ${cm.fit} fit, ${cm.style} style`;
      if (clothingDescription) {
        enhancedClothingDescription += `. Additional details: ${clothingDescription}`;
      }
    }

    const tryOnResult = await generateVirtualTryOn({
      personImage: personImage || "",
      clothingDescription: enhancedClothingDescription || clothingDescription,
      clothingImage: clothingImage || undefined,
      userModel: userModelResult.userModel,
      clothingModel: clothingModelResult.clothingModel,
    });
    
    console.log("Virtual try-on result:", tryOnResult);

    if (tryOnResult.success && tryOnResult.generatedImage) {
      setGeneratedImage(tryOnResult.generatedImage);
      toast.success("Your styled look is ready!");
    } else {
      toast.warning(tryOnResult.error || "Generation failed, but your profiles were analyzed");
    }

    setIsGenerating(false);
  };

  return (
    <div className="min-h-screen hero-gradient">
      <Header />

      <main className="container mx-auto px-4 pb-20">
        <HeroSection />

        {/* Upload Sections */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="grid md:grid-cols-2 gap-8 md:gap-12 max-w-5xl mx-auto mt-8"
        >
          <UploadZone
            title="Your Photo"
            subtitle="Upload a photo of yourself or describe your appearance"
            icon="person"
            onImageUpload={handlePersonImageUpload}
            onDescriptionChange={setPersonDescription}
            description={personDescription}
            uploadedImage={personImage}
            onRemoveImage={() => setPersonImage(null)}
          />

          <UploadZone
            title="Clothing"
            subtitle="Upload clothing images or describe what you want to wear"
            icon="clothing"
            onImageUpload={handleClothingImageUpload}
            onDescriptionChange={setClothingDescription}
            description={clothingDescription}
            uploadedImage={clothingImage}
            onRemoveImage={() => setClothingImage(null)}
            onHeightChange={setHeight}
            onBodyShapeChange={setBodyShape}
          />
        </motion.div>

        {/* Model Results - Side by Side */}
        {(userModel || clothingModel) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mt-8"
          >
            {userModel && <UserModelCard userModel={userModel} />}
            {clothingModel && <ClothingModelCard clothingModel={clothingModel} />}
          </motion.div>
        )}

        {/* Preview Section */}
        <PreviewSection
          isReady={!!isReady}
          isGenerating={isGenerating}
          onGenerate={handleGenerate}
          generatedImage={generatedImage}
        />
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground text-sm">© 2024 StyleAI. Powered by artificial intelligence.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
