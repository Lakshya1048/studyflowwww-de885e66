import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ticket, Gift, Copy, Check, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export interface Coupon {
  code: string;
  coins: number;
  createdAt: string;
  redeemed: boolean;
}

const PROMOS: Record<string, number> = {
  STUDYFLOW: 100,
  FOCUS100: 100,
  TOPPER250: 250,
};

function makeCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const part = (n: number) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `SF-${part(4)}-${part(4)}`;
}

export default function CouponCenter({ onRedeem }: { onRedeem: (coins: number, source: string) => void }) {
  const [coupons, setCoupons] = useLocalStorage<Coupon[]>('studyflow-coupons', []);
  const [usedPromos, setUsedPromos] = useLocalStorage<string[]>('studyflow-coupons-promos', []);
  const [input, setInput] = useState('');
  const [amount, setAmount] = useState('100');
  const [copied, setCopied] = useState<string | null>(null);

  const generate = () => {
    const coins = Math.floor(Number(amount));
    if (!Number.isFinite(coins) || coins < 1) { toast.error('Enter a valid coin amount.'); return; }
    if (coins > 100000) { toast.error('Max 1,00,000 coins per coupon.'); return; }
    const coupon: Coupon = { code: makeCode(), coins, createdAt: new Date().toISOString(), redeemed: false };
    setCoupons((prev) => [coupon, ...prev]);
    toast.success(`Coupon generated: ${coupon.code} (${coins.toLocaleString()} coins)`);
  };


  const redeem = () => {
    const code = input.trim().toUpperCase();
    if (!code) return;

    if (PROMOS[code] !== undefined) {
      if (usedPromos.includes(code)) { toast.error('This promo code is already used.'); return; }
      setUsedPromos((prev) => [...prev, code]);
      onRedeem(PROMOS[code], `Coupon ${code}`);
      toast.success(`+${PROMOS[code]} coins from ${code} 🎉`);
      setInput('');
      return;
    }

    const found = coupons.find((c) => c.code === code);
    if (!found) { toast.error('Invalid coupon code.'); return; }
    if (found.redeemed) { toast.error('This coupon is already redeemed.'); return; }
    setCoupons((prev) => prev.map((c) => (c.code === code ? { ...c, redeemed: true } : c)));
    onRedeem(found.coins, `Coupon ${code}`);
    toast.success(`+${found.coins} coins redeemed 🎟️`);
    setInput('');
  };

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast.error('Copy failed');
    }
  };

  const active = coupons.filter((c) => !c.redeemed);

  return (
    <Card className="overflow-hidden border-dashed border-2 border-amber-500/40">
      <div className="bg-gradient-to-r from-amber-500/15 via-primary/10 to-transparent px-4 py-3 flex items-center gap-2">
        <Ticket className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold leading-tight">Coupon Center</div>
          <div className="text-xs text-muted-foreground">Generate unlimited free coupons and redeem codes for bonus coins.</div>
        </div>
      </div>

      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && redeem()}
            placeholder="Enter coupon code e.g. SF-XXXX-XXXX"
            className="font-mono tracking-wider"
          />
          <Button onClick={redeem} disabled={!input.trim()} className="sm:w-auto w-full">
            <Sparkles className="w-4 h-4 mr-1.5" /> Redeem
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch gap-2">
          <Input
            type="number"
            min={1}
            max={100000}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Coins"
            aria-label="Coupon coin amount"
            className="sm:w-32"
          />
          <Button variant="outline" onClick={generate} className="flex-1">
            <Gift className="w-4 h-4 mr-1.5" />
            Generate Free Coupon
          </Button>

        </div>

        <AnimatePresence initial={false}>
          {active.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Your coupons</div>
              {active.map((c) => (
                <div key={c.code} className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2">
                  <span className="font-mono text-sm font-semibold tracking-wider flex-1 truncate">{c.code}</span>
                  <span className="text-xs rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2 py-0.5 font-semibold">
                    +{c.coins}
                  </span>
                  <button
                    onClick={() => copy(c.code)}
                    className="p-1.5 rounded-lg hover:bg-background transition-colors"
                    aria-label={`Copy coupon ${c.code}`}
                  >
                    {copied === c.code ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {active.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-1">
            No active coupons. Generate as many as you want 🎁
          </div>
        )}
      </CardContent>
    </Card>
  );
}
