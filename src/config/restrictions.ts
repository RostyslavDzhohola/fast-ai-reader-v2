// Guild IDs and their corresponding URL patterns for manifest
export const RESTRICTED_GUILDS = {
  // Used for manifest.ts exclude_matches
  MANIFEST_PATTERNS: ['*://*.discord.com/channels/1003977793845084200/*'] as string[],

  // Used for UI checks (just the guild IDs)
  GUILD_IDS: [
    '1003977793845084200',
    // ... more guild IDs
  ] as string[],
} as const

// Helper function to check if a guild is restricted
export function isGuildRestricted(guildId: string): boolean {
  return RESTRICTED_GUILDS.GUILD_IDS.includes(guildId)
}
