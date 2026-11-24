# Security Specification & Dirty Dozen Adversarial Payloads (5-Layer Defense)

## 1. Data Invariants
1. **Owner-Only Player Profiles & Encrypted Cloud Saves (`/playerProfiles/{uid}`, `/playerSaves/{uid}`)**:
   - Strictly isolated to `request.auth.uid == uid` for `get`, `create`, and `update`.
   - `list` and `delete` are unconditionally denied (`false`) — players cannot read other players' profiles/saves or delete player accounts.
   - `telegramIdHash` (SHA-256 hex digest) is immutable once linked, and sensitive fields are stored inside `encryptedSensitive` (`AES-256-GCM` map `{ alg, iv, ciphertext }`) rather than plaintext `telegramId`.
2. **Public Read-Only, Server-Written Leaderboard (`/leaderboard/{uid}`)**:
   - Readable by signed-in users (`get`, bounded `list` checking `resource.data.powerRating >= 0`), containing ONLY display name, avatar/skin, and stats (NO `telegramId`, NO email).
   - Client `create`, `update`, and `delete` are unconditionally denied (`false`) — only Cloud Functions / trusted server writes are permitted.
3. **Member-Gated Alliances & Server-Only Treasury (`/alliances/{allianceId}` + subcollections)**:
   - `/alliances/{allianceId}`, `/alliances/{allianceId}/members/{memberUid}`, `/alliances/{allianceId}/treasury/{treasuryId}`, `/alliances/{allianceId}/treasuryAuditLogs/{logId}` are readable ONLY if `exists(/databases/.../alliances/$(allianceId)/members/$(request.auth.uid))` (`isAllianceMember`).
   - Non-members receive `PERMISSION_DENIED`. Full `list` on `/alliances` is denied (`false`).
   - All writes and deletes to alliances, members, treasury, and treasury audit logs are unconditionally denied (`false`) from client SDKs — only Cloud Functions / trusted backend writes are permitted.
   - `/alliances/{allianceId}/messages/{messageId}` requires active alliance membership (`isAllianceMember(allianceId)`) for both read and message creation.
4. **Zero Self-Bidding, Zero PII & Escrow Integrity (`/dragonAuctions/{auctionId}`)**:
   - `sellerUid` is immutable and equals `request.auth.uid`; no `telegramId` or `sellerTelegramUsername` PII is permitted.
   - Sellers cannot bid on or buy their own active auction.
   - Terminal statuses `'CLAIMED'` and `'CANCELLED'` are locked; `allow delete: if false;`.

## 2. The "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Cross-Player Profile Read**: Authenticated `userB` attempting `get /playerProfiles/userA` or `list /playerProfiles`.
2. **Cross-Player Save Exfiltration**: Authenticated `userB` attempting `get /playerSaves/userA` or `list /playerSaves`.
3. **Player Self-Deletion**: Owner `userA` attempting `delete /playerProfiles/userA` or `delete /playerSaves/userA`.
4. **Telegram ID Hijack / Re-binding**: Owner `userA` attempting to overwrite immutable `telegramIdHash` on `/playerSaves/userA` or `/playerProfiles/userA`.
5. **Direct Leaderboard Forgery**: Authenticated `userA` attempting `create` or `update` `/leaderboard/userA` with `powerRating: 9999999`.
6. **Non-Member Alliance Snooping**: Non-member `userC` attempting `get /alliances/global_swarm_alpha` or `get /alliances/global_swarm_alpha/treasury/main`.
7. **Direct Treasury Manipulation**: Alliance member `userA` attempting `create` or `update` `/alliances/global_swarm_alpha/treasury/main` with `treasuryCorn: 999999`.
8. **Alliance Deletion Attack**: Any player attempting `delete /alliances/global_swarm_alpha`.
9. **Audit Log Tampering**: Any player attempting `create`, `update`, or `delete` on `/alliances/global_swarm_alpha/treasuryAuditLogs/log1`.
10. **Non-Member Alliance Chat Injection**: Non-member `userC` attempting `create /alliances/global_swarm_alpha/messages/msg1`.
11. **Auction Self-Bid / PII Injection**: Seller bidding on own auction or injecting `sellerTelegramUsername` ghost field.
12. **Plaintext Unencrypted Save Bypass**: Writing `/playerSaves/userA` without a valid `encryptedSensitive` AES-256-GCM map or with forged `updatedAt != request.time`.
