import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useSalesMetrics, useLeads } from "@/hooks/sales";
import { 
  SalesMetricCard, 
  SalesFunnelChart, 
  LeadSourceChart,
  RecentLeadsList 
} from "@/components/sales";
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Target,
  UserPlus,
  CheckCircle2,
  XCircle,
  Clock
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const SalesDashboardContent = () => {
  const { data: metrics, isLoading: metricsLoading } = useSalesMetrics();
  const { leads, isLoading: leadsLoading } = useLeads();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  };

  if (metricsLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard de Vendas</h1>
          <p className="text-muted-foreground">
            Acompanhe suas métricas e performance de vendas
          </p>
        </div>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SalesMetricCard
          title="Total de Leads"
          value={metrics?.totalLeads || 0}
          subtitle="leads ativos"
          icon={<Users className="w-4 h-4" />}
        />
        <SalesMetricCard
          title="Valor Total"
          value={formatCurrency(metrics?.totalValue || 0)}
          subtitle="em pipeline"
          icon={<DollarSign className="w-4 h-4" />}
        />
        <SalesMetricCard
          title="Taxa de Conversão"
          value={`${(metrics?.conversionRate || 0).toFixed(1)}%`}
          subtitle="leads convertidos"
          icon={<TrendingUp className="w-4 h-4" />}
          trend={{ value: 5.2, label: 'vs mês anterior' }}
        />
        <SalesMetricCard
          title="Ticket Médio"
          value={formatCurrency(metrics?.averageDealSize || 0)}
          subtitle="por venda"
          icon={<Target className="w-4 h-4" />}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SalesMetricCard
          title="Novos Leads"
          value={metrics?.newLeads || 0}
          icon={<UserPlus className="w-4 h-4" />}
          className="bg-blue-500/10 border-blue-500/20"
        />
        <SalesMetricCard
          title="Qualificados"
          value={metrics?.qualifiedLeads || 0}
          icon={<Clock className="w-4 h-4" />}
          className="bg-yellow-500/10 border-yellow-500/20"
        />
        <SalesMetricCard
          title="Ganhos"
          value={metrics?.wonLeads || 0}
          icon={<CheckCircle2 className="w-4 h-4" />}
          className="bg-green-500/10 border-green-500/20"
        />
        <SalesMetricCard
          title="Perdidos"
          value={metrics?.lostLeads || 0}
          icon={<XCircle className="w-4 h-4" />}
          className="bg-red-500/10 border-red-500/20"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesFunnelChart 
          data={metrics?.leadsByStatus || {
            new: 0,
            contacted: 0,
            qualified: 0,
            proposal: 0,
            negotiation: 0,
            won: 0,
            lost: 0,
          }} 
        />
        <LeadSourceChart data={metrics?.leadsBySource || {}} />
      </div>

      {/* Recent Leads */}
      <RecentLeadsList leads={leads || []} />
    </div>
  );
};

const SalesDashboard = () => {
  return (
    <ProtectedRoute>
      <SalesDashboardContent />
    </ProtectedRoute>
  );
};

export default SalesDashboard;
