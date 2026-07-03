"use client";

import React from "react";
import { Message } from "@/lib/types";

interface MessageBubbleProps {
  message: Message;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isInbound = message.direction === "inbound";

  return (
    <div className={`message ${isInbound ? "inbound" : "outbound"} mb-3`}>
      {message.isAutomation ? (
        <div className="automation-notice">
          <span className="w-[6px] h-[6px] bg-green rounded-full animate-pulse inline-block mr-2" />
          {message.text}
        </div>
      ) : (
        <div className="message-bubble">
          <p className="text-[13px] text-gray-1 leading-relaxed">
            {message.text}
          </p>
          <div className="flex items-center justify-end gap-1.5 mt-1">
            <span
              className={`w-[6px] h-[6px] rounded-full ${
                message.channel === "whatsapp" ? "bg-wa-green" : "bg-blue"
              }`}
            />
            <span className="text-[10px] text-gray-5 font-mono">
              {message.time}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default MessageBubble;
