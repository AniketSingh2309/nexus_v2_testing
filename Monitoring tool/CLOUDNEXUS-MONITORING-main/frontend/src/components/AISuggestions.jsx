import React, { useState, useCallback } from 'react';

/* ─── Color constants ───────────────────────────────────────────────────────── */
const SEV_COLOR = { critical: '#dc2626', high: '#f97316', medium: '#eab308', low: '#22c55e' };
const SEV_BG    = { critical: 'rgba(220,38,38,0.10)', high: 'rgba(249,115,22,0.10)', medium: 'rgba(234,179,8,0.08)', low: 'rgba(34,197,94,0.08)' };
const SEV_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

const IMPACT_COLOR = { high: '#ef4444', medium: '#eab308', low: '#22c55e' };
const IMPACT_BG    = { high: 'rgba(239,68,68,0.10)', medium: 'rgba(234,179,8,0.08)', low: 'rgba(34,197,94,0.08)' };
const IMPACT_ORDER = { high: 0, medium: 1, low: 2 };

const CAT_COLOR = { cost: '#8b5cf6', performance: '#f59e0b', reliability: '#3b82f6', 'best-practice': '#10b981' };
const CAT_BG    = { cost: 'rgba(139,92,246,0.08)', performance: 'rgba(245,158,11,0.08)', reliability: 'rgba(59,130,246,0.08)', 'best-practice': 'rgba(16,185,129,0.08)' };
const CAT_ICON  = { cost: '', performance: '', reliability: '', 'best-practice': '' };

/* ─── Reusable info block ───────────────────────────────────────────────────── */
function InfoBlock({ title, text, color }) {
  return (
    <div style={{
      padding: '12px 16px', borderRadius: 8,
      background: color ? `${color}0A` : 'var(--bg)',
      border: `1px solid ${color ? `${color}25` : 'var(--border)'}`,
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: color || 'var(--text3)',
        textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8,
      }}>
        {title}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
        {text}
      </div>
    </div>
  );
}

/* ─── Circular score ring (SVG) ─────────────────────────────────────────────── */
function ScoreRing({ score, max = 10, size = 100 }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(score / max, 1);
  const offset = circumference * (1 - pct);
  const color = score >= 8 ? '#dc2626' : score >= 5 ? '#eab308' : '#22c55e';
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border)" strokeWidth={6} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        style={{ transform: 'rotate(90deg)', transformOrigin: 'center', fontSize: 28, fontWeight: 800, fill: color }}>
        {score}
      </text>
      <text x={size / 2} y={size / 2 + 16} textAnchor="middle" dominantBaseline="central"
        style={{ transform: 'rotate(90deg)', transformOrigin: 'center', fontSize: 10, fill: 'var(--text3)' }}>
        /{max}
      </text>
    </svg>
  );
}

/* ─── Provider badge ────────────────────────────────────────────────────────── */
function ProviderBadge({ provider }) {
  const colors = { aws: '#ff9900', gcp: '#4285f4', azure: '#0078d4' };
  const c = colors[provider] || 'var(--text3)';
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
      background: `${c}15`, color: c, textTransform: 'uppercase', letterSpacing: 0.5,
    }}>
      {provider}
    </span>
  );
}

/* ════════════════════════════════════════════════════════════════════════════════
   LOCAL RULE-BASED SECURITY ANALYSIS
   No API key needed — scans the actual resource arrays passed as props.
   ════════════════════════════════════════════════════════════════════════════════ */
function runSecurityAnalysis(aws, gcp, azure) {
  const findings = [];
  let fid = 0;
  const add = (f) => { fid++; findings.push({ id: `sec-${fid}`, ...f }); };

  /* ── helper: detect open SG ports ── */
  const sgs = aws.filter(s => s.type === 'Security Group');
  const openSGMap = {};
  sgs.forEach(sg => {
    const openPorts = [];
    (sg.inboundRules || []).forEach(rule => {
      const isOpen = rule.sources?.some(src => src.value === '0.0.0.0/0' || src.value === '::/0');
      if (!isOpen) return;
      const from = rule.fromPort ?? rule.port;
      const to = rule.toPort ?? rule.port;
      if (from === 0 && to === 65535) openPorts.push('ALL');
      else if (from === 22) openPorts.push('SSH(22)');
      else if (from === 3389) openPorts.push('RDP(3389)');
      else if (from !== undefined) openPorts.push(`${from}${to && to !== from ? `-${to}` : ''}`);
    });
    if (openPorts.length) openSGMap[sg.name || sg.rawId] = openPorts;
  });

  /* ── AWS: EC2 with public IPs ── */
  const ec2 = aws.filter(s => s.type === 'EC2 Instance');
  const publicEC2 = ec2.filter(s => s.publicIp);
  if (publicEC2.length) {
    add({
      title: `${publicEC2.length} EC2 instance${publicEC2.length > 1 ? 's' : ''} with public IP addresses`,
      severity: 'high', provider: 'aws', service: 'EC2',
      affectedResources: publicEC2.map(s => s.name),
      description: `${publicEC2.length} EC2 instances are directly exposed to the internet via public IP addresses. Each public IP increases attack surface and incurs charges ($3.65/month since Feb 2024).`,
      howItCanBeHacked: '1. Attacker scans AWS IP ranges using masscan or Shodan to discover your public IPs\n2. Identifies running services (SSH, HTTP, databases) via port scanning\n3. Attempts brute-force login on SSH/RDP or exploits unpatched services\n4. If successful, pivots to internal resources via the instance\'s VPC access\n5. Exfiltrates data from attached EBS volumes, S3 buckets, or connected databases',
      howToFix: '1. Remove public IPs: aws ec2 modify-instance-attribute --instance-id <id> --no-associate-public-ip-address\n2. Use a NAT Gateway for outbound-only internet access\n3. Place web-facing instances behind an Application Load Balancer\n4. Use AWS Systems Manager Session Manager for SSH without public IPs\n5. Release unused Elastic IPs: aws ec2 release-address --allocation-id <id>',
      estimatedFixTime: '30 minutes',
      sourceUrl: 'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-instance-addressing.html',
      sourceTitle: 'AWS: EC2 Instance IP Addressing',
    });
  }

  /* ── AWS: Security Groups with 0.0.0.0/0 ── */
  const openSGNames = Object.keys(openSGMap);
  const dangerousSGs = openSGNames.filter(name => {
    const ports = openSGMap[name];
    return ports.some(p => p === 'ALL' || p === 'SSH(22)' || p === 'RDP(3389)');
  });
  if (dangerousSGs.length) {
    const details = dangerousSGs.map(name => `${name}: ${openSGMap[name].join(', ')}`).join('\n');
    add({
      title: `${dangerousSGs.length} security group${dangerousSGs.length > 1 ? 's' : ''} with dangerous inbound rules open to 0.0.0.0/0`,
      severity: 'critical', provider: 'aws', service: 'VPC Security Groups',
      affectedResources: dangerousSGs,
      description: `Security groups are allowing inbound traffic from the entire internet (0.0.0.0/0) on sensitive ports:\n${details}\n\nThis is the #1 cloud misconfiguration leading to breaches.`,
      howItCanBeHacked: '1. Attacker discovers open ports via automated scanning tools (Shodan, Censys)\n2. SSH(22) open: brute-force or credential stuffing attacks using hydra/medusa\n3. RDP(3389) open: BlueKeep (CVE-2019-0708) exploitation or brute-force\n4. All ports open: attacker probes every service, finds weakest entry point\n5. Once inside, lateral movement across VPC using compromised instance credentials',
      howToFix: '1. Restrict SSH to your office/VPN IP: aws ec2 authorize-security-group-ingress --group-id <sg-id> --protocol tcp --port 22 --cidr YOUR_IP/32\n2. Remove 0.0.0.0/0 rules: aws ec2 revoke-security-group-ingress --group-id <sg-id> --protocol tcp --port 22 --cidr 0.0.0.0/0\n3. Use AWS Systems Manager Session Manager instead of SSH\n4. Enable VPC Flow Logs to monitor traffic before and after changes',
      estimatedFixTime: '15 minutes per security group',
      sourceUrl: 'https://docs.aws.amazon.com/vpc/latest/userguide/security-group-rules.html',
      sourceTitle: 'AWS: Security Group Rules',
    });
  }

  /* ── AWS: RDS publicly accessible ── */
  const rds = aws.filter(s => s.family === 'Database' && s.provider === 'aws');
  const publicRDS = rds.filter(s => s.publiclyAccessible);
  if (publicRDS.length) {
    add({
      title: `${publicRDS.length} RDS instance${publicRDS.length > 1 ? 's' : ''} publicly accessible`,
      severity: 'critical', provider: 'aws', service: 'RDS',
      affectedResources: publicRDS.map(s => s.name),
      description: `Database instances are directly reachable from the internet. Even with strong passwords, this exposes your data to brute-force attacks, SQL injection from any source, and zero-day exploits.`,
      howItCanBeHacked: '1. Attacker discovers the RDS endpoint via DNS enumeration or AWS API calls\n2. Port scans confirm the database port is open (3306/MySQL, 5432/PostgreSQL)\n3. Attempts brute-force credentials using common username/password lists\n4. If credentials obtained (phishing, leaked .env files), connects directly and dumps all data\n5. Installs backdoor stored procedures for persistent access',
      howToFix: '1. Set Publicly Accessible to No:\n   aws rds modify-db-instance --db-instance-identifier <name> --no-publicly-accessible --apply-immediately\n2. Ensure the RDS instance is in a private subnet\n3. Use VPC peering, PrivateLink, or VPN for cross-network access\n4. Enable IAM Database Authentication for extra security',
      estimatedFixTime: '20 minutes',
      sourceUrl: 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_BestPractices.Security.html',
      sourceTitle: 'AWS: RDS Security Best Practices',
    });
  }

  /* ── AWS: S3 without encryption ── */
  const s3 = aws.filter(s => s.type === 'S3 Bucket');
  const noEncryptS3 = s3.filter(s => !s.encryption || s.encryption === 'none');
  if (noEncryptS3.length) {
    add({
      title: `${noEncryptS3.length} S3 bucket${noEncryptS3.length > 1 ? 's' : ''} without server-side encryption`,
      severity: 'high', provider: 'aws', service: 'S3',
      affectedResources: noEncryptS3.map(s => s.name),
      description: 'These S3 buckets do not have default server-side encryption enabled. Data stored without encryption can be read by anyone who gains access to the underlying storage.',
      howItCanBeHacked: '1. If bucket permissions are misconfigured (even temporarily), data is readable in plaintext\n2. AWS insider threat or physical media theft exposes unencrypted data\n3. Cross-account access misconfigurations reveal plain objects\n4. Compliance audits (SOC2, HIPAA, PCI-DSS) will flag unencrypted storage as a violation',
      howToFix: '1. Enable default encryption:\n   aws s3api put-bucket-encryption --bucket <name> --server-side-encryption-configuration \'{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}\'\n2. For sensitive data, use SSE-KMS with a customer-managed CMK\n3. Enable S3 Bucket Keys to reduce KMS costs by up to 99%',
      estimatedFixTime: '5 minutes per bucket',
      sourceUrl: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/serv-side-encryption.html',
      sourceTitle: 'AWS: S3 Server-Side Encryption',
    });
  }

  /* ── AWS: S3 without blockPublicAccess ── */
  const noBlockS3 = s3.filter(s => !s.blockPublicAccess);
  if (noBlockS3.length) {
    add({
      title: `${noBlockS3.length} S3 bucket${noBlockS3.length > 1 ? 's' : ''} without Block Public Access`,
      severity: 'high', provider: 'aws', service: 'S3',
      affectedResources: noBlockS3.map(s => s.name),
      description: 'Block Public Access is not enabled on these buckets. Without this safeguard, a single misconfigured bucket policy or ACL can expose all objects to the internet.',
      howItCanBeHacked: '1. Attacker uses tools like bucket-finder or GrayhatWarfare to discover S3 bucket names\n2. Checks if bucket allows public ListBucket or GetObject operations\n3. Downloads all objects including configuration files, backups, credentials, PII\n4. Many high-profile breaches (Capital One, Twitch) started with misconfigured S3 buckets',
      howToFix: '1. Enable Block Public Access at bucket level:\n   aws s3api put-public-access-block --bucket <name> --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true\n2. Also enable at account level:\n   aws s3control put-public-access-block --account-id <id> --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true',
      estimatedFixTime: '5 minutes',
      sourceUrl: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html',
      sourceTitle: 'AWS: S3 Block Public Access',
    });
  }

  /* ── AWS: RDS without Multi-AZ ── */
  const noMultiAZ = rds.filter(s => !s.multiAZ);
  if (noMultiAZ.length) {
    add({
      title: `${noMultiAZ.length} RDS instance${noMultiAZ.length > 1 ? 's' : ''} without Multi-AZ failover`,
      severity: 'medium', provider: 'aws', service: 'RDS',
      affectedResources: noMultiAZ.map(s => s.name),
      description: 'Single-AZ RDS instances have no automatic failover. An AZ outage or hardware failure will cause extended database downtime and potential data loss.',
      howItCanBeHacked: 'This is a reliability risk rather than a direct attack vector. However:\n1. An attacker causing a DDoS against the single AZ can take your database offline\n2. No standby means longer recovery time during which the application is vulnerable\n3. During recovery, rushed fixes may introduce security misconfigurations',
      howToFix: '1. Enable Multi-AZ:\n   aws rds modify-db-instance --db-instance-identifier <name> --multi-az --apply-immediately\n2. For read-heavy workloads, add Read Replicas in different AZs\n3. Consider Aurora for automatic Multi-AZ with faster failover (< 30 seconds)',
      estimatedFixTime: '10 minutes (modification takes ~30 minutes to apply)',
      sourceUrl: 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZ.html',
      sourceTitle: 'AWS: RDS Multi-AZ Deployments',
    });
  }

  /* ── AWS: RDS without storage encryption ── */
  const noStorageEncrypt = rds.filter(s => s.storageEncrypted === false);
  if (noStorageEncrypt.length) {
    add({
      title: `${noStorageEncrypt.length} RDS instance${noStorageEncrypt.length > 1 ? 's' : ''} without storage encryption`,
      severity: 'medium', provider: 'aws', service: 'RDS',
      affectedResources: noStorageEncrypt.map(s => s.name),
      description: 'RDS storage encryption is disabled. Data at rest, automated backups, read replicas, and snapshots are not encrypted.',
      howItCanBeHacked: '1. If an attacker gains access to the underlying EBS volumes or snapshots, data is in plaintext\n2. Shared or leaked snapshots expose unencrypted database contents\n3. Regulatory compliance (HIPAA, PCI-DSS, GDPR) requires encryption at rest',
      howToFix: 'Note: You cannot enable encryption on an existing unencrypted RDS instance directly.\n1. Create a snapshot: aws rds create-db-snapshot --db-instance-identifier <name> --db-snapshot-identifier <snap-name>\n2. Copy with encryption: aws rds copy-db-snapshot --source-db-snapshot-identifier <snap-name> --target-db-snapshot-identifier <encrypted-snap> --kms-key-id <key>\n3. Restore from encrypted snapshot: aws rds restore-db-instance-from-db-snapshot --db-instance-identifier <new-name> --db-snapshot-identifier <encrypted-snap>\n4. Update application connection strings and delete old instance',
      estimatedFixTime: '1-2 hours (requires migration)',
      sourceUrl: 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.Encryption.html',
      sourceTitle: 'AWS: RDS Encryption',
    });
  }

  /* ── AWS: S3 without versioning ── */
  const noVersionS3 = s3.filter(s => !s.versioning);
  if (noVersionS3.length) {
    add({
      title: `${noVersionS3.length} S3 bucket${noVersionS3.length > 1 ? 's' : ''} without versioning enabled`,
      severity: 'medium', provider: 'aws', service: 'S3',
      affectedResources: noVersionS3.map(s => s.name),
      description: 'Without versioning, accidentally deleted or overwritten objects cannot be recovered. Ransomware attacks can permanently destroy data.',
      howItCanBeHacked: '1. Attacker with write access deletes or overwrites critical objects\n2. Ransomware encrypts all objects and without versioning, originals are lost\n3. Accidental deletion by team members cannot be undone\n4. No audit trail of object changes',
      howToFix: '1. Enable versioning:\n   aws s3api put-bucket-versioning --bucket <name> --versioning-configuration Status=Enabled\n2. Add lifecycle rules to expire old versions after 30-90 days:\n   aws s3api put-bucket-lifecycle-configuration --bucket <name> --lifecycle-configuration file://lifecycle.json\n3. Enable MFA Delete for critical buckets to prevent unauthorized version deletion',
      estimatedFixTime: '5 minutes per bucket',
      sourceUrl: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html',
      sourceTitle: 'AWS: S3 Versioning',
    });
  }

  /* ── AWS: Single-region deployment ── */
  const awsRegions = new Set(aws.map(s => s.region).filter(Boolean));
  if (awsRegions.size === 1 && aws.length > 3) {
    add({
      title: 'All AWS resources deployed in a single region',
      severity: 'medium', provider: 'aws', service: 'Infrastructure',
      affectedResources: [`All ${aws.length} resources in ${[...awsRegions][0]}`],
      description: `All ${aws.length} AWS resources are in ${[...awsRegions][0]}. A regional outage would take down your entire infrastructure.`,
      howItCanBeHacked: 'This is a reliability/availability risk:\n1. AWS regional outages (though rare) can last hours\n2. No disaster recovery capability if the region is unavailable\n3. Higher latency for users far from this single region',
      howToFix: '1. Identify critical workloads that need multi-region deployment\n2. Use Route 53 health checks and failover routing for DNS-level failover\n3. Replicate critical databases using RDS cross-region read replicas\n4. Use S3 Cross-Region Replication for important data\n5. Consider a pilot-light or warm-standby DR strategy in a second region',
      estimatedFixTime: 'Days to weeks (architecture change)',
      sourceUrl: 'https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html',
      sourceTitle: 'AWS: Disaster Recovery Options',
    });
  }

  /* ── GCP: Cloud SQL without requireSsl ── */
  const gcpSQL = gcp.filter(s => s.family === 'Database');
  const noSslSQL = gcpSQL.filter(s => !s.requireSsl);
  if (noSslSQL.length) {
    add({
      title: `${noSslSQL.length} GCP Cloud SQL instance${noSslSQL.length > 1 ? 's' : ''} without SSL enforcement`,
      severity: 'high', provider: 'gcp', service: 'Cloud SQL',
      affectedResources: noSslSQL.map(s => s.name),
      description: 'Cloud SQL instances do not require SSL/TLS for connections. Database traffic may be sent in plaintext, allowing eavesdropping and man-in-the-middle attacks.',
      howItCanBeHacked: '1. Attacker on the same network intercepts unencrypted database connections\n2. Captures credentials sent in plaintext during authentication\n3. Reads sensitive query results (PII, financial data, credentials)\n4. Performs man-in-the-middle attacks to modify query results or inject malicious data',
      howToFix: '1. Require SSL on the instance:\n   gcloud sql instances patch <instance-name> --require-ssl\n2. Create client certificates:\n   gcloud sql ssl client-certs create <cert-name> client-key.pem --instance=<instance-name>\n3. Download the server CA certificate:\n   gcloud sql instances describe <instance-name> --format="value(serverCaCert.cert)" > server-ca.pem\n4. Update application connection strings to use SSL certificates',
      estimatedFixTime: '20 minutes',
      sourceUrl: 'https://cloud.google.com/sql/docs/mysql/configure-ssl-instance',
      sourceTitle: 'GCP: Configure SSL for Cloud SQL',
    });
  }

  /* ── GCP: VMs with public IPs ── */
  const gcpVMs = gcp.filter(s => s.family === 'Compute');
  const publicGCPVMs = gcpVMs.filter(s => s.publicIp);
  if (publicGCPVMs.length) {
    add({
      title: `${publicGCPVMs.length} GCP Compute instance${publicGCPVMs.length > 1 ? 's' : ''} with public IP addresses`,
      severity: 'high', provider: 'gcp', service: 'Compute Engine',
      affectedResources: publicGCPVMs.map(s => s.name),
      description: 'GCP VM instances with external IP addresses are directly reachable from the internet, increasing attack surface.',
      howItCanBeHacked: '1. Attacker scans GCP IP ranges to discover publicly accessible VMs\n2. Identifies running services and OS via port scanning and banner grabbing\n3. Exploits unpatched vulnerabilities or weak SSH credentials\n4. Uses compromised VM\'s service account to access other GCP resources (Cloud Storage, BigQuery, etc.)',
      howToFix: '1. Remove external IP:\n   gcloud compute instances delete-access-config <instance> --access-config-name="External NAT"\n2. Use Cloud NAT for outbound internet access without public IPs\n3. Use Identity-Aware Proxy (IAP) for SSH/RDP access:\n   gcloud compute ssh <instance> --tunnel-through-iap\n4. Use a load balancer for web-facing workloads',
      estimatedFixTime: '20 minutes',
      sourceUrl: 'https://cloud.google.com/compute/docs/ip-addresses/reserve-static-external-ip-address',
      sourceTitle: 'GCP: External IP Addresses',
    });
  }

  /* ── Azure: Storage without HTTPS-only or with public blob access ── */
  const azStore = azure.filter(s => s.type === 'Storage Account');
  const insecureStore = azStore.filter(s => !s.httpsOnly || s.allowBlobPublicAccess);
  if (insecureStore.length) {
    const noHttps = azStore.filter(s => !s.httpsOnly);
    const publicBlob = azStore.filter(s => s.allowBlobPublicAccess);
    const allAffected = [...new Set([...noHttps, ...publicBlob].map(s => s.name))];
    add({
      title: `${allAffected.length} Azure Storage account${allAffected.length > 1 ? 's' : ''} with insecure configuration`,
      severity: 'high', provider: 'azure', service: 'Storage',
      affectedResources: allAffected,
      description: `${noHttps.length ? `${noHttps.length} account(s) allow HTTP (non-encrypted) access. ` : ''}${publicBlob.length ? `${publicBlob.length} account(s) allow anonymous public blob access.` : ''} This can lead to data exposure and man-in-the-middle attacks.`,
      howItCanBeHacked: '1. Without HTTPS-only: attacker intercepts storage API calls over HTTP, captures access keys or SAS tokens\n2. With public blob access: attacker enumerates container names and downloads sensitive files\n3. Tools like MicroBurst can automatically discover and exploit misconfigured Azure Storage\n4. Leaked SAS tokens in source code + HTTP = complete data compromise',
      howToFix: '1. Enforce HTTPS-only:\n   az storage account update --name <account> --https-only true\n2. Disable public blob access:\n   az storage account update --name <account> --allow-blob-public-access false\n3. Use Azure Private Endpoints for storage access within VNet\n4. Enable Microsoft Defender for Storage for threat detection',
      estimatedFixTime: '10 minutes',
      sourceUrl: 'https://learn.microsoft.com/en-us/azure/storage/common/storage-require-secure-transfer',
      sourceTitle: 'Azure: Require Secure Transfer',
    });
  }

  /* ── Azure: Old TLS versions ── */
  const oldTLS = azure.filter(s => s.minTlsVersion && parseFloat(s.minTlsVersion.replace('TLS', '').replace('_', '.')) < 1.2);
  if (oldTLS.length) {
    add({
      title: `${oldTLS.length} Azure resource${oldTLS.length > 1 ? 's' : ''} using TLS version below 1.2`,
      severity: 'low', provider: 'azure', service: 'Storage',
      affectedResources: oldTLS.map(s => s.name),
      description: 'Resources are configured to accept TLS 1.0 or 1.1 connections. These older TLS versions have known vulnerabilities (POODLE, BEAST) and are deprecated.',
      howItCanBeHacked: '1. Attacker performs a TLS downgrade attack to force the weakest supported protocol\n2. Exploits known vulnerabilities in TLS 1.0/1.1 (POODLE, BEAST, CRIME)\n3. Decrypts intercepted traffic to capture sensitive data\n4. Most compliance frameworks (PCI-DSS, HIPAA) require TLS 1.2 minimum',
      howToFix: '1. Set minimum TLS version to 1.2:\n   az storage account update --name <account> --min-tls-version TLS1_2\n2. Test all client applications to ensure they support TLS 1.2\n3. Update client SDKs/libraries if needed before enforcing',
      estimatedFixTime: '10 minutes',
      sourceUrl: 'https://learn.microsoft.com/en-us/azure/storage/common/transport-layer-security-configure-minimum-version',
      sourceTitle: 'Azure: Configure Minimum TLS Version',
    });
  }

  /* ── Cross-cloud: Missing tags ── */
  const all = [...aws, ...gcp, ...azure];
  const untagged = all.filter(s => {
    if (s.tags && typeof s.tags === 'object' && Object.keys(s.tags).length > 0) return false;
    if (s.labels && typeof s.labels === 'object' && Object.keys(s.labels).length > 0) return false;
    return true;
  });
  if (untagged.length > all.length * 0.3 && untagged.length > 2) {
    add({
      title: `${untagged.length} resources missing tags or labels`,
      severity: 'low', provider: all[0]?.provider || 'aws', service: 'All Services',
      affectedResources: untagged.slice(0, 10).map(s => s.name),
      description: 'A significant portion of resources lack tags/labels. Without consistent tagging, cost allocation, security governance, and incident response become difficult.',
      howItCanBeHacked: 'Not a direct attack vector, but:\n1. Untagged resources are harder to track ownership, making incident response slower\n2. Orphaned resources without tags may have outdated security configurations\n3. Compliance audits require resource classification via tags',
      howToFix: 'Enforce minimum tags on every resource:\n- Environment: production / staging / development\n- Team: owning team\n- Project: application name\n- CostCenter: for billing\n\nAWS: Use Tag Policies with AWS Organizations\nGCP: Use Organization Policy constraints for labels\nAzure: Use Azure Policy to enforce tagging',
      estimatedFixTime: '1-2 hours for initial tagging',
      sourceUrl: 'https://docs.aws.amazon.com/tag-editor/latest/userguide/tagging.html',
      sourceTitle: 'AWS: Resource Tagging Best Practices',
    });
  }

  /* ── Sort by severity ── */
  findings.sort((a, b) => (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9));

  /* ── Compute counts and risk score ── */
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  findings.forEach(f => { if (counts[f.severity] !== undefined) counts[f.severity]++; });

  const riskScore = Math.min(10, Math.round(
    counts.critical * 3 + counts.high * 2 + counts.medium * 1 + counts.low * 0.3
  ));

  /* ── Build summary ── */
  let summary;
  if (findings.length === 0) {
    summary = `No security issues detected across your ${all.length} cloud resources. Your infrastructure appears well-configured. Continue monitoring for new resources and configuration drift.`;
  } else if (counts.critical > 0) {
    summary = `Critical security issues detected. Found ${findings.length} total findings including ${counts.critical} critical issue${counts.critical > 1 ? 's' : ''} that require immediate attention. Focus on publicly accessible databases and unrestricted security groups first.`;
  } else if (counts.high > 0) {
    summary = `Found ${findings.length} security findings including ${counts.high} high-severity issue${counts.high > 1 ? 's' : ''} across your ${all.length} cloud resources. Address encryption and public access issues as priority.`;
  } else {
    summary = `Found ${findings.length} moderate findings across your ${all.length} resources. No critical or high-severity issues detected. Review medium and low findings to strengthen your security posture.`;
  }

  /* ── Quick wins ── */
  const quickWins = [];
  if (noBlockS3.length) quickWins.push(`Enable S3 Block Public Access on ${noBlockS3.length} bucket${noBlockS3.length > 1 ? 's' : ''} (5 minutes)`);
  if (noEncryptS3.length) quickWins.push(`Enable default encryption on ${noEncryptS3.length} S3 bucket${noEncryptS3.length > 1 ? 's' : ''} (5 minutes)`);
  if (noSslSQL.length) quickWins.push(`Require SSL on ${noSslSQL.length} Cloud SQL instance${noSslSQL.length > 1 ? 's' : ''} (5 minutes)`);
  if (dangerousSGs.length) quickWins.push(`Restrict inbound 0.0.0.0/0 rules on ${dangerousSGs.length} security group${dangerousSGs.length > 1 ? 's' : ''} (15 minutes)`);
  if (insecureStore.length) quickWins.push(`Enforce HTTPS-only on Azure Storage accounts (10 minutes)`);

  return {
    findings,
    summary,
    riskScore,
    counts,
    quickWins,
  };
}

/* ════════════════════════════════════════════════════════════════════════════════
   LOCAL RULE-BASED OPTIMIZATION ANALYSIS
   Preserved and enhanced from existing implementation.
   ════════════════════════════════════════════════════════════════════════════════ */
function runOptimizationAnalysis(aws, gcp, azure) {
  const all = [...aws, ...gcp, ...azure];
  const suggestions = [];
  let sid = 0;
  const add = (s) => { sid++; suggestions.push({ id: `opt-${sid}`, ...s }); };

  /* ── AWS: Stopped EC2 instances ── */
  const ec2 = aws.filter(s => s.type === 'EC2 Instance');
  const runningEC2 = ec2.filter(s => s.status === 'running' || s.health === 'healthy');
  const stoppedEC2 = ec2.filter(s => s.status === 'stopped');
  const publicEC2 = ec2.filter(s => s.publicIp);
  const s3 = aws.filter(s => s.type === 'S3 Bucket');
  const rds = aws.filter(s => s.family === 'Database');
  const lambda = aws.filter(s => s.family === 'Serverless');
  const sgs = aws.filter(s => s.type === 'Security Group');

  if (stoppedEC2.length > 0) add({
    title: `${stoppedEC2.length} stopped EC2 instance${stoppedEC2.length > 1 ? 's' : ''} still incurring EBS charges`,
    category: 'cost', provider: 'aws', service: 'EC2', impact: 'high',
    currentIssue: `You have ${stoppedEC2.length} stopped EC2 instances (${stoppedEC2.map(s => s.name).join(', ')}). Stopped instances don't incur compute charges but their attached EBS volumes, Elastic IPs, and snapshots still cost money.`,
    recommendation: '1. Review each stopped instance in AWS Console → EC2 → Instances\n2. If no longer needed, terminate the instance and delete its EBS volumes\n3. Release any associated Elastic IPs\n4. For instances needed later, create an AMI and terminate the instance',
    estimatedSavings: `$5-50/month per stopped instance (EBS storage costs)`,
    sourceUrl: 'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Stop_Start.html',
    sourceTitle: 'AWS Docs: Stop and start EC2 instances',
  });

  /* ── AWS: Reserved Instances ── */
  if (runningEC2.length > 0) {
    const noRI = runningEC2.filter(s => !s.instanceType?.includes('spot'));
    if (noRI.length >= 2) add({
      title: `Consider Reserved Instances or Savings Plans for ${noRI.length} on-demand EC2 instances`,
      category: 'cost', provider: 'aws', service: 'EC2', impact: 'high',
      currentIssue: `${noRI.length} EC2 instances appear to be running on-demand pricing. For long-running workloads, this is the most expensive option.`,
      recommendation: '1. Go to AWS Cost Explorer → Recommendations → Reserved Instances\n2. Review the RI purchase recommendations\n3. For flexible workloads, consider Compute Savings Plans (up to 66% savings)\n4. For steady-state, consider 1-year No Upfront Reserved Instances (40% savings)',
      estimatedSavings: '30-60% reduction on EC2 compute costs',
      sourceUrl: 'https://aws.amazon.com/savingsplans/',
      sourceTitle: 'AWS Savings Plans',
    });
  }

  /* ── AWS: Public IP charges ── */
  if (publicEC2.length > 0) add({
    title: `${publicEC2.length} EC2 instance${publicEC2.length > 1 ? 's' : ''} with public IPs — review necessity`,
    category: 'best-practice', provider: 'aws', service: 'EC2', impact: 'medium',
    currentIssue: `${publicEC2.length} instances have public IP addresses (${publicEC2.slice(0, 3).map(s => s.name).join(', ')}${publicEC2.length > 3 ? '...' : ''}). Public IPs increase attack surface and cost $3.65/month each since Feb 2024.`,
    recommendation: '1. Audit which instances truly need public access\n2. Use a NAT Gateway or VPC endpoints for outbound-only access\n3. Place web-facing instances behind an ALB instead of direct public IPs\n4. Use AWS Systems Manager Session Manager for SSH without public IPs',
    estimatedSavings: `$${(publicEC2.length * 3.65).toFixed(0)}/month in public IPv4 charges + reduced attack surface`,
    sourceUrl: 'https://aws.amazon.com/blogs/aws/new-aws-public-ipv4-address-charge-public-ip-insights/',
    sourceTitle: 'AWS Public IPv4 Address Charges',
  });

  /* ── AWS: S3 storage classes ── */
  if (s3.length >= 2) add({
    title: 'Review S3 storage classes for cost optimization',
    category: 'cost', provider: 'aws', service: 'S3', impact: 'medium',
    currentIssue: `You have ${s3.length} S3 buckets. Objects that are infrequently accessed can be moved to cheaper storage classes like S3 Intelligent-Tiering or Glacier, saving 40-90% on storage costs.`,
    recommendation: '1. Enable S3 Storage Lens to analyze access patterns\n2. Create lifecycle policies to transition objects:\n   - 30 days → S3 Intelligent-Tiering (auto-tiers for you)\n   - 90 days → S3 Glacier Instant Retrieval (68% cheaper)\n   - 180 days → S3 Glacier Deep Archive (95% cheaper)\n3. Use S3 Inventory to identify large, old objects',
    estimatedSavings: '40-90% reduction on S3 storage costs for cold data',
    sourceUrl: 'https://aws.amazon.com/s3/storage-classes/',
    sourceTitle: 'AWS S3 Storage Classes',
  });

  /* ── AWS: S3 versioning ── */
  if (s3.length > 0) {
    const noVersion = s3.filter(s => !s.versioning);
    if (noVersion.length > 0) add({
      title: `Enable versioning on ${noVersion.length} S3 bucket${noVersion.length > 1 ? 's' : ''}`,
      category: 'reliability', provider: 'aws', service: 'S3', impact: 'medium',
      currentIssue: `${noVersion.length} S3 buckets have versioning disabled (${noVersion.slice(0, 3).map(s => s.name).join(', ')}). Without versioning, accidentally deleted or overwritten objects cannot be recovered.`,
      recommendation: '1. Enable versioning: aws s3api put-bucket-versioning --bucket BUCKET_NAME --versioning-configuration Status=Enabled\n2. Add lifecycle rules to expire old versions after 30-90 days to control costs\n3. Consider enabling MFA Delete for critical buckets',
      estimatedSavings: 'Prevents data loss — minimal cost increase with lifecycle rules',
      sourceUrl: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html',
      sourceTitle: 'AWS S3 Versioning',
    });
  }

  /* ── AWS: RDS Multi-AZ ── */
  if (rds.length > 0) {
    const noMultiAZ = rds.filter(s => !s.multiAZ);
    if (noMultiAZ.length > 0) add({
      title: `Enable Multi-AZ for ${noMultiAZ.length} production RDS instance${noMultiAZ.length > 1 ? 's' : ''}`,
      category: 'reliability', provider: 'aws', service: 'RDS', impact: 'medium',
      currentIssue: `${noMultiAZ.length} RDS instances are running in single-AZ mode. A single AZ failure will cause database downtime.`,
      recommendation: '1. Enable Multi-AZ in RDS Console → Modify → Multi-AZ deployment\n2. For read-heavy workloads, add Read Replicas instead\n3. Consider Aurora for automatic Multi-AZ with faster failover',
      estimatedSavings: 'Reduces RTO from hours to ~60 seconds during AZ failures',
      sourceUrl: 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZ.html',
      sourceTitle: 'AWS RDS Multi-AZ Deployments',
    });
  }

  /* ── AWS: Lambda optimization ── */
  if (lambda.length > 0) add({
    title: `Optimize ${lambda.length} Lambda function${lambda.length > 1 ? 's' : ''} memory and timeout settings`,
    category: 'performance', provider: 'aws', service: 'Lambda', impact: 'medium',
    currentIssue: 'Lambda functions are often over-provisioned with memory or have unnecessarily long timeout settings, leading to higher costs.',
    recommendation: '1. Use AWS Lambda Power Tuning (open-source tool) to find optimal memory\n2. Right-size memory — more memory = more CPU = faster execution = often cheaper\n3. Set timeouts to 2x the average execution time, not the maximum\n4. Enable Provisioned Concurrency for latency-sensitive functions',
    estimatedSavings: '10-40% reduction in Lambda costs',
    sourceUrl: 'https://docs.aws.amazon.com/lambda/latest/operatorguide/perf-optimize.html',
    sourceTitle: 'AWS Lambda Performance Optimization',
  });

  /* ── GCP: Committed use discounts ── */
  const gcpVMs = gcp.filter(s => s.family === 'Compute');
  const gcpSQL = gcp.filter(s => s.family === 'Database');
  const gke = gcp.filter(s => s.family === 'Container');

  if (gcpVMs.length > 0) add({
    title: `Review ${gcpVMs.length} GCP Compute instance${gcpVMs.length > 1 ? 's' : ''} for committed use discounts`,
    category: 'cost', provider: 'gcp', service: 'Compute Engine', impact: 'high',
    currentIssue: `${gcpVMs.length} Compute Engine VMs are running. GCP offers automatic sustained use discounts (up to 30%) and committed use discounts (up to 57%) that many users miss.`,
    recommendation: '1. Check sustained use discounts (automatic) in Billing → Reports\n2. Purchase Committed Use Discounts for steady-state VMs:\n   - 1-year: up to 37% off\n   - 3-year: up to 57% off\n3. Use Preemptible/Spot VMs for fault-tolerant workloads (60-91% off)\n4. Right-size using GCP Recommender: gcloud recommender recommendations list',
    estimatedSavings: '30-57% reduction on Compute Engine costs',
    sourceUrl: 'https://cloud.google.com/compute/docs/instances/signing-up-committed-use-discounts',
    sourceTitle: 'GCP Committed Use Discounts',
  });

  /* ── GCP: GKE Autopilot ── */
  if (gke.length > 0) add({
    title: `Optimize ${gke.length} GKE cluster${gke.length > 1 ? 's' : ''} with Autopilot or node auto-scaling`,
    category: 'cost', provider: 'gcp', service: 'GKE', impact: 'medium',
    currentIssue: 'GKE Standard clusters often have over-provisioned node pools. Nodes sit idle during low-traffic periods, wasting money.',
    recommendation: '1. Enable Cluster Autoscaler to scale nodes based on pod demand\n2. Consider migrating to GKE Autopilot (Google manages nodes, pay per pod)\n3. Use node auto-provisioning for optimal machine type selection\n4. Set resource requests/limits on all pods to enable efficient bin-packing',
    estimatedSavings: '25-50% reduction in GKE infrastructure costs',
    sourceUrl: 'https://cloud.google.com/kubernetes-engine/docs/concepts/autopilot-overview',
    sourceTitle: 'GKE Autopilot Overview',
  });

  /* ── Azure: Reserved VMs ── */
  const azVMs = azure.filter(s => s.family === 'Compute');
  const azStore = azure.filter(s => s.type === 'Storage Account');

  if (azVMs.length > 0) add({
    title: `Review ${azVMs.length} Azure VM${azVMs.length > 1 ? 's' : ''} for Reserved Instance savings`,
    category: 'cost', provider: 'azure', service: 'Virtual Machines', impact: 'high',
    currentIssue: `${azVMs.length} Azure VMs are running on pay-as-you-go pricing. Azure Reserved VM Instances offer significant discounts for predictable workloads.`,
    recommendation: '1. Go to Azure Portal → Reservations → Add\n2. Review Azure Advisor cost recommendations\n3. Purchase 1-year reservations (up to 40% off) or 3-year (up to 60% off)\n4. Use Azure Spot VMs for interruptible workloads (up to 90% off)',
    estimatedSavings: '40-60% reduction on VM compute costs',
    sourceUrl: 'https://learn.microsoft.com/en-us/azure/cost-management-billing/reservations/save-compute-costs-reservations',
    sourceTitle: 'Azure Reserved VM Instances',
  });

  /* ── Azure: Public blob access ── */
  if (azStore.length > 0) {
    const publicSt = azStore.filter(s => s.allowBlobPublicAccess);
    if (publicSt.length > 0) add({
      title: `Disable public blob access on ${publicSt.length} storage account${publicSt.length > 1 ? 's' : ''}`,
      category: 'best-practice', provider: 'azure', service: 'Storage', impact: 'high',
      currentIssue: `${publicSt.length} Azure Storage accounts allow public blob access (${publicSt.slice(0, 3).map(s => s.name).join(', ')}). This can lead to accidental data exposure.`,
      recommendation: '1. Azure Portal → Storage Account → Configuration → "Allow Blob public access" → Disabled\n2. Use SAS tokens or Azure AD for controlled access\n3. Enable Microsoft Defender for Storage for threat detection',
      estimatedSavings: 'Prevents accidental data exposure',
      sourceUrl: 'https://learn.microsoft.com/en-us/azure/storage/blobs/anonymous-read-access-prevent',
      sourceTitle: 'Azure: Prevent anonymous public read access',
    });
  }

  /* ── Cross-cloud: Budget alerts ── */
  if (all.length > 10) add({
    title: 'Set up cloud budget alerts to prevent bill shock',
    category: 'cost', provider: all[0]?.provider || 'aws', service: 'Billing', impact: 'medium',
    currentIssue: 'Without budget alerts, unexpected cost spikes from misconfigured auto-scaling, data transfer, or accidental resource creation can go unnoticed for days.',
    recommendation: 'AWS: Go to AWS Budgets → Create Budget → set monthly threshold with email alerts\nGCP: Go to Billing → Budgets & alerts → Create budget\nAzure: Go to Cost Management → Budgets → Add\n\nSet alerts at 50%, 80%, and 100% of your expected monthly spend.',
    estimatedSavings: 'Prevents unexpected cost overruns — early warning system',
    sourceUrl: 'https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html',
    sourceTitle: 'AWS Budgets Documentation',
  });

  /* ── Cross-cloud: Tagging strategy ── */
  if (all.length > 5) add({
    title: 'Implement resource tagging strategy across all providers',
    category: 'best-practice', provider: all[0]?.provider || 'aws', service: 'All Services', impact: 'medium',
    currentIssue: 'Without consistent tagging, cost allocation, ownership tracking, and automated governance become nearly impossible as your cloud footprint grows.',
    recommendation: 'Enforce these minimum tags on every resource:\n- Environment: production / staging / development\n- Team: the owning team name\n- Project: the project or application name\n- CostCenter: for finance allocation\n\nUse AWS Tag Policies, GCP Labels, or Azure Policy to enforce.',
    estimatedSavings: 'Enables accurate cost allocation and identifies orphaned resources (typically 15-30% of spend)',
    sourceUrl: 'https://docs.aws.amazon.com/tag-editor/latest/userguide/tagging.html',
    sourceTitle: 'AWS Resource Tagging Best Practices',
  });

  /* ── Sort by impact ── */
  suggestions.sort((a, b) => (IMPACT_ORDER[a.impact] ?? 9) - (IMPACT_ORDER[b.impact] ?? 9));

  /* ── Build summary ── */
  const highCount = suggestions.filter(s => s.impact === 'high').length;
  const costCount = suggestions.filter(s => s.category === 'cost').length;
  const totalSavings = costCount > 0 ? '20-50% potential cost reduction' : null;

  const catCounts = { cost: 0, performance: 0, reliability: 0, 'best-practice': 0 };
  suggestions.forEach(s => { if (catCounts[s.category] !== undefined) catCounts[s.category]++; });

  const summary = suggestions.length > 0
    ? `Found ${suggestions.length} optimization opportunities across your ${all.length} cloud resources. ${highCount} high-impact items identified. Focus on reserved instances and security misconfigurations for the biggest returns.`
    : 'Your infrastructure looks well-optimized. Keep monitoring as your usage patterns change.';

  return {
    suggestions,
    summary,
    totalPotentialSavings: totalSavings,
    catCounts,
  };
}

/* ════════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════════════════════ */
export default function AISuggestions({ awsServices, gcpServices, azureServices }) {
  const [tab, setTab] = useState('security');

  /* ── Security state ── */
  const [secLoading, setSecLoading] = useState(false);
  const [secResult, setSecResult] = useState(null);
  const [secExpandedId, setSecExpandedId] = useState(null);
  const [sevFilter, setSevFilter] = useState('all');

  /* ── Optimization state ── */
  const [optLoading, setOptLoading] = useState(false);
  const [optResult, setOptResult] = useState(null);
  const [optExpandedId, setOptExpandedId] = useState(null);
  const [catFilter, setCatFilter] = useState('all');

  const total = (awsServices?.length || 0) + (gcpServices?.length || 0) + (azureServices?.length || 0);
  const aws = awsServices || [];
  const gcp = gcpServices || [];
  const azure = azureServices || [];

  /* ── Run security analysis ── */
  const runSecurity = useCallback(async () => {
    setSecLoading(true);
    setSecResult(null);
    setSecExpandedId(null);
    setSevFilter('all');
    await new Promise(r => setTimeout(r, 600));
    const result = runSecurityAnalysis(aws, gcp, azure);
    setSecResult(result);
    setSecLoading(false);
  }, [aws, gcp, azure]);

  /* ── Run optimization analysis ── */
  const runOptimization = useCallback(async () => {
    setOptLoading(true);
    setOptResult(null);
    setOptExpandedId(null);
    setCatFilter('all');
    await new Promise(r => setTimeout(r, 600));
    const result = runOptimizationAnalysis(aws, gcp, azure);
    setOptResult(result);
    setOptLoading(false);
  }, [aws, gcp, azure]);

  /* ── Filtered lists ── */
  const filteredFindings = (secResult?.findings || []).filter(f => sevFilter === 'all' || f.severity === sevFilter);
  const filteredSuggestions = (optResult?.suggestions || []).filter(s => catFilter === 'all' || s.category === catFilter);

  /* ── Shared styles ── */
  const cardStyle = {
    background: 'var(--card)', border: '1px solid var(--border)',
    borderRadius: 12, padding: '20px 24px',
  };
  const pillBase = {
    padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
    border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.15s ease',
  };
  const actionBtnBase = {
    padding: '10px 24px', borderRadius: 8, border: 'none',
    fontWeight: 700, fontSize: 13, cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap',
  };

  return (
    <div style={{ paddingBottom: 40 }}>

      {/* ════════ HEADER CARD ════════ */}
      <div className="section-card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div>
            <div className="section-title" style={{ marginBottom: 4 }}>AI Suggestions</div>
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>
              Local rule-based analysis &middot; {total} resource{total !== 1 ? 's' : ''} across AWS, GCP & Azure
            </div>
          </div>
          <button
            onClick={tab === 'security' ? runSecurity : runOptimization}
            disabled={(tab === 'security' ? secLoading : optLoading) || total === 0}
            style={{
              ...actionBtnBase,
              background: (tab === 'security' ? secLoading : optLoading) || total === 0
                ? 'var(--border)'
                : tab === 'security'
                  ? 'linear-gradient(135deg, #4f46e5, #7c3aed)'
                  : 'linear-gradient(135deg, #0ea5e9, #2563eb)',
              color: (tab === 'security' ? secLoading : optLoading) || total === 0 ? 'var(--text3)' : '#fff',
              cursor: (tab === 'security' ? secLoading : optLoading) || total === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            {tab === 'security'
              ? (secLoading ? 'Analyzing...' : secResult ? 'Re-Run Analysis' : 'Run Analysis')
              : (optLoading ? 'Analyzing...' : optResult ? 'Re-Find Optimizations' : 'Find Optimizations')
            }
          </button>
        </div>
        {/* ── Tab pills ── */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg)', borderRadius: 10, padding: 4 }}>
          {[
            { key: 'security', label: 'Security' },
            { key: 'optimization', label: 'Optimization' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              flex: 1, padding: '9px 16px', borderRadius: 8, border: 'none',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              background: tab === t.key ? 'var(--card)' : 'transparent',
              color: tab === t.key ? 'var(--text)' : 'var(--text3)',
              boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
         SECURITY TAB
         ════════════════════════════════════════════════════════════════════════ */}
      {tab === 'security' && (
        <>
          {/* ── Loading state ── */}
          {secLoading && (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '56px 24px' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Scanning your infrastructure...</div>
              <div style={{ fontSize: 13, color: 'var(--text3)' }}>
                Analyzing {total} resources for vulnerabilities and misconfigurations
              </div>
            </div>
          )}

          {/* ── Results ── */}
          {secResult && !secLoading && (
            <>
              {/* ── Summary row ── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 16, marginBottom: 16, alignItems: 'stretch' }}>
                {/* Left: Executive summary + quick wins */}
                <div style={cardStyle}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                    Executive Summary
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.8, marginBottom: secResult.quickWins?.length ? 16 : 0 }}>
                    {secResult.summary}
                  </div>
                  {secResult.quickWins?.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                        Quick Wins
                      </div>
                      {secResult.quickWins.map((w, i) => (
                        <div key={i} style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 6, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                          <span style={{ color: '#22c55e', flexShrink: 0, fontWeight: 700 }}>+</span>
                          <span style={{ lineHeight: 1.5 }}>{w}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right: Risk score + severity counts */}
                <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1 }}>
                    Risk Score
                  </div>
                  <ScoreRing score={secResult.riskScore} />
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[
                      { label: 'Critical', key: 'critical', color: SEV_COLOR.critical },
                      { label: 'High', key: 'high', color: SEV_COLOR.high },
                      { label: 'Medium', key: 'medium', color: SEV_COLOR.medium },
                      { label: 'Low', key: 'low', color: SEV_COLOR.low },
                    ].map(({ label, key, color }) => (
                      <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, alignItems: 'center' }}>
                        <span style={{ color: 'var(--text3)' }}>{label}</span>
                        <span style={{ fontWeight: 700, color, fontSize: 14 }}>{secResult.counts[key]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Severity filter pills ── */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {['all', 'critical', 'high', 'medium', 'low'].map(s => {
                  const count = s === 'all' ? secResult.findings.length : secResult.counts[s];
                  const isActive = sevFilter === s;
                  const color = s === 'all' ? 'var(--text2)' : SEV_COLOR[s];
                  return (
                    <button key={s} onClick={() => setSevFilter(s)} style={{
                      ...pillBase,
                      background: isActive ? (s === 'all' ? 'var(--border)' : SEV_BG[s]) : 'transparent',
                      borderColor: isActive ? (s === 'all' ? 'var(--border)' : `${SEV_COLOR[s]}50`) : 'var(--border)',
                      color: color,
                    }}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                      {count > 0 && <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.8 }}>{count}</span>}
                    </button>
                  );
                })}
              </div>

              {/* ── Findings list ── */}
              <div style={cardStyle}>
                <div className="section-title" style={{ margin: '0 0 16px' }}>
                  Findings ({filteredFindings.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {filteredFindings.length === 0 && (
                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                      No {sevFilter !== 'all' ? sevFilter : ''} findings.
                    </div>
                  )}
                  {filteredFindings.map(f => {
                    const isExpanded = secExpandedId === f.id;
                    return (
                      <div key={f.id} style={{
                        border: `1px solid ${SEV_COLOR[f.severity]}25`,
                        borderLeft: `4px solid ${SEV_COLOR[f.severity]}`,
                        borderRadius: 8, overflow: 'hidden',
                      }}>
                        {/* Header row */}
                        <div
                          onClick={() => setSecExpandedId(isExpanded ? null : f.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
                            cursor: 'pointer', background: isExpanded ? 'var(--bg)' : 'transparent',
                            transition: 'background 0.15s ease',
                          }}
                        >
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                            background: SEV_BG[f.severity], color: SEV_COLOR[f.severity],
                            textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap',
                          }}>
                            {f.severity}
                          </span>
                          <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', flex: 1 }}>
                            {f.title}
                          </span>
                          <ProviderBadge provider={f.provider} />
                          <span style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}>{f.service}</span>
                          {f.estimatedFixTime && (
                            <span style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                              {f.estimatedFixTime}
                            </span>
                          )}
                          <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 4 }}>
                            {isExpanded ? '▲' : '▼'}
                          </span>
                        </div>

                        {/* Expanded detail */}
                        {isExpanded && (
                          <div style={{ padding: '4px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {/* Affected resources chips */}
                            {f.affectedResources?.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
                                <span style={{ fontSize: 11, color: 'var(--text3)', alignSelf: 'center', fontWeight: 600 }}>Affected:</span>
                                {f.affectedResources.map((r, i) => (
                                  <span key={i} style={{
                                    fontSize: 11, padding: '3px 10px', background: 'var(--bg)',
                                    border: '1px solid var(--border)', borderRadius: 6,
                                    fontFamily: 'monospace', color: 'var(--text2)',
                                  }}>
                                    {r}
                                  </span>
                                ))}
                              </div>
                            )}
                            <InfoBlock title="Description" text={f.description} />
                            <InfoBlock title="Attack Vector" text={f.howItCanBeHacked} color="#dc2626" />
                            <InfoBlock title="Fix Steps" text={f.howToFix} color="#22c55e" />
                            {f.sourceUrl && (
                              <div style={{
                                padding: '10px 14px', borderRadius: 8, background: 'var(--bg)',
                                border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8,
                              }}>
                                <span style={{ fontSize: 11, color: 'var(--text3)' }}>Source:</span>
                                <a href={f.sourceUrl} target="_blank" rel="noopener noreferrer"
                                  style={{ fontSize: 12, color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
                                  {f.sourceTitle || f.sourceUrl}
                                </a>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* ── Empty state ── */}
          {!secResult && !secLoading && (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '64px 24px' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>
                Security Analysis
              </div>
              <div style={{ fontSize: 14, color: 'var(--text3)', maxWidth: 480, margin: '0 auto 28px', lineHeight: 1.7 }}>
                Scan your AWS, GCP, and Azure resources for security vulnerabilities, misconfigurations, and attack vectors with detailed fix steps.
              </div>
              <button
                onClick={runSecurity}
                disabled={total === 0}
                style={{
                  ...actionBtnBase,
                  display: 'inline-flex',
                  background: total === 0 ? 'var(--border)' : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                  color: total === 0 ? 'var(--text3)' : '#fff',
                  fontSize: 15, padding: '12px 36px', borderRadius: 10,
                  cursor: total === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                Run Analysis
              </button>
              {total === 0 && (
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 12 }}>Connect a cloud account first</div>
              )}
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
         OPTIMIZATION TAB
         ════════════════════════════════════════════════════════════════════════ */}
      {tab === 'optimization' && (
        <>
          {/* ── Loading state ── */}
          {optLoading && (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '56px 24px' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Scanning your resources...</div>
              <div style={{ fontSize: 13, color: 'var(--text3)' }}>
                Finding optimization opportunities across {total} resources
              </div>
            </div>
          )}

          {/* ── Results ── */}
          {optResult && !optLoading && (
            <>
              {/* ── Summary row ── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 16, marginBottom: 16, alignItems: 'stretch' }}>
                {/* Left: Summary */}
                <div style={cardStyle}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                    Overview
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.8 }}>
                    {optResult.summary}
                  </div>
                </div>

                {/* Right: Savings + category counts */}
                <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  {optResult.totalPotentialSavings && (
                    <>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1 }}>
                        Potential Savings
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#22c55e', textAlign: 'center' }}>
                        {optResult.totalPotentialSavings}
                      </div>
                    </>
                  )}
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6, marginTop: optResult.totalPotentialSavings ? 4 : 0 }}>
                    {Object.entries(optResult.catCounts).map(([cat, count]) => (
                      <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, alignItems: 'center' }}>
                        <span style={{ color: 'var(--text3)', textTransform: 'capitalize' }}>
                          {cat === 'best-practice' ? 'Best Practice' : cat}
                        </span>
                        <span style={{ fontWeight: 700, color: CAT_COLOR[cat], fontSize: 14 }}>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Category filter pills ── */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {['all', 'cost', 'performance', 'reliability', 'best-practice'].map(c => {
                  const count = c === 'all' ? optResult.suggestions.length : (optResult.catCounts[c] || 0);
                  const isActive = catFilter === c;
                  const color = c === 'all' ? 'var(--text2)' : CAT_COLOR[c];
                  return (
                    <button key={c} onClick={() => setCatFilter(c)} style={{
                      ...pillBase,
                      background: isActive ? (c === 'all' ? 'var(--border)' : CAT_BG[c]) : 'transparent',
                      borderColor: isActive ? (c === 'all' ? 'var(--border)' : `${CAT_COLOR[c]}50`) : 'var(--border)',
                      color: color,
                    }}>
                      {c === 'all' ? 'All' : c === 'best-practice' ? 'Best Practice' : c.charAt(0).toUpperCase() + c.slice(1)}
                      {count > 0 && <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.8 }}>{count}</span>}
                    </button>
                  );
                })}
              </div>

              {/* ── Suggestions list ── */}
              <div style={cardStyle}>
                <div className="section-title" style={{ margin: '0 0 16px' }}>
                  Recommendations ({filteredSuggestions.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {filteredSuggestions.length === 0 && (
                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                      No {catFilter !== 'all' ? catFilter : ''} suggestions.
                    </div>
                  )}
                  {filteredSuggestions.map(s => {
                    const isExpanded = optExpandedId === s.id;
                    return (
                      <div key={s.id} style={{
                        border: `1px solid ${IMPACT_COLOR[s.impact]}25`,
                        borderLeft: `4px solid ${IMPACT_COLOR[s.impact]}`,
                        borderRadius: 8, overflow: 'hidden',
                      }}>
                        {/* Header row */}
                        <div
                          onClick={() => setOptExpandedId(isExpanded ? null : s.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
                            cursor: 'pointer', background: isExpanded ? 'var(--bg)' : 'transparent',
                            transition: 'background 0.15s ease',
                          }}
                        >
                          {CAT_ICON[s.category] ? <span style={{ fontSize: 13 }}>{CAT_ICON[s.category]}</span> : null}
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                            background: IMPACT_BG[s.impact], color: IMPACT_COLOR[s.impact],
                            textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap',
                          }}>
                            {s.impact} impact
                          </span>
                          <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', flex: 1 }}>
                            {s.title}
                          </span>
                          <ProviderBadge provider={s.provider} />
                          <span style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}>{s.service}</span>
                          <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 4 }}>
                            {isExpanded ? '▲' : '▼'}
                          </span>
                        </div>

                        {/* Expanded detail */}
                        {isExpanded && (
                          <div style={{ padding: '4px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <InfoBlock title="Current Issue" text={s.currentIssue} color="#f97316" />
                            <InfoBlock title="Recommendation" text={s.recommendation} color="#22c55e" />
                            {s.estimatedSavings && (
                              <InfoBlock title="Estimated Impact" text={s.estimatedSavings} color="#2563eb" />
                            )}
                            {s.sourceUrl && (
                              <div style={{
                                padding: '10px 14px', borderRadius: 8, background: 'var(--bg)',
                                border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8,
                              }}>
                                <span style={{ fontSize: 11, color: 'var(--text3)' }}>Source:</span>
                                <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer"
                                  style={{ fontSize: 12, color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
                                  {s.sourceTitle || s.sourceUrl}
                                </a>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* ── Empty state ── */}
          {!optResult && !optLoading && (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '64px 24px' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>
                Optimization Tips
              </div>
              <div style={{ fontSize: 14, color: 'var(--text3)', maxWidth: 480, margin: '0 auto 28px', lineHeight: 1.7 }}>
                Scan your {total} resources for cost savings, performance improvements, reliability enhancements, and best practice recommendations.
              </div>
              <button
                onClick={runOptimization}
                disabled={total === 0}
                style={{
                  ...actionBtnBase,
                  display: 'inline-flex',
                  background: total === 0 ? 'var(--border)' : 'linear-gradient(135deg, #0ea5e9, #2563eb)',
                  color: total === 0 ? 'var(--text3)' : '#fff',
                  fontSize: 15, padding: '12px 36px', borderRadius: 10,
                  cursor: total === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                Find Optimizations
              </button>
              {total === 0 && (
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 12 }}>Connect a cloud account first</div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Keyframe animation for loading pulse ── */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}
