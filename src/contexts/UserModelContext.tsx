import { createContext, useContext, useState, ReactNode } from "react";
import { StructuredUserModel } from "@/pages/api/generateUserModel";

interface UserModelContextType {
  userModel: StructuredUserModel | null;
  setUserModel: (model: StructuredUserModel | null) => void;
  clearUserModel: () => void;
}

const UserModelContext = createContext<UserModelContextType | undefined>(undefined);

export const UserModelProvider = ({ children }: { children: ReactNode }) => {
  const [userModel, setUserModel] = useState<StructuredUserModel | null>(null);

  const clearUserModel = () => setUserModel(null);

  return (
    <UserModelContext.Provider value={{ userModel, setUserModel, clearUserModel }}>
      {children}
    </UserModelContext.Provider>
  );
};

export const useUserModel = (): UserModelContextType => {
  const context = useContext(UserModelContext);
  if (!context) {
    throw new Error("useUserModel must be used within a UserModelProvider");
  }
  return context;
};
