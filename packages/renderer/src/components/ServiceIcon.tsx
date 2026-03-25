import React, { useState } from "react";
import { colors } from "../theme";

const CDN_BASE = "https://cdn.jsdelivr.net/gh/selfhst/icons/svg";

/**
 * Converts a service name to the selfh.st icon reference format.
 * "AdGuard Home" → "adguard-home"
 * "Pi-hole" → "pi-hole"
 * "qBittorrent" → "qbittorrent"
 */
function toIconRef(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface ServiceIconProps {
  name: string;
  size?: number;
  fallbackColor?: string;
}

export const ServiceIcon: React.FC<ServiceIconProps> = ({
  name,
  size = 18,
  fallbackColor = colors.green,
}) => {
  const ref = toIconRef(name);
  const [src, setSrc] = useState(`${CDN_BASE}/${ref}.svg`);
  const [failed, setFailed] = useState(false);
  const [triedLight, setTriedLight] = useState(false);

  const handleError = () => {
    if (!triedLight) {
      // Try the light variant for dark backgrounds
      setTriedLight(true);
      setSrc(`${CDN_BASE}/${ref}-light.svg`);
    } else {
      // Both failed — show fallback
      setFailed(true);
    }
  };

  if (failed) {
    // Fallback: coloured dot with first letter
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: `${fallbackColor}25`,
          border: `1px solid ${fallbackColor}44`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.45,
          fontWeight: 700,
          color: fallbackColor,
          fontFamily: "'JetBrains Mono', monospace",
          flexShrink: 0,
        }}
      >
        {name.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      onError={handleError}
      style={{
        borderRadius: 3,
        objectFit: "contain",
        flexShrink: 0,
      }}
    />
  );
};

/**
 * Hook to get the icon URL for a service name.
 * Useful when you need just the URL, not the component.
 */
export function getServiceIconUrl(name: string): string {
  return `${CDN_BASE}/${toIconRef(name)}.svg`;
}
