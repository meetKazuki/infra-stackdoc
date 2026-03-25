import React from "react";
import { colors, fonts, deviceAccent } from "../theme";
import { getDeviceIconPath, getSpecIconPath } from "../icons";
import { ServiceIcon } from './ServiceIcon'
import type { Device, Connection } from "@homelab-stackdoc/core";

interface DetailModalProps {
  child: Device;
  parent: Device;
  connections: Connection[];
  onClose: () => void;
}

const Tag: React.FC<{ label: string; accent: string }> = ({ label, accent }) => (
  <span
    style={{
      fontSize: 8, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase",
      color: accent, background: `${accent}18`, border: `1px solid ${accent}33`,
      borderRadius: 3, padding: "1px 6px", lineHeight: "16px",
    }}
  >
    {label}
  </span>
);

export const DetailModal: React.FC<DetailModalProps> = ({
  child,
  parent,
  connections,
  onClose,
}) => {
  const accent = deviceAccent(child.type);
  const specs = child.specs
    ? Object.entries(child.specs).filter(([, v]) => v)
    : [];
  const services = child.services ?? [];
  const tags = child.tags ?? [];

  // Find connections involving this child
  const childConns = connections.filter(
    (c) => c.from === child.id || c.to === child.id,
  );

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, fontFamily: fonts.mono,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 420, maxHeight: "80vh", overflowY: "auto",
          background: colors.backgroundSubtle,
          border: `1px solid ${accent}44`,
          borderRadius: 8, overflow: "hidden",
          boxShadow: `0 0 40px ${accent}22`,
        }}
      >
        {/* Top accent bar */}
        <div style={{ height: 3, background: accent }} />

        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: `${accent}15`, border: `1.5px solid ${accent}44`,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill={accent}>
                <path d={getDeviceIconPath(child.type)} />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: colors.textPrimary, fontSize: 15, fontWeight: 700 }}>
                {child.name}
              </div>
              {child.ip && (
                <div style={{ color: colors.textSecondary, fontSize: 11 }}>{child.ip}</div>
              )}
            </div>
            <Tag label={child.type.toUpperCase()} accent={accent} />
            <button
              onClick={onClose}
              style={{
                background: "none", border: "none", color: colors.textMuted,
                cursor: "pointer", fontSize: 20, padding: "0 4px", lineHeight: 1,
                fontFamily: fonts.mono,
              }}
            >
              ×
            </button>
          </div>

          {/* Parent info */}
          <div style={{
            fontSize: 10, color: colors.textMuted,
            display: "flex", alignItems: "center", gap: 4,
          }}>
            <span>Hosted on</span>
            <span style={{ color: deviceAccent(parent.type) }}>{parent.name}</span>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {tags.map((t) => <Tag key={t} label={t} accent={accent} />)}
            </div>
          )}

          {/* Specs */}
          {specs.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px" }}>
              {specs.map(([key, value]) => (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <svg width={12} height={12} viewBox="0 0 24 24" fill={colors.textMuted}>
                    <path d={getSpecIconPath(key)} />
                  </svg>
                  <span style={{ fontSize: 11, color: colors.textPrimary }}>{value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Services */}
          {services.length > 0 && (
            <div>
              <div style={{
                fontSize: 9, color: colors.textMuted, textTransform: "uppercase",
                letterSpacing: "0.08em", marginBottom: 6, fontWeight: 700,
              }}>
                Services
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {services.map((svc) => (
                  <div key={svc.name} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "6px 10px", background: `${colors.green}08`,
                    border: `1px solid ${colors.green}18`, borderRadius: 4,
                  }}>
                    <ServiceIcon name={svc.name} size={20} />
                    <span style={{
                      color: colors.textPrimary, fontSize: 12,
                      fontWeight: 600, flex: 1,
                    }}>
                      {svc.name}
                    </span>
                    {svc.port && (
                      <span style={{ color: colors.textMuted, fontSize: 10 }}>
                        :{svc.port}
                      </span>
                    )}
                    {svc.runtime && (
                      <span style={{
                        fontSize: 8, fontWeight: 700, letterSpacing: "0.04em",
                        textTransform: "uppercase", color: colors.textMuted,
                        background: `${colors.textMuted}15`,
                        border: `1px solid ${colors.textMuted}25`,
                        borderRadius: 3, padding: "1px 5px",
                      }}>
                        {svc.runtime}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Connections */}
          {childConns.length > 0 && (
            <div>
              <div style={{
                fontSize: 9, color: colors.textMuted, textTransform: "uppercase",
                letterSpacing: "0.08em", marginBottom: 6, fontWeight: 700,
              }}>
                Connections
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {childConns.map((conn, i) => {
                  const target = conn.from === child.id ? conn.to : conn.from;
                  const dir = conn.from === child.id ? "→" : "←";
                  return (
                    <div key={i} style={{ fontSize: 11, color: colors.textSecondary }}>
                      {dir} {target}
                      {conn.type && (
                        <span style={{ color: colors.textMuted }}> ({conn.type})</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
