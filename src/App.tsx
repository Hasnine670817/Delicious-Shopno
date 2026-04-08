/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Phone, 
  MessageSquare, 
  Video, 
  Users, 
  CheckCircle2, 
  ShieldCheck, 
  CreditCard, 
  Zap, 
  Globe, 
  Heart, 
  Star, 
  AlertTriangle, 
  ChevronDown, 
  Menu, 
  X,
  Sparkles,
  Image as ImageIcon,
  Film,
  Upload,
  Loader2,
  ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { GoogleGenAI, Modality } from "@google/genai";
import { LuMessageCircleMore } from "react-icons/lu";
import { FaGrinStars, FaHammer, FaHeart, FaQuestion } from "react-icons/fa";
import { BsEmojiHeartEyesFill, BsFillEmojiSmileUpsideDownFill } from "react-icons/bs";

// --- Global Declarations ---
declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

// --- Types ---
interface Companion {
  id: string;
  name: string;
  rating: number;
  skills: string[];
  availability: string;
  image: string;
}

interface FAQItem {
  question: string;
  answer: string;
}

// --- Constants ---
const SHOPNO_PROFILE = {
  name: "Shopno",
  rating: 4.9,
  skills: ["Active Listening", "Emotional Support", "Storytelling", "Career Advice", "Mindfulness"],
  availability: "Available Now",
  image: "https://i.ibb.co.com/gbqdFFxP/592919616-4334289523559884-8462980924381314157-n.png",
  bio: "Hi, I'm Shopno. I've dedicated my life to understanding human emotions and providing a safe, judgment-free space for people to express themselves. Whether you're feeling stressed, lonely, or just need a friendly voice to talk to, I'm here to listen and support you."
};

const FAQS: FAQItem[] = [
  {
    question: "Is this a dating service?",
    answer: "No. My service is strictly for companionship and communication. I focus on friendly conversations, emotional support, and safe social interaction. Any romantic or sexual behavior is strictly prohibited."
  },
  {
    question: "Is it safe?",
    answer: "Safety is my top priority. Our sessions are strictly moderated and follow clear guidelines. I maintain a zero-tolerance policy for inappropriate behavior to ensure a respectful environment for both of us."
  },
  {
    question: "How do payments work?",
    answer: "I use a secure, transparent payment system. You can pay per minute or per session using your preferred payment method. There are no hidden fees."
  },
  {
    question: "What happens if rules are broken?",
    answer: "I have a strict moderation system. Any violation of my safety guidelines results in immediate session termination and a permanent ban from my platform."
  }
];

// --- Components ---

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6 py-4",
      isScrolled ? "bg-white/80 backdrop-blur-md shadow-sm" : "bg-transparent"
    )}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-rose-200">
            <Heart size={24} fill="currentColor" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-rose-600 to-amber-600 bg-clip-text text-transparent">
            Delicious Shopno
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-slate-600 font-medium">
          <a href="#how-it-works" className="hover:text-rose-500 transition-colors">How It Works</a>
          <a href="#services" className="hover:text-rose-500 transition-colors">Services</a>
          <a href="#about" className="hover:text-rose-500 transition-colors">About Me</a>
          <a href="#safety" className="hover:text-rose-500 transition-colors">Safety</a>
          <button className="bg-rose-500 text-white px-6 py-2.5 rounded-full hover:bg-rose-600 transition-all shadow-md shadow-rose-100">
            Book Now
          </button>
        </div>

        <button className="md:hidden text-slate-600" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full left-0 right-0 bg-white border-t p-6 flex flex-col gap-4 md:hidden shadow-xl"
          >
            <a href="#how-it-works" onClick={() => setIsMobileMenuOpen(false)}>How It Works</a>
            <a href="#services" onClick={() => setIsMobileMenuOpen(false)}>Services</a>
            <a href="#about" onClick={() => setIsMobileMenuOpen(false)}>About Me</a>
            <a href="#safety" onClick={() => setIsMobileMenuOpen(false)}>Safety</a>
            <button className="bg-rose-500 text-white px-6 py-3 rounded-xl">Book Now</button>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const AICreativeCorner = () => {
  const [activeTab, setActiveTab] = useState<"image" | "video">("image");
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageSize, setImageSize] = useState<"1K" | "2K" | "4K">("1K");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [videoStatus, setVideoStatus] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageGenerate = async () => {
    if (!imagePrompt) return;
    setIsGeneratingImage(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: {
          parts: [{ text: `A professional, friendly, and warm portrait of a companion: ${imagePrompt}. High quality, soft lighting, pastel background.` }],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: imageSize
          }
        }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          setGeneratedImage(`data:image/png;base64,${part.inlineData.data}`);
          break;
        }
      }
    } catch (error) {
      console.error("Image generation failed:", error);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleVideoGenerate = async () => {
    if (!videoFile) return;

    // Check for API key selection for Veo
    if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
      await window.aistudio.openSelectKey();
      // Assume success and proceed
    }

    setIsGeneratingVideo(true);
    setVideoStatus("Preparing your memory...");
    try {
      const reader = new FileReader();
      reader.readAsDataURL(videoFile);
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        let operation = await ai.models.generateVideos({
          model: 'veo-3.1-fast-generate-preview',
          prompt: 'A gentle, cinematic animation of this scene, soft movement, peaceful atmosphere.',
          image: {
            imageBytes: base64Data,
            mimeType: videoFile.type,
          },
          config: {
            numberOfVideos: 1,
            resolution: '1080p',
            aspectRatio: '16:9'
          }
        });

        setVideoStatus("Animating your moment... (this may take a minute)");
        while (!operation.done) {
          await new Promise(resolve => setTimeout(resolve, 10000));
          operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (downloadLink) {
          const response = await fetch(downloadLink, {
            method: 'GET',
            headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY! },
          });
          const blob = await response.blob();
          setGeneratedVideoUrl(URL.createObjectURL(blob));
        }
      };
    } catch (error) {
      console.error("Video generation failed:", error);
      setVideoStatus("Something went wrong. Please try again.");
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  return (
    <section className="" id="creative">
      {/* <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-100 text-rose-600 font-semibold text-sm mb-4">
            <Sparkles size={16} />
            AI Creative Corner
          </div>
          <h2 className="text-4xl font-bold text-slate-900 mb-4">Express Your Connection ✨</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Use our advanced AI tools to visualize your ideal companion or animate your favorite memories together.
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200 overflow-hidden border border-slate-100">
          <div className="flex border-b">
            <button 
              onClick={() => setActiveTab("image")}
              className={cn(
                "flex-1 py-6 flex items-center justify-center gap-2 font-semibold transition-all",
                activeTab === "image" ? "bg-rose-50 text-rose-600 border-b-2 border-rose-500" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <ImageIcon size={20} />
              Generate Portrait
            </button>
            <button 
              onClick={() => setActiveTab("video")}
              className={cn(
                "flex-1 py-6 flex items-center justify-center gap-2 font-semibold transition-all",
                activeTab === "video" ? "bg-rose-50 text-rose-600 border-b-2 border-rose-500" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <Film size={20} />
              Animate Memory
            </button>
          </div>

          <div className="p-8">
            {activeTab === "image" ? (
              <div className="grid md:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Describe your ideal session setting</label>
                    <textarea 
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      placeholder="e.g. A peaceful garden setting with soft sunlight, two people sitting comfortably and talking..."
                      className="w-full p-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none h-32 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Resolution</label>
                    <div className="flex gap-4">
                      {(["1K", "2K", "4K"] as const).map((size) => (
                        <button
                          key={size}
                          onClick={() => setImageSize(size)}
                          className={cn(
                            "flex-1 py-2 rounded-xl border font-medium transition-all",
                            imageSize === size ? "bg-rose-500 text-white border-rose-500" : "bg-white text-slate-600 border-slate-200 hover:border-rose-300"
                          )}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button 
                    onClick={handleImageGenerate}
                    disabled={isGeneratingImage || !imagePrompt}
                    className="w-full bg-rose-500 text-white py-4 rounded-2xl font-bold hover:bg-rose-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isGeneratingImage ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
                    {isGeneratingImage ? "Generating..." : "Generate Portrait"}
                  </button>
                </div>
                <div className="aspect-square bg-slate-100 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-dashed border-slate-200">
                  {generatedImage ? (
                    <img src={generatedImage} alt="Generated" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="text-center text-slate-400">
                      <ImageIcon size={48} className="mx-auto mb-2 opacity-20" />
                      <p>Your portrait will appear here</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-video bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-all overflow-hidden"
                  >
                    {videoPreview ? (
                      <img src={videoPreview} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <>
                        <Upload size={40} className="text-slate-400 mb-2" />
                        <p className="text-slate-500 font-medium">Click to upload a photo</p>
                        <p className="text-xs text-slate-400 mt-1">JPG, PNG up to 10MB</p>
                      </>
                    )}
                    <input type="file" ref={fileInputRef} onChange={onFileChange} className="hidden" accept="image/*" />
                  </div>
                  <button 
                    onClick={handleVideoGenerate}
                    disabled={isGeneratingVideo || !videoFile}
                    className="w-full bg-rose-500 text-white py-4 rounded-2xl font-bold hover:bg-rose-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isGeneratingVideo ? <Loader2 className="animate-spin" /> : <Film size={20} />}
                    {isGeneratingVideo ? "Processing..." : "Animate Memory"}
                  </button>
                  {isGeneratingVideo && (
                    <p className="text-center text-sm text-rose-500 font-medium animate-pulse">{videoStatus}</p>
                  )}
                </div>
                <div className="aspect-video bg-slate-100 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-dashed border-slate-200">
                  {generatedVideoUrl ? (
                    <video src={generatedVideoUrl} controls className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center text-slate-400">
                      <Film size={48} className="mx-auto mb-2 opacity-20" />
                      <p>Your animated memory will appear here</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div> */}
    </section>
  );
};

export default function App() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-rose-100 selection:text-rose-600">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute top-0 right-0 -z-10 w-1/2 h-full bg-gradient-to-bl from-rose-50 to-transparent opacity-60 rounded-bl-[100px]" />
        <div className="absolute bottom-0 left-0 -z-10 w-1/3 h-1/2 bg-gradient-to-tr from-amber-50 to-transparent opacity-40 rounded-tr-[100px]" />
        
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-50 text-rose-600 font-semibold text-sm mb-6">
              <Sparkles size={16} />
              Premium Companionship Service
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Real Human <span className="text-rose-500">Connection</span> Without Pressure.
            </h1>
            <p className="text-xl text-slate-600 mb-10 leading-relaxed max-w-xl">
              Feeling lonely or just need someone to talk to? I'm Shopno, and I provide a safe, friendly, and respectful space for meaningful conversations. 😊✨
            </p>
            <div className="flex flex-wrap gap-4">
              <button className="bg-rose-500 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-rose-600 transition-all shadow-xl shadow-rose-200 flex items-center gap-2">
                Start Talking to Me <ChevronDown className="-rotate-90" size={20} />
              </button>
              <button className="bg-white text-slate-700 border border-slate-200 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-slate-50 transition-all">
                About Me
              </button>
            </div>
            <div className="mt-10 flex items-center gap-6">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map(i => (
                  <img key={i} src={`https://picsum.photos/seed/user${i}/100/100`} className="w-12 h-12 rounded-full border-4 border-white shadow-sm" alt="User" referrerPolicy="no-referrer" />
                ))}
              </div>
              <p className="text-sm text-slate-500 font-medium">
                <span className="text-slate-900 font-bold">1,200+</span> happy users this month
              </p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="relative z-10 rounded-[40px] overflow-hidden shadow-2xl shadow-rose-100">
              <img 
                src="https://i.ibb.co.com/xtWF7VVH/506141247-4153879661600872-6837490377847212988-n.png" 
                alt="Shopno - Your Companion" 
                className="w-full h-[600px] object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <div className="absolute bottom-8 left-8 right-8 bg-white/90 backdrop-blur-md p-6 rounded-3xl flex items-center justify-between">
                <div>
                  <p className="text-slate-900 font-bold text-lg">Safe & Respectful</p>
                  <p className="text-slate-500 text-sm">Strictly non-sexual companionship</p>
                </div>
                <div className="w-12 h-12 bg-rose-500 rounded-full flex items-center justify-center text-white">
                  <ShieldCheck size={24} />
                </div>
              </div>
            </div>
            {/* Decorative elements */}
            <div className="absolute -top-6 -right-6 w-32 h-32 bg-amber-100 rounded-full -z-10 animate-pulse" />
            <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-rose-100 rounded-full -z-10 animate-bounce" style={{ animationDuration: '4s' }} />
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-6 bg-white" id="how-it-works">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">How It Works <FaHammer className="inline-block" /></h2>
            <p className="text-slate-600 max-w-2xl mx-auto">Connecting with me is simple, secure, and stress-free.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: "01", title: "Choose a Service", desc: "Select from voice, chat, video, or meetup options.", icon: <MessageSquare size={24} /> },
              { step: "02", title: "Check Availability", desc: "See when I'm free and pick a time that works for you.", icon: <Users size={24} /> },
              { step: "03", title: "Book & Pay", desc: "Securely book your session with transparent pricing.", icon: <CreditCard size={24} /> },
              { step: "04", title: "Start Session", desc: "Begin our friendly conversation and feel better instantly.", icon: <Zap size={24} /> }
            ].map((item, i) => (
              <div key={i} className="group p-8 rounded-3xl bg-slate-50 hover:bg-rose-50 transition-all duration-300 border border-slate-100 hover:border-rose-200">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-rose-500 shadow-sm mb-6 group-hover:scale-110 transition-transform">
                  {item.icon}
                </div>
                <span className="text-4xl font-black text-slate-200 mb-4 block group-hover:text-rose-200 transition-colors">{item.step}</span>
                <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-24 px-6 bg-slate-50" id="services">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Our Services  <BsFillEmojiSmileUpsideDownFill className="inline-block text-rose-500" /></h2>
            <p className="text-slate-600 max-w-2xl mx-auto">Choose the communication style that fits your comfort level.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Phone, title: "Voice Call", desc: "Perfect for deep conversations and emotional support.", price: "$0.50/min", color: "rose" },
              { icon: MessageSquare, title: "Live Chat", desc: "Casual, instant messaging for quick chats and company.", price: "$0.30/min", color: "amber" },
              { icon: Video, title: "Video Call", desc: "Face-to-face interaction for a more personal feel.", price: "$1.00/min", color: "indigo" },
              { icon: Users, title: "Safe Meetup", desc: "Friendly, non-intimate meetups in public spaces.", price: "$50/hour", color: "emerald" }
            ].map((service, i) => (
              <div key={i} className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 flex flex-col h-full hover:shadow-xl hover:-translate-y-2 transition-all">
                <div className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center mb-6",
                  service.color === "rose" ? "bg-rose-100 text-rose-600" :
                  service.color === "amber" ? "bg-amber-100 text-amber-600" :
                  service.color === "indigo" ? "bg-indigo-100 text-indigo-600" :
                  "bg-emerald-100 text-emerald-600"
                )}>
                  <service.icon size={32} />
                </div>
                <h3 className="text-2xl font-bold mb-3">{service.title}</h3>
                <p className="text-slate-500 text-sm mb-6 flex-grow">{service.desc}</p>
                <div className="pt-6 border-t border-slate-50">
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Starting from</p>
                  <p className="text-2xl font-bold text-slate-900 mb-6">{service.price}</p>
                  <button className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-rose-500 transition-all">
                    Book Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Creative Corner */}
      <AICreativeCorner />

      {/* Why Choose Us */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="bg-rose-50 p-8 rounded-[40px] text-center">
                <ShieldCheck size={48} className="text-rose-500 mx-auto mb-4" />
                <h4 className="font-bold text-lg">Verified</h4>
                <p className="text-sm text-slate-500">100% Background checked</p>
              </div>
              <div className="bg-amber-50 p-8 rounded-[40px] text-center">
                <Zap size={48} className="text-amber-500 mx-auto mb-4" />
                <h4 className="font-bold text-lg">Instant</h4>
                <p className="text-sm text-slate-500">Connect in seconds</p>
              </div>
            </div>
            <div className="space-y-6 pt-12">
              <div className="bg-indigo-50 p-8 rounded-[40px] text-center">
                <Globe size={48} className="text-indigo-500 mx-auto mb-4" />
                <h4 className="font-bold text-lg">Global</h4>
                <p className="text-sm text-slate-500">Available 24/7</p>
              </div>
              <div className="bg-emerald-50 p-8 rounded-[40px] text-center">
                <Heart size={48} className="text-emerald-500 mx-auto mb-4" />
                <h4 className="font-bold text-lg">No Judgment</h4>
                <p className="text-sm text-slate-500">Safe space for all</p>
              </div>
            </div>
          </div>
          <div>
            <h2 className="text-4xl font-bold text-slate-900 mb-8">Why Choose Me? <FaHeart className="inline-block text-rose-500" /></h2>
            <div className="space-y-6">
              {[
                "Verified identity with real empathy",
                "Safe & respectful environment (Strictly non-sexual)",
                "Secure payments with no hidden fees",
                "Instant or scheduled sessions at your convenience",
                "Available anytime, anywhere in the world",
                "A judgment-free zone for all your thoughts"
              ].map((point, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center text-rose-500 shrink-0 mt-1">
                    <CheckCircle2 size={16} />
                  </div>
                  <p className="text-slate-700 font-medium">{point}</p>
                </div>
              ))}
            </div>
            <button className="mt-12 bg-rose-500 text-white px-10 py-4 rounded-2xl font-bold text-lg hover:bg-rose-600 transition-all shadow-xl shadow-rose-100">
              Start a Conversation
            </button>
          </div>
        </div>
      </section>

      {/* About Me Section */}
      <section className="py-24 px-6 bg-slate-50" id="about">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-[48px] overflow-hidden shadow-xl border border-slate-100 grid lg:grid-cols-2">
            <div className="h-[500px] lg:h-auto group relative">
              <div className="absolute inset-0 bg-rose-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-2xl -z-10" />
              <img 
                src={SHOPNO_PROFILE.image} 
                alt={SHOPNO_PROFILE.name} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                referrerPolicy="no-referrer" 
              />
            </div>
            <div className="p-12 md:p-20 flex flex-col justify-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-50 text-rose-600 font-semibold text-sm mb-6 w-fit">
                <Star size={16} className="fill-rose-500" />
                Top Rated Companion
              </div>
              <h2 className="text-4xl font-bold text-slate-900 mb-6">Meet {SHOPNO_PROFILE.name} <FaGrinStars className="inline-block text-yellow-500" /></h2>
              <p className="text-slate-600 text-lg leading-relaxed mb-8">
                {SHOPNO_PROFILE.bio}
              </p>
              <div className="flex flex-wrap gap-3 mb-10">
                {SHOPNO_PROFILE.skills.map((skill, i) => (
                  <span key={i} className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-sm font-bold border border-slate-100">
                    {skill}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-6">
                <button onClick={() => window.location.href = "https://www.whatsapp.com/"} className="bg-rose-500 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-rose-600 transition-all shadow-xl shadow-rose-100">
                  Book a Session
                </button>
                <div className="flex items-center gap-2 text-emerald-600 font-bold">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                  {SHOPNO_PROFILE.availability}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Simple, Transparent Pricing 💳</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">No hidden fees. Pay only for the time you spend connecting.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { title: "Casual Chat", price: "0.30", unit: "min", features: ["Unlimited text chat", "Verified companions", "24/7 Availability", "Safe environment"], popular: false },
              { title: "Deep Voice", price: "0.50", unit: "min", features: ["High-quality voice", "Emotional support", "Scheduled sessions", "Private & Secure"], popular: true },
              { title: "Face-to-Face", price: "1.00", unit: "min", features: ["HD Video calls", "Real connection", "Screen sharing", "Priority support"], popular: false }
            ].map((plan, i) => (
              <div key={i} className={cn(
                "p-10 rounded-[40px] border transition-all relative",
                plan.popular ? "bg-slate-900 text-white border-slate-900 shadow-2xl scale-105 z-10" : "bg-white text-slate-900 border-slate-100 shadow-sm"
              )}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-rose-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-bold mb-6">{plan.title}</h3>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-4xl font-black">${plan.price}</span>
                  <span className={cn("text-sm font-medium", plan.popular ? "text-slate-400" : "text-slate-500")}>/{plan.unit}</span>
                </div>
                <div className="space-y-4 mb-10">
                  {plan.features.map((f, j) => (
                    <div key={j} className="flex items-center gap-3">
                      <CheckCircle2 size={18} className={plan.popular ? "text-rose-400" : "text-rose-500"} />
                      <span className="text-sm font-medium">{f}</span>
                    </div>
                  ))}
                </div>
                <button className={cn(
                  "w-full py-4 rounded-2xl font-bold transition-all",
                  plan.popular ? "bg-rose-500 text-white hover:bg-rose-600" : "bg-slate-100 text-slate-900 hover:bg-slate-200"
                )}>
                  Choose Plan
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Safety & Guidelines Section */}
      <section className="py-24 px-6 bg-rose-50" id="safety">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-[48px] p-12 md:p-20 shadow-xl shadow-rose-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-rose-50 rounded-full -translate-y-1/2 translate-x-1/2 -z-0" />
            <div className="relative z-10 grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-8">
                  <AlertTriangle size={32} />
                </div>
                <h2 className="text-4xl font-bold text-slate-900 mb-6">Safety & Guidelines 🚨</h2>
                <p className="text-slate-600 mb-10 leading-relaxed">
                  Delicious Shopno is a safe haven for friendly conversation. To maintain this environment, we enforce strict guidelines.
                </p>
                <div className="space-y-6">
                  {[
                    { title: "Strictly Non-Sexual", desc: "No adult, romantic, or intimate services are allowed. Ever." },
                    { title: "Respectful Communication", desc: "Treat companions with kindness and dignity at all times." },
                    { title: "Zero Tolerance Policy", desc: "Inappropriate behavior results in immediate and permanent bans." },
                    { title: "Strict Moderation", desc: "Our team monitors reports 24/7 to ensure a safe experience." }
                  ].map((item, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="w-2 h-2 rounded-full bg-rose-500 mt-2 shrink-0" />
                      <div>
                        <h4 className="font-bold text-slate-900">{item.title}</h4>
                        <p className="text-sm text-slate-500">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-slate-50 p-10 rounded-[40px] border border-slate-100">
                <h3 className="text-2xl font-bold mb-6">Our Commitment</h3>
                <p className="text-slate-600 mb-8 italic">
                  "We created Delicious Shopno to solve the modern epidemic of loneliness. Our platform is built on trust, empathy, and safety. We promise to provide a space where you can be yourself without judgment or pressure."
                </p>
                <div className="flex items-center gap-4">
                  <img src="https://picsum.photos/seed/founder/100/100" className="w-14 h-14 rounded-full" alt="Founder" referrerPolicy="no-referrer" />
                  <div>
                    <p className="font-bold text-slate-900">The Founders</p>
                    <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Delicious Shopno Team</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Real Stories, Real Comfort <FaHeart className="inline-block text-rose-500" /></h2>
            <p className="text-slate-600">Hear from people who found companionship through my sessions.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: "James R.", role: "Software Engineer", text: "Working remotely can be incredibly lonely. Having Shopno to just talk about my day with has been a game-changer for my mental health. Highly recommended! 😊", image: "https://thispersondoesnotexist.com/" },
              { name: "Maria L.", role: "Graduate Student", text: "I was feeling so stressed with my exams. Shopno was so patient and just listened. It felt like talking to a wise older brother. So safe and warm. ✨", image: "https://thispersondoesnotexist.com/" },
              { name: "Robert T.", role: "Retired Teacher", text: "I missed having casual conversations after my wife passed. Shopno gave me a way to connect with a kind person without any pressure. It's a wonderful service.", image: "https://thispersondoesnotexist.com/" }
            ].map((t, i) => (
              <div key={i} className="p-10 rounded-[40px] bg-slate-50 border border-slate-100 relative">
                <div className="flex gap-1 text-amber-400 mb-6">
                  {[1, 2, 3, 4, 5].map(star => <Star key={star} size={16} fill="currentColor" />)}
                </div>
                <p className="text-slate-700 leading-relaxed mb-8 italic">"{t.text}"</p>
                <div className="flex items-center gap-4">
                  <img src={t.image} className="w-12 h-12 rounded-full" alt={t.name} referrerPolicy="no-referrer" />
                  <div>
                    <p className="font-bold text-slate-900">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Frequently Asked Questions <FaQuestion className="inline-block text-rose-500" /></h2>
            <p className="text-slate-600">Everything you need to know about Delicious Shopno.</p>
          </div>
          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                <p 
                  onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                  className="w-full p-6 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <span className="font-bold text-slate-900">{faq.question}</span>
                  <ChevronDown className={cn("text-slate-400 transition-transform", activeFaq === i && "rotate-180")} />
                </p>
                <AnimatePresence>
                  {activeFaq === i && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-6 pb-6 text-slate-500 text-sm leading-relaxed"
                    >
                      {faq.answer}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-r from-rose-500 to-rose-600 rounded-[60px] p-12 md:p-24 text-center text-white relative overflow-hidden shadow-2xl shadow-rose-200">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative z-10"
            >
              <h2 className="text-4xl md:text-6xl font-black mb-8">Start Your First Conversation Today <LuMessageCircleMore className="inline-block" /></h2>
              <p className="text-xl text-rose-100 mb-12 max-w-2xl mx-auto">
                Don't let loneliness hold you back. Connect with a kind soul and brighten your day in just a few clicks.
              </p>
              <button className="bg-white text-rose-600 px-12 py-5 rounded-2xl font-black text-xl hover:bg-rose-50 transition-all shadow-2xl shadow-black/20 flex items-center gap-3 mx-auto">
                Find Your Companion Now <Sparkles size={24} />
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-20 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-rose-500 rounded-lg flex items-center justify-center text-white">
                <Heart size={18} fill="currentColor" />
              </div>
              <span className="text-xl font-bold text-white">Delicious Shopno</span>
            </div>
            <p className="max-w-sm mb-8 leading-relaxed">
              A premium, safe, and professional companionship service offered by Shopno. Dedicated to solving loneliness through real human connection.
            </p>
            <div className="flex gap-4">
              {/* Social icons placeholder */}
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all cursor-pointer">
                  <Globe size={18} />
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6">Quick Links</h4>
            <ul className="space-y-4 text-sm">
              <li><a href="#" className="hover:text-rose-400 transition-colors">Home</a></li>
              <li><a href="#how-it-works" className="hover:text-rose-400 transition-colors">How It Works</a></li>
              <li><a href="#services" className="hover:text-rose-400 transition-colors">Services</a></li>
              <li><a href="#about" className="hover:text-rose-400 transition-colors">About Me</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6">Legal & Safety</h4>
            <ul className="space-y-4 text-sm">
              <li><a href="#" className="hover:text-rose-400 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-rose-400 transition-colors">Terms of Service</a></li>
              <li><a href="#safety" className="hover:text-rose-400 transition-colors">Safety Guidelines</a></li>
              <li><a href="#" className="hover:text-rose-400 transition-colors">Contact Me</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-medium uppercase tracking-widest">
          <p>© 2026 Delicious Shopno. All rights reserved.</p>
          <p className="flex items-center gap-1">Made with <Heart size={12} className="text-rose-500 fill-rose-500" /> for human connection</p>
        </div>
      </footer>
    </div>
  );
}
