import { motion } from "framer-motion";
import { Shirt, Palette, Scissors, Tag, Sparkles, Calendar, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StructuredClothingModel } from "@/pages/api/generateClothingModel";

interface ClothingModelCardProps {
  clothingModel: StructuredClothingModel;
}

export const ClothingModelCard = ({ clothingModel }: ClothingModelCardProps) => {
  const attributes = [
    { label: "Category", value: clothingModel.category, icon: Shirt },
    { label: "Color", value: clothingModel.color, icon: Palette },
    { label: "Pattern", value: clothingModel.pattern, icon: Layers },
    { label: "Material", value: clothingModel.material, icon: Scissors },
    { label: "Fit", value: clothingModel.fit, icon: Tag },
    { label: "Style", value: clothingModel.style, icon: Sparkles },
    { label: "Occasion", value: clothingModel.occasion, icon: Calendar },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="glass-card border-border overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="font-display text-xl flex items-center gap-2">
            <Shirt className="w-5 h-5 text-primary" />
            Clothing Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {attributes.map((attr, index) => (
              <motion.div
                key={attr.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="flex flex-col gap-1 p-3 rounded-xl bg-secondary/50"
              >
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <attr.icon className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">{attr.label}</span>
                </div>
                <span className="text-sm font-semibold text-foreground capitalize">
                  {attr.value || "Unknown"}
                </span>
              </motion.div>
            ))}
          </div>

          {clothingModel.notes && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="pt-3 border-t border-border"
            >
              <p className="text-xs text-muted-foreground mb-2">Styling Notes</p>
              <p className="text-sm text-foreground">{clothingModel.notes}</p>
            </motion.div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <Badge variant="secondary" className="text-xs">
              {clothingModel.hasImage ? "Image analyzed" : "Text-based analysis"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
