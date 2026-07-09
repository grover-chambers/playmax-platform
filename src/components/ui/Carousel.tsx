"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CarouselItem {
  id: string;
  [key: string]: unknown;
}

interface CarouselProps<T extends CarouselItem> {
  items?: T[];
  renderItem?: (item: T, index: number) => React.ReactNode;
  children?: React.ReactNode;
  itemsPerView?: number;
  gap?: number;
  showArrows?: boolean;
  showDots?: boolean;
  className?: string;
  containerClassName?: string;
}

export function Carousel<T extends CarouselItem = CarouselItem>({
  items = [],
  renderItem,
  children,
  itemsPerView = 3,
  gap = 24,
  showArrows = true,
  showDots = true,
  className = "",
  containerClassName = "",
}: CarouselProps<T>) {
  const [currentIndex, setCurrentIndex] = useState(0);

  return (
    <div className={`relative ${className}`}>
      <div
        className={`flex overflow-x-hidden ${containerClassName}`}
        style={{
          gap: `${gap}px`,
          transform: `translateX(-${currentIndex * (100 / itemsPerView)}%)`,
          transition: "transform 400ms ease",
        }}
      >
        {children
          ? React.Children.toArray(children).map((child, index) => {
              const isElement = React.isValidElement(child);
              return (
                <div
                  key={isElement ? String(child.key ?? index) : String(index)}
                  className="flex-shrink-0 shrink-0"
                  style={{
                    width: `calc((100% - ${gap * (itemsPerView - 1)}px) / ${itemsPerView})`,
                    minWidth: `calc((100% - ${gap * (itemsPerView - 1)}px) / ${itemsPerView})`,
                  }}
                >
                  {child}
                </div>
              );
            })
          : items.map((item, index) => (
              <div
                key={item.id}
                className="flex-shrink-0 shrink-0"
                style={{
                  width: `calc((100% - ${gap * (itemsPerView - 1)}px) / ${itemsPerView})`,
                  minWidth: `calc((100% - ${gap * (itemsPerView - 1)}px) / ${itemsPerView})`,
                }}
              >
                {renderItem?.(item, index)}
              </div>
            ))}
      </div>

      {(showArrows || showDots) && items.length > itemsPerView && (
        <div className="flex flex-col items-center gap-4 mt-6">
          {showArrows && (
            <div className="flex gap-3">
              <button
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="w-10 h-10 rounded-full bg-black/80 border border-[#2a2a2a] flex items-center justify-center text-yellow hover:bg-yellow hover:text-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Previous"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() =>
                  setCurrentIndex((prev) =>
                    Math.min(Math.max(0, items.length - itemsPerView), prev + 1)
                  )
                }
                disabled={
                  currentIndex >= Math.max(0, items.length - itemsPerView)
                }
                className="w-10 h-10 rounded-full bg-black/80 border border-[#2a2a2a] flex items-center justify-center text-yellow hover:bg-yellow hover:text-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Next"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
          {showDots && (
            <div className="flex gap-2">
              {Array.from(
                { length: Math.max(1, items.length - itemsPerView + 1) },
                (_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i === currentIndex ? "bg-yellow" : "bg-gray-5 hover:bg-gray-4"
                    }`}
                    aria-label={`Go to slide ${i + 1}`}
                  />
                )
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}