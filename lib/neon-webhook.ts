import crypto from 'node:crypto';

export async function verifyNeonWebhook(rawBody: string, headers: Headers) {
    const signature = headers.get('x-neon-signature');
    const kid = headers.get('x-neon-signature-kid');
    const timestamp = headers.get('x-neon-timestamp');

    if (!signature || !kid || !timestamp) {
        throw new Error('Missing required Neon webhook headers');
    }

    // 1. Fetch JWKS and find the matching key
    const res = await fetch(`${process.env.NEON_AUTH_BASE_URL}/.well-known/jwks.json`);
    const jwks = await res.json();
    const jwk = jwks.keys.find((k: any) => k.kid === kid);
    if (!jwk) throw new Error(`Key ${kid} not found in JWKS`);

    // 2. Import the Ed25519 public key
    const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });

    // 3. Parse detached JWS (header..signature)
    const [headerB64, emptyPayload, signatureB64] = signature.split('.');
    if (emptyPayload !== '') throw new Error('Expected detached JWS format');

    // 4. Reconstruct signing input (standard JWS, double base64url encoding)
    const payloadB64 = Buffer.from(rawBody, 'utf8').toString('base64url');
    const signaturePayload = `${timestamp}.${payloadB64}`;
    const signaturePayloadB64 = Buffer.from(signaturePayload, 'utf8').toString('base64url');
    const signingInput = `${headerB64}.${signaturePayloadB64}`;

    // 5. Verify Ed25519 signature
    const isValid = crypto.verify(
        null,
        Buffer.from(signingInput),
        publicKey,
        Buffer.from(signatureB64, 'base64url')
    );

    if (!isValid) throw new Error('Invalid webhook signature');

    // 6. Check timestamp freshness (prevent replay attacks - 5 min window)
    const ageMs = Date.now() - parseInt(timestamp, 10);
    if (ageMs > 5 * 60 * 1000) throw new Error('Webhook timestamp too old');

    return JSON.parse(rawBody);
}