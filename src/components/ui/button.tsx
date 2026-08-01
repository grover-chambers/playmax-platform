import React from "react";

type ButtonVariant = "primary" | "secondary" | "teal" | "ivory" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  teal: "btn-teal",
  ivory: "btn-ivory",
  outline: "ws-btn ws-btn-outline",
  ghost: "ws-btn ws-btn-ghost",
  danger: "ws-btn ws-btn-danger",
};

function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  let variantClass = variantStyles[variant];
  let sizeClass = "";
  if (variant === "primary" && size === "sm") {
    variantClass = "btn-sm-primary";
  } else if (variant === "secondary" && size === "sm") {
    variantClass = "btn-sm";
  } else if (size === "sm") {
    sizeClass = "ws-btn-sm";
  } else if (size === "lg") {
    sizeClass = "ws-btn-lg";
  }
  return (
    <button
      className={`font-display cursor-pointer transition-all duration-150 ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
