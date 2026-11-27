import React from 'react';
import {
  Crown,
  Flame,
  Landmark,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Zap,
} from 'lucide-react';
import {
  AllianceEmblemId,
  AllianceMemberRole,
  DuckSkinId,
} from '../../../types/game';

export const TREASURE_THRESHOLDS = [40, 100, 220, 420];

export const SKIN_LABEL_AR: Record<DuckSkinId, string> = {
  classic: 'اللهب الكلاسيكي',
  cool: 'الجلد الجليدي',
  dj: 'تنين الرعد',
  royal: 'التنين الملكي',
  aqua: 'تنين المحيط',
  lilac: 'تنين السديم',
  ninja: 'تنين النينجا',
  pharaoh: 'التنين الفرعوني',
  skeleton: 'التنين العظمي',
  bride: 'تنين الكريستال',
  gamer: 'تنين النيون',
  coffee: 'تنين القهوة',
  cupid: 'تنين كيوبيد',
  pumpkin: 'تنين اليقطين',
};

export interface SortedRosterMember {
  id: string;
  name: string;
  role: AllianceMemberRole;
  rank: string;
  titleAr: string;
  power: number;
  weeklyContrib: number;
  donatedEnergy: number;
  donatedTech: number;
  rallyScore: number;
  dailyActivity: number;
  lastSeenAr: string;
  online: boolean;
  isSelf: boolean;
}

export function renderEmblemGlyph(emblemId: AllianceEmblemId, className = 'w-6 h-6') {
  switch (emblemId) {
    case 'royal_crown':
      return <Crown className={className} />;
    case 'phoenix_wing':
      return <Flame className={className} />;
    case 'sun_pyramid':
      return <Landmark className={className} />;
    case 'storm_fang':
      return <Zap className={className} />;
    case 'eternal_flame':
      return <Sparkles className={className} />;
    case 'obsidian_sword':
      return <Swords className={className} />;
    case 'emerald_throne':
      return <Trophy className={className} />;
    case 'dragon_shield':
    default:
      return <Shield className={className} />;
  }
}
