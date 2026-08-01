import React from "react";

type AvatarVariant = "yellow" | "dark";

interface AvatarProps {
  initials: string;
  variant?: AvatarVariant;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const variantStyles: Record<AvatarVariant, string> = {
  yellow: "bg-yellow! text-black!",
  dark: "bg-black-4! text-yellow!",
};

const sizeStyles: Record<string, string> = {
  sm: "w-[18px]! h-[18px]! text-[8px]!",
  md: "user-avatar",
  lg: "thread-avatar",
};

function Avatar({
  initials,
  variant = "yellow",
  size = "md",
  className = "",
}: AvatarProps) {
  return (
    <div
      className={`rounded-full flex items-center justify-center font-display font-bold flex-shrink-0 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {initials}
    </div>
  );
}

export default Avatar;
