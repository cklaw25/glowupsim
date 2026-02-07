import { motion } from 'framer-motion';
import { Sparkles, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PreviewSectionProps {
  isReady: boolean;
  isGenerating: boolean;
  onGenerate: () => void;
  generatedImage: string | null;
}

export const PreviewSection = ({
  isReady,
  isGenerating,
  onGenerate,
  generatedImage,
}: PreviewSectionProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="mt-12"
    >
      <div className="text-center mb-8">
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-3">
          Your Styled Look
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          See how you'll look in your chosen outfit with our AI-powered virtual try-on
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Generate Button */}
        <div className="flex justify-center mb-8">
          <Button
            onClick={onGenerate}
            disabled={!isReady || isGenerating}
            size="lg"
            className="px-8 py-6 text-lg font-medium rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-elevated hover:shadow-glow transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="mr-2"
                >
                  <Sparkles className="w-5 h-5" />
                </motion.div>
                Creating your look...
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5 mr-2" />
                Generate Virtual Try-On
              </>
            )}
          </Button>
        </div>

        {/* Preview Area */}
        <motion.div
          className="glass-card rounded-3xl p-8 min-h-[400px] flex items-center justify-center overflow-hidden"
          animate={isGenerating ? { opacity: [1, 0.7, 1] } : {}}
          transition={{ duration: 1.5, repeat: isGenerating ? Infinity : 0 }}
        >
          {generatedImage ? (
            <motion.img
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              src={generatedImage}
              alt="Generated styling preview"
              className="max-w-full max-h-[500px] rounded-2xl shadow-elevated"
            />
          ) : (
            <div className="text-center py-16">
              <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-10 h-10 text-primary" />
              </div>
              <h3 className="font-display text-xl text-foreground mb-2">
                {isReady ? 'Ready to style' : 'Upload or describe to begin'}
              </h3>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                {isReady
                  ? 'Click the button above to see your virtual try-on'
                  : 'Add your photo and clothing to generate your personalized look'}
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};
