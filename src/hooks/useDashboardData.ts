import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/browser';

export interface DashboardStats {
  totalLeads: number;
  pipelineValue: number;
  activeProjects: number;
  collectedThisMonth: number;
  newLeadsToday: number;
  staleLeads: number;
}

export interface LeadPipelineData {
  stage: string;
  leads: Array<{
    id: string;
    company: string;
    intent: string;
    value?: number;
    time: string;
    source: string;
    assignee: string;
    highlight?: boolean;
  }>;
}

export interface StaffPerformance {
  name: string;
  role: string;
  progress: number;
  leads: number;
  closedValue: string;
}

export interface ClientHealth {
  name: string;
  status: 'Active' | 'Warm' | 'Cold';
  meta: string;
}

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    pipelineValue: 0,
    activeProjects: 0,
    collectedThisMonth: 0,
    newLeadsToday: 0,
    staleLeads: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);
        const supabase = createClient();

        const [
          { count: totalLeads },
          { data: leads },
          { count: activeProjects },
          { data: invoices },
          { count: newLeadsToday },
          { count: staleLeads },
        ] = await Promise.all([
          supabase.from('leads').select('*', { count: 'exact', head: true }),
          supabase.from('leads').select('value, created_at, status').eq('status', 'new'),
          supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('invoices').select('amount, status, issued_date').eq('status', 'paid'),
          supabase.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', new Date().toISOString().split('T')[0]),
          supabase.from('leads').select('*', { count: 'exact', head: true }).lt('created_at', new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()).in('status', ['new', 'contacted']),
        ]);

        const pipelineValue = leads?.reduce((sum, l) => sum + (l.value || 0), 0) || 0;
        const collectedThisMonth = invoices?.reduce((sum, i) => sum + (i.amount || 0), 0) || 0;

        setStats({
          totalLeads: totalLeads || 0,
          pipelineValue,
          activeProjects: activeProjects || 0,
          collectedThisMonth,
          newLeadsToday: newLeadsToday || 0,
          staleLeads: staleLeads || 0,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch stats');
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  return { stats, loading, error };
}

export function useLeadPipeline() {
  const [pipeline, setPipeline] = useState<LeadPipelineData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPipeline() {
      try {
        setLoading(true);
        const supabase = createClient();
        const { data, error } = await supabase
          .from('leads')
          .select('id, company, intent, value, created_at, source, assignee, status')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const stages = ['new', 'contacted', 'qualified', 'proposal', 'won'];
        const pipelineData = stages.map(stage => ({
          stage: stage.charAt(0).toUpperCase() + stage.slice(1),
          leads: (data || [])
            .filter(l => l.status === stage)
            .map(l => ({
              id: l.id,
              company: l.company,
              intent: l.intent || 'General Inquiry',
              value: l.value,
              time: formatTimeAgo(l.created_at),
              source: l.source || 'Unknown',
              assignee: l.assignee || 'Unassigned',
            })),
        }));

        setPipeline(pipelineData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch pipeline');
      } finally {
        setLoading(false);
      }
    }

    fetchPipeline();
  }, []);

  return { pipeline, loading, error };
}

export function useStaffPerformance() {
  const [staff, setStaff] = useState<StaffPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStaff() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('leads')
          .select('assignee, status, value')
          .in('status', ['won']);

        if (error) throw error;

        // Aggregate by assignee
        const staffMap = new Map<string, { leads: number; value: number }>();
        (data || []).forEach(lead => {
          const assignee = lead.assignee || 'Unassigned';
          const current = staffMap.get(assignee) || { leads: 0, value: 0 };
          current.leads += 1;
          current.value += lead.value || 0;
          staffMap.set(assignee, current);
        });

        const staffArray = Array.from(staffMap.entries()).map(([name, data]) => ({
          name: formatName(name),
          role: getRole(name),
          progress: Math.min(100, Math.round((data.value / 1000000) * 100)),
          leads: data.leads,
          closedValue: `KES ${(data.value / 1000).toFixed(0)}K`,
        }));

        setStaff(staffArray);
      } catch (err) {
        console.error('Failed to fetch staff performance:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchStaff();
  }, []);

  return { staff, loading };
}

export function useClientHealth() {
  const [clients, setClients] = useState<ClientHealth[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchClients() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('clients')
          .select('name, status, updated_at')
          .order('updated_at', { ascending: false })
          .limit(10);

        if (error) throw error;

        const clientHealth: ClientHealth[] = (data || []).map(c => ({
          name: c.name,
          status: (c.status === 'active' ? 'Active' : c.status === 'inactive' ? 'Cold' : 'Warm') as ClientHealth['status'],
          meta: `Last updated ${formatTimeAgo(c.updated_at)}`,
        }));

        setClients(clientHealth);
      } catch (err) {
        console.error('Failed to fetch client health:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchClients();
  }, []);

  return { clients, loading };
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function formatName(name: string): string {
  const nameMap: Record<string, string> = {
    brian: 'Brian Mwangi',
    amina: 'Amina Mwangi',
    james: 'James Kariuki',
    christine: 'Christine Kamau',
  };
  return nameMap[name.toLowerCase()] || name;
}

function getRole(name: string): string {
  const roleMap: Record<string, string> = {
    brian: 'Sales Director',
    amina: 'Lead Gen',
    james: 'Sales Exec',
    christine: 'Junior Sales',
  };
  return roleMap[name.toLowerCase()] || 'Staff';
}