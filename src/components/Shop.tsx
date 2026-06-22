import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Crown, Package, Zap, Shield, Sparkles, Check, Lock, PlayCircle, History, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useEconomy } from '@/hooks/useEconomy';
import { rankById, rankIndex, RARITY_STYLE, type BoxReward } from '@/lib/economy';

function CoinPill({ amount, className = '' }: { amount: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 text-xs font-semibold ${className}`}>
      <Coins className="w-3 h-3" /> {amount.toLocaleString()}
    </span>
  );
}

export default function Shop() {
  const eco = useEconomy();
  const [pending, setPending] = useState<null | { kind: 'title' | 'box' | 'powerup'; id: string; cost: number; name: string }>(null);
  const [openingBox, setOpeningBox] = useState<null | string>(null);
  const [revealReward, setRevealReward] = useState<null | BoxReward>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const confirmPurchase = () => {
    if (!pending) return;
    let ok = false;
    if (pending.kind === 'title') ok = eco.buyTitle(pending.id);
    if (pending.kind === 'box') ok = eco.buyBox(pending.id);
    if (pending.kind === 'powerup') ok = eco.buyPowerUp(pending.id);
    setPending(null);
    void ok;
  };

  const handleOpenBox = (boxId: string) => {
    const count = eco.inventoryBoxes[boxId] || 0;
    if (count <= 0) {
      // auto-buy then open
      const ok = eco.buyBox(boxId);
      if (!ok) return;
    }
    setOpeningBox(boxId);
    setTimeout(() => {
      const reward = eco.openBox(boxId);
      setOpeningBox(null);
      if (reward) setRevealReward(reward);
    }, 1400);
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Shop</h1>
          <p className="text-sm text-muted-foreground">Spend your study-earned coins on titles, crates, and power-ups.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 px-3 py-1.5 flex items-center gap-1.5 font-semibold">
            <Coins className="w-4 h-4" /> {eco.wallet.balance.toLocaleString()}
          </div>
          <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)}>
            <History className="w-4 h-4 mr-1" /> History
          </Button>
        </div>
      </header>

      {/* active power-ups bar */}
      {eco.activePowerUps.length > 0 && (
        <Card>
          <CardContent className="p-3 flex flex-wrap gap-2">
            {eco.activePowerUps.map((a) => {
              const def = eco.powerups.find((p) => p.id === a.defId);
              const remainingMs = new Date(a.expiresAt).getTime() - Date.now();
              const hrs = Math.max(0, Math.floor(remainingMs / 3600000));
              const mins = Math.max(0, Math.floor((remainingMs % 3600000) / 60000));
              return (
                <div key={a.id} className="rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium flex items-center gap-1.5">
                  <span>{def?.emoji}</span> {def?.name}
                  <span className="opacity-70">· {hrs}h {mins}m</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="titles">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="titles"><Crown className="w-4 h-4 mr-1.5" />Titles</TabsTrigger>
          <TabsTrigger value="boxes"><Package className="w-4 h-4 mr-1.5" />Boxes</TabsTrigger>
          <TabsTrigger value="powerups"><Zap className="w-4 h-4 mr-1.5" />Power-Ups</TabsTrigger>
          <TabsTrigger value="ranks"><Shield className="w-4 h-4 mr-1.5" />Ranks</TabsTrigger>
        </TabsList>

        {/* ----- TITLES ----- */}
        <TabsContent value="titles" className="mt-4 space-y-3">
          {eco.titles.map((t) => {
            const owned = eco.ownedTitles.includes(t.id);
            const equipped = eco.equippedTitle === t.id;
            const req = rankById(t.requiredRankId);
            const reqMet = rankIndex(eco.highestRank.id) >= rankIndex(t.requiredRankId);
            return (
              <Card key={t.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="text-3xl">{t.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold flex items-center gap-2">
                      {t.name}
                      {equipped && <span className="text-xs rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-0.5">Equipped</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">{t.description}</div>
                    <div className="text-xs mt-1 flex flex-wrap items-center gap-2">
                      <CoinPill amount={t.cost} />
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${reqMet ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                        {reqMet ? <Check className="w-3 h-3" /> : <Lock className="w-3 h-3" />} Req: {req.icon} {req.name}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {owned ? (
                      equipped ? (
                        <Button size="sm" variant="outline" onClick={() => eco.equipTitle(null)}>Unequip</Button>
                      ) : (
                        <Button size="sm" onClick={() => eco.equipTitle(t.id)}>Equip</Button>
                      )
                    ) : (
                      <Button size="sm" disabled={!reqMet || eco.wallet.balance < t.cost} onClick={() => setPending({ kind: 'title', id: t.id, cost: t.cost, name: t.name })}>
                        Buy
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* ----- BOXES ----- */}
        <TabsContent value="boxes" className="mt-4 grid sm:grid-cols-2 gap-3">
          {eco.boxes.map((b) => {
            const owned = eco.inventoryBoxes[b.id] || 0;
            return (
              <Card key={b.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">{b.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{b.name}</div>
                      <div className="text-xs text-muted-foreground">Owned: {owned}</div>
                      <CoinPill amount={b.cost} className="mt-1" />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" className="flex-1" disabled={eco.wallet.balance < b.cost} onClick={() => setPending({ kind: 'box', id: b.id, cost: b.cost, name: b.name })}>
                      Buy
                    </Button>
                    <Button size="sm" className="flex-1" disabled={owned <= 0 && eco.wallet.balance < b.cost} onClick={() => handleOpenBox(b.id)}>
                      <PlayCircle className="w-4 h-4 mr-1" /> {owned > 0 ? 'Open' : 'Buy & Open'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {eco.boxRewardsLog.length > 0 && (
            <Card className="sm:col-span-2">
              <CardContent className="p-4">
                <div className="font-semibold text-sm mb-2 flex items-center gap-1.5"><Sparkles className="w-4 h-4" /> Recent Crate Drops</div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {eco.boxRewardsLog.slice(0, 12).map((r) => {
                    const s = RARITY_STYLE[r.rarity];
                    return (
                      <div key={r.id} className={`shrink-0 rounded-lg ring-1 ${s.ring} bg-card px-3 py-2 text-xs`}>
                        <div className="text-lg">{r.emoji}</div>
                        <div className="font-medium">{r.label}</div>
                        <div className={`${s.color} text-[10px] uppercase tracking-wide`}>{s.label}</div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ----- POWER-UPS ----- */}
        <TabsContent value="powerups" className="mt-4 grid sm:grid-cols-2 gap-3">
          {eco.powerups.map((p) => {
            const owned = eco.inventoryPowerUps[p.id] || 0;
            return (
              <Card key={p.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">{p.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.description}</div>
                      <div className="mt-1 flex items-center gap-2 text-xs">
                        <CoinPill amount={p.cost} />
                        <span className="text-muted-foreground">Owned: {owned}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" className="flex-1" disabled={eco.wallet.balance < p.cost} onClick={() => setPending({ kind: 'powerup', id: p.id, cost: p.cost, name: p.name })}>Buy</Button>
                    <Button size="sm" className="flex-1" disabled={owned <= 0} onClick={() => eco.activatePowerUp(p.id)}>Activate</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* ----- RANKS ----- */}
        <TabsContent value="ranks" className="mt-4 space-y-2">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Ranks are earned by maintaining your study streak. They are permanent — once unlocked, they stay forever, even if your streak resets.</div>
              <div className="mt-2 text-sm">Current: <span className="font-semibold">{eco.currentRank.icon} {eco.currentRank.name}</span> · Highest: <span className="font-semibold">{eco.highestRank.icon} {eco.highestRank.name}</span></div>
            </CardContent>
          </Card>
          {eco.allRanks.map((r) => {
            const unlocked = rankIndex(eco.highestRank.id) >= rankIndex(r.id);
            return (
              <Card key={r.id} className={unlocked ? '' : 'opacity-60'}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="text-2xl">{r.icon}</div>
                  <div className="flex-1">
                    <div className={`font-semibold ${r.color}`}>{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.minStreak}-day streak required</div>
                  </div>
                  {unlocked ? <span className="text-xs rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 flex items-center gap-1"><Check className="w-3 h-3" />Unlocked</span> : <Lock className="w-4 h-4 text-muted-foreground" />}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>

      {/* purchase confirmation */}
      <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Purchase</DialogTitle>
            <DialogDescription>
              Buy <span className="font-semibold">{pending?.name}</span> for <span className="font-semibold">{pending?.cost.toLocaleString()} coins</span>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>Cancel</Button>
            <Button onClick={confirmPurchase}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* box opening animation */}
      <Dialog open={!!openingBox} onOpenChange={() => {}}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-center">Opening Crate…</DialogTitle></DialogHeader>
          <div className="flex flex-col items-center py-6 gap-4">
            <motion.div
              initial={{ scale: 0.6, rotate: -20 }}
              animate={{ scale: [0.6, 1.1, 0.9, 1.2, 1], rotate: [-20, 20, -15, 15, 0] }}
              transition={{ duration: 1.3, repeat: Infinity }}
              className="text-7xl"
            >
              {eco.boxes.find((b) => b.id === openingBox)?.emoji}
            </motion.div>
            <div className="text-sm text-muted-foreground">Generating reward…</div>
          </div>
        </DialogContent>
      </Dialog>

      {/* reveal */}
      <Dialog open={!!revealReward} onOpenChange={(o) => !o && setRevealReward(null)}>
        <DialogContent className="max-w-sm text-center">
          {revealReward && (
            <>
              <DialogHeader><DialogTitle>You got a reward!</DialogTitle></DialogHeader>
              <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`mx-auto rounded-2xl p-6 ring-2 ${RARITY_STYLE[revealReward.rarity].ring} bg-card`}>
                <div className="text-6xl mb-2">{revealReward.emoji}</div>
                <div className={`text-xs uppercase tracking-widest ${RARITY_STYLE[revealReward.rarity].color}`}>{RARITY_STYLE[revealReward.rarity].label}</div>
                <div className="font-display text-lg font-bold mt-1">{revealReward.label}</div>
              </motion.div>
              <DialogFooter className="sm:justify-center gap-2 mt-4">
                {(eco.inventoryPowerUps['crate-reroll'] || 0) > 0 && (
                  <Button variant="outline" onClick={() => { const nr = eco.rerollLastBoxReward(); if (nr) setRevealReward(nr); }}>
                    🎲 Reroll
                  </Button>
                )}
                <Button onClick={() => setRevealReward(null)}>Awesome!</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* transaction history */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Coin History</DialogTitle></DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto divide-y">
            {eco.transactions.length === 0 && <div className="text-sm text-muted-foreground py-6 text-center">No transactions yet.</div>}
            {eco.transactions.map((tx) => (
              <div key={tx.id} className="py-2 flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">{tx.source}</div>
                  <div className="text-xs text-muted-foreground">{new Date(tx.timestamp).toLocaleString()}</div>
                </div>
                <div className={tx.type === 'earn' ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
                  {tx.type === 'earn' ? '+' : '-'}{tx.amount.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Compact rank-unlock celebration banner shown when a new rank is reached. */
export function RankUnlockBanner() {
  const eco = useEconomy();
  if (!eco.rankUnlockBanner) return null;
  const r = rankById(eco.rankUnlockBanner);
  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-3"
      >
        <div className="text-3xl">{r.icon}</div>
        <div>
          <div className="text-xs uppercase tracking-widest opacity-80">Rank Unlocked</div>
          <div className="font-bold">{r.name}</div>
        </div>
        <button onClick={eco.dismissRankBanner} className="ml-2 hover:bg-white/20 rounded p-1"><X className="w-4 h-4" /></button>
      </motion.div>
    </AnimatePresence>
  );
}
