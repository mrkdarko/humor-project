import { redirect } from "next/navigation";
import { GoogleButton } from "./auth/google-button";
import { createClient } from "@/utils/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4">
      {/* Background decorations */}
      <div className="cloud cloud-1" style={{ top: '15%', zIndex: -1 }}></div>
      <div className="cloud cloud-2" style={{ top: '45%', zIndex: -1 }}></div>
      <div className="cloud cloud-1" style={{ top: '75%', animationDelay: '-15s', zIndex: -1 }}></div>

      {/* Main Title Area */}
      <div className="z-10 flex flex-col items-center text-center mb-12">
        <div className="mb-6 flex items-center justify-center gap-3 animate-bounce-custom">
          <span className="text-4xl">🍄</span>
          <span className="text-4xl">⭐</span>
          <span className="text-4xl">🍄</span>
        </div>
        <h1 className="font-pixel text-4xl sm:text-5xl md:text-6xl text-white mb-4 drop-shadow-[4px_4px_0_rgba(0,0,0,1)] leading-tight">
          HUMOR<br/>PROJECT
        </h1>
        <p className="font-sans text-xl sm:text-2xl font-bold bg-[#FBD000] px-4 py-2 border-[4px] border-black rounded-xl shadow-[4px_4px_0_#000] rotate-[-2deg]">
          Campus. City. Comedy.
        </p>
      </div>

      {/* Playful Sign In Card */}
      <div className="z-10 w-full max-w-md chunky-card p-8 text-center bg-white">
        <h2 className="font-pixel text-xl mb-6 text-black">PRESS START</h2>
        <p className="font-sans text-lg font-bold text-gray-700 mb-8">
          Join the game and share AI-generated laughs. No quarters needed!
        </p>
        
        <GoogleButton />
        
        <div className="mt-6 border-t-[4px] border-black border-dashed pt-4">
          <p className="font-sans text-sm font-bold text-gray-500">
            YOUR PROFILE IS SAFE IN ANOTHER CASTLE (AND HERE).
          </p>
        </div>
      </div>
      
      {/* Ground (decorative) */}
      <div className="absolute bottom-0 w-full h-16 bg-[#FFA84C] border-t-[4px] border-black z-0 flex items-start overflow-hidden">
        {/* Simple brick pattern using CSS borders */}
        <div className="w-full h-full opacity-30" style={{ backgroundImage: 'linear-gradient(90deg, transparent 46px, #000 46px, #000 50px), linear-gradient(0deg, transparent 21px, #000 21px, #000 25px)', backgroundSize: '50px 25px' }}></div>
      </div>
    </main>
  );
}
