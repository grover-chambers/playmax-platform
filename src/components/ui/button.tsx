import React from "react";

type ButtonVariant = "primary" | "secondary" | "teal" | "ivory";
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
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "btn-sm",
  md: "",
  lg: "",
};

function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`font-display cursor-pointer transition-all duration-150 ${variantStyles[variant]} ${size === "sm" ? sizeStyles.sm : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
