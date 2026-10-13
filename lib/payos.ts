import { PayOS } from '@payos/node';

let client: PayOS | undefined;

export function getPayOSClient(): PayOS | null {
  const clientId = process.env.PAYOS_CLIENT_ID;
  const apiKey = process.env.PAYOS_API_KEY;
  const checksumKey = process.env.PAYOS_CHECKSUM_KEY;
  if (!clientId || !apiKey || !checksumKey) return null;

  client ??= new PayOS({ clientId, apiKey, checksumKey });
  return client;
}