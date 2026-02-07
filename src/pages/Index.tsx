import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { UploadZone } from "@/components/UploadZone";
import { PreviewSection } from "@/components/PreviewSection";
import { UserModelCard } from "@/components/UserModelCard";
import { toast } from "sonner";
import { generateUserModel } from "@/pages/api/generateUserModel.ts";
import { generateVirtualTryOn } from "@/pages/api/virtualTryon.ts";
import { useUserModel } from "@/contexts/UserModelContext";

const Index = () => {
  // Global user model from context
  const { userModel, setUserModel } = useUserModel();

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
    
    // Run user model analysis and virtual try-on in parallel
    const hasPersonImage = !!personImage;
    
    toast.info("Analyzing your appearance...");

    // 1. Always run user model analysis
    const userModelPromise = generateUserModel({
      personImage,
      personDescription,
      clothingImage,
      clothingDescription,
      height,
      bodyShape,
    });

    // 2. If we have a person image, also run virtual try-on
    let tryOnPromise: Promise<{ success: boolean; generatedImage?: string; error?: string }> | null = null;
    
    if (hasPersonImage && clothingDescription.trim()) {
      toast.info("Generating virtual try-on with fal.ai...");
      tryOnPromise = generateVirtualTryOn({
        personImage: personImage!,
        clothingDescription,
        clothingImage: clothingImage || undefined,
      });
    }

    // Wait for user model result
    const userModelResult = await userModelPromise;
    console.log("AI Analysis result:", userModelResult);

    if (!userModelResult.success || !userModelResult.userModel) {
      toast.error(userModelResult.error || "Failed to analyze your appearance");
      setIsGenerating(false);
      return;
    }

    // Store the structured user model
    setUserModel(userModelResult.userModel);
    console.log("Structured User Model:", JSON.stringify(userModelResult.userModel, null, 2));

    // Wait for virtual try-on result if it was started
    if (tryOnPromise) {
      const tryOnResult = await tryOnPromise;
      console.log("Virtual try-on result:", tryOnResult);

      if (tryOnResult.success && tryOnResult.generatedImage) {
        setGeneratedImage(tryOnResult.generatedImage);
        toast.success("Virtual try-on complete! See your new look below!");
      } else {
        toast.warning(tryOnResult.error || "Virtual try-on failed, but your profile was analyzed");
      }
    } else {
      toast.success("Analysis complete! Upload a photo to see virtual try-on.");
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

        {/* User Model Results */}
        {userModel && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto mt-8"
          >
            <UserModelCard userModel={userModel} />
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
