'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import {
  Loader2, Plus, Trash2, PiggyBank, TrendingUp, TrendingDown,
  Wallet, CreditCard, Target, BarChart3, Landmark, Coins,
} from 'lucide-react';
import { cn } from '@/lib/cn';

interface Account { id: string; name: string; type: string; currency: string; balance: string; }
interface Category { id: string; name: string; icon: string | null; color: string | null; }
interface Transaction { id: string; accountId: string; date: string; amount: string; description: string; categoryId: string | null; payee: string | null; }
interface Budget { id: string; categoryId: string | null; amount: string; period: string; startDate: string; endDate: string | null; spent: string; }
interface SavingsGoal { id: string; name: string; targetAmount: string; currentAmount: string; jarAccountId: string | null; deadline: string | null; }
interface Asset { id: string; name: string; type: string; quantity: string; currentPrice: string; currency: string; }
interface NetWorth { accountBalance: string; assetValue: string; netWorth: string; }

function formatEuro(amount: string) {
  const num = parseFloat(amount);
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(num);
}

const accountTypeLabels: Record<string, string> = {
  checking: 'Girokonto', savings: 'Sparkonto', brokerage: 'Depot',
  credit: 'Kreditkarte', cash: 'Bargeld', crypto: 'Krypto', jar: 'Sparglas',
};

const accountTypeIcons: Record<string, React.ReactNode> = {
  checking: <Wallet className="h-4 w-4" />,
  savings: <PiggyBank className="h-4 w-4" />,
  brokerage: <TrendingUp className="h-4 w-4" />,
  credit: <CreditCard className="h-4 w-4" />,
  cash: <Coins className="h-4 w-4" />,
  crypto: <Landmark className="h-4 w-4" />,
  jar: <Target className="h-4 w-4" />,
};

export default function FinancePage() {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [accountTab, setAccountTab] = useState('all');

  const { data: netWorth, isLoading: nwLoading } = useQuery<NetWorth>({
    queryKey: ['finance', 'net-worth'],
    queryFn: () => api.get<NetWorth>('/finance/net-worth'),
    enabled: !!accessToken,
  });

  const { data: accounts } = useQuery<Account[]>({
    queryKey: ['finance', 'accounts'],
    queryFn: () => api.get<Account[]>('/finance/accounts'),
    enabled: !!accessToken,
  });

  const { data: transactions } = useQuery<Transaction[]>({
    queryKey: ['finance', 'transactions'],
    queryFn: () => api.get<Transaction[]>('/finance/transactions'),
    enabled: !!accessToken,
  });

  const { data: budgets } = useQuery<Budget[]>({
    queryKey: ['finance', 'budgets'],
    queryFn: () => api.get<Budget[]>('/finance/budgets'),
    enabled: !!accessToken,
  });

  const { data: savingsGoals } = useQuery<SavingsGoal[]>({
    queryKey: ['finance', 'savings-goals'],
    queryFn: () => api.get<SavingsGoal[]>('/finance/savings-goals'),
    enabled: !!accessToken,
  });

  const { data: assets } = useQuery<Asset[]>({
    queryKey: ['finance', 'assets'],
    queryFn: () => api.get<Asset[]>('/finance/assets'),
    enabled: !!accessToken,
  });

  if (!accessToken) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-fg-muted" />
      </div>
    );
  }

  const filteredAccounts = accountTab === 'all' ? accounts : accounts?.filter(a => a.type === accountTab);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Finanzen</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-bg-surface p-5">
          <p className="text-sm text-fg-muted mb-1">Kontostände</p>
          <p className="text-2xl font-bold">{nwLoading ? '…' : formatEuro(netWorth?.accountBalance ?? '0')}</p>
        </div>
        <div className="rounded-lg border border-border bg-bg-surface p-5">
          <p className="text-sm text-fg-muted mb-1">Wertanlagen</p>
          <p className="text-2xl font-bold">{nwLoading ? '…' : formatEuro(netWorth?.assetValue ?? '0')}</p>
        </div>
        <div className="rounded-lg border border-border bg-bg-surface p-5">
          <p className="text-sm text-fg-muted mb-1">Gesamtvermögen</p>
          <p className="text-2xl font-bold text-brand-500">{nwLoading ? '…' : formatEuro(netWorth?.netWorth ?? '0')}</p>
        </div>
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Konten</h2>
        </div>
        <div className="flex gap-2 mb-3 flex-wrap">
          {['all', 'checking', 'savings', 'brokerage', 'credit', 'cash', 'crypto', 'jar'].map(type => (
            <button key={type} onClick={() => setAccountTab(type)}
              className={cn('px-3 py-1.5 text-xs rounded-full border border-border transition-colors',
                accountTab === type ? 'bg-brand-500 text-white border-brand-500' : 'text-fg-muted hover:text-fg'
              )}>
              {type === 'all' ? 'Alle' : accountTypeLabels[type] ?? type}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredAccounts?.map(acc => (
            <div key={acc.id} className="rounded-lg border border-border bg-bg-surface p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-brand-500/10 text-brand-500">{accountTypeIcons[acc.type]}</div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{acc.name}</p>
                <p className="text-xs text-fg-muted">{accountTypeLabels[acc.type] ?? acc.type}</p>
              </div>
              <p className="font-semibold text-right">{formatEuro(acc.balance)}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Transaktionen</h2>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-surface">
              <tr className="text-left text-fg-muted">
                <th className="px-4 py-3 font-medium">Datum</th>
                <th className="px-4 py-3 font-medium">Beschreibung</th>
                <th className="px-4 py-3 font-medium">Empfänger</th>
                <th className="px-4 py-3 font-medium text-right">Betrag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {transactions?.slice(0, 20).map(tx => (
                <tr key={tx.id} className="hover:bg-bg-surface/50">
                  <td className="px-4 py-3 text-fg-muted">{tx.date}</td>
                  <td className="px-4 py-3">{tx.description}</td>
                  <td className="px-4 py-3 text-fg-muted">{tx.payee ?? '-'}</td>
                  <td className={cn('px-4 py-3 text-right font-medium',
                    parseFloat(tx.amount) >= 0 ? 'text-green-600' : 'text-red-600'
                  )}>
                    {formatEuro(tx.amount)}
                  </td>
                </tr>
              ))}
              {(!transactions || transactions.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-fg-muted">Noch keine Transaktionen</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section>
          <h2 className="text-xl font-semibold mb-3">Budget-Status</h2>
          <div className="space-y-3">
            {budgets?.map(b => {
              const pct = parseFloat(b.spent) / parseFloat(b.amount) * 100;
              const over = pct > 100;
              return (
                <div key={b.id} className="rounded-lg border border-border bg-bg-surface p-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium">{b.categoryId ? 'Kategorie' : 'Gesamtbudget'}</span>
                    <span className="text-fg-muted">{formatEuro(b.spent)} / {formatEuro(b.amount)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-bg overflow-hidden">
                    <div className={cn('h-full rounded-full transition-all', over ? 'bg-red-500' : 'bg-brand-500')}
                      style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-fg-muted mt-1">
                    <span>{b.period}</span>
                    <span>{pct.toFixed(0)}%</span>
                  </div>
                </div>
              );
            })}
            {(!budgets || budgets.length === 0) && (
              <p className="text-sm text-fg-muted">Keine Budgets definiert</p>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Sparziele</h2>
          <div className="space-y-3">
            {savingsGoals?.map(g => {
              const pct = parseFloat(g.currentAmount) / parseFloat(g.targetAmount) * 100;
              return (
                <div key={g.id} className="rounded-lg border border-border bg-bg-surface p-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium">{g.name}</span>
                    <span className="text-fg-muted">{formatEuro(g.currentAmount)} / {formatEuro(g.targetAmount)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-bg overflow-hidden">
                    <div className="h-full rounded-full bg-brand-500 transition-all"
                      style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-fg-muted mt-1">
                    <span>{pct.toFixed(0)}% erreicht</span>
                    {g.deadline && <span>bis {g.deadline}</span>}
                  </div>
                </div>
              );
            })}
            {(!savingsGoals || savingsGoals.length === 0) && (
              <p className="text-sm text-fg-muted">Keine Sparziele definiert</p>
            )}
          </div>
        </section>
      </div>

      <section>
        <h2 className="text-xl font-semibold mb-3">Wertanlagen</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {assets?.map(a => {
            const value = parseFloat(a.quantity) * parseFloat(a.currentPrice);
            return (
              <div key={a.id} className="rounded-lg border border-border bg-bg-surface p-4">
                <p className="font-medium">{a.name}</p>
                <p className="text-xs text-fg-muted mb-2">{a.type}</p>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-muted">{parseFloat(a.quantity).toFixed(4)} × {formatEuro(a.currentPrice)}</span>
                  <span className="font-semibold">{formatEuro(value.toFixed(2))}</span>
                </div>
              </div>
            );
          })}
          {(!assets || assets.length === 0) && (
            <div className="col-span-full text-center py-8 text-fg-muted">
              <Landmark className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>Keine Wertanlagen erfasst</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
