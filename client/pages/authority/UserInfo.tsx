import { useNavigate } from "react-router-dom";

export default function AuthorityUserInfo() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-[#0a0e17] flex flex-col items-center justify-center">
      <h1 className="font-pixel text-lg text-[#00ff00] mb-8">
        AUTHORITY USER INFO
      </h1>
      <p className="font-pixel text-xs text-gray-400 mb-8">
        COMING SOON
      </p>
      <button
        onClick={() => navigate("/authority/play")}
        className="px-10 py-2 bg-black/50 border border-[#00ff00]/50 text-[#00ff00] font-pixel text-xs sm:text-sm hover:bg-[#00ff00]/10 transition-colors uppercase"
      >
        BACK TO MAP
      </button>
    </div>
  );
}
