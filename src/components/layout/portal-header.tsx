import React from "react";
import Avatar from "@/components/ui/avatar";

interface PortalHeaderProps {
  userName?: string;
  companyName?: string;
  userInitials?: string;
  className?: string;
}

function PortalHeader({
  userName,
  companyName,
  userInitials,
  className = "",
}: PortalHeaderProps) {
  return (
    <header
      className={`bg-black border-b border-[#1A1A1A] px-10 h-16 flex items-center justify-between ${className}`}
    >
      <div className="flex items-center gap-2">
        <div className="sidebar-logo !pb-0 !border-none !mb-0 flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-full border-2 border-[var(--pm-gold)] flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--pm-gold)]" />
          </span>
          <span className="font-display text-[12px] font-bold uppercase tracking-wider">
            Market Link
          </span>
        </div>
        <span className="text-xs text-gray-5 font-normal ml-2">
          Client Portal
        </span>
      </div>
      {userInitials && (
        <div className="flex items-center gap-2.5 text-[13px] text-gray-3">
          <Avatar initials={userInitials} variant="yellow" size="sm" />
          <div>
            <div className="text-[13px] font-semibold leading-tight">
              {userName}
            </div>
            {companyName && (
              <div className="text-[11px] text-gray-5">{companyName}</div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default PortalHeader;
