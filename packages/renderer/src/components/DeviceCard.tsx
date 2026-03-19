import React, { useState } from "react";
import type { PositionedNode } from "@homelab-stackdoc/core";
import { colors, fonts, deviceAccent } from "../theme";
import { getIconPath } from "../icons";

interface DeviceCardProps {
  node: PositionedNode;
  isExpanded: boolean;
  hasChildren: boolean;
  onToggleExpand: (id: string) => void;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({
  node,
  isExpanded,
  hasChildren,
  onToggleExpand,
}) => {
  const [hovered, setHovered] = useState(false);
  const { device, x, y, width, height } = node;
  const accent = deviceAccent(device.type);

  const specs = device.specs
    ? Object.entries(device.specs).filter(([, v]) => v)
    : [];
  const tags = device.tags ?? [];
  const services = device.services ?? [];

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        height,
        overflow: "hidden",
        background: hovered ? "rgba(0,229,255,0.06)" : colors.backgroundSubtle,
        borderRadius: 6,
        fontFamily: fonts.mono,
        cursor: hasChildren ? "pointer" : "default",
        transition: "border-color 0.2s, background 0.2s, box-shadow 0.2s",
        boxShadow: hovered
          ? `0 0 20px ${accent}22, inset 0 0 20px ${accent}08`
          : "none",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "row",
      }}
      onClick={(e) => {
        if (hasChildren) {
          e.stopPropagation();
          onToggleExpand(device.id);
        }
      }}
    >
      {/* Left accent bar */}
      <div
        style={{
          width: 3,
          flexShrink: 0,
          background: accent,
          borderRadius: "6px 0 0 6px",
          opacity: hovered ? 1 : 0.6,
          transition: "opacity 0.2s",
        }}
      />

      {/* Content area */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          padding: "8px 10px",
          border: `1px solid ${hovered ? accent : colors.border}`,
          borderLeft: "none",
          borderRadius: "0 6px 6px 0",
          transition: "border-color 0.2s",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header: icon + name + expand indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <svg
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill={accent}
            style={{ flexShrink: 0 }}
          >
            <path d={getIconPath(device.type)} />
          </svg>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                color: colors.textPrimary,
                fontSize: 12,
                fontWeight: 600,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {device.name}
            </div>
            {device.ip && (
              <div
                style={{
                  color: colors.textSecondary,
                  fontSize: 10,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {device.ip}
              </div>
            )}
          </div>
          {/* Expand/collapse chevron */}
          {hasChildren && (
            <svg
              width={14}
              height={14}
              viewBox="0 0 24 24"
              fill={colors.textMuted}
              style={{
                flexShrink: 0,
                transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
              }}
            >
              <path d="M7 10l5 5 5-5z" />
            </svg>
          )}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 3,
              marginTop: 6,
            }}
          >
            {tags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: 8,
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  color: accent,
                  background: `${accent}18`,
                  border: `1px solid ${accent}33`,
                  borderRadius: 3,
                  padding: "1px 5px",
                  lineHeight: "14px",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Specs — compact */}
        {specs.length > 0 && (
          <div
            style={{
              marginTop: 5,
              display: "flex",
              flexWrap: "wrap",
              gap: "2px 10px",
              overflow: "hidden",
            }}
          >
            {specs.map(([key, value]) => (
              <div
                key={key}
                style={{
                  fontSize: 9,
                  color: colors.textSecondary,
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  style={{
                    color: colors.textMuted,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {key}
                </span>{" "}
                <span style={{ color: colors.textPrimary }}>{value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Services list (visible for leaf nodes or expanded parents) */}
        {services.length > 0 && (
          <div
            style={{
              marginTop: 5,
              borderTop: `1px solid ${colors.border}`,
              paddingTop: 4,
              overflow: "hidden",
            }}
          >
            {services.map((svc) => (
              <div
                key={svc.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 9,
                  marginTop: 2,
                }}
              >
                <span
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: colors.green,
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: colors.textPrimary }}>{svc.name}</span>
                {svc.port && (
                  <span style={{ color: colors.textMuted }}>:{svc.port}</span>
                )}
                {svc.runtime && (
                  <span
                    style={{
                      fontSize: 7,
                      color: colors.textMuted,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {svc.runtime}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Collapsed children count badge */}
        {hasChildren && !isExpanded && (
          <div
            style={{
              marginTop: 5,
              fontSize: 9,
              color: colors.textMuted,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <svg width={10} height={10} viewBox="0 0 24 24" fill={colors.textMuted}>
              <path d="M4 14h7v-2H4v2zm0 4h7v-2H4v2zm0-8h7V8H4v2zm9 4h7v-2h-7v2zm0 4h7v-2h-7v2zm0-8h7V8h-7v2z" />
            </svg>
            click to expand
          </div>
        )}
      </div>
    </div>
  );
};
