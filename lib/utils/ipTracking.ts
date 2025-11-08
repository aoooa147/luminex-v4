/**
 * IP Tracking and VPN Detection System
 * Tracks IP addresses and detects VPNs/proxies
 */

export interface IPInfo {
  ip: string;
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  isp?: string;
  org?: string;
  isVPN?: boolean;
  isProxy?: boolean;
  isTor?: boolean;
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * Get client IP from request headers
 */
export function getClientIP(req: {
  headers: Headers | { get: (key: string) => string | null };
}): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  const cfConnectingIP = req.headers.get('cf-connecting-ip');

  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim();
  }
  if (realIP) return realIP.trim();
  if (cfConnectingIP) return cfConnectingIP.trim();
  return 'unknown';
}

/**
 * Check IP risk using ipapi.co (free tier)
 */
export async function checkIPRisk(ip: string): Promise<IPInfo> {
  // Skip check for localhost or private IPs
  if (ip === 'unknown' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return {
      ip,
      riskLevel: 'low',
      isVPN: false,
      isProxy: false,
      isTor: false,
    };
  }

  try {
    // Use ipapi.co for IP geolocation and risk assessment
    const response = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: {
        'User-Agent': 'Luminex-AntiCheat/1.0',
      },
    });

    if (!response.ok) {
      throw new Error('IP API request failed');
    }

    const data = await response.json();

    // Check for VPN/Proxy indicators
    const org = (data.org || '').toLowerCase();
    const isVPN = org.includes('vpn') || 
                  org.includes('proxy') || 
                  org.includes('hosting') ||
                  data.connection?.type === 'hosting';
    
    const isProxy = org.includes('proxy') || 
                    data.connection?.type === 'proxy';
    
    const isTor = data.connection?.type === 'tor' || 
                  org.includes('tor');

    // Calculate risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (isVPN || isProxy || isTor) {
      riskLevel = 'high';
    } else if (data.connection?.type === 'hosting') {
      riskLevel = 'medium';
    }

    return {
      ip,
      country: data.country_name,
      countryCode: data.country_code,
      region: data.region,
      city: data.city,
      isp: data.org,
      org: data.org,
      isVPN,
      isProxy,
      isTor,
      riskLevel,
    };
  } catch (error) {
    console.error('Failed to check IP risk:', error);
    // Default to low risk if API fails
    return {
      ip,
      riskLevel: 'low',
      isVPN: false,
      isProxy: false,
      isTor: false,
    };
  }
}

/**
 * Calculate risk level from IP info
 */
export function calculateRiskLevel(ipInfo: IPInfo): 'low' | 'medium' | 'high' {
  if (ipInfo.isVPN || ipInfo.isProxy || ipInfo.isTor) {
    return 'high';
  }
  if (ipInfo.org?.toLowerCase().includes('hosting')) {
    return 'medium';
  }
  return 'low';
}

