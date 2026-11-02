import React from 'react';

interface TechyTrackerLogoProps {
  className?: string;
}

export const TechyTrackerLogo: React.FC<TechyTrackerLogoProps> = ({
  className = 'w-9 h-9',
}) => {
  return (
    <div
      className={`${className} rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 dark:from-indigo-500 dark:to-indigo-700 text-white flex items-center justify-center shadow-sm shadow-indigo-500/20 shrink-0 select-none`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-6 h-6"
      >
        {/* Stylized Smart Wallet / Ledger Frame */}
        <rect
          x="4"
          y="7"
          width="28"
          height="22"
          rx="5"
          className="stroke-white/25"
          strokeWidth="1.75"
        />
        {/* Upward Analytics Trend Line in Background */}
        <path
          d="M8 24L13.5 19L18 21.5L26.5 12.5"
          stroke="#A5B4FC"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M23 12.5H26.5V16"
          stroke="#A5B4FC"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Crisp Indian Rupee (₹) Symbol Foreground */}
        <path
          d="M11 11.5H20.5M11 15.5H19.5M15.5 11.5C17.433 11.5 19 12.8431 19 14.5C19 16.1569 17.433 17.5 15.5 17.5H12.5L18.5 24.5"
          stroke="white"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
