import React from 'react';

// Official-ish service colors & abbreviations per service type
const SERVICE_MAP = {
  // ── AWS ───────────────────────────────────────────────────────────────────
  'EC2 Instance':           { abbr: 'EC2',  bg: '#FF9900', fg: '#fff' },
  'RDS Instance':           { abbr: 'RDS',  bg: '#2E73B8', fg: '#fff' },
  'RDS Cluster':            { abbr: 'RDS',  bg: '#2E73B8', fg: '#fff' },
  'S3 Bucket':              { abbr: 'S3',   bg: '#3F8624', fg: '#fff' },
  'Lambda Function':        { abbr: 'λ',    bg: '#FF9900', fg: '#fff' },
  'EKS Cluster':            { abbr: 'EKS',  bg: '#7B2FBE', fg: '#fff' },
  'ECS Cluster':            { abbr: 'ECS',  bg: '#FF9900', fg: '#fff' },
  'ECS Service':            { abbr: 'ECS',  bg: '#FF9900', fg: '#fff' },
  'ElastiCache Cluster':    { abbr: 'ELC',  bg: '#C7131F', fg: '#fff' },
  'Load Balancer':          { abbr: 'ALB',  bg: '#7B2FBE', fg: '#fff' },
  'Application Load Balancer': { abbr: 'ALB', bg: '#7B2FBE', fg: '#fff' },
  'Network Load Balancer':  { abbr: 'NLB',  bg: '#7B2FBE', fg: '#fff' },
  'SQS Queue':              { abbr: 'SQS',  bg: '#FF4F8B', fg: '#fff' },
  'SNS Topic':              { abbr: 'SNS',  bg: '#FF4F8B', fg: '#fff' },
  'EFS Filesystem':         { abbr: 'EFS',  bg: '#3F8624', fg: '#fff' },
  'Security Group':         { abbr: 'SG',   bg: '#DD344C', fg: '#fff' },
  'Route Table':            { abbr: 'RT',   bg: '#8C4FFF', fg: '#fff' },
  'VPC':                    { abbr: 'VPC',  bg: '#8C4FFF', fg: '#fff' },
  'Internet Gateway':       { abbr: 'IGW',  bg: '#8C4FFF', fg: '#fff' },
  'NAT Gateway':            { abbr: 'NAT',  bg: '#8C4FFF', fg: '#fff' },
  'Route 53 Hosted Zone':   { abbr: 'R53',  bg: '#9B59B6', fg: '#fff' },
  'CloudWatch Alarm':       { abbr: 'CWA',  bg: '#E67E22', fg: '#fff' },
  'Lightsail Instance':     { abbr: 'LS',   bg: '#FF9900', fg: '#fff' },
  'Lightsail Database':     { abbr: 'LSD',  bg: '#2E73B8', fg: '#fff' },

  // ── GCP ───────────────────────────────────────────────────────────────────
  'Compute Engine VM':      { abbr: 'GCE',  bg: '#4285F4', fg: '#fff' },
  'Cloud SQL Instance':     { abbr: 'SQL',  bg: '#4285F4', fg: '#fff' },
  'Cloud Storage Bucket':   { abbr: 'GCS',  bg: '#4285F4', fg: '#fff' },
  'GKE Cluster':            { abbr: 'GKE',  bg: '#4285F4', fg: '#fff' },
  'Cloud Function':         { abbr: 'GCF',  bg: '#4285F4', fg: '#fff' },
  'Cloud Run Service':      { abbr: 'CR',   bg: '#4285F4', fg: '#fff' },
  'BigQuery Dataset':       { abbr: 'BQ',   bg: '#4285F4', fg: '#fff' },
  'Pub/Sub Topic':          { abbr: 'PS',   bg: '#4285F4', fg: '#fff' },

  // ── AZURE ─────────────────────────────────────────────────────────────────
  'Virtual Machine':        { abbr: 'VM',   bg: '#008AD7', fg: '#fff' },
  'Azure SQL Database':     { abbr: 'SQL',  bg: '#008AD7', fg: '#fff' },
  'Storage Account':        { abbr: 'ST',   bg: '#008AD7', fg: '#fff' },
  'AKS Cluster':            { abbr: 'AKS',  bg: '#008AD7', fg: '#fff' },
  'Azure Function App':     { abbr: 'FA',   bg: '#008AD7', fg: '#fff' },
  'Cosmos DB Account':      { abbr: 'CDB',  bg: '#008AD7', fg: '#fff' },
  'Event Hub Namespace':    { abbr: 'EH',   bg: '#008AD7', fg: '#fff' },
  'Virtual Network':        { abbr: 'VN',   bg: '#008AD7', fg: '#fff' },
};

// Family-level fallbacks
const FAMILY_MAP = {
  Compute:    { abbr: 'VM',  bg: '#64748b', fg: '#fff' },
  Database:   { abbr: 'DB',  bg: '#2E73B8', fg: '#fff' },
  Storage:    { abbr: 'ST',  bg: '#3F8624', fg: '#fff' },
  Serverless: { abbr: 'FN',  bg: '#FF9900', fg: '#fff' },
  Container:  { abbr: 'K8S', bg: '#326CE5', fg: '#fff' },
  Networking: { abbr: 'NET', bg: '#8C4FFF', fg: '#fff' },
  Messaging:  { abbr: 'MSG', bg: '#FF4F8B', fg: '#fff' },
  Cache:      { abbr: 'CAC', bg: '#C7131F', fg: '#fff' },
  Analytics:  { abbr: 'ANL', bg: '#0891b2', fg: '#fff' },
  Security:   { abbr: 'SEC', bg: '#DD344C', fg: '#fff' },
  DNS:        { abbr: 'DNS', bg: '#9B59B6', fg: '#fff' },
  Monitoring: { abbr: 'MON', bg: '#E67E22', fg: '#fff' },
};

const DEFAULT = { abbr: 'SVC', bg: '#94a3b8', fg: '#fff' };

export default function ServiceLogo({ type, family, size = 32 }) {
  const cfg = SERVICE_MAP[type] || FAMILY_MAP[family] || DEFAULT;
  const fontSize = size <= 28 ? 9 : size <= 36 ? 10 : 12;
  const abbr = cfg.abbr;
  const letterSpacing = abbr.length >= 3 ? '-0.5px' : '0';

  return (
    <div style={{
      width: size, height: size, borderRadius: 7,
      background: cfg.bg, color: cfg.fg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 800, fontSize, letterSpacing,
      flexShrink: 0, userSelect: 'none',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {abbr}
    </div>
  );
}
