# StyleAI - Virtual Try-On & Fashion Analysis

An AI-powered virtual try-on application that lets you visualize how clothing looks on you without physically trying it on. Upload your photo, describe or upload clothing, and get instant AI-generated try-on images along with personalized style analysis.

![StyleAI Preview](src/assets/styled-preview.jpg)

## ✨ Features

- **Virtual Try-On**: Upload your photo and see yourself wearing any described outfit using AI image generation
- **Body Analysis**: Get personalized insights including skin tone, body shape, and size recommendations
- **Dual Input**: Support for both image uploads and text descriptions for maximum flexibility
- **Real-time Generation**: Fast AI processing with live progress feedback

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui components
- **Animations**: Framer Motion
- **Backend**: Supabase Edge Functions (Deno)
- **AI Services**:
  - [fal.ai](https://fal.ai) - Virtual try-on image generation (Flux model)
  - Lovable AI Gateway - User analysis and style recommendations

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- A [fal.ai](https://fal.ai) account for virtual try-on generation

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd <project-name>
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
   ```

4. **Configure secrets** (for Edge Functions)
   
   The following secrets need to be configured in your Supabase project:
   - `FAL_KEY` - Your fal.ai API key
   - `LOVABLE_API_KEY` - Lovable AI Gateway key (auto-configured on Lovable Cloud)

5. **Start the development server**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:8080`

## 📁 Project Structure

```
├── src/
│   ├── components/       # React components
│   ├── contexts/         # React context providers
│   ├── pages/            # Page components and API handlers
│   ├── hooks/            # Custom React hooks
│   └── integrations/     # Supabase client configuration
├── supabase/
│   └── functions/        # Edge Functions
│       ├── analyze-user/ # User body analysis
│       └── virtual-tryon/# AI try-on generation
└── public/               # Static assets
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

Built with [Lovable](https://lovable.dev)
