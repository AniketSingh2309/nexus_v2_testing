import React from 'react';

/**
 * Renders the official provider logo image.
 * size: pixel size (default 20). wrap: adds a rounded container bg.
 */
export default function ProviderLogo({ provider, size = 20, wrap = false, style = {} }) {
  const base = import.meta.env.BASE_URL || '/';
  const logoMap = {
    aws:   `${base}logos/aws.svg`,
    gcp:   `${base}logos/gcp.svg`,
    azure: `${base}logos/azure.svg`,
  };
  const bgMap = {
    aws:   'rgba(255,153,0,0.12)',
    gcp:   'rgba(66,133,244,0.12)',
    azure: 'rgba(0,138,215,0.12)',
  };

  const src = logoMap[provider];
  if (!src) return null;

  const img = (
    <img
      src={src}
      alt={provider.toUpperCase()}
      style={{ width: size, height: size, objectFit: 'contain', display: 'block', ...style }}
      draggable={false}
    />
  );

  if (!wrap) return img;

  return (
    <div style={{
      width: size + 16, height: size + 16,
      borderRadius: 8,
      background: bgMap[provider] || 'rgba(128,128,128,0.1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      {img}
    </div>
  );
}
