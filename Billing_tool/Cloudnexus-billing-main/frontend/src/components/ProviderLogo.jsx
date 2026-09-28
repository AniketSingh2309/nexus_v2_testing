import React from 'react';

const BASE = import.meta.env.BASE_URL || '/';
const LOGOS = {
  aws:   `${BASE}logos/aws.svg`,
  gcp:   `${BASE}logos/gcp.svg`,
  azure: `${BASE}logos/azure.svg`,
};

const LABELS = {
  aws:   'Amazon Web Services',
  gcp:   'Google Cloud Platform',
  azure: 'Microsoft Azure',
};

export default function ProviderLogo({ provider, size = 16 }) {
  const src = LOGOS[provider];
  const label = LABELS[provider] || provider;

  if (!src) {
    return (
      <span
        style={{
          display: 'inline-block',
          width: size,
          height: size,
          borderRadius: '50%',
          background: '#94a3b8',
          flexShrink: 0,
          verticalAlign: 'middle',
        }}
        aria-label={label}
      />
    );
  }

  return (
    <img
      src={src}
      alt={label}
      width={size}
      height={size}
      style={{ objectFit: 'contain', display: 'inline-block', flexShrink: 0, verticalAlign: 'middle' }}
    />
  );
}
