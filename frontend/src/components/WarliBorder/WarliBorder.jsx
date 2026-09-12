import React, { useId } from "react";
import "./warli-border.css";
import "./WarliBorder.css";
export default function WarliBorder({
  position = "top",
  height = 52,
  className = "",
}) {
  const patternId = `warli-${useId().replace(/:/g, "")}`;

  return (
    <div
      className={`warli-border warli-border--${position} ${className}`}
      style={{ "--warli-height": `${height}px` }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1200 56"
        preserveAspectRatio="none"
        width="100%"
        height="100%"
        focusable="false"
      >
        <defs>
          <pattern
            id={patternId}
            width="360"
            height="56"
            patternUnits="userSpaceOnUse"
          >
            {/* Background */}
            <rect width="360" height="56" fill="#7a1f1f" />

            {/* Dotted borders */}
            <path
              d="M0 4H360 M0 52H360"
              stroke="#f5e6c8"
              strokeWidth="1.2"
              strokeDasharray="2 4"
              opacity="0.9"
            />

            {/* Sun / flower motif */}
            <g
              transform="translate(24 28)"
              stroke="#f5e6c8"
              strokeWidth="1.5"
              fill="none"
            >
              <circle r="5" />
              <circle r="1.4" fill="#f5e6c8" />

              {Array.from({ length: 8 }).map((_, index) => {
                const angle = index * 45;

                return (
                  <line
                    key={angle}
                    x1="0"
                    y1="-8"
                    x2="0"
                    y2="-12"
                    transform={`rotate(${angle})`}
                  />
                );
              })}
            </g>

            {/* Dancing figures */}
            <g
              transform="translate(52 10)"
              stroke="#f5e6c8"
              strokeWidth="1.6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Dancer one */}
              <g transform="translate(0 0)">
                <circle cx="12" cy="6" r="3" />
                <path d="M12 9L6 20L18 20Z" />
                <path d="M6 20L12 31L18 20Z" />
                <path d="M8 14L1 10M16 14L23 9" />
                <path d="M10 31L6 40M14 31L20 39" />
              </g>

              {/* Dancer two */}
              <g transform="translate(31 0)">
                <circle cx="12" cy="6" r="3" />
                <path d="M12 9L6 20L18 20Z" />
                <path d="M6 20L12 31L18 20Z" />
                <path d="M8 14L1 9M16 14L23 10" />
                <path d="M10 31L5 39M14 31L19 40" />
              </g>

              {/* Joined hands */}
              <path d="M23 9L32 9" />
            </g>

            {/* Tree */}
            <g
              transform="translate(118 7)"
              stroke="#f5e6c8"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 42V19" />
              <path d="M17 23L8 15M17 26L27 17M17 31L6 25M17 33L29 27" />
              <path d="M17 19L17 8" />

              <circle cx="17" cy="7" r="5" />
              <circle cx="8" cy="14" r="5" />
              <circle cx="28" cy="16" r="5" />
              <circle cx="6" cy="25" r="4" />
              <circle cx="30" cy="27" r="4" />
            </g>

            {/* Farmer */}
            <g
              transform="translate(166 10)"
              stroke="#f5e6c8"
              strokeWidth="1.6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="10" cy="6" r="3" />
              <path d="M10 9L5 19L15 19Z" />
              <path d="M5 19L10 29L15 19Z" />
              <path d="M7 14L0 20M13 14L21 19" />
              <path d="M8 29L4 39M12 29L17 39" />

              {/* Farming tool */}
              <path d="M21 12L25 40M21 18L30 14" />
            </g>

            {/* Musician with drum */}
            <g
              transform="translate(210 9)"
              stroke="#f5e6c8"
              strokeWidth="1.6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="6" r="3" />
              <path d="M12 9L6 20L18 20Z" />
              <path d="M6 20L12 31L18 20Z" />
              <path d="M8 14L3 23M16 14L22 23" />
              <path d="M10 31L6 40M14 31L19 40" />

              <ellipse cx="12" cy="23" rx="8" ry="5" />
              <path d="M4 23H20" />
            </g>

            {/* Cow */}
            <g
              transform="translate(257 15)"
              stroke="#f5e6c8"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12Q18 3 34 11L32 25H8Z" />
              <path d="M34 11L42 8L47 13L42 18L33 17" />

              {/* Horns */}
              <path d="M42 8L40 3M46 11L49 6" />

              {/* Legs */}
              <path d="M11 24L9 34M18 24L19 34M27 24L26 34M32 24L35 34" />

              {/* Tail */}
              <path d="M6 12L1 7L0 12" />

              <circle cx="43" cy="12" r="0.8" fill="#f5e6c8" />
            </g>

            {/* Floral motif */}
            <g
              transform="translate(335 28)"
              stroke="#f5e6c8"
              strokeWidth="1.4"
              fill="none"
            >
              <circle r="3" fill="#f5e6c8" />

              {Array.from({ length: 8 }).map((_, index) => {
                const angle = index * 45;

                return (
                  <ellipse
                    key={angle}
                    cx="0"
                    cy="-8"
                    rx="2.5"
                    ry="5"
                    transform={`rotate(${angle})`}
                  />
                );
              })}
            </g>
          </pattern>
        </defs>

        <rect width="100%" height="56" fill={`url(#${patternId})`} />
      </svg>
    </div>
  );
}