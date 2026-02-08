import { createContext, useContext, useState, ReactNode } from "react";
import { StructuredClothingModel } from "@/pages/api/generateClothingModel";

interface ClothingModelContextType {
  clothingModel: StructuredClothingModel | null;
  setClothingModel: (model: StructuredClothingModel | null) => void;
  clearClothingModel: () => void;
}

const ClothingModelContext = createContext<ClothingModelContextType | undefined>(undefined);

export const ClothingModelProvider = ({ children }: { children: ReactNode }) => {
  const [clothingModel, setClothingModel] = useState<StructuredClothingModel | null>(null);

  const clearClothingModel = () => setClothingModel(null);

  return (
    <ClothingModelContext.Provider value={{ clothingModel, setClothingModel, clearClothingModel }}>
      {children}
    </ClothingModelContext.Provider>
  );
};

export const useClothingModel = (): ClothingModelContextType => {
  const context = useContext(ClothingModelContext);
  if (!context) {
    throw new Error("useClothingModel must be used within a ClothingModelProvider");
  }
  return context;
};
