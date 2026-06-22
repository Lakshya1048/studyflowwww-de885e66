import { Coins, Crown, Package, Zap, Award, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEconomy } from '@/hooks/useEconomy';
import { titleById, powerUpById, boxById } from '@/lib/economy';

export default function WalletInventory() {
  const eco = useEconomy();

  return (
    <div className="space-y-4">
      {/* Wallet */}
      <Card>
        <CardContent className="p-4">
          <div className="text-xs uppercase text-muted-foreground tracking-wide flex items-center gap-1"><Coins className="w-3.5 h-3.5" /> Wallet</div>
          <div className="mt-1 grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xl font-bold text-amber-600 dark:text-amber-400">{eco.wallet.balance.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Balance</div>
            </div>
            <div>
              <div className="text-xl font-bold">{eco.wallet.totalEarned.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Earned</div>
            </div>
            <div>
              <div className="text-xl font-bold">{eco.wallet.totalSpent.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Spent</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rank Card */}
      <Card>
        <CardContent className="p-4">
          <div className="text-xs uppercase text-muted-foreground tracking-wide flex items-center gap-1"><Award className="w-3.5 h-3.5" /> Rank</div>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div>
              <div className="text-xs text-muted-foreground">Current</div>
              <div className="text-base font-semibold">{eco.currentRank.icon} {eco.currentRank.name}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Highest Ever</div>
              <div className="text-base font-semibold">{eco.highestRank.icon} {eco.highestRank.name}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Titles */}
      <Card>
        <CardContent className="p-4">
          <div className="text-xs uppercase text-muted-foreground tracking-wide flex items-center gap-1"><Crown className="w-3.5 h-3.5" /> My Titles</div>
          {eco.ownedTitles.length === 0 ? (
            <div className="text-sm text-muted-foreground mt-2">No titles owned yet. Visit the Shop.</div>
          ) : (
            <div className="mt-2 space-y-1.5">
              {eco.ownedTitles.map((id) => {
                const t = titleById(id);
                if (!t) return null;
                const equipped = eco.equippedTitle === id;
                return (
                  <div key={id} className="flex items-center justify-between gap-2 text-sm bg-muted/40 rounded-lg px-3 py-1.5">
                    <span>{t.emoji} {t.name}</span>
                    {equipped ? (
                      <Button size="sm" variant="outline" onClick={() => eco.equipTitle(null)}>Unequip</Button>
                    ) : (
                      <Button size="sm" onClick={() => eco.equipTitle(id)}>Equip</Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inventory: Boxes & Power-Ups */}
      <Card>
        <CardContent className="p-4">
          <div className="text-xs uppercase text-muted-foreground tracking-wide flex items-center gap-1"><Package className="w-3.5 h-3.5" /> Inventory</div>
          <div className="mt-2">
            <div className="text-xs font-medium text-muted-foreground mb-1">Mystery Boxes</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(eco.inventoryBoxes).filter(([, n]) => n > 0).map(([id, n]) => {
                const b = boxById(id); if (!b) return null;
                return <span key={id} className="text-xs rounded-full bg-muted px-2 py-1">{b.emoji} {b.name} × {n}</span>;
              })}
              {Object.values(eco.inventoryBoxes).every((n) => n <= 0) && <span className="text-xs text-muted-foreground">No boxes.</span>}
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1"><Zap className="w-3 h-3" /> Power-Ups</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(eco.inventoryPowerUps).filter(([, n]) => n > 0).map(([id, n]) => {
                const p = powerUpById(id); if (!p) return null;
                return (
                  <button key={id} onClick={() => eco.activatePowerUp(id)} className="text-xs rounded-full bg-primary/10 text-primary px-2 py-1 hover:bg-primary/20">
                    {p.emoji} {p.name} × {n}
                  </button>
                );
              })}
              {Object.values(eco.inventoryPowerUps).every((n) => n <= 0) && <span className="text-xs text-muted-foreground">No power-ups.</span>}
            </div>
          </div>
          {eco.activePowerUps.length > 0 && (
            <div className="mt-3">
              <div className="text-xs font-medium text-muted-foreground mb-1">Active</div>
              <div className="flex flex-wrap gap-2">
                {eco.activePowerUps.map((a) => {
                  const p = powerUpById(a.defId);
                  const mins = Math.max(0, Math.floor((new Date(a.expiresAt).getTime() - Date.now()) / 60000));
                  return <span key={a.id} className="text-xs rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-2 py-1">{p?.emoji} {p?.name} · {Math.floor(mins / 60)}h {mins % 60}m</span>;
                })}
              </div>
            </div>
          )}
          {(eco.ownedBadges.length > 0 || eco.ownedDecorations.length > 0) && (
            <div className="mt-3">
              <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Cosmetics</div>
              <div className="flex flex-wrap gap-2 text-xs">
                {eco.ownedBadges.map((b) => <span key={b} className="rounded-full bg-muted px-2 py-1">🎖 {b}</span>)}
                {eco.ownedDecorations.map((d) => <span key={d} className="rounded-full bg-muted px-2 py-1">🖼 {d}</span>)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
