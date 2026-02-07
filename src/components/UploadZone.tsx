import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Image, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface UploadZoneProps {
  title: string;
  subtitle: string;
  icon: "person" | "clothing";
  onImageUpload: (file: File) => void;
  onDescriptionChange: (description: string) => void;
  description: string;
  uploadedImage: string | null;
  onRemoveImage: () => void;
}

export const UploadZone = ({
  title,
  subtitle,
  icon,
  onImageUpload,
  onDescriptionChange,
  description,
  uploadedImage,
  onRemoveImage,
}: UploadZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        onImageUpload(file);
      }
    },
    [onImageUpload],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageUpload(file);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col gap-4"
    >
      <div className="text-center mb-2">
        <h3 className="font-display text-xl font-semibold text-foreground">{title}</h3>
        <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>
      </div>

      {/* Image Upload Area */}
      <div
        className={`upload-zone cursor-pointer ${isDragging ? "active" : ""}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <AnimatePresence mode="wait">
          {uploadedImage ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative"
            >
              <img src={uploadedImage} alt="Uploaded preview" className="w-full h-48 object-cover rounded-xl" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveImage();
                }}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-foreground/80 text-background hover:bg-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-8 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                {icon === "person" ? (
                  <Image className="w-7 h-7 text-primary" />
                ) : (
                  <Upload className="w-7 h-7 text-primary" />
                )}
              </div>
              <p className="text-foreground font-medium mb-1">Drop your image here</p>
              <p className="text-muted-foreground text-sm">or click to browse</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-border" />
        <span className="text-muted-foreground text-sm font-medium">or describe</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Description Textarea */}
      <Textarea
        placeholder={
          icon === "person"
            ? "Describe yourself: e.g., 'Tall woman with brown hair, athletic build...'"
            : "Describe the clothing: e.g., 'Elegant red evening dress with lace details...'"
        }
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        className="min-h-[100px] resize-none bg-card border-border focus:border-primary focus:ring-primary/20 rounded-xl"
      />

      {/* extra fields to add */}
      <label>your height (cm)</label>
      <input type="number" placeholders="e.g : 180" onChange={(e) => onHeightChange(e.target.value)} />

      <label>body shape</label>
      <select onChange={(e) => onBodyShapeChange(e.target.value)}>
        <option value="">Select</option>
        <option value="pear">Pear</option>
        <option value="hourglass">Hourglass</option>
        <option value="rectangle">Rectangle</option>
        <option value="inverted">Inverted triangle</option>
      </select>
    </motion.div>
  );
};
