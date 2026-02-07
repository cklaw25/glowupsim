import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { UploadZone } from "@/components/UploadZone";
import { PreviewSection } from "@/components/PreviewSection";
import { toast } from "sonner";
import styledPreview from "@/assets/styled-preview.jpg";
import { generateUserModel } from "@/pages/api/generateUserModel.ts";

const Index = () => {
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
    toast.info("Analyzing your appearance...");

    // 1. Call your AI function
    const userModel = await generateUserModel({
      personImage,
      personDescription,
      clothingImage,
      clothingDescription,
      // later you can add height, bodyShape, etc.
    });

    console.log("User model:", userModel);

    // 2. Handle errors
    if (!userModel.success) {
      toast.error(userModel.error || "Failed to generate user model");
      setIsGenerating(false);
      return;
    }

    // 3. TEMPORARY: still show your placeholder image
    // (until we connect the virtual try-on model)
    setGeneratedImage(styledPreview);

    setIsGenerating(false);
    toast.success("Your styled look is ready!");
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
