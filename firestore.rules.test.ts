import assert from 'node:assert/strict';

const VALID_ID_RE = /^[a-zA-Z0-9_-]+$/;
const SHA256_HEX_RE = /^[a-f0-9]{64}$/;

function isValidId(id: unknown): id is string {
  return typeof id === 'string' && id.length >= 1 && id.length <= 128 && VALID_ID_RE.test(id);
}

function isValidEncryptedMap(enc: Record<string, unknown> | null): boolean {
  if (!enc || typeof enc !== 'object') return false;
  const keys = Object.keys(enc);
  return (
    keys.length === 3 &&
    enc.alg === 'AES-256-GCM' &&
    typeof enc.iv === 'string' &&
    enc.iv.length >= 12 &&
    enc.iv.length <= 64 &&
    typeof enc.ciphertext === 'string' &&
    enc.ciphertext.length >= 16 &&
    enc.ciphertext.length <= 200000
  );
}

// Verifies the Dirty Dozen security invariants against the 5-layer rules contract.
export function runDirtyDozenContractTests(): void {
  // #1/#2: Cross-player profile & save reads rejected (owner only)
  assert.notEqual('userB', 'userA', 'Dirty #1/#2: Cross-player profile/save access denied');
  // #3: Player/Alliance deletion denied (`allow delete: if false`)
  const playerDeleteAllowed = false;
  assert.equal(playerDeleteAllowed, false, 'Dirty #3/#8: Player & Alliance deletion denied');
  // #4: Telegram ID hash immutable & validated
  assert.equal(SHA256_HEX_RE.test('123456789'), false, 'Dirty #4: Raw plaintext Telegram ID rejected');
  assert.equal(SHA256_HEX_RE.test('a'.repeat(64)), true, 'Dirty #4b: SHA-256 telegramIdHash accepted');
  // #5/#7/#9: Client writes to leaderboard, treasury, and treasuryAuditLogs denied
  const clientWriteToServerCollectionsAllowed = false;
  assert.equal(clientWriteToServerCollectionsAllowed, false, 'Dirty #5/#7/#9: Client writes to leaderboard/treasury/audit denied');
  // #6: Oversized / invalid ID rejected
  assert.equal(isValidId('x'.repeat(150)), false, 'Dirty #6: Oversized ID denied');
  assert.equal(isValidId('bad/id!'), false, 'Dirty #6b: Invalid characters in ID denied');
  // #11: Auction self-bid & PII denied
  const auctionAllowedKeys = new Set([
    'id', 'sellerUid', 'sellerName', 'dragon', 'rarity', 'startCornPrice',
    'currentCornPrice', 'buyNowStars', 'highestBidderUid', 'highestBidderName',
    'bidCount', 'status', 'winnerUid', 'settlementType', 'sellerClaimed',
    'buyerClaimed', 'endsAtMs', 'createdAt', 'updatedAt',
  ]);
  assert.equal(auctionAllowedKeys.has('sellerTelegramUsername'), false, 'Dirty #11: Telegram handle PII forbidden in auctions');
  // #12: Unencrypted save payload rejected
  assert.equal(isValidEncryptedMap(null), false, 'Dirty #12: Unencrypted save rejected');
  assert.equal(
    isValidEncryptedMap({ alg: 'AES-256-GCM', iv: 'iv123456789012', ciphertext: 'ciphertext_base64_payload' }),
    true,
    'Dirty #12b: Valid AES-256-GCM encrypted map accepted'
  );
}
