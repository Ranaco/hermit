import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <svg 
      width="100%" 
      height="100%" 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={cn("w-8 h-8", className)}
    >
      <path 
        d="M50 4L96 50L50 96L4 50L50 4Z" 
        fill="currentColor" 
        fillOpacity="0.1" 
        stroke="currentColor" 
        strokeWidth="6" 
        strokeLinejoin="round"
      />
      <path 
        d="M50 25L75 50L50 75L25 50L50 25Z" 
        fill="currentColor" 
      />
      <path 
        d="M50 42C45.5817 42 42 45.5817 42 50C42 53.0784 43.7408 55.7517 46.3333 57.0855V64H53.6667V57.0855C56.2592 55.7517 58 53.0784 58 50C58 45.5817 54.4183 42 50 42Z" 
        fill="var(--background, #fff)" 
      />
    </svg>
  );
}
