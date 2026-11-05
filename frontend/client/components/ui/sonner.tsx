import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

// Toasts styled like the game's panels: dark, thin border, pixel title
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast !rounded-none !bg-black/90 !text-white !border !border-gray-600 !font-jura !shadow-lg",
          title: "!font-pixel !text-[10px] !leading-relaxed",
          description: "!text-gray-300",
          success: "!border-[#00e5ff]/60",
          error: "!border-red-400/70",
          actionButton: "!rounded-none !bg-[#00e5ff] !text-black",
          cancelButton: "!rounded-none !bg-gray-700 !text-white",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
