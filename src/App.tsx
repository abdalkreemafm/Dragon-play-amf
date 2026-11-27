import React from 'react';
import {
  CheckSquare,
  Crown,
  Egg,
  Shield,
  Swords,
  TrendingUp,
  Trophy,
  Volume2,
  VolumeX,
  Wallet,
} from 'lucide-react';
import { MainTab } from './types/game';
import { formatCompactNumber } from './data/gameData';
import { getTelegramUser, triggerTelegramHaptic } from './utils/telegram';
import { soundFX } from './utils/sound';
import { CornIcon, StarIcon } from './components/art/DuckArt';
import { TitleScreen } from './components/TitleScreen';
import { DucksTab } from './components/tabs/DucksTab';
import { EggsTab } from './components/tabs/EggsTab';
import { ArenaTab } from './components/tabs/ArenaTab';
import { GodsTab } from './components/tabs/GodsTab';
import { TasksTab } from './components/tabs/TasksTab';
import { MarketTab } from './components/tabs/MarketTab';
import { GameModals } from './components/modals/GameModals';
import { RankingsModal } from './components/modals/RankingsModal';
import { useGameController } from './hooks/useGameController';

export function App() {
  const {
    screen,
    setScreen,
    activeTab,
    setActiveTab,
    navigateToTab,
    openDragonAuctionFor,
    marketPreselect,
    godsInitialSubTab,
    setGodsInitialSubTab,
    modal,
    setModal,
    passInitialTab,
    openPassModal,
    state,
    hasSave,
    toast,
    timedBonusReadyIn,
    extraChestReadyIn,
    blitzSecLeft,
    tgVerified,
    effectiveCurrentUid,
    isOnlineAuthed,
    leaderboardPlayers,
    liveAuctions,
    allianceDirectory,
    competitionParticipants,
    competitionMeta,
    feedChallenges,
    claimableDailyCount,
    handleStartGame,
    handleSelectDuck,
    handleFeedDuck,
    handleStartBreeding,
    handleUpgradeXlWithEggs,
    handleUpgradeStarCustomization,
    handleUpgradeDuckSkill,
    handleTrainDragon,
    handleUpgradeSquadTalent,
    handleForgeRelic,
    handleUnlockSlot,
    handleMergeDucks,
    handleClaimTimedBonus,
    handleClaimExtraChest,
    handleMergeCells,
    handleStartBlitz,
    handleAutoMergeBoard,
    handleUseHammerOnCell,
    handlePlaceQueuedEgg,
    handlePlaceAllQueuedEggs,
    handleSellGridItem,
    handleSellQueuedEgg,
    handleDeliverToGod,
    handleOpenSnackChest,
    handleUnlockGridSlot,
    handleSpendArenaEntry,
    handleRefundArenaEntry,
    handleBattleResult,
    handleRaceResult,
    handleClaimDailyLeague,
    handleRotateWeekendEvent,
    handleRefreshAlliances,
    handleCreateAlliance,
    handleJoinAllianceById,
    handleJoinAllianceByCode,
    handleLeavePack,
    handlePromoteDemoteMember,
    handleKickMember,
    handleTransferLeadership,
    handleUpdateAllianceIdentity,
    handleUpdateJoinConditions,
    handleRegenerateSecretCode,
    handleSendPackMessage,
    handleDonateAlliance,
    handleFundAllianceTech,
    handleConvertBlessingToResearch,
    handleStartAllianceResearch,
    handleSpeedupAllianceResearch,
    handleStartAllianceRally,
    handleDispatchDragonToRally,
    handleReinforceRally,
    handleSpeedupRally,
    handleResolveAllianceRally,
    handleHarvestOccupiedSite,
    handleMarkNotificationRead,
    handleSendQuickAllianceInvite,
    handleDistributeAllianceDividends,
    handleHelpAllies,
    handleAllianceBreedSpeedup,
    handleAttackAllianceBoss,
    handleSupportCoopGoal,
    handleClaimCoopGoal,
    handleDonateDragonToSwarm,
    handleTrainSwarmDragon,
    handleUpgradeSwarmDragonSkill,
    handleUpgradeSwarmDragonGear,
    handleSelectSwarmDragonSkin,
    handleClaimAllianceQuest,
    handleClaimActivityChest,
    handleClaimAllianceGift,
    handleClaimAllAllianceGifts,
    handleBuyAllianceShopOffer,
    handleActivateGod,
    handleBuyStorePackage,
    handleWatchRewardedAd,
    handleSellOwnDragon,
    handleBarterTrade,
    handleListDragonAuction,
    handleBidLiveAuction,
    handleBuyNowLiveAuction,
    handleCancelLiveAuction,
    handleClaimBuyerAuction,
    handleClaimSellerAuction,
    handleBuyTraderDeal,
    handleClaimDailyTask,
    handleClaimDailyLevelReward,
    handleClaimDailyPassDay,
    handleUnlockBattlePassPremium,
    handleClaimBattlePassReward,
    handleClaimTournamentMilestone,
    handleClaimTreasureStep,
    handleClaimHonorPack,
    handleClaimAchievement,
    handleClaimHeartMilestone,
    handleClaimSocial,
    handleInviteFriendSim,
    handleInstantSummonDragon,
    handleFlipCoin,
    handleSpinWheel,
    handleRedeemPromo,
    handleToggleWalletConnect,
    handleToggleMute,
    handleToggleHaptics,
    handleToggleDragonMotion,
  } = useGameController();

  if (screen === 'TITLE') {
    return (
      <TitleScreen
        username={state.username}
        isTelegramVerified={tgVerified || Boolean(getTelegramUser())}
        hasSavedProgress={hasSave}
        savedDmd={state.dmdTotal}
        savedDuckCount={state.ducks.length}
        muted={state.muted}
        onToggleMute={handleToggleMute}
        onStart={handleStartGame}
      />
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-[#0b0d14] text-slate-100 overflow-hidden select-none">
      {/* Persistent Streamlined Top Bar */}
      <header className="pt-safe shrink-0 min-h-14 px-2 sm:px-5 bg-[#12151f] border-b border-slate-800/90 flex items-center justify-between gap-1.5 z-20">
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={() => setModal('PAUSE')}
            title="القائمة والإعدادات"
            className="flex items-center gap-1.5 px-2.5 h-9 rounded-xl bg-slate-800/80 border border-slate-700/70 hover:border-amber-400/50 cursor-pointer shrink-0"
          >
            <span className="w-5 h-5 rounded-md bg-amber-400/20 text-amber-400 flex items-center justify-center text-xs font-black">
              🐉
            </span>
            <span className="font-mono-num text-[11px] font-bold text-slate-200 hidden md:inline">
              {state.username}
            </span>
          </button>

          <button
            onClick={() => {
              soundFX.playTabSwitch();
              setModal('WALLET');
            }}
            aria-label="صندوق AMF والمحفظة"
            title="صندوق AMF والمحفظة"
            className="w-9 h-9 rounded-xl bg-slate-800/80 border border-slate-700/70 hover:border-sky-400/60 flex items-center justify-center text-slate-200 cursor-pointer shrink-0"
          >
            <Wallet className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              soundFX.playTabSwitch();
              handleRefreshAlliances();
              setModal('RANKINGS');
            }}
            aria-label="التصنيفات والمسابقات"
            title="التصنيفات والمسابقات"
            className="w-9 h-9 rounded-xl bg-slate-800/80 border border-slate-700/70 hover:border-amber-400/60 flex items-center justify-center text-amber-300 cursor-pointer shrink-0"
          >
            <Trophy className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div
            title="طعام التنين (العملة الأساسية)"
            className="flex items-center gap-1 font-mono-num text-xs sm:text-base font-black text-white whitespace-nowrap"
          >
            <span>{formatCompactNumber(state.corn)}</span>
            <CornIcon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
          </div>

          <div
            title="النجوم (عملة صعبة من الشحن والأحداث الخاصة)"
            className="flex items-center gap-1 font-mono-num text-xs sm:text-base font-black text-white whitespace-nowrap"
          >
            <span>{state.stars.toLocaleString()}</span>
            <StarIcon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
          </div>

          <button
            onClick={handleToggleMute}
            aria-label={state.muted ? 'تشغيل الصوت' : 'كتم الصوت'}
            className="w-9 h-9 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer shrink-0"
          >
            {state.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
          </button>
        </div>
      </header>

      {/* Main Viewport */}
      <main className="flex-1 min-h-0 overflow-hidden relative">
        {activeTab === 'DUCKS' && (
          <DucksTab
            state={state}
            onSelectDuck={handleSelectDuck}
            onFeedDuck={handleFeedDuck}
            onStartBreeding={handleStartBreeding}
            onUpgradeXlWithEggs={handleUpgradeXlWithEggs}
            onTrainDragon={handleTrainDragon}
            onUpgradeStarCustomization={handleUpgradeStarCustomization}
            onUpgradeDuckSkill={handleUpgradeDuckSkill}
            onUnlockSlot={handleUnlockSlot}
            onMergeDucks={handleMergeDucks}
            onWatchRewardedAd={handleWatchRewardedAd}
            onOpenPass={openPassModal}
            onOpenTasksTab={() => navigateToTab('TASKS')}
            onOpenDragonAuction={openDragonAuctionFor}
            onClaimTimedBonus={handleClaimTimedBonus}
            timedBonusReadyIn={timedBonusReadyIn}
            onClaimExtraChest={handleClaimExtraChest}
            extraChestReadyIn={extraChestReadyIn}
          />
        )}

        {activeTab === 'EGGS' && (
          <EggsTab
            state={state}
            blitzSecLeft={blitzSecLeft}
            onStartBlitz={handleStartBlitz}
            onAutoMergeBoard={handleAutoMergeBoard}
            onUseHammerOnCell={handleUseHammerOnCell}
            onMergeCells={handleMergeCells}
            onPlaceQueuedEgg={handlePlaceQueuedEgg}
            onPlaceAllQueuedEggs={handlePlaceAllQueuedEggs}
            onSellGridItem={handleSellGridItem}
            onSellQueuedEgg={handleSellQueuedEgg}
            onDeliverToGod={handleDeliverToGod}
            onOpenSnackChest={handleOpenSnackChest}
            onUnlockGridSlot={handleUnlockGridSlot}
            onOpenTournament={() => setModal('TOURNAMENT')}
          />
        )}

        {activeTab === 'ARENA' && (
          <ArenaTab
            state={state}
            leaderboardPlayers={leaderboardPlayers}
            currentUid={effectiveCurrentUid}
            onSpendArenaEntry={handleSpendArenaEntry}
            onRefundArenaEntry={handleRefundArenaEntry}
            onBattleResult={handleBattleResult}
            onRaceResult={handleRaceResult}
            onClaimDailyLeague={handleClaimDailyLeague}
            onRotateWeekendEvent={handleRotateWeekendEvent}
            onOpenRankings={() => setModal('RANKINGS')}
          />
        )}

        {activeTab === 'GODS' && (
          <GodsTab
            state={state}
            initialSubTab={godsInitialSubTab}
            allianceDirectory={allianceDirectory}
            currentUid={effectiveCurrentUid}
            isOnlineAuthed={isOnlineAuthed}
            onCreateAlliance={handleCreateAlliance}
            onJoinAllianceById={handleJoinAllianceById}
            onJoinAllianceByCode={handleJoinAllianceByCode}
            onRefreshAlliances={handleRefreshAlliances}
            onJoinPack={() => {
              setGodsInitialSubTab('GODS');
              setActiveTab('GODS');
            }}
            onLeavePack={handleLeavePack}
            onUpdateJoinConditions={handleUpdateJoinConditions}
            onDonatePack={handleDonateAlliance}
            onHelpAllies={handleHelpAllies}
            onAllianceBreedSpeedup={handleAllianceBreedSpeedup}
            onAttackAllianceBoss={handleAttackAllianceBoss}
            onSendPackMessage={handleSendPackMessage}
            onClaimAllianceQuest={handleClaimAllianceQuest}
            onClaimActivityChest={handleClaimActivityChest}
            onClaimAllianceGift={handleClaimAllianceGift}
            onClaimAllAllianceGifts={handleClaimAllAllianceGifts}
            onSupportCoopGoal={handleSupportCoopGoal}
            onClaimCoopGoal={handleClaimCoopGoal}
            onPromoteDemoteMember={handlePromoteDemoteMember}
            onKickMember={handleKickMember}
            onTransferLeadership={handleTransferLeadership}
            onUpdateAllianceIdentity={handleUpdateAllianceIdentity}
            onRegenerateSecretCode={handleRegenerateSecretCode}
            onFundAllianceTech={handleFundAllianceTech}
            onConvertBlessingToResearch={handleConvertBlessingToResearch}
            onStartAllianceResearch={handleStartAllianceResearch}
            onSpeedupAllianceResearch={handleSpeedupAllianceResearch}
            onStartAllianceRally={handleStartAllianceRally}
            onDispatchDragonToRally={handleDispatchDragonToRally}
            onReinforceRally={handleReinforceRally}
            onSpeedupRally={handleSpeedupRally}
            onResolveAllianceRally={handleResolveAllianceRally}
            onHarvestOccupiedSite={handleHarvestOccupiedSite}
            onMarkNotificationRead={handleMarkNotificationRead}
            onSendQuickAllianceInvite={handleSendQuickAllianceInvite}
            onDistributeAllianceDividends={handleDistributeAllianceDividends}
            onDonateDragonToSwarm={handleDonateDragonToSwarm}
            onTrainSwarmDragon={handleTrainSwarmDragon}
            onUpgradeSwarmDragonSkill={handleUpgradeSwarmDragonSkill}
            onUpgradeSwarmDragonGear={handleUpgradeSwarmDragonGear}
            onSelectSwarmDragonSkin={handleSelectSwarmDragonSkin}
            onBuyAllianceShopOffer={handleBuyAllianceShopOffer}
            onUpgradeSquadTalent={handleUpgradeSquadTalent}
            onForgeRelic={handleForgeRelic}
            onActivateGod={handleActivateGod}
            onClaimTreasureStep={handleClaimTreasureStep}
            onOpenExchangeGold={() => setModal('WALLET')}
          />
        )}

        {activeTab === 'TASKS' && (
          <TasksTab
            state={state}
            leaderboardPlayers={leaderboardPlayers}
            feedChallenges={feedChallenges}
            currentUid={effectiveCurrentUid}
            onSwitchTab={(t) => setActiveTab(t)}
            onBuyTraderDeal={handleBuyTraderDeal}
            onClaimDailyTask={handleClaimDailyTask}
            onClaimDailyLevelReward={handleClaimDailyLevelReward}
            onFlipCoin={handleFlipCoin}
            onClaimHonorPack={handleClaimHonorPack}
            onClaimWatchBonus={() => handleWatchRewardedAd('energy')}
            onClaimAchievement={handleClaimAchievement}
            onClaimHeartMilestone={handleClaimHeartMilestone}
            onClaimSocial={handleClaimSocial}
            onRedeemPromo={handleRedeemPromo}
            onSpinWheel={handleSpinWheel}
            onInviteFriendSim={handleInviteFriendSim}
            onInstantMerge={handleInstantSummonDragon}
          />
        )}

        {activeTab === 'MARKET' && (
          <MarketTab
            state={state}
            liveAuctions={liveAuctions}
            currentUid={effectiveCurrentUid}
            isSignedIn={isOnlineAuthed}
            onSellOwnDuck={handleSellOwnDragon}
            onListDragonAuction={handleListDragonAuction}
            onBidLiveAuction={handleBidLiveAuction}
            onBuyNowLiveAuction={handleBuyNowLiveAuction}
            onCancelLiveAuction={handleCancelLiveAuction}
            onClaimBuyerAuction={handleClaimBuyerAuction}
            onClaimSellerAuction={handleClaimSellerAuction}
            onBuyMarketGod={(godId) => handleActivateGod(godId, 'stars')}
            onBuyStorePackage={handleBuyStorePackage}
            onWatchRewardedAd={handleWatchRewardedAd}
            onBarterTrade={handleBarterTrade}
            auctionPreselect={marketPreselect}
          />
        )}

        {toast && (
          <div className="pointer-events-none fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-slate-900/95 border border-amber-400/60 text-amber-200 text-xs font-extrabold shadow-2xl text-center max-w-[90vw]">
            {toast}
          </div>
        )}
      </main>

      {/* Persistent 6-Tab Bottom Navigation Bar */}
      <nav className="pb-safe shrink-0 min-h-16 bg-[#12151f] border-t border-slate-800/90 px-1 flex items-center justify-around z-20">
        {[
          { id: 'MARKET' as MainTab, label: 'المتجر', icon: TrendingUp, badge: 0 },
          { id: 'EGGS' as MainTab, label: 'البيض', icon: Egg, badge: state.eggQueue.length },
          { id: 'DUCKS' as MainTab, label: 'التنانين', icon: Crown, badge: 0 },
          { id: 'ARENA' as MainTab, label: 'الحلبة', icon: Swords, badge: state.league.dailyClaimed ? 0 : 1 },
          {
            id: 'GODS' as MainTab,
            label: 'السرب',
            icon: Shield,
            badge:
              (state.pack.gifts ?? []).filter((g) => !g.claimed).length +
              (state.pack.notifications ?? []).filter((n) => !n.read).length +
              (state.pack.activeRally?.status === 'READY' ? 1 : 0),
          },
          { id: 'TASKS' as MainTab, label: 'المهام', icon: CheckSquare, badge: claimableDailyCount },
        ].map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                soundFX.playTabSwitch();
                triggerTelegramHaptic('light');
                if (item.id === 'GODS') {
                  setGodsInitialSubTab('GODS');
                }
                setActiveTab(item.id);
              }}
              className={`relative flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-2xl transition-all cursor-pointer min-w-[50px] min-h-[48px] ${
                active ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${active ? 'scale-110 transition-transform' : ''}`} />
                {item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[15px] px-1 rounded-full bg-rose-500 text-white font-mono-num text-[9px] font-black flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] sm:text-[11px] font-extrabold whitespace-nowrap">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <GameModals
        modal={modal}
        passInitialTab={passInitialTab}
        state={state}
        competitionParticipants={competitionParticipants}
        currentUid={effectiveCurrentUid}
        onClose={() => setModal(null)}
        onClaimTournamentMilestone={handleClaimTournamentMilestone}
        onClaimDailyPassDay={handleClaimDailyPassDay}
        onUnlockBattlePassPremium={handleUnlockBattlePassPremium}
        onClaimBattlePassReward={handleClaimBattlePassReward}
        onToggleWalletConnect={handleToggleWalletConnect}
        onSwapWallet={handleBarterTrade}
        onToggleMute={handleToggleMute}
        onToggleHaptics={handleToggleHaptics}
        onToggleDragonMotion={handleToggleDragonMotion}
        onBackToTitle={() => {
          setModal(null);
          setScreen('TITLE');
        }}
        isTelegramVerified={tgVerified || Boolean(getTelegramUser())}
      />

      <RankingsModal
        open={modal === 'RANKINGS'}
        onClose={() => setModal(null)}
        state={state}
        leaderboardPlayers={leaderboardPlayers}
        allianceDirectory={allianceDirectory}
        competitionParticipants={competitionParticipants}
        feedChallenges={feedChallenges}
        competitionMeta={competitionMeta}
        currentUid={effectiveCurrentUid}
        onRefreshAlliances={handleRefreshAlliances}
        onOpenTournament={() => setModal('TOURNAMENT')}
        onOpenAlliancesTab={() => {
          setGodsInitialSubTab('GODS');
          setActiveTab('GODS');
        }}
      />
    </div>
  );
}

export default App;
