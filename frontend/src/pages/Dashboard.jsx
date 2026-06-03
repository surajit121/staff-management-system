import React, { useState } from 'react';
import {
  Users,
  Wallet,
  Briefcase,
  FileText,
  TrendingUp,
  TrendingDown,
  Clock,
  ExternalLink,
  Search,
  ArrowRight
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { motion } from 'framer-motion';
import { cn, formatDate } from '../lib/utils';
import { 
  useDashboardStats, 
  useAttendance, 
  useStaff, 
  useExpenses, 
  useProjects, 
  useBilling 
} from '../hooks/useResource';
import { Skeleton } from '../components/ui/skeleton';
import { useTheme } from '../context/ThemeContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

/* ── Stat Card ── */
const StatCard = ({ label, value, subValue, icon: Icon, accentColor, bgRest, bgHover, isLoading, onClick, delay = 0 }) => {
  const [hovered, setHovered] = React.useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "card p-5 group",
        onClick && "cursor-pointer active:scale-[0.98]"
      )}
      style={{
        transition: 'box-shadow 0.4s ease, transform 0.25s ease, background-color 0.4s ease',
        backgroundColor: hovered ? `${accentColor}${bgHover}` : `${accentColor}${bgRest}`,
        boxShadow: hovered
          ? `0 0 0 1px ${accentColor}15, 0 4px 20px ${accentColor}08`
          : `0 0 0 1px ${accentColor}10`,
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
      }}
    >
      <div className="flex justify-between items-start mb-1.5">
        <div className="text-[12px] font-medium" style={{ color: 'var(--color-text2)' }}>
          {label}
        </div>
        <div
          className="p-2 rounded-lg"
          style={{
            background: hovered ? accentColor + '30' : accentColor + '18',
            color: accentColor,
            transition: 'background 0.3s ease, transform 0.2s ease',
            transform: hovered ? 'scale(1.15)' : 'scale(1)',
          }}
        >
          <Icon size={18} />
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-8 w-24 mb-1.5" />
      ) : (
        <div className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
          {value}
        </div>
      )}

      <div className="flex justify-between items-center mt-1.5">
        <div className="text-[12px]" style={{ color: 'var(--color-text3)' }}>
          {subValue}
        </div>
        {onClick && (
          <ExternalLink
            size={12}
            style={{
              color: accentColor,
              opacity: hovered ? 1 : 0,
              transition: 'opacity 0.2s ease',
            }}
          />
        )}
      </div>
    </motion.div>
  );
};

/* ── Custom Tooltip ── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2 rounded-lg shadow-main text-[12px] border"
      style={{
        background: 'var(--chart-tooltip-bg)',
        borderColor: 'var(--chart-tooltip-border)',
      }}
    >
      <div className="font-semibold mb-1" style={{ color: 'var(--color-text)' }}>{label}</div>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ background: entry.color }}
          />
          <span style={{ color: 'var(--color-text2)' }}>
            {entry.name}: <strong style={{ color: 'var(--color-text)' }}>{entry.value}</strong>
          </span>
        </div>
      ))}
    </div>
  );
};

/* ── Dashboard Page ── */
export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: attendance, isLoading: attendanceLoading } = useAttendance();
  const { isDark } = useTheme();

  // Group attendance by date for chart
  const chartData = Object.values(
    attendance.reduce((acc, curr) => {
      const date = formatDate(curr.date, { weekday: 'short' });
      if (!acc[date]) acc[date] = { name: date, present: 0, absent: 0 };
      if (curr.status === 'Present') acc[date].present++;
      if (curr.status === 'Absent') acc[date].absent++;
      return acc;
    }, {})
  ).slice(-5);

  // Theme-aware chart colors
  const chartGrid     = isDark ? '#2E3347' : '#E5E9F2';
  const chartTick     = isDark ? '#5A6280' : '#9CA3AF';
  const chartPresent  = isDark ? '#5B8AF8' : '#3B6CF6';
  const chartAbsent   = isDark ? '#F87171' : '#DC2626';
  const chartCursor   = isDark ? 'rgba(46,51,71,0.6)' : 'rgba(203,213,225,0.4)';

  const { data: staff } = useStaff();
  const { data: expenses } = useExpenses();
  const { data: projects } = useProjects();
  const { data: billing } = useBilling();

  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [panelType, setPanelType] = useState(null);
  const [panelSearch, setPanelSearch] = useState('');

  const statCards = [
    {
      label: 'Total Staff',
      id: 'staff',
      value: stats?.staffCount || '0',
      subValue: 'Active employees',
      icon: Users,
      accentColor: isDark ? '#5B8AF8' : '#3B6CF6',
      bgRest: '05', // 2% extremely soft
      bgHover: '0A', // 4% soft glow
    },
    {
      label: 'Pending Expenses',
      id: 'expenses',
      value: stats?.pendingExpensesCount || '0',
      subValue: 'Awaiting approval',
      icon: Wallet,
      accentColor: isDark ? '#FBBF24' : '#D97706',
      bgRest: '05',
      bgHover: '0A',
    },
    {
      label: 'Active Projects',
      id: 'projects',
      value: stats?.activeProjectsCount || '0',
      subValue: 'Ongoing sites',
      icon: Briefcase,
      accentColor: isDark ? '#34D399' : '#16A34A',
      bgRest: '05',
      bgHover: '0A',
    },
    {
      label: 'Pending Billing',
      id: 'billing',
      value: `₹${((stats?.totalPendingBilling || 0) / 1000).toFixed(0)}K`,
      subValue: 'Delivered not billed',
      icon: FileText,
      accentColor: isDark ? '#F87171' : '#DC2626',
      bgRest: '05',
      bgHover: '0A',
    },
  ];

  const handleStatClick = (type) => {
    setPanelType(type);
    setPanelSearch('');
    setIsPanelOpen(true);
  };

  const currentPanel = statCards.find(c => c.id === panelType);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => (
          <StatCard 
            key={card.label} 
            {...card} 
            isLoading={statsLoading} 
            delay={idx * 0.06} 
            onClick={() => handleStatClick(card.id)}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.28 }}
          className="card p-5"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
              Attendance Trends
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text3)' }}>
              Recent Activity
            </span>
          </div>

          <div className="h-[250px] w-full">
            {attendanceLoading ? (
              <Skeleton className="h-full w-full rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height={250} minWidth={0}>
                <BarChart data={chartData.length > 0 ? chartData : [{ name: 'N/A', present: 0, absent: 0 }]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGrid} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: chartTick }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: chartTick }}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: chartCursor }} />
                  <Bar dataKey="present" fill={chartPresent} radius={[4, 4, 0, 0]} barSize={28} name="Present" />
                  <Bar dataKey="absent" fill={chartAbsent} radius={[4, 4, 0, 0]} barSize={14} name="Absent" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* Real-time Activity Feed */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.35 }}
          className="card p-5"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
              Real-time Activity Feed
            </h3>
          </div>

          <div className="space-y-3">
            {attendanceLoading ? (
              Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)
            ) : (
              attendance.slice(0, 5).map((log, idx) => {
                const isPresent = log.status === 'Present';
                const dotColor = isPresent
                  ? (isDark ? '#34D399' : '#16A34A')
                  : (isDark ? '#F87171' : '#DC2626');

                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.06 }}
                    className="flex items-center gap-3 p-2.5 rounded-lg transition-colors duration-150 cursor-default"
                    style={{ '--hover-bg': 'var(--color-surface2)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Avatar / initials */}
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                      style={{
                        background: dotColor + '20',
                        color: dotColor,
                      }}
                    >
                      {log.staffId?.initials || '??'}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium truncate" style={{ color: 'var(--color-text)' }}>
                        {log.staffId?.name || 'Unknown Staff'}
                      </div>
                      <div className="text-[11px] flex items-center gap-1.5" style={{ color: 'var(--color-text2)' }}>
                        <span
                          className="inline-block w-2 h-2 rounded-full status-pulse"
                          style={{ background: dotColor, '--pulse-color': dotColor + '80' }}
                        />
                        {log.status} on {formatDate(log.date, { day: 'numeric', month: 'numeric', year: 'numeric' })}
                      </div>
                    </div>

                    {/* Time */}
                    <div className="text-[10px] font-mono" style={{ color: 'var(--color-text3)' }}>
                      {log.checkIn || '--:--'}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </motion.div>
        </div>

      <Dialog open={isPanelOpen} onOpenChange={setIsPanelOpen}>
        <DialogContent aria-describedby={undefined} className="sm:max-w-[700px] bg-surface text-text flex flex-col max-h-[85vh]">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 rounded-lg" style={{ background: currentPanel?.accentColor + '20', color: currentPanel?.accentColor }}>
                {currentPanel?.icon && <currentPanel.icon size={20} />}
              </div>
              <div>
                <DialogTitle className="font-bold">{currentPanel?.label || 'Details'}</DialogTitle>
                <DialogDescription className="text-xs">{currentPanel?.subValue || 'View detailed records'}</DialogDescription>
              </div>
            </div>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" size={14} />
              <Input 
                placeholder={`Search ${currentPanel?.label.toLowerCase()}...`}
                value={panelSearch}
                onChange={(e) => setPanelSearch(e.target.value)}
                className="pl-9 bg-surface2 h-9 text-sm"
              />
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-auto mt-4 border border-border rounded-xl">
            <table className="w-full text-left border-collapse text-[12.5px]">
              <thead className="sticky top-0 bg-surface border-b border-border z-10">
                <tr className="bg-surface2/30">
                  {panelType === 'staff' && (
                    <>
                      <th className="px-4 py-3 font-bold text-text3 uppercase">Member</th>
                      <th className="px-4 py-3 font-bold text-text3 uppercase">Role & Dept</th>
                      <th className="px-4 py-3 font-bold text-text3 uppercase">Contact</th>
                    </>
                  )}
                  {panelType === 'expenses' && (
                    <>
                      <th className="px-4 py-3 font-bold text-text3 uppercase">Staff</th>
                      <th className="px-4 py-3 font-bold text-text3 uppercase">Purpose & Category</th>
                      <th className="px-4 py-3 font-bold text-text3 uppercase text-right">Amount</th>
                    </>
                  )}
                  {panelType === 'projects' && (
                    <>
                      <th className="px-4 py-3 font-bold text-text3 uppercase">Project</th>
                      <th className="px-4 py-3 font-bold text-text3 uppercase">Location</th>
                      <th className="px-4 py-3 font-bold text-text3 uppercase text-right">Budget</th>
                    </>
                  )}
                  {panelType === 'billing' && (
                    <>
                      <th className="px-4 py-3 font-bold text-text3 uppercase">Project</th>
                      <th className="px-4 py-3 font-bold text-text3 uppercase">Item & Vendor</th>
                      <th className="px-4 py-3 font-bold text-text3 uppercase text-right">Amount</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {/* Staff Details */}
                {panelType === 'staff' && staff
                  .filter(s => s.name?.toLowerCase().includes(panelSearch.toLowerCase()) || s.dept?.toLowerCase().includes(panelSearch.toLowerCase()))
                  .map(s => (
                  <tr key={s._id} className="border-b border-border/50 hover:bg-surface2/50 transition-colors">
                    <td className="px-4 py-3 font-bold text-text">{s.name}</td>
                    <td className="px-4 py-3 text-text2">
                       <div className="font-semibold text-accent text-[11px]">{s.role}</div>
                       <div className="text-[10px] opacity-70 uppercase">{s.dept}</div>
                    </td>
                    <td className="px-4 py-3 text-text3 font-mono">{s.phone}</td>
                  </tr>
                ))}

                {/* Expenses Details (Pending Only) */}
                {panelType === 'expenses' && expenses
                  .filter(e => e.status === 'Pending')
                  .filter(e => e.staffId?.name?.toLowerCase().includes(panelSearch.toLowerCase()) || e.purpose?.toLowerCase().includes(panelSearch.toLowerCase()))
                  .map(e => (
                  <tr key={e._id} className="border-b border-border/50 hover:bg-surface2/50 transition-colors">
                    <td className="px-4 py-3 font-bold text-text">{e.staffId?.name || 'Unknown'}</td>
                    <td className="px-4 py-3 text-text2">
                       <div className="font-semibold text-text">{e.purpose}</div>
                       <div className="text-[11px] text-accent uppercase">
                         {Array.isArray(e.category) ? e.category.join(', ') : e.category}
                       </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-amber">₹{e.amount.toLocaleString()}</td>
                  </tr>
                ))}

                {/* Projects Details (Active Only) */}
                {panelType === 'projects' && projects
                  .filter(p => p.status === 'Active')
                  .filter(p => p.name?.toLowerCase().includes(panelSearch.toLowerCase()) || p.manager?.toLowerCase().includes(panelSearch.toLowerCase()))
                  .map(p => (
                  <tr key={p._id} className="border-b border-border/50 hover:bg-surface2/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-text">{p.name}</div>
                      <div className="text-[10px] text-text3 opacity-70 uppercase tracking-widest">{p.code}</div>
                    </td>
                    <td className="px-4 py-3 text-text2">
                       <div className="font-semibold">{p.location}</div>
                       <div className="text-[11px] text-text3">PM: {p.manager}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-green">₹{p.budget.toLocaleString()}</td>
                  </tr>
                ))}

                {/* Billing Details (Pending Only) */}
                {panelType === 'billing' && billing
                  .filter(b => b.status === 'Pending')
                  .filter(b => b.project?.toLowerCase().includes(panelSearch.toLowerCase()) || b.item?.toLowerCase().includes(panelSearch.toLowerCase()))
                  .map(b => (
                  <tr key={b._id} className="border-b border-border/50 hover:bg-surface2/50 transition-colors">
                    <td className="px-4 py-3 font-bold text-text">{b.project}</td>
                    <td className="px-4 py-3 text-text2">
                       <div className="font-semibold text-text">{b.item}</div>
                       <div className="text-[11px] text-text3 italic">Vendor: {b.vendor}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-red">₹{b.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter className="mt-4 pt-3 border-t border-border">
            <Button variant="outline" onClick={() => setIsPanelOpen(false)}>Close Panel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
