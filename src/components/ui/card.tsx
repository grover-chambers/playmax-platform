import React from "react";

interface CardProps {
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  hover?: boolean;
}

function Card({ className = "", children, onClick, hover = true }: CardProps) {
  return (
    <div
      className={`card ${hover ? "card-hover-yellow" : ""} ${onClick ? "cursor-pointer" : ""} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export default Card;
